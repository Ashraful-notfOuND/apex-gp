import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {call,fixture,teamA,teamB} from './ctf-fixture.mjs';
import {instanceConfig} from '../ctf-instance.mjs';

test('rCTF sign-in verifies ownership, sets an instance cookie and serves the CTF game',async()=>{
 const f=fixture();try{
  const cookie=await f.login(),page=await f.game(f.originA,'/');assert.equal(page.status,200);assert.match(page.text(),/apex-hosting" content="ctf/);
  assert.match(cookie,/^__Host-apex-session=/);const info=await f.game(f.originA,'/api/driver',{cookie});assert.equal(info.status,200);assert.equal(info.json().teamId,teamA.id);assert.equal(info.json().remainingRounds,1);
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

test('one race per instance survives reload, renewed login, concurrent starts and coordinator restart',async()=>{
 const f=fixture();try{
  let cookie=await f.login();
  const starts=await Promise.all(Array.from({length:6},()=>f.game(f.originA,'/api/session',{method:'POST',cookie,body:{car:'ferrari',tyre:'soft'}})));
  assert.equal(starts.filter(row=>row.status===200).length,1);
  const start=starts.find(row=>row.status===200).json();
  const b=await f.login(f.originB,'b');
  assert.equal((await f.game(f.originB,`/api/session/${start.id}/finish`,{method:'POST',cookie:b,body:{sequence:0,runs:[]}})).status,403);
  f.restart();cookie=await f.login();
  assert.equal((await f.game(f.originA,'/api/driver',{cookie})).json().remainingRounds,0);
  assert.equal((await f.game(f.originA,'/api/session',{method:'POST',cookie,body:{car:'williams',tyre:'hard'}})).status,403);
  f.tick(3000);await f.coordinator.lifecycle.tick();assert.deepEqual(f.stops,[{teamId:teamA.id,origin:f.originA}]);
  for(let attempt=0;attempt<4;attempt++){
   const origin=`https://apex-gp-fresh-${attempt}.instances.test`;f.origins.set(teamA.id,origin);cookie=await f.login(origin);
   assert.equal((await f.game(origin,'/api/driver',{cookie})).json().remainingRounds,1);
   const race=await f.game(origin,'/api/session',{method:'POST',cookie,body:{car:'ferrari',tyre:'soft'}});assert.equal(race.status,200);
   const finished=await f.game(origin,`/api/session/${race.json().id}/finish`,{method:'POST',cookie,body:{sequence:0,runs:[],best:.001}});assert.equal(finished.status,200);assert.equal(finished.json().best,null);
   assert.equal((await f.game(origin,'/api/session',{method:'POST',cookie,body:{car:'ferrari',tyre:'soft'}})).status,403);
   f.tick(3000);await f.coordinator.lifecycle.tick();
  }
  assert.equal(f.stops.length,5);assert.equal(f.coordinator.app.scoreboard().find(e=>e.teamId===teamA.id).time,null);
  for(const file of readdirSync(f.dir))if(file.endsWith('.json')||file.endsWith('.jsonl'))assert.doesNotMatch(readFileSync(join(f.dir,file),'utf8'),/player-token-|Bearer /);
 }finally{f.cleanup();}
});

test('instance startup registers an infinite-time scoreboard entry before sign-in',async()=>{
 const f=fixture();try{
  await f.register(f.originA);await f.register(f.originB);
  const board=await call(f.coordinator.handler,'/api/leaderboard');assert.equal(board.status,200);
  assert.deepEqual(board.json().entries.map(e=>[e.team,e.time,e.points,e.rank]),[['Team A',null,0,null],['Team B',null,0,null]]);
  const page=await call(f.coordinator.handler,'/leaderboard');assert.equal(page.status,200);assert.match(page.text(),/The time to beat/);
  assert.equal((await call(f.coordinator.handler,'/leaderboard.js')).status,200);
  assert.equal((await call(f.coordinator.handler,'/internal/instances/register',{method:'POST',body:{teamId:teamA.id}})).status,403);
  assert.equal((await f.game(f.originA,'/internal/instances/register',{method:'POST',body:{teamId:teamB.id}})).status,405);
  await f.coordinator.publisher.tick();assert.deepEqual(JSON.parse(f.deliveries.at(-1).body).scores.map(e=>e.points),[0,0]);
 }finally{f.cleanup();}
});

test('shutdown retries survive restart and never intentionally delete a newer instance',async()=>{
 const f=fixture();try{
  const cookie=await f.login();const start=await f.game(f.originA,'/api/session',{method:'POST',cookie,body:{car:'ferrari',tyre:'soft'}});
  await f.game(f.originA,`/api/session/${start.json().id}/finish`,{method:'POST',cookie,body:{sequence:0,runs:[]}});
  f.failStops(1);f.tick(3000);await f.coordinator.lifecycle.tick();assert.equal(f.stops.length,0);
  f.restart();f.tick(3000);await f.coordinator.lifecycle.tick();assert.equal(f.stops.length,1);
  const fresh='https://apex-gp-next.instances.test';f.origins.set(teamA.id,fresh);const nextCookie=await f.login(fresh);
  const next=await f.game(fresh,'/api/session',{method:'POST',cookie:nextCookie,body:{car:'ferrari',tyre:'soft'}});
  await f.game(fresh,`/api/session/${next.json().id}/finish`,{method:'POST',cookie:nextCookie,body:{sequence:0,runs:[]}});
  const replacement='https://apex-gp-replacement.instances.test';f.origins.set(teamA.id,replacement);
  f.tick(3000);await f.coordinator.lifecycle.tick();assert.equal(f.stops.length,1);assert.equal(f.coordinator.lifecycle.info(fresh).instanceStatus,'superseded');
 }finally{f.cleanup();}
});

test('a delayed startup registration cannot revoke the current authenticated race',async()=>{
 const f=fixture();try{
  const cookie=await f.login();const start=await f.game(f.originA,'/api/session',{method:'POST',cookie,body:{car:'ferrari',tyre:'soft'}});
  await f.coordinator.lifecycle.register({origin:'https://apex-gp-delayed.instances.test',teamId:teamA.id,name:teamA.name});
  assert.equal(f.coordinator.lifecycle.info(f.originA).instanceStatus,'racing');f.tick(1000);
  const result=await f.game(f.originA,`/api/session/${start.json().id}/input`,{method:'POST',cookie,body:{sequence:0,runs:[[0,120]]}});assert.equal(result.status,200);
 }finally{f.cleanup();}
});

test('a crash between claiming an instance and recording its race still recovers a shutdown',async()=>{
 const f=fixture();try{
  await f.login();f.coordinator.lifecycle.claim(f.originA,teamA.id);f.restart();
  assert.equal(f.coordinator.lifecycle.info(f.originA).instanceUsed,true);assert.equal(f.coordinator.lifecycle.info(f.originA).instanceStatus,'closing');
  f.tick(3000);await f.coordinator.lifecycle.tick();assert.equal(f.stops.length,1);
 }finally{f.cleanup();}
});

test('an asynchronous shutdown is polled until rCTF confirms it is stopped',async()=>{
 const f=fixture();try{
  const cookie=await f.login();const start=await f.game(f.originA,'/api/session',{method:'POST',cookie,body:{car:'ferrari',tyre:'soft'}});
  await f.game(f.originA,`/api/session/${start.json().id}/finish`,{method:'POST',cookie,body:{sequence:0,runs:[]}});f.stopAsynchronously();
  f.tick(3000);const first=f.coordinator.lifecycle.tick(),same=f.coordinator.lifecycle.tick();assert.equal(first,same);await first;
  assert.equal(f.coordinator.lifecycle.info(f.originA).instanceStatus,'closing');assert.equal(f.stops.length,1);
  f.tick(3000);await f.coordinator.lifecycle.tick();assert.equal(f.coordinator.lifecycle.info(f.originA).instanceStatus,'stopped');assert.equal(f.stops.length,1);
 }finally{f.cleanup();}
});

test('the background sweep ends and closes an abandoned race without another browser request',async()=>{
 const f=fixture();try{
  const cookie=await f.login();await f.game(f.originA,'/api/session',{method:'POST',cookie,body:{car:'ferrari',tyre:'soft'}});
  f.tick(13000);await f.coordinator.tick();assert.equal(f.coordinator.lifecycle.info(f.originA).instanceStatus,'closing');
  f.tick(3000);await f.coordinator.tick();assert.equal(f.stops.length,1);
 }finally{f.cleanup();}
});

test('event window rejects early and late rounds and late input cannot create a result',async()=>{
 const f=fixture();try{
  const cookie=await f.login(),body={car:'ferrari',tyre:'soft'};f.setClock(f.config.eventStart-1);
  assert.equal((await f.game(f.originA,'/api/session',{method:'POST',cookie,body})).status,403);
  f.setClock(f.config.eventStart);const start=await f.game(f.originA,'/api/session',{method:'POST',cookie,body});assert.equal(start.status,200);
  f.setClock(f.config.eventEnd);const late=await f.game(f.originA,`/api/session/${start.json().id}/finish`,{method:'POST',cookie,body:{sequence:0,runs:[],best:0.001}});assert.equal(late.status,410);
  assert.equal((await f.game(f.originA,'/api/session',{method:'POST',cookie,body})).status,403);assert.equal(f.coordinator.app.scoreboard()[0].time,null);
 }finally{f.cleanup();}
});

test('actual control replay retains each team best across instances and publishes global points',async()=>{
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
  const original=await race(f.originA,a,{slow:true});f.tick(3000);await f.coordinator.lifecycle.tick();
  const fresh='https://apex-gp-second.instances.test';f.origins.set(teamA.id,fresh);const a2=await f.login(fresh);
  const fastest=await race(fresh,a2);assert.ok(fastest<original);assert.equal(f.coordinator.app.scoreboard().find(e=>e.teamId===teamA.id).time,fastest);
  f.tick(3000);await f.coordinator.lifecycle.tick();const third='https://apex-gp-third.instances.test';f.origins.set(teamA.id,third);const a3=await f.login(third);
  const slower=await race(third,a3,{slow:true});assert.ok(slower>fastest);
  await race(f.originB,b,{slow:true,tyre:'hard'});
  f.tick(3000);await f.coordinator.lifecycle.tick();const crashOrigin='https://apex-gp-crash.instances.test';f.origins.set(teamA.id,crashOrigin);const crashCookie=await f.login(crashOrigin);
  const crash=await f.game(crashOrigin,'/api/session',{method:'POST',cookie:crashCookie,body:{car:'ferrari',tyre:'soft'}}),nearest=track.nearest.bind(track);
  track.nearest=(...args)=>({...nearest(...args),offset:20,rx:0,rz:1});f.tick(1000);
  const invalid=await f.game(crashOrigin,`/api/session/${crash.json().id}/input`,{method:'POST',cookie:crashCookie,body:{sequence:0,runs:[[1,120]]}});assert.equal(invalid.json().valid,false);assert.equal(invalid.json().best,null);track.nearest=nearest;
  const board=f.coordinator.app.scoreboard();assert.equal(board.length,2);assert.equal(board.find(e=>e.teamId===teamA.id).time,fastest);assert.deepEqual(board.map(e=>e.points),[1000,200]);
  await f.coordinator.publisher.tick();assert.deepEqual(JSON.parse(f.deliveries.at(-1).body).scores,board.map(e=>({userId:e.teamId,points:e.points})).sort((a,b)=>a.userId.localeCompare(b.userId)));
  f.restart();assert.deepEqual(f.coordinator.app.scoreboard(),board);
 }finally{f.cleanup();}
});

test('a server-replayed crash immediately invalidates the attempt and queues instance termination',async()=>{
 const f=fixture();try{
  const cookie=await f.login(),track=f.coordinator.app.track,nearest=track.nearest.bind(track);
  const initial=track.at(-120);track.nearest=(...args)=>({...nearest(...args),offset:20,rx:Math.sin(initial.heading),rz:Math.cos(initial.heading)});
  const start=await f.game(f.originA,'/api/session',{method:'POST',cookie,body:{car:'ferrari',tyre:'soft'}});assert.equal(start.status,200);
  f.tick(1000);const result=await f.game(f.originA,`/api/session/${start.json().id}/input`,{method:'POST',cookie,body:{sequence:0,runs:[[1,120]],best:.001}});
  assert.equal(result.status,200);assert.equal(result.json().finished,true);assert.equal(result.json().valid,false);assert.equal(result.json().invalidReason,'Crash');assert.equal(result.json().best,null);assert.equal(result.json().remainingRounds,0);
  assert.equal(f.coordinator.app.scoreboard()[0].time,null);assert.equal(f.coordinator.lifecycle.info(f.originA).instanceStatus,'closing');
  f.tick(3000);await f.coordinator.lifecycle.tick();assert.equal(f.stops.length,1);
 }finally{f.cleanup();}
});

test('instance configuration reads the real rCTF hostname injection',()=>{
 const config=instanceConfig({RCTF_EXPOSED_HOSTNAMES:JSON.stringify([{kind:'https',host:'apex-gp-abc.instances.test',port:443,containerName:'game',containerPort:8080}]),RCTF_INSTANCE_NAMESPACE:'inst-apex-gp-'+teamA.id,COORDINATOR_URL:'https://timing.test',COORDINATOR_PUBLIC_URL:'https://timing.test',APEX_GATEWAY_KEY:'x'.repeat(32)});
 assert.equal(config.publicOrigin,'https://apex-gp-abc.instances.test');assert.equal(config.teamId,teamA.id);assert.throws(()=>instanceConfig({}),/URL/);
});
