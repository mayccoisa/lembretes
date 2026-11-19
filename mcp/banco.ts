import * as fs from 'node:fs';
import * as net from 'node:net';
import * as os from 'node:os';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import {
  calcularProximoCicloRecorrente,
  lacoEstaOcultoAteProximoCiclo,
  lacoTemConteudoValido,
  lacoVenceHoje,
  type AtualizarLacoInput,
  type CorFita,
  type EstadoLaco,
  type ItemChecklist,
  type Laco,
  type ModoConteudo,
  type NovoLacoInput,
  type RecorrenciaLaco,
} from '../src/contracts/laco';

const PORTA_SINCRONIA_APP = 49871;

export function resolverCaminhoBanco(): string {
  if (process.env.LEMBRETES_DB_PATH) {
    const dir = path.dirname(process.env.LEMBRETES_DB_PATH);
    fs.mkdirSync(dir, { recursive: true });
    return process.env.LEMBRETES_DB_PATH;
  }
  const baseAppData =
    process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  const pasta = path.join(baseAppData, 'com.mayconrocha.lembretes');
  fs.mkdirSync(pasta, { recursive: true });
  return path.join(pasta, 'lembretes.db');
}

function notificarJanelaAberta(): void {
  if (process.env.LEMBRETES_DB_PATH) return;
  const sock = new net.Socket();
  sock.setTimeout(300);
  sock.on('error', () => sock.destroy());
  sock.on('timeout', () => sock.destroy());
  sock.connect(PORTA_SINCRONIA_APP, '127.0.0.1', () => {
    sock.write('RECARREGAR\n', () => sock.end());
  });
}

function abrirBanco(): DatabaseSync {
  const db = new DatabaseSync(resolverCaminhoBanco());
  db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;');

  const rowVersao = db.prepare('PRAGMA user_version').get() as { user_version?: number } | undefined;
  const versao = rowVersao?.user_version ?? 0;

  if (versao < 1) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS lacos (
        id TEXT PRIMARY KEY NOT NULL,
        titulo TEXT NOT NULL DEFAULT '',
        modo TEXT NOT NULL DEFAULT 'texto',
        texto TEXT NOT NULL DEFAULT '',
        itens_json TEXT NOT NULL DEFAULT '[]',
        cor_fita TEXT NOT NULL DEFAULT 'carmim',
        imagem_url TEXT,
        imagem_nome TEXT,
        fixado INTEGER NOT NULL DEFAULT 0,
        lembrar_em TEXT,
        notificado_em TEXT,
        estado TEXT NOT NULL DEFAULT 'ativo',
        desfeito_em TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX IF NOT EXISTS idx_lacos_estado ON lacos(estado, deleted_at);
      PRAGMA user_version = 1;
    `);
  }

  if (versao < 2) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS lacos_historico (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        operacao TEXT NOT NULL,
        laco_id TEXT NOT NULL,
        titulo TEXT NOT NULL,
        modo TEXT NOT NULL,
        texto TEXT NOT NULL,
        itens_json TEXT NOT NULL,
        cor_fita TEXT NOT NULL,
        imagem_url TEXT,
        imagem_nome TEXT,
        estado TEXT NOT NULL,
        registrado_em TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TRIGGER IF NOT EXISTS trg_lacos_hist_insert
      AFTER INSERT ON lacos
      BEGIN
        INSERT INTO lacos_historico (
          operacao, laco_id, titulo, modo, texto, itens_json,
          cor_fita, imagem_url, imagem_nome, estado
        ) VALUES (
          'INSERT', NEW.id, NEW.titulo, NEW.modo, NEW.texto, NEW.itens_json,
          NEW.cor_fita, NEW.imagem_url, NEW.imagem_nome, NEW.estado
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_lacos_hist_update
      AFTER UPDATE ON lacos
      BEGIN
        INSERT INTO lacos_historico (
          operacao, laco_id, titulo, modo, texto, itens_json,
          cor_fita, imagem_url, imagem_nome, estado
        ) VALUES (
          'UPDATE', NEW.id, NEW.titulo, NEW.modo, NEW.texto, NEW.itens_json,
          NEW.cor_fita, NEW.imagem_url, NEW.imagem_nome, NEW.estado
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_lacos_hist_delete
      AFTER DELETE ON lacos
      BEGIN
        INSERT INTO lacos_historico (
          operacao, laco_id, titulo, modo, texto, itens_json,
          cor_fita, imagem_url, imagem_nome, estado
        ) VALUES (
          'DELETE', OLD.id, OLD.titulo, OLD.modo, OLD.texto, OLD.itens_json,
          OLD.cor_fita, OLD.imagem_url, OLD.imagem_nome, OLD.estado
        );
      END;

      PRAGMA user_version = 2;
    `);
  }

  if (versao < 3) {
    db.exec(`
      ALTER TABLE lacos ADD COLUMN recorrencia TEXT;
      ALTER TABLE lacos ADD COLUMN intervalo_recorrencia INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE lacos ADD COLUMN oculto_ate TEXT;
      ALTER TABLE lacos ADD COLUMN chave_externa TEXT;
      ALTER TABLE lacos ADD COLUMN canal_origem TEXT;
      CREATE INDEX IF NOT EXISTS idx_lacos_chave_ext ON lacos(chave_externa, deleted_at);
      PRAGMA user_version = 3;
    `);
  }

  return db;
}

const COLUNAS_LACO = `
  id, titulo, modo, texto, itens_json, cor_fita,
  imagem_url, imagem_nome, fixado, lembrar_em, notificado_em,
  recorrencia, intervalo_recorrencia, oculto_ate, chave_externa, canal_origem,
  estado, desfeito_em, created_at, updated_at, deleted_at, sync_version
`;

interface LinhaSqlite {
  id: string;
  titulo: string;
  modo: string;
  texto: string;
  itens_json: string;
  cor_fita: string;
  imagem_url: string | null;
  imagem_nome: string | null;
  fixado: number;
  lembrar_em: string | null;
  notificado_em: string | null;
  recorrencia: string | null;
  intervalo_recorrencia: number;
  oculto_ate: string | null;
  chave_externa: string | null;
  canal_origem: string | null;
  estado: string;
  desfeito_em: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_version: number;
}

function mapearLinha(row: LinhaSqlite): Laco {
  let itens: ItemChecklist[] = [];
  try {
    itens = JSON.parse(row.itens_json) as ItemChecklist[];
  } catch {
    itens = [];
  }
  return {
    id: row.id,
    titulo: row.titulo,
    modo: row.modo as ModoConteudo,
    texto: row.texto,
    itens,
    corFita: row.cor_fita as CorFita,
    imagemUrl: row.imagem_url,
    imagemNome: row.imagem_nome,
    fixado: Boolean(row.fixado),
    lembrarEm: row.lembrar_em,
    notificadoEm: row.notificado_em,
    recorrencia: (row.recorrencia as RecorrenciaLaco | null) ?? null,
    intervaloRecorrencia: row.intervalo_recorrencia ?? 1,
    ocultoAte: row.oculto_ate,
    chaveExterna: row.chave_externa,
    canalOrigem: row.canal_origem,
    estado: row.estado as EstadoLaco,
    desfeitoEm: row.desfeito_em,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncVersion: row.sync_version,
  };
}

function lerPorId(db: DatabaseSync, id: string): Laco {
  const row = db
    .prepare(`SELECT ${COLUNAS_LACO} FROM lacos WHERE id = ? AND deleted_at IS NULL`)
    .get(id) as unknown as LinhaSqlite | undefined;
  if (!row) {
    throw new Error(`Laco nao encontrado: ${id}`);
  }
  return mapearLinha(row);
}

export function mcpListarTodos(): Laco[] {
  const db = abrirBanco();
  try {
    const rows = db
      .prepare(
        `SELECT ${COLUNAS_LACO} FROM lacos WHERE deleted_at IS NULL ORDER BY fixado DESC, updated_at DESC`
      )
      .all() as unknown as LinhaSqlite[];
    return rows.map(mapearLinha);
  } finally {
    db.close();
  }
}

export function mcpResumoHoje() {
  const todos = mcpListarTodos();
  const agora = new Date();
  const agoraMs = agora.getTime();
  const ativosVisiveis = todos.filter(
    (l) => l.estado === 'ativo' && !lacoEstaOcultoAteProximoCiclo(l, agoraMs)
  );
  const agendadosProximoCiclo = todos.filter((l) => lacoEstaOcultoAteProximoCiclo(l, agoraMs));
  const vencendoHoje = todos.filter((l) => lacoVenceHoje(l, agora));
  const jaVencidos = vencendoHoje.filter(
    (l) => l.lembrarEm && new Date(l.lembrarEm).getTime() <= agoraMs
  );

  return {
    totalAtivosVisiveis: ativosVisiveis.length,
    totalAgendadosProximoCiclo: agendadosProximoCiclo.length,
    totalVencendoHoje: vencendoHoje.length,
    totalJaNoHorarioOuAtrasados: jaVencidos.length,
    lembretesDeHoje: vencendoHoje,
  };
}

export function mcpCriarOuAtualizarLaco(
  input: NovoLacoInput
): { acao: 'criado' | 'atualizado'; laco: Laco } {
  if (!lacoTemConteudoValido(input)) {
    throw new Error('Informe ao menos titulo, texto ou itens para criar o laco.');
  }

  const db = abrirBanco();
  try {
    const chaveLimpa = input.chaveExterna?.trim() || null;
    if (chaveLimpa) {
      const existente = db
        .prepare(
          `SELECT id FROM lacos WHERE chave_externa = ? AND estado = 'ativo' AND deleted_at IS NULL LIMIT 1`
        )
        .get(chaveLimpa) as { id?: string } | undefined;

      if (existente?.id) {
        db.close();
        const editado = mcpAtualizarLaco({
          id: existente.id,
          titulo: input.titulo,
          modo: input.modo,
          texto: input.texto,
          itens: input.itens,
          corFita: input.corFita,
          fixado: input.fixado,
          lembrarEm: input.lembrarEm,
          recorrencia: input.recorrencia,
          intervaloRecorrencia: input.intervaloRecorrencia,
          chaveExterna: chaveLimpa,
          canalOrigem: input.canalOrigem,
        });
        return { acao: 'atualizado', laco: editado };
      }
    }

    const id = randomUUID();
    const agora = new Date().toISOString();
    const itensFiltrados = (input.itens ?? []).filter((i) => i.texto.trim().length > 0);
    const intervalo = Math.max(1, Math.floor(input.intervaloRecorrencia ?? 1));

    db.prepare(
      `INSERT INTO lacos (
        id, titulo, modo, texto, itens_json, cor_fita,
        imagem_url, imagem_nome, fixado, lembrar_em, notificado_em,
        recorrencia, intervalo_recorrencia, oculto_ate, chave_externa, canal_origem,
        estado, desfeito_em, created_at, updated_at, deleted_at, sync_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, ?, ?, 'ativo', NULL, ?, ?, NULL, 1)`
    ).run(
      id,
      (input.titulo ?? '').trim(),
      input.modo ?? 'texto',
      input.texto ?? '',
      JSON.stringify(itensFiltrados),
      input.corFita ?? 'ambar',
      input.imagemUrl ?? null,
      input.imagemNome ?? null,
      input.fixado ? 1 : 0,
      input.lembrarEm ?? null,
      input.recorrencia ?? null,
      intervalo,
      chaveLimpa,
      input.canalOrigem?.trim() || null,
      agora,
      agora
    );

    const criado = lerPorId(db, id);
    notificarJanelaAberta();
    return { acao: 'criado', laco: criado };
  } finally {
    if (db.isOpen) db.close();
  }
}

export function mcpAtualizarLaco(input: AtualizarLacoInput): Laco {
  const db = abrirBanco();
  try {
    const atual = lerPorId(db, input.id);
    const agora = new Date().toISOString();
    const novoLembrar = input.lembrarEm !== undefined ? input.lembrarEm : atual.lembrarEm;
    const mudouLembrar = input.lembrarEm !== undefined && input.lembrarEm !== atual.lembrarEm;

    db.prepare(
      `UPDATE lacos SET
        titulo = ?,
        modo = ?,
        texto = ?,
        itens_json = ?,
        cor_fita = ?,
        fixado = ?,
        lembrar_em = ?,
        notificado_em = ?,
        recorrencia = ?,
        intervalo_recorrencia = ?,
        oculto_ate = ?,
        chave_externa = ?,
        canal_origem = ?,
        updated_at = ?,
        sync_version = sync_version + 1
       WHERE id = ? AND deleted_at IS NULL`
    ).run(
      input.titulo !== undefined ? input.titulo.trim() : atual.titulo,
      input.modo ?? atual.modo,
      input.texto !== undefined ? input.texto : atual.texto,
      JSON.stringify(input.itens !== undefined ? input.itens : atual.itens),
      input.corFita ?? atual.corFita,
      (input.fixado !== undefined ? input.fixado : atual.fixado) ? 1 : 0,
      novoLembrar,
      mudouLembrar
        ? null
        : input.notificadoEm !== undefined
          ? input.notificadoEm
          : atual.notificadoEm,
      input.recorrencia !== undefined ? input.recorrencia : atual.recorrencia,
      input.intervaloRecorrencia !== undefined
        ? Math.max(1, Math.floor(input.intervaloRecorrencia))
        : atual.intervaloRecorrencia,
      input.ocultoAte !== undefined ? input.ocultoAte : atual.ocultoAte,
      input.chaveExterna !== undefined ? input.chaveExterna : atual.chaveExterna,
      input.canalOrigem !== undefined ? input.canalOrigem : atual.canalOrigem,
      agora,
      input.id
    );

    const editado = lerPorId(db, input.id);
    notificarJanelaAberta();
    return editado;
  } finally {
    db.close();
  }
}

export function mcpDesfazerLaco(id: string): Laco {
  const db = abrirBanco();
  try {
    const atual = lerPorId(db, id);
    const agora = new Date();
    const agoraIso = agora.toISOString();

    if (atual.recorrencia) {
      const ciclo = calcularProximoCicloRecorrente(
        atual.recorrencia,
        atual.intervaloRecorrencia,
        atual.lembrarEm,
        agora
      );
      const itensReset = atual.itens.map((i) => ({ ...i, concluido: false }));
      db.prepare(
        `UPDATE lacos SET
          itens_json = ?,
          lembrar_em = ?,
          oculto_ate = ?,
          notificado_em = NULL,
          estado = 'ativo',
          desfeito_em = ?,
          updated_at = ?,
          sync_version = sync_version + 1
         WHERE id = ? AND deleted_at IS NULL`
      ).run(
        JSON.stringify(itensReset),
        ciclo.proximoLembrarEm,
        ciclo.ocultoAte,
        agoraIso,
        agoraIso,
        id
      );

      const reagendado = lerPorId(db, id);
      notificarJanelaAberta();
      return reagendado;
    }

    db.prepare(
      `UPDATE lacos SET
        estado = 'desfeito',
        desfeito_em = ?,
        updated_at = ?,
        sync_version = sync_version + 1
       WHERE id = ? AND deleted_at IS NULL`
    ).run(agoraIso, agoraIso, id);

    const desfeito = lerPorId(db, id);
    notificarJanelaAberta();
    return desfeito;
  } finally {
    db.close();
  }
}

export function mcpReamarrarLaco(id: string): Laco {
  const db = abrirBanco();
  try {
    const agora = new Date().toISOString();
    db.prepare(
      `UPDATE lacos SET
        estado = 'ativo',
        oculto_ate = NULL,
        desfeito_em = NULL,
        updated_at = ?,
        sync_version = sync_version + 1
       WHERE id = ? AND deleted_at IS NULL`
    ).run(agora, id);
    const restaurado = lerPorId(db, id);
    notificarJanelaAberta();
    return restaurado;
  } finally {
    db.close();
  }
}

export function mcpExcluirLaco(id: string): { excluido: boolean } {
  const db = abrirBanco();
  try {
    const agora = new Date().toISOString();
    db.prepare(
      `UPDATE lacos SET deleted_at = ?, updated_at = ?, sync_version = sync_version + 1 WHERE id = ?`
    ).run(agora, agora, id);
    notificarJanelaAberta();
    return { excluido: true };
  } finally {
    db.close();
  }
}
