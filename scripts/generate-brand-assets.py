#!/usr/bin/env python3
"""
MyMedSchedule brand assets ("Pill Box" direction, docs/DESIGN.md).

One parametric source for the app icon (a 2x2 pill-box tray with one capsule in the top-right
compartment, the next dose) and the notification icon (a single capsule). From that geometry this
script writes:

  * assets/brand/*.svg                    editable vector masters (same geometry, re-exportable)
  * assets/images/*.png                   icon, adaptive foreground + monochrome, splash light/dark,
                                          notification icon, favicon (paths wired in app.json)
  * android/app/src/main/res/...          launcher mipmaps (webp), adaptive XML, colors, splash
                                          logos (light + night), notification icons
  * fastlane/metadata/android/<locale>/images/   Play icon (512) + feature graphics (1024x500)

Run from the repo root (macOS system python3 ships with Pillow; otherwise `pip3 install Pillow`):

    python3 scripts/generate-brand-assets.py                      # write everything
    python3 scripts/generate-brand-assets.py --preview out.png    # also render a QA preview sheet

No npm dependencies. Rendering is done with Pillow by filling the same polygons the SVGs describe,
8x+ supersampled and box-filtered down, so edges are exact-coverage anti-aliased. The feature
graphic text is rendered by FreeType straight from the Atkinson Hyperlegible Next TTFs in
node_modules/@expo-google-fonts/atkinson-hyperlegible-next (run `bun install` first).
"""
from __future__ import annotations

import argparse
import math
import os
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent

# ---- Brand tokens (lib/theme.ts) -----------------------------------------------------------
GREEN = (0x1B, 0x5E, 0x4A)  # accent
WHITE = (0xFF, 0xFF, 0xFF)
INK = (0x14, 0x1A, 0x17)
DARK_BG = (0x0F, 0x14, 0x12)
MINT = (0x7E, 0xD3, 0xB2)  # dark-mode accent
# Tagline: solid tint = 72 % white over GREEN (no transparency).
TAGLINE = tuple(round(0.72 * 255 + 0.28 * c) for c in GREEN)

FONT_DIR = ROOT / "node_modules/@expo-google-fonts/atkinson-hyperlegible-next"
FONT_800 = FONT_DIR / "800ExtraBold/AtkinsonHyperlegibleNext_800ExtraBold.ttf"
FONT_600 = FONT_DIR / "600SemiBold/AtkinsonHyperlegibleNext_600SemiBold.ttf"
FONT_400 = FONT_DIR / "400Regular/AtkinsonHyperlegibleNext_400Regular.ttf"

# ---- Glyph geometry, in a 100 x 100 unit box ---------------------------------------------------
TRAY_R = 23.0  # outer corner radius of the tray
WALL = 9.5  # outer wall thickness == divider thickness (one stroke weight everywhere)
CELL = (100 - 3 * WALL) / 2  # compartment size (35.75)
CELL_R = 10.5  # compartment corner radius: square enough to read as a tray, not four dots
PILL_LEN = 30.5  # capsule length (tip to tip)
PILL_W = 14.5  # capsule thickness
PILL_ANGLE = -45.0  # degrees; "/" diagonal (y axis points down)

# Notification capsule, in a 24 x 24 dp box (Android: 2 dp padding, content in the inner 20 dp).
NOTIF_LEN = 25.5
NOTIF_W = 10.6
NOTIF_GAP = 1.6  # divider cut across the middle of the capsule

# Glyph size as a fraction of the canvas edge, per use.
SCALE_ICON = 0.58  # full-bleed square icon (icon.png, Play icon, legacy mipmap, favicon)
SCALE_ADAPTIVE = 0.47  # 108 dp adaptive foreground: corners stay inside the 66 dp safe circle
SCALE_ROUND = 0.52  # legacy round mipmap (circle)
SCALE_SPLASH = 0.47  # Android 12 splash: within the inner 192/288 dp circle


def cells():
    """Top-left corners of the four compartments (TL, TR, BL, BR)."""
    a, b = WALL, WALL * 2 + CELL
    return [(a, a), (b, a), (a, b), (b, b)]


def pill_center():
    x, y = cells()[1]
    return x + CELL / 2, y + CELL / 2


# ---- Polygon helpers (used for raster rendering) ----------------------------------------------
def rrect_poly(x, y, w, h, r, steps=48):
    pts = []
    for cx, cy, a0 in ((x + w - r, y + r, -90), (x + w - r, y + h - r, 0), (x + r, y + h - r, 90), (x + r, y + r, 180)):
        for i in range(steps + 1):
            t = math.radians(a0 + 90 * i / steps)
            pts.append((cx + r * math.cos(t), cy + r * math.sin(t)))
    return pts


def capsule_poly(cx, cy, length, width, angle_deg, steps=64):
    r = width / 2
    a = length / 2 - r
    pts = []
    for sx, a0 in ((a, -90), (-a, 90)):
        for i in range(steps + 1):
            t = math.radians(a0 + 180 * i / steps)
            pts.append((sx + r * math.cos(t), r * math.sin(t)))
    th = math.radians(angle_deg)
    c, s = math.cos(th), math.sin(th)
    return [(cx + px * c - py * s, cy + px * s + py * c) for px, py in pts]


def band_poly(cx, cy, length, gap, angle_deg):
    """Rectangle of thickness `gap` across a capsule at its centre (perpendicular to its axis)."""
    th = math.radians(angle_deg)
    ux, uy = math.cos(th), math.sin(th)  # axis
    vx, vy = -uy, ux  # perpendicular
    g, L = gap / 2, length
    return [
        (cx + ux * g + vx * L, cy + uy * g + vy * L),
        (cx - ux * g + vx * L, cy - uy * g + vy * L),
        (cx - ux * g - vx * L, cy - uy * g - vy * L),
        (cx + ux * g - vx * L, cy + uy * g - vy * L),
    ]


def tray_ops():
    ops = [("add", rrect_poly(0, 0, 100, 100, TRAY_R))]
    for x, y in cells():
        ops.append(("sub", rrect_poly(x, y, CELL, CELL, CELL_R)))
    ops.append(("add", capsule_poly(*pill_center(), PILL_LEN, PILL_W, PILL_ANGLE)))
    return ops, 100.0


def notif_ops():
    ops = [
        ("add", capsule_poly(12, 12, NOTIF_LEN, NOTIF_W, PILL_ANGLE)),
        ("sub", band_poly(12, 12, NOTIF_W, NOTIF_GAP, PILL_ANGLE)),
    ]
    return ops, 24.0


def render_mask(ops_unit, size, scale=1.0, cx=0.5, cy=0.5):
    """Alpha mask (L) of `size` px. The glyph box spans `scale` of the canvas, centred at (cx, cy)."""
    ops, unit = ops_unit
    ss = max(8, math.ceil(4096 / size))
    hi = size * ss
    box = scale * hi
    ox, oy = cx * hi - box / 2, cy * hi - box / 2
    k = box / unit
    m = Image.new("L", (hi, hi), 0)
    d = ImageDraw.Draw(m)
    for op, poly in ops:
        d.polygon([(ox + x * k, oy + y * k) for x, y in poly], fill=255 if op == "add" else 0)
    return m.resize((size, size), Image.BOX)


def on_color(mask, fg, bg=None):
    """Colour `fg` through `mask`; on a solid `bg` (RGBA, opaque) or transparent."""
    size = mask.size
    if bg is None:
        out = Image.new("RGBA", size, fg + (0,))
        out.putalpha(mask)
        return out
    out = Image.new("RGBA", size, bg + (255,))
    out.paste(Image.new("RGBA", size, fg + (255,)), (0, 0), mask)
    return out


def circle_mask(size):
    ss = 8
    m = Image.new("L", (size * ss, size * ss), 0)
    ImageDraw.Draw(m).ellipse((0, 0, size * ss - 1, size * ss - 1), fill=255)
    return m.resize((size, size), Image.BOX)


# ---- Asset builders ------------------------------------------------------------------------
TRAY = tray_ops()
NOTIF = notif_ops()


def icon_square(size):
    return on_color(render_mask(TRAY, size, SCALE_ICON), WHITE, GREEN)


def icon_round(size):
    img = on_color(render_mask(TRAY, size, SCALE_ROUND), WHITE, GREEN)
    img.putalpha(circle_mask(size))
    return img


def adaptive_fg(size, color=WHITE):
    return on_color(render_mask(TRAY, size, SCALE_ADAPTIVE), color)


def splash(size, color):
    return on_color(render_mask(TRAY, size, SCALE_SPLASH), color)


def notification(size):
    return on_color(render_mask(NOTIF, size, 1.0), WHITE)


def save_png(img, rel):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    img.save(p, "PNG", optimize=True)
    return p


def save_webp(img, rel):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    img.save(p, "WEBP", lossless=True, quality=100, method=6)
    return p


def fit_font(path, text, max_w, start):
    size = start
    while size > 10:
        f = ImageFont.truetype(str(path), size)
        if f.getlength(text) <= max_w:
            return f
        size -= 1
    return ImageFont.truetype(str(path), size)


def feature_graphic(tagline):
    """1024x500, opaque RGB. Drawn at 2x, box-filtered down."""
    S = 2
    W, H = 1024 * S, 500 * S
    img = Image.new("RGB", (W, H), GREEN)
    margin = 88 * S  # minimum side margin
    gsize = 200 * S
    space = 56 * S
    max_w = W - 2 * margin - gsize - space
    word = fit_font(FONT_800, "MyMedSchedule", max_w, 76 * S)
    tag = fit_font(FONT_600, tagline, max_w, 36 * S)
    text_w = max(word.getlength("MyMedSchedule"), tag.getlength(tagline))
    # Centre the whole lockup (glyph + text) horizontally.
    gx = round((W - (gsize + space + text_w)) / 2)
    gy = (H - gsize) // 2
    gm = render_mask(TRAY, gsize, 1.0)
    img.paste(Image.new("RGB", gm.size, WHITE), (gx, gy), gm)
    tx = gx + gsize + space
    d = ImageDraw.Draw(img)
    # Vertical layout from cap height / x-height so the block centres optically on the glyph.
    w_asc = word.getbbox("M")[1]
    w_cap = word.getbbox("M")[3] - w_asc
    t_asc = tag.getbbox("H")[1]
    t_cap = tag.getbbox("H")[3] - t_asc
    gap = 30 * S
    block = w_cap + gap + t_cap
    top = (H - block) / 2
    d.text((tx, top - w_asc), "MyMedSchedule", font=word, fill=WHITE)
    d.text((tx, top + w_cap + gap - t_asc), tagline, font=tag, fill=TAGLINE)
    return img.resize((1024, 500), Image.BOX)


# ---- SVG masters -------------------------------------------------------------------------------
def _f(v):
    return f"{v:.3f}".rstrip("0").rstrip(".")


def rrect_path(x, y, w, h, r):
    return (
        f"M{_f(x + r)} {_f(y)}H{_f(x + w - r)}A{_f(r)} {_f(r)} 0 0 1 {_f(x + w)} {_f(y + r)}"
        f"V{_f(y + h - r)}A{_f(r)} {_f(r)} 0 0 1 {_f(x + w - r)} {_f(y + h)}"
        f"H{_f(x + r)}A{_f(r)} {_f(r)} 0 0 1 {_f(x)} {_f(y + h - r)}"
        f"V{_f(y + r)}A{_f(r)} {_f(r)} 0 0 1 {_f(x + r)} {_f(y)}Z"
    )


def capsule_rect(cx, cy, length, width, angle):
    return (
        f'<rect x="{_f(cx - length / 2)}" y="{_f(cy - width / 2)}" width="{_f(length)}" '
        f'height="{_f(width)}" rx="{_f(width / 2)}" transform="rotate({_f(angle)} {_f(cx)} {_f(cy)})"/>'
    )


def tray_svg_body(fill):
    tray = rrect_path(0, 0, 100, 100, TRAY_R) + "".join(rrect_path(x, y, CELL, CELL, CELL_R) for x, y in cells())
    return (
        f'<g fill="{fill}"><path fill-rule="evenodd" d="{tray}"/>'
        f"{capsule_rect(*pill_center(), PILL_LEN, PILL_W, PILL_ANGLE)}</g>"
    )


def hexc(c):
    return "#%02X%02X%02X" % c


def write_svgs():
    out = ROOT / "assets/brand"
    out.mkdir(parents=True, exist_ok=True)
    hdr = "<!-- Generated by scripts/generate-brand-assets.py; edit the geometry there. -->\n"
    (out / "icon-glyph.svg").write_text(
        hdr + f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{tray_svg_body(hexc(WHITE))}</svg>\n'
    )

    def framed(name, scale, fg, bg=None, size=1024):
        k = size * scale / 100
        o = (size - size * scale) / 2
        bgr = f'<rect width="{size}" height="{size}" fill="{hexc(bg)}"/>' if bg else ""
        (out / name).write_text(
            hdr
            + f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">{bgr}'
            f'<g transform="translate({_f(o)} {_f(o)}) scale({_f(k)})">{tray_svg_body(hexc(fg))}</g></svg>\n'
        )

    framed("icon.svg", SCALE_ICON, WHITE, GREEN)
    framed("adaptive-icon-foreground.svg", SCALE_ADAPTIVE, WHITE)
    framed("splash-icon.svg", SCALE_SPLASH, GREEN)
    framed("splash-icon-dark.svg", SCALE_SPLASH, MINT)
    band = band_poly(12, 12, NOTIF_W, NOTIF_GAP, PILL_ANGLE)
    band_d = "M" + "L".join(f"{_f(x)} {_f(y)}" for x, y in band) + "Z"
    (out / "notification-icon.svg").write_text(
        hdr
        + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><mask id="cut">'
        '<rect width="24" height="24" fill="#fff"/>'
        f'<path d="{band_d}" fill="#000"/></mask></defs><g fill="#FFFFFF" mask="url(#cut)">'
        f"{capsule_rect(12, 12, NOTIF_LEN, NOTIF_W, PILL_ANGLE)}</g></svg>\n"
    )


# ---- Android resources ---------------------------------------------------------------------
DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
RES = "android/app/src/main/res"

ADAPTIVE_XML = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/iconBackground"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
"""

COLORS_XML = f"""<resources>
  <color name="splashscreen_background">#FFFFFF</color>
  <color name="iconBackground">{hexc(GREEN)}</color>
  <color name="colorPrimary">{hexc(GREEN)}</color>
  <color name="colorPrimaryDark">{hexc(GREEN)}</color>
  <color name="notification_icon_color">{hexc(GREEN)}</color>
</resources>
"""

COLORS_NIGHT_XML = f"""<resources>
  <color name="splashscreen_background">{hexc(DARK_BG)}</color>
</resources>
"""


def write_android():
    for name, f in DENSITIES.items():
        mip = f"{RES}/mipmap-{name}"
        for stale in ("ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png", "ic_launcher_monochrome.png"):
            (ROOT / mip / stale).unlink(missing_ok=True)
        save_webp(icon_square(round(48 * f)), f"{mip}/ic_launcher.webp")
        save_webp(icon_round(round(48 * f)), f"{mip}/ic_launcher_round.webp")
        save_webp(adaptive_fg(round(108 * f)), f"{mip}/ic_launcher_foreground.webp")
        save_webp(adaptive_fg(round(108 * f)), f"{mip}/ic_launcher_monochrome.webp")
        save_png(splash(round(288 * f), GREEN), f"{RES}/drawable-{name}/splashscreen_logo.png")
        save_png(splash(round(288 * f), MINT), f"{RES}/drawable-night-{name}/splashscreen_logo.png")
        save_png(notification(round(24 * f)), f"{RES}/drawable-{name}/notification_icon.png")
    for n in ("ic_launcher.xml", "ic_launcher_round.xml"):
        (ROOT / RES / "mipmap-anydpi-v26" / n).write_text(ADAPTIVE_XML)
    (ROOT / RES / "values/colors.xml").write_text(COLORS_XML)
    (ROOT / RES / "values-night").mkdir(exist_ok=True)
    (ROOT / RES / "values-night/colors.xml").write_text(COLORS_NIGHT_XML)


# ---- Preview sheet (QA only) -------------------------------------------------------------------
def squircle_mask(size, n=4.0):
    ss = 4
    S = size * ss
    pts = []
    for i in range(720):
        t = 2 * math.pi * i / 720
        c, s = math.cos(t), math.sin(t)
        x = math.copysign(abs(c) ** (2 / n), c)
        y = math.copysign(abs(s) ** (2 / n), s)
        pts.append(((x + 1) * S / 2, (y + 1) * S / 2))
    m = Image.new("L", (S, S), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return m.resize((size, size), Image.BOX)


def rrect_mask(size, r_frac):
    ss = 4
    m = Image.new("L", (size * ss, size * ss), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size * ss - 1, size * ss - 1), radius=r_frac * size * ss, fill=255)
    return m.resize((size, size), Image.BOX)


def adaptive_view(fg, mask_fn, view=216, bg=GREEN):
    """Composite a 108 dp foreground on `bg`, crop the visible 72 dp viewport, apply a mask."""
    full = Image.new("RGBA", fg.size, bg + (255,))
    full.alpha_composite(fg)
    s = fg.size[0]
    c = round(s * 18 / 108)
    vp = full.crop((c, c, s - c, s - c)).resize((view, view), Image.LANCZOS)
    vp.putalpha(mask_fn(view))
    return vp


def preview(path):
    W, H = 1800, 1720
    sheet = Image.new("RGB", (W, H), (0xF1, 0xF3, 0xF2))
    d = ImageDraw.Draw(sheet)
    lab = ImageFont.truetype(str(FONT_600), 22)

    def put(img, x, y, label):
        if img.mode == "RGBA":
            sheet.paste(img, (x, y), img)
        else:
            sheet.paste(img, (x, y))
        d.text((x, y + img.size[1] + 10), label, font=lab, fill=INK)

    y = 40
    put(icon_square(216), 40, y, "icon.png (legacy)")
    m48 = icon_square(48)
    put(m48, 290, y, "48 px")
    put(m48.resize((192, 192), Image.NEAREST), 360, y, "48 px x4")
    fg = adaptive_fg(432)
    put(adaptive_view(fg, circle_mask), 600, y, "adaptive: circle")
    put(adaptive_view(fg, squircle_mask), 850, y, "squircle")
    put(adaptive_view(fg, lambda s: rrect_mask(s, 0.22)), 1100, y, "rounded square")
    put(icon_round(216), 1350, y, "ic_launcher_round")
    put(icon_round(48), 1600, y, "round 48")

    y = 320
    mono = adaptive_fg(432, (0x1F, 0x3D, 0x33))
    put(adaptive_view(mono, circle_mask, bg=(0xD3, 0xE8, 0xDC)), 40, y, "themed (monochrome)")
    small = [adaptive_view(adaptive_fg(108 * 2), f, view=64) for f in (circle_mask, squircle_mask)]
    put(small[0], 290, y, "64")
    put(small[1], 380, y, "64")
    for i, (color, bg, label) in enumerate(((GREEN, WHITE, "splash light"), (MINT, DARK_BG, "splash dark"))):
        tile = Image.new("RGBA", (288, 288), bg + (255,))
        tile.alpha_composite(splash(288, color))
        dd = ImageDraw.Draw(tile)
        dd.ellipse((48, 48, 240, 240), outline=(0xE0, 0x40, 0x40, 255), width=1)
        put(tile, 520 + i * 320, y, label + " (red = 192dp mask)")
    bar = Image.new("RGB", (400, 48), (0x1E, 0x22, 0x20))
    n24 = notification(24)
    for i, ic in enumerate((n24, n24)):
        bar.paste(Image.new("RGB", (24, 24), WHITE), (16 + i * 34, 12), ic.getchannel("A"))
    ImageDraw.Draw(bar).text((330, 13), "9:41", font=ImageFont.truetype(str(FONT_600), 20), fill=WHITE)
    put(bar, 1180, y, "status bar @24px")
    n96 = notification(96)
    zoom = Image.new("RGB", (192, 192), (0x1E, 0x22, 0x20))
    zoom.paste(Image.new("RGB", (192, 192), WHITE), (0, 0), n96.resize((192, 192), Image.NEAREST).getchannel("A"))
    put(zoom, 1180, y + 90, "notification 96 (x2)")
    tint = Image.new("RGB", (96, 96), (0xF1, 0xF3, 0xF2))
    tint.paste(Image.new("RGB", (96, 96), GREEN), (0, 0), n96.getchannel("A"))
    put(tint, 1400, y + 90, "tinted #1B5E4A")

    y = 700
    for i, (loc, text) in enumerate(TAGLINES.items()):
        fgr = feature_graphic(text).resize((820, 400), Image.LANCZOS)
        put(fgr, 40 + (i % 2) * 880, y + (i // 2) * 470, f"featureGraphic {loc}")
    sheet.save(path)


TAGLINES = {
    "en-US": "Your pill box, with reminders.",
    "nl-NL": "Je pillendoos, met herinneringen.",
    "tr-TR": "Hap kutunuz, hatırlatıcılarıyla.",
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", help="also write a QA preview sheet PNG to this path")
    args = ap.parse_args()
    os.chdir(ROOT)

    write_svgs()
    save_png(icon_square(1024).convert("RGB"), "assets/images/icon.png")
    save_png(adaptive_fg(1024), "assets/images/adaptive-icon.png")
    save_png(adaptive_fg(1024), "assets/images/adaptive-icon-monochrome.png")
    save_png(splash(1024, GREEN), "assets/images/splash-icon.png")
    save_png(splash(1024, MINT), "assets/images/splash-icon-dark.png")
    save_png(notification(96), "assets/images/notification-icon.png")
    save_png(icon_square(48).convert("RGB"), "assets/images/favicon.png")
    write_android()

    fl = "fastlane/metadata/android"
    save_png(icon_square(512), f"{fl}/en-US/images/icon.png")  # 32-bit RGBA, fully opaque
    for loc, text in TAGLINES.items():
        save_png(feature_graphic(text), f"{fl}/{loc}/images/featureGraphic.png")

    if args.preview:
        preview(args.preview)
    print("Brand assets written.")


if __name__ == "__main__":
    main()
