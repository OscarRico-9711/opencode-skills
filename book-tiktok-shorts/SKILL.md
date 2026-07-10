---
name: book-tiktok-shorts
description: Use when the user asks to programar/subir varios videos a TikTok de forma automática con programación diaria o por intervalos. Pregunta frecuencia, hora, fecha de inicio y caption.
---

# Book TikTok Shorts

Use this skill when Oscar wants to upload and schedule multiple videos to TikTok, for example:

- "sube estos 5 videos a TikTok, uno por día a las 10 PM"
- "programa estos shorts, cada 4 horas empezando a las 8 AM"
- "sube estos clips diariamente"

## Workflow

1. Collect the video file paths. If Oscar already pasted paths, parse them directly.
2. Validate that all paths exist, there are no duplicates, and the order is clear.
3. Ask scheduling questions in batches (first frequency, then all remaining fields in one call).
4. Build a dry-run config with `dryRun: true` and show the plan.
5. Ask one explicit confirmation question before setting `dryRun: false` and opening TikTok.
6. Upload each video via TikTok Studio using Playwright, scheduling them in order.

## Interactive User Flow

Batch all scheduling questions: first frequency alone, then all remaining fields in a single `questions` array. Same defaults as YouTube Shorts where possible. Validate, preview, then ask for final approval.

If paths are missing, ask one short free-form question:

```text
Pásame los videos para TikTok, uno por línea o separados por coma.
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
| 5 | `Extra caption/hashtags? (dejar vacío si no)` | texto libre, sin options |

Supported start date formats: `Jun 15, 2026`, `2026-06-15`, `15/06/2026`. TikTok-specific validation must abort the plan if any scheduled date exceeds 10 days from today.

After validation, show a concise preview like this and ask for approval:

```text
Plan TikTok:
1. escarmiento_full_clip_001.mp4 -> Jun 06, 2026 6:00 PM
   Caption: Escarmiento Full Clip 001 #rapbeat #boombap #hiphopbeats #lofi #beats
2. escarmiento_full_clip_000.mp4 -> Jun 07, 2026 6:00 PM
   Caption: Escarmiento Full Clip 002 #mpc #lofihiphop #beatmaker #goldenera #chillbeats

¿Apruebas este plan para abrir TikTok y programar? 
```

If Oscar says no or changes anything, update the config and run another dry run. Never proceed to TikTok without this final approval.

## Important: TikTok Scheduling Limit

TikTok **solo permite programar hasta 10 días en el futuro**. Si alguna fecha del plan excede 10 días desde hoy, el script aborta antes de abrir TikTok y muestra el primer video que excede el límite. No ajusta fechas automáticamente para evitar programar varios videos en el mismo día/hora por error.

Si se requieren más de 10 días de separación, usar otra estrategia: programar solo el tramo que cabe dentro de 10 días, o crear un flujo separado de "subida en vivo". Ese modo no está implementado todavía en este script.

## Scheduling Logic

- **Daily**: each video scheduled at the same time on consecutive days (max 10 days ahead).
- **Every X hours**: each video scheduled at `first_time + (index * X_hours)`.
- **Every X days**: use `scheduleType: "days"` with `intervalDays`.

TikTok's schedule widget uses readonly inputs. The script opens the calendar picker to select the day and opens the time picker to select hour/minute. Minutes must be multiples of 5 (`00, 05, 10, ..., 55`).

## Caption (Single Field)

TikTok has a **single text field** (caption/description) unlike YouTube's separate title+description. Everything goes in one field: title, description, hashtags.

Default caption structure:

```text
{base video title} {counter} {5 random hashtags}
```

Random hashtag pool for TikTok captions:

```text
#boombaptypebeat #beatmakers #hiphopbeats #freestylebeat #rapbeat #boombapbeat #hiphopinstrumental #oldschoolbeat #hiphop #newmusicfriday #boombap #hiphopproducer #beatmaking #beats #lofi #mpc #mpclive2 #lofihiphop #goldenera #instrumentals #beatmaker #mpc2000xl #chillbeats #chill #lofibeats #lofichill #producertok #producer #instrumentalhiphop #instrumental #nujabes #duet #duetwithme
```

If Oscar adds extra text or hashtags, concatenate:

```text
{base video title} {counter} {extra}

{description}
{hashtags}
```

Max 4000 characters.

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
   - `Otro / Personalizado` → `balanced_educational` (o usa solo `extra` del usuario)

2. **Aplica preset** → mezcla categorías según `mix_presets` + `content_type_mapping`

3. **Límite TikTok**: máx. **5 hashtags** (regla `usage_rules.platform_specific.tiktok`)

4. **Construye caption final**:
   ```
   {base video title} {counter} {extra_text}
   
   {hashtags_automáticos}
   ```

Si el usuario escribe hashtags en "Extra caption/hashtags?", **añádelos al final** (no reemplaces los automáticos).

## Playwright Script

A bundled Node.js script handles browser automation in safe mode:

```text
C:\Users\oscar\.config\opencode\skills\book-tiktok-shorts\book_upload_tiktok.js
```

Safe mode means the script must never click `Publicar` / `Publish` as a fallback. It only submits when it can confirm the final button is `Programar` / `Schedule` (when scheduling) or explicitly confirms with the user (when posting immediately).

If it cannot confirm `Programar`, date, time, caption, or scheduling success, it stops and writes debug files under `%TEMP%`.

The script accepts a JSON config file path as argument:

```powershell
node "C:\Users\oscar\.config\opencode\skills\book-tiktok-shorts\book_upload_tiktok.js" "<CONFIG_JSON_PATH>"
```

## Config JSON Format

```json
{
  "videos": [
    "D:\\ruta\\video1.mp4",
    "D:\\ruta\\video2.mp4"
  ],
  "captions": [
    "Escarmiento 001 #rapbeat #boombap #hiphopbeats #lofi #beats",
    "Escarmiento 002 #mpc #lofihiphop #beatmaker #goldenera #chillbeats"
  ],
  "scheduleType": "daily",
  "time": "6:00 PM",
  "intervalHours": 0,
  "intervalDays": 0,
  "startDate": "Jun 10, 2026",
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

Use `dryRun: true` first when the order, dates, or titles are uncertain. It prints the plan and does not open TikTok.

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
$ConfigPath = "$env:TEMP\tiktok_book_config.json"
[System.IO.File]::WriteAllText($ConfigPath, $Config, [System.Text.UTF8Encoding]::new($false))

# 2. Ensure Chrome is running with remote debugging. Never use Brave.
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
Start-Process -FilePath $chrome -ArgumentList "--remote-debugging-port=9222", "--user-data-dir=$env:LOCALAPPDATA\Google\Chrome\AutomationProfile", "https://www.tiktok.com/tiktokstudio/upload?from=webapp&tab=video" -WindowStyle Normal
Start-Sleep 5

# 3. Run the upload script
cd "C:\Users\oscar\.config\opencode\skills\book-tiktok-shorts"
if (-not (Test-Path "node_modules\playwright")) {
  npm init -y | Out-Null
  npm install playwright
}
node book_upload_tiktok.js $ConfigPath
```

## Rules

- Always ask Oscar for inputs; never proceed without confirmation.
- Default caption is `{base video title} {counter} {5 random hashtags}` from the hashtag pool; ask if Oscar wants to add extra text/hashtags.
- TikTok single field: concatenate title + description + hashtags with newlines.
- Do not stream full logs into chat. Report progress as: `Subiendo 2/5...`, `Programado: video3.mp4 -> 10 Jun 6:00 PM`.
- Use `quiet: true` for normal batch uploads unless debugging.
- Use `dryRun: true` before large or uncertain batches; then set it to `false` only after Oscar approves the plan.
- Validate that all video paths exist, there are no duplicates, and `captions.length === videos.length` when `captions` is used.
- If schedule selection, date, or time cannot be verified, stop immediately. Do not continue with the next upload.
- Never open or automate Brave. Use Chrome only.
- If Chrome is not running with debugging port, launch it with the dedicated Chrome automation profile: `$env:LOCALAPPDATA\Google\Chrome\AutomationProfile`.
- Chrome may refuse remote debugging on the normal default profile; if the automation profile is new, Oscar must log in to TikTok there once.
- The script uses Playwright's `connectOverCDP` to control the existing Chrome instance and aborts if port 9222 belongs to Brave.
- Respect TikTok's 10-day schedule limit. If the requested plan exceeds it, abort before uploading anything.
- Do not delete original videos.
- Each upload must complete before the next one starts.
- Never fall back to publicar/publish. If `Programar` is not confirmed, abort and report the debug files.
- Before sending the final action, verify that the visible date/time inputs contain the requested values.

## Selector Reference (TikTok Upload Page)

URL: `https://www.tiktok.com/tiktokstudio/upload?from=webapp&tab=video`

| Element | Selector | Notes |
|---------|----------|-------|
| File input | `input[type="file"]` | Standard file upload |
| Caption editor | `[contenteditable="true"]` | DraftEditor, fill with Playwright typing and verify exact text |
| Radio "Ahora" | `input[type="radio"][name="postSchedule"][value="post_now"]` | Default |
| Radio "Programación" | `input[type="radio"][name="postSchedule"][value="schedule"]` | Force click needed |
| Date input | `input.TUXTextInputCore-input[value*="-"]` | Readonly; opens custom calendar |
| Calendar | `.calendar-wrapper` | Select month/year, then day |
| Time input | `input.TUXTextInputCore-input[value*=":"]` | Readonly; opens custom time picker |
| Time picker | `.tiktok-timepicker-option-text` | Select hour left column and minute right column |
| Submit button | `button.Button__root:has-text("Programar")` | Only when schedule selected |
| Submit button (now) | `button.Button__root:has-text("Publicar")` | NEVER click this automatically |

## Friction Points & Improvements

- **Radio button interception**: TikTok's radio inputs are covered by a `<span>` that intercepts pointer events. Use `page.evaluate` with `radio.click()` + dispatch `change` event.
- **DraftEditor**: TikTok uses Draft.js for the caption field. Fill it with Playwright typing on `[contenteditable="true"]`, then verify the final text exactly.
- **Date picker**: Custom calendar under `.calendar-wrapper`. If the target date crosses month/year, navigate the calendar before selecting the day. If calendar click doesn't update the input, fall back to direct value setting via `HTMLInputElement.prototype.value` setter + dispatch `input`/`change` events.
- **Time picker**: Custom scrollable picker with hours (00-23) and minutes (00/05/10/.../55). Inputs are readonly; do not use `.fill()`.
- **10-day limit**: TikTok only schedules up to 10 days ahead. Abort the plan if any video exceeds the limit.
- **Check limit reached**: TikTok shows "Alcanzaste tu límite de comprobaciones por hoy. Inténtalo de nuevo mañana." when daily check quota is exhausted. This is NOT an error - the video can still be scheduled. The `waitForContentCheckPassed` function must accept this message as a valid state to proceed with scheduling.
- **Success verification**: After clicking `Programar`, verify a success state by looking for "Video publicado", "Programado", "se programó", or that the upload form resets (no file, no Programar button).
- **HD switch**: The "Calidad HD" toggle is on by default; leave it.
- **Session persistence**: TikTok web session may expire. If upload page shows login, abort and ask user to re-login.
- **Sound flow**: After caption and schedule date/time are verified, click `#open-new-editor [data-button-name="sounds"]`, search `{first word from video title} perpetuo beats` in `input[placeholder="Buscar sonidos"]`, click the first visible `Añadir`/`Agregar`/`Add` result button, close the sound panel, set the visible audio `dB` input to exactly `-58`, verify `input.value === "-58"`, then click `Guardar`. Do not click `VolumeUp`/mute icons and do not set `-∞`, because TikTok may drop or mishandle the added sound. Sound is mandatory: if open/add/volume/save fails, abort with debug instead of continuing to schedule.
- **Dirty page prompts**: Do not use Escape as a generic modal closer after sound. If TikTok shows "¿Seguro que quieres salir?", click `Cancelar`. Open Chrome directly on `https://www.tiktok.com/tiktokstudio/upload?from=webapp&tab=video` and reuse the most recent upload page instead of navigating an older dirty tab.

## Dependency Check

If the script fails because Playwright is not installed:

```powershell
cd "C:\Users\oscar\.config\opencode\skills\book-tiktok-shorts"
npm install playwright
```

If Chrome is not found at the default path, ask Oscar for the correct path.
