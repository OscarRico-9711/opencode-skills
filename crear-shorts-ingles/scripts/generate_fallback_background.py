import argparse
import hashlib
import os
import random
from PIL import Image, ImageDraw, ImageFilter


W, H = 1080, 1920

PALETTES = [
    ((18, 26, 48), (118, 78, 105), (255, 220, 135)),
    ((24, 35, 58), (228, 158, 92), (110, 180, 255)),
    ((38, 32, 42), (172, 125, 80), (245, 190, 100)),
    ((12, 25, 30), (52, 110, 120), (220, 240, 210)),
    ((30, 22, 52), (95, 70, 135), (255, 205, 150)),
]


def seed_for(text, variant):
    raw = f"{text}|{variant}".encode("utf-8", errors="ignore")
    return int(hashlib.sha256(raw).hexdigest()[:12], 16)


def draw_symbol(draw, concept, variant):
    concept_l = concept.lower()
    if "run out" in concept_l or "out of" in concept_l:
        draw.rounded_rectangle((365, 1040, 715, 1280), 38, outline=(255, 235, 190, 75), width=8, fill=(30, 20, 18, 45))
        draw.arc((405, 1090, 675, 1345), 210, 330, fill=(255, 235, 190, 90), width=14)
        draw.ellipse((475, 1010, 605, 1080), fill=(255, 235, 190, 55))
    elif "give up" in concept_l:
        draw.line((310, 1240, 540, 980, 770, 1240), fill=(255, 235, 190, 70), width=14)
        draw.ellipse((500, 870, 580, 950), fill=(255, 235, 190, 70))
        draw.line((540, 950, 540, 1160), fill=(255, 235, 190, 70), width=12)
    else:
        draw.rounded_rectangle((260, 1060, 820, 1340), 52, outline=(255, 235, 190, 60), width=8, fill=(255, 235, 190, 24))
        draw.line((340, 1198, 740, 1198), fill=(255, 235, 190, 65), width=7)

    if variant % 2 == 0:
        draw.ellipse((710, 180, 1160, 650), fill=(255, 235, 180, 38))
    else:
        draw.ellipse((-160, 1280, 380, 1820), fill=(110, 190, 240, 30))


def generate(output, concept, variant):
    variant = max(1, min(5, variant))
    random.seed(seed_for(concept, variant))
    c0, c1, accent = PALETTES[variant - 1]
    img = Image.new("RGB", (W, H))
    pix = img.load()

    for y in range(H):
        t = y / (H - 1)
        r = int(c0[0] * (1 - t) + c1[0] * t)
        g = int(c0[1] * (1 - t) + c1[1] * t)
        b = int(c0[2] * (1 - t) + c1[2] * t)
        for x in range(W):
            pix[x, y] = (r, g, b)

    draw = ImageDraw.Draw(img, "RGBA")
    for _ in range(28):
        x = random.randint(-280, W + 280)
        y = random.randint(-280, H + 280)
        radius = random.randint(80, 380)
        color = random.choice([
            (accent[0], accent[1], accent[2], 28),
            (120, 200, 255, 22),
            (255, 255, 255, 14),
            (35, 20, 70, 42),
        ])
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=color)

    draw.rounded_rectangle((95, 1080, 985, 1600), 84, fill=(255, 225, 165, 30))
    draw_symbol(draw, concept, variant)
    img = img.filter(ImageFilter.GaussianBlur(1.05))

    os.makedirs(os.path.dirname(output), exist_ok=True)
    img.save(output)
    print(output)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--concept", required=True)
    parser.add_argument("--variant", type=int, default=1)
    args = parser.parse_args()
    generate(args.output, args.concept, args.variant)


if __name__ == "__main__":
    main()
