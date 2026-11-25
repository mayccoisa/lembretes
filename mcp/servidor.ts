import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import {
  lacoEstaOcultoAteProximoCiclo,
  lacoVenceHoje,
} from '../src/contracts/laco';
import {
  mcpAtualizarLaco,
  mcpCriarOuAtualizarLaco,
  mcpDesfazerLaco,
  mcpExcluirLaco,
  mcpListarTodos,
  mcpReamarrarLaco,
  mcpResumoHoje,
} from './banco';

const CORES = ['carmim', 'ambar', 'salvia', 'ceu', 'lavanda', 'pessego'] as const;
const MODOS = ['texto', 'checklist'] as const;
const RECORRENCIAS = [
  'diaria',
  'dias-uteis',
  'semanal',
  'mensal',
  'intervalo-horas',
  'intervalo-dias',
] as const;

const GUIA_AGENTE = `Lembretes e o aplicativo nativo de PC do Maycon inspirado no Google Keep, onde cada lembrete e um laco visual.
Como operar bem como agente de IA:
1. Antes de criar lembretes a partir de analise de canais (Slack, Jira, WhatsApp, e-mail, Product Hub), consulte listar_lacos ou resumo_vencimentos_hoje para entender o que ja esta ativo.
2. Sempre preencha chaveExterna (ex.: "slack:#produto:demanda-login" ou "jira:WAI-402") e canalOrigem (ex.: "Slack · #produto") ao registrar demandas ocultas: assim novas analises atualizam o mesmo laco sem duplicar cards no mural.
3. Semantica recomendada das cores de fita (corFita):
   * carmim: urgente, bloqueio ou prazo critico hoje
   * ambar: demanda oculta detectada em canal que exige acompanhamento
   * ceu: lembrete recorrente de verificacao ou ritual
   * salvia: rotina leve ou pessoal
   * lavanda: ideia, estrategia ou discovery
   * pessego: retorno pendente com pessoa ou stakeholder
4. Para acompanhamentos continuos de demandas ocultas, defina recorrencia ("diaria", "dias-uteis", "semanal", "mensal", "intervalo-horas" ou "intervalo-dias") e lembrarEm em ISO 8601. Quando o usuario desfaz um laco recorrente hoje, o sistema o oculta hoje e reagenda automaticamente para o proximo ciclo.`;

const itemSchema = z.object({
  id: z.string(),
  texto: z.string(),
  concluido: z.boolean(),
});

const lacoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  modo: z.enum(MODOS),
  texto: z.string(),
  itens: z.array(itemSchema),
  corFita: z.enum(CORES),
  imagemUrl: z.string().nullable(),
  imagemNome: z.string().nullable(),
  fixado: z.boolean(),
  lembrarEm: z.string().nullable(),
  notificadoEm: z.string().nullable(),
  recorrencia: z.enum(RECORRENCIAS).nullable(),
  intervaloRecorrencia: z.number(),
  ocultoAte: z.string().nullable(),
  chaveExterna: z.string().nullable(),
  canalOrigem: z.string().nullable(),
  estado: z.enum(['ativo', 'desfeito']),
  desfeitoEm: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  syncVersion: z.number(),
});

export function criarServidorMcp() {
  const server = new McpServer(
    { name: 'lembretes', version: '0.4.0' },
    { instructions: GUIA_AGENTE }
  );

  function registrar<I extends z.ZodRawShape, O extends z.ZodType>(
    nome: string,
    descricao: string,
    entrada: z.ZodObject<I>,
    saida: O,
    executar: (args: z.output<z.ZodObject<I>>) => unknown,
    escrita = false
  ) {
    server.registerTool(
      nome,
      {
        description: descricao,
        inputSchema: entrada,
        outputSchema: z.object({ dados: saida }),
        annotations: {
          readOnlyHint: !escrita,
          destructiveHint: nome === 'excluir_laco',
          idempotentHint: !escrita || nome === 'criar_ou_atualizar_laco',
          openWorldHint: false,
        },
      },
      async (args) => {
        try {
          const dados = saida.parse(executar(args));
          const structuredContent = { dados };
          return {
            structuredContent,
            content: [{ type: 'text' as const, text: JSON.stringify(structuredContent) }],
          };
        } catch (err) {
          const mensagem = err instanceof Error ? err.message : 'Falha ao executar operacao no Lembretes.';
          return {
            isError: true,
            content: [{ type: 'text' as const, text: JSON.stringify({ erro: mensagem }) }],
          };
        }
      }
    );
  }

  registrar(
    'entender_lembretes',
    'Explica como o aplicativo Lembretes funciona, semantica das cores de fita, opcoes de recorrencia e retorna o retrato atual de vencimentos de hoje.',
    z.strictObject({}),
    z.object({
      guia: z.string(),
      coresDisponiveis: z.array(z.enum(CORES)),
      recorrenciasDisponiveis: z.array(z.enum(RECORRENCIAS)),
      resumoHoje: z.object({
        totalAtivosVisiveis: z.number(),
        totalAgendadosProximoCiclo: z.number(),
        totalVencendoHoje: z.number(),
        totalJaNoHorarioOuAtrasados: z.number(),
      }),
    }),
    () => {
      const r = mcpResumoHoje();
      return {
        guia: GUIA_AGENTE,
        coresDisponiveis: [...CORES],
        recorrenciasDisponiveis: [...RECORRENCIAS],
        resumoHoje: {
          totalAtivosVisiveis: r.totalAtivosVisiveis,
          totalAgendadosProximoCiclo: r.totalAgendadosProximoCiclo,
          totalVencendoHoje: r.totalVencendoHoje,
          totalJaNoHorarioOuAtrasados: r.totalJaNoHorarioOuAtrasados,
        },
      };
    }
  );

  registrar(
    'resumo_vencimentos_hoje',
    'Retorna quantos e quais lembretes vencem hoje (incluindo atrasados visiveis), ideal para avisar o usuario das prioridades do dia.',
    z.strictObject({}),
    z.object({
      totalAtivosVisiveis: z.number(),
      totalAgendadosProximoCiclo: z.number(),
      totalVencendoHoje: z.number(),
      totalJaNoHorarioOuAtrasados: z.number(),
      lembretesDeHoje: z.array(lacoSchema),
    }),
    () => mcpResumoHoje()
  );

  registrar(
    'listar_lacos',
    'Lista os lacos do mural com filtros opcionais por visao (ativos, agendados para proximo ciclo, desfeitos ou todos), busca textual, canalOrigem ou somente os que vencem hoje.',
    z.strictObject({
      visao: z.enum(['ativos', 'agendados', 'desfeitos', 'todos']).default('ativos'),
      busca: z.string().optional(),
      canalOrigem: z.string().optional(),
      somenteHoje: z.boolean().default(false),
    }),
    z.object({
      total: z.number(),
      lacos: z.array(lacoSchema),
    }),
    (args) => {
      const agora = new Date();
      const agoraMs = agora.getTime();
      let lista = mcpListarTodos();

      if (args.visao === 'ativos') {
        lista = lista.filter(
          (l) => l.estado === 'ativo' && !lacoEstaOcultoAteProximoCiclo(l, agoraMs)
        );
      } else if (args.visao === 'agendados') {
        lista = lista.filter((l) => lacoEstaOcultoAteProximoCiclo(l, agoraMs));
      } else if (args.visao === 'desfeitos') {
        lista = lista.filter((l) => l.estado === 'desfeito');
      }

      if (args.somenteHoje) {
        lista = lista.filter((l) => lacoVenceHoje(l, agora));
      }

      if (args.canalOrigem) {
        const alvo = args.canalOrigem.trim().toLowerCase();
        lista = lista.filter((l) => (l.canalOrigem ?? '').toLowerCase().includes(alvo));
      }

      if (args.busca) {
        const termo = args.busca.trim().toLowerCase();
        lista = lista.filter(
          (l) =>
            l.titulo.toLowerCase().includes(termo) ||
            l.texto.toLowerCase().includes(termo) ||
            l.itens.some((i) => i.texto.toLowerCase().includes(termo))
        );
      }

      return { total: lista.length, lacos: lista };
    }
  );

  registrar(
    'criar_ou_atualizar_laco',
    'Cria um novo laco (simples ou recorrente) no mural do Lembretes. Se chaveExterna for informada e ja existir um laco ativo com ela, atualiza o existente sem duplicar (ideal para varreduras recorrentes de demandas ocultas em canais).',
    z.strictObject({
      titulo: z.string().max(240).optional(),
      modo: z.enum(MODOS).default('texto'),
      texto: z.string().max(10_000).optional(),
      itensChecklist: z.array(z.string().min(1)).max(80).optional(),
      corFita: z.enum(CORES).default('ambar'),
      fixado: z.boolean().default(false),
      lembrarEm: z
        .string()
        .nullable()
        .optional()
        .describe('Data e hora ISO 8601 do lembrete, ex.: 2026-11-20T09:00:00-03:00'),
      recorrencia: z.enum(RECORRENCIAS).nullable().optional(),
      intervaloRecorrencia: z.number().int().min(1).max(365).default(1),
      chaveExterna: z
        .string()
        .max(200)
        .optional()
        .describe('Identificador unico da demanda no canal para evitar duplicatas'),
      canalOrigem: z
        .string()
        .max(120)
        .optional()
        .describe('Nome curto da fonte analisada, ex.: Slack · #produto, Jira, Hub'),
    }),
    z.object({
      acao: z.enum(['criado', 'atualizado']),
      laco: lacoSchema,
    }),
    (args) =>
      mcpCriarOuAtualizarLaco({
        titulo: args.titulo,
        modo: args.modo,
        texto: args.texto,
        itens: args.itensChecklist?.map((t, idx) => ({
          id: `chk-${Date.now()}-${idx}`,
          texto: t,
          concluido: false,
        })),
        corFita: args.corFita,
        fixado: args.fixado,
        lembrarEm: args.lembrarEm ?? null,
        recorrencia: args.recorrencia ?? null,
        intervaloRecorrencia: args.intervaloRecorrencia,
        chaveExterna: args.chaveExterna ?? null,
        canalOrigem: args.canalOrigem ?? null,
      }),
    true
  );

  registrar(
    'atualizar_laco',
    'Edita campos especificos de um laco existente pelo seu id.',
    z.strictObject({
      id: z.string().min(1),
      titulo: z.string().max(240).optional(),
      texto: z.string().max(10_000).optional(),
      corFita: z.enum(CORES).optional(),
      fixado: z.boolean().optional(),
      lembrarEm: z.string().nullable().optional(),
      recorrencia: z.enum(RECORRENCIAS).nullable().optional(),
      intervaloRecorrencia: z.number().int().min(1).max(365).optional(),
      ocultoAte: z.string().nullable().optional(),
      canalOrigem: z.string().nullable().optional(),
    }),
    lacoSchema,
    (args) => mcpAtualizarLaco(args),
    true
  );

  registrar(
    'desfazer_laco',
    'Marca um laco como concluido. Se o laco tiver recorrencia, esconde hoje e reagenda automaticamente para o proximo ciclo.',
    z.strictObject({ id: z.string().min(1) }),
    lacoSchema,
    (args) => mcpDesfazerLaco(args.id),
    true
  );

  registrar(
    'reamarrar_laco',
    'Traz um laco desfeito (ou agendado para proximo ciclo) de volta para os ativos visiveis de hoje.',
    z.strictObject({ id: z.string().min(1) }),
    lacoSchema,
    (args) => mcpReamarrarLaco(args.id),
    true
  );

  registrar(
    'excluir_laco',
    'Remove logicamente um laco do mural (mantendo registro na tabela imutavel lacos_historico).',
    z.strictObject({ id: z.string().min(1) }),
    z.object({ excluido: z.boolean() }),
    (args) => mcpExcluirLaco(args.id),
    true
  );

  return server;
}

export function iniciarServidorMcp() {
  const handle = serveStdio(criarServidorMcp);
  for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(sinal, () => {
      void handle.close();
    });
  }
}
