import { useEffect, useSyncExternalStore } from 'react';
import { observarConta } from '../services/contaService';
import {
  tauriAssinarMudancas, tauriContaSincronizada, tauriVersaoExternaBanco, tauriVincularConta,
} from '../services/tauriBridge';

type Fase = 'iniciando' | 'desligada' | 'outra-conta' | 'sincronizando' | 'em-dia' | 'erro';
type Estado = { fase: Fase; uid: string | null };

let estado: Estado = { fase: 'iniciando', uid: null };
let reiniciar: (() => void) | null = null;
let pendente: Promise<void> = Promise.resolve();
const ouvintes = new Set<() => void>();

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => { ouvintes.delete(ouvinte); };
}

function publicar(fase: Fase, uid: string | null) {
  estado = { fase, uid };
  for (const ouvinte of ouvintes) ouvinte();
}

function iniciarConta(uid: string) {
  const controle = new AbortController();
  const { signal } = controle;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let sonda: ReturnType<typeof setInterval> | undefined;
  let cancelarLocal: (() => void) | undefined;
  let cancelarRemoto: (() => void) | undefined;
  let versaoDb: number | undefined;
  let motor: typeof import('../services/sincronizacaoService') | undefined;

  function falhou(erro: unknown) {
    if (signal.aborted) return;
    console.warn('Sincronização dos Lembretes interrompida', erro);
    publicar('erro', uid);
  }

  function solicitar(espera = 500) {
    if (signal.aborted) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      pendente = pendente.then(async () => {
        if (signal.aborted || !motor) return;
        publicar('sincronizando', uid);
        const { precisaRepetir, falhas } = await motor.sincronizarLembretes(uid, signal);
        if (signal.aborted) return;
        publicar(falhas ? 'erro' : 'em-dia', uid);
        if (precisaRepetir || falhas) solicitar(falhas ? 60_000 : 500);
      }).catch((erro: unknown) => {
        falhou(erro);
        solicitar(60_000);
      });
    }, espera);
  }

  async function configurar() {
    const vinculo = await tauriContaSincronizada();
    if (signal.aborted) return;
    if (vinculo !== uid) {
      publicar(vinculo ? 'outra-conta' : 'desligada', uid);
      return;
    }
    publicar('sincronizando', uid);
    motor = await import('../services/sincronizacaoService');
    if (signal.aborted) return;
    const desconectar = await tauriAssinarMudancas(() => solicitar());
    if (signal.aborted) {
      desconectar();
      return;
    }
    cancelarLocal = desconectar;
    cancelarRemoto = motor.acompanharRemotos(uid, () => solicitar(), falhou);
    sonda = setInterval(() => {
      void tauriVersaoExternaBanco().then((versao) => {
        if (versao !== versaoDb) solicitar();
        versaoDb = versao;
      }).catch(falhou);
    }, 15_000);
    solicitar(0);
  }

  void configurar().catch(falhou);
  return () => {
    controle.abort();
    clearTimeout(timer);
    clearInterval(sonda);
    cancelarLocal?.();
    cancelarRemoto?.();
  };
}

export function ControladorSincronizacao() {
  useEffect(() => {
    let cancelarConta: (() => void) | undefined;
    let uid: string | null = null;
    const atualizar = () => {
      cancelarConta?.();
      if (!uid) {
        publicar('desligada', null);
        return;
      }
      publicar('iniciando', uid);
      cancelarConta = iniciarConta(uid);
    };
    reiniciar = atualizar;
    const cancelarAuth = observarConta((conta) => {
      uid = conta?.uid ?? null;
      atualizar();
    });
    return () => {
      cancelarAuth();
      cancelarConta?.();
      reiniciar = null;
    };
  }, []);
  return null;
}

export function useSincronizacao() {
  const atual = useSyncExternalStore(assinar, () => estado, () => estado);
  async function ativar() {
    if (!atual.uid || atual.fase !== 'desligada') return;
    try {
      await tauriVincularConta(atual.uid);
      reiniciar?.();
    } catch (erro) {
      console.warn('Não foi possível vincular a conta ao SQLite', erro);
      publicar('erro', atual.uid);
    }
  }
  return { ...atual, ativar, tentarNovamente: () => reiniciar?.() };
}
