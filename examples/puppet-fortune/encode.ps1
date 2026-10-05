# encode.ps1 —— 两版 MP4：旁白版 / 无旁白配乐版。H.264 High/yuv420p/AAC48k/+faststart。
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

ffmpeg -y -loglevel error -framerate 30 -i frames/frame_%04d.png -i mix_voice.wav `
  -c:v libx264 -preset medium -crf 18 -profile:v high -pix_fmt yuv420p `
  -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart `
  out_voice.mp4
if (-not $?) { throw 'encode voice failed' }

ffmpeg -y -loglevel error -framerate 30 -i frames/frame_%04d.png -i mix_novoice.wav `
  -c:v libx264 -preset medium -crf 18 -profile:v high -pix_fmt yuv420p `
  -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart `
  out_novoice.mp4
if (-not $?) { throw 'encode novoice failed' }

Write-Output 'ENCODE DONE'
