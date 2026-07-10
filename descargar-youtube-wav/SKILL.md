---
name: descargar-youtube-wav
description: Use when the user asks to descargar una lista/playlist/video de YouTube as WAV audio using yt-dlp. Requires a YouTube URL parameter and defaults to E:\3_Samples\samplesnuevos output.
---

# Descargar YouTube WAV

Use this skill when Oscar asks to download audio from YouTube, especially playlists/lists, for example:

- "descarga esta lista de YouTube"
- "baja esta playlist en WAV"
- "descarga estos videos como audio"
- "descarga de YouTube para samples"

## Input

The user must provide a YouTube URL. It can be:

- Playlist URL
- Video URL
- Video URL with `list=` parameter

If the user does not provide a URL, ask for it before running anything.

## Defaults

Use this output folder unless Oscar gives another one:

```text
E:\3_Samples\samplesnuevos
```

Always extract audio as WAV:

```text
--extract-audio --audio-format wav
```

Use the same reliable YouTube extractor compatibility setting from Oscar's existing batch file:

```text
--extractor-args "youtube:player_client=android"
```

## Recommended Command

Use PowerShell from any working directory. Replace `<URL>` with the user's YouTube URL:

```powershell
$OutputFolder = "E:\3_Samples\samplesnuevos"
$Url = "<URL>"
if (-not (Test-Path -LiteralPath $OutputFolder)) { New-Item -ItemType Directory -Path $OutputFolder | Out-Null }
py -m yt_dlp `
  --extract-audio `
  --audio-format wav `
  --audio-quality 0 `
  --ignore-errors `
  --no-write-info-json `
  --no-write-thumbnail `
  --no-write-playlist-metafiles `
  --no-download-archive `
  --restrict-filenames `
  --windows-filenames `
  --extractor-args "youtube:player_client=android" `
  --output "$OutputFolder\%(playlist_index,upload_date>%Y%m%d)s - %(title).180B [%(id)s].%(ext)s" `
  --print-to-file "FAILED: %(title)s | %(id)s | %(url)s" "$OutputFolder\log_fails.txt" `
  $Url
```

## Rules

- Always download/convert to `.wav`, not MP3.
- Do not use `cd`; pass the full output path in `--output`.
- Keep failure logs in `E:\3_Samples\samplesnuevos\log_fails.txt` unless another output folder is requested.
- Use `--ignore-errors` so one failed video does not stop the entire playlist.
- Use `--restrict-filenames` and `--windows-filenames` to avoid broken Windows filenames.
- Keep the YouTube video ID in the filename to avoid collisions when titles repeat.
- Do not delete existing files.
- If the user requests only one video from a playlist URL, add `--no-playlist`.
- If the user requests a full playlist, do not add `--no-playlist`.

## Dependency Check

If the download fails because `yt-dlp` is missing, verify with:

```powershell
py -m yt_dlp --version
```

If FFmpeg is missing, WAV extraction/conversion may fail. Verify with:

```powershell
ffmpeg -version
```

Report the missing dependency clearly before trying unrelated alternatives.
