const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const evidenceDir = path.resolve(process.argv[2] || path.join(root, "03-test", "manager-preview", "video-1008-tur5"));
const webRoot = path.join(evidenceDir, "playgama-extracted");
const mime = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json",".png":"image/png",".mp3":"audio/mpeg",".mp4":"video/mp4",".webmanifest":"application/manifest+json"};
const server = http.createServer((req,res)=>{
  if(req.url.startsWith("/parent")){
    const src=`http://localhost:${server.address().port}/index.html#debug`;
    res.writeHead(200,{"content-type":"text/html; charset=utf-8"});
    res.end(`<!doctype html><iframe id="game" referrerpolicy="no-referrer" src="${src}"></iframe>`);
    return;
  }
  const clean=decodeURIComponent(req.url.split("?")[0].split("#")[0]),rel=clean==="/"?"index.html":clean.slice(1);
  const file=path.resolve(webRoot,rel);
  if(!file.startsWith(path.resolve(webRoot)+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end("not found");return}
  res.writeHead(200,{"content-type":mime[path.extname(file)]||"application/octet-stream"});
  fs.createReadStream(file).pipe(res);
});

(async()=>{
  await new Promise(resolve=>server.listen(0,"0.0.0.0",resolve));
  const port=server.address().port,browser=await chromium.launch();
  const result={servedFromExtractedZip:webRoot,port};
  const diagnostics=[];
  const watch=page=>{
    page.on("console",message=>diagnostics.push({type:"console",level:message.type(),text:message.text()}));
    page.on("pageerror",error=>diagnostics.push({type:"pageerror",text:String(error)}));
    page.on("requestfailed",request=>diagnostics.push({type:"requestfailed",url:request.url(),error:request.failure()?.errorText||null}));
  };
  const snapshot=page=>page.evaluate(()=>({
    readyState:document.readyState,
    hasBridge:!!window.bridge,
    bridgeVersion:window.bridge?.version||null,
    platform:window.__tmb?.platform||null
  }));
  try{
    const direct=await browser.newPage();
    watch(direct);
    await direct.goto(`http://localhost:${port}/index.html#debug`);
    try{await direct.waitForFunction(()=>window.__tmb?.platform?.initialized===true,null,{timeout:60000})}
    catch(error){result.directFailure={error:String(error),state:await snapshot(direct),diagnostics};throw error}
    result.direct=await direct.evaluate(()=>({host:location.host,platform:window.__tmb.platform,bridgeVersion:window.bridge?.version||null}));

    const empty=await browser.newPage();
    watch(empty);
    await empty.setContent(`<!doctype html><iframe id="game" referrerpolicy="no-referrer" src="http://localhost:${port}/index.html#debug"></iframe>`);
    const frame=empty.frames().find(f=>f.url().includes("/index.html"));
    await frame.waitForFunction(()=>window.__tmb?.platform?.initialized===true);
    result.emptyAncestor=await frame.evaluate(()=>({referrer:document.referrer,ancestors:Array.from(location.ancestorOrigins||[]),platform:window.__tmb.platform,bridgeVersion:window.bridge?.version||null}));

    const hostile=await browser.newPage();
    watch(hostile);
    await hostile.goto(`http://bad.localhost:${port}/parent`);
    const hostileFrame=hostile.frames().find(f=>f.url().includes("/index.html"));
    await hostileFrame.waitForFunction(()=>window.__tmb?.platform?.initialized===true);
    result.foreignAncestor=await hostileFrame.evaluate(()=>({
      referrer:document.referrer,
      ancestors:Array.from(location.ancestorOrigins||[]),
      platform:window.__tmb.platform,
      bridgeVersion:window.bridge?.version||null,
      gameVisible:!!document.querySelector("#game")?.getBoundingClientRect().width
    }));
  } catch(error) {
    result.pass=false;
    result.error=String(error);
    result.diagnostics=diagnostics;
    fs.writeFileSync(path.join(evidenceDir,"playgama-bridge-init.json"),JSON.stringify(result,null,2)+"\n","utf8");
    throw error;
  } finally {
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
  const ok=result.direct.platform.bridge&&result.direct.platform.initialized&&result.emptyAncestor.platform.bridge&&result.emptyAncestor.platform.initialized&&result.foreignAncestor.platform.bridge&&result.foreignAncestor.platform.initialized&&result.foreignAncestor.gameVisible;
  result.pass=!!ok;
  fs.writeFileSync(path.join(evidenceDir,"playgama-bridge-init.json"),JSON.stringify(result,null,2)+"\n","utf8");
  console.log(JSON.stringify(result,null,2));
  if(!ok)process.exitCode=1;
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
