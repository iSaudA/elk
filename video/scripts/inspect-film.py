"""Decode the video, verify delivery metadata, and make review artifacts from real frames."""
import json
from pathlib import Path
import struct
import subprocess
import sys
from PIL import Image, ImageDraw, ImageFont

path=Path(sys.argv[1]).resolve()
root=path.parent
is_draft=path.stem=='draft'
review=root/'review'/('draft' if is_draft else 'final')
review.mkdir(parents=True,exist_ok=True)

def run(*args):
    return subprocess.run(args,check=True,capture_output=True,text=True).stdout

metadata=json.loads(run('ffprobe','-v','error','-count_frames','-show_streams','-show_format','-of','json',str(path)))
v=next(s for s in metadata['streams'] if s['codec_type']=='video')
a=next(s for s in metadata['streams'] if s['codec_type']=='audio')
assert v['nb_read_frames']=='870',v
assert v['r_frame_rate']=='30/1' and v['avg_frame_rate']=='30/1',v
assert v['codec_name']=='h264' and v['pix_fmt'] in (['yuv420p','yuvj420p'] if is_draft else ['yuv420p']),v
assert a['codec_name']=='aac' and int(a['channels'])==2,a
assert (int(v['width']),int(v['height']))==((960,540) if is_draft else (1920,1080)),v
assert abs(float(metadata['format']['duration'])-29)<.08,metadata['format']
# Exercise every compressed frame and audio packet, not just the header.
run('ffmpeg','-v','error','-i',str(path),'-f','null','-')
(root/('draft-metadata.json' if is_draft else 'verification.json')).write_text(json.dumps(metadata,indent=2)+'\n')

def frame(n):
    out=review/f'frame-{n:04d}.png'
    run('ffmpeg','-v','error','-y','-i',str(path),'-vf',f'select=eq(n\\,{n})','-frames:v','1',str(out))
    return out

font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',19)
def sheet(numbers,name,cols=3,tile_w=640):
    tile_h=round(tile_w*1080/1920)
    rows=(len(numbers)+cols-1)//cols
    image=Image.new('RGB',(cols*tile_w,rows*(tile_h+43)), '#092B21')
    d=ImageDraw.Draw(image)
    for i,n in enumerate(numbers):
        pic=Image.open(frame(n)).convert('RGB').resize((tile_w,tile_h),Image.Resampling.LANCZOS)
        x=(i%cols)*tile_w;y=(i//cols)*(tile_h+43)
        image.paste(pic,(x,y))
        d.text((x+16,y+tile_h+10),f'{n/30:05.2f}s   |   frame {n:03d}',font=font,fill='#B4DCC0')
    image.save(name)

sheet([84,165,300,480,660,825],root/('draft-contact-sheet.png' if is_draft else 'contact-sheet.png'))
sheet([0,119,120,209,210,359,360,569,570,719,720,869],review/'boundaries.png',3,480)
if not is_draft:
    import shutil
    shutil.copyfile(frame(825),root/'poster.png')
    run('ffmpeg','-v','error','-y','-i',str(path),'-vf','fps=2,scale=320:180,tile=6x10:padding=4:margin=4:color=0x092B21','-frames:v','1',str(root/'review/motion-overview.png'))
    transition_frames=[cut+offset for cut in [120,210,360,570,720] for offset in [-1,0,5,10,20]]
    selection='+'.join(f'eq(n,{n})' for n in transition_frames)
    run('ffmpeg','-v','error','-y','-i',str(path),'-vf',f"select='{selection}',scale=480:270,tile=5x5:padding=3:margin=3:color=0x092B21",'-frames:v','1',str(root/'review/transition-strips.png'))
    # Read the MP4 atom order to check progressive download support.
    atoms=[]
    with path.open('rb') as f:
        while True:
            head=f.read(8)
            if len(head)<8:break
            size,kind=struct.unpack('>I4s',head)
            consumed=8
            if size==1:size=struct.unpack('>Q',f.read(8))[0];consumed=16
            atoms.append(kind.decode('ascii',errors='replace'))
            if size==0:break
            f.seek(size-consumed,1)
    assert atoms.index('moov')<atoms.index('mdat'),atoms
    (root/'faststart.json').write_text(json.dumps({'atom_order':atoms,'fast_start':True},indent=2)+'\n')
print(json.dumps({'file':str(path),'duration':metadata['format']['duration'],'frames':v['nb_read_frames'],'resolution':[v['width'],v['height']],'fps':v['avg_frame_rate'],'video':v['codec_name'],'pixel_format':v['pix_fmt'],'audio':a['codec_name'],'audio_rate':a['sample_rate'],'full_decode':'passed'}))
