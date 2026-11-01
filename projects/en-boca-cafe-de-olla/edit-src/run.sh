F="/Users/Computer/Claude Code/dws-flares-sales/node_modules/ffmpeg-static/ffmpeg"
cd "$(dirname "$0")"
OUT=${1:-edit.mp4}
"$F" -y -i ../b1r.mp4 -i ../b2.mp4 -i ../b3.mp4 -i ../v1r.mp3 -i ../v2r.mp3 -i ../v3.mp3 -loop 1 -t 30 -i disc.png -loop 1 -t 30 -i wm.png -filter_complex "
[0:v]trim=0:10,setpts=PTS-STARTPTS,crop=656:1166:32:114,scale=1080:1920:flags=lanczos,fps=30,setsar=1[v0];
[1:v]trim=0:10,setpts=PTS-STARTPTS,scale=1080:1920:flags=lanczos,fps=30,setsar=1[v1];
[2:v]trim=0:10,setpts=PTS-STARTPTS,scale=1080:1920:flags=lanczos,fps=30,setsar=1[v2];
[v0][v1][v2]concat=n=3:v=1:a=0[vc];
[vc]split[m][e];
[e]scale=270:480,gblur=sigma=4,scale=1080:1920:flags=bicubic,eq=brightness=-0.14:saturation=0.9,format=yuva420p,fade=t=in:st=26.7:d=0.45:alpha=1[eb];
[m][eb]overlay=enable='gte(t,26.5)'[vb];
[6:v]format=rgba,fade=t=in:st=26.85:d=0.45:alpha=1[dk];
[7:v]format=rgba,fade=t=out:st=26.3:d=0.45:alpha=1[wm];
[vb][wm]overlay=28:176:enable='lt(t,26.8)'[vw];
[vw][dk]overlay=290:300:enable='gte(t,26.5)',format=yuv420p,ass=captions.ass:fontsdir=fonts[vout];
[3:a]aresample=48000,loudnorm=I=-16:TP=-2:LRA=7,aresample=48000,adelay=300:all=1[a1];
[4:a]aresample=48000,loudnorm=I=-16:TP=-2:LRA=7,aresample=48000,adelay=10300:all=1[a2];
[5:a]aresample=48000,loudnorm=I=-16:TP=-2:LRA=7,aresample=48000,adelay=20300:all=1[a3];
[a1][a2][a3]amix=inputs=3:normalize=0:duration=longest,apad=whole_dur=30,atrim=0:30,asplit=2[vo][vok];
[0:a]atrim=0:10,asetpts=PTS-STARTPTS[x0];[1:a]atrim=0:10,asetpts=PTS-STARTPTS[x1];[2:a]atrim=0:10,asetpts=PTS-STARTPTS[x2];
[x0][x1][x2]concat=n=3:v=0:a=1,aresample=48000,highpass=f=70,acompressor=threshold=0.05:ratio=4:attack=5:release=120,volume=${AMB:-9}dB[amb];
[amb][vok]sidechaincompress=threshold=0.015:ratio=10:attack=15:release=500:makeup=1[ducked];
[ducked]volume='1+0.9*clip((t-27)/1.5,0,1)':eval=frame[ambf];
[vo][ambf]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-13.5:TP=-1.5:LRA=9,aresample=48000,alimiter=limit=0.84:level=disabled,atrim=0:30[aout]
" -map "[vout]" -map "[aout]" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 48000 -movflags +faststart -t 30 "$OUT"
