import {WEAPON_FAMILIES,relicValues} from './content.js';
import {onCharacterCast,onCharacterXp} from './talents.js';
import {META} from './data.js';
import {weaponStats} from './stats.js';

const near=(game,x,y,r)=>game.grid.near(x,y,r+30).filter(e=>!e.dead&&e.hp>0&&Math.hypot(e.x-x,e.y-y)<r+e.r);
const pulse=(game,x,y,r,color)=>game.effects.push({type:'pulse',x,y:y-8,r,color,t:.42,max:.42});
export function readyProc(game,key,cooldown) {
  if(cooldown!==undefined){
    if((game.relicTimers[key]||0)>game.time)return false;
    game.relicTimers[key]=game.time+cooldown;
  }
  game.relicProcs[key]=(game.relicProcs[key]||0)+1;
  return true;
}
const metaProc=(game,key,chance)=>!!game.meta[key]&&(game.relicTimers['meta_'+key]||0)<=game.time&&Math.random()<chance&&readyProc(game,'meta_'+key,META[key].cooldowns[game.meta[key]-1]);
function updateMetaBuffs(game){
  for(const [key,factor] of [['tempo',.85],['flare',1.25],['wind',1.15]])game.metaBuffs[{tempo:'haste',flare:'area',wind:'move'}[key]]=(game.relicTimers['meta_'+key+'_until']||0)>game.time?factor:1;
}
function metaSurge(game,key,duration){
  game.relicTimers['meta_'+key+'_until']=Math.max(game.relicTimers['meta_'+key+'_until']||0,game.time+duration);updateMetaBuffs(game);
  const text={tempo:'战意 · 攻速',flare:'扩焰 · 范围',wind:'猎风 · 移速'}[key];
  game.texts.push({x:game.player.x,y:game.player.y-38,text,t:.9,max:.9,color:'#d9c58b'});
}
export function poisonEnemy(game,e,damage,duration) {
  if(e.dead)return;
  e.poison={damage:Math.max(e.poison?.damage||0,damage),until:Math.max(e.poison?.until||0,game.time+duration),next:e.poison?.next||game.time+.6};
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

export function onWeaponHit(game,e,kind,critical=false,periodic=false,damage=0) {
  if(!kind||e.dead)return;
  const tags=WEAPON_FAMILIES[kind]||[],p=game.passives;
  if(tags.includes('fire'))e.burningUntil=Math.max(e.burningUntil||0,game.time+2);
  if(periodic)return;
  if(tags.length&&p.brine&&tags.some(tag=>tag==='cold'||tag==='spirit')){const v=relicValues('brine',p.brine,game.stats);e.slow=Math.max(e.slow,v.duration);game.markEnemy(e,'brine',v.multiplier,v.duration);readyProc(game,'brine')}
  if(p.circuit&&tags.includes('lightning')){game.circuitCharge=(game.circuitCharge||0)+1;const v=relicValues('circuit',p.circuit,game.stats);if(game.circuitCharge>=v.hits){game.circuitCharge=0;chainLightning(game,e,v.damage,v.count,v.range);readyProc(game,'circuit')}}
  const upgrades=game.stats.weaponUpgrades?.[kind];
  if(upgrades?.anomaly&&Math.random()<Math.min(1,upgrades.anomaly)){
    if(tags.includes('fire')){e.burn={damage:Math.max(e.burn?.damage||0,damage*.15*(1+(upgrades.affliction||0))),until:Math.max(e.burn?.until||0,game.time+2),next:e.burn?.next??game.time+.5};e.burningUntil=Math.max(e.burningUntil||0,e.burn.until)}
    if(tags.includes('poison'))poisonEnemy(game,e,damage*.3*(1+(upgrades.affliction||0)),3);
    if(tags.includes('cold')){const v=weaponStats(kind,game.weapons[kind],game.stats,game.character);e.freeze=Math.max(e.freeze,(e.boss?v.bossFreeze:v.freeze)*1.25)}
    if(tags.includes('lightning'))game.markEnemy(e,'refinement_lightning',1.15,3);
  }
  const venom=p.venomfang&&(tags.includes('melee')||tags.includes('projectile'))?relicValues('venomfang',p.venomfang,game.stats):null;
  if(p.aegis&&tags.length&&game.player.hp>0){
    const v=relicValues('aegis',p.aegis,game.stats);
    if(game.player.shield<v.shield){game.player.shield=Math.min(v.shield,game.player.shield+v.gain);readyProc(game,'aegis')}
  }
  if(tags.length){
    if(metaProc(game,'tempo',.12))metaSurge(game,'tempo',6);
    if(metaProc(game,'flare',.1))metaSurge(game,'flare',8);
    if(metaProc(game,'wind',.12))metaSurge(game,'wind',6);
    if(e.hp>0&&metaProc(game,'chill',.12))e.slow=Math.max(e.slow,1.5);
    if(e.hp>0&&(e.slow>0||e.freeze>0||e.burningUntil>game.time||e.poison?.until>game.time)&&metaProc(game,'omen',.15))game.markEnemy(e,'meta_omen',1.15,6);
  }
  if(p.forkseed&&critical){
    const v=relicValues('forkseed',p.forkseed,game.stats);
    if(readyProc(game,'forkseed'))for(let i=0;i<v.count;i++){
      const a=i*Math.PI+game.time;game.projectiles.push({type:'refraction',x:e.x,y:e.y-8,vx:Math.cos(a)*210,vy:Math.sin(a)*210,r:4,t:2,damage:v.damage,pierce:1,hit:new Set([e.id]),homing:true,refracted:true,trail:[]});
    }
  }
  if(p.stormcoil&&tags.includes('lightning')){
    const v=relicValues('stormcoil',p.stormcoil,game.stats);game.stormCharge=Math.min(v.hits,game.stormCharge+1);
    if(game.stormCharge>=v.hits&&readyProc(game,'stormcoil')){
      game.stormCharge=0;game.player.shield=Math.max(game.player.shield,v.shield);pulse(game,game.player.x,game.player.y,v.radius,'#c6b6e7');
      for(const other of near(game,game.player.x,game.player.y,v.radius))game.hit(other,v.damage,game.player.x,game.player.y,55,false);
    }
  }
  if(p.frostbrand&&(tags.includes('projectile')||tags.includes('beam'))){
    e.slow=Math.max(e.slow,relicValues('frostbrand',p.frostbrand,game.stats).duration);game.relicProcs.frostbrand=(game.relicProcs.frostbrand||0)+1;
  }
  if(venom){
    poisonEnemy(game,e,venom.damage,venom.duration);game.relicProcs.venomfang=(game.relicProcs.venomfang||0)+1;
  }
  if(p.deadeye&&critical){
    const v=relicValues('deadeye',p.deadeye,game.stats);game.markEnemy(e,'deadeye',v.multiplier,v.duration);game.relicProcs.deadeye=(game.relicProcs.deadeye||0)+1;
  }
  if(p.embercore&&(tags.includes('melee')||tags.includes('projectile'))) {
    const v=relicValues('embercore',p.embercore,game.stats);
    e.burn={damage:Math.max(e.burn?.damage||0,v.damage),until:Math.max(e.burn?.until||0,game.time+v.duration),next:e.burn?.next??game.time+v.interval};
    e.burningUntil=Math.max(e.burningUntil||0,e.burn.until);
    game.relicProcs.embercore=(game.relicProcs.embercore||0)+1;
  }
  if(p.siphon&&tags.includes('melee')) {
    const v=relicValues('siphon',p.siphon,game.stats);
    if(game.player.hp>0&&game.player.hp<game.player.maxHp&&readyProc(game,'siphon')) {
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
    if(readyProc(game,'conductor'))chainLightning(game,e,v.damage,v.count,v.range);
  }
  if(p.rime&&(e.slow>0||e.freeze>0)) {
    const v=relicValues('rime',p.rime,game.stats);
    if(readyProc(game,'rime')) {
      pulse(game,e.x,e.y,v.radius,'#bde8eb');
      for(const other of near(game,e.x,e.y,v.radius))game.hit(other,v.damage,e.x,e.y,25,false);
      game.burst(e.x,e.y-8,9,'#bedfe7',65);
    }
  }
  if(p.stormseal&&tags.includes('lightning')&&(e.slow>0||e.freeze>0)){
    const v=relicValues('stormseal',p.stormseal,game.stats);
    if(readyProc(game,'stormseal')){e.freeze=Math.max(e.freeze,e.boss?v.bossFreeze:v.freeze);chainLightning(game,e,v.damage,v.count,v.range)}
  }
  if(p.volatile&&e.burningUntil>game.time&&e.poison?.until>game.time){
    const v=relicValues('volatile',p.volatile,game.stats);
    if(readyProc(game,'volatile')){
      delete e.burn;delete e.poison;e.burningUntil=0;pulse(game,e.x,e.y,v.radius,'#e3bd82');
      for(const other of near(game,e.x,e.y,v.radius))game.hit(other,v.damage,e.x,e.y,65,false);
    }
  }
  return venom?.hitDamage||0;
}

export function onPlayerHurt(game,shieldBroke=false){
  const p=game.player;
  if(p.hp>0){
    if(p.shield<8&&metaProc(game,'ward',.2))p.shield=8;
    if(game.meta.laststand&&p.hp<=p.maxHp*.25&&readyProc(game,'meta_laststand',Infinity)){
      p.hp=Math.min(p.maxHp,p.hp+10);p.shield=Math.max(p.shield,20);pulse(game,p.x,p.y,45,'#d9c58b');
      game.texts.push({x:p.x,y:p.y-38,text:'绝境续灯',t:1.2,max:1.2,color:'#e7cc92'});
    }
  }
  if(game.passives.thorns){
    const v=relicValues('thorns',game.passives.thorns,game.stats);
    if(readyProc(game,'thorns')){pulse(game,p.x,p.y,v.radius,'#d4c1a3');for(const e of near(game,p.x,p.y,v.radius))game.hit(e,v.damage,p.x,p.y,100,false)}
  }
  if(shieldBroke&&game.passives.bulwark){
    const v=relicValues('bulwark',game.passives.bulwark,game.stats);
    if(readyProc(game,'bulwark'))for(let i=0;i<v.count;i++){
      const a=i*Math.PI*2/v.count;game.projectiles.push({type:'refraction',x:p.x,y:p.y-8,vx:Math.cos(a)*210,vy:Math.sin(a)*210,r:4,t:2.2,damage:v.damage,pierce:1,hit:new Set(),homing:true,refracted:true,trail:[]});
    }
  }
}

export function onPlayerDash(game){
  if(game.passives.wake){const v=relicValues('wake',game.passives.wake,game.stats),p=game.player,a=Math.atan2(-p.dashY,-p.dashX);for(let i=0;i<v.count;i++){const angle=a+(i-(v.count-1)/2)*.25;game.projectiles.push({type:'soul',x:p.x,y:p.y-8,vx:Math.cos(angle)*220,vy:Math.sin(angle)*220,r:4,t:2,pierce:v.pierce,damage:v.damage,hit:new Set(),trail:[],refracted:true})}readyProc(game,'wake')}
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

export function onXpPickup(game,amount,starLinked=false){if(game.passives.harvest)game.harvestCharge+=amount;onCharacterXp(game,amount,starLinked)}

export function onEnemyKilled(game,e) {
  if(!e.summoned&&game.passives.souljar){const v=relicValues('souljar',game.passives.souljar,game.stats);game.souljarCharge=(game.souljarCharge||0)+1;if(game.souljarCharge>=v.kills){game.souljarCharge=0;for(let i=0;i<v.count;i++){const a=i*Math.PI*2/v.count;game.projectiles.push({type:'soul',x:e.x,y:e.y-8,vx:Math.cos(a)*180,vy:Math.sin(a)*180,r:4,t:3,pierce:2,damage:v.damage,hit:new Set(),trail:[],homing:true,refracted:true})}readyProc(game,'souljar')}}
  if(game.player.hp>0&&(e.boss||e.elite)&&game.passives.emberheart){const v=relicValues('emberheart',game.passives.emberheart,game.stats);game.player.hp=Math.min(game.player.maxHp,game.player.hp+v.heal);game.player.shield=Math.max(game.player.shield,v.shield);readyProc(game,'emberheart')}
  if(game.player.hp>0&&game.player.hp<game.player.maxHp&&metaProc(game,'blood',.1)){
    game.player.hp=Math.min(game.player.maxHp,game.player.hp+2);game.texts.push({x:game.player.x,y:game.player.y-30,text:'拾烬 +2',t:.9,max:.9,color:'#badd9a'});
  }
  if(game.meta.conquest&&(e.elite||e.boss)&&readyProc(game,'meta_conquest',META.conquest.cooldowns[game.meta.conquest-1]))for(const key of ['tempo','flare','wind'])metaSurge(game,key,10);
  const p=game.passives;
  if(p.spore&&e.poison?.until>game.time) {
    const v=relicValues('spore',p.spore,game.stats);
    if(readyProc(game,'spore')) {
      pulse(game,e.x,e.y,v.radius,'#c0ce82');
      for(const other of near(game,e.x,e.y,v.radius)) {
        poisonEnemy(game,other,v.poisonDamage,v.duration);
        game.hit(other,v.damage,e.x,e.y,15,false);
      }
    }
  }
  if(p.cinder&&e.burningUntil>game.time) {
    const v=relicValues('cinder',p.cinder,game.stats);
    if(readyProc(game,'cinder')) {
      pulse(game,e.x,e.y,v.radius,'#e5ad6d');game.burst(e.x,e.y-8,12,'#e3ac6e',70);
      for(const other of near(game,e.x,e.y,v.radius))game.hit(other,v.damage,e.x,e.y,45,false);
    }
  }
}

export function onWeaponCast(game,kind,projectile) {
  if(game.passives.sundial){game.sundialCasts=(game.sundialCasts||0)+1;const v=relicValues('sundial',game.passives.sundial,game.stats);if(game.sundialCasts>=v.casts){game.sundialCasts=0;const key=Object.keys(game.weapons).sort((a,b)=>(game.timers[b]||0)-(game.timers[a]||0))[0];if(key)game.timers[key]=Math.max(0,(game.timers[key]||0)-v.advance);readyProc(game,'sundial')}}
  onCharacterCast(game,kind);
  const p=game.passives;
  if(p.echo) {
    game.echoCasts=(game.echoCasts||0)+1;
    const v=relicValues('echo',p.echo,game.stats);
    if(game.echoCasts>=v.casts&&readyProc(game,'echo')) {
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
  updateMetaBuffs(game);
  if(game.passives.harvest){
    const v=relicValues('harvest',game.passives.harvest,game.stats),p=game.player;
    while(game.harvestCharge>=v.charge&&game.closest(p.x,p.y,350)&&readyProc(game,'harvest')){
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
