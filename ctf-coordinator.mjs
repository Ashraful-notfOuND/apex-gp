import http from 'node:http';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createApplication} from './server.mjs';
import {createCTFAuth} from './lib/ctf-auth.mjs';
import {ctfConfig} from './lib/ctf-config.mjs';
import {createScorePublisher} from './lib/rctf-publisher.mjs';
import {equalSecret,fail,json} from './lib/ctf-http.mjs';

export function createCoordinator(config,{dataDir,now=()=>Date.now(),monotonicNow,fetcher=fetch}={}){
 if(!dataDir)throw new Error('The coordinator requires a persistent DATA_DIR.');
 mkdirSync(dataDir,{recursive:true,mode:0o700});
 const auth=createCTFAuth({...config,dataDir,now,fetcher});
 const app=createApplication({...config,dataDir,now:monotonicNow,wallNow:now,hosting:'ctf',authenticateTeam:({cookie,context})=>auth.authenticate(cookie,context.instanceOrigin),teamName:id=>auth.teams.get(id)?.name});
 const publisher=createScorePublisher({...config,dataDir,now,fetcher,teams:auth.teams,scoreboard:app.scoreboard});
 const handler=async(req,res)=>{
  try{
   const path=new URL(req.url,'http://local').pathname;
   if(req.method==='GET'&&path==='/healthz'){json(res,200,{ok:true,event:config.event});return;}
   if(path==='/auth/start'||path==='/auth/rctf/callback'){if(await auth.handle(req,res))return;throw fail(404,'Not found.');}
   if(!equalSecret(req.headers['x-apex-gateway-key'],config.gatewayKey))throw fail(403,'Use your rCTF challenge instance.');
   const instanceOrigin=auth.allowedOrigin(req.headers['x-apex-instance-origin']);
   if(req.headers.origin&&req.headers.origin!==instanceOrigin)throw fail(403,'Origin not allowed.');
   if(req.method==='POST'&&req.headers.origin!==instanceOrigin)throw fail(403,'A same-origin request is required.');
   if(await auth.handle(req,res,instanceOrigin))return;
   if(req.method==='GET'&&path==='/api/config'){
    let team=null;try{team=auth.authenticate(req.headers.cookie,instanceOrigin);}catch{}
    json(res,200,{ctf:true,authenticated:!!team,team:team?.name||null,event:config.event,eventStart:config.eventStart,eventEnd:config.eventEnd});return;
   }
   // The gateway supplies a validated public origin; ignore client forwarded headers.
   req.headers.host=new URL(instanceOrigin).host;
   await app.handler(req,res);
  }catch(error){json(res,error.status||500,{error:error.status?error.message:'The timing service could not complete this request.'});}
 };
 return {handler,app,auth,publisher};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const config=ctfConfig(),coordinator=createCoordinator(config,{dataDir:process.env.DATA_DIR&&resolve(process.env.DATA_DIR)});
 const publish=()=>coordinator.publisher.tick().catch(error=>console.error(error.message));
 const timer=setInterval(publish,2000);timer.unref();void publish();
 const server=http.createServer(coordinator.handler);server.requestTimeout=10000;server.headersTimeout=10000;
 server.listen(Number(process.env.PORT||8081),process.env.HOST||'127.0.0.1',()=>console.log('APEX GP CTF coordinator ready; event '+config.event));
}
