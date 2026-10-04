"""Builds data/paints.json, the catalogue the landing page's colour tool matches against.

Reads the app's bundled catalogue (../Plinth/PaintingDeskKit/Sources/PaintingDeskPaintData/Catalogue) and keeps the paints a
ramp or harmony may answer with: the solid finishes (Finish.matchClass == "solid"). Leaves out everything the site
must not show (SPEC.md §4): Citadel, licensed ranges, and names that are someone else's mark or worse.
Pot shape and cap colour per range follow ../Plinth/PaintingDesk/Components/PotShape.swift.

    python3 tools/paints.py
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOGUE = ROOT.parent / "Plinth/PaintingDeskKit/Sources/PaintingDeskPaintData/Catalogue"
OUT = ROOT / "data/paints.json"

SOLID = {"matte", "satin", "gloss", "fluorescent"}
LEFT_OUT_BRANDS = {"Citadel"}
LEFT_OUT_RANGES = re.compile(r"D&D|Fluor Metallic|Auxiliary|Surface")  # licensed; a data bug (DESIGN.md); mediums and primers
LEFT_OUT_NAMES = re.compile(r"\bultramar\b|\bork\b|\bSS\b|waffen", re.I)

WHITE, BLACK, RED, GREEN, TEAL, CRIMSON, BLUE = "FFFFFF", "2C2A29", "A8322C", "3F6B3A", "2A9099", "C9264A", "2F5C8A"


def shape(brand, rng):
    rng = rng.lower()
    if brand == "The Army Painter" or brand == "P3":
        return "armypainter"
    if brand == "AK Interactive":
        if "artist" in rng:
            return "tube"
        if any(word in rng for word in ("primer", "varnish", "auxiliary")):
            return "pot"
        return "ak"
    if brand == "Scale75":
        if rng.startswith("artist"):
            return "tube"
        if rng.startswith(("soil works", "primer")):
            return "pot"
        return "s75"
    if brand == "Liquitex":
        return "liquitex" if "ink" in rng else "tube"
    if brand == "Green Stuff World":
        return "pot" if "surface" in rng else "generic"
    if brand == "Tamiya":
        return "pot"
    return "generic"


def cap(brand, rng):
    rng = rng.lower()
    if brand == "The Army Painter":
        if any(word in rng for word in ("wash", "tone", "quickshade")):
            return RED
        if "metallic" in rng or "primer" in rng:
            return BLACK
        if "effects" in rng:
            return GREEN
        return WHITE
    if brand == "AK Interactive":
        if "ink" in rng or "wash" in rng:
            return TEAL
        if "quick" in rng:
            return CRIMSON
        if any(word in rng for word in ("varnish", "auxiliary", "primer", "artist")):
            return BLACK
        return WHITE
    if brand == "Vallejo":
        return BLACK if rng.startswith(("xpress", "game")) else WHITE
    if brand == "Scale75":
        return BLUE if rng.startswith("fantasy") else BLACK
    if brand == "P3":
        return WHITE
    return BLACK


def main():
    ranges, index, paints = [], {}, []
    for path in sorted(CATALOGUE.glob("*.json")):
        for paint in json.loads(path.read_text())["paints"]:
            brand, rng, name = paint["brand"], paint["range"], paint["name"]
            if paint["finish"] not in SOLID or brand in LEFT_OUT_BRANDS:
                continue
            if LEFT_OUT_RANGES.search(rng) or LEFT_OUT_NAMES.search(name):
                continue
            key = (brand, rng)
            if key not in index:
                index[key] = len(ranges)
                ranges.append([brand, rng, shape(brand, rng), cap(brand, rng)])
            paints.append([index[key], name, paint["hex"].lstrip("#").upper()])
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps({"ranges": ranges, "paints": paints}, ensure_ascii=False, separators=(",", ":")))
    print(f"{len(paints)} paints in {len(ranges)} ranges from {len({r[0] for r in ranges})} brands -> {OUT}")


if __name__ == "__main__":
    main()
