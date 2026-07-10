param(
  [Parameter(Mandatory=$true)][string]$ImagePath,
  [Parameter(Mandatory=$true)][string]$OverlayDir,
  [Parameter(Mandatory=$true)][string]$BaseName,
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [string]$AudioPath = "",
  [ValidateSet("image", "minimal")][string]$Style = "image",
  [string]$SceneDurationsJson = ""
)

if ($Style -eq "image" -and -not (Test-Path -LiteralPath $ImagePath)) { throw "No existe imagen: $ImagePath" }
if (-not (Test-Path -LiteralPath $OverlayDir)) { throw "No existe carpeta de overlays: $OverlayDir" }
if ($AudioPath -and -not (Test-Path -LiteralPath $AudioPath)) { throw "No existe audio: $AudioPath" }

$parent = Split-Path -Parent $OutputPath
if ($parent -and -not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent | Out-Null }

$scenes = @(
  @{ name = "hook"; duration = 3.6; start = 0.0 },
  @{ name = "reveal"; duration = 4.0; start = 3.6 },
  @{ name = "meaning"; duration = 7.0; start = 7.6 },
  @{ name = "example"; duration = 7.0; start = 14.6 },
  @{ name = "cta"; duration = 5.4; start = 21.6 }
)

if ($SceneDurationsJson -and (Test-Path -LiteralPath $SceneDurationsJson)) {
  $sceneDurations = Get-Content -Raw -LiteralPath $SceneDurationsJson | ConvertFrom-Json
  $cursor = 0.0
  $scenes = @()
  foreach ($sceneName in @("hook", "reveal", "meaning", "example", "cta")) {
    $duration = [double]$sceneDurations.$sceneName
    $scenes += @{ name = $sceneName; duration = $duration; start = $cursor }
    $cursor += $duration
  }
}

$totalDuration = 26.2
if ($scenes.Count -gt 0) {
  $lastScene = $scenes[$scenes.Count - 1]
  $totalDuration = [math]::Max($totalDuration, [double]$lastScene.start + [double]$lastScene.duration)
}
if ($AudioPath) {
  $durationLine = ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $AudioPath
  if ($durationLine) { $totalDuration = [math]::Max([double]$durationLine + 0.5, $totalDuration) }
}

if ($Style -eq "minimal") {
  $inputs = @("-f", "lavfi", "-t", "$totalDuration", "-i", "color=c=black:s=1080x1920:r=30")
  $filterParts = @("[0:v]format=rgba[base0]")
} else {
  $inputs = @("-loop", "1", "-t", "$totalDuration", "-i", $ImagePath)
  $filterParts = @("[0:v]fps=30,scale=w='1080*(1+0.33*t/$totalDuration)':h='1920*(1+0.33*t/$totalDuration)':force_original_aspect_ratio=increase:eval=frame,crop=1080:1920:(iw-ow)/2:(ih-oh)/2,format=rgba,colorchannelmixer=aa=1[base0]")
}
$current = "base0"
$index = 1
foreach ($scene in $scenes) {
  $overlay = Join-Path $OverlayDir "$BaseName`_$($scene.name).png"
  if (-not (Test-Path -LiteralPath $overlay)) { throw "No existe overlay de escena: $overlay" }
  $inputs += @("-loop", "1", "-t", "$totalDuration", "-i", $overlay)
  $fadeDuration = 0.08
  $visualStart = [math]::Max([double]$scene.start - $fadeDuration, 0.0)
  $fadeInStart = $visualStart
  $fadeOutStart = [math]::Max([double]$scene.start + [double]$scene.duration - $fadeDuration, [double]$scene.start + 0.1)
  $sceneEnd = $scene.start + $scene.duration
  $filterParts += "[$index`:v]format=rgba,fade=t=in:st=$($fadeInStart):d=$fadeDuration`:alpha=1,fade=t=out:st=$($fadeOutStart):d=$fadeDuration`:alpha=1[ov$index];[$current][ov$index]overlay=0:0:enable='between(t,$visualStart,$sceneEnd)':format=auto[v$index]"
  $current = "v$index"
  $index += 1
}

$filter = ($filterParts -join ";") + ";[$current]format=yuv420p[v]"

if ($AudioPath) {
  & ffmpeg -y @inputs -i $AudioPath -filter_complex $filter -map "[v]" -map "$index`:a" -c:v libx264 -preset medium -crf 22 -c:a aac -b:a 160k -t $totalDuration -pix_fmt yuv420p -shortest -movflags +faststart $OutputPath
} else {
  & ffmpeg -y @inputs -filter_complex $filter -map "[v]" -an -c:v libx264 -preset medium -crf 22 -t $totalDuration -pix_fmt yuv420p -movflags +faststart $OutputPath
}

if (-not (Test-Path -LiteralPath $OutputPath)) { throw "No se genero el video esperado: $OutputPath" }
ffprobe -v error -show_entries stream=width,height,codec_name -show_entries format=duration,size,bit_rate -of default=noprint_wrappers=1 $OutputPath
$OutputPath
