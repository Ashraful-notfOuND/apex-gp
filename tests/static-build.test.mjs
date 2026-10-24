import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {buildStaticSite} from '../scripts/build-static.mjs';
test('static publication contains the complete game and no private server records',()=>{
 const dir=mkdtempSync(join(tmpdir(),'apex-static-'));try{
  const {directory,files}=buildStaticSite(join(dir,'site')),html=readFileSync(join(directory,'index.html'),'utf8');assert.ok(files>=40);
  assert.match(html,/<meta name="apex-hosting" content="static">/);assert.match(html,/id="showTiming" hidden/);assert.match(html,/id="rankedMode" hidden disabled/);
  for(const name of ['server.mjs','package.json','data/teams.json','data/audit.jsonl','render-ranked.yaml'])assert.equal(existsSync(join(directory,name)),false,name+' leaked into publication');
  for(const file of readdirSync(directory,{recursive:true})){if(!file.endsWith('.js'))continue;const source=readFileSync(join(directory,file),'utf8');for(const match of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){const dependency=resolve(directory,file,'..',match[1]);assert.ok(dependency.startsWith(directory+sep));assert.ok(existsSync(dependency),file+' has a missing import: '+match[1]);}}
  for(const name of ['livery-ferrari.svg','livery-redbull.svg','livery-cadillac.svg','tyre-soft.svg','tyre-medium.svg','tyre-hard.svg','circuit-signs.svg','monaco-facades.webp','garage-mark.svg'])assert.ok(existsSync(join(directory,'assets',name)),'Missing graphic '+name);
  assert.match(readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'),/<meta name="apex-hosting" content="server">/);
  assert.doesNotMatch(readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'),/id="rankedMode" hidden/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
