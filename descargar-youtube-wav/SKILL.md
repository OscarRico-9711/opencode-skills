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

The split logic lives in ONE shared script used both by this skill and by TubeDrop, so the behavior and defaults are always the same:

```text
C:\Users\oscar\.config\opencode\skills\descargar-youtube-wav\dividir_samples.ps1
```

Run it after a download (from any working directory):

```powershell
& powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\oscar\.config\opencode\skills\descargar-youtube-wav\dividir_samples.ps1" -Folder "E:\3_Samples\samplesnuevos"
```

Optional parameters:

```text
-Folder            Carpeta donde estan los audios (default E:\3_Samples\samplesnuevos)
-TargetSeconds     Minutos objetivo por parte (default 600 = 10 min)
-ThresholdSeconds  Umbral para considerar un audio largo (default 1200 = 20 min)
-RecycleOriginals  Si se pasa, envia los originales largos a la papelera al final (solo si todas las partes salieron bien)
```

El script detecta, divide en partes iguales, nombra `01-Nombre.ext` con contador global, verifica y (si `-RecycleOriginals`) recicla los originales. Si hay fallos, no borra nada.

**TubeDrop**: la extension de navegador ejecuta este mismo script automaticamente al terminar una descarga (con `-RecycleOriginals`), sobre la carpeta de salida que elijas en el popup. No hace falta abrir opencode.

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
