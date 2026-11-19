import type { AtualizarLacoInput, Laco, NovoLacoInput } from '../contracts/laco';

export function emAmbienteTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function tauriListarLacos(): Promise<Laco[]> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<Laco[]>('listar_lacos');
}

export async function tauriCriarLaco(input: NovoLacoInput): Promise<Laco> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<Laco>('criar_laco', { input });
}

export async function tauriAtualizarLaco(input: AtualizarLacoInput): Promise<Laco> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<Laco>('atualizar_laco', { input });
}

export async function tauriDesfazerLaco(id: string): Promise<Laco> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<Laco>('desfazer_laco', { id });
}

export async function tauriReamarrarLaco(id: string): Promise<Laco> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<Laco>('reamarrar_laco', { id });
}

export async function tauriExcluirLaco(id: string): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke<void>('excluir_laco', { id });
}

export async function tauriSalvarImagem(nome: string, dataUrl: string): Promise<string> {
  if (!emAmbienteTauri()) return dataUrl;
  const { invoke, convertFileSrc } = await import('@tauri-apps/api/core');
  const caminhoAbsoluto = await invoke<string>('salvar_imagem_base64', {
    nome,
    dataUrl,
  });
  return convertFileSrc(caminhoAbsoluto);
}

export async function tauriAbrirMural(focarNovoLaco = false): Promise<void> {
  if (!emAmbienteTauri()) return;
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('abrir_mural', { focarNovoLaco });
}

export async function tauriAlternarWidgetFlutuante(): Promise<boolean> {
  if (!emAmbienteTauri()) return true;
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<boolean>('alternar_widget_flutuante');
}

export async function tauriIniciarArrasteJanelaAtual(): Promise<void> {
  if (!emAmbienteTauri()) return;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  await getCurrentWindow().startDragging();
}

export async function tauriNotificarLembrete(titulo: string, corpo: string): Promise<void> {
  if (emAmbienteTauri()) {
    try {
      const { isPermissionGranted, requestPermission, sendNotification } = await import(
        '@tauri-apps/plugin-notification'
      );
      let permitido = await isPermissionGranted();
      if (!permitido) {
        const resp = await requestPermission();
        permitido = resp === 'granted';
      }
      if (permitido) {
        sendNotification({ title: titulo, body: corpo });
        return;
      }
    } catch {
      // Cai para Notification padrao caso plugin indisponivel
    }
  }
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(titulo, { body: corpo });
    } else if (Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        new Notification(titulo, { body: corpo });
      }
    }
  }
}

export async function tauriAssinarMudancas(aoMudar: () => void): Promise<() => void> {
  if (!emAmbienteTauri()) return () => {};
  const { listen } = await import('@tauri-apps/api/event');
  const unlistenMudou = await listen('lacos:mudou', () => {
    aoMudar();
  });
  return () => {
    unlistenMudou();
  };
}

export async function tauriAssinarFocoNovoLaco(aoPedirNovo: () => void): Promise<() => void> {
  if (!emAmbienteTauri()) return () => {};
  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = await listen('mural:focar-novo-laco', () => {
    aoPedirNovo();
  });
  return () => {
    unlisten();
  };
}
