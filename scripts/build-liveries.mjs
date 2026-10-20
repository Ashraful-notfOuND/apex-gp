import {writeFileSync} from 'node:fs';
import {CARS} from '../dist/cars.js';
import {mark,badge} from './brand-art.mjs';
const root=new URL('../dist/assets/',import.meta.url);
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const liveries={
 ferrari:{base:'#cc071e',accent:'#ffffff',secondary:'#17191c',mark:'FERRARI',sub:'SCUDERIA',wing:'FERRARI',number:'26'},
 redbull:{base:'#07132d',accent:'#e8bc25',secondary:'#e3212f',mark:'ORACLE',sub:'RED BULL RACING',wing:'RED BULL',number:'26'},
 mclaren:{base:'#f47f20',accent:'#111417',secondary:'#fff7ef',mark:'McLAREN',sub:'RACING',wing:'McLAREN',number:'26'},
 mercedes:{base:'#151c21',accent:'#18d8b8',secondary:'#c7d0d3',mark:'PETRONAS',sub:'MERCEDES AMG',wing:'MERCEDES',number:'26'},
 williams:{base:'#1547bc',accent:'#ffffff',secondary:'#0b1224',mark:'WILLIAMS',sub:'RACING',wing:'WILLIAMS',number:'26'},
 aston:{base:'#00644f',accent:'#c4e635',secondary:'#071e1b',mark:'ASTON MARTIN',sub:'FORMULA ONE TEAM',wing:'ASTON MARTIN',number:'26'},
 haas:{base:'#edecea',accent:'#dc1833',secondary:'#131519',mark:'HAAS',sub:'F1 TEAM',wing:'HAAS',number:'26'},
 racingbulls:{base:'#eceef2',accent:'#2552b1',secondary:'#10204a',mark:'RACING BULLS',sub:'FORMULA ONE TEAM',wing:'RACING BULLS',number:'26'},
 alpine:{base:'#066bc4',accent:'#ed85bd',secondary:'#061e3b',mark:'ALPINE',sub:'BWT ALPINE',wing:'ALPINE',number:'26'},
 audi:{base:'#c4c7c9',accent:'#f54128',secondary:'#14171b',mark:'AUDI',sub:'FORMULA ONE TEAM',wing:'AUDI',number:'26'},
 cadillac:{base:'#171b20',accent:'#d6d5ce',secondary:'#9b8763',mark:'CADILLAC',sub:'FORMULA ONE TEAM',wing:'CADILLAC',number:'26'},
};
const text=(x,y,size,fill,value,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-family="Arial,Helvetica,sans-serif" font-weight="800" ${extra}>${esc(value)}</text>`;
const sponsors={ferrari:['hp','Shell','IBM'],redbull:['VISA','FORD','ORACLE'],mclaren:['mastercard','OKX','McLAREN'],mercedes:['PETRONAS','INEOS','adidas'],williams:['Atlassian','KOMATSU','kraken'],aston:['aramco','Cognition','ASTON MARTIN'],haas:['TOYOTA GAZOO RACING','RUCKUS','Emburse'],racingbulls:['VISA','Cash App','HUGO'],alpine:['BWT','eni','Cato'],audi:['Revolut','bp','Hyatt'],cadillac:['TWG AI','GM','CADILLAC']};
for(const car of CARS){const p=liveries[car.id],light=['haas','racingbulls','audi'].includes(car.id),ink=light?'#151a20':'#ffffff';let content='';
 for(const y of [0,260]){
  content+=`<rect x="0" y="${y}" width="1024" height="260" fill="${p.base}"/><path d="M0 ${y+213} L1024 ${y+100} L1024 ${y+260} L0 ${y+260}Z" fill="${p.secondary}"/><path d="M0 ${y+217} L1024 ${y+105} L1024 ${y+116} L0 ${y+228}Z" fill="${p.accent}"/>`;
  content+=text(505,y+113,64,ink,p.mark,'text-anchor="middle" textLength="610" lengthAdjust="spacingAndGlyphs" font-style="italic"');
  content+=badge(car.id,48,y+55,78,95,ink);
  sponsors[car.id].forEach((name,i)=>{content+=mark(name,190+i*205,y+158,165,42,'#ffffff');});
  content+=text(470,y+238,19,ink,p.sub,'text-anchor="middle" letter-spacing="5"');
  if(car.id==='ferrari')content+=mark('hp',818,y+142,112,70);
  else content+=text(884,y+142,63,p.accent,'26','text-anchor="middle" font-style="italic"');
  content+=`<path d="M0 ${y+245}H1024" stroke="#000000" stroke-opacity=".35" stroke-width="2"/>`;
 }
 // Nose island: its long axis is vertical. The number follows the upper nose.
 content+=`<rect x="0" y="520" width="256" height="504" fill="${p.base}"/><path d="M92 520 H164 L142 1024 H114Z" fill="${p.accent}"/><path d="M116 520 H140 V604 H116Z" fill="${p.secondary}"/>`;
 content+=badge(car.id,91,535,74,89,ink);
 content+=text(128,730,96,ink,p.number,'text-anchor="middle" font-style="italic" stroke="'+p.base+'" stroke-width="2" paint-order="stroke"');
 content+=`<rect x="93" y="780" width="24" height="7" fill="#009246"/><rect x="117" y="780" width="24" height="7" fill="#ffffff"/><rect x="141" y="780" width="24" height="7" fill="#ce2b37"/>`;
 content+=mark(sponsors[car.id][0],65,812,126,50,ink)+mark(sponsors[car.id][1],65,910,126,48,ink);
 // Rear flap and engine-cover islands have their own UV coordinates.
 content+=`<rect x="256" y="520" width="768" height="160" fill="${p.accent}"/>`+text(640,616,54,p.base,p.wing,'text-anchor="middle" textLength="440" lengthAdjust="spacingAndGlyphs"')+mark(sponsors[car.id][0],274,578,110,46,p.base)+mark(sponsors[car.id][1],896,578,110,46,p.base);
 content+=`<rect x="256" y="680" width="512" height="344" fill="${p.base}"/><path d="M256 998 L768 930 V952 L256 1023Z" fill="${p.accent}"/>`+text(512,850,56,ink,p.mark,'text-anchor="middle" textLength="420" lengthAdjust="spacingAndGlyphs"')+mark(sponsors[car.id][0],321,888,170,45,ink)+mark(sponsors[car.id][2],536,888,170,45,ink);
 content+=`<rect x="768" y="680" width="256" height="344" fill="${p.base}"/>`+badge(car.id,823,699,146,160,ink)+mark(sponsors[car.id][1],800,888,190,62,ink)+text(896,992,20,ink,'APEX GP','text-anchor="middle" letter-spacing="3"');
 // Native vector paint, not a photograph or manufacturer-supplied livery.
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="2048" viewBox="0 0 1024 1024"><title>${esc(car.name)} illustrative sponsor livery</title><rect width="1024" height="1024" fill="${p.base}"/>${content}</svg>`;
 writeFileSync(new URL('livery-'+car.id+'.svg',root),svg);
}
for(const [compound,band] of [['soft','#e83641'],['medium','#e7cb27'],['hard','#e3e3d9']]){
 const curved=(word,offset)=>[...word].map((letter,i)=>{const angle=offset+(i-(word.length-1)/2)*.155,x=256+Math.sin(angle)*196,y=256-Math.cos(angle)*196;return `<text transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(angle*180/Math.PI).toFixed(2)})" x="0" y="10" text-anchor="middle">${letter}</text>`;}).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><title>PIRELLI P ZERO ${compound}</title><rect width="512" height="512" fill="#17191b"/><circle cx="256" cy="256" r="226" fill="none" stroke="#292b2d" stroke-width="3"/><circle cx="256" cy="256" r="171" fill="none" stroke="#343537" stroke-width="2"/><g fill="${band}" font-family="Arial,Helvetica,sans-serif" font-size="32" font-weight="900">${curved('PIRELLI',0)}${curved('P ZERO',Math.PI)}</g><text x="256" y="459" text-anchor="middle" fill="#777b7d" font-family="Arial,sans-serif" font-size="8" letter-spacing="1">${compound.toUpperCase()} · 18 INCH</text><path d="M54 250 H72 M440 250 H458" stroke="${band}" stroke-width="3"/></svg>`;

 writeFileSync(new URL('tyre-'+compound+'.svg',root),svg);
}
console.log('Wrote 11 car liveries and 3 tyre sidewalls.');
