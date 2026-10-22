import http from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,appendFileSync,existsSync} from 'node:fs';
import {resolve,extname,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {Track} from './dist/track.js';
import {Qualifying,scoreEntries,HZ,VERSION,MAX_ROUNDS} from './dist/session.js';
import {getCar,TYRES} from './dist/cars.js';
export const hashToken=t=>createHash('sha256').update(t).digest('hex');
const root=dirname(fileURLToPath(import.meta.url));
export function createApplication({dataDir=resolve(root,'data'),now=()=>performance.now(),seed=2026,event=process.env.EVENT_ID||'monaco-2026',maxSessions=24,authenticateTeam=null,eventStart=-Infinity,eventEnd=Infinity,wallNow=()=>Date.now(),hosting='server',teamName=null}={}){
 mkdirSync(dataDir,{recursive:true,mode:0o700});const track=new Track(),sessions=new Map(),attempts=new Map(),best=new Map();
 const resultsFile=resolve(dataDir,'laps.jsonl'),auditFile=resolve(dataDir,'audit.jsonl'),roundsFile=resolve(dataDir,'rounds.jsonl'),rounds=new Map();
 if(existsSync(roundsFile))for(const line of readFileSync(roundsFile,'utf8').trim().split('\n')){if(!line)continue;const row=JSON.parse(line);if(row.event!==event||row.version!==VERSION)continue;const list=rounds.get(row.teamId)||[];if(row.type==='start'&&!list.some(r=>r.id===row.id))list.push({...row,status:row.status==='started'?'interrupted':row.status});else if(row.type==='end'){const r=list.find(r=>r.id===row.id);if(r)Object.assign(r,{status:row.status,best:row.best});}rounds.set(row.teamId,list);}
 if(existsSync(resultsFile))for(const line of readFileSync(resultsFile,'utf8').trim().split('\n')){if(!line)continue;const entry=JSON.parse(line);if(entry.event!==event||entry.version!==VERSION)continue;const previous=best.get(entry.teamId);if(!previous||entry.time<previous.time)best.set(entry.teamId,entry);}
 const audit=entry=>appendFileSync(auditFile,JSON.stringify({...entry,at:new Date().toISOString()})+'\n',{mode:0o600});
 const roundInfo=teamId=>{const list=rounds.get(teamId)||[];return {attemptsUsed:list.length,maxRounds:MAX_ROUNDS,remainingRounds:Math.max(0,MAX_ROUNDS-list.length),rounds:list.map(({round,car,tyre,status,best})=>({round,car,tyre,status:status||'ended',best:best??null}))};};
 function endRound(s,status){const row={type:'end',event,version:VERSION,id:s.id,teamId:s.team.id,status,best:Number.isFinite(s.sim.best)?s.sim.best:null};appendFileSync(roundsFile,JSON.stringify(row)+'\n',{mode:0o600});const record=rounds.get(s.team.id)?.find(r=>r.id===s.id);if(record)Object.assign(record,row);}
 const scoreboard=()=>scoreEntries([...best.values()].map(({teamId,team,time,car,tyre})=>({teamId,team:teamName?.(teamId)||team,time,car,tyre})));
 async function authenticate(token,ip,cookie,context){
  const path=resolve(dataDir,'teams.json'),teams=authenticateTeam?[]:existsSync(path)?JSON.parse(readFileSync(path,'utf8')):[],digest=hashToken(token),team=authenticateTeam?await authenticateTeam({token,ip,cookie,context}):teams.find(t=>t.tokenHash===digest);
  // Valid players get separate budgets even behind one proxy or campus NAT.
  // Failed tokens still share a peer-address budget; forwarded headers are not trusted.
  const key=team?'team:'+team.id:'ip:'+(ip||'local'),current=now(),bucket=attempts.get(key)||{count:0,until:current+60000};
  if(bucket.until<current){bucket.count=0;bucket.until=current+60000;}bucket.count++;attempts.set(key,bucket);
  if(bucket.count>30)throw Object.assign(new Error('Too many attempts. Try again in a minute.'),{status:429});
  if(!team)throw Object.assign(new Error('Enter the team access token supplied by the organizer.'),{status:401});return team;
 }
 function saveLaps(s){for(const lap of s.sim.laps.slice(s.saved)){if(lap.valid){const entry={event,version:VERSION,teamId:s.team.id,team:s.team.name,time:lap.time,car:s.car,tyre:s.tyre,session:s.id,round:s.round,sectors:lap.sectors,at:new Date().toISOString()};appendFileSync(resultsFile,JSON.stringify(entry)+'\n',{mode:0o600});const previous=best.get(entry.teamId);if(!previous||entry.time<previous.time)best.set(entry.teamId,entry);}}s.saved=s.sim.laps.length;}
 function reap(){const t=now();for(const [id,s]of sessions)if(t-s.last>12000||t-s.started>620000){audit({type:'expired',id,teamId:s.team.id,ticks:s.sim.ticks});endRound(s,'expired');sessions.delete(id);}for(const [key,a]of attempts)if(a.until<t)attempts.delete(key);}
 async function api({method,path,body={},authorization='',origin='',host='',ip='',cookie='',context={}}){
  reap();
  if(origin&&origin!==`http://${host}`&&origin!==`https://${host}`)throw Object.assign(new Error('Origin not allowed.'),{status:403});
  if(method==='GET'&&path==='/api/leaderboard')return {event,version:VERSION,entries:scoreboard()};
  if(method==='GET'&&path==='/api/health')return {ok:true,version:VERSION,event};
  if(method==='GET'&&path==='/api/driver'){const team=await authenticate(authorization.replace(/^Bearer /,''),ip,cookie,context);return {team:team.name,teamId:team.id,event,version:VERSION,...roundInfo(team.id),best:best.get(team.id)?.time??null};}
  if(method==='POST'&&path==='/api/session'){
   const team=await authenticate(authorization.replace(/^Bearer /,''),ip,cookie,context);
   if(wallNow()<eventStart)throw Object.assign(new Error('Event qualifying has not started. Practice is available.'),{status:403});
   if(wallNow()>=eventEnd)throw Object.assign(new Error('Event qualifying has ended. The final classification is retained.'),{status:403});
   if(!getCar(body.car)||!TYRES[body.tyre])throw new Error('Choose a valid car and tyre.');
   if(roundInfo(team.id).remainingRounds===0)throw Object.assign(new Error('All three qualifying rounds have been used. Your best valid time is retained.'),{status:403});
   if(sessions.size>=maxSessions&&![...sessions.values()].some(s=>s.team.id===team.id))throw Object.assign(new Error('All qualifying slots are occupied. Try shortly.'),{status:429});
   for(const [id,s]of sessions)if(s.team.id===team.id){audit({type:'replaced',id,teamId:team.id});endRound(s,'replaced');sessions.delete(id);}
   const id=randomBytes(24).toString('hex'),t=now(),sim=new Qualifying(track,{car:body.car,tyre:body.tyre,seed,singleLap:true});
   const round=(rounds.get(team.id)?.length||0)+1,record={type:'start',event,version:VERSION,id,teamId:team.id,round,car:body.car,tyre:body.tyre,status:'started'};
   appendFileSync(roundsFile,JSON.stringify(record)+'\n',{mode:0o600});const list=rounds.get(team.id)||[];list.push(record);rounds.set(team.id,list);
   sessions.set(id,{id,team,sim,round,car:body.car,tyre:body.tyre,started:t,last:t,saved:0,sequence:0});
   audit({type:'start',id,teamId:team.id,car:body.car,tyre:body.tyre,seed,singleLap:true,round,version:VERSION,event});
   return {id,seed,version:VERSION,hz:HZ,team:team.name,teamId:team.id,event,round,...roundInfo(team.id),best:best.get(team.id)?.time??null};
  }
  const match=path.match(/^\/api\/session\/([a-f0-9]{48})\/(input|finish)$/);
  if(method==='POST'&&match){
   const s=sessions.get(match[1]);if(!s)throw Object.assign(new Error('Session expired. Return to the paddock and start a new run.'),{status:410});
   if(authenticateTeam){const team=await authenticateTeam({token:authorization.replace(/^Bearer /,''),ip,cookie,context});if(!team||team.id!==s.team.id)throw Object.assign(new Error('This qualifying round belongs to another team.'),{status:403});if(sessions.get(s.id)!==s)throw Object.assign(new Error('Session expired.'),{status:410});}
   if(wallNow()>=eventEnd){endRound(s,'event ended');sessions.delete(s.id);throw Object.assign(new Error('Event qualifying has ended. Previously verified laps are retained.'),{status:410});}
   if(body.sequence!==s.sequence)throw Object.assign(new Error('Input sequence mismatch.'),{status:409});
   const runs=body.runs;if(!Array.isArray(runs)||runs.length>240)throw new Error('Malformed input stream.');let ticks=0;
   for(const run of runs){if(!Array.isArray(run)||run.length!==2||!Number.isInteger(run[0])||run[0]<0||run[0]>255||!Number.isInteger(run[1])||run[1]<1||run[1]>240)throw new Error('Invalid input frame.');ticks+=run[1];}
   if(ticks>240)throw new Error('Input batch exceeds two seconds.');
   if(match[2]==='input'&&ticks<30)throw new Error('Live input batches must contain at least 30 ticks.');
   const wall=(now()-s.started)/1000,elapsed=(s.sim.ticks+ticks)/HZ;
   if(elapsed>wall+.15)throw Object.assign(new Error('Simulation is ahead of real time.'),{status:422});
   if(wall-elapsed>6){sessions.delete(s.id);endRound(s,'timing lost');audit({type:'rejected',id:s.id,reason:'Input stream exceeded live timing window'});throw Object.assign(new Error('Live timing lost. Start another ranked run.'),{status:410});}
   // Only these controls enter the authoritative simulation. Client times and positions are ignored.
   for(const [mask,count]of runs)for(let i=0;i<count;i++)s.sim.step(mask);
   s.last=now();s.sequence++;audit({type:'input',id:s.id,sequence:body.sequence,runs,ticks:s.sim.ticks});saveLaps(s);
   const result={...s.sim.summary(),sequence:s.sequence,entries:scoreboard(),round:s.round,...roundInfo(s.team.id)};
   if(match[2]==='finish'||s.sim.finished){audit({type:'finish',id:s.id,teamId:s.team.id,summary:s.sim.summary()});endRound(s,s.sim.laps.length?'completed':'ended');sessions.delete(s.id);Object.assign(result,roundInfo(s.team.id));}return result;
  }
  throw Object.assign(new Error('Not found.'),{status:404});
 }
 const handler=async(req,res)=>{
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
  try{
   const url=new URL(req.url,'http://local');
   if(url.pathname.startsWith('/api/')){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>16384){send(413,{error:'Request too large.'});return;}}let body={};try{body=raw?JSON.parse(raw):{};}catch{send(400,{error:'Invalid JSON.'});return;}if(!body||typeof body!=='object'||Array.isArray(body)){send(400,{error:'Expected an object.'});return;}
    const result=await api({method:req.method,path:url.pathname,body,authorization:req.headers.authorization,origin:req.headers.origin,host:req.headers.host,ip:req.socket.remoteAddress,cookie:req.headers.cookie,context:{instanceOrigin:req.headers['x-apex-instance-origin']}});send(200,result);return;
   }
   if(!['GET','HEAD'].includes(req.method)){send(405,{error:'Method not allowed.'});return;}
   // Explicit public asset allowlist: event records, credentials and source never leave the server.
   const name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
   if(!/^(?:[a-z0-9-]+\.(?:html|css|js|svg)|assets\/[a-z0-9-]+\.(?:webp|svg))$/.test(name)){send(404,{error:'Not found.'});return;}
   const file=resolve(root,'dist',name),mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp'};
   let data;try{data=readFileSync(file);if(name==='index.html'&&hosting==='ctf')data=Buffer.from(data.toString().replace('<meta name="apex-hosting" content="server">','<meta name="apex-hosting" content="ctf">'));}catch{send(404,{error:'Not found.'});return;}
   res.writeHead(200,{'Content-Type':mime[extname(file)],'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",'Cache-Control':/\.(html|js|css)$/.test(name)?'no-cache':'public, max-age=300'});res.end(req.method==='HEAD'?undefined:data);
  }catch(error){send(error.status||400,{error:error.message});}
 };
 return {handler,api,scoreboard,track};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const app=createApplication({dataDir:process.env.DATA_DIR?resolve(process.env.DATA_DIR):undefined,seed:Number(process.env.EVENT_SEED||2026)}),port=Number(process.env.PORT||5174),host=process.env.HOST||'127.0.0.1';
 const server=http.createServer(app.handler);server.requestTimeout=10000;server.headersTimeout=10000;server.listen(port,host,()=>console.log(`APEX GP qualifying: http://${host}:${port}`));
}
