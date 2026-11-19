mod db;
mod updater;

use base64::{engine::general_purpose::STANDARD, Engine as _};
use db::{AtualizarLacoInput, Laco, NovoLacoInput};
use updater::{InfoAtualizacao, NovidadesPosAtualizacao};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use std::thread;
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use uuid::Uuid;

const ENDPOINT_INSTANCIA_UNICA: &str = "127.0.0.1:49871";
const TRAY_ICON_RGBA: &[u8] = include_bytes!("../icons/tray-icon.rgba");

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PreferenciasJanela {
    modo_atalho: String,
}

impl Default for PreferenciasJanela {
    fn default() -> Self {
        Self {
            modo_atalho: "flutuante".to_string(),
        }
    }
}

struct AppState {
    db: Mutex<Connection>,
    pasta_dados: PathBuf,
    pasta_imagens: PathBuf,
    caminho_prefs: PathBuf,
    modo_atalho: Mutex<String>,
}

fn ler_prefs_janela(caminho: &Path) -> PreferenciasJanela {
    fs::read_to_string(caminho)
        .ok()
        .and_then(|s| serde_json::from_str::<PreferenciasJanela>(&s).ok())
        .unwrap_or_default()
}

fn gravar_prefs_janela(caminho: &Path, modo: &str) {
    let dados = PreferenciasJanela {
        modo_atalho: modo.to_string(),
    };
    if let Ok(json) = serde_json::to_string_pretty(&dados) {
        let _ = fs::write(caminho, json);
    }
}

fn aplicar_visibilidade_widget(app: &AppHandle, modo: &str) {
    if let Some(widget) = app.get_webview_window("widget") {
        let _ = widget.set_skip_taskbar(true);
        if modo == "barra" {
            let _ = widget.hide();
        } else {
            let _ = widget.show();
        }
    }
}

fn mostrar_mural(app: &AppHandle, focar_novo: bool, alternar_se_focado: bool) {
    if let Some(janela) = app.get_webview_window("main") {
        let visivel = janela.is_visible().unwrap_or(false);
        let minimizada = janela.is_minimized().unwrap_or(false);
        let focada = janela.is_focused().unwrap_or(false);

        if alternar_se_focado && !focar_novo && visivel && !minimizada && focada {
            let _ = janela.hide();
            return;
        }

        let _ = janela.unminimize();
        let _ = janela.show();
        let _ = janela.set_focus();
        if focar_novo {
            let _ = janela.emit("mural:focar-novo-laco", ());
        }
    }
}

#[tauri::command]
fn listar_lacos(state: State<'_, AppState>) -> Result<Vec<Laco>, String> {
    let conn = state.db.lock().map_err(|_| "Banco ocupado".to_string())?;
    db::listar_lacos(&conn)
}

#[tauri::command]
fn criar_laco(
    app: AppHandle,
    state: State<'_, AppState>,
    input: NovoLacoInput,
) -> Result<Laco, String> {
    let laco = {
        let conn = state.db.lock().map_err(|_| "Banco ocupado".to_string())?;
        db::criar_laco(&conn, input)?
    };
    let _ = app.emit("lacos:mudou", ());
    Ok(laco)
}

#[tauri::command]
fn atualizar_laco(
    app: AppHandle,
    state: State<'_, AppState>,
    input: AtualizarLacoInput,
) -> Result<Laco, String> {
    let laco = {
        let conn = state.db.lock().map_err(|_| "Banco ocupado".to_string())?;
        db::atualizar_laco(&conn, input)?
    };
    let _ = app.emit("lacos:mudou", ());
    Ok(laco)
}

#[tauri::command]
fn desfazer_laco(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<Laco, String> {
    let laco = {
        let conn = state.db.lock().map_err(|_| "Banco ocupado".to_string())?;
        db::desfazer_laco(&conn, &id)?
    };
    let _ = app.emit("lacos:mudou", ());
    Ok(laco)
}

#[tauri::command]
fn reamarrar_laco(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<Laco, String> {
    let laco = {
        let conn = state.db.lock().map_err(|_| "Banco ocupado".to_string())?;
        db::reamarrar_laco(&conn, &id)?
    };
    let _ = app.emit("lacos:mudou", ());
    Ok(laco)
}

#[tauri::command]
fn excluir_laco(app: AppHandle, state: State<'_, AppState>, id: String) -> Result<(), String> {
    {
        let conn = state.db.lock().map_err(|_| "Banco ocupado".to_string())?;
        db::excluir_laco(&conn, &id)?;
    }
    let _ = app.emit("lacos:mudou", ());
    Ok(())
}

#[tauri::command]
fn salvar_imagem_base64(
    state: State<'_, AppState>,
    nome: String,
    data_url: String,
) -> Result<String, String> {
    let payload = data_url
        .split_once(',')
        .map(|(_, b64)| b64)
        .unwrap_or(&data_url);
    let bytes = STANDARD
        .decode(payload)
        .map_err(|e| format!("Imagem base64 invalida: {e}"))?;

    let extensao = PathBuf::from(&nome)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("png")
        .to_string();
    let nome_arquivo = format!("{}.{}", Uuid::new_v4(), extensao);
    let destino = state.pasta_imagens.join(nome_arquivo);

    fs::write(&destino, bytes).map_err(|e| format!("Falha ao gravar imagem: {e}"))?;
    Ok(destino.to_string_lossy().to_string())
}

#[tauri::command]
fn abrir_mural(app: AppHandle, focar_novo_laco: bool) {
    mostrar_mural(&app, focar_novo_laco, true);
}

#[tauri::command]
fn obter_modo_atalho(state: State<'_, AppState>) -> String {
    state
        .modo_atalho
        .lock()
        .map(|m| m.clone())
        .unwrap_or_else(|_| "flutuante".to_string())
}

#[tauri::command]
fn definir_modo_atalho(
    app: AppHandle,
    state: State<'_, AppState>,
    modo: String,
) -> Result<String, String> {
    let normalizado = if modo == "barra" {
        "barra".to_string()
    } else {
        "flutuante".to_string()
    };
    {
        let mut atual = state
            .modo_atalho
            .lock()
            .map_err(|_| "Estado ocupado".to_string())?;
        *atual = normalizado.clone();
    }
    gravar_prefs_janela(&state.caminho_prefs, &normalizado);
    aplicar_visibilidade_widget(&app, &normalizado);
    let _ = app.emit("atalho:mudou", normalizado.clone());
    Ok(normalizado)
}

#[tauri::command]
fn mostrar_menu_widget(app: AppHandle) -> Result<(), String> {
    if let Some(widget) = app.get_webview_window("widget") {
        let item_abrir =
            MenuItem::with_id(&app, "ctx_abrir", "Abrir Lembretes", true, None::<&str>)
                .map_err(|e| e.to_string())?;
        let item_barra = MenuItem::with_id(
            &app,
            "ctx_barra",
            "Mover para dentro da barra de ferramentas",
            true,
            None::<&str>,
        )
        .map_err(|e| e.to_string())?;
        let item_sair = MenuItem::with_id(&app, "ctx_sair", "Sair", true, None::<&str>)
            .map_err(|e| e.to_string())?;
        let menu =
            Menu::with_items(&app, &[&item_abrir, &item_barra, &item_sair]).map_err(|e| e.to_string())?;
        widget.popup_menu(&menu).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn abrir_config_barra_windows() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg("ms-settings:taskbar")
            .spawn()
            .map_err(|e| format!("Falha ao abrir configuracoes da barra: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
async fn verificar_atualizacao() -> Result<InfoAtualizacao, String> {
    tauri::async_runtime::spawn_blocking(updater::consultar_github_latest)
        .await
        .map_err(|e| format!("Falha interna ao verificar versao: {e}"))?
}

#[tauri::command]
async fn instalar_atualizacao(
    app: AppHandle,
    state: State<'_, AppState>,
    nova_versao: String,
    notas: String,
    download_url: String,
    tamanho_bytes: u64,
) -> Result<(), String> {
    let pasta_dados = state.pasta_dados.clone();
    tauri::async_runtime::spawn_blocking(move || {
        updater::executar_download_e_reinicio(
            &app,
            &pasta_dados,
            &nova_versao,
            &notas,
            &download_url,
            tamanho_bytes,
        )
    })
    .await
    .map_err(|e| format!("Falha ao executar atualizador: {e}"))?
}

#[tauri::command]
fn obter_novidades_pos_atualizacao(state: State<'_, AppState>) -> Option<NovidadesPosAtualizacao> {
    updater::ler_novidades_pos_atualizacao(&state.pasta_dados)
}

#[tauri::command]
fn confirmar_leitura_novidades(state: State<'_, AppState>) {
    updater::limpar_novidades_pos_atualizacao(&state.pasta_dados);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let listener_unico = match TcpListener::bind(ENDPOINT_INSTANCIA_UNICA) {
        Ok(l) => l,
        Err(_) => {
            if let Ok(mut stream) = TcpStream::connect(ENDPOINT_INSTANCIA_UNICA) {
                let _ = stream.write_all(b"ABRIR\n");
            }
            return;
        }
    };

    let atalho_padrao = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyL);

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if shortcut == &atalho_padrao && event.state() == ShortcutState::Pressed {
                        mostrar_mural(app, true, false);
                    }
                })
                .build(),
        )
        .on_menu_event(|app, ev| match ev.id.as_ref() {
            "abrir" | "ctx_abrir" => mostrar_mural(app, false, false),
            "novo" => mostrar_mural(app, true, false),
            "ctx_barra" => {
                let state = app.state::<AppState>();
                let _ = definir_modo_atalho(app.clone(), state, "barra".to_string());
            }
            "alternar_modo" => {
                let state = app.state::<AppState>();
                let proximo = if obter_modo_atalho(state.clone()) == "barra" {
                    "flutuante"
                } else {
                    "barra"
                };
                let _ = definir_modo_atalho(app.clone(), state, proximo.to_string());
            }
            "sair" | "ctx_sair" => app.exit(0),
            _ => {}
        })
        .setup(move |app| {
            updater::limpar_binario_antigo();

            let handle_ipc = app.handle().clone();
            thread::spawn(move || {
                for conexao in listener_unico.incoming().flatten() {
                    let mut leitor = BufReader::new(conexao);
                    let mut comando = String::new();
                    let _ = leitor.read_line(&mut comando);
                    if comando.trim() == "SAIR" {
                        handle_ipc.exit(0);
                        break;
                    }
                    mostrar_mural(&handle_ipc, false, false);
                }
            });

            let pasta_dados = app
                .path()
                .app_data_dir()
                .map_err(|e| format!("Sem pasta de dados: {e}"))?;
            fs::create_dir_all(&pasta_dados)?;
            let pasta_imagens = pasta_dados.join("imagens");
            fs::create_dir_all(&pasta_imagens)?;
            let pasta_backups = pasta_dados.join("backups");
            fs::create_dir_all(&pasta_backups)?;

            let caminho_prefs = pasta_dados.join("preferencias_janela.json");
            let prefs_iniciais = ler_prefs_janela(&caminho_prefs);

            let caminho_banco = pasta_dados.join("lembretes.db");
            if let Ok(meta) = fs::metadata(&caminho_banco) {
                if meta.len() > 0 {
                    let _ = fs::copy(&caminho_banco, pasta_backups.join("lembretes-ultimo.db"));
                }
            }
            let conn = db::abrir_banco(&caminho_banco)?;

            app.manage(AppState {
                db: Mutex::new(conn),
                pasta_dados,
                pasta_imagens,
                caminho_prefs,
                modo_atalho: Mutex::new(prefs_iniciais.modo_atalho.clone()),
            });

            aplicar_visibilidade_widget(app.handle(), &prefs_iniciais.modo_atalho);

            let _ = app.global_shortcut().register(atalho_padrao);

            let item_abrir = MenuItem::with_id(app, "abrir", "Abrir Lembretes", true, None::<&str>)?;
            let item_novo = MenuItem::with_id(
                app,
                "novo",
                "Amarrar novo laço (Ctrl+Alt+L)",
                true,
                None::<&str>,
            )?;
            let item_alternar = MenuItem::with_id(
                app,
                "alternar_modo",
                "Mostrar / Ocultar bolinha flutuante",
                true,
                None::<&str>,
            )?;
            let item_sair = MenuItem::with_id(app, "sair", "Sair", true, None::<&str>)?;
            let menu =
                Menu::with_items(app, &[&item_abrir, &item_novo, &item_alternar, &item_sair])?;

            let icone_bandeja = Image::new_owned(TRAY_ICON_RGBA.to_vec(), 32, 32);

            let _ = TrayIconBuilder::new()
                .icon(icone_bandeja)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .tooltip("Lembretes · Clique para abrir seus laços")
                .on_tray_icon_event(|tray, ev| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = ev
                    {
                        mostrar_mural(tray.app_handle(), false, true);
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|janela, ev| {
            if janela.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = ev {
                    api.prevent_close();
                    let _ = janela.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            listar_lacos,
            criar_laco,
            atualizar_laco,
            desfazer_laco,
            reamarrar_laco,
            excluir_laco,
            salvar_imagem_base64,
            abrir_mural,
            obter_modo_atalho,
            definir_modo_atalho,
            mostrar_menu_widget,
            abrir_config_barra_windows,
            verificar_atualizacao,
            instalar_atualizacao,
            obter_novidades_pos_atualizacao,
            confirmar_leitura_novidades
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao iniciar o aplicativo Lembretes");
}
