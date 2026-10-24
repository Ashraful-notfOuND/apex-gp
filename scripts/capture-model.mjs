// Records the real renderer's commands for headless EGL review. This is not a
// browser/layout test. Replay with render-capture.py on a Linux EGL/GLES host.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {Renderer,matrix,multiply,rotationX} from '../dist/engine.js';
import {buildCar} from '../dist/car-model.js';
import {buildGarage,drawGarage} from '../dist/garage-model.js';
import {Track} from '../dist/track.js';
import {CARS} from '../dist/cars.js';
const selectedViews=new Set((process.argv.find(a=>a.startsWith('--views='))?.slice(8)||'').split(',').filter(Boolean)),width=Number(process.argv.find(a=>a.startsWith('--width='))?.slice(8)||1440),height=Math.round(width*5/8);
if(!Number.isInteger(width)||width<320||width>3840)throw new Error('Width must be between 320 and 3840.');
const root=fileURLToPath(new URL('../',import.meta.url)),output=new URL('../output/previews/',import.meta.url),path=process.argv.find(a=>a.endsWith('.json'))||'/tmp/apex-render-capture.json',withTrack=process.argv.includes('--track')||[...selectedViews].some(v=>v.startsWith('monaco-')&&v!=='monaco-garage');mkdirSync(output,{recursive:true});
const constants=Object.fromEntries([...readFileSync('/usr/include/GLES2/gl2.h','utf8').matchAll(/^#define GL_(\w+)\s+(0x[0-9A-Fa-f]+|\d+)/gm)].map(m=>[m[1],Number(m[2])]));constants.UNPACK_FLIP_Y_WEBGL=0x9240;constants.DEPTH_STENCIL=0x84f9;
let id=0;const commands=[],api={},encode=a=>ArrayBuffer.isView(a)?{bytes:Buffer.from(a.buffer,a.byteOffset,a.byteLength).toString('base64'),dtype:a.constructor.name}:a;
for(const name of ['createBuffer','createProgram','createShader','createTexture','createFramebuffer','createRenderbuffer'])api[name]=(...args)=>{const result={rid:++id,type:name};commands.push({name,args:args.map(encode),result});return result;};
Object.assign(api,{getShaderParameter:()=>true,getProgramParameter:()=>true,getExtension:()=>null,getAttribLocation:(program,name)=>({program,name,attrib:true,valueOf:()=>({aPosition:0,aNormal:1,aColor:2,aSurface:3,aUV:4}[name])}),getUniformLocation:(program,name)=>({program,name,uniform:true}),checkFramebufferStatus:()=>constants.FRAMEBUFFER_COMPLETE});
const gl=new Proxy(api,{get:(o,k)=>k in o?o[k]:k in constants?constants[k]:(...args)=>commands.push({name:k,args:args.map(encode)})});
globalThis.innerWidth=width;globalThis.innerHeight=height;globalThis.devicePixelRatio=1;globalThis.document={};
const renderer=new Renderer({width:0,height:0,getContext:()=>gl});renderer.quality=1;renderer.postEnabled=!process.argv.includes('--performance');renderer.shadowEnabled=renderer.postEnabled;renderer.resize();const car=buildCar(renderer,CARS.find(c=>c.id==='ferrari')),garage=buildGarage(renderer);
const upload=(texture,path)=>{gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,{path});gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);};
for(const [texture,name]of [[renderer.asphalt,'asphalt.webp'],[renderer.stucco,'stucco.webp'],[renderer.concrete,'concrete.webp'],[renderer.carbon,'carbon.webp'],[renderer.facade,'monaco-facades.webp']])upload(texture,root+'dist/assets/'+name);
upload(renderer.garageTexture,root+'dist/assets/garage-mark.svg');
for(const [key,texture]of renderer.modelTextures)upload(texture,root+'dist/assets/'+(key.startsWith('car-')?'livery-'+key.slice(4):key)+'.svg');
function items(p,{head=true,drs=false}={}){const m=matrix(p.x,p.y,p.z,p.heading),out=[{mesh:car.body,m},{mesh:car.steering,m:multiply(m,matrix(...car.steeringOrigin))},{mesh:car.rearFlap,m:multiply(m,multiply(matrix(...car.flapOrigin),rotationX(drs?car.flapOpenAngle:0)))}];if(head)out.push({mesh:car.helmet,m});for(let i=0;i<2;i++)for(const side of [-1,1])out.push({mesh:car.wheels.soft[i],m:multiply(m,matrix(side*car.axles[i].x,car.wheelRadius,car.axles[i].z))});return out;}
const shot=name=>{renderer.finish();commands.push({name:'screenshot',args:[fileURLToPath(new URL(name+'.webp',output))]});};
for(const [name,eye,target,fov]of [['car-front',[3.9,1.9,5.2],[0,.64,0],.70],['car-side',[6.5,1.2,0],[0,.63,0],.76],['car-side-left',[-6.5,1.2,0],[0,.63,0],.76],['car-rear',[3.9,1.9,-5.4],[0,.64,0],.70],['car-drs-open',[3.9,1.9,-5.4],[0,.64,0],.70],['car-top',[0,7,.001],[0,0,0],.78],['car-cockpit',[0,1.10,-.24],[0,1.08,40],1.04],['monaco-garage',[5.5,2.05,5.3],[-1.25,.65,0],.69]]){
 if(selectedViews.size&&!selectedViews.has(name))continue;
 const p={x:0,y:0,z:0,heading:name==='monaco-garage'?.25:0},parts=items(p,{head:name!=='car-cockpit',drs:name==='car-drs-open'});renderer.indoor=0;renderer.studio=1;renderer.shadowPass([...garage.meshes.map(mesh=>({mesh})),...parts],[0,0,0]);renderer.begin(eye,target,fov);
 // Keep ceiling softboxes and upright lamps out of the inspection cameras.
 const backdrop=name==='monaco-garage'?garage:{...garage,meshes:[garage.meshes[0],garage.meshes[3]]};
 drawGarage(renderer,backdrop,parts);shot(name);
}
if(withTrack){const track=new Track();track.build(renderer);upload(renderer.sceneryTexture,root+'dist/assets/circuit-signs.svg');for(const [name,s,view]of [['monaco-chase',20,2],['monaco-onboard',20,0],['monaco-hairpin',1140,3],['monaco-harbor',2250,2],['monaco-tunnel',1630,0],['monaco-hairpin-barriers',1160,4],['monaco-chicane-barriers',2200,4]]){
 if(selectedViews.size&&!selectedViews.has(name))continue;
 const p=track.at(s),f=[Math.sin(p.heading),Math.cos(p.heading)],right=[f[1],-f[0]];let eye,target,fov;if(view===0){eye=[p.x-f[0]*.72,p.y+1.48,p.z-f[1]*.72];target=[p.x+f[0]*45,p.y+1.1+(track.at(s+35).y-p.y)*.67,p.z+f[1]*45];fov=.99;}else if(view===2){eye=[p.x-f[0]*7.8,p.y+2.75,p.z-f[1]*7.8];target=[p.x+f[0]*5,p.y+.65,p.z+f[1]*5];fov=.83;}else if(view===4){eye=[p.x-right[0]*10-f[0]*10,p.y+26,p.z-right[1]*10-f[1]*10];target=[p.x+f[0]*8,p.y,p.z+f[1]*8];fov=1.08;}else{eye=[p.x-f[0]*9+right[0]*8,p.y+4.3,p.z-f[1]*9+right[1]*8];target=[p.x,p.y+.5,p.z];fov=.75;}
 const parts=items(p);renderer.studio=0;renderer.indoor=name==='monaco-tunnel'?1:0;renderer.shadowPass([...track.shadowCasters.map(mesh=>({mesh})),...parts],[p.x,p.y,p.z]);renderer.begin(eye,target,fov);renderer.drawWorld(track.meshes);for(const item of parts)renderer.draw(item.mesh,item.m);renderer.contactShadow(parts[0].m);renderer.drawWorld(track.meshes,true);shot(name);
}}
writeFileSync(path,JSON.stringify({commands,width,height}));console.log(`${commands.length} renderer commands recorded in ${path}`);
