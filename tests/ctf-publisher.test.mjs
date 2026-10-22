import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {scoreEntries} from '../dist/session.js';
import {createScorePublisher,signedScores} from '../lib/rctf-publisher.mjs';
import {challengeDefinition} from '../scripts/rctf-challenge.mjs';
import {ctfConfig} from '../lib/ctf-config.mjs';

test('scores sign the exact timestamp, challenge ID and transmitted bytes',()=>{
 const secret='s'.repeat(32),scores=[{userId:'team-a',points:1000}],request=signedScores({secret,scores,challengeId:'apex-gp',timestamp:123456});
 assert.equal(request.body,'{"scores":[{"userId":"team-a","points":1000}]}');
 assert.equal(request.headers['X-RCTF-Signature'],'sha256='+createHmac('sha256',secret).update('123456.apex-gp.'+request.body).digest('hex'));
 assert.notEqual(request.headers['X-RCTF-Signature'],signedScores({secret,scores,challengeId:'other',timestamp:123456}).headers['X-RCTF-Signature']);
});

test('publisher serializes durable retries, clears zero scores, recalculates ties and freezes the final table',async()=>{
 const dataDir=mkdtempSync(join(tmpdir(),'apex-publisher-'));let now=1000,rows=[{teamId:'a',team:'A',time:80}],calls=[],fail=true;
 const config={rctfURL:'https://ctf.test',challengeId:'apex-gp',secret:'secret'.repeat(8),event:'test',dataDir,eventStart:500,eventEnd:1000000,now:()=>now,teams:new Map([['a',{}],['b',{}],['c',{}]]),scoreboard:()=>scoreEntries(rows),fetcher:async(url,request)=>{calls.push(request);if(fail)throw new Error('Network timeout after delivery.');return new Response(JSON.stringify({kind:'badReplayedRequest'}),{status:409});}};
 try{
  let publisher=createScorePublisher(config);await assert.rejects(publisher.tick(),/timeout/);const original=calls[0];
  rows=[...rows,{teamId:'b',team:'B',time:70}];fail=false;publisher=createScorePublisher(config);await publisher.tick();assert.deepEqual(calls.at(-1),original);
  await publisher.tick();assert.deepEqual(JSON.parse(calls.at(-1).body).scores,[{userId:'a',points:200},{userId:'b',points:1000},{userId:'c',points:0}]);
  const count=calls.length;await publisher.tick();assert.equal(calls.length,count);
  rows.push({teamId:'c',team:'C',time:70});await publisher.tick();assert.deepEqual(JSON.parse(calls.at(-1).body).scores.map(row=>row.points),[200,1000,1000]);
  now=config.eventEnd;await publisher.tick();const frozen=publisher.getState().finalScores;
  rows=[{teamId:'a',team:'A',time:1}];publisher=createScorePublisher(config);await publisher.tick();assert.deepEqual(publisher.getState().finalScores,frozen);assert.deepEqual(JSON.parse(publisher.getState().acknowledged).scores,frozen);
  assert.throws(()=>createScorePublisher({...config,eventEnd:now+10000}),/frozen final classification/);
 }finally{rmSync(dataDir,{recursive:true,force:true});}
});

test('failed requests are re-signed after timestamp expiry and overlapping ticks cannot send out of order',async()=>{
 const dataDir=mkdtempSync(join(tmpdir(),'apex-outbox-'));let now=1000,release,calls=[];
 const config={rctfURL:'https://ctf.test',challengeId:'apex-gp',secret:'secret'.repeat(8),event:'test',dataDir,eventStart:500,eventEnd:1000000,now:()=>now,teams:new Map([['a',{}]]),scoreboard:()=>[{teamId:'a',points:1000}],fetcher:async(url,request)=>{calls.push(request);await new Promise(resolve=>release=resolve);return new Response(JSON.stringify({kind:'goodDynamicScores',data:{inserted:1}}),{status:200});}};
 try{
  const publisher=createScorePublisher(config),first=publisher.tick(),same=publisher.tick();assert.equal(first,same);assert.equal(calls.length,1);release();await first;
  now=0;assert.deepEqual(await publisher.tick(),{waiting:true});
  now=600000;let failed=true;config.fetcher=async(url,request)=>{calls.push(request);if(failed)throw new Error('offline');return new Response(JSON.stringify({kind:'goodDynamicScores'}),{status:200});};
  config.scoreboard=()=>[{teamId:'a',points:200}];let restarted=createScorePublisher(config);await assert.rejects(restarted.tick(),/offline/);const stale=calls.at(-1);
  now+=250000;failed=false;restarted=createScorePublisher(config);await restarted.tick();assert.equal(calls.at(-1).body,stale.body);assert.notEqual(calls.at(-1).headers['X-RCTF-Signature'],stale.headers['X-RCTF-Signature']);
 }finally{rmSync(dataDir,{recursive:true,force:true});}
});

test('challenge definition exposes only the gateway and selects real per-team dynamic scoring',()=>{
 const config={secret:'score-secret',gatewayKey:'gateway-secret',publicURL:'https://timing.test',challengeId:'apex-gp',instancePrefix:'apex-gp-'},definition=challengeDefinition(config,{image:'ghcr.io/organizer/apex-gp:v1'}),challenge=definition.data;
 assert.equal(challenge.hidden,true);assert.deepEqual(challenge.flags,[]);assert.equal(challenge.scoring.kind,'dynamic');assert.equal(challenge.instancerConfig.expose[0].containerPort,8080);
 const service=challenge.instancerConfig.config.services.game;assert.equal(service.environment.RCTF_EXPOSED_HOSTNAMES,'${RCTF_EXPOSED_HOSTNAMES}');assert.ok(!JSON.stringify(service).includes('score-secret'));assert.ok(service.read_only);assert.equal(challenge.instancerConfig.expose[0].hostPrefix,'apex-gp');
 assert.throws(()=>ctfConfig({}),/RCTF_URL/);
});
