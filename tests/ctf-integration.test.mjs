import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {call,fixture,teamA,teamB} from './ctf-fixture.mjs';
import {instanceConfig} from '../ctf-instance.mjs';

test('rCTF sign-in verifies ownership, sets an instance cookie and serves the CTF game',async()=>{
 const f=fixture();try{
  const cookie=await f.login(),page=await f.game(f.originA,'/');assert.equal(page.status,200);assert.match(page.text(),/apex-hosting" content="ctf/);
  assert.match(cookie,/^__Host-apex-session=/);const info=await f.game(f.originA,'/api/driver',{cookie});assert.equal(info.status,200);assert.equal(info.json().teamId,teamA.id);assert.equal(info.json().remainingRounds,3);
  assert.equal((await f.game(f.originB,'/api/driver',{cookie})).status,401);
  for(const path of ['/server.mjs','/lib/ctf-auth.mjs','/data/ctf-teams.jsonl','/.env'])assert.equal((await f.game(f.originA,path)).status,404);
  assert.equal((await call(f.coordinator.handler,'/api/driver',{headers:{Cookie:cookie,'X-Apex-Instance-Origin':f.originA}})).status,403);
  const history=readFileSync(join(f.dir,'ctf-teams.jsonl'),'utf8');assert.doesNotMatch(history,/accessToken|Bearer|client-secret/);
  const logout=await f.game(f.originA,'/auth/logout',{method:'POST',cookie,body:{}});assert.equal(logout.status,200);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
 }finally{f.cleanup();}
});

test('state forgery, other-team instances, banned teams and open redirects fail closed',async()=>{
 const f=fixture();try{
  for(const origin of ['https://evil.test','https://apex-gp-a.instances.test.evil.test','https://evil.instances.test','https://apex-gp-a.instances.test:444','http://apex-gp-a.instances.test'])assert.equal((await call(f.coordinator.handler,'/auth/start?'+new URLSearchParams({return:origin}))).status,400,origin);
  assert.equal((await call(f.coordinator.handler,'/auth/rctf/callback?code=a&state=forged')).status,400);
  const start=await call(f.coordinator.handler,'/auth/start?'+new URLSearchParams({return:f.originB})),state=new URL(start.headers.get('location')).searchParams.get('state');
  const wrongOwner=await call(f.coordinator.handler,`/auth/rctf/callback?code=a&state=${state}`,{headers:{Cookie:start.headers.get('set-cookie').split(';')[0]}});assert.equal(wrongOwner.status,403);assert.match(wrongOwner.json().error,/own rCTF team/);
  teamB.banned=true;await assert.rejects(f.login(f.originB,'b'),/authorize/);teamB.banned=false;
 }finally{teamB.banned=false;f.cleanup();}
});

test('sign-in tickets are one-use, expire and cannot mint a cookie on a different instance',async()=>{
 const f=fixture();try{
  async function ticket(){
   const start=await call(f.coordinator.handler,'/auth/start?'+new URLSearchParams({return:f.originA})),state=new URL(start.headers.get('location')).searchParams.get('state');
   const result=await call(f.coordinator.handler,`/auth/rctf/callback?code=a&state=${state}`,{headers:{Cookie:start.headers.get('set-cookie').split(';')[0]}});assert.equal(result.status,303);
   const target=new URL(result.headers.get('location'));return target.pathname+target.search;
  }
  const path=await ticket();assert.equal((await f.game(f.originB,path)).status,401);
  const accepted=await f.game(f.originA,path);assert.equal(accepted.status,303);assert.match(accepted.headers.get('set-cookie'),/HttpOnly; SameSite=Lax; Max-Age=\d+; Secure/);
  assert.equal((await f.game(f.originA,path)).status,401);
  const cookie=accepted.headers.get('set-cookie').split(';')[0];assert.equal((await f.game(f.originA,'/api/driver',{cookie:cookie+'forged'})).status,401);
  const expired=await ticket();f.tick(61000);assert.equal((await f.game(f.originA,expired)).status,401);
 }finally{f.cleanup();}
});

test('three rounds remain consumed after coordinator restart, renewed login and instance recreation',async()=>{
 const f=fixture();try{
  let cookie=await f.login();
  for(let round=1;round<=3;round++){
   const start=await f.game(f.originA,'/api/session',{method:'POST',cookie,body:{car:'ferrari',tyre:'soft',teamId:teamB.id,best:0.001}});assert.equal(start.status,200);assert.equal(start.json().round,round);
   const ended=await f.game(f.originA,`/api/session/${start.json().id}/finish`,{method:'POST',cookie,body:{sequence:0,runs:[],best:0.001}});assert.equal(ended.status,200);assert.equal(ended.json().best,null);
  }
  f.restart();const recreated='https://apex-gp-recreated.instances.test';f.origins.set(teamA.id,recreated);cookie=await f.login(recreated);
  const info=await f.game(recreated,'/api/driver',{cookie});assert.equal(info.json().remainingRounds,0);assert.equal(info.json().rounds.length,3);
  const fourth=await f.game(recreated,'/api/session',{method:'POST',cookie,body:{car:'williams',tyre:'hard'}});assert.equal(fourth.status,403);assert.match(fourth.json().error,/three qualifying rounds/);
  const records=readFileSync(join(f.dir,'rounds.jsonl'),'utf8');assert.ok(records.includes(teamA.id));assert.ok(!records.includes(teamB.id));
 }finally{f.cleanup();}
});

test('concurrent starts cannot exceed three rounds and each input belongs to its signed-in team',async()=>{
 const f=fixture();try{
  const a=await f.login(),b=await f.login(f.originB,'b');
  const start=await f.game(f.originA,'/api/session',{method:'POST',cookie:a,body:{car:'ferrari',tyre:'soft'}}),path=`/api/session/${start.json().id}/finish`;
  assert.equal((await f.game(f.originB,path,{method:'POST',cookie:b,body:{sequence:0,runs:[]}})).status,403);
  assert.equal((await f.game(f.originA,path,{method:'POST',cookie:a,body:{sequence:0,runs:[]},headers:{Origin:'https://evil.test'}})).status,403);
  assert.equal((await f.game(f.originA,path,{method:'POST',cookie:a,body:{sequence:0,runs:[]}})).status,200);
  const starts=await Promise.all(Array.from({length:5},()=>f.game(f.originA,'/api/session',{method:'POST',cookie:a,body:{car:'ferrari',tyre:'soft'}})));
  assert.equal(starts.filter(row=>row.status===200).length,2);assert.equal((await f.game(f.originA,'/api/driver',{cookie:a})).json().remainingRounds,0);
 }finally{f.cleanup();}
});

test('event window rejects early and late rounds and late input cannot create a result',async()=>{
 const f=fixture();try{
  const cookie=await f.login(),body={car:'ferrari',tyre:'soft'};f.setClock(f.config.eventStart-1);
  assert.equal((await f.game(f.originA,'/api/session',{method:'POST',cookie,body})).status,403);
  f.setClock(f.config.eventStart);const start=await f.game(f.originA,'/api/session',{method:'POST',cookie,body});assert.equal(start.status,200);
  f.setClock(f.config.eventEnd);const late=await f.game(f.originA,`/api/session/${start.json().id}/finish`,{method:'POST',cookie,body:{sequence:0,runs:[],best:0.001}});assert.equal(late.status,410);
  assert.equal((await f.game(f.originA,'/api/session',{method:'POST',cookie,body})).status,403);assert.deepEqual(f.coordinator.app.scoreboard(),[]);
 }finally{f.cleanup();}
});

test('actual control replay saves valid laps, retains best-of-three and publishes global points',async()=>{
 const f=fixture();try{
  const a=await f.login(),b=await f.login(f.originB,'b');
  // An unrolled straight test track exercises the real car, gates, replay and HTTP
  // pipeline without requiring a recorded human lap around the production circuit.
  const track=f.coordinator.app.track,length=track.length;
  track.at=s=>({x:0,y:0,z:s,heading:0,tx:0,tz:1,rx:1,rz:0,s:((s%length)+length)%length,curvature:0});
  track.nearest=(x,z)=>({...track.at(z),offset:x,index:0});
  async function race(origin,cookie,{slow=false,tyre='soft'}={}){
   const started=await f.game(origin,'/api/session',{method:'POST',cookie,body:{car:'ferrari',tyre}});assert.equal(started.status,200);
   const id=started.json().id;let result;
   for(let sequence=0;sequence<500;sequence++){
    f.tick(1000);const mask=slow&&sequence%5===0?2:1;
    const response=await f.game(origin,`/api/session/${id}/input`,{method:'POST',cookie,body:{sequence,runs:[[mask,120]],time:0.001,best:0.001,position:{progress:999999}}});assert.equal(response.status,200,response.text());result=response.json();if(result.finished)break;
   }
   assert.equal(result.finished,true);assert.equal(result.laps[0].valid,true);assert.ok(result.best>10);return result.best;
  }
  const fastest=await race(f.originA,a),slower=await race(f.originA,a,{slow:true});assert.ok(slower>fastest);
  await race(f.originB,b,{slow:true,tyre:'hard'});
  const board=f.coordinator.app.scoreboard();assert.equal(board.length,2);assert.equal(board.find(e=>e.teamId===teamA.id).time,fastest);assert.deepEqual(board.map(e=>e.points),[1000,200]);
  await f.coordinator.publisher.tick();assert.deepEqual(JSON.parse(f.deliveries.at(-1).body).scores,board.map(e=>({userId:e.teamId,points:e.points})).sort((a,b)=>a.userId.localeCompare(b.userId)));
  f.restart();assert.deepEqual(f.coordinator.app.scoreboard(),board);
 }finally{f.cleanup();}
});

test('instance configuration reads the real rCTF hostname injection',()=>{
 const config=instanceConfig({RCTF_EXPOSED_HOSTNAMES:JSON.stringify([{kind:'https',host:'apex-gp-abc.instances.test',port:443,containerName:'game',containerPort:8080}]),COORDINATOR_URL:'https://timing.test',COORDINATOR_PUBLIC_URL:'https://timing.test',APEX_GATEWAY_KEY:'x'.repeat(32)});
 assert.equal(config.publicOrigin,'https://apex-gp-abc.instances.test');assert.throws(()=>instanceConfig({}),/URL/);
});
