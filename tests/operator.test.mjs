import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApplication,hashToken} from '../server.mjs';
test('organizer tools issue a private token, replay audited inputs and export classification',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'apex-operator-')),previousData=process.env.DATA_DIR;
 async function run(script,args=[]){const previousLog=console.log,previousArgv=process.argv,lines=[];try{process.argv=[process.execPath,script,...args];console.log=(...values)=>lines.push(values.join(' '));await import(new URL('../scripts/'+script,import.meta.url));return lines.join('\n');}finally{console.log=previousLog;process.argv=previousArgv;}}
 try{
  process.env.DATA_DIR=dir;const output=await run('team.mjs',['Operator Team']),token=output.trim().split('\n').at(-1),teams=JSON.parse(readFileSync(join(dir,'teams.json'),'utf8'));
  assert.equal(teams.length,1);assert.equal(teams[0].tokenHash,hashToken(token));assert.ok(!readFileSync(join(dir,'teams.json'),'utf8').includes(token));
  let clock=0;const app=createApplication({dataDir:dir,now:()=>clock});const session=await app.api({method:'POST',path:'/api/session',authorization:'Bearer '+token,body:{car:'mclaren',tyre:'medium'}});clock=1000;
  await app.api({method:'POST',path:`/api/session/${session.id}/finish`,body:{sequence:0,runs:[[1,120]]}});
  const report=JSON.parse(await run('review.mjs',[session.id]));assert.equal(report.ticks,120);assert.equal(report.car,'mclaren');assert.equal(report.inputSha256.length,64);assert.equal(report.best,null);assert.deepEqual(JSON.parse(await run('scores.mjs')),[]);
 }finally{if(previousData===undefined)delete process.env.DATA_DIR;else process.env.DATA_DIR=previousData;rmSync(dir,{recursive:true,force:true});}
});
