---
name: book-instagram-reels-meta
description: Use when the user asks to programar/subir varios videos a Instagram Reels de forma automática con programación diaria o por intervalos usando Meta Business Suite. Pregunta frecuencia, hora, fecha de inicio y caption.
---

# Book Instagram Reels (Meta Business Suite)

Use this skill when Oscar wants to upload and schedule multiple videos to Instagram Reels via Meta Business Suite, for example:

- "sube estos 5 videos a Instagram, uno por día a las 10 PM"
- "programa estos reels, cada 4 horas empezando a las 8 AM"
- "sube estos clips diariamente a Instagram"

## Workflow

1. Collect the video file paths. If Oscar already pasted paths, parse them directly.
2. Validate that all paths exist, there are no duplicates, and the order is clear.
3. Ask scheduling questions in batches (first frequency, then all remaining fields in one call).
4. Build a dry-run config with `dryRun: true` and show the plan.
5. Ask one explicit confirmation question before setting `dryRun: false` and opening Meta Business Suite.
6. Upload each video via Meta Business Suite Reels Composer using Playwright, scheduling them in order.

## Interactive User Flow

Batch all scheduling questions: first frequency alone, then all remaining fields in a single `questions` array. Same defaults as YouTube Shorts where possible. Validate, preview, then ask for final approval.

If paths are missing, ask one short free-form question:

```text
Pásame los videos para Instagram Reels, uno por línea o separados por coma.
```

Once paths are known, ask all scheduling questions in **one batch** using the `questions` array (multiple questions in a single `question` tool call). Do not ask them one by one.

### Batch Questions

Use 3 sequential calls:

**Call 1 - Frequency** (single question to determine conditional fields):

```text
¿Cada cuánto? (diario / cada X horas / cada X días)
```

Options: `Diario`, `Cada X horas`, `Cada X días`.

**Call 2 - Time selection mode** (single question):

```text
¿Cómo quieres seleccionar la hora?
```

Options: `Hora específica`, `Hora random`, `Día y hora random`.

**Call 3 - All remaining questions** (batched in a single `questions` array):

| # | Question | Options |
|---|----------|---------|
| 1 | `¿Tipo de contenido? (para hashtags automáticos)` | `Phrasal Verbs`, `Vocabulario/Palabras`, `Gramática`, `Pronunciación`, `Errores comunes`, `Idioms/Slang`, `Listening`, `Motivación estudio`, `Serie diaria (Word of Day)`, `Otro / Personalizado` |
| 2 | `¿A qué hora?` *(solo si "Hora específica")* | `6:00 PM`, `8:00 PM`, `10:00 PM`, `12:00 PM` (con custom) |
| 3 | *(if interval)* `¿Cada cuántas horas?` | `2`, `3`, `4`, `6`, `8`, `12` (con custom) |
| 3 | *(if days)* `¿Cada cuántos días?` | `2`, `3`, `5`, `7` (con custom) |
| 4 | `¿Desde qué fecha?` | `Mañana`, `Hoy`, `Jun 15, 2026` (con custom) |
| 5 | `Descripción / título del reel:` | texto libre |
| 6 | `Hashtags extra? (separados por espacio, se suman a los automáticos)` | texto libre |

After the dry-run preview, ask about music separately (default no):

```text
Agregar musica a Instagram? (s/n):
```

If yes, ask for the song name and update the plan before final approval.

Supported start date formats: `Jun 15, 2026`, `2026-06-15`, `15/06/2026`.

After validation, show a concise preview like this and ask for approval:

```text
Plan Instagram:
1. escarmiento_full_clip_001.mp4 -> Jun 06, 2026 6:00 PM
   Caption: Escarmiento Full Clip 001
   Audio: "lofi type beat"
2. escarmiento_full_clip_000.mp4 -> Jun 07, 2026 6:00 PM
   Caption: Escarmiento Full Clip 002
   Audio: "lofi type beat"

¿Apruebas este plan para abrir Meta Business Suite y programar?
```

If Oscar says no or changes anything, update the config and run another dry run. Never proceed to Meta without this final approval.

## Scheduling Logic

- **Daily**: each video scheduled at the same time on consecutive days.
- **Every X hours**: each video scheduled at `first_time + (index * X_hours)`.
- **Every X days**: use `scheduleType: "days"` with `intervalDays`.

## Caption

Instagram Reels has a single caption field. Default caption structure:

```text
{base video title} {counter}

.
.
.
.
.
.
.
.
.
.
.
{hashtags line by line}
```

The dots serve as a visual separator between the title and the hashtags. Default hashtags (max 5):

```text
#rap
#boombap
#perpetuobeats
```

If Oscar adds extra text or hashtags, parse the hashtags from `extraText` (max 5, one per line) and use them instead of the defaults.

Max 2200 characters.

## Hashtags Automáticos (English Channel)

Usa el banco de hashtags en `C:\Users\oscar\AppData\Local\Temp\opencode\hashtags_english.json`.

### Lógica de selección automática

1. **Pregunta tipo de contenido** (Call 3, pregunta 1) → mapea a preset:
   - `Phrasal Verbs` → `phrasal_verb_special`
   - `Vocabulario/Palabras` → `viral_discovery`
   - `Gramática` → `balanced_educational`
   - `Pronunciación` → `balanced_educational`
   - `Errores comunes` → `viral_discovery`
   - `Idioms/Slang` → `viral_discovery`
   - `Listening` → `balanced_educational`
   - `Motivación estudio` → `brand_building`
   - `Serie diaria (Word of Day)` → `viral_discovery`
   - `Otro / Personalizado` → `balanced_educational`

2. **Aplica preset** → mezcla categorías según `mix_presets` + `content_type_mapping`

3. **Límite Instagram Reels**: máx. **10 hashtags** (regla `usage_rules.platform_specific.instagram_reels`)

4. **Construye caption final**:
   ```
   {base video title} {counter}
   
   .
   .
   .
   .
   .
   .
   .
   .
   .
   {hashtags_automáticos (línea por línea)}
   {hashtags_extra_usuario}
   ```

Los hashtags del usuario en "Hashtags extra?" se **añaden al final** de los automáticos.

## Audio

Meta Business Suite Reels Composer allows adding audio from their library with a search. The script can search for a song by name and select the first result.

**Nota:** En Meta Business Suite no aparece la opción de ajustar el volumen entre el audio original del video y la música seleccionada. Solo se puede agregar/quitar la canción.

## Playwright Script

A bundled Node.js script handles browser automation in safe mode:

```text
C:\Users\oscar\.config\opencode\skills\book-instagram-reels-meta\book_upload_instagram.js
```

Safe mode means the script must never click `Share` / `Compartir` as a fallback. It only submits when it can confirm the final button is `Schedule` / `Programar`.

If it cannot confirm `Schedule`, date, and time, it stops and writes debug files under `%TEMP%`.

The script accepts a JSON config file path as argument:

```powershell
node "C:\Users\oscar\.config\opencode\skills\book-instagram-reels-meta\book_upload_instagram.js" "<CONFIG_JSON_PATH>"
```

Diagnostic script:

```text
C:\Users\oscar\.config\opencode\skills\book-instagram-reels-meta\instagram_diagnose.js
```

Use the diagnostic script when the Meta Business Suite page changes selectors. It saves screenshot/text diagnostics and does not click `Schedule`, `Share`, or `Programar`.

## Config JSON Format

```json
{
  "videos": [
    "D:\\ruta\\video1.mp4",
    "D:\\ruta\\video2.mp4"
  ],
  "captions": [
    "Escarmiento 001 Test caption",
    "Escarmiento 002 Test caption"
  ],
  "scheduleType": "daily",
  "time": "6:00 PM",
  "intervalHours": 0,
  "intervalDays": 0,
  "startDate": "Jun 10, 2026",
  "extraText": "#rap #boombap #perpetuobeats",
  "audioEnabled": false,
  "audioQuery": "",
  "dryRun": false,
  "quiet": true
}
```

For `"interval"` mode:

```json
{
  "videos": [...],
  "captions": [...],
  "scheduleType": "interval",
  "time": "8:00 AM",
  "intervalHours": 4
}
```

For every X days:

```json
{
  "videos": [...],
  "captions": [...],
  "scheduleType": "days",
  "time": "6:00 PM",
  "intervalDays": 3,
  "startDate": "Jun 15, 2026",
  "quiet": true
}
```

Use `dryRun: true` first when the order, dates, or titles are uncertain. It prints the plan and does not open Meta.

## Steps to Execute

```powershell
# 1. Write config JSON
$Config = @"
{
  "videos": ["video1.mp4", "video2.mp4"],
  "captions": ["Caption 1", "Caption 2"],
  "scheduleType": "daily",
  "time": "6:00 PM",
  "quiet": true,
  "dryRun": false
}
"@
$ConfigPath = "$env:TEMP\instagram_book_config.json"
[System.IO.File]::WriteAllText($ConfigPath, $Config, [System.Text.UTF8Encoding]::new($false))

# 2. Ensure Chrome is running with remote debugging. Never use Brave.
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
Start-Process -FilePath $chrome -ArgumentList "--remote-debugging-port=9222", "--user-data-dir=$env:LOCALAPPDATA\Google\Chrome\AutomationProfile", "https://business.facebook.com" -WindowStyle Normal
Start-Sleep 5

# 3. Run the upload script
cd "C:\Users\oscar\.config\opencode\skills\book-instagram-reels-meta"
if (-not (Test-Path "node_modules\playwright")) {
  npm init -y | Out-Null
  npm install playwright
}
node book_upload_instagram.js $ConfigPath
```

Diagnostic only:

```powershell
node instagram_diagnose.js
```

## Rules

- Always ask Oscar for inputs; never proceed without confirmation.
- Default caption is `{base video title} {counter}`; ask if Oscar wants to add extra text/hashtags.
- Do not stream full logs into chat. Report progress as: `Subiendo 2/5...`, `Programado: video3.mp4 -> 10 Jun 6:00 PM`.
- Use `quiet: true` for normal batch uploads unless debugging.
- Use `dryRun: true` before large or uncertain batches; then set it to `false` only after Oscar approves the plan.
- Validate that all video paths exist, there are no duplicates, and `captions.length === videos.length` when `captions` is used.
- If schedule selection, date, or time cannot be verified, stop immediately. Do not continue with the next upload.
- Never open or automate Brave. Use Chrome only.
- If Chrome is not running with debugging port, launch it with the dedicated Chrome automation profile: `$env:LOCALAPPDATA\Google\Chrome\AutomationProfile`.
- Chrome may refuse remote debugging on the normal default profile; if the automation profile is new, Oscar must log in to Meta Business Suite there once.
- The script uses Playwright's `connectOverCDP` to control the existing Chrome instance and aborts if port 9222 belongs to Brave.
- Do not delete original videos.
- Each upload must complete before the next one starts.
- Never fall back to Share/Compartir. If `Schedule` / `Programar` is not confirmed, abort and report the debug files.
- Before sending the final action, verify that the visible schedule date/time fields contain the requested values.

## Selector Reference (Meta Business Suite Reels Composer)

URL: `https://business.facebook.com/latest/reels_composer/?asset_id=...&business_id=...`

| Element | Selector | Notes |
|---------|----------|-------|
| Add Video button | `div[role="button"]:has-text("Add Video")` | Opens file chooser |
| File input | `input[type="file"]` | Standard file upload |
| Caption editor | `div[role="textbox"][aria-label*="Describe your reel"]` | Fill with typing |
| Next button | `div[role="button"]:has-text("Next")` | Multiple Next buttons in the flow |
| Audio search | `input[aria-label*="search"i]` | Search field for music library |
| Song result | `li[role="listitem"] div[role="button"]` | First visible result |
| Add audio Done | `div[role="button"]:has-text("Done")` | Confirm audio selection |
| Schedule option | `div[role="button"]:has-text("Schedule")` | Radio/option to schedule |
| Date input | `input[aria-label*="date"i]` | Format YYYY-MM-DD |
| Time inputs | `input[role="spinbutton"][aria-label*="hours"i]` | Hour/min/meridiem spinbuttons |
| Schedule button | `div[role="button"]:has-text("Schedule")` | Final schedule submit button |

## Friction Points & Improvements

- **No volume control**: Meta Business Suite Reels Composer does not show a volume slider between original video audio and added music. The script does not attempt to adjust volume.
- **Audio search**: The audio library search may return no results if the query doesn't match; the script continues without audio in that case.
- **Session persistence**: Meta Business Suite session may expire. If the page shows login, abort and ask user to re-login.
- **Multiple Next buttons**: The flow has 2 Next buttons (after caption, after audio/editing). The script uses the last visible enabled Next button.
- **Schedule button is "Schedule" not "Share"**: The script verifies the button text is "Schedule" (not "Share") before clicking.
- **`startDate` parameter**: Overrides the default "tomorrow" logic. Must not be in the past.

## Dependency Check

If the script fails because Playwright is not installed:

```powershell
cd "C:\Users\oscar\.config\opencode\skills\book-instagram-reels-meta"
npm install playwright
```

If Chrome is not found at the default path, ask Oscar for the correct path.
