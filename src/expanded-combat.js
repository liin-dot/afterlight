import {TAU,diamond,glow} from './art.js';
import {WEAPONS} from './data.js';
import {poisonEnemy,chainLightning,onWeaponCast} from './relic-combat.js';

const KINDS=new Set(['crescent','thorn','bell','prism','eclipse','requiem','plague','bloodmoon','tempest','absolute']);
const nearby=(game,x,y,r)=>game.grid.near(x,y,r+30).filter(e=>!e.dead&&Math.hypot(e.x-x,e.y-y)<r+e.r);
function wave(game,kind,x,y,r,damage,freeze=0,bossFreeze=0) {
  const color=WEAPONS[kind].color;
  game.effects.push({type:kind==='absolute'?'frost':'pulse',x,y:y-8,r,color,t:.55,max:.55});
  for(const e of nearby(game,x,y,r)) {
    if(freeze){e.freeze=Math.max(e.freeze,e.boss?bossFreeze:freeze);e.slow=Math.max(e.slow,3.2)}
    game.hit(e,damage,x,y,95,true,kind);
  }
  game.burst(x,y-8,16,color,90);
}

export function updateExpandedWeapon(game,kind,v,dt) {
  if(!KINDS.has(kind))return false;
  game.timers[kind]=(game.timers[kind]||0)-dt;if(game.timers[kind]>0)return true;
  const p=game.player,target=game.closest(p.x,p.y,['bell','requiem','absolute'].includes(kind)?v.radius+24:420);
  if(!target){game.timers[kind]=.08;return true}
  game.timers[kind]=v.cooldown;
  const angle=Math.atan2(target.y-p.y,target.x-p.x),before=game.projectiles.length;
  if(['crescent','eclipse','bloodmoon'].includes(kind)) {
    for(let i=0;i<v.count;i++) {
      const a=angle+(i-(v.count-1)/2)*.36;
      game.projectiles.push({type:'scythe',source:kind,x:p.x,y:p.y-8,vx:Math.cos(a)*210,vy:Math.sin(a)*210,damage:v.damage,r:v.radius,t:2.5,age:0,flightTime:v.flightTime,returnMultiplier:v.returnMultiplier,returning:false,hit:new Set(),trail:[],splashDamage:v.splashDamage,splashRadius:v.splashRadius});
    }
    game.sound.play('slash');
  }
  if(kind==='thorn'||kind==='plague') {
    for(let i=0;i<v.count;i++) {
      const a=angle+(i-(v.count-1)/2)*.33;
      game.projectiles.push({type:'venom',source:kind,x:p.x,y:p.y-8,vx:Math.cos(a)*165,vy:Math.sin(a)*165,r:5,t:Math.min(1.1,Math.max(.25,Math.hypot(target.x-p.x,target.y-p.y)/165)),hit:new Set(),damage:v.damage,values:v,trail:[]});
    }
    game.sound.play('flame');
  }
  if(kind==='bell'||kind==='requiem') {
    wave(game,kind,p.x,p.y,v.radius,v.damage);
    for(let i=1;i<=v.echoCount;i++)game.zones.push({kind:'echoWave',source:kind,x:p.x,y:p.y,r:v.radius+i*8,t:v.echoDelay*i,max:v.echoDelay*i,damage:v.echoDamage});
    if(kind==='requiem') {
      for(let i=0;i<v.count;i++) {
        const a=angle+i*TAU/v.count;
        game.projectiles.push({type:'soul',source:kind,x:p.x,y:p.y-9,vx:Math.cos(a)*185,vy:Math.sin(a)*185,r:5,t:2.3,pierce:2,damage:v.soulDamage,homing:true,hit:new Set(),trail:[],angle:a});
      }
    }
    game.sound.play('storm');
  }
  if(kind==='prism'||kind==='tempest') {
    let first=null;
    for(let i=0;i<v.count;i++) {
      const a=angle+(i-(v.count-1)/2)*.26,x=p.x,y=p.y-8,tx=x+Math.cos(a)*v.range,ty=y+Math.sin(a)*v.range;
      game.effects.push({type:'beam',x,y,tx,ty,width:v.width,color:WEAPONS[kind].color,t:.32,max:.32});
      for(const e of nearby(game,x,y,v.range)) {
        const dx=e.x-x,dy=e.y-8-y,along=dx*Math.cos(a)+dy*Math.sin(a),across=Math.abs(-dx*Math.sin(a)+dy*Math.cos(a));
        if(along>=-e.r&&along<=v.range+e.r&&across<v.width+e.r) {
          first||=e;game.hit(e,v.damage,x,y,30,true,kind);
        }
      }
    }
    if(kind==='tempest'&&first)chainLightning(game,first,v.chainDamage,v.chainCount,v.chainRange);
    game.sound.play('shoot');
  }
  if(kind==='absolute') {
    wave(game,kind,p.x,p.y,v.radius,v.damage,v.freeze,v.bossFreeze);
    game.zones.push({kind:'echoWave',source:kind,x:p.x,y:p.y,r:v.radius+12,t:v.echoDelay,max:v.echoDelay,damage:v.blastDamage});
    game.sound.play('frost');
  }
  onWeaponCast(game,kind,game.projectiles[before]);
  return true;
}

function poisonPool(game,b) {
  const v=b.values;
  game.zones.push({kind:'poison',source:b.source,x:b.x,y:b.y,r:v.radius,t:v.duration,max:v.duration,tick:0,hitInterval:v.hitInterval,damage:v.fieldDamage,poisonDamage:v.poisonDamage,poisonDuration:v.poisonDuration,blastDamage:v.blastDamage,seed:game.time});
  game.burst(b.x,b.y,12,'#b6ce80',65);
}

export function updateExpandedProjectile(game,b,dt) {
  if(b.type!=='scythe'&&b.type!=='venom')return false;
  b.t-=dt;
  if(b.t<=0){if(b.type==='venom')poisonPool(game,b);return true}
  const ox=b.x,oy=b.y;
  if(b.type==='scythe') {
    b.age+=dt;
    if(!b.returning&&b.age>=b.flightTime){b.returning=true;b.hit.clear();b.damage*=b.returnMultiplier}
    if(b.returning) {
      const dx=game.player.x-b.x,dy=game.player.y-8-b.y,d=Math.hypot(dx,dy);
      if(d<13){b.t=0;return true}
      b.vx=dx/d*290;b.vy=dy/d*290;
    }
  }
  b.x+=b.vx*dt;b.y+=b.vy*dt;b.trail.push({x:b.x,y:b.y});if(b.trail.length>7)b.trail.shift();
  for(const e of game.grid.near(b.x,b.y,b.r+36)) {
    if(e.dead||b.hit.has(e.id))continue;
    const dx=b.x-ox,dy=b.y-oy,u=Math.max(0,Math.min(1,((e.x-ox)*dx+(e.y-8-oy)*dy)/(dx*dx+dy*dy||1)));
    if(Math.hypot(e.x-ox-dx*u,e.y-8-oy-dy*u)>=e.r+b.r)continue;
    b.hit.add(e.id);
    if(b.type==='venom')poisonEnemy(game,e,b.values.poisonDamage,b.values.poisonDuration);
    game.hit(e,b.damage,ox,oy,45,true,b.source);
    if(b.splashDamage) {
      game.effects.push({type:'pulse',x:e.x,y:e.y-8,r:b.splashRadius,color:'#cbbfe5',t:.23,max:.23});
      for(const other of nearby(game,e.x,e.y,b.splashRadius))if(other!==e)game.hit(other,b.splashDamage,e.x,e.y,25,false);
    }
    if(b.type==='venom'){poisonPool(game,b);b.t=0;break}
  }
  return true;
}

export function updateExpandedZone(game,z,dt) {
  if(!['poison','echoWave'].includes(z.kind))return false;
  z.t-=dt;
  if(z.kind==='echoWave') {
    if(z.t<=0)wave(game,z.source,z.x,z.y,z.r,z.damage);
    return true;
  }
  if(z.t<=0) {
    if(z.blastDamage){wave(game,z.source,z.x,z.y,z.r+16,z.blastDamage);game.sound.play('flame')}
    return true;
  }
  z.tick-=dt;
  if(z.tick<=0) {
    z.tick=z.hitInterval;
    for(const e of nearby(game,z.x,z.y,z.r)) {
      poisonEnemy(game,e,z.poisonDamage,z.poisonDuration);
      game.hit(e,z.damage,z.x,z.y,0,false,z.source);
    }
  }
  return true;
}

export function drawExpandedProjectile(g,b,ox,oy,t) {
  if(!['scythe','venom','refraction','soul'].includes(b.type))return false;
  const x=Math.round(b.x+ox),y=Math.round(b.y+oy),color=WEAPONS[b.source]?.color||'#d7c5e8';
  if(b.type==='scythe') {
    g.save();g.translate(x,y);g.rotate(t*11*(b.returning?-1:1));
    for(let i=0;i<10;i++) {
      const a=i*.24,xx=Math.round(Math.cos(a)*b.r),yy=Math.round(Math.sin(a)*b.r);
      g.fillStyle=i<7?color:'#f0ecd6';g.fillRect(xx-2,yy-2,4,4);
    }
    g.fillStyle='#766b69';g.fillRect(-1,-b.r,2,b.r*2);diamond(g,0,0,3,color);g.restore();
  }else{
    glow(g,x,y,18,color+'33');diamond(g,x,y,b.type==='venom'?6:4,color);diamond(g,x,y-1,2,'#f1f4d8');
    if(b.type==='venom'){g.fillStyle='#75694e';g.fillRect(x-2,y-8,4,3)}
  }
  return true;
}

export function drawExpandedZone(g,z,ox,oy,t) {
  if(!['poison','echoWave'].includes(z.kind))return false;
  const x=z.x+ox,y=z.y+oy,color=WEAPONS[z.source].color;
  g.save();g.globalAlpha=Math.min(1,z.t*3);
  if(z.kind==='echoWave') {
    const r=z.r*(1-z.t/z.max);g.strokeStyle=color+'66';g.lineWidth=1;g.beginPath();g.arc(x,y-8,r,0,TAU);g.stroke();
    for(let i=0;i<8;i++)diamond(g,x+Math.cos(i*TAU/8)*r,y-8+Math.sin(i*TAU/8)*r,2,color);
  }else{
    g.fillStyle='#91ad431e';g.strokeStyle=color+'77';g.beginPath();
    for(let i=0;i<=20;i++){const a=i*TAU/20,r=z.r*(.93+Math.sin(i*2.6+z.seed)*.07),px=Math.round(x+Math.cos(a)*r),py=Math.round(y+Math.sin(a)*r);i?g.lineTo(px,py):g.moveTo(px,py)}
    g.fill();g.stroke();
    for(let i=0;i<16;i++){const a=i*2.4+t*.2,r=z.r*(.2+(i*.17)% .8);diamond(g,Math.round(x+Math.cos(a)*r),Math.round(y+Math.sin(a)*r-Math.sin(t*3+i)*3),i%3?2:3,color)}
  }
  g.restore();return true;
}

export function drawExpandedEffect(g,fx,ox,oy) {
  if(fx.type!=='beam')return;
  const fade=fx.t/fx.max;
  g.globalAlpha=fade*.3;g.strokeStyle=fx.color;g.lineWidth=fx.width*2;
  g.beginPath();g.moveTo(Math.round(fx.x+ox),Math.round(fx.y+oy));g.lineTo(Math.round(fx.tx+ox),Math.round(fx.ty+oy));g.stroke();
  g.globalAlpha=fade;g.lineWidth=3;g.strokeStyle='#f6e7e4';g.stroke();
}
