// @vitest-environment node
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const raiz = process.cwd();
let pastaTemp: string;
let client: Client;

async function chamarDados<T = any>(nome: string, args: Record<string, unknown> = {}): Promise<T> {
  const resultado = await client.callTool({ name: nome, arguments: args });
  expect(resultado.isError, JSON.stringify(resultado.content)).not.toBe(true);
  const valor = resultado.structuredContent as { dados: T };
  expect(valor).toBeDefined();
  return valor.dados;
}

beforeAll(async () => {
  pastaTemp = mkdtempSync(path.join(tmpdir(), 'lembretes-mcp-'));
  const dbTemp = path.join(pastaTemp, 'teste-mcp.db');

  client = new Client({ name: 'lembretes-teste-mcp', version: '0.3.0' });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: ['--no-warnings', path.join(raiz, 'mcp', 'iniciar.mjs')],
      env: {
        ...process.env,
        LEMBRETES_DB_PATH: dbTemp,
      },
    })
  );
}, 30_000);

afterAll(async () => {
  if (client) {
    await client.close();
  }
  if (pastaTemp) {
    rmSync(pastaTemp, { recursive: true, force: true });
  }
});

describe('MCP oficial do Lembretes · stdio real', () => {
  it('expoe as 8 ferramentas e entrega o guia autoexplicativo em entender_lembretes', async () => {
    const listaTools = await client.listTools();
    const nomes = listaTools.tools.map((t) => t.name);
    expect(nomes).toEqual(
      expect.arrayContaining([
        'entender_lembretes',
        'resumo_vencimentos_hoje',
        'listar_lacos',
        'criar_ou_atualizar_laco',
        'atualizar_laco',
        'desfazer_laco',
        'reamarrar_laco',
        'excluir_laco',
      ])
    );

    const guia = await chamarDados('entender_lembretes');
    expect(guia.guia).toContain('chaveExterna');
    expect(guia.recorrenciasDisponiveis).toContain('dias-uteis');
  });

  it('cria lembrete recorrente de demanda oculta, evita duplicata por chaveExterna e reagenda ao desfazer', async () => {
    const hojeMaisTarde = new Date();
    hojeMaisTarde.setHours(23, 0, 0, 0);

    const r1 = await chamarDados('criar_ou_atualizar_laco', {
      titulo: 'Demanda oculta: alinhar handoff do checkout',
      texto: 'Thread sem dono identificada no canal de produto',
      corFita: 'ambar',
      recorrencia: 'diaria',
      lembrarEm: hojeMaisTarde.toISOString(),
      chaveExterna: 'slack:#produto:thread-checkout-99',
      canalOrigem: 'Slack · #produto',
    });
    expect(r1.acao).toBe('criado');
    expect(r1.laco.recorrencia).toBe('diaria');
    expect(r1.laco.canalOrigem).toBe('Slack · #produto');

    // Segunda varredura da IA sobre a mesma demanda oculta nao duplica
    const r2 = await chamarDados('criar_ou_atualizar_laco', {
      titulo: 'Demanda oculta: alinhar handoff do checkout (2 mensagens novas)',
      texto: 'Thread ganhou urgencia hoje',
      corFita: 'carmim',
      recorrencia: 'diaria',
      lembrarEm: hojeMaisTarde.toISOString(),
      chaveExterna: 'slack:#produto:thread-checkout-99',
      canalOrigem: 'Slack · #produto',
    });
    expect(r2.acao).toBe('atualizado');
    expect(r2.laco.id).toBe(r1.laco.id);

    const resumoHoje = await chamarDados('resumo_vencimentos_hoje');
    expect(resumoHoje.totalVencendoHoje).toBe(1);

    // Desfazer hoje esconde dos ativos de hoje e move para agendados ate o proximo ciclo
    const aposDesfazer = await chamarDados('desfazer_laco', { id: r1.laco.id });
    expect(aposDesfazer.ocultoAte).toBeTruthy();

    const ativosHoje = await chamarDados('listar_lacos', { visao: 'ativos' });
    expect(ativosHoje.total).toBe(0);

    const agendados = await chamarDados('listar_lacos', { visao: 'agendados' });
    expect(agendados.total).toBe(1);
  });
});
