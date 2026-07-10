---
name: buscar-audio-muestra
description: Use when the user wants to encontrar un audio perdido por una muestra de audio, comparar ondas/sonido, buscar beats MP3/WAV por similitud, o filtrar candidatos por formato, BPM, palabras omitidas o palabras incluidas.
---

# Buscar Audio Por Muestra

Use this skill when Oscar has a short audio sample and wants to find the original or closest matching file in a folder, for example:

- "tengo esta muestra y no se como se llama"
- "busca este audio en esta carpeta"
- "comparalo por las ondas"
- "debe ser mp3 de whatsapp"
- "omite master, mezcla, ft"
- "seguro tiene BPM en el nombre"

## Required Inputs

Ask for missing values before running anything:

- `sample`: path to the reference audio sample.
- `folder`: folder where the missing audio probably is.

## Quick Questions

Ask only the questions needed to narrow the search. Keep it short:

```text
1. Formato probable: mp3, wav, ambos, otro?
2. Palabras a omitir en nombres? Ej: master, mezcla, ft, vendida
3. Palabras que debe incluir? Ej: pista, bpm, 84, muestreo
4. Debo buscar en subcarpetas? Default: si
```

If Oscar already gives any of those details, do not ask again.

## Defaults

If the user does not specify details:

- Search recursively.
- Search formats: `mp3,wav,flac,m4a,aiff,aif`.
- Top results: `3`.
- Reference read length: `60` seconds.
- Candidate read length: `240` seconds.
- Prefer likely beat names when present: filenames with `BPM`, numbers, or `pista`.

When Oscar says the file was shared by WhatsApp, default to:

```text
--formats mp3
```

## Method

Use the bundled Python script:

```text
C:\Users\oscar\.config\opencode\skills\buscar-audio-muestra\buscar_audio_muestra.py
```

The script uses `ffmpeg` to decode audio and compares:

- RMS/energy envelope similarity.
- Broad spectral-band similarity.
- Sliding alignment so the sample can match a section inside a longer beat.
- Filename hints for BPM/numeric beat naming.

This is not a perfect Shazam replacement, but it is good for local beat libraries, WhatsApp MP3 versions, exported masters, and renamed files.

## Recommended Command

Replace paths and filters from the user's answers:

```powershell
py -3.10 "C:\Users\oscar\.config\opencode\skills\buscar-audio-muestra\buscar_audio_muestra.py" `
  --sample "<SAMPLE_AUDIO>" `
  --folder "<SEARCH_FOLDER>" `
  --formats "mp3" `
  --exclude "master,mezcla,ft,jung,305,rony,perpetuo,vendida,vup,aka,trap" `
  --top 3
```

Example from the successful search:

```powershell
py -3.10 "C:\Users\oscar\.config\opencode\skills\buscar-audio-muestra\buscar_audio_muestra.py" --sample "C:\Users\oscar\Downloads\muestra.wav" --folder "E:\2_Pistas-Muestreos-Maquetas" --formats "mp3" --exclude "master,mezcla,ft,jung,305,rony,perpetuo,vendida,vup,aka,trap" --top 3
```

## Options

Use `--formats` as a comma-separated list:

```text
mp3,wav,flac,m4a,aiff,aif
```

Use `--exclude` for words to omit from filenames, comma-separated. The match is case-insensitive.

Use `--include` for words that should appear in filenames. A file is kept if it contains at least one include term.

Use `--no-recursive` only if Oscar explicitly says not to search subfolders.

Use `--top <number>` only if Oscar explicitly asks for fewer or more candidates. Default to 3 candidates because that was enough to find the correct beat.

Use `--sample-seconds <seconds>` when the reference is long and only the beginning matters.

Use `--candidate-seconds <seconds>` to scan more of each candidate if the sample may start late in a long file.

Use `--copy-top "<folder>"` only if Oscar asks to collect/copy the best candidates for listening. Do not copy by default.

## Output

Report the top candidates with score and path. Start with the highest score and give a practical recommendation:

```text
Mejor candidato: <path>
Siguientes para revisar: ...
```

If scores are close, say that explicitly and suggest listening to the 3 candidates first. Only run a wider search if Oscar asks.

## Rules

- Do not delete or move audio files.
- Do not convert the library files unless Oscar asks.
- Do not search WAVs when Oscar says to discard WAVs or it was likely WhatsApp MP3.
- If `ffmpeg` is missing, check `D:\ffmpeg\bin\ffmpeg.exe` first, then `ffmpeg` from PATH.
- If the folder has thousands of files, apply filename filters before audio comparison.
- If the first pass is uncertain, rerun with stricter `--include`/`--exclude` filters instead of scanning unrelated formats.
