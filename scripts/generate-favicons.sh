#!/usr/bin/env bash
# generate-favicons.sh
# Usage: Place a high-resolution PNG (e.g. public/honest-logo.png) and run this script to generate favicon.ico and resized PNGs.
# Requires: ImageMagick (convert) and pngcrush (optional)

set -euo pipefail
INPUT=${1:-public/honest-logo.png}
OUT_DIR=public/favicons
mkdir -p "$OUT_DIR"

if ! command -v convert >/dev/null 2>&1; then
  echo "ImageMagick 'convert' not found. Install it to use this script."
  exit 1
fi

# Generate multiple sizes
convert "$INPUT" -resize 16x16 "$OUT_DIR/favicon-16x16.png"
convert "$INPUT" -resize 32x32 "$OUT_DIR/favicon-32x32.png"
convert "$INPUT" -resize 48x48 "$OUT_DIR/favicon-48x48.png"
convert "$INPUT" -resize 64x64 "$OUT_DIR/favicon-64x64.png"
convert "$INPUT" -resize 180x180 "$OUT_DIR/apple-touch-icon.png"

# Create multi-resolution .ico
convert "$OUT_DIR/favicon-16x16.png" "$OUT_DIR/favicon-32x32.png" "$OUT_DIR/favicon-48x48.png" "$OUT_DIR/favicon-64x64.png" "$OUT_DIR/favicon.ico"

# Optional optimize
if command -v pngcrush >/dev/null 2>&1; then
  pngcrush -ow "$OUT_DIR/favicon-16x16.png" || true
  pngcrush -ow "$OUT_DIR/favicon-32x32.png" || true
  pngcrush -ow "$OUT_DIR/favicon-48x48.png" || true
  pngcrush -ow "$OUT_DIR/favicon-64x64.png" || true
  pngcrush -ow "$OUT_DIR/apple-touch-icon.png" || true
fi

echo "Favicons generated in $OUT_DIR. Replace /honest-logo.png with your provided Hi logo (PNG) and run this script."