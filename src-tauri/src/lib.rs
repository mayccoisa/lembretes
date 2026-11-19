mod db;

use base64::{engine::general_purpose::STANDARD, Engine as _};
use db::{AtualizarLacoInput, Laco, NovoLacoInput};
use rusqlite::Connection;
use std::fs;
use std::io::Write;
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::sync::Mutex;
use std::thread;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use uuid::Uuid;

const ENDPOINT_INSTANCIA_UNICA: &str = "127.0.0.1:49871";

struct AppState {
    db: Mutex<Connection>,
    pasta_imagens: PathBuf,
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
fn alternar_widget_flutuante(app: AppHandle) -> Result<bool, String> {
    if let Some(widget) = app.get_webview_window("widget") {
        let visivel = widget.is_visible().unwrap_or(false);
        if visivel {
            widget.hide().map_err(|e| e.to_string())?;
            return Ok(false);
        } else {
            widget.show().map_err(|e| e.to_string())?;
            return Ok(true);
        }
    }
    Ok(false)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Trava de instancia unica: evita duplicar o lacinho flutuante ou o icone da bandeja
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
        .setup(move |app| {
            let handle_ipc = app.handle().clone();
            thread::spawn(move || {
                for conexao in listener_unico.incoming() {
                    if conexao.is_ok() {
                        mostrar_mural(&handle_ipc, false, false);
                    }
                }
            });

            if let Some(widget) = app.get_webview_window("widget") {
                let _ = widget.set_skip_taskbar(true);
            }

            let pasta_dados = app
                .path()
                .app_data_dir()
                .map_err(|e| format!("Sem pasta de dados: {e}"))?;
            fs::create_dir_all(&pasta_dados)?;
            let pasta_imagens = pasta_dados.join("imagens");
            fs::create_dir_all(&pasta_imagens)?;

            let caminho_banco = pasta_dados.join("lembretes.db");
            let conn = db::abrir_banco(&caminho_banco)?;

            app.manage(AppState {
                db: Mutex::new(conn),
                pasta_imagens,
            });

            let _ = app.global_shortcut().register(atalho_padrao);

            let item_abrir = MenuItem::with_id(app, "abrir", "Abrir Lembretes", true, None::<&str>)?;
            let item_novo = MenuItem::with_id(
                app,
                "novo",
                "Amarrar novo laço (Ctrl+Alt+L)",
                true,
                None::<&str>,
            )?;
            let item_widget = MenuItem::with_id(
                app,
                "widget",
                "Mostrar / Ocultar Lacinho Flutuante",
                true,
                None::<&str>,
            )?;
            let item_sair = MenuItem::with_id(app, "sair", "Sair", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&item_abrir, &item_novo, &item_widget, &item_sair])?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Lembretes · Clique para ver seus laços")
                .on_menu_event(|app, ev| match ev.id.as_ref() {
                    "abrir" => mostrar_mural(app, false, false),
                    "novo" => mostrar_mural(app, true, false),
                    "widget" => {
                        let _ = alternar_widget_flutuante(app.clone());
                    }
                    "sair" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, ev| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = ev
                    {
                        mostrar_mural(tray.app_handle(), false, true);
                    }
                });

            if let Some(icone) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icone.clone());
            }
            let _ = tray_builder.build(app)?;

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
            alternar_widget_flutuante
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao iniciar o aplicativo Lembretes");
}
