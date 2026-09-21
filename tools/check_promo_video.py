from pathlib import Path

import imageio.v2 as imageio
from PIL import Image

DIST = Path(__file__).resolve().parents[1] / "dist"
video = DIST / "puzzle-area-promo-real-gameplay.mp4"
poster = DIST / "puzzle-area-promo-real-gameplay-poster.jpg"
sheet = DIST / "area2-contact-sheet.jpg"

for file in [video, poster, sheet]:
    print(file, file.stat().st_size)
    if file.suffix.lower() == ".mp4":
        reader = imageio.get_reader(str(file))
        meta = reader.get_meta_data()
        print(meta)
        fps = meta.get("fps", 30)
        for sec in [1, 3, 5, 8, 11, 13, 15]:
            frame = Image.fromarray(reader.get_data(int(sec * fps))).convert("RGB")
            frame.save(DIST / f"promo-frame-{sec:02d}.jpg", quality=92)
        reader.close()
    else:
        print(Image.open(file).size)
