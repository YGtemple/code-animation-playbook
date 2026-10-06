# encode.ps1 —— 两版 MP4：旁白版(主推) / 无旁白配乐版。
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$vargs = @('-y','-loglevel','error','-i','content_video.mp4','-i','mix_voice.wav',
  '-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart','out_voice.mp4')
& ffmpeg @vargs
if (-not $?) { throw 'encode voice failed' }

$nargs = @('-y','-loglevel','error','-i','content_video.mp4','-i','mix_novoice.wav',
  '-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart','out_novoice.mp4')
& ffmpeg @nargs
if (-not $?) { throw 'encode novoice failed' }

Write-Output 'ENCODE DONE'
Get-ChildItem out_*.mp4 | ForEach-Object { "{0}  {1:N2} MB" -f $_.Name, ($_.Length/1MB) }
