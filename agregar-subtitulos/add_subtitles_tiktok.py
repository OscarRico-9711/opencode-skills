#!/usr/bin/env python3
"""Generate TikTok-style karaoke ASS subtitles from Whisper word timestamps."""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

try:
    import whisper
except ImportError:
    sys.exit("ERROR: openai-whisper no instalado. Ejecuta: pip install openai-whisper")


def fmt_ass(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    cs = int((seconds - int(seconds)) * 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


HIGHLIGHT_COLORS = {
    "azul": "&H00FFDD00",
    "amarillo": "&H0000DDFF",
    "verde": "&H0000DD66",
    "rojo": "&H000000FF",
    "morado": "&H00FF66CC",
    "blanco": "&H00FFFFFF",
}

WORD_LIKE_RE = re.compile(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]")


def normalize_ass_color(value):
    color = (value or "azul").strip().lower()
    if color in HIGHLIGHT_COLORS:
        return HIGHLIGHT_COLORS[color]
    if color.startswith("&h") and len(color) == 10:
        return color.upper()
    valid = ", ".join(HIGHLIGHT_COLORS)
    sys.exit(f"ERROR: Color invalido: {value}. Usa uno de: {valid}, o un color ASS &HAABBGGRR")


def keep_word(word, min_probability):
    word_text = word.get("word", "").strip()
    if not word_text or not WORD_LIKE_RE.search(word_text):
        return False

    probability = word.get("probability")
    if probability is not None and probability < min_probability:
        return False

    return True


def generate_ass(words, play_res_x=1080, play_res_y=1920, highlight_color="azul"):
    secondary_color = normalize_ass_color(highlight_color)
    lines = []
    lines.append("[Script Info]")
    lines.append("Title: TikTok Dynamic Subtitles")
    lines.append("ScriptType: v4.00+")
    lines.append(f"PlayResX: {play_res_x}")
    lines.append(f"PlayResY: {play_res_y}")
    lines.append("ScaledBorderAndShadow: yes")
    lines.append("")
    lines.append("[V4+ Styles]")
    lines.append("Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding")
    lines.append(f"Style: TikTok,Arial,52,&H00AAAAAA,{secondary_color},&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,2,5,60,60,0,1")
    lines.append("")
    lines.append("[Events]")
    lines.append("Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text")

    chunks = []
    current_chunk = []

    for w in words:
        word_text = w.get("word", "").strip()
        if not word_text:
            continue

        if not current_chunk:
            current_chunk.append(w)
        else:
            last_word = current_chunk[-1]
            gap = w["start"] - last_word["end"]

            if gap > 1.5 or len(current_chunk) >= 5:
                chunks.append(current_chunk)
                current_chunk = [w]
            else:
                current_chunk.append(w)

    if current_chunk:
        chunks.append(current_chunk)

    for chunk in chunks:
        chunk_start = chunk[0]["start"]
        chunk_end = chunk[-1]["end"]

        karaoke_parts = []
        for w in chunk:
            word_text = w["word"]
            word_duration = w["end"] - w["start"]
            k_duration = int(max(word_duration * 100, 5))
            karaoke_parts.append(f"{{\\k{k_duration}}}{word_text} ")

        text = "".join(karaoke_parts).strip()
        lines.append(f"Dialogue: 0,{fmt_ass(chunk_start)},{fmt_ass(chunk_end + 0.6)},TikTok,,0,0,0,,{text}")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Generate TikTok-style dynamic karaoke subtitles")
    parser.add_argument("video", help="Path to video file")
    parser.add_argument("--model", default="medium", help="Whisper model (default: medium)")
    parser.add_argument("--language", default="es", help="Language code (default: es)")
    parser.add_argument("--output-dir", default=None, help="Output directory")
    parser.add_argument("--keep-ass", action="store_true", help="Keep intermediate ASS file")
    parser.add_argument("--print-ass", action="store_true", help="Print ASS path only (for scripting)")
    parser.add_argument("--highlight-color", default="azul", help="Highlight color: azul, amarillo, verde, rojo, morado, blanco, or ASS &HAABBGGRR")
    parser.add_argument("--min-word-prob", type=float, default=0.35, help="Drop Whisper words below this confidence (default: 0.35)")
    args = parser.parse_args()

    video_path = Path(args.video)
    if not video_path.is_file():
        sys.exit(f"ERROR: File not found: {video_path}")

    out_dir = Path(args.output_dir) if args.output_dir else video_path.parent
    out_dir.mkdir(parents=True, exist_ok=True)

    stem = video_path.stem
    ass_path = out_dir / f"{stem}_tiktok.ass"

    print(f"Loading whisper model ({args.model})...", file=sys.stderr)
    model = whisper.load_model(args.model)
    print(f"Transcribing {video_path.name}...", file=sys.stderr)
    result = model.transcribe(str(video_path), language=args.language, fp16=False, word_timestamps=True)

    all_words = []
    dropped_words = 0
    for segment in result.get("segments", []):
        words = segment.get("words", [])
        for w in words:
            word_text = w.get("word", "").strip()
            if not keep_word(w, args.min_word_prob):
                dropped_words += 1
                continue

            all_words.append({
                "word": word_text,
                "start": w.get("start", segment.get("start", 0)),
                "end": w.get("end", segment.get("end", 0))
            })

    if not all_words:
        sys.exit("ERROR: No words detected in audio")

    print(f"Words kept: {len(all_words)}", file=sys.stderr)
    print(f"Words dropped by confidence/non-word filter: {dropped_words}", file=sys.stderr)

    ass_content = generate_ass(all_words, highlight_color=args.highlight_color)
    ass_path.write_text(ass_content, encoding="utf-8")
    print(f"ASS generated: {ass_path}", file=sys.stderr)

    if args.print_ass:
        print(ass_path)
        return

    out_path = out_dir / f"{stem}_tiktok_subs{video_path.suffix}"

    print("Burning dynamic subtitles...", file=sys.stderr)
    ffmpeg_cmd = [
        "ffmpeg", "-hide_banner", "-y",
        "-i", str(video_path),
        "-vf", f"ass={ass_path.name}",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(out_path),
    ]
    subprocess.run(ffmpeg_cmd, cwd=str(ass_path.parent), check=True)

    print(f"Video with subtitles: {out_path}", file=sys.stderr)

    if not args.keep_ass:
        ass_path.unlink(missing_ok=True)

    print(json.dumps({
        "output": str(out_path),
        "ass": str(ass_path) if args.keep_ass else None,
        "words": len(all_words),
        "dropped_words": dropped_words
    }))


if __name__ == "__main__":
    main()
