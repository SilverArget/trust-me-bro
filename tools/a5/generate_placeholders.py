"""A5 placeholder atlas generator. Pillow only; no network or external artwork."""
from pathlib import Path
from PIL import Image,ImageDraw
import hashlib,json,math
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'sprites/a5'
MOTIONS=['idle','run','jump','vault','slide','wallRun','roll','frontFlip']
SETS={'default':('#437a98','#eadfc3'),'dockCrew':('#ec8b29','#f8dd45'),'nightShift':('#50466f','#7cead6'),'hazardRunner':('#e7cc32','#f47b32')}
LAYERS=['body','bag','vest','helmet','eyewear']
def cell(runner,action,frame,layer,colors):
 im=Image.new('RGBA',(64,64));d=ImageDraw.Draw(im);main,accent=colors
 bob=frame%2 if action in ['idle','run'] else 0
 skin='#c99269' if runner=='male' else '#d6a17d'
 tuck=action in ['roll','frontFlip'] and frame in [2,3,4,5]
 head=(29,21+bob,38,30+bob) if tuck else (28,12+bob,38,23+bob)
 torso=(23,30+bob,37,40+bob) if tuck else ((26,24+bob,37,40+bob) if runner=='female' else (24,24+bob,38,40+bob))
 if layer=='body':
  d.rectangle(torso,fill='#355b70');d.ellipse(head,fill=skin)
  d.rectangle((head[0],head[1],head[2],head[1]+3),fill='#392a28')
  if runner=='female':d.polygon([(head[0],head[1]+1),(head[0]-5,head[1]+3),(head[0]-4,head[1]+12),(head[0]+1,head[1]+8)],fill='#392a28')
  if tuck:
   d.line([(25,38),(37,42),(38,32)],fill='#243445',width=6)
   d.line([(27,31),(22,37),(34,39)],fill=skin,width=4)
  else:
   stride=[0,3,5,3,0,-3,-5,-3][frame] if action=='run' else (4 if action in ['jump','vault','wallRun'] else 0)
   d.line([(28,39),(27-stride,48),(25-stride,54)],fill='#243445',width=5)
   d.line([(34,39),(35+stride,47),(38+stride,54)],fill='#243445',width=5)
   d.line([(27,27),(21,33),(23-stride,39)],fill=skin,width=4)
   d.line([(36,27),(41,32),(42+stride//2,37)],fill=skin,width=4)
  d.rectangle((35,head[1]+6,37,head[1]+7),fill='#17242c')
 elif layer=='bag':d.rectangle((19,torso[1]+2,25,torso[3]-1),fill=accent);d.line([(23,torso[1]),(30,torso[3])],fill='#151d28',width=2)
 elif layer=='vest':
  d.rectangle(torso,fill=main);d.line([(torso[0],torso[1]+5),(torso[2],torso[1]+5)],fill=accent,width=2)
  d.line([(torso[0]+3,torso[1]),(torso[0]+3,torso[3])],fill=accent,width=2)
 elif layer=='helmet':
  d.rectangle((head[0]-2,head[1]-3,head[2]+1,head[1]+2),fill=accent)
  d.rectangle((head[0]-3,head[1]+1,head[2]+3,head[1]+3),fill=main)
  if main==SETS['hazardRunner'][0]:d.line([(head[0]-1,head[1]),(head[0]-1,head[3])],fill=main,width=2)
 elif layer=='eyewear':d.rectangle((head[0]+3,head[1]+5,head[2]+2,head[1]+8),fill=accent);d.point((head[2],head[1]+6),fill='#eaffff')
 angle=0
 if action=='slide':angle=70
 elif action=='vault':angle=[0,-10,-20,-25,-25,-15,-8,0][frame]
 elif action=='wallRun':angle=-15
 elif action in ['roll','frontFlip']:angle=-frame*45
 if angle:im=im.rotate(angle,resample=Image.Resampling.NEAREST,center=(32,32))
 return im

def generate():
 OUT.mkdir(parents=True,exist_ok=True);assets=[]
 for runner in ['male','female']:
  for outfit in ['base',*SETS]:
   for layer in (['body'] if outfit=='base' else LAYERS[1:]):
    atlas=Image.new('RGBA',(512,512))
    for row,action in enumerate(MOTIONS):
     for f in range(8):atlas.paste(cell(runner,action,f,layer,SETS.get(outfit,SETS['default'])),(f*64,row*64))
    p=OUT/f'{runner}-{outfit}-{layer}.png';atlas.save(p,optimize=False,compress_level=9)
    sha=hashlib.sha256(p.read_bytes()).hexdigest()
    assets.append({'path':p.relative_to(ROOT).as_posix(),'runner':runner,'outfit':outfit,'layer':layer,'bytes':p.stat().st_size,'sha256':sha,'cacheVersion':sha[:16],'implementation':'IMPLEMENTED','functional_test':'NOT_TESTED','art':'PLACEHOLDER','visual_acceptance':'DEFERRED','runtimeIntegration':'IMPLEMENTED'})
 durations={'idle':1,'run':.5,'jump':.8,'vault':.42,'slide':.6,'wallRun':.9,'roll':.45,'frontFlip':.8}
 contract={'version':1,'cell':[64,64],'atlas':[512,512],'columns':8,'rows':8,'anchor':[32,56],'standingHitbox':{'x':16,'y':8,'w':32,'h':48},'physicsNote':'Rendering never assigns player geometry. Existing slide/crouch 32x24 physics stays unchanged; 32x48 is the standing reference, not an override.','padding':4,'maxBytesPerFile':524288,'alpha':'straight RGBA; transparent padding','facing':'right source; left = horizontal mirror around anchor x=32','layerOrder':LAYERS,'timing':'idle/run use game clock; others map normalized existing mechanic phase to frames 0..7; durations below are authoring reference only, never physics values','motions':{a:{'row':i,'frames':list(range(8)),'duration_s':durations[a],'fps':8/durations[a],'loop':a in ['idle','run','wallRun'],'tuckFrames':[2,3,4,5] if a=='frontFlip' else []} for i,a in enumerate(MOTIONS)},'assets':assets}
 (OUT/'atlas-contract.json').write_text(json.dumps(contract,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'files':len(assets),'bytes':sum(x['bytes'] for x in assets)}))
if __name__=='__main__':generate()
