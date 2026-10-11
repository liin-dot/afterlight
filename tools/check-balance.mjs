import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {Game} from '../src/game.js';
import {CHARACTERS,WEAPONS,PASSIVES,PICKUPS,normalizeItemDiscoveries} from '../src/data.js';
import {FUSIONS,fusionState,maxWeaponLevel} from '../src/fusions.js';
import {characterStats,weaponStats} from '../src/stats.js';
import {PHASES,pressureAt,xpForLevel,upgradePool,rollUpgradeChoices,buildProfile,tagAffinity,recordUpgradeChoice} from '../src/balance.js';
import {relicDescription,relicValues,compatibleWeapons,BUILD_TAGS,itemTags} from '../src/content.js';
import {weaponFacts,passiveEffect} from '../src/item-info.js';
import {onXpPickup,updateRelicStates,onWeaponHit} from '../src/relic-combat.js';
import {updateExpandedWeapon,updateExpandedZone} from '../src/expanded-combat.js';
import {CHARACTER_TALENTS,TALENT_LEVELS,talentPoints,talentNodeState,updateCharacterTalents,onCharacterCast,onCharacterProjectileHit,characterHitMultiplier,onCharacterHit} from '../src/talents.js';

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
  const stats=characterStats(CHARACTERS[0]);
  assert.equal(Object.keys(WEAPONS).length,36);assert.equal(Object.keys(PASSIVES).length,38);assert.equal(Object.keys(PICKUPS).length,7);
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
  const harvest=start();harvest.enemies=[];equip(harvest,{bolt:1},{harvest:2});target(harvest);onXpPickup(harvest,180);updateRelicStates(harvest);assert.equal(harvest.harvestCharge,120);assert.equal(harvest.projectiles.length,3);
  const drops=start();drops.enemies=[];drops.time=100;drops.player.hp=10;drops.lastHealDrop=0;
  for(let i=0;i<50;i++)drops.kill(target(drops));
  assert.equal(drops.drops.filter(d=>d.type==='heal').length,1,'mass kills must respect shared supply cooldown');
  const xp=drops.drops.filter(d=>d.type==='xp').reduce((sum,d)=>sum+d.value,0);assert.equal(xp,100);
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
    for(const other of CHARACTER_TALENTS[character.id].branches)if(other!==branch)assert(talentNodeState(game,other.nodes[2].id).exclusive);
    game.start(character);assert.equal(Object.keys(game.talents).length,0);assert.equal(talentPoints(game),0);
  }
  const gates=start();gates.level=12;assert(gates.learnTalent('w_guard1'));assert(gates.learnTalent('w_guard2'));assert(!gates.learnTalent('w_guard3'));assert(!gates.learnTalent('r_shot1'));
  gates.level=30;assert(gates.learnTalent('w_guard3'));gates.player.invincible=0;gates.player.shield=0;gates.hurt(1000,0,0);assert.equal(gates.player.hp,gates.player.maxHp*.35);assert.equal(gates.player.invincible,3);assert(gates.characterState.revived);
  gates.player.invincible=0;gates.hurt(1000,0,0);assert(gates.player.hp<=0,'revive is once per run');
  const close=start();close.enemies=[];close.player.shield=0;const closeTarget=target(close);close.grid.rebuild(close.enemies);
  for(let i=0;i<6;i++){close.time=i*.4;close.hit(closeTarget,1,0,37,0,false,'blade')}
  assert.equal(close.characterState.procs,1);assert.equal(close.player.shield,8);assert(close.damageByWeapon.talent>0);
  const stars=start(CHARACTERS[1]);stars.level=30;stars.enemies=[];target(stars);for(const id of ['s_swarm1','s_swarm2','s_swarm3'])assert(stars.learnTalent(id));
  updateCharacterTalents(stars,2,0);assert.equal(stars.projectiles.length,4);assert(stars.projectiles.every(b=>b.pierce===2));assert.equal(stars.characterState.starClock,1.4);
  const cold=start(CHARACTERS[1]);cold.level=30;cold.enemies=[];const coldTarget=target(cold),coldBoss=target(cold,60,37);coldBoss.boss=true;cold.grid.rebuild(cold.enemies);for(const id of ['s_frost1','s_frost2','s_frost3'])assert(cold.learnTalent(id));
  onCharacterProjectileHit(cold,{talent:'star'},coldTarget);assert.equal(coldTarget.slow,1.4);assert.equal(coldTarget.freeze,1.2);assert.equal(coldBoss.freeze,.25);assert.equal(coldTarget.markMultiplier,1.12);assert(compatibleWeapons('rime',cold.weapons,{},cold.talents).length);
  const scholar=start(CHARACTERS[1]);scholar.level=30;for(const id of ['s_scholar1','s_scholar2','s_scholar3'])assert(scholar.learnTalent(id));scholar.player.hp=10;onXpPickup(scholar,180);assert.equal(scholar.player.hp,13);assert.equal(scholar.player.shield,14);assert.equal(scholar.projectiles.length,6);assert(Math.abs(scholar.stats.xpMultiplier-1.2)<1e-9);
  onXpPickup(scholar,60);assert.equal(scholar.player.hp,13);assert.equal(scholar.characterState.xp,60);
  scholar.time=4;updateCharacterTalents(scholar,.05,0);assert.equal(scholar.player.hp,16);assert.equal(scholar.characterState.xp,0,'stored well charge releases when its cooldown ends');
  const wind=start(CHARACTERS[2]);wind.enemies=[];target(wind);updateCharacterTalents(wind,1,80);assert.equal(wind.characterState.charge,80);onCharacterCast(wind);assert.equal(wind.projectiles.length,1);assert.equal(wind.characterState.charge,0);onCharacterCast(wind);assert.equal(wind.projectiles.length,1);
  wind.level=30;for(const id of ['r_shot1','r_shot2','r_shot3'])assert(wind.learnTalent(id));wind.time=2;wind.characterState.charge=80;onCharacterCast(wind);assert.equal(wind.projectiles.length,4);assert.equal(wind.projectiles.at(-1).pierce,3);assert(wind.projectiles.at(-1).homing);
  const stride=start(CHARACTERS[2]);stride.level=30;for(const id of ['r_roam1','r_roam2','r_roam3'])assert(stride.learnTalent(id));assert.equal(stride.stats.moveSpeed,CHARACTERS[2].speed*1.1);assert.equal(stride.stats.dashInvincibility,.5);stride.dash();assert.equal(stride.characterState.charge,80);assert.equal(stride.characterState.ghostUntil,3);
  const embers=start();embers.level=30;embers.enemies=[];const burned=target(embers);embers.grid.rebuild(embers.enemies);
  for(const id of ['w_flame1','w_flame2','w_flame3','w_dash1','w_dash2','w_guard1'])assert(embers.learnTalent(id));
  assert.equal(talentPoints(embers),0);assert(!embers.learnTalent('w_guard2'));assert.equal(embers.stats.armor,2);
  assert.equal(weaponStats('blade',1,embers.stats,embers.character).damage,weaponStats('blade',1,stats,embers.character).damage*1.15);
  embers.dash();assert(burned.burn);assert.equal(embers.characterState.echoes.length,1);const beforeEcho=burned.hp;embers.time=.5;updateCharacterTalents(embers,.5,0);assert(burned.hp<beforeEcho);assert.equal(embers.characterState.echoes.length,0);
  const burn={...burned.burn};embers.passives.embercore=1;embers.hit(burned,1,0,37,0,false,'blade');assert.deepEqual(burned.burn,burn,'weaker burning must not overwrite a talent or delay its next tick');
  const levels=start();let awards=0;levels.on=event=>{if(event==='talentPoints')awards++};
  while(levels.level<30){levels.gainXp(levels.xpNext-levels.xp);assert.equal(talentPoints(levels),TALENT_LEVELS.filter(level=>levels.level>=level).length)}assert.equal(awards,6);
  const sight=start(CHARACTERS[2]);sight.level=30;sight.enemies=[];const far=target(sight,200,37);for(const id of ['r_sight1','r_sight2','r_sight3'])assert(sight.learnTalent(id));assert.equal(sight.stats.criticalMultiplier,2.5);assert.equal(characterHitMultiplier(sight,far,'bolt',false),1.2);onCharacterHit(sight,far,'bolt',true,false);assert.equal(sight.projectiles.length,1);onCharacterHit(sight,far,'talent',true,true);assert.equal(sight.projectiles.length,1);
  console.log('PASS: 36 weapons / 72 live attacks, 20 fusions, 27 talent nodes, six new relic effects, adaptive tag weights, choice memory, pivots, caps and reset.');

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
        for(const h of game.hazards){if(h.type!=='blast')continue;const x=p.x-h.x,y=p.y-h.y,d=Math.hypot(x,y)||1;if(d<h.r+30){dx+=x/d*3;dy+=y/d*3}}
        length=Math.hypot(dx,dy)||1;game.stick={x:dx/length,y:dy/length};if(nearest<24)game.dash();game.update(.05);
        if(game.time>=nextCheckpoint){checkpoints.push({time:nextCheckpoint,level:game.level,kills:game.kills,hp:Math.round(p.hp)});nextCheckpoint+=60}
      }
      reports.push({character:game.character.id,mode:invulnerable?'collector (damage disabled)':'survival bot',time:Math.round(game.time),won:!!game.finalDefeated,level:game.level,kills:game.kills,damageTaken:game.damageTaken,weapons:game.weapons,passives:game.passives,talents:Object.keys(game.talents),checkpoints});
      console.log(JSON.stringify(reports.at(-1)));
    }
    mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/balance-report.json',JSON.stringify(reports,null,2));
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
      const call=(method,params={})=>new Promise((resolve,reject)=>{const next=++id;pending.set(next,{resolve,reject});socket.send(JSON.stringify({id:next,method,params}))});
      const evaluate=async code=>{const r=await call('Runtime.evaluate',{expression:'(async()=>{'+code+'})()',awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value};
      const shot=async name=>{await delay(350);const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync('artifacts/'+name+'.png',Buffer.from(r.data,'base64'))};
      await call('Page.enable');await call('Runtime.enable');
      await call('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
      await call('Page.navigate',{url:'http://127.0.0.1:4173/'});
      for(let i=0;i<50;i++){if(await evaluate('return document.readyState!=="loading"'))break;await delay(100)}
      assert.equal(await evaluate('const {game}=await import("/src/main.js");return game.state'),'menu');
      await delay(600);await shot('camp-desktop');
      assert(await evaluate('document.getElementById("start-button").click();const {game}=await import("/src/main.js");return game.state==="running"'));
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
      await evaluate('document.getElementById("start-button").click();const {game}=await import("/src/main.js");game.state="level";game.level=2;game.choices=game.rollUpgrades();game.on("level");');
      await delay(100);await shot('upgrade-mobile');
      assert(await evaluate('return [...document.querySelectorAll(".upgrade-card")].every(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth})'));
      await evaluate('document.getElementById("level-catalog-button").click();');await delay(100);await shot('catalog-mobile');
      assert(await evaluate('return Number(document.getElementById("catalog-count").textContent.split("/")[0])===document.querySelectorAll(".catalog-item").length'));
      assert(await evaluate('document.getElementById("sheet-close").click();document.querySelector(".upgrade-card").click();return matchMedia("(pointer: coarse)").matches&&getComputedStyle(document.getElementById("touch-controls")).display!=="none"'));
      const visuals=await evaluate('const {game}=await import("/src/main.js");const {WEAPONS}=await import("/src/data.js");const {characterStats}=await import("/src/stats.js");let frames=0;game.passives={area:3,amount:2};game.stats=characterStats(game.character,game.passives,{});game.player.invincible=1000;game.pendingLevels=0;game.xpNext=1e9;game.spawnClock=game.waveClock=1e9;game.bossMilestones=new Set([180,360,600]);for(const [key,data] of Object.entries(WEAPONS)){game.state="running";game.weapons={[key]:data.maxLevel||6};game.timers={};game.projectiles=[];game.zones=[];game.effects=[];game.enemies=[];for(let i=0;i<16;i++){const e=game.spawnEnemy("skeleton",false,30+i*8);e.hp=e.maxHp=1e8;}for(let i=0;i<100;i++){game.update(.05);game.render();frames++;}}game.state="over";return frames;');
      assert.equal(visuals,3600);
      await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
      await call('Emulation.setTouchEmulationEnabled',{enabled:false});
      for(const character of CHARACTERS){
        const before=await evaluate(`const {game}=await import('/src/main.js');const {CHARACTERS}=await import('/src/data.js');game.start(CHARACTERS.find(c=>c.id==='${character.id}'));game.level=30;game.time=240;game.pendingLevels=2;game.state='level';game.choices=game.rollUpgrades();game.on('level');return JSON.stringify([game.choices,game.rerolls,game.pendingLevels]);`);
        await call('Input.dispatchKeyEvent',{type:'keyDown',key:'t',code:'KeyT'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'t',code:'KeyT'});
        assert(await evaluate('const {game}=await import("/src/main.js");return game.state==="status"&&document.querySelectorAll(".talent-node").length===9'));
        for(const node of CHARACTER_TALENTS[character.id].branches[0].nodes)assert(await evaluate(`const button=document.getElementById('talent-${node.id}');if(button.disabled)return false;button.click();const {game}=await import('/src/main.js');return !!game.talents['${node.id}'];`));
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
      assert(await evaluate('return document.getElementById("sheet-items").textContent.includes("散魂震波")&&document.getElementById("sheet-build-summary").textContent.includes("本局倾向")'));
      await shot('new-content-desktop');
      await evaluate('document.getElementById("sheet-tab-catalog").click();const input=document.getElementById("catalog-search");input.value="召唤";input.dispatchEvent(new Event("input",{bubbles:true}));');
      assert(await evaluate('return document.querySelectorAll(".catalog-item").length>=3&&document.getElementById("catalog-count").textContent.endsWith("/ 81")'));
      await shot('tag-catalog-desktop');await evaluate('document.getElementById("sheet-close").click();');
      await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
      await evaluate('const {game}=await import("/src/main.js");const {CHARACTERS}=await import("/src/data.js");game.start(CHARACTERS[1]);game.level=18;document.getElementById("hud-talents-button").click();document.querySelectorAll(".talent-branch-tabs button")[1].click();');
      const touch=await evaluate('const r=document.getElementById("talent-s_frost1").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};');
      await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(100);
      assert(await evaluate('const {game}=await import("/src/main.js");const root=document.getElementById("status-screen");return !!game.talents.s_frost1&&root.scrollWidth<=innerWidth&&[...document.querySelectorAll(".talent-branch.selected .talent-node")].every(e=>e.getBoundingClientRect().right<=innerWidth);'));
      await shot('talents-mobile');
      await evaluate('document.getElementById("sheet-close").click();const {game}=await import("/src/main.js");game.returnToMenu();document.getElementById("menu-talents-button").click();');
      assert(await evaluate('return [...document.querySelectorAll(".talent-node")].every(e=>e.disabled)'),'camp is a read-only preview');
      assert.equal(errors.length,0,JSON.stringify(errors));
      console.log('PASS: native Chrome desktop/touch rendering, 36 weapon effects, adaptive tag UI/search, two new fusion transactions, three talent trees, choice preservation and zero runtime exceptions. Screenshots: artifacts/.');
    }finally{socket?.close();browser.kill()}
  }
}finally{Math.random=originalRandom}
