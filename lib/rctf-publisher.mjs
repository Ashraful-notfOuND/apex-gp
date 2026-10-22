import {createHash,createHmac} from 'node:crypto';
import {existsSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {VERSION} from '../dist/session.js';
import {originURL} from './ctf-http.mjs';

export function signedScores({scores,challengeId,secret,timestamp=Date.now()}){
 const body=JSON.stringify({scores}),stamp=String(timestamp);
 return {body,headers:{'Content-Type':'application/json','X-RCTF-Timestamp':stamp,'X-RCTF-Signature':'sha256='+createHmac('sha256',secret).update(`${stamp}.${challengeId}.${body}`).digest('hex')}};
}
function save(file,value){const temp=file+'.tmp';writeFileSync(temp,JSON.stringify(value),{mode:0o600});renameSync(temp,file);}

// One serialized publisher owns all teams. Never put this secret in team instances.
export function createScorePublisher({rctfURL,challengeId,secret,dataDir,event,scoreboard,teams,eventStart,eventEnd,now=()=>Date.now(),fetcher=fetch,allowHTTP=false}){
 rctfURL=originURL(rctfURL,{allowHTTP});
 if(!/^[a-zA-Z0-9_-]+$/.test(challengeId)||secret.length<32)throw new Error('Set a valid rCTF challenge ID and a webhook secret of at least 32 characters.');
 const namespace=createHash('sha256').update(JSON.stringify([rctfURL,challengeId,event,VERSION])).digest('hex').slice(0,24),file=join(dataDir,`rctf-publisher-${namespace}.json`);
 let state=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{acknowledged:null,pending:null,finalScores:null},running=null;
 if(state.finalScores&&now()<eventEnd)throw new Error('This event already has a frozen final classification. Do not reopen it by changing the deadline.');
 function scores(){const points=new Map(scoreboard().map(row=>[row.teamId,row.points]));return [...teams.keys()].sort().map(userId=>({userId,points:points.get(userId)||0}));}
 async function deliver(){
  if(now()<eventStart)return {waiting:true};
  // Freeze once, then retry this exact final classification even across restarts.
  if(now()>=eventEnd&&!state.finalScores){state.finalScores=scores();save(file,state);}
  const target=state.finalScores||scores(),targetBody=JSON.stringify({scores:target});
  if(!state.pending&&targetBody!==state.acknowledged){state.pending=signedScores({scores:target,challengeId,secret,timestamp:now()});save(file,state);}
  if(!state.pending)return {unchanged:true,frozen:!!state.finalScores};
  // Outside rCTF's five-minute acceptance window, re-sign the same queued snapshot.
  if(Math.abs(now()-Number(state.pending.headers['X-RCTF-Timestamp']))>240000){state.pending=signedScores({scores:JSON.parse(state.pending.body).scores,challengeId,secret,timestamp:now()});save(file,state);}
  const pending=state.pending;
  const response=await fetcher(`${rctfURL}/api/v2/challs/${encodeURIComponent(challengeId)}/scores`,{method:'POST',...pending,redirect:'error',signal:AbortSignal.timeout(5000)});
  let result;try{result=await response.json();}catch{throw new Error('rCTF score delivery returned invalid JSON.');}
  if(!(response.status===200&&result.kind==='goodDynamicScores')&&!(response.status===409&&result.kind==='badReplayedRequest'))throw new Error(`rCTF rejected score delivery (${response.status}, ${String(result.kind||'unknown')}). Check the dynamic challenge ID and webhook secret.`);
  state.acknowledged=pending.body;state.pending=null;save(file,state);
  return {delivered:true,frozen:!!state.finalScores,result:result.data};
 }
 function tick(){if(running)return running;running=deliver().finally(()=>{running=null;});return running;}
 return {tick,getState:()=>JSON.parse(JSON.stringify(state))};
}
