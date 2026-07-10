param(
  [Parameter(Mandatory=$true)][string]$ImagePath,
  [Parameter(Mandatory=$true)][string]$OverlayPath,
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [string]$AudioPath = "",
  [double]$Duration = 18,
  [string]$SfxPath = ""
)

if (-not (Test-Path -LiteralPath $ImagePath)) { throw "No existe imagen: $ImagePath" }
if (-not (Test-Path -LiteralPath $OverlayPath)) { throw "No existe overlay: $OverlayPath" }
if ($AudioPath -and -not (Test-Path -LiteralPath $AudioPath)) { throw "No existe audio: $AudioPath" }

$parent = Split-Path -Parent $OutputPath
if ($parent -and -not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent | Out-Null }

if ($AudioPath) {
  $durationLine = ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $AudioPath
  if ($durationLine) { $Duration = [math]::Max([double]$durationLine + 1.5, 8) }
}

$videoFilter = "[0:v]fps=30,scale=w='1080*(1+0.28*min(t\,$Duration)/$Duration)':h='1920*(1+0.28*min(t\,$Duration)/$Duration)':force_original_aspect_ratio=increase:eval=frame,crop=1080:1920:(iw-ow)/2+30*sin(t*0.7):(ih-oh)/2+42*cos(t*0.55),format=rgba,colorchannelmixer=aa=1[bg];[1:v]format=rgba[txt];[bg][txt]overlay=0:0:format=auto[v]"

if ($AudioPath) {
  & ffmpeg -y -loop 1 -i $ImagePath -i $OverlayPath -i $AudioPath `
    -filter_complex $videoFilter `
    -map "[v]" -map 2:a -c:v libx264 -preset medium -crf 22 -c:a aac -b:a 192k `
    -t $Duration -pix_fmt yuv420p -shortest -movflags +faststart $OutputPath
} else {
  & ffmpeg -y -loop 1 -i $ImagePath -i $OverlayPath `
    -filter_complex $videoFilter `
    -map "[v]" -an -c:v libx264 -preset medium -crf 22 `
    -t $Duration -pix_fmt yuv420p -movflags +faststart $OutputPath
}

if (-not (Test-Path -LiteralPath $OutputPath)) { throw "No se genero el video esperado: $OutputPath" }

ffprobe -v error -show_entries format=duration,size,bit_rate -of default=noprint_wrappers=1 $OutputPath
$OutputPath
