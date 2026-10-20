import {writeFileSync} from 'node:fs';
import {SIGN_RECTS} from '../dist/circuit-art.js';
const text=(x,y,size,fill,label,extra='')=>`<text x="${x}" y="${y}" fill="${fill}" ${extra.includes('font-family=')?'':'font-family="Arial,Helvetica,sans-serif"'} font-size="${size}" ${extra.includes('font-weight=')?'':'font-weight="800"'} ${extra}>${label}</text>`;
const panels={
 pirelli:['#f6d329',text(256,88,77,'#d5202e','PIRELLI','text-anchor="middle" font-style="italic"')+'<path d="M80 25H427" stroke="#d5202e" stroke-width="9"/>'],
 dhl:['#ffcf00',text(256,88,85,'#d9222d','DHL','text-anchor="middle" font-style="italic"')+'<g stroke="#d9222d" stroke-width="5"><path d="M25 65H105 M17 77H97 M9 89H89 M407 65H487 M399 77H479 M391 89H471"/></g>'],
 tag:['#063c31','<path d="M165 9H347V91L256 121L165 91Z" fill="#fff"/><path d="M173 17H339V86L256 113L173 86Z" fill="#07533e"/>'+text(256,59,44,'#fff','TAG','text-anchor="middle"')+text(256,96,30,'#fff','HEUER','text-anchor="middle"')],
 aramco:['#087fc1','<path d="M400 0H512V128H354Z" fill="#00a980"/>'+text(237,89,77,'#fff','aramco','text-anchor="middle" font-weight="400"')],
 monaco:['#f2efdf','<path d="M0 0H19V128H0Z M39 0H46V128H39Z" fill="#b5222b"/>'+text(268,70,51,'#252b2c','MONACO','text-anchor="middle" letter-spacing="5"')+text(268,101,18,'#aa2330','GRAND PRIX • MONTE-CARLO','text-anchor="middle" letter-spacing="3"')],
 event:['#141d24',text(255,77,68,'#f0eee5','APEX GP','text-anchor="middle" font-style="italic"')+text(255,108,16,'#74d4bd','MONACO • QUALIFYING 2026','text-anchor="middle" letter-spacing="5"')],
 pit:['#1764a2',text(197,82,61,'#fff','PIT LANE','text-anchor="middle"')+'<path d="M360 64H470M436 30L471 64L436 98" stroke="#fff" stroke-width="12" fill="none"/>'],
 cafe:['#e9e0ca',text(256,73,46,'#233b31','CAFÉ DU PORT','text-anchor="middle" font-family="Georgia,serif"')+text(256,103,16,'#7d6343','MONTE-CARLO · TERRASSE','text-anchor="middle" letter-spacing="4"')],
 casino:['#ded1af',text(256,68,41,'#6c342d','CASINO DE MONTE-CARLO','text-anchor="middle" font-family="Georgia,serif"')+text(256,102,17,'#755d3f','PLACE DU CASINO','text-anchor="middle" letter-spacing="6"')],
 hotel:['#f1e9d7',text(256,72,46,'#384c4d','HÔTEL DE LA MER','text-anchor="middle" font-family="Georgia,serif"')+text(256,103,18,'#8f764f','MONTE-CARLO ★★★★★','text-anchor="middle" letter-spacing="5"')],
 sector1:['#1d493d',text(256,83,63,'#fff','SECTOR 1','text-anchor="middle"')],sector2:['#1d493d',text(256,83,63,'#fff','SECTOR 2','text-anchor="middle"')],sector3:['#1d493d',text(256,83,63,'#fff','SECTOR 3','text-anchor="middle"')],
 exit:['#1b724f',text(188,83,67,'#fff','EXIT','text-anchor="middle"')+'<path d="M325 64H458M420 27L458 64L420 101" stroke="#fff" stroke-width="12" fill="none"/>'],
 marshals:['#dd6129',text(256,83,56,'#fff','MARSHALS','text-anchor="middle"')],parking:['#246fa2',text(256,88,78,'#fff','P','text-anchor="middle"')],
};
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="2048" viewBox="0 0 1024 1024"><title>APEX Monaco circuit signs, locally drawn illustrative artwork</title>';
for(const [name,[x,y,w,h]]of Object.entries(SIGN_RECTS)){const [background,art]=panels[name];svg+=`<g transform="translate(${x} ${y})"><rect width="${w}" height="${h}" fill="${background}"/>${art}<path d="M0 127H512" stroke="#000" stroke-opacity=".15"/></g>`;}
writeFileSync(new URL('../dist/assets/circuit-signs.svg',import.meta.url),svg+'</svg>');console.log('Wrote 16 circuit sign panels.');
