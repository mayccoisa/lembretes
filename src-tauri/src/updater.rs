use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

const REPO_GITHUB: &str = "mayccoisa/lembretes";
const ARQUIVO_POS_UPDATE: &str = "pos_atualizacao.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InfoAtualizacao {
    pub disponivel: bool,
    pub versao_atual: String,
    pub nova_versao: Option<String>,
    pub notas: String,
    pub download_url: Option<String>,
    pub tamanho_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressoAtualizacao {
    pub etapa: String,
    pub percentual: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NovidadesPosAtualizacao {
    pub versao: String,
    pub notas: String,
    pub instalado_em: String,
}

#[derive(Debug, Deserialize)]
struct GithubAsset {
    name: String,
    browser_download_url: String,
    size: u64,
}

#[derive(Debug, Deserialize)]
struct GithubRelease {
    tag_name: String,
    body: Option<String>,
    assets: Vec<GithubAsset>,
}

pub fn extrair_versao_limpa(v: &str) -> String {
    v.trim()
        .trim_start_matches(['v', 'V'])
        .split('-')
        .next()
        .unwrap_or("0.0.0")
        .to_string()
}

pub fn comparar_semver(a: &str, b: &str) -> i32 {
    let pa: Vec<u64> = extrair_versao_limpa(a)
        .split('.')
        .map(|s| s.parse::<u64>().unwrap_or(0))
        .collect();
    let pb: Vec<u64> = extrair_versao_limpa(b)
        .split('.')
        .map(|s| s.parse::<u64>().unwrap_or(0))
        .collect();

    let tam = pa.len().max(pb.len()).max(3);
    for i in 0..tam {
        let va = *pa.get(i).unwrap_or(&0);
        let vb = *pb.get(i).unwrap_or(&0);
        if va > vb {
            return 1;
        }
        if va < vb {
            return -1;
        }
    }
    0
}

pub fn limpar_binario_antigo() {
    if let Ok(exe_atual) = std::env::current_exe() {
        let exe_old = exe_atual.with_extension("old.exe");
        if exe_old.exists() {
            let _ = fs::remove_file(exe_old);
        }
        let exe_novo = exe_atual.with_extension("novo.exe");
        if exe_novo.exists() {
            let _ = fs::remove_file(exe_novo);
        }
    }
}

pub fn ler_novidades_pos_atualizacao(pasta_dados: &Path) -> Option<NovidadesPosAtualizacao> {
    let caminho = pasta_dados.join(ARQUIVO_POS_UPDATE);
    let texto = fs::read_to_string(caminho).ok()?;
    serde_json::from_str::<NovidadesPosAtualizacao>(&texto).ok()
}

pub fn limpar_novidades_pos_atualizacao(pasta_dados: &Path) {
    let caminho = pasta_dados.join(ARQUIVO_POS_UPDATE);
    let _ = fs::remove_file(caminho);
}

fn gravar_novidades_pos_atualizacao(pasta_dados: &Path, versao: &str, notas: &str) {
    let dados = NovidadesPosAtualizacao {
        versao: versao.to_string(),
        notas: notas.to_string(),
        instalado_em: Utc::now().to_rfc3339(),
    };
    if let Ok(json) = serde_json::to_string_pretty(&dados) {
        let _ = fs::write(pasta_dados.join(ARQUIVO_POS_UPDATE), json);
    }
}

fn avaliar_json_release(json_str: &str, versao_atual: &str) -> Result<InfoAtualizacao, String> {
    let rel: GithubRelease =
        serde_json::from_str(json_str).map_err(|e| format!("Resposta invalida do GitHub: {e}"))?;

    let nova_limpa = extrair_versao_limpa(&rel.tag_name);
    let notas = rel
        .body
        .unwrap_or_default()
        .trim()
        .to_string();

    let asset_escolhido = rel
        .assets
        .iter()
        .find(|a| a.name.eq_ignore_ascii_case("lembretes.exe"))
        .or_else(|| rel.assets.iter().find(|a| a.name.to_lowercase().ends_with(".exe")));

    if comparar_semver(&nova_limpa, versao_atual) > 0 {
        if let Some(asset) = asset_escolhido {
            return Ok(InfoAtualizacao {
                disponivel: true,
                versao_atual: versao_atual.to_string(),
                nova_versao: Some(nova_limpa),
                notas: if notas.is_empty() {
                    "Melhorias gerais de estabilidade e desempenho.".to_string()
                } else {
                    notas
                },
                download_url: Some(asset.browser_download_url.clone()),
                tamanho_bytes: asset.size,
            });
        }
    }

    Ok(InfoAtualizacao {
        disponivel: false,
        versao_atual: versao_atual.to_string(),
        nova_versao: None,
        notas,
        download_url: None,
        tamanho_bytes: 0,
    })
}

pub fn consultar_github_latest() -> Result<InfoAtualizacao, String> {
    let versao_atual = env!("CARGO_PKG_VERSION");
    let url = format!("https://api.github.com/repos/{REPO_GITHUB}/releases/latest");

    let mut cmd = Command::new("curl.exe");
    cmd.args([
        "-sSL",
        "--max-time",
        "12",
        "-w",
        "\n%{http_code}",
        "-H",
        "Accept: application/vnd.github+json",
        "-H",
        "User-Agent: Lembretes-Updater",
        &url,
    ]);

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let output = cmd
        .output()
        .map_err(|e| format!("Falha ao consultar GitHub Releases: {e}"))?;

    let texto = String::from_utf8_lossy(&output.stdout);
    let mut partes: Vec<&str> = texto.trim_end().rsplitn(2, '\n').collect();
    let codigo_http = partes.first().copied().unwrap_or("000").trim();
    let corpo_json = partes.pop().unwrap_or("");

    if codigo_http == "404" {
        return Ok(InfoAtualizacao {
            disponivel: false,
            versao_atual: versao_atual.to_string(),
            nova_versao: None,
            notas: String::new(),
            download_url: None,
            tamanho_bytes: 0,
        });
    }

    if codigo_http != "200" {
        return Err(format!("GitHub respondeu status {codigo_http}"));
    }

    avaliar_json_release(corpo_json, versao_atual)
}

fn validar_executavel_windows(caminho: &Path) -> Result<(), String> {
    let meta = fs::metadata(caminho).map_err(|e| format!("Arquivo baixado ausente: {e}"))?;
    if meta.len() < 1_000_000 {
        return Err("Download incompleto ou menor que o esperado.".to_string());
    }
    let mut arq = File::open(caminho).map_err(|e| e.to_string())?;
    let mut assinatura = [0u8; 2];
    arq.read_exact(&mut assinatura).map_err(|e| e.to_string())?;
    if assinatura != [0x4D, 0x5A] {
        return Err("Arquivo baixado nao e um executavel valido do Windows.".to_string());
    }
    Ok(())
}

pub fn executar_download_e_reinicio(
    app: &AppHandle,
    pasta_dados: &Path,
    nova_versao: &str,
    notas: &str,
    download_url: &str,
    tamanho_esperado: u64,
) -> Result<(), String> {
    let exe_atual: PathBuf =
        std::env::current_exe().map_err(|e| format!("Caminho do executavel indisponivel: {e}"))?;
    let exe_novo = exe_atual.with_extension("novo.exe");
    let exe_old = exe_atual.with_extension("old.exe");

    let _ = fs::remove_file(&exe_novo);

    let _ = app.emit(
        "atualizacao:progresso",
        ProgressoAtualizacao {
            etapa: "baixando".to_string(),
            percentual: 5,
        },
    );

    let mut cmd = Command::new("curl.exe");
    cmd.args([
        "-sSL",
        "--fail",
        "--max-time",
        "300",
        "-H",
        "User-Agent: Lembretes-Updater",
        "-o",
        &exe_novo.to_string_lossy(),
        download_url,
    ]);

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let mut filho = cmd
        .spawn()
        .map_err(|e| format!("Nao foi possivel iniciar o download: {e}"))?;

    loop {
        match filho.try_wait() {
            Ok(Some(status)) => {
                if !status.success() {
                    let _ = fs::remove_file(&exe_novo);
                    return Err("Falha ao baixar o pacote da nova versao.".to_string());
                }
                break;
            }
            Ok(None) => {
                if tamanho_esperado > 0 {
                    if let Ok(meta) = fs::metadata(&exe_novo) {
                        let frac = (meta.len() as f64 / tamanho_esperado as f64).clamp(0.0, 1.0);
                        let pct = (5.0 + frac * 85.0).round() as u8;
                        let _ = app.emit(
                            "atualizacao:progresso",
                            ProgressoAtualizacao {
                                etapa: "baixando".to_string(),
                                percentual: pct.min(90),
                            },
                        );
                    }
                }
                thread::sleep(Duration::from_millis(120));
            }
            Err(e) => {
                let _ = fs::remove_file(&exe_novo);
                return Err(format!("Erro durante o download: {e}"));
            }
        }
    }

    validar_executavel_windows(&exe_novo).inspect_err(|_| {
        let _ = fs::remove_file(&exe_novo);
    })?;

    let _ = app.emit(
        "atualizacao:progresso",
        ProgressoAtualizacao {
            etapa: "instalando".to_string(),
            percentual: 95,
        },
    );

    gravar_novidades_pos_atualizacao(pasta_dados, nova_versao, notas);

    let _ = fs::remove_file(&exe_old);
    fs::rename(&exe_atual, &exe_old)
        .map_err(|e| format!("Falha ao preparar troca do executavel: {e}"))?;

    if let Err(e) = fs::rename(&exe_novo, &exe_atual) {
        let _ = fs::rename(&exe_old, &exe_atual);
        return Err(format!("Falha ao aplicar novo executavel: {e}"));
    }

    let _ = app.emit(
        "atualizacao:progresso",
        ProgressoAtualizacao {
            etapa: "reiniciando".to_string(),
            percentual: 100,
        },
    );

    #[cfg(target_os = "windows")]
    {
        let comando_reinicio = format!(
            "ping 127.0.0.1 -n 2 > nul && start \"\" \"{}\"",
            exe_atual.to_string_lossy()
        );
        let mut relancador = Command::new("cmd.exe");
        relancador.args(["/C", &comando_reinicio]);
        relancador.creation_flags(CREATE_NO_WINDOW);
        let _ = relancador.spawn();
    }

    thread::sleep(Duration::from_millis(180));
    app.exit(0);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compara_versoes_e_parseia_release() {
        assert_eq!(comparar_semver("v0.3.0", "0.2.0"), 1);
        assert_eq!(comparar_semver("0.2.0", "v0.2.0"), 0);
        assert_eq!(comparar_semver("0.1.9", "0.2.0"), -1);
        assert_eq!(comparar_semver("0.10.0", "0.2.0"), 1);

        let amostra = serde_json::json!({
            "tag_name": "v0.3.0",
            "body": "### Adicionado\n* Sincronizacao rapida",
            "assets": [
                {
                    "name": "lembretes.exe",
                    "browser_download_url": "https://github.com/mayccoisa/lembretes/releases/download/v0.3.0/lembretes.exe",
                    "size": 17000000
                }
            ]
        })
        .to_string();

        let info = avaliar_json_release(&amostra, "0.2.0").expect("parsear release");
        assert!(info.disponivel);
        assert_eq!(info.nova_versao.as_deref(), Some("0.3.0"));
        assert!(info.download_url.is_some());
    }
}
