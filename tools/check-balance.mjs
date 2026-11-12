import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {Game} from '../src/game.js';
import {CHARACTERS,WEAPONS,PASSIVES,PICKUPS,ENEMIES,normalizeItemDiscoveries,readSave,writeSave,refreshSave} from '../src/data.js';
import {FUSIONS,fusionState,maxWeaponLevel} from '../src/fusions.js';
import {characterStats,weaponStats} from '../src/stats.js';
import {PHASES,pressureAt,xpForLevel,upgradePool,rollUpgradeChoices,buildProfile,tagAffinity,recordUpgradeChoice} from '../src/balance.js';
import {relicDescription,relicValues,compatibleWeapons,BUILD_TAGS,itemTags} from '../src/content.js';
import {weaponFacts,passiveEffect} from '../src/item-info.js';
import {onXpPickup,updateRelicStates,onWeaponHit} from '../src/relic-combat.js';
import {updateExpandedWeapon,updateExpandedZone} from '../src/expanded-combat.js';
import {updateFusion,updateFusionZone} from '../src/fusion-combat.js';
import {CHARACTER_TALENTS,TALENT_LEVELS,talentPoints,talentNodeState,updateCharacterTalents,onCharacterCast,onCharacterProjectileHit,characterHitMultiplier,onCharacterHit,characterTalentProgress,characterTalentSummary} from '../src/talents.js';
import {EVENT_TYPES,startWorldEvent,updateWorldEvents,worldEventStatus} from '../src/world-events.js';

// Canvas and audio stay outside this check: the actual Game simulation runs unchanged.
globalThis.window={innerWidth:1280,innerHeight:720,addEventListener(){}};
globalThis.document={addEventListener(){}};
globalThis.requestAnimationFrame=()=>{};
const sound={init(){},play(){},update(){}};
const originalRandom=Math.random;
let seed=137;
Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function start(character=CHARACTERS[0]){
  const game=new Game({getContext:()=>({})},sound);
  game.discoveredFusions=new Set();game.burst=()=>{};game.start(character);
  return game;
}
function equip(game,weapons,passives={}){
  game.weapons={...weapons};game.passives={...passives};game.stats=characterStats(game.character,passives,game.meta,game.talents);
  game.player.maxHp=game.stats.maxHp;game.player.hp=game.player.maxHp;
}
function target(game,x=50,y=37,hp=10000){
  const enemy=game.spawnEnemy('skeleton');Object.assign(enemy,{x,y,hp,maxHp:hp,speed:0,damage:0});return enemy;
}

try{
  const storedDescriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');let storedSave='{}',denyRead=false,denyWrite=false;
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>{if(denyRead)throw Error('storage unavailable');return storedSave},setItem:(_,value)=>{if(denyWrite)throw Error('storage full');storedSave=value}}});
  try{
    storedSave='{"embers":"Infinity","best":1e309,"kills":-4,"runs":[9],"wins":true,"meta":{"power":"Infinity","vitality":2.9,"magnet":99,"regen":-1}}';
    const invalid=readSave();for(const key of ['embers','best','kills','runs','wins'])assert.equal(invalid[key],0,'invalid saved '+key);
    assert.deepEqual(invalid.meta,{vitality:2,power:0,magnet:5,regen:0});
    storedSave='{"embers":"123.9","best":61.25,"kills":8.8,"runs":"2","wins":1,"meta":{"power":"3"},"discoveredFusions":["solar"],"discoveredItems":{"weapon:blade":4}}';
    const legacy=readSave();assert.deepEqual([legacy.embers,legacy.best,legacy.kills,legacy.runs,legacy.wins,legacy.meta.power],[123,61.25,8,2,1,3]);assert.deepEqual(legacy.discoveredFusions,['solar']);assert.equal(legacy.discoveredItems['weapon:blade'],4);
    storedSave='{"embers":1e100}';assert.equal(readSave().embers,Number.MAX_SAFE_INTEGER);storedSave='{broken';assert.equal(readSave().embers,0);
    storedSave='{"embers":200}';const first=readSave(),stale=readSave();
    denyRead=denyWrite=true;refreshSave(first);assert.equal(first.embers,200,'the first unavailable read must preserve the initial loaded save');denyRead=denyWrite=false;
    assert((await writeSave(first,{purchase:'vitality'})).purchased);assert.equal(first.embers,150);
    stale.discoveredItems={'weapon:blade':4};await writeSave(stale,{muted:true});
    assert.equal(readSave().embers,150,'a stale settings/discovery save must preserve another purchase');assert.equal(readSave().meta.vitality,1);
    await Promise.all([writeSave(first,{result:{reward:17,time:50,kills:3,won:false}}),writeSave(stale,{result:{reward:20,time:40,kills:7,won:true}})]);
    assert.deepEqual([readSave().embers,readSave().best,readSave().kills,readSave().runs,readSave().wins],[187,50,10,2,1]);assert.equal(readSave().discoveredItems['weapon:blade'],4);
    const purchases=await Promise.all([writeSave(first,{purchase:'vitality'}),writeSave(stale,{purchase:'vitality'})]);
    assert.equal(purchases.filter(r=>r.purchased).length,1,'recompute the level and price inside each purchase');assert.equal(readSave().embers,87);
    denyWrite=true;assert.equal((await writeSave(first,{result:{reward:13,time:60,kills:2,won:false}})).persisted,false);
    refreshSave(first);refreshSave(first);assert.equal(first.embers,100,'failed income remains once in memory');assert.equal(readSave().embers,87);
    assert.equal((await writeSave(first,{purchase:'power'})).purchased,false);assert.equal(first.meta.power,0,'failed purchase must not grant an unsaved upgrade');assert.equal(first.embers,100);
    denyWrite=false;await writeSave(first);await writeSave(first);assert.equal(readSave().embers,100,'retry failed income exactly once');assert.equal(readSave().runs,3);
    denyRead=denyWrite=true;await writeSave(first,{result:{reward:7,time:10,kills:1,won:false}});assert.equal(first.embers,107,'unavailable reads retain the last stored balance');
    denyRead=denyWrite=false;await writeSave(first);assert.equal(readSave().embers,107);
    const navigatorDescriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
    try{
      Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:()=>Promise.reject(Error('lock denied'))}}});
      assert.equal((await writeSave(first,{result:{reward:7,time:10,kills:1,won:false}})).persisted,false);assert.equal(first.embers,114,'lock rejection retains income without unsafe writes');assert.equal(readSave().embers,107);
    }finally{if(navigatorDescriptor)Object.defineProperty(globalThis,'navigator',navigatorDescriptor);else delete globalThis.navigator}
    await writeSave(first);assert.equal(readSave().embers,114,'retry rejected lock income once');
  }finally{if(storedDescriptor)Object.defineProperty(globalThis,'localStorage',storedDescriptor);else delete globalThis.localStorage}
  const stats=characterStats(CHARACTERS[0]);
  // Exercise the actual first swing, before upgrades, on both fresh and fully upgraded saves.
  for(const power of [0,5]){
    const opening=start();opening.start(CHARACTERS[0],{power});opening.stats.criticalChance=0;
    assert(opening.enemies.length===6&&opening.enemies.every(e=>e.kind==='skeleton'));
    const first=opening.enemies[0];first.x=opening.player.x+45;first.y=opening.player.y;opening.grid.rebuild(opening.enemies);
    const blade=weaponStats('blade',1,opening.stats,opening.character);
    opening.updateWeapons(.01);assert(first.hp>0&&!first.dead,'an ordinary opening slash must not kill a fresh skeleton, meta power '+power);
    assert.equal(first.maxHp-first.hp,Math.round(blade.damage));
    opening.updateWeapons(blade.cooldown+.01);assert(first.dead,'the second ordinary slash must finish the starting skeleton');
    for(let level=2;level<=5;level++){const previous=weaponStats('blade',level-1,opening.stats,opening.character),next=weaponStats('blade',level,opening.stats,opening.character);assert(next.damage>previous.damage&&next.damage<=previous.damage*1.4,'ordinary blade upgrades must not double damage')}
  }
  for(const power of [0,5])for(const character of CHARACTERS.slice(1)){
    const opening=start(character);opening.start(character,{power});opening.stats.criticalChance=0;
    const first=opening.enemies[0];opening.enemies=[first];first.x=opening.player.x+43;first.y=opening.player.y;opening.grid.rebuild(opening.enemies);
    const values=weaponStats(character.weapon,1,opening.stats,character);
    opening.updateWeapons(.01);
    if(character.id==='ranger'){
      assert.equal(opening.projectiles.length,2,'ranger keeps the two-arrow identity');
      for(let i=0;i<8;i++)opening.updateProjectiles(.05);
      assert.equal(first.maxHp-first.hp,2*Math.round(values.damage),'both arrows in the first volley must actually hit');
      assert(first.hp>0&&!first.dead,'an uncharged opening volley must not kill a skeleton, meta power '+power);
      updateCharacterTalents(opening,.8,80);onCharacterCast(opening);
      const wind=opening.projectiles.find(b=>b.talent==='wind');assert(wind&&Math.round(wind.damage)<first.maxHp,'movement supplies an additional, individually bounded wind arrow');
      for(let i=0;i<8;i++)opening.updateProjectiles(.05);
      assert(first.dead,'moving to charge wind should still turn the combined attacks into a kill');
      const second=weaponStats('bolt',2,opening.stats,character);assert(second.damage<=values.damage*1.4);assert.equal(second.count,values.count,'the first upgrade must not multiply damage and arrow count together');
    }else{
      assert.equal(first.maxHp-first.hp,Math.round(values.damage));assert(!first.dead,'a normal orbit contact must not kill a skeleton');
      updateCharacterTalents(opening,.5,0);const star=opening.projectiles.find(b=>b.talent==='star');assert(star&&Math.round(star.damage)<first.maxHp,'one innate star cannot one-shot');
      for(let i=0;i<20;i++)opening.updateProjectiles(.05);
      assert(first.hp<first.maxHp-Math.round(values.damage),'the independent star must contribute damage');first.orbitHit=0;opening.updateWeapons(.01);
      assert(first.dead,'two orbit contacts plus one star must finish an opening skeleton');
    }
  }
  // Cover the old inner edge and the wider outer edge through one half-turn, with real orbit contacts.
  for(const area of [0,3])for(const radius of area?[35,66,96,104]:[25,51,75,83])for(let angle=0;angle<Math.PI*2;angle+=Math.PI/4){
    const orbit=start(CHARACTERS[1]);orbit.enemies=[];equip(orbit,{orbit:1},{area});orbit.stats.criticalChance=0;
    const enemy=target(orbit,Math.cos(angle)*radius,37+Math.sin(angle)*radius);orbit.grid.rebuild(orbit.enemies);
    for(let i=0;i<105;i++)orbit.updateWeapons(.01);
    assert.equal(enemy.hp<enemy.maxHp,radius<(area?100:80),'orbit coverage and rotation cadence: '+[area,radius,angle]);
  }
  const companion=start(CHARACTERS[1]);companion.enemies=[];companion.stats.criticalChance=0;
  const distant=target(companion,425,37);companion.grid.rebuild(companion.enemies);
  updateCharacterTalents(companion,.5,0);assert.equal(companion.projectiles.length,0,'companion waits outside its range');
  distant.x=400;companion.grid.rebuild(companion.enemies);
  for(let i=0;i<90;i++){companion.time+=.05;updateCharacterTalents(companion,.05,0);companion.updateProjectiles(.05)}
  assert.equal(companion.characterState.procs,4,'the base companion fires four volleys in 4.5 seconds');
  assert(distant.maxHp-distant.hp>=33,'distant companion projectiles must actually connect');
  assert.equal(Object.keys(WEAPONS).length,36);assert.equal(Object.keys(PASSIVES).length,38);assert.equal(Object.keys(PICKUPS).length,7);
  // Use one real close-range volley: checking a single arrow misses the level-two burst regression.
  for(const power of [0,5])for(const [time,level] of [[20,2],[40,3],[60,4],[90,5]])for(const kind of ['skeleton','bat']){
    const volley=start(CHARACTERS[2]);volley.start(CHARACTERS[2],{power});volley.enemies=[];volley.time=time-10;
    const enemy=volley.spawnEnemy(kind);enemy.x=43;enemy.y=37;volley.time=time;equip(volley,{bolt:level});volley.stats.criticalChance=0;volley.grid.rebuild(volley.enemies);
    volley.updateWeapons(.01);const arrows=volley.projectiles.length;assert(arrows>=2);
    for(let i=0;i<40;i++){volley.updateEnemy(enemy,.05);volley.grid.rebuild(volley.enemies);volley.updateProjectiles(.05)}
    assert(enemy.hp<enemy.maxHp,'the volley must connect');if(kind==='skeleton'||power===0)assert(!enemy.dead,'ordinary volley must not erase typical early enemies: '+[power,time,level,kind]);
  }
  for(const key of [...Object.keys(WEAPONS),...Object.keys(PASSIVES)]){const tags=itemTags(key);assert(tags.length,key+' needs build tags');assert.equal(new Set(tags).size,tags.length);assert(tags.every(tag=>BUILD_TAGS[tag]),key+' has an unknown tag')}
  for(const [key,data] of Object.entries(WEAPONS))for(let level=1;level<=maxWeaponLevel(key);level++){
    const v=weaponStats(key,level,stats,CHARACTERS[0]);assert(v&&v.damage>0,key);
    for(const [field,value] of Object.entries(v))if(typeof value==='number')assert(Number.isFinite(value)&&value>=0,key+'.'+field);
    assert.equal(data.upgrades.length,maxWeaponLevel(key),key);
    assert(!/undefined|NaN/.test(JSON.stringify(weaponFacts(key,v))),key+' facts');
  }
  for(const [key,data] of Object.entries(PASSIVES))for(let level=1;level<=data.max;level++)assert(data.relic?relicDescription(key,level,stats):passiveEffect(key,level),key+' description');
  for(let level=1;level<100;level++)assert(xpForLevel(level+1)>xpForLevel(level));
  for(let time=0;time<600;time++)assert(pressureAt(time+1).hp>=pressureAt(time).hp);
  assert.equal(pressureAt(0).hp,1);assert(pressureAt(540).hp>8);assert(pressureAt(120,3).hp>pressureAt(120).hp);
  assert.equal(PHASES.at(-1).at,600);
  for(const [time,level,power] of [[60,3,1],[150,5,2],[270,6,2],[450,6,3]]){
    const normal=characterStats(CHARACTERS[0],{power}),strike=weaponStats('blade',level,normal,CHARACTERS[0]).damage;
    const ratio=strike/(ENEMIES.skeleton.hp*pressureAt(time).hp);
    assert(ratio>.35&&ratio<1,'an ordinary blade hit must not erase a fresh skeleton at '+time);
    assert.equal(normal.maxHp,CHARACTERS[0].hp,'damage investment does not silently grant health');
  }

  for(const [id,recipe] of Object.entries(FUSIONS)){
    const game=start();game.time=180;game.enemies=[];
    const weapons={},passives={};for(const i of recipe.ingredients)(i.type==='weapon'?weapons:passives)[i.id]=i.required;
    equip(game,weapons,passives);
    assert(fusionState(id,weapons,passives,game).ready,id);
    assert(!fusionState(id,weapons,passives,{time:179}).ready,id+' time gate');
    game.state='level';assert(game.fuseWeapon(id),id+' fusion');
    assert.equal(game.weapons[id],1);assert(game.discoveredFusions.has(id));
    for(const i of recipe.ingredients){assert(!(i.id in (i.type==='weapon'?game.weapons:game.passives)));assert((i.type==='weapon'?game.consumedWeapons:game.consumedPassives).has(i.id))}
    assert(!upgradePool(game).some(i=>recipe.ingredients.some(material=>material.id===i.key)));
  }
  const full=start();full.time=240;
  equip(full,{blade:2,bolt:2,orbit:2,storm:2,flame:2,frost:2},{power:1,haste:1,armor:1,luck:1,regen:1,area:1});
  assert(upgradePool(full).every(i=>i.current>0));
  full.banished.add('blade');assert(!upgradePool(full).some(i=>i.key==='blade'));
  for(let i=0;i<100;i++){const choices=rollUpgradeChoices(full);assert.equal(new Set(choices.map(i=>i.key)).size,choices.length);assert(choices.length<=3)}
  assert(fusionState('bloodmoon',{crescent:5},full.passives,full).blocked);
  assert(compatibleWeapons('rime',{bolt:1},{frostbrand:1}).includes('bolt'));
  assert(compatibleWeapons('spore',{blade:1},{venomfang:1}).includes('blade'));
  assert.equal(compatibleWeapons('volatile',{blade:1},{}).length,0);
  assert(compatibleWeapons('volatile',{blade:1},{embercore:1,venomfang:1}).length);
  assert.equal(compatibleWeapons('volatile',{orbit:1},{embercore:1,venomfang:1}).length,0,'catalysts need a weapon that actually triggers them');
  assert.equal(compatibleWeapons('stormseal',{storm:1},{frostbrand:1}).length,0,'ice needles cannot slow enemies without a projectile or beam');
  assert(compatibleWeapons('cinder',{orbit:1},{dashfire:1}).length,'dash fire can enable burning kills');
  assert(compatibleWeapons('rime',{bolt:1},{hoarfrost:1}).length);
  assert.equal(compatibleWeapons('rotclock',{flame:1},{}).length,0,'ground fire is not an attached damage-over-time status');
  assert(compatibleWeapons('rotclock',{bolt:1},{embercore:1}).length);
  assert(compatibleWeapons('soulpact',{sentinel:1},{}).length);
  assert(compatibleWeapons('rime',{tether:1},{}).length,'soul chains also slow enemies');
  assert.equal(compatibleWeapons('bulwark',{bolt:1},{},{},'ranger').length,0);
  assert.equal(compatibleWeapons('bulwark',{bolt:1},{stormcoil:1},{},'ranger').length,0,'a thunder flask without lightning cannot supply a shield');
  assert(compatibleWeapons('bulwark',{storm:1},{stormcoil:1},{},'ranger').length);
  assert(compatibleWeapons('bulwark',{blade:1},{},{},'warden').length);
  assert.deepEqual(normalizeItemDiscoveries({'weapon:meteor':99,'passive:aegis':2,'weapon:unknown':1}),{'weapon:meteor':6,'passive:aegis':2});

  // Every weapon must cause real damage at both ends of its progression, including delayed attacks.
  for(const key of Object.keys(WEAPONS))for(const level of [1,maxWeaponLevel(key)]){
    const game=start();game.time=240;game.bossMilestones=new Set([180,360,600]);game.spawnClock=game.waveClock=Infinity;game.shrines=[];game.enemies=[];
    equip(game,{[key]:level});game.player.invincible=100;
    for(let i=0;i<12;i++){const a=i*Math.PI/6,r=35+i*7;target(game,Math.cos(a)*r,37+Math.sin(a)*r)}
    for(let i=0;i<220;i++)game.update(.05);
    const damage=Object.values(game.damageByWeapon).reduce((a,b)=>a+b,0);
    assert(damage>0,key+' level '+level+' did not hit');
    assert(game.enemies.every(e=>Number.isFinite(e.hp)&&Number.isFinite(e.x)&&Number.isFinite(e.y)),key+' invalid enemy state');
    assert(game.projectiles.every(b=>Number.isFinite(b.damage)&&Number.isFinite(b.x)),key+' invalid projectile');
  }
  const link=start();link.enemies=[];link.time=240;equip(link,{bolt:3},{frostbrand:2,rime:2,embercore:1,venomfang:1,volatile:2,deadeye:1});
  const e=target(link),other=target(link,60,37);link.grid.rebuild(link.enemies);link.hit(e,20,0,37,0,false,'bolt');
  assert(link.relicProcs.rime>0);assert(link.relicProcs.volatile>0);assert(other.hp<other.maxHp);assert(!e.poison);assert.equal(e.burningUntil,0);
  const shield=start();shield.player.invincible=0;shield.player.shield=20;const hp=shield.player.hp;shield.hurt(12,0,0);assert.equal(shield.player.hp,hp);assert.equal(shield.player.shield,8);
  shield.player.invincible=0;shield.hurt(12,0,0);assert.equal(shield.player.hp,hp-4);
  const recovery=start();recovery.enemies=[];recovery.weapons={};recovery.spawnClock=recovery.waveClock=Infinity;
  recovery.meta={regen:5};equip(recovery,{},{});recovery.player.shield=20;recovery.player.invincible=0;recovery.player.hp=40;recovery.hurt(12,0,0);
  for(let i=0;i<119;i++)recovery.update(.05);assert.equal(recovery.player.hp,40,'even a shield hit interrupts permanent recovery');
  recovery.update(.1);assert(recovery.player.hp>40,'six seconds of avoidance restores permanent recovery');
  equip(recovery,{},{regen:2});recovery.player.hp=40;recovery.lastHurt=recovery.time;recovery.update(.05);assert(Math.abs(recovery.player.hp-40.022)<1e-8,'a recovery build still regenerates during combat');
  const contact=start();contact.enemies=[];contact.player.invincible=0;contact.player.shield=0;const frozenContact=target(contact,contact.player.x,contact.player.y);frozenContact.damage=15;frozenContact.freeze=1;
  const contactHp=contact.player.hp;contact.updateEnemy(frozenContact,.05);assert.equal(contact.player.hp,contactHp,'frozen enemies cannot inflict contact damage');
  frozenContact.freeze=0;contact.updateEnemy(frozenContact,.05);assert.equal(contact.player.hp,contactHp-15);
  contact.hurt(15,0,0);assert.equal(contact.player.hp,contactHp-15,'one attack cannot bypass the hit protection window');
  contact.player.invincible-=.61;contact.hurt(15,0,0);assert.equal(contact.player.hp,contactHp-30,'remaining in contact is punished after a short recovery window');
  // Enemy fire stays sparse even after minute seven, while shots still reach and damage the player.
  for(const at of [60,419.95,420,540,600]){
    const fire=start();fire.time=at;fire.enemies=[];fire.player.invincible=0;
    const ghost=fire.spawnEnemy('ghost');Object.assign(ghost,{x:204,y:37,speed:0,attack:0});
    fire.projectiles=Array.from({length:20},()=>({enemy:false,t:10}));fire.updateEnemy(ghost,.05);
    const shots=fire.projectiles.filter(b=>b.enemy);assert.equal(shots.length,1,'player projectiles do not consume the hostile shot budget');assert(ghost.attack>=6.5);
    fire.projectiles=shots;const before=fire.player.hp;for(let i=0;i<64;i++)fire.updateProjectiles(.05);
    assert(fire.player.hp<before,'shorter-lived shots must still hit from the edge of ghost firing range');assert.equal(fire.projectiles.length,0);
  }
  const crossfire=start();crossfire.time=540;crossfire.enemies=[];crossfire.weapons={};crossfire.player.invincible=1000;
  crossfire.spawnClock=crossfire.waveClock=crossfire.xpNext=Infinity;crossfire.bossMilestones=new Set([180,360,600]);
  for(let i=0;i<40;i++){const ghost=crossfire.spawnEnemy('ghost'),angle=i*Math.PI/20;Object.assign(ghost,{x:Math.cos(angle)*170,y:37+Math.sin(angle)*170,speed:0})}
  let crossfirePeak=0;
  for(let i=0;i<400;i++){
    crossfire.update(.05);const count=crossfire.projectiles.filter(b=>b.enemy).length;crossfirePeak=Math.max(crossfirePeak,count);
    assert(count<=6,'forty late ghosts must not fill the screen with projectiles');
  }
  assert(crossfirePeak>0,'the crowd still makes occasional ranged attacks');
  for(const milestone of [180,360,600]){
    const fight=start();fight.time=milestone;fight.enemies=[];fight.player.invincible=1000;fight.spawnBoss(milestone);
    const boss=fight.enemies[0];Object.assign(boss,{x:180,y:37,speed:0,attack:0});
    const random=Math.random;try{Math.random=()=>.95;fight.updateEnemy(boss,.05)}finally{Math.random=random}
    assert.equal(fight.projectiles.length,milestone===600?8:6);
    const angles=fight.projectiles.map(b=>(Math.atan2(b.vy,b.vx)+Math.PI*2)%(Math.PI*2)).sort((a,b)=>a-b);
    assert(Math.max(...angles.map((angle,i)=>(angles[(i+1)%angles.length]-angle+Math.PI*2)%(Math.PI*2)))>=Math.PI*.59,'a contiguous escape gap remains in each ring');
    const ghost=fight.spawnEnemy('ghost');Object.assign(ghost,{x:-170,y:37,speed:0,attack:0});fight.updateEnemy(ghost,.05);
    assert.equal(fight.projectiles.length,angles.length,'ghosts hold fire during a dense boss ring');assert(ghost.attack>0);
    fight.updateProjectiles(3.21);assert.equal(fight.projectiles.length,0);assert(boss.attack>3.21,'a boss ring expires before its next attack');
    ghost.attack=0;fight.updateEnemy(ghost,.05);assert.equal(fight.projectiles.length,1,'expired boss fire frees the ghost shot budget');
  }
  const glacier=start();glacier.enemies=[];equip(glacier,{glacier:3});const pulled=target(glacier,110,glacier.player.y-8);glacier.grid.rebuild(glacier.enemies);
  const glacierStats=weaponStats('glacier',3,glacier.stats,glacier.character);updateFusion(glacier,'glacier',glacierStats,.05);const coldZone=glacier.zones.find(z=>z.kind==='glacier');
  updateFusionZone(glacier,coldZone,2);assert(Math.abs(Math.hypot(pulled.x-coldZone.x,pulled.y-coldZone.y)-glacierStats.radius)<1e-8,'cold fields pull enemies to the crystal ring, not into the player');
  const harvest=start();harvest.enemies=[];equip(harvest,{bolt:1},{harvest:2});target(harvest);onXpPickup(harvest,180);updateRelicStates(harvest);assert.equal(harvest.harvestCharge,120);assert.equal(harvest.projectiles.length,3);
  const drops=start();drops.enemies=[];drops.time=100;drops.player.hp=10;drops.lastHealDrop=0;
  for(let i=0;i<50;i++)drops.kill(target(drops));
  assert.equal(drops.drops.filter(d=>d.type==='heal').length,1,'mass kills must respect shared supply cooldown');
  const xp=drops.drops.filter(d=>d.type==='xp').reduce((sum,d)=>sum+d.value,0);assert.equal(xp,100);
  assert.equal(drops.drops.find(d=>d.type==='heal').value,12);
  drops.time=200;drops.kill(target(drops));assert.equal(drops.drops.filter(d=>d.type==='heal').length,1,'stored herbs block additional healing drops');
  drops.drops=[];drops.lastHealDrop=100;const savedRandom=Math.random;Math.random=()=>.9;
  drops.time=174;drops.kill(target(drops));assert(!drops.drops.some(d=>d.type==='heal'),'low health does not give an early guaranteed heal');
  drops.time=175;drops.kill(target(drops));assert(drops.drops.some(d=>d.type==='heal'),'a long drought still has a bounded rescue');Math.random=savedRandom;
  const trail=start();equip(trail,{flame:6},{area:2,duration:2});trail.addFire({x:0,y:0,lvl:3},true);assert.equal(trail.zones[0].r,24);assert.equal(trail.zones[0].t,1.4*1.3);
  const ice=start();ice.enemies=[];equip(ice,{bolt:1},{hoarfrost:2});const frozen=target(ice),iceBoss=target(ice,60,37);iceBoss.boss=true;ice.grid.rebuild(ice.enemies);ice.dash();assert.equal(frozen.freeze,.8);assert.equal(iceBoss.freeze,.15);assert.equal(ice.relicProcs.hoarfrost,1);assert(frozen.hp<frozen.maxHp);
  const glass=start();glass.enemies=[];equip(glass,{bolt:1},{bulwark:2});glass.player.shield=20;glass.player.invincible=0;glass.hurt(10,0,0);assert.equal(glass.projectiles.length,0);glass.player.invincible=0;glass.hurt(10,0,0);assert.equal(glass.projectiles.length,5);assert(glass.projectiles.every(b=>b.refracted));glass.player.shield=10;glass.player.invincible=0;glass.hurt(10,0,0);assert.equal(glass.projectiles.length,5,'shield break shares one cooldown');
  const fork=start();fork.enemies=[];equip(fork,{bolt:1},{forkseed:2});const forkTarget=target(fork);fork.grid.rebuild(fork.enemies);fork.stats.criticalChance=1;fork.hit(forkTarget,1,0,37,0,false,'bolt');assert.equal(fork.projectiles.length,2);assert(fork.projectiles.every(b=>b.hit.has(forkTarget.id)));fork.hit(forkTarget,1,0,37,0,false,'bolt');assert.equal(fork.projectiles.length,2);
  onWeaponHit(fork,forkTarget,'bolt',true,true);assert.equal(fork.projectiles.length,2,'periodic hits cannot split again');
  const forkOther=target(fork,75,37),originalHp=forkTarget.hp;fork.grid.rebuild(fork.enemies);for(let i=0;i<50;i++)fork.updateProjectiles(.05);assert(forkOther.hp<forkOther.maxHp);assert.equal(forkTarget.hp,originalHp);assert.equal(fork.relicProcs.forkseed,1,'split projectiles cannot recursively trigger their source');
  const coil=start();coil.enemies=[];equip(coil,{storm:1},{stormcoil:2});coil.player.shield=0;const charged=target(coil);coil.grid.rebuild(coil.enemies);for(let i=0;i<7;i++)coil.hit(charged,1,0,37,0,false,'storm');assert.equal(coil.relicProcs.stormcoil,1);assert.equal(coil.player.shield,7);assert.equal(coil.stormCharge,0);for(let i=0;i<14;i++)coil.hit(charged,1,0,37,0,false,'storm');assert.equal(coil.relicProcs.stormcoil,1);assert.equal(coil.stormCharge,7);coil.time=2.5;coil.hit(charged,1,0,37,0,false,'storm');assert.equal(coil.relicProcs.stormcoil,2);
  const rot=start();rot.enemies=[];equip(rot,{blade:1},{rotclock:2});const rotting=target(rot);rotting.burn={damage:20,until:3,next:0};updateRelicStates(rot);assert.equal(rotting.maxHp-rotting.hp,30);assert.equal(rot.relicProcs.rotclock,1);
  const pactStats=characterStats(CHARACTERS[0],{soulpact:2}),plainTurret=weaponStats('sentinel',3,stats,CHARACTERS[0]),pactTurret=weaponStats('sentinel',3,pactStats,CHARACTERS[0]);assert(Math.abs(pactTurret.damage-plainTurret.damage*1.36)<1e-9);assert.equal(pactTurret.fireInterval,plainTurret.fireInterval*.88);assert.equal(weaponStats('blade',1,pactStats,CHARACTERS[0]).damage,weaponStats('blade',1,stats,CHARACTERS[0]).damage);
  const shrine=start();shrine.enemies=[];equip(shrine,{soulforge:1});const shrineTarget=target(shrine);shrine.grid.rebuild(shrine.enemies);const sv=weaponStats('soulforge',1,shrine.stats,shrine.character);updateExpandedWeapon(shrine,'soulforge',sv,.05);const summoned=shrine.zones[0];updateExpandedZone(shrine,summoned,.05);assert.equal(shrine.projectiles.length,2);assert(shrine.projectiles.every(b=>b.homing&&b.pierce===2));summoned.t=.01;updateExpandedZone(shrine,summoned,.05);assert(shrineTarget.hp<shrineTarget.maxHp,'expiring soul shrine explodes');
  const hail=start();hail.enemies=[];equip(hail,{hailfire:1});const hailTarget=target(hail);hail.grid.rebuild(hail.enemies);updateExpandedWeapon(hail,'hailfire',weaponStats('hailfire',1,hail.stats,hail.character),.05);updateExpandedZone(hail,hail.zones[0],1);assert(hailTarget.freeze>0);assert(hail.zones.some(z=>z.kind==='aftermath'));

  // Hold inventory constant so only deliberate tag choices can change these weights.
  const adaptive=start();adaptive.time=240;adaptive.level=11;equip(adaptive,{blade:2,bolt:2},{embercore:1});
  const baseline=upgradePool(adaptive),baseMeteor=baseline.find(i=>i.key==='meteor').weight,basePact=baseline.find(i=>i.key==='soulpact').weight;
  for(const key of ['flame','embercore','cinder','flame','embercore','cinder'])recordUpgradeChoice(adaptive,key);
  const firePool=upgradePool(adaptive);assert(firePool.find(i=>i.key==='meteor').weight>baseMeteor*1.5);assert.equal(firePool.find(i=>i.key==='soulpact').weight,basePact);
  assert(firePool.every(i=>i.affinity>=1&&i.affinity<=2.6&&Number.isFinite(i.weight)&&i.weight>0));assert.equal(firePool.find(i=>i.key==='power').affinity,1,'universal stats do not vote for every build');
  const oldFire=tagAffinity('meteor',buildProfile(adaptive)).multiplier;
  for(let i=0;i<12;i++)recordUpgradeChoice(adaptive,['frost','rime','hoarfrost'][i%3]);
  assert.equal(adaptive.choiceHistory.length,12);assert.equal(buildProfile(adaptive).leading[0],'cold');assert(tagAffinity('meteor',buildProfile(adaptive)).multiplier<oldFire);assert(tagAffinity('frost',buildProfile(adaptive)).multiplier>1.8);
  adaptive.state='level';adaptive.choices=adaptive.rollUpgrades();const choicesBefore=[...adaptive.choiceHistory];adaptive.reroll();adaptive.banish(adaptive.choices.findIndex(i=>!i.fusion));adaptive.skipUpgrade();adaptive.openChest(25);assert.deepEqual(adaptive.choiceHistory,choicesBefore,'automatic rewards and rejected offers must not invent preferences');
  adaptive.state='level';adaptive.choices=adaptive.rollUpgrades();const selectedKey=adaptive.choices[0].key;adaptive.chooseUpgrade(0);assert.equal(adaptive.choiceHistory.at(-1),selectedKey);adaptive.start(CHARACTERS[0]);assert.deepEqual(adaptive.choiceHistory,[]);
  // Character trees share one gate for the UI and the actual transaction.
  for(const character of CHARACTERS)for(const branch of CHARACTER_TALENTS[character.id].branches){
    const game=start(character);assert.equal(talentPoints(game),0);assert(!game.learnTalent(branch.nodes[0].id));
    game.level=30;assert(!game.learnTalent(branch.nodes[2].id));
    for(const node of branch.nodes){assert(game.learnTalent(node.id),node.id);assert(!game.learnTalent(node.id),'duplicate '+node.id)}
    assert.equal(talentPoints(game),3);
    const plain=characterStats(character);
    for(const [key,value] of Object.entries(plain))if(typeof value==='number')assert.equal(game.stats[key],value,'talents specialize the innate, not global '+key);
    for(const key of Object.keys(WEAPONS))assert.deepEqual(weaponStats(key,1,game.stats,character),weaponStats(key,1,plain,character),'no unrelated weapon bonus: '+key);
    for(const other of CHARACTER_TALENTS[character.id].branches)if(other!==branch)assert(talentNodeState(game,other.nodes[2].id).exclusive);
    game.start(character);assert.equal(Object.keys(game.talents).length,0);assert.equal(talentPoints(game),0);
  }
  const gates=start();gates.level=12;assert(gates.learnTalent('w_guard1'));assert(gates.learnTalent('w_guard2'));assert(!gates.learnTalent('w_guard3'));assert(!gates.learnTalent('r_shot1'));
  gates.level=30;assert(gates.learnTalent('w_guard3'));assert(!gates.characterState.reviveReady);gates.enemies=[];
  const lampTarget=target(gates);gates.grid.rebuild(gates.enemies);gates.player.hp=10;gates.player.shield=0;
  for(let i=0;i<6;i++){gates.time=i*.4;gates.hit(lampTarget,1,0,37,0,false,'blade')}
  assert.equal(gates.player.hp,13);assert.equal(gates.player.shield,16);assert(gates.characterState.reviveReady,'full lamp earns the one-use wick');
  gates.player.invincible=0;gates.player.shield=0;const beforeRevive=lampTarget.hp;gates.hurt(1000,0,0);assert.equal(gates.player.hp,gates.player.maxHp*.35);assert.equal(gates.player.invincible,3);assert(gates.characterState.revived);assert(!gates.characterState.reviveReady);assert(lampTarget.hp<beforeRevive,'revival releases the lamp pulse');
  gates.player.invincible=0;gates.hurt(1000,0,0);assert(gates.player.hp<=0,'revive is once per run');
  const unlit=start();unlit.level=30;for(const id of ['w_guard1','w_guard2','w_guard3'])unlit.learnTalent(id);unlit.player.invincible=0;unlit.hurt(1000,0,0);assert(unlit.player.hp<=0,'an uncharged wick cannot revive');
  const close=start();close.enemies=[];close.player.shield=0;const closeTarget=target(close);close.grid.rebuild(close.enemies);
  for(let i=0;i<6;i++){close.time=i*.4;close.hit(closeTarget,1,0,37,0,false,'blade')}
  assert.equal(close.characterState.procs,1);assert.equal(close.player.shield,8);assert(close.damageByWeapon.talent>0);
  const carried=start();carried.level=4;carried.state='status';carried.statusReturn='running';carried.characterState.charge=6;assert(carried.learnTalent('w_flame1'));assert.equal(carried.characterState.charge,5);assert.equal(carried.characterState.procs,0,'learning clamps stored charge without attacking inside the menu');
  carried.start(CHARACTERS[2]);carried.level=4;carried.characterState.charge=80;assert(carried.learnTalent('r_roam1'));assert.equal(carried.characterState.charge,60);assert.equal(carried.projectiles.length,0);
  const stars=start(CHARACTERS[1]);stars.level=30;stars.enemies=[];target(stars);for(const id of ['s_swarm1','s_swarm2','s_swarm3'])assert(stars.learnTalent(id));
  updateCharacterTalents(stars,2,0);assert.equal(stars.projectiles.length,4);assert(stars.projectiles.every(b=>b.pierce===2));assert.equal(stars.characterState.starClock,1);
  const cold=start(CHARACTERS[1]);cold.level=30;cold.enemies=[];const coldTarget=target(cold),coldBoss=target(cold,60,37);coldBoss.boss=true;cold.grid.rebuild(cold.enemies);for(const id of ['s_frost1','s_frost2','s_frost3'])assert(cold.learnTalent(id));
  onCharacterProjectileHit(cold,{talent:'star'},coldTarget);assert.equal(coldTarget.slow,1.4);assert.equal(coldTarget.freeze,1.2);assert.equal(coldBoss.freeze,.25);assert.equal(coldTarget.marks.moon.multiplier,1.12);assert(compatibleWeapons('rime',cold.weapons,{},cold.talents).length);
  const scholar=start(CHARACTERS[1]);scholar.level=30;scholar.xpNext=1e9;scholar.enemies=[];scholar.characterState.starClock=100;
  for(const id of ['s_scholar1','s_scholar2'])assert(scholar.learnTalent(id));scholar.player.hp=10;
  onXpPickup(scholar,180);assert.equal(scholar.player.hp,10);assert.equal(scholar.characterState.xp,0,'ordinary XP cannot trigger the companion well');
  const linked=target(scholar,200,37,1);linked.xp=60;onCharacterProjectileHit(scholar,{talent:'star'},linked);scholar.hit(linked,1,0,37,0,false,'orbit');
  assert(scholar.drops[0].attracted&&scholar.drops[0].starLinked,'companion marks recall the XP even when a weapon lands the kill');
  for(let i=0;i<100;i++)scholar.updateDrops(.05);
  assert.equal(scholar.xp,60);assert.equal(scholar.player.hp,13);assert.equal(scholar.player.shield,4);assert.equal(scholar.projectiles.length,0);
  assert(scholar.learnTalent('s_scholar3'));onXpPickup(scholar,180,true);assert.equal(scholar.player.hp,13);assert.equal(scholar.characterState.xp,20,'one stored well charge, regardless of a large crystal');
  scholar.time=4;updateCharacterTalents(scholar,.05,0);assert.equal(scholar.player.hp,16);assert.equal(scholar.characterState.xp,0,'stored well charge releases when its cooldown ends');
  assert.equal(scholar.player.shield,14);assert.equal(scholar.projectiles.length,6);assert.equal(scholar.stats.xpMultiplier,1);
  const expired=target(scholar,200,37,1);onCharacterProjectileHit(scholar,{talent:'star'},expired);scholar.time=7.01;scholar.hit(expired,1,0,37,0,false,'orbit');assert(!scholar.drops.find(d=>d.type==='xp').starLinked,'expired star marks cannot recall XP');
  const wind=start(CHARACTERS[2]);wind.enemies=[];target(wind);updateCharacterTalents(wind,1,80);assert.equal(wind.characterState.charge,80);onCharacterCast(wind);assert.equal(wind.projectiles.length,1);assert.equal(wind.characterState.charge,0);onCharacterCast(wind);assert.equal(wind.projectiles.length,1);
  wind.level=30;for(const id of ['r_shot1','r_shot2','r_shot3'])assert(wind.learnTalent(id));wind.time=2;wind.characterState.charge=80;onCharacterCast(wind);assert.equal(wind.projectiles.length,4);assert.equal(wind.projectiles.at(-1).pierce,3);assert(wind.projectiles.at(-1).homing);
  const stride=start(CHARACTERS[2]);stride.level=30;stride.enemies=[];target(stride);for(const id of ['r_roam1','r_roam2','r_roam3'])assert(stride.learnTalent(id));
  updateCharacterTalents(stride,.5,60);onCharacterCast(stride);assert.equal(stride.projectiles.length,1);assert.equal(stride.characterState.nextWind,1);
  stride.dash();assert.equal(stride.characterState.charge,60);assert.equal(stride.characterState.nextWind,0);assert.equal(stride.characterState.ghostUntil,3);
  onCharacterCast(stride);assert.equal(stride.projectiles.length,2);updateCharacterTalents(stride,.1,0);assert.equal(stride.projectiles.length,2,'stationary movement branch cannot auto-fire');
  updateCharacterTalents(stride,.1,1);assert.equal(stride.projectiles.length,3);assert.equal(stride.characterState.charge,1,'automatic wind does not consume movement charge');
  stride.time=.5;updateCharacterTalents(stride,.1,1);assert.equal(stride.projectiles.length,3);stride.time=1;updateCharacterTalents(stride,.1,1);assert.equal(stride.projectiles.length,4);stride.time=3;updateCharacterTalents(stride,.1,1);assert.equal(stride.projectiles.length,4,'dash window expires');
  const embers=start();embers.level=30;embers.enemies=[];const burned=target(embers);embers.grid.rebuild(embers.enemies);
  for(const id of ['w_flame1','w_flame2','w_flame3','w_dash1','w_dash2','w_guard1'])assert(embers.learnTalent(id));
  assert.equal(talentPoints(embers),0);assert(!embers.learnTalent('w_guard2'));assert.equal(embers.stats.armor,0);
  embers.player.shield=0;embers.dash();assert.equal(embers.characterState.charge,2);assert.equal(embers.player.shield,0,'partial dash charge does not grant a free shield');assert(burned.burn);assert.equal(embers.characterState.echoes.length,1);const beforeEcho=burned.hp;embers.time=.5;updateCharacterTalents(embers,.5,0);assert(burned.hp<beforeEcho);assert.equal(embers.characterState.echoes.length,0);
  const burn={...burned.burn};embers.passives.embercore=1;embers.hit(burned,1,0,37,0,false,'blade');assert.deepEqual(burned.burn,burn,'weaker burning must not overwrite a talent or delay its next tick');
  for(let i=0;i<2;i++){embers.time+=.4;embers.hit(burned,1,0,37,0,false,'blade')}assert.equal(embers.characterState.procs,1);assert.equal(embers.player.shield,16,'five lamp charges release the upgraded pulse');
  const assault=start();assault.level=30;assault.enemies=[];const assaultTarget=target(assault);assault.grid.rebuild(assault.enemies);
  for(const id of ['w_dash1','w_dash2','w_dash3','w_guard1','w_guard2'])assert(assault.learnTalent(id));assault.characterState.nextPulse=10;assault.player.hp=10;assault.player.shield=0;assault.dash();
  assert.equal(assault.characterState.nextPulse,2.5);assert.equal(assault.player.hp,10,'dash pulse does not heal');
  for(let i=0;i<2;i++){assault.time+=.4;assault.hit(assaultTarget,1,0,37,0,false,'blade')}assert.equal(assault.characterState.charge,6);assert.equal(assault.characterState.procs,0);
  assault.time=2.5;assault.hit(assaultTarget,1,0,37,0,false,'blade');assert.equal(assault.characterState.procs,1);assert.equal(assault.characterState.nextPulse,5);assert.equal(assault.player.hp,13);
  assault.time=4.1;assault.hit(assaultTarget,1,0,37,0,false,'blade');assert.equal(assault.characterState.charge,1,'dash amplification expires');
  const levels=start();let awards=0;levels.on=event=>{if(event==='talentPoints')awards++};
  while(levels.level<30){levels.gainXp(levels.xpNext-levels.xp);assert.equal(talentPoints(levels),TALENT_LEVELS.filter(level=>levels.level>=level).length)}assert.equal(awards,6);
  const sight=start(CHARACTERS[2]);sight.level=30;sight.enemies=[];sight.stats.criticalChance=0;const markedWind=target(sight,80,37),freshWind=target(sight,120,37);sight.grid.rebuild(sight.enemies);
  for(const id of ['r_sight1','r_sight2'])assert(sight.learnTalent(id));assert.equal(characterHitMultiplier(sight,markedWind,'bolt',false),1);
  for(let i=0;i<3;i++)onCharacterHit(sight,markedWind,'bolt',false);assert.equal(sight.projectiles.length,0,'weapons cannot create wind marks');
  assert.equal(onCharacterProjectileHit(sight,{talent:'wind'},markedWind),1);assert.equal(characterHitMultiplier(sight,markedWind,'bolt',false),1.12);assert.equal(characterHitMultiplier(sight,markedWind,'bolt',true),1);
  for(let i=0;i<2;i++)onCharacterHit(sight,markedWind,'bolt',false);assert.equal(sight.projectiles.length,0);onCharacterHit(sight,markedWind,'bolt',false);assert.equal(sight.projectiles.length,1);
  onCharacterHit(sight,markedWind,'talent',true);assert.equal(markedWind.windHits,0,'wind cannot recursively stack pursuit');
  for(let i=0;i<3;i++)onCharacterHit(sight,markedWind,'bolt',false);assert.equal(sight.projectiles.length,1,'pursuit shares a cooldown');
  sight.time=1;assert(sight.learnTalent('r_sight3'));sight.projectiles=[];markedWind.windHits=0;
  onCharacterHit(sight,markedWind,'bolt',false);assert.equal(sight.projectiles.length,0);onCharacterHit(sight,markedWind,'bolt',false);assert.equal(sight.projectiles.length,1,'capstone only needs two weapon hits');
  for(let i=0;i<25;i++)sight.updateProjectiles(.02);
  assert.equal(markedWind.maxHp-markedWind.hp,69);assert.equal(freshWind.maxHp-freshWind.hp,46,'piercing wind boosts only already-marked targets, without compounding');assert.equal(markedWind.windMarkedUntil,7);assert.equal(sight.characterState.procs,2);
  sight.time=7.01;assert.equal(characterHitMultiplier(sight,markedWind,'bolt',false),1);assert.equal(onCharacterProjectileHit(sight,{talent:'wind'},markedWind),1);assert.equal(markedWind.windHits,0,'expired marks reset pursuit hits');
  // Overlapping vulnerability sources retain their own expiry, including the weaker fallback.
  const overlap=start(CHARACTERS[1]);overlap.level=30;overlap.enemies=[];equip(overlap,{starfall:3},{deadeye:3});overlap.stats.criticalChance=0;
  const overlapTarget=target(overlap);overlap.grid.rebuild(overlap.enemies);for(const id of ['s_frost1','s_frost2'])assert(overlap.learnTalent(id));overlap.stats.criticalChance=0;
  onWeaponHit(overlap,overlapTarget,'orbit',true,false);
  overlap.time=1;updateExpandedWeapon(overlap,'starfall',weaponStats('starfall',3,overlap.stats,overlap.character),.05);updateExpandedZone(overlap,overlap.zones[0],1);
  overlap.time=2;onCharacterProjectileHit(overlap,{talent:'star'},overlapTarget);
  for(const [at,expected] of [[2,124],[3,119],[4,112],[5,100]]){
    overlap.time=at;const hp=overlapTarget.hp;overlap.hit(overlapTarget,100,0,37,0,false);
    assert.equal(hp-overlapTarget.hp,expected,'independent deadeye/starfall/moon expiry at '+at);
  }
  // A full lamp releases at the cooldown boundary without demanding another hit or reviving a dead player.
  const delayedLamp=start();delayedLamp.level=30;delayedLamp.enemies=[];delayedLamp.player.hp=10;delayedLamp.player.shield=0;
  for(const id of ['w_guard1','w_guard2'])assert(delayedLamp.learnTalent(id));const waitingEnemy=target(delayedLamp);delayedLamp.grid.rebuild(delayedLamp.enemies);delayedLamp.characterState.nextPulse=5;
  for(let i=0;i<6;i++){delayedLamp.time=i*.4;delayedLamp.hit(waitingEnemy,1,0,37,0,false,'blade')}
  delayedLamp.time=4.99;updateCharacterTalents(delayedLamp,.05,0);assert.equal(delayedLamp.characterState.procs,0);assert.equal(delayedLamp.characterState.charge,6);
  const beforeRelease=waitingEnemy.hp;delayedLamp.time=5;updateCharacterTalents(delayedLamp,.01,0);assert.equal(delayedLamp.characterState.procs,1);assert.equal(delayedLamp.characterState.charge,0);assert.equal(delayedLamp.player.hp,13);assert.equal(delayedLamp.player.shield,16);assert(waitingEnemy.hp<beforeRelease);
  delayedLamp.time=10;updateCharacterTalents(delayedLamp,5,0);assert.equal(delayedLamp.characterState.procs,1,'empty lamp does not repeat on cooldown');
  delayedLamp.characterState.charge=6;delayedLamp.player.hp=0;updateCharacterTalents(delayedLamp,.05,0);assert.equal(delayedLamp.player.hp,0);assert.equal(delayedLamp.characterState.procs,1,'dead players cannot auto-release a healing lamp');
  const cadence=[];
  for(const light of [false,true]){
    const runner=start(CHARACTERS[2]);runner.enemies=[];runner.level=4;target(runner);if(light)assert(runner.learnTalent('r_roam1'));
    for(let i=0;i<7;i++){runner.time=i*1.05;updateCharacterTalents(runner,1.05,runner.moveSpeed*1.05);onCharacterCast(runner)}
    cadence.push(runner.characterState.procs);
  }
  assert(cadence[1]>cadence[0],'light wind must improve sustained fire at the starting bow cadence');
  for(const character of CHARACTERS)for(const branch of CHARACTER_TALENTS[character.id].branches){
    const meter=start(character);meter.level=30;meter.characterState.charge=character.id==='warden'?6:80;meter.characterState.xp=60;
    for(const node of branch.nodes)assert(meter.learnTalent(node.id));
    for(const at of [0,100]){
      meter.time=at;const progress=characterTalentProgress(meter),summary=characterTalentSummary(meter);
      assert(Number.isFinite(progress.value)&&Number.isFinite(progress.max)&&progress.max>0&&progress.value>=0&&progress.value<=progress.max,'bounded progress after learning '+branch.name);
      assert(!/NaN|Infinity|undefined/.test(progress.label+' '+summary),'valid talent feedback for '+branch.name);
    }
  }
  // Optional shrine trials use the real run, kill and reward paths without replacing their effects.
  const trialGame=kind=>{const game=start();assert.equal(game.shrines.length,8);game.shrines=[game.shrines.find(s=>s.kind===kind)];Object.assign(game.player,{x:game.shrines[0].x,y:game.shrines[0].y,hp:40,shield:0});game.time=60;game.enemies=[];game.spawnClock=game.waveClock=1e9;game.xpNext=1e9;game.bossMilestones=new Set([180,360,600]);return game};
  for(const kind of Object.keys(EVENT_TYPES)){
    const game=trialGame(kind);game.update(.05);assert.equal(game.player.hp,40);assert.equal(game.gold,0);assert.equal(game.xp,0);assert.equal(game.eventsCompleted,0,'passing a shrine must not grant free healing or rewards');
    assert(worldEventStatus(game).detail.includes(EVENT_TYPES[kind].hint));assert(game.interact());assert(!startWorldEvent(game));const shrine=game.activeEvent;
    if(kind==='vigil'){game.player.x+=100;updateWorldEvents(game,2);assert.equal(shrine.progress,0);game.player.x-=100;for(let i=0;i<120;i++){game.time+=.1;updateWorldEvents(game,.1)}updateWorldEvents(game,.01)}
    if(kind==='hunt'){const guard=shrine.guardian;assert(guard.eventGuardian);game.hit(guard,1e9,0,0,0,false);assert(guard.dead);assert(!game.drops.some(d=>d.type==='chest'),'the guardian must not also drop a second reward chest');updateWorldEvents(game,.05);assert.equal(game.weapons.blade,2);assert.equal(game.gold,guard.score+25);assert.deepEqual(game.eventReward.rewards,[WEAPONS.blade.name+' · LV.1 → LV.2','余烬 +25'])}
    if(kind==='souls'){game.rerolls=5;for(const mote of shrine.motes){Object.assign(game.player,{x:mote.x,y:mote.y});updateWorldEvents(game,.05)}assert.equal(game.xp,30);assert.equal(game.rerolls,5,'event rerolls respect their cap');assert.deepEqual(game.eventReward.rewards,['经验 +30','重铸已满（5 / 5），未增加'])}
    assert.equal(shrine.state,'complete');assert(shrine.used);assert.equal(game.eventsCompleted,1);assert.equal(game.activeEvent,null);
    if(kind==='vigil'){assert.equal(game.player.shield,12);assert.equal(game.gold,20);assert.deepEqual(game.eventReward.rewards,['护盾 +12 · 已补至 12','余烬 +20'])}
    assert.equal(game.eventReward.name,EVENT_TYPES[kind].name);assert(!worldEventStatus(game).canStart);
    const receipt=game.eventReward,earned=[game.gold,game.xp,game.player.shield,game.rerolls,game.weapons.blade];
    game.toast('另一条战斗提示');game.time=receipt.expiresAt-.5;updateWorldEvents(game,.05);assert.equal(game.eventReward,receipt);
    game.pause();assert(!game.interact());updateWorldEvents(game,10);assert.equal(game.eventReward,receipt);game.resume();
    game.shrines.push({kind:'souls',x:game.player.x,y:game.player.y,state:'idle',used:false,progress:0,goal:6});
    assert(game.interact(),'reward notification must not block the next shrine');assert.equal(game.eventReward,receipt);
    game.time=receipt.expiresAt;updateWorldEvents(game,.05);assert.equal(game.eventReward,null,'reward notice expires after four seconds without confirmation');
    assert.deepEqual([game.gold,game.xp,game.player.shield,game.rerolls,game.weapons.blade],earned,'notification expiry must not pay twice');
  }
  const expiredTrial=trialGame('vigil');assert(expiredTrial.interact());expiredTrial.state='paused';updateWorldEvents(expiredTrial,12);assert.equal(expiredTrial.activeEvent.progress,0);expiredTrial.state='running';expiredTrial.player.hp=0;updateWorldEvents(expiredTrial,12);assert.equal(expiredTrial.eventsCompleted,0);expiredTrial.player.hp=40;expiredTrial.time=105;updateWorldEvents(expiredTrial,.05);assert.equal(expiredTrial.eventsFailed,1);assert.equal(expiredTrial.player.hp,40);assert.equal(expiredTrial.gold,0,'timeout does not award or take health');
  const bossTrial=trialGame('souls');assert(bossTrial.interact());bossTrial.spawnBoss(180);updateWorldEvents(bossTrial,.05);assert.equal(bossTrial.eventsFailed,1);assert.equal(bossTrial.activeEvent,null);assert.equal(bossTrial.xp,0);
  const fullTrial=trialGame('hunt');fullTrial.pressure.cap=0;assert(!fullTrial.interact(),'guardian start must obey the enemy cap');fullTrial.pressure.cap=2;assert(fullTrial.interact());fullTrial.time=65;updateWorldEvents(fullTrial,.05);assert.equal(fullTrial.enemies.length,2,'reinforcements must obey the enemy cap');
  const maxTrial=trialGame('hunt');equip(maxTrial,{blade:6});assert(maxTrial.interact());maxTrial.kill(maxTrial.activeEvent.guardian);updateWorldEvents(maxTrial,.05);assert.equal(maxTrial.weapons.blade,6);assert.equal(maxTrial.xp,24,'maxed equipment converts the hunt reward to the chest XP fallback');assert(EVENT_TYPES.hunt.reward.includes('经验 +24'));
  assert.deepEqual(maxTrial.eventReward.rewards,['经验 +24（无可强化装备）','余烬 +25']);maxTrial.start(maxTrial.character);assert.equal(maxTrial.eventReward,null,'restart clears the old reward receipt');
  const shieldTrial=trialGame('vigil');shieldTrial.player.shield=20;assert(shieldTrial.interact());updateWorldEvents(shieldTrial,12);assert.equal(shieldTrial.player.shield,20);assert.equal(shieldTrial.eventReward.rewards[0],'护盾保持 20（未增加）');
  const boostedTrial=trialGame('souls');equip(boostedTrial,{blade:1},{growth:5});boostedTrial.xpNext=xpForLevel(1);assert(boostedTrial.interact());for(const mote of boostedTrial.activeEvent.motes){Object.assign(boostedTrial.player,{x:mote.x,y:mote.y});updateWorldEvents(boostedTrial,.05)}
  assert.equal(boostedTrial.level,3);assert.equal(boostedTrial.pendingLevels,2);assert.equal(boostedTrial.xp,3);assert.deepEqual(boostedTrial.eventReward.rewards,['经验 +45','重铸 +1 · 3 → 4'],'XP receipts include bonuses even when the reward crosses levels');
  const pendingReward=boostedTrial.eventReward;boostedTrial.update(.01);assert.equal(boostedTrial.state,'level');assert.equal(boostedTrial.eventReward,pendingReward);assert(!boostedTrial.interact());boostedTrial.chooseUpgrade(0);assert.equal(boostedTrial.eventReward,pendingReward,'choosing an upgrade preserves the receipt');
  const chestTrial=start();equip(chestTrial,{blade:6},{growth:5});chestTrial.player.hp=chestTrial.player.maxHp-5;const chestRewards=chestTrial.openChest(60);
  assert.deepEqual(chestRewards,['经验 +36（无可强化装备）','经验 +36（无可强化装备）','生命 +5','余烬 +60'],'all chest callers share actual XP and capped healing receipts');
  const pausedTrial=trialGame('vigil');pausedTrial.pause();assert(!worldEventStatus(pausedTrial).canStart,'paused runs cannot accept a task');assert(!pausedTrial.interact(),'paused interaction cannot start a task');pausedTrial.pauseReturn='level';assert(!worldEventStatus(pausedTrial).canStart,'pending upgrades cannot start an event');
  console.log('PASS: 36 weapons / 72 live attacks, 20 fusions, 27 innate-driven talent nodes, three optional shrine events, lamp/wick gates, star XP collection, wind pursuit, tag weights and growth parity.');

  if(process.argv.includes('--pressure')){
    // Fixed upgrade budgets, no bosses or new levels: isolate horde pressure from RNG offers.
    const builds=[
      {name:'opening',at:60,level:6,weapons:{blade:3,bolt:2},passives:{power:1}},
      {name:'early',at:150,level:11,weapons:{blade:5,bolt:3,storm:1},passives:{power:2}},
      {name:'mid',at:270,level:20,weapons:{blade:6,bolt:5,storm:3,flame:2},passives:{power:2,haste:2}},
      {name:'raw-late',at:450,level:30,weapons:{blade:6,bolt:6,orbit:6,meteor:4,prism:4},passives:{power:3,haste:3,area:3,amount:2}},
      {name:'ice-lightning',at:450,level:30,weapons:{blade:1,glacier:3,tempest:3,storm:5},passives:{frostbrand:3,stormseal:3,rime:3,haste:1}},
      {name:'blood-fire',at:450,level:30,weapons:{bloodmoon:3,solar:3,bell:6},passives:{armor:4,power:3,haste:3}},
      {name:'chain-lightning',at:450,level:30,weapons:{blade:1,thunderbolt:3,soulchain:3,lance:5},passives:{conductor:3,power:3,haste:3}},
    ],reports=[];
    builds.push({...builds[0],name:'opening-max-meta',meta:{vitality:5,power:5,magnet:5,regen:5}}, {...builds[1],name:'early-max-meta',meta:{vitality:5,power:5,magnet:5,regen:5}});
    const budget=build=>Object.entries(build.weapons).reduce((sum,[key,level])=>sum+level+(FUSIONS[key]?.ingredients.reduce((cost,i)=>cost+i.required,0)||0),0)+Object.values(build.passives).reduce((a,b)=>a+b,0);
    assert(builds.filter(b=>b.at===450).every(b=>budget(b)===37),'late builds spend the same upgrade budget, including consumed fusion materials');
    for(const build of builds){
      const consumed=Object.keys(build.weapons).flatMap(key=>FUSIONS[key]?.ingredients.map(i=>i.id)||[]);
      assert(build.weapons.blade||consumed.includes('blade'),'the starting weapon must remain equipped or be consumed by a fusion');
      assert.equal(new Set(consumed).size,consumed.length,'fusion routes cannot share consumed ingredients');
      assert(!consumed.some(key=>build.weapons[key]||build.passives[key]),'consumed ingredients cannot also be equipped');
    }
    for(const build of builds)for(const moving of [false,true])for(const trial of [311,733,1193,1733,2237]){
      seed=trial;const game=start();game.time=build.at;game.level=build.level;game.enemies=[];game.shrines=[];game.bossMilestones=new Set([180,360,600]);game.xpNext=1e9;game.waveClock=15;
      game.meta=build.meta||{};
      equip(game,build.weapons,build.passives);
      for(const node of CHARACTER_TALENTS.warden.branches[0].nodes)game.learnTalent(node.id);
      const initialKills=game.kills;let frames=0;
      for(;frames<1200&&!game.ended;frames++){
        const p=game.player;
        if(moving){
          let dx=Math.cos(game.time*.18),dy=Math.sin(game.time*.18),nearest=Infinity;
          for(const e of game.enemies){if(e.dead)continue;const x=p.x-e.x,y=p.y-e.y,d=Math.hypot(x,y)||1;nearest=Math.min(nearest,d-e.r);if(d<65){const strength=(65-d)/65*3;dx+=x/d*strength;dy+=y/d*strength}}
          for(const b of game.projectiles)if(b.enemy){const x=p.x-b.x,y=p.y-9-b.y,d=Math.hypot(x,y)||1;if(d<45&&x*b.vx+y*b.vy>0){dx+=x/d*2;dy+=y/d*2}}
          const length=Math.hypot(dx,dy)||1;game.stick={x:dx/length,y:dy/length};if(nearest<24)game.dash();
        }
        game.update(.05);
      }
      reports.push({name:build.name,at:build.at,budget:budget(build),moving,seed:trial,seconds:Number((frames*.05).toFixed(1)),hp:Math.max(0,Math.round(game.player.hp)),damageTaken:game.damageTaken,kills:game.kills-initialKills,remaining:game.enemies.length});
    }
    mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/pressure-report.json',JSON.stringify(reports,null,2));
    for(const build of builds)for(const moving of [false,true]){
      const group=reports.filter(r=>r.name===build.name&&r.moving===moving),mean=key=>Math.round(group.reduce((sum,r)=>sum+r[key],0)/group.length);
      console.log(JSON.stringify({name:build.name,at:build.at,moving,survived:group.filter(r=>r.seconds===60).length,seconds:mean('seconds'),damageTaken:mean('damageTaken'),kills:mean('kills'),remaining:mean('remaining')}));
      if(build.at<450)assert(moving?group.every(r=>r.seconds===60):group.every(r=>r.seconds<60),'early survival should require movement: '+build.name);
    }
    const total=(name,key)=>reports.filter(r=>r.name===name&&r.moving).reduce((sum,r)=>sum+r[key],0);
    // More kills and at least 25% fewer remaining threats measure room to move under the same spawn budget.
    assert(total('chain-lightning','kills')>total('raw-late','kills')&&total('chain-lightning','remaining')<total('raw-late','remaining')*.75,'finishing a linked build must open a late clear-speed advantage');
    console.log('PASS: 90 pressure scenarios, movement advantage with and without full permanent upgrades, and equal-budget late build payoff.');
  }

  if(process.argv.includes('--talents')){
    // Same gear, level, movement policy and seeds within each character; healing starts with room to work.
    const loadouts=[{blade:6,orbit:4,flame:3},{orbit:6,bolt:4,frost:3},{bolt:6,blade:4,storm:3}],reports=[];
    for(const [index,character] of CHARACTERS.entries())for(const branch of CHARACTER_TALENTS[character.id].branches)for(const trial of [311,733,1193]){
      seed=trial;const game=start(character);game.time=300;game.level=24;game.enemies=[];game.shrines=[];game.bossMilestones=new Set([180,360,600]);game.xpNext=1e9;game.waveClock=1e9;
      equip(game,loadouts[index],{power:2,haste:2});const initialHp=game.player.hp=game.player.maxHp*.65;
      for(const node of branch.nodes)assert(game.learnTalent(node.id));
      let frames=0;
      for(;frames<1200&&!game.ended;frames++){
        const p=game.player;let goal=null,best=Infinity;
        for(const drop of game.drops){if(drop.dead||drop.type==='chest'||drop.type==='heal'&&p.hp>=p.maxHp)continue;const distance=Math.hypot(drop.x-p.x,drop.y-p.y);if(distance<best){best=distance;goal=drop}}
        goal||=game.closest(p.x,p.y,800);
        let dx=goal?goal.x-p.x:Math.cos(game.time*.18),dy=goal?goal.y-p.y:Math.sin(game.time*.18),length=Math.hypot(dx,dy)||1;dx/=length;dy/=length;
        for(const e of game.enemies){if(e.dead)continue;const x=p.x-e.x,y=p.y-e.y,d=Math.hypot(x,y)||1;if(d<65){const weight=(65-d)/65*2.8;dx+=x/d*weight;dy+=y/d*weight}}
        for(const b of game.projectiles)if(b.enemy){const x=p.x-b.x,y=p.y-9-b.y,d=Math.hypot(x,y)||1;if(d<45&&x*b.vx+y*b.vy>0){dx+=x/d*2;dy+=y/d*2}}
        length=Math.hypot(dx,dy)||1;game.stick={x:dx/length,y:dy/length};game.dash();game.update(.05);
      }
      const s=game.characterState,report={character:character.id,branch:branch.name,seed:trial,level:game.level,startTime:300,seconds:frames*.05,survived:!game.ended,initialHp,hp:Math.max(0,game.player.hp),shield:game.player.shield,damageTaken:game.damageTaken,kills:game.kills,talentDamage:game.damageByWeapon.talent||0,procs:s.procs,wells:s.wells||0,hunts:s.hunts||0,coldBursts:s.coldBursts||0,starXp:s.starXp||0,reviveReady:s.reviveReady,revived:s.revived,xp:game.xp,armor:game.stats.armor,regeneration:game.stats.regeneration,weapons:game.weapons,passives:game.passives};
      assert(Object.values(report).filter(v=>typeof v==='number').every(Number.isFinite),'finite talent results: '+branch.name);
      assert(report.procs>0&&report.talentDamage>0,'innate must trigger in the live loop: '+branch.name);assert.equal(game.level,24);assert.equal(Object.keys(game.talents).length,3);assert.deepEqual(game.weapons,loadouts[index]);
      reports.push(report);
    }
    mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/talent-report.json',JSON.stringify(reports,null,2));
    for(const character of CHARACTERS)for(const branch of CHARACTER_TALENTS[character.id].branches){
      const group=reports.filter(r=>r.character===character.id&&r.branch===branch.name),mean=key=>Math.round(group.reduce((sum,r)=>sum+r[key],0)/group.length);
      console.log(JSON.stringify({character:character.id,branch:branch.name,survived:group.filter(r=>r.survived).length,kills:mean('kills'),talentDamage:mean('talentDamage'),procs:mean('procs'),hp:mean('hp'),shield:mean('shield'),wells:mean('wells'),hunts:mean('hunts'),coldBursts:mean('coldBursts'),starXp:mean('starXp')}));
    }
    console.log('PASS: 27 live talent-branch trials with fixed gear and three seeds per specialization.');
  }

  if(process.argv.includes('--weights')){
    const reports=[];
    for(const [name,history] of [['neutral',[]],['fire',Array.from({length:12},(_,i)=>['flame','cinder'][i%2])],['pivot to cold',Array.from({length:12},(_,i)=>['frost','rime','hoarfrost'][i%3])]]){
      const game=start();game.time=150;game.level=11;equip(game,{blade:2,bolt:2},{embercore:1});game.choiceHistory=history;seed=551;
      const counts=Object.fromEntries(Object.keys(BUILD_TAGS).map(tag=>[tag,0]));let pivots=0;
      for(let i=0;i<600;i++)for(const item of rollUpgradeChoices(game)){for(const tag of itemTags(item.key))counts[tag]++;if(item.exploration)pivots++}
      reports.push({name,upgrades:600,totalOffers:1800,fireOffers:counts.fire,coldOffers:counts.cold,pivotOffers:pivots,tags:counts});
    }
    assert(reports[1].fireOffers>reports[0].fireOffers);assert(reports[2].coldOffers>reports[1].coldOffers);assert(reports[2].fireOffers<reports[1].fireOffers);
    mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/weight-report.json',JSON.stringify(reports,null,2));
    for(const report of reports)console.log(JSON.stringify(report));
  }

  if(process.argv.includes('--simulate')){
    const reports=[];
    for(const invulnerable of [false,true])for(let index=0;index<CHARACTERS.length;index++){
      seed=137+index;const game=start(CHARACTERS[index]),checkpoints=[];
      const preferred=[['blade','flame','lance','meteor','power','haste','embercore','cinder','armor','aegis'],['orbit','frost','tether','bell','rime','power','area','haste','aegis','regen'],['bolt','storm','shard','sentinel','conductor','lens','power','haste','luck','focus']][index];
      let nextCheckpoint=60;
      for(let frame=0;frame<14400&&!game.ended;frame++){
        for(const branch of CHARACTER_TALENTS[game.character.id].branches)for(const node of branch.nodes)if(talentNodeState(game,node.id).available)game.learnTalent(node.id);
        if(game.state==='level'){
          const injured=game.player.hp/game.player.maxHp<.5;
          const scored=game.choices.map((item,i)=>({i,score:item.fusion?500:(item.weapon&&item.current?60+item.current*3:0)+(preferred.includes(item.key)?70-preferred.indexOf(item.key):0)+(item.weapon?10:0)+(injured&&['vitality','aegis','armor','regen'].includes(item.key)?145:0)}));
          scored.sort((a,b)=>b.score-a.score);game.chooseUpgrade(scored[0].i);continue;
        }
        const p=game.player;if(invulnerable)p.invincible=2;
        let goal=null,best=Infinity;
        for(const d of game.drops){if(d.dead||d.type==='heal'&&p.hp>=p.maxHp)continue;const distance=Math.hypot(d.x-p.x,d.y-p.y)*(d.type==='chest'?.25:d.type==='heal'&&p.hp<p.maxHp*.5?.2:1);if(distance<best){best=distance;goal=d}}
        goal||=game.closest(p.x,p.y,800);
        let dx=goal?goal.x-p.x:Math.cos(game.time*.06),dy=goal?goal.y-p.y:Math.sin(game.time*.06),length=Math.hypot(dx,dy)||1;dx/=length;dy/=length;
        let nearest=Infinity;const avoid=game.time<100&&index===1?75:65;
        for(const e of game.enemies){if(e.dead)continue;const x=p.x-e.x,y=p.y-e.y,d=Math.hypot(x,y)||1;nearest=Math.min(nearest,d-e.r);if(d<avoid){const weight=(avoid-d)/avoid*2.8;dx+=x/d*weight;dy+=y/d*weight}}
        for(const b of game.projectiles)if(b.enemy){const x=p.x-b.x,y=p.y-9-b.y,d=Math.hypot(x,y)||1;if(d<45&&x*b.vx+y*b.vy>0){dx+=x/d*2;dy+=y/d*2}}
        for(const h of game.hazards){if(h.type!=='blast')continue;const x=p.x-h.x,y=p.y-h.y,d=Math.hypot(x,y)||1;if(d<h.r+30){dx+=x/d*3;dy+=y/d*3}}
        length=Math.hypot(dx,dy)||1;game.stick={x:dx/length,y:dy/length};if(nearest<24)game.dash();game.update(.05);
        if(game.time>=nextCheckpoint){checkpoints.push({time:nextCheckpoint,level:game.level,kills:game.kills,hp:Math.round(p.hp)});nextCheckpoint+=60}
      }
      reports.push({character:game.character.id,mode:invulnerable?'collector (damage disabled)':'survival bot',time:Math.round(game.time),won:!!game.finalDefeated,level:game.level,kills:game.kills,damageTaken:game.damageTaken,weapons:game.weapons,passives:game.passives,talents:Object.keys(game.talents),checkpoints});
      console.log(JSON.stringify(reports.at(-1)));
    }
    mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/balance-report.json',JSON.stringify(reports,null,2));
  }
  if(process.argv.includes('--opening')){
    const reports=[],times=[30,60,120,180],trials=[311,733,1193];
    for(const [index,character] of CHARACTERS.entries())for(const fullMeta of [false,true])for(const trial of trials){
      seed=trial;const game=start(character),meta=fullMeta?{vitality:5,power:5,magnet:5,regen:5}:{};game.start(character,meta);
      const levelTimes={2:null,3:null,4:null},checkpoints=[],hits=[0,60,120].map(from=>({from,to:from+60,skeleton:{oneShot:0,total:0},bat:{oneShot:0,total:0}}));
      let pickup=false,collectedXp=0,rawCollectedXp=0,frames=0;
      game.on=(event,type)=>{if(event==='pickup'&&type==='xp')pickup=true};
      const gainXp=game.gainXp;game.gainXp=function(amount){
        if(pickup){rawCollectedXp+=amount;collectedXp+=amount*this.xpMultiplier;pickup=false}
        const gained=gainXp.call(this,amount);
        for(const level of [2,3,4])if(this.level>=level&&levelTimes[level]===null)levelTimes[level]=Number(this.time.toFixed(2));
        return gained;
      };
      const hit=game.hit;game.hit=function(e,damage,x,y,knock,feedback,source,periodic){
        if(!e.dead&&!e.elite&&!e.boss&&e.hp===e.maxHp&&source===character.weapon&&!periodic&&['skeleton','bat'].includes(e.kind)){
          assert.equal(this.stats.criticalChance,0,'opening samples must exclude critical hits');
          // Measure this direct hit before nested talent/relic callbacks can damage the target.
          const marked=e.markUntil>this.time?Object.values(e.marks).reduce((best,mark)=>mark.until>this.time?Math.max(best,mark.multiplier):best,1):1;
          const direct=Math.max(1,Math.round(damage*marked*characterHitMultiplier(this,e,source,periodic))),sample=hits[Math.min(2,Math.floor(this.time/60))][e.kind];
          assert(Number.isFinite(direct)&&Number.isFinite(e.maxHp)&&e.maxHp>0);sample.total++;if(direct>=e.maxHp)sample.oneShot++;
        }
        return hit.call(this,e,damage,x,y,knock,feedback,source,periodic);
      };
      while(game.time<180&&!game.ended&&frames++<5000){
        for(const branch of CHARACTER_TALENTS[character.id].branches)for(const node of branch.nodes)if(talentNodeState(game,node.id).available)game.learnTalent(node.id);
        if(game.state==='level'){
          const scored=game.choices.map((item,i)=>({i,score:item.key===character.weapon?1000:item.key==='power'?900:item.weapon?600+(item.current||0)*10:['haste','area','amount'].includes(item.key)?400:0}));
          scored.sort((a,b)=>b.score-a.score);game.chooseUpgrade(scored[0].i);game.stats.criticalChance=0;continue;
        }
        const p=game.player;p.invincible=2;game.stats.criticalChance=0;
        let goal=null,best=Infinity;
        for(const d of game.drops){if(d.dead||d.type==='heal'&&p.hp>=p.maxHp)continue;const distance=Math.hypot(d.x-p.x,d.y-p.y)*(d.type==='chest'?.25:d.type==='heal'&&p.hp<p.maxHp*.5?.2:1);if(distance<best){best=distance;goal=d}}
        goal||=game.closest(p.x,p.y,800);
        let dx=goal?goal.x-p.x:Math.cos(game.time*.06),dy=goal?goal.y-p.y:Math.sin(game.time*.06),length=Math.hypot(dx,dy)||1;dx/=length;dy/=length;
        let nearest=Infinity;const avoid=game.time<100&&index===1?75:65;
        for(const e of game.enemies){if(e.dead)continue;const x=p.x-e.x,y=p.y-e.y,d=Math.hypot(x,y)||1;nearest=Math.min(nearest,d-e.r);if(d<avoid){const weight=(avoid-d)/avoid*2.8;dx+=x/d*weight;dy+=y/d*weight}}
        for(const b of game.projectiles)if(b.enemy){const x=p.x-b.x,y=p.y-9-b.y,d=Math.hypot(x,y)||1;if(d<45&&x*b.vx+y*b.vy>0){dx+=x/d*2;dy+=y/d*2}}
        for(const h of game.hazards){if(h.type!=='blast')continue;const x=p.x-h.x,y=p.y-h.y,d=Math.hypot(x,y)||1;if(d<h.r+30){dx+=x/d*3;dy+=y/d*3}}
        length=Math.hypot(dx,dy)||1;game.stick={x:dx/length,y:dy/length};if(nearest<24)game.dash();game.update(.05);
        if(game.time+1e-8>=times[checkpoints.length]){
          const groundXp=game.drops.filter(d=>!d.dead&&d.type==='xp').reduce((sum,d)=>sum+d.value,0);
          checkpoints.push({time:times[checkpoints.length],level:game.level,weaponLevels:{...game.weapons},kills:game.kills,collectedXp:Number(collectedXp.toFixed(2)),rawCollectedXp,groundXp});
        }
      }
      assert.equal(checkpoints.length,4,'opening collector must reach every checkpoint');assert.equal(game.damageTaken,0);
      assert(Object.values(levelTimes).every(t=>t===null||Number.isFinite(t))&&checkpoints.every(p=>[p.level,p.kills,p.collectedXp,p.rawCollectedXp,p.groundXp,...Object.values(p.weaponLevels)].every(Number.isFinite)));
      assert(hits.reduce((sum,b)=>sum+b.skeleton.total+b.bat.total,0)>0,'opening report needs real primary-weapon contacts');
      reports.push({character:character.id,mode:'collector (damage disabled, critical hits disabled)',meta:fullMeta?'max':'fresh',seed:trial,levelTimes,checkpoints,hits,talents:Object.keys(game.talents)});
    }
    mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/opening-report.json',JSON.stringify(reports,null,2));
    for(const character of CHARACTERS)for(const meta of ['fresh','max']){
      const group=reports.filter(r=>r.character===character.id&&r.meta===meta),median=values=>{const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);return sorted.length?sorted[Math.floor(sorted.length/2)]:null};
      const hits=[0,1,2].map(i=>({from:i*60,to:(i+1)*60,...Object.fromEntries(['skeleton','bat'].map(kind=>{const total=group.reduce((sum,r)=>sum+r.hits[i][kind].total,0),oneShot=group.reduce((sum,r)=>sum+r.hits[i][kind].oneShot,0);return [kind,{oneShot,total,percent:total?Number((oneShot/total*100).toFixed(1)):null}]}))}));
      for(const [level,earliest,latest] of [[2,10,25],[3,23,45],[4,35,65]]){const at=median(group.map(r=>r.levelTimes[level]));assert(at!==null&&at>=earliest&&at<=latest,character.id+' '+meta+' upgrade pacing LV'+level)}
      for(const level of [3,4])assert(median(group.map(r=>r.levelTimes[level]-r.levelTimes[level-1]))>=10,character.id+' '+meta+' consecutive upgrades need time to play');
      for(const [index,range] of [[1,[3,5]],[2,[6,10]],[3,[9,14]]]){const level=median(group.map(r=>r.checkpoints[index].level));assert(level>=range[0]&&level<=range[1],character.id+' '+meta+' growth at '+times[index])}
      for(const band of hits){assert(band.skeleton.total>=20&&band.bat.total>=20,'one-shot limits need sufficient actual contacts');assert(band.skeleton.percent<=20&&band.bat.percent<=35,character.id+' '+meta+' primary attacks must not routinely erase healthy early enemies')}
      console.log(JSON.stringify({character:character.id,meta,mode:'collector',medianLevelTimes:Object.fromEntries([2,3,4].map(level=>[level,median(group.map(r=>r.levelTimes[level]))])),medianCheckpointLevels:times.map((time,i)=>({time,level:median(group.map(r=>r.checkpoints[i].level))})),hits}));
    }
    console.log('PASS: 18 opening collectors meet upgrade pacing, three-minute growth and noncritical primary-hit limits; fresh and fully upgraded saves.');
  }
  if(process.argv.includes('--browser')){
    const {spawn}=await import('node:child_process');
    const {mkdtempSync,existsSync,readFileSync}=await import('node:fs');
    const {resolve,join}=await import('node:path');
    const {setTimeout:delay}=await import('node:timers/promises');
    mkdirSync('artifacts',{recursive:true});
    const profile=mkdtempSync(resolve('artifacts/.browser-'));
    const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
    let socket;
    try{
      const portFile=join(profile,'DevToolsActivePort');
      for(let i=0;i<60&&!existsSync(portFile);i++)await delay(200);
      assert(existsSync(portFile),'Chrome did not expose its local debugging port');
      const port=readFileSync(portFile,'utf8').split('\n')[0];
      const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
      socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
      await new Promise((done,fail)=>{socket.addEventListener('open',done,{once:true});socket.addEventListener('error',fail,{once:true})});
      let id=0;const pending=new Map(),errors=[];
      socket.addEventListener('message',event=>{const packet=JSON.parse(event.data);if(packet.method==='Runtime.exceptionThrown')errors.push(packet.params.exceptionDetails);if(packet.id){const item=pending.get(packet.id);pending.delete(packet.id);if(packet.error)item.reject(new Error(JSON.stringify(packet.error)));else item.resolve(packet.result)}});
      const call=async(method,params={})=>{
        const result=await new Promise((resolve,reject)=>{const next=++id;pending.set(next,{resolve,reject});socket.send(JSON.stringify({id:next,method,params}))});
        // Give taps a real press duration; same-frame start/end can suppress Chrome's click event.
        if(method==='Input.dispatchTouchEvent'&&params.type==='touchStart')await delay(60);
        return result;
      };
      const evaluate=async code=>{const r=await call('Runtime.evaluate',{expression:'(async()=>{'+code+'})()',awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value};
      const shot=async name=>{await delay(350);const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync('artifacts/'+name+'.png',Buffer.from(r.data,'base64'))};
      await call('Page.enable');await call('Runtime.enable');
      await call('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
      await call('Page.navigate',{url:'http://127.0.0.1:4173/'});
      for(let i=0;i<50;i++){if(await evaluate('return document.readyState!=="loading"'))break;await delay(100)}
      assert.equal(await evaluate('const {game}=await import("/src/main.js");return game.state'),'menu');
      await delay(600);await shot('camp-desktop');
      for(const [width,height] of [[1920,1080],[1366,768],[1280,720],[1024,768],[1024,600],[900,700],[800,600],[390,844],[370,665],[320,568],[568,320],[667,375],[844,390]]){
        const mobile=width<701||height<500;
        await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});await call('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:1});
        await evaluate('const {game}=await import("/src/main.js");game.returnToMenu();');await delay(60);
        assert(await evaluate('const menu=document.getElementById("menu"),buttons=[...menu.querySelectorAll("button")].filter(b=>b.getClientRects().length),top=document.getElementById("masthead").getBoundingClientRect().bottom;return menu.scrollWidth<=menu.clientWidth&&menu.scrollHeight<=menu.clientHeight+1&&buttons.length===3&&!document.getElementById("characters").getClientRects().length&&buttons.every(b=>{const r=b.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.top>=top&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth})'),'three-entry home fits without scrolling at '+width+'x'+height);
        await shot('camp-'+width+'x'+height);
        const entry=await evaluate('const b=document.getElementById("meta-button"),r=b.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return {x,y,hit:document.elementFromPoint(x,y)?.closest("button")===b}');
        assert(entry.hit,'altar is not covered by another layer');
        if(mobile){await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:entry.x,y:entry.y}]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
        else for(const type of ['mousePressed','mouseReleased'])await call('Input.dispatchMouseEvent',{type,x:entry.x,y:entry.y,button:'left',clickCount:1});
        assert(await evaluate('return !document.getElementById("meta-screen").classList.contains("hidden")&&document.getElementById("meta-screen").getAttribute("role")==="dialog"'),'real pointer activation opens the altar');
        assert(await evaluate('return [...document.querySelectorAll(".meta-upgrade button")].every(b=>b.disabled)&&document.getElementById("meta-upgrades").textContent.includes("还差 50 余烬")'),'zero-balance upgrades explain their disabled state');
        assert(await evaluate(`
          const panel=document.querySelector('.meta-panel'),r=panel.getBoundingClientRect(),rows=[...panel.querySelectorAll('.meta-upgrade')];
          return rows.length===4&&panel.scrollHeight<=panel.clientHeight+1&&panel.scrollWidth<=panel.clientWidth+1&&r.top>=12&&r.bottom<=innerHeight-12&&r.left>=12&&r.right<=innerWidth-12&&[...panel.querySelectorAll('h2,p,.ember-balance,h3,small,.meta-upgrade-status,button,#meta-best')].filter(e=>e.getClientRects().length).every(e=>{const s=e.getBoundingClientRect();return s.top>=r.top&&s.bottom<=r.bottom&&s.left>=r.left&&s.right<=r.right&&e.scrollWidth<=e.clientWidth+1})&&[...panel.querySelectorAll('button')].every(b=>{const s=b.getBoundingClientRect();return s.width>=44&&s.height>=44&&document.elementFromPoint(s.x+s.width/2,s.y+s.height/2)?.closest('button')===b});
        `),'all four altar upgrades, full effects, balance and close button fit without scrolling at '+width+'x'+height);
        if([1366,390,370,320].includes(width)||height===320)await shot('camp-altar-'+width+'x'+height);
        await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
        assert(await evaluate('return document.getElementById("meta-screen").classList.contains("hidden")&&document.activeElement.id==="meta-button"'),'closing the altar restores its entry focus');
        for(const [entryId,page] of [['play-button','prepare'],['camp-library-button','library']]){
          const point=await evaluate('const r=document.getElementById('+JSON.stringify(entryId)+').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}');
          if(mobile){await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
          else for(const type of ['mousePressed','mouseReleased'])await call('Input.dispatchMouseEvent',{type,...point,button:'left',clickCount:1});
          assert(await evaluate('const {game}=await import("/src/main.js");return game.state==="menu"&&!document.getElementById('+JSON.stringify('camp-'+page)+').classList.contains("hidden")&&document.getElementById("camp-home").classList.contains("hidden")'),'opening '+page+' stays in camp');
          assert(await evaluate('const menu=document.getElementById("menu"),top=document.getElementById("masthead").getBoundingClientRect().bottom;return menu.scrollWidth<=menu.clientWidth&&menu.scrollHeight<=menu.clientHeight+1&&[...menu.querySelectorAll("button")].filter(b=>b.getClientRects().length).every(b=>{const r=b.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.top>=top&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth})'),page+' actions fit without scrolling at '+width+'x'+height);
          if(width===1280||width===390||width===320||height===320)await shot('camp-'+page+'-'+width+'x'+height);
          await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
          assert(await evaluate('return !document.getElementById("camp-home").classList.contains("hidden")&&document.activeElement.id==='+JSON.stringify(entryId)),'Escape returns one menu level and restores focus');
        }
      }
      await call('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});await call('Emulation.setTouchEmulationEnabled',{enabled:false});
      for(const [parent,entry,tab] of [['play-button','menu-status-button','attributes'],['play-button','menu-talents-button','talents'],['camp-library-button','menu-catalog-button','catalog'],['camp-library-button','menu-fusion-button','fusion']]){
        await evaluate('document.getElementById('+JSON.stringify(parent)+').click();document.getElementById('+JSON.stringify(entry)+').focus();');
        await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
        assert(await evaluate('const {game}=await import("/src/main.js");return game.state==="status"&&document.getElementById('+JSON.stringify('sheet-tab-'+tab)+').getAttribute("aria-selected")==="true"'),'camp keyboard entry opens '+tab);
        await evaluate('document.getElementById("sheet-close").click();');
        assert(await evaluate('return document.activeElement.id==='+JSON.stringify(entry)+'&&document.getElementById("camp-home").classList.contains("hidden")'),'sheet returns to its originating submenu');
        await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
      }
      assert(await evaluate('document.getElementById("camp-library-button").click();document.getElementById("archive-button").click();const visible=!document.getElementById("archive-screen").classList.contains("hidden");document.querySelector("#archive-screen [data-close]").click();return visible&&!document.getElementById("camp-library").classList.contains("hidden")'),'camp guide returns to the library');
      await evaluate('document.querySelector("#camp-library .camp-back").click();document.activeElement.blur();');
      await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
      assert(await evaluate('const {game}=await import("/src/main.js");return game.state==="menu"&&!document.getElementById("camp-prepare").classList.contains("hidden")'),'Enter opens character selection instead of skipping it');
      assert(await evaluate('document.querySelectorAll("#characters button")[2].click();const {game}=await import("/src/main.js");const selected=game.character.id==="ranger"&&document.activeElement.getAttribute("aria-pressed")==="true"&&document.getElementById("camp-start-context").textContent.includes("荒野客");document.querySelector("#characters button").click();return selected'),'selection keeps focus and updates the departure context');
      assert(await evaluate('const {game}=await import("/src/main.js");document.getElementById("start-button").click();game.gold=138;game.time=120;game.end(false,true,"camp");for(let i=0;i<50&&game.state!=="menu";i++)await new Promise(r=>setTimeout(r,10));return game.state==="menu"&&document.getElementById("meta-count").textContent==="150 ✦"&&!document.getElementById("camp-home").classList.contains("hidden")'),'settlement returns to the home menu with the updated balance');
      await evaluate('document.getElementById("meta-button").click();');await delay(300);
      const purchase=await evaluate('const b=document.querySelector("[data-meta=vitality]");b.scrollIntoView({block:"center"});const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}');
      for(const type of ['mousePressed','mouseReleased'])await call('Input.dispatchMouseEvent',{type,x:purchase.x,y:purchase.y,button:'left',clickCount:1});
      assert(await evaluate('const {readSave}=await import("/src/data.js");for(let i=0;i<50&&!document.getElementById("meta-feedback").textContent.includes("已强化");i++)await new Promise(r=>setTimeout(r,10));const save=readSave();return save.embers===100&&save.meta.vitality===1&&document.getElementById("ember-balance").textContent==="100"&&document.getElementById("meta-count").textContent==="100 ✦"&&document.getElementById("meta-feedback").textContent.includes("下次出征生效")&&document.activeElement.dataset.meta==="vitality"'),'real purchase persists, updates both balances and preserves keyboard focus');
      await shot('camp-altar-purchased');
      for(const [width,height] of [[370,665],[320,568],[568,320]]){
        await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
        assert(await evaluate('const panel=document.querySelector(".meta-panel"),r=panel.getBoundingClientRect(),feedback=document.getElementById("meta-feedback").getBoundingClientRect();return panel.scrollHeight<=panel.clientHeight+1&&panel.scrollWidth<=panel.clientWidth+1&&r.top>=12&&r.bottom<=innerHeight-12&&feedback.height>0&&feedback.top>=r.top&&feedback.bottom<=r.bottom&&[...panel.querySelectorAll("button")].every(b=>{const s=b.getBoundingClientRect();return s.top>=r.top&&s.bottom<=r.bottom})'),'purchase feedback and every altar action remain visible at '+width+'x'+height);
        await shot('camp-altar-purchased-'+width+'x'+height);
      }
      await call('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
      await evaluate('document.querySelector("#meta-screen [data-close]").click();document.getElementById("menu").scrollTop=0;');await shot('camp-upgraded');
      assert(await evaluate('document.getElementById("play-button").click();document.getElementById("start-button").click();const {game}=await import("/src/main.js");return game.state==="running"'));
      await evaluate('const {game}=await import("/src/main.js");const {characterStats}=await import("/src/stats.js");game.time=185;game.level=17;game.weapons={blade:4,flame:4,shard:3};game.passives={power:2,frostbrand:2,rime:2};game.choiceHistory=["flame","cinder","flame","cinder"];game.stats=characterStats(game.character,game.passives,game.meta);game.player.maxHp=game.stats.maxHp;game.state="level";game.choices=game.rollUpgrades();game.on("weapons");game.on("hud");game.on("level");');
      await delay(100);await shot('upgrade-desktop');
      assert(await evaluate('return document.getElementById("upgrade-affinity").textContent.includes("火焰")&&document.querySelectorAll(".upgrade-card:not(.fusion-card) .item-tags").length===2'));
      assert(await evaluate('const {game}=await import("/src/main.js");const before=JSON.stringify(game.choices);document.getElementById("level-menu-button").click();if(game.state!=="paused")return false;document.getElementById("resume-button").click();return game.state==="level"&&before===JSON.stringify(game.choices)'));
      assert(await evaluate('document.querySelector(".banish-button").click();const {game}=await import("/src/main.js");return game.banishes===2&&game.banished.size===1'));
      assert(await evaluate('const {game}=await import("/src/main.js");const index=game.choices.findIndex(i=>i.key==="solar"&&i.fusion);document.querySelectorAll(".upgrade-card")[index].click();return game.weapons.solar===1&&!game.weapons.blade&&!game.weapons.flame&&game.discoveredFusions.has("solar")'));
      await evaluate('document.getElementById("status-button").click();document.getElementById("sheet-tab-items").click();');
      await shot('build-desktop');
      assert(await evaluate('return document.getElementById("sheet-build-summary").textContent.includes("3 / 6")'));
      await evaluate('document.getElementById("sheet-close").click();const {game}=await import("/src/main.js");const {characterStats}=await import("/src/stats.js");game.time=602;game.level=40;game.weapons={starfall:2,ricochet:2,soulchain:2,lance:4,sentinel:4,frost:4};game.passives={aegis:2,venomfang:2,rime:2,area:1,armor:2,thorns:2};game.stats=characterStats(game.character,game.passives,game.meta);game.player.hp=game.player.maxHp=game.stats.maxHp;game.player.invincible=50;game.enemies=[];game.drops=[];game.zones=[];game.projectiles=[];game.bossMilestones=new Set([180,360,600]);game.spawnClock=10;game.waveClock=10;game.pendingLevels=0;game.xpNext=10000;for(let i=0;i<100;i++){const e=game.spawnEnemy(i%4===0?"knight":i%3===0?"ghost":"reaper");const a=i*2.4,r=85+(i%10)*12;e.x=game.player.x+Math.cos(a)*r;e.y=game.player.y+Math.sin(a)*r;}game.spawnBoss(600);game.on("weapons");for(let i=0;i<96;i++)game.update(.025);game.state="over";game.on("hud");game.render();');
      await delay(100);await shot('combat-desktop');
      await evaluate('const {game}=await import("/src/main.js");game.state="running";game.end(false);');
      assert(await evaluate('return document.getElementById("end-damage").textContent.includes("累计输出")'));
      await shot('result-desktop');
      await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
      await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
      await evaluate('const {game}=await import("/src/main.js");game.returnToMenu();');await delay(150);await shot('camp-mobile');
      assert(await evaluate('return document.documentElement.scrollWidth<=innerWidth'));
      await evaluate('document.getElementById("play-button").click();document.getElementById("start-button").click();const {game}=await import("/src/main.js");game.state="level";game.level=2;game.choices=game.rollUpgrades();game.on("level");');
      await delay(100);await shot('upgrade-mobile');
      assert(await evaluate('return [...document.querySelectorAll(".upgrade-card")].every(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth})'));
      for(const [width,height] of [[320,568],[378,668],[390,844],[568,320],[667,375],[844,390]]){
        await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
        const layouts=await evaluate(`
          const {game}=await import('/src/main.js'),{upgradePool}=await import('/src/balance.js'),{FUSIONS,fusionChoice}=await import('/src/fusions.js'),{WEAPONS,PASSIVES,META}=await import('/src/data.js'),{characterStats}=await import('/src/stats.js');
          const discovered=game.discoveredFusions;
          game.start(game.character,Object.fromEntries(Object.entries(META).map(([key,value])=>[key,value.max])));game.state='level';game.level=30;game.time=240;game.pendingLevels=2;game.weapons={blade:5,meteor:4,frost:4,bolt:5,storm:4};game.passives={};game.choiceHistory=['meteor','frost','bolt'];
          game.stats=characterStats(game.character,{area:5,amount:3,power:5,haste:5},game.meta);
          const choices=upgradePool(game).concat(Object.keys(FUSIONS).map(key=>fusionChoice(key,Object.fromEntries(Object.keys(WEAPONS).map(id=>[id,5])),Object.fromEntries(Object.keys(PASSIVES).map(id=>[id,2])))),{key:'heal',weapon:false,current:0,next:1,name:'余烬余韵',description:'恢复 12 点生命，获得 15 余烬。',color:'#c1d49c'}),failures=[];
          for(const known of [false,true]){
            game.discoveredFusions=new Set(known?Object.keys(FUSIONS):[]);
            for(let i=0;i<choices.length;i+=3){
              game.choices=choices.slice(i,i+3);game.on('level');
              const modal=document.querySelector('.level-modal'),footer=document.querySelector('.level-footer').getBoundingClientRect();
              const buttons=[...document.querySelectorAll('#level-screen button')].filter(e=>e.getClientRects().length),cards=[...document.querySelectorAll('.upgrade-card')];
              const fits=modal.scrollHeight<=modal.clientHeight+1&&modal.scrollWidth<=modal.clientWidth+1&&buttons.every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth})&&cards.every(e=>{
                const r=e.getBoundingClientRect();return r.bottom<=footer.top&&e.scrollHeight<=e.clientHeight+1&&e.scrollWidth<=e.clientWidth+1&&[...e.children].filter(c=>c.getClientRects().length).every(c=>{const s=c.getBoundingClientRect();return s.top>=r.top&&s.bottom<=r.bottom+1&&s.left>=r.left&&s.right<=r.right+1});
              });
              if(!fits)failures.push(game.choices.map(c=>c.key).join('/')+(known?' known':''));
            }
          }
          game.discoveredFusions=discovered;game.choices=[choices.find(c=>c.key==='forkseed'),choices.find(c=>c.key==='spore'),choices.find(c=>c.key==='stormcoil')];game.on('level');return failures;
        `);
        assert.deepEqual(layouts,[],'mobile upgrade choices, full effects and actions fit '+width+'x'+height);
        await shot('upgrade-'+width+'x'+height);
      }
      await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
      const pendingChoices=await evaluate('const {game}=await import("/src/main.js");return JSON.stringify([game.choices,game.pendingLevels,game.rerolls])');
      await evaluate('document.getElementById("level-tree-button").click();document.getElementById("sheet-close").click();document.getElementById("level-status-button").click();document.getElementById("sheet-tab-catalog").click();');await delay(100);await shot('catalog-mobile');
      assert(await evaluate('const tiles=[...document.querySelectorAll("#catalog-list .catalog-item")];return tiles.length>0&&tiles.length<=12&&Number(document.getElementById("catalog-count").textContent.split("/")[0])>=tiles.length&&document.getElementById("catalog-detail").classList.contains("hidden")&&tiles.every(tile=>tile.children.length===2&&tile.children[0].tagName==="CANVAS"&&tile.children[1].tagName==="STRONG")'),'catalog opens as icon/name tiles without automatic effect details');
      await evaluate('document.getElementById("sheet-close").click();');
      assert.equal(await evaluate('const {game}=await import("/src/main.js");return JSON.stringify([game.choices,game.pendingLevels,game.rerolls])'),pendingChoices,'mobile references preserve the upgrade choices');
      assert(await evaluate('document.getElementById("reroll-button").click();const {game}=await import("/src/main.js");return game.rerolls===2&&game.state==="level"'));
      await evaluate('const {game}=await import("/src/main.js");game.pendingLevels=0;');
      for(const selector of ['.banish-button','.upgrade-card']){
        const point=await evaluate('const r=document.querySelector('+JSON.stringify(selector)+').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}');
        await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        assert(await evaluate('const {game}=await import("/src/main.js");return '+JSON.stringify(selector)+'===".banish-button"?game.banishes===2&&game.state==="level":game.state==="running"'),'touch '+selector+' activates only its intended action');
      }
      const visuals=await evaluate('const {game}=await import("/src/main.js");const {WEAPONS}=await import("/src/data.js");const {characterStats}=await import("/src/stats.js");let frames=0;game.passives={area:3,amount:2};game.stats=characterStats(game.character,game.passives,{});game.player.invincible=1000;game.pendingLevels=0;game.xpNext=1e9;game.spawnClock=game.waveClock=1e9;game.bossMilestones=new Set([180,360,600]);for(const [key,data] of Object.entries(WEAPONS)){game.state="running";game.weapons={[key]:data.maxLevel||6};game.timers={};game.projectiles=[];game.zones=[];game.effects=[];game.enemies=[];for(let i=0;i<16;i++){const e=game.spawnEnemy("skeleton",false,30+i*8);e.hp=e.maxHp=1e8;}for(let i=0;i<100;i++){game.update(.05);game.render();frames++;}}game.state="over";return frames;');
      assert.equal(visuals,3600);
      await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
      await call('Emulation.setTouchEmulationEnabled',{enabled:false});
      for(const character of CHARACTERS){
        const before=await evaluate(`const {game}=await import('/src/main.js');const {CHARACTERS}=await import('/src/data.js');game.start(CHARACTERS.find(c=>c.id==='${character.id}'));game.level=30;game.time=240;game.pendingLevels=2;game.state='level';game.choices=game.rollUpgrades();game.on('level');return JSON.stringify([game.choices,game.rerolls,game.pendingLevels]);`);
        await call('Input.dispatchKeyEvent',{type:'keyDown',key:'t',code:'KeyT'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'t',code:'KeyT'});
        assert(await evaluate('const {game}=await import("/src/main.js");return game.state==="status"&&document.querySelectorAll(".talent-node").length===9&&document.querySelector(".talent-root-label").textContent.includes("初始被动")&&document.querySelector(".talent-flow").textContent.includes("→")'));
        for(const [tier,node] of CHARACTER_TALENTS[character.id].branches[0].nodes.entries()){
          assert(await evaluate(`const button=document.getElementById('talent-${node.id}');if(button.disabled)return false;button.click();const {game}=await import('/src/main.js');return !!game.talents['${node.id}'];`));
          if(tier<2)assert.equal(await evaluate('return document.activeElement.id'),'talent-'+CHARACTER_TALENTS[character.id].branches[0].nodes[tier+1].id,'keyboard focus follows the next available talent');
        }
        assert(await evaluate('const m=document.getElementById("hud-talent-meter");return m.value>=0&&m.value<=m.max&&!!m.getAttribute("aria-label")&&document.querySelector(".talent-current").textContent.includes("伤害")'),'live meter and current values');
        assert(await evaluate('return document.querySelectorAll(".talent-node.excluded").length===2'));
        await shot('talents-'+character.id+'-desktop');
        await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
        assert.equal(await evaluate('const {game}=await import("/src/main.js");if(game.state!=="level")return "wrong state";return JSON.stringify([game.choices,game.rerolls,game.pendingLevels]);'),before,'talent tree must preserve pending upgrades');
      }
      await evaluate('const {game}=await import("/src/main.js");const {CHARACTERS}=await import("/src/data.js");const {characterStats}=await import("/src/stats.js");game.start(CHARACTERS[1]);game.level=24;game.time=240;game.weapons={sentinel:5,meteor:4,frost:4};game.passives={soulpact:2,hoarfrost:2,rotclock:2,bulwark:2,forkseed:2,stormcoil:2};game.stats=characterStats(game.character,game.passives,game.meta,game.talents);game.on("weapons");game.state="level";');
      for(const key of ['soulforge','hailfire']){
        assert(await evaluate(`const {game}=await import('/src/main.js');const {fusionChoice}=await import('/src/fusions.js');game.state='level';game.choices=[fusionChoice('${key}',game.weapons,game.passives)];game.on('level');document.querySelector('.upgrade-card').click();return game.weapons['${key}']===1&&game.discoveredFusions.has('${key}');`));
      }
      await evaluate('document.getElementById("status-button").click();document.getElementById("sheet-tab-items").click();');
      assert(await evaluate(`const {game}=await import('/src/main.js');const {weaponStats}=await import('/src/stats.js');document.querySelector('#sheet-items [data-item-id="sheet-weapon-soulforge"]').click();return !document.getElementById('items-detail').classList.contains('hidden')&&document.querySelector('#sheet-weapon-soulforge .sheet-facts dd').textContent===String(Math.round(weaponStats('soulforge',game.weapons.soulforge,game.stats,game.character).damage))`));
      await shot('new-content-desktop');
      await evaluate('document.getElementById("sheet-tab-catalog").click();const input=document.getElementById("catalog-search");input.value="召唤";input.dispatchEvent(new Event("input",{bubbles:true}));');
      assert(await evaluate('return document.querySelectorAll("#catalog-list .catalog-item").length>=3&&document.getElementById("catalog-count").textContent.endsWith("/ 81")'));
      await shot('tag-catalog-desktop');await evaluate('document.getElementById("sheet-close").click();');
      await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
      await evaluate('const {game}=await import("/src/main.js");const {CHARACTERS}=await import("/src/data.js");game.start(CHARACTERS[1]);game.level=18;document.getElementById("hud-talents-button").click();const picker=document.querySelector("#sheet-talents>.mobile-picker");picker.value="branch-1";picker.dispatchEvent(new Event("change"));');
      const touch=await evaluate('const r=document.getElementById("talent-s_frost1").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};');
      await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(100);
      assert(await evaluate('const {game}=await import("/src/main.js");const root=document.getElementById("status-screen");return !!game.talents.s_frost1&&root.scrollWidth<=innerWidth&&[...document.querySelectorAll(".talent-branch.selected .talent-node")].every(e=>e.getBoundingClientRect().right<=innerWidth);'));
      await shot('talents-mobile');
      await evaluate('document.getElementById("sheet-close").click();const {game}=await import("/src/main.js");game.returnToMenu();document.getElementById("play-button").click();document.getElementById("menu-talents-button").click();');
      assert(await evaluate('return [...document.querySelectorAll(".talent-node")].every(e=>e.disabled)'),'camp is a read-only preview');
      assert(await evaluate('return !document.querySelector(".talent-current")'),'camp must not show the previous run stats');
      assert(await evaluate('const {game}=await import("/src/main.js");const cards=[...document.querySelector("#sheet-items .collection-cards").children];return document.getElementById("sheet-items-label").textContent==="装备预览"&&cards.length===1&&cards[0].id==="sheet-weapon-"+game.character.weapon'),'camp previews only the starting equipment');
      await evaluate('document.getElementById("sheet-close").click();const {game}=await import("/src/main.js");const {characterStats}=await import("/src/stats.js");game.start(game.character,{vitality:5,power:5,regen:5,magnet:5});game.passives={regen:2};game.stats=characterStats(game.character,game.passives,game.meta,game.talents);document.getElementById("status-button").click();');
      assert(await evaluate('const rows=[...document.querySelectorAll(".sheet-stat")];return rows.find(e=>e.textContent.includes("持续恢复")).textContent.includes("0.44")&&rows.find(e=>e.textContent.includes("避伤恢复")).textContent.includes("0.4")&&document.getElementById("sheet-stat-grid").textContent.includes("护盾受击也会打断")'));
      await evaluate('const picker=document.querySelector("#sheet-attributes>.mobile-picker");picker.value="stats-4";picker.dispatchEvent(new Event("change"));');
      await shot('recovery-mobile');
      await call('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});await call('Emulation.setTouchEmulationEnabled',{enabled:false});
      await evaluate('document.getElementById("sheet-tab-attributes").click();');await shot('recovery-desktop');
      await evaluate('document.getElementById("sheet-close").click();const {game}=await import("/src/main.js");game.start(game.character);game.time=60;game.player.x=game.shrines[0].x;game.player.y=game.shrines[0].y;game.player.invincible=999;game.enemies=[];game.spawnClock=game.waveClock=999;game.on("hud");');
      assert(await evaluate('const button=document.getElementById("world-event-start");return button.parentElement.classList.contains("world-event-heading")&&!button.disabled&&document.getElementById("world-event-detail").textContent.includes("12 秒")'));
      await shot('event-offer-desktop');
      await call('Input.dispatchKeyEvent',{type:'keyDown',key:'e',code:'KeyE'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'e',code:'KeyE'});
      assert(await evaluate('const {game}=await import("/src/main.js");return game.state==="running"&&game.activeEvent?.kind==="vigil"&&document.getElementById("pause-screen").classList.contains("hidden")'),'one key press accepts the nearby task without a details dialog');
      await evaluate('const {game}=await import("/src/main.js");game.pause();');
      const frozenEvent=await evaluate('const {game}=await import("/src/main.js");return [game.time,game.activeEvent.progress]');await delay(250);
      assert.deepEqual(await evaluate('const {game}=await import("/src/main.js");return [game.time,game.activeEvent.progress]'),frozenEvent,'paused event clocks must stop');
      await evaluate('const {game}=await import("/src/main.js");game.resume();game.activeEvent.progress=11.99;game.update(.05);');
      assert(await evaluate('const {game}=await import("/src/main.js");return game.eventsCompleted===1&&!game.activeEvent&&game.player.shield>=12'));
      assert(await evaluate('const {game}=await import("/src/main.js");return document.getElementById("world-event-card").classList.contains("hidden")&&!document.getElementById("event-reward-toast").classList.contains("hidden")&&game.eventReward.expiresAt>game.time'));
      await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
      await evaluate('const {game}=await import("/src/main.js");game.player.x=game.shrines[2].x;game.player.y=game.shrines[2].y;game.on("hud");');
      assert(await evaluate('const card=document.getElementById("world-event-card").getBoundingClientRect(),talent=document.getElementById("hud-talents-button").getBoundingClientRect();return card.right<=innerWidth&&card.left>=0&&card.top>=talent.bottom&&card.bottom<innerHeight*.4'));
      await shot('event-offer-mobile');
      const eventTouch=await evaluate('const r=document.getElementById("world-event-start").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}');
      await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[eventTouch]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(100);
      assert(await evaluate('const {game}=await import("/src/main.js");return game.state==="running"&&game.activeEvent?.kind==="souls"&&document.getElementById("world-event-start").disabled&&document.getElementById("pause-screen").classList.contains("hidden")'),'one tap accepts the task directly');
      assert(await evaluate('const card=document.getElementById("world-event-card").getBoundingClientRect(),toast=document.getElementById("toast").getBoundingClientRect();return card.bottom<=toast.top||toast.bottom<=card.top'),'acceptance feedback does not cover the task progress');
      await shot('event-active-mobile');
      assert(await evaluate('const {game}=await import("/src/main.js");game.player.dashCooldown=0;document.getElementById("touch-dash").click();return game.player.dashCooldown>0'),'dash supports standard button activation');
      await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
      for(const [width,height] of [[378,668],[320,568],[844,390]]){
        await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
        await evaluate('const {game}=await import("/src/main.js");const {CHARACTERS}=await import("/src/data.js");game.start(CHARACTERS[0]);game.time=8;game.player.invincible=999;game.bannerUntil=game.toastUntil=0;document.getElementById("event-banner").classList.remove("visible");document.getElementById("toast").classList.remove("visible");game.on("hud");');
        assert(await evaluate(`
          const ids=['status-button','pause-button','hud-talents-button','fusion-tracker','hud-catalog-button','hud-loadout-button','touch-dash'];
          const rects=ids.map(id=>document.getElementById(id).getBoundingClientRect());
          const center={left:innerWidth*.28,right:innerWidth*.72,top:innerHeight*.36,bottom:innerHeight*.7};
          return document.documentElement.scrollWidth<=innerWidth&&document.getElementById('world-event-card').classList.contains('hidden')&&rects.every(r=>r.width>=44&&r.height>=44&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&(r.right<=center.left||r.left>=center.right||r.bottom<=center.top||r.top>=center.bottom))&&rects.every((r,i)=>rects.slice(i+1).every(s=>r.right<=s.left||r.left>=s.right||r.bottom<=s.top||r.top>=s.bottom));
        `),'compact HUD keeps center clear with separate 44px controls at '+width+'x'+height);
        await shot('hud-'+width+'x'+height);
        await evaluate('const {game}=await import("/src/main.js");game.enemies=[];game.spawnClock=game.waveClock=1e9;game.xpNext=1e9;');
        for(const [x,y] of [[width/2,height/2+1],[1,height*.66],[width-1,height*.66],[1,height-1],[width-1,height-1],[width/2,height*.82]]){
          const start={x,y,id:1},dx=x<width/2?40:-40,dy=y>height*.85||y<height*.6?-35:35,drag={x:x+dx,y:y+dy,id:1};
          await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});
          assert(await evaluate('const {game}=await import("/src/main.js");const r=document.getElementById("joystick").getBoundingClientRect();return Math.hypot(game.stick.x,game.stick.y)<.01&&document.getElementById("joystick").classList.contains("floating")&&Math.abs(r.x+r.width/2-'+x+')<1&&Math.abs(r.y+r.height/2-'+y+')<1'),'floating joystick starts neutrally at any lower-half touch');
          await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[drag]});
          assert(await evaluate('const {game}=await import("/src/main.js");const {x,y}=game.player;game.update(.05);return Math.abs(Math.hypot(game.stick.x,game.stick.y)-1)<.01&&(game.player.x-x)*'+dx+'>0&&(game.player.y-y)*'+dy+'>0'),'drag moves the player with capped diagonal speed');
          await call('Input.dispatchTouchEvent',{type:x===1?'touchCancel':'touchEnd',touchPoints:[]});
          assert(await evaluate('const {game}=await import("/src/main.js");return !game.stick.x&&!game.stick.y&&!document.getElementById("joystick").classList.contains("floating")'),'release and cancel stop movement');
        }
        await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:width/2,y:height*.36,id:1}]});
        await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:width/2,y:height*.66,id:1}]});
        assert(await evaluate('const {game}=await import("/src/main.js");return !game.stick.x&&!game.stick.y&&!document.getElementById("joystick").classList.contains("floating")'),'touches starting above halfway do not acquire movement');
        await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        const anchor={x:width*.25,y:height*.65,id:1},moving={x:width*.25+40,y:height*.65,id:1};
        await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[anchor]});await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[moving]});
        const dash=await evaluate('const {game}=await import("/src/main.js");game.player.dashCooldown=0;const r=document.getElementById("touch-dash").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,id:2}');
        await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[moving,dash]});
        assert(await evaluate('const {game}=await import("/src/main.js");return game.player.dashCooldown>0&&game.stick.x>.99&&Math.abs(game.stick.y)<.01'),'second finger can dash while the first keeps moving');
        await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[moving]});
        assert(await evaluate('const {game}=await import("/src/main.js");return game.stick.x>.99'),'releasing dash does not release movement');
        await shot('floating-joystick-'+width+'x'+height);
        await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        await evaluate('const {game}=await import("/src/main.js");game.player.dashTime=0;');
        for(const action of ['pause','level','status','blur','resize']){
          await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[anchor]});await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[moving]});
          await evaluate('const {game}=await import("/src/main.js");const action='+JSON.stringify(action)+';if(action==="pause")game.pause();else if(action==="level"){game.gainXp(game.xpNext);game.update(.016)}else if(action==="status")document.getElementById("status-button").click();else window.dispatchEvent(new Event(action));');
          assert(await evaluate('const {game}=await import("/src/main.js");return !game.stick.x&&!game.stick.y&&!document.getElementById("joystick").classList.contains("floating")'),'movement resets on '+action);
          await evaluate('const {game}=await import("/src/main.js");if(game.state==="paused")game.resume();else if(game.state==="status")document.getElementById("sheet-close").click();else if(game.state==="level")game.skipUpgrade();game.pendingLevels=0;game.xpNext=1e9;');
          await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...moving,x:moving.x+10}]});
          assert(await evaluate('const {game}=await import("/src/main.js");return !game.stick.x&&!game.stick.y'),'old touch stays released after '+action);
          await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        }
        assert(await evaluate('const {game}=await import("/src/main.js");document.getElementById("hud-loadout-button").click();return game.state==="status"&&document.getElementById("sheet-tab-items").getAttribute("aria-selected")==="true"'),'compact equipment entry retains full inventory');
        await evaluate('document.getElementById("sheet-close").click();');
      }
      for(const [width,height] of [[378,668],[320,568],[390,844],[568,320],[667,375],[844,390]]){
        await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
        const anchor={x:width*.25,y:height*.65,id:1},moving={x:width*.25+40,y:height*.65,id:1};
        for(const kind of ['vigil','hunt','souls']){
          await evaluate('const {game}=await import("/src/main.js");game.start(game.character);game.time=60;game.enemies=[];game.spawnClock=game.waveClock=999;game.player.invincible=999;const shrine=game.shrines.find(s=>s.kind==='+JSON.stringify(kind)+');game.player.x=shrine.x;game.player.y=shrine.y;game.on("hud");');
          assert(await evaluate(`
            const {game}=await import('/src/main.js'),{EVENT_TYPES}=await import('/src/world-events.js'),type=EVENT_TYPES['${kind}'],card=document.getElementById('world-event-card'),r=card.getBoundingClientRect(),button=document.getElementById('world-event-start'),b=button.getBoundingClientRect();
            const dash=document.getElementById('touch-dash').getBoundingClientRect(),loadout=document.getElementById('hud-loadout-button').getBoundingClientRect(),toast=document.getElementById('toast').getBoundingClientRect();
            return game.state==='running'&&!game.activeEvent&&document.querySelector('.modal-wrap:not(.hidden)')===null&&button.parentElement.id==='touch-controls'&&!card.querySelector('button')&&b.width>=64&&b.height>=64&&b.top>innerHeight/2&&b.left>=0&&b.right<=dash.left-12&&b.bottom<=innerHeight&&Math.abs(b.bottom-dash.bottom)<1&&toast.bottom<=b.top-8&&(b.right<=loadout.left||b.left>=loadout.right||b.bottom<=loadout.top||b.top>=loadout.bottom)&&document.elementFromPoint(b.x+b.width/2,b.y+b.height/2).closest('#world-event-start')===button&&document.getElementById('world-event-detail').textContent.includes(type.hint)&&document.getElementById('world-event-reward').textContent.includes(type.reward)&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<innerHeight-100&&(r.bottom<innerHeight/2-20||r.left>innerWidth/2+20)&&[...card.querySelectorAll('p')].every(e=>{const s=e.getBoundingClientRect();return s.width>0&&s.top>=r.top&&s.bottom<=r.bottom&&e.scrollWidth<=e.clientWidth+1});
          `),'nearby '+kind+' keeps details above and a separate thumb button beside dash at '+width+'x'+height);
          await shot('event-'+kind+'-'+width+'x'+height);
          assert(await evaluate('const {game}=await import("/src/main.js");game.player.x+=46;document.getElementById("world-event-start").click();return !game.activeEvent&&document.getElementById("world-event-card").classList.contains("hidden")&&document.getElementById("world-event-start").disabled'),'leaving the shrine hides the offer and rejects a stale tap');
          await evaluate('const {game}=await import("/src/main.js");game.player.x-=46;game.on("hud");');
          const accept=await evaluate('const r=document.getElementById("world-event-start").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,id:2}');
          await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[anchor]});await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[moving]});
          await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[moving,accept]});
          assert(await evaluate('const {game}=await import("/src/main.js");const active=game.activeEvent;document.getElementById("world-event-start").click();return game.state==="running"&&active?.kind==='+JSON.stringify(kind)+'&&active===game.activeEvent&&game.stick.x>.99&&document.getElementById("joystick").classList.contains("floating")&&document.getElementById("world-event-start").disabled&&!document.getElementById("world-event-start").getClientRects().length'),'second finger accepts '+kind+' on press while movement continues, without accepting twice');
          await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[moving]});
          assert(await evaluate('const {game}=await import("/src/main.js");return game.stick.x>.99'),'releasing the task button does not release movement');
          await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
          await evaluate('const {game}=await import("/src/main.js");game.player.x=game.activeEvent.x;game.player.y=game.activeEvent.y;');
          const rewards=await evaluate(`
            const {game}=await import('/src/main.js'),{updateWorldEvents}=await import('/src/world-events.js');const shrine=game.activeEvent;game.xpNext=1e9;
            if(shrine.kind==='vigil')updateWorldEvents(game,12);
            if(shrine.kind==='hunt'){game.kill(shrine.guardian);updateWorldEvents(game,.01)}
            if(shrine.kind==='souls')for(const mote of shrine.motes){Object.assign(game.player,{x:mote.x,y:mote.y});updateWorldEvents(game,.01)}
            game.enemies=[];game.drops=[];game.toast('普通拾取提示');game.on('hud');return game.eventReward.rewards;
          `);
          assert(await evaluate('return '+JSON.stringify(rewards)+'.every(value=>document.getElementById("event-reward-toast").textContent.includes(value))'),'ordinary pickup messages do not overwrite rewards');
          assert(await evaluate(`
            const notice=document.getElementById('event-reward-toast'),r=notice.getBoundingClientRect(),style=getComputedStyle(notice),dash=document.getElementById('touch-dash').getBoundingClientRect();
            return document.getElementById('world-event-card').classList.contains('hidden')&&!document.getElementById('world-event-start').getClientRects().length&&style.backgroundColor==='rgba(0, 0, 0, 0)'&&style.backgroundImage==='none'&&style.borderTopWidth==='0px'&&style.pointerEvents==='none'&&r.top>=innerHeight*.55&&r.bottom<dash.top&&r.left>=0&&r.right<=innerWidth&&notice.scrollWidth<=notice.clientWidth+1;
          `),'transparent reward text leaves the upper view and controls clear at '+width+'x'+height);
          await shot('event-reward-'+kind+'-'+width+'x'+height);
          await evaluate('const {game}=await import("/src/main.js");game.pause();');
          const beforeFade=await evaluate('const {game}=await import("/src/main.js");return game.eventReward.expiresAt');await delay(100);
          assert.equal(await evaluate('const {game}=await import("/src/main.js");return game.eventReward.expiresAt'),beforeFade);
          await evaluate('const {game}=await import("/src/main.js");game.resume();game.time=game.eventReward.expiresAt-.6;game.on("hud");game.pause();');await delay(180);
          assert(await evaluate('const opacity=Number(getComputedStyle(document.getElementById("event-reward-toast")).opacity);return opacity>0&&opacity<.8'),'reward fades during the final second');
          await evaluate('const {game}=await import("/src/main.js");game.resume();game.time=game.eventReward.expiresAt;game.update(.01);game.on("hud");');
          assert(await evaluate('const {game}=await import("/src/main.js");return !game.eventReward&&!game.activeEvent&&game.eventsCompleted===1&&document.getElementById("event-reward-toast").classList.contains("hidden")&&!document.getElementById("world-event-start").getClientRects().length'),'reward disappears automatically without another payment or confirmation');
        }
      }
      await evaluate(`
        const {game}=await import('/src/main.js'),{updateWorldEvents}=await import('/src/world-events.js');
        game.start(game.character);game.time=60;game.enemies=[];game.spawnClock=game.waveClock=999;game.xpNext=1e9;
        Object.assign(game.player,{x:game.shrines[0].x,y:game.shrines[0].y});game.interact();updateWorldEvents(game,12);
        Object.assign(game.player,{x:game.shrines[1].x,y:game.shrines[1].y});game.on('hud');
      `);
      const receiptTouch=await evaluate('const r=document.getElementById("world-event-start").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}');
      await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[receiptTouch]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      assert(await evaluate('const {game}=await import("/src/main.js");return !!game.eventReward&&game.activeEvent?.kind==="hunt"&&game.eventsCompleted===1&&game.enemies.filter(e=>e.eventGuardian).length===1'),'reward notification allows the next shrine to be accepted exactly once');
      await call('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});await call('Emulation.setTouchEmulationEnabled',{enabled:false});
      assert(await evaluate('const {game}=await import("/src/main.js");game.on("hud");return document.getElementById("world-event-start").parentElement.classList.contains("world-event-heading")'),'switching to mouse returns the same button to the desktop details');
      await evaluate('const {game}=await import("/src/main.js");game.activeEvent=null;game.enemies=[];game.shrines[1].state="idle";game.on("hud");');
      const desktopOffer=await evaluate('const r=document.getElementById("world-event-start").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}');
      for(const type of ['mousePressed','mouseReleased'])await call('Input.dispatchMouseEvent',{type,...desktopOffer,button:'left',clickCount:1});
      assert(await evaluate('const {game}=await import("/src/main.js");return game.activeEvent?.kind==="hunt"&&game.enemies.filter(e=>e.eventGuardian).length===1'),'desktop mouse still accepts once');
      await evaluate('const {game}=await import("/src/main.js");game.returnToMenu();document.getElementById("meta-button").click();');
      assert(await evaluate('return document.getElementById("meta-upgrades").textContent.includes("连续 6 秒未受攻击")'));await shot('recovery-altar');
      const concurrentSave=await evaluate(`
        const frames=await Promise.all([0,1].map(()=>new Promise(resolve=>{const frame=document.createElement('iframe');frame.hidden=true;frame.src='/';frame.onload=()=>resolve(frame);document.body.append(frame)})));
        try{
          if(!navigator.locks)throw Error('Web Locks required for the cross-page check');
          localStorage.setItem('afterlight-save-v1',JSON.stringify({embers:100}));
          const results=await Promise.all(frames.map(frame=>frame.contentWindow.eval('(async()=>{const {readSave,writeSave}=await import("/src/data.js");return writeSave(readSave(),{purchase:"vitality"})})()')));
          await Promise.all(frames.map((frame,i)=>frame.contentWindow.eval('(async()=>{const {readSave,writeSave}=await import("/src/data.js");return writeSave(readSave(),{result:{reward:'+(i?11:7)+',time:60,kills:3,won:false}})})()')));
          const {readSave,writeSave}=await import('/src/data.js');const {game:sibling}=await frames[0].contentWindow.eval('import("/src/main.js")');
          let gain;const muted=!sibling.sound.muted;sibling.sound.ctx={currentTime:0};sibling.sound.master={gain:{setTargetAtTime:value=>gain=value}};
          await writeSave(readSave(),{muted});for(let i=0;i<50&&gain===undefined;i++)await new Promise(resolve=>setTimeout(resolve,10));
          const latest=readSave();return {purchases:results.filter(r=>r.purchased).length,embers:latest.embers,level:latest.meta.vitality,runs:latest.runs,kills:latest.kills,syncedAudio:sibling.sound.muted===muted&&gain===(muted?0:.55)};
        }finally{for(const frame of frames)frame.remove()}
      `);
      assert.deepEqual(concurrentSave,{purchases:1,embers:68,level:1,runs:2,kills:6,syncedAudio:true},'independent pages must serialize purchases, preserve both settlements and synchronize audio');
      assert(await evaluate(`
        const {game}=await import('/src/main.js');const {readSave,writeSave}=await import('/src/data.js');
        document.querySelector('#meta-screen [data-close]').click();game.start(game.character);await writeSave(readSave());
        let release,entered;const acquired=new Promise(resolve=>entered=resolve);
        const hold=navigator.locks.request('afterlight-save-v1',()=>{entered();return new Promise(resolve=>release=resolve)});await acquired;
        game.end(false,true,'restart');document.getElementById('end-status-button').click();const blocked=game.state==='over';
        release();await hold;for(let i=0;i<50&&game.state==='over';i++)await new Promise(resolve=>setTimeout(resolve,10));
        return blocked&&game.state==='running'&&game.time<1;
      `),'settlement must resist modal shortcuts while waiting and restart after the save completes');
      // Every mobile subpage must fit, including fully discovered collections and long descriptions.
      await evaluate(`
        const {game}=await import('/src/main.js'),{WEAPONS,PASSIVES,PICKUPS,readSave,writeSave}=await import('/src/data.js'),{FUSIONS}=await import('/src/fusions.js');
        const save=readSave();save.discoveredFusions=Object.keys(FUSIONS);
        save.discoveredItems=Object.fromEntries([...Object.keys(WEAPONS).map(key=>['weapon:'+key,WEAPONS[key].fusion?3:6]),...Object.keys(PASSIVES).map(key=>['passive:'+key,PASSIVES[key].max]),...Object.keys(PICKUPS).map(key=>['pickup:'+key,1])]);
        await writeSave(save);dispatchEvent(new StorageEvent('storage',{key:'afterlight-save-v1'}));
        game.start(game.character);game.level=30;game.time=300;game.player.invincible=1e9;game.spawnClock=game.waveClock=1e9;
        game.weapons={solar:3,glacier:3,meteor:5,flame:6};game.passives={soulpact:3,bulwark:3,haste:5,curse:5,regen:5,volatile:3};
        const {characterStats}=await import('/src/stats.js');game.stats=characterStats(game.character,game.passives,game.meta,game.talents);
        document.getElementById('status-button').click();
      `);
      const mobileFit=async label=>assert.deepEqual(await evaluate(`
        const panel=document.querySelector('.modal-wrap:not(.hidden) .panel'),rect=panel.getBoundingClientRect(),issues=[];
        if(rect.left<0||rect.top<0||rect.right>innerWidth+1||rect.bottom>innerHeight+1)issues.push('panel outside viewport');
        for(const element of [panel,...panel.querySelectorAll('*')]){
          if(!element.getClientRects().length||element.closest('details:not([open])')||element.matches('option'))continue;
          const style=getComputedStyle(element),r=element.getBoundingClientRect();
          if(['auto','scroll','hidden'].includes(style.overflowY)&&element.scrollHeight>element.clientHeight+2)issues.push((element.id||element.className)+' vertical overflow');
          if(r.left<rect.left-1||r.right>rect.right+1||r.top<rect.top-1||r.bottom>rect.bottom+1)issues.push((element.id||element.className)+' outside panel');
        }
        return issues;
      `),[],label);
      const chooseMobile=async(selector,value)=>evaluate(`const picker=document.querySelector(${JSON.stringify(selector)});picker.value=${JSON.stringify(value)};picker.dispatchEvent(new Event('change'));`);
      const visitMobile=async(selector,label)=>{
        const options=await evaluate(`const picker=document.querySelector(${JSON.stringify(selector)});return picker?[...picker.options].map(option=>option.value):[];`);
        for(const value of options){await chooseMobile(selector,value);await mobileFit(label+' / '+value)}
      };
      for(const [width,height] of [[370,665],[320,568],[390,844],[568,320],[667,375],[844,390]]){
        await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await delay(50);
        for(const tab of ['attributes','talents','items','fusion','catalog']){
          await evaluate(`document.getElementById('sheet-tab-${tab}').click()`);
          if(tab==='attributes')await visitMobile('#sheet-attributes>.mobile-pages-picker','attributes '+width);
          if(tab==='talents'){
            await visitMobile('#sheet-talents>.mobile-pages-picker','talents '+width);
            for(let i=0;i<3;i++){await chooseMobile('#sheet-talents>.mobile-pages-picker','branch-'+i);await visitMobile('.talent-branch.mobile-selected>.mobile-pages-picker','talent nodes '+width)}
          }
          if(tab==='items'||tab==='fusion'){
            const selector='#sheet-'+tab,seen=[];
            {
              if(tab==='items')await chooseMobile(selector+' .collection-category','all');
              await evaluate(`const previous=document.querySelector('${selector} .collection-prev');while(!previous.disabled)previous.click();`);
              while(true){
                const page=await evaluate(`return document.querySelector('${selector} .collection-page').textContent`);
                const ids=await evaluate(`return [...document.querySelectorAll('${selector} .catalog-item')].map(button=>button.dataset.itemId)`);
                assert(ids.length>0&&ids.length<=12);seen.push(...ids);await mobileFit(tab+' grid '+width+' '+page);
                for(const id of ids){
                  assert(await evaluate(`const root=document.querySelector('${selector}'),id=${JSON.stringify(id)};[...root.querySelectorAll('.catalog-item')].find(button=>button.dataset.itemId===id).click();return root.querySelector('.catalog-browser').classList.contains('hidden')&&!document.getElementById(id).classList.contains('hidden')&&document.activeElement===root.querySelector('.catalog-back');`),'tile opens the selected equipment or recipe');
                  await mobileFit(tab+' effect '+width+' '+id);
                  if(tab==='fusion')assert(await evaluate(`
                    const root=document.querySelector('${selector}'),id=${JSON.stringify(id)},button=document.getElementById(id).querySelector('.fusion-track-button');
                    if(!button||!button.hasAttribute('aria-pressed')||button.disabled)return true;
                    const before=button.getAttribute('aria-pressed');button.click();const next=document.getElementById(id).querySelector('.fusion-track-button');
                    if(root.dataset.selected!==id||root.querySelector('.catalog-detail').classList.contains('hidden')||next.getAttribute('aria-pressed')===before||document.activeElement!==next)return false;
                    next.click();return document.getElementById(id).querySelector('.fusion-track-button').getAttribute('aria-pressed')===before;
                  `),'tracking preserves the current recipe and keyboard focus');
                  await evaluate(`document.querySelector('${selector} .catalog-back').click()`);
                  assert.deepEqual(await evaluate(`return [document.querySelector('${selector} .collection-page').textContent,document.activeElement.dataset.itemId]`),[page,id],'back restores the equipment or recipe page and focus');
                }
                if(await evaluate(`return document.querySelector('${selector} .collection-next').disabled`))break;
                await evaluate(`document.querySelector('${selector} .collection-next').click()`);
              }
            }
            const expected=tab==='items'?await evaluate(`const {game}=await import('/src/main.js');return [...Object.keys(game.weapons).map(key=>'sheet-weapon-'+key),...Object.keys(game.passives).map(key=>'sheet-passive-'+key)]`):await evaluate(`return [...document.querySelector('${selector} .collection-cards').children].map(card=>card.id)`);
            assert.deepEqual([...seen].sort(),expected.sort(),'all equipment and known recipes remain reachable');
            if(tab==='items')assert(await evaluate('return document.getElementById("sheet-items-label").textContent==="本局装备"&&![...document.querySelector("#sheet-items .collection-category").options].some(option=>option.value==="pickup")'),'the loadout does not duplicate the permanent pickup catalog');
            await evaluate(`document.querySelector('${selector} .catalog-item').click()`);
            await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
            assert(await evaluate(`const {game}=await import('/src/main.js');return game.state==='status'&&document.querySelector('${selector} .catalog-detail').classList.contains('hidden')`),'Escape returns to the icon grid');
          }

          if(tab==='catalog'){
            await chooseMobile('#catalog-category','all');await evaluate('document.getElementById("catalog-clear").click()');
            const seen=[];
            while(true){
              const page=await evaluate('return document.getElementById("catalog-page").textContent'),ids=await evaluate('return [...document.querySelectorAll("#catalog-list .catalog-item")].map(button=>button.dataset.itemId)');
              assert(ids.length>0&&ids.length<=12);seen.push(...ids);
              await mobileFit('catalog grid '+width+' '+page);
              for(const id of ids){
                assert(await evaluate(`const {catalogItem}=await import('/src/data.js');const id=${JSON.stringify(id)},item=catalogItem(id);[...document.querySelectorAll('#catalog-list .catalog-item')].find(button=>button.dataset.itemId===id).click();return document.getElementById('catalog-browser').classList.contains('hidden')&&document.querySelector('#catalog-detail .catalog-description').textContent===item.data.desc&&document.querySelector('#catalog-detail h4').textContent===item.data.name&&document.activeElement.id==='catalog-back';`),'click opens one short effect');
                await mobileFit('catalog effect '+width+' '+id);await evaluate('document.getElementById("catalog-back").click()');
                assert.deepEqual(await evaluate('return [document.getElementById("catalog-page").textContent,document.activeElement.dataset.itemId]'),[page,id],'return preserves the page and focused tile');
              }
              if(await evaluate('return document.getElementById("catalog-next").disabled'))break;
              await evaluate('document.getElementById("catalog-next").click()');
            }
            assert.equal(new Set(seen).size,seen.length,'no duplicate tiles across pages');assert.equal(seen.length,81,'every discovered item can be reached by paging');
            await chooseMobile('#catalog-category','pickup');await mobileFit('pickup category '+width);
            assert(await evaluate('return [...document.querySelectorAll("#catalog-list .catalog-item")].every(button=>button.dataset.itemId.startsWith("pickup:"))'));
            await chooseMobile('#catalog-category','all');
            await evaluate('const input=document.getElementById("catalog-search");input.value="不存在的道具";input.dispatchEvent(new Event("input"));');await mobileFit('empty search '+width);await evaluate('document.getElementById("catalog-clear").click()');
            await evaluate('document.querySelector("#catalog-list .catalog-item").click()');
            await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
            assert(await evaluate('const {game}=await import("/src/main.js");return game.state==="status"&&document.getElementById("catalog-detail").classList.contains("hidden")'),'Escape returns from the effect to the collection');
          }
          await mobileFit(tab+' '+width+'x'+height);await shot('menus-'+tab+'-'+width+'x'+height);
        }
        await evaluate(`
          document.getElementById('sheet-tab-items').click();const picker=document.querySelector('#sheet-items .collection-category');picker.value='weapon';picker.dispatchEvent(new Event('change'));
          document.querySelector('#sheet-items [data-item-id="sheet-weapon-solar"]').click();
          [...document.querySelectorAll('#sheet-weapon-solar .sheet-recipe-link')].find(button=>button.textContent.includes('融合图谱')).click();
        `);
        assert(await evaluate('return document.getElementById("recipe-solar").getClientRects().length>0&&document.getElementById("sheet-tab-fusion").getAttribute("aria-selected")==="true"'),'equipment link selects the target recipe');
        await evaluate('document.querySelector("#recipe-solar .fusion-track-button").click()');
        assert(await evaluate('return document.getElementById("sheet-weapon-solar").getClientRects().length>0&&document.getElementById("sheet-tab-items").getAttribute("aria-selected")==="true"'),'recipe return selects the equipped weapon');
        await evaluate('document.getElementById("sheet-close").click();const {game}=await import("/src/main.js");game.pause()');await mobileFit('pause '+width);await shot('menus-pause-'+width+'x'+height);
        await evaluate('const {game}=await import("/src/main.js");game.returnToMenu();document.getElementById("archive-button").click()');await visitMobile('.guide-grid>.mobile-pages-picker','guide '+width);await shot('menus-guide-'+width+'x'+height);
        await evaluate('document.querySelector("[data-close=archive-screen]").click();const {game}=await import("/src/main.js");game.start(game.character);game.time=600;game.damageByWeapon={solar:100000,talent:20000,orb:8000};game.damageTaken=300;game.end(true)');
        for(let i=0;i<30;i++){if(await evaluate('return !document.getElementById("end-screen").classList.contains("hidden")'))break;await delay(50)}
        await visitMobile('#end-report>.mobile-pages-picker','result '+width);await shot('menus-result-'+width+'x'+height);
        await evaluate('const {game}=await import("/src/main.js");game.returnToMenu();game.start(game.character);game.level=30;game.time=300;game.player.invincible=1e9;game.spawnClock=game.waveClock=1e9;game.weapons={solar:3,glacier:3,meteor:5,flame:6};game.passives={soulpact:3,bulwark:3,haste:5,curse:5,regen:5,volatile:3};const {characterStats}=await import("/src/stats.js");game.stats=characterStats(game.character,game.passives,game.meta,game.talents);document.getElementById("status-button").click()');
      }
      assert.equal(errors.length,0,JSON.stringify(errors));
      console.log('PASS: native Chrome desktop/touch rendering, 36 weapon effects, adaptive tag UI/search, two new fusion transactions, three talent trees, shrine controls, concurrent save transactions, choice preservation and zero runtime exceptions. Screenshots: artifacts/.');
    }finally{socket?.close();browser.kill()}
  }
}finally{Math.random=originalRandom}
