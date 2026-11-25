import { useSyncExternalStore } from 'react';
import type { AtualizarLacoInput, Laco, NovoLacoInput } from '../contracts/laco';
import {
  acoesJanela,
  assinarSincronizacaoExterna,
  atualizarLaco,
  criarLaco,
  desfazerLaco,
  dispararResumoDiarioSeNecessario,
  excluirLaco,
  filtrarPorBusca,
  lacoEstaVencido,
  lerArquivoImagem,
  limparRascunhoCompositor,
  listarAgendadosRecorrentes,
  listarLacos,
  listarVencendoHoje,
  ordenarLacos,
  reamarrarLaco,
  recuperarRascunhoInterrompido,
  salvarRascunhoCompositor,
  verificarNotificacoesPendentes,
} from '../services/lacosService';

/**
 * Cache explicito com staleTime declarado (regra T-02).
 * Nenhuma tela busca dados com useEffect + setState.
 */
const STALE_TIME_MS = 30_000;

interface EstadoCacheLacos {
  lacos: Laco[];
  carregado: boolean;
  atualizadoEmMs: number;
  ultimoDesfeito: Laco | null;
  gatilhoFocoNovo: number;
}

let cache: EstadoCacheLacos = {
  lacos: [],
  carregado: false,
  atualizadoEmMs: 0,
  ultimoDesfeito: null,
  gatilhoFocoNovo: 0,
};

const ouvintes = new Set<() => void>();
let sincronizacaoIniciada = false;
let timerRelogio: ReturnType<typeof setInterval> | null = null;
let timerToast: ReturnType<typeof setTimeout> | null = null;

function emitir(): void {
  for (const fn of ouvintes) fn();
}

export async function recarregarCacheLacos(forcar = false): Promise<void> {
  const agora = Date.now();
  if (!forcar && cache.carregado && agora - cache.atualizadoEmMs < STALE_TIME_MS) {
    return;
  }
  const lista = await listarLacos();
  cache = {
    ...cache,
    lacos: lista,
    carregado: true,
    atualizadoEmMs: agora,
  };
  emitir();

  await dispararResumoDiarioSeNecessario(lista, false);
  const notificou = await verificarNotificacoesPendentes(lista);
  if (notificou) {
    const atualizados = await listarLacos();
    cache = { ...cache, lacos: atualizados, atualizadoEmMs: Date.now() };
    emitir();
  }
}

function garantirAssinaturasGlobais(): void {
  if (sincronizacaoIniciada) return;
  sincronizacaoIniciada = true;

  void recuperarRascunhoInterrompido().finally(() => {
    void recarregarCacheLacos(true);
  });

  assinarSincronizacaoExterna(() => {
    void recarregarCacheLacos(true);
  });

  void acoesJanela.assinarFocoNovoLaco(() => {
    cache = { ...cache, gatilhoFocoNovo: cache.gatilhoFocoNovo + 1 };
    emitir();
  });

  if (typeof window !== 'undefined' && !timerRelogio) {
    timerRelogio = setInterval(() => {
      emitir();
      void verificarNotificacoesPendentes(cache.lacos).then((notificou) => {
        if (notificou) void recarregarCacheLacos(true);
      });
    }, 20_000);
  }
}

function assinar(ouvinte: () => void): () => void {
  garantirAssinaturasGlobais();
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

function obterSnapshot(): EstadoCacheLacos {
  return cache;
}

export function useLacos(busca = '', somenteHoje = false) {
  const estado = useSyncExternalStore(assinar, obterSnapshot, obterSnapshot);

  const agoraMs = Date.now();
  const baseFiltrada = filtrarPorBusca(estado.lacos, busca);
  const posFiltroHoje = somenteHoje ? listarVencendoHoje(baseFiltrada) : baseFiltrada;

  const ativos = ordenarLacos(posFiltroHoje, 'ativo', agoraMs);
  const ativosFixados = ativos.filter((l) => l.fixado);
  const ativosOutros = ativos.filter((l) => !l.fixado);
  const agendados = listarAgendadosRecorrentes(baseFiltrada, agoraMs);
  const desfeitos = ordenarLacos(baseFiltrada, 'desfeito', agoraMs);

  const todosAtivosVisiveis = ordenarLacos(estado.lacos, 'ativo', agoraMs);
  const todosAgendados = listarAgendadosRecorrentes(estado.lacos, agoraMs);
  const todosDesfeitos = ordenarLacos(estado.lacos, 'desfeito', agoraMs);
  const vencendoHoje = listarVencendoHoje(estado.lacos);
  const quantidadeVencidos = todosAtivosVisiveis.filter((l) => lacoEstaVencido(l, agoraMs)).length;
  // Insignia da bolinha: lacos de hoje somados aos vencidos de dias anteriores, sem contar duas vezes
  const idsPendentesAgora = new Set(vencendoHoje.map((l) => l.id));
  for (const l of todosAtivosVisiveis) {
    if (lacoEstaVencido(l, agoraMs)) idsPendentesAgora.add(l.id);
  }

  const criar = async (input: NovoLacoInput, somAtivo: boolean) => {
    limparRascunhoCompositor();
    const novo = await criarLaco(input, somAtivo);
    await recarregarCacheLacos(true);
    return novo;
  };

  const atualizar = async (input: AtualizarLacoInput) => {
    const editado = await atualizarLaco(input);
    await recarregarCacheLacos(true);
    return editado;
  };

  const alternarFixado = async (laco: Laco) => {
    await atualizarLaco({ id: laco.id, fixado: !laco.fixado });
    await recarregarCacheLacos(true);
  };

  const alternarItemChecklist = async (laco: Laco, itemId: string) => {
    const itens = laco.itens.map((item) =>
      item.id === itemId ? { ...item, concluido: !item.concluido } : item
    );
    await atualizarLaco({ id: laco.id, itens });
    await recarregarCacheLacos(true);
  };

  const desfazer = async (id: string, somAtivo: boolean) => {
    const desfeito = await desfazerLaco(id, somAtivo);
    if (timerToast) clearTimeout(timerToast);
    cache = { ...cache, ultimoDesfeito: desfeito };
    await recarregarCacheLacos(true);
    timerToast = setTimeout(() => {
      cache = { ...cache, ultimoDesfeito: null };
      emitir();
    }, 6000);
    return desfeito;
  };

  const reamarrar = async (id: string, somAtivo: boolean) => {
    if (timerToast) clearTimeout(timerToast);
    cache = { ...cache, ultimoDesfeito: null };
    const restaurado = await reamarrarLaco(id, somAtivo);
    await recarregarCacheLacos(true);
    return restaurado;
  };

  const trazerAgendadoParaHoje = async (id: string) => {
    await atualizarLaco({ id, ocultoAte: null });
    await recarregarCacheLacos(true);
  };

  const excluir = async (id: string) => {
    await excluirLaco(id);
    await recarregarCacheLacos(true);
  };

  const enviarNotificacaoResumoHoje = async () => {
    await dispararResumoDiarioSeNecessario(estado.lacos, true);
  };

  const dispensarAvisoDesfeito = () => {
    if (timerToast) clearTimeout(timerToast);
    cache = { ...cache, ultimoDesfeito: null };
    emitir();
  };

  const solicitarFocoNovoLaco = () => {
    cache = { ...cache, gatilhoFocoNovo: cache.gatilhoFocoNovo + 1 };
    emitir();
  };

  return {
    carregado: estado.carregado,
    ativosFixados,
    ativosOutros,
    agendados,
    desfeitos,
    vencendoHoje,
    totalAtivos: todosAtivosVisiveis.length,
    totalAgendados: todosAgendados.length,
    totalDesfeitos: todosDesfeitos.length,
    totalVencendoHoje: vencendoHoje.length,
    totalPendentesAgora: idsPendentesAgora.size,
    quantidadeVencidos,
    ultimoDesfeito: estado.ultimoDesfeito,
    gatilhoFocoNovo: estado.gatilhoFocoNovo,
    criar,
    atualizar,
    alternarFixado,
    alternarItemChecklist,
    desfazer,
    reamarrar,
    trazerAgendadoParaHoje,
    excluir,
    enviarNotificacaoResumoHoje,
    importarImagem: lerArquivoImagem,
    dispensarAvisoDesfeito,
    solicitarFocoNovoLaco,
    salvarRascunho: salvarRascunhoCompositor,
    limparRascunho: limparRascunhoCompositor,
    abrirMuralNativo: acoesJanela.abrirMural,
    iniciarArrasteJanela: acoesJanela.iniciarArrasteJanelaAtual,
  };
}
