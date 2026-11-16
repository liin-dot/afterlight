import {STAGES,expeditionEnemy,drawExpeditionFloor,drawTideHazard} from './expeditions.js';
import {TAU,palette,hash,lerp,clamp,canvas,Landscape,drawSprite,sprite,glow,fire,shadow,diamond,pixelText} from './art.js';
import {CHARACTERS,WEAPONS,ENEMIES,startingLoadout} from './data.js';
import {characterStats,weaponStats,refinementValue} from './stats.js';
import {FUSIONS,fusionState,maxWeaponLevel} from './fusions.js';
import {updateFusion,chainArrow,updateFusionZone,drawFusionZone,drawFusionWeapons} from './fusion-combat.js';
import {updateExpandedWeapon,updateExpandedProjectile,updateExpandedZone,drawExpandedProjectile,drawExpandedZone,drawExpandedEffect} from './expanded-combat.js';
import {onWeaponHit,onEnemyKilled,onWeaponCast,onPlayerHurt,onPlayerTravel,onXpPickup,updateRelicStates,readyProc} from './relic-combat.js';
import {RUN_DURATION,pressureAt,xpForLevel,weightedPick,upgradePool,rollUpgradeChoices,recordUpgradeChoice} from './balance.js';
import {talentPoints,talentNodeState,resetCharacterTalents,updateCharacterTalents,onCharacterLearn,onCharacterHit,onCharacterProjectileHit,characterHitMultiplier,onCharacterTravel,onCharacterHurt,drawCharacterTalents} from './talents.js';
import {EVENT_TYPES,ALTAR_REWARDS,resetWorldEvents,startWorldEvent,updateWorldEvents,drawWorldEvents,nearestWorldEvent,worldEventTarget} from './world-events.js';
import {ALTAR_BOONS,relicValues,refinementGain} from './content.js';
import {drawCombatProjectile,drawCombatZone,drawCombatEffect,drawSpirit} from './combat-art.js';

export {RUN_DURATION};

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const angleDifference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
class SpatialGrid{
 constructor(size=64){this.size=size;this.cells=new Map()}
 rebuild(entities){this.cells.clear();for(const e of entities){if(e.dead)continue;const key=Math.floor(e.x/this.size)+','+Math.floor(e.y/this.size);let bucket=this.cells.get(key);if(!bucket){bucket=[];this.cells.set(key,bucket)}bucket.push(e)}}
 near(x,y,r){const found=[];const s=this.size;for(let yy=Math.floor((y-r)/s);yy<=Math.floor((y+r)/s);yy++)for(let xx=Math.floor((x-r)/s);xx<=Math.floor((x+r)/s);xx++){let a=this.cells.get(xx+','+yy);if(a)for(const e of a)if(!e.dead)found.push(e)}return found}
}

export class Game{
 constructor(canvasElement,sound){
  this.canvas=canvasElement;this.g=this.canvas.getContext('2d',{alpha:false});this.sound=sound;this.state='menu';this.character=CHARACTERS[0];this.landscape=new Landscape();this.camera={x:-170,y:3};this.keys=new Set();this.stick={x:0,y:0};this.grid=new SpatialGrid();this.ambient=0;this.lastFrame=0;this.lastHud=0;this.shake=0;this.hitstop=0;this.dpr=1;this.menuWalkers=[];this.on=()=>{};this.effects=[];this.particles=[];this.texts=[];this.enemies=[];this.projectiles=[];this.drops=[];this.zones=[];this.hazards=[];this.shrines=[];this.time=0;this.uid=0;this.menuEnemies();this.resize();
  window.addEventListener('resize',()=>this.resize());
  window.addEventListener('keydown',e=>this.keydown(e));window.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',()=>{this.keys.clear();this.stick={x:0,y:0};if(this.state==='running')this.pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.state==='running')this.pause()});
  this.loop=this.loop.bind(this);requestAnimationFrame(this.loop);
 }
 resize(){const w=window.innerWidth,h=window.innerHeight;const scale=Math.max(1,Math.round(Math.min(w/630,h/370)));this.w=Math.round(w/scale);this.h=Math.round(h/scale);this.canvas.width=this.w;this.canvas.height=this.h;this.g.imageSmoothingEnabled=false;this.dpr=scale;}
 menuEnemies(){for(let i=0;i<13;i++){const a=hash(i,0,80)*TAU,r=140+hash(i,1,80)*180;this.menuWalkers.push({kind:['skeleton','ghost','ghoul'][i%3],x:Math.cos(a)*r,y:Math.sin(a)*r,phase:i*2,flip:i%2===0})}}
 keydown(e){
  if(e.isComposing||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.target?.closest?.('input,textarea,select,[contenteditable="true"]')){
   if(e.code==='Escape'&&this.state==='status'){e.preventDefault();this.on('closeStatus')}
   if(e.code==='Escape'&&this.state==='menu'){e.preventDefault();this.on('closeMenuModal')}
   return;
  }
  if(this.state==='status'){
   if(e.repeat)return;
   if(['KeyC','Escape','KeyP'].includes(e.code)){e.preventDefault();this.on('closeStatus')}
   if(e.code==='KeyG'){e.preventDefault();this.on('fusionBook')}
   if(e.code==='KeyI'){e.preventDefault();this.on('itemCatalog')}
   if(e.code==='KeyT'){e.preventDefault();this.on('talentTree')}
   if(e.code==='KeyM')this.on('sound');if(e.code==='KeyF')this.on('fullscreen');
   return;
  }
  if(this.state==='paused'&&!e.repeat&&['KeyR','KeyQ'].includes(e.code)){
   e.preventDefault();this.on(e.code==='KeyR'?'restartRun':'quitRun');return;
  }
  if(e.code==='KeyC'&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();this.on('status');return}
  if(e.code==='KeyG'&&!e.repeat){e.preventDefault();this.on('fusionBook');return}
  if(e.code==='KeyI'&&!e.repeat){e.preventDefault();this.on('itemCatalog');return}
  if(e.code==='KeyT'&&!e.repeat){e.preventDefault();this.on('talentTree');return}
  if(this.state==='running'&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();this.keys.add(e.code);
  if(e.repeat)return;
  if(e.code==='KeyE'&&this.state==='running'){e.preventDefault();this.interact()}
  if(e.code==='Escape'||e.code==='KeyP'){if(['running','level','reward'].includes(this.state))this.pause();else if(this.state==='paused')this.resume();else if(this.state==='menu')this.on('closeMenuModal')}
  if(e.code==='KeyM')this.on('sound');if(e.code==='KeyF')this.on('fullscreen');
  if(this.state==='level'&&['Digit1','Digit2','Digit3','Digit4','Numpad1','Numpad2','Numpad3','Numpad4'].includes(e.code))this.on('choose',Number(e.code.slice(-1))-1);
  if(this.state==='reward'&&['Digit1','Digit2','Digit3','Numpad1','Numpad2','Numpad3'].includes(e.code))this.chooseAltarReward(Number(e.code.slice(-1))-1);
  if(e.code==='Enter'&&this.state==='menu'&&!document.querySelector('.modal-wrap:not(.hidden)')&&!e.target.closest('button,a')){e.preventDefault();this.on('start')}
 }
 start(character,meta={},preparation={}){
  this.keys.clear();this.stick={x:0,y:0};this.pauseReturn=null;this.pendingTalentChoice=false;
  this.stage=Object.hasOwn(STAGES,preparation.stage)?preparation.stage:'graveyard';this.character=character;this.state='running';this.time=0;this.kills=0;this.gold=0;this.level=1;this.xp=0;this.xpNext=10;this.rerolls=3;this.pendingLevels=0;this.uid=0;this.meta={...meta};this.ended=false;this.enemies=[];this.projectiles=[];this.drops=[];this.effects=[];this.particles=[];this.texts=[];this.zones=[];this.hazards=[];this.spawnClock=.4;this.waveClock=28;this.waveCount=0;this.bossMilestones=new Set();this.finalSpawned=false;this.finalDefeated=false;this.shake=0;this.hitstop=0;this.flash=0;this.orbitAngle=0;this.timers={};this.choices=[];this.camera={x:0,y:37};this.bannerUntil=0;this.toastUntil=0;
  this.fusions={};this.consumedWeapons=new Set();this.consumedPassives=new Set();this.notifiedFusions=new Set();this.trackedFusion=this.discoveredFusions?.has(this.plannedFusion)?this.plannedFusion:null;
  const loadout=startingLoadout(character,preparation);this.weapons=loadout.weapons;this.passives=loadout.passives;
  this.relicTimers={};this.relicProcs={};this.echoCasts=0;
  this.choiceHistory=[];this.stormCharge=0;this.circuitCharge=0;this.souljarCharge=0;this.sundialCasts=0;
  this.xpNext=xpForLevel(1);this.waveClock=42;this.banished=new Set();this.banishes=3;this.lastHealDrop=-20;this.lastUtilityDrop=-30;this.lastHurt=-8;this.harvestCharge=0;this.damageByWeapon={};this.damageTaken=0;this.lastPhase=0;this.pressure=pressureAt(0,0,{},this.stage);
  this.boons=[];this.weaponEmpowerments={};this.weaponUpgrades={};this.metaBuffs={};this.growth={};this.stats=characterStats(character,this.passives,this.meta,{},this.weapons,this.boons,this.weaponEmpowerments,this.metaBuffs,this.growth,this.weaponUpgrades);
  const maxHp=this.stats.maxHp;this.player={x:0,y:37,hp:maxHp,maxHp,r:7,flip:false,walk:0,moving:false,invincible:1,lastX:0,lastY:1,travelCharge:0};
  this.player.shield=0;
  resetCharacterTalents(this);
  resetWorldEvents(this);
  this.grid.rebuild([]);this.sound.init();this.on('startRun');this.on('weapons');this.on('hud');this.banner(STAGES[this.stage].name,STAGES[this.stage].hint,4);this.toast('保持移动，武器会自动攻击。拾取绿色结晶来升级。',5);
  for(let i=0;i<6;i++)this.spawnEnemy(this.stage==='foundry'?'cinderling':'skeleton',false,125+i*12);
 }
 loop(now){
  const raw=Math.min(.05,(now-(this.lastFrame||now))/1000);this.lastFrame=now;this.ambient+=raw;this.sound.update(this.state==='running'?Math.min(1,this.time/RUN_DURATION):0,this.state!=='running');
  if(this.state==='running'){if(this.hitstop>0)this.hitstop-=raw;else this.update(raw)}
  this.shake=Math.max(0,this.shake-raw*14);this.flash=Math.max(0,(this.flash||0)-raw*3);this.render();requestAnimationFrame(this.loop);
 }
 get damageMultiplier(){return this.stats.damageMultiplier}
 get haste(){return this.stats.haste}
 get moveSpeed(){return this.stats.moveSpeed*(this.metaBuffs.move||1)}
 get pickupRadius(){return this.stats.pickupRadius}
 get xpMultiplier(){return this.stats.xpMultiplier}
 interact(){
  if(this.state!=='running'||!this.player||this.player.hp<=0)return false;
  return startWorldEvent(this);
 }
 pause(){if(!['running','level','reward'].includes(this.state))return;this.pauseReturn=this.state;this.state='paused';this.keys.clear();this.stick={x:0,y:0};this.on('pause')}
 resume(){if(this.state!=='paused')return;this.state=['level','reward'].includes(this.pauseReturn)?this.pauseReturn:'running';this.pauseReturn=null;this.keys.clear();this.stick={x:0,y:0};this.on('resume',this.state)}
 returnToMenu(){this.state='menu';this.pauseReturn=null;this.keys.clear();this.stick={x:0,y:0};this.on('menu')}
 update(dt){
  this.time+=dt;const p=this.player,oldX=p.x,oldY=p.y;this.lastHud+=dt;p.invincible=Math.max(0,p.invincible-dt);
  let dx=(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0)+this.stick.x,dy=(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)+this.stick.y;
  const len=Math.hypot(dx,dy);if(len>1){dx/=len;dy/=len}p.moving=len>.1;
  if(p.moving){p.lastX=dx/(Math.hypot(dx,dy)||1);p.lastY=dy/(Math.hypot(dx,dy)||1);if(Math.abs(dx)>.1)p.flip=dx<0;p.walk+=dt*9;}
  p.x+=dx*this.moveSpeed*dt;p.y+=dy*this.moveSpeed*dt;
  p.hp=Math.min(p.maxHp,p.hp+(this.stats.regeneration+(this.time-this.lastHurt>=4?this.stats.recovery:0))*dt);
  this.camera.x=lerp(this.camera.x,p.x,1-Math.exp(-dt*7));this.camera.y=lerp(this.camera.y,p.y-8,1-Math.exp(-dt*7));
  this.pressure=pressureAt(this.time,this.stats.curse,this.stats.difficulty,this.stage);
  if(this.pressure.index!==this.lastPhase){this.lastPhase=this.pressure.index;if(![3,6,RUN_DURATION/60].includes(this.lastPhase))this.banner(this.pressure.name,this.pressure.hint,3);this.checkFusionReadiness()}
  this.spawnClock-=dt;if(this.spawnClock<=0){for(let i=0;i<this.pressure.count&&this.enemies.length<this.pressure.cap;i++)this.spawnEnemy(this.chooseEnemy(),Math.random()<this.pressure.eliteChance);this.spawnClock+=this.pressure.interval}
  this.waveClock-=dt;if(this.waveClock<=0&&this.time<RUN_DURATION){this.spawnWave();this.waveClock=48}
  for(const milestone of [180,360,RUN_DURATION])if(this.time>=milestone&&!this.bossMilestones.has(milestone)){this.bossMilestones.add(milestone);this.spawnBoss(milestone)}
  for(const e of [...this.enemies])this.updateEnemy(e,dt);
  this.grid.rebuild(this.enemies);updateRelicStates(this);
  const moved=Math.hypot(p.x-oldX,p.y-oldY);
  if(p.hp>0&&moved>0){p.travelCharge+=moved;if(p.travelCharge>=240){p.travelCharge%=240;onPlayerTravel(this);onCharacterTravel(this)}}
  updateCharacterTalents(this,dt,moved);this.updateWeapons(dt);this.updateProjectiles(dt);this.updateZones(dt);this.updateHazards(dt);this.updateDrops(dt);
  updateWorldEvents(this,dt);
  for(const fx of this.effects)fx.t-=dt;this.effects=this.effects.filter(e=>e.t>0);
  for(const part of this.particles){part.t-=dt;part.x+=part.vx*dt;part.y+=part.vy*dt;part.vx*=Math.exp(-dt*3);part.vy+=part.gravity*dt}this.particles=this.particles.filter(e=>e.t>0);
  for(const text of this.texts){text.t-=dt;text.y-=dt*17}this.texts=this.texts.filter(t=>t.t>0);
  this.enemies=this.enemies.filter(e=>!e.dead);
  if(this.bannerUntil&&this.time>this.bannerUntil){this.bannerUntil=0;this.on('bannerHide')}if(this.toastUntil&&this.time>this.toastUntil){this.toastUntil=0;this.on('toastHide')}
  if(p.hp<=0){this.end(false);return}if(this.finalDefeated){this.end(true);return}
  this.presentLevelChoices();
  if(this.lastHud>.10){this.lastHud=0;this.on('hud')}
 }
 chooseEnemy(){return weightedPick(Object.entries(this.pressure.roster),item=>item[1])[0]}
 spawnEnemy(kind,elite=false,radius=0){
  const a=Math.random()*TAU;const edge=radius||(Math.max(this.w,this.h)*.56+35+Math.random()*70);let x=this.player.x+Math.cos(a)*edge,y=this.player.y+Math.sin(a)*edge;
  const data=ENEMIES[kind],pressure=pressureAt(this.time,this.stats.curse,this.stats.difficulty,this.stage),growth=pressure.hp;const e={id:++this.uid,kind,x,y,hp:data.hp*growth,maxHp:data.hp*growth,speed:data.speed*pressure.speed,damage:data.damage*pressure.damage,xp:data.xp,r:data.r,score:data.score,flip:false,walk:0,flash:0,slow:0,freeze:0,knockX:0,knockY:0,attack:1+Math.random()*3,orbitHit:0,dead:false,elite,boss:false,scale:elite?1.4:1,phase:Math.random()*TAU};
  if(elite){e.hp*=7;e.maxHp=e.hp;e.speed*=.85;e.xp*=8;e.r*=1.4;e.damage*=1.3;e.score*=8}this.enemies.push(e);return e;
 }
 spawnWave(){
  this.waveCount++;
  const type=STAGES[this.stage].wave||(this.time<180?'bat':Math.random()<.5?'bat':'reaper');const total=Math.round(Math.min(38,12+Math.floor(this.time/23))*this.stats.difficulty.population);const angle=Math.random()*TAU,px=this.player.x,py=this.player.y,r=Math.max(this.w,this.h)*.6;
  for(let i=0;i<total&&this.enemies.length<this.pressure.cap-1;i++){const e=this.spawnEnemy(type,Math.random()<this.pressure.eliteChance);e.x=px+Math.cos(angle)*r+Math.cos(angle+Math.PI/2)*(i-total/2)*17;e.y=py+Math.sin(angle)*r+Math.sin(angle+Math.PI/2)*(i-total/2)*17;e.speed*=1.08}
  if(this.waveCount%3===0&&this.enemies.length<this.pressure.cap){this.spawnEnemy('knight',true);this.banner('提灯精英 · 追猎开始','击败精英回收八倍经验结晶',2.7)}else this.banner('鸦群掠过长夜','寻找缺口，避开怪潮正面',2.7);
 }
 spawnBoss(milestone){
  const final=milestone===RUN_DURATION,difficulty=this.stats.difficulty,count=1+difficulty.bosses,angle=Math.random()*TAU;
  for(let i=0;i<count;i++){
   const chapter=STAGES[this.stage],rank=final?2:milestone===360?1:0;const e=this.spawnEnemy(chapter.bossKinds[rank]),a=angle+i*TAU/count;e.x=this.player.x+Math.cos(a)*180;e.y=this.player.y+Math.sin(a)*180;e.boss=true;e.final=final;e.name=chapter.bosses[rank];e.hp=(final?42000:milestone===360?16500:4800)*(1+(this.stats.curse||0)*.12)*difficulty.hp;e.maxHp=e.hp;e.speed=(final?45:30)*difficulty.speed;e.damage=(final?52:milestone===360?40:30)*difficulty.damage;e.xp=final?180:90;e.r=final?23:19;e.scale=final?2.7:2.25;e.score=100;e.attack=3+i*.7;e.state='chase';e.stateTime=0;e.slamX=0;e.slamY=0;
   e.bossWave=milestone;this.effects.push({type:'pulse',x:e.x,y:e.y,r:100,t:1,max:1,color:'#d69a77'});this.burst(e.x,e.y-30,40,'#a78eaa',80);
  }
  if(final)this.finalSpawned=true;this.sound.play('boss');this.shake=5;this.banner(STAGES[this.stage].bosses[final?2:milestone===360?1:0]+' · '+count+' 位降临',final?'THE ECLIPSE SOVEREIGN':'GUARDIAN OF THE GRAVE',4);this.on('hud');
 }
 updateEnemy(e,dt){
  if(e.dead)return;e.flash=Math.max(0,e.flash-dt);e.slow=Math.max(0,e.slow-dt);e.freeze=Math.max(0,e.freeze-dt);e.orbitHit=Math.max(0,e.orbitHit-dt);let dx=this.player.x-e.x,dy=this.player.y-e.y,d=Math.hypot(dx,dy)||1;
  if(d>Math.max(this.w,this.h)*1.1&&!e.boss){const a=Math.random()*TAU,r=Math.max(this.w,this.h)*.65;e.x=this.player.x+Math.cos(a)*r;e.y=this.player.y+Math.sin(a)*r;return}
  e.flip=dx<0;e.walk+=dt*6*(e.slow>0?.5:1);e.attack-=dt;
  let speed=e.speed*(e.freeze>0?0:e.slow>0?.45:1);
  if(e.freeze>0){speed=0}
  else if(e.boss&&this.stage!=='graveyard'){speed*=expeditionEnemy(this,e,dt,d,dx,dy)}
  else if(e.boss){
   if(e.state==='charge'){e.stateTime-=dt;e.x+=e.chargeX*200*dt;e.y+=e.chargeY*200*dt;if(e.stateTime<=0){e.state='chase';e.attack=2.5}speed=0}
   else if(e.state==='windup'){e.stateTime-=dt;speed=0;if(e.stateTime<=0){e.state='charge';e.stateTime=.65;let l=Math.hypot(e.slamX-e.x,e.slamY-e.y)||1;e.chargeX=(e.slamX-e.x)/l;e.chargeY=(e.slamY-e.y)/l;this.burst(e.x,e.y-12,18,'#c6a280',75)}}
   else if(e.attack<=0){const r=Math.random();if(r<.35){e.state='windup';e.stateTime=1.2;e.slamX=this.player.x;e.slamY=this.player.y;this.hazards.push({type:'line',x:e.x,y:e.y,tx:e.slamX,ty:e.slamY,t:1.2,max:1.2,boss:e,visualOnly:true})}else if(r<.7){for(let i=0;i<(e.final?7:4);i++){const a=i*TAU/(e.final?7:4)+this.time;let hx=this.player.x+Math.cos(a)*(i===0?0:70),hy=this.player.y+Math.sin(a)*(i===0?0:70);this.hazards.push({type:'blast',x:hx,y:hy,r:e.final?36:29,t:1.25+i*.1,max:1.25+i*.1,damage:e.damage})}e.attack=e.final?3.2:4.2}else{const count=e.final?10:8,gap=Math.floor(Math.random()*count);for(let i=0;i<count;i++){if(i===gap||i===(gap+1)%count)continue;const a=i*TAU/count;this.projectiles.push({x:e.x,y:e.y-12,vx:Math.cos(a)*64,vy:Math.sin(a)*64,r:4,damage:e.damage*.65,enemy:true,type:'enemy',t:3.2,hit:new Set()})}this.effects.push({type:'pulse',x:e.x,y:e.y-12,r:45,t:.8,max:.8,color:'#d3a0b5'});e.attack=e.final?5.5:6.5}}
   if(e.hp/e.maxHp<.5&&!e.enraged){e.enraged=true;e.speed*=1.28;this.banner('愤怒在黑暗中苏醒','THE GUARDIAN IS ENRAGED',2.5)}
  }else if(e.kind==='ghost'&&d<205&&d>60){speed*=.4;if(e.attack<=0){
   // ponytail: scan on firing attempts to cap ghost crossfire at six; cache the count if larger projectile pools make scans costly.
   if(this.projectiles.filter(b=>b.enemy&&b.t>0).length<6){const a=Math.atan2(dy,dx);this.projectiles.push({x:e.x,y:e.y-12,vx:Math.cos(a)*72,vy:Math.sin(a)*72,r:4,damage:e.damage*.8,enemy:true,type:'enemy',t:3.2,hit:new Set()})}
   e.attack=6.5+Math.random()*2;
  }}
  else if(e.kind==='reaper'&&this.time>=300){
   if(e.lungeTime>0){e.lungeTime-=dt;e.x+=e.lungeX*145*dt;e.y+=e.lungeY*145*dt;speed=0}
   else if(e.lungeWindup>0){e.lungeWindup-=dt;speed=0;if(e.lungeWindup<=0)e.lungeTime=.4}
   else if(e.attack<=0&&d>35&&d<160){e.attack=5.5;e.lungeWindup=.8;e.lungeX=dx/d;e.lungeY=dy/d;speed=0;this.hazards.push({type:'line',x:e.x,y:e.y,tx:e.x+dx/d*72,ty:e.y+dy/d*72,t:.8,max:.8,visualOnly:true})}
  }
  else if(['cinderling','bomber','bulwark','siren','leech','oracle'].includes(e.kind)){speed*=expeditionEnemy(this,e,dt,d,dx,dy)}
  else if(e.kind==='bat'){dx+=Math.sin(this.time*4+e.phase)*d*.22;dy+=Math.cos(this.time*4+e.phase)*d*.22;let l=Math.hypot(dx,dy)||1;dx=dx/l*d;dy=dy/l*d}
  if(e.dead)return;
  if(d>e.r+this.player.r-2){e.x+=dx/d*speed*dt;e.y+=dy/d*speed*dt}
  // Light local separation keeps dense hordes readable without blocking the player.
  if(!e.boss&&e.freeze<=0){let contacts=0;for(const other of this.grid.near(e.x,e.y,24)){if(other.id===e.id||other.dead)continue;const sx=e.x-other.x,sy=e.y-other.y,sep=Math.hypot(sx,sy)||.1,desired=(e.r+other.r)*.76;if(sep<desired){const force=(desired-sep)*dt*3;e.x+=sx/sep*force;e.y+=sy/sep*force;if(++contacts>=7)break}}}
  e.x+=e.knockX*dt;e.y+=e.knockY*dt;e.knockX*=Math.exp(-dt*13);e.knockY*=Math.exp(-dt*13);
  if(e.freeze<=0&&distance(e,this.player)<e.r+this.player.r&&this.player.invincible<=0)this.hurt(e.damage,e.x,e.y);
 }
 closest(x=this.player.x,y=this.player.y,range=420,exclude=null){let best=null,ds=range*range;for(const e of this.enemies){if(e.dead||(exclude&&exclude.has(e.id)))continue;const d=(e.x-x)**2+(e.y-y)**2;if(d<ds){ds=d;best=e}}return best}
 updateWeapons(dt){
  const p=this.player;this.orbitAngle+=dt*(this.weapons.orbit?3:2.2);
  for(const [kind,lvl] of Object.entries(this.weapons)){
   const values=weaponStats(kind,lvl,this.stats,this.character);
   if(updateExpandedWeapon(this,kind,values,dt))continue;
   if(WEAPONS[kind].fusion){updateFusion(this,kind,values,dt);continue}
   if(kind==='orbit'){let count=values.count;for(let i=0;i<count;i++){let a=this.orbitAngle*(lvl===6&&i%2?-1:1)+i*TAU/count,r=values.radius+(i%2?values.outerOffset:0);const x=p.x+Math.cos(a)*r,y=p.y-8+Math.sin(a)*r;for(const e of this.grid.near(x,y,values.contactRadius+32))if(distance({x,y},{x:e.x,y:e.y-8})<e.r+values.contactRadius&&e.orbitHit<=0){e.orbitHit=values.hitInterval;this.hit(e,values.damage,x,y,75,true,kind);this.burst(x,y,3,'#bee6cf',30)}}continue}
   this.timers[kind]=(this.timers[kind]||0)-dt;if(this.timers[kind]>0)continue;
   const target=this.closest(p.x,p.y,kind==='blade'?values.radius+10:420);if(!target){this.timers[kind]=.08;continue}let a=Math.atan2(target.y-p.y,target.x-p.x);
   this.timers[kind]=values.cooldown;const projectileStart=this.projectiles.length;
   if(kind==='blade'){
    const r=values.radius,arc=values.arc;this.effects.push({type:'slash',source:kind,x:p.x,y:p.y-8,r,a,arc,t:.28,max:.28,evolved:lvl===6,color:lvl===6?'#f5d18d':'#e2d3a1'});
    for(const e of this.grid.near(p.x,p.y,r+30)){if(distance(p,e)<r+e.r&&Math.abs(angleDifference(Math.atan2(e.y-p.y,e.x-p.x),a))<arc/2)this.hit(e,values.damage,p.x,p.y,100,true,kind)}this.sound.play('slash');
   }
   if(kind==='bolt'){
    const count=values.count;for(let i=0;i<count;i++){const angle=a+(i-(count-1)/2)*.15;this.projectiles.push({type:'bolt',x:p.x,y:p.y-9,vx:Math.cos(angle)*270,vy:Math.sin(angle)*270,r:3,damage:values.damage,pierce:values.pierce,t:2,hit:new Set(),homing:values.homing,angle,trail:[]})}this.sound.play('shoot');
   }
   if(kind==='storm'){
    let last={x:p.x,y:p.y-18},excluded=new Set(),count=values.count;for(let i=0;i<count;i++){let e=this.closest(last.x,last.y,i===0?400:values.chainRange,excluded);if(!e)break;excluded.add(e.id);this.effects.push({type:'lightning',source:kind,x:last.x,y:last.y-5,tx:e.x,ty:e.y-12,t:.38,max:.38,seed:Math.random()*100,lvl});this.hit(e,values.damage,p.x,p.y,50,true,kind);last=e;this.burst(e.x,e.y-9,8,'#d4c3e4',60)}this.sound.play('storm');this.shake=Math.max(this.shake,2);if(lvl===6)this.flash=.1;
   }
   if(kind==='flame'){
    const count=values.count;for(let i=0;i<count;i++){let angle=a+(i-(count-1)/2)*.40;this.projectiles.push({type:'flame',x:p.x,y:p.y-10,vx:Math.cos(angle)*137,vy:Math.sin(angle)*137,r:6,damage:values.damage,pierce:1,t:1.4,hit:new Set(),lvl,trail:[],angle,trailClock:0})}this.sound.play('flame');
   }
   if(kind==='frost'){
    let r=values.radius;this.effects.push({type:'frost',source:kind,x:p.x,y:p.y-7,r,t:.75,max:.75,evolved:lvl===6});for(const e of this.grid.near(p.x,p.y,r+30)){if(distance(p,e)<r+e.r){e.slow=Math.max(e.slow,values.slowDuration);if(values.freeze)e.freeze=Math.max(e.freeze,e.boss?values.bossFreeze:values.freeze);this.hit(e,values.damage,p.x,p.y,55,true,kind)}}this.sound.play('frost');this.burst(p.x,p.y-7,24,'#afdcd2',130);
   }
   onWeaponCast(this,kind,this.projectiles[projectileStart]);
  }
 }
 updateProjectiles(dt){
  for(const b of this.projectiles){if(updateExpandedProjectile(this,b,dt))continue;b.t-=dt;if(b.t<=0){if(b.type==='flame')this.addFire(b);continue}
   if(b.homing){let target=this.closest(b.x,b.y,210,b.hit);if(target){let a=Math.atan2(target.y-9-b.y,target.x-b.x),current=Math.atan2(b.vy,b.vx),next=current+clamp(angleDifference(a,current),-dt*4,dt*4);b.vx=Math.cos(next)*280;b.vy=Math.sin(next)*280;b.angle=next}}
   const oldX=b.x,oldY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.trail){b.trail.push({x:b.x,y:b.y});if(b.trail.length>5)b.trail.shift()}
   if(b.enemy){if(distance(b,{x:this.player.x,y:this.player.y-9})<11){this.hurt(b.damage,b.x,b.y);b.t=0;this.burst(b.x,b.y,8,'#be90ad',40)}continue}
   if(b.type==='flame'&&b.lvl===6){b.trailClock-=dt;if(b.trailClock<0){b.trailClock=.20;this.addFire({...b,lvl:3},true)}}
   for(const e of this.grid.near(b.x,b.y,36)){if(e.dead||b.hit.has(e.id))continue;
    // Sweep each projectile through its previous position to avoid tunnelling.
    const vx=b.x-oldX,vy=b.y-oldY,den=vx*vx+vy*vy||1,u=clamp(((e.x-oldX)*vx+(e.y-9-oldY)*vy)/den,0,1);const dd=Math.hypot(e.x-(oldX+vx*u),e.y-9-(oldY+vy*u));
    if(dd<e.r+b.r){b.hit.add(e.id);if(b.slowDuration)e.slow=Math.max(e.slow,b.slowDuration);if(b.freeze)e.freeze=Math.max(e.freeze,e.boss?b.bossFreeze:b.freeze);const multiplier=onCharacterProjectileHit(this,b,e);this.hit(e,b.damage*multiplier,oldX,oldY,45,true,b.refracted?null:b.source||b.fusionKind||b.type,!!b.talent);if(b.blastDamage&&!b.blastDone){b.blastDone=true;this.effects.push({type:'pulse',source:b.source,x:e.x,y:e.y-8,r:b.blastRadius,color:WEAPONS[b.source].color,t:.4,max:.4});for(const other of this.grid.near(e.x,e.y,b.blastRadius+25))if(!other.dead&&distance(e,other)<b.blastRadius+other.r)this.hit(other,b.blastDamage,e.x,e.y,20,false,b.source,true)}chainArrow(this,b,e);b.pierce--;if(b.type==='flame'){this.addFire(b);b.t=0;break}if(b.pierce<=0){b.t=0;break}}
   }
  }this.projectiles=this.projectiles.filter(b=>b.t>0);
 }
 addFire(b,trail=false){const values=weaponStats('flame',b.lvl,this.stats,this.character),upgrades=this.weaponUpgrades.flame||{},r=trail?20*this.stats.areaMultiplier*(1+(upgrades.area||0)):values.radius,duration=trail?1.4*this.stats.durationMultiplier*(1+(upgrades.duration||0)):values.duration;this.zones.push({x:b.x,y:b.y,r,t:duration,max:duration,tick:0,hitInterval:values.hitInterval,damage:values.burnDamage,seed:Math.random()*100});if(!trail){this.effects.push({type:'pulse',source:'flame',x:b.x,y:b.y,r:r*1.1,t:.3,max:.3,color:'#e6ad6a'});this.burst(b.x,b.y,14,'#dc9b55',65)}}
 updateZones(dt){
  for(const z of this.zones){if(updateExpandedZone(this,z,dt))continue;if(z.kind==='solar'||z.kind==='glacier'){updateFusionZone(this,z,dt);continue}z.t-=dt;if(z.t<=0)continue;z.tick-=dt;if(z.tick<=0){z.tick=z.hitInterval;for(const e of this.grid.near(z.x,z.y,z.r+15))if(distance(z,e)<z.r+e.r)this.hit(e,z.damage,z.x,z.y,0,false,'flame',true)}}
  // ponytail: retain the newest 128 fields to bound rendering; pool fields if future content routinely reaches this ceiling.
  this.zones=this.zones.filter(z=>z.t>0).slice(-128);
 }
 updateHazards(dt){for(const h of this.hazards){if(h.enemy){h.x=h.enemy.x;h.y=h.enemy.y;h.t=h.enemy.dead?0:h.enemy.fuse;continue}h.t-=dt;if(h.t<=0&&!h.visualOnly){this.effects.push({...h,type:h.type==='tide'?'tideBurst':'enemyBlast',t:.5,max:.5});this.burst(h.x,h.y,18,h.color||'#b6756c',100);if(h.type==='tide'?Math.abs(this.player.y-h.y)<20+this.player.r&&Math.abs(this.player.x-h.x)<h.r+this.player.r&&Math.abs(this.player.x-h.gap)>38-this.player.r:distance(h,this.player)<h.r+this.player.r)this.hurt(h.damage,h.x,h.y);this.shake=Math.max(this.shake,3)}}this.hazards=this.hazards.filter(h=>h.t>0)}
 markEnemy(e,source,multiplier,duration){
  e.marks??={};e.marks[source]={multiplier,until:this.time+duration};
  e.markUntil=Math.max(e.markUntil||0,this.time+duration);
 }
 hit(e,damage,fromX,fromY,knock=50,feedback=true,source=null,periodic=false){
  if(e.dead||e.hp<=0||this.player.hp<=0)return;const critical=!!source&&!periodic&&Math.random()<Math.min(1,this.stats.criticalChance+(this.stats.weaponUpgrades?.[source]?.critical||0));
  const execute=source&&!periodic&&this.passives.executioner&&e.hp/e.maxHp<=.3?1+this.passives.executioner*(e.boss?.1:.2):1;
  const marked=e.markUntil>this.time?Object.values(e.marks).reduce((best,mark)=>mark.until>this.time?Math.max(best,mark.multiplier):best,1):1;
  const facing=e.guardAngle??Math.atan2(this.player.y-e.y,this.player.x-e.x),guard=e.kind==='bulwark'&&!e.boss&&!periodic&&(fromX-e.x)*Math.cos(facing)+(fromY-e.y)*Math.sin(facing)>0;
  const dmg=Math.max(1,Math.round(damage*(guard?.55:1)*(critical?this.stats.criticalMultiplier:1)*execute*marked*characterHitMultiplier(this,e,source,periodic)));
  this.damageByWeapon[source||'reaction']=(this.damageByWeapon[source||'reaction']||0)+Math.min(Math.max(0,e.hp),dmg);
  if(execute>1)this.relicProcs.executioner=(this.relicProcs.executioner||0)+1;
  e.hp-=dmg;e.flash=.11;const a=Math.atan2(e.y-fromY,e.x-fromX);e.knockX+=Math.cos(a)*knock*(e.boss?.15:1);e.knockY+=Math.sin(a)*knock*(e.boss?.15:1);
  if(this.texts.length<90)this.texts.push({x:e.x+(Math.random()-.5)*9,y:e.y-22*e.scale,text:dmg,t:.65,max:.65,critical,color:critical?'#efd395':'#d6ddbd'});
  if(feedback){this.sound.play('hit');this.burst(e.x,e.y-10,critical?6:3,critical?'#efd096':'#a3ab78',40)}
  if(critical&&feedback){this.shake=Math.max(this.shake,1.6);this.hitstop=Math.max(this.hitstop,.022)}
  const poisonImpact=onWeaponHit(this,e,source,critical,periodic,dmg);
  onCharacterHit(this,e,source,periodic,critical);
  if(poisonImpact)this.hit(e,poisonImpact,e.x,e.y,0,false,null,true);
  if(source==='talent')this.growFromTalent();
  if(e.hp<=0&&!e.dead)this.kill(e);
 }
 growFromTalent(){
  if(!this.passives.everseed||!Object.keys(this.talents).length||this.player.hp<=0)return;
  const values=relicValues('everseed',this.passives.everseed);if(Math.random()>=values.chance||!readyProc(this,'everseed'))return;
  const key=['damage','area','vitality'][Math.floor(Math.random()*3)],hp=this.player.hp;
  this.growth[key]=(this.growth[key]||0)+1;
  this.stats=characterStats(this.character,this.passives,this.meta,this.talents,this.weapons,this.boons,this.weaponEmpowerments,this.metaBuffs,this.growth,this.weaponUpgrades);
  this.player.maxHp=this.stats.maxHp;this.player.hp=Math.min(hp,this.player.maxHp);
  this.texts.push({x:this.player.x,y:this.player.y-42,text:'薪种 · '+{damage:'伤害 +1%',area:'范围 +1%',vitality:'生命上限 +2'}[key],t:1.2,max:1.2,color:'#e4cc82'});this.on('hud');
 }
 kill(e){
  if(e.dead)return;e.dead=true;this.kills++;this.gold+=e.score;this.burst(e.x,e.y-10,8,e.kind==='ghost'?'#8db7a4':'#9e9c72',45);
  const starLinked=!!this.talents.s_scholar1&&e.starMarkedUntil>this.time;
  if(e.xp>0)this.drops.push({type:'xp',x:e.x,y:e.y,r:3,value:e.xp,elite:e.elite,age:0,vx:0,vy:0,attracted:starLinked,starLinked});
  if(e.boss)this.drops.push({type:'magnet',x:e.x-12,y:e.y,age:0,r:5,value:0});
  const low=this.player.hp<this.player.maxHp*.45,heals=this.drops.filter(d=>d.type==='heal'&&!d.dead).length;
  if(!e.summoned&&heals<1&&this.time-this.lastHealDrop>=20&&(Math.random()<(low?.012:.004)||low&&this.time-this.lastHealDrop>=75)){
   this.drops.push({type:'heal',x:e.x+6,y:e.y,age:0,r:5,value:12});this.lastHealDrop=this.time;
  }
  if(!e.boss&&!e.summoned&&this.time-this.lastUtilityDrop>=30&&Math.random()<.004){
   const type=weightedPick([{type:'magnet',weight:4},{type:'hourglass',weight:3},{type:'nova',weight:2},{type:'ward',weight:3}]).type;
   this.drops.push({type,x:e.x-5,y:e.y,age:0,r:5,value:0});this.lastUtilityDrop=this.time;
  }
  if((e.elite||e.boss)&&!e.eventGuardian){
   if(e.boss&&!this.enemies.some(other=>other.boss&&other.bossWave===e.bossWave&&!other.dead))this.drops.push({type:'chest',x:e.x,y:e.y,age:0,r:10,value:60});
   this.effects.push({type:'pulse',x:e.x,y:e.y,r:e.boss?140:70,t:.7,max:.7,color:'#dec799'});this.shake=e.boss?7:3;this.hitstop=e.boss?.12:.045;this.burst(e.x,e.y-20,50,'#e1bf87',120);this.sound.play(e.boss?'chest':'xp');if(e.boss){this.banner(e.name+' · 已被击败','THE LIGHT PREVAILS',3);for(const enemy of this.enemies)if(!enemy.dead&&!enemy.boss&&distance(enemy,e)<180)this.hit(enemy,250,e.x,e.y,120,false)}
  }
  if(e.final)this.finalDefeated=!this.enemies.some(other=>other.final&&!other.dead);
  onEnemyKilled(this,e);
 }
 hurt(amount,x,y){const p=this.player;if(p.invincible>0||this.state!=='running')return;const dmg=Math.max(1,Math.round(Math.max(amount*.3,amount-this.stats.armor)*this.stats.damageTakenMultiplier)),absorbed=Math.min(p.shield||0,dmg);p.shield-=absorbed;p.hp-=dmg-absorbed;this.lastHurt=this.time;this.damageTaken+=dmg-absorbed;p.invincible=.6;this.shake=5;this.flash=.23;this.sound.play('hurt');this.burst(p.x,p.y-11,12,absorbed?'#c1d9c1':'#bd7968',60);this.texts.push({x:p.x,y:p.y-30,text:absorbed===dmg?'格挡':'−'+(dmg-absorbed),t:.9,max:.9,critical:true,color:absorbed?'#c4e4d0':'#ef9d85'});const shieldBroke=absorbed>0&&p.shield===0;onCharacterHurt(this);onPlayerHurt(this,shieldBroke);this.on('hud')}
 updateDrops(dt){
  const p=this.player,r=this.pickupRadius;
  if(p.hp<=0)return;
  for(const d of this.drops){
   if(d.dead)continue;d.age+=dt;
   if(d.type==='heal'&&p.hp>=p.maxHp){d.attracted=false;continue}
   const dist=distance(d,p),extra=d.type==='chest'?10:0;
   if(dist>=r+extra&&!d.attracted)continue;
   d.attracted=true;const step=Math.min(dist,clamp(130+d.age*20,130,420)*dt);
   d.x+=(p.x-d.x)/(dist||1)*step;d.y+=(p.y-d.y)/(dist||1)*step;
   if(dist>=12)continue;
   d.dead=true;this.on('pickup',d.type);
   if(d.type==='xp'){this.gainXp(d.value);onXpPickup(this,d.value,d.starLinked);this.sound.play('xp')}
   if(d.type==='heal'){p.hp=Math.min(p.maxHp,p.hp+d.value);this.burst(p.x,p.y-10,10,'#b8d699',40);this.texts.push({x:p.x,y:p.y-30,text:'+'+d.value,t:1,max:1,color:'#badd9a'});this.sound.play('select')}
   if(d.type==='magnet'){for(const drop of this.drops)if(drop.type==='xp')drop.attracted=true;this.sound.play('chest');this.toast('引魂之光 · 所有经验正向你汇聚')}
   if(d.type==='chest')this.openChest(d.value);
   if(d.type==='hourglass'){for(const e of this.enemies)if(!e.dead)e.freeze=Math.max(e.freeze,e.boss?.3:3);this.toast('凝时碎砂 · 敌群暂时冻结');this.sound.play('frost')}
   if(d.type==='ward'){p.shield=Math.max(p.shield,20);this.toast('灯盾残片 · 护盾补至 20');this.sound.play('select')}
   if(d.type==='nova'){for(const e of [...this.grid.near(p.x,p.y,240)])if(!e.dead&&distance(e,p)<210+e.r)this.hit(e,e.boss?250:500,p.x,p.y,140,false);this.effects.push({type:'pulse',x:p.x,y:p.y,r:210,t:.8,max:.8,color:'#f2c38f'});this.toast('破晓火种 · 清扫周围敌人');this.sound.play('flame')}
  }
  this.drops=this.drops.filter(d=>!d.dead);
  // Preserve total XP while coalescing far-away crystals in long runs.
  if(this.drops.length>500){const buckets=new Map(),kept=[];for(const d of this.drops){if(d.type!=='xp'||d.attracted||distance(d,p)<120){kept.push(d);continue}const key=Math.floor(d.x/70)+','+Math.floor(d.y/70);const existing=buckets.get(key);if(existing)existing.value+=d.value;else{buckets.set(key,d);kept.push(d)}}this.drops=kept}
 }
 openChest(value){
  this.gold+=value;const boss=value>=60,rewards=[],hp=this.player.hp;if(boss)this.player.hp=Math.min(this.player.maxHp,this.player.hp+10);
  for(let i=0;i<(boss?2:1);i++){
   const pool=upgradePool(this).filter(item=>item.current>0),levels=pool.filter(item=>!item.refinement),item=weightedPick(levels.length?levels:pool);
   if(item?.refinement){this.refineWeapon(item);rewards.push(item.name+' · '+refinementGain(item.refinement,item.value))}
   else if(item){(item.weapon?this.weapons:this.passives)[item.key]=item.next;if(item.key==='vitality')this.player.hp+=12;rewards.push(item.name+' · LV.'+item.current+' → LV.'+item.next)}
   else rewards.push('经验 +'+this.gainXp(24).toLocaleString('zh-CN',{maximumFractionDigits:2})+'（无可强化装备）');
   this.stats=characterStats(this.character,this.passives,this.meta,this.talents,this.weapons,this.boons,this.weaponEmpowerments,this.metaBuffs,this.growth,this.weaponUpgrades);
  }
  this.player.maxHp=this.stats.maxHp;this.player.hp=Math.min(this.player.hp,this.player.maxHp);
  if(this.player.hp>hp)rewards.push('生命 +'+(this.player.hp-hp).toLocaleString('zh-CN',{maximumFractionDigits:2}));
  rewards.push('余烬 +'+value);
  this.toast((boss?'首领遗产 · ':'古老宝箱 · ')+rewards.join(' / '));this.on('weapons');this.checkFusionReadiness();
  this.sound.play('chest');this.burst(this.player.x,this.player.y-10,40,'#e5c086',100);
  return rewards;
 }
 checkFusionReadiness(){
  for(const key of Object.keys(FUSIONS))if(fusionState(key,this.weapons,this.passives,this).ready&&!this.notifiedFusions.has(key)){
   this.notifiedFusions.add(key);this.banner(this.discoveredFusions.has(key)?WEAPONS[key].name+' · 材料齐备':'未知力量正在共鸣','A CONFLUENCE AWAITS YOUR NEXT LEVEL',3.5);
  }
  if(this.trackedFusion&&fusionState(this.trackedFusion,this.weapons,this.passives,this).blocked){this.trackedFusion=null;this.toast('已追踪的路线本局无法完成，追踪已取消。')}
  this.on('fusionProgress');
 }
 fuseWeapon(key){
  const recipe=FUSIONS[key];if(this.state!=='level'||!recipe)return false;
  const ready=fusionState(key,this.weapons,this.passives,this);if(!ready.ready)return false;
  const consumed=new Set(recipe.ingredients.filter(i=>i.type==='weapon').map(i=>i.id)),replacement={};let inserted=false;
  for(const [id,level] of Object.entries(this.weapons)){
   if(consumed.has(id)){if(!inserted){replacement[key]=ready.level;inserted=true}}else replacement[id]=level;
  }
  this.weapons=replacement;
  for(const id of consumed){this.consumedWeapons.add(id);delete this.timers[id];delete this.weaponUpgrades[id]}
  for(const item of recipe.ingredients.filter(i=>i.type==='passive')){delete this.passives[item.id];this.consumedPassives.add(item.id);delete this.relicTimers[item.id]}
  this.projectiles=this.projectiles.filter(b=>b.enemy||!consumed.has(b.source||b.fusionKind||b.type));
  this.zones=this.zones.filter(z=>!consumed.has(z.source||z.kind||'flame'));
  this.fusions[key]={ingredients:ready.ingredients.map(item=>({...item})),time:this.time,initialLevel:ready.level};
  this.timers[key]=.08;
  if(this.trackedFusion===key)this.trackedFusion=null;
  const first=!this.discoveredFusions.has(key);
  this.discoveredFusions.add(key);
  if(first)this.on('fusionDiscovered',key);
  this.shake=8;this.hitstop=.12;this.flash=.15;
  this.effects.push({type:'fusion',x:this.player.x,y:this.player.y-8,r:110,t:1.4,max:1.4,color:WEAPONS[key].color});
  this.banner((first?'首次发现 · ':'融合铸成 · ')+WEAPONS[key].name,first?'A NEW PAGE IN YOUR GRIMOIRE':'CONFLUENCE FORGED',4.5);
  this.toast('成品 LV. '+ready.level+' · '+(consumed.size===2?'释放一个武器位':'融合道具已消耗')+(first?(this.discoveryPersisted?' · 图谱已永久解锁':' · 图谱已解锁，浏览器暂未保存'):''),5);
  this.sound.play('fusion');return true;
 }
 chooseAltarReward(index){
  if(this.state!=='reward'||!this.eventChoices.length)return false;
  const id=this.eventChoices[index];if(index!==-1&&(!Number.isInteger(index)||!ALTAR_BOONS[id]||this.boons.includes(id)))return false;
  const bonus=ALTAR_REWARDS[this.altarRewardIndex],rewards=[];
  if(index===-1){
   for(let i=0;i<(bonus?.upgrades||1);i++){
    const available=upgradePool(this).filter(item=>item.weapon&&item.current>0&&!item.refinement);
    const item=available[Math.floor(Math.random()*available.length)];
    if(item){this.weapons[item.key]=item.next;rewards.push(item.name+' · LV.'+item.current+' → LV.'+item.next)}
    else{
      const keys=Object.keys(this.weapons),key=keys[Math.floor(Math.random()*keys.length)];if(!key)return false;
      this.weaponEmpowerments[key]=(this.weaponEmpowerments[key]||0)+1;rewards.push(WEAPONS[key].name+' · 祭坛淬炼，伤害额外 +12%');
    }
   }
  }else{this.boons.push(id);rewards.push(ALTAR_BOONS[id].name+' · '+ALTAR_BOONS[id].positive+' / '+ALTAR_BOONS[id].negative)}
  const hpRatio=this.player.hp/this.player.maxHp;
  this.stats=characterStats(this.character,this.passives,this.meta,this.talents,this.weapons,this.boons,this.weaponEmpowerments,this.metaBuffs,this.growth,this.weaponUpgrades);
  this.player.maxHp=this.stats.maxHp;this.player.hp=Math.min(this.player.maxHp,this.player.maxHp*hpRatio);
  if(bonus){
    const hp=this.player.hp;this.player.hp=Math.min(this.player.maxHp,hp+bonus.heal);this.gold+=bonus.gold;
    rewards.push('经验 +'+this.gainXp(bonus.xp).toLocaleString('zh-CN',{maximumFractionDigits:2}),'余烬 +'+bonus.gold);
    if(this.player.hp>hp)rewards.push('生命 +'+(this.player.hp-hp).toLocaleString('zh-CN',{maximumFractionDigits:2}));
  }
  this.eventChoices=[];this.altarRewardIndex=null;this.state='running';this.keys.clear();this.stick={x:0,y:0};
  this.eventReward={name:index===-1?'祭坛武器强化':'已缔结祭坛契约',rewards,expiresAt:this.time+5};
  this.sound.play('chest');this.on('altarChosen');this.on('weapons');this.on('hud');this.checkFusionReadiness();return true;
 }
 gainXp(amount){if(!Number.isFinite(amount)||amount<=0)return 0;const points=talentPoints(this),gained=amount*this.xpMultiplier;this.xp+=gained;while(this.xp>=this.xpNext){this.xp-=this.xpNext;this.level++;this.pendingLevels++;this.xpNext=xpForLevel(this.level)}if(talentPoints(this)>points){this.pendingTalentChoice=true;this.on('talentPoints')}return gained}
 presentLevelChoices(){
  if(this.state!=='running')return;
  if(this.pendingTalentChoice){
   this.pendingTalentChoice=false;
   if(talentPoints(this)>0){this.state='talent';this.keys.clear();this.stick={x:0,y:0};this.sound.play('level');this.on('talentChoice');return}
  }
  if(this.pendingLevels>0){this.pendingLevels--;this.state='level';this.keys.clear();this.stick={x:0,y:0};this.choices=this.rollUpgrades();this.sound.play('level');this.on('level')}
 }
 rollUpgrades(){
  return rollUpgradeChoices(this);
 }
 refineWeapon(item){
  if(!WEAPONS[item.key]||(this.weapons[item.key]||0)<maxWeaponLevel(item.key)||this.banished.has(item.key)||this.consumedWeapons.has(item.key))return false;
  const value=refinementValue(this.stats,item.key,item.refinement,item.rarity);if(!value||value!==item.value)return false;
  const upgrades=this.weaponUpgrades[item.key]??={};upgrades[item.refinement]=Number(((upgrades[item.refinement]||0)+value).toFixed(8));return true;
 }
 learnTalent(id){
  const active=['running','paused','level','reward','talent'].includes(this.state)||this.state==='status'&&['running','paused','level','reward','talent'].includes(this.statusReturn);
  const node=talentNodeState(this,id);if(!active||!node.available)return false;
  this.talents[id]=true;this.stats=characterStats(this.character,this.passives,this.meta,this.talents,this.weapons,this.boons,this.weaponEmpowerments,this.metaBuffs,this.growth,this.weaponUpgrades);
  onCharacterLearn(this);
  this.player.maxHp=this.stats.maxHp;this.player.hp=Math.min(this.player.hp,this.player.maxHp);
  this.sound.play('select');this.on('talentLearned',id);this.on('hud');return true;
 }
 reroll(){if(this.state!=='level'||this.rerolls<=0)return;this.rerolls--;this.choices=rollUpgradeChoices(this,this.choices.map(item=>item.choiceId||item.key));this.sound.play('select');this.on('level')}
 banish(index){if(this.state!=='level'||this.banishes<=0)return;const item=this.choices[index];if(!item||item.fusion||item.key==='heal')return;this.banished.add(item.key);this.banishes--;this.checkFusionReadiness();this.choices=rollUpgradeChoices(this,this.choices.map(choice=>choice.choiceId||choice.key));this.sound.play('select');this.on('level')}
 skipUpgrade(){if(this.state!=='level')return;this.gold+=10;this.state='running';this.keys.clear();this.on('upgrade');this.on('hud');this.toast('已跳过本次成长 · 余烬 +10')}
 chooseUpgrade(index){
  if(this.state!=='level'||!this.choices[index])return;const item=this.choices[index];
  if(item.fusion){if(!this.fuseWeapon(item.key))return}
  else if(item.refinement){if(!this.refineWeapon(item))return}
  else if(item.weapon){this.weapons[item.key]=item.next;this.timers[item.key]=.12;if(item.evolution){this.banner(item.name+' · 觉醒','WEAPON EVOLVED',3);this.shake=6}}
  else if(item.key==='heal'){this.player.hp=Math.min(this.player.maxHp,this.player.hp+12);this.gold+=15}
  else{this.passives[item.key]=item.next;if(item.key==='vitality')this.player.hp+=12}
  recordUpgradeChoice(this,item.key);
  this.stats=characterStats(this.character,this.passives,this.meta,this.talents,this.weapons,this.boons,this.weaponEmpowerments,this.metaBuffs,this.growth,this.weaponUpgrades);
  this.player.maxHp=this.stats.maxHp;this.player.hp=Math.min(this.player.hp,this.player.maxHp);
  this.checkFusionReadiness();
  this.effects.push({type:'pulse',x:this.player.x,y:this.player.y,r:85,t:.7,max:.7,color:item.color});this.burst(this.player.x,this.player.y-10,30,item.color,80);this.player.invincible=Math.max(this.player.invincible,.45);this.sound.play('select');this.keys.clear();this.state='running';this.on('upgrade');this.on('weapons');this.on('hud');
 }
 burst(x,y,count,color,speed=50){for(let i=0;i<count&&this.particles.length<650;i++){const a=Math.random()*TAU,s=speed*(.2+Math.random()*.8),t=.2+Math.random()*.5;this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,t,max:t,color,size:Math.random()<.7?1:2,gravity:20})}}
 banner(title,subtitle,duration=3){this.bannerUntil=this.time+duration;this.on('banner',{title,subtitle})}
 toast(text,duration=3){this.toastUntil=this.time+duration;this.on('toast',text)}
 get earnedEmbers(){return this.gold+Math.floor(this.time/10)}
 end(won,abandoned=false,destination='result'){
  if(this.ended||!this.player||!['running','paused','level','reward'].includes(this.state))return;
  if(this.activeEvent){this.activeEvent.state='failed';this.activeEvent.used=true;this.activeEvent=null;this.eventsFailed++}
  this.ended=true;this.state='over';this.pauseReturn=null;this.keys.clear();this.stick={x:0,y:0};
  this.reward=this.earnedEmbers+(won?STAGES[this.stage].reward:0);this.result={won,abandoned,destination,stage:this.stage,time:this.time,kills:this.kills,level:this.level,reward:this.reward};
  this.sound.play(abandoned?'select':won?'win':'death');this.on('end',this.result);
 }

 render(){
  const g=this.g,w=this.w,h=this.h,t=this.ambient;
  const menu=this.state==='menu'||(this.state==='status'&&this.statusReturn==='menu');if(menu){this.camera.x=lerp(this.camera.x,-w*.235,.025);this.camera.y=lerp(this.camera.y,-26,.025)}
  let sx=this.shake>0?(Math.random()-.5)*this.shake:0,sy=this.shake>0?(Math.random()-.5)*this.shake:0;const cam={x:Math.round(this.camera.x+sx),y:Math.round(this.camera.y+sy)};const ox=w/2-cam.x,oy=h/2-cam.y;
  if(menu||this.stage==='graveyard')this.landscape.drawFloor(g,cam,w,h,t);else drawExpeditionFloor(this,g,cam,w,h);const decor=this.landscape.getObjects(cam,w,h).map(o=>!menu&&this.stage!=='graveyard'?{...o,kind:({foundry:{tree:'furnace',deadTree:'anvil',grave:o.variant%2?'crate':'scrap',cross:'pillar',bush:'scrap'},coast:{tree:'coral',deadTree:'wreck',grave:'tideStone',cross:'pillar',bush:'seaweed'}}[this.stage][o.kind]||o.kind)}:o);
  // Subtle cool moonlight travels diagonally through the canopy.
  g.save();g.globalAlpha=.05;g.fillStyle='#b7c5a0';for(let i=0;i<3;i++){const x=w*.6+i*110+Math.sin(t*.08)*10;g.beginPath();g.moveTo(x,0);g.lineTo(x+70,0);g.lineTo(x-85,h);g.lineTo(x-160,h);g.closePath();g.fill()}g.restore();
  if(!menu){this.drawZones(g,ox,oy,t);this.drawDrops(g,ox,oy,t)}
  // Shadows are drawn beneath all sprites, maintaining a coherent depth plane.
  for(const obj of decor)shadow(g,obj.x+ox,obj.y+oy,obj.kind==='tree'?28:obj.kind==='arch'?53:10,.20);
  if(!menu){for(const e of this.enemies)if(Math.abs(e.x-cam.x)<w/2+40&&Math.abs(e.y-cam.y)<h/2+50)shadow(g,e.x+ox,e.y+oy,e.r*1.3,.3);shadow(g,this.player.x+ox,this.player.y+oy,12,.44)}
  const renderables=decor.map(o=>({...o,category:'decor'}));renderables.push({kind:'campfire',x:0,y:15,category:'fire'});
  if(menu){renderables.push({kind:this.character.id,x:24,y:48,category:'hero',frame:Math.floor(t*4)%4,flip:true});for(const e of this.menuWalkers)renderables.push({...e,x:e.x+Math.sin(t*.15+e.phase)*16,y:e.y+Math.cos(t*.12+e.phase)*12,category:'enemy',scale:1,moving:true,frame:Math.floor(t*5+e.phase)%4})}
  else{
   for(const s of this.shrines)if(Math.abs(s.x-cam.x)<w/2+40&&Math.abs(s.y-cam.y)<h/2+80)renderables.push({...s,kind:'shrine',category:'decor'});
   for(const e of this.enemies)if(Math.abs(e.x-cam.x)<w/2+50&&Math.abs(e.y-cam.y)<h/2+80)renderables.push({...e,category:'enemy',moving:e.freeze<=0,frame:Math.floor(e.walk)%4});
   renderables.push({...this.player,kind:this.character.id,category:'hero',frame:this.player.moving?Math.floor(this.player.walk)%4:Math.floor(t*4)%4});
  }
  renderables.sort((a,b)=>a.y-b.y);
  for(const o of renderables){const x=Math.round(o.x+ox),y=Math.round(o.y+oy);
   if(o.category==='fire'){fire(g,x,y,t);continue}
   let alpha=o.used?.42:1;
   if(o.category==='hero'&&!menu&&this.player.invincible>0&&Math.floor(t*18)%2===0)alpha=.55;
   // Fade foliage when it occludes the player so the action stays readable.
   if(!menu&&(o.kind==='tree'||o.kind==='arch'||o.kind==='deadTree')&&Math.abs(o.x-this.player.x)<35&&o.y>this.player.y&&o.y-this.player.y<80)alpha=.4;
   if(o.kind==='ghost')alpha=.68+Math.sin(t*4+o.x)*.12;
   if(o.elite||o.boss){g.strokeStyle=o.boss?'#c3917066':'#d3ba7066';g.lineWidth=1;g.beginPath();g.ellipse(x,y,o.r+5,(o.r+5)*.45,0,0,TAU);g.stroke()}
   drawSprite(g,o.kind,x,y+(o.kind==='ghost'?Math.sin(t*3+o.x)*3:0),{frame:o.frame||0,flip:o.flip,scale:o.scale||1,alpha,variant:o.variant||0,moving:o.moving});
   if(o.flash>0){g.save();g.globalCompositeOperation='screen';g.globalAlpha=.65;drawSprite(g,o.kind,x,y,{frame:o.frame||0,flip:o.flip,scale:o.scale||1,moving:o.moving});g.restore()}
   if(o.freeze>0){g.fillStyle='#a4d6d54d';g.fillRect(x-o.r,y-o.r*2.3,o.r*2,o.r*2.5);diamond(g,x,y-o.r*2.5,3,'#c7e6d4')}
   if(o.hp<o.maxHp&&!o.boss&&o.category==='enemy'){const width=o.elite?26:16;g.fillStyle='#102219';g.fillRect(x-width/2,y+5,width,2);g.fillStyle=o.elite?'#b8a46f':'#a49468';g.fillRect(x-width/2,y+5,width*Math.max(0,o.hp/o.maxHp),1)}
   if(o.boss&&o.state==='windup')diamond(g,x,y-43*o.scale,5,'#edb783');
   if(o.markUntil>this.time)diamond(g,x,y-25*o.scale,3,'#d6aed5');
   if(o.starMarkedUntil>this.time)diamond(g,x-6,y-29*o.scale,3,'#b7d9e8');
   if(o.windMarkedUntil>this.time)diamond(g,x+6,y-29*o.scale,3,'#c9d69e');
  }
  // Pools of light and floating ash tie the hand-drawn scenery together.
  glow(g,ox,oy-6,92+Math.sin(t*7)*4,'#e9983e34');glow(g,ox,oy-6,32,'#f4c26a32');
  for(const o of decor)if(o.kind==='lantern')glow(g,o.x+ox,o.y+oy-24,37,'#e7b36221');
  if(!menu){this.drawWeapons(g,ox,oy,t);this.drawProjectiles(g,ox,oy,t);this.drawEffects(g,ox,oy,t);for(const p of this.particles){g.globalAlpha=clamp(p.t/p.max,0,1);g.fillStyle=p.color;g.fillRect(Math.round(p.x+ox),Math.round(p.y+oy),p.size,p.size)}g.globalAlpha=1;for(const tx of this.texts){g.globalAlpha=Math.min(1,tx.t*4);pixelText(g,tx.text,tx.x+ox,tx.y+oy,tx.color,tx.critical?11:8)}g.globalAlpha=1}
  if(!menu){
   // Keep danger telegraphs and the player readable when several builds overlap.
   this.drawHazards(g,ox,oy,t);for(const b of this.projectiles)if(b.enemy)drawCombatProjectile(g,b,ox,oy,t);const hero=renderables.find(o=>o.category==='hero');
   drawSprite(g,hero.kind,hero.x+ox,hero.y+oy,{frame:hero.frame,flip:hero.flip,moving:hero.moving,alpha:this.player.invincible>0&&Math.floor(t*18)%2===0?.55:1});
   drawCharacterTalents(this,g,ox,oy);
  }
  this.drawAtmosphere(g,w,h,t,menu);
  if(!menu&&this.player){glow(g,this.player.x+ox,this.player.y+oy-8,74,'#bfd0910b');if(this.player.hp/this.player.maxHp<.28){const gradient=g.createRadialGradient(w/2,h/2,h*.25,w/2,h/2,w*.65);gradient.addColorStop(0,'transparent');gradient.addColorStop(1,`rgba(116,36,27,${.23+Math.sin(t*4)*.07})`);g.fillStyle=gradient;g.fillRect(0,0,w,h)}if(this.flash>0){g.fillStyle=`rgba(217,139,110,${this.flash*.5})`;g.fillRect(0,0,w,h)}}
  if(!menu){drawWorldEvents(this,g,ox,oy);this.drawCompass(g,cam,w,h)}
 }
 drawZones(g,ox,oy,t){for(const z of this.zones){if(drawCombatZone(g,z,ox,oy,t))continue;if(drawExpandedZone(g,z,ox,oy,t))continue;if(z.kind){drawFusionZone(g,z,ox,oy,t);continue}const x=z.x+ox,y=z.y+oy;g.globalAlpha=Math.min(1,z.t)*.5;g.fillStyle='#b1703540';g.beginPath();g.ellipse(x,y,z.r,z.r*.8,0,0,TAU);g.fill();g.strokeStyle='#d8a35a55';g.stroke();g.globalAlpha=Math.min(1,z.t);for(let i=0;i<10;i++){let a=hash(i,z.seed)*TAU,r=hash(i+20,z.seed)*z.r,xx=x+Math.cos(a)*r,yy=y+Math.sin(a)*r,hh=3+(Math.sin(t*8+i)+1)*4;g.fillStyle=i%2?'#ce8c48':'#e3b361';g.fillRect(Math.round(xx),Math.round(yy-hh),2,hh);g.fillStyle='#eac88a';g.fillRect(Math.round(xx),Math.round(yy-3),1,3)}g.globalAlpha=1}}
 drawHazards(g,ox,oy,t){for(const z of this.hazards){let x=z.x+ox,y=z.y+oy;g.save();g.strokeStyle=z.color||'#db9a7a';g.lineWidth=1;if(z.type==='tide'){drawTideHazard(g,z,ox,oy)}else if(z.type==='line'){g.globalAlpha=.5;g.setLineDash([4,3]);g.beginPath();g.moveTo(x,y);let a=Math.atan2(z.ty-z.y,z.tx-z.x);g.lineTo(x+Math.cos(a)*150,y+Math.sin(a)*150);g.stroke()}else{g.fillStyle=`rgba(175,83,66,${.08+(1-z.t/z.max)*.2})`;g.beginPath();g.arc(x,y,z.r,0,TAU);g.fill();g.globalAlpha=.5+Math.sin(t*20)*.25;g.stroke();g.strokeStyle='#f3c597';g.beginPath();g.arc(x,y,z.r*(1-z.t/z.max),0,TAU);g.stroke();g.fillRect(x-2,y-2,4,4)}g.restore()}}
 drawDrops(g,ox,oy,t){for(const d of this.drops){const x=Math.round(d.x+ox),y=Math.round(d.y+oy);if(x<-20||x>this.w+20||y<-20||y>this.h+20)continue;const bob=Math.round(Math.sin(t*3+d.x)*1.5);shadow(g,x,y,4,.2);if(d.type==='xp'){const big=d.elite||d.value>=12;diamond(g,x,y-4+bob,big?5:3,big?'#e2cd89':d.value>=5?'#8fcabb':'#8cb16f');g.fillStyle=big?'#fae7b7':'#d2dfa2';g.fillRect(x-1,y-6+bob,1,2);if(big)glow(g,x,y,16,'#dec38712')}if(d.type==='heal'){g.fillStyle='#617d51';g.fillRect(x-2,y-9+bob,4,3);g.fillStyle='#b5c789';g.fillRect(x-4,y-6+bob,8,7);g.fillStyle='#e0e3b1';g.fillRect(x-2,y-5+bob,2,4)}if(d.type==='magnet'){diamond(g,x,y-7+bob,6,'#8bbccc');diamond(g,x,y-7+bob,3,'#daeee0');glow(g,x,y-7,22,'#8dc7d922')}if(['hourglass','nova','ward'].includes(d.type)){const color={hourglass:'#b4dbe7',nova:'#e8ae70',ward:'#c4dda8'}[d.type];glow(g,x,y-7,22,color+'33');diamond(g,x,y-7+bob,7,color);g.fillStyle='#eff2d2';if(d.type==='hourglass'){g.fillRect(x-4,y-12+bob,8,2);g.fillRect(x-4,y-4+bob,8,2)}else if(d.type==='nova'){g.fillRect(x-1,y-16+bob,2,17);g.fillRect(x-8,y-8+bob,17,2)}else diamond(g,x,y-8+bob,3,'#4f715c')}if(d.type==='chest'){glow(g,x,y-8,33,'#d7ac5d24');drawSprite(g,'chest',x,y+bob);for(let i=0;i<3;i++){g.fillStyle='#dec988';g.fillRect(x-12+i*11,y-12-Math.round((t*12+i*7)%19),1,2)}}}}
 drawWeapons(g,ox,oy,t){drawFusionWeapons(this,g,ox,oy);const p=this.player,lvl=this.weapons.orbit;if(p.shield>0){g.strokeStyle='#bfe4cc88';g.lineWidth=1;g.beginPath();g.arc(p.x+ox,p.y+oy-9,17,0,TAU);g.stroke()}if(!lvl)return;const v=weaponStats('orbit',lvl,this.stats,this.character),count=v.count;for(let i=0;i<count;i++){const dir=lvl===6&&i%2?-1:1,a=this.orbitAngle*dir+i*TAU/count,r=v.radius+(i%2?v.outerOffset:0),x=p.x+ox+Math.cos(a)*r,y=p.y+oy-8+Math.sin(a)*r;for(let j=4;j>0;j--){let aa=a-j*.09*dir;g.globalAlpha=.12+(4-j)*.09;g.fillStyle='#a6d7be';g.fillRect(Math.round(p.x+ox+Math.cos(aa)*r)-2,Math.round(p.y+oy-8+Math.sin(aa)*r)-2,4,4)}g.globalAlpha=1;drawSpirit(g,x,y,t+i*.3,lvl===6?20:16,lvl===6)}}
 drawProjectiles(g,ox,oy,t){for(const b of this.projectiles){if(drawCombatProjectile(g,b,ox,oy,t))continue;let x=Math.round(b.x+ox),y=Math.round(b.y+oy);if(b.trail){for(let i=0;i<b.trail.length;i++){g.globalAlpha=i/b.trail.length*.45;g.fillStyle=b.type==='flame'?'#d29a55':b.fusionKind?'#c7b4ec':b.homing?'#d8c9a0':'#9fac80';g.fillRect(Math.round(b.trail[i].x+ox)-1,Math.round(b.trail[i].y+oy)-1,b.type==='flame'?4:2,b.type==='flame'?4:2)}g.globalAlpha=1}
  if(drawExpandedProjectile(g,b,ox,oy,t))continue;
  if(b.type==='bolt'){const a=Math.atan2(b.vy,b.vx);g.strokeStyle=b.fusionKind?'#d8c9ff':b.homing?'#efdfa5':'#e0d9ab';g.lineWidth=2;g.beginPath();g.moveTo(x-Math.cos(a)*9,y-Math.sin(a)*9);g.lineTo(x+Math.cos(a)*4,y+Math.sin(a)*4);g.stroke();diamond(g,x+Math.cos(a)*4,y+Math.sin(a)*4,2,'#eae1b3')}
  if(b.type==='flame'){glow(g,x,y,23,'#eca85b3d');diamond(g,x,y,6,'#ba713c');diamond(g,x,y,4,'#e8b565');g.fillStyle='#f8dfac';g.fillRect(x-1,y-2,2,3)}
  if(b.enemy){glow(g,x,y,15,'#b691ba33');diamond(g,x,y,5,'#805e84');diamond(g,x,y,3,'#dbb5c1');g.fillStyle='#f0d2c9';g.fillRect(x-1,y-1,2,2)}
 }}
 drawEffects(g,ox,oy,t){for(const fx of this.effects){const x=fx.x+ox,y=fx.y+oy,p=1-fx.t/fx.max;g.save();
  if(drawCombatEffect(g,fx,ox,oy,t)){g.restore();continue}drawExpandedEffect(g,fx,ox,oy);
  if(fx.type==='tideBurst'){g.globalAlpha=1-p;drawTideHazard(g,fx,ox,oy)}
  if(fx.type==='fusion'){
   g.globalAlpha=1-p;g.strokeStyle=fx.color;g.lineWidth=2;
   for(let j=0;j<2;j++){g.beginPath();g.arc(x,y,fx.r*(j?.85:1)*Math.sin(p*Math.PI/2),0,TAU);g.stroke()}
   for(let i=0;i<12;i++){let a=i*TAU/12+p*1.5,r=fx.r*Math.sin(p*Math.PI);diamond(g,x+Math.cos(a)*r,y+Math.sin(a)*r,4,fx.color)}
   glow(g,x,y,75,fx.color+'44');
  }
  if(fx.type==='slash'){
   const a1=fx.a-fx.arc/2+fx.arc*p*.5,a2=fx.a+fx.arc/2;g.globalAlpha=(1-p)*.9;g.fillStyle=fx.color;g.beginPath();for(let i=0;i<=18;i++){const a=a1+(a2-a1)*i/18;const xx=x+Math.cos(a)*fx.r,yy=y+Math.sin(a)*fx.r*.77;i?g.lineTo(Math.round(xx),Math.round(yy)):g.moveTo(Math.round(xx),Math.round(yy))}for(let i=18;i>=0;i--){const a=a1+(a2-a1)*i/18,r=fx.r-(7+Math.sin(i/18*Math.PI)*13)*(1-p);g.lineTo(Math.round(x+Math.cos(a)*r),Math.round(y+Math.sin(a)*r*.77))}g.closePath();g.fill();g.strokeStyle='#f4e9bb';g.globalAlpha=1-p;g.lineWidth=1;g.beginPath();for(let i=0;i<=15;i++){const a=a1+(a2-a1)*i/15;i?g.lineTo(Math.round(x+Math.cos(a)*fx.r),Math.round(y+Math.sin(a)*fx.r*.77)):g.moveTo(Math.round(x+Math.cos(a)*fx.r),Math.round(y+Math.sin(a)*fx.r*.77))}g.stroke();
  }
  if(fx.type==='lightning'){
   const ex=fx.tx+ox,ey=fx.ty+oy;g.globalAlpha=1-p;g.strokeStyle='#b99ad9';g.lineWidth=5;const lines=[[x,y]];for(let i=1;i<7;i++)lines.push([lerp(x,ex,i/7)+(hash(i,Math.floor(t*13),fx.seed)*2-1)*11,lerp(y,ey,i/7)+(hash(i+8,Math.floor(t*13),fx.seed)*2-1)*11]);lines.push([ex,ey]);for(const [color,width] of [['#9a82bb',5],['#dac8ee',2],['#f5e5ed',1]]){g.strokeStyle=color;g.lineWidth=width;g.beginPath();lines.forEach(([xx,yy],i)=>i?g.lineTo(Math.round(xx),Math.round(yy)):g.moveTo(Math.round(xx),Math.round(yy)));g.stroke()}g.fillStyle='#f5e3d0';g.fillRect(ex-3,ey-4,6,8);if(fx.lvl>=4){g.strokeStyle='#d5bce9';g.lineWidth=2;g.beginPath();g.moveTo(ex-7,ey-100);g.lineTo(ex+4,ey-64);g.lineTo(ex-5,ey-35);g.lineTo(ex,ey);g.stroke()}
  }
  if(fx.type==='pulse'||fx.type==='frost'||fx.type==='enemyBlast'){
   const r=fx.r*Math.min(1,p*2.2);g.globalAlpha=(1-p)*.7;g.strokeStyle=fx.color||(fx.type==='frost'?'#b7d9d0':'#d18d77');g.lineWidth=fx.type==='frost'?3:2;g.beginPath();g.arc(x,y,r,0,TAU);g.stroke();g.globalAlpha=(1-p)*.08;g.fillStyle=fx.color||(fx.type==='frost'?'#c2e2d4':'#d18d77');g.fill();if(fx.type==='frost'){g.globalAlpha=(1-p)*.8;for(let i=0;i<12;i++){const a=i*TAU/12;diamond(g,Math.round(x+Math.cos(a)*r),Math.round(y+Math.sin(a)*r),3+p*4,'#bfded1')}}
  }
  g.restore();
 }}
 drawCompass(g,cam,w,h){
  const event=nearestWorldEvent(this),target=worldEventTarget(this);
  if(target&&!this.enemies.some(e=>e.boss&&!e.dead)){
   const x=target.x-cam.x,y=target.y-cam.y,top=Math.min(h/2-20,125/this.dpr+25);
   if(Math.abs(x)>w/2-55||y<top-h/2||y>h/2-50){const a=Math.atan2(y,x),scale=Math.min((w/2-55)/Math.max(1,Math.abs(x)),(y<0?h/2-top:h/2-55)/Math.max(1,Math.abs(y))),px=w/2+x*scale,py=h/2+y*scale,color=EVENT_TYPES[event.kind].color,label=(this.activeEvent?.kind==='souls'?'魂光':this.activeEvent?.kind==='hunt'?'守卫':'祭坛')+' · '+Math.round(distance(this.player,target));g.fillStyle='#071711';g.fillRect(px-50,py-25,100,15);g.fillStyle=color;g.beginPath();g.moveTo(px+Math.cos(a)*8,py+Math.sin(a)*8);g.lineTo(px+Math.cos(a+2.4)*7,py+Math.sin(a+2.4)*7);g.lineTo(px+Math.cos(a-2.4)*7,py+Math.sin(a-2.4)*7);g.fill();pixelText(g,label,px,py-17,color,10)}
  }
  const boss=this.enemies.find(e=>e.boss&&!e.dead);if(boss){const x=boss.x-cam.x,y=boss.y-cam.y;if(Math.abs(x)>w/2-30||Math.abs(y)>h/2-40){const a=Math.atan2(y,x),scale=Math.min((w/2-23)/Math.max(1,Math.abs(x)),(h/2-50)/Math.max(1,Math.abs(y)));const px=w/2+x*scale,py=h/2+y*scale;g.fillStyle='#d5a786';g.beginPath();g.moveTo(px+Math.cos(a)*7,py+Math.sin(a)*7);g.lineTo(px+Math.cos(a+2.4)*5,py+Math.sin(a+2.4)*5);g.lineTo(px+Math.cos(a-2.4)*5,py+Math.sin(a-2.4)*5);g.fill();pixelText(g,'BOSS',px,py-12,'#c7a085',7)}}
 }
 drawAtmosphere(g,w,h,t,menu){
  for(let i=0;i<27;i++){const xx=((hash(i,5)*w+t*(1+hash(i,9)*3))%(w+20))-10,yy=((hash(i,12)*h+Math.sin(t*.2+i)*8)%(h+10));g.globalAlpha=.12+Math.max(0,Math.sin(t*.7+i))*.35;g.fillStyle=i%4===0?'#d7b782':'#9db99a';g.fillRect(Math.round(xx),Math.round(yy),1,1)}g.globalAlpha=1;
  // Fog is deliberately faint; no blur is applied to pixel sprites.
  for(let i=0;i<3;i++){let x=((t*(i%2?-3:4)+hash(i,41)*w)%(w+300))-150,y=h*(.35+i*.23);const gradient=g.createRadialGradient(x,y,1,x,y,w*.38);gradient.addColorStop(0,menu?'#a7b7a20b':'#a7b7a206');gradient.addColorStop(1,'transparent');g.fillStyle=gradient;g.fillRect(x-w*.38,y-w*.38,w*.76,w*.76)}
 }
}
