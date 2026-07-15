param(
  [Parameter(Mandatory=$true)][string]$Mode,
  [Parameter(Mandatory=$true)][string]$Title,
  [string]$Meaning = "",
  [string]$OutputPath = ""
)

$safeTitle = $Title.Trim()
$base = "vertical 9:16, highly stylized, dramatic cinematic lighting, vibrant colors, negative space for text overlay, no text in image, art direction, visually striking"

if ($Mode -eq "topic") {
  $prompt = "cinematic English learning visual about '$safeTitle', modern classroom, warm sunlight, books, notebook, moody atmosphere, dramatic shadows, $base"
} elseif ($Mode -eq "phrasal") {
  $prompt = "conceptual dramatic scene representing the English phrasal verb '$safeTitle' meaning '$Meaning', expressive human action, cinematic storytelling, strong visual metaphor, dynamic composition, $base"
} else {
  $prompt = "cinematic stylized visual representation of the English word '$safeTitle' meaning '$Meaning', clear subject, dramatic photography, vibrant palette, artistic composition, $base"
}

if ($OutputPath) {
  $parent = Split-Path -Parent $OutputPath
  if ($parent -and -not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent | Out-Null }
  [System.IO.File]::WriteAllText($OutputPath, $prompt, [System.Text.UTF8Encoding]::new($false))
}

$prompt
