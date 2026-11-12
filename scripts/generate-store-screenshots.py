#!/usr/bin/env python3
"""
Framed Google Play phone screenshots for MyMedSchedule.

Takes raw portrait device screenshots (NN-name.png) and writes 1080x1920 (9:16) store images:
a flat brand-green canvas, a big white left-aligned caption (Atkinson Hyperlegible Next 800, at
most two lines) and the screenshot below it with rounded corners. No shadows, gradients or
device chrome (docs/DESIGN.md).

    python3 scripts/generate-store-screenshots.py \
        fastlane/screenshots-raw/en-US \
        fastlane/metadata/android/en-US/images/phoneScreenshots

Captions are matched by file name (NN-name.png); a raw file without a caption is skipped with a
warning. Add other locales by passing --locale and extending CAPTIONS.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT_800 = (
    ROOT
    / "node_modules/@expo-google-fonts/atkinson-hyperlegible-next"
    / "800ExtraBold/AtkinsonHyperlegibleNext_800ExtraBold.ttf"
)

GREEN = (0x1B, 0x5E, 0x4A)  # lib/theme.ts accent
WHITE = (0xFF, 0xFF, 0xFF)

W, H = 1080, 1920
MARGIN = 80  # left/right margin for the caption
CAPTION_TOP = 96
CAPTION_SIZE = 72
LINE_GAP = 1.12  # line height as a multiple of the font size
SHOT_GAP = 64  # caption block -> screenshot
BOTTOM = 72  # screenshot -> bottom edge
RADIUS = 40  # corner radius of the screenshot, in output pixels

CAPTIONS = {
    "en-US": {
        "01-today": "Your day in one pill box",
        "02-medicine-detail": "Everything about a medicine, at a glance",
        "03-schedules": "Schedules that fit real life",
        "04-journal": "See what you took",
        "05-family": "Look after the whole family",
        "06-reminder": "Take, snooze or skip from the reminder",
        "07-privacy": "Your data stays on your phone",
        "08-languages": "In English, Nederlands or Türkçe",
    },
}


# Optional crop box (left, top, right, bottom) in raw pixels. Keyed by file stem; applies to every
# locale. The reminder shot keeps just the notification card, edge to edge (no status bar or quick
# settings tiles above it, no empty shade below); the rounded mask stands in for its own corners.
CROPS = {
    "06-reminder": (42, 578, 1038, 983),
}

# A cropped shot wider than tall (the notification card) is shown wider than a full screen (smaller
# side margin) and sits a little above the middle of the space under the caption, so it doesn't
# look tiny or stuck to the caption.
WIDE_MARGIN = 40
WIDE_OPTICAL_CENTRE = 0.42  # share of the free space above the shot
WIDE_RADIUS = 76  # matches the notification card's own corners


def wrap(text: str, font: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    lines: list[str] = []
    for word in text.split():
        if lines and font.getlength(f"{lines[-1]} {word}") <= max_w:
            lines[-1] = f"{lines[-1]} {word}"
        else:
            lines.append(word)
    return lines


def caption_font(text: str, max_w: int) -> tuple[ImageFont.FreeTypeFont, list[str]]:
    """Largest size <= CAPTION_SIZE that fits in two lines."""
    size = CAPTION_SIZE
    while True:
        font = ImageFont.truetype(str(FONT_800), size)
        lines = wrap(text, font, max_w)
        if (len(lines) <= 2 and all(font.getlength(l) <= max_w for l in lines)) or size <= 40:
            return font, lines
        size -= 2


def rounded(img: Image.Image, radius: int) -> Image.Image:
    """Apply an anti-aliased rounded-corner alpha mask (4x supersampled)."""
    s = 4
    mask = Image.new("L", (img.width * s, img.height * s), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, mask.width - 1, mask.height - 1), radius=radius * s, fill=255
    )
    mask = mask.resize(img.size, Image.LANCZOS)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def frame(raw: Path, caption: str) -> Image.Image:
    canvas = Image.new("RGB", (W, H), GREEN)
    d = ImageDraw.Draw(canvas)

    # Caption: always reserve two lines so every screenshot sits at the same height.
    font, lines = caption_font(caption, W - 2 * MARGIN)
    line_h = round(CAPTION_SIZE * LINE_GAP)
    first_baseline = CAPTION_TOP + round(CAPTION_SIZE * 0.75)  # ~cap height of the full size
    for i, line in enumerate(lines):
        d.text((MARGIN, first_baseline + i * line_h), line, font=font, fill=WHITE, anchor="ls")
    caption_bottom = CAPTION_TOP + 2 * line_h

    shot = Image.open(raw).convert("RGB")
    crop = CROPS.get(raw.stem)
    if crop:
        shot = shot.crop(crop)
    top = caption_bottom + SHOT_GAP
    max_h = H - BOTTOM - top
    wide = shot.width > shot.height
    max_w = W - 2 * (WIDE_MARGIN if wide else MARGIN)
    scale = min(max_h / shot.height, max_w / shot.width)
    size = (round(shot.width * scale), round(shot.height * scale))
    if wide:
        top += round((max_h - size[1]) * WIDE_OPTICAL_CENTRE)
    shot = rounded(shot.resize(size, Image.LANCZOS), WIDE_RADIUS if wide else RADIUS)
    canvas.paste(shot, ((W - size[0]) // 2, top), shot)
    return canvas


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("raw_dir", type=Path)
    ap.add_argument("out_dir", type=Path)
    ap.add_argument("--locale", default="en-US", choices=sorted(CAPTIONS))
    args = ap.parse_args()

    captions = CAPTIONS[args.locale]
    args.out_dir.mkdir(parents=True, exist_ok=True)
    raws = sorted(args.raw_dir.glob("*.png"))
    if not raws:
        print(f"No PNGs in {args.raw_dir}", file=sys.stderr)
        return 1
    for raw in raws:
        caption = captions.get(raw.stem)
        if caption is None:
            print(f"skip {raw.name}: no caption for '{raw.stem}'", file=sys.stderr)
            continue
        out = args.out_dir / raw.name
        frame(raw, caption).save(out, "PNG", optimize=True)
        print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
