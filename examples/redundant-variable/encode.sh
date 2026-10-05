#!/usr/bin/env bash
# 把逐帧 PNG + 两条音轨（纯音效A / 配乐B）合成最终 MP4。
set -e
TITLE="${TITLE:-冗余变量X-07}"
FPS="${FPS:-30}"
DURATION="${DURATION:-30}"
RES="${RES:-1920x1080}"

VIN=(-framerate "$FPS" -i frames/frame_%04d.png)
VENC=(-c:v libx264 -preset medium -crf 19 -maxrate 16M -bufsize 32M -profile:v high -pix_fmt yuv420p -r "$FPS")
OUT=(-c:a aac -b:a 192k -ar 48000 -t "$DURATION" -movflags +faststart)

ffmpeg -y "${VIN[@]}" -i sfx.wav       "${VENC[@]}" "${OUT[@]}" "冗余变量X-07-纯音效版-${RES}-${FPS}fps.mp4"
ffmpeg -y "${VIN[@]}" -i sfx_music.wav "${VENC[@]}" "${OUT[@]}" "冗余变量X-07-配乐版-${RES}-${FPS}fps.mp4"
echo ENCODE_DONE
