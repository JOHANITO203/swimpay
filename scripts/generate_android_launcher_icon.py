from __future__ import annotations

import os
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE_DIR = Path(r"C:\Users\Lenovo\.codex\generated_images\019e339b-a5a6-7492-9ed4-c670ea43819b")
SOURCE_ENV = os.environ.get("SWIMPAY_LAUNCHER_SYMBOL_SOURCE", "").strip()


def source_image_path() -> Path:
    if SOURCE_ENV:
        return Path(SOURCE_ENV)
    candidates = sorted(DEFAULT_SOURCE_DIR.glob("*.png"), key=lambda path: path.stat().st_mtime, reverse=True)
    if not candidates:
        raise FileNotFoundError(f"No generated PNG found in {DEFAULT_SOURCE_DIR}")
    return candidates[0]


def extract_symbol(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = np.asarray(rgba).astype(np.float32)
    rgb = pixels[:, :, :3]
    alpha = pixels[:, :, 3] / 255.0

    # The generated source contains a rendered checkerboard. Treat very light
    # pixels as background and keep the dark satin ribbon with antialiased edges.
    luma = rgb[:, :, 0] * 0.2126 + rgb[:, :, 1] * 0.7152 + rgb[:, :, 2] * 0.0722
    symbol_alpha = np.clip((238.0 - luma) / 72.0, 0.0, 1.0) * alpha
    symbol_alpha = keep_largest_alpha_component(symbol_alpha)
    symbol_alpha = Image.fromarray(np.uint8(symbol_alpha * 255.0), "L")
    symbol_alpha = symbol_alpha.filter(ImageFilter.GaussianBlur(radius=0.45))

    cleaned = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    cleaned_pixels = np.asarray(cleaned).copy()
    cleaned_pixels[:, :, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    cleaned_pixels[:, :, 3] = np.asarray(symbol_alpha)
    cleaned = Image.fromarray(cleaned_pixels, "RGBA")

    bbox = cleaned.getbbox()
    if bbox is None:
        raise ValueError("Could not isolate the SwimPay launcher symbol.")

    cropped = cleaned.crop(bbox)
    side = int(max(cropped.width, cropped.height) * 1.18)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.alpha_composite(cropped, ((side - cropped.width) // 2, (side - cropped.height) // 2))
    return canvas


def keep_largest_alpha_component(alpha: np.ndarray) -> np.ndarray:
    mask = alpha > 0.08
    height, width = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    best_points: list[tuple[int, int]] = []

    for start_y in range(height):
        for start_x in range(width):
            if seen[start_y, start_x] or not mask[start_y, start_x]:
                continue
            queue: deque[tuple[int, int]] = deque([(start_y, start_x)])
            seen[start_y, start_x] = True
            points: list[tuple[int, int]] = []
            while queue:
                y, x = queue.popleft()
                points.append((y, x))
                for ny in (y - 1, y, y + 1):
                    for nx in (x - 1, x, x + 1):
                        if ny == y and nx == x:
                            continue
                        if 0 <= ny < height and 0 <= nx < width and not seen[ny, nx] and mask[ny, nx]:
                            seen[ny, nx] = True
                            queue.append((ny, nx))
            if len(points) > len(best_points):
                best_points = points

    component = np.zeros_like(alpha)
    if best_points:
        ys, xs = zip(*best_points)
        component[np.array(ys), np.array(xs)] = alpha[np.array(ys), np.array(xs)]
    return component


def resize(image: Image.Image, size: int) -> Image.Image:
    return image.resize((size, size), Image.Resampling.LANCZOS)


def white_symbol(symbol: Image.Image) -> Image.Image:
    rgba = symbol.convert("RGBA")
    pixels = np.asarray(rgba).astype(np.float32)
    alpha = pixels[:, :, 3]
    rgb = pixels[:, :, :3]
    luma = rgb[:, :, 0] * 0.2126 + rgb[:, :, 1] * 0.7152 + rgb[:, :, 2] * 0.0722
    visible = alpha > 8
    if np.any(visible):
        low = float(np.percentile(luma[visible], 8))
        high = float(np.percentile(luma[visible], 98))
    else:
        low, high = 0.0, 255.0
    shade = np.clip((luma - low) / max(1.0, high - low), 0.0, 1.0)
    silver = 176.0 + shade * 78.0
    output = np.zeros_like(pixels, dtype=np.uint8)
    output[:, :, 0] = np.clip(silver + 2.0, 0, 255).astype(np.uint8)
    output[:, :, 1] = np.clip(silver + 2.0, 0, 255).astype(np.uint8)
    output[:, :, 2] = np.clip(silver + 4.0, 0, 255).astype(np.uint8)
    output[:, :, 3] = alpha.astype(np.uint8)
    return Image.fromarray(output, "RGBA")


def place_symbol(symbol: Image.Image, canvas_size: int, scale: float) -> Image.Image:
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    symbol_size = int(canvas_size * scale)
    symbol_resized = resize(symbol, symbol_size)
    # Slight optical correction: the ribbon reads heavier on the lower half.
    offset_y = int(canvas_size * -0.012)
    canvas.alpha_composite(
        symbol_resized,
        ((canvas_size - symbol_resized.width) // 2, (canvas_size - symbol_resized.height) // 2 + offset_y),
    )
    return canvas


def launcher_tile(symbol: Image.Image, size: int) -> Image.Image:
    tile = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    draw = ImageDraw.Draw(tile)
    draw.rounded_rectangle(
        (0, 0, size - 1, size - 1),
        radius=int(size * 0.225),
        fill=(6, 7, 8, 255),
    )
    sheen = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sheen_pixels = np.asarray(sheen).copy()
    for y in range(size):
        strength = max(0, int(18 * (1.0 - y / max(1, size * 0.9))))
        sheen_pixels[y, :, :] = (255, 255, 255, strength)
    tile.alpha_composite(Image.fromarray(sheen_pixels, "RGBA"))
    tile.alpha_composite(place_symbol(symbol, size, 0.56))
    return tile


def save_webp(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "WEBP", quality=96, method=6)


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "PNG", optimize=True)


def main() -> None:
    source = source_image_path()
    symbol = white_symbol(extract_symbol(Image.open(source)))

    res_root = REPO_ROOT / "apps/android-receiver/android/app/src/main/res"
    densities = {
        "mipmap-mdpi": (48, 108),
        "mipmap-hdpi": (72, 162),
        "mipmap-xhdpi": (96, 216),
        "mipmap-xxhdpi": (144, 324),
        "mipmap-xxxhdpi": (192, 432),
    }

    for folder, (legacy_size, foreground_size) in densities.items():
        save_webp(launcher_tile(symbol, legacy_size), res_root / folder / "ic_launcher.webp")
        save_webp(place_symbol(symbol, foreground_size, 0.56), res_root / folder / "ic_launcher_foreground.webp")

    save_png(launcher_tile(symbol, 512), REPO_ROOT / "apps/android-receiver/android/app/src/main/play_store_512.png")

    preview_dir = REPO_ROOT / ".swimpay-agent/launcher-icon-preview"
    save_png(symbol, preview_dir / "symbol-transparent.png")
    save_png(launcher_tile(symbol, 512), preview_dir / "launcher-square-512.png")
    save_png(place_symbol(symbol, 512, 0.56), preview_dir / "adaptive-foreground-512.png")

    print(f"Generated launcher assets from {source}")
    print(f"Preview written to {preview_dir}")


if __name__ == "__main__":
    main()
