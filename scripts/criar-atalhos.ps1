$ErrorActionPreference = 'Stop'

# Recria o atalho do Lembretes na area de trabalho do Windows.
# A tecla Ctrl+Alt+L fica gravada no proprio atalho: abre o app mesmo fechado.
# Com o app aberto, a segunda copia avisa a primeira (instancia unica) e sai, e o --novo
# faz o mural abrir pronto para amarrar um laco novo, igual ao Ctrl+Alt+L de dentro do app.

# Caminhos relativos a esta pasta: o script segue valendo se o projeto mudar de lugar.
$workDir = Split-Path -Parent $PSScriptRoot
$exePath = Join-Path $workDir 'bin\lembretes.exe'
$iconPath = Join-Path $workDir 'src-tauri\icons\icon.ico'

if (-not (Test-Path $exePath)) {
  throw "Binario nao encontrado em $exePath"
}

$areaDeTrabalho = [Environment]::GetFolderPath('Desktop')
$lnkPath = Join-Path $areaDeTrabalho 'Lembretes.lnk'

if (Test-Path $lnkPath) {
  Remove-Item $lnkPath -Force
}

$wsh = New-Object -ComObject WScript.Shell
$atalho = $wsh.CreateShortcut($lnkPath)
$atalho.TargetPath = $exePath
$atalho.Arguments = '--novo'
$atalho.WorkingDirectory = $workDir
$atalho.IconLocation = "$iconPath,0"
$atalho.Hotkey = 'CTRL+ALT+L'
$atalho.Description = 'Lembretes: mural visual e lacinho flutuante (Ctrl+Alt+L abre de qualquer lugar)'
$atalho.Save()

Write-Output "Atalho recriado: $lnkPath (Ctrl+Alt+L)"
