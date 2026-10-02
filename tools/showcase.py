"""Builds images/showcase/<nn>.webp, the finished models drifting along the bottom of the hero.

Sources are the square photos in ../Plinth/Design/Preview Images, plus the hero's finished model. Only finished
models, and nothing with Games Workshop text in shot (SPEC.md §4): left out are "Rhino" (a CITADEL tub behind it),
"Rouge Trader" (box art), "Arbities 4" (a labelled bottle) and the unpainted "Assassin", "Priest" and "Knight".
Published names are numbers, never the unit (SPEC.md §4: no GW names in file names).

    python3 tools/showcase.py
"""

from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
PREVIEWS = ROOT.parent / "Plinth/Design/Preview Images"
OUT = ROOT / "images/showcase"

# In the order they pass, colours alternating so no two neighbours read alike.
SOURCES = [
    PREVIEWS / "Inquisitor.png",
    PREVIEWS / "Destrier.png",
    PREVIEWS / "Navy.png",
    PREVIEWS / "Sisters.png",
    PREVIEWS / "Missionary.png",
    PREVIEWS / "Kill Team.png",
    PREVIEWS / "Chimaera.png",
    PREVIEWS / "Arbities 3.png",
    PREVIEWS / "Inquisitor O.png",
    PREVIEWS / "Armigier.png",
    PREVIEWS / "Kill Team Hero.png",
    PREVIEWS / "Arbities.png",
    ROOT / "images/models/done-2.png",
    PREVIEWS / "Arbities 2.png",
]


def main():
    OUT.mkdir(exist_ok=True)
    for number, source in enumerate(SOURCES, start=1):
        image = ImageOps.exif_transpose(Image.open(source)).convert("RGB")
        side = min(image.size)
        left = (image.width - side) // 2
        # A tall original keeps its upper part: the model, not the floor under the plinth.
        top = (image.height - side) // 3
        square = image.crop((left, top, left + side, top + side)).resize((420, 420), Image.LANCZOS)
        path = OUT / f"{number:02d}.webp"
        square.save(path, "WEBP", quality=74, method=6)
        print(f"{path.name}  {path.stat().st_size // 1024} KB  <- {source.name}")


if __name__ == "__main__":
    main()
