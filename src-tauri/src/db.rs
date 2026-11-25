use chrono::{Datelike, Duration, Timelike, Utc, Weekday};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Deserializer, Serialize};
use std::path::Path;
use uuid::Uuid;

mod sincronizacao;
pub use sincronizacao::{aplicar_laco_remoto, conta_sincronizada, listar_para_sincronizar, vincular_conta_com_backup};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemChecklist {
    pub id: String,
    pub texto: String,
    pub concluido: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Laco {
    pub id: String,
    pub titulo: String,
    pub modo: String,
    pub texto: String,
    pub itens: Vec<ItemChecklist>,
    pub cor_fita: String,
    pub imagem_url: Option<String>,
    pub imagem_nome: Option<String>,
    pub fixado: bool,
    pub lembrar_em: Option<String>,
    pub notificado_em: Option<String>,
    pub recorrencia: Option<String>,
    pub intervalo_recorrencia: i64,
    pub oculto_ate: Option<String>,
    pub chave_externa: Option<String>,
    pub canal_origem: Option<String>,
    pub estado: String,
    pub desfeito_em: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
    pub sync_version: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NovoLacoInput {
    pub titulo: Option<String>,
    pub modo: Option<String>,
    pub texto: Option<String>,
    pub itens: Option<Vec<ItemChecklist>>,
    pub cor_fita: Option<String>,
    pub imagem_url: Option<String>,
    pub imagem_nome: Option<String>,
    pub fixado: Option<bool>,
    pub lembrar_em: Option<String>,
    pub recorrencia: Option<String>,
    pub intervalo_recorrencia: Option<i64>,
    pub chave_externa: Option<String>,
    pub canal_origem: Option<String>,
}

fn deserializar_anulavel<'de, D>(deserializer: D) -> Result<Option<Option<String>>, D::Error>
where
    D: Deserializer<'de>,
{
    Ok(Some(Option::<String>::deserialize(deserializer)?))
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AtualizarLacoInput {
    pub id: String,
    pub titulo: Option<String>,
    pub modo: Option<String>,
    pub texto: Option<String>,
    pub itens: Option<Vec<ItemChecklist>>,
    pub cor_fita: Option<String>,
    #[serde(default, deserialize_with = "deserializar_anulavel")]
    pub imagem_url: Option<Option<String>>,
    #[serde(default, deserialize_with = "deserializar_anulavel")]
    pub imagem_nome: Option<Option<String>>,
    pub fixado: Option<bool>,
    #[serde(default, deserialize_with = "deserializar_anulavel")]
    pub lembrar_em: Option<Option<String>>,
    #[serde(default, deserialize_with = "deserializar_anulavel")]
    pub notificado_em: Option<Option<String>>,
    #[serde(default, deserialize_with = "deserializar_anulavel")]
    pub recorrencia: Option<Option<String>>,
    pub intervalo_recorrencia: Option<i64>,
    #[serde(default, deserialize_with = "deserializar_anulavel")]
    pub oculto_ate: Option<Option<String>>,
    #[serde(default, deserialize_with = "deserializar_anulavel")]
    pub chave_externa: Option<Option<String>>,
    #[serde(default, deserialize_with = "deserializar_anulavel")]
    pub canal_origem: Option<Option<String>>,
}

pub fn abrir_banco(caminho: &Path) -> Result<Connection, String> {
    let conn = Connection::open(caminho).map_err(|e| format!("Falha ao abrir SQLite: {e}"))?;
    let _ = conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;");
    migrar(&conn)?;
    Ok(conn)
}

fn migrar(conn: &Connection) -> Result<(), String> {
    let versao: i64 = conn
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    if versao < 1 {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS lacos (
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
            PRAGMA user_version = 1;",
        )
        .map_err(|e| format!("Falha na migracao 001: {e}"))?;
    }

    if versao < 2 {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS lacos_historico (
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

            PRAGMA user_version = 2;",
        )
        .map_err(|e| format!("Falha na migracao 002 (historico imutavel): {e}"))?;
    }

    if versao < 3 {
        conn.execute_batch(
            "ALTER TABLE lacos ADD COLUMN recorrencia TEXT;
             ALTER TABLE lacos ADD COLUMN intervalo_recorrencia INTEGER NOT NULL DEFAULT 1;
             ALTER TABLE lacos ADD COLUMN oculto_ate TEXT;
             ALTER TABLE lacos ADD COLUMN chave_externa TEXT;
             ALTER TABLE lacos ADD COLUMN canal_origem TEXT;
             CREATE INDEX IF NOT EXISTS idx_lacos_chave_ext ON lacos(chave_externa, deleted_at);
             PRAGMA user_version = 3;",
        )
        .map_err(|e| format!("Falha na migracao 003 (recorrencia e MCP): {e}"))?;
    }

    Ok(())
}

fn ler_laco_por_id(conn: &Connection, id: &str) -> Result<Laco, String> {
    conn.query_row(
        "SELECT
            id, titulo, modo, texto, itens_json, cor_fita,
            imagem_url, imagem_nome, fixado, lembrar_em, notificado_em,
            recorrencia, intervalo_recorrencia, oculto_ate, chave_externa, canal_origem,
            estado, desfeito_em, created_at, updated_at, deleted_at, sync_version
         FROM lacos
         WHERE id = ?1 AND deleted_at IS NULL",
        params![id],
        mapear_linha,
    )
    .map_err(|e| format!("Laco nao encontrado ({id}): {e}"))
}

fn mapear_linha(row: &rusqlite::Row<'_>) -> rusqlite::Result<Laco> {
    let itens_json: String = row.get(4)?;
    let itens: Vec<ItemChecklist> = serde_json::from_str(&itens_json).unwrap_or_default();
    let fixado_int: i64 = row.get(8)?;
    Ok(Laco {
        id: row.get(0)?,
        titulo: row.get(1)?,
        modo: row.get(2)?,
        texto: row.get(3)?,
        itens,
        cor_fita: row.get(5)?,
        imagem_url: row.get(6)?,
        imagem_nome: row.get(7)?,
        fixado: fixado_int != 0,
        lembrar_em: row.get(9)?,
        notificado_em: row.get(10)?,
        recorrencia: row.get(11)?,
        intervalo_recorrencia: row.get(12)?,
        oculto_ate: row.get(13)?,
        chave_externa: row.get(14)?,
        canal_origem: row.get(15)?,
        estado: row.get(16)?,
        desfeito_em: row.get(17)?,
        created_at: row.get(18)?,
        updated_at: row.get(19)?,
        deleted_at: row.get(20)?,
        sync_version: row.get(21)?,
    })
}

pub fn listar_lacos(conn: &Connection) -> Result<Vec<Laco>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT
                id, titulo, modo, texto, itens_json, cor_fita,
                imagem_url, imagem_nome, fixado, lembrar_em, notificado_em,
                recorrencia, intervalo_recorrencia, oculto_ate, chave_externa, canal_origem,
                estado, desfeito_em, created_at, updated_at, deleted_at, sync_version
             FROM lacos
             WHERE deleted_at IS NULL
             ORDER BY fixado DESC, updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let iter = stmt.query_map([], mapear_linha).map_err(|e| e.to_string())?;

    let mut saida = Vec::new();
    for item in iter {
        saida.push(item.map_err(|e| e.to_string())?);
    }
    Ok(saida)
}

pub fn criar_laco(conn: &Connection, input: NovoLacoInput) -> Result<Laco, String> {
    let chave_limpa = input
        .chave_externa
        .as_ref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    // Protecao anti-duplicata para criacoes vindas de analise de canais da IA
    if let Some(ref chave) = chave_limpa {
        let existente_id: Option<String> = conn
            .query_row(
                "SELECT id FROM lacos WHERE chave_externa = ?1 AND estado = 'ativo' AND deleted_at IS NULL LIMIT 1",
                params![chave],
                |r| r.get(0),
            )
            .optional()
            .map_err(|e| e.to_string())?;

        if let Some(id_existente) = existente_id {
            return atualizar_laco(
                conn,
                AtualizarLacoInput {
                    id: id_existente,
                    titulo: input.titulo,
                    modo: input.modo,
                    texto: input.texto,
                    itens: input.itens,
                    cor_fita: input.cor_fita,
                    imagem_url: input.imagem_url.map(Some),
                    imagem_nome: input.imagem_nome.map(Some),
                    fixado: input.fixado,
                    lembrar_em: input.lembrar_em.map(Some),
                    notificado_em: None,
                    recorrencia: input.recorrencia.map(Some),
                    intervalo_recorrencia: input.intervalo_recorrencia,
                    oculto_ate: None,
                    chave_externa: Some(Some(chave.clone())),
                    canal_origem: input.canal_origem.map(Some),
                },
            );
        }
    }

    let id = Uuid::new_v4().to_string();
    let agora = Utc::now().to_rfc3339();
    let titulo = input.titulo.unwrap_or_default().trim().to_string();
    let modo = input.modo.unwrap_or_else(|| "texto".to_string());
    let texto = input.texto.unwrap_or_default();
    let itens_filtrados: Vec<ItemChecklist> = input
        .itens
        .unwrap_or_default()
        .into_iter()
        .filter(|i| !i.texto.trim().is_empty())
        .collect();
    let itens_json = serde_json::to_string(&itens_filtrados).map_err(|e| e.to_string())?;
    let cor_fita = input.cor_fita.unwrap_or_else(|| "carmim".to_string());
    let fixado_int: i64 = if input.fixado.unwrap_or(false) { 1 } else { 0 };
    let intervalo = input.intervalo_recorrencia.unwrap_or(1).max(1);
    let canal_limpo = input
        .canal_origem
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    conn.execute(
        "INSERT INTO lacos (
            id, titulo, modo, texto, itens_json, cor_fita,
            imagem_url, imagem_nome, fixado, lembrar_em, notificado_em,
            recorrencia, intervalo_recorrencia, oculto_ate, chave_externa, canal_origem,
            estado, desfeito_em, created_at, updated_at, deleted_at, sync_version
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6,
            ?7, ?8, ?9, ?10, NULL,
            ?11, ?12, NULL, ?13, ?14,
            'ativo', NULL, ?15, ?15, NULL, 1
        )",
        params![
            id,
            titulo,
            modo,
            texto,
            itens_json,
            cor_fita,
            input.imagem_url,
            input.imagem_nome,
            fixado_int,
            input.lembrar_em,
            input.recorrencia,
            intervalo,
            chave_limpa,
            canal_limpo,
            agora
        ],
    )
    .map_err(|e| format!("Falha ao inserir laco: {e}"))?;

    ler_laco_por_id(conn, &id)
}

pub fn atualizar_laco(conn: &Connection, input: AtualizarLacoInput) -> Result<Laco, String> {
    let atual = ler_laco_por_id(conn, &input.id)?;
    let agora = Utc::now().to_rfc3339();

    let titulo = input
        .titulo
        .map(|t| t.trim().to_string())
        .unwrap_or(atual.titulo);
    let modo = input.modo.unwrap_or(atual.modo);
    let texto = input.texto.unwrap_or(atual.texto);
    let itens = input.itens.unwrap_or(atual.itens);
    let itens_json = serde_json::to_string(&itens).map_err(|e| e.to_string())?;
    let cor_fita = input.cor_fita.unwrap_or(atual.cor_fita);
    let imagem_url = match input.imagem_url {
        Some(v) => v,
        None => atual.imagem_url,
    };
    let imagem_nome = match input.imagem_nome {
        Some(v) => v,
        None => atual.imagem_nome,
    };
    let fixado_int: i64 = if input.fixado.unwrap_or(atual.fixado) {
        1
    } else {
        0
    };

    let mudou_lembrete = matches!(&input.lembrar_em, Some(novo) if *novo != atual.lembrar_em);
    let lembrar_em = match input.lembrar_em {
        Some(v) => v,
        None => atual.lembrar_em,
    };
    let notificado_em = if mudou_lembrete {
        None
    } else {
        match input.notificado_em {
            Some(v) => v,
            None => atual.notificado_em,
        }
    };
    let recorrencia = match input.recorrencia {
        Some(v) => v,
        None => atual.recorrencia,
    };
    let intervalo = input
        .intervalo_recorrencia
        .map(|n| n.max(1))
        .unwrap_or(atual.intervalo_recorrencia);
    let oculto_ate = match input.oculto_ate {
        Some(v) => v,
        None => atual.oculto_ate,
    };
    let chave_externa = match input.chave_externa {
        Some(v) => v,
        None => atual.chave_externa,
    };
    let canal_origem = match input.canal_origem {
        Some(v) => v,
        None => atual.canal_origem,
    };

    conn.execute(
        "UPDATE lacos SET
            titulo = ?1,
            modo = ?2,
            texto = ?3,
            itens_json = ?4,
            cor_fita = ?5,
            imagem_url = ?6,
            imagem_nome = ?7,
            fixado = ?8,
            lembrar_em = ?9,
            notificado_em = ?10,
            recorrencia = ?11,
            intervalo_recorrencia = ?12,
            oculto_ate = ?13,
            chave_externa = ?14,
            canal_origem = ?15,
            updated_at = ?16,
            sync_version = sync_version + 1
         WHERE id = ?17 AND deleted_at IS NULL",
        params![
            titulo,
            modo,
            texto,
            itens_json,
            cor_fita,
            imagem_url,
            imagem_nome,
            fixado_int,
            lembrar_em,
            notificado_em,
            recorrencia,
            intervalo,
            oculto_ate,
            chave_externa,
            canal_origem,
            agora,
            input.id
        ],
    )
    .map_err(|e| format!("Falha ao atualizar laco: {e}"))?;

    ler_laco_por_id(conn, &input.id)
}

fn calcular_proximo_ciclo_utc(
    recorrencia: &str,
    intervalo: i64,
    lembrar_em_atual: Option<&str>,
) -> (String, String) {
    let agora = Utc::now();
    let passo = intervalo.max(1);

    let mut base = lembrar_em_atual
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.with_timezone(&Utc))
        .filter(|dt| *dt > agora)
        .unwrap_or(agora);

    if recorrencia == "intervalo-horas" {
        let prox = agora + Duration::hours(passo);
        let iso = prox.to_rfc3339();
        return (iso.clone(), iso);
    }

    if let Some(lembrar_antigo) = lembrar_em_atual
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.with_timezone(&Utc))
    {
        if let Some(ajustado) = base
            .with_hour(lembrar_antigo.hour())
            .and_then(|d| d.with_minute(lembrar_antigo.minute()))
            .and_then(|d| d.with_second(0))
        {
            base = ajustado;
        }
    } else if let Some(padrao_manha) = base
        .with_hour(12)
        .and_then(|d| d.with_minute(0))
        .and_then(|d| d.with_second(0))
    {
        base = padrao_manha;
    }

    let mut proximo = match recorrencia {
        "diaria" => base + Duration::days(1),
        "dias-uteis" => {
            let mut d = base + Duration::days(1);
            while matches!(d.weekday(), Weekday::Sat | Weekday::Sun) {
                d += Duration::days(1);
            }
            d
        }
        "semanal" => base + Duration::days(7),
        "mensal" => base + Duration::days(30),
        "intervalo-dias" => base + Duration::days(passo),
        _ => base + Duration::days(1),
    };

    while proximo <= agora {
        proximo += Duration::days(1);
    }

    let inicio_dia = proximo
        .with_hour(3)
        .and_then(|d| d.with_minute(0))
        .and_then(|d| d.with_second(0))
        .unwrap_or(proximo);
    let oculto = if inicio_dia > agora {
        inicio_dia
    } else {
        proximo
    };

    (proximo.to_rfc3339(), oculto.to_rfc3339())
}

pub fn desfazer_laco(conn: &Connection, id: &str) -> Result<Laco, String> {
    let atual = ler_laco_por_id(conn, id)?;
    let agora = Utc::now().to_rfc3339();

    if let Some(ref rec) = atual.recorrencia {
        let (prox_lembrar, oculto_ate) = calcular_proximo_ciclo_utc(
            rec,
            atual.intervalo_recorrencia,
            atual.lembrar_em.as_deref(),
        );
        let itens_resetados: Vec<ItemChecklist> = atual
            .itens
            .into_iter()
            .map(|mut i| {
                i.concluido = false;
                i
            })
            .collect();
        let itens_json = serde_json::to_string(&itens_resetados).map_err(|e| e.to_string())?;

        conn.execute(
            "UPDATE lacos SET
                itens_json = ?1,
                lembrar_em = ?2,
                oculto_ate = ?3,
                notificado_em = NULL,
                estado = 'ativo',
                desfeito_em = ?4,
                updated_at = ?4,
                sync_version = sync_version + 1
             WHERE id = ?5 AND deleted_at IS NULL",
            params![itens_json, prox_lembrar, oculto_ate, agora, id],
        )
        .map_err(|e| format!("Falha ao reagendar laco recorrente: {e}"))?;

        return ler_laco_por_id(conn, id);
    }

    conn.execute(
        "UPDATE lacos SET
            estado = 'desfeito',
            desfeito_em = ?1,
            updated_at = ?1,
            sync_version = sync_version + 1
         WHERE id = ?2 AND deleted_at IS NULL",
        params![agora, id],
    )
    .map_err(|e| format!("Falha ao desfazer laco: {e}"))?;
    ler_laco_por_id(conn, id)
}

pub fn reamarrar_laco(conn: &Connection, id: &str) -> Result<Laco, String> {
    let agora = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE lacos SET
            estado = 'ativo',
            oculto_ate = NULL,
            desfeito_em = NULL,
            updated_at = ?1,
            sync_version = sync_version + 1
         WHERE id = ?2 AND deleted_at IS NULL",
        params![agora, id],
    )
    .map_err(|e| format!("Falha ao reamarrar laco: {e}"))?;
    ler_laco_por_id(conn, id)
}

pub fn excluir_laco(conn: &Connection, id: &str) -> Result<(), String> {
    let agora = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE lacos SET
            deleted_at = ?1,
            updated_at = ?1,
            sync_version = sync_version + 1
         WHERE id = ?2",
        params![agora, id],
    )
    .map_err(|e| format!("Falha ao excluir laco: {e}"))?;
    Ok(())
}

pub fn registrar_notificacao_local(
    conn: &Connection,
    id: &str,
    lembrar_em: &str,
    notificado_em: &str,
) -> Result<bool, String> {
    let mudou = conn.execute(
        "UPDATE lacos SET notificado_em = ?1
         WHERE id = ?2 AND lembrar_em = ?3 AND estado = 'ativo'
           AND deleted_at IS NULL AND notificado_em IS NULL",
        params![notificado_em, id, lembrar_em],
    ).map_err(|e| e.to_string())?;
    Ok(mudou == 1)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ciclo_completo_recorrencia_e_antiduplicata_sqlite() {
        let conn = Connection::open_in_memory().expect("abrir banco em memoria");
        migrar(&conn).expect("migrar schema");

        let criado = criar_laco(
            &conn,
            NovoLacoInput {
                titulo: Some("Revisar demandas ocultas Slack".to_string()),
                modo: Some("texto".to_string()),
                texto: Some("Cobrar retorno do comercial".to_string()),
                itens: None,
                cor_fita: Some("ambar".to_string()),
                imagem_url: None,
                imagem_nome: None,
                fixado: Some(true),
                lembrar_em: None,
                recorrencia: Some("diaria".to_string()),
                intervalo_recorrencia: Some(1),
                chave_externa: Some("slack:canal-comercial:demanda-1".to_string()),
                canal_origem: Some("Slack".to_string()),
            },
        )
        .expect("criar laco recorrente");

        // Repetir com a mesma chave_externa atualiza sem duplicar
        let repetido = criar_laco(
            &conn,
            NovoLacoInput {
                titulo: Some("Revisar demandas ocultas Slack (atualizado)".to_string()),
                modo: Some("texto".to_string()),
                texto: Some("Cobrar retorno do comercial hoje".to_string()),
                itens: None,
                cor_fita: Some("ambar".to_string()),
                imagem_url: None,
                imagem_nome: None,
                fixado: Some(true),
                lembrar_em: None,
                recorrencia: Some("diaria".to_string()),
                intervalo_recorrencia: Some(1),
                chave_externa: Some("slack:canal-comercial:demanda-1".to_string()),
                canal_origem: Some("Slack".to_string()),
            },
        )
        .expect("upsert por chave_externa");

        assert_eq!(criado.id, repetido.id);
        assert_eq!(listar_lacos(&conn).expect("listar").len(), 1);

        // Desfazer laco recorrente reagenda para o proximo ciclo e preenche oculto_ate
        let pos_desfazer = desfazer_laco(&conn, &criado.id).expect("desfazer recorrente");
        assert_eq!(pos_desfazer.estado, "ativo");
        assert!(pos_desfazer.oculto_ate.is_some());
        assert!(pos_desfazer.lembrar_em.is_some());

        excluir_laco(&conn, &criado.id).expect("excluir");
        let total_hist: i64 = conn
            .query_row(
                "SELECT COUNT(seq) FROM lacos_historico WHERE laco_id = ?1",
                params![criado.id],
                |r| r.get(0),
            )
            .expect("contar historico");
        assert!(total_hist >= 4);
    }
}
