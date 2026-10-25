import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join} from 'node:path';
import {VERSION} from '../dist/session.js';
import {fail,fetchJSON} from './ctf-http.mjs';

const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export function createInstanceLifecycle({rctfURL,challengeId,event,cookieSecret,dataDir,allowedOrigin,rememberTeam,now=Date.now,fetcher=fetch}){
 const scope=JSON.stringify([rctfURL,challengeId,event,VERSION]),namespace=createHash('sha256').update(scope).digest('hex').slice(0,24);
 const file=join(dataDir,`ctf-instances-${namespace}.json`),rows=new Map(existsSync(file)?JSON.parse(readFileSync(file,'utf8')):[]);
 const key=createHash('sha256').update('apex-instance-credentials\0'+cookieSecret+'\0'+scope).digest();
 const save=()=>{writeFileSync(file+'.tmp',JSON.stringify([...rows]),{mode:0o600});renameSync(file+'.tmp',file);};
 function seal(token){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(scope));const bytes=Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),bytes]).toString('base64');}
 function unseal(value){const bytes=Buffer.from(value,'base64'),cipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));cipher.setAAD(Buffer.from(scope));cipher.setAuthTag(bytes.subarray(12,28));return Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]).toString('utf8');}
 function supersede(teamId,origin){for(const row of rows.values())if(row.teamId===teamId&&row.origin!==origin&&!['stopped','superseded','expired'].includes(row.status)){row.status='superseded';row.credential=null;}}
 async function register({origin,teamId,name}){
  origin=allowedOrigin(origin);if(teamId&&!uuid.test(teamId))throw fail(400,'Invalid team ID.');
  const previous=rows.get(origin);if(previous?.teamId&&teamId&&previous.teamId!==teamId)throw fail(403,'This instance belongs to another team.');
  if(teamId){
   if(!name){const profile=await fetchJSON(fetcher,`${rctfURL}/api/v2/users/${encodeURIComponent(teamId)}`);if(!profile.res.ok||typeof profile.data.data?.name!=='string')throw fail(503,'Unable to register the instance team.');name=profile.data.data.name;}
   if(!name.trim()||name.length>256)throw fail(400,'Invalid team name.');rememberTeam({id:teamId,name});
  }
  // Re-check after the profile request; concurrent startup requests must never
  // replace a consumed record with a fresh allowance.
  const existing=rows.get(origin);
  if(existing?.teamId&&teamId&&existing.teamId!==teamId)throw fail(403,'This instance belongs to another team.');
  const row=existing||{origin,teamId:teamId||null,used:false,status:'ready',createdAt:now(),credential:null};
  if(teamId)row.teamId=teamId;rows.set(origin,row);save();return info(origin);
 }
 async function authorize({origin,team,accessToken,timeLeftMilliseconds}){
  await register({origin,teamId:team.id,name:team.name});const row=rows.get(origin);
  // Only the rCTF ownership check during sign-in establishes which instance
  // is current. A delayed gateway startup registration cannot revoke a race.
  supersede(team.id,origin);
  row.credential=seal(accessToken);row.credentialUntil=now()+Math.max(1000,Number(timeLeftMilliseconds)||3600000);
  row.status=row.used?'closing':'ready';if(row.used)row.stopAt=now()+2000;save();
 }
 function info(origin){const row=rows.get(origin);return {instanceOrigin:origin,instanceUsed:!!row?.used,instanceStatus:row?.status||'unregistered'};}
 function claim(origin,teamId){
  const row=rows.get(origin);
  if(!row||row.teamId!==teamId||!row.credential||row.credentialUntil<=now())throw fail(401,'Sign in with rCTF again before racing.');
  if(row.used||row.status!=='ready')throw fail(403,'This instance has already been used. Create a new instance in rCTF.');
  row.used=true;row.status='racing';save();
 }
 function close(origin,reason){const row=rows.get(origin);if(!row||['stopped','superseded','expired'].includes(row.status))return;row.used=true;row.status='closing';row.reason=reason;row.stopAt??=now()+2000;save();}
 let running=null;
 async function drain(){
  let processed=0;
  for(const row of rows.values()){
   if(row.credential&&row.credentialUntil<=now()){row.credential=null;row.status='expired';save();continue;}
   if(row.status!=='closing'||row.stopAt>now()||!row.credential||processed>=8)continue;processed++;
   try{
    const headers={Authorization:'Bearer '+unseal(row.credential)},url=`${rctfURL}/api/v2/integrations/challs/${encodeURIComponent(challengeId)}/instance`;
    const current=await fetchJSON(fetcher,url,{headers});
    if(!current.res.ok||current.data.kind!=='goodInstanceStatus')throw new Error('Instance status unavailable.');
    if(['starting','stopping'].includes(current.data.data?.status)){row.stopAt=now()+2000;save();continue;}
    const owns=current.data.data?.endpoints?.some(e=>{try{return new URL(`${e.kind}://${e.host}:${e.port}`).origin===row.origin;}catch{return false;}});
    // A retry for an old race must not stop a replacement instance.
    if(row.status!=='closing')continue;
    if(current.data.data?.status==='stopped'||!owns){row.status=current.data.data?.status==='stopped'?'stopped':'superseded';row.credential=null;save();continue;}
    if(current.data.data.status!=='running')throw new Error('Instance is not ready to stop.');
    const stopped=await fetchJSON(fetcher,url,{method:'DELETE',headers});
    if(!stopped.res.ok||stopped.data.kind!=='goodInstanceStatus'||!['stopped','stopping'].includes(stopped.data.data?.status))throw new Error('Instance shutdown was not accepted.');
    if(stopped.data.data.status==='stopping'){row.stopAt=now()+2000;save();continue;}
    row.status='stopped';row.credential=null;save();
   }catch{
    row.failures=(row.failures||0)+1;row.stopAt=now()+Math.min(60000,1000*2**Math.min(row.failures,6));save();
   }
  }
 }
 function tick(){if(running)return running;running=drain().finally(()=>{running=null;});return running;}
 let recovered=false;
 for(const row of rows.values())if(row.status==='racing'){row.used=true;row.status='closing';row.reason='Coordinator restarted';row.stopAt=now()+2000;recovered=true;}
 if(recovered)save();
 return {register,authorize,claim,close,info,tick};
}
