import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable,Writable} from 'node:stream';
import {createCoordinator} from '../ctf-coordinator.mjs';
import {createInstanceGateway} from '../ctf-instance.mjs';

export const teamA={id:'11111111-1111-4111-8111-111111111111',name:'Team A',banned:false};
export const teamB={id:'22222222-2222-4222-8222-222222222222',name:'Team B',banned:false};
export async function call(handler,path,{method='GET',headers={},body,host='timing.test'}={}){
 const req=Readable.from(body===undefined?[]:[Buffer.from(typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body))]);
 Object.assign(req,{url:path,method,headers:{host,...Object.fromEntries(Object.entries(headers).map(([key,value])=>[key.toLowerCase(),value]))},socket:{remoteAddress:'127.0.0.1'}});
 const chunks=[],res=new Writable({write(chunk,encoding,done){chunks.push(Buffer.from(chunk));done();}});
 res.headersSent=false;res.writeHead=(status,values)=>{res.status=status;res.headers=new Headers(values);res.headersSent=true;};
 await handler(req,res);const bytes=Buffer.concat(chunks);
 return {status:res.status,headers:res.headers,bytes,text:()=>bytes.toString(),json:()=>JSON.parse(bytes.toString())};
}
export function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'apex-ctf-')),config={rctfURL:'https://ctf.test',publicURL:'https://timing.test',clientId:'33333333-3333-4333-8333-333333333333',clientSecret:'client-secret-'.repeat(4),cookieSecret:'cookie-secret-'.repeat(4),gatewayKey:'gateway-secret-'.repeat(4),instanceDomain:'instances.test',instancePrefix:'apex-gp-',challengeId:'apex-gp',event:'test-event',secret:'scoring-secret-'.repeat(4),eventStart:1000000,eventEnd:11000000,maxSessions:24,seed:2026};
 let clock=1100000,monotonic=0,coordinator;
 const originA='https://apex-gp-a.instances.test',originB='https://apex-gp-b.instances.test',origins=new Map([[teamA.id,originA],[teamB.id,originB]]),platformCalls=[],deliveries=[];
 const platformFetch=async(url,options={})=>{
  platformCalls.push({url,options});let data;
  if(url.endsWith('/external-auth/token'))data={kind:'goodExternalAuthToken',data:{accessToken:JSON.parse(options.body).code}};
  else if(url.endsWith('/users/me'))data={kind:'goodUserSelfDataV2',data:options.headers.Authorization==='Bearer a'?teamA:teamB};
  else if(url.endsWith('/instance')){const team=options.headers.Authorization==='Bearer a'?teamA:teamB,u=new URL(origins.get(team.id));data={kind:'goodInstanceStatus',data:{status:'running',endpoints:[{kind:u.protocol.slice(0,-1),host:u.hostname,port:Number(u.port||443)}]}};}
  else if(url.endsWith('/scores')){deliveries.push(options);data={kind:'goodDynamicScores',data:{inserted:1,updated:0,deleted:0}};}
  else throw new Error('Unexpected platform URL: '+url);
  return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
 };
 function restart(){coordinator=createCoordinator(config,{dataDir:dir,now:()=>clock,monotonicNow:()=>monotonic,fetcher:platformFetch});return coordinator;}
 restart();
 const toCoordinator=async(url,options)=>{const u=new URL(url),result=await call(coordinator.handler,u.pathname+u.search,{method:options.method,headers:options.headers,body:options.body,host:u.host});return new Response(options.method==='HEAD'?null:result.bytes,{status:result.status,headers:result.headers});};
 function gateway(origin){return createInstanceGateway({publicOrigin:origin,coordinatorURL:config.publicURL,coordinatorPublicURL:config.publicURL,gatewayKey:config.gatewayKey},{fetcher:toCoordinator});}
 async function game(origin,path,{cookie,method='GET',body,headers={}}={}){return call(gateway(origin),path,{method,body,host:new URL(origin).host,headers:{...(cookie?{Cookie:cookie}:{}),...(method==='POST'?{Origin:origin}:{}),...headers}});}
 async function login(origin=originA,code='a'){
  const start=await call(coordinator.handler,'/auth/start?'+new URLSearchParams({return:origin}));assert.equal(start.status,303);
  const state=new URL(start.headers.get('location')).searchParams.get('state'),stateCookie=start.headers.get('set-cookie').split(';')[0];
  const callback=await call(coordinator.handler,'/auth/rctf/callback?'+new URLSearchParams({state,code}),{headers:{Cookie:stateCookie}});assert.equal(callback.status,303,callback.text());
  const target=new URL(callback.headers.get('location')),complete=await game(origin,target.pathname+target.search);assert.equal(complete.status,303,complete.text());
  return complete.headers.get('set-cookie').split(';')[0];
 }
 return {dir,config,originA,originB,origins,platformCalls,deliveries,game,login,get coordinator(){return coordinator;},restart,tick(ms){clock+=ms;monotonic+=ms;},setClock(ms){clock=ms;},cleanup:()=>rmSync(dir,{recursive:true,force:true})};
}
