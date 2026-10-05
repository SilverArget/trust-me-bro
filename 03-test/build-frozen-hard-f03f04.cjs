"use strict";
// Reuse the accepted F01/F02 n-part hardening pipeline without forking its
// geometry, R2/R3, trace-coin, or serialization rules.
const fs=require("fs"),path=require("path"),vm=require("vm");
const pair=path.join(__dirname,"build-frozen-hard-pair.cjs");
let code=fs.readFileSync(pair,"utf8")
  .replaceAll('F01','F03').replaceAll('F02','F04')
  .replaceAll('D07','D09').replaceAll('D13','D15')
  .replaceAll('D08','D10').replaceAll('D14','D16')
  .replace('NIGHT SHIFT','BLACK ICE').replace('COLD STORAGE','ZERO VISIBILITY');
code=code
  .replace('F03: [{id:"D09",side:"left",fraction:.5},{id:"D15",side:"right",fraction:.5}]','F03: [{id:"D09",side:"left",fraction:.106269,cut:814.8},{id:"D10",side:"left",fraction:.488962,cut:4440.48},{id:"D12",side:"left",fraction:.30378,cut:2169.6}]')
  .replace('F04: [{id:"D10",side:"left",fraction:.5},{id:"D16",side:"right",fraction:.5}]','F04: [{id:"D02",side:"left",fraction:.487247,cut:3118.38},{id:"D03",side:"left",fraction:.274475,cut:1959.48},{id:"D01",side:"left",fraction:.289519,cut:2424.72}]')
  .replace('const names = {F03:"BLACK ICE",F04:"ZERO VISIBILITY"};','sourceTransitions.D11 = renameDeep(sourceTransitions.M01, "M01", "D11");\nsourceTransitions.D12 = renameDeep(sourceTransitions.M02, "M02", "D12");\nsourceTransitions.D15 = renameDeep(sourceTransitions.A01, "A01", "D15");\nsourceTransitions.D16 = renameDeep(sourceTransitions.A02, "A02", "D16");\nconst names = {F03:"BLACK ICE",F04:"ZERO VISIBILITY"};');
code=code.replace('if(id==="F04")for(const [move_id,x,y,frames] of [','if(false)for(const [move_id,x,y,frames] of [');
code=code.replace('const names = {F03:"BLACK ICE",F04:"ZERO VISIBILITY"};','sourceTransitions.D17 = JSON.parse(fs.readFileSync(path.join(__dirname,"dock18-generated","transitions-D17.json"),"utf8"));\nsourceTransitions.D01 = JSON.parse(fs.readFileSync("E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/dock-d01d02/transitions-D01.json","utf8"));\nsourceTransitions.D02 = JSON.parse(fs.readFileSync("E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/dock-d01d02/transitions-D02.json","utf8"));\nsourceTransitions.D03 = JSON.parse(fs.readFileSync("E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/dock-d03d04/transitions-D03.json","utf8"));\nsourceTransitions.D05 = JSON.parse(fs.readFileSync("E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/dock-d05d06/transitions-D05.json","utf8"));\nsourceTransitions.D06 = JSON.parse(fs.readFileSync("E:/oyunlar/TrustMeBro/01-tasarim/vector-parkur/dock-d05d06/transitions-D06.json","utf8"));\nsourceTransitions.D13 = renameDeep(sourceTransitions.M03, "M03", "D13");\nconst names = {F03:"BLACK ICE",F04:"ZERO VISIBILITY"};');
const fn=vm.runInThisContext(`(function(require,__dirname,console,structuredClone){${code}\n})`,{filename:pair+":F03F04"});
fn(require,__dirname,console,structuredClone);
