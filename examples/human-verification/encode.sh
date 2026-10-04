#!/usr/bin/env bash
# 合成两版 MP4：A=纯音效，B=配乐。H.264 High/yuv420p/AAC48k/+faststart。
set -e
TITLE="${TITLE:-最后一份人类工作}"
FPS="${FPS:-30}"
DURATION="${DURATION:-30}"
RES="${RES:-1920x1080}"

VIN=(-framerate "$FPS" -i frames/frame_%04d.png)
VENC=(-c:v libx264 -preset medium -crf 19 -maxrate 16M -bufsize 32M -profile:v high -pix_fmt yuv420p -r "$FPS")
OUT=(-c:a aac -b:a 192k -ar 48000 -t "$DURATION" -movflags +faststart)

ffmpeg -y "${VIN[@]}" -i sfx.wav       "${VENC[@]}" "${OUT[@]}" "${TITLE}-纯音效-${RES}-${FPS}fps.mp4"
ffmpeg -y "${VIN[@]}" -i sfx_music.wav "${VENC[@]}" "${OUT[@]}" "${TITLE}-配乐版-${RES}-${FPS}fps.mp4"
echo ENCODE_DONE
