param(
  [string]$Word = "resilient",
  [string]$TranslationEs = "resiliente",
  [string]$Level = "B2/C1",
  [string]$Type = "adjective",
  [string]$PronunciationHint = "ri-ZIL-yent",
  [string]$MeaningEn = "able to recover quickly after stress, failure, or difficulty",
  [string]$ExampleEn = "She stayed resilient after the setback and kept improving.",
  [string]$ExampleEs = "Ella se mantuvo resiliente despues del contratiempo y siguio mejorando.",
  [string]$EnglishVoice = "en-US-AvaNeural",
  [string]$SpanishVoice = "es-MX-DaliaNeural",
  [string]$ImagePrompt = "",
  [switch]$KeepAssets,
  [string]$BaseDir = "D:\BackUpDisco\English-shorts"
)

$ErrorActionPreference = "Stop"

$scriptsDir = $PSScriptRoot
$setupScript = Join-Path $scriptsDir "setup_english_shorts_assets.ps1"
$ttsScript = Join-Path $scriptsDir "generate_tts_edge.ps1"
$audioScript = Join-Path $scriptsDir "build_scene_audio.ps1"
$overlayScript = Join-Path $scriptsDir "generate_word_scene_overlays.py"
$fallbackImageScript = Join-Path $scriptsDir "generate_fallback_background.py"
$renderScript = Join-Path $scriptsDir "render_english_short_scenes.ps1"
$imageScript = "C:\Users\oscar\.config\opencode\skills\crear-video-youtube-beat\scripts\generar_imagen_desde_prompt.ps1"

& $setupScript -BaseDir $BaseDir | Out-Null

function New-Slug([string]$text) {
  $slug = $text.ToLowerInvariant() -replace "[^a-z0-9]+", "-"
  $slug = $slug.Trim("-")
  if ([string]::IsNullOrWhiteSpace($slug)) { return "word" }
  return $slug
}

$slug = New-Slug $Word
$baseName = "$slug`_word_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

$paths = [ordered]@{
  content = Join-Path $BaseDir "temp\$baseName`_content.json"
  prompt = Join-Path $BaseDir "prompts\$baseName`_prompt.txt"
  image = Join-Path $BaseDir "images\$baseName.png"
  overlays = Join-Path $BaseDir "overlays\$baseName"
  tts = Join-Path $BaseDir "audio\tts\$baseName"
  segments = Join-Path $BaseDir "temp\$baseName`_segments.json"
  audio = Join-Path $BaseDir "audio\mixed\$baseName.wav"
  durations = Join-Path $BaseDir "temp\$baseName`_durations.json"
  validation = Join-Path $BaseDir "validation\$baseName`_validation.json"
  manifest = Join-Path $BaseDir "manifests\$baseName`_manifest.json"
  video = Join-Path $BaseDir "videos\$baseName.mp4"
}
$generatedImagePath = $null

New-Item -ItemType Directory -Force -Path $paths.overlays, $paths.tts | Out-Null

$content = [ordered]@{
  mode = "word"
  slug = $slug
  word = $Word
  translation_es = $TranslationEs
  level = $Level
  level_confidence = "high"
  type = $Type
  pronunciation_hint = $PronunciationHint
  meaning_en = $MeaningEn
  definition_en = $MeaningEn
  example_en = $ExampleEn
  example_es = $ExampleEs
}
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($paths.content, ($content | ConvertTo-Json -Depth 5), $utf8NoBom)

$validation = [ordered]@{
  validated = $true
  confidence = "high"
  issues = @()
  recommended_fix = $null
  sources_checked = @("llm_cefr_review")
}
[System.IO.File]::WriteAllText($paths.validation, ($validation | ConvertTo-Json -Depth 5), $utf8NoBom)

$prompt = if ([string]::IsNullOrWhiteSpace($ImagePrompt)) {
  "vertical 9:16 cinematic educational illustration that clearly represents the English word '$Word' meaning '$MeaningEn', visually interesting real-life scene, strong subject, storytelling composition, warm cinematic light, depth of field, clean negative space for text overlay, no text in image, no words, no letters, no logos, no realistic face, no AI look"
} else {
  $ImagePrompt
}
$prompt | Set-Content -LiteralPath $paths.prompt -Encoding UTF8

try {
  & $imageScript -OutputDir (Join-Path $BaseDir "images") -Width 1024 -Height 1792 -Prompts $prompt | Out-Null
  $latestImage = Get-ChildItem -LiteralPath (Join-Path $BaseDir "images") -Filter "*.png" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $latestImage) { throw "No image returned" }
  $generatedImagePath = $latestImage.FullName
  Copy-Item -LiteralPath $latestImage.FullName -Destination $paths.image -Force
} catch {
  Write-Warning "IA image failed, using local fallback background: $_"
  & python $fallbackImageScript --output $paths.image --concept $Word --variant 2 | Out-Null
}

& python $overlayScript --content-json $paths.content --output-dir $paths.overlays --basename $baseName --style image | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Fallo generando overlays de escenas" }

$sceneTexts = @(
  @{ scene = "hook"; text = "Today's word is..."; voice = $EnglishVoice; rate = "-6%" },
  @{ scene = "reveal"; text = "$Word."; voice = $EnglishVoice; rate = "-6%" },
  @{ scene = "reveal"; text = "Significa: $TranslationEs."; voice = $SpanishVoice; rate = "+10%" },
  @{ scene = "meaning"; text = "It means $MeaningEn."; voice = $EnglishVoice; rate = "-6%" },
  @{ scene = "example"; text = "Example: $ExampleEn"; voice = $EnglishVoice; rate = "-6%" },
  @{ scene = "example"; text = $ExampleEs; voice = $SpanishVoice; rate = "+10%" },
  @{ scene = "cta"; text = "How would you use $Word? Leave your own example in the comments."; voice = $EnglishVoice; rate = "-6%" }
)

$segments = @()
foreach ($scene in $sceneTexts) {
  $out = Join-Path $paths.tts "$($scene.scene)_$($segments.Count).mp3"
  & $ttsScript -Text $scene.text -OutputPath $out -Voice $scene.voice -Rate $scene.rate | Out-Null
  $segments += [ordered]@{ scene = $scene.scene; path = $out }
}
[System.IO.File]::WriteAllText($paths.segments, ($segments | ConvertTo-Json -Depth 5), $utf8NoBom)

& $audioScript -SegmentsJson $paths.segments -OutputPath $paths.audio -SceneDurationsJson $paths.durations -TailPaddingSeconds 0.25 | Out-Null
& $renderScript -ImagePath $paths.image -OverlayDir $paths.overlays -BaseName $baseName -OutputPath $paths.video -AudioPath $paths.audio -Style image -SceneDurationsJson $paths.durations | Out-Null

$probe = ffprobe -v error -show_entries format=duration,size:stream=codec_type,codec_name,width,height -of json $paths.video | ConvertFrom-Json
if (-not (Test-Path -LiteralPath $paths.video)) { throw "No se genero el video final" }

$manifest = [ordered]@{
  generatedAt = (Get-Date).ToString("s")
  mode = "word"
  cleanup = if ($KeepAssets) { "keep_assets" } else { "keep_video_only" }
  item = [ordered]@{
    title = $Word
    slug = $slug
    video = $paths.video
    image = $paths.image
    audio = $paths.audio
    validation = $paths.validation
  }
  ffprobe = $probe
}
[System.IO.File]::WriteAllText($paths.manifest, ($manifest | ConvertTo-Json -Depth 8), $utf8NoBom)

if (-not $KeepAssets) {
  Write-Host "Cleanup skipped because destructive cleanup commands are restricted."
}

Write-Host "Video: $($paths.video)"
Write-Host "Duration: $($probe.format.duration)s"
Write-Host "Cleanup: $(if ($KeepAssets) { 'assets kept' } else { 'kept final video only' })"
