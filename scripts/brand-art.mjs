// Locally drawn, simplified marks for the illustrative car liveries. These are
// editable vector artwork, not downloaded official logo files or exact decals.
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const label=(name,ink='#fff',size=23)=>`<text x="60" y="29" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="${size}" fill="${ink}" textLength="110" lengthAdjust="spacingAndGlyphs">${escape(name)}</text>`;
export function mark(name,x,y,w,h,ink='#ffffff'){
 let art;const key=name.toLowerCase();
 if(key==='shell')art=`<path d="M33 33 L27 20 Q26 4 43 3 Q60 -4 77 3 Q94 4 93 20 L87 33 L72 33 L68 38 H52 L48 33Z" fill="#ffd529" stroke="#db202c" stroke-width="4"/><path d="M54 29 L37 10 M58 28 L48 5 M62 28 V2 M66 28 L75 5 M70 29 L85 11" stroke="#db202c" stroke-width="2"/>`;
 else if(key==='hp')art=`<circle cx="60" cy="20" r="19" fill="#fff"/><circle cx="60" cy="20" r="17" fill="#087ab8"/><text x="60" y="29" fill="#fff" text-anchor="middle" font-family="Arial" font-size="28" font-weight="700" font-style="italic">hp</text>`;
 else if(key==='mastercard')art=`<circle cx="49" cy="17" r="15" fill="#e52435"/><circle cx="69" cy="17" r="15" fill="#f7a51b" fill-opacity=".92"/><text x="59" y="39" fill="${ink}" text-anchor="middle" font-family="Arial" font-size="10">mastercard</text>`;
 else if(key==='petronas')art=`<path d="M12 3 C-3 22 1 32 12 33 C24 33 26 22 12 3Z" fill="#00bba9"/><circle cx="12" cy="23" r="5" fill="#fff"/><g transform="translate(25 5) scale(.77 .8)">${label('PETRONAS',ink,21)}</g>`;
 else if(key==='bp')art=`${Array.from({length:18},(_,i)=>`<path d="M60 20 Q47 2 60 0 Q73 2 60 20Z" fill="${i%2?'#8cc63f':'#f6e800'}" transform="rotate(${i*20} 60 20)"/>`).join('')}<circle cx="60" cy="20" r="7" fill="#fff"/>`;
 else if(key==='ibm')art=`${label('IBM',ink,38)}${Array.from({length:7},(_,i)=>`<path d="M0 ${5+i*5}H120" stroke="#141b22" stroke-width="1.4"/>`).join('')}`;
 else if(key==='okx')art=`<g fill="${ink}">${[[4,8],[4,21],[17,8],[17,21],[42,8],[42,21],[55,1],[55,14],[55,27],[80,1],[93,14],[106,1],[80,27],[106,27]].map(([a,b])=>`<rect x="${a}" y="${b}" width="11" height="11"/>`).join('')}</g>`;
 else if(key==='adidas')art=`<g fill="${ink}"><path d="M31 24 L40 18 L51 34 H38Z M46 14 L55 8 L72 34 H59Z M61 4 L70 -2 L94 34 H81Z"/></g>`;
 else if(key==='ford')art=`<ellipse cx="60" cy="20" rx="47" ry="18" fill="#14458c" stroke="#fff" stroke-width="2"/><text x="60" y="29" fill="#fff" text-anchor="middle" font-family="serif" font-size="29" font-style="italic">Ford</text>`;
 else if(key==='eni')art=`<rect x="10" width="100" height="40" rx="3" fill="#ffd529"/><path d="M28 12 L61 12 L68 7 L76 9 L72 16 L65 18 L60 27 L56 20 L48 21 L44 29 L40 20 L34 22 L30 29 L28 20 L23 18Z" fill="#191a19"/><path d="M77 8 L83 2 L81 12Z" fill="#d9212d"/><text x="97" y="30" fill="#17191b" text-anchor="end" font-family="Arial" font-size="17" font-weight="800">eni</text>`;
 else if(key==='toyota gazoo racing')art=`<rect width="58" height="40" fill="#111"/><path d="M30 0H58V40H8Z" fill="#dc192d"/><text x="29" y="31" fill="#fff" font-size="31" font-family="Arial" font-weight="900" font-style="italic" text-anchor="middle">GR</text><text x="64" y="14" fill="${ink}" font-size="11" font-family="Arial" font-weight="800">TOYOTA</text><text x="64" y="26" fill="${ink}" font-size="9" font-family="Arial" font-weight="800">GAZOO</text><text x="64" y="37" fill="${ink}" font-size="9" font-family="Arial" font-weight="800">RACING</text>`;
 else if(key==='cash app')art=`<rect x="1" y="3" width="34" height="34" rx="8" fill="#00d64f"/><text x="18" y="29" fill="#fff" text-anchor="middle" font-family="Arial" font-size="28" font-weight="800">$</text><g transform="translate(37 5) scale(.68 .8)">${label('Cash App',ink,22)}</g>`;
 else if(key==='gm')art=`<rect x="36" width="48" height="40" rx="8" fill="#1769c7"/><text x="60" y="28" text-anchor="middle" font-family="Arial" font-size="25" font-weight="700" fill="#fff">gm</text><path d="M47 33H73" stroke="#fff" stroke-width="2"/>`;
 else art=label(name,ink,key==='visa'?31:24);
 return `<g transform="translate(${x} ${y}) scale(${w/120} ${h/40})">${art}</g>`;
}
export function badge(id,x,y,w,h,ink='#fff'){
 let art;
 if(id==='ferrari')art=`<path d="M10 4H90V64Q84 84 50 98Q16 84 10 64Z" fill="#ffdf38" stroke="#101820" stroke-width="4"/><path d="M12 7H38V16H12Z" fill="#16894c"/><path d="M38 7H64V16H38Z" fill="#fff"/><path d="M64 7H88V16H64Z" fill="#d82232"/><path d="M37 72 L39 58 L49 49 L47 38 L43 30 L48 22 L57 20 L62 27 L56 32 L57 41 L69 46 L73 40 L76 42 L73 51 L63 53 L54 50 L51 62 L61 75 L57 79 L46 68 L42 78 L32 80 L28 76Z M47 37 L36 39 L31 49 L25 44 L32 31 L44 29Z" fill="#111"/><text x="50" y="91" fill="#111" font-family="serif" font-weight="bold" font-size="12" text-anchor="middle">S F</text>`;
 else if(id==='mercedes')art=`<circle cx="50" cy="50" r="44" fill="none" stroke="${ink}" stroke-width="5"/><path d="M50 7L56 48L88 72L50 57L12 72L44 48Z" fill="${ink}"/>`;
 else if(id==='audi')art=`<g fill="none" stroke="${ink}" stroke-width="5">${[20,40,60,80].map(cx=>`<circle cx="${cx}" cy="50" r="17"/>`).join('')}</g>`;
 else if(id==='mclaren')art=`<path d="M8 68Q47 32 94 28Q85 54 67 63Q73 51 75 47Q43 51 8 68Z" fill="${ink}"/>`;
 else if(id==='aston')art=`<path d="M2 29L43 35H57L98 29L91 55L57 64H43L9 55Z" fill="none" stroke="${ink}" stroke-width="3"/>${[0,1,2,3].map(i=>`<path d="M${8+i*8} 33L${16+i*7} 56 M${92-i*8} 33L${84-i*7} 56" stroke="${ink}" stroke-width="2"/>`).join('')}<rect x="31" y="39" width="38" height="15" fill="${ink}"/><text x="50" y="49" font-size="5" font-family="Arial" font-weight="bold" text-anchor="middle" fill="#00644f">ASTON MARTIN</text>`;
 else if(id==='williams')art=`<path d="M10 23H28L40 57L49 34L58 57L71 23H90L65 78H51L48 68L44 78H30Z" fill="${ink}"/>`;
 else if(id==='alpine')art=`<path d="M12 79L49 13H64L87 79H71L54 33L39 62H67L73 75H32L29 82Z" fill="${ink}"/><path d="M41 82L79 40" stroke="${ink}" stroke-width="5"/>`;
 else if(id==='redbull'||id==='racingbulls')art=`<circle cx="50" cy="47" r="28" fill="#f5ce32"/><path id="bull" d="M7 62L12 45L24 37L32 40L39 37L43 26L47 31L46 40L39 49L33 55L27 56L25 70L20 70L21 56L15 59L11 70H6L10 55Z" fill="#e72235"/><use href="#bull" transform="translate(100) scale(-1 1)"/>`;
 else if(id==='cadillac')art=`<path d="M8 27H92L84 70L50 91L16 70Z" fill="#d6c9a0" stroke="#d0d4d5" stroke-width="4"/><path d="M15 35H85V48H15Z M20 62H80V72H20Z" fill="#a9222d"/><path d="M29 30V79H42V30Z M58 30V79H71V30Z" fill="#172b47"/><path d="M10 54H90" stroke="#12161a" stroke-width="8"/>`;
 else art=`<circle cx="50" cy="50" r="43" fill="none" stroke="${ink}" stroke-width="4"/><text x="50" y="62" text-anchor="middle" font-family="Arial" font-size="34" font-weight="900" font-style="italic" fill="${ink}">H</text>`;
 return `<g transform="translate(${x} ${y}) scale(${w/100} ${h/100})">${art}</g>`;
}
