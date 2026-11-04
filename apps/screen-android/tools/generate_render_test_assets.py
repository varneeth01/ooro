#!/usr/bin/env python3
"""Generate debug-only OORO image and H.264 FIT/crop test creatives.

Requires Pillow and GStreamer with videotestsrc, gdkpixbufoverlay, x264enc,
h264parse, and mp4mux plugins. Outputs only into app/src/debug/assets.
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


SIZES = {
    "landscape": (1920, 1080),
    "portrait": (1080, 1920),
    "square": (1200, 1200),
    "ultrawide": (2560, 800),
    "nonstandard": (1000, 700),
}


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for candidate in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            pass
    return ImageFont.load_default()


def draw_test_card(size: tuple[int, int], label: str, transparent: bool = False) -> Image.Image:
    width, height = size
    image = Image.new("RGBA", size, (0, 0, 0, 0) if transparent else (21, 29, 38, 255))
    draw = ImageDraw.Draw(image)
    margin = max(8, min(width, height) // 40)
    line = max(5, min(width, height) // 90)
    cyan, white, yellow = (0, 255, 255, 255), (255, 255, 255, 255), (255, 210, 0, 255)
    draw.rectangle((line // 2, line // 2, width - line // 2 - 1, height - line // 2 - 1), outline=cyan, width=line)
    corner_font_size = max(18, min(width, height) // 14)
    corner_labels = ("TOP LEFT", "TOP RIGHT", "BOTTOM LEFT", "BOTTOM RIGHT")
    available_corner_width = width - 2 * margin
    while corner_font_size > 12:
        candidate = font(corner_font_size)
        top_width = draw.textlength(corner_labels[0], font=candidate) + draw.textlength(corner_labels[1], font=candidate)
        bottom_width = draw.textlength(corner_labels[2], font=candidate) + draw.textlength(corner_labels[3], font=candidate)
        if max(top_width, bottom_width) <= available_corner_width:
            break
        corner_font_size -= 2
    corner_font = font(corner_font_size)
    center_font_size = max(24, min(width, height) // 10)
    center = f"OORO {label}"
    while center_font_size > 12:
        candidate = font(center_font_size)
        bounds = draw.textbbox((0, 0), center, font=candidate)
        if bounds[2] - bounds[0] <= width - 2 * margin:
            break
        center_font_size -= 2
    center_font = font(center_font_size)
    corners = ((corner_labels[0], (margin, margin), "lt"),
               (corner_labels[1], (width - margin, margin), "rt"),
               (corner_labels[2], (margin, height - margin), "lb"),
               (corner_labels[3], (width - margin, height - margin), "rb"))
    for text, point, anchor in corners:
        draw.text(point, text, fill=white, font=corner_font, anchor=anchor)
    bounds = draw.textbbox((0, 0), center, font=center_font)
    draw.text(((width - (bounds[2] - bounds[0])) / 2,
               (height - (bounds[3] - bounds[1])) / 2), center, fill=yellow, font=center_font)
    return image


def make_video(output: Path, width: int, height: int, overlay: Path, bitrate: int) -> None:
    if not shutil.which("gst-launch-1.0"):
        raise SystemExit("gst-launch-1.0 is required to create the debug H.264 clips")
    command = [
        "gst-launch-1.0", "-e", "-q", "videotestsrc", "pattern=ball", "num-buffers=240", "!",
        f"video/x-raw,width={width},height={height},framerate=30/1", "!",
        "gdkpixbufoverlay", f"location={overlay}", f"overlay-width={width}", f"overlay-height={height}", "!",
        "videoconvert", "!", "video/x-raw,format=I420", "!", "x264enc", "tune=zerolatency",
        "speed-preset=ultrafast", f"bitrate={bitrate}", "key-int-max=60", "!", "h264parse", "!",
        "mp4mux", "faststart=true", "!", "filesink", f"location={output}",
    ]
    subprocess.run(command, check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path(__file__).parent.parent / "app/src/debug/assets/render-test")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    for name, size in SIZES.items():
        draw_test_card(size, name.upper()).convert("RGB").save(args.output / f"{name}.png", optimize=True)

    rotated = draw_test_card((1920, 1080), "EXIF ROTATED").convert("RGB")
    exif = Image.Exif()
    exif[274] = 6  # 90° clockwise; raw pixels are landscape, displayed orientation is portrait.
    rotated.save(args.output / "jpeg-exif-rotated.jpg", quality=94, exif=exif)

    for name, size, bitrate in (("video-landscape-720p", (1280, 720), 1500),
                                ("video-portrait", (720, 1280), 1000)):
        overlay = args.output / f".{name}-overlay.png"
        draw_test_card(size, name.upper(), transparent=True).save(overlay)
        make_video(args.output / f"{name}.mp4", *size, overlay, bitrate)
        overlay.unlink()

    print(f"Generated debug-only render assets in {args.output}")


if __name__ == "__main__":
    main()
