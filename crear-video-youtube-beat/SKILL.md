---
name: crear-video-youtube-beat
description: Use when Oscar wants to crear/generar un video horizontal de YouTube desde un beat/audio (con o sin imagen). Si solo pasa audio, genera imagen automaticamente con IA (FLUX). Si pasa imagen o prompts, usa esos. Trigger for phrases like "hacer video youtube", "video youtube beat", "imagen beat", "generar video con este beat", "generar imagen con prompts", "prompts para imagen", "crea video de este beat", or when Oscar provides an audio path (solo o con imagen/prompts) for a full 1920x1080 YouTube video. This skill must stay separate from crear-shorts-audio and book-youtube-shorts.
---

# Crear Video YouTube Beat

Flujo para generar videos horizontales 1920x1080 para YouTube desde un beat/audio y una imagen fija. Usa logos Perpetuo Beats reales, siempre selecciona un overlay desde `D:\BackUpDisco\videos\para youtube uso libre\overlays`, waveform pequeño, zoom/movimiento sutil visible, efectos visuales suaves y render MP4 listo para subir. Este skill es solo para videos horizontales de YouTube, no Shorts.

## Separacion De Skills

- Usa este skill para videos horizontales 1920x1080 de YouTube.
- Usa `crear-shorts-audio` para Shorts/Reels/TikTok verticales.
- Usa `programar-videos` solo despues de generar el MP4, cuando Oscar quiera subir/programar.
- No mezcles este flujo con `book-youtube-shorts`; ese skill es para subir Shorts, no para crear el video horizontal.

## Flujo Obligatorio

No renderices directamente solo porque Oscar pego rutas. Primero confirma las decisiones clave con menus interactivos si la herramienta `question` esta disponible.

1. Detecta que recibiste de Oscar:
   - **Solo audio**: genera imagen automaticamente desde prompts por defecto (paso 2).
   - **Audio + ImagePath**: usa la imagen directamente (salta al paso 4).
   - **Audio + imagen random**: usa una imagen aleatoria de `D:\BackUpDisco\Inkscape\Youtube` con `-ImageMode random` (salta al paso 4).
   - **Audio + Prompts**: genera imagen desde los prompts dados (paso 3).
   - **Audio + Prompts + ImagePath**: prioriza ImagePath, omite prompts.

2. **Solo audio (generacion automatica por defecto)**:
   - Usa el script `scripts/generar_imagen_desde_prompt.ps1` con un prompt generado aleatoriamente combinando elementos de la seccion `Default Prompts` abajo.
   - Esto asegura que cada beat tenga una imagen unica con espacio central para logo, estilo gritty urbano/rap.
   - La imagen se guarda en `D:\BackUpDisco\Inkscape\Youtube`.
   - Continua en paso 4.

3. **Si pasa Prompts**:
   - Elige un prompt aleatorio del array.
   - Usa `scripts/generar_imagen_desde_prompt.ps1` con `-Prompts @(...)`.
   - El script usa Hugging Face y puede usar OpenAI como fallback si esta configurado.
   - La imagen se guarda en `D:\BackUpDisco\Inkscape\Youtube`.
   - Si no hay keys configuradas, muestra error con instrucciones para crear `~\.opencode\api_keys.json`.
   - Continua en paso 4.

4. **Imagen**: si Oscar paso ruta directa, valida que exista con `Test-Path`. Si pidio imagen random, usa `-ImageMode random` para elegir una imagen aleatoria de `D:\BackUpDisco\Inkscape\Youtube` (`png`, `jpg`, `jpeg`, `webp`). Si se genero automaticamente, ya esta validado.

   Si Oscar no paso ruta de imagen y no pidio generacion IA explicitamente, pregunta con menu: `Que imagen quieres usar?` Opciones: `Imagen random de Youtube`, `Generar imagen IA`, `Voy a pasar ruta`. La opcion recomendada es `Imagen random de Youtube`.

5. Pregunta con menu de seleccion multiple: `Que elementos visuales quieres agregar al video?`
   - `Logo(s) Perpetuo Beats` - uno o dos logos.
   - `Nombre del beat` - texto del nombre del beat, mismo tamano/posicion que los logos.
   - `Overlay visual` - una sola capa obligatoria desde `D:\BackUpDisco\videos\para youtube uso libre\overlays`; el tipo se elige despues o se usa random.
   - `Waveform pequeno` - onda reactiva centrada abajo.
   - `Nada extra, solo imagen + beat + overlay random`.
6. Segun la seleccion, pregunta solo lo necesario:
   - Si eligio logo(s): pregunta con menu multiple `Que logos quieres y cuantos?`: `Solo character`, `Solo texto`, `Character + texto alternados`, `Character + texto stacked`, `Character + nombre del beat`, `Texto + nombre del beat`, `Character + texto + nombre del beat`. Si eligio alternados, pregunta cada cuantos segundos cambia. Default recomendado: `8`.
   - Si eligio `Nombre del beat`: el texto se renderiza al mismo tamano/posicion que los logos, con fuente elegante (no Arial/Word). Usa `fonts\PlayfairDisplay-VariableFont_opsz\,wdth\,wght.ttf` o `fonts\Cinzel-VariableFont_wght.ttf` si existen; si no, pregunta a Oscar que fuente quiere o usa una fuente serif elegante disponible en el sistema (ej: `Times New Roman` con peso bold solo si no hay otra opcion).
   - Los logos `character` y `texto` deben renderizarse dentro del mismo canvas transparente para que se vean con el mismo tamaño/base visual al alternar.
   - No uses `Circle` salvo que Oscar lo pida explicitamente; por defecto el logo queda estatico.
   - Si eligio texto manual: pide el texto exacto o pregunta `Generar texto corto automatico`.
   - Overlay obligatorio: si eligio `Overlay visual`, pregunta `Que overlay quieres usar?` con `Random recomendado`, `Smoke/humo`, `Dust/polvo`, `Particles/particulas`, `Rain/lluvia`, `Snow/nieve`, `Light leak/destellos`. Si no eligio `Overlay visual`, usa `OverlayMode random`. Siempre toma un solo archivo de `D:\BackUpDisco\videos\para youtube uso libre\overlays`, muestra el nombre exacto antes de renderizar y no uses `OverlayMode none`.
   - Si eligio `Waveform pequeno`: pregunta estilo con `Random` como primera opcion, luego `cline suave`, `line clasica`, `point puntos`, `p2p agresiva`.
7. No preguntes de nuevo si quiere waveform/barra dinamica. La unica decision de waveform es la opcion `Waveform pequeno` del menu principal; si no la eligio, usa `WaveformStyle none`.
8. Pregunta render:
   - `Preview menor de 1 minuto` recomendado mientras se esta probando.
   - `Render completo`.
   - `Solo preparar comando`.
9. Muestra un resumen antes de ejecutar:
   - Beat/audio.
   - Imagen (si se genero desde prompts, indica que fue generada por IA).
   - Elementos elegidos.
   - Logo mode, logo style y segundos de alternancia si aplica.
    - Overlay/effect exacto por nombre siempre.
   - Texto si aplica.
   - Waveform/barra dinamica si aplica.
   - Fade in/out si aplica.
   - Output esperado.
10. Pide confirmacion final antes de correr ffmpeg.
11. Renderiza usando `scripts/generar_video_youtube_beat.ps1`.
12. Verifica el MP4 con `ffprobe`.
13. Despues de generar, pregunta si quiere subir/programar con `programar-videos`.

## Menu Visual De Seleccion Multiple

Usa `question` con `multiple: true` para esta pregunta:

```text
Que elementos visuales quieres agregar al video?
```

Opciones:

- `Logo(s) Perpetuo Beats` - uno o dos logos centrados.
- `Nombre del beat` - texto del nombre del beat, mismo tamano/posicion que los logos.
- `Overlay visual` - permite elegir despues una sola variante: smoke/humo, dust/polvo, particles/particulas, rain/lluvia, snow/nieve, light leak/destellos o random. Si no se selecciona, el skill usa overlay random igualmente.
- `Waveform pequeno` - onda reactiva centrada abajo.
- `Nada extra` - solo imagen + beat + un overlay random de la carpeta obligatoria, sin logo/texto/waveform.

Reglas:

- Si Oscar selecciona `Nada extra`, ignora las demas opciones y renderiza sin logo/texto/waveform, pero con un overlay random de `D:\BackUpDisco\videos\para youtube uso libre\overlays`.
- No mezcles tipos de overlay en el menu principal. `Humo`, `dust`, `particles`, `rain`, `snow` y `light leak` son opciones del submenu `Que overlay quieres usar?`, no opciones junto a logos o waveform.
- Siempre usa exactamente un overlay desde `D:\BackUpDisco\videos\para youtube uso libre\overlays`. Si Oscar elige overlay, muestra nombres concretos de archivos candidatos y usa solo el overlay elegido; si no elige overlay, selecciona uno random y muestra el nombre exacto antes de renderizar.
- No uses `bokeh`, `colored` ni `billowing` por defecto; Oscar los marco como invasivos/feos.
- Si Oscar eligio `Nombre del beat`, extrae automaticamente el nombre del archivo de audio (sin extension) y usalo como texto. No preguntes el texto a menos que Oscar quiera cambiarlo.
- Si Oscar eligio logo(s), pregunta con menu multiple: `Que logos exactamente?` con opciones detalladas abajo.
- Si Oscar elige `Waveform pequeno`, pregunta estilo una sola vez: `Random` primero, luego `cline suave`, `line clasica`, `point puntos`, `p2p agresiva`.
- Si Oscar no elige `Waveform pequeno`, no hagas otra pregunta sobre waveform y usa `none`.
- No hagas preguntas de titulo, descripcion o hashtags en esta etapa.
- Las preguntas de nombre, titulo, descripcion, hashtags y aprobacion solo aparecen si Oscar dice que quiere subir/programar a YouTube.

## Default Prompts (Solo Audio)

Cuando Oscar pasa solo un audio sin imagen ni prompts, genera la imagen automaticamente eligiendo una escena aleatoria de las siguientes. Cada escena incluye la base estilo + variacion + anti-IA.

**Base estilo (siempre incluida):**
```
gritty urban photography, realistic street culture, cinematic night atmosphere, authentic underground rap aesthetic, dark shadows, moody lighting, realistic textures, shallow depth of field, film grain, natural imperfections, emotional storytelling, documentary photography, no CGI, no fantasy, no illustration, highly realistic, professional photography
```

**Anti-IA look (siempre incluido al final):**
```
realistic photography, documentary photo, natural skin texture, imperfect composition, film grain, low saturation, authentic urban life, no CGI, no 3D render, no digital art, no illustration, no AI look, inspired by underground street photography, candid moment, raw realism, natural lighting, emotional atmosphere, urban loneliness, photojournalism style
```

**Escenas (elige UNA aleatoria):**

| # | Escena | Prompt de variacion |
|---|---|---|
| 1 | Callejón lluvioso | `lone hooded figure standing in a rainy alley at night, wet pavement reflecting street lights, graffiti walls, cigarette smoke, cinematic shadows, realistic urban photography, dark rap atmosphere, film grain, authentic street culture, moody black and blue tones, shallow depth of field, realistic lighting, negative space in center for logo` |
| 2 | Azotea de ciudad | `hooded figure standing on a rooftop overlooking a city at night, distant lights, cloudy sky, cinematic realism, lonely atmosphere, urban rap aesthetic, dark mood, realistic photography, subtle film grain, authentic streetwear, dramatic perspective, negative space in center for logo` |
| 3 | Bajo un puente | `young man walking under a concrete bridge at night, urban decay, streetlights creating long shadows, realistic street photography, gritty rap mood, dark atmosphere, natural imperfections, documentary style, cinematic realism, negative space in center for logo` |
| 4 | Estación de tren | `solitary figure waiting at an abandoned train station at night, foggy atmosphere, dim lights, realistic photography, underground rap aesthetic, melancholic mood, cinematic shadows, authentic urban environment, negative space in center for logo` |
| 5 | Barrio residencial | `young man leaning against a brick wall in a quiet neighborhood at night, distant streetlights, realistic urban photography, moody atmosphere, dark rap visual style, authentic street culture, film grain, cinematic realism, negative space in center for logo` |
| 6 | Escaleras metálicas | `hooded rapper sitting on a fire escape staircase, city lights behind him, realistic night photography, dramatic shadows, gritty urban aesthetic, cinematic composition, authentic streetwear, dark emotional mood, negative space in center for logo` |

**Construccion del prompt final:**
```
{BASE_ESTILO}, {VARIACION_ESCENA}, {ANTI_IA}, 16:9 landscape
```

**Output:** 1344×768 via FLUX.1-schnell en Hugging Face.

## Defaults

- Output: `D:\BackUpDisco\videos\para youtube uso libre`.
- Imagenes IA: `D:\BackUpDisco\Inkscape\Youtube`.
- Imagen random: `D:\BackUpDisco\Inkscape\Youtube`.
- Logo character: `D:\BackUpDisco\Inkscape\LOGOS PERPETUO BEATS\PNG SIN FONDO\COLOR 1\4000X4000-CHARACTER---PERPETUO-BEATS.png`.
- Logo texto: `D:\BackUpDisco\Inkscape\LOGOS PERPETUO BEATS\PNG SIN FONDO\COLOR TEXTO 1\500X500---TEXTO.png`.
- No guardes caches/duplicados en las carpetas de logos. Si necesitas cache, usa `%TEMP%`.
- Overlays: `D:\BackUpDisco\videos\para youtube uso libre\overlays`.
- Fuentes elegantes disponibles (preferir la primera que exista):
  - `C:\Windows\Fonts\PlayfairDisplay-VariableFont_opsz\,wdth\,wght.ttf`
  - `C:\Windows\Fonts\Cinzel-VariableFont_wght.ttf`
  - `C:\Windows\Fonts\CinzelDecorative-Regular.ttf`
  - `C:\Windows\Fonts\Garamond.ttf`
  - `C:\Windows\Fonts\Perpetua.ttf`
  - Si ninguna existe, pregunta a Oscar que fuente usar. No uses Arial, Calibri, Cambria, Times New Roman ni fuentes de Word a menos que Oscar lo autorice.
- Formato: 1920x1080, H.264, AAC, MP4.
- Preset recomendado: `faster`.
- CRF recomendado: `24` para archivo liviano; `22` si Oscar pide mas calidad.
- Mientras Oscar diga que esta probando, usa preview menor de 1 minuto. No renderices la cancion completa salvo aprobacion explicita.
- Fade recomendado: `5` segundos de entrada y salida. El fade afecta imagen/overlay, no logos; los logos pueden verse sobre negro durante la entrada/salida.

- Output: `D:\BackUpDisco\videos\para youtube uso libre`.
- Logo character: `D:\BackUpDisco\Inkscape\LOGOS PERPETUO BEATS\PNG SIN FONDO\COLOR 1\4000X4000-CHARACTER---PERPETUO-BEATS.png`.
- Logo texto: `D:\BackUpDisco\Inkscape\LOGOS PERPETUO BEATS\PNG SIN FONDO\COLOR TEXTO 1\500X500---TEXTO.png`.
- No guardes caches/duplicados en las carpetas de logos. Si necesitas cache, usa `%TEMP%`.
- Overlays: `D:\BackUpDisco\videos\para youtube uso libre\overlays`.
- Fuentes elegantes disponibles (preferir la primera que exista):
  - `C:\Windows\Fonts\PlayfairDisplay-VariableFont_opsz\,wdth\,wght.ttf`
  - `C:\Windows\Fonts\Cinzel-VariableFont_wght.ttf`
  - `C:\Windows\Fonts\CinzelDecorative-Regular.ttf`
  - `C:\Windows\Fonts\Garamond.ttf`
  - `C:\Windows\Fonts\Perpetua.ttf`
  - Si ninguna existe, pregunta a Oscar que fuente usar. No uses Arial, Calibri, Cambria, Times New Roman ni fuentes de Word a menos que Oscar lo autorice.
- Formato: 1920x1080, H.264, AAC, MP4.
- Preset recomendado: `faster`.
- CRF recomendado: `24` para archivo liviano; `22` si Oscar pide mas calidad.
- Mientras Oscar diga que esta probando, usa preview menor de 1 minuto. No renderices la cancion completa salvo aprobacion explicita.
- Fade recomendado: `5` segundos de entrada y salida. El fade afecta imagen/overlay, no logos; los logos pueden verse sobre negro durante la entrada/salida.

## Visual

Estructura base permanente:

- Mantén siempre el mismo timing/estructura general de render.
- Mantén siempre fade in y fade out de `5` segundos en la imagen/overlay. Los logos no deben depender de ese fade salvo que Oscar lo pida.
- Mantén siempre el zoom/pan de la foto con el ajuste actual: zoom centrado visible, pan simple horizontal y velocidad marcada. No vuelvas a pan X/Y cruzado.
- Mantén siempre la imagen del beat como fondo principal con movimiento; no renderices estático salvo que Oscar lo pida.
- Lo único que debe variar entre videos es el overlay/efecto y la configuración de logos/texto.

Elementos variables por video:

- Overlay/efecto: siempre debe ser un archivo de `D:\BackUpDisco\videos\para youtube uso libre\overlays`. Puede elegirse por tipo (`smoke`, `particles`, `rain`, `dust`, `snow`, `lightleak`) o random, pero siempre muestra el nombre exacto del archivo antes de renderizar. No uses `sin overlay`.
- Logos/texto: puede ser un logo, dos logos alternados, dos logos mas nombre/texto, solo texto, o solo imagen sin logos.
- Waveform: pregunta si va o no; si va, pregunta estilo con `Random` como primera opción.

Usa estos elementos por defecto:

- Imagen del beat como fondo principal.
- Si la imagen es horizontal, usa la imagen directa con zoom centrado visible y pan simple de un eje, sin duplicar foreground a pantalla completa. Evita pan X/Y cruzado porque puede sentirse como temblor. El zoom debe ser suficientemente rapido para notarse.
- Si la imagen es vertical/cuadrada, usa fondo blur + imagen centrada para evitar barras feas.
- Logo centrado estatico por defecto. No agregues movimiento al logo salvo que Oscar lo pida explicitamente.
- El logo nunca debe ser la imagen del beat. Usa solo los dos PNG reales de Perpetuo Beats.
- El character debe verse proporcionalmente mas grande que el texto si el PNG trae padding o se percibe pequeno; ahora usa canvas temporal de `421x421` frente al texto de `300x300`.
- Si se cambia el tamaño de logos, regenera siempre los caches temporales; no reutilices caches viejos porque ocultan el cambio visual.
- Modos de logo/texto:
  - `character`: solo character centrado.
  - `text`: solo texto centrado, un poco mas pequeno que antes.
  - `alternate`: character y texto alternan en la misma posicion cada X segundos con crossfade suave de 1 segundo.
  - `stacked`: character y texto juntos, solo si Oscar lo pide.
  - `character + nombrebeat`: character alterna con el nombre del beat en la misma posicion/tamano.
  - `text + nombrebeat`: logo texto alterna con el nombre del beat.
  - `character + text + nombrebeat`: los tres alternan en ciclo.
- Cuando el nombre del beat aparece como texto, usa la fuente elegante configurada en defaults, no Arial/Word. El tamano debe ser similar al de los logos para que no desentone al alternar.
- Waveform `showwaves` pequeno centrado abajo, no full width.
- Diseños de barra dinamica disponibles:
  - `cline`: linea curva/suave recomendada.
  - `line`: linea clasica mas directa.
  - `point`: puntos reactivos discretos.
  - `p2p`: onda mas agresiva tipo osciloscopio.
  - `random`: elige un estilo al azar entre `cline`, `line`, `point` y `p2p`.
  - `none`: sin barra dinamica.
- Overlay exacto por ruta si Oscar eligio un nombre; si no eligio, usa `-OverlayMode random`. `smoke_1967` queda permitido porque le gusto.
- Efectos leves: hue sutil, zoom centrado visible con pan simple, fade in/out general de 5 segundos solo en imagen/overlay y movimiento minimo. No sobrecargar.

## Titulos Y Metadata

No preguntes nada de titulos o metadata mientras solo se esta creando/renderizando el video. Si Oscar quiere subir/programar despues, crea propuesta de metadata antes de delegar:

- Titulo: `"BASE_NAME" | {descripcion corta random} (Perpetuo Beats)` max 100 caracteres.
- BPM: extrae del filename con patron `85 BPM`, `85_bpm`, etc.
- Descripcion: incluye nombre del beat, BPM, uso libre, Perpetuo Beats, hashtags.
- Muestra 3 opciones de titulo y espera eleccion antes de subir/programar.
- Muestra descripcion final y espera aprobacion antes de abrir/subir a YouTube.

## Configuracion De APIs Para Generar Imagenes

Para generar imagenes desde prompts, necesitas configurar al menos una API key. Por defecto usa Hugging Face; OpenAI queda como fallback opcional.

### Hugging Face (recomendado)
1. Ve a https://huggingface.co/settings/tokens
2. Crea un token con rol `read` (gratis, requiere cuenta)
3. Copia el token

### OpenAI (fallback opcional)
1. Crea una API key en OpenAI
2. Copia la key

### Archivo de configuracion
Crea `~\.opencode\api_keys.json` con este formato:
```json
{
  "huggingface": "hf_...",
  "openai": "sk-..."
}
```
Puedes tener solo `huggingface`. El script eligira entre Hugging Face y OpenAI si ambas estan disponibles, y hara fallback si una falla.

## Script De Render

Usa este script:

```text
C:\Users\oscar\.config\opencode\skills\crear-video-youtube-beat\scripts\generar_video_youtube_beat.ps1
```

Ejemplo:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\oscar\.config\opencode\skills\crear-video-youtube-beat\scripts\generar_video_youtube_beat.ps1" `
  -AudioPath "E:\2_Pistas-Muestreos-Maquetas\tropiezo 85 BPM guitarra.mp3" `
  -ImagePath "D:\BackUpDisco\Inkscape\rpn final .00_00_27_05.Imagen fija009.jpg.jpeg" `
  -LogoStyle breathing `
  -LogoDisplayMode alternate `
  -LogoSwitchSeconds 8 `
  -OverlayPath "D:\BackUpDisco\videos\para youtube uso libre\overlays\smoke_1967.mp4" `
  -WaveformStyle random `
  -FadeSeconds 5 `
  -Text "tropiezo 85 BPM guitarra" `
  -FontPath "C:\Windows\Fonts\PlayfairDisplay-VariableFont_opsz\,wdth\,wght.ttf" `
  -DurationMode preview `
  -PreviewSeconds 45
```

Ejemplo con imagen aleatoria desde `D:\BackUpDisco\Inkscape\Youtube`:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\oscar\.config\opencode\skills\crear-video-youtube-beat\scripts\generar_video_youtube_beat.ps1" `
  -AudioPath "E:\2_Pistas-Muestreos-Maquetas\tropiezo 85 BPM guitarra.mp3" `
  -ImageMode random `
  -LogoDisplayMode alternate `
  -OverlayMode random `
  -WaveformStyle p2p `
  -DurationMode preview `
  -PreviewSeconds 45
```

Para render completo cambia `-DurationMode full`.
Si Oscar no quiere logo, agrega `-NoLogo`.

## Validaciones

- No uses paths inventados.
- No uses `Remove-Item` para limpiar archivos incompletos; si existe output, crea nombre con timestamp.
- Si ffmpeg se corta por timeout, verifica con `ffprobe`. Si sale `moov atom not found`, el MP4 esta incompleto.
- Si el render tarda, usa timeout minimo de 10 minutos para canciones de 2-3 min.
- No uses overlays Restricted si Oscar pide uso comercial/monetizado; en ese caso usa solo overlays propios o Free desde la carpeta de overlays obligatoria.

## Frases Que Deben Activar Este Skill

- `hacer video youtube`
- `crear video youtube beat`
- `generar video con este beat`
- `crea video de este beat`
- `imagen beat` + ruta de imagen y audio
- `generar imagen con prompts` + prompts + audio
- `prompts para imagen`
- `video horizontal para youtube`
- `usa esta imagen con este mp3`
- `render youtube uso libre`
- `crea un video desde prompts`
- solo pasar un audio (sin imagen) → genera automaticamente

## Despues Del Render

Siempre termina con:

- Ruta del MP4 generado.
- Duracion, tamano y bitrate de `ffprobe`.
- Si se genero imagen desde prompts o auto: muestra el prompt usado y la API que lo genero.
- Overlay usado.
- Logo mode, logo style y segundos de alternancia si aplica.
- Texto usado, si aplica.
- Pregunta: `Quieres subir/programar este video a YouTube ahora?`
