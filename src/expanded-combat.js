import {TAU,diamond,glow} from './art.js';
import {WEAPONS} from './data.js';
import {poisonEnemy,chainLightning,onWeaponCast} from './relic-combat.js';

const KINDS=new Set(['capacitor','arcforge','tide','maelstrom','needle','frostloom','lantern','beacon','crescent','thorn','bell','prism','eclipse','requiem','plague','bloodmoon','tempest','absolute','shard','meteor','mine','tether','sentinel','lance','starfall','bastion','wintermine','soulchain','ricochet','execution','supernova','stormsentry','pestilence','hailfire','soulforge']);
const nearby=(game,x,y,r)=>game.grid.near(x,y,r+30).filter(e=>!e.dead&&Math.hypot(e.x-x,e.y-y)<r+e.r);
function wave(game,kind,x,y,r,damage,freeze=0,bossFreeze=0,slowDuration=3.2) {
  const color=WEAPONS[kind].color;
  game.effects.push({type:kind==='absolute'?'frost':'pulse',source:kind,x,y:y-8,r,color,t:.55,max:.55});
  for(const e of nearby(game,x,y,r)) {
    if(freeze){e.freeze=Math.max(e.freeze,e.boss?bossFreeze:freeze);e.slow=Math.max(e.slow,slowDuration)}
    game.hit(e,damage,x,y,95,true,kind);
  }
  game.burst(x,y-8,16,color,90);
}

function lanceStrike(game,kind,x,y,angle,v){
  const tx=x+Math.cos(angle)*v.range,ty=y+Math.sin(angle)*v.range;
  game.effects.push({type:'beam',source:kind,x,y:y-8,tx,ty:ty-8,width:v.width,color:WEAPONS[kind].color,t:.28,max:.28});
  for(const e of nearby(game,x,y,v.range+30)){
    const dx=e.x-x,dy=e.y-y,along=dx*Math.cos(angle)+dy*Math.sin(angle),across=Math.abs(-dx*Math.sin(angle)+dy*Math.cos(angle));
    if(along<0||along>v.range+e.r||across>v.width+e.r)continue;
    const bonus=v.executeMultiplier&&e.hp/e.maxHp<=v.threshold?1+(v.executeMultiplier-1)*(e.boss?.5:1):1;
    game.hit(e,v.damage*bonus,x,y,50,true,kind);
  }
}

function detonate(game,z){
  const v=z.values,color=WEAPONS[z.source].color;
  game.effects.push({type:'pulse',source:z.source,x:z.x,y:z.y-8,r:v.radius,color,t:.6,max:.6});
  game.burst(z.x,z.y-8,18,color,95);
  for(const e of nearby(game,z.x,z.y,v.radius)){
    if(v.freeze)e.freeze=Math.max(e.freeze,e.boss?v.bossFreeze:v.freeze);
    if(v.poisonDamage)poisonEnemy(game,e,v.poisonDamage,v.poisonDuration);
    if(v.vulnerability)game.markEnemy(e,z.source,v.vulnerability,3);
    game.hit(e,v.damage,z.x,z.y,95,true,z.source);
  }
  if(v.duration>0)game.zones.push({kind:'aftermath',source:z.source,x:z.x,y:z.y,r:v.radius,t:v.duration,max:v.duration,tick:0,values:v,seed:game.time});
  if(v.beamDamage)for(let i=0;i<4;i++)lanceStrike(game,z.source,z.x,z.y,i*TAU/4,{...v,damage:v.beamDamage});
  game.sound.play(v.freeze?'frost':'flame');
}

export function updateExpandedWeapon(game,kind,v,dt) {
  if(!KINDS.has(kind))return false;
  game.timers[kind]=(game.timers[kind]||0)-dt;if(game.timers[kind]>0)return true;
  const p=game.player,target=game.closest(p.x,p.y,['bell','requiem','absolute'].includes(kind)?v.radius+24:420);
  const trap=['mine','wintermine','pestilence'].includes(kind),turret=['sentinel','bastion','stormsentry','soulforge'].includes(kind);
  if(!target&&!trap&&!turret){game.timers[kind]=.08;return true}
  game.timers[kind]=v.cooldown;
  const angle=target?Math.atan2(target.y-p.y,target.x-p.x):Math.atan2(p.lastY,p.lastX),before=game.projectiles.length;
  if(kind==='capacitor'||kind==='arcforge'){
    const used=new Set();let last=p;
    for(let i=0;i<v.count;i++){const e=game.closest(last.x,last.y,i? v.chainRange:340,used);if(!e)break;used.add(e.id);game.effects.push({type:'lightning',source:kind,x:last.x,y:last.y-8,tx:e.x,ty:e.y-8,t:.3,max:.3,seed:Math.random()*100,lvl:2});game.hit(e,v.damage,last.x,last.y,25,true,kind);last=e}
    if(v.blastDamage&&last!==p)wave(game,kind,last.x,last.y,v.blastRadius,v.blastDamage);game.sound.play('storm');
  }
  if(kind==='tide'||kind==='maelstrom')for(let i=0;i<v.count;i++){const a=angle+(i-(v.count-1)/2)*.55;game.zones.push({kind:'tidalWave',source:kind,x:p.x,y:p.y,r:v.radius,vx:Math.cos(a)*100,vy:Math.sin(a)*100,t:v.duration,max:v.duration,values:v,hit:new Set()})}
  if(['needle','frostloom','lantern','beacon'].includes(kind)){
    for(let i=0;i<v.count;i++){const a=angle+(i-(v.count-1)/2)*.18,speed=kind==='needle'||kind==='frostloom'?290:170;game.projectiles.push({type:kind==='needle'||kind==='frostloom'?'needle':'soul',source:kind,x:p.x,y:p.y-8,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:4,t:2.6,damage:v.damage,pierce:v.pierce,homing:!!v.homing,slowDuration:v.slowDuration,freeze:v.freeze,bossFreeze:v.bossFreeze,blastDamage:v.blastDamage,blastRadius:v.blastRadius,hit:new Set(),trail:[]})}game.sound.play('shoot');
  }
  if(kind==='shard'||kind==='ricochet'){
    for(let i=0;i<v.count;i++){const a=angle+(i-(v.count-1)/2)*.22;game.projectiles.push({type:'bone',source:kind,x:p.x,y:p.y-8,vx:Math.cos(a)*235,vy:Math.sin(a)*235,damage:v.damage,r:v.radius,t:4,hit:new Set(),trail:[],bounces:v.bounces,range:v.range,splitDamage:v.splitDamage})}
    game.sound.play('shoot');
  }
  if(['meteor','starfall','supernova','hailfire'].includes(kind)){
    const used=new Set();
    for(let i=0;i<v.count;i++){const e=game.closest(p.x,p.y,380,used);if(!e)break;used.add(e.id);const delay=v.delay+i*.09;game.zones.push({kind:'meteorStrike',source:kind,x:e.x,y:e.y,r:v.radius,t:delay,max:delay,values:v})}
  }
  if(trap){
    for(let i=0;i<v.count;i++){const a=i*TAU/v.count;game.zones.push({kind:'mine',source:kind,x:p.x+Math.cos(a)*22,y:p.y+Math.sin(a)*22,r:v.radius,t:v.lifetime,max:v.lifetime,arm:v.armTime,values:v})}
    const active=game.zones.filter(z=>z.kind==='mine'&&z.source===kind);for(const z of active.slice(0,-12))z.t=0;
  }
  if(kind==='tether'||kind==='soulchain'){
    const used=new Set();let last=p;
    for(let i=0;i<v.count;i++){
      const e=game.closest(last.x,last.y,i===0?300:v.range,used);if(!e)break;used.add(e.id);
      game.effects.push({type:'beam',source:kind,x:last.x,y:last.y-8,tx:e.x,ty:e.y-8,width:2,color:WEAPONS[kind].color,t:.4,max:.4});
      e.slow=Math.max(e.slow,v.slowDuration);
      const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1,shift=Math.max(0,Math.min(d-25,v.pull*(e.boss?.12:1)));
      e.x+=dx/d*shift;e.y+=dy/d*shift;game.hit(e,v.damage,p.x,p.y,0,true,kind);
      if(v.blastDamage)game.zones.push({kind:'echoWave',source:kind,x:e.x,y:e.y,r:v.blastRadius,t:v.echoDelay||.45,max:v.echoDelay||.45,damage:v.blastDamage});
      last=e;
    }
    game.sound.play('storm');
  }
  if(kind==='lance'||kind==='execution'){
    lanceStrike(game,kind,p.x,p.y,angle,v);
    if(v.strikes>1)game.zones.push({kind:'lanceEcho',source:kind,x:p.x,y:p.y,angle,t:v.echoDelay,max:v.echoDelay,values:v});
    game.sound.play('slash');
  }
  if(turret){
    const active=game.zones.filter(z=>z.kind==='turret'&&z.source===kind);for(const z of active.slice(0,-1))z.t=0;
    game.zones.push({kind:'turret',source:kind,x:p.x-p.lastX*18,y:p.y-p.lastY*18,r:12,t:v.duration,max:v.duration,tick:0,values:v});
    game.burst(p.x,p.y-8,8,WEAPONS[kind].color,45);return true;
  }
  if(['crescent','eclipse','bloodmoon'].includes(kind)) {
    for(let i=0;i<v.count;i++) {
      const a=angle+(i-(v.count-1)/2)*.36;
      game.projectiles.push({type:'scythe',source:kind,x:p.x,y:p.y-8,vx:Math.cos(a)*v.flightSpeed,vy:Math.sin(a)*v.flightSpeed,returnSpeed:v.returnSpeed,damage:v.damage,r:v.radius,t:2.5,age:0,flightTime:v.flightTime,returnMultiplier:v.returnMultiplier,returning:false,hit:new Set(),trail:[],splashDamage:v.splashDamage,splashRadius:v.splashRadius});
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
      game.effects.push({type:'beam',source:kind,x,y,tx,ty,width:v.width,color:WEAPONS[kind].color,t:.32,max:.32});
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
    wave(game,kind,p.x,p.y,v.radius,v.damage,v.freeze,v.bossFreeze,v.slowDuration);
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
  if(!['scythe','venom','bone'].includes(b.type))return false;
  b.t-=dt;
  if(b.t<=0){if(b.type==='venom')poisonPool(game,b);return true}
  const ox=b.x,oy=b.y;
  if(b.type==='scythe') {
    b.age+=dt;
    if(!b.returning&&b.age>=b.flightTime){b.returning=true;b.hit.clear();b.damage*=b.returnMultiplier}
    if(b.returning) {
      const dx=game.player.x-b.x,dy=game.player.y-8-b.y,d=Math.hypot(dx,dy);
      if(d<13){b.t=0;return true}
      const speed=Math.min(b.returnSpeed,d/dt);b.vx=dx/d*speed;b.vy=dy/d*speed;
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
    if(b.type==='bone'){
      if(b.splitDamage&&!b.splitDone){b.splitDone=true;for(const side of [-1,1]){const a=Math.atan2(b.vy,b.vx)+side*.8;game.projectiles.push({type:'soul',x:b.x,y:b.y,vx:Math.cos(a)*220,vy:Math.sin(a)*220,r:3,t:1.5,damage:b.splitDamage,pierce:1,hit:new Set([e.id]),homing:true,trail:[],refracted:true})}}
      const next=b.bounces-- >0?game.closest(b.x,b.y,b.range,b.hit):null;
      if(next){const a=Math.atan2(next.y-8-b.y,next.x-b.x);b.vx=Math.cos(a)*235;b.vy=Math.sin(a)*235}else b.t=0;
      break;
    }
    if(b.splashDamage) {
      game.effects.push({type:'pulse',source:b.source,x:e.x,y:e.y-8,r:b.splashRadius,color:'#cbbfe5',t:.23,max:.23});
      for(const other of nearby(game,e.x,e.y,b.splashRadius))if(other!==e)game.hit(other,b.splashDamage,e.x,e.y,25,false);
    }
    if(b.type==='venom'){poisonPool(game,b);b.t=0;break}
  }
  return true;
}

export function updateExpandedZone(game,z,dt) {
  if(z.kind==='tidalWave'){
    z.t-=dt;if(z.t<=0)return true;z.x+=z.vx*dt;z.y+=z.vy*dt;const v=z.values;
    for(const e of nearby(game,z.x,z.y,z.r))if(!z.hit.has(e.id)){
      z.hit.add(e.id);e.slow=Math.max(e.slow,v.slowDuration);if(v.freeze)e.freeze=Math.max(e.freeze,e.boss?v.bossFreeze:v.freeze);
      if(v.pull){const dx=z.x-e.x,dy=z.y-e.y,d=Math.hypot(dx,dy)||1,shift=Math.min(d,v.pull)*(e.boss?.15:1);e.x+=dx/d*shift;e.y+=dy/d*shift}
      game.hit(e,v.damage,z.x-z.vx,z.y-z.vy,v.pull?0:90,true,z.source);
    }return true;
  }
  if(!['poison','echoWave','meteorStrike','mine','turret','aftermath','relicFire','lanceEcho'].includes(z.kind))return false;
  z.t-=dt;
  if(z.kind==='meteorStrike'){if(z.t<=0)detonate(game,z);return true}
  if(z.kind==='lanceEcho'){if(z.t<=0)lanceStrike(game,z.source,z.x,z.y,z.angle,z.values);return true}
  if(z.kind==='mine'){
    z.arm-=dt;
    if(z.t<=0||z.arm<=0&&nearby(game,z.x,z.y,26).length){z.t=0;detonate(game,z)}
    return true;
  }
  if(z.kind==='turret'){
    const v=z.values,p=game.player;
    if(z.t<=0){if(v.blastDamage)wave(game,z.source,z.x,z.y,v.blastRadius,v.blastDamage);return true}
    if(v.shield&&Math.hypot(p.x-z.x,p.y-z.y)<=v.shieldRadius&&p.shield<v.shield&&game.time>=(game.relicTimers.bastion||0)){
      p.shield=v.shield;game.relicTimers.bastion=game.time+5;
    }
    z.tick-=dt;if(z.tick>0)return true;
    const target=game.closest(z.x,z.y,v.range);if(!target){z.tick=.1;return true}
    z.tick=v.fireInterval;const angle=Math.atan2(target.y-z.y,target.x-z.x),before=game.projectiles.length;
    for(let i=0;i<v.count;i++){const a=angle+(i-(v.count-1)/2)*.12;game.projectiles.push({type:v.homing?'soul':'bolt',source:z.source,x:z.x,y:z.y-12,vx:Math.cos(a)*250,vy:Math.sin(a)*250,r:4,damage:v.damage,pierce:v.pierce,t:2,hit:new Set(),trail:[],homing:!!v.homing,chainDamage:i===0?v.chainDamage:0,chainCount:v.chainCount,chainRange:v.chainRange})}
    onWeaponCast(game,z.source,game.projectiles[before]);return true;
  }
  if(z.kind==='aftermath'||z.kind==='relicFire'){
    const v=z.values;
    if(z.t<=0){if(v?.blastDamage)wave(game,z.source,z.x,z.y,z.r,v.blastDamage);return true}
    z.tick-=dt;
    if(z.tick<=0){z.tick=v?.hitInterval||.5;for(const e of nearby(game,z.x,z.y,z.r)){
      if(v?.poisonDamage)poisonEnemy(game,e,v.poisonDamage,v.poisonDuration);
      if(v?.slowDuration)e.slow=Math.max(e.slow,v.slowDuration);
      if(z.kind==='relicFire')e.burningUntil=Math.max(e.burningUntil||0,game.time+1);
      game.hit(e,v?.fieldDamage||z.damage,z.x,z.y,0,false,z.kind==='relicFire'?null:z.source,true);
    }}
    return true;
  }
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
      game.hit(e,z.damage,z.x,z.y,0,false,z.source,true);
    }
  }
  return true;
}

export function drawExpandedProjectile(g,b,ox,oy,t) {
  if(b.type==='needle'){const x=b.x+ox,y=b.y+oy,a=Math.atan2(b.vy,b.vx);g.strokeStyle='#c9ebf4';g.lineWidth=2;g.beginPath();g.moveTo(x-Math.cos(a)*9,y-Math.sin(a)*9);g.lineTo(x+Math.cos(a)*5,y+Math.sin(a)*5);g.stroke();diamond(g,x,y,3,'#8bc9de');return true}
  if(!['scythe','venom','refraction','soul','bone'].includes(b.type))return false;
  const x=Math.round(b.x+ox),y=Math.round(b.y+oy),color=WEAPONS[b.source]?.color||'#d7c5e8';
  if(b.type==='bone'){
    g.save();g.translate(x,y);g.rotate(t*12);g.fillStyle=color;g.fillRect(-7,-2,14,4);g.fillRect(-2,-7,4,14);g.fillStyle='#f4e9ca';g.fillRect(-2,-2,4,4);g.restore();
  }else if(b.type==='scythe') {
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
  if(z.kind==='tidalWave'){const x=z.x+ox,y=z.y+oy;g.strokeStyle=WEAPONS[z.source].color;g.lineWidth=2;g.beginPath();g.ellipse(x,y,z.r,z.r*.65,0,0,TAU);g.stroke();g.fillStyle=WEAPONS[z.source].color+'1c';g.fill();for(let i=0;i<6;i++){const a=t*3+i*TAU/6;diamond(g,x+Math.cos(a)*z.r,y+Math.sin(a)*z.r*.65,3,'#d0ece3')}return true}
  if(!['poison','echoWave','meteorStrike','mine','turret','aftermath','relicFire','lanceEcho'].includes(z.kind))return false;
  if(z.kind==='lanceEcho')return true;
  const x=z.x+ox,y=z.y+oy,color=WEAPONS[z.source]?.color||'#e6a875';
  if(z.kind==='turret'){
    g.fillStyle='#35463c';g.fillRect(Math.round(x)-10,Math.round(y)-5,20,7);g.fillStyle='#7b8b79';g.fillRect(Math.round(x)-6,Math.round(y)-18,12,14);g.fillStyle='#b6bea2';g.fillRect(Math.round(x)-5,Math.round(y)-19,3,13);diamond(g,Math.round(x),Math.round(y)-19,5,color);glow(g,x,y-18,17,color+'22');
    if(z.source==='soulforge')for(let i=0;i<3;i++){const a=t+i*TAU/3;diamond(g,x+Math.cos(a)*14,y-18+Math.sin(a)*8,2,'#d4f0e3')}
    g.fillStyle='#253027';g.fillRect(x-9,y+4,18,2);g.fillStyle=color;g.fillRect(x-9,y+4,18*z.t/z.max,2);return true;
  }
  if(z.kind==='mine'){
    g.strokeStyle=color+'44';g.beginPath();g.arc(x,y,26,0,TAU);g.stroke();g.fillStyle='#465344';g.fillRect(Math.round(x)-7,Math.round(y)-4,14,7);g.fillStyle=color;g.fillRect(Math.round(x)-4,Math.round(y)-5,8,3);diamond(g,Math.round(x),Math.round(y)-6,2,z.arm>0?'#7f8c71':Math.sin(t*9)>0?'#f5e8b1':color);return true;
  }
  if(z.kind==='meteorStrike'){
    const progress=1-z.t/z.max;g.strokeStyle=color+'88';g.lineWidth=1;g.beginPath();g.arc(x,y,z.r,0,TAU);g.stroke();g.fillStyle=color+'19';g.fill();g.beginPath();g.arc(x,y,z.r*progress,0,TAU);g.stroke();diamond(g,x,y-100*(1-progress),4+progress*5,color);if(z.source==='hailfire')diamond(g,x,y-100*(1-progress),3,'#b4e6ed');return true;
  }
  g.save();g.globalAlpha=Math.min(1,z.t*3);
  if(z.kind==='echoWave') {
    const r=z.r*(1-z.t/z.max);g.strokeStyle=color+'66';g.lineWidth=1;g.beginPath();g.arc(x,y-8,r,0,TAU);g.stroke();
    for(let i=0;i<8;i++)diamond(g,x+Math.cos(i*TAU/8)*r,y-8+Math.sin(i*TAU/8)*r,2,color);
  }else{
    g.fillStyle=color+'18';g.strokeStyle=color+'77';g.beginPath();
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
