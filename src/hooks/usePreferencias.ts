import { useSyncExternalStore } from 'react';
import { acoesJanela } from '../services/lacosService';

export interface PreferenciasApp {
  tema: 'claro' | 'escuro';
  somAtivo: boolean;
  widgetVisivel: boolean;
  posicaoWidgetPreview: { x: number; y: number };
}

const CHAVE_PREFS = 'lembretes:preferencias:v1';
const ouvintes = new Set<() => void>();

function lerInicial(): PreferenciasApp {
  const padraoEscuro =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const base: PreferenciasApp = {
    tema: padraoEscuro ? 'escuro' : 'claro',
    somAtivo: true,
    widgetVisivel: true,
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

function salvarNotificar(proximo: PreferenciasApp): void {
  estadoPrefs = proximo;
  aplicarClasseTema(proximo.tema);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CHAVE_PREFS, JSON.stringify(proximo));
  }
  for (const fn of ouvintes) fn();
}

function assinar(ouvinte: () => void): () => void {
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

  const alternarWidget = async () => {
    if (acoesJanela.emTauri()) {
      const visivel = await acoesJanela.alternarWidgetFlutuante();
      salvarNotificar({ ...estadoPrefs, widgetVisivel: visivel });
      return;
    }
    salvarNotificar({ ...estadoPrefs, widgetVisivel: !estadoPrefs.widgetVisivel });
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
    alternarWidget,
    moverWidgetPreview,
  };
}
