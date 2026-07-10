---
name: separar-drums
description: Use when the user asks to sacar/separar/extraer drums, baterias, percusion, stems or instrumentales from audio files using Demucs. Defaults to Desktop samplebase input and sampleresult output, WAV-only results.
---

# Separar Drums

Use this skill when Oscar asks to extract drums from audio files, for example:

- "saca los drums"
- "separa las baterias"
- "extrae percusion"
- "procesa samplebase"
- "saca drums de esta carpeta"

## Default Workflow

Unless the user gives another input folder, use:

```text
C:\Users\oscar\OneDrive\Escritorio\samplebase
```

Unless the user gives another output folder, write results to:

```text
C:\Users\oscar\OneDrive\Escritorio\sampleresult
```

Output files must always be WAV files named:

```text
<original-name>_drums.wav
```

Use Demucs with the highest-quality model already used by Oscar's workflow:

```powershell
py -3.10 -m demucs --name htdemucs_ft --two-stems=drums --float32 --clip-mode rescale --jobs 2 "<audio-file>" -o "<output-folder>"
```

## Rules

- Default to processing only audio files in `samplebase`.
- Always produce `.wav` drum stems.
- Do not delete original audio files unless Oscar explicitly asks.
- Create `sampleresult` if it does not exist.
- Skip files when `<original-name>_drums.wav` already exists in `sampleresult`.
- Keep a log in `sampleresult\procesados.txt`.
- Do not print Demucs progress/log output into the chat. Run Demucs quietly when possible and only report compact status such as `Convirtiendo 3/21...` and final counts.
- If Demucs writes to `sampleresult\htdemucs_ft\<name>\drums.wav`, move that file to `sampleresult\<name>_drums.wav`.
- After moving the drum stem, clean the temporary Demucs folder for that file.
- If a file fails, continue with the next file and report the failures.
- After all drums are generated, ask: `¿Mover los drums limpios a la siguiente carpeta DrumBreaks en E:\1_Librerias FL\1.PerpetuoBeats?`
- If Oscar says yes, find the highest existing folder matching `DrumBreaks*` under `E:\1_Librerias FL\1.PerpetuoBeats`, create the next numbered folder, and move the generated `_drums.wav` files there. Use move/cut (`Move-Item`), not copy.
- After moving or if Oscar declines moving, ask: `¿Borro los candidatos de samplebase y el audio largo padre?`
- Only delete `samplebase` candidates or the parent long audio if Oscar explicitly confirms.

## Final Library Move

Use this destination root unless Oscar gives another one:

```text
E:\1_Librerias FL\1.PerpetuoBeats
```

When Oscar confirms moving final drums, create the next `DrumBreaks` folder. For example, if these exist:

```text
DrumBreaks12
DrumBreaks13
```

Create:

```text
DrumBreaks14
```

Then move final files from `sampleresult` into that folder:

```powershell
$LibraryRoot = "E:\1_Librerias FL\1.PerpetuoBeats"
$Existing = @(Get-ChildItem -LiteralPath $LibraryRoot -Directory -Filter "DrumBreaks*" | Where-Object { $_.Name -match '^DrumBreaks(\d+)$' } | ForEach-Object { [int]$Matches[1] })
$Next = if ($Existing.Count -gt 0) { ($Existing | Measure-Object -Maximum).Maximum + 1 } else { 1 }
$Destination = Join-Path $LibraryRoot "DrumBreaks$Next"
New-Item -ItemType Directory -Path $Destination | Out-Null
Get-ChildItem -LiteralPath "C:\Users\oscar\OneDrive\Escritorio\sampleresult" -File -Filter "*_drums.wav" | Move-Item -Destination $Destination
```

## Recommended Command Pattern

Use PowerShell from any working directory. This pattern preserves originals and uses the default folders:

```powershell
$InputFolder = "C:\Users\oscar\OneDrive\Escritorio\samplebase"
$OutputFolder = "C:\Users\oscar\OneDrive\Escritorio\sampleresult"
if (-not (Test-Path -LiteralPath $InputFolder)) { throw "No existe la carpeta de entrada: $InputFolder" }
if (-not (Test-Path -LiteralPath $OutputFolder)) { New-Item -ItemType Directory -Path $OutputFolder | Out-Null }
$Log = Join-Path $OutputFolder "procesados.txt"
$Files = @(Get-ChildItem -LiteralPath $InputFolder -File -Include *.wav,*.mp3,*.flac,*.m4a,*.aac)
foreach ($File in $Files) {
  $Final = Join-Path $OutputFolder "$($File.BaseName)_drums.wav"
  if (Test-Path -LiteralPath $Final) {
    "SKIP - $($File.FullName)" | Add-Content -LiteralPath $Log
    continue
  }

  py -3.10 -m demucs --name htdemucs_ft --two-stems=drums --float32 --clip-mode rescale --jobs 2 $File.FullName -o $OutputFolder
  $DemucsDrums = Join-Path $OutputFolder "htdemucs_ft\$($File.BaseName)\drums.wav"
  if (Test-Path -LiteralPath $DemucsDrums) {
    Move-Item -LiteralPath $DemucsDrums -Destination $Final -Force
    "OK - $($File.FullName) -> $Final" | Add-Content -LiteralPath $Log
    $TempFolder = Join-Path $OutputFolder "htdemucs_ft\$($File.BaseName)"
    if (Test-Path -LiteralPath $TempFolder) { Remove-Item -LiteralPath $TempFolder -Recurse -Force }
  } else {
    "ERROR - $($File.FullName)" | Add-Content -LiteralPath $Log
  }
}
$ModelFolder = Join-Path $OutputFolder "htdemucs_ft"
if (Test-Path -LiteralPath $ModelFolder) {
  $Remaining = @(Get-ChildItem -LiteralPath $ModelFolder -Force -ErrorAction SilentlyContinue)
  if ($Remaining.Count -eq 0) { Remove-Item -LiteralPath $ModelFolder -Force }
}
```

## Before Running

Verify dependencies if the command fails:

```powershell
py -3.10 -m demucs --help
```

If Demucs is missing, tell Oscar that Python 3.10/Demucs is not available before trying a different separator.
