$ErrorActionPreference = 'Stop'

$exePath = 'C:\proj\producthub\produtos\lembretes\bin\lembretes.exe'
$iconPath = 'C:\proj\producthub\produtos\lembretes\src-tauri\icons\icon.ico'
$workDir = 'C:\proj\producthub\produtos\lembretes'

if (-not (Test-Path $exePath)) {
  throw "Binario nao encontrado em $exePath"
}

$wsh = New-Object -ComObject WScript.Shell
$candidatos = @(
  [Environment]::GetFolderPath('Desktop'),
  'C:\Users\mayco\Desktop',
  'C:\Users\mayco\OneDrive\Desktop',
  'C:\Users\mayco\OneDrive\Área de Trabalho',
  [Environment]::GetFolderPath('UserProfile'),
  'C:\proj\producthub'
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

foreach ($pasta in $candidatos) {
  $lnkPath = Join-Path $pasta 'Lembretes.lnk'
  $atalho = $wsh.CreateShortcut($lnkPath)
  $atalho.TargetPath = $exePath
  $atalho.WorkingDirectory = $workDir
  $atalho.IconLocation = "$iconPath,0"
  $atalho.Description = 'Lembretes: mural visual e lacinho flutuante discreto no Windows'
  $atalho.Save()
  Write-Output "Atalho confirmado: $lnkPath"
}
