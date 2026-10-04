#!/usr/bin/env bash
set -e
TITLE="${TITLE:-前额叶没坏是累了}"
FPS=30
DURATION=30.0
RES=1920x1080

VIN=(-framerate "$FPS" -i frames/frame_%04d.png)
VENC=(-c:v libx264 -preset medium -crf 19 -maxrate 16M -bufsize 32M -profile:v high -pix_fmt yuv420p -r "$FPS")
OUT=(-c:a aac -b:a 192k -ar 48000 -t "$DURATION" -movflags +faststart)

ffmpeg -y "${VIN[@]}" -i sfx.wav       "${VENC[@]}" "${OUT[@]}" "${TITLE}-纯音效版-${RES}-${FPS}fps.mp4"
ffmpeg -y "${VIN[@]}" -i sfx_music.wav "${VENC[@]}" "${OUT[@]}" "${TITLE}-配乐版-${RES}-${FPS}fps.mp4"
echo ENCODE_DONE
ls -la *.mp4
