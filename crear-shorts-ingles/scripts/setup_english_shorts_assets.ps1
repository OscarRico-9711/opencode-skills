param(
  [string]$BaseDir = "D:\BackUpDisco\English-shorts"
)

if (-not (Test-Path -LiteralPath "D:\BackUpDisco")) {
  throw "No existe D:\BackUpDisco. No puedo crear English-shorts ahi."
}

$dirs = @(
  $BaseDir,
  "$BaseDir\videos",
  "$BaseDir\images",
  "$BaseDir\audio",
  "$BaseDir\audio\tts",
  "$BaseDir\audio\music",
  "$BaseDir\audio\mixed",
  "$BaseDir\sfx",
  "$BaseDir\overlays",
  "$BaseDir\manifests",
  "$BaseDir\prompts",
  "$BaseDir\validation",
  "$BaseDir\previews",
  "$BaseDir\temp"
)

foreach ($dir in $dirs) {
  if (-not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir | Out-Null
  }
}

$dirs
