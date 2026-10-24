export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const mix = (a, b, t) => a + (b - a) * t;
export const mod = (x, n) => ((x % n) + n) % n;
export const length = a => Math.hypot(...a);
export const sub = (a,b) => a.map((v,i)=>v-b[i]);
export const dot = (a,b) => a.reduce((s,v,i)=>s+v*b[i],0);
export const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const normalize = a => {const l=length(a)||1;return a.map(v=>v/l)};
export const color = hex => {const n=parseInt(hex.replace('#',''),16);return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]};
export const noise = n => {const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
export function matrix(x=0,y=0,z=0,yaw=0,sx=1,sy=sx,sz=sx){const c=Math.cos(yaw),s=Math.sin(yaw);return new Float32Array([c*sx,0,-s*sx,0,0,sy,0,0,s*sz,0,c*sz,0,x,y,z,1])}
export function rotationX(a){const c=Math.cos(a),s=Math.sin(a);return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1])}
export function rotationZ(a){const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1])}
export function multiply(a,b){const r=new Float32Array(16);for(let c=0;c<4;c++)for(let row=0;row<4;row++)for(let i=0;i<4;i++)r[c*4+row]+=a[i*4+row]*b[c*4+i];return r}
export function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0])}
export function lookAt(eye,target){const z=normalize(sub(eye,target)),x=normalize(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1])}

export class Builder{
 constructor(surface=-1){this.data=[];this.surface=surface;}
 triangle(a,b,c,col=[1,1,1],normal=null){const n=normal||normalize(cross(sub(b,a),sub(c,a)));for(const p of[a,b,c])this.data.push(...p,...n,col[0],col[1],col[2],col[3]??1,this.surface,0,0);return this}
 quad(a,b,c,d,col,n=null){this.triangle(a,b,c,col,n);this.triangle(a,c,d,col,n);return this}
 box(x,y,z,w,h,d,c){const a=x-w/2,b=x+w/2,l=y-h/2,u=y+h/2,f=z-d/2,r=z+d/2;
  this.quad([a,l,r],[b,l,r],[b,u,r],[a,u,r],c,[0,0,1]);this.quad([b,l,f],[a,l,f],[a,u,f],[b,u,f],c,[0,0,-1]);this.quad([a,l,f],[a,l,r],[a,u,r],[a,u,f],c,[-1,0,0]);this.quad([b,l,r],[b,l,f],[b,u,f],[b,u,r],c,[1,0,0]);this.quad([a,u,r],[b,u,r],[b,u,f],[a,u,f],c,[0,1,0]);this.quad([a,l,f],[b,l,f],[b,l,r],[a,l,r],c,[0,-1,0]);return this}
 rod(a,b,r,c,sides=8,endRadius=r){const axis=normalize(sub(b,a)),u=normalize(cross(axis,Math.abs(axis[1])>.9?[1,0,0]:[0,1,0])),v=cross(axis,u);for(let i=0;i<sides;i++){const t=i/sides*Math.PI*2,q=(i+1)/sides*Math.PI*2,nt=u.map((n,j)=>n*Math.cos(t)+v[j]*Math.sin(t)),nq=u.map((n,j)=>n*Math.cos(q)+v[j]*Math.sin(q)),p=a.map((n,j)=>n+nt[j]*r),p2=a.map((n,j)=>n+nq[j]*r),p3=b.map((n,j)=>n+nq[j]*endRadius),p4=b.map((n,j)=>n+nt[j]*endRadius);this.quad(p,p2,p3,p4,c,normalize(nt.map((n,j)=>n+nq[j])));this.triangle(a,p2,p,c,axis.map(n=>-n));this.triangle(b,p4,p3,c,axis)}return this}
 prism(points,y,h,c){for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];this.quad([a[0],y,a[1]],[b[0],y,b[1]],[b[0],y+h,b[1]],[a[0],y+h,a[1]],c,normalize([b[1]-a[1],0,a[0]-b[0]]));if(i>0&&i<points.length-1){this.triangle([points[0][0],y+h,points[0][1]],[a[0],y+h,a[1]],[b[0],y+h,b[1]],c,[0,1,0]);this.triangle([points[0][0],y,points[0][1]],[b[0],y,b[1]],[a[0],y,a[1]],c,[0,-1,0])}}return this}
 vertex(p,n,c,uv=[0,0]){this.data.push(...p,...n,c[0],c[1],c[2],c[3]??1,this.surface,...uv);return this;}
 smooth(a,b,c,na,nb,nc,col){this.vertex(a,na,col);this.vertex(b,nb,col);this.vertex(c,nc,col);return this;}
 ellipsoid(x,y,z,rx,ry,rz,c,segments=28,rings=16){
  const point=(u,v)=>{const n=[Math.sin(v)*Math.cos(u),Math.cos(v),Math.sin(v)*Math.sin(u)];return {p:[x+n[0]*rx,y+n[1]*ry,z+n[2]*rz],n:normalize([n[0]/rx,n[1]/ry,n[2]/rz])};};
  for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const a=point(i/segments*Math.PI*2,j/rings*Math.PI),b=point((i+1)/segments*Math.PI*2,j/rings*Math.PI),d=point(i/segments*Math.PI*2,(j+1)/rings*Math.PI),e=point((i+1)/segments*Math.PI*2,(j+1)/rings*Math.PI);this.smooth(a.p,b.p,e.p,a.n,b.n,e.n,c);this.smooth(a.p,e.p,d.p,a.n,e.n,d.n,c);}return this;
 }
 tube(points,r,c,sides=12){for(let i=1;i<points.length;i++)this.rod(points[i-1],points[i],r,c,sides);return this;}
 loft(stations,c,sides=32){
  const pt=(s,t)=>[s[1]+Math.cos(t)*s[3],s[2]+Math.sin(t)*s[4],s[0]];
  const norm=(index,t)=>{const s=stations[index],prev=stations[Math.max(0,index-1)],next=stations[Math.min(stations.length-1,index+1)],dz=next[0]-prev[0]||1,dx=(next[1]-prev[1])/dz,dy=(next[2]-prev[2])/dz,drx=(next[3]-prev[3])/dz,dry=(next[4]-prev[4])/dz,nx=Math.cos(t)/Math.max(.01,s[3]),ny=Math.sin(t)/Math.max(.01,s[4]);return normalize([nx,ny,-nx*(dx+Math.cos(t)*drx)-ny*(dy+Math.sin(t)*dry)]);};
  for(let j=0;j<stations.length-1;j++)for(let i=0;i<sides;i++){const a=stations[j],b=stations[j+1],t=i/sides*Math.PI*2,u=(i+1)/sides*Math.PI*2,p=pt(a,t),q=pt(a,u),r=pt(b,u),v=pt(b,t);this.smooth(p,q,r,norm(j,t),norm(j,u),norm(j+1,u),c);this.smooth(p,r,v,norm(j,t),norm(j+1,u),norm(j+1,t),c);}return this;
 }
 texturedQuad(a,b,c,d,uv,col,n=null){const normal=n||normalize(cross(sub(b,a),sub(c,a)));for(const i of [0,1,2,0,2,3])this.vertex([a,b,c,d][i],normal,col,uv[i]);return this;}
 transformed(builder,m){for(let i=0;i<builder.data.length;i+=13){const a=builder.data,x=a[i],y=a[i+1],z=a[i+2],nx=a[i+3],ny=a[i+4],nz=a[i+5];this.data.push(m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14],...normalize([m[0]*nx+m[4]*ny+m[8]*nz,m[1]*nx+m[5]*ny+m[9]*nz,m[2]*nx+m[6]*ny+m[10]*nz]),a[i+6],a[i+7],a[i+8],a[i+9],a[i+10],a[i+11],a[i+12])}return this}
}

export function orthographic(left,right,bottom,top,near,far){return new Float32Array([2/(right-left),0,0,0,0,2/(top-bottom),0,0,0,0,-2/(far-near),0,-(right+left)/(right-left),-(top+bottom)/(top-bottom),-(far+near)/(far-near),1]);}
const vertex=`precision highp float;
attribute vec3 aPosition;attribute vec3 aNormal;attribute vec4 aColor;attribute float aSurface;attribute vec2 aUV;
uniform mat4 uModel;uniform mat4 uViewProjection;uniform mat4 uLightVP;uniform float uKind;uniform float uReflection;
varying vec3 vNormal;varying vec3 vWorld;varying vec3 vLocal;varying vec4 vColor;varying vec4 vShadow;varying float vSurface;varying vec2 vUV;
void main(){vec4 p=uModel*vec4(aPosition,1.);vWorld=p.xyz;vLocal=aPosition;vNormal=mat3(uModel)*aNormal;if(uReflection>.5){vWorld.y=-p.y-.06;vNormal.y=-vNormal.y;}vColor=aColor;vUV=aUV;vSurface=aSurface<0.?uKind:aSurface;vShadow=uLightVP*vec4(vWorld,1.);gl_Position=uViewProjection*p;}`;
const fragment=`#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif
precision highp float;
varying vec3 vNormal;varying vec3 vWorld;varying vec3 vLocal;varying vec4 vColor;varying vec4 vShadow;varying float vSurface;varying vec2 vUV;
uniform vec3 uEye;uniform vec3 uSun;uniform float uTime;uniform float uShadowOn;uniform float uIndoor;uniform float uStudio;uniform float uReflection;
uniform sampler2D uLivery;uniform sampler2D uAsphalt;uniform sampler2D uStucco;uniform sampler2D uCarbon;uniform sampler2D uConcrete;uniform sampler2D uFacade;uniform sampler2D uShadow;uniform sampler2D uDisplay;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float grainNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}

float depth(vec4 rgba){return dot(rgba,vec4(1.,1./255.,1./65025.,1./16581375.));}
float visibility(vec3 normal){
 vec3 p=vShadow.xyz/vShadow.w*.5+.5;if(uShadowOn<.5||p.x<.003||p.x>.997||p.y<.003||p.y>.997||p.z<0.||p.z>1.)return 1.;
 float bias=max(.000035,.00018*(1.-max(dot(normal,uSun),0.))),sum=0.,weight=0.;vec2 pixel=p.xy*2048.-.5,origin=floor(pixel),f=fract(pixel);
 // Fractional tent weights remove the hard 3x3 grid and soften the edge as
 // the receiver moves across texels. Packed depth is compared before mixing.
 for(int x=-1;x<=2;x++)for(int y=-1;y<=2;y++){vec2 q=vec2(float(x),float(y));float w=max(0.,2.-abs(q.x-f.x))*max(0.,2.-abs(q.y-f.y));float z=depth(texture2D(uShadow,(origin+q+.5)/2048.));sum+=(p.z-bias<=z?1.:0.)*w;weight+=w;}
 float edge=max(abs(p.x-.5),abs(p.y-.5))*2.;return mix(sum/weight,1.,smoothstep(.78,.98,edge));
}
vec3 environment(vec3 r){
 vec3 sky=mix(vec3(.72,.65,.51),vec3(.13,.31,.53),pow(max(r.y,0.),.45));float buildings=step(.18,hash(floor(r.xz*19.)))*(1.-smoothstep(.03,.35,abs(r.y-.03)));sky=mix(sky,vec3(.23,.22,.20),buildings*.65);vec3 outside=mix(vec3(.065,.075,.09),sky,smoothstep(-.3,.2,r.y));
 vec3 room=mix(vec3(.025,.03,.045),vec3(.15,.18,.23),smoothstep(-.3,.8,r.y));vec2 p=r.xz/max(.08,r.y);float lights=0.;for(int i=0;i<3;i++){float x=(float(i)-1.)*.85;lights+=(1.-smoothstep(.10,.23,abs(p.x-x)))*(1.-smoothstep(.7,1.2,abs(p.y-.25)));}room+=vec3(3.1,3.35,3.7)*lights*smoothstep(.1,.3,r.y);room+=vec3(.15,.06,.025)*pow(max(dot(r,normalize(vec3(-1.,.2,-.4))),0.),24.);return mix(outside,room,uStudio);
}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){
 vec3 eye=uEye;if(uReflection>.5)eye.y=-eye.y-.06;vec3 n=normalize(vNormal),v=normalize(eye-vWorld),l=uSun,h=normalize(l+v),base=vColor.rgb;if(dot(n,v)<0.)n=-n;float kind=vSurface,rough=.74,metal=0.,coat=0.,emission=0.,coverage=1.;
 if(kind>.5&&kind<1.5){vec3 grain=texture2D(uAsphalt,vWorld.xz*.78).rgb;float patch=grainNoise(vWorld.xz*.12),fine=grainNoise(vWorld.xz*48.);base=grain*vec3(.46,.48,.51)*mix(.84,1.16,patch);float rubber=smoothstep(.7,1.05,vUV.y)*(1.-smoothstep(1.55,2.2,vUV.y));base*=1.-rubber*.20;rough=mix(.89,.75,rubber);float nearFade=1.-smoothstep(12.,70.,length(vWorld-uEye));n=normalize(n+vec3(fine-.5,0.,grainNoise(vWorld.zx*41.)-.5)*.10*nearFade);}
 else if(kind>1.5&&kind<2.5){base*=.9+hash(floor(vWorld.xz*4.))*.16;rough=.95;}
 else if(kind>2.5&&kind<3.5){rough=.22;coat=.38;}
 else if(kind>3.5&&kind<4.5){base=mix(base,texture2D(uCarbon,vLocal.xz*15.).rgb*.6,.7);rough=.36;coat=.18;}
 else if(kind>4.5&&kind<5.5){float grain=grainNoise(vLocal.yz*180.);base*=.85+grain*.24;rough=.76;}
 else if(kind>5.5&&kind<6.5){float variant=floor((kind-6.)*10.+.1);vec2 cell=vec2(mod(variant,2.),floor(variant/2.));vec2 uv=(cell+clamp(fract(vUV),.002,.998))*.5;vec3 facade=texture2D(uFacade,uv).rgb;base*=facade*1.08;float glass=1.-smoothstep(.16,.34,dot(facade,vec3(.3,.5,.2)));rough=mix(.88,.24,glass);metal=glass*.28;coat=glass*.2;}
 else if(kind>6.5&&kind<7.5){vec2 uv=abs(n.y)>.65?vWorld.xz:abs(n.x)>abs(n.z)?vWorld.zy:vWorld.xy;base*=texture2D(uStucco,uv*.28).rgb*1.35;rough=.91;}
 else if(kind>7.5&&kind<8.5){rough=.1;metal=.78;coat=.4;}
 else if(kind>8.5&&kind<9.5){rough=.98;base*=.93+hash(floor(vLocal.xy*170.))*.13;}
 else if(kind>9.5&&kind<10.5){rough=.38;metal=.78;}
 else if(kind>10.5&&kind<11.5){vec2 p=vWorld.xz;float a=p.x*.65+p.y*.27+uTime*.8,b=p.y*1.7-p.x*.24-uTime*1.1,c=p.x*3.2+p.y*2.4+uTime*1.3;n=normalize(vec3(cos(a)*.10+cos(c)*.045,1.,cos(b)*.07+sin(c)*.04));rough=.13;metal=.18;coat=.6;base=vec3(.035,.24,.29)*(1.+sin(a)*sin(b)*.12);}
 else if(kind>11.5&&kind<12.5){vec2 uv=clamp(vec2((vLocal.x+.115)/.23,(vLocal.y+.018)/.105),0.,1.);base=texture2D(uDisplay,uv).rgb;emission=1.;}
 else if(kind>12.5&&kind<13.5){emission=.6;rough=.5;}
 else if(kind>13.5&&kind<14.5){vec2 uv=abs(n.y)>.65?vWorld.xz:abs(n.x)>abs(n.z)?vWorld.zy:vWorld.xy;base*=texture2D(uConcrete,uv*.35).rgb*1.2;rough=.94;}
 if(kind>14.5&&kind<15.5){vec2 wire=vUV*5.;float a=abs(fract(wire.x+wire.y)-.5),b=abs(fract(wire.x-wire.y)-.5);float aa=.008;
 #ifdef GL_OES_standard_derivatives
 aa=max(.004,fwidth(wire.x+wire.y)*.65);
 #endif
 coverage=(1.-smoothstep(.013-aa,.013+aa,min(a,b)))*(1.-smoothstep(30.,100.,length(vWorld-uEye)));if(coverage<.015)discard;rough=.95;metal=0.;}

 if(kind>15.5&&kind<16.5){rough=1.;coat=0.;metal=0.;base*=.80+hash(floor(vWorld.xz*23.))*.24;}
 if(kind>16.5&&kind<17.5){base=texture2D(uLivery,vUV).rgb;rough=.23;coat=.38;}
 if(kind>17.5&&kind<18.5){base=texture2D(uLivery,vUV).rgb;rough=.91;coat=0.;}
 if(kind>18.5&&kind<19.5){vec2 p=vUV*2.-1.;float alpha=exp(-dot(p,p)*3.7)*vColor.a*(1.-smoothstep(.7,1.,length(p)));if(alpha<.005)discard;gl_FragColor=vec4(.025,.03,.035,alpha);return;}
 if(kind>19.5&&kind<20.5){base=texture2D(uLivery,vUV).rgb;rough=.87;coat=0.;}
 if(kind>20.5&&kind<21.5){vec2 tile=abs(fract(vWorld.xz*.5)-.5);float seam=smoothstep(.493,.499,max(tile.x,tile.y));base=mix(vec3(.24,.27,.30),vec3(.065,.08,.10),seam);base*=.96+grainNoise(vWorld.xz*18.)*.08;rough=.31;metal=.30;coat=.14;}
 base=pow(max(base,vec3(.002)),vec3(2.2));
 float nl=max(dot(n,l),0.),nv=max(dot(n,v),.001),nh=max(dot(n,h),0.),vh=max(dot(v,h),0.),a=rough*rough,a2=a*a;
 float D=a2/(3.14159265*pow(nh*nh*(a2-1.)+1.,2.)+.00001),k=pow(rough+1.,2.)/8.;
 float G=(nv/(nv*(1.-k)+k))*(nl/(nl*(1.-k)+k));vec3 f0=mix(vec3(.045),base,metal),F=f0+(1.-f0)*pow(1.-vh,5.);
 vec3 spec=D*G*F/max(4.*nv*max(nl,.001),.001),diffuse=base*(1.-metal)*(1.-F)/3.14159265;
 float shadow=mix(.06,1.,visibility(n)),indoor=1.-uIndoor*.88;
 vec3 ambient=mix(vec3(.085,.07,.055),vec3(.23,.32,.45),n.y*.5+.5)*base*(1.-metal*.65)*(1.-uIndoor*.72);
 vec3 reflected=environment(reflect(-v,n));vec3 envSpec=reflected*mix(f0,vec3(1.),pow(1.-nv,5.))*(1.-rough*.72)*(1.-uIndoor*.7);
 if(kind>15.5&&kind<16.5){envSpec*=.03;spec*=.1;ambient*=1.3;}
 ambient=mix(ambient,base*vec3(.18,.22,.29)*(1.-metal*.6),uStudio);
 vec3 lit=ambient+(diffuse+spec)*nl*vec3(4.1,3.55,2.75)*shadow*indoor*(1.-uStudio)+envSpec;
 // Broad studio sources light the car independently of the garage roof.
 float key=max(dot(n,normalize(vec3(1.,1.6,1.2))),0.),fill=max(dot(n,normalize(vec3(-1.,.7,-.3))),0.);
 lit+=uStudio*(base*(1.-metal)*((vec3(1.45,1.52,1.65)*key*mix(.30,1.,shadow)+vec3(.46,.32,.23)*fill)));
 lit+=uStudio*coat*vec3(.65,.77,1.)*pow(max(dot(reflect(-normalize(vec3(.7,1.,.6)),n),v),0.),52.);
 lit+=base*vec3(.10,.095,.08)*uIndoor;
 lit+=coat*pow(max(dot(reflect(-l,n),v),0.),180.)*shadow*.65*indoor*(1.-uStudio);
 if(emission>0.)lit=mix(lit,base*2.,emission);
 float distance=length(vWorld-uEye);float fog=(1.-exp(-distance*distance*.0000013))*(1.-uStudio);vec3 haze=mix(vec3(.49,.63,.76),vec3(.80,.64,.44),pow(max(dot(normalize(vWorld-uEye),uSun),0.),8.));lit=mix(lit,haze,min(.94,fog));
 gl_FragColor=vec4(pow(aces(lit),vec3(1./2.2)),vColor.a*coverage);
}`;
const skyVertex=`attribute vec2 aPosition;varying vec2 vUV;void main(){vUV=aPosition;gl_Position=vec4(aPosition,.999,1.);}`;
const skyFragment=`precision highp float;varying vec2 vUV;uniform vec3 uForward;uniform vec3 uRight;uniform vec3 uUp;uniform vec3 uSun;uniform float uAspect;uniform float uTan;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float cloudNoise(vec2 p){return noise(p)*.57+noise(p*2.03+7.)*.28+noise(p*4.07+19.)*.15;}
void main(){
 vec3 ray=normalize(uForward+uRight*vUV.x*uAspect*uTan+uUp*vUV.y*uTan);float h=max(ray.y,0.),sun=max(dot(ray,uSun),0.);
 vec3 col=mix(vec3(.82,.83,.80),vec3(.16,.39,.68),pow(h,.42));col+=vec3(.24,.14,.035)*pow(sun,12.);
 vec2 p=ray.xz/max(.12,h);float cloud=cloudNoise(p*vec2(.55,1.2)+3.),wisps=cloudNoise(p*vec2(1.4,.5)+27.);float cover=smoothstep(.53,.79,cloud)*smoothstep(.025,.18,h);
 col=mix(col,mix(vec3(.71,.76,.81),vec3(1.,.96,.85),smoothstep(.52,.75,cloud)),cover*.82);col=mix(col,vec3(.90,.92,.94),smoothstep(.62,.82,wisps)*.18*smoothstep(.1,.45,h));
 col+=vec3(1.,.67,.32)*pow(sun,128.)*.22;col=mix(col,vec3(1.,.98,.86),smoothstep(.9995,.99985,sun));
 float land=clamp((-ray.z-ray.x)*.85+.1,0.,1.);vec2 horizon=normalize(ray.xz+vec2(.00001));
 for(int i=0;i<3;i++){float layer=float(i),ridge=.004+land*(.14-layer*.036+noise(horizon*(5.+layer*3.)+layer*7.)*.065+noise(horizon*28.+layer*3.)*.018);float silhouette=1.-smoothstep(ridge-.001,ridge+.001,ray.y);float folds=noise(horizon*45.+vec2(layer*9.,ray.y*23.));vec3 mountain=mix(vec3(.51,.62,.66),vec3(.26,.38,.36),layer*.29)+folds*.038;col=mix(col,mountain,silhouette);}
 gl_FragColor=vec4(col,1.);
}`;
// Single full-screen pass: edge-aware antialiasing, restrained highlight bloom
// and a gentle lens vignette. No additional scene draws or network assets.
const finishFragment=`precision highp float;varying vec2 vUV;uniform sampler2D uScene;uniform vec3 uResolution;uniform float uStudio;
float luma(vec3 c){return dot(c,vec3(.299,.587,.114));}
vec3 glow(vec2 uv){vec3 c=texture2D(uScene,uv).rgb;return c*max(0.,luma(c)-.72)/.28;}
void main(){
 vec2 uv=vUV*.5+.5,px=1./uResolution.xy;vec3 center=texture2D(uScene,uv).rgb;
 float nw=luma(texture2D(uScene,uv+vec2(-1.,-1.)*px).rgb),ne=luma(texture2D(uScene,uv+vec2(1.,-1.)*px).rgb),sw=luma(texture2D(uScene,uv+vec2(-1.,1.)*px).rgb),se=luma(texture2D(uScene,uv+vec2(1.,1.)*px).rgb),m=luma(center);
 vec2 dir=vec2(-((nw+ne)-(sw+se)),(nw+sw)-(ne+se));float reduce=max((nw+ne+sw+se)*.03125,.0078125);dir=clamp(dir/(min(abs(dir.x),abs(dir.y))+reduce),vec2(-6.),vec2(6.))*px;
 vec3 a=.5*(texture2D(uScene,uv+dir*(-1./6.)).rgb+texture2D(uScene,uv+dir*(1./6.)).rgb);vec3 b=a*.5+.25*(texture2D(uScene,uv-dir*.5).rgb+texture2D(uScene,uv+dir*.5).rgb);
 float lb=luma(b),lo=min(m,min(min(nw,ne),min(sw,se))),hi=max(m,max(max(nw,ne),max(sw,se)));vec3 col=lb<lo||lb>hi?a:b;
 vec3 bloom=vec3(0.);for(int i=0;i<4;i++){float a=float(i)*1.5707963;vec2 d=vec2(cos(a),sin(a))*px;bloom+=glow(uv+d*3.)+glow(uv+d*8.);}
 col+=bloom*.012;float edge=smoothstep(.25,1.5,dot(vUV*vec2(.8,1.),vUV*vec2(.8,1.)));col*=1.-edge*mix(.09,.18,uStudio);
 // Keep the dither arithmetic bounded: large sine arguments can produce
 // undefined values on GLES drivers at ordinary desktop resolutions.
 float dither=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;gl_FragColor=vec4(clamp(col+dither/255.,0.,1.),1.);
}`;
const shadowVertex=`attribute vec3 aPosition;attribute float aSurface;uniform mat4 uModel;uniform mat4 uLightVP;varying float vSurface;void main(){vSurface=aSurface;gl_Position=uLightVP*uModel*vec4(aPosition,1.);}`;
const shadowFragment=`precision highp float;varying float vSurface;void main(){if((vSurface>.5&&vSurface<2.5)||(vSurface>10.5&&vSurface<11.5)||(vSurface>13.5&&vSurface<15.5)||(vSurface>18.5&&vSurface<19.5))discard;vec4 encoded=fract(gl_FragCoord.z*vec4(1.,255.,65025.,16581375.));encoded-=encoded.yzww*vec4(1./255.,1./255.,1./255.,0.);gl_FragColor=encoded;}`;
export function program(gl,vert,frag){const p=gl.createProgram();for(const [type,src]of[[gl.VERTEX_SHADER,vert],[gl.FRAGMENT_SHADER,frag]]){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;}
export class Renderer {
 constructor(canvas){
  this.canvas=canvas;this.gl=canvas.getContext('webgl',{antialias:true,alpha:false,powerPreference:'high-performance'});if(!this.gl)throw new Error('WebGL is unavailable. Enable hardware acceleration.');const g=this.gl;
  g.getExtension('OES_standard_derivatives');this.program=program(g,vertex,fragment);this.sky=program(g,skyVertex,skyFragment);this.shadowProgram=program(g,shadowVertex,shadowFragment);this.finishProgram=program(g,skyVertex,finishFragment);
  this.uniforms={};for(const n of ['uReflection','uModel','uViewProjection','uLightVP','uEye','uSun','uKind','uTime','uShadowOn','uIndoor','uStudio','uAsphalt','uFacade','uShadow','uDisplay','uStucco','uCarbon','uConcrete','uLivery'])this.uniforms[n]=g.getUniformLocation(this.program,n);
  this.attributes=['aPosition','aNormal','aColor','aSurface','aUV'].map(n=>g.getAttribLocation(this.program,n));this.skyBuffer=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,this.skyBuffer);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),g.STATIC_DRAW);
  this.sun=normalize([-.62,.58,-.53]);this.quality=2;this.identity=matrix();this.lightVP=matrix();this.shadowEnabled=true;this.postEnabled=true;this.time=0;this.indoor=0;this.studio=0;this.failedTextures=[];
  this.asphalt=this.texture([74,76,77,255]);this.stucco=this.texture([183,178,160,255]);this.carbon=this.texture([28,30,32,255]);this.concrete=this.texture([149,149,143,255]);this.facade=this.texture([183,178,160,255]);this.display=this.texture([12,20,25,255]);this.defaultLivery=this.texture([255,255,255,255]);this.ready=Promise.all([this.loadTexture(this.asphalt,'assets/asphalt.webp'),this.loadTexture(this.stucco,'assets/stucco.webp'),this.loadTexture(this.carbon,'assets/carbon.webp'),this.loadTexture(this.concrete,'assets/concrete.webp'),this.loadTexture(this.facade,'assets/monaco-facades.webp')]);
  this.shadowTexture=this.texture([255,255,255,255]);g.bindTexture(g.TEXTURE_2D,this.shadowTexture);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,2048,2048,0,g.RGBA,g.UNSIGNED_BYTE,null);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);
  this.shadowFramebuffer=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,this.shadowFramebuffer);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,this.shadowTexture,0);const depth=g.createRenderbuffer();g.bindRenderbuffer(g.RENDERBUFFER,depth);g.renderbufferStorage(g.RENDERBUFFER,g.DEPTH_COMPONENT16,2048,2048);g.framebufferRenderbuffer(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.RENDERBUFFER,depth);const complete=g.checkFramebufferStatus(g.FRAMEBUFFER);if(typeof complete==='number'&&complete!==g.FRAMEBUFFER_COMPLETE)this.shadowEnabled=false;g.bindFramebuffer(g.FRAMEBUFFER,null);
  this.displayCanvas=typeof document.createElement==='function'?document.createElement('canvas'):null;if(this.displayCanvas){this.displayCanvas.width=256;this.displayCanvas.height=128;this.displayContext=this.displayCanvas.getContext('2d');}
  this.sceneTexture=this.texture([0,0,0,255]);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);this.sceneFramebuffer=g.createFramebuffer();this.sceneDepth=g.createRenderbuffer();
  g.enable(g.DEPTH_TEST);g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);this.resize();
 }
 texture(rgba){const g=this.gl,t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,1,1,0,g.RGBA,g.UNSIGNED_BYTE,new Uint8Array(rgba));g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.REPEAT);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.REPEAT);return t;}
 loadTexture(texture,path){if(typeof Image==='undefined')return Promise.resolve();return new Promise(resolve=>{const img=new Image();img.onload=()=>{const g=this.gl;g.bindTexture(g.TEXTURE_2D,texture);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,true);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,img);g.generateMipmap(g.TEXTURE_2D);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR_MIPMAP_LINEAR);const ext=g.getExtension('EXT_texture_filter_anisotropic');if(ext)g.texParameterf(g.TEXTURE_2D,ext.TEXTURE_MAX_ANISOTROPY_EXT,4);resolve();};img.onerror=()=>{this.failedTextures.push(path);resolve();};img.src=path;});}
 updateDisplay(car){if(!this.displayContext)return;const c=this.displayContext;c.fillStyle='#0c151b';c.fillRect(0,0,256,128);c.fillStyle='#e4f6ed';c.font='bold 69px monospace';c.textAlign='left';c.fillText(String(car.gear),12,82);c.font='bold 38px monospace';c.textAlign='right';c.fillText(String(Math.round(car.speed*3.6)),244,66);c.font='14px monospace';c.fillStyle='#7cc7b7';c.fillText('KM/H',244,86);c.fillStyle='#54c99b';c.fillRect(12,105,232*car.ers,5);c.fillStyle=car.drs?'#59fcb5':'#6c8494';c.textAlign='left';c.font='13px monospace';c.fillText(car.drs?'DRS OPEN':'ERS '+Math.round(car.ers*100)+'%',12,124);const g=this.gl;g.bindTexture(g.TEXTURE_2D,this.display);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,true);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,this.displayCanvas);}
 resize(){const d=Math.min(devicePixelRatio||1,this.quality);this.width=innerWidth;this.height=innerHeight;this.canvas.width=Math.max(1,Math.round(this.width*d));this.canvas.height=Math.max(1,Math.round(this.height*d));const g=this.gl;g.bindTexture(g.TEXTURE_2D,this.sceneTexture);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,this.canvas.width,this.canvas.height,0,g.RGBA,g.UNSIGNED_BYTE,null);g.bindRenderbuffer(g.RENDERBUFFER,this.sceneDepth);g.renderbufferStorage(g.RENDERBUFFER,g.DEPTH_STENCIL,this.canvas.width,this.canvas.height);g.bindFramebuffer(g.FRAMEBUFFER,this.sceneFramebuffer);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,this.sceneTexture,0);g.framebufferRenderbuffer(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.RENDERBUFFER,this.sceneDepth);g.framebufferRenderbuffer(g.FRAMEBUFFER,g.STENCIL_ATTACHMENT,g.RENDERBUFFER,this.sceneDepth);const status=g.checkFramebufferStatus(g.FRAMEBUFFER);this.postReady=typeof status!=='number'||status===g.FRAMEBUFFER_COMPLETE;g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,this.canvas.width,this.canvas.height);}
 finish(){if(!this.postActive)return;const g=this.gl;g.bindFramebuffer(g.FRAMEBUFFER,null);g.disable(g.DEPTH_TEST);g.useProgram(this.finishProgram);for(const a of this.attributes)if(a>=0)g.disableVertexAttribArray(a);const pos=g.getAttribLocation(this.finishProgram,'aPosition');g.enableVertexAttribArray(pos);g.bindBuffer(g.ARRAY_BUFFER,this.skyBuffer);g.vertexAttribPointer(pos,2,g.FLOAT,false,0,0);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.sceneTexture);g.uniform1i(g.getUniformLocation(this.finishProgram,'uScene'),0);g.uniform3fv(g.getUniformLocation(this.finishProgram,'uResolution'),[this.canvas.width,this.canvas.height,0]);g.uniform1f(g.getUniformLocation(this.finishProgram,'uStudio'),this.studio);g.drawArrays(g.TRIANGLES,0,6);g.enable(g.DEPTH_TEST);}
 mesh(builder,kind=0){const g=this.gl,buffer=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,buffer);g.bufferData(g.ARRAY_BUFFER,new Float32Array(builder.data),g.STATIC_DRAW);return {buffer,count:builder.data.length/13,kind};}
 shadowPass(items,focus){
  if(!this.shadowEnabled)return;const g=this.gl,extent=this.studio?8:38,texel=extent*2/2048,right=normalize(cross([0,1,0],this.sun)),up=cross(this.sun,right),f=[focus[0],focus[1]+3,focus[2]];
  for(const axis of [right,up]){const shift=Math.round(dot(f,axis)/texel)*texel-dot(f,axis);for(let i=0;i<3;i++)f[i]+=axis[i]*shift;}
  const eye=f.map((v,i)=>v+this.sun[i]*100);this.lightVP=multiply(orthographic(-extent,extent,-extent,extent,1,220),lookAt(eye,f));
  g.bindFramebuffer(g.FRAMEBUFFER,this.shadowFramebuffer);g.viewport(0,0,2048,2048);g.clearColor(1,1,1,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);g.useProgram(this.shadowProgram);g.enable(g.POLYGON_OFFSET_FILL);g.polygonOffset(1,1);
  const surface=g.getAttribLocation(this.shadowProgram,'aSurface'),pos=g.getAttribLocation(this.shadowProgram,'aPosition');for(const a of this.attributes)if(a>=0)g.disableVertexAttribArray(a);g.enableVertexAttribArray(pos);g.enableVertexAttribArray(surface);g.uniformMatrix4fv(g.getUniformLocation(this.shadowProgram,'uLightVP'),false,this.lightVP);
  for(const {mesh,m}of items){if(!mesh?.count||(this.studio&&!m))continue;if(mesh.bounds&&Math.hypot(mesh.bounds.x-focus[0],mesh.bounds.z-focus[2])>mesh.bounds.radius+95)continue;g.bindBuffer(g.ARRAY_BUFFER,mesh.buffer);g.vertexAttribPointer(pos,3,g.FLOAT,false,52,0);g.vertexAttribPointer(surface,1,g.FLOAT,false,52,40);g.uniformMatrix4fv(g.getUniformLocation(this.shadowProgram,'uModel'),false,m||this.identity);g.drawArrays(g.TRIANGLES,0,mesh.count);}
  g.disable(g.POLYGON_OFFSET_FILL);g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,this.canvas.width,this.canvas.height);
 }
 reflection(items){const g=this.gl;g.uniform1f(this.uniforms.uReflection,1);const mirror=matrix(0,-.06,0,0,1,-1,1);for(const item of items)this.draw(item.mesh,multiply(mirror,item.m||this.identity));g.uniform1f(this.uniforms.uReflection,0);}
 contactShadow(m=this.identity){
  if(!this.contactMesh){const b=new Builder(19),patch=(x,z,w,d,alpha)=>b.texturedQuad([x-w,.025,z-d],[x+w,.025,z-d],[x+w,.025,z+d],[x-w,.025,z+d],[[0,0],[1,0],[1,1],[0,1]],[0,0,0,alpha],[0,1,0]);patch(0,-.12,.83,2.4,.27);for(const [x,z]of [[.81,1.65],[-.81,1.65],[.78,-1.75],[-.78,-1.75]])patch(x,z,.25,.39,.55);this.contactMesh=this.mesh(b);}
  this.draw(this.contactMesh,m,true);
 }
 begin(eye,target,fov=1.03){const g=this.gl;this.postActive=this.postEnabled&&this.postReady;g.bindFramebuffer(g.FRAMEBUFFER,this.postActive?this.sceneFramebuffer:null);this.eye=eye;this.forward=normalize(sub(target,eye));const right=normalize(cross(this.forward,[0,1,0])),up=cross(right,this.forward);this.vp=multiply(perspective(fov,this.width/this.height,.07,2400),lookAt(eye,target));g.clearColor(.65,.74,.79,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);g.disable(g.DEPTH_TEST);g.useProgram(this.sky);g.bindBuffer(g.ARRAY_BUFFER,this.skyBuffer);const pos=g.getAttribLocation(this.sky,'aPosition');for(const a of this.attributes)if(a>=0)g.disableVertexAttribArray(a);g.enableVertexAttribArray(pos);g.vertexAttribPointer(pos,2,g.FLOAT,false,0,0);for(const [n,v]of Object.entries({uForward:this.forward,uRight:right,uUp:up,uSun:this.sun}))g.uniform3fv(g.getUniformLocation(this.sky,n),v);g.uniform1f(g.getUniformLocation(this.sky,'uAspect'),this.width/this.height);g.uniform1f(g.getUniformLocation(this.sky,'uTan'),Math.tan(fov/2));g.drawArrays(g.TRIANGLES,0,6);g.enable(g.DEPTH_TEST);g.useProgram(this.program);g.uniformMatrix4fv(this.uniforms.uViewProjection,false,this.vp);g.uniformMatrix4fv(this.uniforms.uLightVP,false,this.lightVP);g.uniform3fv(this.uniforms.uEye,eye);g.uniform3fv(this.uniforms.uSun,this.sun);g.uniform1f(this.uniforms.uTime,this.time);g.uniform1f(this.uniforms.uReflection,0);g.uniform1f(this.uniforms.uIndoor,this.indoor);g.uniform1f(this.uniforms.uStudio,this.studio);g.uniform1f(this.uniforms.uShadowOn,this.shadowEnabled?1:0);for(const [i,[name,t]]of [[0,['uAsphalt',this.asphalt]],[1,['uFacade',this.facade]],[2,['uShadow',this.shadowTexture]],[3,['uDisplay',this.display]],[4,['uStucco',this.stucco]],[5,['uCarbon',this.carbon]],[6,['uConcrete',this.concrete]],[7,['uLivery',this.defaultLivery]]]){g.activeTexture(g.TEXTURE0+i);g.bindTexture(g.TEXTURE_2D,t);g.uniform1i(this.uniforms[name],i);}}
 drawWorld(meshes,transparent=false){for(const mesh of meshes){if(!!mesh.transparent!==transparent)continue;if(mesh.bounds){const dx=mesh.bounds.x-this.eye[0],dz=mesh.bounds.z-this.eye[2],d=Math.hypot(dx,dz);if(d>1000+mesh.bounds.radius||d>100&&dx*this.forward[0]+dz*this.forward[2]<-mesh.bounds.radius-70)continue;}this.draw(mesh,this.identity,!!mesh.transparent);}}
 draw(mesh,m=this.identity,transparent=false){if(!mesh?.count)return;const g=this.gl;g.activeTexture(g.TEXTURE0+7);g.bindTexture(g.TEXTURE_2D,mesh.livery||this.defaultLivery);g.bindBuffer(g.ARRAY_BUFFER,mesh.buffer);this.attributes.forEach((a,i)=>{if(a<0)return;g.enableVertexAttribArray(a);g.vertexAttribPointer(a,[3,3,4,1,2][i],g.FLOAT,false,52,[0,12,24,40,44][i]);});g.uniformMatrix4fv(this.uniforms.uModel,false,m);g.uniform1f(this.uniforms.uKind,mesh.kind);if(transparent){g.enable(g.BLEND);g.depthMask(false);}g.drawArrays(g.TRIANGLES,0,mesh.count);if(transparent){g.disable(g.BLEND);g.depthMask(true);}}
}
