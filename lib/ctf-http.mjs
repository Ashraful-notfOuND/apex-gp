import {timingSafeEqual} from 'node:crypto';

export const fail=(status,message)=>Object.assign(new Error(message),{status});
export function equalSecret(a,b){
 const left=Buffer.from(String(a||'')),right=Buffer.from(String(b||''));
 return left.length===right.length&&left.length>0&&timingSafeEqual(left,right);
}
export function json(res,status,value,headers={}){
 res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});
 res.end(JSON.stringify(value));
}
export function redirect(res,location,headers={}){
 res.writeHead(303,{Location:location,'Cache-Control':'no-store','Referrer-Policy':'no-referrer',...headers});res.end();
}
export async function readBody(req,limit=16384){
 const chunks=[];let size=0;
 for await(const chunk of req){const data=Buffer.from(chunk);size+=data.length;if(size>limit)throw fail(413,'Request too large.');chunks.push(data);}
 return Buffer.concat(chunks);
}
export function originURL(value,{allowHTTP=false}={}){
 const u=new URL(value);
 if(!['https:',...(allowHTTP?['http:']:[])].includes(u.protocol)||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw new Error('Expected an HTTPS origin without a path.');
 return u.origin;
}
export async function fetchJSON(fetcher,url,options={}){
 let res;try{res=await fetcher(url,{...options,redirect:'error',signal:AbortSignal.timeout(5000)});}catch{throw fail(503,'The rCTF service is unavailable. Try signing in again shortly.');}
 let data;try{data=await res.json();}catch{throw fail(502,'The rCTF service returned an invalid response.');}
 return {res,data};
}
