const assert=require('node:assert/strict');
const {load,source}=require('./phase3-verify.cjs');

const game=load(source('WORKTREE'));
const read=expr=>JSON.parse(game(`JSON.stringify(${expr})`));

(async()=>{
  const audio=read(`(()=>{
    const fresh={audioAllowed,bgmMuted};
    const old={v:35,currentLevel:12,currentPart:9,deaths:4,jumpLevel:1,speedLevel:0,totalTime:42,won:false,collected:Array(31).fill(0),character:2};
    applySave(migrateV35(old));
    const noMuteField={audioAllowed,bgmMuted};
    old.bgmMuted=true;applySave(migrateV35(old));
    const explicitMute={audioAllowed,bgmMuted};
    return{fresh,noMuteField,explicitMute};
  })()`);
  assert.deepEqual(audio,{fresh:{audioAllowed:true,bgmMuted:false},noMuteField:{audioAllowed:true,bgmMuted:false},explicitMute:{audioAllowed:true,bgmMuted:true}});

  const restart=read(`(()=>{
    characterId=99;characterChosen=false;dead=true;spawnGrace=2;hardRestart();
    let calls=0,path='';const orig=ctx.drawImage;ctx.drawImage=(img,...args)=>{calls++;path=PNG_SPRITES.some(s=>s.image===img)?'png':'fallback'};
    drawCourier();ctx.drawImage=orig;
    return{dead,spawnGrace,characterId,characterChosen,calls,path,player:{x:player.x,y:player.y}};
  })()`);
  assert.equal(restart.dead,false);assert.equal(restart.spawnGrace,0);assert.equal(restart.characterId,99);
  assert.equal(restart.characterChosen,false);assert(restart.calls>0);assert.equal(restart.path,'fallback');

  const geometry=read(`(()=>{
    const support=(box,g)=>box&&box.x>=0&&box.x+box.w<=SCENE_W&&solidSurfaces(g.surfaces).some(s=>box.x+box.w>s.x&&box.x<s.x+s.w&&Math.abs(box.y+box.h-s.y)<=1);
    const bad=[];
    for(let l=1;l<=SCENE_COUNT;l++)for(let p=1;p<=PART_COUNT;p++){
      currentLevel=l;currentPart=p;rt=makeRuntime();const g=buildScene(l,p),st=sceneStart();
      const local=b=>({...b,x:b.x-st});
      for(const [name,b] of [['rear',rt.rage.rear.box],['coin',rt.rage.coin.box],['pop',rt.rage.pop.box],['sweeper',rt.rage.sweep],['exitDrop',{...rt.rage.exit.block,y:rt.rage.exit.block.targetY}],['hunter',rt.rage.hunter],['lastStep',rt.rage.last.box]])
        if(ragePatterns(l,p).includes(name==='sweeper'?'sweeper':name)&&b.enabled&&!support(local(b),g))bad.push(l+'.'+p+':'+name);
      for(const f of selectFans(l,p))if(!support(f,g))bad.push(l+'.'+p+':fan@'+Math.round(f.x)+','+Math.round(f.y));
    }
    return{bad,validatorErrors:validateAllScenes().filter(r=>r.errors.length).length};
  })()`);
  assert.deepEqual(geometry.bad,[]);assert.equal(geometry.validatorErrors,0);

  const progress=read(`(()=>{
    const reports=validateAllScenes(),unreachable=reports.filter(r=>!Number.isFinite(r.toCoin)||!Number.isFinite(r.coinToDock)).map(r=>r.level+'.'+r.part);
    const failed=[];
    for(let l=1;l<=SCENE_COUNT;l++)for(let p=1;p<=PART_COUNT;p++){
      currentLevel=l;currentPart=p;dead=false;won=false;collected.clear();collected.add(l*16+p);resetScene(false);player.x=sceneStart()+SCENE_W;passScene();
      const last=l===SCENE_COUNT&&p===PART_COUNT;
      if(last?!won:(currentLevel!==l+(p===PART_COUNT?1:0)||currentPart!==(p===PART_COUNT?1:p+1)))failed.push(l+'.'+p);
    }
    const old={v:35,currentLevel:12,currentPart:9,deaths:4,jumpLevel:1,speedLevel:0,totalTime:42,won:false,collected:Array.from({length:31},(_,i)=>i===0?511:i===1?257:0),character:2};
    const migrated=migrateV35(old);applySave(migrated);
    return{unreachable,failed,migration:{currentLevel,currentPart,characterId,characterChosen,audioAllowed,bgmMuted,coins,keys:[...collected].sort((a,b)=>a-b),masks:migrated.collected.slice(0,2)}};
  })()`);
  assert.deepEqual(progress.unreachable,[]);assert.deepEqual(progress.failed,[]);
  assert.deepEqual(progress.migration,{currentLevel:12,currentPart:6,characterId:2,characterChosen:true,audioAllowed:true,bgmMuted:true,coins:8,keys:[17,18,19,20,21,22,33,34],masks:[63,3]});

  const idleSpawn=read(`(()=>{
    const run=(label)=>{
      characterSelectOpen=upgradePending=livesPending=won=false;dead=false;lives=10;resetScene(false);
      const localX=player.x-sceneStart(),g=buildScene(currentLevel,currentPart);
      const below=g.surfaces.filter(s=>s.x<localX+player.w&&s.x+s.w>localX).map(s=>({surfaceId:s.surfaceId,kind:s.kind,solid:s.solid!==false,visible:s.visible!==false,x:s.x,y:s.y,w:s.w,hazard:s.hazard||null}));
      let frame=null;for(let i=0;i<180&&!dead;i++){update(1/60);if(dead)frame=i+1}
      return{label,scene:currentLevel+'.'+currentPart,dead,message:dead?deathToast:null,ms:frame===null?null:Math.round(frame*1000/60),y:+player.y.toFixed(3),below};
    };
    const rows=[];
    for(let l=1;l<=SCENE_COUNT;l++)for(let p=1;p<=PART_COUNT;p++){currentLevel=l;currentPart=p;rows.push(run('scan'));}
    hardRestart();rows.push(run('hardRestart'));
    applySave(migrateV35({v:35,currentLevel:12,currentPart:9,deaths:4,jumpLevel:1,speedLevel:0,totalTime:42,won:false,collected:Array(31).fill(0),character:2}));rows.push(run('v35'));
    return{rows,defects:rows.filter(r=>r.dead||!r.below.some(s=>s.solid))};
  })()`);
  assert.deepEqual(idleSpawn.defects,[]);

  const camera=read(`(()=>{
    const frames=(label)=>{const out=[];for(let i=0;i<30;i++){update(1/60);out.push({frame:i+1,screenX:+(player.x-cam).toFixed(3),cam:+cam.toFixed(3),start:sceneStart(),max:sceneStart()+SCENE_W-W,inFrame:player.x-cam>=0&&player.x-cam<=W-player.w});}return{label,scene:currentLevel+'.'+currentPart,first:out[0],last:out[29],allInFrame:out.every(x=>x.inFrame&&x.cam>=x.start&&x.cam<=x.max)}};
    const rows=[];hardRestart();rows.push(frames('hardRestart'));
    dead=false;resetScene(true);rows.push(frames('deathReset'));
    currentLevel=1;currentPart=1;dead=false;collected.add(17);resetScene(false);player.x=sceneStart()+SCENE_W;passScene();rows.push(frames('part1to2'));
    currentLevel=1;currentPart=6;dead=false;collected.add(22);resetScene(false);player.x=sceneStart()+SCENE_W;passScene();rows.push(frames('level1part6to2part1'));
    return rows;
  })()`);
  assert(camera.every(r=>r.allInFrame));

  console.log('PASS audio',JSON.stringify(audio));
  console.log('PASS restart/draw',JSON.stringify(restart));
  console.log('PASS geometry',JSON.stringify(geometry));
  console.log('PASS progress/migration',JSON.stringify(progress));
  console.log('PASS idle-spawn',JSON.stringify({tested:idleSpawn.rows.length,defects:idleSpawn.defects,hardRestart:idleSpawn.rows.at(-2),v35:idleSpawn.rows.at(-1)}));
  console.log('PASS camera',JSON.stringify(camera));
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
