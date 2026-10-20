import {Builder,clamp,mix,mod,noise,color,matrix} from './engine.js';
import {buildMonacoScene} from './scenery.js';
import {coordinates} from './monaco-data.js';
export const HALF_WIDTH=4.3;
export const BARRIER=5.5;
const origin=[7.4258,43.737];
let points=coordinates.map(([lng,lat])=>[(lng-origin[0])*111320*Math.cos(origin[1]*Math.PI/180),-(lat-origin[1])*111320]);
const pivot=117;points=[...points.slice(pivot),...points.slice(0,pivot)];
const total=points.reduce((s,p,i)=>s+Math.hypot(p[0]-points[(i+1)%points.length][0],p[1]-points[(i+1)%points.length][1]),0);
const scale=3337/total;points=points.map(p=>p.map(v=>v*scale));
export const elevation=(x,z)=>4+40*Math.exp(-((x-240*scale)**2+(z+410*scale)**2)/55000);
function catmull(a,b,c,d,t){return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)}
export class Track {
 constructor(){
  this.samples=[];let s=0,last=null;
  for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],steps=Math.max(4,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/1.4));
   for(let j=0;j<steps;j++){const p=[0,0];for(let k=0;k<2;k++)p[k]=catmull(points[mod(i-1,points.length)][k],a[k],b[k],points[(i+2)%points.length][k],j/steps);if(last)s+=Math.hypot(p[0]-last.x,p[1]-last.z);const v={x:p[0],z:p[1],y:elevation(...p),s};this.samples.push(v);last=v;}}
  const rawLength=s+Math.hypot(last.x-this.samples[0].x,last.z-this.samples[0].z);this.length=3337;
  // Keep the official lap length while maintaining an arc-length coordinate.
  const factor=3337/rawLength;for(const p of this.samples){p.x*=factor;p.z*=factor;p.s*=factor;p.y=elevation(p.x,p.z);}
  const n=this.samples.length;
  for(let i=0;i<n;i++){const p=this.samples[i],a=this.samples[mod(i-1,n)],b=this.samples[(i+1)%n],l=Math.hypot(b.x-a.x,b.z-a.z);p.tx=(b.x-a.x)/l;p.tz=(b.z-a.z)/l;p.rx=p.tz;p.rz=-p.tx;p.heading=Math.atan2(p.tx,p.tz);}
  for(let i=0;i<n;i++){const p=this.samples[i],a=this.samples[mod(i-3,n)],b=this.samples[(i+3)%n];p.curvature=Math.atan2(Math.sin(b.heading-a.heading),Math.cos(b.heading-a.heading))/(mod(b.s-a.s,this.length)||1);}
  this.meshes=[];
 }
 at(s){s=mod(s,this.length);let lo=0,hi=this.samples.length-1;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(this.samples[m].s<=s)lo=m;else hi=m-1;}const a=this.samples[lo],b=this.samples[(lo+1)%this.samples.length],d=mod(b.s-a.s,this.length),t=(s-a.s)/(d||1),tx=mix(a.tx,b.tx,t),tz=mix(a.tz,b.tz,t),l=Math.hypot(tx,tz)||1;return{x:mix(a.x,b.x,t),y:mix(a.y,b.y,t),z:mix(a.z,b.z,t),tx:tx/l,tz:tz/l,rx:tz/l,rz:-tx/l,heading:Math.atan2(tx,tz),curvature:mix(a.curvature,b.curvature,t),s};}
 nearest(x,z,hint=null){let best=Infinity,index=0;const n=this.samples.length,visit=i=>{i=mod(i,n);const p=this.samples[i],d=(p.x-x)**2+(p.z-z)**2;if(d<best){best=d;index=i;}};if(hint!==null){for(let d=-20;d<=20;d++)visit(hint+d);if(best>40**2)for(let i=0;i<n;i++)visit(i);}else for(let i=0;i<n;i++)visit(i);const p=this.samples[index],along=(x-p.x)*p.tx+(z-p.z)*p.tz,a=this.at(p.s+along);return{...a,index,offset:(x-a.x)*a.rx+(z-a.z)*a.rz,distance:Math.sqrt(best)};}
 safeSpeed(s){let k=0;for(let d=0;d<=25;d+=5)k=Math.max(k,Math.abs(this.at(s+d).curvature));return clamp(Math.sqrt(16/Math.max(k,.0015)),11,83);}

 sector(s){return Math.min(2,Math.floor(mod(s,this.length)/this.length*3));}
 corner(s){const names=['START / FINISH','SAINTE DÉVOTE','BEAU RIVAGE','MASSENET','CASINO','MIRABEAU','FAIRMONT HAIRPIN','PORTIER','TUNNEL','NOUVELLE CHICANE','TABAC','SWIMMING POOL','LA RASCASSE','ANTHONY NOGHÈS'];const cuts=[0,220,340,640,790,920,1100,1270,1430,1940,2210,2390,2770,3060];let i=cuts.findLastIndex(v=>mod(s,this.length)>=v);return names[Math.max(0,i)];}
 heightAt(x,z){return elevation(x,z);}
 build(renderer){return buildMonacoScene(this,renderer);}
}

export {buildCar} from './car-model.js';
