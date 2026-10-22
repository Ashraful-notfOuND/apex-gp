import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
for(const file of ['server.mjs','ctf-coordinator.mjs','ctf-instance.mjs',...['lib','dist','scripts','tests'].flatMap(d=>readdirSync(d).filter(f=>/\.(m?js)$/.test(f)).map(f=>`${d}/${f}`))]){const r=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(r.status)process.exit(r.status);}
console.log('All JavaScript syntax checks passed.');
