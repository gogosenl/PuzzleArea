from pathlib import Path
from PIL import Image, ImageFilter


SOURCE_DIR = Path(r"C:\Users\KARBORU\Desktop\puzzlearea")
OUTPUT_DIR = Path(r"C:\Users\KARBORU\Documents\Codex\2026-07-13\playstore-tablet-screenshots")

TARGETS = {
    "7-inch": (1200, 1920),
    "10-inch": (1600, 2560),
}


def cover_resize(image, size):
    target_w, target_h = size
    scale = max(target_w / image.width, target_h / image.height)
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - target_w) // 2
    top = (resized.height - target_h) // 2
    return resized.crop((left, top, left + target_w, top + target_h))


def make_tablet_shot(source_path, target_size, output_path):
    target_w, target_h = target_size
    source = Image.open(source_path).convert("RGB")

    background = cover_resize(source, target_size).filter(ImageFilter.GaussianBlur(radius=34))
    wash = Image.new("RGB", target_size, source.getpixel((8, 8)))
    background = Image.blend(background, wash, 0.62)

    scale = min(target_h / source.height, target_w / source.width)
    foreground = source.resize((round(source.width * scale), round(source.height * scale)), Image.Resampling.LANCZOS)
    x = (target_w - foreground.width) // 2
    y = (target_h - foreground.height) // 2

    shadow = Image.new("RGBA", target_size, (0, 0, 0, 0))
    shadow_box = Image.new("RGBA", foreground.size, (0, 0, 0, 90)).filter(ImageFilter.GaussianBlur(radius=18))
    shadow.alpha_composite(shadow_box, (x, y + 10))

    canvas = background.convert("RGBA")
    canvas.alpha_composite(shadow)
    canvas.paste(foreground, (x, y))
    canvas.convert("RGB").save(output_path, "PNG", optimize=True)


def main():
    sources = [SOURCE_DIR / f"{index}.png" for index in range(1, 4)]
    for label, size in TARGETS.items():
        folder = OUTPUT_DIR / label
        folder.mkdir(parents=True, exist_ok=True)
        for index, source in enumerate(sources, start=1):
            make_tablet_shot(source, size, folder / f"puzzle-area-tablet-{label}-{index}.png")


if __name__ == "__main__":
    main()
