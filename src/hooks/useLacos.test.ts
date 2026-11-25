import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Laco } from '../contracts/laco';

const listarLacosMock = vi.fn<() => Promise<Laco[]>>();

vi.mock('../services/lacosService', async (original) => {
  const real = await original<typeof import('../services/lacosService')>();
  return {
    ...real,
    listarLacos: () => listarLacosMock(),
    dispararResumoDiarioSeNecessario: async () => undefined,
    verificarNotificacoesPendentes: async () => false,
  };
});

const { recarregarCacheLacos, lerEstadoCacheLacos } = await import('./useLacos');

function laco(id: string): Laco {
  const agora = new Date().toISOString();
  return {
    id,
    titulo: '',
    modo: 'texto',
    texto: 'teste',
    itens: [],
    corFita: 'carmim',
    imagemUrl: null,
    imagemNome: null,
    fixado: false,
    lembrarEm: null,
    notificadoEm: null,
    recorrencia: null,
    intervaloRecorrencia: 1,
    ocultoAte: null,
    chaveExterna: null,
    canalOrigem: null,
    estado: 'ativo',
    desfeitoEm: null,
    createdAt: agora,
    updatedAt: agora,
    deletedAt: null,
    syncVersion: 1,
  };
}

describe('recarregarCacheLacos · abertura do app', () => {
  beforeEach(() => {
    listarLacosMock.mockReset();
  });

  it('tenta de novo quando a primeira leitura chega antes do shell nativo estar pronto', async () => {
    // Erro literal do Tauri quando a janela chama o comando antes do .manage() do setup
    listarLacosMock
      .mockRejectedValueOnce(
        'state not managed for field `state` on command `listar_lacos`. You must call `.manage()` before using this command'
      )
      .mockResolvedValueOnce([laco('a'), laco('b')]);

    await recarregarCacheLacos(true);

    expect(listarLacosMock).toHaveBeenCalledTimes(2);
    expect(lerEstadoCacheLacos().lacos.map((l) => l.id)).toEqual(['a', 'b']);
    expect(lerEstadoCacheLacos().carregado).toBe(true);
  });
});
