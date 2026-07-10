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
if (-not [string]::IsNullOrWhiteSpace($apiKeys.openai)) { $apisAvailable += "openai" }

if ($apisAvailable.Count -eq 0) {
    throw "No API keys found. Configure at least one in: $ApiKeysFile"
}

function Invoke-HuggingFace {
    param([string]$Token, [string]$Prompt, [string]$OutPath, [int]$Width, [int]$Height)
    $url = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell"
    $hfBody = @{
        inputs = $Prompt
        parameters = @{ width = $Width; height = $Height }
    } | ConvertTo-Json -Depth 5 -Compress
    $tmpImg = Join-Path -Path $env:TEMP -ChildPath "hf_img_$(Get-Random).tmp"
    Invoke-WebRequest -Uri $url -Method Post -ContentType "application/json" -Headers @{ Authorization = "Bearer $Token" } -Body $hfBody -TimeoutSec 180 -OutFile $tmpImg | Out-Null
    if ((Get-Item -LiteralPath $tmpImg).Length -le 1000) { throw "HuggingFace image too small" }
    Move-Item -LiteralPath $tmpImg -Destination $OutPath -Force
}

function Invoke-OpenAI {
    param([string]$Key, [string]$Prompt, [string]$OutPath, [int]$Width, [int]$Height)
    $url = "https://api.openai.com/v1/images/generations"
    $preferredSize = if ($Width -lt $Height) { "1024x1792" } elseif ($Width -gt $Height) { "1792x1024" } else { "1024x1024" }
    $modelsToTry = @(
        @{ model = "dall-e-3"; size = $preferredSize },
        @{ model = "dall-e-2"; size = "1024x1024" }
    )
    $lastErr = $null
    foreach ($m in $modelsToTry) {
        try {
            $body = @{
                model = $m.model
                prompt = $Prompt
                n = 1
                size = $m.size
            } | ConvertTo-Json -Depth 5 -Compress
            $resp = Invoke-RestMethod -Uri $url -Method Post -ContentType "application/json" -Headers @{ Authorization = "Bearer $Key" } -Body $body -TimeoutSec 120
            $imageUrl = $resp.data[0].url
            if (-not $imageUrl) { throw "No image URL returned" }
            $tmpImg = Join-Path -Path $env:TEMP -ChildPath "oai_img_$(Get-Random).tmp"
            Invoke-WebRequest -Uri $imageUrl -OutFile $tmpImg -TimeoutSec 60 | Out-Null
            if ((Get-Item -LiteralPath $tmpImg).Length -le 1000) { throw "Image too small" }
            Move-Item -LiteralPath $tmpImg -Destination $OutPath -Force
            return
        } catch { $lastErr = $_ }
    }
    throw $lastErr
}

$tried = @{}
$success = $false

foreach ($attempt in 1..$apisAvailable.Count) {
    $remaining = $apisAvailable | Where-Object { $_ -notin $tried.Keys }
    $api = $remaining | Get-Random
    $tried[$api] = $true

        Write-Host "Using API: $api"
    try {
        switch ($api) {
            "huggingface" { Invoke-HuggingFace -Token $apiKeys.huggingface -Prompt $prompt -OutPath $outputPath -Width $Width -Height $Height }
            "openai" { Invoke-OpenAI -Key $apiKeys.openai -Prompt $prompt -OutPath $outputPath -Width $Width -Height $Height }
        }
        $success = $true
        Write-Host "API used: $api"
        break
    } catch {
        Write-Warning "$api failed: $_"
    }
}

if (-not $success) {
    throw "All image generation APIs failed for prompt: $prompt"
}

Write-Host "Image generated: $outputPath"
return $outputPath
