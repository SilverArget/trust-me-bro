// Authorized alpha<=32 cleanup; no raw/reference file changes.
const fs=require('fs'),path=require('path'),sharp=require('sharp'),os=require('os'),crypto=require('crypto'),{execFileSync}=require('child_process');
const cellWidth=Number(process.argv[process.argv.indexOf('--cell-width')+1])||212;if(!Number.isInteger(cellWidth)||cellWidth<106)throw Error('Invalid cell width');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tmb-normalize-')),rows=[],refs={};
async function raw(file){const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {data,width:info.width,height:info.height}}
function bounds(im,x,right){let top=im.height,bottom=-1;for(let xx=x;xx<=right;xx++)for(let y=0;y<im.height;y++)if(im.data[(y*im.width+xx)*4+3]>32){top=Math.min(top,y);bottom=Math.max(bottom,y)}return{x,right,top,bottom}}
function regions(im){const result=[];let start=-1;for(let x=0;x<=im.width;x++){let sum=0;if(x<im.width)for(let y=0;y<im.height;y++)sum+=im.data[(y*im.width+x)*4+3];if(sum&&start<0)start=x;if(!sum&&start>=0){result.push(bounds(im,start,x-1));start=-1}}return result}
function outline(im){let boundary=0,dark=0;const {data:d,width:w,height:h}=im;for(let y=0;y<h;y++)for(let x=0;x<w;x++){let i=(y*w+x)*4;if(d[i+3]<=32)continue;if(x===0||y===0||x===w-1||y===h-1||[-1,1,-w,w].some(k=>d[i+k*4+3]<=32)){boundary++;if(Math.max(d[i],d[i+1],d[i+2])<100)dark++}}return {boundary,dark,darkRatio:dark/Math.max(1,boundary)}}
async function reference(name){if(refs[name])return refs[name];const im=await raw(path.join(root,'sprites',name+'.png')),hist=new Map(),runs={};
for(let y=0;y<im.height;y++){let prev='',len=0;for(let x=0;x<=im.width;x++){const i=(y*im.width+x)*4,key=x<im.width&&im.data[i+3]>127?im.data.subarray(i,i+3).toString('hex'):'';if(key)hist.set(key,(hist.get(key)||0)+1);if(key!==prev||x===im.width){if(prev&&len)runs[len]=(runs[len]||0)+1;prev=key;len=1}else len++}}
const buckets=new Map();for(const [color,count] of hist){const key=[0,2,4].map(k=>Math.floor(parseInt(color.slice(k,k+2),16)/32)).join(',');let b=buckets.get(key);if(!b){b={total:0,best:0,color};buckets.set(key,b)}b.total+=count;if(count>b.best){b.best=count;b.color=color}}
const n=+Object.entries(runs).sort((a,b)=>b[1]-a[1])[0][0],palette=[...buckets.values()].sort((a,b)=>b.total-a.total).slice(0,32).map(x=>x.color);return refs[name]={n,palette,runs,outline:outline(im)}}
function snap(input,output,ref){execFileSync('spritefusion-pixel-snapper',[input,output,'--pixel-size',String(ref.n),'--palette',ref.palette.join(',')],{stdio:'pipe'});}
(async()=>{
for(const file of fs.readdirSync(path.join(root,'sprites/raw')).filter(n=>/^(chief|(?:courier|forklift|picker|guard)-(?:vault|slide|roll|wallrun))\.png$/.test(n)).sort()){
 const row={file};rows.push(row);
 try{
 const input=path.join(root,'sprites/raw',file),im=await raw(input),before=Buffer.from(im.data);row.cleanedPixels=0;
 for(let i=3;i<im.data.length;i+=4)if(im.data[i]>0&&im.data[i]<=32){im.data[i]=0;row.cleanedPixels++}
 let lost=0;for(let i=3;i<im.data.length;i+=4)if(before[i]>32&&!before.subarray(i-3,i+1).equals(im.data.subarray(i-3,i+1)))lost++;
 row.contourPixelsLost=lost;if(lost)throw Error('Protected alpha>32 changed');
 let rr=regions(im);row.initialRegions=rr;
 if(rr.length===3){const largest=rr.reduce((a,b)=>a.right-a.x>b.right-b.x?a:b),others=rr.filter(r=>r!==largest),avg=others.reduce((s,r)=>s+r.right-r.x+1,0)/2;
 if(largest.right-largest.x+1>1.5*avg){let min=Infinity,cut=-1;for(let x=largest.x+1;x<largest.right;x++){let sum=0;for(let y=0;y<im.height;y++)sum+=im.data[(y*im.width+x)*4+3];if(sum<min){min=sum;cut=x}}
 row.split={column:cut,alphaSum:min,widths:[cut-largest.x,largest.right-cut+1],note:'minimum strictly inside region; boundary columns excluded'};rr=rr.flatMap(r=>r===largest?[bounds(im,r.x,cut-1),bounds(im,cut,r.right)]:[r]);}}
 if(rr.length!==4){row.status='STOP-REGION-COUNT';continue}
 row.regions=rr;const name=file.split('-')[0].replace('.png',''),ref=await reference(name==='chief'?'guard':name),target={courier:177,forklift:159,picker:181,guard:177,chief:177}[name],maxH=Math.max(...rr.map(r=>r.bottom-r.top+1)),maxW=Math.max(...rr.map(r=>r.right-r.x+1));
 row.cellWidth=cellWidth;row.unconstrainedWidth=maxW*target/maxH;row.reference=name==='chief'?'guard (provisional chief scale)':name;row.baseScale=target/maxH;row.scale=Math.min(row.baseScale,cellWidth/maxW);row.widthReduction=row.scale/row.baseScale;row.snapN=ref.n;row.outlineBefore=outline(im);
 const clean=path.join(tmp,file);await sharp(im.data,{raw:{width:im.width,height:im.height,channels:4}}).png().toFile(clean);
 const tiles=[];let errorAfter=0,errorBefore=0;
 for(let i=0;i<4;i++){const r=rr[i],w=Math.max(1,Math.floor((r.right-r.x+1)*row.scale)),h=Math.max(1,Math.floor((r.bottom-r.top+1)*row.scale)),crop=path.join(tmp,file+i+'crop.png'),small=path.join(tmp,file+i+'small.png'),post=path.join(tmp,file+i+'post.png'),pre=path.join(tmp,file+i+'pre.png');
 await sharp(clean).extract({left:r.x,top:r.top,width:r.right-r.x+1,height:r.bottom-r.top+1}).png().toFile(crop);
 await sharp(crop).resize(w,h,{kernel:'nearest'}).png().toFile(small);snap(small,post,ref);snap(crop,pre,ref);
 const snapMeta=await sharp(post).metadata();row.snapDimensions??=[];row.snapDimensions.push({w,h,snappedW:snapMeta.width,snappedH:snapMeta.height});const baseline=await raw(small),after={width:w,height:h,data:await sharp(post).resize(w,h,{fit:'fill',kernel:'nearest'}).ensureAlpha().raw().toBuffer()},beforeSnap=await sharp(pre).resize(w,h,{fit:'fill',kernel:'nearest'}).ensureAlpha().raw().toBuffer();
 if(after.width!==w||after.height!==h)throw Error('Snapper changed dimensions');
 for(let k=0;k<baseline.data.length;k++){errorAfter+=Math.abs(baseline.data[k]-after.data[k]);errorBefore+=Math.abs(baseline.data[k]-beforeSnap[k])}
 after.data=beforeSnap;
 for(let k=3;k<after.data.length;k+=4)after.data[k]=baseline.data[k]>32?baseline.data[k]:0;
 const visible=bounds(after,0,w-1);let left=w,right=-1;for(let x=0;x<w;x++)for(let y=0;y<h;y++)if(after.data[(y*w+x)*4+3]>32){left=Math.min(left,x);right=Math.max(right,x)}const tw=right-left+1,th=visible.bottom-visible.top+1;const buf=await sharp(after.data,{raw:{width:w,height:h,channels:4}}).extract({left,top:visible.top,width:tw,height:th}).png().toBuffer();tiles.push({input:buf,left:i*cellWidth+Math.floor((cellWidth-tw)/2),top:192-th});
 }
 row.snapOrder={selected:'snap then resize',rgbaL1After:errorAfter,rgbaL1Before:errorBefore,reason:'N=1 reference grid; before-resize lower RGBA L1 on 16/17 measured sheets; snap output restored to intended geometry; alpha coverage restored'};
 const output=path.join(root,'sprites',file);await sharp({create:{width:cellWidth*4,height:192,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(tiles).png().toFile(output);
 const out=await raw(output);row.outlineAfter=outline(out);row.outputFrames=[];for(let j=0;j<4;j++){const b=bounds(out,j*cellWidth,(j+1)*cellWidth-1);let faint=0;for(let x=j*cellWidth;x<(j+1)*cellWidth;x++)for(let y=0;y<192;y++){const a=out.data[(y*cellWidth*4+x)*4+3];if(a>0&&a<=32)faint++}if(b.bottom!==191||faint)throw Error('Output alpha/feet contract failed');row.outputFrames.push(b)}row.bytes=fs.statSync(output).size;row.sha256=crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex');row.status=row.bytes<=512*1024?'PASS':'FAIL-SIZE';
 }catch(e){row.status='STOP-ERROR';row.error=e.message}
 fs.writeFileSync(path.join(__dirname,'TUR6B3-SHEET-AUDIT.json'),JSON.stringify({refs,rows,tmp},null,2)+'\n');console.log(JSON.stringify(row));
}
fs.writeFileSync(path.join(__dirname,'TUR6B3-SHEET-AUDIT.json'),JSON.stringify({refs,rows,tmp},null,2)+'\n');
console.log('chief: '+(rows.some(r=>r.file==='chief.png')?'present':'bekleniyor'));process.exitCode=rows.some(r=>r.status!=='PASS')?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
