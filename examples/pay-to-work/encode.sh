#!/usr/bin/env bash
# 自费 Token 上岗记：逐帧 PNG + 两条音轨 → 两版 MP4。
set -e
TITLE="自费Token上岗记"
FPS="30"
DURATION="30"

VIN=(-framerate "$FPS" -i frames/frame_%04d.png)
VENC=(-c:v libx264 -preset medium -crf 19 -maxrate 16M -bufsize 32M -profile:v high -pix_fmt yuv420p -r "$FPS")
OUT=(-c:a aac -b:a 192k -ar 48000 -t "$DURATION" -movflags +faststart)

ffmpeg -y "${VIN[@]}" -i sfx.wav       "${VENC[@]}" "${OUT[@]}" "${TITLE}-纯音效版.mp4"
ffmpeg -y "${VIN[@]}" -i sfx_music.wav "${VENC[@]}" "${OUT[@]}" "${TITLE}-配乐版.mp4"
echo ENCODE_DONE
