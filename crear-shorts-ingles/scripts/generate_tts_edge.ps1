param(
  [Parameter(Mandatory=$true)][string]$Text,
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [string]$Voice = "en-US-JennyNeural",
  [string]$Rate = "+0%"
)

$parent = Split-Path -Parent $OutputPath
if ($parent -and -not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent | Out-Null }

$edgeTts = Get-Command edge-tts -ErrorAction SilentlyContinue
if (-not $edgeTts) {
  throw "edge-tts no esta disponible. Instala con: pip install edge-tts"
}

function Convert-NumbersToWords {
  param([string]$t)
  $ones = @('zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen')
  $tens = @('','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety')
  function NumberToWords([int]$n) {
    if ($n -eq 0) { return 'zero' }
    if ($n -lt 20) { return $ones[$n] }
    if ($n -lt 100) {
      $t = [Math]::Floor($n / 10)
      $u = $n % 10
      if ($u -eq 0) { return $tens[$t] }
      return "$($tens[$t])-$($ones[$u])"
    }
    if ($n -lt 1000) {
      $h = [Math]::Floor($n / 100)
      $r = $n % 100
      if ($r -eq 0) { return "$($ones[$h]) hundred" }
      return "$($ones[$h]) hundred $(NumberToWords $r)"
    }
    if ($n -lt 1000000) {
      $th = [Math]::Floor($n / 1000)
      $r = $n % 1000
      if ($r -eq 0) { return "$(NumberToWords $th) thousand" }
      return "$(NumberToWords $th) thousand $(NumberToWords $r)"
    }
    return $n.ToString()
  }
  return $t -replace '\b(\d+)\b', { NumberToWords ([int]$_.Groups[1].Value) }
}

function Expand-Contractions {
  param([string]$t)
  $contractions = @(
    @('(\b)won''t(\b)', '$1will not$2')
    @('(\b)can''t(\b)', '$1cannot$2')
    @('(\b)don''t(\b)', '$1do not$2')
    @('(\b)doesn''t(\b)', '$1does not$2')
    @('(\b)didn''t(\b)', '$1did not$2')
    @('(\b)couldn''t(\b)', '$1could not$2')
    @('(\b)wouldn''t(\b)', '$1would not$2')
    @('(\b)shouldn''t(\b)', '$1should not$2')
    @('(\b)wasn''t(\b)', '$1was not$2')
    @('(\b)weren''t(\b)', '$1were not$2')
    @('(\b)hasn''t(\b)', '$1has not$2')
    @('(\b)haven''t(\b)', '$1have not$2')
    @('(\b)hadn''t(\b)', '$1had not$2')
    @('(\b)isn''t(\b)', '$1is not$2')
    @('(\b)aren''t(\b)', '$1are not$2')
    @('(\b)you''ve(\b)', '$1you have$2')
    @('(\b)we''ve(\b)', '$1we have$2')
    @('(\b)they''ve(\b)', '$1they have$2')
    @('(\b)i''ve(\b)', '$1I have$2')
    @('(\b)you''ll(\b)', '$1you will$2')
    @('(\b)i''ll(\b)', '$1I will$2')
    @('(\b)he''ll(\b)', '$1he will$2')
    @('(\b)she''ll(\b)', '$1she will$2')
    @('(\b)it''ll(\b)', '$1it will$2')
    @('(\b)we''ll(\b)', '$1we will$2')
    @('(\b)they''ll(\b)', '$1they will$2')
    @('(\b)i''m(\b)', '$1I am$2')
    @('(\b)you''re(\b)', '$1you are$2')
    @('(\b)he''s(\b)', '$1he is$2')
    @('(\b)she''s(\b)', '$1she is$2')
    @('(\b)it''s(\b)', '$1it is$2')
    @('(\b)we''re(\b)', '$1we are$2')
    @('(\b)they''re(\b)', '$1they are$2')
    @('(\b)that''s(\b)', '$1that is$2')
    @('(\b)there''s(\b)', '$1there is$2')
    @('(\b)here''s(\b)', '$1here is$2')
    @('(\b)who''s(\b)', '$1who is$2')
    @('(\b)what''s(\b)', '$1what is$2')
    @('(\b)let''s(\b)', '$1let us$2')
    @('(\b)i''d(\b)', '$1I would$2')
    @('(\b)you''d(\b)', '$1you would$2')
    @('(\b)he''d(\b)', '$1he would$2')
    @('(\b)she''d(\b)', '$1she would$2')
    @('(\b)we''d(\b)', '$1we would$2')
    @('(\b)they''d(\b)', '$1they would$2')
  )
  for ($i = 0; $i -lt $contractions.Count; $i += 2) {
    $t = $t -replace $contractions[$i], $contractions[$i + 1]
  }
  return $t
}

$pythonScript = Join-Path $PSScriptRoot "edge_tts_wrapper.py"
$cleanText = Expand-Contractions -t $Text
$cleanText = Convert-NumbersToWords -t $cleanText

$textFile = [System.IO.Path]::ChangeExtension($OutputPath, 'txt')
[System.IO.File]::WriteAllText($textFile, $cleanText, [System.Text.Encoding]::UTF8)

if (Test-Path -LiteralPath $OutputPath) {
  throw "El archivo TTS ya existe: $OutputPath"
}
& python $pythonScript --voice $Voice "--rate=$Rate" --input $textFile --output $OutputPath
if ($LASTEXITCODE -ne 0) {
  throw "edge-tts fallo con codigo $LASTEXITCODE"
}

# Keep the text sidecar to avoid destructive cleanup commands in restricted shells.

if (-not (Test-Path -LiteralPath $OutputPath)) {
  throw "No se genero el TTS esperado: $OutputPath"
}

$OutputPath
