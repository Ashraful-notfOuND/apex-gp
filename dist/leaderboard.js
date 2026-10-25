const entries=document.getElementById('entries'),status=document.getElementById('status');
const time=value=>{if(!Number.isFinite(value))return '∞';const ms=Math.round(value*1000);return `${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;};
async function refresh(){
 try{
  const response=await fetch('/api/leaderboard',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error();const board=await response.json();
  const rows=board.entries.map(entry=>{const row=document.createElement('tr');for(const text of [entry.rank??'—',entry.team,time(entry.time),entry.points]){const cell=document.createElement('td');cell.textContent=String(text);row.append(cell);}return row;});
  entries.replaceChildren(...rows);document.getElementById('event').textContent=board.event;status.textContent=rows.length?'Live · updated '+new Date().toLocaleTimeString():'Waiting for the first team instance.';
 }catch{status.textContent='Live timing is reconnecting. Previously displayed results are retained.';}
 finally{setTimeout(refresh,2000);}
}
void refresh();
