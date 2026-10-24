import {Builder} from './engine.js';
export function buildGarage(renderer){
 const room=new Builder(0),floor=new Builder(21),metal=new Builder(10),lights=new Builder(13),sign=new Builder(20);
 const graphite=[.10,.12,.15],trim=[.29,.33,.38],orange=[1.,.26,.065];
 floor.quad([-20,-.03,-18],[20,-.03,-18],[20,-.03,18],[-20,-.03,18],[.24,.27,.30,.84],[0,1,0]);
 room.box(0,4.9,-6.5,28,10,.3,graphite);
 room.box(-10,4.9,0,.3,10,18,graphite);
 room.box(0,10,0,28,.25,20,[.12,.15,.19]);
 // Recessed wall bays and fluted panels make the lighting legible in depth.
 for(let x=-9;x<=10;x+=3.2){
  room.box(x,2.7,-6.27,3.05,5.1,.16,[.18,.21,.25]);
  metal.box(x-1.55,2.9,-6.12,.045,5.8,.08,trim);
 }
 for(let x=4;x<11;x+=.18)metal.box(x,2.8,-6.03,.045,5.25,.12,[.21,.24,.29]);
 lights.box(0,.18,-6.06,25,.035,.06,orange);
 lights.box(0,6.15,-6.05,25,.045,.09,[.77,.87,1]);
 // Physical softboxes: the environment shader uses the same long strips.
 for(const x of [-4.5,0,4.5]){
  metal.box(x,5.9,0,.68,.14,10,graphite);
  lights.box(x,5.81,0,.48,.025,9.6,[.87,.93,1]);
 }
 for(const side of [-1,1]){
  const x=side<0?-2.8:3.7;
  metal.box(x,2.5,-4.5,.20,4.8,.25,graphite);
  lights.box(x,2.5,-4.35,.065,4.5,.025,side<0?orange:[.73,.85,1]);
 }
 // Inlaid outline around the display bay, flush with the polished floor.
 for(const side of [-1,1]){
  lights.box(side*2.05,-.019,0,.022,.007,6.9,[.65,.76,.85]);
  lights.box(0,-.019,side*3.45,4.12,.007,.022,[.65,.76,.85]);
  room.surface=4;room.box(side*3.0,-.018,0,.12,.008,8,[.045,.055,.065]);
 }
 // Workshop cabinetry and spare slicks give the showroom a paddock setting.
 for(const x of [-6.9,-5.1]){
  room.surface=10;room.box(x,.70,-5.2,1.65,1.4,.85,[.16,.19,.23]);
  metal.box(x,1.42,-5.2,1.7,.07,.91,[.45,.48,.52]);
  for(let j=0;j<5;j++){
   room.surface=0;room.box(x,.20+j*.24,-4.76,1.49,.20,.035,[.11,.13,.16]);
   metal.box(x,.25+j*.24,-4.73,1.13,.022,.035,trim);
  }
 }
 for(let j=0;j<3;j++){
  room.surface=5;room.rod([4.8,.08+j*.30,-4.8],[4.8,.35+j*.30,-4.8],.39,[.035,.04,.05],48);
  room.surface=10;room.rod([4.8,.351+j*.30,-4.8],[4.8,.355+j*.30,-4.8],.22,[.15,.17,.20],40);
 }
 sign.texturedQuad([-9,1.85,-5.96],[-3.4,1.85,-5.96],[-3.4,4.65,-5.96],[-9,4.65,-5.96],[[0,0],[1,0],[1,1],[0,1]],[1,1,1],[0,0,1]);
 const badge=renderer.mesh(sign);
 if(typeof renderer.texture==='function'){
  badge.livery=renderer.texture([20,25,32,255]);renderer.garageTexture=badge.livery;
  renderer.ready=Promise.all([renderer.ready,renderer.loadTexture(badge.livery,'assets/garage-mark.svg')]);
 }
 return {floor:renderer.mesh(floor),meshes:[renderer.mesh(room),renderer.mesh(metal),renderer.mesh(lights),badge]};
}

export function drawGarage(renderer,garage,items){
 for(const mesh of garage.meshes)renderer.draw(mesh);
 renderer.reflection(items);
 renderer.draw(garage.floor,renderer.identity,true);
 for(const item of items)renderer.draw(item.mesh,item.m);
 renderer.contactShadow(items[0].m);
}
