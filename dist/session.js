import {Car} from './physics.js';
import {getCar,TYRES} from './cars.js';
export const HZ=120;
export const MAX_TICKS=HZ*600;
export const VERSION='monaco-2026-v3';
export const MAX_ROUNDS=3;
// Looking forward along local +Z, camera-right is local -X. Swap the rack
// inputs so A moves left and D moves right in the driver's view.
export const DRIVING_KEYS=Object.freeze({KeyW:'throttle',KeyS:'brake',KeyA:'right',KeyD:'left',Space:'drs',ShiftLeft:'boost',ShiftRight:'boost'});
export function encodeInput(i){return (i.throttle?1:0)|(i.brake?2:0)|(i.left?4:0)|(i.right?8:0)|(i.drs?16:0)|(i.boost?32:0)|(i.up?64:0)|(i.down?128:0);}
export function decodeInput(n){return{throttle:!!(n&1),brake:!!(n&2),left:!!(n&4),right:!!(n&8),drs:!!(n&16),boost:!!(n&32),up:!!(n&64),down:!!(n&128)};}
export class Qualifying {
 constructor(track,{car='ferrari',tyre='soft',seed=2026,singleLap=false}={}){
  if(!getCar(car)||!TYRES[tyre])throw new Error('Unknown car or tyre compound.');
  this.singleLap=singleLap;this.track=track;this.player=new Car(track,getCar(car),tyre);this.drsUsed=false;this.drsActive=false;this.drsArmed=true;
  this.ticks=0;this.time=0;this.lapStart=null;this.valid=true;this.invalidReason='';this.checkpoint=0;this.laps=[];this.sectors=[];this.sectorStart=0;this.best=Infinity;this.events=[];this.finished=false;this.previous=0;this.recovery=0;
 }
 invalidate(reason){if(this.valid){this.valid=false;this.invalidReason=reason;this.events.push({type:'invalid',reason});}}
 resetDRS(){this.drsUsed=false;this.drsActive=false;this.drsArmed=false;this.player.drs=false;this.player.drsAvailable=false;}
 resetCar(){this.player.recover();this.invalidate('Car reset');this.recovery=5;}
 step(mask){
  if(this.finished)return;
  const dt=1/HZ,input=decodeInput(mask),p=this.player;
  if(input.up&&!(this.previous&64))p.shift(true);if(input.down&&!(this.previous&128))p.shift(false);this.previous=mask;
  // One opening per lap, independent of traffic or a detection zone. A held key
  // cannot reopen a closed flap or consume the next lap's allowance at the line.
  if(!input.drs)this.drsArmed=true;
  p.drsAvailable=this.drsActive||(!this.drsUsed&&this.drsArmed);
  const before=p.progress;this.recovery=Math.max(0,this.recovery-dt);
  p.step(dt,this.recovery>0?{brake:true}:input);
  if(p.drs&&!this.drsActive){this.drsUsed=true;this.events.push({type:'drs'});}
  this.drsActive=p.drs;
  p.drsAvailable=this.drsActive||(!this.drsUsed&&this.drsArmed);
  // Monaco is forgiving: walls still absorb speed, but contact and the narrow
  // painted edge never invalidate a lap. Timing gates still prevent shortcuts.
  if(p.lastImpact>0){this.events.push({type:'impact',strength:p.lastImpact});p.lastImpact=0;}
  this.ticks++;this.time=this.ticks/HZ;
  if(this.lapStart===null&&before<0&&p.progress>=0){this.resetDRS();this.lapStart=this.time;this.valid=true;this.invalidReason='';this.checkpoint=1;this.sectors=[];this.sectorStart=this.time;this.events.push({type:'flying'});}
  if(this.lapStart!==null){
   const lapBase=Math.floor(Math.max(0,before)/this.track.length)*this.track.length;
   const nextGate=lapBase+this.checkpoint*this.track.length/12;
   if(this.checkpoint<12&&before<nextGate&&p.progress>=nextGate){this.checkpoint++;if((this.checkpoint-1)%4===0){this.sectors.push(this.time-this.sectorStart);this.sectorStart=this.time;}}
   if(Math.floor(Math.max(0,p.progress)/this.track.length)>Math.floor(Math.max(0,before)/this.track.length)){
    const lap={time:Math.round((this.time-this.lapStart)*1000)/1000,valid:this.valid&&this.checkpoint===12,reason:this.invalidReason|| (this.checkpoint!==12?'Missed timing gate':''),sectors:[...this.sectors,this.time-this.sectorStart]};
    this.laps.push(lap);if(lap.valid)this.best=Math.min(this.best,lap.time);this.events.push({type:'lap',lap});this.resetDRS();this.lapStart=this.time;this.valid=true;this.invalidReason='';this.checkpoint=1;this.sectors=[];this.sectorStart=this.time;
   }
  }
  if(this.singleLap&&this.laps.length>=1||this.ticks>=MAX_TICKS){this.finished=true;this.events.push({type:'finish'});}
 }
 drainEvents(){return this.events.splice(0);}
 summary(){return {ticks:this.ticks,best:Number.isFinite(this.best)?this.best:null,laps:this.laps,finished:this.finished,valid:this.valid,damage:this.player.damage,drsUsed:this.drsUsed,drsActive:this.drsActive};}
}
// Equal times receive equal points. A single finisher receives 1000 points.
export function scoreEntries(entries){const sorted=[...entries].sort((a,b)=>a.time-b.time||a.team.localeCompare(b.team));const times=[...new Set(sorted.map(e=>e.time))];return sorted.map(e=>{const rank=sorted.findIndex(a=>a.time===e.time)+1;const index=times.indexOf(e.time);return {...e,rank,points:times.length===1?1000:Math.round(1000-800*index/(times.length-1))};});}
