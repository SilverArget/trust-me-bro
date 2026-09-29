#!/usr/bin/env python3
"""Content-relative B-M2 loop seam checker."""
import argparse, json, re
from pathlib import Path
import numpy as np
import soundfile as sf

SR=48000; SEED=12091201; QC=.998; QD=.997; DC_SEC=.050

def mono(x):
    x=np.asarray(x,dtype=float); return x.mean(1) if x.ndim==2 else x
def rms(x): return float(np.sqrt(np.mean(x*x)))
def calibration(body,rate):
    r=max(rms(body),1e-12); w=max(16,round(rate*DC_SEC)); ids=np.arange(w,len(body)-w)
    c=np.abs((body[ids]-body[ids-1])-.5*((body[ids+1]-body[ids])+(body[ids-1]-body[ids-2])))/r
    cs=np.r_[0.,np.cumsum(body)]; d=np.abs((cs[ids+w]-cs[ids])/w-(cs[ids]-cs[ids-w])/w)/r
    return dict(rms=r,w=w,ids=ids,c=c,d=d,ct=float(np.quantile(c,QC)),dt=float(np.quantile(d,QD)))
def junction(x,left,right,cal):
    c=float(abs((x[right]-x[left-1])-.5*((x[right+1]-x[right])+(x[left-1]-x[left-2])))/cal['rms'])
    d=float(abs(x[right:right+cal['w']].mean()-x[left-cal['w']:left].mean())/cal['rms'])
    v=max(c/max(cal['ct'],1e-15),d/max(cal['dt'],1e-15))
    return {'pass':bool(v<=1),'value':v,'threshold':1.,'continuity':c,'continuityThreshold':cal['ct'],'dc':d,'dcThreshold':cal['dt']}
def check_samples(x,rate,p,end,trim_ms=0,step_rms=0,at=None):
    x=mono(x).copy(); a=round(p*rate); b=round(end*rate); body=x[a:b]; cal=calibration(body,rate)
    left=b-round(trim_ms*rate/1000) if at is None else round(at*rate); right=a if at is None else left
    if min(left,right)<=cal['w'] or left+1>=len(x) or right+cal['w']>=len(x): raise ValueError('junction too close to boundary')
    if step_rms: x[right:right+max(cal['w'],round(.1*rate))]+=step_rms*cal['rms']
    out=junction(x,left,right,cal); fw=max(16,round(.02*rate)); blocks=body[:len(body)//fw*fw].reshape(-1,fw)
    med=max(float(np.median(np.sqrt(np.mean(blocks*blocks,1)))),1e-12); first=rms(body[:fw])/med; last=rms(body[-fw:])/med
    out.update(fadePass=bool(first>=.25 and last>=.25),firstRmsRatio=first,lastRmsRatio=last,loopStart=p,loopEnd=end,trimMs=trim_ms,stepRms=step_rms,at=at)
    out['pass']=bool(out['pass'] and out['fadePass']); return out
def check(path,p,l,trim=0,step=0,at=None):
    x,rate=sf.read(path,always_2d=True,dtype='float64'); return check_samples(x,rate,p,p+l,trim,step,at)
def signal(kind,p=.384,l=4,hz=220,rate_hz=4,seed=50202):
    n=round((l+2*p)*SR); t=(np.arange(n)/SR-p)%l
    if kind in ('sine','step'):
        loop_hz=round(hz*l)/l
        return .4*np.sin(2*np.pi*loop_hz*t)
    rng=np.random.default_rng(seed); core=.25*np.sin(2*np.pi*110*np.arange(round(l*SR))/SR); w=round(.012*SR); period=round(SR/rate_hz)
    burst=rng.normal(size=w)*np.hanning(w); burst*=.25/max(np.max(abs(burst)),1e-12)
    for s in range(period//2,len(core)-w,period): core[s:s+w]+=burst
    return core[(np.arange(n)-round(p*SR))%len(core)]
def probe(kind,p,l,hz,rate_hz,step,trim=0):
    x=signal('sine' if kind=='early' else kind,p,l,hz,rate_hz); actual=37 if kind=='early' and not trim else trim
    ratio=step/max(rms(x[round(p*SR):round((p+l)*SR)]),1e-12) if kind=='step' else 0
    return check_samples(x,SR,p,p+l,actual,ratio)
def real_files():
    root=Path(__file__).resolve().parents[2]/'audio'/'music'
    manifest=(root.parents[1]/'ASSET-MANIFEST.md').read_text(encoding='utf8')
    names=('menu','dock31','frozen','magma','aftermath')
    return [(n,root/(n+'.ogg'),float(re.search(r'\|\s*([0-9.]+) s\s*\|\s*([0-9.]+) s\s*\|',next(x for x in manifest.splitlines() if f'audio/music/{n}.ogg' in x)).group(2))) for n in names]
def selftest():
    p=.384; syn={k:probe(k,p,4,250 if k=='sine' else 220,4,.01) for k in ('sine','hits','step','early')}
    ok=syn['sine']['pass'] and syn['hits']['pass'] and not syn['step']['pass'] and not syn['early']['pass']; rng=np.random.default_rng(SEED); rows={}
    for name,path,l in real_files():
        x,rate=sf.read(path,always_2d=True,dtype='float64'); x=mono(x); a=round(p*rate); b=round((p+l)*rate); cal=calibration(x[a:b],rate)
        picks=rng.choice(cal['ids'],200,replace=False); fa=sum(not junction(x,a+int(i),a+int(i),cal)['pass'] for i in picks)
        seam=check_samples(x,rate,p,p+l); r37=check_samples(x,rate,p,p+l,37); r3=check_samples(x,rate,p,p+l,3.7); r2=check_samples(x,rate,p,p+l,step_rms=.1)
        rows[name]={'seamValue':seam['value'],'threshold':1.,'continuityThreshold':seam['continuityThreshold'],'dcThreshold':seam['dcThreshold'],'G1':seam['pass'] if name in ('dock31','frozen','magma') else None,'G2FalseAlarms':int(fa),'R1_37ms':r37['value'],'R1_37msRed':not r37['pass'],'R1_3_7ms':r3['value'],'R1_3_7msRed':not r3['pass'],'R2':r2['value'],'R2Red':not r2['pass'],'fadePass':seam['fadePass']}
        ok=ok and (name not in ('dock31','frozen','magma') or seam['pass']) and fa<=2 and not r37['pass'] and not r3['pass'] and not r2['pass']
    print(json.dumps({'pass':bool(ok),'seed':SEED,'formulaAttempt':1,'rows':rows,'synthetic':syn},indent=2)); raise SystemExit(0 if ok else 1)
def parser():
    ap=argparse.ArgumentParser(); ap.add_argument('files',nargs='*',type=Path); ap.add_argument('--p',type=float,default=.384); ap.add_argument('--l',type=float,default=32); ap.add_argument('--trim-ms',type=float,default=0); ap.add_argument('--step-rms',type=float,default=0); ap.add_argument('--at',type=float); ap.add_argument('--selftest',action='store_true'); ap.add_argument('--probe',choices=('sine','hits','early','step')); ap.add_argument('--hz',type=float,default=220); ap.add_argument('--rate',type=float,default=4); ap.add_argument('--step',type=float,default=.01); ap.add_argument('--seconds',type=float,default=4); return ap
def main():
    a=parser().parse_args()
    if a.selftest: selftest()
    if a.probe: print(json.dumps(probe(a.probe,a.p,a.seconds,a.hz,a.rate,a.step,a.trim_ms),indent=2)); return
    if not a.files: raise SystemExit('audio file required')
    rows={p.stem:check(p,a.p,a.l,a.trim_ms,a.step_rms,a.at) for p in a.files}; print(json.dumps(rows,indent=2)); raise SystemExit(0 if all(x['pass'] for x in rows.values()) else 1)
if __name__=='__main__': main()
