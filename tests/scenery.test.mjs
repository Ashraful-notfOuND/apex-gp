import test from 'node:test';
import assert from 'node:assert/strict';
import {Track} from '../dist/track.js';
import {roadClearance} from '../dist/scene-layout.js';
const track=new Track(),layout=roadClearance(track);
const edge=(s,offset)=>{const p=track.at(s);return [p.x+p.rx*offset,p.z+p.rz*offset];};
test('legacy straight fence chords at the hairpin are rejected',()=>{
 assert.equal(layout.clearSegment(edge(1166,6.15),edge(1176,6.15)),false);
 assert.equal(layout.clearFootprint(track.at(100).x,track.at(100).z,2,2,0),false);
 assert.equal(layout.clearSegment(edge(100,6.15),edge(101,6.15)),true);
});
// Deliberately use a brute-force point-to-polyline calculation independent of
// the layout grid and segment-intersection implementation.
function distance([x,z]){let min=Infinity;for(let i=0;i<track.samples.length;i++){const a=track.samples[i],b=track.samples[(i+1)%track.samples.length],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1))),d=(x-a.x-t*dx)**2+(z-a.z-t*dz)**2;if(d<min)min=d;}return Math.sqrt(min);}
test('actual scenery safety panels and low sign/wall footprints clear the entire circuit',()=>{
 track.build({mesh:b=>({count:b.data.length/13})});assert.ok(track.safetySegments.length>7000);assert.ok(track.solidFootprints.length>50);
 for(const segment of track.safetySegments)for(const t of [0,.5,1]){const p=segment.a.map((v,i)=>v+(segment.b[i]-v)*t);assert.ok(distance(p)>=segment.margin-.001,segment.type+' intrudes at '+segment.s);}
 for(const p of track.solidFootprints){const c=Math.cos(p.heading),s=Math.sin(p.heading);for(const [u,v]of [[-1,-1],[1,-1],[1,1],[-1,1],[0,0]])assert.ok(distance([p.x+u*p.w/2*c+v*p.d/2*s,p.z-u*p.w/2*s+v*p.d/2*c])>=5.549,'Solid prop intrudes');}
});
