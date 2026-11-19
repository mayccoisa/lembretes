import {
  lacoTemConteudoValido,
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
  tauriAbrirMural,
  tauriAlternarWidgetFlutuante,
  tauriAssinarFocoNovoLaco,
  tauriAssinarMudancas,
  tauriAtualizarLaco,
  tauriCriarLaco,
  tauriDesfazerLaco,
  tauriExcluirLaco,
  tauriIniciarArrasteJanelaAtual,
  tauriListarLacos,
  tauriNotificarLembrete,
  tauriReamarrarLaco,
  tauriSalvarImagem,
} from './tauriBridge';

const CANAL_SYNC = 'lembretes-sync-canal';

function avisarOutrasAbas(): void {
  if (typeof BroadcastChannel === 'undefined') return;
  const canal = new BroadcastChannel(CANAL_SYNC);
  canal.postMessage({ tipo: 'mudou' });
  canal.close();
}

export function ordenarLacos(lacos: Laco[], estado: EstadoLaco): Laco[] {
  const filtrados = lacos.filter((l) => l.estado === estado && l.deletedAt === null);
  return [...filtrados].sort((a, b) => {
    if (estado === 'ativo' && a.fixado !== b.fixado) {
      return a.fixado ? -1 : 1;
    }
    const refA = estado === 'desfeito' ? (a.desfeitoEm ?? a.updatedAt) : a.updatedAt;
    const refB = estado === 'desfeito' ? (b.desfeitoEm ?? b.updatedAt) : b.updatedAt;
    return refB.localeCompare(refA);
  });
}

export function filtrarPorBusca(lacos: Laco[], busca: string): Laco[] {
  const termo = busca.trim().toLowerCase();
  if (!termo) return lacos;
  return lacos.filter((l) => {
    if (l.titulo.toLowerCase().includes(termo)) return true;
    if (l.texto.toLowerCase().includes(termo)) return true;
    if (l.itens.some((item) => item.texto.toLowerCase().includes(termo))) return true;
    if (l.imagemNome && l.imagemNome.toLowerCase().includes(termo)) return true;
    return false;
  });
}

export function lacoEstaVencido(laco: Laco, referenciaMs = Date.now()): boolean {
  if (laco.estado !== 'ativo' || !laco.lembrarEm) return false;
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

export async function verificarNotificacoesPendentes(lacos: Laco[]): Promise<boolean> {
  const agoraMs = Date.now();
  let disparouAlgum = false;
  for (const laco of lacos) {
    if (lacoEstaVencido(laco, agoraMs) && !laco.notificadoEm) {
      const titulo = laco.titulo || 'Laco esperando por voce!';
      const corpo =
        laco.modo === 'checklist'
          ? laco.itens
              .filter((i) => !i.concluido)
              .map((i) => i.texto)
              .slice(0, 2)
              .join(' · ') || 'Confira os itens anotados no seu laco.'
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
  alternarWidgetFlutuante: tauriAlternarWidgetFlutuante,
  iniciarArrasteJanelaAtual: tauriIniciarArrasteJanelaAtual,
  assinarFocoNovoLaco: tauriAssinarFocoNovoLaco,
};

export const testesInternos = {
  resetarBancoLocal: fallbackResetarParaTeste,
};
