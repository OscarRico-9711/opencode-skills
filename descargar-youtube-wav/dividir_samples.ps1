param(
  [string]$Folder = "E:\3_Samples\samplesnuevos",
  [int]$TargetSeconds = 600,
  [int]$ThresholdSeconds = 1200,
  [switch]$RecycleOriginals
)

# Dividir samples largos descargados: detecta audios > umbral y los divide en
# N partes iguales (~TargetSeconds), con nombres 01-Nombre.ext secuenciales.
# Flujo compartido entre el skill descargar-youtube-wav y TubeDrop.

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Folder)) { $Folder = "E:\3_Samples\samplesnuevos" }
if (-not (Test-Path -LiteralPath $Folder)) { throw "No existe la carpeta: $Folder" }

$LongFiles = @()
foreach ($Ext in @("*.mp3", "*.wav", "*.flac", "*.m4a", "*.aac")) {
  $LongFiles += @(Get-ChildItem -LiteralPath $Folder -File -Filter $Ext | Where-Object {
    $DurLine = & ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $_.FullName 2>$null
    $Dur = 0.0
    if ($DurLine -match '^\s*\d+(\.\d+)?\s*$') { $Dur = [double]$DurLine }
    $Dur -gt $ThresholdSeconds
  })
}
$LongFiles = @($LongFiles | Sort-Object Name)

if ($LongFiles.Count -eq 0) {
  Write-Output "No hay audios de mas de $([math]::Round($ThresholdSeconds/60)) min en $Folder"
  return
}

Write-Output "Encontre $($LongFiles.Count) audios de mas de $([math]::Round($ThresholdSeconds/60)) min."

$AllOk = $true
$Counter = 0
foreach ($File in $LongFiles) {
  $DurLine = & ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $File.FullName
  $Dur = [double]$DurLine
  $N = [int][Math]::Max(1, [Math]::Round($Dur / $TargetSeconds, 0, [MidpointRounding]::AwayFromZero))
  $PartLen = $Dur / $N
  $Boundaries = @()
  for ($i = 1; $i -lt $N; $i++) { $Boundaries += [Math]::Round($i * $PartLen, 3) }
  $Ext = $File.Extension
  $TmpPattern = Join-Path $Folder "__tmp_$($File.BaseName)_%03d$Ext"

  if ($Boundaries.Count -gt 0) {
    & ffmpeg -y -hide_banner -loglevel error -i $File.FullName -f segment -segment_times ($Boundaries -join ",") -reset_timestamps 1 -c copy $TmpPattern 2>&1 | Out-Null
  } else {
    & ffmpeg -y -hide_banner -loglevel error -i $File.FullName -f segment -reset_timestamps 1 -c copy $TmpPattern 2>&1 | Out-Null
  }

  $TmpParts = @(Get-ChildItem -LiteralPath $Folder -File -Filter "__tmp_$($File.BaseName)_*.$($Ext.TrimStart('.'))" | Sort-Object Name)
  if ($TmpParts.Count -ne $N) {
    $AllOk = $false
    Write-Output "ERROR en '$($File.Name)': se generaron $($TmpParts.Count) de $N partes"
    Get-ChildItem -LiteralPath $Folder -File -Filter "__tmp_$($File.BaseName)_*" | ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force }
    continue
  }
  foreach ($Part in $TmpParts) {
    do {
      $Counter++
      $NewName = "{0:D2}-{1}{2}" -f $Counter, $File.BaseName, $Ext
      $Target = Join-Path $Folder $NewName
    } while (Test-Path -LiteralPath $Target)
    Rename-Item -LiteralPath $Part.FullName -NewName $NewName
  }
  Write-Output "OK - '$($File.Name)' ($([math]::Round($Dur/60,1)) min) -> $N partes iguales de $([math]::Round($PartLen/60,1)) min"
}

if ($AllOk) {
  Write-Output "Listo: $Counter partes generadas (00-Nombre.EXT) en $Folder"
  if ($RecycleOriginals) {
    Add-Type -AssemblyName Microsoft.VisualBasic
    foreach ($File in $LongFiles) {
      [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile(
        $File.FullName,
        [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,
        [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin
      )
    }
    Write-Output "Se enviaron $($LongFiles.Count) audios largos originales a la papelera"
  }
} else {
  Write-Output "NO se borro nada: hubo fallos en algunas divisiones"
}