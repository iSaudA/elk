"""Original deterministic score and synchronized cues, using Python's standard library."""
from array import array
from pathlib import Path
import math
import wave

RATE = 48000
DURATION = 29
N = RATE * DURATION
left = array('d', [0]) * N
right = array('d', [0]) * N

def tone(start, length, freq, gain, attack=0.02, release=0.4, pan=0.0, bell=False):
    first = round(start * RATE)
    count = min(round(length * RATE), N-first)
    for k in range(count):
        t = k / RATE
        env = min(1, t/attack) * min(1, (length-t)/release)
        if bell:
            env *= math.exp(-t*3.5)
            v = math.sin(math.tau*freq*t) + 0.24*math.sin(math.tau*freq*2.003*t)
        else:
            v = math.sin(math.tau*freq*t) + 0.13*math.sin(math.tau*freq*2*t)
        v *= gain * env
        left[first+k] += v*(1-pan*0.4)
        right[first+k] += v*(1+pan*0.4)

# Soft fifths and open ninths. Long overlaps keep the sound calm across edits.
chords = [(0,4.5,[164.81,246.94,369.99]),(4,3.7,[130.81,196,293.66]),(7,5.7,[146.83,220,329.63]),(12,7.7,[164.81,246.94,293.66]),(19,5.7,[130.81,196,329.63]),(24,4.9,[130.81,196,261.63,392])]
for start,length,notes in chords:
    for i,freq in enumerate(notes):
        tone(start,length,freq,0.027,attack=0.85,release=1.3,pan=(i-1)*0.6)
# Delicate, sparse arpeggio establishes forward motion, without a trailer build.
for k in range(28):
    t = 4.3+k*0.7142857
    freq = [493.88,587.33,739.99,659.25][k%4]
    tone(t,0.72,freq,0.020,attack=0.008,release=0.4,pan=(-0.6 if k%2 else 0.6),bell=True)
# Button, payment authorization, restrained interruption, evidence ticks, and resolution.
for t,freq,gain,length in [(0.7,620,.045,.13),(.9,659.25,.095,.7),(1.06,987.77,.070,.8),(2.02,164.81,.09,.25),(2.08,155.56,.035,.20),(4.15,392,.065,.8),(7.12,493.88,.065,.8),(12.25,587.33,.055,.5),(13.6,659.25,.06,.45),(14.55,392,.055,.45),(15.25,329.63,.08,1.2),(19.35,659.25,.06,.7),(20.3,783.99,.06,.65),(24.1,523.25,.075,1.9),(24.26,783.99,.05,1.7)]:
    tone(t,length,freq,gain,attack=.009,release=min(length,.5),bell=True)
# Fade to silence before the final video frame, with no click at either end.
peak = max(max(abs(v) for v in left),max(abs(v) for v in right))
scale = .40/peak
pcm = array('h')
for i,(l,r) in enumerate(zip(left,right)):
    t=i/RATE
    fade=min(1,t/.06,max(0,(28.8-t)/1.5))
    pcm.extend((round(l*scale*fade*32767),round(r*scale*fade*32767)))
output=Path(__file__).resolve().parents[1]/'public/film/sound-design.wav'
output.parent.mkdir(parents=True,exist_ok=True)
with wave.open(str(output),'wb') as w:
    w.setnchannels(2);w.setsampwidth(2);w.setframerate(RATE);w.writeframes(pcm.tobytes())
print(output)
