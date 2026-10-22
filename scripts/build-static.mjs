import {copyFileSync,existsSync,lstatSync,mkdirSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),source=join(root,'dist');
const publicFile=/^(?:[a-z0-9-]+\.(?:html|css|js|svg)|assets\/[a-z0-9-]+\.(?:webp|svg))$/;
export function buildStaticSite(destination=join(root,'static-dist')){
 const output=resolve(destination);
 if(output===resolve(root)||output===source||source.startsWith(output+sep))throw new Error('Static output must be separate from the source directory.');
 const input=readFileSync(join(source,'index.html'),'utf8'),marker='<meta name="apex-hosting" content="server">';
 if(!input.includes(marker))throw new Error('Missing hosting marker; refusing to build a preview with ranked controls enabled.');
 rmSync(output,{recursive:true,force:true});mkdirSync(output,{recursive:true});let count=0;
 for(const file of readdirSync(source,{recursive:true})){
  const name=file.replaceAll('\\','/');if(!publicFile.test(name))continue;
  if(!lstatSync(join(source,file)).isFile())throw new Error('Public assets must be regular files: '+name);
  const target=join(output,file);mkdirSync(dirname(target),{recursive:true});copyFileSync(join(source,file),target);count++;
 }
 const html=input.replace(marker,'<meta name="apex-hosting" content="static">')
  .replace('id="showTiming"','id="showTiming" hidden')
  .replace('id="rankedMode"','id="rankedMode" hidden disabled')
  .replace('id="rankedBriefing"','id="rankedBriefing" hidden')
  .replace('Local qualifying saves your three-round progress on this browser.','Your three rounds and best time are saved on this browser. Practice is unlimited. This preview has no shared leaderboard.');
 writeFileSync(join(output,'index.html'),html);
 if(!existsSync(join(output,'game.js')))throw new Error('Static output is missing game.js.');
 return {directory:output,files:count};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=buildStaticSite();console.log(`Built ${result.files} public files in ${result.directory}. Guest qualifying and practice; no ranked API requests.`);
}
