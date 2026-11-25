// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { Laco } from '../contracts/laco';
import { criarConta, entrarNaConta, observarConta, sairDaConta } from './contaService';
import { sincronizarLembretes } from './sincronizacaoService';

const dispositivos = vi.hoisted(() => ({
  atual: [] as Laco[],
  arquivos: new Map<string, string>(),
}));

vi.mock('./tauriBridge', () => ({
  tauriListarParaSincronizar: async () => structuredClone(dispositivos.atual),
  tauriLerImagemSincronizacao: async (nome: string) => dispositivos.arquivos.get(nome),
  tauriSalvarImagem: async (_nome: string, dataUrl: string) => {
    const nome = `${crypto.randomUUID()}.png`;
    dispositivos.arquivos.set(nome, dataUrl.split(',')[1]);
    return `http://asset.localhost/${nome}`;
  },
  tauriAplicarLacoRemoto: async (_uid: string, novo: Laco, anterior?: Laco) => {
    const posicao = dispositivos.atual.findIndex(({ id }) => id === novo.id);
    const atual = dispositivos.atual[posicao];
    if (atual?.syncVersion !== anterior?.syncVersion) return false;
    if (posicao < 0) dispositivos.atual.push(novo);
    else dispositivos.atual[posicao] = novo;
    return true;
  },
}));

describe.skipIf(import.meta.env.VITE_FIREBASE_EMULADOR !== 'true')('sincronização com os emuladores Firebase', () => {
  it('importa os lembretes existentes de dois computadores, com anexo, e propaga a exclusão', async () => {
    const email = `${crypto.randomUUID()}@example.test`;
    const senha = 'senha-do-emulador';
    const id = crypto.randomUUID();
    const nomeArquivo = `${crypto.randomUUID()}.png`;
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvz0AAAAASUVORK5CYII=';
    dispositivos.arquivos.set(nomeArquivo, png);
    const primeiro: Laco[] = [{
      id, imagemNome: 'print.png', imagemUrl: `http://asset.localhost/${nomeArquivo}`,
      modo: 'checklist', titulo: 'Primeiro PC', texto: '', itens: [{ id: '1', texto: 'Conferir print', concluido: false }],
      corFita: 'ceu', estado: 'ativo', fixado: false, lembrarEm: null, notificadoEm: null,
      recorrencia: null, intervaloRecorrencia: 1, ocultoAte: null, chaveExterna: null, canalOrigem: null,
      desfeitoEm: null, createdAt: '2026-11-25T12:00:00Z', updatedAt: '2026-11-25T12:00:00Z',
      deletedAt: null, syncVersion: 1,
    }];
    dispositivos.atual = primeiro;
    await criarConta(email, senha);
    const uid = await new Promise<string>((resolver) => {
      const parar = observarConta((conta) => {
        if (!conta) return;
        parar();
        resolver(conta.uid);
      });
    });
    const { signal } = new AbortController();
    try {
      expect(await sincronizarLembretes(uid, signal)).toEqual({ precisaRepetir: false, falhas: 0 });
      await sairDaConta();
      const idSegundo = crypto.randomUUID();
      dispositivos.atual = [{ ...primeiro[0], id: idSegundo, titulo: 'Segundo PC', imagemNome: null, imagemUrl: null }];
      dispositivos.arquivos.clear();
      await entrarNaConta(email, senha);
      expect(await sincronizarLembretes(uid, signal)).toEqual({ precisaRepetir: false, falhas: 0 });
      expect(dispositivos.atual).toHaveLength(2);
      const baixado = dispositivos.atual.find((laco) => laco.id === id)!;
      expect(baixado).toMatchObject({ id, titulo: 'Primeiro PC', imagemNome: 'print.png', itens: primeiro[0].itens });
      expect(dispositivos.arquivos.get(baixado.imagemUrl?.split('/').at(-1) ?? '')).toBe(png);
      baixado.deletedAt = '2026-11-25T12:01:00Z';
      baixado.updatedAt = baixado.deletedAt;
      baixado.syncVersion++;
      expect(await sincronizarLembretes(uid, signal)).toEqual({ precisaRepetir: false, falhas: 0 });
      dispositivos.atual = primeiro;
      expect(await sincronizarLembretes(uid, signal)).toEqual({ precisaRepetir: false, falhas: 0 });
      expect(dispositivos.atual.find((laco) => laco.id === id)).toMatchObject({ deletedAt: baixado.deletedAt, imagemUrl: null, titulo: '' });
      expect(dispositivos.atual.find((laco) => laco.id === idSegundo)).toMatchObject({ titulo: 'Segundo PC' });
    } finally {
      await sairDaConta();
    }
  }, 25_000);
});
