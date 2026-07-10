#!/usr/bin/env python3
"""Transcribe video audio with Whisper and burn subtitles into the video."""

import argparse
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    import whisper
except ImportError:
    sys.exit("ERROR: openai-whisper no instalado. Ejecuta: pip install openai-whisper")


def fmt_srt(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds - int(seconds)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def segments_to_srt(segments):
    lines = []
    for i, seg in enumerate(segments, 1):
        start = fmt_srt(seg["start"])
        end = fmt_srt(seg["end"])
        text = seg["text"].strip()
        if not text:
            continue
        lines.append(str(i))
        lines.append(f"{start} --> {end}")
        lines.append(text)
        lines.append("")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Agregar subtítulos quemados a un video usando Whisper")
    parser.add_argument("video", help="Ruta al archivo de video")
    parser.add_argument("--model", default="medium", help="Modelo Whisper: tiny, base, small, medium, large (default: medium)")
    parser.add_argument("--language", default="es", help="Código de idioma (default: es)")
    parser.add_argument("--output-dir", default=None, help="Directorio de salida (default: mismo que el video)")
    parser.add_argument("--suffix", default="_subs", help="Sufijo para el archivo de salida (default: _subs)")
    parser.add_argument("--keep-srt", action="store_true", help="Conservar el archivo SRT intermedio")
    args = parser.parse_args()

    video_path = Path(args.video)
    if not video_path.is_file():
        sys.exit(f"ERROR: No existe el video: {video_path}")

    out_dir = Path(args.output_dir) if args.output_dir else video_path.parent
    if not out_dir.exists():
        out_dir.mkdir(parents=True, exist_ok=True)

    stem = video_path.stem
    srt_path = out_dir / f"{stem}.srt"
    out_path = out_dir / f"{stem}{args.suffix}{video_path.suffix}"

    # 1. Transcribe with Whisper
    print(f"Cargando modelo whisper ({args.model})...")
    model = whisper.load_model(args.model)
    print(f"Transcribiendo {video_path.name}...")
    result = model.transcribe(str(video_path), language=args.language, fp16=False)

    # 2. Write SRT
    srt_content = segments_to_srt(result["segments"])
    srt_path.write_text(srt_content, encoding="utf-8")
    print(f"SRT generado: {srt_path}")

    # 3. Burn subtitles into video
    print(f"Quemando subtítulos...")
    ffmpeg_cmd = [
        "ffmpeg", "-hide_banner", "-y",
        "-i", str(video_path),
        "-vf", f"subtitles={srt_path.name}",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(out_path),
    ]
    # Run from the srt directory so ffmpeg can find the srt file
    subprocess.run(ffmpeg_cmd, cwd=str(srt_path.parent), check=True)

    print(f"Video con subtítulos: {out_path}")

    if not args.keep_srt:
        srt_path.unlink(missing_ok=True)
        print(f"SRT temporal eliminado: {srt_path.name}")

    # 4. Print result as JSON for automation
    print(json.dumps({"output": str(out_path), "srt": str(srt_path) if args.keep_srt else None}))


if __name__ == "__main__":
    main()
