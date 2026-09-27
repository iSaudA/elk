#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p output
python3 scripts/synthesize-audio.py
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/remotion render src/film/index.tsx AYN29Master output/master-render.mp4 --codec=h264 --pixel-format=yuv420p --audio-codec=aac --audio-bitrate=320k --crf=16 --image-format=png --concurrency=4
ffmpeg -hide_banner -loglevel error -y -i output/master-render.mp4 -i public/film/sound-design.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -t 29 -movflags +faststart output/ayn-al-sijill-29s.mp4
python3 scripts/inspect-film.py output/ayn-al-sijill-29s.mp4
