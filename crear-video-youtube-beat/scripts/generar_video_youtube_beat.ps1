param(
    [Parameter(Mandatory=$true)]
    [string]$AudioPath,
    [string]$ImagePath = "",
    [ValidateSet("path", "random")]
    [string]$ImageMode = "path",
    [string]$ImagesDir = "D:\BackUpDisco\Inkscape\Youtube",
    [string]$LogoPath = "D:\BackUpDisco\Inkscape\LOGOS PERPETUO BEATS\PNG SIN FONDO\COLOR 1\4000X4000-CHARACTER---PERPETUO-BEATS.png",
    [string]$LogoCachePath = "",
    [string]$TextLogoPath = "D:\BackUpDisco\Inkscape\LOGOS PERPETUO BEATS\PNG SIN FONDO\COLOR TEXTO 1\500X500---TEXTO.png",
    [string]$TextLogoCachePath = "",
    [string]$OverlaysDir = "D:\BackUpDisco\videos\para youtube uso libre\overlays",
    [string]$OutputDir = "D:\BackUpDisco\videos\para youtube uso libre",
    [ValidateSet("random", "breathing", "circle")]
    [string]$LogoStyle = "random",
    [ValidateSet("character", "text", "alternate", "stacked", "cycle")]
    [string]$LogoDisplayMode = "character",
    [string[]]$LogoCycleItems = @("character", "text"),
    [ValidateRange(1, 60)]
    [int]$LogoSwitchSeconds = 8,
    [ValidateSet("random", "particles", "smoke", "lightleak", "none")]
    [string]$OverlayMode = "random",
    [string]$OverlayPath = "",
    [ValidateSet("preview", "full")]
    [string]$DurationMode = "preview",
    [ValidateRange(5, 59)]
    [int]$PreviewSeconds = 45,
    [ValidateRange(0, 10)]
    [int]$FadeSeconds = 5,
    [ValidateSet("random", "cline", "line", "point", "p2p", "none")]
    [string]$WaveformStyle = "random",
    [int]$Crf = 24,
    [string]$Preset = "faster",
    [switch]$NoLogo,
    [string]$Text = "",
    [string]$FontPath = ""
)

$ErrorActionPreference = "Stop"

if ($ImageMode -eq "random") {
    if (-not (Test-Path -LiteralPath $ImagesDir)) { throw "Images dir not found: $ImagesDir" }
    $imageCandidates = Get-ChildItem -Path $ImagesDir -File | Where-Object {
        $_.Length -gt 0 -and $_.Extension -match '(?i)^\.(png|jpg|jpeg|webp)$'
    }
    $imageCandidates = @($imageCandidates)
    if ($imageCandidates.Count -eq 0) { throw "No image files found in: $ImagesDir" }
    $ImagePath = $imageCandidates[(Get-Random -Maximum $imageCandidates.Count)].FullName
} elseif ([string]::IsNullOrWhiteSpace($ImagePath)) {
    throw "ImagePath is required unless ImageMode is random"
}

foreach ($p in @(
    @{Path=$AudioPath; Label="Audio"},
    @{Path=$ImagePath; Label="Image"},
    @{Path=$OutputDir; Label="Output dir"}
)) {
    if (-not (Test-Path -LiteralPath $p.Path)) { throw "$($p.Label) not found: $($p.Path)" }
}

if (-not $NoLogo -and -not (Test-Path -LiteralPath $LogoPath)) { throw "Logo not found: $LogoPath" }
if (-not $NoLogo -and -not (Test-Path -LiteralPath $TextLogoPath)) { throw "Text logo not found: $TextLogoPath" }

if ($OverlayMode -ne "none" -and -not (Test-Path -LiteralPath $OverlaysDir)) {
    throw "Overlays dir not found: $OverlaysDir"
}

$baseName = [System.IO.Path]::GetFileNameWithoutExtension($AudioPath)
$bpmMatch = [regex]::Match($baseName, '(?i)(\d+)\s*[_ -]*bpm')
$bpm = if ($bpmMatch.Success) { [int]$bpmMatch.Groups[1].Value } else { 120 }
$freq = [math]::Round($bpm * 2 * [math]::PI / 60, 4)

if ($LogoStyle -eq "random") { $LogoStyle = "breathing" }
if ($WaveformStyle -eq "random") { $WaveformStyle = @("cline", "line", "point", "p2p") | Get-Random }

$LogoCycleItems = @($LogoCycleItems | ForEach-Object {
    $_ -split "," | ForEach-Object { $_.Trim() }
} | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })

if (-not $NoLogo -and [string]::IsNullOrWhiteSpace($LogoCachePath)) {
    $LogoCachePath = Join-Path -Path $env:TEMP -ChildPath "perpetuo_character_logo_box_300.png"
}
if (-not $NoLogo -and [string]::IsNullOrWhiteSpace($TextLogoCachePath)) {
    $TextLogoCachePath = Join-Path -Path $env:TEMP -ChildPath "perpetuo_text_logo_box_300.png"
}

if (-not $NoLogo) {
    ffmpeg -loglevel error -y -i "$LogoPath" -vf "scale=421:421:force_original_aspect_ratio=decrease,pad=421:421:(ow-iw)/2:(oh-ih)/2:color=black@0,format=rgba" "$LogoCachePath"
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $LogoCachePath)) { throw "Could not create logo cache: $LogoCachePath" }
}

if (-not $NoLogo) {
    ffmpeg -loglevel error -y -i "$TextLogoPath" -vf "scale=300:300:force_original_aspect_ratio=decrease,pad=300:300:(ow-iw)/2:(oh-ih)/2:color=black@0,format=rgba" "$TextLogoCachePath"
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $TextLogoCachePath)) { throw "Could not create text logo cache: $TextLogoCachePath" }
}

$selectedOverlayPath = $null
if (-not [string]::IsNullOrWhiteSpace($OverlayPath)) {
    if (-not (Test-Path -LiteralPath $OverlayPath)) { throw "Overlay not found: $OverlayPath" }
    $selectedOverlayPath = $OverlayPath
} elseif ($OverlayMode -ne "none") {
    $overlays = Get-ChildItem -Path $OverlaysDir -Filter "*.mp4" | Where-Object { $_.Length -gt 0 }
    if ($OverlayMode -eq "particles") { $overlays = $overlays | Where-Object { $_.Name -match "particle|dust" -and $_.Name -notmatch "bokeh|colored|billowing" } }
    if ($OverlayMode -eq "smoke") { $overlays = $overlays | Where-Object { $_.Name -match "smoke" } }
    if ($OverlayMode -eq "lightleak") { $overlays = $overlays | Where-Object { $_.Name -match "lightleak" } }
    $overlays = @($overlays)
    if ($overlays.Count -eq 0) { throw "No overlays found for mode: $OverlayMode" }
    $selectedOverlayPath = $overlays[(Get-Random -Maximum $overlays.Count)].FullName
}

$suffix = if ($DurationMode -eq "preview") { "_preview" } else { "" }
$outputName = "$baseName$suffix.mp4"
$outputPath = Join-Path -Path $OutputDir -ChildPath $outputName
if (Test-Path -LiteralPath $outputPath) {
    $ts = Get-Date -Format "yyyyMMdd_HHmmss"
    $outputName = "$baseName$suffix" + "_$ts.mp4"
    $outputPath = Join-Path -Path $OutputDir -ChildPath $outputName
}

$durationArgs = @()
if ($DurationMode -eq "preview") { $durationArgs = @("-t", "$PreviewSeconds") }

$renderSeconds = if ($DurationMode -eq "preview") { [double]$PreviewSeconds } else {
    $duration = ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$AudioPath"
    [double]::Parse($duration, [System.Globalization.CultureInfo]::InvariantCulture)
}
$fadeDuration = [math]::Min([double]$FadeSeconds, [math]::Max(0, ($renderSeconds / 2) - 0.1))
$fadeOutStart = [math]::Max(0, $renderSeconds - $fadeDuration)

$fg = @"
[0:v]fps=30,scale=w='1920*(1+0.42*min(t\,$renderSeconds)/$renderSeconds)':h='1080*(1+0.42*min(t\,$renderSeconds)/$renderSeconds)':force_original_aspect_ratio=increase:eval=frame,crop=1920:1080:(iw-ow)/2:(ih-oh)/2,format=rgba[base0];
"@

if ($null -eq $selectedOverlayPath) {
    $fg += "`n[base0]fade=t=in:st=0:d=$fadeDuration,fade=t=out:st=${fadeOutStart}:d=$fadeDuration,format=rgba[v_faded];`n"
} else {
    $fg += @"

[4:v]scale=1920:1080:flags=bilinear,format=rgba,colorkey=0x000000:0.09:0.06[overlay_clean];
[base0][overlay_clean]overlay=0:0:shortest=1[v_overlay];
[v_overlay]fade=t=in:st=0:d=$fadeDuration,fade=t=out:st=${fadeOutStart}:d=$fadeDuration,format=rgba[v_faded];
"@
}

if ($WaveformStyle -eq "none") {
    $fg += "`n[v_faded]null[v_wave];`n"
} else {
    $fg += @"

[3:a]showwaves=s=580x72:mode=$WaveformStyle`:rate=30:colors=#c8a46a|#d4b87a,format=rgba,colorkey=0x000000:0.10:0.08[wave];
[v_faded][wave]overlay=(W-w)/2:H-250[v_wave];
"@
}

# Text preparation for cycle mode and general use
if ($LogoDisplayMode -eq "cycle" -and $LogoCycleItems -contains "name" -and [string]::IsNullOrWhiteSpace($Text)) {
    $Text = $baseName
}
if (-not [string]::IsNullOrWhiteSpace($Text)) {
    $safeText = $Text.Replace("\", "\\").Replace(":", "\:").Replace("'", "\'")
    if ([string]::IsNullOrWhiteSpace($FontPath) -or -not (Test-Path -LiteralPath $FontPath)) {
        $fontCandidates = @(
            "C:\Windows\Fonts\georgia.ttf",
            "C:\Windows\Fonts\PlayfairDisplay-VariableFont_opsz,wght.ttf",
            "C:\Windows\Fonts\PlayfairDisplay-VariableFont_opsz,wdth,wght.ttf",
            "C:\Windows\Fonts\Cinzel-VariableFont_wght.ttf",
            "C:\Windows\Fonts\CinzelDecorative-Regular.ttf",
            "C:\Windows\Fonts\Garamond.ttf",
            "C:\Windows\Fonts\Perpetua.ttf"
        )
        $FontPath = $fontCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
        if ([string]::IsNullOrWhiteSpace($FontPath)) { $FontPath = "C:\Windows\Fonts\georgia.ttf" }
    }
    $safeFont = $FontPath.Replace("\", "/").Replace(":", "\:")
}

if ($NoLogo) {
    $fg += "`n[v_wave]null[v_logo];`n"
} else {
    $switch = [double]$LogoSwitchSeconds
    $logoFadeSeconds = [math]::Min(1.0, [math]::Max(0.1, $switch / 3))
    if ($LogoDisplayMode -eq "stacked") {
        $charY = "H/2-h/2-60"
        $textY = "H/2-h/2+120"
    } else {
        $charY = "H/2-h/2"
        $textY = "H/2-h/2"
    }

    if ($LogoStyle -eq "breathing") {
    if ($LogoDisplayMode -eq "cycle") {
        $items = @($LogoCycleItems)
        $n = $items.Length
        if ($n -lt 2) { $items = @("character", "text"); $n = 2 }
        $cycleDuration = $n * $switch
        $fCycle = [math]::Min(1.0, [math]::Max(0.1, $switch / 3))
        $overlaySource = "v_wave"
        for ($i = 0; $i -lt $n; $i++) {
            $item = $items[$i]
            $start = $i * $switch
            $end = ($i + 1) * $switch
            $label = "cyc_$i"
            $alpha = "if(lt(mod(T\,$cycleDuration)\,$($start+$fCycle))\,"
            $alpha += "if(lt(mod(T\,$cycleDuration)\,$start)\,0\,"
            $alpha += "(mod(T\,$cycleDuration)-$start)/$fCycle)\,"
            $alpha += "if(lt(mod(T\,$cycleDuration)\,$($end-$fCycle))\,1\,"
            $alpha += "if(lt(mod(T\,$cycleDuration)\,$end)\,"
            $alpha += "($end-mod(T\,$cycleDuration))/$fCycle\,0)))"
            if ($item -eq "character") {
                $fg += "`n[1:v]loop=-1:size=1:start=0,fps=30,setpts=N/FRAME_RATE/TB,format=rgba,geq=r='r(X\,Y)':g='g(X\,Y)':b='b(X\,Y)':a='alpha(X\,Y)*$alpha'[logo_$label];`n"
                $fg += "[$overlaySource][logo_$label]overlay=W/2-w/2:H/2-h/2[ol_$label];`n"
            } elseif ($item -eq "text") {
                $fg += "`n[2:v]loop=-1:size=1:start=0,fps=30,setpts=N/FRAME_RATE/TB,format=rgba,geq=r='r(X\,Y)':g='g(X\,Y)':b='b(X\,Y)':a='alpha(X\,Y)*$alpha'[logo_$label];`n"
                $fg += "[$overlaySource][logo_$label]overlay=W/2-w/2:H/2-h/2[ol_$label];`n"
            } elseif ($item -eq "name" -and -not [string]::IsNullOrWhiteSpace($Text)) {
                $fg += "`ncolor=c=black:s=421x421:d=1,drawtext=fontfile='$safeFont':text='$safeText':fontcolor=white:fontsize=44:borderw=2:bordercolor=black@0.5:x=(w-text_w)/2:y=(h-text_h)/2,format=rgba,loop=-1:size=1,setpts=N/FRAME_RATE/TB,geq=r='r(X\,Y)':g='g(X\,Y)':b='b(X\,Y)':a='if(gt(r(X\,Y)+g(X\,Y)+b(X\,Y)\,20)\,255\,0)*$alpha'[logo_$label];`n"
                $fg += "[$overlaySource][logo_$label]overlay=W/2-w/2:H/2-h/2[ol_$label];`n"
            }
            $overlaySource = "ol_$label"
        }
        $fg += "`n[$overlaySource]null[v_logo];`n"
    } elseif ($LogoDisplayMode -eq "alternate") {
        $cycle = $switch * 2
        $charAlpha = "if(lt(mod(T\,$cycle)\,$logoFadeSeconds)\,mod(T\,$cycle)/$logoFadeSeconds\,if(lt(mod(T\,$cycle)\,$($switch - $logoFadeSeconds))\,1\,if(lt(mod(T\,$cycle)\,$switch)\,($switch-mod(T\,$cycle))/$logoFadeSeconds\,0)))"
        $textAlpha = "if(lt(mod(T\,$cycle)\,$switch)\,0\,if(lt(mod(T\,$cycle)\,$($switch + $logoFadeSeconds))\,(mod(T\,$cycle)-$switch)/$logoFadeSeconds\,if(lt(mod(T\,$cycle)\,$($cycle - $logoFadeSeconds))\,1\,($cycle-mod(T\,$cycle))/$logoFadeSeconds)))"
        $fg += @"

[1:v]loop=-1:size=1:start=0,fps=30,setpts=N/FRAME_RATE/TB,format=rgba,geq=r='r(X\,Y)':g='g(X\,Y)':b='b(X\,Y)':a='alpha(X\,Y)*$charAlpha'[logo];
[2:v]loop=-1:size=1:start=0,fps=30,setpts=N/FRAME_RATE/TB,format=rgba,geq=r='r(X\,Y)':g='g(X\,Y)':b='b(X\,Y)':a='alpha(X\,Y)*$textAlpha'[text_logo];
[v_wave][logo]overlay=W/2-w/2:${charY}[v_logo_main];
[v_logo_main][text_logo]overlay=W/2-w/2:${textY}[v_logo];
"@
    } else {
        $charEnable = if ($LogoDisplayMode -eq "text") { "0" } else { "1" }
        $textEnable = if ($LogoDisplayMode -eq "character") { "0" } else { "1" }
    $fg += @"

[1:v]format=rgba[logo];
[2:v]format=rgba[text_logo];
[v_wave][logo]overlay=W/2-w/2:${charY}:enable='$charEnable'[v_logo_main];
[v_logo_main][text_logo]overlay=W/2-w/2:${textY}:enable='$textEnable'[v_logo];
"@
    }
    } else {
    $fg += @"

[1:v]crop=min(iw\,ih):min(iw\,ih),scale=280:280:flags=bilinear,format=rgba,geq=lum='lum(X\,Y)':a='if(lte(sqrt((X-W/2)^2+(Y-H/2)^2)\,W/2)\,255\,0)'[logo];
[2:v]format=rgba[text_logo];
[v_wave][logo]overlay=W/2-w/2:${charY}:enable='$charEnable'[v_logo_main];
[v_logo_main][text_logo]overlay=W/2-w/2:${textY}:enable='$textEnable'[v_logo];
"@
    }
}

if (-not [string]::IsNullOrWhiteSpace($Text) -and -not ($LogoDisplayMode -eq "cycle" -and $LogoCycleItems -contains "name")) {
    $fg += @"

[v_logo]drawtext=fontfile='$safeFont':text='$safeText':fontcolor=white:fontsize=44:borderw=3:bordercolor=black@0.55:x=(w-text_w)/2:y=(h-text_h)/2[v_text];
"@
    $videoBeforeOverlay = "v_text"
} else {
    $videoBeforeOverlay = "v_logo"
}

$fg += "`n[$videoBeforeOverlay]format=yuv420p[out_v];`n"

$filterFile = Join-Path -Path $env:TEMP -ChildPath "youtube_beat_filter_graph.txt"
Set-Content -Path $filterFile -Value $fg -Encoding ASCII

$args = @("-loglevel", "warning", "-stats", "-loop", "1", "-i", $ImagePath)
if (-not $NoLogo) { $args += @("-i", $LogoCachePath) } else { $args += @("-f", "lavfi", "-i", "color=c=black:s=2x2:d=1") }
if (-not $NoLogo) { $args += @("-i", $TextLogoCachePath) } else { $args += @("-f", "lavfi", "-i", "color=c=black:s=2x2:d=1") }
$args += @("-i", $AudioPath)
if ($null -ne $selectedOverlayPath) { $args += @("-stream_loop", "-1", "-i", $selectedOverlayPath) }
$args += @("-filter_complex_script", $filterFile, "-map", "[out_v]", "-map", "3:a", "-c:v", "libx264", "-preset", $Preset, "-crf", "$Crf", "-c:a", "aac", "-b:a", "192k", "-pix_fmt", "yuv420p", "-shortest")
$args += $durationArgs
$args += @("-y", $outputPath)

Write-Host "Audio: $AudioPath"
Write-Host "Image: $ImagePath"
Write-Host "Logo style: $(if ($NoLogo) { 'none' } else { $LogoStyle })"
Write-Host "Logo display: $(if ($NoLogo) { 'none' } else { $LogoDisplayMode })"
Write-Host "Logo switch seconds: $(if ($NoLogo -or ($LogoDisplayMode -ne 'alternate' -and $LogoDisplayMode -ne 'cycle')) { 'n/a' } else { $LogoSwitchSeconds })"
Write-Host "Logo cycle items: $(if ($LogoDisplayMode -eq 'cycle') { ($LogoCycleItems -join ', ') } else { 'n/a' })"
Write-Host "Logo: $(if ($NoLogo) { 'none' } else { Split-Path -Leaf $LogoPath })"
Write-Host "Text logo: $(if ($NoLogo) { 'none' } else { Split-Path -Leaf $TextLogoPath })"
Write-Host "Overlay: $(if ($selectedOverlayPath) { Split-Path -Leaf $selectedOverlayPath } else { 'none' })"
Write-Host "Text: $(if ([string]::IsNullOrWhiteSpace($Text)) { 'none' } else { $Text })"
Write-Host "BPM: $bpm"
Write-Host "Fade seconds: $fadeDuration"
Write-Host "Waveform style: $WaveformStyle"
Write-Host "Output: $outputPath"

& ffmpeg @args
if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed with exit code $LASTEXITCODE" }

$probe = ffprobe -v error -show_entries format=duration,size,bit_rate -of default=noprint_wrappers=1 "$outputPath"
Write-Host "SUCCESS: $outputPath"
Write-Host $probe
