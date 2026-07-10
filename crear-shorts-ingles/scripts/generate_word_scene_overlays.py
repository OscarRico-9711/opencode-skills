import argparse
import json
import os
from PIL import Image, ImageDraw, ImageFont


W, H = 1080, 1920


def font(size, bold=False):
    candidates = [
        r"C:\Windows\Fonts\georgia.ttf" if not bold else r"C:\Windows\Fonts\georgiab.ttf",
        r"C:\Windows\Fonts\times.ttf" if not bold else r"C:\Windows\Fonts\timesbd.ttf",
        r"C:\Windows\Fonts\bahnschrift.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]
    for path in candidates:
        if path and os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def wrap(draw, text, fnt, max_width):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        test = (current + " " + word).strip()
        width = draw.textbbox((0, 0), test, font=fnt)[2]
        if width <= max_width or not current:
            current = test
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_center(draw, text, y, fnt, fill, max_width=940, gap=12):
    lines = wrap(draw, text, fnt, max_width)
    total = 0
    heights = []
    for line in lines:
        box = draw.textbbox((0, 0), line, font=fnt)
        height = box[3] - box[1]
        heights.append(height)
        total += height
    total += gap * max(len(lines) - 1, 0)
    y -= total // 2
    for line, height in zip(lines, heights):
        box = draw.textbbox((0, 0), line, font=fnt)
        x = (W - (box[2] - box[0])) // 2
        draw.text((x, y), line, font=fnt, fill=fill)
        y += height + gap


def panel(draw, style):
    if style == "minimal":
        draw.rectangle((0, 0, W, H), fill=(0, 0, 0, 235))
    else:
        draw.rounded_rectangle((55, 250, 1025, 1665), radius=58, fill=(0, 0, 0, 150), outline=(255, 255, 255, 38), width=3)


def roulette(draw, selected, mode="word"):
    selected_upper = selected.upper()
    if mode == "phrasal":
        words = ["GIVE UP", "LOOK AFTER", "BREAK DOWN", "FIND OUT", "TURN ON", "RUN OUT", "SET UP", "CALL OFF"]
    else:
        words = ["BRAVE", "COZY", "THRIVE", "AWKWARD", "GLOW", "WISE", "CALM", "WONDER"]
    if selected_upper not in words:
        words = [selected_upper] + words[:-1]
    y = 575
    centers = [330, 750]
    for i, word in enumerate(words):
        size = 52
        if word == selected_upper:
            fill = (255, 255, 255, 255)
        else:
            fill = (255, 255, 255, 75)
        x = centers[i % 2]
        yy = y + (i // 2) * 112
        box = draw.textbbox((0, 0), word, font=font(size, False))
        draw.text((x - (box[2] - box[0]) // 2, yy), word, font=font(size, False), fill=fill)


def save_scene(path, scene, data, style):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    title = (data.get("word") or data.get("phrasal_verb") or "English").upper()
    level = data.get("level", "")
    typ = data.get("type", data.get("mode", "word"))
    pronunciation = data.get("pronunciation_hint", "")
    translation = data.get("translation_es", "")
    meaning = data.get("meaning_en", "")
    meaning_es = data.get("meaning_es", "")
    example = data.get("example_en", "")
    example_es = data.get("example_es", "")

    panel(draw, style)

    if scene == "hook":
        hook_text = "Today's phrasal verb is..." if data.get("mode") == "phrasal" else "Today's word is..."
        draw_center(draw, hook_text, 395, font(64, False), (245, 245, 245, 245), 900, 14)
        roulette(draw, title, data.get("mode", "word"))
    elif scene == "reveal":
        draw_center(draw, title, 675, font(128, False), (255, 255, 255, 255), 970, 18)
        draw_center(draw, f"Significa: {translation}", 880, font(58, False), (245, 245, 245, 245), 950, 12)
        meta = f"{pronunciation} · {level} · {typ}" if pronunciation else f"{level} · {typ}"
        draw_center(draw, meta, 1050, font(42, False), (210, 210, 210, 230), 950, 10)
    elif scene == "meaning":
        draw_center(draw, "It means:", 520, font(54, False), (245, 245, 245, 245), 930, 8)
        definition = data.get("definition_en") or meaning
        draw_center(draw, definition, 815, font(54, False), (255, 255, 255, 250), 860, 12)
    elif scene == "example":
        draw_center(draw, "Example:", 530, font(54, False), (245, 245, 245, 245), 930, 8)
        draw_center(draw, f'"{example}"', 785, font(54, False), (255, 255, 255, 250), 860, 12)
        draw_center(draw, example_es, 1115, font(46, False), (220, 220, 220, 235), 860, 12)
    else:
        draw_center(draw, "How would you use it?", 710, font(64, False), (255, 255, 255, 250), 900, 14)
        draw_center(draw, "Leave your own example in the comments.", 980, font(52, False), (235, 235, 235, 240), 850, 12)
        draw_center(draw, "Save this word.", 1205, font(48, False), (210, 210, 210, 225), 850, 10)

    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--content-json", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--basename", required=True)
    parser.add_argument("--style", choices=["minimal", "image"], default="image")
    args = parser.parse_args()

    with open(args.content_json, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    scenes = ["hook", "reveal", "meaning", "example", "cta"]
    paths = []
    for scene in scenes:
        path = os.path.join(args.output_dir, f"{args.basename}_{scene}.png")
        save_scene(path, scene, data, args.style)
        paths.append(path)
    print(json.dumps(paths, ensure_ascii=False))


if __name__ == "__main__":
    main()
