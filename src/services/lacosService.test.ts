import { beforeEach, describe, expect, it } from 'vitest';
import {
  atualizarLaco,
  criarLaco,
  desfazerLaco,
  excluirLaco,
  filtrarPorBusca,
  lacoEstaVencido,
  listarAgendadosRecorrentes,
  listarLacos,
  listarVencendoHoje,
  montarTextoResumoHoje,
  ordenarLacos,
  reamarrarLaco,
  recuperarRascunhoInterrompido,
  salvarRascunhoCompositor,
  testesInternos,
} from './lacosService';

describe('lacosService · ciclo de vida completo do laco', () => {
  beforeEach(() => {
    testesInternos.resetarBancoLocal(true);
  });

  it('recusa criar laco completamente vazio (RN-01)', async () => {
    await expect(
      criarLaco({ titulo: '   ', texto: '', itens: [], imagemUrl: null }, false)
    ).rejects.toThrow(/Informe um texto/);
  });

  it('permite criar laco apenas com imagem anexada (RN-01)', async () => {
    const laco = await criarLaco(
      {
        imagemUrl: 'data:image/png;base64,iVBORw0KGgo=',
        imagemNome: 'recibo.png',
        corFita: 'ceu',
      },
      false
    );
    expect(laco.id).toBeTruthy();
    expect(laco.corFita).toBe('ceu');
    expect(laco.estado).toBe('ativo');
    expect(laco.syncVersion).toBe(1);
  });

  it('desfaz o laco, move para desfeitos e permite reamarrar (RN-03)', async () => {
    const criado = await criarLaco(
      { titulo: 'Ligar para o contador', texto: 'Pedir guia do mes' },
      false
    );

    const desfeito = await desfazerLaco(criado.id, false);
    expect(desfeito.estado).toBe('desfeito');
    expect(desfeito.desfeitoEm).toBeTruthy();
    expect(desfeito.syncVersion).toBe(2);

    const ativosAposDesfazer = ordenarLacos(await listarLacos(), 'ativo');
    const desfeitosAposDesfazer = ordenarLacos(await listarLacos(), 'desfeito');
    expect(ativosAposDesfazer).toHaveLength(0);
    expect(desfeitosAposDesfazer).toHaveLength(1);

    const reamarrado = await reamarrarLaco(criado.id, false);
    expect(reamarrado.estado).toBe('ativo');
    expect(reamarrado.desfeitoEm).toBeNull();
    expect(reamarrado.syncVersion).toBe(3);
  });

  it('ordena fixados primeiro e filtra por busca em titulo, texto e checklist', async () => {
    await criarLaco({ titulo: 'Comum', texto: 'Nota normal', fixado: false }, false);
    await criarLaco(
      {
        titulo: 'Importante',
        modo: 'checklist',
        itens: [{ id: '1', texto: 'Comprar fita vermelha', concluido: false }],
        fixado: true,
      },
      false
    );

    const todos = await listarLacos();
    const ordenados = ordenarLacos(todos, 'ativo');
    expect(ordenados[0].titulo).toBe('Importante');

    const buscaItem = filtrarPorBusca(ordenados, 'vermelha');
    expect(buscaItem).toHaveLength(1);
    expect(buscaItem[0].titulo).toBe('Importante');
  });

  it('detecta lembrete vencido e limpa exclusao logica (RN-02 e RN-04)', async () => {
    const passado = new Date(Date.now() - 60_000).toISOString();
    const laco = await criarLaco(
      { titulo: 'Reuniao', lembrarEm: passado },
      false
    );
    expect(lacoEstaVencido(laco)).toBe(true);

    const reagendado = await atualizarLaco({
      id: laco.id,
      lembrarEm: new Date(Date.now() + 3_600_000).toISOString(),
    });
    expect(lacoEstaVencido(reagendado)).toBe(false);

    await excluirLaco(laco.id);
    expect(await listarLacos()).toHaveLength(0);
  });

  it('resgata automaticamente no boot um rascunho digitado cujo processo foi fechado antes de clicar em salvar', async () => {
    salvarRascunhoCompositor({
      titulo: 'Ideia urgente',
      modo: 'texto',
      texto: 'Nao esquecer de revisar o layout da home',
      corFita: 'lavanda',
    });

    const resgatado = await recuperarRascunhoInterrompido();
    expect(resgatado).not.toBeNull();
    expect(resgatado?.titulo).toBe('Ideia urgente');

    const ativos = ordenarLacos(await listarLacos(), 'ativo');
    expect(ativos).toHaveLength(1);
    expect(ativos[0].texto).toBe('Nao esquecer de revisar o layout da home');

    // Segunda chamada deve ser idempotente (nao duplicar o resgate)
    const segundaPassada = await recuperarRascunhoInterrompido();
    expect(segundaPassada).toBeNull();
    expect(await listarLacos()).toHaveLength(1);
  });

  it('reagenda e oculta hoje ao desfazer laco recorrente, e contabiliza vencimentos de hoje', async () => {
    const hojeTarde = new Date();
    hojeTarde.setHours(22, 30, 0, 0);

    const rec = await criarLaco(
      {
        titulo: 'Checar fila comercial',
        recorrencia: 'dias-uteis',
        lembrarEm: hojeTarde.toISOString(),
        chaveExterna: 'hub:fila-comercial',
        canalOrigem: 'Product Hub',
      },
      false
    );

    const hojeAntes = listarVencendoHoje(await listarLacos());
    expect(hojeAntes).toHaveLength(1);
    expect(montarTextoResumoHoje(hojeAntes)?.titulo).toBe('1 lembrete vence hoje');

    await desfazerLaco(rec.id, false);
    const todos = await listarLacos();
    expect(ordenarLacos(todos, 'ativo')).toHaveLength(0);
    expect(listarAgendadosRecorrentes(todos)).toHaveLength(1);
    expect(listarVencendoHoje(todos)).toHaveLength(0);
  });
});
