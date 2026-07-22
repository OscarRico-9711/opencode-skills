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

$apisAvailable = @()
if (-not [string]::IsNullOrWhiteSpace($apiKeys.huggingface)) { $apisAvailable += "huggingface" }
if ($apisAvailable.Count -eq 0) {
    throw "No API keys found. Configure at least one in: $ApiKeysFile"
}

function Invoke-HuggingFace {
    param([string]$Token, [string]$Prompt, [string]$OutPath, [int]$Width, [int]$Height)
    $providers = @(
        @{ name = "together"; url = "https://router.huggingface.co/together/v1/images/generations" },
        @{ name = "nscale"; url = "https://router.huggingface.co/nscale/v1/images/generations" }
    )
    $lastErr = $null
    foreach ($p in $providers) {
        try {
            $body = @{
                model = "black-forest-labs/FLUX.1-schnell"
                prompt = $Prompt
                response_format = "url"
                width = $Width
                height = $Height
            } | ConvertTo-Json -Depth 5 -Compress
            $resp = Invoke-RestMethod -Uri $p.url -Method Post -ContentType "application/json" -Headers @{ Authorization = "Bearer $Token" } -Body $body -TimeoutSec 180
            $imageUrl = $resp.data[0].url
            if (-not $imageUrl) { throw "No image URL returned from $($p.name)" }
            $tmpImg = Join-Path -Path $env:TEMP -ChildPath "hf_img_$(Get-Random).tmp"
            Invoke-WebRequest -Uri $imageUrl -OutFile $tmpImg -TimeoutSec 60 | Out-Null
            if ((Get-Item -LiteralPath $tmpImg).Length -le 1000) { throw "Image too small" }
            Move-Item -LiteralPath $tmpImg -Destination $OutPath -Force
            return
        } catch { $lastErr = $_; Write-Warning "$($p.name) failed: $_" }
    }
    throw $lastErr
}

$success = $false

Write-Host "Using API: huggingface"
try {
    Invoke-HuggingFace -Token $apiKeys.huggingface -Prompt $prompt -OutPath $outputPath -Width $Width -Height $Height
    $success = $true
    Write-Host "API used: huggingface"
} catch {
    Write-Warning "huggingface failed: $_"
}

if (-not $success) {
    throw "All image generation APIs failed for prompt: $prompt"
}

Write-Host "Image generated: $outputPath"
return $outputPath
