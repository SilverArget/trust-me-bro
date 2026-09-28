from pathlib import Path
from PIL import Image,ImageOps
import json,hashlib,copy,sys
ROOT=Path(__file__).resolve().parents[1]
CONTRACT=ROOT/'sprites/a5/atlas-contract.json'
def check(c,images):
 assert c['anchor']==[32,56], 'anchor'
 assert c['standingHitbox']=={'x':16,'y':8,'w':32,'h':48}, 'hitbox'
 assert c['layerOrder']==['body','bag','vest','helmet','eyewear'], 'layer order'
 assert c['motions']['frontFlip']['tuckFrames']==[2,3,4,5], 'tuck'
 expected={(r,o,l) for r in ['male','female'] for o in ['base','default','dockCrew','nightShift','hazardRunner'] for l in (['body'] if o=='base' else c['layerOrder'][1:])}
 by={(a['runner'],a['outfit'],a['layer']):a for a in c['assets']}
 assert set(by)==expected and len(c['assets'])==34, 'asset coverage'
 frames=0;combos=0
 for r in ['male','female']:
  for o in ['default','dockCrew','nightShift','hazardRunner']:
   for motion,meta in c['motions'].items():
    assert meta['frames']==list(range(8)), 'all eight frames'
    for direction in [-1,1]:
     combos+=1
     for f in meta['frames']:
      composite=Image.new('RGBA',(64,64)); tiles=[]
      for layer in c['layerOrder']:
       a=by[(r,'base' if layer=='body' else o,layer)];im=images[a['path']]
       assert im.mode=='RGBA' and im.size==(512,512), 'atlas dimensions/mode'
       tile=im.crop((f*64,meta['row']*64,(f+1)*64,(meta['row']+1)*64))
       if direction<0:tile=ImageOps.mirror(tile)
       box=tile.getchannel('A').getbbox()
       assert box and box[0]>=4 and box[1]>=4 and box[2]<=60 and box[3]<=60, f'alpha/padding {r} {o} {motion} {f} {layer} {box}'
       tiles.append(tile);before=composite.tobytes();composite.alpha_composite(tile)
       assert composite.tobytes()!=before, 'layer makes visible difference at composition step'
      for omitted in range(5):
       partial=Image.new('RGBA',(64,64))
       for i,tile in enumerate(tiles):
        if i!=omitted:partial.alpha_composite(tile)
       assert partial.tobytes()!=composite.tobytes(), 'layer visible in final composite'
      frames+=1
 assert combos==128 and frames==1024, 'matrix coverage'
 assert images[by[('male','base','body')]['path']].getchannel('A').tobytes()!=images[by[('female','base','body')]['path']].getchannel('A').tobytes(), 'female silhouette is not recolor'
 return {'combinations':combos,'frames':frames,'layerSamples':frames*5}
c=json.loads(CONTRACT.read_text());images={a['path']:Image.open(ROOT/a['path']).convert('RGBA') for a in c['assets']}
result=check(c,images)
for a in c['assets']:
 b=(ROOT/a['path']).read_bytes();assert len(b)<=c['maxBytesPerFile'];assert hashlib.sha256(b).hexdigest()==a['sha256'];assert a['cacheVersion']==a['sha256'][:16]
negative=[]
for mutation in ['anchor','hitbox','missing-frame','tuck','missing-asset','blank-layer','padding','dimensions']:
 bad=copy.deepcopy(c);pics=dict(images)
 if mutation=='anchor':bad['anchor'][0]=31
 elif mutation=='hitbox':bad['standingHitbox']['w']=31
 elif mutation=='missing-frame':bad['motions']['run']['frames'].pop()
 elif mutation=='tuck':bad['motions']['frontFlip']['tuckFrames']=[]
 elif mutation=='missing-asset':bad['assets'].pop()
 else:
  key=c['assets'][0]['path'];im=pics[key].copy()
  if mutation=='blank-layer':im.paste((0,0,0,0),(0,0,64,64))
  if mutation=='padding':im.putpixel((0,0),(255,255,255,255))
  if mutation=='dimensions':im=im.crop((0,0,511,512))
  pics[key]=im
 try:check(bad,pics)
 except AssertionError as e:negative.append({'mutation':mutation,'rejected':True,'reason':str(e)})
 else:raise AssertionError('Mutation escaped: '+mutation)
result.update({'status':'PASS','scope':'OFFLINE ASSET CONTRACT ONLY; runtime outfit-animation-matrix NOT_RUN','negativeControls':negative,'assets':len(c['assets'])})
(ROOT/'03-test/a5a1-evidence/asset-matrix.json').write_text(json.dumps(result,indent=2))
for a in c['assets']:
 a['functional_test']='PASSED'
 a['functional_test_scope']='offline contract; runtime NOT_TESTED'
CONTRACT.write_text(json.dumps(c,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result))
