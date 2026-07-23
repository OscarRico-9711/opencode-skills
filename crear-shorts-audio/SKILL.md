---
name: crear-shorts-audio
description: Use when Oscar wants to generar tandas de shorts/reels/TikToks desde una pista o canción usando imagenes Perpetuo Beats o imagen generada con IA, movimiento/zoom cinematografico igual al skill de videos YouTube de pistas, waveform reactiva, grano/VHS aleatorio sutil, efectos leves al beat, textos dinamicos por tiempo, subtítulos solo si los pide, o subir/programar a redes sociales.
---

# Crear Shorts Con Audio

Workflow para convertir audio en tandas de videos verticales listos para TikTok/Shorts usando imagen de carpeta Perpetuo Beats o imagen generada con IA, movimiento/zoom cinematografico igual al skill de videos YouTube de pistas, waveform minimalista reactiva al beat, grano/VHS aleatorio sutil, efectos leves al beat, textos dinamicos cuando aplica y opción de subir/programar después a redes sociales.

## Cuándo Usar

Usa este skill cuando Oscar diga cosas como:

- "vuelve esta imagen video"
- "haz un short con esta pista"
- "corta esta canción en partes"
- "sube esto a TikTok y busca la canción"
- "haz shorts de 20, 30 o 50 segundos"
- "pon subtítulos de la canción"
- "imagen con blur y texto"
- "videos en masa con texto y pista"
- "beat free, deja una rima"
- "agrega una frase arriba"

## Herramientas Existentes Que Debes Reutilizar

| Necesidad | Reutilizar |
|---|---|
| Render base simple | `C:\Users\oscar\OneDrive\Escritorio\make-short.ps1` solo si mantiene onda reactiva; si fuerza onda fija, usa `ffmpeg` directo |
| Subtítulos karaoke palabra por palabra | `C:\Users\oscar\.config\opencode\skills\agregar-subtitulos\add_subtitles_tiktok.py` |
| Generar imagen IA para shorts | `C:\Users\oscar\.config\opencode\skills\crear-video-youtube-beat\scripts\generar_imagen_desde_prompt.ps1` usando keys ya configuradas en `~\.opencode\api_keys.json` |
| Cortar/dividir videos o canciones | Patrones del skill `cortar-videos` |
| Subir/programar a TikTok | `C:\Users\oscar\.config\opencode\skills\book-tiktok-shorts\book_upload_tiktok.js` |
| Orquestar redes sociales | Skill `programar-videos` |

No reinventes estas piezas salvo que haya una razón concreta. Para la plantilla Perpetuo Beats, usa `ffmpeg` directo si `make-short.ps1` fuerza subtítulos o waveform gigante.

## Imagenes Para Shorts

Cuando Oscar pida generar shorts desde audio y no indique una imagen concreta, no elijas la carpeta automaticamente. Primero pregunta siempre:

```text
¿Imagen para los shorts?
```

Opciones:

- `Seleccionar de carpeta Perpetuo Beats` - usa una o varias imagenes del stock de abajo.
- `Generar imagen con IA` - usa `generar_imagen_desde_prompt.ps1` con las keys ya configuradas en `~\.opencode\api_keys.json`.
- `Te paso imagen` - Oscar entrega una ruta exacta.
- `Sin imagen` - solo visual simple/audio.

Si elige carpeta, usa el stock Perpetuo Beats como banco de imágenes. Por defecto no generes un único video: pregunta cuántos shorts quiere o si quiere usar todas las imágenes del stock. Cada short debe usar una imagen distinta de esta lista hasta agotar la cantidad elegida:

```text
D:\BackUpDisco\Inkscape\perpe22.png
D:\BackUpDisco\Inkscape\perpe1.png
D:\BackUpDisco\Inkscape\perpe2.png
D:\BackUpDisco\Inkscape\perpe3.png
D:\BackUpDisco\Inkscape\perpe4.png
D:\BackUpDisco\Inkscape\perpe5.png
D:\BackUpDisco\Inkscape\perpe6.png
D:\BackUpDisco\Inkscape\perpe7.png
D:\BackUpDisco\Inkscape\perpe8.png
D:\BackUpDisco\Inkscape\perpe9.png
D:\BackUpDisco\Inkscape\perpe10.png
D:\BackUpDisco\Inkscape\perpe11.png
D:\BackUpDisco\Inkscape\perpe12.png
D:\BackUpDisco\Inkscape\perpe13.png
D:\BackUpDisco\Inkscape\perpe14.png
D:\BackUpDisco\Inkscape\perpe15.png
D:\BackUpDisco\Inkscape\perpe16.png
D:\BackUpDisco\Inkscape\perpe17.png
D:\BackUpDisco\Inkscape\perpe18.png
D:\BackUpDisco\Inkscape\perpe19.png
D:\BackUpDisco\Inkscape\perpe20.png
D:\BackUpDisco\Inkscape\perpe21.png
```

Reglas por defecto:

- No generes fondo sólido.
- No generes un solo video por defecto si hay stock de imágenes; el flujo normal es una tanda con un video por imagen elegida.
- No uses waveform gigante.
- Por defecto anima la imagen con el mismo zoom/movimiento configurado en `crear-video-youtube-beat`: zoom centrado visible, pan simple de un solo eje, velocidad marcada y sin pan X/Y cruzado. La imagen no debe quedar estatica salvo que Oscar lo pida.
- No uses grano por defecto: si no se nota claramente, solo agrega peso al archivo. VHS/grano queda como opcion manual si Oscar lo pide.
- Agrega pocos efectos leves sincronizados al beat por video cuando sea posible. Usa el banco de efectos disponibles y combina solo algunos por video; deben ser aleatorios y espaciados, no cada segundo ni en todos los golpes.
- Genera la onda desde el audio real con `showwaves`, para que se mueva acorde al golpe/transientes del beat.
- No uses la onda fija transparente `wave_minimal_gold_50s.mov` por defecto; solo úsala como fallback si `showwaves` falla o si Oscar pide una onda estándar fija.
- No agregues subtítulos/Whisper salvo que Oscar lo pida explícitamente.
- Pregunta por textos cortos para enganchar comentarios, salvo que Oscar diga explícitamente que no quiere texto.
- Cada video debe llevar un texto diferente cuando se elige texto o textos aleatorios.
- Si Oscar pasa un listado de frases, asigna una frase distinta por video cuando sea posible; si hay menos frases que videos, avisa y recicla sin repetir consecutivamente.
- Si Oscar no pasa listado, ofrece crear frases cortas random tipo rap/beat y muéstralas antes de renderizar.
- Coloca el texto adicional preferiblemente abajo, a una distancia similar del borde inferior como antes se usaba arriba, pero un poco subido para no quedar pegado al borde. Evita la parte superior cuando la imagen ya tenga texto/logo Perpetuo Beats. Varía al azar entre unas pocas fuentes y colores seguros.
- En beats sin subtitulos, si se elige texto adicional, hazlo dinamico: cambia cada 3 o 5 segundos segun duracion y cantidad de frases disponibles.
- La onda reactiva debe ir pequeña, sin caja/fondo, en una zona libre detectada por criterio visual: debajo del logo si el centro esta libre, mas abajo si el texto de la imagen esta en el medio, o mas arriba si la parte baja ya esta cargada. No fuerces siempre la misma posicion.

### Generacion IA De Imagenes

Si Oscar elige `Generar imagen con IA`:

- Reutiliza `C:\Users\oscar\.config\opencode\skills\crear-video-youtube-beat\scripts\generar_imagen_desde_prompt.ps1`.
- No pidas API key si ya existe `~\.opencode\api_keys.json`; usa las keys configuradas. El script elige entre Gemini, HuggingFace u OpenAI segun disponibilidad.
- Guarda las imagenes en `D:\BackUpDisco\Inkscape\Youtube` salvo que Oscar indique otra carpeta.
- Para shorts, llama el script con `-Width 1024 -Height 1792` para pedir imagen vertical `9:16`. Si la API devuelve otro aspect ratio, recorta con el filtro vertical del render.
- Pregunta si quiere `Prompt automatico recomendado` o `Te paso prompt`.
- Para prompt automatico, usa el estilo gritty urbano/rap realista del skill `crear-video-youtube-beat`, adaptado a vertical `9:16`, con espacio libre para texto/onda y sin look IA.
- Si se generan varios shorts, puedes generar una imagen IA por short o una sola imagen para toda la tanda; pregunta cuál prefiere antes de renderizar.
- Muestra el prompt usado y la ruta de la imagen generada antes de renderizar.

## Flujo Conversacional Obligatorio

Sigue este orden para evitar asumir duración, cantidad o textos:

- Usa siempre menús interactivos para elegir entre opciones cuando la herramienta lo permita. No escribas opciones solo como texto plano si puedes presentarlas como botones/lista interactiva.
- Usa preguntas abiertas únicamente cuando Oscar tenga que escribir una ruta, una cantidad personalizada, una frase exacta o un listado de textos.

1. Recibe o pide el beat/audio.
2. Pregunta el origen de imagen como pregunta propia: `Seleccionar de carpeta Perpetuo Beats`, `Generar imagen con IA`, `Te paso imagen`, `Sin imagen`.
3. Si elige IA, pregunta `Prompt automatico recomendado` o `Te paso prompt`; si va a crear varios shorts, pregunta si quiere `Una imagen IA para toda la tanda` o `Una imagen IA distinta por short`.
4. Pregunta la duración de cada short como pregunta propia: `20 segundos`, `30 segundos`, `50 segundos`, `Toda la canción`, `Dividir en partes`.
5. Pregunta la cantidad de shorts como pregunta propia: `10`, `Todas las imágenes del stock`, `Otra cantidad`. Si eligio IA, adapta esta pregunta a cantidad de shorts, no a cantidad de imagenes del stock.
6. Pregunta textos como pregunta propia: `Sin texto`, `Te paso listado`, `Generar textos aleatorios pequeños`, `Usar una frase base variada`.
7. Si se generan textos aleatorios o variaciones, muestra la lista exacta de textos antes de renderizar y espera confirmación. Para beats sin subtitulos, genera suficientes textos para rotarlos cada 3 o 5 segundos dentro de cada video.
8. Renderiza una tanda: un video por imagen elegida/generada, con texto diferente por video si aplica.
9. Después de generar y verificar los archivos, pregunta si quiere recibir un aviso por WhatsApp con la carpeta/rutas de salida.
10. Si Oscar dice que sí, encola el video con `C:\Users\oscar\.config\opencode\scripts\queue-whatsapp-media.ps1` y arranca el watcher. CallMeBot solo se usa para palabras diarias, no para archivos ni resultados.
11. Después pregunta si quiere subir/programar a redes sociales: TikTok, YouTube Shorts, ambas o solo conservar archivos.

## Preguntas Iniciales

Si faltan datos, pregunta en bloque cuando sea posible, pero mantén duración, cantidad y textos como decisiones separadas:

Presenta estas preguntas como menús interactivos siempre que haya opciones cerradas. Si una opción requiere texto libre, primero usa el menú y luego pide el valor exacto.

1. `Pásame el audio/canción.`
2. `¿Imagen para los shorts?` Opciones: `Seleccionar de carpeta Perpetuo Beats`, `Generar imagen con IA`, `Te paso imagen`, `Sin imagen`.
3. Si elige IA: `¿Prompt para la imagen?` Opciones: `Prompt automatico recomendado`, `Te paso prompt`.
4. Si elige IA y pide varios shorts: `¿Imagen IA para la tanda?` Opciones: `Una imagen IA para toda la tanda`, `Una imagen IA distinta por short`.
5. `¿Duración de cada short?` Opciones: `20 segundos`, `30 segundos`, `50 segundos`, `Toda la canción`, `Dividir en partes`.
6. `¿Cuántos shorts quieres?` Opciones: `10`, `Todas las imágenes del stock`, `Otra cantidad`. Solo ofrece `Todas las imágenes del stock` si eligio carpeta Perpetuo Beats.
7. Si divide: `¿En cuántas partes?` Opciones: `2`, `3`, `4`.
8. `¿Textos para los videos?` Opciones: `Sin texto`, `Te paso listado`, `Generar textos aleatorios pequeños`, `Usar una frase base variada`.
9. `¿Subtítulos?` Opciones: `No`, `Sí karaoke TikTok`.
10. Si pide subtítulos: `¿Modelo Whisper?` Opciones: `small recomendado`, `medium más preciso`, `base rápido`.
11. `¿Estilo visual?` Opciones: `Perpetuo clasico`, `Zoom cinematografico`, `Random visual recomendado`, `Cancion con subtitulos`.

No preguntes destino principal antes de generar salvo que Oscar lo pida. La pregunta de redes va después de tener los archivos generados y verificados.

Si elige listado, pide las frases separadas por líneas. Si elige una frase base variada, pide el texto base y genera variaciones cortas. Si elige textos aleatorios o no entrega otro listado, usa como base el banco de textos de Oscar, crea una lista con varias frases por video cuando aplique texto dinamico y muéstrala para aprobación antes de renderizar. Corrige tildes, mayúsculas y errores leves antes de quemar el texto en el video.

Banco base de textos de Oscar:

```text
¿Quieres este beat?
Beat free
Uso libre
¿Quién la quiere?
Hasta llegar a los raperos correctos
¿Sabes escribir?
Deja una rima en los comentarios
Envíame tu música
Deja tu música en comentarios
Envíame tu canal de YouTube
¿Haces música?
```

Después de generar y verificar los videos, pregunta:

```text
¿Quieres que te mande por WhatsApp la carpeta/rutas de los videos generados?
```

Si dice sí, encola el primer video con:

```powershell
& "C:\Users\oscar\.config\opencode\scripts\queue-whatsapp-media.ps1" -Path "<ruta_del_primer_video>"
& "C:\Users\oscar\.config\opencode\scripts\start-whatsapp-video-sender.ps1"
```

Despues pregunta:

```text
¿Quieres subir/programar estos videos a TikTok, YouTube Shorts, ambas o solo conservar los archivos?
```

Para TikTok, si Oscar quiere subir/programar, pregunta después:

```text
¿Quieres buscar una canción/audio de la librería de TikTok?
```

Si dice sí, pregunta:

```text
¿Con qué nombre busco la canción/audio en TikTok?
```

Opciones sugeridas:

- Nombre exacto que diga Oscar
- `{nombre base de canción} Perpetuo Beats`
- `Sin canción/audio de TikTok`

No derives automáticamente el sonido desde el archivo sin preguntar, porque TikTok puede mostrar resultados incorrectos.

## Cantidad De Videos

Antes de renderizar, define la cantidad independientemente de la plataforma:

- Si Oscar elige carpeta y `Todas las imágenes del stock`, genera un video por cada imagen Perpetuo Beats disponible.
- Si Oscar elige carpeta y `10`, genera 10 videos usando 10 imágenes distintas.
- Si Oscar elige carpeta y otra cantidad, usa esa cantidad de imágenes distintas; si pide más que el stock, avisa y recicla imágenes solo con aprobación.
- Si Oscar elige IA, la cantidad controla cuántos shorts se generan. Usa una imagen IA para toda la tanda o una distinta por short según su respuesta.
- Para TikTok, el límite de programación puede ser 10 videos/días, pero eso no debe limitar la generación de archivos. Genera la tanda pedida y, si luego quiere TikTok, avisa que se puede programar en tandas de 10.

## Flujo De Render

### Caso A: Tanda De Shorts 20/30/50 Segundos

Para la plantilla Perpetuo Beats o imagen IA, renderiza un MP4 por imagen seleccionada/generada usando `ffmpeg` directo. La imagen debe llevar el zoom/pan del skill `crear-video-youtube-beat`, adaptado a vertical:

```powershell
ffmpeg -y -loop 1 -i "<IMAGEN_SELECCIONADA_O_IA>" -i "<AUDIO>" `
  -filter_complex "[0:v]fps=30,scale=w='1080*(1+0.42*min(t\,<DURACION>)/<DURACION>)':h='1920*(1+0.42*min(t\,<DURACION>)/<DURACION>)':force_original_aspect_ratio=increase:eval=frame,crop=1080:1920:(iw-ow)/2:(ih-oh)/2,format=rgba[bg];[1:a]showwaves=s=540x90:mode=line:rate=30:colors=#c8a46a:scale=sqrt,format=rgba,colorkey=0x000000:0.18:0.08[wave];[bg][wave]overlay=(W-w)/2:950[v]" `
  -map "[v]" -map 1:a -c:v libx264 -preset medium -c:a aac -b:a 192k `
  -t 30 -pix_fmt yuv420p -shortest -movflags +faststart "<OUTPUT>"
```

Si se necesita texto adicional, añade `drawtext` después del overlay, con fuente pequeña y sin ocupar el centro de la imagen, el logo ni la onda. En beats sin subtitulos no uses un solo texto fijo para todo el video salvo que Oscar lo pida: rota frases cada 3 o 5 segundos con `enable='between(t,start,end)'`. Por defecto ubica este texto abajo, alrededor de `y=h-360` a `y=h-280`, ajustando si tapa elementos de la imagen.

Aplica el movimiento del skill `crear-video-youtube-beat` en el fondo antes de la onda: zoom centrado visible, velocidad marcada, pan simple de un solo eje cuando haya margen, y nunca pan X/Y cruzado. La imagen debe seguir viendose como portada/branding, no como efecto exagerado.

En cada video elige al azar pocos detalles visuales, no todos juntos:

- micro-flash o glow breve en algunos golpes fuertes; debe notarse sin molestar
- micro-zoom de 1-3 frames en golpes seleccionados
- variacion pequena de color/contraste si combina con la imagen

No apliques flash/glow y zoom fuerte todos a la vez. Si el video ya tiene subtitulos o mucho texto en la imagen, usa menos efectos. Grano/VHS solo si Oscar lo pide explicitamente.

### Caso B: Toda La Canción

Primero obtén la duración con `ffprobe`. Si dura más de 60 segundos, advierte que TikTok/Shorts puede no ser ideal y ofrece dividir en partes.

Si Oscar confirma usar toda, genera un video completo con la misma lógica que `make-short.ps1`. Si el script solo permite `20/30/50`, crea un script temporal en `C:\Users\oscar\AppData\Local\Temp\opencode` adaptando la duración exacta. No edites permanentemente `make-short.ps1` solo para este caso.

Cuando sea una cancion con voz y subtitulos, no uses textos dinamicos cada 3/5 segundos porque competirian con los subtitulos. Mantén la imagen con zoom muy leve, algun grano/filtro aleatorio suave, y efectos al beat muy moderados para que la letra siga siendo legible.

### Caso C: Dividir Canción En 2/3/4 Partes

Genera partes independientes. Cada parte debe tener:

- audio cortado a su rango real
- video vertical 1080x1920
- imagen Perpetuo Beats de carpeta, imagen IA generada o imagen indicada por Oscar
- waveform minimalista reactiva al beat debajo del logo/texto de la imagen
- texto corto adicional si aplica
- subtítulos generados solo para ese segmento si Oscar los pide
- si hay subtitulos, evita texto dinamico extra y reduce efectos visuales para no tapar la letra
- nombre claro: `<base>_part_001.mp4`, `<base>_part_002.mp4`, etc.

Usa `ffprobe` para duración total y calcula rangos:

```text
parteDuracion = totalDuracion / cantidadPartes
parte 1: 0 -> parteDuracion
parte 2: parteDuracion -> parteDuracion*2
...
```

Para evitar subtítulos desfasados, corta primero el audio de cada parte y luego genera cada video/subtítulo desde ese audio segmentado. No generes subtítulos de la canción completa y luego cortes el video, porque los timestamps podrían quedar incómodos.

## Visuales

### Plantilla Perpetuo Beats O IA

La preferencia de Oscar es imagen Perpetuo Beats o imagen IA a pantalla completa, sin blur adicional, con waveform mínimo y zoom visible:

```text
fps=30,scale=w='1080*(1+0.42*min(t\,DURACION)/DURACION)':h='1920*(1+0.42*min(t\,DURACION)/DURACION)':force_original_aspect_ratio=increase:eval=frame,crop=1080:1920:(iw-ow)/2:(ih-oh)/2
[audio]showwaves=s=540x90:mode=line:rate=30:colors=#c8a46a:scale=sqrt
overlay=(W-w)/2:950
```

Las imágenes actuales son 941x1672 y escalan bien a 1080x1920. Las imagenes IA deben generarse o recortarse pensando en vertical `9:16`, con espacio libre para onda/texto. La onda debe reaccionar al volumen/transientes del audio, quedar debajo del logo o en zona libre, no abajo del video ni ocupando media pantalla.

### Movimiento/Zoom Igual A Videos YouTube De Pistas

Por defecto, anima la imagen con el mismo criterio configurado en `crear-video-youtube-beat`:

- zoom centrado visible durante todo el short, no estatico
- velocidad marcada; no uses un zoom tan leve que parezca imagen fija
- pan simple horizontal o vertical de un solo eje solo si no corta textos/logos importantes
- no vuelvas a pan X/Y cruzado porque puede sentirse como temblor
- sin rotaciones fuertes
- sin deformar la imagen
- mantener el arte reconocible como imagen Perpetuo Beats o imagen IA del beat

Filtro base recomendado para shorts verticales, adaptado del skill YouTube:

```text
[0:v]fps=30,scale=w='1080*(1+0.42*min(t\,DURACION)/DURACION)':h='1920*(1+0.42*min(t\,DURACION)/DURACION)':force_original_aspect_ratio=increase:eval=frame,crop=1080:1920:(iw-ow)/2:(ih-oh)/2,format=rgba[bg]
```

Si hay margen suficiente para pan simple, puede ajustar solo `x` o solo `y` del crop. No animes ambos ejes a la vez.

VHS/grano no debe usarse por defecto:

- solo usalo si Oscar lo pide explicitamente
- si se usa, intensidad baja/media y cuidando el peso final
- evita VHS/grano cuando la imagen ya sea oscura o tenga texto pequeño dificil de leer
- si hay subtitulos, no uses grano salvo pedido explicito

### Onda Segun La Imagen

Como las imagenes son parecidas pero no tienen el texto en el mismo lugar, no fijes una unica posicion de onda para todos los videos. Recomendacion:

- si el centro esta limpio, coloca la onda pequena debajo del logo o texto principal
- si hay texto en el medio, baja la onda hacia una zona libre pero sin pegarla al borde inferior
- si la parte baja esta cargada, sube la onda a una zona libre superior/media
- si la imagen ya tiene mucho texto, usa onda mas fina o mas transparente
- si hay subtitulos karaoke, la onda debe quedar lejos del area de subtitulos o directamente mas pequena

Estilos de onda permitidos segun la imagen:

- `linea fina dorada`: opcion segura por defecto
- `barras pequenas`: usar cuando la imagen tiene espacio horizontal limpio
- `onda mas transparente`: usar cuando hay mucho texto o logo cerca
- `sin onda`: valido si la imagen, subtitulos o texto dinamico ya cargan demasiado el video

No uses onda circular ni waveform grande salvo que Oscar lo pida especificamente, porque puede tapar textos o logos en las imagenes Perpetuo.

### Efectos Leves Al Beat

Cuando sea posible, agrega efectos suaves tomando como referencia golpes/transientes del audio. Deben ser pocos, random y espaciados por video:

- micro-zoom corto en algunos kicks
- zoom respirando durante todo el video
- movimiento suave izquierda/derecha para que la imagen no esté estática
- vibración leve solo en drops o golpes fuertes
- subida corta de saturación/contraste en momentos seleccionados
- luz pasando, como barrido suave diagonal u horizontal
- partículas suaves si se notan y no hacen pesado el archivo
- barras reactivas pequeñas al audio como alternativa random a la onda de línea, en la misma zona
- light leak sutil en secciones cortas
- chromatic aberration leve solo en golpes/drops o transiciones, nunca como tinte sostenido. Debe durar fracciones de segundo y no cambiar el tono general de la imagen.
- flash suave de opacidad baja/media, visible pero no agresiva
- glow breve alrededor de la imagen/texto

No sincronices efectos en todos los golpes ni cada segundo. Prioriza que el video se sienta vivo sin parecer editado de forma exagerada.

### Combinacion Random De Efectos

No pongas todos los efectos en un mismo video. Para cada salida, elige al azar un paquete visual coherente de maximo 4 o 5 efectos, contando siempre el movimiento base como uno de ellos. Si el video tiene subtitulos, usa maximo 2 o 3 efectos suaves.

Efectos base recomendados para casi todos los beats:

- zoom respirando
- movimiento lateral suave

Efectos extra para elegir al azar:

- micro-zoom al beat
- vibración leve en drops
- subida corta de saturación/contraste
- luz pasando
- partículas suaves
- light leak
- chromatic aberration leve, muy corto y sin alterar el color base
- flash suave
- glow breve
- barras reactivas en vez de línea waveform

Paquetes sugeridos que combinan bien:

- `cinematico limpio`: zoom respirando, movimiento lateral, micro-zoom al beat, subida leve de contraste
- `luz suave`: zoom respirando, movimiento lateral, luz pasando, light leak, glow breve
- `beat reactivo`: zoom respirando, movimiento lateral, barras reactivas, micro-zoom al beat, flash suave espaciado
- `drop fuerte`: zoom respirando, movimiento lateral, vibración leve en drops, chromatic aberration muy breve, contraste corto
- `atmosferico`: zoom respirando, movimiento lateral, partículas suaves, light leak, onda fina

Reglas de mezcla:

- no combines vibración fuerte, chromatic aberration y flashes frecuentes en el mismo video
- si chromatic aberration genera tinte verde/rojo/azul sostenido, descartalo y usa micro-zoom o flash suave en su lugar
- no implementes chromatic aberration mezclando canales de forma que el canal verde/rojo/azul quede dominante fuera del golpe
- si usas barras reactivas, no uses onda de línea al mismo tiempo salvo que Oscar lo pida
- si usas partículas, mantenlas suaves y revisa peso final
- si usas light leak, evita saturación fuerte al mismo tiempo
- si la imagen tiene mucho texto, evita chromatic aberration y vibración
- si el video lleva subtitulos, prioriza legibilidad y evita partículas, vibración y aberración salvo que sean muy leves

No vuelvas a usar una onda estándar/fija como opción principal. Si por compatibilidad necesitas fallback fijo, usa este overlay solo como último recurso:

```powershell
ffmpeg -y -f lavfi -i "anoisesrc=color=pink:amplitude=0.18:duration=50,highpass=f=180,lowpass=f=2200" `
  -filter_complex "showwaves=s=540x90:mode=line:rate=25:colors=#c8a46a,format=rgba,colorkey=0x000000:0.18:0.08" `
  -an -c:v qtrle -pix_fmt argb "D:\BackUpDisco\videos\plantillas\wave_minimal_gold_50s.mov"
```

### Sin Imagen

Genera visual simple basado en el audio:

```text
fondo oscuro + showwaves pequeño
```

No busques generar arte complejo salvo que Oscar lo pida. Para producción masiva, prioriza estabilidad y velocidad.

## Subtítulos

No uses subtítulos por defecto. Solo usa subtítulos automáticos tipo TikTok si Oscar lo pide explícitamente:

```powershell
python "C:\Users\oscar\.config\opencode\skills\agregar-subtitulos\add_subtitles_tiktok.py" `
  "<VIDEO_BASE>" `
  --model small `
  --language es `
  --highlight-color amarillo `
  --print-ass
```

Si Whisper no detecta palabras, no falles todo el flujo. Guarda el video sin subtítulos y explica que probablemente es instrumental o que la voz no fue detectada.

Para batch masivo, recomienda `small`. Para mejor precisión, usa `medium`.

### Canciones Con Subtitulos

Cuando el flujo sea para una cancion con voz y Oscar pida subtitulos:

- no agregues texto dinamico cada 3/5 segundos
- no agregues frases tipo `Beat free` encima de los subtitulos
- usa zoom cinematografico muy leve para que la imagen no quede estatica
- aplica grano/VHS solo si es muy suave y no afecta la lectura
- aplica efectos al beat de forma esporadica y con baja intensidad
- evita flashes fuertes porque dificultan leer la letra
- deja la prioridad visual en subtitulos, cara/arte/branding y legibilidad

Si se divide la cancion en partes, cada parte puede tener una variacion visual leve distinta, pero conserva coherencia para que parezcan de la misma campaña.

## Texto Corto Adicional

En shorts de beats con imagen Perpetuo, pregunta por un texto corto adicional para incentivar comentarios o interacción. No lo trates como subtítulo: es una frase breve tipo llamada a la acción.

Opciones válidas:

- `Sin texto`: no agregues frase.
- `Te paso listado`: Oscar entrega varias frases y debes elegir una random por video.
- `Crear frases random`: inventa frases cortas estilo rap/beat.
- `Usar esta frase`: repite la frase exacta que indique Oscar.

Banco base de textos de Oscar para frases random:

```text
¿Quieres este beat?
Beat free
Uso libre
¿Quién la quiere?
Hasta llegar a los raperos correctos
¿Sabes escribir?
Deja una rima en los comentarios
Envíame tu música
Deja tu música en comentarios
Envíame tu canal de YouTube
¿Haces música?
```

Mantén las frases cortas, legibles y naturales. Evita textos largos o frases que tapen el diseño.

En beats sin subtitulos, el texto adicional puede ser dinamico:

- para videos de 20 segundos, usa 4 a 6 textos si hay suficientes frases
- para videos de 30 segundos, usa 6 a 10 textos si hay suficientes frases
- para videos de 50 segundos, usa 10 a 16 textos si hay suficientes frases
- cambia cada 5 segundos por defecto
- usa cada 3 segundos solo si las frases son muy cortas y el ritmo visual lo permite
- no repitas la misma frase consecutivamente
- si Oscar entrega pocas frases, recicla sin repetir consecutivamente y avisa si la tanda queda limitada
- varia al azar entre 2 o 3 fuentes legibles disponibles en Windows, como Arial Bold, Impact o Bahnschrift, si existen
- varia colores entre pocos tonos seguros: blanco, dorado suave y amarillo crema; evita colores que choquen con la marca

El texto dinamico debe entrar/salir con fade o aparecer limpio; evita animaciones grandes que compitan con la imagen y la onda.

Si hay subtítulos, evita poner texto estático en el mismo lugar. Recomendación:

- texto adicional arriba o en una zona libre fija
- subtítulos karaoke centrados por el script `.ass`
- en canciones con subtitulos, normalmente no agregues texto adicional salvo que Oscar lo pida explicitamente

## Subida A TikTok Con Canción De Librería

Reutiliza `book-tiktok-shorts` / `programar-videos`.

La config de TikTok puede incluir:

```json
{
  "videos": ["D:\\ruta\\video1.mp4"],
  "captions": ["Caption 001 #rapbeat #boombap #hiphopbeats #lofi #beats"],
  "scheduleType": "daily",
  "time": "6:00 PM",
  "startDate": "Jun 15, 2026",
  "addSoundToVideo": true,
  "soundSearchTerm": "Nombre de la cancion",
  "dryRun": true,
  "quiet": true
}
```

Para sonidos distintos por video:

```json
"soundSearchTerms": [
  "cancion parte 1",
  "cancion parte 2",
  "cancion parte 3"
]
```

El script existente abre la sesión de Chrome, nunca Brave, busca sonidos, añade el primer resultado disponible, baja el audio original a `-58 dB`, verifica el valor y programa. Si el sonido falla, debe abortar; no continuar programando sin sonido salvo que Oscar haya elegido `Sin canción/audio`.

## Riesgo De Sincronía Con Sonidos De TikTok

Advierte este punto cuando Oscar divide una canción completa:

TikTok puede añadir el sonido de librería desde el inicio del audio encontrado, no desde el segundo exacto de la parte 2, 3 o 4. Por eso, parte 1 suele sincronizar mejor que partes posteriores.

Opciones:

1. Mantener el audio del video y añadir sonido TikTok a volumen bajo para reconocimiento.
2. No añadir sonido TikTok en partes 2/3/4 si la sincronía exacta importa.
3. Buscar sonidos/fragmentos específicos si existen en TikTok.
4. Aceptar el desfase y priorizar alcance/SEO de sonido.

## Handoff A Redes

Después de generar videos, muestra una lista compacta de outputs y pregunta:

```text
¿Quieres subir/programar estos videos a TikTok, YouTube Shorts o ambas?
```

Si elige TikTok, sigue las reglas del skill `book-tiktok-shorts`:

- siempre hacer dry-run primero
- mostrar plan
- pedir aprobación explícita antes de abrir TikTok
- respetar límite de programación de 10 días
- no hacer fallback a `Publicar`
- no borrar originales

## Outputs

Guarda los videos generados preferiblemente en:

```text
D:\BackUpDisco\videos\clips_tamano_ajustado
```

Si se usa el script actual sin `-Output`, saldrá al escritorio. Para flujos formales o batch, pasa `-Output` explícito.

Genera o conserva un manifiesto cuando haya varios videos:

```json
{
  "sourceAudio": "...",
  "sourceImage": "...",
  "generatedAt": "...",
  "videos": ["..."]
}
```

Usa ese manifiesto para no mezclar outputs viejos con nuevos.

## Validaciones

- Verifica que el audio existe.
- Verifica que la imagen existe si se indica.
- Si se elige IA, verifica que exista `~\.opencode\api_keys.json` o deja que `generar_imagen_desde_prompt.ps1` falle con su mensaje claro de keys faltantes. No pidas keys manualmente si ya estan configuradas.
- Verifica que `ffmpeg`, `ffprobe`, Python y Whisper estén disponibles.
- Verifica que `drawtext`, `ass`, `showwaves`, `boxblur` existan en ffmpeg si hay errores de filtro.
- Si se programa TikTok, valida que todos los videos existen y no hay duplicados.
- Si se divide en partes, preserva el orden exacto.
- Nunca borres archivos originales.

## Ejemplos De Uso

**Short simple con imagen y onda reactiva:**

```powershell
ffmpeg -y -loop 1 -i "D:\img\cover.jpg" -i "D:\audio\tema.mp3" `
  -filter_complex "[0:v]fps=30,scale=w='1080*(1+0.42*min(t\,30)/30)':h='1920*(1+0.42*min(t\,30)/30)':force_original_aspect_ratio=increase:eval=frame,crop=1080:1920:(iw-ow)/2:(ih-oh)/2,format=rgba[bg];[1:a]showwaves=s=540x90:mode=line:rate=30:colors=#c8a46a:scale=sqrt,format=rgba,colorkey=0x000000:0.18:0.08[wave];[bg][wave]overlay=(W-w)/2:950[v]" `
  -map "[v]" -map 1:a -c:v libx264 -preset medium -c:a aac -b:a 192k -t 30 -pix_fmt yuv420p -shortest -movflags +faststart "D:\videos\tema_short.mp4"
```

**Generar imagen IA antes del short:**

```powershell
& "C:\Users\oscar\.config\opencode\skills\crear-video-youtube-beat\scripts\generar_imagen_desde_prompt.ps1" `
  -Prompts @("gritty urban realistic rap cover art, vertical 9:16, cinematic night street, negative space for text and waveform, no AI look") `
  -OutputDir "D:\BackUpDisco\Inkscape\Youtube" `
  -Width 1024 `
  -Height 1792
```

**Short sin imagen:**

```powershell
& "C:\Users\oscar\OneDrive\Escritorio\make-short.ps1" -Audio "D:\audio\tema.mp3" -Duracion 50 -Texto "SIGUE ADELANTE"
```

**Luego subir a TikTok:** usa `programar-videos` o `book-tiktok-shorts` con los paths generados y pregunta el término exacto de búsqueda del sonido.
