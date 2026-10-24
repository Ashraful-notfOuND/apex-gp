// Visual safety objects must clear every nearby branch of the circuit, not
// just the centreline station used to place them. Physics stays in Track.
const cellSize=16;
const pointDistance=(p,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dz*t);};
const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
function segmentDistance(a,b,c,d){
 const ac=cross(a,b,c),ad=cross(a,b,d),ca=cross(c,d,a),cb=cross(c,d,b);
 if(ac*ad<=0&&ca*cb<=0&&Math.max(Math.min(a[0],b[0]),Math.min(c[0],d[0]))<=Math.min(Math.max(a[0],b[0]),Math.max(c[0],d[0]))&&Math.max(Math.min(a[1],b[1]),Math.min(c[1],d[1]))<=Math.min(Math.max(a[1],b[1]),Math.max(c[1],d[1])))return 0;
 return Math.min(pointDistance(a,c,d),pointDistance(b,c,d),pointDistance(c,a,b),pointDistance(d,a,b));
}
export function roadClearance(track){
 const cells=new Map(),segments=track.samples.map((p,i)=>{const q=track.samples[(i+1)%track.samples.length];return [[p.x,p.z],[q.x,q.z]];});
 const visit=(a,b,pad,fn)=>{for(let x=Math.floor((Math.min(a[0],b[0])-pad)/cellSize);x<=Math.floor((Math.max(a[0],b[0])+pad)/cellSize);x++)for(let z=Math.floor((Math.min(a[1],b[1])-pad)/cellSize);z<=Math.floor((Math.max(a[1],b[1])+pad)/cellSize);z++)fn(x+','+z);};
 segments.forEach(([a,b],i)=>visit(a,b,0,key=>{if(!cells.has(key))cells.set(key,[]);cells.get(key).push(i);}));
 const clearSegment=(a,b,margin=5.55)=>{const seen=new Set();let clear=true;visit(a,b,margin,key=>{if(!clear)return;for(const i of cells.get(key)||[]){if(seen.has(i))continue;seen.add(i);if(segmentDistance(a,b,...segments[i])<margin){clear=false;break;}}});return clear;};
 const clearFootprint=(x,z,width,depth,heading,margin=5.55)=>{const c=Math.cos(heading),s=Math.sin(heading),corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>[x+a*width/2*c+b*depth/2*s,z-a*width/2*s+b*depth/2*c]);return clearSegment([x,z],[x,z],margin)&&corners.every((p,i)=>clearSegment(p,corners[(i+1)%4],margin));};
 const nearest=(x,z)=>{let best=Infinity,result=null;const seen=new Set();visit([x,z],[x,z],12,key=>{for(const i of cells.get(key)||[]){if(seen.has(i))continue;seen.add(i);const [a,b]=segments[i],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1))),px=a[0]+t*dx,pz=a[1]+t*dz,d=(x-px)**2+(z-pz)**2;if(d>=best)continue;best=d;const p=track.samples[i],q=track.samples[(i+1)%track.samples.length];result={x:px,z:pz,y:p.y+(q.y-p.y)*t,s:p.s+((q.s-p.s+track.length)%track.length)*t};}});return result?{...result,distance:Math.sqrt(best)}:null;};
 return {clearSegment,clearFootprint,nearest};
}

// Extract the boundary of the union of road-width capsules. Unlike an offset
// ribbon, this cannot fold over itself at a hairpin or a short centreline spur.
// The shared distance field also supplies an asphalt fill without overlap.
export function roadEnvelope(track,clearance,spacing=1.2){
 const cells=new Set(),cache=new Map();
 for(const p of track.samples)for(let x=Math.floor((p.x-7.6)/spacing);x<=Math.ceil((p.x+7.6)/spacing);x++)for(let z=Math.floor((p.z-7.6)/spacing);z<=Math.ceil((p.z+7.6)/spacing);z++)cells.add(x+','+z);
 const point=(x,z)=>{const key=x+','+z;if(!cache.has(key)){const p=[x*spacing,z*spacing],n=clearance.nearest(...p);cache.set(key,{p,d:n?.distance??100,n});}return cache.get(key);};
 const triangles=[];for(const key of cells){const [x,z]=key.split(',').map(Number),p=[point(x,z),point(x+1,z),point(x+1,z+1),point(x,z+1)];if(p.every(a=>a.d>6.3))continue;triangles.push([p[0],p[1],p[2]],[p[0],p[2],p[3]]);}
 const crossing=(a,b,r)=>{const t=(r-a.d)/(b.d-a.d),p=a.p.map((v,i)=>v+(b.p[i]-v)*t),n=clearance.nearest(...p),dx=p[0]-n.x,dz=p[1]-n.z,l=Math.hypot(dx,dz)||1;return {p,d:r,n,nx:dx/l,nz:dz/l};};
 const contours=r=>{const segments=[];for(const tri of triangles){const hit=[];for(let i=0;i<3;i++){const a=tri[i],b=tri[(i+1)%3];if((a.d<r)!==(b.d<r))hit.push(crossing(a,b,r));}if(hit.length===2&&Math.hypot(hit[0].p[0]-hit[1].p[0],hit[0].p[1]-hit[1].p[1])>.001)segments.push(hit);}return segments;};
 const fill=(builder,r,color)=>{for(const tri of triangles){const polygon=[];for(let i=0;i<3;i++){const a=tri[i],b=tri[(i+1)%3];if(a.d<r)polygon.push(a);if((a.d<r)!==(b.d<r))polygon.push(crossing(a,b,r));}for(let i=1;i<polygon.length-1;i++)for(const a of [polygon[0],polygon[i],polygon[i+1]])builder.vertex([a.p[0],a.n.y,a.p[1]],[0,1,0],color,[a.n.s,a.d]);}};
 return {contours,fill};
}
