import {createHmac,randomBytes} from 'node:crypto';
import {appendFileSync,existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {VERSION} from '../dist/session.js';
import {equalSecret,fail,fetchJSON,json,originURL,redirect} from './ctf-http.mjs';

const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const random=()=>randomBytes(32).toString('base64url');
function cookieValue(header,name){return String(header||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1)||'';}

export function createCTFAuth({rctfURL,publicURL,clientId,clientSecret,cookieSecret,instanceDomain,instancePrefix='apex-gp-',challengeId,dataDir,event,eventEnd,now=()=>Date.now(),fetcher=fetch,allowHTTP=false,developmentOrigins=[],onInstanceAuthorized=async()=>{}}){
 rctfURL=originURL(rctfURL,{allowHTTP});publicURL=originURL(publicURL,{allowHTTP});
 if(cookieSecret.length<32||clientSecret.length<16||!uuid.test(clientId))throw new Error('Configure rCTF client credentials and a cookie secret of at least 32 characters.');
 if(!/^[a-z0-9.-]+$/.test(instanceDomain)||!instanceDomain.includes('.')||!/^[a-z0-9-]+-$/.test(instancePrefix))throw new Error('Invalid instance domain or prefix.');
 const secure=publicURL.startsWith('https:'),sessionName=secure?'__Host-apex-session':'apex-session',stateName=secure?'__Host-apex-state':'apex-state';
 const states=new Map(),tickets=new Map(),teams=new Map(),teamFile=join(dataDir,'ctf-teams.jsonl'),callback=publicURL+'/auth/rctf/callback';
 if(existsSync(teamFile))for(const line of readFileSync(teamFile,'utf8').split('\n').filter(Boolean)){const row=JSON.parse(line);if(row.event===event&&row.version===VERSION)teams.set(row.id,{id:row.id,name:row.name});}
 const cookie=(name,value,age)=>`${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure?'; Secure':''}`;
 const sessionAge=()=>Math.max(3600,Math.ceil((eventEnd+3600000-now())/1000));
 const sign=body=>createHmac('sha256',cookieSecret).update(body).digest('base64url');
 function allowedOrigin(value){
  let origin;try{origin=originURL(value,{allowHTTP});}catch{throw fail(400,'Invalid instance origin.');}
  if(allowHTTP&&developmentOrigins.includes(origin))return origin;
  const u=new URL(origin),suffix='.'+instanceDomain;
  if(u.protocol!=='https:'||u.port||!u.hostname.endsWith(suffix))throw fail(400,'This instance origin is not allowed.');
  const label=u.hostname.slice(0,-suffix.length);
  if(!label.startsWith(instancePrefix)||!/^[a-z0-9-]+$/.test(label)||label.length<=instancePrefix.length||label.length>63)throw fail(400,'This instance origin is not allowed.');
  return origin;
 }
 function remember(team){
  if(teams.get(team.id)?.name!==team.name){appendFileSync(teamFile,JSON.stringify({...team,event,version:VERSION})+'\n',{mode:0o600});teams.set(team.id,team);}
 }
 function issue(team,audience){
  const body=Buffer.from(JSON.stringify({id:team.id,name:team.name,event,version:VERSION,aud:audience,exp:now()+sessionAge()*1000})).toString('base64url');
  return body+'.'+sign(body);
 }
 function authenticate(header,audience){
  const token=cookieValue(header,sessionName),[body,signature,...extra]=token.split('.');
  if(!body||!signature||extra.length||!equalSecret(sign(body),signature))throw fail(401,'Sign in with rCTF in Driver settings before qualifying.');
  let row;try{row=JSON.parse(Buffer.from(body,'base64url').toString());}catch{throw fail(401,'Sign in with rCTF again.');}
  if(row.event!==event||row.version!==VERSION||row.aud!==audience||row.exp<=now()||!uuid.test(row.id))throw fail(401,'Sign in with rCTF again.');
  return {id:row.id,name:teams.get(row.id)?.name||row.name};
 }
 function reap(){for(const map of [states,tickets])for(const [key,row]of map)if(row.expires<=now())map.delete(key);}
 async function handle(req,res,instanceOrigin){
  const url=new URL(req.url,publicURL);reap();
  if(req.method==='GET'&&url.pathname==='/auth/start'){
   const origin=allowedOrigin(url.searchParams.get('return'));
   if(states.size>=5000)throw fail(429,'Too many pending sign-ins. Try again shortly.');
   const state=random();states.set(state,{origin,expires:now()+300000});
   const destination=new URL('/external-auth/authorize',rctfURL);destination.search=new URLSearchParams({client_id:clientId,redirect_uri:callback,state}).toString();
   redirect(res,destination.href,{'Set-Cookie':cookie(stateName,state,300)});return true;
  }
  if(req.method==='GET'&&url.pathname==='/auth/rctf/callback'){
   const state=url.searchParams.get('state'),row=states.get(state);
   if(!row||!equalSecret(state,cookieValue(req.headers.cookie,stateName)))throw fail(400,'Sign-in state expired or did not match. Start sign-in from your instance again.');
   states.delete(state);const code=url.searchParams.get('code');if(!code||code.length>1024)throw fail(400,'Missing rCTF authorization code.');
   const exchange=await fetchJSON(fetcher,rctfURL+'/api/v2/external-auth/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId,clientSecret,code})});
   if(!exchange.res.ok||exchange.data.kind!=='goodExternalAuthToken'||typeof exchange.data.data?.accessToken!=='string')throw fail(401,'rCTF refused sign-in. Start sign-in again.');
   const profile=await fetchJSON(fetcher,rctfURL+'/api/v2/users/me',{headers:{Authorization:'Bearer '+exchange.data.data.accessToken}}),team=profile.data.data;
   // The lifecycle service retains an encrypted credential only until this
   // instance finishes/expires, so it can stop the owning team's instance.
   if(!profile.res.ok||profile.data.kind!=='goodUserSelfDataV2'||!team||!uuid.test(team.id)||typeof team.name!=='string'||!team.name.trim()||team.name.length>256||team.banned!==false)throw fail(403,'rCTF did not authorize this team.');
   const instance=await fetchJSON(fetcher,`${rctfURL}/api/v2/integrations/challs/${encodeURIComponent(challengeId)}/instance`,{headers:{Authorization:'Bearer '+exchange.data.data.accessToken}});
   const ownsOrigin=instance.data.data?.endpoints?.some(endpoint=>{
    if(!['http','https'].includes(endpoint.kind))return false;
    try{return originURL(`${endpoint.kind}://${endpoint.host}:${endpoint.port}`,{allowHTTP})===row.origin;}catch{return false;}
   });
   if(!instance.res.ok||instance.data.kind!=='goodInstanceStatus'||instance.data.data?.status!=='running'||!ownsOrigin)throw fail(403,'Open the running APEX GP instance created by your own rCTF team.');
   await onInstanceAuthorized({origin:row.origin,team,accessToken:exchange.data.data.accessToken,timeLeftMilliseconds:instance.data.data.timeLeftMilliseconds});
   remember({id:team.id,name:team.name});const ticket=random();tickets.set(ticket,{origin:row.origin,token:issue(team,row.origin),expires:now()+60000});
   redirect(res,row.origin+'/auth/complete?ticket='+ticket,{'Set-Cookie':cookie(stateName,'',0)});return true;
  }
  if(req.method==='GET'&&url.pathname==='/auth/complete'&&instanceOrigin){
   const ticket=url.searchParams.get('ticket'),row=tickets.get(ticket);
   if(!row||row.origin!==instanceOrigin)throw fail(401,'Sign-in ticket expired or belongs to another instance. Sign in again.');
   tickets.delete(ticket);redirect(res,'/',{'Set-Cookie':cookie(sessionName,row.token,sessionAge())});return true;
  }
  if(req.method==='POST'&&url.pathname==='/auth/logout'&&instanceOrigin){json(res,200,{ok:true},{'Set-Cookie':cookie(sessionName,'',0)});return true;}
  return false;
 }
 return {handle,authenticate,allowedOrigin,teams,callback,rememberTeam:remember};
}
