"""Builds images/stages/<stage>.webp, the hero's one model at each stage, from the originals in images/models.

Each original is cropped to the hero's 9:16 frame around the model, then written at 720 x 1280 (the photo is shown
at most 352px wide, so this is 2x). The originals are big camera files and stay out of git and off the site
(.gitignore, netlify.toml). Check every crop for Games Workshop text before shipping it (SPEC.md §4): the sprue's
frame carries "Warhammer" moulded along its right edge, which is why its crop stops short of it.

    python3 tools/stages.py
"""

from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
ORIGINALS = ROOT / "images/models"
OUT = ROOT / "images/stages"

# Stage: (original, centre x, centre y, crop height as a fraction of the original's height)
CROPS = {
    "sprue": ("sprue.JPG", 0.465, 0.50, 1.00),
    "built": ("built.JPG", 0.47, 0.42, 0.66),
    "primed": ("primed.JPG", 0.31, 0.55, 0.86),
    "in-progress": ("in-progress.JPG", 0.41, 0.50, 1.00),
    "done": ("done-1.png", 0.50, 0.50, 1.00),
}


def main():
    OUT.mkdir(exist_ok=True)
    for stage, (name, centre_x, centre_y, fraction) in CROPS.items():
        image = ImageOps.exif_transpose(Image.open(ORIGINALS / name)).convert("RGB")
        width, height = image.size
        crop_height = round(height * fraction)
        crop_width = round(crop_height * 9 / 16)
        if crop_width > width:
            crop_width = width
            crop_height = round(crop_width * 16 / 9)
        left = min(max(0, round(centre_x * width - crop_width / 2)), width - crop_width)
        top = min(max(0, round(centre_y * height - crop_height / 2)), height - crop_height)
        frame = image.crop((left, top, left + crop_width, top + crop_height)).resize((720, 1280), Image.LANCZOS)
        path = OUT / f"{stage}.webp"
        frame.save(path, "WEBP", quality=80, method=6)
        print(f"{stage:12} {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
