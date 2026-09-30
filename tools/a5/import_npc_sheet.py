#!/usr/bin/env python3
"""Deterministically import the approved 4x2 A5f NPC sheet."""
from __future__ import annotations
import hashlib, json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from import_ai_sheets import segment, clean_edge_fragments, boundary_halo_count, save_png

ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'sprites/raw/a5-ai/npc-sheet.png'
OUT=ROOT/'sprites/a5'; EVID=ROOT/'03-test/a5f-evidence'

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()

def fitted(cell, size, target_h, flip=False):
    if flip: cell=cell.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    box=cell.getchannel('A').getbbox()
    if not box: raise SystemExit('STOP: empty used NPC frame')
    actor=cell.crop(box); scale=target_h/actor.height
    nw=max(1,round(actor.width*scale)); actor=actor.resize((nw,target_h),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(size,size)); x=(size-nw)//2; y=size-target_h
    if x<0: raise SystemExit('STOP: NPC frame overflow')
    canvas.alpha_composite(actor,(x,y))
    # Remove resampling green only on the alpha boundary.
    a=np.asarray(canvas).copy(); opaque=a[...,3]>0; edge=np.zeros_like(opaque)
    edge[1:]|=~opaque[:-1];edge[:-1]|=~opaque[1:];edge[:,1:]|=~opaque[:,:-1];edge[:,:-1]|=~opaque[:,1:]
    p=a[...,:3].astype(np.int16); spill=opaque&edge&(p[...,1]>80)&(p[...,1]-np.maximum(p[...,0],p[...,2])>24)
    rb=np.maximum(p[...,0],p[...,2]);a[...,1][spill]=np.clip(rb[spill]+8,0,255).astype(np.uint8)
    return Image.fromarray(a,'RGBA')

def main():
    src=Image.open(SRC).convert('RGBA')
    if src.size!=(1774,887): raise SystemExit(f'STOP: source size {src.size}')
    xb=[round(i*src.width/4) for i in range(5)]; yb=[round(i*src.height/2) for i in range(3)]
    cells=[]; cleanup=[]
    for r in range(2):
      for c in range(4):
        im=segment(src.crop((xb[c],yb[r],xb[c+1],yb[r+1])))
        im,n,area=clean_edge_fragments(im);cells.append(im);cleanup.append((n,area))
    specs=[('worker',[0,1,3],128,112,[False]*3),('decor',[4,5,6,7],64,56,[False,True,True,True])]
    EVID.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
    report={'schema':1,'source':str(SRC.relative_to(ROOT)).replace('\\','/'),'source_sha256':sha(SRC),'unused_source_frames':[2],'atlases':{}}
    contract={'version':1,'facing':'left','assets':[]}
    contact=Image.new('RGBA',(512,256),(20,24,31,255)); d=ImageDraw.Draw(contact)
    for ai,(name,ids,size,height,flips) in enumerate(specs):
      atlas=Image.new('RGBA',(size*len(ids),size)); frames=[]
      for j,(idx,flip) in enumerate(zip(ids,flips)):
        out=fitted(cells[idx],size,height,flip); atlas.alpha_composite(out,(j*size,0))
        box=out.getchannel('A').getbbox(); alpha=int(np.count_nonzero(np.asarray(out.getchannel('A')))); halo=boundary_halo_count(out)
        overflow=not box or box[0]<0 or box[1]<0 or box[2]>size or box[3]>size
        if not box or overflow or halo: raise SystemExit(f'STOP: {name} frame {j} invalid')
        frames.append({'frame':j,'source_index':idx,'mirrored':flip,'alpha_pixels':alpha,'bbox':list(box),'empty':False,'overflow':overflow,'boundary_green_halo_pixels':halo,'removed_components':cleanup[idx][0],'removed_alpha_pixels':cleanup[idx][1]})
        thumb=out.resize((size, size),Image.Resampling.NEAREST); contact.alpha_composite(thumb,(j*128,ai*128))
      path=OUT/f'npc-{name}.png';save_png(atlas,path)
      if path.stat().st_size>262144: raise SystemExit('STOP: NPC atlas byte limit')
      digest=sha(path); report['atlases'][name]={'path':str(path.relative_to(ROOT)).replace('\\','/'),'size':list(atlas.size),'cell':[size,size],'anchor':[size//2,size],'sha256':digest,'bytes':path.stat().st_size,'frames':frames}
      contract['assets'].append({'path':report['atlases'][name]['path'],'kind':name,'size':list(atlas.size),'cell':[size,size],'anchor':[size//2,size],'frames':len(ids),'sha256':digest,'cacheVersion':digest[:16]})
    save_png(contact,EVID/'contact-npc.png')
    (EVID/'import.json').write_text(json.dumps(report,indent=2,sort_keys=True)+'\n',encoding='utf-8')
    (OUT/'npc-contract.json').write_text(json.dumps(contract,indent=2)+'\n',encoding='utf-8')
    for a in contract['assets']: print(a['kind'],a['sha256'][:16],(ROOT/a['path']).stat().st_size)

if __name__=='__main__': main()
