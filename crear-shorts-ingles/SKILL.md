---
name: crear-shorts-ingles
description: Use when Oscar asks to crea video en ginles, crea video en ingles, generar english shorts, shorts de ingles, podcast en ingles, palabras en ingles, phrasal verbs, conceptos de ingles, temas de gramatica inglesa, English learning videos, or educational English Shorts with IA images, optional TTS voice, SFX, dynamic text, validation, and social upload handoff.
---

# Crear Shorts Ingles

Workflow para generar Shorts/Reels/TikToks educativos de ingles desde podcast/dialogo corto, palabras, phrasal verbs o conceptos/temas gramaticales. Genera contenido con rol de profesor de ingles, valida exactitud antes de renderizar, crea imagen IA, voz opcional, SFX, textos dinamicos y videos verticales en `D:\BackUpDisco\English-shorts`.

## Objetivo

Crear videos educativos cortos que ensenen ingles de forma clara y visualmente dinamica:

- words: `house`, `brilliant`, `although`
- phrasal verbs: `give up`, `break down`, `look after`
- grammar topics: `verb to be`, `present perfect`, `conditionals`, `prepositions`

Nunca renderices contenido educativo dudoso sin validarlo y mostrarlo para aprobacion.

## Recursos Existentes Que Debes Reutilizar

| Necesidad | Reutilizar |
|---|---|
| Imagen IA vertical | `C:\Users\oscar\.config\opencode\skills\crear-video-youtube-beat\scripts\generar_imagen_desde_prompt.ps1` |
| Render vertical base | Patrones de `crear-shorts-audio` |
| Subir/programar redes | `programar-videos` |
| TikTok | `book-tiktok-shorts` via `programar-videos` |
| YouTube Shorts | `book-youtube-shorts` via `programar-videos` |
| TTS gratis | `edge-tts` local/free, no API key |
| Validacion extra | LLM con rol de English CEFR reviewer |

Ruta rapida recomendada para una sola palabra:

```text
C:\Users\oscar\.config\opencode\skills\crear-shorts-ingles\scripts\make-english-word-video.ps1
```

Usa esta ruta para reducir friccion: genera imagen, overlays, TTS por escenas, audio final, render, verifica con ffprobe y por defecto limpia intermedios dejando solo el MP4. Usa `-KeepAssets` solo si Oscar pide conservar imagen/audio/subtitulos/manifest.

No instales skills externos por defecto. Se revisaron skills como `language-learning` y `educational-video-creator`; usa sus ideas pedagogicas y de storyboard como referencia, pero este flujo debe ser propio porque necesita carpetas, naming, validacion, imagenes, TTS, SFX y redes especificas.

## Carpeta Base Obligatoria

Todo se guarda dentro de:

```text
D:\BackUpDisco\English-shorts
```

Estructura:

```text
D:\BackUpDisco\English-shorts
├── videos
├── images
├── audio
│   ├── tts
│   ├── music
│   └── mixed
├── sfx
├── overlays
├── manifests
├── prompts
├── validation
├── previews
└── temp
```

Antes de generar, ejecuta o replica la logica de:

```text
C:\Users\oscar\.config\opencode\skills\crear-shorts-ingles\scripts\setup_english_shorts_assets.ps1
```

## Naming Obligatorio

Usa slugs seguros: minusculas, espacios a `-`, sin caracteres raros.

| Tipo | Patron |
|---|---|
| Word | `{word}_word_{counter}.mp4` |
| Phrasal verb | `{phrasal-with-dashes}_phrasal_{counter}.mp4` |
| Topic | `{topic-slug}_topic_{counter}.mp4` |
| Topic dividido | `{topic-slug}_topic_part-{n}_{counter}.mp4` |

Ejemplos:

```text
house_word_001.mp4
give-up_phrasal_001.mp4
present-perfect-tense_topic_001.mp4
verb-to-be_topic_affirmative_001.mp4
```

Archivos relacionados deben compartir base:

```text
house_word_001.png
house_word_001_tts.wav
house_word_001_validation.json
```

## Flujo Conversacional Obligatorio

Cuando Oscar diga `crea video en ginles`, `crea video en ingles`, `genera english shorts`, `genera shorts de ingles`, `crear shorts de phrasal verbs`, etc.:

1. Si no especifico claramente el tipo, pregunta primero que tipo de video quiere generar:
   - `Podcast/dialogo`
   - `Palabra`
   - `Phrasal verb`
   - `Concepto/tema`
2. Despues pregunta el modo segun el tipo elegido:
   - Podcast/dialogo: `Dialogo tipo level`, `Podcast explicativo`, `Historia corta`, `Practica de listening`
   - Palabra: `Palabras random`, `Palabra especifica`
   - Phrasal verb: `Phrasal verbs random`, `Phrasal verb especifico`
   - Concepto/tema: `Tema especifico`
3. Pregunta cantidad de videos.
4. Si eligio palabra, phrasal verb o tema especifico, pregunta el termino/tema exacto.
5. Si eligio concepto/tema sin tema exacto, ofrece temas:
   - `Verb to be`
   - `Present simple`
   - `Past simple`
   - `Present continuous`
   - `Present perfect`
   - `Future: will`
   - `Future: going to`
   - `Modal verbs`
   - `Conditionals`
   - `Prepositions: in/on/at`
   - `Articles: a/an/the`
   - `Comparatives`
   - `Superlatives`
   - `Possessives`
   - `Object pronouns`
   - `Question words`
   - `Irregular verbs`
   - `Otro tema`
6. Pregunta voz:
   - `Si, voz inglesa`
   - `Si, voz inglesa + voz espanola`
   - `Solo pronunciacion de palabra/frase`
   - `No, solo texto`
7. No preguntes musica. Para shorts y videos de ingles, la musica siempre es `No`; usa solo voz/SFX si aplica.
8. Genera contenido con `English Professor Engine`.
9. Valida con `Educational QA Engine`.
10. Muestra preview completo con estado de validacion.
11. Espera aprobacion explicita de textos.
12. Genera imagen IA y prompt; guarda prompt en `prompts` e imagen en `images`.
13. Si falla la imagen IA despues de reintentos, pregunta antes de continuar: `Fallo la creacion de imagen IA. Quieres crear con fondo por defecto/variantes locales?` Opciones: `Si, usar fondos locales`, `Reintentar IA`, `Cancelar este short`.
14. Muestra ruta de imagen o fondo local y pide aprobacion.
15. Genera TTS si aplica.
16. Genera overlay PNG dinamico si aplica.
17. Renderiza MP4.
18. Verifica MP4 con `ffprobe`.
19. Escribe manifest JSON.
20. Pregunta si Oscar quiere recibir por WhatsApp la ruta del video o carpeta generada.
21. Si Oscar dice que sí, usa `C:\Users\oscar\.config\opencode\scripts\send-whatsapp.ps1` con un mensaje corto. CallMeBot solo envia texto, no archivos; manda rutas locales o links si existen.
22. Pregunta si quiere subir/programar y delega a `programar-videos`.

Usa menus interactivos cuando esten disponibles. Para tandas grandes, ofrece aprobacion por lote: `Aprobar todo`, `Regenerar todo`, `Editar uno`, `Cambiar nivel`, `Cambiar modo`.

Despues de renderizar, verificar y escribir el manifest, pregunta:

```text
¿Quieres que te mande por WhatsApp la ruta del video/carpeta generada?
```

Si dice sí, envia un mensaje con:

```powershell
& "C:\Users\oscar\.config\opencode\scripts\send-whatsapp.ps1" -Message "English short listo:`n<ruta_del_video_o_carpeta>"
```

## English Professor Engine

Genera contenido como profesor experto de ingles para hispanohablantes. Reglas:

- Mantener frases cortas para video.
- Usar ejemplos naturales, no traducciones literales raras.
- Para shorts de vocabulario, el idioma principal debe ser ingles. La definicion (`Meaning`/`Means`) debe ir en ingles tanto en pantalla como en audio.
- Regla dura de espanol: nunca digas ni escribas `en espanol`, `en español`, `in Spanish`, ni frases parecidas. El espanol solo aparece en dos momentos: `Significa: <traduccion>` para la palabra/frase, y la traduccion del ejemplo al final de la escena de ejemplo. Todo lo demas debe ser en ingles.
- No expliques el `Meaning` en espanol. La escena `Means:` debe tener solo definicion en ingles, tanto en pantalla como en audio.
- Indicar CEFR razonable; si no hay seguridad, marcar `estimated`.
- Para temas, ensenar por patrones y ejemplos, no parrafos largos.
- Un concepto por escena/bloque visual.
- Para vocabulary, incluir pronunciacion simple si ayuda.

### Word JSON

```json
{
  "mode": "word",
  "slug": "house",
  "word": "house",
  "translation_es": "casa",
  "level": "A1",
  "level_confidence": "high",
  "type": "noun",
  "meaning_en": "a building where people live",
  "meaning_es": "un edificio donde viven personas",
  "example_en": "They bought a new house.",
  "example_es": "Compraron una casa nueva.",
  "pronunciation_hint": "haus"
}
```

### Phrasal Verb JSON

```json
{
  "mode": "phrasal",
  "slug": "give-up",
  "phrasal_verb": "give up",
  "translation_es": "rendirse",
  "level": "B1",
  "level_confidence": "medium",
  "type": "phrasal verb",
  "meaning_en": "to stop trying",
  "meaning_es": "dejar de intentar algo",
  "separable": false,
  "transitive": false,
  "register": "neutral",
  "example_en": "Don't give up on your dreams.",
  "example_es": "No te rindas con tus suenos.",
  "note": "No se traduce literalmente."
}
```

### Topic JSON

```json
{
  "mode": "topic",
  "slug": "verb-to-be",
  "topic": "Verb to be",
  "level": "A1",
  "section": "affirmative",
  "rule_es": "Se usa para decir quien eres, como estas o donde estas.",
  "table": [
    {"subject": "I", "verb": "am", "complement": "happy", "example": "I am happy", "translation": "Estoy feliz"},
    {"subject": "You", "verb": "are", "complement": "ready", "example": "You are ready", "translation": "Estas listo"},
    {"subject": "He", "verb": "is", "complement": "a teacher", "example": "He is a teacher", "translation": "El es profesor"}
  ]
}
```

## Educational QA Engine

Antes de mostrar preview, revisa cada item con un segundo rol: `English CEFR reviewer`.

Validar:

- La palabra/frase existe y se usa en ingles real.
- Tipo gramatical correcto.
- Definicion correcta y corta.
- Traduccion al espanol natural.
- Ejemplo gramaticalmente correcto.
- El nivel CEFR es razonable o marcado como estimado.
- Phrasal verb: separable/transitive/register correctos cuando se indiquen.
- Topic: tabla/patron correcto y ejemplos naturales.

Formato de validacion:

```json
{
  "validated": true,
  "confidence": "high",
  "issues": [],
  "recommended_fix": null,
  "sources_checked": ["llm_cefr_review"]
}
```

Regla dura:

```text
Nunca renderizar un video si validation.validated=false, salvo que Oscar lo apruebe explicitamente.
```

Si el CEFR es incierto, mostrarlo asi:

```text
Level: estimated B1
```

Guardar validaciones en:

```text
D:\BackUpDisco\English-shorts\validation
```

## Preview Obligatorio

Ejemplo para word/phrasal:

```text
#1 GIVE UP | B1 estimated | phrasal verb
ES: rendirse
Meaning: to stop trying
Example: Don't give up on your dreams.
Traduccion: No te rindas con tus suenos.
Validation: OK - medium confidence
```

Ejemplo para topic:

```text
Topic: Verb to be | A1 | Affirmative

I     am    happy       -> I am happy       -> Estoy feliz
You   are   ready       -> You are ready    -> Estas listo
He    is    a teacher   -> He is a teacher  -> El es profesor

Validation: OK - high confidence
```

## Imagen IA

Para generar imagen, usa el script existente con salida en:

```text
D:\BackUpDisco\English-shorts\images
```

Word/phrasal: imagen relacionada al concepto.
Topic: fondo educativo limpio, aula/notebook/abstract, espacio para texto.

Antes de usar fallback local, reintenta la imagen IA hasta 3 veces si el error parece de red/DNS/API temporal. Espera unos segundos entre intentos cuando sea posible. Si todas las APIs fallan, muestra el motivo exacto y pregunta a Oscar antes de continuar.

Pregunta obligatoria si falla la IA:

```text
Fallo la creacion de imagen IA: <motivo corto>.
Quieres crear con fondo por defecto/variantes locales?
```

Opciones:

- `Si, usar fondos locales`: generar fondos con `generate_fallback_background.py`.
- `Reintentar IA`: volver a ejecutar el script de imagen IA.
- `Cancelar este short`: parar sin renderizar.

Fallback local:

- Usar `C:\Users\oscar\.config\opencode\skills\crear-shorts-ingles\scripts\generate_fallback_background.py`.
- Crear como maximo 5 variantes por concepto: `{basename}_fallback_1.png` ... `{basename}_fallback_5.png`.
- Rotar variantes por video para que no se repita siempre el mismo fondo.
- Los fondos deben ser tematicos si el concepto lo permite, no solo un degradado generico.
- Guardar el prompt IA aunque se use fallback.
- Nunca borrar temporales ni ejecutar comandos destructivos para intentar resolverlo.

Prompt base obligatorio:

```text
vertical 9:16, cinematic, clean composition, negative space for text overlay, no text in image, realistic, no AI look
```

Guarda el prompt exacto en:

```text
D:\BackUpDisco\English-shorts\prompts\{slug}_{type}_{counter}_prompt.txt
```

## Voz

Usa `edge-tts` como opcion principal. No requiere API key.

Calidad de voz:

- Gratis/local por defecto: `edge-tts`, mejor usando voces naturales y ritmo menos perfecto.
- Voces Edge recomendadas para sonar menos robotico: `en-US-AvaNeural`, `en-US-AndrewNeural`, `en-US-JennyNeural`, `en-GB-SoniaNeural`, `es-MX-DaliaNeural`, `es-ES-ElviraNeural`.
- Ajustes recomendados: rate entre `-6%` y `-10%` para ingles educativo, pausas cortas entre frases y textos de TTS conversacionales, no listas rigidas.
- Mas natural/pro: ElevenLabs, OpenAI TTS, Azure Neural custom, Google Cloud TTS. Requieren API key o pago.
- Voces tipo TikTok: no usarlas como dependencia principal porque no hay API publica estable; solo usarlas si Oscar confirma un flujo externo o una herramienta local confiable.

Los textos enviados a TTS deben tener los numeros escritos en ingles (ej: "1" -> "one", "2" -> "two", "100" -> "one hundred") para evitar pronunciacion incorrecta. El script `generate_tts_edge.ps1` ya lo hace automaticamente, pero los textos generados deben usar palabras en lugar de digitos cuando sea posible.

Edge-tts pronuncia mal contracciones como "You've", "What's", "I'll". El script expande automaticamente las contracciones a su forma completa ("You have", "What is", "I will") para mejor claridad en audio.

Guardar TTS en:

```text
D:\BackUpDisco\English-shorts\audio\tts
```

Voces sugeridas:

```text
en-US-JennyNeural
en-US-AvaNeural
en-US-AndrewNeural
en-US-GuyNeural
en-GB-SoniaNeural
es-ES-ElviraNeural
es-MX-DaliaNeural
```

Para voz espanola en shorts, usa un ritmo mas rapido que el ingles. Recomendado: ingles `-6%` a `-8%`; espanol `+8%` a `+12%`. El render debe recalcular duraciones por escena con `ffprobe` para no desincronizar visuales.

Si `voz inglesa + voz espanola`, genera segmentos separados y mezclalos/concatena en orden.

Si `sin voz`, duracion por bloque visual:

- word/phrasal: 14-20s
- topic corto: 20-35s
- topic largo: dividir en partes si excede 45s

## SFX

Carpeta:

```text
D:\BackUpDisco\English-shorts\sfx
```

SFX esperados:

```text
pop.wav
whoosh.wav
click.wav
sparkle.wav
soft-hit.wav
```

Si faltan, no bloquees todo el flujo; renderiza sin SFX y avisa. No descargues sonidos de sitios web sin aprobacion del usuario.

Reglas:

- `pop`: aparece palabra/titulo.
- `whoosh`: cambio a meaning/regla.
- `click`: filas de tabla.
- `sparkle`: ejemplo final.
- Volumen bajo para no tapar voz.

## Visual Engine

Los videos deben ser dinamicos:

- Fondo IA o fondo local con zoom/pan visible, no demasiado lento.
- Overlay oscuro semitransparente para legibilidad.
- Textos progresivos por escenas, no todo junto. Para word/phrasal usa este orden por defecto:
- Hook inicial 3-4s: `Today's word is...` con seleccion/ruleta visual entre varias palabras. Esta pantalla debe tener audio que diga esa frase y luego la palabra.
- Reveal 3-4s: palabra grande + traduccion + pronunciacion/nivel.
- Meaning 6-7s: `Means:` + definicion en ingles, clara y natural.
- Example 6-7s: `Example:` + ejemplo natural en ingles + traduccion.
- CTA final 4-5s: `How would you use it?`, `Leave your own example in the comments`, `Save this word`.
- La narracion debe generarse por segmentos de escena y concatenarse en el mismo orden visual. El render debe calcular las duraciones reales con `ffprobe` y ajustar cada pantalla a su audio. No usar un audio largo completo sobre escenas con tiempos fijos porque se desincroniza.
- Regla dura de sincronizacion: cada card debe empezar exactamente en el mismo timestamp que su audio. No sumes padding a `SceneDurationsJson` si ese mismo silencio no esta agregado al audio final.
- Para word/phrasal con voz, usa `build_scene_audio.ps1` despues de crear segmentos TTS. Ese script normaliza cada segmento, agrega silencio final por escena, concatena el audio y escribe `SceneDurationsJson`; usa ese JSON en `render_english_short_scenes.ps1`.
- Nunca adelantes el siguiente slide con `duration - fade`. El fade visual puede ocurrir dentro del tiempo de la escena, pero el timestamp inicial de la card y del audio deben ser iguales.
- El texto debe ocupar mas pantalla: usar 80-90% del ancho disponible, bloques grandes y espaciado generoso. Evitar que todo quede concentrado en media pantalla.
- Estilos visuales disponibles:
- `image` default: imagen IA si funciona; si no, fondo local con overlay oscuro y movimiento. Este es el estilo principal.
- `minimal`: fondo negro, fuente serif blanca y mucho espacio negativo. Usarlo solo si Oscar pide estilo minimalista o similar.
- No agregar marcas como `SIGNIFICA ESTO` salvo que Oscar lo pida explicitamente.
- En estilo `image`, el fondo debe tener movimiento visible: zoom/pan moderado-rapido, no lento.
- Varia layouts entre videos.
- Varia fuentes entre 2-4 fuentes legibles.
- Usa highlights, cajas, subrayados y colores por funcion.
- SFX sincronizado con apariciones.
- Micro-animaciones: fade, slide, scale/bounce leve, highlight de keyword, filas de tabla una por una.

Si el render disponible solo acepta un overlay PNG estatico, crea al menos un overlay mas grande con CTA final visible. Si se puede usar ffmpeg por escenas, renderiza overlays por escena sobre una base continua negra con fades de alpha suaves. Evita cortes que parezcan parpadeo.

Fuentes sugeridas si existen:

```text
Bahnschrift
Arial Rounded MT Bold
Segoe UI Black
Montserrat
Poppins
Impact solo para titulos cortos
```

Paleta:

```text
Word/title: white or warm yellow
Level/type: cyan or soft gold
Meaning: white
Spanish: soft green or cream yellow
Example: white with keyword highlighted
```

Para topics/tablas, preferir generar overlay PNG con Python/Pillow y luego componer con ffmpeg. Evita hacer tablas complejas solo con `drawtext`.

## Render Engine

Scripts del skill:

```text
C:\Users\oscar\.config\opencode\skills\crear-shorts-ingles\scripts\setup_english_shorts_assets.ps1
C:\Users\oscar\.config\opencode\skills\crear-shorts-ingles\scripts\generate_image_prompt.ps1
C:\Users\oscar\.config\opencode\skills\crear-shorts-ingles\scripts\generate_tts_edge.ps1
C:\Users\oscar\.config\opencode\skills\crear-shorts-ingles\scripts\build_scene_audio.ps1
C:\Users\oscar\.config\opencode\skills\crear-shorts-ingles\scripts\generate_fallback_background.py
C:\Users\oscar\.config\opencode\skills\crear-shorts-ingles\scripts\generate_text_overlay.py
C:\Users\oscar\.config\opencode\skills\crear-shorts-ingles\scripts\generate_word_scene_overlays.py
C:\Users\oscar\.config\opencode\skills\crear-shorts-ingles\scripts\render_english_short.ps1
C:\Users\oscar\.config\opencode\skills\crear-shorts-ingles\scripts\render_english_short_scenes.ps1
```

El render debe crear MP4 vertical 1080x1920, H.264, AAC, `yuv420p`, `+faststart`.

Para word/phrasal, preferir `generate_word_scene_overlays.py` + `render_english_short_scenes.ps1` para crear escenas progresivas reales. Usar `generate_text_overlay.py` + `render_english_short.ps1` solo como fallback estatico.

Flujo recomendado para voz por escenas:

1. Genera los TTS cortos por segmento con `generate_tts_edge.ps1`.
2. Crea un JSON de segmentos con objetos `{ "scene": "hook|reveal|meaning|example|cta", "path": "..." }`.
3. Ejecuta `build_scene_audio.ps1 -SegmentsJson ... -OutputPath ... -SceneDurationsJson ...`.
4. Renderiza con `render_english_short_scenes.ps1 -SceneDurationsJson ... -AudioPath ...`.
5. Verifica que el primer sonido de cada escena coincida con el cambio de card. Si el audio se oye antes del slide, no publiques: reconstruye audio/JSON desde segmentos.

Duracion:

- Con voz: `duracion audio + 1.5s`.
- Sin voz: `bloques * 3-4s`.

No agregues musica ni preguntes por musica. `music` debe quedar siempre `false` en manifests de shorts/videos de ingles.

Verifica salida con `ffprobe`.

## Manifest

Cada tanda debe generar manifest:

```text
D:\BackUpDisco\English-shorts\manifests\english_shorts_YYYYMMDD_HHMM.json
```

Formato minimo:

```json
{
  "generatedAt": "...",
  "mode": "phrasal",
  "count": 5,
  "voice": "english_spanish",
  "music": false,
  "items": [
    {
      "title": "give up",
      "slug": "give-up",
      "video": "D:\\BackUpDisco\\English-shorts\\videos\\give-up_phrasal_001.mp4",
      "image": "D:\\BackUpDisco\\English-shorts\\images\\give-up_phrasal_001.png",
      "tts": "D:\\BackUpDisco\\English-shorts\\audio\\tts\\give-up_phrasal_001.wav",
      "validation": "D:\\BackUpDisco\\English-shorts\\validation\\give-up_phrasal_001_validation.json"
    }
  ]
}
```

Usa el manifest para handoff a redes; no escanees carpetas y mezcles outputs viejos.

## Redes Sociales

Despues de generar y verificar videos, pregunta:

```text
Quieres subir/programar estos videos?
```

Si si, delega a `programar-videos` con las rutas del manifest.

Metadata educativa:

```text
#englishlearning #learnenglish #ingles #inglesfacil #englishvocabulary #phrasalverbs #grammar #englishshorts #aprenderingles #inglesonline
```

Ejemplos:

```text
HOUSE significa casa | English Short #learnenglish #ingles
GIVE UP = rendirse | Phrasal Verb #phrasalverbs #englishlearning
Present Perfect explicado facil #grammar #learnenglish #ingles
```

No uses hashtags de beats/rap para estos videos.

## Validaciones Tecnicas

- Verifica existencia de `D:\BackUpDisco` antes de crear carpetas.
- Verifica `ffmpeg` y `ffprobe`.
- Si hay voz, verifica `python` y `edge-tts`.
- Si se usa overlay PNG, verifica Pillow (`PIL`).
- Si falta SFX, continuar sin SFX con aviso.
- Nunca borrar archivos originales ni limpiar carpetas.
- Si output ya existe, crea nombre con contador/timestamp.
- Guarda prompts, validacion y manifest.
- Para una sola palabra, usa `make-english-word-video.ps1` por defecto porque limpia intermedios automaticamente y evita scripts sueltos por video. Si Oscar pide conservar assets, pasale `-KeepAssets`.

## Ejemplo De Uso

Usuario:

```text
genera 3 english shorts
```

Flujo esperado:

1. Preguntar modo.
2. Preguntar voz. No preguntar musica.
3. Generar textos y validarlos.
4. Mostrar preview.
5. Esperar aprobacion.
6. Generar imagenes y pedir aprobacion.
7. Renderizar.
8. Mostrar rutas.
9. Preguntar redes.
