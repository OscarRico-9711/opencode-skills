---
name: crear-podcast-level-shorts
description: Use when Oscar asks to crear videos tipo podcast/dialogo/narracion de nivel, "si puedes entender este dialogo eres X level", historias o explicaciones en ingles o espanol con 1 voz o 2 voces, imagen relacionada al tema o fondo estilo podcast, subtitulos grandes, voces Mexico/Colombia para espanol, voz por defecto de Brave para ingles, y formato Shorts/Reels/TikTok educativo.
---

# Crear Podcast Level Shorts

Workflow para crear videos educativos tipo podcast, dialogo o narracion. Puede ser una conversacion de 2 voces o una sola voz narrando de que trata una historia/tema seleccionado. El formato replica el ejemplo analizado cuando aplica: hook de nivel variable, imagen tipo estudio/podcast o imagen relacionada a la historia, texto grande arriba, palabra clave resaltada, barra/waveform reactiva al sonido, dialogo por turnos cortos o narracion por bloques, y subtitulos como foco principal.

## Objetivo

Crear videos que parezcan conversacion natural, mini podcast o narracion de historia, no clase tradicional:

- `si puedes entender este dialogo eres B1/B2/C1`
- `if you understand this conversation your English is B2`
- `podcast sobre disciplina en ingles nivel B1`
- `dialogo en espanol sobre finanzas nivel intermedio`
- `2 voces hablando sobre habitos, gym, ansiedad, dinero, relaciones, productividad`
- `una voz contando una historia en ingles sobre disciplina nivel B1`
- `narracion explicando de que trata una historia con imagen relacionada`

Este skill debe priorizar retencion, claridad auditiva y bajo riesgo visual de tag de IA. Evita caras humanas fotorrealistas generadas con IA o expresiones faciales realistas; usa ilustracion, fondo abstracto, estudio/podcast vectorial, mesa con microfonos, waveform, texto o una imagen clara relacionada a la historia/tema.

## Errores Conocidos Que No Deben Repetirse

Estas reglas existen por fallos reales de produccion. Son obligatorias:

- No hagas una imagen falsa con `System.Drawing`, PowerShell, formas geometricas, screenshots, placeholders o dibujos generados por codigo cuando Oscar pidio imagen IA.
- No conviertas un fallback tecnico en video final. Si falla la IA, detente y consulta antes de renderizar.
- Nunca ralentices la voz para rellenar segundos. Oscar siempre prefiere voz natural.
- No sacrifiques naturalidad por alcanzar exactamente `60s`. La duracion no es mandatoria: si la idea termina antes, se queda corto; si necesita mas dialogo para cerrar bien, se puede pasar.
- No renderices todo en un script monolitico sin validar assets. Genera y valida primero imagen, luego voz, luego subtitulos, luego render.
- No uses una imagen IA con texto no deseado, logos, letras raras o palabras grandes si el texto compite con subtitulos o esta en el foco principal. Para videos de ingles con subtitulos grandes, no bloquees por texto pequeno de fondo o bordes si puede quedar cubierto, recortado o no afecta el resultado final.
- No improvises filtros FFmpeg complejos si hay un skill de FFmpeg disponible. Usa el skill `ffmpeg` para conversion, waveform, subtitulos, zoom, overlays o render final cuando estes construyendo el MP4.
- No presentes un video como final si no verificaste que usa la imagen IA correcta, una voz natural y la duracion/resolucion esperadas.
- No concatenes WAV de edge-tts con `-c copy` (stream copy). edge-tts genera MP3 con extension .wav, y al copiar directo el header WAV queda corrupto. Siempre convierte cada archivo a PCM s16le primero antes de concatenar. Usa Python con `wave` module o ffmpeg `-c pcm_s16le` para cada segmento, luego concatena los PCMs con `-c copy`.

## Orden De Produccion Obligatorio

Sigue este orden. No lo comprimas en un unico paso opaco:

1. Definir guion y preview.
2. Generar imagen IA real si fue aprobada.
3. Inspeccionar la imagen generada antes de renderizar. Si trae texto no deseado, deformaciones fuertes, logo, baja calidad o no coincide con el tema, reintentar o consultar.
4. Generar audio con voz natural y velocidad normal.
5. Confirmar duracion real del audio. Si hace falta ajustar duracion, cambia el guion agregando o quitando dialogo/narracion; nunca ajustes ralentizando la voz.
6. Preparar subtitulos y timings.
7. Usar FFmpeg para render final con waveform, zoom/movimiento, overlays y subtitulos.
8. Verificar con `ffprobe` y revisar al menos una muestra visual antes de responder.
9. Preguntar si Oscar quiere recibir por WhatsApp la ruta del video o carpeta generada.
10. Si Oscar dice que sí, usar `C:\Users\oscar\.config\opencode\scripts\send-whatsapp.ps1` con un mensaje corto. CallMeBot solo envia texto, no archivos; manda rutas locales o links si existen.

## Patron Del Video De Referencia

El ejemplo revisado usa este lenguaje visual:

- Aspecto original horizontal `1032x576`, pero se puede adaptar a vertical `1080x1920` para Shorts.
- Fondo azul/morado oscuro con gradiente suave.
- Ilustracion 2D de dos personas en mesa de podcast con audifonos y microfonos, o imagen relacionada a la historia si el formato es narrativo.
- Personajes no fotorrealistas, estilo vector/cartoon limpio.
- Texto grande centrado arriba, blanco, bold, con sombra/outline negro.
- Una palabra o frase clave resaltada en naranja/dorado.
- Barra/waveform reactiva al sonido, visible durante todo el video, normalmente blanca o con acento naranja, centrada entre texto e ilustracion.
- Marca/handle pequeno abajo izquierda y boton/branding tipo plataforma abajo derecha si Oscar lo pide.
- Subtitulos cambian frase por frase; normalmente 1 o 2 lineas.
- En dialogo, el audio alterna turnos cortos con pausas de aproximadamente 0.4s a 0.6s.
- En narracion, una sola voz avanza por bloques cortos con pausas naturales de aproximadamente 0.3s a 0.6s.

## Reglas De Voz

Selecciona voces segun idioma:

- Espanol: usar siempre voz/acento de Mexico o Colombia.
- Ingles: usar siempre la voz mas natural disponible. Prioriza la voz por defecto de la extension de Brave si esta disponible; si no esta disponible desde CLI, prueba alternativas TTS naturales antes de renderizar.
- Si el formato es narrativo, usa una sola voz clara, natural y cercana.
- Si hay 2 voces, usa contraste claro: una voz masculina y una femenina, o una voz calmada y una voz curiosa.
- Evita voces de locutor comercial; deben sonar conversacionales.
- Prohibido forzar la duracion bajando la velocidad de la voz. Para ingles usa siempre velocidad natural. Si falta duracion, agrega mas dialogo o narracion; si sobra, recorta guion. No importa si el video queda un poco corto o se pasa mientras la idea cierre bien.
- Si ninguna voz disponible suena natural, detente y pregunta a Oscar como proceder antes de renderizar. No uses una voz fea, robotica o demasiado lenta por cumplir el flujo.
- Si Oscar dice `la que suene mejor`, selecciona la voz mas natural disponible por calidad auditiva, no por duracion. Si no puedes escuchar/validar la voz, usa una voz neural recomendada y velocidad normal, e informa el motor/voz exactos.
- Inserta pausas naturales entre turnos: `0.35s` a `0.65s`.
- Mantiene cada turno o bloque narrativo entre 1 y 3 frases cortas.
- Si el motor permite estilo, usa tono `calm`, `curious`, `friendly`, `podcast`, nunca `announcer`.

### Presets Recomendados

Usa estos presets conceptuales aunque el motor exacto cambie:

| Idioma | Voz A | Voz B |
|---|---|---|
| Espanol Mexico | mujer mexicana clara, natural | hombre mexicano calmado |
| Espanol Colombia | mujer colombiana clara, natural | hombre colombiano calmado |
| Ingles | Brave default English voice | Brave default alternate voice si existe; si no, segunda voz TTS natural |

Si la herramienta Brave/extension no esta disponible desde CLI, no renderices automaticamente con cualquier fallback. Prueba o propone alternativas en este orden:

1. Usar la voz manual desde Brave y luego importar audios.
2. Usar `edge-tts` con la voz mas natural encontrada y velocidad normal.
3. Usar ElevenLabs/OpenAI TTS si Oscar quiere maxima naturalidad.

Antes de renderizar, confirma en el preview la voz exacta, motor exacto y velocidad exacta. Si se usa `edge-tts`, la seleccion debe estar justificada por naturalidad, no solo por disponibilidad.

## Flujo Conversacional Obligatorio

Cuando falten datos, pregunta con menus si la herramienta `question` esta disponible:

1. `Tema del podcast/dialogo/narracion`: ofrece `Tema random recomendado`, `Elegir de temas random`, `Oscar indica tema`. Si Oscar elige temas random, muestra 5 a 8 opciones concretas antes de escribir el guion.
2. `Idioma`: `Ingles`, `Espanol Mexico`, `Espanol Colombia`.
3. `Modo`: `Dialogo 2 voces tipo podcast`, `Narracion 1 voz con imagen relacionada`, `Automatico segun tema recomendado`. Si Oscar no especifica personas o conversacion, no asumas 2 voces; para historias, explicaciones o "de que trata", recomienda narracion de 1 voz.
4. `Nivel de ingles/espanol`: `A2`, `B1`, `B2`, `C1`, `Sin nivel`. Para videos en ingles, pregunta siempre el nivel; no asumas B2 por defecto salvo que Oscar elija defaults recomendados.
5. `Duracion`: `30s`, `60s`, `90s`, `3min`, `7min como el ejemplo`, `Personalizada`.
6. `Orientacion/Formato`: pregunta esto aparte de la duracion, nunca combinado en la misma pregunta. Opciones: `Vertical 9:16`, `Horizontal como ejemplo`, `Ambos`. Para Shorts/Reels/TikTok recomienda `Vertical 9:16`, pero no lo fuerces si Oscar pide horizontal.
7. `Visual`: `Generar imagen IA relacionada al tema recomendada`, `Generar imagen IA tipo podcast`, `Ilustracion podcast existente`, `Fondo abstracto`, `Imagen que paso Oscar`. Si se va a generar imagen IA, usa el script `C:\Users\oscar\.config\opencode\skills\crear-video-youtube-beat\scripts\generar_imagen_desde_prompt.ps1` con `-Width 1024 -Height 1792` para vertical o formato horizontal equivalente.
8. `Movimiento de imagen/zoom`: pregunta si quiere `Zoom cinematico recomendado`, `Movimiento leve`, `Imagen estatica`, `Oscar indica movimiento`. El default recomendado para shorts es zoom cinematico lento como en los otros shorts.
9. `Overlays visuales`: pregunta si quiere `Overlays sutiles recomendados`, `Sin overlays`, `Grano/VHS leve`, `Luces/particulas leves`, `Oscar indica overlays`. Los overlays deben ser sutiles y no tapar subtitulos ni caras/ilustraciones.
10. `Texto/handle en pantalla`: para videos en ingles pregunta `Usar @english_daily_shorts recomendado`, `Sin handle`, `Oscar indica handle`. Si Oscar elige recomendado, quemar `@english_daily_shorts` pequeno en safe area inferior. No uses `@PerpetuoBeats` en videos de ingles educativos salvo que Oscar lo pida.
11. `Frase inicial/hook`: pregunta `Hook automatico variable recomendado`, `Elegir hook de lista`, `Oscar indica hook`. Si Oscar elige lista, muestra 5 a 8 hooks naturales adaptados al nivel.
12. `Subtitulos`: `Grandes frase por frase`, `Karaoke palabra por palabra`, `Sin subtitulos`.
13. `Musica`: `No`, `Ambiente muy baja`, `Oscar pasa musica`.

La barra/waveform reactiva al audio no es una duda: agregala siempre. Solo pregunta el estilo si Oscar lo menciona o si estas mostrando opciones avanzadas.

No renderices hasta mostrar a Oscar un preview textual del guion, voces, visual elegido y output esperado.

Despues de renderizar y verificar el video, pregunta:

```text
¿Quieres que te mande por WhatsApp la ruta del video generado?
```

Si dice sí, envia un mensaje con:

```powershell
& "C:\Users\oscar\.config\opencode\scripts\send-whatsapp.ps1" -Message "Short educativo listo:`n<ruta_del_video>"
```

## Estructura Del Guion

Genera guion segun el modo elegido.

Para dialogo de 2 voces:

```text
HOOK: If you understand this conversation, your English is getting really good.

VOICE_A: Hey, Emma, you seem really focused today. What's going on?
VOICE_B: Honestly, I've been trying to improve my routine lately, and it's changing everything.
VOICE_A: Really? What changed?
VOICE_B: Small things: sleeping earlier, drinking more water, and spending less time on my phone.
...
```

Para espanol:

```text
HOOK: Si puedes entender toda esta conversacion, tu espanol esta en nivel intermedio alto.

VOICE_A: Oye, te noto mas tranquilo ultimamente. Que cambiaste?
VOICE_B: La verdad, empece a ordenar mis habitos diarios y me ha ayudado bastante.
```

Para narracion de 1 voz:

```text
HOOK: If you can follow this story, your English is getting stronger.

NARRATOR: This is a short story about a student who almost gave up.
NARRATOR: Every morning, he opened his notebook, stared at the page, and felt behind everyone else.
NARRATOR: But one small habit changed everything: he studied for ten minutes before touching his phone.
...
```

En narracion, la voz debe explicar, contar o resumir el tema con ritmo de storytelling. No fuerces nombres ni dialogo si el tema funciona mejor como historia, reflexion o explicacion.

Reglas de escritura:

- Hook directo en los primeros 2 segundos.
- Para ingles, no repitas siempre `If you understand this conversation, your English is B2`. Varia la frase inicial segun el nivel, tema y tono.
- El hook puede medir habilidad, invitar a comentar o retar al oyente: `Can you understand this?`, `How much of this conversation can you follow?`, `If this feels easy, your English is getting good`, `If you understand this, your English is great`, `Tell me how much you understood`.
- Si el hook menciona nivel, el nivel debe coincidir con la seleccion (`A2`, `B1`, `B2`, `C1`). Si usa palabras como `great`, `good`, `awesome`, `solid`, no lo trates como nivel oficial.
- No uses siempre la misma palabra de evaluacion. Alterna entre `good`, `really good`, `great`, `solid`, `strong`, `awesome`, `getting better`, `above average`, segun naturalidad.
- Presenta una situacion cotidiana y reconocible.
- Usa nombres simples si hay personajes: Emma, Alex, Sofia, Daniel, Camila, Mateo.
- Un solo tema principal por video.
- Cada 20 a 30 segundos introduce una idea nueva para retencion.
- Incluye frases utiles y naturales del idioma, no traducciones literales.
- Cierra con una frase memorable o pregunta para comentarios.
- Si el video es de ingles para hispanohablantes, no metas explicaciones en espanol dentro del audio salvo que Oscar lo pida.
- Si el modo es narrativo, estructura el guion como hook, contexto, conflicto/idea principal, giro o aprendizaje, cierre memorable.

## Contenido Por Nivel

Usa el nivel para controlar dificultad:

| Nivel | Frases | Vocabulario | Ritmo |
|---|---|---|---|
| A2 | simple present/past, frases cortas | cotidiano | lento |
| B1 | conectores basicos, opiniones | habitos, trabajo, vida diaria | medio |
| B2 | ideas abstractas, contrastes | productividad, emociones, sociedad | natural |
| C1 | matices, idioms suaves | psicologia, cultura, negocios | natural rapido |

Siempre estima el nivel de forma honesta. Si el vocabulario sube demasiado, baja complejidad antes de renderizar.

## Temas Random Recomendados

Cuando Oscar pida tema random o quiera elegir de opciones, ofrece temas utiles para retencion y aprendizaje:

- Small habits that change your day.
- Why people procrastinate.
- The moment you stop caring what others think.
- How to stay calm under pressure.
- Money habits nobody talks about.
- Why discipline feels boring at first.
- Social media and attention.
- Learning from failure.
- A short story about someone who almost gave up.
- The hidden lesson behind a difficult day.
- What this story teaches about confidence.
- A difficult conversation between friends.
- The difference between being busy and productive.

Adapta cada tema al nivel seleccionado. Para A2/B1, usa situaciones mas concretas y vocabulario cotidiano. Para B2/C1, usa ideas mas abstractas y matices.

## Hooks En Ingles

Construye hooks variados. Ejemplos base:

- `Can you understand this conversation? Tell me how much you got.`
- `If you understand this, your English is getting really good.`
- `If this conversation feels easy, your English is solid.`
- `How much of this English podcast can you follow?`
- `If you can follow this without subtitles, your English is great.`
- `Listen carefully. This is a real test for your English.`
- `If you understand the details here, your English is above average.`
- `Can you catch every sentence in this conversation?`

Reglas del hook:

- Debe durar maximo 2 a 4 segundos.
- Debe sonar natural, no como plantilla repetida.
- Debe conectar con el tema del dialogo cuando sea posible.
- Si el video usa subtitulos, el hook puede decir `with or without subtitles` solo si tiene sentido.

## Estilo Visual Recomendado

### Regla Obligatoria De Imagen IA

Cuando Oscar elige o aprueba `Generar imagen IA relacionada al tema recomendada` o `Generar imagen IA tipo podcast`, la imagen final debe venir de generacion IA real. No esta permitido sustituirla por un dibujo local, forma generada con codigo, placeholder, captura generica o fallback tecnico.

Si falla la generacion IA, detente el proceso y consulta a Oscar antes de renderizar. Ofrece estas opciones concretas:

- Reintentar con el mismo prompt.
- Reintentar con un prompt mas simple.
- Usar una imagen propia que pase Oscar.
- Cambiar a fondo abstracto sin IA.
- Cancelar el render.

No renderices un MP4 final con fallback visual si el usuario pidio IA. Si por alguna razon se usa fondo abstracto o imagen no IA, debe ser una decision explicita de Oscar despues del fallo.

Despues de generar una imagen IA, inspeccionala antes de renderizar:

- Si contiene texto, letras, logo o senaletica no solicitada en el foco principal o compite con subtitulos, no la uses. Reintenta con `NO WORDS, NO TEXT, NO LETTERS, NO LOGOS, NO SIGNAGE`.
- Para videos de ingles con subtitulos grandes, texto pequeno en bordes, fondos o elementos secundarios no debe bloquear el render si no distrae, queda fuera del encuadre final, o queda cubierto por overlays/subtitulos.
- Si la imagen se ve vacia, generica, rota, con artefactos fuertes o no parece podcast/tema elegido, no la uses como final.
- Si despues de 2 intentos sigue mala, detente y consulta a Oscar con opciones concretas.

Default recomendado para dialogo de 2 voces:

```text
vertical 9:16, dark blue purple gradient background, clean 2D vector illustration of two podcast hosts at a table with microphones and headphones, cozy studio, minimal shapes, no realistic human faces, no photorealistic skin, large empty space at top for subtitles, friendly educational style, soft lighting, orange accent color
```

Default recomendado para narracion de 1 voz:

```text
vertical 9:16, cinematic educational illustration related to the story topic, no photorealistic human faces, clean 2D or painterly editorial style, dark blue purple atmosphere, clear central subject, large empty space at top for subtitles, subtle podcast waveform element, soft lighting, orange accent color
```

Para narraciones, la imagen debe ayudar a entender la historia: estudiante estudiando, calle lluviosa, escritorio, ciudad nocturna, libreta, audifonos, silueta no realista, objeto simbolico o escena relacionada. No uses automaticamente dos personas con microfonos si el video no es dialogo.

Evita por defecto:

- Caras humanas fotorrealistas.
- Imagenes IA con expresiones faciales realistas.
- Talking heads generados.
- Boca animada/lip sync realista.
- Fotos tipo influencer/actor.

Si Oscar quiere reducir al minimo el tag de IA, usa una de estas opciones:

- Fondo abstracto + waveform + texto, sin personas.
- Ilustracion 2D simple tipo iconos.
- Foto real/licenciada de estudio vacio o microfono, sin personas.
- Imagen simbolica relacionada a la historia, sin personas realistas.
- Imagen propia proporcionada por Oscar.

## Layout

Reglas visuales globales:

- Agrega siempre una barra/waveform reactiva al sonido; debe moverse con el audio real o con una aproximacion visual sincronizada si la herramienta no permite analisis exacto.
- Si Oscar aprueba zoom/movimiento, aplica movimiento lento tipo shorts: zoom in/out suave, pan minimo o parallax leve. Evita movimientos bruscos que dificulten leer subtitulos.
- Si Oscar aprueba overlays, mantenlos sutiles: grano fino, luz suave, particulas leves o textura VHS minima. Nunca deben competir con subtitulos, waveform o handle.
- Para render final, usa el skill `ffmpeg` cuando haya conversion, waveform, subtitulos, zoom/movimiento, overlays o composicion compleja. Evita scripts improvisados salvo que sean minimos y verificables.
- El zoom cinematico debe ser visible pero suave. No uses parametros tan lentos que parezcan imagen estatica, ni tan rapidos que dificulten leer subtitulos.

Para vertical `1080x1920`:

- Zona texto: arriba, `y=120` a `y=520`.
- Barra/waveform reactiva: debajo del texto, centrada, `y=560` a `y=650`, visible durante todo el video.
- Ilustracion/fondo principal: centro bajo, ocupa `60%` a `75%` del ancho.
- Marca pequena opcional: abajo izquierda.
- CTA/Follow opcional: abajo derecha.
- Safe area: deja margen inferior para UI de TikTok/Shorts.

Para horizontal como ejemplo:

- Texto arriba centrado.
- Ilustracion podcast centrada abajo.
- Barra/waveform reactiva pequena entre ambos.
- Branding pequeno en esquinas.

## Subtitulos

Los subtitulos son el elemento principal:

- Fuente bold redondeada, blanca, outline/sombra negra.
- Maximo 2 lineas por pantalla, dentro de safe area real del formato.
- En vertical 1080x1920, nunca uses fuente tan grande que corte texto. Recomendado: 48-58 px para karaoke, 54-64 px para frase por frase, `MarginL/MarginR` minimo 95 px, y maximo 4-5 palabras por linea.
- En horizontal 1920x1080, recomendado: 50-62 px y maximo 7-9 palabras por linea.
- Antes de renderizar vertical, valida visualmente o por regla de ancho que ninguna linea exceda el 82% del ancho util. Si se excede, divide la frase en mas eventos cortos o baja font size; no renderices subtitulos cortados.
- Para karaoke palabra por palabra en vertical, prioriza legibilidad: frases mas cortas y font size menor. Si el texto es C1 o frases largas, divide cada turno en chunks de 3-5 palabras.
- Resalta 1 palabra clave por frase en naranja/dorado.
- No tapes la cara/ilustracion si hay personajes.
- Cambia por frase o por segmento de 1.5s a 4s.
- Para ingles, respeta mayusculas normales y contracciones naturales.
- Para espanol, usa tildes correctas si el proyecto ya usa Unicode en overlays; si no, prioriza ASCII por compatibilidad.

Ejemplos de resaltado:

- `simple habits` en naranja.
- `discipline` en naranja.
- `building themselves` en naranja.
- `nivel B2` en naranja.

## Produccion Recomendada

Carpeta base:

```text
D:\BackUpDisco\Podcast-level-shorts
```

Estructura:

```text
D:\BackUpDisco\Podcast-level-shorts
├── videos
├── audio
│   ├── voice-a
│   ├── voice-b
│   └── mixed
├── images
├── subtitles
├── scripts
├── manifests
└── temp
```

Naming:

```text
{topic-slug}_{language}_{level}_{counter}.mp4
{topic-slug}_{language}_{level}_{counter}_script.txt
{topic-slug}_{language}_{level}_{counter}_manifest.json
```

Ejemplo:

```text
daily-routine_english_b2_001.mp4
habitos_es-mx_b1_001.mp4
```

## Validacion Antes De Renderizar

Antes de renderizar, muestra:

- Tema.
- Modo: dialogo 2 voces o narracion 1 voz.
- Idioma/acento.
- Nivel estimado.
- Voces elegidas.
- Duracion estimada.
- Orientacion/formato elegido.
- Hook exacto.
- Primeros 8 a 12 turnos del dialogo o bloques narrativos.
- Prompt visual o imagen usada.
- Ruta de la imagen IA generada si se aprobo IA, y confirmacion explicita de que no es fallback.
- Motor de voz, voz exacta y velocidad exacta.
- Movimiento/zoom de imagen elegido.
- Overlays elegidos.
- Barra/waveform reactiva al sonido incluida.
- Estilo de subtitulos.

Pide aprobacion si el guion completo es nuevo o si se va a generar imagen IA. Si Oscar ya dio una orden directa para tanda, puedes aprobar por lote mostrando 3 ejemplos y el patron.

### Preflight Obligatorio Antes Del Render

Antes de ejecutar FFmpeg o cualquier render final, valida y registra:

- El audio fue generado con una voz natural aprobada o razonablemente seleccionada.
- La voz esta a velocidad natural; no fue ralentizada para rellenar duracion.
- La imagen IA existe en disco y fue generada por el flujo de IA, no por codigo local ni placeholder.
- La imagen IA fue inspeccionada y no tiene texto/logos/artefactos fuertes no deseados.
- Si la imagen IA no existe o el generador fallo, el proceso esta detenido esperando decision de Oscar.
- El output esperado, duracion estimada y formato son correctos.
- Si se usan filtros FFmpeg complejos, el flujo del skill `ffmpeg` fue usado o sus buenas practicas fueron seguidas.

## Render Y Verificacion

Despues de renderizar:

- Verifica MP4 con `ffprobe`.
- Confirma duracion, resolucion, codec de video y audio.
- Reproduce o inspecciona al menos una muestra si es posible.
- Verifica visualmente o por script que se incluyo la barra/waveform reactiva, el zoom/movimiento aprobado y los overlays aprobados.
- Verifica que la imagen usada corresponde a la imagen IA aprobada o a la alternativa elegida explicitamente por Oscar. Si no coincide, marca el render como fallido y no lo presentes como final.
- Escribe manifest JSON con tema, idioma, nivel, voces, visual, duracion, orientacion, waveform, zoom/movimiento, overlays, output y fecha.
- Pregunta si quiere subir/programar usando `programar-videos`.

## Handoff A Otros Skills

- Usa `programar-videos` solo despues de generar MP4s verificados.
- Usa `book-youtube-shorts`, `book-tiktok-shorts` o `book-instagram-reels-meta` a traves de `programar-videos` cuando Oscar quiera subir/programar.
- No uses `crear-shorts-ingles` para este formato salvo que Oscar quiera una clase de ingles tradicional; este skill es para dialogo/podcast/narracion de nivel.
