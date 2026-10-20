import {Builder,matrix,color,noise,normalize,mix} from './engine.js';
import {roadClearance,roadEnvelope} from './scene-layout.js';
import {SIGN_RECTS} from './circuit-art.js';
import {atlasUV} from './model-surfaces.js';
const glyphs={A:['01110','10001','10001','11111','10001','10001','10001'],P:['11110','10001','10001','11110','10000','10000','10000'],E:['11111','10000','10000','11110','10000','10000','11111'],X:['10001','10001','01010','00100','01010','10001','10001'],G:['01111','10000','10000','10111','10001','10001','01111'],M:['10001','11011','10101','10101','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],N:['10001','11001','11001','10101','10011','10011','10001'],C:['01111','10000','10000','10000','10000','10000','01111'],0:['01110','10001','10011','10101','11001','10001','01110'],1:['00100','01100','00100','00100','00100','00100','01110'],2:['01110','10001','00001','00010','00100','01000','11111'],3:['11110','00001','00001','01110','00001','00001','11110'],4:['10010','10010','10010','11111','00010','00010','00010'],5:['11111','10000','10000','11110','00001','00001','11110'],6:['01110','10000','10000','11110','10001','10001','01110'],7:['11111','00001','00010','00100','01000','01000','01000'],8:['01110','10001','10001','01110','10001','10001','01110'],9:['01110','10001','10001','01111','00001','00001','01110']};
function lettering(text,width,col=[.93,.94,.91]){const b=new Builder(0),unit=width/(text.length*6-1);for(let k=0;k<text.length;k++){const glyph=glyphs[text[k]];if(!glyph)continue;for(let row=0;row<7;row++)for(let x=0;x<5;x++)if(glyph[row][x]==='1')b.quad([-width/2+(k*6+x)*unit,(6-row)*unit,0],[-width/2+(k*6+x+.83)*unit,(6-row)*unit,0],[-width/2+(k*6+x+.83)*unit,(6.83-row)*unit,0],[-width/2+(k*6+x)*unit,(6.83-row)*unit,0],col,[0,0,-1]);}return b;}
function insidePolygon(x,z,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function buildMonacoScene(track,renderer){
 const road=new Builder(1),details=new Builder(0),architecture=new Builder(6),props=new Builder(7),metal=new Builder(10),water=new Builder(11),ground=new Builder(14),foliage=new Builder(16),tunnel=new Builder(7),spectators=new Builder(9),fences=new Builder(15);
 const clearance=roadClearance(track),safetySegments=[],solidFootprints=[],signage=new Builder(20);
 let signTexture=null;if(typeof renderer.texture==='function'){signTexture=renderer.texture([240,238,224,255]);renderer.sceneryTexture=signTexture;renderer.ready=Promise.all([renderer.ready,renderer.loadTexture(signTexture,'assets/circuit-signs.svg')]);}
 const sign=(name,frame,w,h,bottom=0)=>{const b=new Builder(20),rect=SIGN_RECTS[name];b.texturedQuad([w/2,bottom,-.081],[-w/2,bottom,-.081],[-w/2,bottom+h,-.081],[w/2,bottom+h,-.081],[atlasUV(rect,0,1),atlasUV(rect,1,1),atlasUV(rect,1,0),atlasUV(rect,0,0)],[1,1,1],[0,0,-1]);signage.transformed(b,frame);};
 const safeProp=(x,z,w,d,heading)=>{if(!clearance.clearFootprint(x,z,w,d,heading))return false;solidFootprints.push({x,z,w,d,heading});return true;};
 const shore=Array.from({length:41},(_,i)=>{const p=track.at(1940+i*20);return [p.x+p.rx*20,p.z+p.rz*20];});
 const harbor=[...shore,[-170,460],[250,460],[290,-30]],insideHarbor=(x,z)=>insidePolygon(x,z,harbor);
 const vertex=(p,w,lift=0)=>[p.x+p.rx*w,p.y+lift,p.z+p.rz*w];
 const ribbon=(b,a,q,l,r,h,c)=>b.quad(vertex(a,l,h),vertex(q,l,h),vertex(q,r,h),vertex(a,r,h),c,[0,1,0]);
 for(let i=0;i<track.samples.length;i++){
  const p=track.samples[i],q=track.samples[(i+1)%track.samples.length];
  for(const side of [-1,1]){
   if(i%12===0){const a=vertex(p,side*5.25,.03);for(let k=0;k<5;k++)details.box(a[0],a[1]+.008,a[2]+k*.055,.13,.016,.015,[.11,.13,.14]);}
  }
  // Rubber laid down under heavy braking, scattered marbles at the edges.
  if(Math.abs(track.at(p.s+35).curvature)>.012&&Math.abs(p.curvature)<.012){for(const lane of [-1.7,-1.3,1.3,1.7])ribbon(details,p,q,lane,lane+.065,.018,[.115,.12,.125]);}
  if(i%5===0){const side=i%2?1:-1,pos=vertex(p,side*(3.8+noise(i)*1.3),.026);details.ellipsoid(...pos,.014+noise(i+9)*.025,.008,.022,[.09,.095,.10],5,3);}
 }
 const envelope=roadEnvelope(track,clearance);envelope.fill(road,5.6,[.28,.29,.31]);
 const edgeVertex=(p,w,h)=>[p.p[0]+p.nx*w,p.n.y+h,p.p[1]+p.nz*w];
 for(const [a,b]of envelope.contours(4.33))details.quad(edgeVertex(a,-.07,.025),edgeVertex(b,-.07,.025),edgeVertex(b,.07,.025),edgeVertex(a,.07,.025),[.87,.86,.80],[0,1,0]);
 for(const [a,b]of envelope.contours(4.915)){if(Math.abs(track.at(a.n.s).curvature)<.007)continue;details.quad(edgeVertex(a,-.445,.035),edgeVertex(b,-.445,.035),edgeVertex(b,.445,.035),edgeVertex(a,.445,.035),Math.floor(a.n.s/1.8)%2?[.87,.86,.81]:[.68,.08,.10],[0,1,0]);}
 const profile=[[.16,0],[.25,-.09],[.32,0],[.40,.09],[.46,0],[.54,-.09],[.61,0],[.70,.09],[.78,0],[.86,-.09]];
 let post=0;
 for(const [a,b]of envelope.contours(5.85)){
  if(!clearance.clearSegment(a.p,b.p,5.65))continue;
  safetySegments.push({type:'armco',s:a.n.s,a:a.p,b:b.p,margin:5.65});
  for(let k=0;k<profile.length-1;k++){const p=profile[k],q=profile[k+1];metal.quad(edgeVertex(a,p[1],p[0]),edgeVertex(b,p[1],p[0]),edgeVertex(b,q[1],q[0]),edgeVertex(a,q[1],q[0]),[.47,.50,.52]);}
  if(post++%12===0)metal.rod(edgeVertex(a,.17,0),edgeVertex(a,.17,.92),.033,[.33,.35,.36],6);
 }
 post=0;
 for(const [a,b]of envelope.contours(6.15)){
  if(a.n.s>1440&&a.n.s<1870||!clearance.clearSegment(a.p,b.p,5.6))continue;
  safetySegments.push({type:'fence',s:a.n.s,a:a.p,b:b.p,margin:5.6});
  if(post++%18===0){metal.rod(edgeVertex(a,0,0),edgeVertex(a,0,3.65),.025,[.23,.25,.24],8);metal.rod(edgeVertex(a,0,3.65),edgeVertex(a,-.4,4.05),.023,[.25,.27,.26],6);}
  for(const h of [1.05,3.65])metal.quad(edgeVertex(a,0,h),edgeVertex(b,0,h),edgeVertex(b,0,h+.014),edgeVertex(a,0,h+.014),[.26,.28,.27]);
  const length=Math.hypot(b.p[0]-a.p[0],b.p[1]-a.p[1]);fences.texturedQuad(edgeVertex(a,0,.95),edgeVertex(b,0,.95),edgeVertex(b,0,3.65),edgeVertex(a,0,3.65),[[a.n.s,.95],[a.n.s+length,.95],[a.n.s+length,3.65],[a.n.s,3.65]],[.18,.20,.19]);
 }
 // Facades have local UVs: four architectural families, consistent floor
 // heights, textured recesses and real balcony slabs rather than world tiling.
 function building(x,z,w,d,h,heading,index){
  const clearance=Math.hypot(w,d)*.5+7,n=track.nearest(x,z);if(n.distance<clearance||insideHarbor(x,z))return;
  const p=track.at(n.s),y=Math.min(...[-1,1].flatMap(a=>[-1,1].map(b=>track.heightAt(x+a*w*.5,z+b*d*.5))))-.6,frame=matrix(x,y,z,heading),style=index%4,b=new Builder(6+style*.1),trim=new Builder(7),iron=new Builder(10),palette=[[.88,.87,.81],[.91,.82,.75],[.86,.85,.80],[.87,.88,.85]],c=palette[style];
  const wall=(a,q,r,t,width)=>b.texturedQuad(a,q,r,t,[[0,0],[width/12,0],[width/12,h/14],[0,h/14]],c);
  wall([-w/2,0,-d/2],[w/2,0,-d/2],[w/2,h,-d/2],[-w/2,h,-d/2],w);
  wall([w/2,0,d/2],[-w/2,0,d/2],[-w/2,h,d/2],[w/2,h,d/2],w);
  wall([-w/2,0,d/2],[-w/2,0,-d/2],[-w/2,h,-d/2],[-w/2,h,d/2],d);
  wall([w/2,0,-d/2],[w/2,0,d/2],[w/2,h,d/2],[w/2,h,-d/2],d);
  trim.box(0,h,0,w,.25,d,[.69,.67,.61]);trim.box(0,.24,0,w+.5,.48,d+.5,[.52,.50,.45]);
  if(style<2){trim.box(0,h+.18,0,w+1,.4,d+1,[.82,.79,.71]);trim.box(0,h+.63,0,w+.45,.5,d+.45,[.73,.70,.62]);const roof=new Builder(0);roof.prism([[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]],h+.9,.25,[.47,.30,.23]);props.transformed(roof,frame);for(const xx of [-w*.3,w*.27])trim.box(xx,h+1.4,0,1.1,1.8,1,[.67,.59,.46]);}
  else{for(const side of [-1,1]){trim.box(0,h+.60,side*d/2,w,.85,.15,[.78,.77,.72]);trim.box(side*w/2,h+.60,0,.15,.85,d,[.78,.77,.72]);}trim.box(w*.2,h+.7,0,w*.36,1.3,d*.45,[.65,.65,.60]);for(let k=0;k<3;k++){trim.box(-w*.23+k*1.5,h+.48,d*.2,1,.7,1.4,[.56,.58,.57]);iron.rod([-w*.23+k*1.5,h+.85,d*.2],[-w*.23+k*1.5,h+.87,d*.2],.35,[.28,.31,.30],12);}}
  for(let floor=3.5;floor<h-.6;floor+=3.5){
   if(style<2)trim.box(0,floor-.08,0,w+.23,.12,d+.23,[.80,.78,.72]);
   if(n.distance<67)for(let col=-w/2+1.5;col<w/2-1;col+=3){for(const side of [-1,1]){const zz=side*(d/2+.42),balcony=style===2||((Math.round(col*2)+Math.round(floor))%3===0);if(!balcony)continue;
    trim.box(col,floor-.10,zz,2.5,.17,.9,[.75,.73,.67]);for(const x0 of [-1.15,0,1.15])iron.rod([col+x0,floor,zz+side*.40],[col+x0,floor+.89,zz+side*.40],.012,[.15,.18,.17],5);iron.rod([col-1.15,floor+.9,zz+side*.4],[col+1.15,floor+.9,zz+side*.4],.014,[.20,.22,.21],6);
    if(style===2){iron.surface=8;iron.box(col,floor+.43,zz+side*.39,2.3,.78,.025,[.16,.24,.25]);iron.surface=10;}
    if((index+Math.round(col))%5===0){trim.box(col+.6,floor+.15,zz,.6,.3,.38,[.44,.32,.23]);const plant=new Builder(16);plant.ellipsoid(col+.6,floor+.45,zz,.36,.31,.27,[.14,.25,.12],10,8);props.transformed(plant,frame);}
   }}
  }
  for(let col=-w/2+2;col<w/2-1;col+=4){trim.surface=8;trim.box(col,1.45,-d/2-.03,2.6,2.7,.06,[.13,.18,.18]);trim.surface=7;trim.box(col,2.95,-d/2-.08,2.9,.15,.2,[.72,.69,.61]);const awning=new Builder(9);awning.quad([col-1.5,2.9,-d/2-.1],[col+1.5,2.9,-d/2-.1],[col+1.5,2.45,-d/2-1.4],[col-1.5,2.45,-d/2-1.4],index%3?[.13,.26,.20]:[.43,.14,.12]);props.transformed(awning,frame);}
  if(n.distance<70&&index%3===0){const side=n.offset>0?1:-1;sign(['cafe','hotel','casino'][index%5%3],matrix(x-Math.cos(heading)*side*(w/2+.06),y,z+Math.sin(heading)*side*(w/2+.06),heading+side*Math.PI/2),Math.min(d*.72,12),1.2,3.2);}
  architecture.transformed(b,frame);props.transformed(trim,frame);metal.transformed(iron,frame);
 }
 let buildingIndex=0;
 for(let s=0;s<track.length;s+=34){const p=track.at(s);for(const side of [-1,1]){if((s>1900&&s<2750&&side>0)||(s>1440&&s<1870))continue;const d=13+noise(s+side+10)*9,w=20+noise(s+27)*11,style=buildingIndex%4,h=style<2?14+Math.floor(noise(s+8)*5)*3.5:24.5+Math.floor(noise(s+8)*9)*3.5,offset=side*(23+d/2);building(p.x+p.rx*offset,p.z+p.rz*offset,w,d,h,p.heading,buildingIndex++);}}
 for(let i=0;i<100;i++){const x=(noise(i+22)-.5)*1280,z=(noise(i+399)-.5)*1500;if(track.nearest(x,z).distance<65)continue;building(x,z,16+noise(i+1)*17,17+noise(i+3)*18,14+Math.floor(noise(i+7)*17)*3.5,noise(i+11)*.6,i+400);}
 // Casino-inspired classical frontage and the Fairmont terraces provide distinct landmarks.
 for(const s of [815,1210]){const p=track.at(s),side=s===815?1:-1;let offset=null;for(const d of [48,70,95,125])if(track.nearest(p.x+p.rx*side*d,p.z+p.rz*side*d).distance>40&&!insideHarbor(p.x+p.rx*side*d,p.z+p.rz*side*d)){offset=side*d;break;}if(offset===null)continue;const b=new Builder(7);b.box(0,12,0,48,24,22,[.8,.76,.65]);for(const x of [-21,-12,0,12,21]){b.rod([x,0,-12],[x,22,-12],.75,[.83,.79,.7],16);b.box(x,22.4,-12,2.5,.55,2.3,[.86,.82,.73]);}b.box(0,25,0,53,2,24,[.68,.63,.53]);b.ellipsoid(0,28,0,8,6,8,[.49,.57,.51],24,12);props.transformed(b,matrix(p.x+p.rx*offset,p.y,p.z+p.rz*offset,p.heading));}
 // Enclosed tunnel with ribbed structure, lamps and bright exit.
 for(let s=1440;s<1870;s+=7.2){const p=track.at(s),frame=matrix(p.x,p.y,p.z,p.heading),b=new Builder(14);if(safeProp(p.x+p.rx*7,p.z+p.rz*7,.6,7.6,p.heading))b.box(7.0,2.6,0,.6,5.4,7.6,[.59,.60,.58]);b.box(0,5.4,0,15.0,.55,7.6,[.62,.63,.60]);if(safeProp(p.x-p.rx*7,p.z-p.rz*7,.75,7.6,p.heading)){b.box(-7.0,.55,0,.65,1.1,7.6,[.57,.58,.55]);b.box(-7.0,2.65,0,.75,5.3,.65,[.58,.59,.56]);}b.surface=10;b.box(0,5.08,0,14.2,.12,.16,[.23,.25,.24]);for(const x of [-3.8,3.8]){b.box(x,5.09,0,.3,.12,2.3,[.18,.20,.19]);b.surface=13;b.box(x,5.02,0,.24,.04,2.2,[1,.95,.80]);b.surface=10;}tunnel.transformed(b,frame);}

 // Solid sidewalks and landscape; the harbor opening is physically cut out of the terrain.
 const terrainTile=(x,z,size)=>{const corners=[[x,z],[x+size,z],[x+size,z+size],[x,z+size]],wet=corners.map(([a,b])=>insideHarbor(a,b));if(wet.every(Boolean))return;if(size>4&&wet.some(Boolean)){for(let i=0;i<2;i++)for(let j=0;j<2;j++)terrainTile(x+i*size/2,z+j*size/2,size/2);return;}if(insideHarbor(x+size/2,z+size/2))return;const height=(a,b)=>track.heightAt(a,b)-.4;ground.quad(...corners.map(([a,b])=>[a,height(a,b),b]),[.59,.58,.53],[0,1,0]);};
 for(let x=-950;x<1000;x+=32)for(let z=-1000;z<1000;z+=32)terrainTile(x,z,32);
 const basin=[20,1.2,220];for(let i=0;i<harbor.length;i++){const a=harbor[i],b=harbor[(i+1)%harbor.length];water.triangle(basin,[a[0],1.2,a[1]],[b[0],1.2,b[1]],[.10,.29,.34],[0,1,0]);}
 // A close stone quay makes the basin visible from the driving cameras.
 for(let i=0;i<shore.length-1;i++){const a=shore[i],b=shore[i+1],p=track.at(1940+i*20),q=track.at(1960+i*20);ground.quad([a[0],.9,a[1]],[b[0],.9,b[1]],[b[0],q.y-.25,b[1]],[a[0],p.y-.25,a[1]],[.47,.46,.42]);metal.rod([a[0],p.y-.2,a[1]],[a[0],p.y+.6,a[1]],.065,[.24,.27,.26],10);metal.rod([a[0],p.y+.57,a[1]],[b[0],q.y+.57,b[1]],.025,[.28,.31,.30],8);}
 for(let i=0;i<22;i++){const x=-136+(i%6)*57,z=110+Math.floor(i/6)*94,b=new Builder(3);const length=21+noise(i+41)*15;b.loft([[-length/2,0,.9,2.7,.7],[length*.1,0,1.0,4.5,1.],[length*.39,0,1.1,2.7,.85],[length*.5,0,.95,.08,.12]],[.87,.88,.85],24);b.loft([[-length*.34,0,2.6,2.5,1.0],[length*.12,0,2.6,2.7,.85],[length*.28,0,2.2,1.2,.3]],[.91,.9,.85],20);b.surface=8;b.box(0,3.35,-3,4.3,.65,7,[.13,.21,.25]);b.surface=3;b.box(0,4.05,-3,5,.15,8,[.9,.89,.83]);b.surface=10;b.rod([0,4,-4],[0,10,-4],.055,[.47,.49,.52],8);for(const side of [-1,1])b.rod([side*3,1.8,-length*.3],[side*3,1.8,length*.25],.023,[.7,.72,.73],6);props.transformed(b,matrix(x,1.2,z,.15+noise(i)*.1));}
 // Harbor promenade, palms, street lighting and safety staff.
 for(let s=0;s<3337;s+=47){const p=track.at(s),side=s%94===0?1:-1,point=vertex(p,side*10.5);if(track.nearest(point[0],point[2]).distance<9)continue;const b=new Builder(10);b.rod([0,0,0],[0,7.8,0],.045,[.27,.29,.28],10);b.rod([0,7.8,0],[0,8.1,1.8],.035,[.27,.29,.28],8);b.box(0,8.08,1.8,.35,.1,.8,[.53,.56,.54]);metal.transformed(b,matrix(point[0],p.y,point[2],p.heading));if(s%141===0){const person=new Builder(9);person.rod([0,.6,0],[0,1.28,0],.15,[.94,.30,.08],8);person.ellipsoid(0,1.50,0,.11,.135,.11,[.59,.4,.27],12,8);person.box(0,1.62,0,.25,.06,.25,[.87,.86,.75]);for(const x of [-.08,.08])person.rod([x,.65,0],[x,.08,.01],.055,[.23,.25,.27],6);spectators.transformed(person,matrix(point[0]+1,p.y,point[2],p.heading));}}
 // Feathered palm fronds have curved stems and narrow paired leaflets rather
 // than large floating triangles. A tapered, segmented trunk carries bark rings.
 for(let i=0;i<80;i++){
  const s=i*41.2,p=track.at(s),side=i%2?1:-1,offset=side*(13+noise(i)*5),x=p.x+p.rx*offset,z=p.z+p.rz*offset;
  if(track.nearest(x,z).distance<10||insideHarbor(x,z))continue;
  const height=6+noise(i+3)*4,y=track.heightAt(x,z)-.35,trunk=t=>[x+.28*t*t,y+height*t,z+.11*t];
  for(let j=0;j<12;j++){const t=j/12,a=trunk(t),b=trunk((j+1)/12);props.rod(a,b,.15-t*.06,[.39+t*.04,.32+t*.03,.22],12,.15-(j+1)/12*.06);if(j%2===0)props.rod(a,[a[0],a[1]+.035,a[2]],.155-t*.06,[.26,.23,.17],12);}
  const crown=trunk(1);
  for(let k=0;k<10;k++){
   const angle=k/10*Math.PI*2+noise(i)*.4,dir=[Math.sin(angle),Math.cos(angle)],right=[dir[1],-dir[0]],length=2.6+noise(k+i*10)*.8;
   const stem=t=>[crown[0]+dir[0]*t*length,crown[1]+Math.sin(t*Math.PI)*.60-t*t*1.48,crown[2]+dir[1]*t*length];
   for(let j=0;j<17;j++){const t=j/17,a=stem(t),b=stem((j+1)/17);foliage.rod(a,b,.013*(1-t)+.003,[.27,.35,.15],5,.013*(1-(j+1)/17)+.003);if(j<2)continue;
    for(const lr of [-1,1]){const reach=(.75*Math.sin(t*Math.PI)**.65+.04)*(1-t*.3),base=stem(t+.018),tip=[a[0]+right[0]*reach*lr+dir[0]*.33,a[1]-.12-reach*.17,a[2]+right[1]*reach*lr+dir[1]*.33],w=.035*(1-t*.5);foliage.quad([a[0]-dir[0]*w,a[1],a[2]-dir[1]*w],[base[0]+dir[0]*w,base[1],base[2]+dir[1]*w],[tip[0]+dir[0]*.006,tip[1],tip[2]+dir[1]*.006],[tip[0]-dir[0]*.006,tip[1]-.01,tip[2]-dir[1]*.006],[.13+noise(k+i)*.055,.24+noise(k+i)*.07,.085],[0,.9*lr,.1]);}
   }
  }
 }
 // Drain covers, repair seams, concrete planter beds and planted town slopes.
 for(let s=39;s<track.length;s+=137){const p=track.at(s),b=new Builder(10);b.rod([0,.022,0],[0,.028,0],.29,[.16,.18,.18],24);for(let k=-2;k<=2;k++)b.box(k*.07,.031,0,.012,.004,.39,[.075,.09,.085]);metal.transformed(b,matrix(p.x+p.rx*2.7,p.y,p.z+p.rz*2.7,p.heading));}
 for(let i=0;i<110;i++){const p=track.at(i*30.1),side=i%2?1:-1,x=p.x+p.rx*side*(11+noise(i+8)*8),z=p.z+p.rz*side*(11+noise(i+8)*8);if(track.nearest(x,z).distance<10||insideHarbor(x,z))continue;const h=.55+noise(i)*.5;ground.box(x,p.y+.18,z,3.8,.5,1.4,[.55,.53,.47]);foliage.ellipsoid(x,p.y+.55+h*.3,z,1.8,h,.60,[.17+noise(i)*.05,.29+noise(i)*.05,.13],14,8);}
 // Grandstands and crowds at the harbor, placed outside the drivable ribbon.
 for(const s of [2090,2290,2520]){const p=track.at(s),side=-1,offset=[27,38,49].find(d=>clearance.clearFootprint(p.x+p.rx*side*d+p.tx*3.75,p.z+p.rz*side*d+p.tz*3.75,26.3,9,p.heading));if(offset===undefined||!safeProp(p.x+p.rx*side*offset+p.tx*3.75,p.z+p.rz*side*offset+p.tz*3.75,26.3,9,p.heading))continue;const frame=matrix(p.x+p.rx*side*offset,p.y,p.z+p.rz*side*offset,p.heading),b=new Builder(10),crowd=new Builder(9);for(let row=0;row<6;row++){b.box(0,row*.72+.4,row*1.5,26,.22,1.5,[.43,.47,.5]);for(let seat=0;seat<22;seat++){const x=-12.5+seat*1.18,y=row*.72+.65,z=row*1.5,c=[[.24,.30,.38],[.78,.23,.19],[.7,.69,.61],[.16,.32,.32]][(row+seat)%4];b.box(x,y,z,.66,.55,.7,[.36,.41,.44]);if(noise(s+row*22+seat)>.15){crowd.rod([x,y+.1,z],[x,y+.65,z],.13,c,6);crowd.ellipsoid(x,y+.88,z,.105,.13,.1,[.71,.51,.36],8,6);}}}for(const x of [-13,13])b.rod([x,0,0],[x,5.8,8],.08,[.47,.49,.52],6);metal.transformed(b,frame);spectators.transformed(crowd,frame);}
 // Distance boards and restrained circuit advertising, all outside the Armco.
 for(const turn of [245,810,1060,1270,1940,2470,2810,3150])for(const d of [50,100,150]){const p=track.at(turn-d);if(!safeProp(p.x+p.rx*6.35,p.z+p.rz*6.35,1,.12,p.heading))continue;const b=new Builder(0);b.box(0,1.65,0,1.0,1.1,.08,[.91,.9,.84]);b.transformed(lettering(String(d),.78,[.065,.08,.095]),matrix(0,1.40,-.05));props.transformed(b,matrix(p.x+p.rx*6.35,p.y,p.z+p.rz*6.35,p.heading));}
 for(let s=0;s<3337;s+=52){const p=track.at(s),side=Math.floor(s/52)%3===0?-1:1,x=p.x+p.rx*side*6.65,z=p.z+p.rz*side*6.65,heading=p.heading+side*Math.PI/2;if(p.s>1430&&p.s<1890||!safeProp(x,z,7.2,.2,heading))continue;
  const frame=matrix(x,p.y,z,heading),b=new Builder(14),name=['pirelli','monaco','tag','aramco','dhl','event'][Math.floor(s/52)%6];b.box(0,1.58,0,7.2,1.36,.15,[.22,.25,.24]);props.transformed(b,frame);sign(name,frame,7.18,1.33,.915);
 }
 // Monaco flags and small wayfinding signs sit behind the safety corridor.
 for(let s=60;s<3337;s+=171){const p=track.at(s),side=Math.floor(s/171)%2?1:-1,x=p.x+p.rx*side*8.7,z=p.z+p.rz*side*8.7;if(p.s>1400&&p.s<1900||!safeProp(x,z,2,.6,p.heading))continue;const frame=matrix(x,p.y,z,p.heading),b=new Builder(10);b.rod([0,0,0],[0,5.9,0],.035,[.58,.60,.59],8);for(let strip=0;strip<8;strip++){const a=strip/8,d=(strip+1)/8,za=Math.sin(a*7+s)*.13,zd=Math.sin(d*7+s)*.13;for(let row=0;row<2;row++)b.quad([a*1.8,5.8-row*.55,za],[d*1.8,5.8-row*.55,zd],[d*1.8,5.25-row*.55,zd],[a*1.8,5.25-row*.55,za],row?[.95,.94,.89]:[.73,.07,.12]);}metal.transformed(b,frame);if(Math.floor(s/171)%3===0)sign('marshals',matrix(x,p.y,z,p.heading+side*Math.PI/2),1.6,.4,1.6);}
 for(const [s,name]of [[1080,'sector2'],[2200,'sector3'],[3250,'sector1'],[90,'pit'],[180,'exit']]){const p=track.at(s),x=p.x-p.rx*7,z=p.z-p.rz*7,heading=p.heading-Math.PI/2;if(safeProp(x,z,3.4,.2,heading))sign(name,matrix(x,p.y,z,heading),3.4,.85,2.2);}

 // Timing line and the main-straight pit wall, garage openings and gantry.
 for(let row=0;row<2;row++)for(let col=0;col<18;col++)ribbon(details,track.at(row*.5),track.at((row+1)*.5),-4.5+col*.5,-4+col*.5,.045,(row+col)%2?[.08,.09,.10]:[.93,.93,.88]);
 const start=track.at(0),gantry=new Builder(10);for(const x of [-7.5,7.5])gantry.box(x,4.5,0,.28,9,.28,[.47,.49,.52]);gantry.box(0,8.2,0,15,1.3,.6,[.09,.1,.12]);gantry.transformed(lettering('APEX GP',5.4),matrix(0,7.93,-.32));props.transformed(gantry,matrix(start.x,start.y,start.z,start.heading));
 for(let s=20;s<220;s+=18){const p=track.at(s);if(!safeProp(p.x+p.rx*22,p.z+p.rz*22,10.3,15.2,p.heading))continue;const b=new Builder(7);b.box(0,2.5,0,10,5,15,[.73,.72,.67]);b.surface=8;b.box(-5.01,1.6,0,.08,2.8,11,[.10,.13,.16]);b.surface=3;b.box(-5.08,3.9,0,.1,.35,14,[.65,.1,.13]);props.transformed(b,matrix(p.x+p.rx*22,p.y,p.z+p.rz*22,p.heading));}
 const cells=new Map();
 for(const builder of [ground,water,road,details,architecture,props,metal,foliage,spectators,tunnel,fences,signage]){const data=builder.data;for(let i=0;i<data.length;i+=39){const x=(data[i]+data[i+13]+data[i+26])/3,z=(data[i+2]+data[i+15]+data[i+28])/3,key=(builder===fences?'f:':builder===signage?'s:':'o:')+Math.floor(x/96)+','+Math.floor(z/96);let cell=cells.get(key);if(!cell){cell={builder:new Builder(0),minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity,transparent:builder===fences,signage:builder===signage};cells.set(key,cell);}for(let k=0;k<39;k++)cell.builder.data.push(data[i+k]);for(let k=0;k<39;k+=13){cell.minX=Math.min(cell.minX,data[i+k]);cell.maxX=Math.max(cell.maxX,data[i+k]);cell.minZ=Math.min(cell.minZ,data[i+k+2]);cell.maxZ=Math.max(cell.maxZ,data[i+k+2]);}}}
 const meshes=[...cells.values()].map(c=>{const mesh=renderer.mesh(c.builder);mesh.transparent=c.transparent;if(c.signage)mesh.livery=signTexture;mesh.bounds={x:(c.minX+c.maxX)/2,z:(c.minZ+c.maxZ)/2,radius:Math.hypot(c.maxX-c.minX,c.maxZ-c.minZ)/2};return mesh;});
 track.meshes=meshes;track.shadowCasters=meshes.filter(m=>!m.transparent);track.safetySegments=safetySegments;track.solidFootprints=solidFootprints;return track;
}
