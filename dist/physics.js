import {clamp,mix,mod} from './engine.js';
import {HALF_WIDTH,BARRIER} from './track.js';
import {CARS,TYRES} from './cars.js';
export const teams=CARS;
export const angleDifference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function formatTime(seconds){if(!Number.isFinite(seconds)||seconds<0)return '—:—.———';const ms=Math.round(seconds*1000);return `${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;}
const gearSpeeds=[0,23,33,44,56,68,80,91,101];
export class Car {
 constructor(track,profile=CARS[1],tyre='soft'){this.track=track;this.profile=profile;this.tyre=TYRES[tyre];this.reset();}
 reset(){this.progress=-120;const p=this.track.at(this.progress);Object.assign(this,{x:p.x,z:p.z,y:p.y,heading:p.heading,vx:0,vz:0,speed:0,yawRate:0,steer:0,throttle:0,brake:0,gear:1,rpm:4000,auto:false,ers:1,boost:false,drs:false,drsAvailable:false,damage:0,fuel:12,tireTemp:[76,76,78,78],wear:0,slip:0,offTrack:false,collisionCooldown:0,near:p,lastIndex:null,lastS:p.s,lastImpact:0,distanceDriven:0,brakeHeat:100,shifting:0,lap:0,lockup:0,wheelspin:0,brakeBias:.57,gLong:0,gLat:0});}
 shift(up){const next=clamp(this.gear+(up?1:-1),1,8);if(next===this.gear)return;this.gear=next;this.shifting=.075;}
 recover(){const p=this.track.at(this.progress);Object.assign(this,{x:p.x,z:p.z,y:p.y,heading:p.heading,vx:0,vz:0,yawRate:0,lastS:p.s,lastIndex:null});}
 step(dt,input){
  this.collisionCooldown=Math.max(0,this.collisionCooldown-dt);this.shifting=Math.max(0,this.shifting-dt);
  this.near=this.track.nearest(this.x,this.z,this.lastIndex);this.lastIndex=this.near.index;
  this.offTrack=Math.abs(this.near.offset)>HALF_WIDTH;
  const f=[Math.sin(this.heading),Math.cos(this.heading)],r=[f[1],-f[0]];
  let vLong=this.vx*f[0]+this.vz*f[1],vSide=this.vx*r[0]+this.vz*r[1];this.speed=Math.hypot(this.vx,this.vz);
  this.throttle=mix(this.throttle,input.throttle?1:0,Math.min(1,dt*9));this.brake=mix(this.brake,input.brake?1:0,Math.min(1,dt*18));
  const target=((input.right?1:0)-(input.left?1:0))*.58;
  this.steer+=clamp(target-this.steer,-dt*1.1,dt*1.1); // Fixed physical steering rack, no speed-based steering aid.
  this.drs=!!input.drs&&this.drsAvailable&&this.brake<.05&&Math.abs(this.steer)<.06;
  this.boost=!!input.boost&&this.ers>.01&&this.throttle>.1;
  const mass=768+this.fuel,normal=mass*9.81+(this.speed**2)*2.45*this.profile.grip*(this.drs?.69:1);
  const temps=this.tireTemp.reduce((a,b)=>a+b,0)/4;
  const thermal=clamp(1-Math.abs(temps-this.tyre.optimum)/this.tyre.window*.09,.68,1);
  const mu=1.63*this.profile.grip*this.tyre.grip*thermal*(1-this.wear*.25)*(this.offTrack?.72:1);
  const transfer=clamp(-this.gLong*.045,-.13,.19),frontLoad=normal*(.46+transfer),rearLoad=normal-frontLoad;
  this.rpm=clamp(Math.max(0,vLong)/gearSpeeds[this.gear]*13500+this.throttle*850,4000,13900);
  const torqueCurve=clamp(1-Math.abs(this.rpm-10600)/17000,.57,1);
  const power=(635000+ (this.boost?170000:0))*this.profile.power*(1-this.damage*.6)*torqueCurve;
  const limiter=vLong>gearSpeeds[this.gear]*this.profile.top/350?.12:1;
  const drive=Math.min(15500,power/Math.max(16,Math.abs(vLong)))*this.throttle*limiter*(this.shifting?.08:1)*(this.fuel>0?1:0);
  const maxRear=mu*rearLoad*this.profile.traction;
  this.wheelspin=clamp((drive-maxRear)/Math.max(maxRear,1),0,1);
  let engine=Math.min(drive,maxRear)*(1-this.wheelspin*.13);
  const requestedBrake=this.brake*36000*this.profile.brakes;
  const frontBrake=requestedBrake*this.brakeBias,rearBrake=requestedBrake*(1-this.brakeBias);
  this.lockup=this.speed>3?clamp(Math.max(frontBrake/(mu*frontLoad),rearBrake/(mu*rearLoad))-1.08,0,1):0;
  const braking=Math.min(frontBrake,mu*frontLoad)+Math.min(rearBrake,mu*rearLoad);
  const frontBudget=mu*frontLoad*Math.sqrt(Math.max(.07,1-Math.min(1,frontBrake/(mu*frontLoad))**2))*(1-this.lockup*.35);
  const rearLong=engine-rearBrake,rearBudget=mu*rearLoad*Math.sqrt(Math.max(.06,1-Math.min(1,Math.abs(rearLong)/(mu*rearLoad))**2))*(1-this.wheelspin*.35);
  const frontSlip=this.steer-Math.atan2(vSide+1.65*this.yawRate,Math.max(3,Math.abs(vLong)));
  const rearSlip=-Math.atan2(vSide-1.75*this.yawRate,Math.max(3,Math.abs(vLong)));
  const frontForce=frontBudget*Math.tanh(frontSlip*9),rearForce=rearBudget*Math.tanh(rearSlip*9);
  const yawAccel=(frontForce*1.65-rearForce*1.75)/(mass*2.5)-this.yawRate*.8;
  this.yawRate+=yawAccel*dt;
  if(this.speed<1)this.yawRate*=Math.max(0,1-dt*12);
  const drag=.68*this.profile.drag*(this.drs?.73:1)*vLong*Math.abs(vLong);
  const slope=(this.track.at(this.progress+2).y-this.track.at(this.progress-2).y)/4;
  let aLong=(engine-drag-(vLong>0?braking:0))/mass-.16-Math.max(0,vLong)*.005-slope*9.81;
  if(vLong<=.15&&aLong<0)aLong=0;
  const aSide=(frontForce*Math.cos(this.steer)+rearForce)/mass;
  this.gLong=aLong/9.81;this.gLat=aSide/9.81;
  this.vx+=(f[0]*aLong+r[0]*aSide)*dt;this.vz+=(f[1]*aLong+r[1]*aSide)*dt;
  if(this.brake>.1&&vLong<.4){this.vx*=Math.max(0,1-dt*35);this.vz*=Math.max(0,1-dt*35);}
  this.heading+=this.yawRate*dt;this.x+=this.vx*dt;this.z+=this.vz*dt;
  const next=this.track.nearest(this.x,this.z,this.lastIndex);this.y=next.y;
  const delta=mod(next.s-this.lastS+this.track.length/2,this.track.length)-this.track.length/2;
  if(Math.abs(delta)<8){this.progress+=delta;this.distanceDriven+=Math.hypot(this.vx,this.vz)*dt;}
  this.lastS=next.s;this.lastIndex=next.index;this.near=next;
  if(Math.abs(next.offset)>BARRIER-1.05){const side=Math.sign(next.offset);this.x=next.x+next.rx*(BARRIER-1.08)*side;this.z=next.z+next.rz*(BARRIER-1.08)*side;const impactSpeed=this.vx*next.rx+this.vz*next.rz;
   if(impactSpeed*side>0){this.vx-=next.rx*impactSpeed*1.2;this.vz-=next.rz*impactSpeed*1.2;this.vx*=.82;this.vz*=.82;this.yawRate*=.65;if(this.collisionCooldown<=0){this.lastImpact=clamp(Math.abs(impactSpeed)*.012,.008,.45);this.collisionCooldown=.6;}}
  }
  this.slip=clamp(Math.abs(frontSlip)+Math.abs(rearSlip)+this.wheelspin*.5,0,1);
  for(let i=0;i<4;i++){const work=Math.abs(this.gLat)*7+this.brake*(i<2?25:12)+this.wheelspin*(i<2?0:32)+this.lockup*24;this.tireTemp[i]=mix(this.tireTemp[i],69+this.speed*.22+work,dt*.028*this.tyre.warm);}
  this.wear=clamp(this.wear+dt*(.000035+this.slip*.00025+this.lockup*.0008)*this.tyre.wear,0,1);
  this.ers=clamp(this.ers+(this.boost?-.082:this.brake>.15?.055:.003)*dt,0,1);this.fuel=Math.max(0,this.fuel-dt*(.004+this.throttle*.025));this.brakeHeat=mix(this.brakeHeat,100+this.brake*this.speed*11,dt*.3);
  this.speed=Math.hypot(this.vx,this.vz);this.lap=Math.floor(Math.max(0,this.progress)/this.track.length)+1;
 }
}
