---
name: programar-videos
description: Use when the user says programar videos, subir videos a redes sociales, subir a TikTok y YouTube, or wants a menu to schedule/upload videos across multiple social networks.
---

# Programar Videos

Skill orquestador para programar o subir videos en varias redes sociales desde un solo flujo. Presenta un menu de redes, recolecta datos comunes una vez y delega la ejecucion a los scripts de cada red.

## Redes Soportadas

- TikTok: usa `C:\Users\oscar\.config\opencode\skills\book-tiktok-shorts\book_upload_tiktok.js`
- YouTube Shorts: usa `C:\Users\oscar\.config\opencode\skills\book-youtube-shorts\book_upload.js`

## Flujo Principal

1. Preguntar redes con seleccion multiple.
2. Recolectar rutas de videos, si Oscar no las pego ya.
3. Validar que todos los videos existen, que no hay duplicados y que el orden es claro.
4. Preguntar frecuencia en una llamada separada.
5. **Si hay 2+ redes seleccionadas, preguntar con cuál iniciar** (TikTok o YouTube). La otra red se ejecutará después.
6. **Preguntar campos COMUNES iniciales** (hora, fecha, caption/titulo base) en una llamada batched.
7. **Mostrar un ejemplo exacto de caption/titulo final antes de preguntar extras**, incluyendo contador, separadores y hashtags por defecto de la red actual.
8. Preguntar si quiere agregar algo al caption/titulo viendo ese ejemplo final.
9. **Preguntar campos específicos de la red actual** (ej: descripción YouTube solo si la red actual es YouTube).
10. Construir config de la red actual con `dryRun: true`.
11. Ejecutar dry-run de la red actual.
12. Mostrar plan parcial y pedir confirmacion.
13. Si aprobado, escribir config con `dryRun: false` y ejecutar.
14. **Si hay otra red pendiente, volver al paso 5** con la siguiente red.
15. Al terminar todas las redes, mostrar resumen final.

## Preguntas

### 1. Redes

Usar `question` con `multiple: true`:

```text
¿A que redes quieres subir/programar estos videos?
```

Opciones:

- `TikTok`
- `YouTube Shorts`

### 2. Videos

Si el usuario ya pego rutas, parsearlas directamente. Si no:

```text
Pásame los videos, uno por línea o separados por coma.
```

Mantener el orden exacto que Oscar dio. No reordenar alfabeticamente.

### 3. Frecuencia

Hacer una llamada separada porque define campos condicionales:

```text
¿Cada cuánto?
```

Opciones:

- `Diario`
- `Cada X horas`
- `Cada X días`

### 4. Red Inicial (solo si hay 2+ redes)

Si el usuario seleccionó TikTok y YouTube, preguntar:

```text
¿Con qué red quieres iniciar?
```

Opciones:

- `TikTok`
- `YouTube Shorts`

La otra red se ejecutará después de terminar la primera.

### 5. Campos Comunes Iniciales

Hacer una llamada `question` con estas preguntas:

- `¿A qué hora?` Opciones: `6:00 PM`, `8:00 PM`, `10:00 PM`, `12:00 PM` con custom.
- Si frecuencia es `Cada X horas`: `¿Cada cuántas horas?` Opciones: `2`, `3`, `4`, `6`, `8`, `12` con custom.
- Si frecuencia es `Cada X días`: `¿Cada cuántos días?` Opciones: `2`, `3`, `5`, `7` con custom.
- `¿Desde qué fecha?` Opciones: `Mañana`, `Hoy`, `Jun 15, 2026` con custom.
- `Caption/titulo base? (dejar vacío para usar nombre del archivo)` texto libre.

Formatos de fecha soportados: `Jun 15, 2026`, `2026-06-15`, `15/06/2026`, `Hoy`, `Mañana`.

### 6. Confirmar Ejemplo De Nombre Antes De Extras

Antes de preguntar por hashtags/texto extra, construir y mostrar el ejemplo exacto del primer caption/titulo final con la plantilla de la red actual. El ejemplo debe incluir todo lo que se va a usar: titulo base, contador, extra si ya existe, separador, hashtags por defecto y menciones.

Despues de mostrar el ejemplo, preguntar una sola cosa:

```text
Asi quedaria el primer titulo/caption:
{ejemplo completo}

¿Quieres agregar algo antes de los hashtags finales? Si no, responde "sin extra".
```

Reglas para esta pregunta:

- No pedir `extra hashtags/texto` sin mostrar primero el ejemplo completo.
- Si Oscar agrega hashtags que ya estan en los hashtags por defecto, no duplicarlos.
- Si el titulo/caption final queda largo o dificil de leer, advertirlo y proponer una version corta antes del dry-run.
- Para YouTube, usar 2-3 hashtags aleatorios de la bolsa y mantener el titulo final en 100 caracteres o menos.
- Para TikTok, usar 5 hashtags aleatorios de la misma bolsa en el caption automatico.
- Si Oscar responde `sin extra`, `no`, o deja vacio, usar solo el titulo base + contador + plantilla por defecto de la red.

Ejemplo para YouTube:

```text
Asi quedaria el primer titulo:
Tiempos Violentos 001 - #rapbeat #boombap #hiphopbeats

¿Quieres agregar algo antes de los hashtags finales? Si no, responde "sin extra".
```

Si Oscar responde `#PerpetuoBeats #Rony4Xl #Rap #Bogota #Hiphop`, el titulo final debe quedar limpio, por ejemplo:

```text
Tiempos Violentos 001 #PerpetuoBeats #Rony4Xl #Bogota - #rapbeat #boombap #hiphopbeats
```

No debe quedar asi porque duplica ideas y se ve largo:

```text
Tiempos Violentos 001 #PerpetuoBeats #Rony4Xl #Rap #Bogota #Hiphop - #rapbeat #boombap #hiphopbeats
```

### 7. Campos Específicos (según red actual)

Solo preguntar si corresponde a la red que se está configurando ahora:

- **TikTok**: No tiene descripción separada. Los hashtags van en el caption/título. Preguntar el nombre de búsqueda de la canción/audio antes del dry-run.
- **YouTube Shorts**: `Descripción YouTube?` (texto libre). Usar por defecto el Spotify link del skill de YouTube si queda vacío.

Para TikTok, preguntar:

```text
¿Con qué nombre busco la canción/audio en TikTok?
```

Opciones sugeridas:

- `Perpetuo Beats`
- `{titulo base} Perpetuo Beats`
- `Sin canción/audio`

Reglas:

- Si Oscar da un nombre, guardar `soundSearchTerm` en la config de TikTok con ese texto exacto.
- Si cada video necesita audio distinto, usar `soundSearchTerms` con la misma cantidad y orden que `videos`.
- Si Oscar elige `Sin canción/audio`, guardar `addSoundToVideo: false` y no intentar agregar sonido.
- No derivar automaticamente el nombre desde el archivo sin preguntar, porque TikTok no siempre muestra el audio correcto.

## Validaciones Obligatorias

- Todos los paths existen con `Test-Path`.
- No hay duplicados por path normalizado.
- `captions.length === videos.length` para TikTok.
- `titles.length === videos.length` para YouTube si se generan titulos explicitos.
- TikTok no puede programar mas de 10 dias en el futuro. Si alguna fecha excede el limite, abortar antes de abrir TikTok y explicar cual video excede.
- Si TikTok recibe mas videos que los que caben dentro de la ventana de 10 dias, no elegir automaticamente. Mostrar un menu de seleccion multiple con los nombres de archivo y dejar que Oscar seleccione exactamente cuales subir ahora.
- Si la hora no es multiplo de 5 minutos, redondear solo despues de preguntar o confirmar.
- Nunca ejecutar con `dryRun: false` sin aprobacion final.

### Seleccion De Videos Para TikTok Cuando Hay Mas De 10 Dias

Antes del dry-run de TikTok, calcular cuantas fechas caben dentro del limite de 10 dias segun `startDate`, `time`, `scheduleType`, `intervalHours` e `intervalDays`.

Si la cantidad de videos candidatos es mayor que la cantidad de fechas permitidas:

- Mostrar un `question` de seleccion multiple con un item por video.
- Cada opcion debe usar el nombre de archivo visible, por ejemplo `Tiempos Violentos_full_clip_007.mp4`.
- La descripcion de cada opcion debe incluir la ruta completa o el indice original para evitar confusion.
- Indicar en la pregunta cuantos puede seleccionar, por ejemplo: `TikTok permite programar 10 fechas con este calendario. Selecciona hasta 10 videos para subir ahora.`
- No seleccionar automaticamente los primeros videos salvo que Oscar elija una opcion explicita como `Primeros permitidos`.
- Preservar el orden original de los videos seleccionados al construir la config.
- Si Oscar selecciona mas videos que fechas permitidas, pedir que reduzca la seleccion; no truncar silenciosamente.
- Los videos no seleccionados quedan pendientes para una futura tanda de TikTok.

## Construccion De Configs

### TikTok

TikTok usa un solo campo `captions`.

```json
{
  "videos": ["D:\\ruta\\video1.mp4"],
  "captions": ["Escarmiento 001 #rapbeat #boombap #hiphopbeats #lofi #beats"],
  "scheduleType": "daily",
  "time": "6:00 PM",
  "intervalHours": 0,
  "intervalDays": 0,
  "addSoundToVideo": true,
  "soundSearchTerm": "Perpetuo Beats",
  "startDate": "Jun 06, 2026",
  "dryRun": true,
  "quiet": true
}
```

### YouTube Shorts

YouTube usa `titles` y `description`, no `captions`.

```json
{
  "videos": ["D:\\ruta\\video1.mp4"],
  "titles": ["Escarmiento 001 - #rapbeat #boombap #hiphopbeats"],
  "description": "https://open.spotify.com/intl-es/artist/57AW2Xl73JztY2BsJAUg9o?si=AjKGujOwQ2yeWDvNWA3pnA",
  "scheduleType": "daily",
  "time": "6:00 PM",
  "intervalHours": 0,
  "intervalDays": 0,
  "startDate": "Jun 06, 2026",
  "dryRun": true,
  "quiet": true,
  "channelId": "UCDZGMK9cr4B-XgF_OyOx1MQ"
}
```

## Naming De Captions/Titles

Si Oscar no da caption/titulo base, derivar desde el nombre del archivo y usar contador desde `001`.

- TikTok: `{base title} {counter} {extra} {5 random hashtags}`
- YouTube: `{base title} {counter} {extra} - {2-3 random hashtags that fit under 100 characters}`
- Antes de construir todos los nombres, mostrar siempre el ejemplo final del primer video y pedir confirmacion de extras.
- Mantener los titulos cortos. Si el resultado supera aproximadamente 90 caracteres, proponer una version corta antes de ejecutar el dry-run.
- Normalizar extras para evitar duplicados obvios con la bolsa de hashtags aleatorios.

Bolsa de hashtags para TikTok y YouTube:

```text
#boombaptypebeat #beatmakers #hiphopbeats #freestylebeat #rapbeat #boombapbeat #hiphopinstrumental #oldschoolbeat #hiphop #newmusicfriday #boombap #hiphopproducer #beatmaking #beats #lofi #mpc #mpclive2 #lofihiphop #goldenera #instrumentals #beatmaker #mpc2000xl #chillbeats #chill #lofibeats #lofichill #producertok #producer #instrumentalhiphop #instrumental #nujabes #duet #duetwithme
```

Ejemplo para `escarmiento_full_clip_007.mp4`:

- TikTok: `Escarmiento Full Clip 001 #rapbeat #boombap #hiphopbeats #lofi #beats`
- YouTube: `Escarmiento Full Clip 001 #VupCrew - #rapbeat #boombap #hiphopbeats`

## Ejecucion

Escribir config temporal sin BOM con PowerShell:

```powershell
$ConfigPath = "$env:TEMP\programar_videos_tiktok.json"
[System.IO.File]::WriteAllText($ConfigPath, $ConfigJson, [System.Text.UTF8Encoding]::new($false))
```

Ejecutar TikTok:

```powershell
node "C:\Users\oscar\.config\opencode\skills\book-tiktok-shorts\book_upload_tiktok.js" "$ConfigPath"
```

Ejecutar YouTube:

```powershell
node "C:\Users\oscar\.config\opencode\skills\book-youtube-shorts\book_upload.js" "$ConfigPath"
```

Antes de ejecutar con `dryRun: false`, asegurar Chrome con remote debugging si el script lo requiere. Nunca abrir ni automatizar Brave. Usar el perfil dedicado de Chrome Automation para CDP: `$env:LOCALAPPDATA\Google\Chrome\AutomationProfile`. Chrome normal puede abrir con login pero no exponer el puerto 9222; si el perfil AutomationProfile es nuevo, Oscar debe iniciar sesion ahi una vez.

```powershell
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
Start-Process -FilePath $chrome -ArgumentList "--remote-debugging-port=9222", "--user-data-dir=$env:LOCALAPPDATA\Google\Chrome\AutomationProfile", "https://studio.youtube.com" -WindowStyle Normal
```

Si Chrome AutomationProfile ya estaba abierto sin `--remote-debugging-port=9222`, pedir aprobacion antes de cerrarlo y reabrirlo con el puerto. Chromium no permite activar ese puerto en una instancia normal ya abierta.

## Confirmacion Final (por red)

Mostrar preview de la red actual antes de ejecutar:

```text
Plan: TikTok (red 1 de 2)

1. escarmiento_clip_005.mp4 -> Jun 06, 2026 10:00 AM
   Caption: Escarmiento 001

2. escarmiento_clip_006.mp4 -> Jun 07, 2026 10:00 AM
   Caption: Escarmiento 002
...

¿Apruebas este plan para abrir TikTok y programar?
```

Después de terminar la primera red, repetir el proceso completo para la segunda red (dry-run, confirmación, ejecución).

Si Oscar cambia algo, actualizar configs y repetir dry-run. Nunca continuar automaticamente.

## Resumen Final

Al terminar todas las redes, mostrar resumen:

```text
Programación completada:

TikTok: 8 videos programados (Jun 06 - Jun 13, 10:00 AM)
YouTube Shorts: 8 videos programados (Jun 06 - Jun 13, 10:00 AM)
```

## Reglas De Seguridad

- Ejecutar una red a la vez y un video a la vez.
- Si una red falla, preguntar si continuar con la siguiente red.
- Al cambiar de red, reutilizar Chrome AutomationProfile y navegar a la URL de la red siguiente si hace falta.
- No mezclar configs de distintas redes en un solo archivo JSON.
- Nunca hacer fallback a `Publicar`, `Publish`, `Crear`, `Create`, `Guardar` o `Save`.
- Si no se confirma visualmente `Programar` / `Schedule`, abortar.
- No borrar videos originales.
- Reportar progreso resumido: `Subiendo 2/8...`, `Programado: video3.mp4 -> Jun 06 6:00 PM`.
