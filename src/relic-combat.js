import {WEAPON_FAMILIES,relicValues} from './content.js';
import {onCharacterCast,onCharacterXp} from './talents.js';

const near=(game,x,y,r)=>game.grid.near(x,y,r+30).filter(e=>!e.dead&&e.hp>0&&Math.hypot(e.x-x,e.y-y)<r+e.r);
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

export function onWeaponHit(game,e,kind,critical=false,periodic=false) {
  if(!kind||e.dead)return;
  const tags=WEAPON_FAMILIES[kind]||[],p=game.passives;
  if(tags.includes('fire'))e.burningUntil=Math.max(e.burningUntil||0,game.time+2);
  if(periodic)return;
  if(p.forkseed&&critical){
    const v=relicValues('forkseed',p.forkseed,game.stats);
    if(readyProc(game,'forkseed',v.cooldown))for(let i=0;i<v.count;i++){
      const a=i*Math.PI+game.time;game.projectiles.push({type:'refraction',x:e.x,y:e.y-8,vx:Math.cos(a)*210,vy:Math.sin(a)*210,r:4,t:2,damage:v.damage,pierce:1,hit:new Set([e.id]),homing:true,refracted:true,trail:[]});
    }
  }
  if(p.stormcoil&&tags.includes('lightning')){
    const v=relicValues('stormcoil',p.stormcoil,game.stats);game.stormCharge=Math.min(v.hits,game.stormCharge+1);
    if(game.stormCharge>=v.hits&&readyProc(game,'stormcoil',v.cooldown)){
      game.stormCharge=0;game.player.shield=Math.max(game.player.shield,v.shield);pulse(game,game.player.x,game.player.y,v.radius,'#c6b6e7');
      for(const other of near(game,game.player.x,game.player.y,v.radius))game.hit(other,v.damage,game.player.x,game.player.y,55,false);
    }
  }
  if(p.frostbrand&&(tags.includes('projectile')||tags.includes('beam'))){
    e.slow=Math.max(e.slow,relicValues('frostbrand',p.frostbrand,game.stats).duration);game.relicProcs.frostbrand=(game.relicProcs.frostbrand||0)+1;
  }
  if(p.venomfang&&(tags.includes('melee')||tags.includes('projectile'))){
    const v=relicValues('venomfang',p.venomfang,game.stats);poisonEnemy(game,e,v.damage,v.duration);game.relicProcs.venomfang=(game.relicProcs.venomfang||0)+1;
  }
  if(p.deadeye&&critical){
    const v=relicValues('deadeye',p.deadeye,game.stats);e.markMultiplier=Math.max(e.markUntil>game.time?e.markMultiplier:1,v.multiplier);e.markUntil=game.time+v.duration;game.relicProcs.deadeye=(game.relicProcs.deadeye||0)+1;
  }
  if(p.embercore&&(tags.includes('melee')||tags.includes('projectile'))) {
    const v=relicValues('embercore',p.embercore,game.stats);
    e.burn={damage:Math.max(e.burn?.damage||0,v.damage),until:Math.max(e.burn?.until||0,game.time+v.duration),next:e.burn?.next??game.time+v.interval};
    e.burningUntil=Math.max(e.burningUntil||0,e.burn.until);
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
    if(readyProc(game,'bloodmoon',1.4-level*.15))game.player.hp=Math.min(game.player.maxHp,game.player.hp+1+level);
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
  if(p.stormseal&&tags.includes('lightning')&&(e.slow>0||e.freeze>0)){
    const v=relicValues('stormseal',p.stormseal,game.stats);
    if(readyProc(game,'stormseal',v.cooldown)){e.freeze=Math.max(e.freeze,e.boss?.2:v.freeze);chainLightning(game,e,v.damage,v.count,v.range)}
  }
  if(p.volatile&&e.burningUntil>game.time&&e.poison?.until>game.time){
    const v=relicValues('volatile',p.volatile,game.stats);
    if(readyProc(game,'volatile',v.cooldown)){
      delete e.burn;delete e.poison;e.burningUntil=0;pulse(game,e.x,e.y,v.radius,'#e3bd82');
      for(const other of near(game,e.x,e.y,v.radius))game.hit(other,v.damage,e.x,e.y,65,false);
    }
  }
}

export function onPlayerHurt(game,shieldBroke=false){
  const p=game.player;
  if(game.passives.thorns){
    const v=relicValues('thorns',game.passives.thorns,game.stats);
    if(readyProc(game,'thorns',v.cooldown)){pulse(game,p.x,p.y,v.radius,'#d4c1a3');for(const e of near(game,p.x,p.y,v.radius))game.hit(e,v.damage,p.x,p.y,100,false)}
  }
  if(shieldBroke&&game.passives.bulwark){
    const v=relicValues('bulwark',game.passives.bulwark,game.stats);
    if(readyProc(game,'bulwark',v.cooldown))for(let i=0;i<v.count;i++){
      const a=i*Math.PI*2/v.count;game.projectiles.push({type:'refraction',x:p.x,y:p.y-8,vx:Math.cos(a)*210,vy:Math.sin(a)*210,r:4,t:2.2,damage:v.damage,pierce:1,hit:new Set(),homing:true,refracted:true,trail:[]});
    }
  }
}

export function onPlayerDash(game){
  const p=game.player;
  if(game.passives.dashfire){
    const v=relicValues('dashfire',game.passives.dashfire,game.stats);
    game.zones.push({kind:'relicFire',source:'dashfire',x:p.x,y:p.y,r:v.radius,t:v.duration,max:v.duration,tick:0,damage:v.damage,seed:game.time});
    game.relicProcs.dashfire=(game.relicProcs.dashfire||0)+1;
  }
  if(game.passives.hoarfrost){
    const v=relicValues('hoarfrost',game.passives.hoarfrost,game.stats);pulse(game,p.x,p.y,v.radius,'#b7e3e8');
    for(const e of near(game,p.x,p.y,v.radius)){e.freeze=Math.max(e.freeze,e.boss?v.bossFreeze:v.freeze);e.slow=Math.max(e.slow,v.slowDuration);game.hit(e,v.damage,p.x,p.y,45,false)}
    game.relicProcs.hoarfrost=(game.relicProcs.hoarfrost||0)+1;
  }
}

export function onXpPickup(game,amount){if(game.passives.harvest)game.harvestCharge+=amount;onCharacterXp(game,amount)}

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
  onCharacterCast(game);
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
  if(game.passives.aegis){
    const v=relicValues('aegis',game.passives.aegis,game.stats);
    if(game.player.shield<v.shield&&game.time-game.lastHurt>=v.cooldown&&readyProc(game,'aegis',v.cooldown)){
      game.player.shield=v.shield;pulse(game,game.player.x,game.player.y,24,'#c5dec1');
    }
  }
  if(game.passives.harvest){
    const v=relicValues('harvest',game.passives.harvest,game.stats),p=game.player;
    if(game.harvestCharge>=v.charge&&game.closest(p.x,p.y,350)&&readyProc(game,'harvest',.35)){
      game.harvestCharge-=v.charge;
      for(let i=0;i<v.count;i++){const a=i*Math.PI*2/v.count;game.projectiles.push({type:'soul',x:p.x,y:p.y-8,vx:Math.cos(a)*190,vy:Math.sin(a)*190,r:4,t:2.5,damage:v.damage,pierce:1,hit:new Set(),homing:true,trail:[],refracted:true})}
    }
  }
  for(const e of game.enemies) {
    if(e.dead)continue;
    for(const key of ['burn','poison']) {
      const status=e[key];if(!status)continue;
      if(status.until<game.time){delete e[key];continue}
      if(status.next<=game.time) {
        status.next=game.time+(key==='burn'?.5:1);
        const level=game.passives.rotclock||0;
        game.hit(e,status.damage*relicValues('rotclock',level).multiplier,e.x,e.y,0,false,null,true);
        if(level)game.relicProcs.rotclock=(game.relicProcs.rotclock||0)+1;
        game.burst(e.x,e.y-11,2,key==='burn'?'#e8a15e':'#accb78',20);
      }
    }
  }
}
