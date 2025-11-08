#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT="${SCRIPT_DIR}/mlkem768_psk"
SOURCE="${SCRIPT_DIR}/mlkem768_psk.c"

if ! command -v gcc >/dev/null 2>&1; then
  echo "gcc is required to build the ML-KEM PSK helper."
  exit 1
fi

if ! pkg-config --exists liboqs; then
  echo "liboqs development headers not found. Install liboqs or add it to PKG_CONFIG_PATH."
  exit 1
fi

gcc $(pkg-config --cflags liboqs) -o "${OUTPUT}" "${SOURCE}" $(pkg-config --libs liboqs)
echo "Built ${OUTPUT}"

