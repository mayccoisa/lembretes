import { useSyncExternalStore } from 'react';
import type { AtualizarLacoInput, Laco, NovoLacoInput } from '../contracts/laco';
import {
  acoesJanela,
  assinarSincronizacaoExterna,
  atualizarLaco,
  criarLaco,
  desfazerLaco,
  excluirLaco,
  filtrarPorBusca,
  lacoEstaVencido,
  lerArquivoImagem,
  limparRascunhoCompositor,
  listarLacos,
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

export function useLacos(busca = '') {
  const estado = useSyncExternalStore(assinar, obterSnapshot, obterSnapshot);

  const filtrados = filtrarPorBusca(estado.lacos, busca);
  const ativos = ordenarLacos(filtrados, 'ativo');
  const ativosFixados = ativos.filter((l) => l.fixado);
  const ativosOutros = ativos.filter((l) => !l.fixado);
  const desfeitos = ordenarLacos(filtrados, 'desfeito');

  const todosAtivos = estado.lacos.filter((l) => l.estado === 'ativo' && l.deletedAt === null);
  const todosDesfeitos = estado.lacos.filter((l) => l.estado === 'desfeito' && l.deletedAt === null);
  const quantidadeVencidos = todosAtivos.filter((l) => lacoEstaVencido(l)).length;

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

  const excluir = async (id: string) => {
    await excluirLaco(id);
    await recarregarCacheLacos(true);
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
    desfeitos,
    totalAtivos: todosAtivos.length,
    totalDesfeitos: todosDesfeitos.length,
    quantidadeVencidos,
    ultimoDesfeito: estado.ultimoDesfeito,
    gatilhoFocoNovo: estado.gatilhoFocoNovo,
    criar,
    atualizar,
    alternarFixado,
    alternarItemChecklist,
    desfazer,
    reamarrar,
    excluir,
    importarImagem: lerArquivoImagem,
    dispensarAvisoDesfeito,
    solicitarFocoNovoLaco,
    salvarRascunho: salvarRascunhoCompositor,
    limparRascunho: limparRascunhoCompositor,
    abrirMuralNativo: acoesJanela.abrirMural,
    iniciarArrasteJanela: acoesJanela.iniciarArrasteJanelaAtual,
  };
}
