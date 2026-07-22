---
name: enviar-whatsapp
description: Use when Oscar asks to enviar mensaje por WhatsApp, mandame esto por WhatsApp, avisame al celular, notificar por WhatsApp, mandame una palabra random en ingles, vocabulario C1 por WhatsApp, enviar video por WhatsApp, mandame el video, or send paths/results from generated videos, shorts, audios, APKs, reports, or completed tasks using CallMeBot and WhatsApp Web media sender.
---

# Enviar WhatsApp

Usa este skill cuando Oscar pida mandar un aviso, ruta, resumen, resultado o video por WhatsApp.

Tambien usalo cuando Oscar pida una palabra random de ingles, vocabulario C1, definicion, ejemplos bilingues, sinonimos, o una mini leccion por WhatsApp.

## Configuracion

El envio de texto usa CallMeBot con este helper local:

```text
C:\Users\oscar\.config\opencode\scripts\send-whatsapp.ps1
```

El helper lee estas variables de entorno de usuario:

```text
CALLMEBOT_PHONE
CALLMEBOT_APIKEY
```

No escribas el telefono ni la API key dentro de skills, scripts nuevos, prompts o logs salvo que Oscar lo pida explicitamente.

El envio de videos/adjuntos usa WhatsApp Web con este watcher:

```text
C:\Users\oscar\.config\opencode\whatsapp-video-sender
```

Outbox vigilado:

```text
D:\BackUpDisco\WhatsApp-outbox
```

Helper para poner archivos aprobados en cola:

```text
C:\Users\oscar\.config\opencode\scripts\queue-whatsapp-media.ps1
```

(El anterior `queue-whatsapp-video.ps1` solo aceptaba videos, no lo uses.)

## Uso

Para enviar un mensaje:

```powershell
& "C:\Users\oscar\.config\opencode\scripts\send-whatsapp.ps1" -Message "MENSAJE"
```

Para enviar un video aprobado por Oscar:

```powershell
& "C:\Users\oscar\.config\opencode\scripts\queue-whatsapp-video.ps1" -Path "RUTA_DEL_VIDEO.mp4"
```

El watcher debe estar corriendo en otra terminal:

```powershell
& "C:\Users\oscar\.config\opencode\scripts\start-whatsapp-video-sender.ps1"
```

La primera vez muestra QR; Oscar debe escanearlo con WhatsApp. La sesion queda guardada.

## Reglas

- Antes de enviar contenido no solicitado, pregunta a Oscar si quiere recibirlo por WhatsApp.
- Si Oscar dice claramente `si`, `sí`, `mandalo`, `envialo`, `whatsapp`, o `avisame`, envia el mensaje.
- Envia texto corto y util con CallMeBot: nombre del archivo, ruta local, estado, duracion, o link si existe.
- Para videos que Oscar indique enviar, usa `queue-whatsapp-video.ps1`. No lo uses automaticamente sin aprobacion.
- CallMeBot SOLO para texto. NUNCA lo uses para enviar archivos, imagenes, documentos, APKs, botones ni respuestas.
- Para enviar CUALQUIER archivo (videos, APKs, imagenes, audios) usa SIEMPRE el watcher de WhatsApp Web via `queue-whatsapp-media.ps1`.
- El watcher soporta: `.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`, `.apk`. Si falta una extension, actualiza `config.json` del watcher.
- No uses WhatsApp para secretos, API keys, tokens o credenciales.
- Si falla el envio, informa el error y conserva el resultado local.

## Archivos Y Adjuntos (WhatsApp Web)

Cuando Oscar diga `mandame el video`, `envialo por WhatsApp`, `mandamelo`, `manda ese mp4`, `manda el apk`, o apruebe recibir cualquier archivo:

1. Verifica que el archivo exista.
2. El watcher soporta: `.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`, `.apk`. Si no esta soportado, primero actualiza `config.json` del watcher.
3. Ejecuta:

```powershell
& "C:\Users\oscar\.config\opencode\scripts\queue-whatsapp-media.ps1" -Path "<ruta_del_archivo>"
```

4. Si el watcher no esta corriendo, iniciarlo con:

```powershell
& "C:\Users\oscar\.config\opencode\scripts\start-whatsapp-video-sender.ps1"
```

5. El watcher mueve enviados a `D:\BackUpDisco\WhatsApp-outbox\sent` y fallidos a `D:\BackUpDisco\WhatsApp-outbox\failed`.

No copies carpetas completas al outbox. Solo archivos aprobados.
Para APKs, prefiere usar el APK debug (ya firmado) sobre el release (no firmado).

## Palabras Random En Ingles

Cuando Oscar pida `palabra random`, `palabra C1`, `mandame vocabulario`, `palabra en ingles`, `definicion y ejemplos`, o algo parecido, envia una mini leccion corta por WhatsApp con este formato por defecto. Debe caber en un solo mensaje de CallMeBot.

Reglas:

- Si Oscar no especifica nivel, recomienda `C1`.
- Elige palabras utiles y frecuentes en vida real, conversaciones normales, trabajo, libros, articulos, entrevistas o contenido educativo.
- Evita palabras demasiado raras, arcaicas o poco utiles.
- Incluye `word`, `part of speech`, frecuencia practica y nivel CEFR en la primera linea.
- La definicion debe estar en ingles simple pero preciso, maximo 2 frases.
- No incluyas seccion `In Spanish` ni lista de traducciones separada.
- Incluye solo 1 ejemplo en ingles con traduccion al espanol.
- El ejemplo debe sonar natural y de vida real. No lo fuerces a QA, codigo o trabajo salvo que Oscar lo pida.
- Incluye maximo 2 sinonimos relacionados.
- Mantén formato legible para WhatsApp, con saltos de linea y secciones claras.
- No uses Markdown pesado.
- Usa iconos para que el mensaje no se vea frio. Si PowerShell 5.1 falla con emojis literales, genera el mensaje con codigos Unicode o usa el helper `send-english-word-whatsapp.ps1`.

Plantilla obligatoria:

```text
🎯 <word> - <part of speech> - <frequency> - <CEFR>

🧠 Meaning - <direct Spanish translation>

<English definition, 1-2 sentences. Explain the meaning and nuance naturally.>

✅ Example

🇺🇸 <natural real-life example>
🇪🇸 <natural translation>

🔄 Synonyms
<synonym 1>
<synonym 2>
```

Ejemplo de estilo:

```text
🎯 nuanced - adjective - Very common - C1

🧠 Meaning - con matices / matizado

Nuanced means having subtle differences or fine distinctions that make something more accurate, balanced, or sophisticated.

✅ Example

🇺🇸 Her opinion about the movie was nuanced; she liked the acting but disliked the ending.
🇪🇸 Su opinion sobre la pelicula tuvo matices; le gusto la actuacion, pero no le gusto el final.

🔄 Synonyms
subtle
sophisticated
```

## Plantillas

Resultado de video:

```text
Video listo:
<ruta_del_video>
```

Tanda de videos:

```text
Tanda lista: <cantidad> videos
Carpeta: <ruta_de_carpeta>
```

APK:

```text
APK listo:
<ruta_del_apk>
```

Tarea terminada:

```text
Tarea terminada: <resumen corto>
Resultado: <ruta_o_estado>
```
