from __future__ import annotations

import argparse
import math
from pathlib import Path

import imageio.v2 as imageio
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
DIST.mkdir(exist_ok=True)

VIDEO_IN = ROOT / "media-source" / "gameplay.mp4"

CONTACT_SHEET = DIST / "area2-contact-sheet.jpg"
PROMO_VIDEO = DIST / "puzzle-area-promo-vertical.mp4"
PROMO_POSTER = DIST / "puzzle-area-promo-poster.jpg"
REAL_PROMO_VIDEO = DIST / "puzzle-area-promo-real-gameplay.mp4"
REAL_PROMO_POSTER = DIST / "puzzle-area-promo-real-gameplay-poster.jpg"

W, H = 1080, 1920
FPS = 30


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


FONT_TITLE = font(82, True)
FONT_H1 = font(64, True)
FONT_H2 = font(46, True)
FONT_BODY = font(34, True)
FONT_SMALL = font(28, True)


ASSETS = ROOT / "assets"


def load_asset(name: str, size: tuple[int, int]) -> Image.Image | None:
    path = ASSETS / name
    if not path.exists():
        return None
    im = Image.open(path).convert("RGBA")
    im.thumbnail(size, Image.LANCZOS)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(im, ((size[0] - im.width) // 2, (size[1] - im.height) // 2))
    return canvas


ICON_HOME = load_asset("icon-home.png", (56, 56))
ICON_LEVELS = load_asset("icon-levels.png", (56, 56))
ICON_SETTINGS = load_asset("icon-restart.png", (56, 56))
ICON_UNDO = load_asset("icon-undo.png", (72, 72))
ICON_RESTART = load_asset("icon-restart.png", (72, 72))
ICON_HINT = load_asset("icon-hint.png", (72, 72))
ICON_COIN = load_asset("coin-hint.png", (42, 42))
APP_ICON = load_asset("app-icon.png", (150, 150))


def cover_image(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    im = im.convert("RGB")
    scale = max(size[0] / im.width, size[1] / im.height)
    resized = im.resize((math.ceil(im.width * scale), math.ceil(im.height * scale)), Image.LANCZOS)
    left = (resized.width - size[0]) // 2
    top = (resized.height - size[1]) // 2
    return resized.crop((left, top, left + size[0], top + size[1]))


def contain_image(im: Image.Image, size: tuple[int, int], bg=(16, 24, 36)) -> Image.Image:
    im = im.convert("RGBA")
    scale = min(size[0] / im.width, size[1] / im.height)
    resized = im.resize((math.floor(im.width * scale), math.floor(im.height * scale)), Image.LANCZOS)
    bg_im = Image.new("RGBA", size, bg + (255,))
    bg_im.alpha_composite(resized, ((size[0] - resized.width) // 2, (size[1] - resized.height) // 2))
    return bg_im


def rounded_rect(draw: ImageDraw.ImageDraw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def draw_text_center(draw: ImageDraw.ImageDraw, xy, text, fnt, fill, stroke_fill=None, stroke_width=0):
    bbox = draw.textbbox((0, 0), text, font=fnt, stroke_width=stroke_width)
    x = xy[0] - (bbox[2] - bbox[0]) / 2
    y = xy[1] - (bbox[3] - bbox[1]) / 2
    draw.text((x, y), text, font=fnt, fill=fill, stroke_fill=stroke_fill, stroke_width=stroke_width)


def draw_finger(im: Image.Image, x: float, y: float, scale: float = 1.0, pressed: bool = True):
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    r = int(34 * scale)
    if pressed:
        d.ellipse((x - r * 1.35, y - r * 1.35, x + r * 1.35, y + r * 1.35), fill=(255, 255, 255, 56))
        d.ellipse((x - r * 0.85, y - r * 0.85, x + r * 0.85, y + r * 0.85), outline=(255, 255, 255, 190), width=max(3, int(4 * scale)))
    # A clean touch cursor, shaped like a fingertip without looking cartoony.
    d.rounded_rectangle((x - r * 0.62, y - r * 1.85, x + r * 0.62, y + r * 0.45), radius=int(r * 0.55), fill=(255, 244, 230, 245), outline=(28, 35, 48, 90), width=2)
    d.rounded_rectangle((x - r * 0.48, y + r * 0.05, x + r * 1.35, y + r * 1.8), radius=int(r * 0.42), fill=(255, 244, 230, 245), outline=(28, 35, 48, 90), width=2)
    d.ellipse((x - r * 0.24, y - r * 1.55, x + r * 0.24, y - r * 1.05), fill=(255, 255, 255, 76))
    im.alpha_composite(overlay.filter(ImageFilter.GaussianBlur(0.2)))


def make_realistic_finger(scale: float = 1.0) -> tuple[Image.Image, tuple[int, int]]:
    w, h = int(210 * scale), int(340 * scale)
    base = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((int(78 * scale), int(28 * scale), int(146 * scale), int(278 * scale)), radius=int(34 * scale), fill=(0, 0, 0, 88))
    sd.rounded_rectangle((int(58 * scale), int(238 * scale), int(178 * scale), int(328 * scale)), radius=int(42 * scale), fill=(0, 0, 0, 68))
    shadow = shadow.filter(ImageFilter.GaussianBlur(int(10 * scale)))
    base.alpha_composite(shadow, (int(8 * scale), int(10 * scale)))

    d = ImageDraw.Draw(base)
    skin_dark = (218, 163, 122, 255)
    skin = (246, 202, 166, 255)
    skin_light = (255, 226, 198, 255)
    nail = (248, 225, 215, 255)
    outline = (84, 55, 42, 105)

    d.rounded_rectangle((int(70 * scale), int(18 * scale), int(148 * scale), int(286 * scale)), radius=int(39 * scale), fill=skin, outline=outline, width=max(1, int(2 * scale)))
    d.rounded_rectangle((int(48 * scale), int(250 * scale), int(174 * scale), int(334 * scale)), radius=int(41 * scale), fill=skin_dark, outline=outline, width=max(1, int(2 * scale)))
    d.ellipse((int(90 * scale), int(42 * scale), int(128 * scale), int(86 * scale)), fill=nail, outline=(150, 108, 92, 115), width=max(1, int(2 * scale)))
    d.arc((int(82 * scale), int(116 * scale), int(137 * scale), int(154 * scale)), 12, 168, fill=(176, 121, 92, 90), width=max(1, int(2 * scale)))
    d.arc((int(80 * scale), int(180 * scale), int(139 * scale), int(222 * scale)), 12, 168, fill=(176, 121, 92, 76), width=max(1, int(2 * scale)))
    d.line((int(92 * scale), int(34 * scale), int(80 * scale), int(238 * scale)), fill=skin_light, width=max(2, int(4 * scale)))
    d.ellipse((int(99 * scale), int(54 * scale), int(120 * scale), int(71 * scale)), fill=(255, 255, 255, 48))

    anchor = (int(109 * scale), int(64 * scale))
    return base, anchor


FINGER_IMAGE, FINGER_ANCHOR = make_realistic_finger(0.9)


def draw_real_finger(im: Image.Image, x: float, y: float, pressed: bool = True, opacity: float = 1.0):
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    if pressed:
        for i, alpha in enumerate([70, 42, 24]):
            r = 34 + i * 22
            d.ellipse((x - r, y - r, x + r, y + r), outline=(255, 255, 255, alpha), width=5)
        d.ellipse((x - 22, y - 22, x + 22, y + 22), fill=(255, 255, 255, 46))
    finger = FINGER_IMAGE.copy()
    if opacity < 1:
        a = finger.getchannel("A").point(lambda value: int(value * opacity))
        finger.putalpha(a)
    overlay.alpha_composite(finger, (int(x - FINGER_ANCHOR[0]), int(y - FINGER_ANCHOR[1])))
    im.alpha_composite(overlay)


def draw_logo_mark(d: ImageDraw.ImageDraw, cx: int, cy: int, s: int):
    colors = ["#ff7a1a", "#22c55e", "#06b6d4", "#facc15"]
    offsets = [(-0.55, -0.55), (0.2, -0.62), (-0.43, 0.18), (0.32, 0.1)]
    for color, (ox, oy) in zip(colors, offsets):
        x = cx + int(ox * s)
        y = cy + int(oy * s)
        rounded_rect(d, (x, y, x + int(s * 0.62), y + int(s * 0.62)), int(s * 0.12), color)


def paste_center(base: Image.Image, icon: Image.Image | None, cx: float, cy: float):
    if icon is None:
        return
    base.alpha_composite(icon, (int(cx - icon.width / 2), int(cy - icon.height / 2)))


def make_contact_sheet():
    reader = imageio.get_reader(str(VIDEO_IN))
    meta = reader.get_meta_data()
    fps = float(meta.get("fps") or 30)
    duration = float(meta.get("duration") or 10)
    times = np.linspace(0, max(0.1, duration - 0.2), 12)
    thumb_w, thumb_h = 180, 320
    sheet = Image.new("RGB", (thumb_w * 4, thumb_h * 3), (20, 24, 32))
    d = ImageDraw.Draw(sheet)
    for pos, t in enumerate(times):
        try:
            arr = reader.get_data(int(t * fps))
        except Exception:
            continue
        im = Image.fromarray(arr).convert("RGB")
        im.thumbnail((thumb_w, thumb_h))
        x = (pos % 4) * thumb_w + (thumb_w - im.width) // 2
        y = (pos // 4) * thumb_h + (thumb_h - im.height) // 2
        sheet.paste(im, (x, y))
        d.text(((pos % 4) * thumb_w + 8, (pos // 4) * thumb_h + 8), f"{t:.1f}s", font=FONT_SMALL, fill=(255, 255, 255))
    sheet.save(CONTACT_SHEET, quality=92)
    reader.close()
    return meta


def ease(t: float) -> float:
    t = max(0, min(1, t))
    return t * t * (3 - 2 * t)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def rect_lerp(a, b, t):
    return tuple(lerp(a[i], b[i], t) for i in range(4))


def draw_game_mock(progress_time: float, theme="dark") -> Image.Image:
    bg = "#101820" if theme == "dark" else "#eef8ff"
    title = "#f9fafb" if theme == "dark" else "#0c4a6e"
    muted = "#d7dee8" if theme == "dark" else "#3b6985"
    cell = "#1f2b3a" if theme == "dark" else "#ffffff"
    cell_border = "#354457" if theme == "dark" else "#dbe8f1"
    im = Image.new("RGBA", (W, H), bg)
    d = ImageDraw.Draw(im)

    d.text((72, 132), "PUZZLE AREA", font=FONT_H1, fill=title)
    d.text((72, 214), "Level 881 / 975 - 11x12", font=FONT_BODY, fill=muted)
    d.text((72, 268), "Move 6", font=FONT_SMALL, fill=muted)
    top_icons = [ICON_HOME, ICON_LEVELS, ICON_COIN, ICON_SETTINGS]
    for i, icon in enumerate(top_icons):
        x = 608 + i * 108
        rounded_rect(d, (x, 154, x + 84, 238), 14, "#eef2f7" if theme == "dark" else "#0b6ea3")
        paste_center(im, icon, x + 42, 196)

    grid_x, grid_y = 72, 555
    cols, rows = 10, 9
    gap, cw, ch = 14, 75, 75
    for r in range(rows):
        for c in range(cols):
            x = grid_x + c * (cw + gap)
            y = grid_y + r * (ch + gap)
            rounded_rect(d, (x, y, x + cw, y + ch), 12, cell, cell_border, 2)

    fixed = [
        ((2, 0, 5, 9), "#4ecdc4", "20", (0.05, 0.5)),
        ((6, 0, 8, 4), "#74c0fc", "15", (0.86, 0.55)),
        ((6, 5, 8, 9), "#ff6b6b", "15", (0.08, 0.15)),
        ((0, 2, 1, 6), "#ff8787", "10", (0.5, 0.5)),
        ((0, 7, 1, 9), "#69db7c", "6", (0.5, 0.5)),
    ]
    animated = [
        ((0.4, 2.2), (0, 0, 1, 1), "#ffd43b", "4"),
        ((2.6, 4.8), (3, 7, 3, 9), "#b197fc", "3"),
        ((5.2, 7.4), (7, 8, 8, 9), "#ffe66d", "4"),
    ]

    for rect, color, text, pos in fixed:
        r1, c1, r2, c2 = rect
        x1 = grid_x + c1 * (cw + gap)
        y1 = grid_y + r1 * (ch + gap)
        x2 = grid_x + c2 * (cw + gap) + cw
        y2 = grid_y + r2 * (ch + gap) + ch
        rounded_rect(d, (x1, y1, x2, y2), 12, color + "dd")
        tx = x1 + (x2 - x1) * pos[0]
        ty = y1 + (y2 - y1) * pos[1]
        draw_text_center(d, (tx, ty), text, FONT_BODY, "#101820")

    finger = None
    for (start, end), rect, color, text in animated:
        if progress_time >= end:
            r1, c1, r2, c2 = rect
            x1 = grid_x + c1 * (cw + gap)
            y1 = grid_y + r1 * (ch + gap)
            x2 = grid_x + c2 * (cw + gap) + cw
            y2 = grid_y + r2 * (ch + gap) + ch
            rounded_rect(d, (x1, y1, x2, y2), 12, color + "e8")
            draw_text_center(d, ((x1 + x2) / 2, (y1 + y2) / 2), text, FONT_BODY, "#101820")
        elif start <= progress_time < end:
            t = ease((progress_time - start) / (end - start))
            r1, c1, r2, c2 = rect
            sx = grid_x + c1 * (cw + gap) + cw * 0.5
            sy = grid_y + r1 * (ch + gap) + ch * 0.5
            ex = grid_x + c2 * (cw + gap) + cw * 0.5
            ey = grid_y + r2 * (ch + gap) + ch * 0.5
            fx, fy = lerp(sx, ex, t), lerp(sy, ey, t)
            cur_c1 = min(sx, fx) - cw * 0.5
            cur_r1 = min(sy, fy) - ch * 0.5
            cur_c2 = max(sx, fx) + cw * 0.5
            cur_r2 = max(sy, fy) + ch * 0.5
            rounded_rect(d, (cur_c1, cur_r1, cur_c2, cur_r2), 12, color + "80")
            draw_text_center(d, ((cur_c1 + cur_c2) / 2, (cur_r1 + cur_r2) / 2), text, FONT_BODY, "#101820")
            finger = (fx, fy + 42)

    if finger:
        draw_finger(im, finger[0], finger[1], 1.1, True)

    # Bottom controls
    yb = 1660
    bottom_icons = [ICON_UNDO, ICON_RESTART, ICON_HINT]
    for i, icon in enumerate(bottom_icons):
        x = 72 + i * 330
        rounded_rect(d, (x, yb, x + 292, yb + 118), 14, "#e5e7eb" if theme == "dark" and i < 2 else "#334155" if theme == "dark" else "#0b6ea3")
        if i < 2:
            paste_center(im, icon, x + 146, yb + 59)
        else:
            paste_center(im, icon, x + 112, yb + 59)
            rounded_rect(d, (x + 170, yb + 34, x + 258, yb + 84), 10, "#f8fafc")
            draw_text_center(d, (x + 210, yb + 59), "10", FONT_SMALL, "#101820")
            paste_center(im, ICON_COIN, x + 240, yb + 59)

    return im


def draw_copy(im: Image.Image, headline: str, sub: str | None = None, y: int = 1410):
    d = ImageDraw.Draw(im)
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rounded_rectangle((62, y - 38, W - 62, y + 172), radius=28, fill=(5, 12, 24, 162))
    im.alpha_composite(overlay)
    draw_text_center(d, (W / 2, y + 28), headline, FONT_H2, "#ffffff")
    if sub:
        draw_text_center(d, (W / 2, y + 96), sub, FONT_BODY, "#dbeafe")


def draw_small_copy(im: Image.Image, headline: str, sub: str | None = None):
    d = ImageDraw.Draw(im)
    draw_text_center(d, (W / 2, 132), headline, FONT_H1, "#ffffff", "#06101f", 2)
    if sub:
        draw_text_center(d, (W / 2, 205), sub, FONT_BODY, "#dbeafe", "#06101f", 2)


class SourceVideo:
    def __init__(self, path: Path):
        self.reader = imageio.get_reader(str(path))
        self.meta = self.reader.get_meta_data()
        self.fps = float(self.meta.get("fps") or 60)
        self.duration = float(self.meta.get("duration") or 1)

    def frame_at(self, sec: float) -> Image.Image:
        sec = max(0, min(self.duration - 0.04, sec))
        return Image.fromarray(self.reader.get_data(int(sec * self.fps))).convert("RGBA")

    def close(self):
        self.reader.close()


def paste_source_clip(base: Image.Image, source_frame: Image.Image, crop: tuple[int, int, int, int], box: tuple[int, int, int, int]) -> tuple[float, float, float, float]:
    clip = source_frame.crop(crop)
    target_w = box[2] - box[0]
    target_h = box[3] - box[1]
    contained = contain_image(clip, (target_w, target_h), bg=(14, 22, 34)).convert("RGBA")
    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((box[0] - 8, box[1] + 8, box[2] + 8, box[3] + 18), radius=34, fill=(0, 0, 0, 86))
    base.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(12)))
    mask = Image.new("L", (target_w, target_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, target_w, target_h), radius=30, fill=255)
    contained.putalpha(mask)
    base.alpha_composite(contained, (box[0], box[1]))
    return (box[0], box[1], target_w / (crop[2] - crop[0]), target_h / (crop[3] - crop[1]))


def source_to_canvas(transform, crop, sx: float, sy: float) -> tuple[float, float]:
    x0, y0, scale_x, scale_y = transform
    return x0 + (sx - crop[0]) * scale_x, y0 + (sy - crop[1]) * scale_y


def real_promo_frame(source: SourceVideo, sec: float) -> Image.Image:
    im = Image.new("RGBA", (W, H), "#101820")
    d = ImageDraw.Draw(im)
    for x in range(0, W, 120):
        d.line((x, 0, x, H), fill=(28, 42, 64), width=1)
    for y in range(0, H, 120):
        d.line((0, y, W, y), fill=(28, 42, 64), width=1)

    if sec < 1.8:
        if APP_ICON:
            paste_center(im, APP_ICON, W // 2, 540)
        else:
            draw_logo_mark(d, W // 2, 540, 150)
        draw_text_center(d, (W / 2, 825), "PUZZLE AREA", FONT_TITLE, "#ffffff")
        draw_text_center(d, (W / 2, 930), "Find Areas By Number", FONT_H2, "#dbeafe")
        return im.convert("RGB")

    if sec < 8.6:
        local = sec - 1.8
        source_sec = 9.2 + local * 1.95
        crop = (0, 135, 384, 780)
        box = (78, 285, 1002, 1665)
        transform = paste_source_clip(im, source.frame_at(source_sec), crop, box)
        draw_small_copy(im, "Drag To Mark Areas", "2 means 2 cells, 3 means 3 cells")
        # Touch paths matching the real 3x3 board area in the recording.
        paths = [
            (0.35, 1.55, (85, 390), (284, 390)),
            (2.05, 3.35, (285, 390), (285, 590)),
            (4.1, 5.25, (86, 590), (185, 590)),
        ]
        for start, end, a, b in paths:
            if start <= local <= end:
                t = ease((local - start) / (end - start))
                sx = lerp(a[0], b[0], t)
                sy = lerp(a[1], b[1], t)
                x, y = source_to_canvas(transform, crop, sx, sy)
                draw_real_finger(im, x, y, True)
        return im.convert("RGB")

    if sec < 11.8:
        local = sec - 8.6
        source_sec = 24.7 + local * 1.8
        crop = (0, 95, 384, 820)
        box = (88, 310, 992, 1690)
        transform = paste_source_clip(im, source.frame_at(source_sec), crop, box)
        draw_small_copy(im, "Unlock Bigger Layers", "Grow from small boards to advanced puzzles")
        if 1.05 <= local <= 2.05:
            sx, sy = lerp(250, 330, ease(local - 1.05)), 150
            x, y = source_to_canvas(transform, crop, sx, sy)
            draw_real_finger(im, x, y, True)
        return im.convert("RGB")

    if sec < 14.4:
        local = sec - 11.8
        source_sec = 30.9 + local * 1.15
        crop = (0, 145, 384, 780)
        box = (78, 285, 1002, 1665)
        transform = paste_source_clip(im, source.frame_at(source_sec), crop, box)
        draw_small_copy(im, "Plan Every Rectangle", "No L-shapes. Fill the whole board.")
        if 0.55 <= local <= 2.2:
            sx, sy = lerp(86, 286, ease((local - 0.55) / 1.65)), lerp(388, 585, ease((local - 0.55) / 1.65))
            x, y = source_to_canvas(transform, crop, sx, sy)
            draw_real_finger(im, x, y, True)
        return im.convert("RGB")

    if APP_ICON:
        paste_center(im, APP_ICON, W // 2, 470)
    else:
        draw_logo_mark(d, W // 2, 470, 150)
    draw_text_center(d, (W / 2, 760), "PUZZLE AREA", FONT_TITLE, "#ffffff")
    draw_text_center(d, (W / 2, 870), "975 Logic Levels", FONT_H2, "#dbeafe")
    draw_text_center(d, (W / 2, 960), "3x3 To 11x12 Layers", FONT_BODY, "#93c5fd")
    rounded_rect(d, (220, 1220, 860, 1348), 22, "#ffffff")
    draw_text_center(d, (W / 2, 1284), "Download Now", FONT_H2, "#101820")
    return im.convert("RGB")


def make_real_promo():
    source = SourceVideo(VIDEO_IN)
    try:
        duration = 16.0
        writer = imageio.get_writer(str(REAL_PROMO_VIDEO), fps=FPS, codec="libx264", quality=8, pixelformat="yuv420p", macro_block_size=1)
        total = int(duration * FPS)
        for i in range(total):
            sec = i / FPS
            frame = real_promo_frame(source, sec)
            writer.append_data(np.asarray(frame))
            if i == int(5.5 * FPS):
                frame.save(REAL_PROMO_POSTER, quality=94)
        writer.close()
    finally:
        source.close()


def make_intro(t):
    im = Image.new("RGBA", (W, H), "#101820")
    d = ImageDraw.Draw(im)
    # subtle grid
    for x in range(0, W, 120):
        d.line((x, 0, x, H), fill=(35, 50, 75), width=1)
    for y in range(0, H, 120):
        d.line((0, y, W, y), fill=(35, 50, 75), width=1)
    s = int(150 + 12 * math.sin(t * math.pi * 2))
    if APP_ICON:
        paste_center(im, APP_ICON, W // 2, 520)
    else:
        draw_logo_mark(d, W // 2, 520, s)
    draw_text_center(d, (W / 2, 810), "PUZZLE AREA", FONT_TITLE, "#ffffff")
    draw_text_center(d, (W / 2, 900), "Find The Areas", FONT_H2, "#dbeafe")
    draw_text_center(d, (W / 2, 970), "Complete The Puzzle", FONT_BODY, "#93c5fd")
    return im


def make_outro():
    im = Image.new("RGBA", (W, H), "#101820")
    d = ImageDraw.Draw(im)
    for x in range(0, W, 120):
        d.line((x, 0, x, H), fill=(35, 50, 75), width=1)
    for y in range(0, H, 120):
        d.line((0, y, W, y), fill=(35, 50, 75), width=1)
    if APP_ICON:
        paste_center(im, APP_ICON, W // 2, 470)
    else:
        draw_logo_mark(d, W // 2, 470, 150)
    draw_text_center(d, (W / 2, 760), "PUZZLE AREA", FONT_TITLE, "#ffffff")
    draw_text_center(d, (W / 2, 870), "1000+ Logic Puzzles", FONT_H2, "#dbeafe")
    draw_text_center(d, (W / 2, 960), "3x3 to 11x12 Layers", FONT_BODY, "#93c5fd")
    rounded_rect(d, (220, 1220, 860, 1348), 22, "#ffffff")
    draw_text_center(d, (W / 2, 1284), "Download Now", FONT_H2, "#101820")
    return im


def make_frame(sec: float) -> Image.Image:
    if sec < 2.2:
        im = make_intro(sec / 2.2)
    elif sec < 4.4:
        im = draw_game_mock(9.0, "dark")
        shade = Image.new("RGBA", (W, H), (0, 0, 0, 54))
        im.alpha_composite(shade)
        draw_copy(im, "Big Layers", "Think Bigger As Boards Grow")
    elif sec < 12.2:
        im = draw_game_mock(sec - 4.4, "dark")
        if sec < 7.0:
            draw_copy(im, "Drag To Select", "Each number shows the area size", 1360)
        elif sec < 9.6:
            draw_copy(im, "Only Rectangles", "No L-shapes. Plan every area.", 1360)
        else:
            draw_copy(im, "Complete The Board", "Every cell becomes part of the solution", 1360)
    elif sec < 14.2:
        im = draw_game_mock(9.0, "dark")
        d = ImageDraw.Draw(im)
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 92))
        im.alpha_composite(overlay)
        draw_text_center(d, (W / 2, 770), "Level Complete", FONT_TITLE, "#ffffff")
        draw_text_center(d, (W / 2, 880), "+1 Hint Coin  +1 Layer Coin", FONT_H2, "#facc15")
        draw_text_center(d, (W / 2, 1000), "Unlock New Layers", FONT_BODY, "#dbeafe")
    else:
        im = make_outro()
    return im.convert("RGB")


def make_promo():
    duration = 16.0
    writer = imageio.get_writer(str(PROMO_VIDEO), fps=FPS, codec="libx264", quality=8, pixelformat="yuv420p", macro_block_size=1)
    total = int(duration * FPS)
    for i in range(total):
        sec = i / FPS
        frame = make_frame(sec)
        writer.append_data(np.asarray(frame))
        if i == int(6 * FPS):
            frame.save(PROMO_POSTER, quality=94)
    writer.close()


def parse_args():
    parser = argparse.ArgumentParser(description="Create Puzzle Area promotional videos.")
    parser.add_argument(
        "--video",
        type=Path,
        default=VIDEO_IN,
        help="Source gameplay recording (default: media-source/gameplay.mp4)",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    VIDEO_IN = args.video.resolve()
    if not VIDEO_IN.exists():
        raise FileNotFoundError(f"Gameplay recording not found: {VIDEO_IN}")
    meta = make_contact_sheet()
    print("video_meta", meta)
    print("contact_sheet", CONTACT_SHEET)
    make_promo()
    make_real_promo()
    print("promo_video", PROMO_VIDEO)
    print("promo_poster", PROMO_POSTER)
    print("real_promo_video", REAL_PROMO_VIDEO)
    print("real_promo_poster", REAL_PROMO_POSTER)
