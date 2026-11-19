import { useSyncExternalStore } from 'react';
import { acoesJanela, type ModoAtalhoWindows } from '../services/lacosService';

export type TomBotaoAtalho = 'lavanda' | 'neutro' | 'carmim';

export interface PreferenciasApp {
  tema: 'claro' | 'escuro';
  somAtivo: boolean;
  modoAtalho: ModoAtalhoWindows;
  tomAtalho: TomBotaoAtalho;
  posicaoWidgetPreview: { x: number; y: number };
}

const CHAVE_PREFS = 'lembretes:preferencias:v2';
const CANAL_PREFS = 'lembretes-prefs-sync';
const ouvintes = new Set<() => void>();
let sincronizadoComTauri = false;

function lerInicial(): PreferenciasApp {
  const padraoEscuro =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const base: PreferenciasApp = {
    tema: padraoEscuro ? 'escuro' : 'claro',
    somAtivo: true,
    modoAtalho: 'flutuante',
    tomAtalho: 'lavanda',
    posicaoWidgetPreview: { x: 24, y: 120 },
  };

  if (typeof localStorage === 'undefined') return base;
  try {
    const salvo = localStorage.getItem(CHAVE_PREFS);
    if (!salvo) return base;
    return { ...base, ...(JSON.parse(salvo) as Partial<PreferenciasApp>) };
  } catch {
    return base;
  }
}

let estadoPrefs: PreferenciasApp = lerInicial();

function aplicarClasseTema(tema: 'claro' | 'escuro'): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', tema === 'escuro');
}

aplicarClasseTema(estadoPrefs.tema);

function salvarNotificar(proximo: PreferenciasApp, propagarOutrasJanelas = true): void {
  estadoPrefs = proximo;
  aplicarClasseTema(proximo.tema);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CHAVE_PREFS, JSON.stringify(proximo));
  }
  if (propagarOutrasJanelas && typeof BroadcastChannel !== 'undefined') {
    const canal = new BroadcastChannel(CANAL_PREFS);
    canal.postMessage(proximo);
    canal.close();
  }
  for (const fn of ouvintes) fn();
}

function garantirSincroniaPrefs(): void {
  if (sincronizadoComTauri) return;
  sincronizadoComTauri = true;

  if (acoesJanela.emTauri()) {
    void acoesJanela.obterModoAtalho().then((modoNativo) => {
      if (modoNativo !== estadoPrefs.modoAtalho) {
        salvarNotificar({ ...estadoPrefs, modoAtalho: modoNativo }, false);
      }
    });
    void acoesJanela.assinarModoAtalho((novoModo) => {
      salvarNotificar({ ...estadoPrefs, modoAtalho: novoModo }, false);
    });
  }

  if (typeof BroadcastChannel !== 'undefined') {
    const canal = new BroadcastChannel(CANAL_PREFS);
    canal.onmessage = (ev: MessageEvent<PreferenciasApp>) => {
      if (ev.data) salvarNotificar(ev.data, false);
    };
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (ev) => {
      if (ev.key === CHAVE_PREFS && ev.newValue) {
        try {
          salvarNotificar(JSON.parse(ev.newValue) as PreferenciasApp, false);
        } catch {
          // ignora json invalido
        }
      }
    });
  }
}

function assinar(ouvinte: () => void): () => void {
  garantirSincroniaPrefs();
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

function obterSnapshot(): PreferenciasApp {
  return estadoPrefs;
}

export function usePreferencias() {
  const prefs = useSyncExternalStore(assinar, obterSnapshot, obterSnapshot);

  const alternarTema = () => {
    salvarNotificar({
      ...estadoPrefs,
      tema: estadoPrefs.tema === 'claro' ? 'escuro' : 'claro',
    });
  };

  const alternarSom = () => {
    salvarNotificar({
      ...estadoPrefs,
      somAtivo: !estadoPrefs.somAtivo,
    });
  };

  const escolherModoAtalho = async (modo: ModoAtalhoWindows) => {
    if (acoesJanela.emTauri()) {
      const confirmado = await acoesJanela.definirModoAtalho(modo);
      salvarNotificar({ ...estadoPrefs, modoAtalho: confirmado });
      return;
    }
    salvarNotificar({ ...estadoPrefs, modoAtalho: modo });
  };

  const escolherTomAtalho = (tomAtalho: TomBotaoAtalho) => {
    salvarNotificar({ ...estadoPrefs, tomAtalho });
  };

  const moverWidgetPreview = (x: number, y: number) => {
    salvarNotificar({
      ...estadoPrefs,
      posicaoWidgetPreview: { x, y },
    });
  };

  return {
    ...prefs,
    emTauri: acoesJanela.emTauri(),
    alternarTema,
    alternarSom,
    escolherModoAtalho,
    escolherTomAtalho,
    moverWidgetPreview,
    mostrarMenuWidgetNativo: acoesJanela.mostrarMenuWidget,
    abrirConfigBarraWindows: acoesJanela.abrirConfigBarraWindows,
  };
}
