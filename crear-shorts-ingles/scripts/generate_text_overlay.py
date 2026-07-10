import argparse
import json
import os
from PIL import Image, ImageDraw, ImageFont


def font(size, bold=False):
    candidates = [
        r"C:\Windows\Fonts\bahnschrift.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]
    for path in candidates:
        if path and os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def wrap_text(draw, text, fnt, max_width):
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


def draw_center(draw, text, y, fnt, fill, max_width=920, line_gap=10):
    lines = wrap_text(draw, text, fnt, max_width)
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=fnt)
        x = (1080 - (bbox[2] - bbox[0])) // 2
        draw.text((x, y), line, font=fnt, fill=fill)
        y += (bbox[3] - bbox[1]) + line_gap
    return y


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--content-json", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    with open(args.content_json, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    img = Image.new("RGBA", (1080, 1920), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Large readable panel that uses most of the vertical frame.
    draw.rounded_rectangle((45, 105, 1035, 1815), radius=52, fill=(0, 0, 0, 155), outline=(255, 255, 255, 42), width=3)

    mode = data.get("mode", "word")
    title = data.get("word") or data.get("phrasal_verb") or data.get("topic") or data.get("title", "English")
    level = data.get("level", "")
    typ = data.get("type", mode)

    y = 160
    hook = data.get("hook") or "Word of the day"
    y = draw_center(draw, hook.upper(), y, font(42, True), (120, 220, 255, 255), 960, 8)
    y = draw_center(draw, title.upper(), y + 24, font(128, True), (255, 244, 190, 255), 960, 18)
    pronunciation = data.get("pronunciation_hint", "")
    meta = f"{level}  |  {typ}"
    if pronunciation:
        meta = f"{meta}  |  {pronunciation}"
    y = draw_center(draw, meta, y + 8, font(42, True), (120, 220, 255, 255), 960, 8)

    if mode == "topic":
        rule = data.get("rule_es", "")
        if rule:
            y = draw_center(draw, rule, y + 60, font(50), (245, 245, 245, 255), 940, 12)
        table = data.get("table", [])[:7]
        y += 45
        for row in table:
            left = f"{row.get('subject', '')}  {row.get('verb', '')}  {row.get('complement', '')}".strip()
            example = row.get("example", "")
            trans = row.get("translation", "")
            draw.text((115, y), left, font=font(44, True), fill=(255, 255, 255, 255))
            draw.text((115, y + 58), example, font=font(38), fill=(220, 255, 210, 255))
            draw.text((115, y + 105), trans, font=font(34), fill=(255, 230, 140, 255))
            y += 165
    else:
        translation = data.get("translation_es", "")
        meaning_en = data.get("meaning_en", "")
        meaning_es = data.get("meaning_es", "")
        example_en = data.get("example_en", "")
        example_es = data.get("example_es", "")
        note = data.get("note", "")

        if translation:
            y = draw_center(draw, translation, y + 60, font(72, True), (180, 255, 190, 255), 960, 14)
        if meaning_en:
            y = draw_center(draw, "Meaning", y + 70, font(44, True), (120, 220, 255, 255), 960, 6)
            y = draw_center(draw, meaning_en, y + 10, font(54), (255, 255, 255, 255), 960, 12)
        if meaning_es:
            y = draw_center(draw, meaning_es, y + 14, font(42), (255, 230, 140, 255), 960, 10)
        if example_en:
            y = draw_center(draw, "Example", y + 80, font(44, True), (120, 220, 255, 255), 960, 6)
            y = draw_center(draw, f'"{example_en}"', y + 10, font(52, True), (255, 255, 255, 255), 960, 12)
        if example_es:
            y = draw_center(draw, example_es, y + 12, font(42), (255, 230, 140, 255), 960, 10)
        cta = data.get("cta") or "Deja tu ejemplo en comentarios"
        draw_center(draw, cta, 1660, font(44, True), (180, 255, 190, 255), 920, 8)
        if note:
            draw_center(draw, note, 1565, font(32), (210, 210, 210, 235), 900, 8)

    out_parent = os.path.dirname(args.output)
    if out_parent:
        os.makedirs(out_parent, exist_ok=True)
    img.save(args.output)


if __name__ == "__main__":
    main()
