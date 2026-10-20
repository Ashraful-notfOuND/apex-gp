import {Builder,color,matrix,mix,normalize,rotationX} from './engine.js';
import {surface,shell,tube,airfoil,panel,atlasUV,tau,sampleLoop,sampleSections} from './model-surfaces.js';
const carbon=[.052,.058,.064],rubber=[.055,.058,.062],black=[.018,.022,.027],alloy=[.38,.41,.44],white=[.94,.94,.91];
const islands={side:[0,0,1024,260],nose:[0,520,256,504],wing:[256,520,768,160],engine:[256,680,512,344],badge:[768,680,256,344]};
const podShape=[[0,1],[.55,1],[.92,.9],[1,.72],[.92,.4],[.55,.06],[0,0],[-.6,.08],[-.9,.36],[-1,.67],[-.82,.92],[-.45,1]];
function assetTexture(renderer,key,path,fallback){
 if(typeof renderer.texture!=='function')return null;
 renderer.modelTextures??=new Map();if(renderer.modelTextures.has(key))return renderer.modelTextures.get(key);
 const texture=renderer.texture([...fallback.map(v=>Math.round(v*255)),255]);renderer.modelTextures.set(key,texture);
 renderer.ready=Promise.all([renderer.ready,renderer.loadTexture(texture,path)]);return texture;
}
function palette(profile){const colors={ferrari:'#cc071e',redbull:'#07132d',mclaren:'#f47f20',mercedes:'#151c21',williams:'#1547bc',aston:'#00644f',haas:'#edecea',racingbulls:'#eceef2',alpine:'#066bc4',audi:'#c4c7c9',cadillac:'#171b20'};return {paint:color(colors[profile.id]||profile.color),accent:color(profile.accent||'#ffffff')};}
function wheel(renderer,compound,rear){
 renderer.wheelCache??=new Map();const key=compound+(rear?'-r':'-f');if(renderer.wheelCache.has(key))return renderer.wheelCache.get(key);
 const b=new Builder(5),half=(rear?.34:.28)/2;
 const sections=[[-half*.95,.225],[-half,.267],[-half*.99,.303],[-half*.91,.340],[-half*.70,.359],[-half*.32,.365],[half*.32,.365],[half*.70,.359],[half*.91,.340],[half*.99,.303],[half,.267],[half*.95,.225]];
 // Continuous revolved tyre, separate sidewall UVs and rounded slick shoulders.
 for(let j=0;j<sections.length-1;j++){
  const a=sections[j],d=sections[j+1],side=(a[0]+d[0])<0?-1:1,wall=j<3||j>7;b.surface=wall?18:5;
  surface(b,(u,v)=>{const x=mix(a[0],d[0],u),r=mix(a[1],d[1],u),angle=v*tau;return[x,Math.sin(angle)*r,Math.cos(angle)*r];},{u:1,v:96,wrapV:true,color:rubber,normal:(u,v)=>normalize([-(d[1]-a[1]),Math.sin(v*tau)*(d[0]-a[0]),Math.cos(v*tau)*(d[0]-a[0])]),uv:(u,v,p)=>[.5-side*p[2]/.73,.5+p[1]/.73]});
 }
 for(const side of [-1,1]){
  const x=side*(half*.95+.002);b.surface=10;
  // Concave wheel face, machined bead, centre-lock nut and radial cooling slots.
  surface(b,(u,v)=>{const r=.038+u*.187,a=v*tau;return[x-side*.017*(1-u*u),Math.sin(a)*r,Math.cos(a)*r];},{u:8,v:80,wrapV:true,color:(u)=>u>.9?[.29,.31,.33]:[.105,.12,.135]});
  b.surface=4;for(let k=0;k<12;k++){const a=k*tau/12,za=Math.cos(a),ya=Math.sin(a);b.rod([x+side*.001,ya*.077,za*.077],[x+side*.002,Math.sin(a+.13)*.196,Math.cos(a+.13)*.196],.0045,black,6);}
  b.surface=10;b.rod([x-side*.019,0,0],[x+side*.008,0,0],.037,[.52,.54,.54],12);b.rod([x+side*.009,0,0],[x+side*.012,0,0],.022,[.18,.2,.22],6);
  for(const r of [.223,.229])for(let k=0;k<80;k++){const a=k*tau/80,c=(k+1)*tau/80;b.quad([x,Math.sin(a)*r,Math.cos(a)*r],[x,Math.sin(c)*r,Math.cos(c)*r],[x,Math.sin(c)*(r+.002),Math.cos(c)*(r+.002)],[x,Math.sin(a)*(r+.002),Math.cos(a)*(r+.002)],[.34,.36,.37],[side,0,0]);}
  b.rod([x,.17,.105],[x+side*.01,.17,.105],.0055,[.29,.31,.32],8);
 }
 const mesh=renderer.mesh(b);mesh.livery=assetTexture(renderer,'tyre-'+compound,'assets/tyre-'+compound+'.svg',rubber);renderer.wheelCache.set(key,mesh);return mesh;
}
export function buildCar(renderer,profile){
 if(typeof profile==='string')profile={id:'custom',color:profile,accent:'#eeeeee'};
 const {paint,accent}=palette(profile),b=new Builder(3),head=new Builder(3),steering=new Builder(4),flap=new Builder(17),components=[];
 let start=0;const part=name=>{const end=b.data.length/13;components.push({name,start,count:end-start});start=end;};
 const livery=assetTexture(renderer,'car-'+profile.id,'assets/livery-'+profile.id+'.svg',paint);
 // A shallow connected floor and raised diffuser. The outer body closes onto
 // this sill; there is no open strip of daylight underneath the sidepods.
 b.surface=4;b.prism([[-.35,1.04],[-.67,.82],[-.86,.40],[-.85,-.83],[-.70,-1.61],[-.45,-2.38],[.45,-2.38],[.70,-1.61],[.85,-.83],[.86,.40],[.67,.82],[.35,1.04]],.075,.038,carbon);
 for(const side of [-1,1]){
  shell(b,[[-2.38,side*.38,.12,.35,.045],[-1.88,side*.43,.10,.27,.12],[-1.33,side*.50,.09,.16,.17],[-.45,side*.59,.09,.15,.17],[.42,side*.64,.1,.18,.15],[.88,side*.48,.11,.28,.11]],carbon,{steps:4,rings:24});
  for(let i=0;i<3;i++)panel(b,[[side*(.22+i*.15),.11,-2.41],[side*(.22+i*.15),.35,-2.40],[side*(.28+i*.13),.23,-1.84],[side*(.28+i*.13),.10,-1.6]],.006,carbon);
  tube(b,[[side*.80,.135,-1.4],[side*.86,.14,-.7],[side*.87,.16,.1],[side*.75,.21,.68]],.009,carbon,{sides:8,samples:24});
  for(let i=0;i<3;i++)panel(b,[[side*(.41+i*.105),.12,1.00],[side*(.44+i*.11),.33,.87],[side*(.49+i*.11),.27,.56],[side*(.49+i*.11),.115,.4]],.006,carbon);
 }
 part('Floor, sill and diffuser');
 // The lower survival cell is one capped shell, continuous into the nose.
 b.surface=3;shell(b,[[-1.18,0,.16,.73,.27],[-.90,0,.15,.74,.31],[-.38,0,.15,.665,.35],[.25,0,.15,.65,.33],[.75,0,.18,.64,.265],[1.14,0,.21,.57,.20],[1.62,0,.22,.47,.135],[2.15,0,.22,.365,.091],[2.50,0,.21,.29,.066]],paint,{rings:64,steps:7});
 // A UV-mapped top nose panel, flush against the crash structure.
 b.surface=17;surface(b,(u,v)=>{const z=.72+u*1.73,w=mix(.255,.067,u),y=.646-.365*u+.026*Math.sin(u*Math.PI);return[(v*2-1)*w*.92,y+.012*(1-(v*2-1)**2),z];},{u:46,v:20,color:white,uv:(u,v)=>atlasUV(islands.nose,v,u)});
 part('Monocoque and nose');
 // Rim rolls from the outside shell into a recessed carbon cockpit; the rear
 // headrest is integrated with the engine cover rather than a standing tube.
 b.surface=3;surface(b,(a,r)=>{const angle=a*tau,shape=Math.cos(angle),z=-.22+Math.sin(angle)*mix(.64,.86,r),x=Math.cos(angle)*mix(.272,.355,r),innerY=.805+Math.max(0,-Math.sin(angle))*.05-Math.max(0,Math.sin(angle))*.045,y=mix(innerY,.665,r*r);return[x,y,z];},{u:80,v:8,wrapU:true,color:paint});
 b.surface=4;surface(b,(a,t)=>{const angle=a*tau,z=-.22+Math.sin(angle)*.64,y=mix(.59,.81,t);return[Math.cos(angle)*(.272-.025*(1-t)),y,z];},{u:72,v:6,wrapU:true,color:(a,t)=>carbon.map(v=>v*(.5+t*.5)),flip:true});
 b.ellipsoid(0,.665,-.25,.25,.018,.56,black,40,12);b.ellipsoid(0,.77,-.57,.23,.12,.17,black,32,16);
 for(const side of [-1,1]){b.surface=9;b.ellipsoid(side*.19,.80,-.52,.065,.095,.15,black,24,14);b.surface=10;b.rod([side*.31,.76,.20],[side*.313,.763,.20],.008,alloy,10);}
 part('Cockpit rim and seat');
 for(const side of [-1,1]){
  const stations=[[-1.66,side*.33,.115,.36,.16],[-1.23,side*.43,.13,.49,.22],[-.71,side*.50,.15,.64,.29],[-.13,side*.52,.20,.77,.30],[.25,side*.50,.28,.80,.295],[.46,side*.47,.42,.785,.25]];
  const podUV=p=>atlasUV([0,side<0?260:0,1024,260],side>0?(.48-p[2])/2.16:(p[2]+1.68)/2.16,(.78-p[1])/.61);
  b.surface=17;const pod=shell(b,stations,paint,{caps:false,material:(u,a)=>side>0?(a>.13&&a<.4?17:3):(a>.6&&a<.87?17:3),shape:podShape,rings:64,steps:8,uv:(u,a,p)=>podUV(p)});
  surface(b,(a,t)=>{const s=sampleLoop(podShape,a),inside=[side*.475+s[0]*.18,.651+s[1]*.096,.478],outside=pod.point(1,a);return inside.map((x,k)=>mix(x,outside[k],t));},{u:64,v:8,wrapU:true,color:white,uv:(a,t,p)=>podUV(p)});
  // A small deep slot with a rolled upper lip and a shadowed radiator cavity.
  b.surface=4;const z=.475,cx=side*.475;
  b.quad([cx-.172,.652,z-.06],[cx+.172,.652,z-.06],[cx+.172,.735,z-.06],[cx-.172,.735,z-.06],black,[0,0,1]);
  for(let k=0;k<13;k++){const x=cx-.158+k*.026;b.rod([x,.656,z-.055],[x,.728,z-.055],.0025,[.08,.09,.095],5);}
  const opening=[[-.176,.651],[-.18,.709],[-.145,.744],[.145,.744],[.18,.709],[.176,.651]];
  for(let i=0;i<opening.length;i++){const a=opening[i],d=opening[(i+1)%opening.length];tube(b,[[cx+a[0],a[1],z],[cx+d[0],d[1],z]],.0085,carbon,{sides:8,samples:2});}
  b.surface=3;surface(b,(u,v)=>{const x=(u*2-1)*.205;return[cx+x,.765+.008*Math.sin(u*Math.PI)-v*.016,.465+v*.055];},{u:24,v:4,color:paint,flip:true});
  // Painted outer shoulder rolls into a compact mirror and its two mounts.
  b.surface=4;tube(b,[[side*.31,.77,.42],[side*.47,.91,.36],[side*.64,.92,.33]],.009,carbon,{sides:10,samples:15});tube(b,[[side*.52,.785,.24],[side*.63,.90,.30]],.007,carbon,{sides:8,samples:8});
  b.surface=3;shell(b,[[.255,side*.67,.883,.942,.074],[.31,side*.67,.88,.945,.115],[.41,side*.67,.89,.935,.10],[.45,side*.67,.9,.925,.071]],paint,{rings:28,steps:4});
  b.surface=8;b.ellipsoid(side*.67,.911,.252,.087,.019,.004,[.31,.38,.41],28,12);
 }
 part('Downwash sidepods, radiator mouths and mirrors');
 // Compact airbox, spine and low taper between the rear tyres.
 const engineStations=[[-2.24,0,.23,.49,.07],[-1.91,0,.19,.64,.155],[-1.52,0,.2,.83,.225],[-1.17,0,.31,1.04,.235],[-.94,0,.75,1.30,.145],[-.82,0,1.095,1.275,.115]];
 b.surface=17;shell(b,engineStations,paint,{material:(u,a)=>Math.abs(Math.sin(a*tau))>.80?17:3,rings:64,steps:7,uv:(u,a,p)=>{const s=sampleSections(engineStations,u);return atlasUV(islands.engine,p[0]>0?(-.79-p[2])/1.45:(p[2]+2.24)/1.45,(s[3]-p[1])/(s[3]-s[2]));}});
 b.surface=4;b.ellipsoid(0,1.178,-.807,.086,.069,.008,black,40,20);b.ellipsoid(0,1.178,-.797,.061,.049,.009,[.045,.05,.055],32,18);
 b.surface=3;panel(b,[[-.006,.56,-2.13],[-.006,.75,-1.96],[-.006,1.03,-1.18],[-.006,.74,-1.21]],.006,paint);
 b.surface=4;tube(b,[[-.14,1.31,-.91],[.14,1.31,-.91]],.018,carbon,{samples:2,sides:12});b.surface=3;b.box(0,1.325,-.91,.072,.018,.051,accent);
 for(const side of [-1,1])for(let i=0;i<9;i++){const z=-.80-i*.062,y=.81-i*.027;b.surface=4;tube(b,[[side*.295,y,z],[side*.49,y-.055,z-.045]],.0038,black,{sides:5,samples:2});}
 part('Engine cover, airbox and cooling');
 // Wishbones are tapered carbon links; uprights, clevises and pushrods line up
 // with the centres of the independently rotating 18-inch wheels.
 for(const side of [-1,1])for(const axle of [1.65,-1.75]){
  b.surface=4;for(const [height,outY]of [[.28,.30],[.53,.43]])for(const reach of [-.31,.28])tube(b,[[side*.22,height,axle+reach],[side*.48,mix(height,outY,.55),axle+reach*.45],[side*.755,outY,axle]],.0115,carbon,{sides:10,samples:10,flat:.55});
  tube(b,[[side*.23,.65,axle-.19],[side*.72,.32,axle+.06]],.0105,carbon,{sides:10,samples:5});tube(b,[[side*.24,.32,axle+.11],[side*.755,.35,axle+.11]],.009,carbon,{sides:10,samples:5});
  b.ellipsoid(side*.735,.36,axle,.045,.108,.10,carbon,24,16);
  b.surface=10;b.rod([side*.715,.365,axle],[side*.735,.365,axle],.155,[.23,.25,.27],40);b.surface=4;b.ellipsoid(side*.705,.39,axle-.09,.029,.084,.06,black,20,12);
  for(const y of [.30,.43]){b.surface=10;b.rod([side*.749,y,axle],[side*.762,y,axle],.014,[.35,.37,.38],10);}
 }
 part('Wishbones, pushrods and brake uprights');
 // Three sculpted front-wing elements: spooned centre, swept tips and slotted
 // trailing flaps. Their spanwise section is designed separately from the nose.
 const fw=(span,z,chord,y,rise,camber)=>[-1,-.78,-.38,0,.38,.78,1].map(t=>[t*span/2,z-Math.abs(t)**1.7*.18,chord*(1+Math.abs(t)*.08),y+Math.abs(t)**2*.035,rise*(1-Math.abs(t)*.16),camber,.075]);
 b.surface=4;airfoil(b,fw(1.88,2.61,.50,.145,.043,.012),carbon,{spanSteps:64,chordSteps:22});
 b.surface=3;airfoil(b,fw(1.86,2.25,.26,.234,.065,.016),profile.id==='ferrari'?white:paint,{spanSteps:64,chordSteps:20});
 b.surface=4;airfoil(b,fw(1.78,2.075,.17,.32,.05,.009),carbon,{spanSteps:64,chordSteps:18});
 for(const side of [-1,1]){b.surface=3;panel(b,[[side*.94,.12,2.47],[side*.94,.10,2.13],[side*.94,.17,1.88],[side*.94,.37,1.91],[side*.94,.39,2.05],[side*.94,.31,2.40]],.012,paint,{capSurface:17,uv:p=>atlasUV(islands.badge,side>0?(2.47-p[2])/.59:(p[2]-1.88)/.59,(.39-p[1])/.29)});b.surface=4;tube(b,[[side*.93,.12,2.46],[side*.95,.17,2.24],[side*.95,.19,1.94]],.011,carbon,{sides:10,samples:18});tube(b,[[side*.082,.16,2.40],[side*.083,.31,2.30]],.010,carbon,{sides:10,samples:3});}
 part('Three-element front wing');
 // Rear wing and beam plane, including endplate slots, swan-neck supports,
 // hinge pins, hydraulic actuator and an independently animated DRS flap.
 b.surface=4;airfoil(b,[[-.63,-2.10,.25,.47,.05,.025,.10],[0,-2.14,.25,.46,.05,.025,.10],[.63,-2.10,.25,.47,.05,.025,.10]],carbon,{spanSteps:36,chordSteps:16});
 for(const side of [-1,1]){panel(b,[[side*.79,.78,-2.47],[side*.79,1.17,-2.48],[side*.79,1.19,-2.14],[side*.79,1.08,-1.98],[side*.79,.83,-2.01]],.012,carbon);tube(b,[[side*.13,.44,-2.1],[side*.13,.72,-2.03],[side*.13,.96,-2.17]],.014,carbon,{sides:12,samples:16});b.surface=10;b.rod([side*.76,1.135,-2.435],[side*.8,1.135,-2.435],.015,alloy,12);b.surface=4;}
 airfoil(b,[[-.77,-2.06,.40,.91,.072,.022,.08],[0,-2.04,.43,.90,.077,.025,.08],[.77,-2.06,.40,.91,.072,.022,.08]],carbon,{spanSteps:48,chordSteps:20});
 const flapUV=(u,v)=>atlasUV(islands.wing,1-u,(1-Math.cos(v*tau))*.5);
 airfoil(flap,[[-.765,.08,.22,0,.067,.012,.075],[0,.09,.235,-.006,.073,.014,.075],[.765,.08,.22,0,.067,.012,.075]],white,{spanSteps:48,chordSteps:20,uv:flapUV});
 b.surface=10;b.rod([0,.92,-2.23],[0,1.06,-2.27],.015,[.23,.25,.27],12);b.surface=4;b.box(0,1.035,-2.28,.08,.045,.12,carbon);
 b.surface=10;b.rod([0,.52,-2.20],[0,.52,-2.41],.043,[.35,.30,.23],32,.039);b.surface=8;b.rod([0,.52,-2.412],[0,.52,-2.417],.032,black,32);b.surface=13;b.box(0,.29,-2.38,.08,.047,.019,[1,.04,.02]);
 part('Rear wing, exhaust and DRS supports');
 // A continuously swept halo with two rear mounts and one central pylon.
 b.surface=4;const halo=[];for(let i=0;i<=22;i++){const a=i/22*Math.PI;halo.push([Math.cos(a)*.33,1.13+Math.sin(a)*.018,-.61+Math.sin(a)*1.10]);}tube(b,halo,.022,carbon,{sides:18,samples:76,flat:.75});
 for(const side of [-1,1])tube(b,[[side*.33,.83,-.64],[side*.34,.99,-.62],[side*.33,1.13,-.61]],.026,carbon,{sides:16,samples:12});tube(b,[[0,.77,.76],[0,.94,.62],[0,1.148,.49]],.022,carbon,{sides:16,samples:18,flat:.74});
 part('Titanium halo');
 // Seated torso, collar, HANS support, belts, sleeves and elbows. The hands are
 // attached to the steering assembly so steering does not pull them apart.
 b.surface=9;b.ellipsoid(0,.76,-.34,.205,.13,.26,paint,32,20);b.surface=4;b.ellipsoid(0,.855,-.34,.175,.031,.18,black,32,16);
 for(const side of [-1,1]){b.surface=9;tube(b,[[side*.18,.79,-.37],[side*.27,.72,-.12],[side*.205,.78,.23]],.043,paint,{sides:16,samples:18});tube(b,[[side*.13,.845,-.52],[side*.12,.80,-.25],[side*.09,.72,-.09]],.024,[.16,.17,.16],{sides:10,samples:14,flat:.18});b.surface=10;b.box(side*.1,.77,-.27,.036,.018,.043,[.43,.45,.44]);}
 part('Driver suit, harness and arms');
 // Helmet is a sculpted shell, with a cut-looking visor band, raised seal,
 // cheek pieces, chin intake, tear-off pivots and restrained paint bands.
 const helmetSections=[[.855,.081,-.372,.102],[.884,.125,-.366,.142],[.936,.143,-.355,.163],[1.007,.146,-.36,.173],[1.081,.14,-.368,.165],[1.143,.103,-.375,.126],[1.178,.008,-.379,.012]];
 const helmetAtHeight=y=>{let lo=0,hi=1;for(let i=0;i<20;i++){const t=(lo+hi)/2;if(sampleSections(helmetSections,t)[0]<y)lo=t;else hi=t;}return sampleSections(helmetSections,(lo+hi)/2);};
 const helmetPatch=(start,span,bottom,top,lift=0)=>(u,v)=>{const a=start+u*span,y=mix(bottom,top,v),h=helmetAtHeight(y);return[Math.sin(a)*(h[1]+lift),y,h[2]+Math.cos(a)*(h[3]+lift)];};
 // The shell has a real visor aperture. Glass and its four seal strips meet
 // edge to edge, avoiding depth fighting even with a 16-bit depth buffer.
 for(const [bottom,top]of [[.855,.9905],[1.0755,1.178]])surface(head,helmetPatch(0,tau,bottom,top),{u:64,v:24,wrapU:true,color:white});
 surface(head,helmetPatch(1.34,tau-2.68,.9905,1.0755),{u:44,v:12,color:white});
 head.surface=3;for(const side of [-1,1])surface(head,(u,v)=>{const y=1.079+u*.096,h=helmetAtHeight(y),x=(v-.5)*Math.min(.034,h[1]*1.5);return[x,y,h[2]+side*(h[3]*Math.sqrt(1-(x/h[1])**2)+.003)];},{u:32,v:6,color:accent,flip:side<0});
 head.surface=4;for(const [bottom,top]of [[.9905,1.0015],[1.0645,1.0755]])surface(head,helmetPatch(-1.34,2.68,bottom,top),{u:56,v:3,color:black});
 for(const start of [-1.34,1.29])surface(head,helmetPatch(start,.05,1.0015,1.0645),{u:3,v:12,color:black});
 head.surface=8;surface(head,helmetPatch(-1.29,2.58,1.0015,1.0645),{u:56,v:12,color:[.15,.23,.27]});
 head.surface=4;head.box(0,.922,-.188,.053,.009,.003,black);for(const side of [-1,1]){head.ellipsoid(side*.143,1.02,-.32,.006,.017,.021,black,20,12);head.surface=10;head.rod([side*.148,1.03,-.31],[side*.152,1.03,-.31],.007,alloy,10);head.surface=4;}
 // Physical steering yoke, rubber grips, shift paddles and the live LCD.
 const plate=new Builder(4);plate.prism([[-.22,-.09],[.22,-.09],[.25,-.015],[.23,.10],[.14,.13],[-.14,.13],[-.23,.10],[-.25,-.015]],-.020,.04,carbon);steering.transformed(plate,rotationX(Math.PI/2));
 for(const side of [-1,1]){steering.surface=9;steering.ellipsoid(side*.214,.007,-.033,.037,.08,.035,black,28,18);steering.ellipsoid(side*.215,-.001,-.064,.043,.061,.027,paint,28,18);for(let i=0;i<4;i++)tube(steering,[[side*(.187+i*.011),-.033,-.085],[side*(.189+i*.011),.007,-.092]],.0068,white,{sides:8,samples:3});steering.surface=10;steering.box(side*.16,.025,.033,.055,.105,.012,[.24,.26,.27]);}
 steering.surface=12;steering.quad([-.115,-.018,-.024],[.115,-.018,-.024],[.115,.087,-.024],[-.115,.087,-.024],white,[0,0,-1]);
 steering.surface=3;for(let i=0;i<7;i++){steering.ellipsoid(-.15+i*.05,-.060,-.024,.012,.012,.006,[accent,[.18,.66,.39],[.82,.16,.13],white][i%4],16,12);}for(const side of [-1,1])steering.ellipsoid(side*.16,.087,-.025,.011,.011,.006,accent,16,10);
 const body=renderer.mesh(b),helmet=renderer.mesh(head),rearFlap=renderer.mesh(new Builder().transformed(flap,matrix(0,-.067,.145)));body.livery=livery;rearFlap.livery=livery;
 return {body,cockpit:body,helmet,steering:renderer.mesh(steering),rearFlap,flapOrigin:[0,1.135,-2.435],flapOpenAngle:-.34,steeringOrigin:[0,.79,.24],wheelRadius:.365,wheels:Object.fromEntries(['soft','medium','hard'].map(t=>[t,[wheel(renderer,t,false),wheel(renderer,t,true)]])),axles:[{x:.81,z:1.65},{x:.78,z:-1.75}],components,profile};
}
