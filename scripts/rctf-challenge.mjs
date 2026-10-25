import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ctfConfig} from '../lib/ctf-config.mjs';

export function challengeDefinition(config,{image,instancer='docker',author='DUCTF organizers'}={}){
 if(!image||!/^[a-z0-9][a-z0-9./_:@-]+$/.test(image))throw new Error('Set APEX_IMAGE to the image tag or digest reachable by your instancer.');
 return {data:{name:'APEX GP — Race the Clock',category:'misc',author,
  description:'Start your instance and open the **APEX GP** HTTP link. Sign in with rCTF in **Driver**. Each instance allows **one race**: an out-lap followed by one flying lap. **A crash invalidates and ends the race immediately**, including on the out-lap. Abandoning a race also uses the instance. The instance closes automatically after the result is saved; create a new instance to race again. Your team keeps its **fastest valid lap across instances**. Every registered team appears on the shared leaderboard, initially at **∞** and **0 points**. Fastest distinct valid time: **1,000 points**; slowest: **200**; intermediate scores are ranked linearly. Ties share points. Scores update automatically; no flag is submitted. Controls: W/S pedals, A/D steer, Q/E gears, Space DRS, Shift ERS. Leaving the tab ends the race. Practice is disabled in competition instances.',
  flags:[],files:[],points:{min:200,max:1000},tiebreakEligible:false,hidden:true,
  scoring:{kind:'dynamic',source:{transport:'webhook',secret:config.secret}},
  instancerConfig:{challengeIntegrationId:config.challengeId,instancer,timeoutMilliseconds:3600000,extendable:true,
   config:{services:{game:{image,command:['node','ctf-instance.mjs'],environment:{NODE_ENV:'production',HOST:'0.0.0.0',PORT:'8080',COORDINATOR_URL:config.publicURL,COORDINATOR_PUBLIC_URL:config.publicURL,APEX_GATEWAY_KEY:config.gatewayKey,RCTF_EXPOSED_HOSTNAMES:'${RCTF_EXPOSED_HOSTNAMES}'},networks:['egress'],expose:['8080'],read_only:true,cap_drop:['ALL'],security_opt:['no-new-privileges:true'],mem_limit:'256m',cpus:0.5,pids_limit:64,tmpfs:['/tmp:size=8m']}},networks:{egress:{internal:false}}},
   expose:[{kind:'https',hostPrefix:config.instancePrefix.slice(0,-1),containerName:'game',containerPort:8080,shouldDisplay:true,title:'APEX GP'}]}}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const config=ctfConfig(),definition=challengeDefinition(config,{image:process.env.APEX_IMAGE,instancer:process.env.RCTF_INSTANCER||'docker',author:process.env.CHALLENGE_AUTHOR||'DUCTF organizers'});
 const output=resolve('deploy/rctf/challenge.generated.json');mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(definition,null,2)+'\n',{mode:0o600});
 console.log('Wrote '+output+' (contains private deployment secrets; do not commit).');
 if(process.argv.includes('--upload')){
  const token=process.env.RCTF_ADMIN_TOKEN;if(!token)throw new Error('Set RCTF_ADMIN_TOKEN to create the challenge.');
  const url=config.rctfURL+'/api/v2/admin/challs/'+encodeURIComponent(config.challengeId),headers={Authorization:'Bearer '+token};
  const existing=await fetch(url,{headers,redirect:'error',signal:AbortSignal.timeout(5000)});
  if(existing.status!==404)throw new Error('Refusing to overwrite a challenge or continue without a confirmed 404. Review an existing challenge in the rCTF admin editor.');
  const response=await fetch(url,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(definition),redirect:'error',signal:AbortSignal.timeout(10000)});
  const result=await response.json();if(!response.ok)throw new Error(`rCTF rejected challenge creation (${response.status}, ${result.kind}).`);
  console.log('Created hidden rCTF challenge '+config.challengeId+'. Test it before releasing it.');
 }
}
