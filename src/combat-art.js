import {TAU,hash,diamond,glow} from './art.js';
import {artAvailable,dungeon,spell,tiny} from './assets.js';
import {WEAPONS} from './data.js';

const ICE=new Set(['frost','absolute','glacier','needle','frostloom','wintermine']);
const POISON=new Set(['thorn','plague','pestilence']);
const FIRE=new Set(['flame','meteor','starfall','supernova','solar','dashfire','ember']);
const colorOf=source=>WEAPONS[source]?.color||({ember:'#efad62',tideTalent:'#8edee6',forge:'#edcf87',star:'#b4d8f4'}[source])||'#c6e9d8';
function path(g,points,color,fill=true,width=1){
 g.beginPath();for(let i=0;i<points.length;i++)g[i?'lineTo':'moveTo'](Math.round(points[i][0]),Math.round(points[i][1]));
 if(fill){g.closePath();g.fillStyle=color;g.fill()}else{g.strokeStyle=color;g.lineWidth=width;g.stroke()}
}
function crystal(g,x,y,r,angle=0,color='#9cdbed'){
 g.save();g.translate(Math.round(x),Math.round(y));g.rotate(angle);
 path(g,[[0,-r],[-r*.34,0],[0,r*.45],[r*.34,0]],'#366477');path(g,[[0,-r],[-r*.27,0],[0,r*.3]],color);path(g,[[0,-r],[0,r*.3],[r*.28,0]],'#d7f6eb');g.restore();
}
function bell(g,x,y,size,color){
 g.save();g.translate(Math.round(x),Math.round(y));g.scale(size/18,size/18);
 path(g,[[-7,5],[-5,2],[-4,-7],[0,-10],[4,-7],[5,2],[7,5]],'#564138');
 path(g,[[-5,3],[-3,-6],[0,-8],[3,-6],[4,3]],color);g.fillStyle='#f1e3b8';g.fillRect(-3,-5,2,6);g.fillRect(-8,4,16,2);g.fillStyle='#c98c59';g.fillRect(-1,7,3,3);g.restore();
}
export function drawSpirit(g,x,y,t,size=18,golden=false){
 glow(g,x,y,size,'#8cdbc52a');
 g.save();g.globalAlpha*=.65;if(!spell(g,golden?'light-bolt':'wind-bolt',x,y,t,size*1.25,-Math.PI/2))diamond(g,x,y,size*.3,golden?'#ffe4a2':'#a4e2d1');g.restore();
 g.fillStyle=golden?'#c9a15c':'#5b8e89';g.fillRect(Math.round(x)-4,Math.round(y)-5,8,9);g.fillStyle=golden?'#fff1bf':'#e6ffdf';g.fillRect(Math.round(x)-2,Math.round(y)-4,4,6);g.fillStyle='#304a4b';g.fillRect(Math.round(x)-5,Math.round(y)+3,10,2);g.fillRect(Math.round(x)-4,Math.round(y)-7,8,2);
}
export function drawCombatProjectile(g,b,ox,oy,t){
 if(!artAvailable())return false;
 const x=b.x+ox,y=b.y+oy,source=b.source||b.fusionKind||b.type,a=Math.atan2(b.vy,b.vx),color=colorOf(source);
 if(x<-40||y<-40||x>g.canvas.width+40||y>g.canvas.height+40)return true;
 // Every projectile uses its actual world position; animation never changes hit geometry.
 g.save();
 if(b.trail){
  const trail=b.trail;g.lineWidth=b.type==='flame'?2:1;
  for(let i=1;i<trail.length;i++){g.globalAlpha=i/trail.length*.24;path(g,[[trail[i-1].x+ox,trail[i-1].y+oy],[trail[i].x+ox,trail[i].y+oy]],b.enemy?'#f07a83':color,false,g.lineWidth)}g.globalAlpha=1;
 }
 if(b.enemy){
  // Hostile shots keep a warm outline and hollow core even against bright player spells.
  g.fillStyle='#351e32';g.beginPath();g.arc(x,y,6,0,TAU);g.fill();g.strokeStyle='#ff8e9c';g.lineWidth=1.5;g.stroke();path(g,[[x-3,y],[x,y-3],[x+3,y],[x,y+3]],'#ffc2ac');
 }else if(b.type==='scythe'){
  g.translate(Math.round(x),Math.round(y));g.rotate(t*9*(b.returning?-1:1));const r=b.r;
  const blades=source==='eclipse'?2:1;
  for(let n=0;n<blades;n++){g.rotate(n*Math.PI);const points=[];for(let i=0;i<=12;i++){const a=-1.5+i*.24;points.push([Math.cos(a)*r,Math.sin(a)*r])}for(let i=12;i>=0;i--){const a=-1.5+i*.24;points.push([Math.cos(a)*r*.62-3,Math.sin(a)*r*.62])}path(g,points,source==='bloodmoon'?'#e58d98':color);path(g,[[0,-r],[0,r*.8]],'#867985',false,3);path(g,[[2,-r*.9],[r*.65,-r*.5],[r*.75,0]],'#f7e6d3',false,1)}
  if(source==='bloodmoon')for(let i=0;i<3;i++){const a=i*TAU/3;path(g,[[Math.cos(a)*r,Math.sin(a)*r],[Math.cos(a)*r*.65,Math.sin(a)*r*.65],[Math.cos(a+.2)*r*.65,Math.sin(a+.2)*r*.65]],'#f4c5bb')}
 }else if(b.type==='venom'){
  g.translate(Math.round(x),Math.round(y));g.rotate(a+t*2);dungeon(g,'flask_green',-9,-9,18,18);g.fillStyle='#d9ef98';g.fillRect(-2,-2,2,2);
  if(source==='plague')for(let i=0;i<3;i++){const a=t*3+i*TAU/3;path(g,[[Math.cos(a)*8,Math.sin(a)*8],[Math.cos(a+.5)*13,Math.sin(a+.5)*13],[Math.cos(a+1)*8,Math.sin(a+1)*8]],'#9bc77d')}
 }else if(b.type==='needle'){
  spell(g,'ice-lance',x,y,t,22,a);if(source==='frostloom'){crystal(g,x,y,8,a+Math.PI/2);for(const side of [-1,1])spell(g,'ice-lance',x-Math.cos(a)*7+Math.sin(a)*side*4,y-Math.sin(a)*7-Math.cos(a)*side*4,t+side,14,a)}
 }else if(b.type==='bone'){
  g.translate(Math.round(x),Math.round(y));g.rotate(t*(source==='ricochet'?16:10));
  for(let i=0;i<4;i++){g.rotate(Math.PI/2);g.fillStyle='#d9d4ba';g.fillRect(-2,0,4,10);g.fillRect(-4,7,8,3);g.fillStyle='#7e8580';g.fillRect(1,2,1,5)}
  g.fillStyle='#35444b';g.fillRect(-3,-3,6,6);if(source==='ricochet'){g.fillStyle='#f4c885';g.fillRect(-1,-1,2,2);for(let i=0;i<4;i++)crystal(g,Math.cos(i*TAU/4)*13,Math.sin(i*TAU/4)*13,4,i*TAU/4,'#e3e0c7')}
 }else if(b.type==='flame'){
  g.globalAlpha*=.65;spell(g,b.lvl===6?'firebomb':'fireball',x,y,t,b.lvl===6?32:25,a);glow(g,x,y,17,'#f9a15716');
 }else if(b.type==='refraction'){
  g.translate(Math.round(x),Math.round(y));g.rotate(a);path(g,[[10,0],[-5,-5],[-2,0],[-5,5]],'#deb2f4');path(g,[[8,0],[-2,-2],[-2,2]],'#f4ede0');
 }else if(b.type==='soul'){
  if(['lantern','beacon'].includes(source))drawSpirit(g,x,y,t,source==='beacon'?22:17,source==='beacon');
  else if(source==='soulforge'){spell(g,'pure-bolt-2',x,y,t,24,a);spell(g,'magic-sparks',x,y,t,20)}
  else if(source==='requiem'){spell(g,'wind-bolt',x,y,t,26,a);g.fillStyle='#fbf0cd';g.fillRect(Math.round(x)-1,Math.round(y)-2,1,2);g.fillRect(Math.round(x)+2,Math.round(y)-2,1,2)}
  else if(b.talent==='star'){g.save();g.translate(x,y);g.rotate(t*2);path(g,[[0,-8],[2,-2],[8,0],[2,2],[0,8],[-2,2],[-8,0],[-2,-2]],'#d5def7');g.restore();spell(g,'magic-sparks',x,y,t,22)}
  else spell(g,'light-bolt',x,y,t,20,a);
 }else if(b.type==='bolt'){
  if(source==='sentinel'||source==='bastion'){spell(g,'rock-sling',x,y,t,source==='bastion'?18:14,t*6);if(source==='bastion'){g.strokeStyle='#dbcb9f';g.lineWidth=1;g.strokeRect(Math.round(x)-4,Math.round(y)-4,8,8)}}
  else if(source==='stormsentry')spell(g,'light-bolt',x,y,t,25,a);
  else if(b.talent==='wind'){spell(g,'wind-bolt',x,y,t,26,a);g.fillStyle='#ecf7be';g.fillRect(Math.round(x)-1,Math.round(y)-1,2,2)}
  else {g.save();g.translate(Math.round(x),Math.round(y));g.rotate(a+Math.PI/2);if(!dungeon(g,'weapon_arrow',-3,-10,6,21))path(g,[[0,-10],[0,10]],'#dbdfbd',false,2);g.restore();if(source==='thunderbolt')spell(g,'arcane-bolt',x,y,t,22,a)}
 }else{g.restore();return false}
 g.restore();return true;
}

function iceField(g,x,y,r,t,strong=false){
 g.strokeStyle='#8dbed22d';g.lineWidth=1;
 for(let i=0;i<6;i++){const a=i*TAU/6,ex=x+Math.cos(a)*r,ey=y+Math.sin(a)*r;path(g,[[x,y],[ex,ey]],'#8dbed239',false);for(const side of [-1,1])path(g,[[x+Math.cos(a)*r*.65,y+Math.sin(a)*r*.65],[x+Math.cos(a+side*.25)*r*.45,y+Math.sin(a+side*.25)*r*.45]],'#8dbed22d',false)}
 for(let i=0;i<8;i++){const a=i*2.4,rr=r*(.52+hash(i,3)*.4),xx=x+Math.cos(a)*rr,yy=y+Math.sin(a)*rr;crystal(g,xx,yy,(strong?10:6)+Math.sin(t*2+i),a*.2)}
}
function fireField(g,x,y,r,t,inner=0){
 g.save();g.globalAlpha*=.35;
 for(let i=0;i<14;i++){const a=i*2.4,rr=inner+(r-inner)*(.25+hash(i,8)*.7);spell(g,'fireball',x+Math.cos(a)*rr,y+Math.sin(a)*rr-5,t+i*.13,20+hash(i,2)*12,-Math.PI/2)}
 g.restore();
}
export function drawCombatZone(g,z,ox,oy,t){
 if(!artAvailable())return false;
 const x=z.x+ox,y=z.y+oy,source=z.source||z.kind||'flame',color=colorOf(source),r=z.r||10;
 if(x+r<-40||y+r<-140||x-r>g.canvas.width+40||y-r>g.canvas.height+40)return true;
 if(z.kind==='lanceEcho'||z.kind==='meleeEcho')return true;
 g.save();g.globalAlpha=Math.min(1,z.t*4);
 if(z.kind==='tidalWave'){
  const angle=Math.atan2(z.vy,z.vx),vortex=source==='maelstrom';
  // A faint circular footprint preserves the real swept collision boundary.
  g.strokeStyle=color+'30';g.lineWidth=1;g.beginPath();g.arc(x,y,r,0,TAU);g.stroke();
  if(vortex){
   for(let arm=0;arm<3;arm++){const points=[];for(let i=0;i<24;i++){const a=t*3+arm*TAU/3+i*.12,rr=r*(1-i/27);points.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr*.8])}path(g,points,arm?'#72b6c7aa':'#d6ede6cc',false,2)}spell(g,'water-orb',x,y,t,24);
  }else{
   g.translate(x,y);g.rotate(angle);const points=[];for(let i=0;i<=18;i++){const a=-1.25+i*2.5/18;points.push([Math.cos(a)*r*.85,Math.sin(a)*r*.85])}for(let i=18;i>=0;i--){const a=-1.25+i*2.5/18;points.push([Math.cos(a)*r*.65-6,Math.sin(a)*r*.82])}path(g,points,'#75b4d777');
   for(let i=0;i<6;i++){const a=-1.1+i*.44;spell(g,'splash',Math.cos(a)*r*.8,Math.sin(a)*r*.8,t+i*.09,25,a+Math.PI/2)}
  }
 }else if(z.kind==='turret'){
  const pulse=1+Math.sin(t*5)*.08;
  g.fillStyle='#111d25';g.beginPath();g.ellipse(x,y,17,7,0,0,TAU);g.fill();
  if(source==='bastion'){
   tiny(g,40,x-15,y-23,30,24);for(let i=0;i<3;i++)tiny(g,14,x-16+i*11,y-30,10,10);tiny(g,19,x-8,y-22,16,16);
   g.strokeStyle='#d5cc9f44';g.setLineDash([3,6]);g.beginPath();g.arc(x,y,z.values.shieldRadius||75,0,TAU);g.stroke();g.setLineDash([]);
  }else if(source==='stormsentry'){
   g.fillStyle='#525c71';g.fillRect(x-13,y-5,26,7);for(const side of [-1,1]){g.fillRect(x+side*8-3,y-28,6,24);g.fillStyle='#dcc285';for(let i=0;i<4;i++)g.fillRect(x+side*8-5,y-25+i*5,10,2);g.fillStyle='#525c71'}
   path(g,[[x-8,y-29],[x-3,y-34],[x+2,y-27],[x+8,y-30]],'#e4defb',false,2);spell(g,'magic-sparks',x,y-26,t,24);
  }else if(source==='soulforge'){
   dungeon(g,'column',x-15,y-38,8,38);dungeon(g,'column',x+7,y-38,8,38);g.fillStyle='#9bb6b3';g.fillRect(x-15,y-38,30,4);g.fillRect(x-17,y-3,34,5);spell(g,'light-bolt',x,y-22,t,28,-Math.PI/2);for(let i=0;i<3;i++){const a=t*1.8+i*TAU/3;spell(g,'pure-bolt-2',x+Math.cos(a)*19,y-23+Math.sin(a)*9,t+i,10)}
  }else{dungeon(g,'column',x-9,y-28,18,30);tiny(g,19,x-11,y-30,22,22);g.fillStyle='#d2cd9f';g.fillRect(x-2,y-20,4,3)}
  glow(g,x,y-22,16*pulse,color+'25');g.fillStyle='#15222c';g.fillRect(x-12,y+5,24,3);g.fillStyle=color;g.fillRect(x-11,y+6,22*Math.max(0,z.t/z.max),1);
 }else if(z.kind==='mine'){
  g.strokeStyle=color+'25';g.setLineDash([2,5]);g.beginPath();g.arc(x,y,26,0,TAU);g.stroke();g.setLineDash([]);
  if(source==='wintermine'){path(g,[[x-7,y-14],[x+7,y-14],[x+11,y-7],[x+7,y+5],[x-7,y+5],[x-11,y-7]],'#31546d');path(g,[[x-5,y-12],[x+5,y-12],[x+7,y-7],[x+4,y+3],[x-4,y+3],[x-7,y-7]],'#8bc9d7');crystal(g,x,y-6,11,0)}
  else if(source==='pestilence'){g.fillStyle='#9bb078';g.fillRect(x-2,y-5,4,9);path(g,[[x-11,y-4],[x-6,y-13],[x+3,y-15],[x+11,y-4]],'#678347');g.fillStyle='#e0c7a1';g.fillRect(x-5,y-9,3,2);g.fillRect(x+2,y-7,2,2);spell(g,'plant-missle',x,y-13,t,16,-Math.PI/2)}
  else{dungeon(g,'bomb_f'+Math.floor(t*5)%3,x-10,y-13,20,20);g.fillStyle='#ead596';g.fillRect(x-2,y-3,4,3)}
  if(z.arm<=0){g.fillStyle=Math.sin(t*8)>0?'#f8e7b6':color;g.fillRect(x-2,y+7,4,2)}
 }else if(z.kind==='meteorStrike'){
  const p=1-z.t/z.max,h=105*(1-p),px=x-h*.32,py=y-h;
  g.strokeStyle=color+'66';g.lineWidth=1;g.setLineDash([4,5]);g.beginPath();g.arc(x,y,r,0,TAU);g.stroke();g.setLineDash([]);
  for(let i=0;i<4;i++){const a=i*TAU/4;path(g,[[x+Math.cos(a)*(r+5),y+Math.sin(a)*(r+5)],[x+Math.cos(a)*(r-5),y+Math.sin(a)*(r-5)]],color,false,2)}
  g.globalAlpha=.25+p*.65;g.beginPath();g.ellipse(x,y,9+p*7,4+p*3,0,0,TAU);g.fillStyle=color;g.fill();g.globalAlpha=1;
  spell(g,source==='hailfire'?'water-blast':'firebomb',px,py,t,36,.32+Math.PI/2);
  if(source==='hailfire'){crystal(g,px-7,py,18,.35);spell(g,'fireball',px+6,py-4,t,26,Math.PI/2)}
  else if(source==='supernova'){g.fillStyle='#251d31';g.beginPath();g.arc(px,py,8,0,TAU);g.fill();for(let i=0;i<4;i++){const a=i*TAU/4+t;path(g,[[px+Math.cos(a)*11,py+Math.sin(a)*11],[px+Math.cos(a)*18,py+Math.sin(a)*18]],'#f9dfab',false,2)}}
  else if(source==='starfall')for(const side of [-1,1])spell(g,'fireball',px+side*13,py-18,t+side,20,Math.PI/2);
  else spell(g,'rock-sling',px,py,t,15,t*3);
 }else if(z.kind==='echoWave'){
  const p=1-z.t/z.max;g.globalAlpha=.3;g.setLineDash([2,6]);g.strokeStyle=color;g.beginPath();g.arc(x,y-8,r*p,0,TAU);g.stroke();g.setLineDash([]);
  if(['bell','requiem'].includes(source))bell(g,x,y-8,16*(1-p*.2),color);
  else if(source==='soulchain')spell(g,'magic-sparks',x,y-8,t,32);
  else if(ICE.has(source))crystal(g,x,y-8,14*p+.5,t);
 }else if(!z.kind||['solar','glacier','aftermath','poison','relicFire'].includes(z.kind)){
  g.fillStyle=color+'08';g.beginPath();g.arc(x,y,r,0,TAU);if(z.innerRadius)g.arc(x,y,z.innerRadius,0,TAU,true);g.fill();
  if(!z.trail){g.strokeStyle=color+'33';g.lineWidth=1;g.beginPath();g.arc(x,y,r,0,TAU);g.stroke()}
  if(POISON.has(source)||z.kind==='poison'){
   for(let i=0;i<6;i++){const a=i*2.4,rr=r*(.5+hash(i,8)*.4),xx=x+Math.cos(a)*rr,yy=y+Math.sin(a)*rr;
    if(source==='pestilence'){g.fillStyle='#8cb06d';g.fillRect(xx-1,yy-4,2,7);path(g,[[xx-5,yy-4],[xx,yy-9],[xx+5,yy-4]],'#c4cb8c');g.fillStyle='#d4e3ac77';g.fillRect(xx+Math.sin(t+i)*3,yy-10-(t*7+i*3)%14,2,2)}
    else{path(g,[[x+Math.cos(a)*r*.2,y+Math.sin(a)*r*.2],[xx-6,yy+5],[xx,yy-2],[xx+6,yy]],'#8cad6033',false,1);spell(g,'plant-missle',xx,yy,t*.7+i,source==='plague'?16:12,a);if(source==='plague')path(g,[[xx-4,yy],[xx,yy-8],[xx+3,yy+1]],'#b4ce8755')}
   }
  }else if(source==='hailfire'){iceField(g,x,y,r,t);fireField(g,x,y,r*.65,t)}
  else if(ICE.has(source)){iceField(g,x,y,r,t,source==='glacier');if(source==='glacier')for(let i=0;i<6;i++){const a=i*TAU/6-t*.7,rr=r*(1-(t*.35+i/6)%1);crystal(g,x+Math.cos(a)*rr,y+Math.sin(a)*rr,5,a)}}
  else fireField(g,x,y,r,t+(z.seed||0),z.innerRadius||0);
  if(z.innerRadius){g.strokeStyle='#f0c16c66';g.beginPath();g.arc(x,y,z.innerRadius,0,TAU);g.stroke()}
 }else{g.restore();return false}
 g.restore();return true;
}

function burst(g,source,x,y,r,p,t,color){
 const reach=r*Math.min(1,p*2.4);g.globalAlpha=Math.max(0,1-p);
 if(ICE.has(source)){
  const count=source==='absolute'?6:source==='frostloom'?16:12;
  for(let i=0;i<count;i++){const a=i*TAU/count;crystal(g,x+Math.cos(a)*reach*.78,y+Math.sin(a)*reach*.78,(source==='absolute'?17:7)+Math.sin(p*Math.PI)*(source==='frostloom'?8:16),a+Math.PI/2);path(g,[[x+Math.cos(a)*reach*.25,y+Math.sin(a)*reach*.25],[x+Math.cos(a)*reach,y+Math.sin(a)*reach]],'#afddeb88',false,1)}
  if(source==='absolute'){const hex=[];for(let i=0;i<=6;i++){const a=i*TAU/6;hex.push([x+Math.cos(a)*reach,y+Math.sin(a)*reach])}path(g,hex,'#d9f1e4',false,2)}
  g.strokeStyle='#a6cfd94d';g.beginPath();g.arc(x,y,reach,0,TAU);g.stroke();
 }else if(source==='hammer'||source==='quake'){
  g.strokeStyle=color;g.lineWidth=source==='quake'?3:2;g.beginPath();g.arc(x,y,reach,0,TAU);g.stroke();
  for(let i=0;i<8;i++){const a=i*TAU/8,rr=reach*.8;path(g,[[x+Math.cos(a)*rr*.2,y+Math.sin(a)*rr*.2],[x+Math.cos(a+.13)*rr*.55,y+Math.sin(a+.13)*rr*.55],[x+Math.cos(a)*rr,y+Math.sin(a)*rr]],'#c5b6a2',false,2)}
  g.save();g.translate(x,y-8);g.rotate(-.65+p*.9);dungeon(g,source==='quake'?'weapon_big_hammer':'weapon_hammer',-8,-30,16,38);g.restore();
 }else if(source==='bell'||source==='requiem'){
  bell(g,x,y-4,(source==='requiem'?35:27)*(1-p*.2),color);
  for(let ring=0;ring<3;ring++){const rr=reach*(1-ring*.17),points=[];for(let i=0;i<=64;i++){const a=i*TAU/64,wave=Math.sin(a*12+p*18)*3;points.push([x+Math.cos(a)*(rr+wave),y+Math.sin(a)*(rr+wave)])}path(g,points,ring?'#d8bd7c77':color,false,ring?1:2)}
  if(source==='requiem')for(let i=0;i<5;i++){const a=i*TAU/5;spell(g,'wind-bolt',x+Math.cos(a)*reach,y+Math.sin(a)*reach,t,26,a)}
 }else if(source==='tideTalent'||source==='tide'||source==='maelstrom'){
  for(let i=0;i<10;i++){const a=i*TAU/10;spell(g,'splash',x+Math.cos(a)*reach*.85,y+Math.sin(a)*reach*.85,t+i*.08,26,a+Math.PI/2)}
 }else if(POISON.has(source)){
  for(let i=0;i<10;i++){const a=i*TAU/10;spell(g,'plant-missle',x+Math.cos(a)*reach*.75,y+Math.sin(a)*reach*.75,t+i,22,a);g.fillStyle='#b1ca7977';g.beginPath();g.arc(x+Math.cos(a+.15)*reach,y+Math.sin(a+.15)*reach,3,0,TAU);g.fill()}
 }else if(FIRE.has(source)||source==='hailfire'||source==='mine'){
  g.globalAlpha*=.4;spell(g,'firebomb',x,y,t,Math.min(72,24+reach),-Math.PI/2);
  g.strokeStyle='#efb571';g.lineWidth=1;g.beginPath();g.arc(x,y,reach,0,TAU);g.stroke();
  for(let i=0;i<9;i++){const a=i*TAU/9;spell(g,source==='hailfire'&&i%2?'ice-lance':'fireball',x+Math.cos(a)*reach*.78,y+Math.sin(a)*reach*.78,t+i,21,a);if(source==='meteor'||source==='starfall')spell(g,'rock-sling',x+Math.cos(a)*reach*.6,y+Math.sin(a)*reach*.6,t+i,7+i%3*2,a+t)}
  if(source==='supernova')for(let i=0;i<4;i++){const a=i*TAU/4;path(g,[[x,y],[x+Math.cos(a)*reach,y+Math.sin(a)*reach]],'#ffe5aa',false,4*(1-p)+1)}
 }else if(['capacitor','arcforge','forge','stormsentry'].includes(source)){
  for(let i=0;i<7;i++){const a=i*TAU/7,points=[[x,y],[x+Math.cos(a-.14)*reach*.5,y+Math.sin(a-.14)*reach*.5],[x+Math.cos(a+.15)*reach*.7,y+Math.sin(a+.15)*reach*.7],[x+Math.cos(a)*reach,y+Math.sin(a)*reach]];path(g,points,'#f1cf94',false,2)}
 }else{
  for(let i=0;i<8;i++){const a=i*TAU/8;spell(g,source==='beacon'?'pure-bolt-2':'magic-sparks',x+Math.cos(a)*reach*.7,y+Math.sin(a)*reach*.7,t+i,22,a)}
  g.strokeStyle=color+'77';g.lineWidth=1;g.beginPath();g.arc(x,y,reach,0,TAU);g.stroke();
 }
}
export function drawCombatEffect(g,fx,ox,oy,t){
 if(!artAvailable())return false;
 const source=fx.source||({frost:'frost',slash:'blade',lightning:'storm'}[fx.type]),x=fx.x+ox,y=fx.y+oy,p=1-fx.t/fx.max,color=fx.color||colorOf(source);
 if(fx.type==='pulse'&&['crescent','eclipse','bloodmoon'].includes(source)){
  g.save();g.globalAlpha=1-p;for(let side=0;side<2;side++){const points=[];for(let i=0;i<12;i++){const a=side*Math.PI+i*.16+p,r=fx.r*(.35+p*.65);points.push([x+Math.cos(a)*r,y+Math.sin(a)*r])}path(g,points,source==='bloodmoon'?'#ed9ba8':'#e6d6f0',false,2)}g.restore();return true;
 }
 if(fx.type==='pulse'&&source){g.save();burst(g,source,x,y,fx.r,p,t,color);g.restore();return true}
 if(fx.type==='frost'){g.save();burst(g,source,x,y,fx.r,p,t,color);g.restore();return true}
 if(fx.type==='beam'){
  const ex=fx.tx+ox,ey=fx.ty+oy,dx=ex-x,dy=ey-y,len=Math.hypot(dx,dy),a=Math.atan2(dy,dx);g.save();g.globalAlpha=1-p;
  if(source==='tether'||source==='soulchain'){
   const count=Math.max(1,Math.ceil(len/9));for(let i=0;i<count;i++){const u=i/count,xx=x+dx*u,yy=y+dy*u+Math.sin(u*Math.PI)*8*(1-p);g.save();g.translate(xx,yy);g.rotate(a);g.strokeStyle=i%2?'#ced6d4':'#7898a5';g.lineWidth=1.5;g.beginPath();g.ellipse(0,0,5,i%2?2:3,0,0,TAU);g.stroke();g.restore()}
   path(g,[[ex-5,ey-6],[ex+4,ey-5],[ex+6,ey+3],[ex,ey+7]],'#e5d9ec',false,2);if(source==='soulchain')spell(g,'magic-orb',ex,ey,t,25);
  }else if(source==='lance'||source==='execution'){
   g.translate(x,y);g.rotate(a);const w=fx.width,lenNow=len*Math.min(1,p*6+.4);
   path(g,[[0,-w*.3],[lenNow-24,-w],[lenNow+8,0],[lenNow-24,w],[0,w*.3]],source==='execution'?'#d9b5ca99':'#e8c68caa');path(g,[[0,0],[lenNow+8,0]],'#fff1cf',false,2);g.save();g.translate(lenNow-16,0);g.rotate(Math.PI/2);dungeon(g,'weapon_spear',-3,-20,6,38);g.restore();
   if(source==='execution')for(const side of [-1,1])path(g,[[lenNow-35,side*w],[lenNow-15,side*w*1.5],[lenNow,0]],'#e6dae7',false,2);
  }else{
   g.translate(x,y);g.rotate(a);g.globalAlpha=(1-p)*.22;g.fillStyle=color;g.fillRect(0,-fx.width,len,fx.width*2);g.globalAlpha=1-p;
   for(let i=0;i<3;i++){const offset=(i-1)*Math.max(2,fx.width*.3);path(g,[[0,0],[18,offset],[len,offset]],['#91dbe1','#f3d3eb','#ddbf81'][i],false,i===1?2:1)}
   for(let d=12;d<len;d+=24)spell(g,source==='tempest'?'light-bolt':'magic-ray',d,0,t+d/100,14,0,1.8);
   path(g,[[-9,0],[0,-9],[9,0],[0,9]],'#9c6c96');path(g,[[-6,0],[0,-7],[0,7]],'#d5e8e9');path(g,[[0,-7],[6,0],[0,7]],'#c59acb');
  }g.restore();return true;
 }
 if(fx.type==='lightning'){
  const ex=fx.tx+ox,ey=fx.ty+oy,circuit=['capacitor','arcforge','forge'].includes(source),points=[[x,y]];
  for(let i=1;i<8;i++){const xx=x+(ex-x)*i/8,yy=y+(ey-y)*i/8,jitter=(hash(i,Math.floor(t*16),Math.floor(fx.seed||0))*2-1)*12;if(circuit){points.push([xx,points.at(-1)[1]],[xx,yy+jitter])}else points.push([xx+jitter,yy-jitter])}points.push([ex,ey]);
  g.save();g.globalAlpha=(1-p)*.2;path(g,points,circuit?'#f6b95f':'#bc9fe4',false,7);g.globalAlpha=1-p;path(g,points,circuit?'#eac179':'#bf9edf',false,3);path(g,points,'#fff0d2',false,1);
  spell(g,circuit?'black-and-white-sparks':'magic-sparks',ex,ey,t,27);
  if(!circuit){path(g,[[ex-8,ey-85],[ex+5,ey-53],[ex-6,ey-32],[ex,ey]],'#e0d0f3',false,fx.lvl>=4?3:1)}
  if(source==='arcforge'){g.strokeStyle='#f9dfa3';g.strokeRect(ex-6,ey-6,12,12)}g.restore();return true;
 }
 if(fx.type==='slash'){
  g.save();g.globalAlpha=(1-p)*.6;const points=[],r=fx.r,a1=fx.a-fx.arc/2+fx.arc*p*.45,a2=fx.a+fx.arc/2;
  for(let i=0;i<=24;i++){const a=a1+(a2-a1)*i/24;points.push([x+Math.cos(a)*r,y+Math.sin(a)*r])}for(let i=24;i>=0;i--){const a=a1+(a2-a1)*i/24,inner=r-(4+Math.sin(i/24*Math.PI)*8)*(1-p);points.push([x+Math.cos(a)*inner,y+Math.sin(a)*inner])}path(g,points,source==='solar'?'#f0b96c':color);
  g.globalAlpha=1-p;path(g,points.slice(0,25),'#fff0cf',false,1);
  const a=a1+(a2-a1)*.6,axe=source==='axe'||source==='whirlwind';g.translate(x+Math.cos(a)*r*.65,y+Math.sin(a)*r*.65);g.rotate(a+Math.PI/2);
  dungeon(g,({solar:'weapon_golden_sword',lance:'weapon_spear',execution:'weapon_spear',axe:'weapon_waraxe',whirlwind:'weapon_double_axe'}[source])||'weapon_knight_sword',axe?-9:-5,-23,axe?18:10,35);g.restore();return true;
 }
 return false;
}
export function drawOrbitCrystal(g,x,y,t){crystal(g,x,y,14,t*.3);spell(g,'black-and-white-sparks',x,y,t,22)}
