"""Generate original project-owned mono 48 kHz SFX; deterministic and offline."""
from pathlib import Path
import numpy as np
import soundfile as sf
OUT=Path(__file__).resolve().parents[2]/"audio"/"sfx"; SR=48000
SPECS={"coin":(1040,.13),"ramp":(260,.18),"flip":(520,.20),"land":(95,.16),"crane":(145,.34),"barrel":(120,.25),"collapse-warning":(880,.42),"collapse-fall":(72,.38),"pallet":(190,.26),"door":(110,.32),"checkpoint":(660,.22),"finish":(784,.55),"purchase":(620,.26),"equip":(740,.18)}
OUT.mkdir(parents=True,exist_ok=True); rng=np.random.default_rng(50202)
for name,(freq,duration) in SPECS.items():
 t=np.arange(int(SR*duration))/SR; env=np.minimum(1,t/.008)*np.exp(-t*(7 if name!="collapse-warning" else 3.5)); chirp=freq*(1+(.45 if name in {"coin","checkpoint","finish","purchase","equip"} else -.25)*t/duration); phase=2*np.pi*np.cumsum(chirp)/SR; wave=.42*np.sin(phase)+.12*np.sin(phase*2.01)
 if name in {"land","barrel","collapse-fall","door","pallet","crane"}:wave+=rng.normal(0,.22,len(t))
 if name=="collapse-warning":wave+=.22*np.sin(2*np.pi*1320*t)
 sf.write(OUT/f"{name}.ogg",np.clip(wave*env,-.82,.82).astype("float32"),SR,format="OGG",subtype="VORBIS")
