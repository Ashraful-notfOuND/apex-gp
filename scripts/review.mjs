import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {Track} from '../dist/track.js';
import {Qualifying,VERSION,HZ} from '../dist/session.js';
const id=process.argv[2],dir=process.env.DATA_DIR?resolve(process.env.DATA_DIR):resolve(dirname(fileURLToPath(import.meta.url)),'../data');
if(!/^[a-f0-9]{48}$/.test(id||'')){console.error('Usage: npm run review -- SESSION_ID (from data/audit.jsonl)');process.exit(1);}
try{
 const rows=readFileSync(resolve(dir,'audit.jsonl'),'utf8').trim().split('\n').map(line=>JSON.parse(line)).filter(e=>e.id===id),start=rows.find(e=>e.type==='start');
 if(!start)throw new Error('Session not found.');if(start.version!==VERSION)throw new Error('Use the archived simulation version for this session.');
 const sim=new Qualifying(new Track(),start),digest=createHash('sha256');let changes=0,last=-1,batches=0;
 for(const row of rows.filter(e=>e.type==='input')){if(row.sequence!==batches)throw new Error('Input sequence has a gap.');for(const [mask,count]of row.runs){digest.update(Buffer.alloc(count,mask));for(let i=0;i<count;i++){if(mask!==last){changes++;last=mask;}sim.step(mask);}}if(sim.ticks!==row.ticks)throw new Error('Replay tick count differs from the audit.');batches++;}
 console.log(JSON.stringify({session:id,teamId:start.teamId,event:start.event,car:start.car,tyre:start.tyre,seed:start.seed,inputSha256:digest.digest('hex'),controlChanges:changes,changesPerSecond:sim.ticks?Number((changes/(sim.ticks/HZ)).toFixed(2)):0,...sim.summary(),note:'Deterministic replay verifies the recorded run. It does not establish whether a human drove it.'},null,2));
}catch(error){console.error(error.message);process.exit(1);}
