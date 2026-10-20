import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildCar} from '../dist/car-model.js';
import {CARS} from '../dist/cars.js';
const renderer={mesh:b=>({data:new Float32Array(b.data),count:b.data.length/13})};
const model=buildCar(renderer,CARS.find(c=>c.id==='ferrari'));
test('the complete car has finite geometry, unit normals, bounded UVs and expected proportions',()=>{
 const meshes=[model.body,model.helmet,model.steering,model.rearFlap,...Object.values(model.wheels).flat()];
 for(const mesh of meshes){assert.equal(mesh.count%3,0);assert.equal(mesh.data.length%13,0);for(let i=0;i<mesh.data.length;i+=13){const a=mesh.data;for(let k=0;k<13;k++)assert.ok(Number.isFinite(a[i+k]));const length=Math.hypot(a[i+3],a[i+4],a[i+5]);assert.ok(length>.99&&length<1.01,'Broken surface normal');assert.ok(a[i+11]>=-.001&&a[i+11]<=1.001,'U outside atlas');assert.ok(a[i+12]>=-.001&&a[i+12]<=1.001,'V outside atlas');}}
 const p=model.body.data,bounds=axis=>{let lo=Infinity,hi=-Infinity;for(let i=axis;i<p.length;i+=13){lo=Math.min(lo,p[i]);hi=Math.max(hi,p[i]);}return [lo,hi];};
 const [left,right]=bounds(0),[rear,front]=bounds(2);assert.ok(right-left>1.85&&right-left<1.95);assert.ok(front-rear>5&&front-rear<5.3);assert.equal(model.axles[0].z-model.axles[1].z,3.4);assert.equal(model.wheelRadius,.365);assert.ok(model.body.count<300000);
});
test('all named body assemblies account for exactly one complete body',()=>{let cursor=0;for(const part of model.components){assert.equal(part.start,cursor);assert.ok(part.count>0);cursor+=part.count;}assert.equal(cursor,model.body.count);assert.ok(model.components.some(p=>/radiator/.test(p.name)));assert.ok(model.components.some(p=>/halo/.test(p.name)));});
test('all eleven mapped liveries and three tyre compounds are local scalable assets',()=>{for(const car of CARS){const svg=readFileSync(new URL('../dist/assets/livery-'+car.id+'.svg',import.meta.url),'utf8');assert.match(svg,/<svg/);assert.match(svg,/width="2048" height="2048"/);assert.ok(!svg.includes('http://')||svg.includes('http://www.w3.org'));}for(const tyre of ['soft','medium','hard']){const svg=readFileSync(new URL('../dist/assets/tyre-'+tyre+'.svg',import.meta.url),'utf8');assert.match(svg,/PIRELLI/);assert.match(svg,/rotate\(/);}});

test('portable GLB has embedded textures, complete assemblies and in-bounds accessors',()=>{
 const file=readFileSync(new URL('../output/models/apex-formula-2026.glb',import.meta.url));assert.equal(file.readUInt32LE(0),0x46546c67);assert.equal(file.readUInt32LE(4),2);assert.equal(file.readUInt32LE(8),file.length);
 const length=file.readUInt32LE(12);assert.equal(file.readUInt32LE(16),0x4e4f534a);const gltf=JSON.parse(file.subarray(20,20+length).toString());assert.equal(gltf.nodes.length,17);assert.equal(gltf.images.length,2);assert.ok(gltf.nodes.some(n=>n.name==='DRS flap'));
 for(const view of gltf.bufferViews){assert.equal(view.byteOffset%4,0);assert.ok(view.byteOffset+view.byteLength<=gltf.buffers[0].byteLength);}
 for(const mesh of gltf.meshes)for(const primitive of mesh.primitives){const p=gltf.accessors[primitive.attributes.POSITION],n=gltf.accessors[primitive.attributes.NORMAL],uv=gltf.accessors[primitive.attributes.TEXCOORD_0];assert.equal(n.count,p.count);assert.equal(uv.count,p.count);assert.ok(p.min.every(Number.isFinite));assert.ok(p.max.every(Number.isFinite));}
 assert.ok(gltf.images.every(i=>i.mimeType==='image/png'&&i.bufferView!==undefined));
});
