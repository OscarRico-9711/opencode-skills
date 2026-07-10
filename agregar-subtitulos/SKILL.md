---
name: agregar-subtitulos
description: Use when the user asks to agregar subtítulos automáticos a videos, transcribir audio con Whisper, o quemar letras en el video. Requires video path and optionally model size and language.
---

# Agregar Subtítulos Automáticos

Transcribe el audio con Whisper (local, español) y quema los subtítulos directamente en el video.

## Workflow

1. Ask Oscar for the video path.
2. Ask which Whisper model to use: `tiny` (rápido), `base`, `small`, `medium` (default, más preciso), `large` (máxima precisión). Default: `medium`.
3. Ask language if not Spanish (default: español).
4. Run the script to transcribe and burn subtitles.

## Script

```python
C:\Users\oscar\.config\opencode\skills\agregar-subtitulos\add_subtitles.py
```

## Usage

```powershell
python "C:\Users\oscar\.config\opencode\skills\agregar-subtitulos\add_subtitles.py" "<VIDEO_PATH>" --model medium --language es --output-dir "<OUTPUT_DIR>" --keep-srt
```

### Arguments

- `video` (required): Path to input video.
- `--model`: Whisper model size. `tiny` (fast), `base`, `small`, `medium` (default, more accurate), `large` (slow, most accurate).
- `--language`: Language code. Default `es` (Spanish).
- `--output-dir`: Output directory. Default: same folder as input.
- `--suffix`: Suffix for output file. Default `_subs`.
- `--keep-srt`: Keep the intermediate `.srt` file (otherwise deleted after burning).

### Example

```powershell
python "C:\Users\oscar\.config\opencode\skills\agregar-subtitulos\add_subtitles.py" "D:\BackUpDisco\videos\clips_tamano_ajustado\vidente_full_clip_000.mp4" --model medium --language es --output-dir "D:\BackUpDisco\videos\con_subtitulos" --keep-srt
```

## Output

- `{video_name}_subs.mp4`: video with hardcoded subtitles.
- `{video_name}.srt`: SRT subtitle file (only if `--keep-srt`).

## Dependencies

- `openai-whisper` (installed via pip)
- `ffmpeg`

```powershell
pip install openai-whisper
```

## Rules

- Default model is `medium` for better transcription accuracy, accepting that it can take longer.
- Default language is Spanish (`es`).
- Output goes to the same folder as input unless `--output-dir` is specified.
- The SRT file is deleted after burning unless `--keep-srt` is used.
- The original video is preserved.
