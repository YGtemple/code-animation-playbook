# encode.ps1 —— 两版 MP4：旁白版 / 无旁白配乐版。H.264 High/yuv420p/AAC48k/+faststart。
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

ffmpeg -y -loglevel error -framerate 30 -i frames/frame_%04d.png -i narrated.wav `
  -c:v libx264 -preset medium -crf 18 -profile:v high -pix_fmt yuv420p `
  -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart `
  AI不能欠薪-旁白版.mp4
if (-not $?) { throw 'encode narrated failed' }

ffmpeg -y -loglevel error -framerate 30 -i frames/frame_%04d.png -i instrumental.wav `
  -c:v libx264 -preset medium -crf 18 -profile:v high -pix_fmt yuv420p `
  -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart `
  AI不能欠薪-无旁白版.mp4
if (-not $?) { throw 'encode instrumental failed' }

Write-Output 'ENCODE DONE'
