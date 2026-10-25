import test from 'node:test';
import assert from 'node:assert/strict';

test('central board displays infinite times safely and retains its rows through a polling outage',async()=>{
 const previous={document:globalThis.document,fetch:globalThis.fetch,setTimeout:globalThis.setTimeout};
 const elements=new Map(),element=()=>({children:[],textContent:'',append(child){this.children.push(child);},replaceChildren(...children){this.children=children;},set innerHTML(value){throw new Error('Untrusted board text must not become HTML.');}});
 for(const name of ['entries','status','event'])elements.set(name,element());
 let next,offline=false,board={event:'race-event',entries:[{team:'<img src=x onerror=alert(1)>',time:null,rank:null,points:0}]};
 globalThis.document={getElementById:id=>elements.get(id),createElement:element};
 globalThis.setTimeout=callback=>{next=callback;};
 globalThis.fetch=async()=>{if(offline)throw new Error('Offline');return {ok:true,json:async()=>board};};
 try{
  await import('../dist/leaderboard.js');await new Promise(resolve=>setImmediate(resolve));
  const rows=elements.get('entries').children;assert.deepEqual(rows[0].children.map(c=>c.textContent),['—','<img src=x onerror=alert(1)>','∞','0']);
  assert.equal(elements.get('event').textContent,'race-event');assert.equal(typeof next,'function');
  offline=true;await next();assert.equal(elements.get('entries').children,rows);assert.match(elements.get('status').textContent,/reconnecting/);
  offline=false;board={event:'race-event',entries:[{team:'Winner',time:75.123,rank:1,points:1000}]};await next();
  assert.deepEqual(elements.get('entries').children[0].children.map(c=>c.textContent),['1','Winner','1:15.123','1000']);
 }finally{Object.assign(globalThis,previous);}
});
