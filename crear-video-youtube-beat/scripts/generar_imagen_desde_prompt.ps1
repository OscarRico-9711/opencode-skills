param(
    [Parameter(Mandatory=$true)]
    [string[]]$Prompts,
    [string]$OutputDir = "D:\BackUpDisco\Inkscape\Youtube",
    [string]$ApiKeysFile = "$env:USERPROFILE\.opencode\api_keys.json",
    [int]$Width = 1344,
    [int]$Height = 768
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$prompt = $Prompts | Get-Random
Write-Host "Selected prompt: $prompt"

$clean = $prompt -replace '[^\w\s]', '' -replace '\s+', '_'
$safeName = if ($clean.Length -gt 60) { $clean.Substring(0, 60) } else { $clean }
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$outputPath = Join-Path -Path $OutputDir -ChildPath "${safeName}_${ts}.png"

$apiKeys = @{}
if (Test-Path -LiteralPath $ApiKeysFile) {
    $apiKeys = Get-Content -Raw -Path $ApiKeysFile | ConvertFrom-Json
}

if ([string]::IsNullOrWhiteSpace($apiKeys.huggingface)) {
    Write-Host "Warning: no huggingface key in $ApiKeysFile; Pollinations (gratis) sera la unica opcion."
}

$helperScript = Join-Path $PSScriptRoot "generar_imagen_multi.py"

Write-Host "Generando imagen con cadena multi-proveedor (Pollinations -> HuggingFace)..."
$output = & python $helperScript --prompt $prompt --output $outputPath --width $Width --height $Height 2>&1
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
    $output | ForEach-Object { Write-Warning $_ }
    throw "All image generation providers failed for prompt: $prompt"
}

$output | ForEach-Object { Write-Host $_ }

if (-not (Test-Path -LiteralPath $outputPath)) {
    throw "Image not found after generation: $outputPath"
}

Write-Host "Image generated: $outputPath"
return $outputPath
