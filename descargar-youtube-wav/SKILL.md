---
name: descargar-youtube-wav
description: Use when Oscar asks to descargar, bajar, extraer o convertir una lista/playlist/video de YouTube a MP3 con yt-dlp, especialmente para samples. Requires a YouTube URL and defaults to E:\3_Samples\samplesnuevos output unless another folder is requested. After the download finishes, detect audios longer than 20 minutes and optionally split them into ~10-minute parts (dividir samples).
---

# Descargar YouTube MP3

Use this skill when Oscar asks to download audio from YouTube, especially playlists/lists, for example:

- "descarga esta lista de YouTube"
- "baja esta playlist"
- "descarga estos videos como audio"
- "descarga de YouTube para samples"
- "baja este video en MP3"
- "descarga esta lista y divide los largos"

## Input

The user must provide a YouTube URL. It can be:

- Playlist URL
- Video URL
- Video URL with `list=` parameter

If the user does not provide a URL, ask for it before running anything.

## Defaults

Output folder:

```text
E:\3_Samples\samplesnuevos
```

Audio format:

```text
-x --audio-format mp3 --audio-quality 0
```

YouTube client (reliable for format 18 which is always available):

```text
--extractor-args "youtube:player_client=android"
```

Do NOT use `--restrict-filenames` or `--windows-filenames` — they strip characters and break readable filenames.

Do NOT add playlist index counters or video IDs to filenames. Use clean `%(title)s.%(ext)s`.

## Recommended Command

Use PowerShell. `cd` into the output folder first (same as Oscar's original working batch file), then use a relative `--output`:

```powershell
$Url = "<URL>"
Set-Location -LiteralPath "E:\3_Samples\samplesnuevos"
py -m yt_dlp -x `
  --audio-format mp3 `
  --audio-quality 0 `
  --ignore-errors `
  --continue `
  --no-overwrites `
  --no-write-info-json `
  --no-write-thumbnail `
  --no-write-playlist-metafiles `
  --no-download-archive `
  --extractor-args "youtube:player_client=android" `
  --output "%(title)s.%(ext)s" `
  $Url
```

If the output folder does not exist yet, create it before `cd`:

```powershell
if (-not (Test-Path -LiteralPath "E:\3_Samples\samplesnuevos")) { New-Item -ItemType Directory -Path "E:\3_Samples\samplesnuevos" | Out-Null }
```

If Oscar asks for a failure log, append after the main command:

```powershell
py -m yt_dlp ... --print-to-file "FAILED: %(title)s | %(id)s | %(url)s" "log_fails.txt"
```

## Post-Download Split Step (dividir samples)

After yt-dlp finishes, run this step:

1. Report that the download ended:
   `Descarga terminada: N archivos descargados en <carpeta>.`
2. Detect files longer than 20 minutes (1200 seconds) using `ffprobe`.
3. Report what was found:
   `Encontré X audios de más de 20 minutos.`
4. Ask one short yes/no question:
   `¿Los divido en partes de ~10 minutos?`
   - If Oscar says yes (or if he asked to "descargar y dividir"), split every detected file.
   - If Oscar says no, do not split and end the flow.
   - If Oscar asks for another duration or threshold, use that instead of the defaults.

Defaults:

```text
Long-file threshold:  20 minutes (1200 seconds)
Target chunk length:  ~10 minutes (600 seconds)
Splitting:            PARTES IGUALES, nunca una cola corta.
                      N = round(Duracion / 600)  -> cada parte = Duracion / N.
                      Ej: 23 min -> 2 partes de 11:30. 26 min -> 3 partes de 8:40.
Output folder:        misma carpeta de descarga (NO subcarpetas)
Output naming:        01-<BaseName>.mp3, 02-<BaseName>.mp3, ...
                      Contador GLOBAL continuado entre audios, en orden de nombre.
```

End of flow:

1. Verify that every long file produced exactly N parts. If any file failed, report the failures and DO NOT delete anything.
2. Report the total part count, for example:
   `Listo: 14 partes generadas (01-Nombre.mp3, 02-Nombre.mp3, ...).`
3. Ask one short yes/no question:
   `¿Borro los audios largos originales?`
   - Only if Oscar confirms, send the original long files to the Windows Recycle Bin (recoverable). Do not use `Remove-Item`.

Rules for the split step:

- Equal parts only: compute `N = Math.Round(Duracion / 600)` (AwayFromZero) and cut every `Duracion / N` seconds. Never emit a tiny tail chunk.
- No subfolders. Write parts directly in the download folder.
- Sequential global counter `01-`, `02-`, ... that continues across all files (order by filename).
- Keep the flow fast: one `ffprobe` per file and one `ffmpeg -c copy` segment call per file (reads the input once, no re-encode). Do not loop `-ss` calls per part.
- Do not split already-split short parts again: parts are ~10 min and stay below the 20 min threshold, so they are naturally ignored.
- If a part name already exists, advance the counter until a free name.
- Delete originals only after all parts were created and only with Oscar's confirmation; use Recycle Bin, never permanent delete.

Recommended PowerShell (run after the download command):

```powershell
$DownloadFolder = "E:\3_Samples\samplesnuevos"
$SplitTargetSeconds = 600
$LongThresholdSeconds = 1200
$LongFiles = @()
foreach ($Ext in @("*.mp3", "*.wav", "*.flac", "*.m4a", "*.aac")) {
  $LongFiles += @(Get-ChildItem -LiteralPath $DownloadFolder -File -Filter $Ext | Where-Object {
    $DurLine = & ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $_.FullName 2>$null
    $Dur = 0.0
    if ($DurLine -match '^\s*\d+(\.\d+)?\s*$') { $Dur = [double]$DurLine }
    $Dur -gt $LongThresholdSeconds
  })
}
$LongFiles = @($LongFiles | Sort-Object Name)
if ($LongFiles.Count -eq 0) { "No hay audios de mas de 20 min."; return }

$AllOk = $true
$Counter = 0
foreach ($File in $LongFiles) {
  $DurLine = & ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $File.FullName
  $Dur = [double]$DurLine
  $N = [int][Math]::Max(1, [Math]::Round($Dur / $SplitTargetSeconds, 0, [MidpointRounding]::AwayFromZero))
  $PartLen = $Dur / $N
  $Boundaries = @()
  for ($i = 1; $i -lt $N; $i++) { $Boundaries += [Math]::Round($i * $PartLen, 3) }
  $TmpPattern = Join-Path $DownloadFolder "__tmp_$($File.BaseName)_%03d.mp3"
  & ffmpeg -y -hide_banner -loglevel error -i $File.FullName -f segment -segment_times ($Boundaries -join ",") -reset_timestamps 1 -c copy $TmpPattern
  $TmpParts = @(Get-ChildItem -LiteralPath $DownloadFolder -File -Filter "__tmp_$($File.BaseName)_*.mp3" | Sort-Object Name)
  if ($TmpParts.Count -ne $N) {
    $AllOk = $false
    "ERROR en '$($File.Name)': se generaron $($TmpParts.Count) de $N partes"
    continue
  }
  foreach ($Part in $TmpParts) {
    do {
      $Counter++
      $NewName = "{0:D2}-{1}.mp3" -f $Counter, $File.BaseName
      $Target = Join-Path $DownloadFolder $NewName
    } while (Test-Path -LiteralPath $Target)
    Rename-Item -LiteralPath $Part.FullName -NewName $NewName
  }
  "OK - '$($File.Name)' ($([math]::Round($Dur/60,1)) min) -> $N partes iguales de $([math]::Round($PartLen/60,1)) min"
}

if ($AllOk) {
  "Listo: $Counter partes generadas (NN-Nombre.mp3)."
  # Solo si Oscar confirma: reciclar los originales largos
  Add-Type -AssemblyName Microsoft.VisualBasic
  foreach ($File in $LongFiles) {
    [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile(
      $File.FullName,
      [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,
      [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin
    )
  }
} else {
  "NO se borro nada: hubo fallos en algunas divisiones."
}
```

If `-c copy` produces segments with wrong durations or unwanted metadata, re-encode instead. It is slower, so only use it when copy is broken:

```powershell
& ffmpeg -y -hide_banner -loglevel error -i $File.FullName -f segment -segment_times ($Boundaries -join ",") -reset_timestamps 1 -c:a libmp3lame -q:a 0 $TmpPattern
```

## Rules

- Always download/convert to `.mp3`, not WAV.
- Do not add playlist index counters or video IDs to filenames — use `%(title)s.%(ext)s`.
- Filenames should keep their original readable titles (no `--restrict-filenames`).
- Use `--ignore-errors` so one failed video does not stop the entire playlist.
- Use `--continue` and `--no-overwrites` to resume partial downloads without replacing files Oscar already has.
- Do not delete existing files.
- If the user requests only one video from a playlist URL, add `--no-playlist`.
- If the user requests a full playlist, do not add `--no-playlist`.
- The `android` client is the only reliable one for these sample playlists. Do not use `web`, `ios`, or `mweb`.

## Dependency Check

Before a large playlist, check dependencies once:

```powershell
py -m yt_dlp --version
ffmpeg -version
```

If `yt-dlp` is missing or YouTube extraction fails unexpectedly, update it:

```powershell
py -m pip install -U yt-dlp
```

If FFmpeg is missing, audio extraction will fail. Report missing dependencies clearly before trying alternatives.
