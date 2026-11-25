import {
  compararSemver,
  extrairVersaoLimpa,
  REPOSITORIO_GITHUB,
  VERSAO_ATUAL_APP,
  type InfoAtualizacao,
  type NovidadesPosAtualizacao,
  type ProgressoAtualizacao,
} from '../contracts/atualizacao';
import { emAmbienteTauri } from './tauriBridge';

const CHAVE_NOVIDADES_LOCAL = 'lembretes:pos-atualizacao:v1';

export const NOTAS_VERSAO_ATUAL = `### Novidades da v0.4.0
* Bolinha flutuante nova, no estilo vidro: ela pega o tom do que está atrás dela na tela e o lacinho sempre contrasta, no claro e no escuro.
* Contador na bolinha com os lembretes de hoje e os vencidos, em vermelho quando algum já passou do horário.
* Ctrl+Alt+L abre o Lembretes mesmo com ele fechado, pelo atalho da área de trabalho, já pronto para amarrar um laço novo.`;

interface GithubReleasePayload {
  tag_name?: string;
  body?: string | null;
  assets?: Array<{
    name?: string;
    browser_download_url?: string;
    size?: number;
  }>;
}

export function avaliarPayloadReleaseGithub(
  payload: GithubReleasePayload,
  versaoAtual = VERSAO_ATUAL_APP
): InfoAtualizacao {
  const tagBruta = payload.tag_name ?? '0.0.0';
  const novaLimpa = extrairVersaoLimpa(tagBruta);
  const notas = (payload.body ?? '').trim();
  const assets = payload.assets ?? [];

  const assetExe =
    assets.find((a) => (a.name ?? '').toLowerCase() === 'lembretes.exe') ??
    assets.find((a) => (a.name ?? '').toLowerCase().endsWith('.exe'));

  if (compararSemver(novaLimpa, versaoAtual) > 0 && assetExe?.browser_download_url) {
    return {
      disponivel: true,
      versaoAtual,
      novaVersao: novaLimpa,
      notas: notas || 'Melhorias gerais de estabilidade e experiência de uso.',
      downloadUrl: assetExe.browser_download_url,
      tamanhoBytes: assetExe.size ?? 0,
    };
  }

  return {
    disponivel: false,
    versaoAtual,
    novaVersao: null,
    notas,
    downloadUrl: null,
    tamanhoBytes: 0,
  };
}

export async function verificarAtualizacaoDisponivel(): Promise<InfoAtualizacao> {
  if (emAmbienteTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<InfoAtualizacao>('verificar_atualizacao');
  }

  const resp = await fetch(`https://api.github.com/repos/${REPOSITORIO_GITHUB}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (resp.status === 404) {
    return {
      disponivel: false,
      versaoAtual: VERSAO_ATUAL_APP,
      novaVersao: null,
      notas: '',
      downloadUrl: null,
      tamanhoBytes: 0,
    };
  }
  if (!resp.ok) {
    throw new Error(`GitHub respondeu status ${resp.status}`);
  }
  const json = (await resp.json()) as GithubReleasePayload;
  return avaliarPayloadReleaseGithub(json, VERSAO_ATUAL_APP);
}

export async function instalarAtualizacaoConfirmada(info: InfoAtualizacao): Promise<void> {
  if (!info.disponivel || !info.novaVersao || !info.downloadUrl) {
    throw new Error('Nenhuma atualizacao valida para instalar.');
  }

  if (emAmbienteTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('instalar_atualizacao', {
      novaVersao: info.novaVersao,
      notas: info.notas,
      downloadUrl: info.downloadUrl,
      tamanhoBytes: info.tamanhoBytes,
    });
    return;
  }

  if (typeof localStorage !== 'undefined') {
    const dados: NovidadesPosAtualizacao = {
      versao: info.novaVersao,
      notas: info.notas,
      instaladoEm: new Date().toISOString(),
    };
    localStorage.setItem(CHAVE_NOVIDADES_LOCAL, JSON.stringify(dados));
  }
}

export async function obterNovidadesPosAtualizacao(): Promise<NovidadesPosAtualizacao | null> {
  if (emAmbienteTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<NovidadesPosAtualizacao | null>('obter_novidades_pos_atualizacao');
  }

  if (typeof localStorage === 'undefined') return null;
  const salvo = localStorage.getItem(CHAVE_NOVIDADES_LOCAL);
  if (!salvo) return null;
  try {
    return JSON.parse(salvo) as NovidadesPosAtualizacao;
  } catch {
    return null;
  }
}

export async function confirmarLeituraNovidades(): Promise<void> {
  if (emAmbienteTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('confirmar_leitura_novidades');
    return;
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(CHAVE_NOVIDADES_LOCAL);
  }
}

export async function assinarProgressoAtualizacao(
  aoProgredir: (progresso: ProgressoAtualizacao) => void
): Promise<() => void> {
  if (!emAmbienteTauri()) return () => {};
  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = await listen<ProgressoAtualizacao>('atualizacao:progresso', (ev) => {
    aoProgredir(ev.payload);
  });
  return () => {
    unlisten();
  };
}
