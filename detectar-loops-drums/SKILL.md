---
name: detectar-loops-drums
description: Use when the user asks to detectar/cortar loops 4/4, drum breaks, breaks, samples, chops, or candidatos desde un WAV/audio largo. Generates WAV loop candidates into Desktop samplebase.
---

# Detectar Loops Drums

Use this skill when Oscar has one long audio recording and wants loop candidates before separating drums, for example:

- "detecta loops drums en este wav"
- "saca loops 4/4 de este audio largo"
- "corta candidatos de drums"
- "busca drum breaks"
- "prepara samplebase con loops"

## Purpose

This skill does not try to choose the perfect sample automatically. It detects active rhythmic sections, estimates BPM per section, and exports useful complete 4/4 loop candidates so Oscar can review them as a beatmaker.

The expected flow is:

```text
long WAV/audio recording -> loop candidates WAV -> samplebase -> separar-drums
```

To reduce token/cost overhead, keep the interaction short after generation:

```text
1. Generate candidates.
2. Ask: "¿Ejecuto separar-drums sobre estos candidatos?"
3. If Oscar says yes, run the `separar-drums` workflow on `samplebase`.
4. After Demucs finishes, ask: "¿Mover los drums limpios a la siguiente carpeta DrumBreaks en E:\1_Librerias FL\1.PerpetuoBeats?"
5. If Oscar says yes, create the next `DrumBreaksXX` folder and move/cut the final drum WAVs there. Do not copy.
6. Then ask: "¿Borro los candidatos de samplebase y el audio largo padre?"
7. Only delete candidates or the parent long audio if Oscar explicitly says yes.
```

## Required Input

The user must provide the path to one long audio file. If the path is missing, ask for it.

The audio can contain pauses, searching, silence, melody-only sections, or multiple drum sections.

## Defaults

Output folder:

```text
C:\Users\oscar\OneDrive\Escritorio\samplebase
```

Default loop length behavior:

```text
Export complete 4-bar 4/4 loops by default, up to 4 bars. Do not export 2-bar or half-bar fragments unless Oscar explicitly asks because they are usually too short.
```

Default maximum candidates:

```text
all valid section candidates
```

Output format must always be WAV.

## Method

Use the bundled Python script:

```text
C:\Users\oscar\.config\opencode\skills\detectar-loops-drums\detect_loops_drums.py
```

It uses:

- `librosa` for per-section BPM/beat/onset analysis.
- `soundfile` for WAV export.
- transient and energy scoring to prefer rhythmic/drum-heavy sections.
- silence filtering to avoid pauses and dead zones.
- automatic half-time correction when a section is detected at double tempo.
- automatic start snapping so each exported WAV begins on the closest strong drum/onset instead of before the hit.
- a small default pre-roll of 50 ms before the detected hit so the attack does not feel clipped or too late.
- first-second transient density filtering to reject candidates that start with melody/silence instead of continuous drums.
- first-second percussive/low-frequency filtering to reject melodic transients that are not drums.
- full-loop clean scoring to prefer sections with more drums/percussion and less melody, harmony, or voice.
- first-attack kick filtering so candidates prefer starting on a kick/drum hit instead of snare, melody, or midrange transients.

## Recommended Command

Replace `<AUDIO_PATH>` with the user's audio file:

```powershell
py -3.10 "C:\Users\oscar\.config\opencode\skills\detectar-loops-drums\detect_loops_drums.py" --input "<AUDIO_PATH>" --output "C:\Users\oscar\OneDrive\Escritorio\samplebase" --min-bars 4 --max-bars 4 --max-candidates 0
```

## Optional Parameters

Use `--min-bars 4` by default. Use `--min-bars 2` or `--min-bars 1` only if Oscar explicitly wants shorter fragments.

Use `--allow-half-bar` only if Oscar explicitly asks to keep very short 2-beat fragments. It is disabled by default.

Use `--max-bars 1`, `--max-bars 2`, `--max-bars 4`, or `--max-bars 8` to control the longest loop size exported per section. Default is `4`; use `8` only when long loops are clean enough.

Use `--max-candidates <number>` if Oscar asks for fewer candidates. `--max-candidates 0` means export all valid candidates.

Use `--random-sample` when Oscar wants a small random test batch to tune filters instead of exporting the top-scored candidates.

Use `--min-section-seconds <seconds>` if the detector is keeping sections that are too short or ignoring useful short breaks.

Use `--pre-roll <seconds>` to control how much audio is included before the first drum hit. Default is `0.05`.

Use `--min-first-second-onset-density <value>` to reject candidates whose first second does not have enough drum transients. Default is `0.30`; raise it if melody/silence still gets through.

Use `--min-first-second-percussive-ratio <value>` to reject harmonic/melodic starts. Default is `0.35`.

Use `--min-first-second-low-ratio <value>` to require kick/low drum energy at the start. Default is `0.28`.

Use `--max-first-second-mid-ratio <value>` to reject starts dominated by mid-range melodic content. Default is `0.42`.

Use `--min-clean-score <value>` to reject full loops with too much melody/harmonic content compared to drums. Default is `0.25`.

Use `--min-attack-low-ratio <value>` to require the first hit to have kick/low-frequency energy. Default is `0.36`.

Use `--max-attack-mid-ratio <value>` to reject starts dominated by snare/melody/midrange attack. Default is `0.30`.

Examples:

```powershell
py -3.10 "C:\Users\oscar\.config\opencode\skills\detectar-loops-drums\detect_loops_drums.py" --input "D:\audio\grabacion.wav" --min-bars 1 --max-bars 8 --max-candidates 100
```

Require at least 4 bars per candidate:

```powershell
py -3.10 "C:\Users\oscar\.config\opencode\skills\detectar-loops-drums\detect_loops_drums.py" --input "D:\audio\grabacion.wav" --min-bars 4 --max-bars 8 --max-candidates 50
```

Small random test batch:

```powershell
py -3.10 "C:\Users\oscar\.config\opencode\skills\detectar-loops-drums\detect_loops_drums.py" --input "D:\audio\grabacion.wav" --min-bars 1 --max-bars 8 --max-candidates 10 --random-sample
```

## Output

Loop candidate files are written as:

```text
drums_080426_001.wav
drums_080426_002.wav
```

A CSV report is not written by default. Only write it if Oscar asks for diagnostics by adding `--write-report`.

Optional report path:

```text
<audio-name>_loop_candidates.csv
```

The optional report includes section number, section-local BPM, start time, end time, duration, score, and silence ratio.
It also includes `start_offset`, `first_onset`, `first_second_onset_density`, `loop_onset_density`, `first_second_percussive_ratio`, `first_second_low_ratio`, `first_second_mid_ratio`, `loop_percussive_ratio`, `loop_low_ratio`, `loop_mid_ratio`, and `clean_score` so bad starts can be diagnosed.

## Rules

- Never delete the source audio.
- Always export WAV.
- Default to `samplebase` so the generated loops can be processed by the `separar-drums` skill.
- Treat generated loops as candidates for review, not final artistic decisions.
- Export only one best candidate per detected active section/fragment to avoid duplicates from the same drum break.
- Do not run Demucs, `separar-drums`, or any other expensive follow-up process automatically. First generate candidate WAVs, wait for Oscar to review/approve, then run separation only if Oscar explicitly asks.
- After candidate generation, ask one short yes/no question: `¿Ejecuto separar-drums sobre estos candidatos?`
- While Demucs runs, do not stream logs/progress bars into chat. Show compact progress only, for example `Convirtiendo...` and a final count.
- After separation finishes, ask one short yes/no question about moving finals: `¿Mover los drums limpios a la siguiente carpeta DrumBreaks en E:\1_Librerias FL\1.PerpetuoBeats?`
- If moving is confirmed, create the next numbered `DrumBreaksXX` folder and move/cut the files from `sampleresult`; do not copy/paste.
- After that, ask one short yes/no question: `¿Borro los candidatos de samplebase y el audio largo padre?`
- Keep summaries short. Do not print long metrics, CSV contents, or detailed candidate analysis unless Oscar asks.
- Every exported candidate should start on a drum/onset. If the first hit sounds late or there is silence at the beginning, rerun with stricter `--min-start-onset` or smaller/larger `--snap-before`/`--snap-after`.
- If the output folder already contains files, do not delete them.
- If Python dependencies are missing, report what is missing and install only if Oscar confirms.
- After generating candidates, ask whether to run `separar-drums`. Only ask for detailed candidate feedback if Oscar says the results sound wrong.
- After clean drums are created, follow the final library move and cleanup questions from the `separar-drums` skill.

## Dependency Check

If the script fails because dependencies are missing, check:

```powershell
py -3.10 -c "import librosa, soundfile, numpy; print('ok')"
```

Required packages:

```text
librosa
soundfile
numpy
```
