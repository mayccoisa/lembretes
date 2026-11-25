use super::{mapear_linha, Laco};
use rusqlite::{params, Connection, OptionalExtension};
use std::path::Path;
use uuid::Uuid;

const CRIAR_VINCULO: &str = "CREATE TABLE IF NOT EXISTS sincronizacao_conta (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    uid TEXT NOT NULL
)";

pub fn conta_sincronizada(conn: &Connection) -> Result<Option<String>, String> {
    conn.execute(CRIAR_VINCULO, []).map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT uid FROM sincronizacao_conta WHERE id = 1",
        [],
        |row| row.get(0),
    )
    .optional()
    .map_err(|e| e.to_string())
}

fn validar_conta(conn: &Connection, uid: &str) -> Result<(), String> {
    if conta_sincronizada(conn)?.as_deref() == Some(uid) {
        Ok(())
    } else {
        Err("Os lembretes deste computador precisam estar vinculados a esta conta.".into())
    }
}

fn vincular_conta(conn: &Connection, uid: &str) -> Result<(), String> {
    if uid.is_empty() || uid.len() > 128 || uid.contains('/') {
        return Err("Identificador da conta inválido.".into());
    }
    conn.execute(CRIAR_VINCULO, []).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR IGNORE INTO sincronizacao_conta (id, uid) VALUES (1, ?1)",
        [uid],
    )
    .map_err(|e| e.to_string())?;
    validar_conta(conn, uid)
}

pub fn vincular_conta_com_backup(conn: &Connection, uid: &str, pasta: &Path) -> Result<(), String> {
    if conta_sincronizada(conn)?.is_none() {
        let arquivo = pasta.join(format!(
            "lembretes-antes-de-sincronizar-{}.db",
            Uuid::new_v4()
        ));
        let caminho = arquivo.to_str().ok_or("Caminho do backup inválido")?;
        conn.execute("VACUUM main INTO ?1", [caminho])
            .map_err(|e| format!("Não foi possível proteger os lembretes existentes: {e}"))?;
    }
    vincular_conta(conn, uid)
}

pub fn listar_para_sincronizar(conn: &Connection, uid: &str) -> Result<Vec<Laco>, String> {
    validar_conta(conn, uid)?;
    let mut consulta = conn
        .prepare(
            "SELECT id, titulo, modo, texto, itens_json, cor_fita,
                imagem_url, imagem_nome, fixado, lembrar_em, notificado_em,
                recorrencia, intervalo_recorrencia, oculto_ate, chave_externa, canal_origem,
                estado, desfeito_em, created_at, updated_at, deleted_at, sync_version
         FROM lacos",
        )
        .map_err(|e| e.to_string())?;
    let linhas = consulta
        .query_map([], mapear_linha)
        .map_err(|e| e.to_string())?;
    linhas
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

pub fn aplicar_laco_remoto(
    conn: &Connection,
    uid: &str,
    laco: Laco,
    versao_esperada: Option<i64>,
    data_esperada: Option<String>,
) -> Result<bool, String> {
    validar_conta(conn, uid)?;
    let itens_json = serde_json::to_string(&laco.itens).map_err(|e| e.to_string())?;
    let alterados = conn.execute(
        "INSERT INTO lacos (
           id, titulo, modo, texto, itens_json, cor_fita, imagem_url, imagem_nome, fixado,
           lembrar_em, recorrencia, intervalo_recorrencia, oculto_ate, chave_externa, canal_origem,
           estado, desfeito_em, created_at, updated_at, deleted_at, sync_version
         )
         SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15,
                ?16, ?17, ?18, ?19, ?20, ?21
         WHERE ?22 IS NULL OR EXISTS (
            SELECT 1 FROM lacos WHERE id = ?1 AND sync_version = ?22 AND updated_at = ?23
         )
         ON CONFLICT(id) DO UPDATE SET
            titulo = excluded.titulo, modo = excluded.modo, texto = excluded.texto,
            itens_json = excluded.itens_json, cor_fita = excluded.cor_fita,
            imagem_url = excluded.imagem_url, imagem_nome = excluded.imagem_nome,
            fixado = excluded.fixado, lembrar_em = excluded.lembrar_em,
            notificado_em = CASE WHEN lacos.lembrar_em IS excluded.lembrar_em
                            THEN lacos.notificado_em ELSE NULL END,
            recorrencia = excluded.recorrencia, intervalo_recorrencia = excluded.intervalo_recorrencia,
            oculto_ate = excluded.oculto_ate, chave_externa = excluded.chave_externa,
            canal_origem = excluded.canal_origem, estado = excluded.estado,
            desfeito_em = excluded.desfeito_em, created_at = excluded.created_at,
            updated_at = excluded.updated_at, deleted_at = excluded.deleted_at,
            sync_version = excluded.sync_version
         WHERE lacos.sync_version = ?22 AND lacos.updated_at = ?23",
        params![laco.id, laco.titulo, laco.modo, laco.texto, itens_json, laco.cor_fita,
            laco.imagem_url, laco.imagem_nome, laco.fixado, laco.lembrar_em, laco.recorrencia,
            laco.intervalo_recorrencia, laco.oculto_ate, laco.chave_externa, laco.canal_origem,
            laco.estado, laco.desfeito_em, laco.created_at, laco.updated_at, laco.deleted_at,
            laco.sync_version, versao_esperada, data_esperada],
    ).map_err(|e| e.to_string())?;
    Ok(alterados == 1)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{criar_laco, excluir_laco, migrar, registrar_notificacao_local, NovoLacoInput};

    #[test]
    fn vincular_banco_antigo_preserva_dados_e_faz_backup_incluindo_wal() {
        let pasta = std::env::temp_dir().join(format!("lembretes-migracao-{}", Uuid::new_v4()));
        std::fs::create_dir(&pasta).unwrap();
        let original = pasta.join("local.db");
        let conn = crate::db::abrir_banco(&original).unwrap();
        let novo = serde_json::from_value::<NovoLacoInput>(serde_json::json!({
            "titulo": "Lembrete antes do login", "imagemUrl": "http://asset.localhost/print.png",
            "imagemNome": "print.png", "modo": "checklist",
            "itens": [{"id": "i", "texto": "Fazer backup", "concluido": true}]
        }))
        .unwrap();
        let laco = criar_laco(&conn, novo).unwrap();
        assert!(original.with_extension("db-wal").is_file());
        assert!(vincular_conta_com_backup(&conn, "dona", &pasta.join("inexistente")).is_err());
        assert_eq!(conta_sincronizada(&conn).unwrap(), None);
        vincular_conta_com_backup(&conn, "dona", &pasta).unwrap();
        vincular_conta_com_backup(&conn, "dona", &pasta).unwrap();
        let backups: Vec<_> = std::fs::read_dir(&pasta)
            .unwrap()
            .map(|item| item.unwrap().path())
            .filter(|arquivo| {
                arquivo
                    .file_name()
                    .unwrap()
                    .to_string_lossy()
                    .starts_with("lembretes-antes-de-sincronizar-")
            })
            .collect();
        assert_eq!(backups.len(), 1);
        let copia = Connection::open(&backups[0]).unwrap();
        let anteriores = crate::db::listar_lacos(&copia).unwrap();
        let vinculados = listar_para_sincronizar(&conn, "dona").unwrap();
        assert_eq!(
            serde_json::to_value(&anteriores).unwrap(),
            serde_json::to_value(&vinculados).unwrap()
        );
        assert_eq!(vinculados[0].id, laco.id);
        assert_eq!(vinculados[0].imagem_nome.as_deref(), Some("print.png"));
        assert!(vinculados[0].itens[0].concluido);
        drop(copia);
        drop(conn);
        std::fs::remove_file(&backups[0]).unwrap();
        std::fs::remove_file(original).unwrap();
        std::fs::remove_dir(pasta).unwrap();
    }

    #[test]
    fn preserva_exclusao_e_recusa_sobrescrita_concorrente_ou_por_outra_conta() {
        let conn = Connection::open_in_memory().unwrap();
        migrar(&conn).unwrap();
        let novo = serde_json::from_value::<NovoLacoInput>(serde_json::json!({"titulo": "Local"}))
            .unwrap();
        let local = criar_laco(&conn, novo).unwrap();
        assert!(listar_para_sincronizar(&conn, "dona").is_err());
        vincular_conta(&conn, "dona").unwrap();
        assert!(vincular_conta(&conn, "outra").is_err());
        let mut remoto = local.clone();
        remoto.titulo = "Remoto".into();
        remoto.sync_version += 1;
        assert!(!aplicar_laco_remoto(&conn, "dona", remoto.clone(), None, None).unwrap());
        assert!(aplicar_laco_remoto(
            &conn,
            "dona",
            remoto.clone(),
            Some(local.sync_version),
            Some(local.updated_at.clone())
        )
        .unwrap());
        excluir_laco(&conn, &local.id).unwrap();
        assert!(!aplicar_laco_remoto(
            &conn,
            "dona",
            remoto,
            Some(local.sync_version),
            Some(local.updated_at)
        )
        .unwrap());
        let linhas = listar_para_sincronizar(&conn, "dona").unwrap();
        assert_eq!(linhas[0].titulo, "Remoto");
        assert!(linhas[0].deleted_at.is_some());
        assert!(listar_para_sincronizar(&conn, "outra").is_err());
    }

    #[test]
    fn notificar_um_computador_nao_muda_a_versao_sincronizada() {
        let conn = Connection::open_in_memory().unwrap();
        migrar(&conn).unwrap();
        let horario = "2026-11-25T12:00:00Z";
        let novo = serde_json::from_value::<NovoLacoInput>(
            serde_json::json!({ "titulo": "Local", "lembrarEm": horario }),
        )
        .unwrap();
        let local = criar_laco(&conn, novo).unwrap();
        vincular_conta(&conn, "dona").unwrap();
        assert!(registrar_notificacao_local(&conn, &local.id, horario, horario).unwrap());
        assert!(!registrar_notificacao_local(&conn, &local.id, horario, horario).unwrap());
        let linhas = listar_para_sincronizar(&conn, "dona").unwrap();
        assert_eq!(linhas[0].notificado_em.as_deref(), Some(horario));
        assert_eq!(linhas[0].sync_version, local.sync_version);
        assert_eq!(linhas[0].updated_at, local.updated_at);
    }
}
