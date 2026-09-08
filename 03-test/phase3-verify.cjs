// Usage: node 03-test/phase3-verify.cjs [baseline git ref] [candidate git ref|WORKTREE]
// No browser, network, real storage or media output. Exit 1 on any failed gate.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'..');
const baseline=process.argv[2]||'55f857c',candidate=process.argv[3]||'WORKTREE';
function source(ref){return ref==='WORKTREE'?fs.readFileSync(path.join(repo,'index.html'),'utf8'):execFileSync('git',['show',ref+':index.html'],{cwd:repo,encoding:'utf8',maxBuffer:4*1024*1024})}
const mock=String.raw`
function makeCanvasMock(){
  const gradient=()=>({stops:[],addColorStop(offset,color){this.stops.push([offset,color])}});
  const context={
    metalRects:[],paintCount:0,globalAlpha:1,
    fillRect(x,y,w,h){
      this.paintCount++;
      // drawMetal's full surface fill, excluding its decorative overlays.
      if(this.fillStyle?.stops?.[0]?.[1]==='#9ba7b1')this.metalRects.push([x,y,w,h]);
    },
    drawImage(source){this.lastImage={metalRects:source.getContext().metalRects.map(r=>r.slice())}},
    createLinearGradient:gradient,createRadialGradient:gradient,
    clearRect(){this.metalRects=[]},
    beginPath(){},fill(){},stroke(){},arc(){},moveTo(){},lineTo(){},
    setTransform(){},save(){},restore(){},translate(){},scale(){},
    setLineDash(){},fillText(){},strokeText(){},strokeRect(){},
    clip(){},rect(){},ellipse(){},rotate(){},bezierCurveTo(){},arcTo(){},quadraticCurveTo(){},closePath(){},measureText:()=>({width:10})
  };
  return {
    getContext:()=>context,
    set width(value){this._width=value;context.metalRects=[]},get width(){return this._width||1920},
    set height(value){this._height=value;context.metalRects=[]},get height(){return this._height||1080},
    style:{},addEventListener(){},removeEventListener(){},remove(){},setAttribute(){},
    play:()=>Promise.resolve(),pause(){},load(){},blur(){},
    classList:{remove(){},add(){},contains:()=>false},
    querySelector:()=>canvasMock,appendChild(){},dataset:{}
  };
}
const canvasMock=makeCanvasMock();
const document = {
  getElementById: () => canvasMock, createElement: () => makeCanvasMock(),
  querySelectorAll: () => [canvasMock], querySelector: () => canvasMock,
  addEventListener: () => {}, removeEventListener: () => {},
  body: { style: {}, appendChild: () => {} },
  documentElement: { clientWidth: 1920, clientHeight: 1080 }
};
const window = {
  addEventListener: () => {}, removeEventListener: () => {},
  location: { hash: '' }, innerWidth: 1920, innerHeight: 1080,
  requestAnimationFrame: () => {}, cancelAnimationFrame: () => {},
  localStorage: { getItem: () => null, setItem: () => {} }
};
const addEventListener = () => {};
const removeEventListener = () => {};
const requestAnimationFrame = window.requestAnimationFrame;
const cancelAnimationFrame = window.cancelAnimationFrame;
const getComputedStyle = () => ({ getPropertyValue: () => '' });
const devicePixelRatio = 1;
const location = window.location;
const Image = class {};
const Audio = class { addEventListener(){} removeEventListener(){} load(){} play(){return Promise.resolve()} };
const setTimeout = () => 0;
const clearTimeout = () => {};
`;
function load(html){
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>! /\bsrc\s*=/i.test(m[1])).map(m=>m[2]);
 scripts.forEach(s=>new vm.Script(s));
 const game=scripts.find(s=>s.includes('function validateAllScenes('));
 assert(game,'Game inline script missing');
 const end=game.lastIndexOf('})();');assert(end>=0,'IIFE end missing');
 assert(/\nboot\(\);/.test(game),'Boot marker missing');
 const code=(game.slice(0,end)+'\nglobalThis.probe=(code)=>eval(code);\n'+game.slice(end)).replace(/\nboot\(\);/,'\n');
 const ctx=vm.createContext({console:{log(){},error(){},table(){}},navigator:{maxTouchPoints:0},performance:{now:()=>0},assert});
 vm.runInContext(mock+code,ctx,{timeout:60000});
 return expr=>vm.runInContext('probe('+JSON.stringify(expr)+')',ctx,{timeout:120000});
}
const projection=String.raw`(()=>{
 const pick=(o,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(o,k)).map(k=>[k,o[k]]));
 const rows=[];
 for(let l=1;l<=SCENE_COUNT;l++)for(let p=1;p<=PART_COUNT;p++){
  const g=buildScene(l,p),enemies=selectEnemies(l,p);
  rows.push({scene:l+'.'+p,geometry:{gaps:g.gaps,surfaces:g.surfaces.map(s=>pick(s,['x','y','w','h','kind','beat','route'])),platforms:g.platforms.map(p=>p.slice(0,5)),anchors:g.anchors},enemies:enemies.map(e=>({...pick(e,['type','x','y','w','h','dir','period','crossT','offset','fake']),surf:pick(e.surf,['x','y','w'])}))});
 }
 return JSON.stringify(rows);
})()`;
const before=load(source(baseline)),after=load(source(candidate));
const a=JSON.parse(before(projection)),b=JSON.parse(after(projection));
assert.equal(a.length,b.length,'Scene count differs');
const geometryDifferences=b.filter((r,i)=>JSON.stringify(r)!==JSON.stringify(a[i])).map(r=>r.scene);
const reports=JSON.parse(after('JSON.stringify(validateAllScenes())'));
const validatorErrors=reports.filter(r=>r.errors.length).map(r=>({scene:r.level+'.'+r.part,errors:r.errors}));
const result={baseline,candidate,scenes:b.length,geometryEqual:b.length-geometryDifferences.length,geometryDifferences,validatorErrors,syntax:'passed'};

if(after('typeof bindSurfaceModel')==='function'){
 after(String.raw`(()=>{
  // Four independent states, stable IDs after filtering, and JSON persistence.
  const surfaces=[0,1,2,3].map((i)=>({x:i*100,y:GROUND-80,w:70,h:18,kind:'platform',beat:0,solid:i>=2,visible:i%2===1}));
  const tuples=surfaces.map(s=>[s.x,-80,s.w,0,'fixture']);bindSurfaceModel(surfaces,tuples);
  const round=JSON.parse(JSON.stringify({surfaces,tuples}));
  assert.equal(solidSurfaces(round.surfaces).length,2);
  assert.equal(JSON.stringify(round.tuples.map(p=>p[5])),JSON.stringify(round.surfaces.map(surfaceFlags)));
  assert.equal(solidSurfaces(round.surfaces)[0].surfaceId,2);
  // Real cache, landing and drawing consumers, with one phantom and one hidden solid.
  currentLevel=1;currentPart=1;const key=17,original=buildScene(1,1),copy=JSON.parse(JSON.stringify(original));
  const target=copy.surfaces.find(s=>s.kind==='platform'),hidden=copy.surfaces.find(s=>s.kind==='platform'&&s!==target);
  target.solid=false;target.visible=true;hidden.solid=true;hidden.visible=false;bindSurfaceModel(copy.surfaces,copy.platforms);
  SCENE_CACHE.set(key,copy);cachedGeometryLevel=0;rt=makeRuntime();cacheSceneGeometry();
  const cached=staticPlatforms().find(s=>s.surfaceId===target.surfaceId),invisible=staticPlatforms().find(s=>s.surfaceId===hidden.surfaceId);
  assert.equal(cached.solid,false);assert.equal(invisible.visible,false);
  player.x=cached.x;player.y=cached.y-player.h+1;player.vy=20;player.onGround=false;
  landPlatform(cached,cached.y-1);assert.equal(player.onGround,false);
  player.x=invisible.x;player.y=invisible.y-player.h+1;landPlatform(invisible,invisible.y-1);assert.equal(player.onGround,true);
  sceneLayerKey='';drawSceneLayer();const painted=sceneLayerCtx.metalRects;
  assert(painted.some(r=>r[0]===cached.x&&r[1]===cached.y&&r[2]===cached.w));
  assert(!painted.some(r=>r[0]===invisible.x&&r[1]===invisible.y&&r[2]===invisible.w));
  // All graph consumers must treat a phantom exactly like an absent surface.
  const phantomReport=JSON.stringify(validateScene(1,1));
  copy.surfaces=copy.surfaces.filter(s=>s!==target);
  assert.equal(JSON.stringify(validateScene(1,1)),phantomReport);
  // Existing enemies retain their original ID when an unrelated earlier node becomes phantom.
  SCENE_CACHE.set(key,original);const enemies=selectEnemies(1,1),fixture=JSON.parse(JSON.stringify(original));
  const first=fixture.surfaces.slice().sort((a,b)=>a.surfaceId-b.surfaceId).find(s=>!enemies.some(e=>e.surf.surfaceId===s.surfaceId));first.solid=false;
  assert(!enemyValidationErrors(1,enemies,fixture,1).includes('enemy_surface_mismatch'));
  SCENE_CACHE.set(key,original);cachedGeometryLevel=0;resetScene(false);
 })()`);
 result.surfaceFixtures='passed';
}
console.log(JSON.stringify(result,null,2));
if(geometryDifferences.length||validatorErrors.length)process.exitCode=1;
