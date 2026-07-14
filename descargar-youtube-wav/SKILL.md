---
name: descargar-youtube-wav
description: Use when Oscar asks to descargar, bajar, extraer o convertir una lista/playlist/video de YouTube a MP3 con yt-dlp, especialmente para samples. Requires a YouTube URL and defaults to E:\3_Samples\samplesnuevos output unless another folder is requested.
---

# Descargar YouTube MP3

Use this skill when Oscar asks to download audio from YouTube, especially playlists/lists, for example:

- "descarga esta lista de YouTube"
- "baja esta playlist"
- "descarga estos videos como audio"
- "descarga de YouTube para samples"
- "baja este video en MP3"

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
