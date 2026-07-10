param(
  [Parameter(Mandatory=$true)][string]$Mode,
  [Parameter(Mandatory=$true)][string]$Title,
  [string]$Meaning = "",
  [string]$OutputPath = ""
)

$safeTitle = $Title.Trim()
$base = "vertical 9:16, cinematic, clean composition, negative space for text overlay, no text in image, realistic, no AI look"

if ($Mode -eq "topic") {
  $prompt = "modern English learning visual about $safeTitle, clean study desk, notebook, subtle classroom elements, minimal educational atmosphere, soft cinematic lighting, $base"
} elseif ($Mode -eq "phrasal") {
  $prompt = "conceptual realistic scene representing the English phrasal verb '$safeTitle' meaning '$Meaning', expressive human action, clear visual metaphor, $base"
} else {
  $prompt = "realistic visual representation of the English word '$safeTitle' meaning '$Meaning', clear subject, cinematic photography, $base"
}

if ($OutputPath) {
  $parent = Split-Path -Parent $OutputPath
  if ($parent -and -not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent | Out-Null }
  [System.IO.File]::WriteAllText($OutputPath, $prompt, [System.Text.UTF8Encoding]::new($false))
}

$prompt
