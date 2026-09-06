import {TAU,glow,diamond} from './art.js';
import {weaponStats} from './stats.js';
import {onWeaponCast} from './relic-combat.js';

export function crystalPositions(game,values) {
  return Array.from({length:values.count},(_,i)=>{
    const angle=-game.orbitAngle*1.15+i*TAU/values.count;
    return {x:game.player.x+Math.cos(angle)*values.radius,y:game.player.y-8+Math.sin(angle)*values.radius,angle};
  });
}

export function updateFusion(game,kind,v,dt) {
  const p=game.player;
  if(kind==='glacier') {
    for(const crystal of crystalPositions(game,v)) {
      for(const e of game.grid.near(crystal.x,crystal.y,26)) {
        if(Math.hypot(e.x-crystal.x,e.y-8-crystal.y)<e.r+12&&(e.crystalHitUntil||0)<=game.time) {
          e.crystalHitUntil=game.time+v.hitInterval;
          e.slow=Math.max(e.slow,.75);
          game.hit(e,v.damage,crystal.x,crystal.y,55,true,kind);
          game.burst(crystal.x,crystal.y,3,'#b8e8e2',35);
        }
      }
    }
  }
  game.timers[kind]=(game.timers[kind]||0)-dt;
  if(game.timers[kind]>0)return;
  const target=game.closest(p.x,p.y,kind==='thunderbolt'?420:kind==='solar'?v.radius+20:v.fieldRadius+20);
  if(!target){game.timers[kind]=.08;return}
  game.timers[kind]=v.cooldown;const projectileStart=game.projectiles.length;
  if(kind==='solar') {
    game.effects.push({type:'slash',x:p.x,y:p.y-8,r:v.radius,a:game.time,arc:TAU,t:.4,max:.4,evolved:true,color:'#ffe2a1'});
    for(const e of game.grid.near(p.x,p.y,v.radius+28))if(Math.hypot(e.x-p.x,e.y-p.y)<v.radius+e.r)game.hit(e,v.damage,p.x,p.y,130,true,kind);
    game.zones.push({kind:'solar',x:p.x,y:p.y-8,r:v.radius,innerRadius:v.innerRadius,t:v.duration,max:v.duration,tick:0,hitInterval:v.hitInterval,damage:v.burnDamage,seed:game.time});
    game.sound.play('slash');game.sound.play('flame');game.shake=Math.max(game.shake,2.5);
    game.burst(p.x,p.y-8,18,'#ebbd73',100);
  }
  if(kind==='thunderbolt') {
    const a=Math.atan2(target.y-p.y,target.x-p.x);
    for(let i=0;i<v.count;i++) {
      const angle=a+(i-(v.count-1)/2)*.19;
      game.projectiles.push({type:'bolt',fusionKind:kind,x:p.x,y:p.y-9,vx:Math.cos(angle)*270,vy:Math.sin(angle)*270,r:4,damage:v.damage,pierce:v.pierce,t:2,hit:new Set(),homing:true,angle,trail:[],chainDamage:v.chainDamage,chainCount:v.chainCount,chainRange:v.chainRange,chained:false});
    }
    game.sound.play('shoot');
  }
  if(kind==='glacier') {
    const x=p.x,y=p.y-8;
    for(const e of game.grid.near(x,y,v.fieldRadius+28))if(Math.hypot(e.x-x,e.y-y)<v.fieldRadius+e.r){e.freeze=Math.max(e.freeze,e.boss?v.bossFreeze:v.freeze);e.slow=Math.max(e.slow,v.fieldDuration)}
    game.zones.push({kind:'glacier',x,y,r:v.fieldRadius,t:v.fieldDuration,max:v.fieldDuration,tick:0,hitInterval:v.fieldInterval,damage:v.fieldDamage,pullSpeed:v.pullSpeed,blastDamage:v.blastDamage,seed:game.time});
    game.effects.push({type:'frost',x,y,r:v.fieldRadius,t:.8,max:.8,evolved:true});
    game.sound.play('frost');game.burst(x,y,26,'#c1e6e9',130);
  }
  onWeaponCast(game,kind,game.projectiles[projectileStart]);
  if(game.zones.length>50)game.zones.shift();
}

export function chainArrow(game,arrow,first) {
  if(arrow.fusionKind!=='thunderbolt'||arrow.chained)return;
  arrow.chained=true;
  const excluded=new Set(arrow.hit);
  let last=first;
  for(let i=0;i<arrow.chainCount;i++) {
    const target=game.closest(last.x,last.y,arrow.chainRange,excluded);
    if(!target)break;
    excluded.add(target.id);
    game.effects.push({type:'lightning',x:last.x,y:last.y-9,tx:target.x,ty:target.y-9,t:.3,max:.3,seed:Math.random()*100,lvl:1});
    game.hit(target,arrow.chainDamage,last.x,last.y,35);
    last=target;
  }
  game.sound.play('shoot');
}

export function updateFusionZone(game,z,dt) {
  z.t-=dt;
  if(z.t<=0) {
    if(z.kind==='glacier') {
      for(const e of game.grid.near(z.x,z.y,z.r+28))if(Math.hypot(e.x-z.x,e.y-z.y)<z.r+e.r)game.hit(e,z.blastDamage,z.x,z.y,160,true,z.kind);
      game.effects.push({type:'frost',x:z.x,y:z.y,r:z.r+14,t:.65,max:.65,evolved:true});
      game.burst(z.x,z.y,32,'#d2f1e9',150);game.sound.play('frost');game.shake=Math.max(game.shake,3);
    }
    return;
  }
  const enemies=game.grid.near(z.x,z.y,z.r+28);
  if(z.kind==='glacier') {
    for(const e of enemies) {
      const dx=z.x-e.x,dy=z.y-e.y,d=Math.hypot(dx,dy);
      if(d<z.r+e.r&&d>12&&e.state!=='charge') {
        const shift=Math.min(d-12,z.pullSpeed*dt*(e.boss?.12:1));
        e.x+=dx/d*shift;e.y+=dy/d*shift;
        e.slow=Math.max(e.slow,.6);
      }
    }
  }
  z.tick-=dt;
  if(z.tick<=0) {
    z.tick=z.hitInterval;
    for(const e of enemies) {
      const d=Math.hypot(e.x-z.x,e.y-z.y);
      if(d<z.r+e.r&&(!z.innerRadius||d+e.r>=z.innerRadius))game.hit(e,z.damage,z.x,z.y,0,false,z.kind);
    }
  }
}

export function drawFusionZone(g,z,ox,oy,t) {
  const x=z.x+ox,y=z.y+oy,fade=Math.min(1,z.t*2),ice=z.kind==='glacier';
  g.save();g.globalAlpha=fade;
  g.fillStyle=ice?'#719fc71b':'#c6883a1a';g.beginPath();g.arc(x,y,z.r,0,TAU);if(z.innerRadius)g.arc(x,y,z.innerRadius,0,TAU,true);g.fill();
  g.strokeStyle=ice?'#a6dbe96b':'#e8b66e88';g.lineWidth=1;g.beginPath();g.arc(x,y,z.r,0,TAU);g.stroke();
  if(z.innerRadius){g.strokeStyle='#e9bd7277';g.beginPath();g.arc(x,y,z.innerRadius,0,TAU);g.stroke()}
  const count=ice?18:24;
  for(let i=0;i<count;i++) {
    const a=i*TAU/count+t*(ice?-.3:.2),r=ice?z.r*(.2+((t*.45+i*.173)%1)*.8):z.r-5-Math.sin(i*7)*8;
    const px=Math.round(x+Math.cos(a)*r),py=Math.round(y+Math.sin(a)*r);
    if(ice){diamond(g,px,py,2,'#bce5eb');if(i%3===0){g.strokeStyle='#a9ccdf44';g.beginPath();g.moveTo(px,py);g.lineTo(x+Math.cos(a)*r*.65,y+Math.sin(a)*r*.65);g.stroke()}}
    else{let height=4+(1+Math.sin(t*10+i))*5;g.fillStyle='#d89346';g.fillRect(px,py-height,3,height);g.fillStyle='#f4d590';g.fillRect(px,py-4,2,4)}
  }
  if(ice){glow(g,x,y,z.r*.7,'#9fc8e32a');diamond(g,x,y,6,'#c1dbef');g.strokeStyle='#a3e1e244';g.beginPath();g.arc(x,y,z.r*(z.t/z.max),0,TAU);g.stroke()}
  g.restore();
}

export function drawFusionWeapons(game,g,ox,oy) {
  const level=game.weapons.glacier;
  if(!level)return;
  const v=weaponStats('glacier',level,game.stats,game.character);
  for(const crystal of crystalPositions(game,v)) {
    const x=Math.round(crystal.x+ox),y=Math.round(crystal.y+oy);
    glow(g,x,y,19,'#a6d8e933');diamond(g,x,y,8,'#5d96b3');diamond(g,x,y-1,5,'#b7e2e9');g.fillStyle='#e8f6e6';g.fillRect(x-1,y-4,2,5);
  }
}
