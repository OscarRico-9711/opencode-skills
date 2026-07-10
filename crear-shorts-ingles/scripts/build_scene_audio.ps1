param(
  [Parameter(Mandatory=$true)][string]$SegmentsJson,
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [Parameter(Mandatory=$true)][string]$SceneDurationsJson,
  [double]$TailPaddingSeconds = 0.35,
  [int]$SampleRate = 48000
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $SegmentsJson)) { throw "No existe SegmentsJson: $SegmentsJson" }

$segments = Get-Content -Raw -LiteralPath $SegmentsJson | ConvertFrom-Json
if (-not $segments) { throw "SegmentsJson no contiene segmentos" }

$parent = Split-Path -Parent $OutputPath
if ($parent -and -not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent | Out-Null }
$sceneParent = Split-Path -Parent $SceneDurationsJson
if ($sceneParent -and -not (Test-Path -LiteralPath $sceneParent)) { New-Item -ItemType Directory -Path $sceneParent | Out-Null }

$workDir = Join-Path ([System.IO.Path]::GetTempPath()) ("english_scene_audio_" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $workDir | Out-Null

$sceneOrder = @("hook", "reveal", "meaning", "example", "cta")
$sceneFiles = @{}
$durations = [ordered]@{}

try {
  foreach ($sceneName in $sceneOrder) {
    $sceneSegments = @($segments | Where-Object { $_.scene -eq $sceneName })
    if ($sceneSegments.Count -eq 0) { continue }

    $sceneList = Join-Path $workDir "$sceneName`_segments.txt"
    $sceneLines = @()
    foreach ($segment in $sceneSegments) {
      if (-not (Test-Path -LiteralPath $segment.path)) { throw "No existe audio de segmento: $($segment.path)" }
      $normalized = Join-Path $workDir "$sceneName`_$($sceneLines.Count).wav"
      & ffmpeg -y -loglevel error -i $segment.path -ar $SampleRate -ac 1 -c:a pcm_s16le $normalized
      if ($LASTEXITCODE -ne 0) { throw "ffmpeg fallo normalizando: $($segment.path)" }
      $sceneLines += "file '$($normalized.Replace("'", "'\''"))'"
    }

    [System.IO.File]::WriteAllLines($sceneList, $sceneLines, [System.Text.UTF8Encoding]::new($false))
    $sceneRaw = Join-Path $workDir "$sceneName`_raw.wav"
    & ffmpeg -y -loglevel error -f concat -safe 0 -i $sceneList -c copy $sceneRaw
    if ($LASTEXITCODE -ne 0) { throw "ffmpeg fallo concatenando escena: $sceneName" }

    $rawDuration = [double](& ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $sceneRaw)
    $sceneDuration = [math]::Round($rawDuration + $TailPaddingSeconds, 3)
    $padded = Join-Path $workDir "$sceneName.wav"
    & ffmpeg -y -loglevel error -i $sceneRaw -f lavfi -t $TailPaddingSeconds -i "anullsrc=r=$SampleRate`:cl=mono" -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[a]" -map "[a]" -c:a pcm_s16le $padded
    if ($LASTEXITCODE -ne 0) { throw "ffmpeg fallo agregando silencio a escena: $sceneName" }

    $sceneFiles[$sceneName] = $padded
    $durations[$sceneName] = $sceneDuration
  }

  $finalList = Join-Path $workDir "final.txt"
  $finalLines = @()
  foreach ($sceneName in $sceneOrder) {
    if ($sceneFiles.ContainsKey($sceneName)) {
      $finalLines += "file '$($sceneFiles[$sceneName].Replace("'", "'\''"))'"
    }
  }
  [System.IO.File]::WriteAllLines($finalList, $finalLines, [System.Text.UTF8Encoding]::new($false))
  & ffmpeg -y -loglevel error -f concat -safe 0 -i $finalList -c copy $OutputPath
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg fallo creando audio final: $OutputPath" }

  ($durations | ConvertTo-Json) | Set-Content -LiteralPath $SceneDurationsJson -Encoding UTF8
  $OutputPath
  $SceneDurationsJson
}
finally {
  # Keep temporary audio pieces to avoid destructive cleanup commands in restricted shells.
}
