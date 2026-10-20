import {mkdirSync,readFileSync,writeFileSync,existsSync,renameSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,randomUUID} from 'node:crypto';
import {hashToken} from '../server.mjs';
const name=process.argv.slice(2).join(' ').trim();
if(!name||name.length>48){console.error('Usage: npm run team -- "Team name" (1–48 characters)');process.exit(1);}
const dir=process.env.DATA_DIR?resolve(process.env.DATA_DIR):resolve(dirname(fileURLToPath(import.meta.url)),'../data');mkdirSync(dir,{recursive:true,mode:0o700});
const file=resolve(dir,'teams.json'),teams=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):[];
if(teams.some(t=>t.name.toLowerCase()===name.toLowerCase())){console.error('This team already exists.');process.exit(1);}
const token=randomBytes(24).toString('base64url');teams.push({id:randomUUID(),name,tokenHash:hashToken(token)});const temp=resolve(dir,'teams.tmp');writeFileSync(temp,JSON.stringify(teams,null,2),{mode:0o600});renameSync(temp,file);
console.log(`Created ${name}. Give this access token privately to the team (shown once):\n${token}`);
