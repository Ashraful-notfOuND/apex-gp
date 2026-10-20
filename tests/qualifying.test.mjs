import test from 'node:test';
import assert from 'node:assert/strict';
import {Track} from '../dist/track.js';
import {Car} from '../dist/physics.js';
import {CARS,TYRES} from '../dist/cars.js';
import {Qualifying,encodeInput,decodeInput,scoreEntries,HZ,DRIVING_KEYS} from '../dist/session.js';
import {lookAt} from '../dist/engine.js';
const track=new Track();
function straight(){return {length:100000,at(s){return {x:0,y:0,z:s,heading:0,tx:0,tz:1,rx:1,rz:0,s:((s%100000)+100000)%100000,curvature:0};},nearest(x,z){return {...this.at(z),offset:x,index:0};}};}
function position(sim,s){const p=sim.player,a=track.at(s);Object.assign(p,{x:a.x,y:a.y,z:a.z,heading:a.heading,progress:s,lastS:a.s,lastIndex:null,near:{...a,offset:0},vx:0,vz:0,speed:0,yawRate:0,damage:0,lastImpact:0,offTrack:false});}
function timingHarness(){const q=new Qualifying(track);q.player.step=()=>{q.player.progress+=10;q.player.offTrack=false;};return q;}
test('Monaco has a closed finite 3337 metre centreline and narrow street barriers',()=>{assert.equal(track.length,3337);assert.ok(track.samples.length>2000);const start=track.at(0),end=track.at(track.length);assert.deepEqual(start,end);for(const s of [-100,0,250,1000,2220,3300]){const p=track.at(s),n=track.nearest(p.x,p.z);assert.ok(Math.abs(n.offset)<.1);assert.ok(Math.abs(Math.hypot(p.tx,p.tz)-1)<1e-10);for(const x of Object.values(p))assert.ok(Number.isFinite(x));}});
test('eleven distinct car profiles and three physical tyre compounds',()=>{assert.equal(CARS.length,11);assert.equal(new Set(CARS.map(c=>c.id)).size,11);assert.ok(CARS.find(c=>c.id==='redbull').drag<CARS.find(c=>c.id==='ferrari').drag);assert.ok(CARS.find(c=>c.id==='ferrari').grip>CARS.find(c=>c.id==='redbull').grip);assert.ok(TYRES.soft.grip>TYRES.medium.grip&&TYRES.medium.grip>TYRES.hard.grip);assert.ok(TYRES.soft.wear>TYRES.hard.wear);assert.throws(()=>new Qualifying(track,{car:'not-a-car'}));assert.throws(()=>new Qualifying(track,{tyre:'not-a-tyre'}));});
test('manual gears stay in first; shifting materially increases speed',()=>{const a=new Car(straight()),b=new Car(straight());for(let i=0;i<15*HZ;i++){a.step(1/HZ,{throttle:true});if(b.rpm>12200&&b.shifting<=0)b.shift(true);b.step(1/HZ,{throttle:true});}assert.equal(a.gear,1);assert.equal(a.auto,false);assert.ok(b.gear>=7);assert.ok(b.speed>a.speed*2);assert.equal(b.damage,0);assert.ok(b.wear>0&&b.fuel<12);});
test('no traction control or ABS: throttle spins rear tyres and excess braking locks tyres',()=>{const c=new Car(straight());let wheelspin=0;for(let i=0;i<300;i++){c.step(1/HZ,{throttle:true});wheelspin=Math.max(wheelspin,c.wheelspin);}assert.ok(wheelspin>.1);const v=c.speed;let lock=0;for(let i=0;i<90;i++){c.step(1/HZ,{brake:true});lock=Math.max(lock,c.lockup);}assert.ok(lock>.1);assert.ok(c.speed<v*.6);});
test('the physical steering rack has no speed assist',()=>{const l=new Car(straight()),r=new Car(straight());for(let i=0;i<100;i++){l.step(1/HZ,{throttle:true,left:true});r.step(1/HZ,{throttle:true,right:true});}assert.ok(l.heading<0);assert.ok(r.heading>0);assert.ok(Math.abs(l.heading+r.heading)<1e-7);const fast=new Car(straight());fast.vz=60;for(let i=0;i<80;i++)fast.step(1/HZ,{right:true});assert.equal(fast.steer,.58);});
test('DRS requires eligibility and closes with braking or steering; boost consumes energy',()=>{const c=new Car(straight());c.step(1/HZ,{drs:true});assert.equal(c.drs,false);c.drsAvailable=true;c.step(1/HZ,{drs:true});assert.equal(c.drs,true);c.step(1/HZ,{drs:true,brake:true});assert.equal(c.drs,false);for(let i=0;i<80;i++)c.step(1/HZ,{right:true,drs:true});assert.equal(c.drs,false);for(let i=0;i<150;i++)c.step(1/HZ,{throttle:true,boost:true});assert.ok(c.ers<.99);});

test('all timing gates are required; a complete valid lap records three sectors',()=>{const q=timingHarness();while(q.laps.length===0)q.step(0);assert.equal(q.laps[0].valid,true);assert.equal(q.laps[0].sectors.length,3);assert.ok(q.best>0);assert.ok(Math.abs(q.laps[0].sectors.reduce((a,b)=>a+b,0)-q.laps[0].time)<.001);const bad=timingHarness();bad.player.progress=3330;bad.lapStart=0;bad.checkpoint=1;bad.step(0);assert.equal(bad.laps[0].valid,false);assert.match(bad.laps[0].reason,/gate/);assert.equal(bad.best,Infinity);});
test('A and D are swapped at the keyboard and move left/right in the driving camera',()=>{
 const view=lookAt([0,2,-5],[0,2,20]),screenX=c=>view[0]*c.x+view[8]*c.z;
 const a=new Car(straight()),d=new Car(straight());
 for(let i=0;i<100;i++){a.step(1/HZ,{throttle:true,[DRIVING_KEYS.KeyA]:true});d.step(1/HZ,{throttle:true,[DRIVING_KEYS.KeyD]:true});}
 assert.ok(screenX(a)<0);assert.ok(screenX(d)>0);assert.equal(DRIVING_KEYS.KeyW,'throttle');assert.equal(DRIVING_KEYS.KeyS,'brake');
});
test('repeated wall bumps and painted-edge excursions preserve a complete timed lap',()=>{
 for(const kind of ['bump','edge']){const q=timingHarness();q.singleLap=true;q.player.step=()=>{q.player.progress+=10;q.player.lastImpact=kind==='bump'?.45:0;q.player.offTrack=kind==='edge';};while(!q.finished)q.step(0);assert.equal(q.laps[0].valid,true,kind);assert.ok(q.best>0);assert.equal(q.laps[0].reason,'');assert.equal(q.player.damage,0);assert.ok(!q.events.some(e=>e.type==='invalid'));}
 const q=timingHarness();q.lapStart=0;q.player.progress=50;q.resetCar();q.step(0);assert.equal(q.valid,false);assert.equal(q.invalidReason,'Car reset');
});
test('wall collisions still lose momentum but cannot accumulate damage or retire the car',()=>{
 const c=new Car(straight());for(let i=0;i<150;i++){c.x=4.7;c.vx=25;c.vz=30;c.collisionCooldown=0;c.step(1/HZ,{});assert.ok(c.x<=4.43);assert.ok(c.vx<25);assert.equal(c.damage,0);}assert.ok(c.lastImpact>0);
});
test('a solo session has one continuous DRS activation, with release and braking consuming it',()=>{
 for(const closing of [0,18,24]){const q=new Qualifying(straight());assert.ok(!('rivals' in q));q.step(16);assert.equal(q.player.drs,true);assert.equal(q.drsUsed,true);for(let i=0;i<100;i++)q.step(16);assert.equal(q.player.drs,true);for(let i=0;i<120;i++)q.step(closing);assert.equal(q.player.drs,false);for(let i=0;i<120;i++)q.step(16);assert.equal(q.player.drs,false);assert.equal(q.player.drsAvailable,false);assert.equal(q.events.filter(e=>e.type==='drs').length,1);}
});
test('DRS resets once at the flying-lap line and next lap, without a held key reopening it',()=>{
 const q=new Qualifying(track);q.step(16);assert.equal(q.drsUsed,true);position(q,-1);q.player.step=(dt,input)=>{q.player.progress+=2;q.player.drs=!!input.drs&&q.player.drsAvailable;};q.step(16);assert.equal(q.drsUsed,false);assert.equal(q.player.drs,false);q.step(16);assert.equal(q.player.drs,false);q.step(0);assert.equal(q.drsUsed,false);assert.equal(q.player.drs,false);q.step(16);assert.equal(q.player.drs,true);assert.equal(q.drsUsed,true);
 position(q,track.length-1);q.checkpoint=12;q.step(16);assert.equal(q.laps.length,1);assert.equal(q.drsUsed,false);assert.equal(q.player.drs,false);q.step(16);assert.equal(q.player.drs,false);
});
test('an interlocked DRS request does not spend the allowance until the flap opens',()=>{
 const q=new Qualifying(straight());for(let i=0;i<100;i++)q.step(2);q.step(18);assert.equal(q.player.drs,false);assert.equal(q.drsUsed,false);for(let i=0;i<100;i++)q.step(16);assert.equal(q.player.drs,true);assert.equal(q.drsUsed,true);
});
test('the same inputs replay deterministically despite client event consumption',()=>{const a=new Qualifying(track,{seed:99}),b=new Qualifying(track,{seed:99});for(let i=0;i<800;i++){const mask=i<500?1:2;a.step(mask);a.drainEvents();b.step(mask);}assert.deepEqual(a.summary(),b.summary());assert.equal(a.player.x,b.player.x);assert.equal(a.player.heading,b.player.heading);assert.equal(a.drsUsed,b.drsUsed);});
test('input codec preserves all pedals, steering, DRS, ERS and shift edges',()=>{for(let mask=0;mask<256;mask++)assert.equal(encodeInput(decodeInput(mask)),mask);});
test('points span 1000 to 200, ties are equal, single finisher gets 1000',()=>{const board=scoreEntries([{team:'C',time:90},{team:'A',time:70},{team:'B',time:80}]);assert.deepEqual(board.map(e=>e.points),[1000,600,200]);assert.deepEqual(board.map(e=>e.rank),[1,2,3]);assert.equal(scoreEntries([{team:'A',time:70}])[0].points,1000);assert.deepEqual(scoreEntries([{team:'A',time:70},{team:'B',time:70},{team:'C',time:90}]).map(e=>e.points),[1000,1000,200]);assert.deepEqual(scoreEntries([{team:'A',time:70},{team:'B',time:70}]).map(e=>e.points),[1000,1000]);assert.deepEqual(scoreEntries([]),[]);});
test('one qualifying round ends after exactly one flying lap, whether valid or invalid',()=>{for(const valid of [true,false]){const q=timingHarness();q.singleLap=true;while(q.lapStart===null)q.step(0);if(!valid)q.invalidate('Contact');while(!q.finished)q.step(0);assert.equal(q.laps.length,1);assert.equal(q.laps[0].valid,valid);const time=q.time;for(let i=0;i<100;i++)q.step(1);assert.equal(q.laps.length,1);assert.equal(q.time,time);}});

test('practice recovery cannot replenish a spent DRS activation',()=>{const q=new Qualifying(straight());q.step(16);q.resetCar();q.step(0);q.step(16);assert.equal(q.player.drs,false);assert.equal(q.drsUsed,true);assert.equal(q.valid,false);});

test('recrossing the start after driving backwards cannot reset the timer or DRS',()=>{const q=new Qualifying(track);position(q,-1);q.player.step=(dt,input)=>{q.player.progress+=2;q.player.drs=!!input.drs&&q.player.drsAvailable;};q.step(0);q.step(0);q.step(16);const started=q.lapStart;assert.equal(q.drsUsed,true);position(q,-1);q.step(16);assert.equal(q.drsUsed,true);assert.equal(q.lapStart,started);assert.equal(q.events.filter(e=>e.type==='flying').length,1);});
