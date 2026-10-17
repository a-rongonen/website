"""Regenerate the seamless, preblurred box-noise tiles (requires Pillow and NumPy).

This is an authoring tool only. The committed PNGs are used as-is at runtime.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


SIZE = 512
RADII = (0, 2, 4, 7, 12, 20, 30)
BIAS_STEPS = range(-10, 11)  # -1.0 through 1.0 in 0.1 increments.
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "images" / "box-noise"
RNG = np.random.default_rng(651)


def periodic_value_noise(cells: int) -> np.ndarray:
    """Smoothly interpolate a wrapped random grid, so all tile edges repeat."""
    grid = RNG.standard_normal((cells, cells))
    coordinates = np.arange(SIZE) * cells / SIZE
    indices = np.floor(coordinates).astype(int)
    fraction = coordinates - indices
    fraction = fraction * fraction * (3 - 2 * fraction)
    start = indices % cells
    end = (indices + 1) % cells
    a = grid[np.ix_(start, start)]
    b = grid[np.ix_(start, end)]
    c = grid[np.ix_(end, start)]
    d = grid[np.ix_(end, end)]
    horizontal_top = a * (1 - fraction[None, :]) + b * fraction[None, :]
    horizontal_bottom = c * (1 - fraction[None, :]) + d * fraction[None, :]
    return horizontal_top * (1 - fraction[:, None]) + horizontal_bottom * fraction[:, None]


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    raw = sum(
        weight * periodic_value_noise(cells)
        for cells, weight in ((8, 1.0), (16, .7), (32, .45), (64, .25), (128, .12))
    )
    raw = (raw - raw.mean()) / raw.std()
    source = Image.fromarray(np.uint8(np.clip(128 + raw * 34, 0, 255)), "L")
    mosaic = Image.new("L", (SIZE * 3, SIZE * 3))
    for row in range(3):
        for column in range(3):
            mosaic.paste(source, (column * SIZE, row * SIZE))

    for level, radius in enumerate(RADII):
        blurred = mosaic.filter(ImageFilter.GaussianBlur(radius)) if radius else mosaic
        tile = np.asarray(blurred.crop((SIZE, SIZE, SIZE * 2, SIZE * 2)), dtype=np.float32)
        deviation = (tile - tile.mean()) / max(float(tile.std()), 1)
        for bias_step in BIAS_STEPS:
            # Move the zero crossing rather than changing the section color.
            # Positive values grow the white/theme islands; negative values
            # grow the black islands. Zero reproduces the original tile.
            shifted = deviation + bias_step / 5
            # At full contrast, dark cores reach black and light cores reach
            # the theme endpoint. The old 180/255 cap washed out both sides.
            strength = np.clip(np.abs(shifted) / 1.15, 0, 1) ** .7
            alpha = np.uint8(np.round(strength * 255))
            color = np.where(shifted >= 0, 255, 0).astype(np.uint8)
            rgba = np.stack((color, color, color, alpha), axis=-1)
            suffix = "" if bias_step == 0 else f"-bias-{'p' if bias_step > 0 else 'm'}{abs(bias_step)}"
            Image.fromarray(rgba, "RGBA").save(OUTPUT / f"noise-{level}{suffix}.png", optimize=True)


if __name__ == "__main__":
    main()
