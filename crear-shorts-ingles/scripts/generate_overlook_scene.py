from PIL import Image, ImageDraw, ImageFilter
import math
import random
import sys


def rounded_rectangle(draw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def main():
    output = sys.argv[1]
    w, h = 1080, 1920
    random.seed(8)

    img = Image.new("RGB", (w, h), (18, 16, 18))
    draw = ImageDraw.Draw(img)

    # Warm desk gradient.
    for y in range(h):
        t = y / h
        r = int(22 + 65 * t)
        g = int(18 + 42 * t)
        b = int(20 + 24 * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b))

    # Lamp glow and vignette.
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for radius, alpha in [(850, 20), (640, 32), (420, 46), (260, 60)]:
        gd.ellipse((w - 380 - radius, 120 - radius, w - 380 + radius, 120 + radius), fill=(255, 174, 84, alpha))
    img = Image.alpha_composite(img.convert("RGBA"), glow)

    # Desk surface.
    draw = ImageDraw.Draw(img)
    draw.polygon([(0, 720), (1080, 610), (1080, 1920), (0, 1920)], fill=(78, 48, 34, 235))
    for i in range(0, 1080, 34):
        color = (96 + (i % 3) * 4, 58, 38, 70)
        draw.line([(i, 650), (i - 180, 1920)], fill=color, width=2)

    # Contract paper with shadow.
    shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((170, 740, 910, 1545), radius=28, fill=(0, 0, 0, 110))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    img = Image.alpha_composite(img, shadow)
    draw = ImageDraw.Draw(img)
    rounded_rectangle(draw, (145, 705, 885, 1510), 28, (235, 225, 205, 255), (255, 243, 220, 255), 3)

    # Contract lines; intentionally unreadable.
    for y in range(810, 1350, 58):
        line_w = random.randint(360, 620)
        x = random.randint(215, 260)
        draw.rounded_rectangle((x, y, x + line_w, y + 12), radius=6, fill=(91, 85, 82, 155))
    for y in range(1380, 1450, 28):
        draw.rounded_rectangle((570, y, 805, y + 8), radius=4, fill=(91, 85, 82, 130))

    # Overlooked details: subtle red circles and arrows without text.
    red = (221, 67, 57, 220)
    draw.ellipse((610, 965, 805, 1045), outline=red, width=8)
    draw.arc((510, 880, 690, 1040), 290, 60, fill=red, width=7)
    draw.polygon([(694, 895), (734, 890), (711, 923)], fill=red)
    draw.ellipse((250, 1215, 420, 1285), outline=red, width=7)

    # Sticky notes partly hidden.
    rounded_rectangle(draw, (700, 655, 935, 805), 18, (249, 201, 72, 245), (255, 224, 118, 255), 3)
    draw.line((725, 705, 910, 685), fill=(163, 117, 40, 100), width=8)
    draw.line((730, 750, 885, 735), fill=(163, 117, 40, 90), width=7)
    rounded_rectangle(draw, (95, 1185, 300, 1328), 16, (99, 202, 167, 240), (150, 235, 207, 255), 3)
    draw.line((120, 1235, 275, 1218), fill=(36, 112, 94, 100), width=7)

    # Magnifying glass not being used, symbolizing the missed detail.
    lens_shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    lsd = ImageDraw.Draw(lens_shadow)
    lsd.ellipse((135, 545, 505, 915), fill=(0, 0, 0, 95))
    lsd.line((420, 830, 650, 1085), fill=(0, 0, 0, 130), width=54)
    lens_shadow = lens_shadow.filter(ImageFilter.GaussianBlur(14))
    img = Image.alpha_composite(img, lens_shadow)
    draw = ImageDraw.Draw(img)
    draw.ellipse((115, 520, 485, 890), outline=(214, 225, 224, 245), width=24)
    draw.ellipse((145, 550, 455, 860), fill=(160, 214, 225, 52), outline=(255, 255, 255, 90), width=4)
    draw.line((420, 828, 650, 1080), fill=(53, 48, 48, 255), width=46)
    draw.line((420, 828, 650, 1080), fill=(124, 106, 88, 255), width=22)
    draw.arc((168, 575, 420, 820), 205, 295, fill=(255, 255, 255, 130), width=8)

    # Coffee cup and scattered paper clips.
    draw.ellipse((735, 1390, 995, 1605), fill=(42, 31, 28, 170))
    draw.ellipse((760, 1365, 970, 1545), fill=(236, 224, 206, 255), outline=(80, 65, 58, 190), width=5)
    draw.ellipse((800, 1400, 930, 1510), fill=(64, 35, 22, 255))
    draw.arc((935, 1410, 1040, 1515), 270, 95, fill=(236, 224, 206, 255), width=18)
    for cx, cy, rot in [(118, 1538, -20), (940, 1110, 22), (820, 620, -8)]:
        for off in [0, 8]:
            x0 = cx - 28 + off
            y0 = cy - 10 + off
            x1 = cx + 38 + off
            y1 = cy + 28 + off
            draw.arc((x0, y0, x1, y1), 20 + rot, 310 + rot, fill=(204, 206, 198, 160), width=5)

    # Dark top overlay for readable title cards.
    top = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    td = ImageDraw.Draw(top)
    for y in range(0, 760):
        alpha = int(160 * (1 - y / 760))
        td.line([(0, y), (w, y)], fill=(0, 0, 0, alpha))
    img = Image.alpha_composite(img, top)

    # Cinematic grain.
    grain = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    pixels = grain.load()
    for _ in range(8500):
        x = random.randrange(w)
        y = random.randrange(h)
        v = random.choice([18, 24, 30, 36])
        pixels[x, y] = (255, 235, 190, v)
    img = Image.alpha_composite(img, grain)
    img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=115, threshold=3))
    img.convert("RGB").save(output, quality=95)


if __name__ == "__main__":
    main()
