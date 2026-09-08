// Usage: node 03-test/phase3-verify.cjs [baseline git ref] [candidate git ref|WORKTREE]
// Add --geometry-only to skip Phase 3 fixtures in later phases.
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
module.exports={load,source,projection};
if(require.main===module){
const before=load(source(baseline)),after=load(source(candidate));
const a=JSON.parse(before(projection)),b=JSON.parse(after(projection));
assert.equal(a.length,b.length,'Scene count differs');
const geometryDifferences=b.filter((r,i)=>JSON.stringify(r)!==JSON.stringify(a[i])).map(r=>r.scene);
const reports=JSON.parse(after('JSON.stringify(validateAllScenes())'));
const validatorErrors=reports.filter(r=>r.errors.length).map(r=>({scene:r.level+'.'+r.part,errors:r.errors}));
const result={baseline,candidate,scenes:b.length,geometryEqual:b.length-geometryDifferences.length,geometryDifferences,validatorErrors,syntax:'passed'};

if(!process.argv.includes('--geometry-only')&&after('typeof bindSurfaceModel')==='function'){
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
  const occupied=fixture.surfaces.find(s=>s.surfaceId===enemies[0].surf.surfaceId);occupied.solid=false;
  const invalidEnemy={...enemies[0],fake:true};
  assert(enemyValidationErrors(1,[invalidEnemy],fixture,1).includes('enemy_surface_mismatch'));
  SCENE_CACHE.set(key,original);cachedGeometryLevel=0;resetScene(false);
 })()`);
 result.surfaceFixtures='passed';
}
if(!process.argv.includes('--geometry-only')&&after('typeof PART_TEMPLATES')!=='undefined'){
 assert.equal(after('JSON.stringify(validateAllScenes())'),before('JSON.stringify(validateAllScenes())'),'Legacy validator reports changed');
 after(String.raw`(()=>{
  for(let part=1;part<=6;part++){
   const c=PART_TEMPLATES[part],g={templateMode:'target',surfaces:[{kind:'platform',route:true,y:GROUND-c.rise.min,solid:true}],gaps:Array.from({length:c.gaps.count[0]},(_,i)=>[i*700,i*700+c.gaps.width[0]])};
   if(c.dualRoute)for(const role of ['runway','catch','landing'])g.surfaces.push({solid:true,dualRole:role});
   const m={minimumJumps:c.minimumJumps,groundOnlyRoute:!c.forbidGroundOnly,verticalRequired:c.requiredRise>0,topRoutePlatforms:c.topRoutePlatforms};
   const errors=()=>partDesignErrors(1,part,g,m);
   assert.equal(errors().length,0,'Positive part '+part);
   m.minimumJumps--;assert(errors().some(e=>e.startsWith('minimum_jumps:')));m.minimumJumps++;
   if(c.forbidGroundOnly){m.groundOnlyRoute=true;assert(errors().includes('ground_only_route_exists'));m.groundOnlyRoute=false;}
   if(c.requiredRise){m.verticalRequired=false;assert(errors().includes('no_vertical_requirement'));m.verticalRequired=true;}
   if(c.topRoutePlatforms){m.topRoutePlatforms--;assert(errors().some(e=>e==='route_has_no_platform'||e.startsWith('insufficient_top_route:')));m.topRoutePlatforms++;}
   g.surfaces[0].y=GROUND-c.rise.max-1;assert(errors().includes('part_rise_out_of_range'));g.surfaces[0].y=GROUND-c.rise.min;
   g.gaps[0][1]=g.gaps[0][0]+c.gaps.width[1]+1;assert(errors().includes('part_gap_width'));
   g.gaps=[];assert(errors().includes('part_gap_count'));
   if(c.dualRoute)for(const role of ['runway','catch','landing']){
    const surface=g.surfaces.find(s=>s.dualRole===role);surface.solid=false;assert(errors().includes('dual_route_missing_'+role));surface.solid=true;
   }
  }
  // The target low route accepts 80px; legacy retains its vertical requirement.
  const low={templateMode:'target',surfaces:[{kind:'platform',route:true,solid:true,y:GROUND-80}],gaps:[[200,300]]};
  const lowMetrics={minimumJumps:2,groundOnlyRoute:true,verticalRequired:false,topRoutePlatforms:0};
  assert.equal(partDesignErrors(1,1,low,lowMetrics).length,0);
  low.templateMode='legacy';assert(partDesignErrors(1,1,low,lowMetrics).includes('no_vertical_requirement'));
  // Safety still executes in either mode; an absent catch must not become a safe fall.
  const key=17*16+1,original=buildScene(17,1),copy=JSON.parse(JSON.stringify(original));
  const catcher=copy.surfaces.find(s=>s.dualRole==='catch');assert(catcher);catcher.solid=false;
  SCENE_CACHE.set(key,copy);
  for(const mode of ['legacy','target']){copy.templateMode=mode;assert(validateScene(17,1).errors.includes('dual_route_unsafe_fall'));}
  SCENE_CACHE.set(key,original);
 })()`);
 result.partContractFixtures='6/6 positive and negative fixtures passed; legacy reports unchanged; safety active in both modes';
}
if(!process.argv.includes('--geometry-only')&&after('updateRageLayer.toString().includes("buildScene(sc.level,currentPart)")')){
 result.hunter=JSON.parse(after(String.raw`(()=>{
  let tested=0,differentFromPart1=0;const examples=[];
  const originalAnchor=anchorRageSpike;
  for(let l=1;l<=SCENE_COUNT;l++)for(let p=1;p<=PART_COUNT;p++){
   currentLevel=l;currentPart=p;dead=false;won=false;upgradePending=false;resetScene(false);spawnGrace=2;
   const sc=scene(),st=sc.start,dt=.016,g=buildScene(l,p),p1=buildScene(l,1);
   // Pick a location that exposes the old part1 lookup whenever geometry differs.
   let x=900;
   for(let probe=400;probe<=2000;probe+=25){
    const a=originalAnchor(g.surfaces,st,st+probe,30,30),b=originalAnchor(p1.surfaces,st,st+probe,30,30);
    if(JSON.stringify(a)!==JSON.stringify(b)){x=probe;break;}
   }
   const H=rt.rage.hunter;H.state=2;H.x=st+x-920*dt*dt;H.vx=0;H.t=0;rt.rage.patterns=['hunter'];
   collected.add(l*16+p);player.x=H.x+200;player.y=0;
   const expected=originalAnchor(g.surfaces,st,st+x,H.w,H.h),legacy=originalAnchor(p1.surfaces,st,st+x,H.w,H.h);
   let calls=0;anchorRageSpike=(surfaces,...args)=>{assert.equal(surfaces,g.surfaces,'Wrong hunter surfaces '+l+'.'+p);calls++;return originalAnchor(surfaces,...args)};
   updateRageLayer(dt);anchorRageSpike=originalAnchor;
   assert.equal(calls,1);assert(Math.abs(H.x-expected.x)<1e-8);assert.equal(H.y,expected.y);assert.equal(H.enabled,expected.enabled);
   if(JSON.stringify(expected)!==JSON.stringify(legacy)){differentFromPart1++;if(examples.length<4)examples.push(l+'.'+p);}
   assert.equal(JSON.stringify(enemyValidationErrors(l,selectEnemies(l,p),undefined,p)),JSON.stringify(enemyValidationErrors(l,selectEnemies(l,p),g,p)));
   assert.equal(JSON.stringify(coinPos()),JSON.stringify(coinPos(sc,p)));
   tested++;
  }
  assert(differentFromPart1>0,'Hunter regression fixture does not expose old bug');
  return JSON.stringify({tested,differentFromPart1,examples,defaultEnemyGeometry:'186/186 equal to explicit part'});
 })()`));
}
console.log(JSON.stringify(result,null,2));
if(geometryDifferences.length||validatorErrors.length)process.exitCode=1;

}
