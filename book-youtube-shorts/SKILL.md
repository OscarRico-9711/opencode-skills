---
name: book-youtube-shorts
description: Use when the user asks to programar/subir varios videos a YouTube Shorts de forma automática, uno por uno, con programación diaria o por intervalos. Pregunta frecuencia, hora, fecha de inicio, título y descripción.
---

# Book YouTube Shorts

Use this skill when Oscar wants to upload and schedule multiple videos to YouTube, for example:

- "sube estos 5 videos a YouTube, uno por día a las 10 PM"
- "programa estos shorts, cada 4 horas empezando a las 8 AM"
- "sube estos clips diariamente"

## Workflow

1. Ask Oscar for the list of video file paths (one per line or comma-separated).
2. Ask scheduling frequency: "¿Cada cuánto? (diario / cada X horas / cada X días)"
3. Ask time selection mode: "¿Cómo quieres seleccionar la hora? (hora específica / hora random / día y hora random)"
4. Ask time: if "hora específica" and diario, "¿A qué hora?" / if "hora específica" y cada X horas, "¿Cada cuántas horas?" + "¿Hora del primer video?"
5. Ask if there is a specific start date: "¿Desde qué fecha? (si no, empieza mañana)"
6. Ask content type for auto-hashtags: "¿Tipo de contenido? (Phrasal Verbs / Vocabulario / Gramática / Pronunciación / Errores comunes / Idioms-Slang / Listening / Motivación / Serie diaria / Otro)"
7. Ask title and description: "¿Título para todos?" and "¿Descripción para todos?"
8. Upload each video via YouTube Studio using Playwright, scheduling them in order.

## Scheduling Logic

- **Daily**: each video scheduled at the same time on consecutive days.
- **Every X hours**: each video scheduled at `first_time + (index * X_hours)`.
- **Every X days**: use `scheduleType: "days"` with `intervalDays`.

If YouTube rejects the schedule (e.g. too close to current time), the script will bump to the next available slot.

## Title and Description

Default title structure:

```text
{base video title} {counter} - {2-3 random hashtags that fit under 100 characters}
```

Random hashtag pool for YouTube titles:

```text
#boombaptypebeat #beatmakers #hiphopbeats #freestylebeat #rapbeat #boombapbeat #hiphopinstrumental #oldschoolbeat #hiphop #newmusicfriday #boombap #hiphopproducer #beatmaking #beats #lofi #mpc #mpclive2 #lofihiphop #goldenera #instrumentals #beatmaker #mpc2000xl #chillbeats #chill #lofibeats #lofichill #producertok #producer #instrumentalhiphop #instrumental #nujabes #duet #duetwithme
```

Default description:

```text
https://open.spotify.com/intl-es/artist/57AW2Xl73JztY2BsJAUg9o?si=AjKGujOwQ2yeWDvNWA3pnA
```

When asking for the title, show the default structure and ask whether Oscar wants to add anything extra. If he adds text, append it before the hashtag block unless he specifies another position.

Always validate that every final YouTube title is 100 characters or less before dry-run and before opening YouTube Studio. If any title is longer, shorten it and show Oscar the corrected title plan for approval; never attempt upload with a title over 100 characters.

Use a per-video counter starting at `001` unless Oscar asks for a different format.

The script supports either one shared `title`, a `titles` array with one title per video, or automatic title generation. Prefer automatic titles unless Oscar asks for exact custom titles.

Automatic titles are generated from the video filename. Example: `natural_clip_000.mp4` becomes:

```text
Natural 001 - #rapbeat #boombap #hiphopbeats
```

If Oscar adds title text, pass it as `titleExtra`, for example `#VupCrew`:

```text
Natural 001 #VupCrew - #rapbeat #boombap #hiphopbeats
```

## Hashtags Automáticos (English Channel)

Usa el banco de hashtags en `C:\Users\oscar\AppData\Local\Temp\opencode\hashtags_english.json`.

### Lógica de selección automática

1. **Pregunta tipo de contenido** (paso 6) → mapea a preset:
   - `Phrasal Verbs` → `phrasal_verb_special`
   - `Vocabulario` → `viral_discovery`
   - `Gramática` → `balanced_educational`
   - `Pronunciación` → `balanced_educational`
   - `Errores comunes` → `viral_discovery`
   - `Idioms/Slang` → `viral_discovery`
   - `Listening` → `balanced_educational`
   - `Motivación` → `brand_building`
   - `Serie diaria` → `viral_discovery`
   - `Otro` → `balanced_educational`

2. **Aplica preset** → mezcla categorías según `mix_presets` + `content_type_mapping`

3. **Límite YouTube Shorts**: máx. **3 hashtags en el título** (regla `usage_rules.platform_specific.youtube_shorts`)

4. **Construye título final**:
   ```
   {base video title} {counter} {titleExtra} - {2-3 hashtags_automáticos}
   ```

   Descripción: usa la default + hashtags extra del usuario si los hay.

Si el usuario escribe hashtags en "titleExtra" o descripción, **respétalos y completa** con los automáticos hasta el límite.

## Playwright Script

A bundled Node.js script handles browser automation in safe mode:

```text
C:\Users\oscar\.config\opencode\skills\book-youtube-shorts\book_upload.js
```

Safe mode means the script must never click `Crear`, `Publicar`, `Create`, `Publish`, `Guardar`, or `Save` as a fallback. It only submits when it can confirm the final button is `Programar` / `Schedule`.

If it cannot confirm `Programar`, date, and time, it stops and writes debug files under `%TEMP%`.

Diagnostic script:

```text
C:\Users\oscar\.config\opencode\skills\book-youtube-shorts\diagnose_upload.js
```

Use the diagnostic script when YouTube Studio changes selectors or the date/time picker is not being controlled correctly. It uploads the first video only to reach the visibility step, saves screenshot/text diagnostics, and does not click `Programar`, `Crear`, or `Publicar`.

The script accepts a JSON config file path as argument:

```powershell
node "C:\Users\oscar\.config\opencode\skills\book-youtube-shorts\book_upload.js" "<CONFIG_JSON_PATH>"
```

## Config JSON Format

Generate a temp JSON file with this structure:

```json
{
  "videos": [
    "D:\\ruta\\video1.mp4",
    "D:\\ruta\\video2.mp4"
  ],
  "titles": [
    "Escarmiento 001 - #rapbeat #boombap #hiphopbeats",
    "Escarmiento 002 - #lofi #beats #beatmaker"
  ],
  "description": "https://open.spotify.com/intl-es/artist/57AW2Xl73JztY2BsJAUg9o?si=AjKGujOwQ2yeWDvNWA3pnA",
  "scheduleType": "daily",
  "time": "10:50 PM",
  "intervalHours": 0,
  "dryRun": false,
  "quiet": true,
  "channelId": "UCDZGMK9cr4B-XgF_OyOx1MQ"
}
```

For `"interval"` mode:

```json
{
  "videos": [...],
  "titles": [...],
  "description": "...",
  "scheduleType": "interval",
  "time": "8:00 AM",
  "intervalHours": 4
}
```

For every X days:

```json
{
  "videos": [...],
  "titleExtra": "#VupCrew",
  "description": "https://open.spotify.com/intl-es/artist/57AW2Xl73JztY2BsJAUg9o?si=AjKGujOwQ2yeWDvNWA3pnA",
  "scheduleType": "days",
  "time": "5:00 PM",
  "intervalDays": 2,
  "quiet": true
}
```

For explicit start date (default: tomorrow). Supported formats: `Jun 15, 2026`, `2026-06-15`, `15/06/2026`.

```json
{
  "videos": [...],
  "titleExtra": "#Rony4XL",
  "scheduleType": "days",
  "time": "6:00 PM",
  "intervalDays": 3,
  "startDate": "Jun 15, 2026",
  "quiet": true
}
```

Use `dryRun: true` first when the order, dates, or titles are uncertain. It prints the plan and does not open YouTube.

## Steps to Execute

```powershell
# 1. Write config JSON
$Config = @"
{
  "videos": ["video1.mp4", "video2.mp4"],
  "titleExtra": "",
  "description": "https://open.spotify.com/intl-es/artist/57AW2Xl73JztY2BsJAUg9o?si=AjKGujOwQ2yeWDvNWA3pnA",
  "scheduleType": "daily",
  "time": "10:50 PM",
  "intervalHours": 0,
  "quiet": true,
  "dryRun": false
}
"@
$ConfigPath = "$env:TEMP\youtube_book_config.json"
[System.IO.File]::WriteAllText($ConfigPath, $Config, [System.Text.UTF8Encoding]::new($false))

# 2. Ensure Chrome is running with remote debugging. Never use Brave.
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
Start-Process -FilePath $chrome -ArgumentList "--remote-debugging-port=9222", "--user-data-dir=$env:LOCALAPPDATA\Google\Chrome\AutomationProfile", "https://youtube.com" -WindowStyle Normal
Start-Sleep 5

# 3. Run the upload script
cd "C:\Users\oscar\.config\opencode\skills\book-youtube-shorts"
if (-not (Test-Path "node_modules\playwright")) {
  npm init -y | Out-Null
  npm install playwright
}
node book_upload.js $ConfigPath
```

Preview plan only:

```powershell
node book_upload.js $ConfigPath
```

Set `"dryRun": true` in the JSON before running the preview.

Diagnostic only:

```powershell
node diagnose_upload.js $ConfigPath
```

## Rules

- Always ask Oscar for inputs; never proceed without confirmation.
- Default title format is `{base video title} {counter} - {random hashtags}`; use the hashtag pool above at random, without duplicates, and never exceed 100 characters.
- Always validate every final title is 100 characters or less. Abort or shorten before upload if any title exceeds 100 characters.
- Default description is `https://open.spotify.com/intl-es/artist/57AW2Xl73JztY2BsJAUg9o?si=AjKGujOwQ2yeWDvNWA3pnA`; ask if Oscar wants to add anything extra.
- Do not stream full logs into chat. Report progress as: `Subiendo 2/5...`, `Programado: video3.mp4 -> 6 Jun 10:50 PM`.
- Use `quiet: true` for normal batch uploads unless debugging.
- Use `dryRun: true` before large or uncertain batches; then set it to `false` only after Oscar approves the plan.
- Validate that all video paths exist, there are no duplicates, and `titles.length === videos.length` when `titles` is used.
- If schedule selection, date, or time cannot be verified, stop immediately. Do not continue with the next upload.
- Never open or automate Brave. Use Chrome only.
- If Chrome is not running with debugging port, launch it with the dedicated Chrome automation profile: `$env:LOCALAPPDATA\Google\Chrome\AutomationProfile`.
- Chrome may refuse remote debugging on the normal default profile; if the automation profile is new, Oscar must log in to YouTube there once.
- The script uses Playwright's `connectOverCDP` to control the existing Chrome instance and aborts if port 9222 belongs to Brave.
- Respect YouTube's upload schedule restrictions. If the requested first time is already in the past (and no `startDate` is given), the first upload starts on the next day.
- Use `startDate` in the config to set an explicit first schedule date (e.g. `"Jun 15, 2026"`, `"2026-06-15"`, or `"15/06/2026"`). This overrides the default "tomorrow" logic and must not be in the past.
- Do not delete original videos.
- Each upload must complete before the next one starts.
- Never fall back to public/private/publish/create. If `Programar` / `Schedule` is not confirmed, abort and report the debug files.
- Before sending the final action, verify that the visible schedule date/time fields contain the requested values.

## Friction Points & Improvements

- **Shadow DOM selectors in YouTube Studio**: Radio buttons (Público/Programar/Privado) and `ytcp-datetime-picker` are inside nested Shadow DOMs. The script uses `page.evaluate` with deep `shadowRoot` traversal instead of normal Playwright selectors.
- **PowerShell JSON with BOM**: `Set-Content -Encoding utf8` adds a BOM that breaks `JSON.parse`. Always use `[System.IO.File]::WriteAllText` with `[System.Text.UTF8Encoding]::new($false)`.
- **CDP session must use Chrome AutomationProfile**: Current Chrome may refuse remote debugging on the normal default profile. Use `$env:LOCALAPPDATA\Google\Chrome\AutomationProfile` and keep YouTube logged in there.
- **Schedule rejection**: YouTube rejects times too close to now; the script uses "next available slot" logic.
- **Sequential date calculation**: Dates must build incrementally from the previous date (not recalculated from "now") to avoid gaps when there are >2 videos.
- **`startDate` parameter added (2026-06-05)**: Before this, there was no way to start from a specific date — the first video always went to "tomorrow". Now `startDate: "Jun 15, 2026"` sets the exact first date.
- **`diagnose_upload.js`**: Essential for debugging selector changes — it reaches the visibility step, dumps the DOM, and stops before clicking any dangerous button.

## Dependency Check

If the script fails because Playwright is not installed:

```powershell
cd "C:\Users\oscar\.config\opencode\skills\book-youtube-shorts"
npm install playwright
```

If Chrome is not found at the default path, ask Oscar for the correct path.
