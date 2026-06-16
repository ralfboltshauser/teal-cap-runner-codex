from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "environment"


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    hex_color = hex_color.lstrip("#")
    return (
        int(hex_color[0:2], 16),
        int(hex_color[2:4], 16),
        int(hex_color[4:6], 16),
        alpha,
    )


PAL = {
    "transparent": (0, 0, 0, 0),
    "soil_dark": rgba("#2d1b12"),
    "soil": rgba("#5b3521"),
    "soil_mid": rgba("#7b4b2b"),
    "soil_light": rgba("#b06b36"),
    "grass_dark": rgba("#2f5734"),
    "grass": rgba("#4f8d4e"),
    "grass_light": rgba("#83b85f"),
    "cream": rgba("#f4df9e"),
    "yellow": rgba("#e7b944"),
    "rose": rgba("#d56f5f"),
    "blue": rgba("#5aa6b9"),
    "teal": rgba("#2ca8a8"),
    "teal_dark": rgba("#0d6069"),
    "copper": rgba("#b96d38"),
    "stone": rgba("#9c8a70"),
    "stone_dark": rgba("#5e5042"),
    "dust": rgba("#efe2bd", 185),
    "dust_soft": rgba("#efe2bd", 88),
    "bird": rgba("#17333a", 230),
}


def save_sheet(name: str, frames: list[Image.Image], fps: int, loop: bool = True) -> dict:
    widths = {frame.width for frame in frames}
    heights = {frame.height for frame in frames}
    if len(widths) != 1 or len(heights) != 1:
        raise ValueError(f"{name}: frames must share dimensions")
    cell_w = frames[0].width
    cell_h = frames[0].height
    sheet = Image.new("RGBA", (cell_w * len(frames), cell_h), PAL["transparent"])
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * cell_w, 0))
    path = OUT / f"{name}.png"
    sheet.save(path)
    return {
        "file": f"environment/{name}.png",
        "frames": len(frames),
        "fps": fps,
        "loop": loop,
        "cellWidth": cell_w,
        "cellHeight": cell_h,
        "imageWidth": sheet.width,
        "imageHeight": sheet.height,
    }


def rect(draw: ImageDraw.ImageDraw, xy, fill):
    draw.rectangle([int(v) for v in xy], fill=fill)


def make_ground_tiles() -> dict:
    frames = []
    for variant in range(4):
        im = Image.new("RGBA", (64, 64), PAL["transparent"])
        d = ImageDraw.Draw(im)
        rect(d, (0, 12, 63, 63), PAL["soil"])
        rect(d, (0, 12, 63, 20), PAL["soil_light"])
        rect(d, (0, 21, 63, 24), PAL["soil_mid"])
        rect(d, (0, 8, 63, 13), PAL["grass_dark"])
        for x in range(-4, 70, 8):
            h = 4 + ((x + variant * 5) % 9)
            d.polygon([(x, 11), (x + 4, 11 - h), (x + 8, 11)], fill=PAL["grass"])
            if (x + variant) % 3 == 0:
                rect(d, (x + 3, 10 - h, x + 4, 11 - h), PAL["grass_light"])
        for i in range(9):
            x = (i * 13 + variant * 7) % 64
            y = 29 + ((i * 11 + variant * 3) % 28)
            w = 5 + ((i + variant) % 5)
            rect(d, (x, y, min(63, x + w), y + 3), PAL["soil_dark"])
        frames.append(im)
    return save_sheet("ground-tiles", frames, fps=1)


def make_flower_bounce() -> dict:
    frames = []
    bends = [0, 5, -4, 3, -2, 0]
    squashes = [0, 2, -1, 1, 0, 0]
    for bend, squash in zip(bends, squashes):
        im = Image.new("RGBA", (56, 56), PAL["transparent"])
        d = ImageDraw.Draw(im)
        base_y = 49
        for root_x, height, color in [(17, 25, PAL["cream"]), (28, 31, PAL["rose"]), (38, 22, PAL["yellow"])]:
            top_x = root_x + bend
            top_y = base_y - height + squash
            d.line([(root_x, base_y), (top_x, top_y)], fill=PAL["grass_dark"], width=3)
            d.line([(root_x + 1, base_y), (top_x + 1, top_y)], fill=PAL["grass_light"], width=1)
            for dx, dy in [(-4, 0), (4, 0), (0, -4), (0, 4)]:
                rect(d, (top_x + dx - 2, top_y + dy - 2, top_x + dx + 2, top_y + dy + 2), color)
            rect(d, (top_x - 2, top_y - 2, top_x + 2, top_y + 2), PAL["yellow"])
        for x in [8, 14, 23, 32, 45]:
            d.polygon([(x, base_y), (x + bend // 2 + 3, base_y - 12), (x + 6, base_y)], fill=PAL["grass"])
        if abs(bend) >= 4:
            for p in [(44, 20), (48, 26), (9, 18)]:
                rect(d, (p[0], p[1], p[0] + 2, p[1] + 2), PAL["yellow"])
        frames.append(im)
    return save_sheet("flower-bounce", frames, fps=12)


def make_grass_sway() -> dict:
    frames = []
    for i in range(6):
        phase = math.sin(i / 6 * math.tau)
        im = Image.new("RGBA", (48, 40), PAL["transparent"])
        d = ImageDraw.Draw(im)
        for blade in range(11):
            x = 5 + blade * 4
            h = 16 + (blade * 5) % 18
            bend = int(phase * (2 + blade % 4))
            color = PAL["grass_light"] if blade % 3 == 0 else PAL["grass"]
            d.polygon([(x, 36), (x + bend + 2, 36 - h), (x + 5, 36)], fill=color)
            rect(d, (x, 35, x + 4, 38), PAL["grass_dark"])
        frames.append(im)
    return save_sheet("grass-sway", frames, fps=8)


def make_bird_flock() -> dict:
    frames = []
    wing = [-5, -2, 2, 5, 2, -2]
    for offset in wing:
        im = Image.new("RGBA", (72, 32), PAL["transparent"])
        d = ImageDraw.Draw(im)
        for bx, by, scale in [(10, 14, 1), (33, 10, 1), (54, 17, 0.8)]:
            s = scale
            d.line([(bx, by), (bx + int(8 * s), by + offset), (bx + int(16 * s), by)], fill=PAL["bird"], width=3)
            rect(d, (bx + int(7 * s), by - 1, bx + int(10 * s), by + 2), PAL["bird"])
        frames.append(im)
    return save_sheet("bird-flock", frames, fps=10)


def make_stone_particles() -> dict:
    frames = []
    stones = [
        (8, 10, 8, 6), (20, 9, 6, 5), (32, 11, 10, 7), (46, 8, 7, 6),
        (10, 25, 5, 4), (24, 24, 8, 6), (38, 26, 6, 5), (51, 24, 9, 6),
    ]
    for x, y, w, h in stones:
        im = Image.new("RGBA", (16, 16), PAL["transparent"])
        d = ImageDraw.Draw(im)
        d.polygon([(3, 10), (5, 5), (11, 4), (14, 8), (11, 13), (5, 13)], fill=PAL["stone_dark"])
        d.polygon([(5, 6), (11, 5), (13, 8), (8, 8)], fill=PAL["stone"])
        d.point((7, 6), fill=PAL["cream"])
        frames.append(im)
    return save_sheet("stone-particles", frames, fps=1, loop=False)


def make_dust_puff() -> dict:
    frames = []
    for i in range(6):
        im = Image.new("RGBA", (64, 32), PAL["transparent"])
        d = ImageDraw.Draw(im)
        alpha = max(36, 170 - i * 24)
        for j in range(5):
            cx = 15 + j * 9 + i * 2
            cy = 23 - j % 2 * 4 - i // 2
            r = 3 + i + j % 3
            fill = (*PAL["dust"][:3], alpha)
            d.ellipse((cx - r, cy - r // 2, cx + r, cy + r // 2), fill=fill)
        frames.append(im)
    return save_sheet("dust-puff", frames, fps=16, loop=False)


def make_meadow_props() -> dict:
    frames = []
    for index in range(4):
        im = Image.new("RGBA", (80, 80), PAL["transparent"])
        d = ImageDraw.Draw(im)
        if index == 0:
            rect(d, (35, 26, 40, 70), PAL["copper"])
            rect(d, (22, 18, 63, 34), PAL["soil_mid"])
            rect(d, (24, 20, 61, 31), PAL["soil_light"])
            rect(d, (28, 23, 54, 25), PAL["cream"])
        elif index == 1:
            rect(d, (37, 28, 42, 70), PAL["teal_dark"])
            d.line((40, 28, 18, 12), fill=PAL["cream"], width=3)
            d.line((40, 28, 62, 12), fill=PAL["cream"], width=3)
            d.line((40, 28, 18, 48), fill=PAL["cream"], width=3)
            d.line((40, 28, 62, 48), fill=PAL["cream"], width=3)
            d.ellipse((34, 22, 46, 34), fill=PAL["teal"])
        elif index == 2:
            rect(d, (25, 52, 31, 67), PAL["cream"])
            d.ellipse((17, 38, 39, 56), fill=PAL["rose"])
            rect(d, (49, 55, 54, 68), PAL["cream"])
            d.ellipse((43, 45, 61, 59), fill=PAL["yellow"])
        else:
            for x, y, w, h in [(18, 55, 24, 12), (40, 50, 18, 10), (55, 58, 12, 8)]:
                d.ellipse((x, y, x + w, y + h), fill=PAL["stone_dark"])
                d.arc((x + 3, y + 2, x + w - 2, y + h), 190, 330, fill=PAL["stone"], width=2)
        frames.append(im)
    return save_sheet("meadow-props", frames, fps=1)


def make_hills() -> dict:
    im = Image.new("RGBA", (960, 220), PAL["transparent"])
    d = ImageDraw.Draw(im)
    d.polygon([(0, 130), (130, 90), (280, 126), (420, 72), (590, 118), (760, 84), (960, 132), (960, 220), (0, 220)], fill=rgba("#244a4f", 140))
    d.polygon([(0, 158), (180, 112), (360, 166), (520, 103), (710, 152), (900, 114), (960, 126), (960, 220), (0, 220)], fill=rgba("#315d55", 150))
    for x in range(40, 930, 110):
        d.rectangle((x, 140 + (x % 3) * 8, x + 18, 220), fill=rgba("#203f39", 110))
        d.polygon([(x - 18, 150 + (x % 3) * 8), (x + 9, 126 + (x % 3) * 8), (x + 36, 150 + (x % 3) * 8)], fill=rgba("#244a42", 120))
    path = OUT / "hills.png"
    im.save(path)
    return {
        "file": "environment/hills.png",
        "frames": 1,
        "fps": 1,
        "loop": False,
        "cellWidth": im.width,
        "cellHeight": im.height,
        "imageWidth": im.width,
        "imageHeight": im.height,
    }


def main() -> None:
    OUT.mkdir(exist_ok=True)
    manifest = {
        "theme": "Windmill Courier Meadow",
        "sprites": {
            "groundTiles": make_ground_tiles(),
            "flowerBounce": make_flower_bounce(),
            "grassSway": make_grass_sway(),
            "birdFlock": make_bird_flock(),
            "stoneParticles": make_stone_particles(),
            "dustPuff": make_dust_puff(),
            "meadowProps": make_meadow_props(),
            "hills": make_hills(),
        },
    }
    (ROOT / "environment-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
