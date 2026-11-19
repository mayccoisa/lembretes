import { useSyncExternalStore } from 'react';
import {
  VERSAO_ATUAL_APP,
  type InfoAtualizacao,
  type NovidadesPosAtualizacao,
  type ProgressoAtualizacao,
} from '../contracts/atualizacao';
import {
  assinarProgressoAtualizacao,
  confirmarLeituraNovidades,
  instalarAtualizacaoConfirmada,
  NOTAS_VERSAO_ATUAL,
  obterNovidadesPosAtualizacao,
  verificarAtualizacaoDisponivel,
} from '../services/atualizacaoService';

interface EstadoAtualizador {
  verificando: boolean;
  instalando: boolean;
  progresso: ProgressoAtualizacao | null;
  infoPendente: InfoAtualizacao | null;
  novidadesPosUpdate: NovidadesPosAtualizacao | null;
  mensagemStatus: string | null;
  erroInstalacao: string | null;
}

let estado: EstadoAtualizador = {
  verificando: false,
  instalando: false,
  progresso: null,
  infoPendente: null,
  novidadesPosUpdate: null,
  mensagemStatus: null,
  erroInstalacao: null,
};

const ouvintes = new Set<() => void>();
let inicializado = false;
let timerMensagem: ReturnType<typeof setTimeout> | null = null;

function emitir(): void {
  for (const fn of ouvintes) fn();
}

function mostrarMensagemTemporaria(texto: string): void {
  if (timerMensagem) clearTimeout(timerMensagem);
  estado = { ...estado, mensagemStatus: texto };
  emitir();
  timerMensagem = setTimeout(() => {
    estado = { ...estado, mensagemStatus: null };
    emitir();
  }, 5000);
}

async function executarVerificacao(manual: boolean): Promise<void> {
  if (estado.verificando || estado.instalando) return;
  estado = { ...estado, verificando: true, erroInstalacao: null };
  emitir();

  try {
    const info = await verificarAtualizacaoDisponivel();
    if (info.disponivel) {
      estado = {
        ...estado,
        verificando: false,
        infoPendente: info,
        mensagemStatus: null,
      };
      emitir();
    } else {
      estado = { ...estado, verificando: false };
      emitir();
      if (manual) {
        mostrarMensagemTemporaria(`Você já está na versão mais recente (v${VERSAO_ATUAL_APP}).`);
      }
    }
  } catch {
    estado = { ...estado, verificando: false };
    emitir();
    if (manual) {
      mostrarMensagemTemporaria(
        'Não foi possível consultar atualizações agora. Verifique sua conexão.'
      );
    }
  }
}

function garantirInicializacaoNoMural(): void {
  if (inicializado) return;
  inicializado = true;

  void assinarProgressoAtualizacao((progresso) => {
    estado = { ...estado, progresso };
    emitir();
  });

  // 1) Verifica primeiro se acabou de reiniciar apos instalar uma atualizacao!
  void obterNovidadesPosAtualizacao().then((novidades) => {
    if (novidades) {
      estado = { ...estado, novidadesPosUpdate: novidades };
      emitir();
    }
    // 2) Sincroniza automaticamente na abertura do app em segundo plano
    void executarVerificacao(false);
  });
}

function assinar(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

function obterSnapshot(): EstadoAtualizador {
  return estado;
}

export function useAtualizacao(ativoNoMural = true) {
  if (ativoNoMural) {
    garantirInicializacaoNoMural();
  }
  const snap = useSyncExternalStore(assinar, obterSnapshot, obterSnapshot);

  const verificarAgora = () => {
    void executarVerificacao(true);
  };

  const recusarPorAgora = () => {
    if (estado.instalando) return;
    estado = { ...estado, infoPendente: null, erroInstalacao: null };
    emitir();
  };

  const confirmarEInstalar = async () => {
    if (!estado.infoPendente || estado.instalando) return;
    const alvo = estado.infoPendente;
    estado = {
      ...estado,
      instalando: true,
      erroInstalacao: null,
      progresso: { etapa: 'baixando', percentual: 3 },
    };
    emitir();

    try {
      await instalarAtualizacaoConfirmada(alvo);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao instalar a nova versão.';
      estado = {
        ...estado,
        instalando: false,
        progresso: null,
        erroInstalacao: msg,
      };
      emitir();
    }
  };

  const fecharModalMelhorias = async () => {
    await confirmarLeituraNovidades();
    estado = { ...estado, novidadesPosUpdate: null };
    emitir();
  };

  const abrirMelhoriasVersaoAtual = () => {
    if (timerMensagem) clearTimeout(timerMensagem);
    estado = {
      ...estado,
      mensagemStatus: null,
      novidadesPosUpdate: {
        versao: VERSAO_ATUAL_APP,
        notas: NOTAS_VERSAO_ATUAL,
        instaladoEm: new Date().toISOString(),
      },
    };
    emitir();
  };

  const dispensarMensagemStatus = () => {
    if (timerMensagem) clearTimeout(timerMensagem);
    estado = { ...estado, mensagemStatus: null };
    emitir();
  };

  return {
    versaoAtual: VERSAO_ATUAL_APP,
    ...snap,
    verificarAgora,
    recusarPorAgora,
    confirmarEInstalar,
    fecharModalMelhorias,
    abrirMelhoriasVersaoAtual,
    dispensarMensagemStatus,
  };
}
