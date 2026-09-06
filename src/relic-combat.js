import {WEAPON_FAMILIES,relicValues} from './content.js';

const near=(game,x,y,r)=>game.grid.near(x,y,r+30).filter(e=>!e.dead&&Math.hypot(e.x-x,e.y-y)<r+e.r);
const pulse=(game,x,y,r,color)=>game.effects.push({type:'pulse',x,y:y-8,r,color,t:.42,max:.42});
export function readyProc(game,key,cooldown) {
  if((game.relicTimers[key]||0)>game.time)return false;
  game.relicTimers[key]=game.time+cooldown;
  game.relicProcs[key]=(game.relicProcs[key]||0)+1;
  return true;
}
export function poisonEnemy(game,e,damage,duration) {
  if(e.dead)return;
  e.poison={damage:Math.max(e.poison?.damage||0,damage),until:game.time+duration,next:e.poison?.next||game.time+.6};
}
export function chainLightning(game,first,damage,count,range,exclude=new Set()) {
  exclude.add(first.id);let last=first;
  for(let i=0;i<count;i++) {
    const target=game.closest(last.x,last.y,range,exclude);if(!target)break;
    exclude.add(target.id);
    game.effects.push({type:'lightning',x:last.x,y:last.y-9,tx:target.x,ty:target.y-9,t:.25,max:.25,seed:Math.random()*100,lvl:1});
    // Triggered effects do not trigger relics again.
    game.hit(target,damage,last.x,last.y,20,false);
    last=target;
  }
}

export function onWeaponHit(game,e,kind) {
  if(!kind||e.dead)return;
  const tags=WEAPON_FAMILIES[kind]||[],p=game.passives;
  if(tags.includes('fire'))e.burningUntil=game.time+2;
  if(p.embercore&&(tags.includes('melee')||tags.includes('projectile'))) {
    const v=relicValues('embercore',p.embercore,game.stats);
    e.burn={damage:v.damage,until:game.time+v.duration,next:e.burn?.next||game.time+v.interval};
    e.burningUntil=game.time+v.duration;
    game.relicProcs.embercore=(game.relicProcs.embercore||0)+1;
  }
  if(p.siphon&&tags.includes('melee')) {
    const v=relicValues('siphon',p.siphon,game.stats);
    if(game.player.hp<game.player.maxHp&&readyProc(game,'siphon',v.cooldown)) {
      game.player.hp=Math.min(game.player.maxHp,game.player.hp+v.heal);
      game.burst(game.player.x,game.player.y-8,4,'#e4a0a8',25);
    }
  }
  if(kind==='bloodmoon'&&game.player.hp<game.player.maxHp) {
    const level=game.weapons.bloodmoon||1;
    if(readyProc(game,'bloodmoon',1.25-level*.15))game.player.hp=Math.min(game.player.maxHp,game.player.hp+2+level);
  }
  if(p.conductor&&(tags.includes('projectile')||tags.includes('beam'))) {
    const v=relicValues('conductor',p.conductor,game.stats);
    if(readyProc(game,'conductor',v.cooldown))chainLightning(game,e,v.damage,v.count,v.range);
  }
  if(p.rime&&(e.slow>0||e.freeze>0)) {
    const v=relicValues('rime',p.rime,game.stats);
    if(readyProc(game,'rime',v.cooldown)) {
      pulse(game,e.x,e.y,v.radius,'#bde8eb');
      for(const other of near(game,e.x,e.y,v.radius))game.hit(other,v.damage,e.x,e.y,25,false);
      game.burst(e.x,e.y-8,9,'#bedfe7',65);
    }
  }
}

export function onEnemyKilled(game,e) {
  const p=game.passives;
  if(p.spore&&e.poison?.until>game.time) {
    const v=relicValues('spore',p.spore,game.stats);
    if(readyProc(game,'spore',v.cooldown)) {
      pulse(game,e.x,e.y,v.radius,'#c0ce82');
      for(const other of near(game,e.x,e.y,v.radius)) {
        poisonEnemy(game,other,v.poisonDamage,v.duration);
        game.hit(other,v.damage,e.x,e.y,15,false);
      }
    }
  }
  if(p.cinder&&e.burningUntil>game.time) {
    const v=relicValues('cinder',p.cinder,game.stats);
    if(readyProc(game,'cinder',v.cooldown)) {
      pulse(game,e.x,e.y,v.radius,'#e5ad6d');game.burst(e.x,e.y-8,12,'#e3ac6e',70);
      for(const other of near(game,e.x,e.y,v.radius))game.hit(other,v.damage,e.x,e.y,45,false);
    }
  }
}

export function onWeaponCast(game,kind,projectile) {
  const p=game.passives;
  if(p.echo) {
    game.echoCasts=(game.echoCasts||0)+1;
    const v=relicValues('echo',p.echo,game.stats);
    if(game.echoCasts>=v.casts&&readyProc(game,'echo',v.cooldown)) {
      game.echoCasts=0;pulse(game,game.player.x,game.player.y,v.radius,'#d4c596');
      for(const e of near(game,game.player.x,game.player.y,v.radius))game.hit(e,v.damage,game.player.x,game.player.y,75,false);
    }
  }
  if(p.lens&&projectile) {
    const v=relicValues('lens',p.lens,game.stats),a=Math.atan2(projectile.vy,projectile.vx)+.35;
    game.projectiles.push({type:'refraction',source:kind,x:game.player.x,y:game.player.y-9,vx:Math.cos(a)*245,vy:Math.sin(a)*245,r:4,damage:projectile.damage*v.multiplier,t:2,pierce:1,hit:new Set(),homing:true,trail:[],angle:a,refracted:true});
    game.relicProcs.lens=(game.relicProcs.lens||0)+1;
  }
}

export function updateRelicStates(game) {
  for(const e of game.enemies) {
    if(e.dead)continue;
    for(const key of ['burn','poison']) {
      const status=e[key];if(!status)continue;
      if(status.until<game.time){delete e[key];continue}
      if(status.next<=game.time) {
        status.next=game.time+(key==='burn'?.5:1);
        game.hit(e,status.damage,e.x,e.y,0,false);
        game.burst(e.x,e.y-11,2,key==='burn'?'#e8a15e':'#accb78',20);
      }
    }
  }
}
