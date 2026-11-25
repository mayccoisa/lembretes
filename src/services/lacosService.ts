import {
  lacoEstaOcultoAteProximoCiclo,
  lacoTemConteudoValido,
  lacoVenceHoje,
  type AtualizarLacoInput,
  type EstadoLaco,
  type Laco,
  type NovoLacoInput,
} from '../contracts/laco';
import {
  fallbackAtualizarLaco,
  fallbackCriarLaco,
  fallbackDesfazerLaco,
  fallbackExcluirLaco,
  fallbackListarLacos,
  fallbackReamarrarLaco,
  fallbackResetarParaTeste,
} from './localStoreFallback';
import { tocarSomAmarrar, tocarSomDesatar } from './somFita';
import {
  emAmbienteTauri,
  tauriAbrirConfigBarraWindows,
  tauriAbrirMural,
  tauriAssinarFocoNovoLaco,
  tauriAssinarModoAtalho,
  tauriAssinarMudancas,
  tauriAtualizarLaco,
  tauriCriarLaco,
  tauriDefinirModoAtalho,
  tauriDesfazerLaco,
  tauriExcluirLaco,
  tauriIniciarArrasteJanelaAtual,
  tauriListarLacos,
  tauriMostrarMenuWidget,
  tauriAmostrarCorFundoWidget,
  tauriNotificarLembrete,
  tauriObterModoAtalho,
  tauriReamarrarLaco,
  tauriSalvarImagem,
  type ModoAtalhoWindows,
} from './tauriBridge';

export type { ModoAtalhoWindows };

const CANAL_SYNC = 'lembretes-sync-canal';
const CHAVE_RASCUNHO = 'lembretes:rascunho-ativo:v1';
const CHAVE_RESUMO_HOJE = 'lembretes:resumo-diario:v1';

interface RegistroResumoDiario {
  dataLocal: string;
  quantidadeNotificada: number;
}

function chaveDataLocalHoje(ref = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${ref.getFullYear()}-${pad(ref.getMonth() + 1)}-${pad(ref.getDate())}`;
}

function avisarOutrasAbas(): void {
  if (typeof BroadcastChannel === 'undefined') return;
  const canal = new BroadcastChannel(CANAL_SYNC);
  canal.postMessage({ tipo: 'mudou' });
  canal.close();
}

export function salvarRascunhoCompositor(input: NovoLacoInput): void {
  if (typeof localStorage === 'undefined') return;
  if (!lacoTemConteudoValido(input)) {
    localStorage.removeItem(CHAVE_RASCUNHO);
    return;
  }
  localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(input));
}

export function limparRascunhoCompositor(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(CHAVE_RASCUNHO);
}

export function lerRascunhoCompositor(): NovoLacoInput | null {
  if (typeof localStorage === 'undefined') return null;
  const bruto = localStorage.getItem(CHAVE_RASCUNHO);
  if (!bruto) return null;
  try {
    const parsed = JSON.parse(bruto) as NovoLacoInput;
    return lacoTemConteudoValido(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function recuperarRascunhoInterrompido(): Promise<Laco | null> {
  const pendente = lerRascunhoCompositor();
  if (!pendente) return null;
  limparRascunhoCompositor();
  return criarLaco(pendente, false);
}

export function ordenarLacos(lacos: Laco[], estado: EstadoLaco, agoraMs = Date.now()): Laco[] {
  const filtrados = lacos.filter((l) => {
    if (l.deletedAt !== null || l.estado !== estado) return false;
    if (estado === 'ativo' && lacoEstaOcultoAteProximoCiclo(l, agoraMs)) {
      return false;
    }
    return true;
  });
  return [...filtrados].sort((a, b) => {
    if (estado === 'ativo' && a.fixado !== b.fixado) {
      return a.fixado ? -1 : 1;
    }
    const refA = estado === 'desfeito' ? (a.desfeitoEm ?? a.updatedAt) : a.updatedAt;
    const refB = estado === 'desfeito' ? (b.desfeitoEm ?? b.updatedAt) : b.updatedAt;
    return refB.localeCompare(refA);
  });
}

export function listarAgendadosRecorrentes(lacos: Laco[], agoraMs = Date.now()): Laco[] {
  return lacos
    .filter((l) => l.deletedAt === null && lacoEstaOcultoAteProximoCiclo(l, agoraMs))
    .sort((a, b) => (a.lembrarEm ?? a.ocultoAte ?? '').localeCompare(b.lembrarEm ?? b.ocultoAte ?? ''));
}

export function listarVencendoHoje(lacos: Laco[], referencia = new Date()): Laco[] {
  return lacos
    .filter((l) => lacoVenceHoje(l, referencia))
    .sort((a, b) => (a.lembrarEm ?? '').localeCompare(b.lembrarEm ?? ''));
}

export function filtrarPorBusca(lacos: Laco[], busca: string): Laco[] {
  const termo = busca.trim().toLowerCase();
  if (!termo) return lacos;
  return lacos.filter((l) => {
    if (l.titulo.toLowerCase().includes(termo)) return true;
    if (l.texto.toLowerCase().includes(termo)) return true;
    if (l.itens.some((item) => item.texto.toLowerCase().includes(termo))) return true;
    if (l.imagemNome && l.imagemNome.toLowerCase().includes(termo)) return true;
    if (l.canalOrigem && l.canalOrigem.toLowerCase().includes(termo)) return true;
    return false;
  });
}

export function lacoEstaVencido(laco: Laco, referenciaMs = Date.now()): boolean {
  if (laco.estado !== 'ativo' || !laco.lembrarEm) return false;
  if (lacoEstaOcultoAteProximoCiclo(laco, referenciaMs)) return false;
  const alvo = new Date(laco.lembrarEm).getTime();
  return !Number.isNaN(alvo) && alvo <= referenciaMs;
}

export async function listarLacos(): Promise<Laco[]> {
  if (emAmbienteTauri()) {
    return tauriListarLacos();
  }
  return fallbackListarLacos();
}

export async function criarLaco(input: NovoLacoInput, somHabilitado = true): Promise<Laco> {
  if (!lacoTemConteudoValido(input)) {
    throw new Error('Informe um texto, item de lista ou imagem para amarrar o laco.');
  }
  const criado = emAmbienteTauri() ? await tauriCriarLaco(input) : fallbackCriarLaco(input);
  tocarSomAmarrar(somHabilitado);
  avisarOutrasAbas();
  return criado;
}

export async function atualizarLaco(input: AtualizarLacoInput): Promise<Laco> {
  const atualizado = emAmbienteTauri()
    ? await tauriAtualizarLaco(input)
    : fallbackAtualizarLaco(input);
  avisarOutrasAbas();
  return atualizado;
}

export async function desfazerLaco(id: string, somHabilitado = true): Promise<Laco> {
  tocarSomDesatar(somHabilitado);
  const desfeito = emAmbienteTauri() ? await tauriDesfazerLaco(id) : fallbackDesfazerLaco(id);
  avisarOutrasAbas();
  return desfeito;
}

export async function reamarrarLaco(id: string, somHabilitado = true): Promise<Laco> {
  tocarSomAmarrar(somHabilitado);
  const reamarrado = emAmbienteTauri()
    ? await tauriReamarrarLaco(id)
    : fallbackReamarrarLaco(id);
  avisarOutrasAbas();
  return reamarrado;
}

export async function excluirLaco(id: string): Promise<void> {
  if (emAmbienteTauri()) {
    await tauriExcluirLaco(id);
  } else {
    fallbackExcluirLaco(id);
  }
  avisarOutrasAbas();
}

export async function lerArquivoImagem(arquivo: File): Promise<{ url: string; nome: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Falha ao ler a imagem selecionada.'));
    reader.readAsDataURL(arquivo);
  });
  const nome = arquivo.name || `print-${Date.now()}.png`;
  const urlSalva = await tauriSalvarImagem(nome, dataUrl);
  return { url: urlSalva, nome };
}

export function montarTextoResumoHoje(vencendoHoje: Laco[]): {
  titulo: string;
  corpo: string;
} | null {
  const qtd = vencendoHoje.length;
  if (qtd === 0) return null;

  const resumoNomes = vencendoHoje
    .slice(0, 3)
    .map((l) => l.titulo || l.texto.slice(0, 42) || 'Lembrança com imagem')
    .join(' · ');

  if (qtd === 1) {
    return {
      titulo: '1 lembrete vence hoje',
      corpo: resumoNomes,
    };
  }
  return {
    titulo: `${qtd} lembretes vencem hoje`,
    corpo: `Para hoje: ${resumoNomes}`,
  };
}

export async function dispararResumoDiarioSeNecessario(
  lacos: Laco[],
  forcar = false
): Promise<boolean> {
  const deHoje = listarVencendoHoje(lacos);
  const mensagem = montarTextoResumoHoje(deHoje);
  if (!mensagem) return false;

  const hoje = chaveDataLocalHoje();
  if (!forcar && typeof localStorage !== 'undefined') {
    try {
      const salvo = localStorage.getItem(CHAVE_RESUMO_HOJE);
      if (salvo) {
        const reg = JSON.parse(salvo) as RegistroResumoDiario;
        if (reg.dataLocal === hoje && deHoje.length <= reg.quantidadeNotificada) {
          return false;
        }
      }
    } catch {
      // prossegue
    }
  }

  await tauriNotificarLembrete(mensagem.titulo, mensagem.corpo);
  if (typeof localStorage !== 'undefined') {
    const novoReg: RegistroResumoDiario = {
      dataLocal: hoje,
      quantidadeNotificada: deHoje.length,
    };
    localStorage.setItem(CHAVE_RESUMO_HOJE, JSON.stringify(novoReg));
  }
  return true;
}

export async function verificarNotificacoesPendentes(lacos: Laco[]): Promise<boolean> {
  const agoraMs = Date.now();
  let disparouAlgum = false;
  for (const laco of lacos) {
    if (lacoEstaVencido(laco, agoraMs) && !laco.notificadoEm) {
      const titulo = laco.titulo || 'Laço esperando por você!';
      const corpo =
        laco.modo === 'checklist'
          ? laco.itens
              .filter((i) => !i.concluido)
              .map((i) => i.texto)
              .slice(0, 2)
              .join(' · ') || 'Confira os itens anotados no seu laço.'
          : laco.texto.slice(0, 110) || 'Abra seus lembretes para conferir a imagem.';
      await tauriNotificarLembrete(titulo, corpo);
      await atualizarLaco({ id: laco.id, notificadoEm: new Date(agoraMs).toISOString() });
      disparouAlgum = true;
    }
  }
  return disparouAlgum;
}

export function assinarSincronizacaoExterna(aoMudar: () => void): () => void {
  let cancelarTauri: (() => void) | null = null;
  void tauriAssinarMudancas(aoMudar).then((fn) => {
    cancelarTauri = fn;
  });

  let canal: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    canal = new BroadcastChannel(CANAL_SYNC);
    canal.onmessage = () => aoMudar();
  }

  const aoMudarStorage = (ev: StorageEvent) => {
    if (ev.key?.startsWith('lembretes:')) aoMudar();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', aoMudarStorage);
  }

  return () => {
    if (cancelarTauri) cancelarTauri();
    if (canal) canal.close();
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', aoMudarStorage);
    }
  };
}

export const acoesJanela = {
  emTauri: emAmbienteTauri,
  abrirMural: tauriAbrirMural,
  obterModoAtalho: tauriObterModoAtalho,
  definirModoAtalho: tauriDefinirModoAtalho,
  assinarModoAtalho: tauriAssinarModoAtalho,
  mostrarMenuWidget: tauriMostrarMenuWidget,
  amostrarCorFundoWidget: tauriAmostrarCorFundoWidget,
  abrirConfigBarraWindows: tauriAbrirConfigBarraWindows,
  iniciarArrasteJanelaAtual: tauriIniciarArrasteJanelaAtual,
  assinarFocoNovoLaco: tauriAssinarFocoNovoLaco,
};

export const testesInternos = {
  resetarBancoLocal: (vazio = true) => {
    limparRascunhoCompositor();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(CHAVE_RESUMO_HOJE);
    }
    fallbackResetarParaTeste(vazio);
  },
};
