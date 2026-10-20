import {normalize,cross,sub,mix,clamp} from './engine.js';
export const tau=Math.PI*2;
export const cubic=(a,b,c,d,t)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
export const atlasUV=(rect,u,v)=>[(rect[0]+.5+clamp(u,0,1)*(rect[2]-1))/1024,1-(rect[1]+.5+clamp(v,0,1)*(rect[3]-1))/1024];

// An authored surface is sampled once, with shared analytical/finite-difference
// normals and explicit UVs. Triangles follow the same outward winding.
export function surface(builder,point,{u=48,v=24,wrapU=false,wrapV=false,flip=false,color=[1,1,1],uv=()=>[0,0],normal=null,material=null}={}){
 const initialSurface=builder.surface;
 const grid=Array.from({length:u+1},(_,i)=>Array.from({length:v+1},(_,j)=>point(i/u,j/v)));
 const normals=grid.map((row,i)=>row.map((p,j)=>{
  if(normal)return normal(i/u,j/v);
  const prevU=wrapU?(i+u-1)%u:Math.max(0,i-1),nextU=wrapU?(i+1)%u:Math.min(u,i+1),prevV=wrapV?(j+v-1)%v:Math.max(0,j-1),nextV=wrapV?(j+1)%v:Math.min(v,j+1);
  const n=normalize(cross(sub(grid[nextU][j],grid[prevU][j]),sub(row[nextV],row[prevV])));return flip?n.map(x=>-x):n;
 }));
 const vertex=(i,j)=>builder.vertex(grid[i][j],normals[i][j],typeof color==='function'?color(i/u,j/v):color,uv(i/u,j/v,grid[i][j]));
 for(let i=0;i<u;i++)for(let j=0;j<v;j++){if(material)builder.surface=material((i+.5)/u,(j+.5)/v);for(const [a,b]of flip?[[i,j],[i+1,j+1],[i+1,j],[i,j],[i,j+1],[i+1,j+1]]:[[i,j],[i+1,j],[i+1,j+1],[i,j],[i+1,j+1],[i,j+1]])vertex(a,b);}
 builder.surface=initialSurface;return builder;
}
export function sampleSections(sections,t){const count=sections.length-1,at=clamp(t,0,1)*count,i=Math.min(count-1,Math.floor(at)),f=at-i;return sections[i].map((_,k)=>cubic(sections[Math.max(0,i-1)][k],sections[i][k],sections[i+1][k],sections[Math.min(count,i+2)][k],f));}
export function sampleLoop(points,t){const at=((t%1+1)%1)*points.length,i=Math.floor(at),f=at-i,n=points.length;return points[i].map((_,k)=>cubic(points[(i+n-1)%n][k],points[i][k],points[(i+1)%n][k],points[(i+2)%n][k],f));}
export const roundedSection=[[0,1],[.62,.98],[.94,.85],[1,.60],[.88,.23],[.55,.035],[0,0],[-.55,.035],[-.88,.23],[-1,.60],[-.94,.85],[-.62,.98]];
// Stations are [z, centreX, bottomY, topY, halfWidth]. End caps are real faces.
export function shell(builder,stations,color,{shape=roundedSection,rings=64,steps=6,uv=()=>[0,0],caps=true,material=null}={}){
 const point=(t,a)=>{const s=sampleSections(stations,t),r=sampleLoop(shape,a);return[s[1]+r[0]*s[4],mix(s[2],s[3],r[1]),s[0]];};
 surface(builder,point,{u:(stations.length-1)*steps,v:rings,wrapV:true,color,uv,flip:false,material});
 if(caps)for(const end of [0,1]){const s=sampleSections(stations,end),centre=[s[1],(s[2]+s[3])*.5,s[0]],n=[0,0,end?1:-1];for(let i=0;i<rings;i++){const a=point(end,i/rings),b=point(end,(i+1)/rings);for(const p of end?[centre,a,b]:[centre,b,a])builder.vertex(p,n,typeof color==='function'?color(end,i/rings):color,uv(end,i/rings,p));}}
 return {point};
}
export function tube(builder,points,radius,color,{sides=16,samples=points.length*4,flat=1}={}){
 const path=t=>{const a=clamp(t,0,1)*(points.length-1),i=Math.min(points.length-2,Math.floor(a)),f=a-i;return points[i].map((_,k)=>cubic(points[Math.max(0,i-1)][k],points[i][k],points[i+1][k],points[Math.min(points.length-1,i+2)][k],f));};
 const point=(t,a)=>{const p=path(t),axis=normalize(sub(path(Math.min(1,t+.0001)),path(Math.max(0,t-.0001)))),right=normalize(cross(axis,Math.abs(axis[1])>.95?[1,0,0]:[0,1,0])),up=cross(right,axis),angle=a*tau;return p.map((x,i)=>x+right[i]*Math.cos(angle)*radius+up[i]*Math.sin(angle)*radius*flat);};
 surface(builder,point,{u:samples,v:sides,wrapV:true,color});return builder;
}
// A spanwise-designed wing uses closed NACA-like airfoil sections, with a
// rounded leading edge, fine trailing edge, sweep and twist at every station.
export function airfoil(builder,stations,color,{spanSteps=48,chordSteps=24,uv=()=>[0,0]}={}){
 // [spanX, leadingZ, chord, baseY, trailingRise, camber, thicknessRatio]
 const point=(t,a)=>{const s=sampleSections(stations,t),theta=a*tau,x=(1-Math.cos(theta))*.5,upper=Math.sin(theta)>=0?1:-1,th=5*s[6]*s[2]*(.2969*Math.sqrt(x)-.126*x-.3516*x*x+.2843*x*x*x-.1036*x*x*x*x);return[s[0],s[3]+s[4]*x+s[5]*Math.sin(x*Math.PI)+upper*th,s[1]-x*s[2]];};
 surface(builder,point,{u:spanSteps,v:chordSteps*2,wrapV:true,color,uv});
 for(const end of [0,1]){const s=sampleSections(stations,end),n=[end?1:-1,0,0],centre=[s[0],s[3]+s[4]*.5,s[1]-s[2]*.5];for(let j=0;j<chordSteps*2;j++){const a=point(end,j/(chordSteps*2)),b=point(end,(j+1)/(chordSteps*2));for(const p of [centre,a,b])builder.vertex(p,n,typeof color==='function'?color(end,j/(chordSteps*2)):color,uv(end,j/(chordSteps*2),p));}}
 return builder;
}
export function panel(builder,outline,thickness,color,{uv=()=>[0,0],capSurface=builder.surface}={}){
 // Outline points run around the Y/Z plane; thickness is along X.
 const n=outline.length;for(let i=0;i<n;i++){const a=outline[i],b=outline[(i+1)%n];builder.quad([a[0]-thickness,a[1],a[2]],[b[0]-thickness,b[1],b[2]],[b[0]+thickness,b[1],b[2]],[a[0]+thickness,a[1],a[2]],color);}
 const original=builder.surface;builder.surface=capSurface;for(const side of [-1,1])for(let i=1;i<n-1;i++)for(const p of [outline[0],outline[i],outline[i+1]]){const q=[p[0]+side*thickness,p[1],p[2]];builder.vertex(q,[side,0,0],capSurface===17?[1,1,1]:color,uv(q,side));}builder.surface=original;return builder;
}
