import argparse
import json
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920

def font_path(size, bold=False):
    candidates = [
        r"C:\Windows\Fonts\georgiab.ttf" if bold else r"C:\Windows\Fonts\georgia.ttf",
        r"C:\Windows\Fonts\timesbd.ttf" if bold else r"C:\Windows\Fonts\times.ttf",
        r"C:\Windows\Fonts\bahnschrift.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\framd.ttf" if bold else r"C:\Windows\Fonts\framd.ttf",
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


def draw_center(draw, text, y, fnt, fill, max_width=940, gap=10):
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


def save_scene(path, scene, data, style):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if style == "minimal":
        draw.rectangle((0, 0, W, H), fill=(0, 0, 0, 235))
    else:
        draw.rounded_rectangle((55, 200, 1025, 1720), radius=48, fill=(0, 0, 0, 140), outline=(255, 255, 255, 30), width=2)

    title = data.get("title", "Story")

    if scene == "hook":
        draw_center(draw, "Today's story is...", 580, font_path(56), (245, 245, 245, 245), 940, 12)
        draw_center(draw, title, 820, font_path(96, True), (255, 215, 0, 250), 960, 14)
        draw_center(draw, data.get("level", "B1") + " · Short Story", 1080, font_path(38), (200, 200, 200, 230), 900, 8)

    elif scene == "part1":
        draw_center(draw, text := data.get("scenes", {}).get("part1", ""), 750, font_path(50), (255, 255, 255, 250), 900, 14)

    elif scene == "part2":
        draw_center(draw, text := data.get("scenes", {}).get("part2", ""), 750, font_path(50), (255, 255, 255, 250), 900, 14)

    elif scene == "part3":
        draw_center(draw, text := data.get("scenes", {}).get("part3", ""), 750, font_path(50), (255, 255, 255, 250), 900, 14)

    elif scene == "vocab":
        draw_center(draw, "Key Vocabulary", 380, font_path(52), (245, 245, 245, 245), 900, 8)
        vocab_items = data.get("vocab", [])
        y_start = 530
        for i, item in enumerate(vocab_items):
            word = item.get("word", "")
            definition = item.get("definition", "")
            translation = item.get("translation_es", "")
            draw_center(draw, word, y_start, font_path(54, True), (255, 215, 0, 250), 900, 6)
            draw_center(draw, translation, y_start + 80, font_path(44), (255, 255, 255, 240), 900, 6)
            draw_center(draw, definition, y_start + 150, font_path(38), (210, 210, 210, 230), 850, 6)
            y_start += 280

    elif scene == "cta":
        draw_center(draw, data.get("cta", ""), 650, font_path(56), (255, 255, 255, 250), 920, 14)
        draw_center(draw, "Share your answer in the comments!", 940, font_path(46), (235, 235, 235, 240), 880, 10)
        draw_center(draw, "See you next time.", 1200, font_path(42), (210, 210, 210, 225), 850, 8)

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

    scenes = ["hook", "part1", "part2", "part3", "vocab", "cta"]
    paths = []
    for scene in scenes:
        path = os.path.join(args.output_dir, f"{args.basename}_{scene}.png")
        save_scene(path, scene, data, args.style)
        paths.append(path)
    print(json.dumps(paths, ensure_ascii=False))


if __name__ == "__main__":
    main()
