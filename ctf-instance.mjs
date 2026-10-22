import http from 'node:http';
import {Readable} from 'node:stream';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {fail,json,originURL,readBody,redirect} from './lib/ctf-http.mjs';

export function instanceConfig(env=process.env){
 const allowHTTP=env.APEX_ALLOW_HTTP==='true';
 const endpoints=JSON.parse(env.RCTF_EXPOSED_HOSTNAMES||'[]');
 const endpoint=endpoints.find(e=>e.containerName==='game'&&e.containerPort===8080&&['http','https'].includes(e.kind));
 const publicOrigin=env.INSTANCE_PUBLIC_ORIGIN||(endpoint?`${endpoint.kind}://${endpoint.host}${endpoint.port&&![80,443].includes(endpoint.port)?':'+endpoint.port:''}`:'');
 const config={publicOrigin:originURL(publicOrigin,{allowHTTP}),coordinatorURL:originURL(env.COORDINATOR_URL,{allowHTTP}),coordinatorPublicURL:originURL(env.COORDINATOR_PUBLIC_URL,{allowHTTP}),gatewayKey:env.APEX_GATEWAY_KEY};
 if(!config.gatewayKey||config.gatewayKey.length<32)throw new Error('Set APEX_GATEWAY_KEY (minimum 32 characters).');
 return config;
}
export function createInstanceGateway({publicOrigin,coordinatorURL,coordinatorPublicURL,gatewayKey},{fetcher=fetch}={}){
 return async(req,res)=>{
  try{
   if(req.headers.host!==new URL(publicOrigin).host)throw fail(400,'Unexpected instance hostname.');
   if(req.headers.origin&&req.headers.origin!==publicOrigin)throw fail(403,'Origin not allowed.');
   const url=new URL(req.url,'http://local');
   if(req.method==='GET'&&url.pathname==='/auth/login'){redirect(res,coordinatorPublicURL+'/auth/start?'+new URLSearchParams({return:publicOrigin}));return;}
   if(!['GET','HEAD','POST'].includes(req.method))throw fail(405,'Method not allowed.');
   if(req.method==='POST'&&req.headers.origin!==publicOrigin)throw fail(403,'A same-origin request is required.');
   if(!/^\/(?:api\/|auth\/(?:complete|logout)(?:$|\?))/.test(url.pathname+url.search)&&req.method==='POST')throw fail(405,'Method not allowed.');
   if(url.pathname.startsWith('/auth/')&&!['/auth/complete','/auth/logout'].includes(url.pathname))throw fail(404,'Not found.');
   const body=req.method==='POST'?await readBody(req):undefined;
   const upstream=await fetcher(coordinatorURL+url.pathname+url.search,{method:req.method,headers:{'X-Apex-Gateway-Key':gatewayKey,'X-Apex-Instance-Origin':publicOrigin,...(req.headers.cookie?{Cookie:req.headers.cookie}:{}),...(req.headers.origin?{Origin:req.headers.origin}:{}),...(body?{'Content-Type':'application/json'}:{})},body,redirect:'manual',signal:AbortSignal.timeout(5000)});
   const headers={};for(const name of ['content-type','cache-control','content-security-policy','referrer-policy','x-content-type-options','location','set-cookie']){const value=upstream.headers.get(name);if(value)headers[name]=value;}
   res.writeHead(upstream.status,headers);
   if(req.method==='HEAD'||!upstream.body){res.end();return;}
   await new Promise((resolve,reject)=>{const stream=Readable.fromWeb(upstream.body);stream.on('error',reject);res.on('error',reject);res.on('finish',resolve);stream.pipe(res);});
  }catch(error){if(res.headersSent){res.destroy();return;}json(res,error.status||503,{error:error.status?error.message:'Live timing is unavailable. Practice is available once the page has loaded.'});}
 };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const config=instanceConfig(),server=http.createServer(createInstanceGateway(config));server.requestTimeout=10000;server.headersTimeout=10000;
 server.listen(Number(process.env.PORT||8080),process.env.HOST||'0.0.0.0',()=>console.log('APEX GP instance ready on port '+(process.env.PORT||8080)));
}
