import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {Game} from '../src/game.js';
import {STAGES,updateExpedition} from '../src/expeditions.js';
import {CHARACTERS,WEAPONS,PASSIVES,PICKUPS,ENEMIES,META,META_TREES,metaState,metaCost,STARTING_WEAPONS,startingLoadout,normalizeItemDiscoveries,readSave,writeSave,refreshSave} from '../src/data.js';
import {FUSIONS,fusionState,maxWeaponLevel} from '../src/fusions.js';
import {characterStats,weaponStats,refinementValue} from '../src/stats.js';
import {PHASES,pressureAt,xpForLevel,upgradePool,rollUpgradeChoices,buildProfile,tagAffinity,recordUpgradeChoice} from '../src/balance.js';
import {relicDescription,relicValues,compatibleWeapons,BUILD_TAGS,itemTags,ALTAR_BOONS,WEAPON_REFINEMENTS,REFINEMENT_RARITIES} from '../src/content.js';
import {weaponFacts,passiveEffect} from '../src/item-info.js';
import {onXpPickup,updateRelicStates,onWeaponHit,onWeaponCast} from '../src/relic-combat.js';
import {updateExpandedWeapon,updateExpandedZone} from '../src/expanded-combat.js';
import {updateFusion,updateFusionZone,chainArrow} from '../src/fusion-combat.js';
import {CHARACTER_TALENTS,TALENT_LEVELS,talentPoints,talentNodeState,updateCharacterTalents,onCharacterCast,onCharacterProjectileHit,characterHitMultiplier,onCharacterHit,characterTalentProgress,characterTalentSummary} from '../src/talents.js';
import {EVENT_TYPES,ALTAR_TIMES,ALTAR_ORDER,ALTAR_REWARDS,startWorldEvent,updateWorldEvents,worldEventStatus,worldEventTarget,nearestWorldEvent,drawWorldEvents} from '../src/world-events.js';

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
  game.weapons={...weapons};game.passives={...passives};game.stats=characterStats(game.character,passives,game.meta,game.talents,game.weapons,game.boons,game.weaponEmpowerments,game.metaBuffs,game.growth,game.weaponUpgrades);
  game.player.maxHp=game.stats.maxHp;game.player.hp=game.player.maxHp;
}
function target(game,x=50,y=37,hp=10000){
  const enemy=game.spawnEnemy('skeleton');Object.assign(enemy,{x,y,hp,maxHp:hp,speed:0,damage:0});return enemy;
}
const fullPermanent=Object.fromEntries(Object.entries(META).map(([key,info])=>[key,info.max]));

try{
  const storedDescriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');let storedSave='{}',denyRead=false,denyWrite=false;
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>{if(denyRead)throw Error('storage unavailable');return storedSave},setItem:(_,value)=>{if(denyWrite)throw Error('storage full');storedSave=value}}});
  try{
    storedSave='{"metaVersion":4,"embers":"Infinity","best":1e309,"kills":-4,"runs":[9],"wins":true,"meta":{"power":"Infinity","vitality":2.9,"magnet":99,"regen":-1}}';
    const invalid=readSave();for(const key of ['embers','best','kills','runs','wins'])assert.equal(invalid[key],0,'invalid saved '+key);
    assert.equal(invalid.meta.vitality,2);assert.equal(invalid.meta.power,0);assert.equal(invalid.meta.magnet,5);assert.equal(invalid.meta.regen,0);assert.equal(Object.keys(invalid.meta).length,15);
    storedSave='{"embers":"123.9","best":61.25,"kills":8.8,"runs":"2","wins":1,"meta":{"power":"3"},"discoveredFusions":["solar"],"discoveredItems":{"weapon:blade":4}}';
    const legacy=readSave();assert.deepEqual([legacy.embers,legacy.best,legacy.kills,legacy.runs,legacy.wins,legacy.meta.power],[2093,61.25,8,2,1,3]);assert.deepEqual(legacy.discoveredFusions,['solar']);assert.equal(legacy.discoveredItems['weapon:blade'],4);
    storedSave='{"embers":1e100}';assert.equal(readSave().embers,Number.MAX_SAFE_INTEGER);storedSave='{broken';assert.equal(readSave().embers,0);
    storedSave='{"embers":200}';const first=readSave(),stale=readSave();
    denyRead=denyWrite=true;refreshSave(first);assert.equal(first.embers,200,'the first unavailable read must preserve the initial loaded save');denyRead=denyWrite=false;
    assert((await writeSave(first,{purchase:'vitality'})).purchased);assert.equal(first.embers,140);
    stale.discoveredItems={'weapon:blade':4};await writeSave(stale,{muted:true});
    assert.equal(readSave().embers,140,'a stale settings/discovery save must preserve another purchase');assert.equal(readSave().meta.vitality,1);
    await Promise.all([writeSave(first,{result:{reward:17,time:50,kills:3,won:false}}),writeSave(stale,{result:{reward:20,time:40,kills:7,won:true}})]);
    assert.deepEqual([readSave().embers,readSave().best,readSave().kills,readSave().runs,readSave().wins],[177,50,10,2,1]);assert.equal(readSave().discoveredItems['weapon:blade'],4);
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
    storedSave=JSON.stringify({embers:1000,meta:{vitality:5,power:5,magnet:5,regen:5,conquest:1},legacyRanks:{ember:3,frost:2,storm:1},selectedLegacy:'ember',legacyMastery:{ember:8}});
    const migrated=readSave();assert.equal(migrated.embers,58300);assert.deepEqual(migrated.weaponUnlocks,['flame','frost','prism']);assert.equal(migrated.selectedWeapon,'flame');assert.equal(migrated.meta.vitality,5);assert.equal(migrated.meta.conquest,0,'invalid locked abilities cannot enter a run');
    await writeSave(migrated);assert.equal(readSave().embers,58300);await writeSave(migrated);assert.equal(readSave().embers,58300,'retired relic/mastery costs and price differences refund exactly once');assert(!JSON.parse(storedSave).legacyRanks);
    storedSave=JSON.stringify({embers:700,meta:Object.fromEntries(Object.entries(META).map(([key,info])=>[key,info.cooldowns?1:info.max]))});
    const oldSkills=readSave();assert.equal(oldSkills.metaVersion,4);assert.equal(oldSkills.embers,250000,'single-rank saves refund only their actual former spend');for(const [key,info] of Object.entries(META))assert.equal(oldSkills.meta[key],info.max,'old unlocked skill retains its previous cooldown: '+key);
    await writeSave(oldSkills);assert.equal(readSave().embers,250000);assert.equal(readSave().meta.laststand,1);assert.equal(readSave().meta.conquest,1,'old purchased downstream skills survive migration and reload');
    storedSave=JSON.stringify({metaVersion:2,embers:700,meta:Object.fromEntries(Object.entries(META).map(([key,info])=>[key,info.cooldowns?3:info.max]))});
    const fewerRanks=readSave();assert.equal(fewerRanks.embers,754000,'retired ranks and price reductions refund the exact former spend');for(const [key,info] of Object.entries(META))assert.equal(fewerRanks.meta[key],info.max);
    denyWrite=true;assert(!(await writeSave(fewerRanks)).persisted);assert.equal(readSave().embers,754000,'failed migration does not duplicate refunds');denyWrite=false;
    await writeSave(fewerRanks);await writeSave(fewerRanks);assert.equal(readSave().embers,754000);assert.equal(JSON.parse(storedSave).metaVersion,4,'combined refund is persisted once');
    storedSave=JSON.stringify({metaVersion:2,embers:0,meta:{power:5,reach:5,tempo:3,flare:2,conquest:3}});const invalidRanks=readSave();assert.equal(invalidRanks.meta.flare,2);assert.equal(invalidRanks.meta.conquest,0);assert.equal(invalidRanks.embers,118000,'locked nodes cannot contribute a refund');assert(metaState(invalidRanks.meta,'conquest').available,'the new two-rank prerequisite now unlocks a normal purchase');
    storedSave=JSON.stringify({metaVersion:2,meta:{power:5,reach:5,tempo:1,flare:3,conquest:3}});const partial=readSave();assert.equal(partial.meta.tempo,1);assert.equal(partial.meta.flare,0);assert.equal(partial.meta.conquest,0,'new saves cannot skip a three-rank prerequisite');await writeSave(partial);assert.equal(readSave().meta.tempo,1,'new rank one is never migrated to rank three');
    for(const tree of META_TREES){
      const meta={};let formerSpend=0,currentSpend=0;
      for(const [index,key] of tree.nodes.entries())for(let rank=0;rank<META[key].max;rank++){
        meta[key]=rank+1;
        formerSpend+=index===0?{power:160,magnet:140,vitality:120}[key]*(rank+1)**2:index===1?[4000,4500,5000,5500,6000][rank]:[[10000,15000,20000],[18000,27000],[30000]][index-2][rank];
        currentSpend+=metaCost(key,rank);
        storedSave=JSON.stringify({metaVersion:3,embers:17,meta,best:601,kills:123,runs:4,wins:1,weaponUnlocks:['sentinel'],selectedWeapon:'sentinel',discoveredItems:{'weapon:sentinel':2}});
        const cheaper=readSave();assert.equal(cheaper.embers,17+formerSpend-currentSpend,'exact price difference at '+key+' rank '+(rank+1));
        assert.deepEqual([cheaper.best,cheaper.kills,cheaper.runs,cheaper.wins,cheaper.selectedWeapon,cheaper.discoveredItems['weapon:sentinel']],[601,123,4,1,'sentinel',2]);
        for(const [id,level] of Object.entries(meta))assert.equal(cheaper.meta[id],level,'purchased ranks survive repricing');
        await writeSave(cheaper);await writeSave(cheaper);assert.equal(readSave().embers,17+formerSpend-currentSpend,'price refund is persisted once');
      }
    }
    storedSave=JSON.stringify({metaVersion:3,embers:700,meta:fullPermanent});const repriced=readSave(),stalePrice=readSave();refreshSave(repriced);assert.equal(repriced.embers,436000);
    denyRead=denyWrite=true;assert(!(await writeSave(repriced)).persisted);refreshSave(repriced);assert.equal(repriced.embers,436000,'failed storage retains one pending price refund');denyRead=denyWrite=false;
    await writeSave(repriced);await writeSave(stalePrice,{muted:true});assert.equal(readSave().embers,436000,'a stale page cannot refund prices again');assert.equal(readSave().metaVersion,4);
    storedSave=JSON.stringify({metaVersion:4,embers:0});const affordable=readSave();
    for(const [key,budget] of [['vitality',600],['regen',1000],['blood',1800],['ward',2400],['laststand',1800]]){
      await writeSave(affordable,{result:{reward:budget,time:120,kills:100,won:false}});
      for(let rank=0;rank<META[key].max;rank++)assert((await writeSave(affordable,{purchase:key,metaLevel:rank})).purchased,'one modest settlement can buy several ranks: '+key);
      assert.equal(affordable.embers,0,'published node total: '+key);assert.equal(affordable.meta[key],META[key].max);
    }
    storedSave=JSON.stringify({embers:2000,weaponUnlocks:['flame','flame',{},'unknown'],selectedWeapon:'unknown'});const weapons=readSave();assert.deepEqual(weapons.weaponUnlocks,['flame']);assert.equal(weapons.selectedWeapon,null);
    assert(!(await writeSave(weapons,{selectWeapon:'frost'})).selected);const staleWeapon=readSave();const unlocks=await Promise.all([writeSave(weapons,{unlockWeapon:'frost'}),writeSave(staleWeapon,{unlockWeapon:'frost'})]);assert.equal(unlocks.filter(r=>r.unlocked).length,1);assert.equal(readSave().embers,1400);assert((await writeSave(weapons,{selectWeapon:'frost'})).selected);
    denyWrite=true;assert(!(await writeSave(weapons,{unlockWeapon:'thorn'})).unlocked);assert(!weapons.weaponUnlocks.includes('thorn'));denyWrite=false;
    await writeSave(staleWeapon,{muted:true});assert.equal(readSave().selectedWeapon,'frost','stale settings cannot replace the chosen starter');assert(!(await writeSave(weapons,{unlockWeapon:'__proto__'})).unlocked);
    storedSave=JSON.stringify({embers:500000,meta:{}});const growth=readSave();assert(!(await writeSave(growth,{purchase:'tempo'})).purchased);assert.equal(growth.embers,500000);
    for(const tree of META_TREES)for(const key of tree.nodes.slice(0,2)){
      const state=metaState(growth.meta,key);assert(state.available);assert.equal(growth.meta[key],0);
      for(let level=0;level<META[key].max;level++){assert((await writeSave(growth,{purchase:key,metaLevel:level})).purchased);assert(!(await writeSave(growth,{purchase:key,metaLevel:level})).purchased,'stale rank cannot buy the next rank')}
      const next=tree.nodes[tree.nodes.indexOf(key)+1];assert(metaState(growth.meta,next).available);
    }
    const beforeFailed=growth.embers;denyWrite=true;assert(!(await writeSave(growth,{purchase:'tempo',metaLevel:0})).purchased);assert.equal(growth.meta.tempo,0);assert.equal(growth.embers,beforeFailed);denyWrite=false;
    assert((await writeSave(growth,{purchase:'tempo',metaLevel:0})).purchased);assert(!metaState(growth.meta,'flare').available);assert(!(await writeSave(growth,{purchase:'flare'})).purchased);
    for(let rank=1;rank<3;rank++)assert((await writeSave(growth,{purchase:'tempo',metaLevel:rank})).purchased);
    assert(!metaState(growth.meta,'conquest').available);for(let rank=0;rank<META.flare.max;rank++)assert((await writeSave(growth,{purchase:'flare',metaLevel:rank})).purchased);
    assert(metaState(growth.meta,'conquest').available);assert(metaCost('conquest',0)>metaCost('flare',0)&&metaCost('flare',0)>metaCost('tempo',0));
  }finally{if(storedDescriptor)Object.defineProperty(globalThis,'localStorage',storedDescriptor);else delete globalThis.localStorage}
  assert.equal(META_TREES.length,3);assert.equal(Object.keys(META).length,15);assert.equal(Object.keys(META).reduce((sum,key)=>sum+Array.from({length:META[key].max},(_,rank)=>metaCost(key,rank)).reduce((a,b)=>a+b,0),0),22800);
  for(const tree of META_TREES){assert.deepEqual(tree.nodes.map(key=>META[key].max),[5,5,3,2,1]);assert.deepEqual(tree.nodes.map(key=>Array.from({length:META[key].max},(_,rank)=>metaCost(key,rank))),[[60,90,120,150,180],[120,160,200,240,280],[400,600,800],[1000,1400],[1800]])}
  console.log('PASS: 22,800-ember permanent growth, affordable multi-rank settlements and exact one-time refunds across three prior save versions.');
  for(const [key] of Object.entries(STARTING_WEAPONS))for(const character of CHARACTERS){
    const preparation={selectedWeapon:key,weaponUnlocks:[key]},loadout=startingLoadout(character,preparation),game=start(character);game.start(character,{},preparation);assert.deepEqual(game.weapons,{[key]:1});assert.deepEqual(loadout.passives,{});assert.deepEqual(game.passives,{});preparation.selectedWeapon=null;assert.deepEqual(game.weapons,{[key]:1},'run starter is a snapshot');
    game.enemies=[];game.spawnClock=game.waveClock=game.xpNext=Infinity;target(game,50,37);for(let i=0;i<200;i++){game.player.invincible=2;game.update(.05)}assert(game.damageByWeapon[key]>0,'unlocked starter attacks: '+key+' / '+character.id);
    game.start(character);assert.deepEqual(game.weapons,{[character.weapon]:1});assert.deepEqual(game.passives,{});
  }
  assert.deepEqual(startingLoadout(CHARACTERS[0],{selectedWeapon:'solar',weaponUnlocks:['solar']}).weapons,{blade:1});
  console.log('PASS: three ordered permanent trees, locked/stale purchases, old research refunds, ten starter unlocks and 50 character/weapon combinations.');
  {
    const expected={tempo:[20,15,10],flare:[24,12],conquest:[18],wind:[20,15,10],chill:[4,2],omen:[6],blood:[6,4.5,3],ward:[20,10]},roll=Math.random;Math.random=()=>0;
    try{
      for(const [key,cooldowns] of Object.entries(expected))for(let rank=1;rank<=cooldowns.length;rank++){
        assert.equal(META[key].max,cooldowns.length);assert.deepEqual(META[key].cooldowns,cooldowns);
        const game=start();game.start(game.character,{[key]:rank});game.enemies=[];game.stats.criticalChance=0;game.player.hp=20;const e=target(game,50,37,1e9);e.slow=1;
        const trigger=()=>{
          if(key==='ward'){game.player.invincible=0;game.player.shield=0;game.hurt(1,0,0)}
          else if(key==='blood'||key==='conquest'){const enemy=target(game,80,37,1);enemy.elite=key==='conquest';game.kill(enemy)}
          else game.hit(e,1,0,37,0,false,'blade');
        };
        trigger();assert.equal(game.relicProcs['meta_'+key],1);assert.equal(game.relicTimers['meta_'+key],cooldowns[rank-1],key+' rank '+rank+' uses its real cooldown');
        game.time=cooldowns[rank-1]-.001;trigger();assert.equal(game.relicProcs['meta_'+key],1,'no early retrigger: '+key+' rank '+rank);
        game.time=cooldowns[rank-1];trigger();assert.equal(game.relicProcs['meta_'+key],2,'retrigger exactly when ready: '+key+' rank '+rank);
        assert.equal(metaState(game.meta,key).cooldown,cooldowns[rank-1]);assert.equal(metaState(game.meta,key).nextCooldown,cooldowns[rank]);
      }
      assert.equal(META.laststand.max,1);assert(!META.laststand.cooldowns,'last stand stays once per run');
    }finally{Math.random=roll}
    console.log('PASS: all eight status skills at 3/2/1 ranks use actual graded cooldowns, block early retriggers and keep maximum-rank baseline effects.');
  }
  {
    const base=characterStats(CHARACTERS[0]),full=characterStats(CHARACTERS[0],{},fullPermanent);
    assert.equal(full.maxHp-base.maxHp,20);assert(Math.abs(full.damageMultiplier/base.damageMultiplier-1.15)<1e-9);assert.equal(full.xpMultiplier,1.15);assert.equal(full.areaMultiplier,1.15);assert.equal(full.recovery,.4);assert.equal(full.moveSpeed,base.moveSpeed*1.1);assert.equal(full.regeneration,0,'permanent ranks do not give unconditional regeneration');
    const roll=Math.random;Math.random=()=>0;
    try{
      const game=start();game.start(game.character,fullPermanent);game.enemies=[];const e=target(game,50,37,1e9);game.stats.criticalChance=0;game.grid.rebuild(game.enemies);
      const before=weaponStats('blade',1,game.stats,game.character);game.hit(e,1,0,37,0,false,'blade');
      assert.equal(game.relicProcs.meta_tempo,1);assert.equal(game.metaBuffs.haste,.85);assert.equal(game.metaBuffs.area,1.25);assert.equal(game.metaBuffs.move,1.15);assert.equal(e.slow,1.5);assert.equal(e.marks.meta_omen.multiplier,1.15);
      assert(Math.abs(weaponStats('blade',1,game.stats,game.character).cooldown/before.cooldown-.85)<1e-9);assert.equal(game.moveSpeed,game.stats.moveSpeed*1.15);
      for(let i=0;i<50;i++)game.hit(e,1,0,37,0,false,'blade');assert.equal(game.relicProcs.meta_tempo,1,'high hit counts share the same cooldown');
      game.hit(e,1,0,37,0,false,'talent',true);assert.equal(game.relicProcs.meta_chill,1,'talents and reactions never recursively roll permanent hit effects');
      game.time=5.99;updateRelicStates(game);assert.equal(game.metaBuffs.haste,.85);game.time=6;updateRelicStates(game);assert.equal(game.metaBuffs.haste,1);assert.equal(game.metaBuffs.move,1);assert.equal(game.metaBuffs.area,1.25);game.time=8;updateRelicStates(game);assert.equal(game.metaBuffs.area,1);
      game.time=9.99;game.hit(e,1,0,37,0,false,'bolt');assert.equal(game.relicProcs.meta_tempo,1);game.time=10;game.hit(e,1,0,37,0,false,'bolt');assert.equal(game.relicProcs.meta_tempo,2);game.level=10;assert(game.learnTalent('w_flame1'));assert.equal(game.stats.metaBuffs,game.metaBuffs,'stat rebuild keeps the live, bounded buff reference');
      game.time=20;game.player.hp=20;const corpse=target(game,100,37,1);game.kill(corpse);assert.equal(game.player.hp,22);game.kill(corpse);assert.equal(game.player.hp,22);game.kill(target(game,120,37,1));assert.equal(game.player.hp,22,'kill healing shares three seconds of cooldown');
      game.time=25;game.player.hp=game.player.maxHp-.4;game.kill(target(game,130,37,1));assert.equal(game.player.hp,game.player.maxHp,'healing clamps to max HP');
      const elite=target(game);elite.elite=true;game.time=30;game.kill(elite);assert.equal(game.relicProcs.meta_conquest,1);assert.equal(game.relicTimers.meta_tempo_until,40);assert.equal(game.relicTimers.meta_flare_until,40);assert.equal(game.relicTimers.meta_wind_until,40);game.time=40;updateRelicStates(game);assert.equal(game.metaBuffs.haste,1);assert.equal(game.metaBuffs.area,1);
      game.player.invincible=0;game.player.hp=30;game.player.shield=0;game.hurt(10,0,0);assert.equal(game.player.hp,30);assert.equal(game.player.shield,20);assert.equal(game.relicProcs.meta_ward,1);assert.equal(game.relicProcs.meta_laststand,1);
      game.time=100;game.player.invincible=0;game.player.shield=0;game.player.hp=10;game.hurt(2,0,0);assert.equal(game.player.hp,8);assert.equal(game.relicProcs.meta_laststand,1,'last stand is once per run');
      game.player.invincible=0;game.player.shield=0;game.player.hp=1;game.hurt(1000,0,0);assert(game.player.hp<=0,'permanent healing never resurrects lethal damage');
      game.start(game.character,fullPermanent);assert.deepEqual(game.metaBuffs,{});assert(!game.relicTimers.meta_laststand);assert.deepEqual(game.relicProcs,{});
      const plain=start();plain.enemies=[];plain.stats.criticalChance=0;plain.hit(target(plain),1,0,37,0,false,'blade');assert(!plain.relicProcs.meta_tempo,'an unpurchased ability cannot trigger');
    }finally{Math.random=roll}
  }
  {
    const roll=Math.random;
    try{
      Math.random=()=>0;
      for(const character of CHARACTERS){
        const game=start(character);game.enemies=[];game.level=10;equip(game,game.weapons,{everseed:3});const e=target(game,40,37,1e9);game.grid.rebuild(game.enemies);game.stats.criticalChance=0;
        game.hit(e,1,0,37,0,false,'talent',true);assert.deepEqual(game.growth,{},'the relic requires a learned talent');
        assert(game.learnTalent(CHARACTER_TALENTS[character.id].branches[0].nodes[0].id));
        assert(compatibleWeapons('everseed',game.weapons,game.passives,game.talents,character.id).length);
        const base=game.stats.damageMultiplier;
        if(character.id==='warden')for(let i=0;i<5;i++){game.time=i*.4;game.hit(e,1,0,37,0,false,'blade')}
        else if(character.id==='smith')for(let i=0;i<6;i++){game.time=i*.3;game.hit(e,1,0,37,0,false,'capacitor')}
        else if(character.id==='mariner')updateCharacterTalents(game,1,90);
        else{
          if(character.id==='witch')updateCharacterTalents(game,.6,0);
          else{game.characterState.charge=80;onCharacterCast(game,'bolt')}
          for(let i=0;i<30;i++)game.updateProjectiles(.05);
        }
        let grown=game.relicProcs.everseed;assert(grown>0,'real '+character.id+' talent damage can grow');assert.equal(game.growth.damage,grown);assert(Math.abs(game.stats.damageMultiplier/base-(1+grown*.01))<1e-9);
        game.hit(e,1,0,37,0,false,'talent',true);grown++;assert.equal(game.relicProcs.everseed,grown,'a second hit can grow immediately without a cooldown');assert(!game.relicTimers.everseed);
        const corpse=target(game,50,37,0);game.hit(corpse,1,0,37,0,false,'talent',true);assert.equal(game.relicProcs.everseed,grown,'a pending death cannot award another talent hit');
        Math.random=()=>.99;game.hit(e,1,0,37,0,false,'talent',true);assert.equal(game.relicProcs.everseed,grown,'failed chance awards nothing');
        // Game.hit draws once for text placement, then for the proc and random attribute.
        for(const [choice,key] of [[.5,'area'],[.9,'vitality']]){
          const draws=[0,0,choice];Math.random=()=>draws.shift()??0;const hp=game.player.hp,max=game.player.maxHp,area=game.stats.areaMultiplier;
          game.hit(e,1,0,37,0,false,'talent',true);assert.equal(game.growth[key],1);
          if(key==='area')assert(Math.abs(game.stats.areaMultiplier/area-1.01)<1e-9);
          else{assert.equal(game.player.maxHp,max+2);assert.equal(game.player.hp,hp,'life growth does not heal')}
        }
        Math.random=()=>0;game.level=20;assert(game.learnTalent(CHARACTER_TALENTS[character.id].branches[0].nodes[1].id));assert.equal(game.stats.growth.damage,grown,'learning keeps run growth');
        game.boons=['glass'];game.state='reward';game.eventChoices=['horizon'];assert(game.chooseAltarReward(0));assert.equal(game.stats.growth.vitality,1,'altar stat rebuild keeps growth');
        game.growth.damage=500;game.hit(e,1,0,37,0,false,'talent',true);assert.equal(game.growth.damage,501,'growth has no ordinary stack cap');
        const pool=upgradePool(game);assert(!pool.some(item=>item.key==='everseed'),'relic still respects max level');
        game.start(character);assert.deepEqual(game.growth,{});assert(!game.relicProcs.everseed);assert(!game.relicTimers.everseed);
        game.level=10;assert(game.learnTalent(CHARACTER_TALENTS[character.id].branches[0].nodes[0].id));game.hit(target(game),1,0,37,0,false,'talent',true);assert.deepEqual(game.growth,{},'talents alone do not grant rare growth');
      }
    }finally{Math.random=roll}
    assert.equal(PASSIVES.everseed.rarity,'rare');assert.equal(relicValues('everseed',1).chance,.03);assert.equal(relicValues('everseed',3).chance,.06);assert(itemTags('everseed').includes('growth'));
    console.log('PASS: five real talent attack paths, rare growth chance without cooldowns, all three attributes, stat rebuild persistence, unlimited stacks and run reset.');
  }
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
  for(const power of [0,5])for(const character of CHARACTERS.slice(1,3)){
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
      assert(first.maxHp-first.hp>2*Math.round(values.damage),'charged wind adds real damage against the tougher opening skeleton');
      opening.timers.bolt=0;opening.updateWeapons(.01);for(let i=0;i<8;i++)opening.updateProjectiles(.05);assert(first.dead,'a follow-up volley finishes the tougher opening skeleton');
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
  assert.equal(Object.keys(WEAPONS).length,44);assert.equal(Object.keys(PASSIVES).length,45);assert.equal(Object.keys(PICKUPS).length,7);
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
  // Resonance requires a complete working chain; it affects tempo and coverage, never raw damage or safety limits.
  const resonanceValues=(key,level,passives,weapons={[key]:level})=>weaponStats(key,level,characterStats(CHARACTERS[0],passives,{}, {},weapons),CHARACTERS[0]);
  for(const key of Object.keys(FUSIONS)){
    const plain=resonanceValues(key,3,{}),linked=resonanceValues(key,3,{luck:3,deadeye:3});
    assert.equal(linked.resonance?.rank,2,key+' supports a working critical chain');assert.equal(linked.damage,plain.damage,'resonance must not multiply single-hit damage');
    assert(Math.abs(linked.cooldown/plain.cooldown-.7)<1e-9,key+' highest resonance tempo');
    for(const field of ['bossFreeze','heal','healCooldown','shield'])assert.equal(linked[field],plain[field],key+' preserves '+field);
  }
  for(const [level,passives,rank] of [[1,{embercore:3,cinder:3},0],[2,{embercore:3,cinder:3},1],[3,{embercore:3,cinder:2},1],[3,{embercore:3,cinder:1},0],[3,{embercore:3,cinder:3},2],[3,{aegis:3,thorns:3},0],[3,{frostbrand:3,stormseal:3},0]])assert.equal(resonanceValues('solar',level,passives).resonance?.rank||0,rank,'levels, actual triggers and offensive chain gates');
  assert(!resonanceValues('blade',6,{embercore:3,cinder:3}).resonance,'unfused weapons do not gain resonance');
  const oneChain=resonanceValues('solar',3,{embercore:3,cinder:3}),twoChains=resonanceValues('solar',3,{embercore:3,cinder:3,luck:3,deadeye:3});
  assert.equal(oneChain.cooldown,twoChains.cooldown);assert.equal(oneChain.radius,twoChains.radius,'multiple chains take the strongest tier, without stacking');
  assert(!resonanceValues('pestilence',3,{venomfang:3,spore:3}).resonance,'a missing source cannot be inferred from an item name');
  assert.equal(resonanceValues('pestilence',3,{venomfang:3,spore:3},{pestilence:3,bolt:4}).resonance.rank,2,'a sidearm can supply the linked status');
  const consumedChain=start();consumedChain.time=180;equip(consumedChain,{sentinel:5},{soulpact:3,duration:3});consumedChain.state='level';consumedChain.choices=[{key:'soulforge',weapon:true,fusion:true}];consumedChain.chooseUpgrade(0);
  assert.equal(consumedChain.weapons.soulforge,2);assert(!weaponStats('soulforge',2,consumedChain.stats,consumedChain.character).resonance,'consumed relics do not keep granting resonance');
  consumedChain.talents.w_flame2=true;consumedChain.start(CHARACTERS[0]);assert.deepEqual(consumedChain.stats.talents,{},'a new run cannot retain old trigger sources');
  for(const [key,field] of [['sentinel','fireInterval'],['solar','hitInterval'],['glacier','fieldInterval'],['orbit','hitInterval']]){
    const plain=resonanceValues(key,1,{}),fast=resonanceValues(key,1,{haste:5});assert(Math.abs(fast[field]/plain[field]-.7)<1e-9,key+' actual attack cadence follows haste');
  }
  const turretShots=haste=>{const g=start();g.enemies=[];equip(g,{sentinel:3},{haste});target(g);g.grid.rebuild(g.enemies);g.updateWeapons(.01);for(let i=0;i<40;i++)g.updateZones(.05);return g.projectiles.length};
  assert(turretShots(5)>turretShots(0),'haste produces more actual turret volleys');
  const chainReach=linked=>{const g=start();g.enemies=[];equip(g,{thunderbolt:3},{area:3,...(linked?{luck:3,deadeye:3}:{})});const first=target(g,50),other=target(g,250);g.grid.rebuild(g.enemies);const v=weaponStats('thunderbolt',3,g.stats,g.character);chainArrow(g,{...v,hit:new Set([first.id])},first);return other.hp<other.maxHp};
  assert(!chainReach(false));assert(chainReach(true),'resonant chain distance reaches a previously isolated target');
  const scytheReach=linked=>{const g=start();g.enemies=[];equip(g,{bloodmoon:3},{area:3,...(linked?{luck:3,deadeye:3}:{})});const e=target(g,230);g.grid.rebuild(g.enemies);g.updateWeapons(.01);for(let i=0;i<40;i++)g.updateProjectiles(.025);return e.hp<e.maxHp};
  assert(!scytheReach(false));assert(scytheReach(true),'scythe range extends the real outward and return path');
  const returning=start();returning.enemies=[];equip(returning,{bloodmoon:3},{area:3,luck:3,deadeye:3});target(returning);returning.grid.rebuild(returning.enemies);returning.updateWeapons(.01);const scythe=returning.projectiles[0];Object.assign(scythe,{returning:true,x:returning.player.x+13.2,y:returning.player.y-8});returning.updateProjectiles(.05);assert(Math.hypot(scythe.x-returning.player.x,scythe.y-returning.player.y+8)<13,'fast returning scythes must arrive even at a 50 ms frame, without oscillating past the player');
  for(let level=1;level<100;level++)assert(xpForLevel(level+1)>xpForLevel(level));
  for(let time=0;time<600;time++)assert(pressureAt(time+1).hp>=pressureAt(time).hp);
  assert.equal(pressureAt(0).hp,1.1);assert(pressureAt(540).hp>8);assert(pressureAt(120,3).hp>pressureAt(120).hp);
  assert.equal(PHASES.at(-1).at,600);
  for(const [time,level,power] of [[60,3,1],[150,5,2],[270,6,2],[450,6,3]]){
    const normal=characterStats(CHARACTERS[0],{power}),strike=weaponStats('blade',level,normal,CHARACTERS[0]).damage;
    const ratio=strike/(ENEMIES.skeleton.hp*pressureAt(time).hp);
    assert(ratio>.25&&ratio<1,'an ordinary blade hit must not erase a fresh skeleton at '+time);
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
  for(let i=0;i<100;i++){const choices=rollUpgradeChoices(full);assert.equal(new Set(choices.map(i=>i.key)).size,choices.length);assert.equal(choices.length,4)}
  {
    const mixed=start();mixed.time=240;equip(mixed,{blade:6,bolt:2,orbit:2});
    for(let i=0;i<100;i++){
      mixed.state='level';mixed.rerolls=1;mixed.choices=rollUpgradeChoices(mixed);
      for(const choices of [mixed.choices,(mixed.reroll(),mixed.choices)]){assert.equal(choices.length,4);assert.equal(choices.filter(item=>item.refinement).length,1)}
    }
    mixed.banishes=1;mixed.banish(mixed.choices.findIndex(item=>item.key==='bolt'));assert.equal(mixed.choices.length,4);assert.equal(mixed.choices.filter(item=>item.refinement).length,1);
    equip(mixed,{blade:6,bolt:6,orbit:6,storm:6,prism:6,thorn:6},{power:4,haste:5,area:3,armor:5,luck:5,focus:3});
    for(const key of Object.keys(FUSIONS))mixed.banished.add(key);
    for(let i=0;i<50;i++){const choices=rollUpgradeChoices(mixed);assert.equal(choices.length,2,'one ordinary choice must not allow three refinements to fill the panel');assert.equal(choices.filter(item=>item.refinement).length,1);assert(choices.some(item=>item.key==='power'))}
    mixed.banished.clear();equip(mixed,{blade:6,flame:6,bolt:6,orbit:6,storm:6,prism:6},{power:5,haste:5,area:3,armor:5,luck:5,focus:3});
    const choices=rollUpgradeChoices(mixed);assert(choices.some(item=>item.fusion));assert.equal(choices.filter(item=>item.refinement).length,1,'a ready fusion also limits refinement choices');
  }
  assert(fusionState('bloodmoon',{crescent:5},full.passives,full).blocked);
  {
    const refine=(game,key,refinement,rarity='white')=>{
      const item=upgradePool(game).find(item=>item.key===key&&item.refinement===refinement&&item.rarity===rarity);assert(item,key+' / '+refinement+' / '+rarity+' must be useful');
      game.state='level';game.choices=[item];game.chooseUpgrade(0);assert.equal(game.state,'running');return item;
    };
    for(const key of Object.keys(WEAPONS)){
      const g=start();equip(g,{[key]:maxWeaponLevel(key)});const pool=upgradePool(g).filter(item=>item.key===key),before=weaponStats(key,g.weapons[key],g.stats,g.character);
      assert(pool.every(item=>item.refinement&&item.next===item.current&&item.value>0));
      for(const item of pool){
        const info=WEAPON_REFINEMENTS[item.refinement];assert(!info.tags||info.tags.some(tag=>itemTags(key).includes(tag)||tag==='beam'||tag==='blast'));
        if(info.flat){assert(['purple','gold'].includes(item.rarity));assert.equal(item.value,item.rarity==='gold'?2:1)}
      }
      assert.deepEqual(pool.filter(item=>item.refinement==='damage').map(item=>item.value),[.04,.07,.11,.16]);
      for(let i=0;i<4;i++)refine(g,key,'damage');const after=weaponStats(key,g.weapons[key],g.stats,g.character);
      for(const field of Object.keys(before).filter(field=>field==='damage'||field.endsWith('Damage')))assert(Math.abs(after[field]-before[field]*1.16)<1e-7,key+' additive '+field);
      refine(g,key,'haste','gold');const fast=weaponStats(key,g.weapons[key],g.stats,g.character);
      for(const field of ['cooldown','fireInterval','fieldInterval','hitInterval'])if(before[field]>0)assert(Math.abs(fast[field]-before[field]/1.12)<1e-9,key+' cadence '+field);
      assert.equal(g.weapons[key],maxWeaponLevel(key),'refining must not increase equipment levels');
    }
    const g=start();g.time=240;g.level=30;equip(g,{bolt:6,blade:6,orbit:6,storm:6,prism:6,thorn:6},{power:5,haste:5,area:3,armor:5,luck:5,focus:3});
    for(const id of Object.keys(FUSIONS))g.banished.add(id);
    for(let i=0;i<120;i++){
      const choices=rollUpgradeChoices(g);assert.equal(choices.length,4);assert(choices.every(item=>item.refinement));assert.equal(new Set(choices.map(item=>item.choiceId)).size,4,'one weapon attribute cannot appear twice in different colors');
      g.state='level';g.choices=choices;g.chooseUpgrade(0);assert.equal(g.state,'running');
    }
    g.weaponUpgrades={};equip(g,{bolt:6,blade:6});const plainBlade=weaponStats('blade',6,g.stats,g.character);
    refine(g,'bolt','amount','gold');refine(g,'bolt','amount','purple');assert.equal(refinementValue(g.stats,'bolt','amount','gold'),0,'do not offer +2 with only one slot left');refine(g,'bolt','amount','purple');
    assert(!upgradePool(g).some(item=>item.key==='bolt'&&item.refinement==='amount'));g.enemies=[];target(g);g.updateWeapons(.01);assert.equal(g.projectiles.filter(b=>b.type==='bolt').length,10,'extra shots reach the actual volley');assert.deepEqual(weaponStats('blade',6,g.stats,g.character),plainBlade,'refinements affect only their weapon');
    g.weaponUpgrades.blade={critical:.95,area:1,haste:1};equip(g,g.weapons);assert(!upgradePool(g).some(item=>item.key==='blade'&&['critical','area','haste'].includes(item.refinement)));
    const before={...g.weaponUpgrades.bolt};g.learnTalent(CHARACTER_TALENTS[g.character.id].branches[0].nodes[0].id);assert.deepEqual(g.stats.weaponUpgrades.bolt,before,'talent rebuild retains refinements');
    g.state='level';g.choices=rollUpgradeChoices(g);g.pause();const frozen=JSON.stringify(g.weaponUpgrades);g.chooseUpgrade(0);assert.equal(JSON.stringify(g.weaponUpgrades),frozen);g.resume();g.reroll();g.choices=[upgradePool(g).find(item=>item.key==='bolt')];g.banish(0);assert(!upgradePool(g).some(item=>item.key==='bolt'));assert.deepEqual(g.weaponUpgrades.bolt,before,'banishment retains already gained refinements');
    g.start(g.character);assert.deepEqual(g.weaponUpgrades,{});assert.deepEqual(g.stats.weaponUpgrades,{});
    const fused=start();fused.time=180;fused.weaponUpgrades={blade:{damage:.16},bolt:{damage:.04}};equip(fused,{blade:6,flame:6,bolt:6});fused.state='level';assert(fused.fuseWeapon('solar'));assert(!fused.weaponUpgrades.blade);assert.equal(fused.weaponUpgrades.bolt.damage,.04);
    const oldRandom=Math.random;Math.random=()=>.99;
    try{for(const [key,status] of [['flame','burn'],['thorn','poison'],['frost','freeze'],['storm','marks']]){
      const fight=start();fight.weaponUpgrades={[key]:{anomaly:1}};equip(fight,{[key]:6});fight.stats.criticalChance=0;
      const enemy=target(fight);fight.hit(enemy,100,0,37,0,false,key);assert(enemy[status],key+' applies its own abnormal effect');
      const periodic=target(fight);fight.hit(periodic,100,0,37,0,false,key,true);assert(!periodic[status],key+' periodic damage cannot re-roll abnormalities');
      if(key==='flame'){assert.equal(enemy.burn.damage,15);assert(compatibleWeapons('rotclock',fight.weapons,{}, {},fight.character.id,fight.weaponUpgrades).includes('flame'));fight.time=.5;updateRelicStates(fight);assert.equal(enemy.hp,enemy.maxHp-115)}
      if(key==='frost'){const v=weaponStats(key,6,fight.stats,fight.character);assert.equal(enemy.freeze,v.freeze*1.25);const boss=target(fight);boss.boss=true;fight.hit(boss,100,0,37,0,false,key);assert.equal(boss.freeze,v.bossFreeze*1.25);fight.enemies=[boss];fight.grid.rebuild(fight.enemies);fight.updateWeapons(.01);assert.equal(boss.freeze,v.bossFreeze*1.25,'deep freeze improves the weapon freeze instead of replacing it with a shorter no-op')}
      if(key==='thorn'){enemy.poison.until=10;fight.hit(enemy,100,0,37,0,false,key);assert.equal(enemy.poison.until,10,'a shorter abnormal effect must not truncate existing poison')}
      assert(!upgradePool(fight).some(item=>item.key===key&&item.refinement==='anomaly'));
    }}finally{Math.random=oldRandom}
    assert.deepEqual(Object.values(REFINEMENT_RARITIES).map(tier=>tier.weight),[60,28,10,2]);
    console.log('PASS: all 44 weapons refine with additive damage and real cadence; four rarity tiers, +4 shot cap, full-loadout growth, scoped effects, status triggers, rebuilds, banishment and reset.');
  }
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
    const game=start();game.time=240;game.bossMilestones=new Set([180,360,600]);game.spawnClock=game.waveClock=Infinity;game.shrines=[];game.nextShrine=ALTAR_TIMES.length;game.enemies=[];
    if(level===maxWeaponLevel(key))game.weaponUpgrades={[key]:{damage:.16,haste:.12}};
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
  for(let i=0;i<79;i++)recovery.update(.05);assert.equal(recovery.player.hp,40,'even a shield hit interrupts permanent recovery');
  recovery.update(.1);assert(recovery.player.hp>40,'four seconds of avoidance restores permanent recovery');
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
  const harvest=start();harvest.enemies=[];equip(harvest,{bolt:1},{harvest:2});target(harvest);onXpPickup(harvest,180);updateRelicStates(harvest);assert.equal(harvest.harvestCharge,0);assert.equal(harvest.projectiles.length,9);
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
  const glass=start();glass.enemies=[];equip(glass,{bolt:1},{bulwark:2});glass.player.shield=20;glass.player.invincible=0;glass.hurt(10,0,0);assert.equal(glass.projectiles.length,0);glass.player.invincible=0;glass.hurt(10,0,0);assert.equal(glass.projectiles.length,5);assert(glass.projectiles.every(b=>b.refracted));glass.player.shield=10;glass.player.invincible=0;glass.hurt(10,0,0);assert.equal(glass.projectiles.length,10,'every separate shield break triggers without a relic cooldown');
  const fork=start();fork.enemies=[];equip(fork,{bolt:1},{forkseed:2});const forkTarget=target(fork);fork.grid.rebuild(fork.enemies);fork.stats.criticalChance=1;fork.hit(forkTarget,1,0,37,0,false,'bolt');assert.equal(fork.projectiles.length,2);assert(fork.projectiles.every(b=>b.hit.has(forkTarget.id)));fork.hit(forkTarget,1,0,37,0,false,'bolt');assert.equal(fork.projectiles.length,4);
  onWeaponHit(fork,forkTarget,'bolt',true,true);assert.equal(fork.projectiles.length,4,'periodic hits cannot split again');
  const forkOther=target(fork,75,37),originalHp=forkTarget.hp;fork.grid.rebuild(fork.enemies);for(let i=0;i<50;i++)fork.updateProjectiles(.05);assert(forkOther.hp<forkOther.maxHp);assert.equal(forkTarget.hp,originalHp);assert.equal(fork.relicProcs.forkseed,2,'split projectiles cannot recursively trigger their source');
  const coil=start();coil.enemies=[];equip(coil,{storm:1},{stormcoil:2});coil.player.shield=0;const charged=target(coil);coil.grid.rebuild(coil.enemies);for(let i=0;i<7;i++)coil.hit(charged,1,0,37,0,false,'storm');assert.equal(coil.relicProcs.stormcoil,1);assert.equal(coil.player.shield,3);assert.equal(coil.stormCharge,0);for(let i=0;i<14;i++)coil.hit(charged,1,0,37,0,false,'storm');assert.equal(coil.relicProcs.stormcoil,3);assert.equal(coil.stormCharge,0);for(let i=0;i<7;i++)coil.hit(charged,1,0,37,0,false,'storm');assert.equal(coil.relicProcs.stormcoil,4);
  const rot=start();rot.enemies=[];equip(rot,{blade:1},{rotclock:2});const rotting=target(rot);rotting.burn={damage:20,until:3,next:0};updateRelicStates(rot);assert.equal(rotting.maxHp-rotting.hp,30);assert.equal(rot.relicProcs.rotclock,1);
  // Relics follow real event counts, including multiple hits in the same simulation frame.
  for(const [key,data] of Object.entries(PASSIVES).filter(([,data])=>data.relic))for(let level=1;level<=data.max;level++){
    assert(!Object.hasOwn(relicValues(key,level),'cooldown'),key+' must not define a relic cooldown');assert(!/undefined|NaN|冷却\s*\d/.test(relicDescription(key,level)),key+' description matches the no-cooldown rules');
  }
  for(const key of ['forkseed','conductor','rime','stormseal','venomfang','embercore','frostbrand','deadeye','siphon','aegis','volatile']){
    const game=start();game.enemies=[];game.time=10;equip(game,{sentinel:1},{[key]:2,...(key==='volatile'?{venomfang:1,embercore:1}:{})});game.player.hp=10;game.player.shield=0;game.stats.criticalChance=1;
    const first=target(game,50,37,1e9);first.slow=2;target(game,65,37,1e9);game.grid.rebuild(game.enemies);game.relicTimers[key]=9999;
    for(let hit=0;hit<10;hit++)game.hit(first,1,0,37,0,false,key==='stormseal'?'storm':key==='siphon'?'blade':'sentinel');
    assert.equal(game.relicProcs[key],10,key+' triggers on every eligible hit, even with an old timer value');assert.equal(game.relicTimers[key],9999,key+' never writes a new timer');
    if(key==='siphon')assert(Math.abs(game.player.hp-12.4)<1e-8);if(key==='aegis')assert(Math.abs(game.player.shield-3)<1e-8);
  }
  for(const key of ['thorns','bulwark','spore','cinder','echo']){
    const game=start();game.enemies=[];game.time=10;equip(game,{blade:1},{[key]:2});const first=target(game,50,37,1e9);game.grid.rebuild(game.enemies);game.relicTimers[key]=9999;
    for(let event=0;event<10;event++){
      if(key==='thorns'||key==='bulwark'){game.player.invincible=0;game.player.shield=1;game.hurt(1,0,0)}
      else if(key==='echo')for(let cast=0;cast<3;cast++)onWeaponCast(game,'blade');
      else{const dead=target(game,50,37,1e9);dead.burningUntil=20;dead.poison={damage:1,until:20,next:11};game.kill(dead)}
    }
    assert.equal(game.relicProcs[key],10,key+' has no time gate on its actual event');assert.equal(game.relicTimers[key],9999);assert(Number.isFinite(first.hp));
  }
  const turretRelics=haste=>{
    const game=start(CHARACTERS[1]);game.enemies=[];equip(game,{sentinel:1},{venomfang:1,conductor:1,...(haste?{haste}: {})});game.stats.criticalChance=0;
    const first=target(game,50,37,1e9);target(game,80,37,1e9);game.grid.rebuild(game.enemies);let contacts=0;const hit=game.hit.bind(game);game.hit=(enemy,damage,x,y,knock,feedback,source,...rest)=>{if(source==='sentinel'&&enemy.hp>0&&!enemy.dead)contacts++;return hit(enemy,damage,x,y,knock,feedback,source,...rest)};
    for(let frame=0;frame<300;frame++){game.time+=.02;game.updateWeapons(.02);game.updateZones(.02);game.updateProjectiles(.02)}
    assert.equal(game.relicProcs.venomfang,contacts);assert.equal(game.relicProcs.conductor,contacts);assert(!game.relicTimers.venomfang&&!game.relicTimers.conductor);
    assert(first.maxHp-first.hp>=contacts*(15+5),'every actual stone hit includes its immediate poison damage');return contacts;
  };
  assert(turretRelics(5)>turretRelics(0),'real turret attack speed increases relic activations');
  const poisonScholar=start(CHARACTERS[1]);poisonScholar.enemies=[];poisonScholar.level=10;equip(poisonScholar,{sentinel:1},{venomfang:1});assert(poisonScholar.learnTalent('s_scholar1'));poisonScholar.stats.criticalChance=0;const markedVictim=target(poisonScholar,50,37,17);poisonScholar.hit(markedVictim,15,0,37,0,false,'sentinel');assert(markedVictim.dead);assert(poisonScholar.drops.find(d=>d.type==='xp').starLinked,'poison finishing damage preserves the triggering summon hit and its character mark');
  const capped=start();capped.enemies=[];equip(capped,{blade:1},{aegis:3,siphon:3});const capTarget=target(capped,50,37,1e9);capped.player.shield=22.9;capped.player.hp=capped.player.maxHp-.01;capped.hit(capTarget,1,0,37,0,false,'blade');assert.equal(capped.player.shield,23);assert.equal(capped.player.hp,capped.player.maxHp);capped.player.shield=40;capped.hit(capTarget,1,0,37,0,false,'blade');assert.equal(capped.player.shield,40,'a lower shield cap never reduces a stronger shield');
  for(const key of ['spore','cinder']){
    const game=start();game.enemies=[];equip(game,{blade:1},{[key]:2});for(let i=0;i<550;i++){const e=target(game,40+i%10,37+Math.floor(i/10),12);e.poison={damage:1,until:10,next:1};e.burningUntil=10}game.grid.rebuild(game.enemies);game.kill(game.enemies[0]);assert.equal(game.kills,550);assert.equal(game.relicProcs[key],550,'finite death cascades process each enemy once without a cooldown');
  }
  console.log('PASS: every relic omits cooldowns; actual turret hit scaling, same-frame triggers, shield/heal caps and 550-enemy death cascades.');
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
    game.level=10;assert(!game.learnTalent(branch.nodes[2].id));assert(game.learnTalent(branch.nodes[0].id));
    for(const other of CHARACTER_TALENTS[character.id].branches)if(other!==branch)assert(!game.learnTalent(other.nodes[0].id),'first talent locks the whole route');
    for(const [index,node] of branch.nodes.entries()){
      if(index){game.level=TALENT_LEVELS[index]-1;assert(!game.learnTalent(node.id));game.level++;assert(game.learnTalent(node.id),node.id)}
      assert(!game.learnTalent(node.id),'duplicate '+node.id);
    }
    assert.equal(talentPoints(game),0);
    const plain=characterStats(character);
    for(const [key,value] of Object.entries(plain))if(typeof value==='number')assert.equal(game.stats[key],value,'talents specialize the innate, not global '+key);
    for(const key of Object.keys(WEAPONS))assert.deepEqual(weaponStats(key,1,game.stats,character),weaponStats(key,1,plain,character),'no unrelated weapon bonus: '+key);
    for(const other of CHARACTER_TALENTS[character.id].branches)if(other!==branch)for(const node of other.nodes){assert(talentNodeState(game,node.id).exclusive);assert(!game.learnTalent(node.id))}
    game.start(character);assert.equal(Object.keys(game.talents).length,0);assert.equal(talentPoints(game),0);
  }
  const gates=start();gates.level=20;assert(gates.learnTalent('w_guard1'));assert(gates.learnTalent('w_guard2'));assert(!gates.learnTalent('w_guard3'));assert(!gates.learnTalent('r_shot1'));
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
  const carried=start();carried.level=10;carried.state='status';carried.statusReturn='running';carried.characterState.charge=6;assert(carried.learnTalent('w_flame1'));assert.equal(carried.characterState.charge,5);assert.equal(carried.characterState.procs,0,'learning clamps stored charge without attacking inside the menu');
  carried.start(CHARACTERS[2]);carried.level=10;carried.characterState.charge=80;assert(carried.learnTalent('r_roam1'));assert.equal(carried.characterState.charge,60);assert.equal(carried.projectiles.length,0);
  const stars=start(CHARACTERS[1]);stars.level=30;stars.enemies=[];target(stars);for(const id of ['s_swarm1','s_swarm2','s_swarm3'])assert(stars.learnTalent(id));
  updateCharacterTalents(stars,2,0);assert.equal(stars.projectiles.length,4);assert(stars.projectiles.every(b=>b.pierce===2));assert.equal(stars.characterState.starClock,.9);
  const cold=start(CHARACTERS[1]);cold.level=30;cold.enemies=[];const coldTarget=target(cold),coldBoss=target(cold,60,37);coldBoss.boss=true;cold.grid.rebuild(cold.enemies);for(const id of ['s_frost1','s_frost2','s_frost3'])assert(cold.learnTalent(id));
  onCharacterProjectileHit(cold,{talent:'star'},coldTarget);assert.equal(coldTarget.slow,1.8);assert.equal(coldTarget.freeze,1.2);assert.equal(coldBoss.freeze,.25);assert.equal(coldTarget.marks.moon.multiplier,1.18);assert(compatibleWeapons('rime',cold.weapons,{},cold.talents).length);
  const scholar=start(CHARACTERS[1]);scholar.level=30;scholar.xpNext=1e9;scholar.enemies=[];scholar.characterState.starClock=100;
  for(const id of ['s_scholar1','s_scholar2'])assert(scholar.learnTalent(id));scholar.player.hp=10;
  onXpPickup(scholar,180);assert.equal(scholar.player.hp,10);assert.equal(scholar.characterState.xp,0,'ordinary XP cannot trigger the companion well');
  const linked=target(scholar,200,37,1);linked.xp=60;onCharacterProjectileHit(scholar,{talent:'star'},linked);scholar.hit(linked,1,0,37,0,false,'orbit');
  assert(scholar.drops[0].attracted&&scholar.drops[0].starLinked,'companion marks recall the XP even when a weapon lands the kill');
  for(let i=0;i<100;i++)scholar.updateDrops(.05);
  assert.equal(scholar.xp,60);assert.equal(scholar.player.hp,13);assert.equal(scholar.player.shield,8);assert.equal(scholar.projectiles.length,0);
  assert(scholar.learnTalent('s_scholar3'));onXpPickup(scholar,180,true);assert.equal(scholar.player.hp,13);assert.equal(scholar.characterState.xp,20,'one stored well charge, regardless of a large crystal');
  scholar.time=4;updateCharacterTalents(scholar,.05,0);assert.equal(scholar.player.hp,16);assert.equal(scholar.characterState.xp,0,'stored well charge releases when its cooldown ends');
  assert.equal(scholar.player.shield,14);assert.equal(scholar.projectiles.length,6);assert.equal(scholar.stats.xpMultiplier,1);
  const expired=target(scholar,200,37,1);onCharacterProjectileHit(scholar,{talent:'star'},expired);scholar.time=8.01;scholar.hit(expired,1,0,37,0,false,'blade');assert(!scholar.drops.find(d=>d.type==='xp').starLinked,'expired star marks cannot recall XP');
  const wind=start(CHARACTERS[2]);wind.enemies=[];target(wind);updateCharacterTalents(wind,1,80);assert.equal(wind.characterState.charge,80);onCharacterCast(wind);assert.equal(wind.projectiles.length,1);assert.equal(wind.characterState.charge,0);onCharacterCast(wind);assert.equal(wind.projectiles.length,1);
  wind.level=30;for(const id of ['r_shot1','r_shot2','r_shot3'])assert(wind.learnTalent(id));wind.time=2;wind.characterState.charge=80;onCharacterCast(wind);assert.equal(wind.projectiles.length,4);assert.equal(wind.projectiles.at(-1).pierce,3);assert(wind.projectiles.at(-1).homing);
  const stride=start(CHARACTERS[2]);stride.level=30;stride.enemies=[];target(stride);for(const id of ['r_roam1','r_roam2','r_roam3'])assert(stride.learnTalent(id));
  updateCharacterTalents(stride,.5,60);onCharacterCast(stride);assert.equal(stride.projectiles.length,1);assert.equal(stride.characterState.nextWind,1);
  stride.dash();assert.equal(stride.characterState.charge,60);assert.equal(stride.characterState.nextWind,0);assert.equal(stride.characterState.ghostUntil,3);
  onCharacterCast(stride);assert.equal(stride.projectiles.length,2);updateCharacterTalents(stride,.1,0);assert.equal(stride.projectiles.length,2,'stationary movement branch cannot auto-fire');
  updateCharacterTalents(stride,.1,1);assert.equal(stride.projectiles.length,3);assert.equal(stride.characterState.charge,1,'automatic wind does not consume movement charge');
  stride.time=.5;updateCharacterTalents(stride,.1,1);assert.equal(stride.projectiles.length,3);stride.time=1;updateCharacterTalents(stride,.1,1);assert.equal(stride.projectiles.length,4);stride.time=3;updateCharacterTalents(stride,.1,1);assert.equal(stride.projectiles.length,4,'dash window expires');
  const embers=start();embers.level=30;embers.enemies=[];const burned=target(embers);embers.grid.rebuild(embers.enemies);
  for(const id of ['w_flame1','w_flame2','w_flame3'])assert(embers.learnTalent(id));
  assert.equal(talentPoints(embers),0);assert(!embers.learnTalent('w_guard2'));assert.equal(embers.stats.armor,0);
  embers.player.shield=0;for(let i=0;i<5;i++){embers.time=i*.4;embers.hit(burned,1,0,37,0,false,'blade')}assert.equal(embers.characterState.charge,0);assert.equal(embers.player.shield,8,'five hits release a full lamp');assert(burned.burn);assert.equal(embers.characterState.echoes.length,1);const beforeEcho=burned.hp;embers.time=2.1;updateCharacterTalents(embers,.5,0);assert(burned.hp<beforeEcho);assert.equal(embers.characterState.echoes.length,0);
  const burn={...burned.burn};embers.passives.embercore=1;embers.hit(burned,1,0,37,0,false,'blade');assert.deepEqual(burned.burn,burn,'weaker burning must not overwrite a talent or delay its next tick');
  for(let i=0;i<2;i++){embers.time+=.4;embers.hit(burned,1,0,37,0,false,'blade')}assert.equal(embers.characterState.procs,1);assert.equal(embers.player.shield,8,'echo does not grant additional shielding');
  const assault=start();assault.level=30;assault.enemies=[];const assaultTarget=target(assault);assault.grid.rebuild(assault.enemies);
  for(const id of ['w_dash1','w_dash2','w_dash3'])assert(assault.learnTalent(id));assault.characterState.nextPulse=10;assault.player.hp=10;assault.player.shield=0;assault.dash();
  assert.equal(assault.characterState.nextPulse,2.5);assert.equal(assault.player.hp,10,'dash pulse does not heal');
  for(let i=0;i<2;i++){assault.time+=.4;assault.hit(assaultTarget,1,0,37,0,false,'blade')}assert.equal(assault.characterState.charge,6);assert.equal(assault.characterState.procs,0);
  assault.time=2.5;assault.hit(assaultTarget,1,0,37,0,false,'blade');assert.equal(assault.characterState.procs,1);assert.equal(assault.characterState.nextPulse,5);assert.equal(assault.player.hp,10);
  assault.time=4.1;assault.hit(assaultTarget,1,0,37,0,false,'blade');assert.equal(assault.characterState.charge,1,'dash amplification expires');
  const levels=start();let awards=0;levels.on=event=>{if(event==='talentPoints')awards++};
  while(levels.level<30){levels.gainXp(levels.xpNext-levels.xp);assert.equal(talentPoints(levels),TALENT_LEVELS.filter(level=>levels.level>=level).length)}assert.equal(awards,3);
  assert.deepEqual(TALENT_LEVELS,[10,20,30]);
  for(const milestone of TALENT_LEVELS){
    const game=start(),events=[];game.level=milestone-1;game.xp=0;game.xpNext=xpForLevel(game.level);game.pendingLevels=2;game.choices=[{key:'preserved'}];game.on=event=>events.push(event);
    assert.equal(talentPoints(game),TALENT_LEVELS.filter(level=>level<milestone).length);game.gainXp(game.xpNext);assert(game.pendingTalentChoice);assert.equal(game.pendingLevels,3);
    game.presentLevelChoices();assert.equal(game.state,'talent');assert.equal(game.pendingLevels,3,'the talent prompt must not spend a queued equipment upgrade');assert.deepEqual(game.choices,[{key:'preserved'}]);assert.equal(events.filter(e=>e==='talentChoice').length,1);assert(!events.includes('level'));
    const at=game.time;game.render=()=>{};game.loop(1000);game.loop(1050);assert.equal(game.time,at,'automatic talent selection freezes combat');
    assert(game.learnTalent('w_flame1'));game.state='running';game.presentLevelChoices();assert.equal(game.state,'level');assert.equal(game.pendingLevels,2);assert(game.choices.length);assert.equal(events.filter(e=>e==='talentChoice').length,1,'old unspent points do not repeatedly open the prompt');
  }
  const heldPoints=start();heldPoints.level=9;heldPoints.xpNext=xpForLevel(9);heldPoints.gainXp(heldPoints.xpNext);heldPoints.presentLevelChoices();assert.equal(heldPoints.state,'talent');heldPoints.state='running';heldPoints.presentLevelChoices();assert.equal(heldPoints.state,'level');assert.equal(talentPoints(heldPoints),1);heldPoints.skipUpgrade();heldPoints.presentLevelChoices();assert.equal(heldPoints.state,'running');assert(heldPoints.learnTalent('w_flame1'),'retained points can be spent later');heldPoints.start(heldPoints.character);assert(!heldPoints.pendingTalentChoice);
  const manyPoints=start();manyPoints.gainXp(Array.from({length:29},(_,i)=>xpForLevel(i+1)).reduce((sum,n)=>sum+n,0));assert.equal(manyPoints.level,30);manyPoints.state='reward';manyPoints.presentLevelChoices();assert.equal(manyPoints.state,'reward','a completed altar reward stays intact');manyPoints.state='running';manyPoints.presentLevelChoices();assert.equal(manyPoints.state,'talent');assert.equal(talentPoints(manyPoints),3);assert.equal(manyPoints.pendingLevels,29);
  console.log('PASS: LV10/20/30 awards, automatic talent priority, frozen selection, retained points and multi-level upgrade queues.');
  const sight=start(CHARACTERS[2]);sight.level=30;sight.enemies=[];sight.stats.criticalChance=0;const markedWind=target(sight,80,37),freshWind=target(sight,120,37);sight.grid.rebuild(sight.enemies);
  for(const id of ['r_sight1','r_sight2'])assert(sight.learnTalent(id));assert.equal(characterHitMultiplier(sight,markedWind,'bolt',false),1);
  for(let i=0;i<3;i++)onCharacterHit(sight,markedWind,'bolt',false);assert.equal(sight.projectiles.length,0,'weapons cannot create wind marks');
  assert.equal(onCharacterProjectileHit(sight,{talent:'wind'},markedWind),1);assert.equal(characterHitMultiplier(sight,markedWind,'bolt',false),1.18);assert.equal(characterHitMultiplier(sight,markedWind,'bolt',true),1.18);
  for(let i=0;i<2;i++)onCharacterHit(sight,markedWind,'bolt',false);assert.equal(sight.projectiles.length,0);onCharacterHit(sight,markedWind,'bolt',false);assert.equal(sight.projectiles.length,1);
  onCharacterHit(sight,markedWind,'talent',true);assert.equal(markedWind.windHits,0,'wind cannot recursively stack pursuit');
  for(let i=0;i<3;i++)onCharacterHit(sight,markedWind,'bolt',false);assert.equal(sight.projectiles.length,1,'pursuit shares a cooldown');
  sight.time=1;assert(sight.learnTalent('r_sight3'));sight.projectiles=[];markedWind.windHits=0;
  onCharacterHit(sight,markedWind,'bolt',false);assert.equal(sight.projectiles.length,0);onCharacterHit(sight,markedWind,'bolt',false);assert.equal(sight.projectiles.length,1,'capstone only needs two weapon hits');
  for(let i=0;i<25;i++)sight.updateProjectiles(.02);
  assert.equal(markedWind.maxHp-markedWind.hp,83);assert.equal(freshWind.maxHp-freshWind.hp,46,'piercing wind boosts only already-marked targets, without compounding');assert.equal(markedWind.windMarkedUntil,7);assert.equal(sight.characterState.procs,2);
  sight.time=7.01;assert.equal(characterHitMultiplier(sight,markedWind,'bolt',false),1);assert.equal(onCharacterProjectileHit(sight,{talent:'wind'},markedWind),1);assert.equal(markedWind.windHits,0,'expired marks reset pursuit hits');
  // Overlapping vulnerability sources retain their own expiry, including the weaker fallback.
  const overlap=start(CHARACTERS[1]);overlap.level=30;overlap.enemies=[];equip(overlap,{starfall:3},{deadeye:3});overlap.stats.criticalChance=0;
  const overlapTarget=target(overlap);overlap.grid.rebuild(overlap.enemies);for(const id of ['s_frost1','s_frost2'])assert(overlap.learnTalent(id));overlap.stats.criticalChance=0;
  onWeaponHit(overlap,overlapTarget,'orbit',true,false);
  overlap.time=1;updateExpandedWeapon(overlap,'starfall',weaponStats('starfall',3,overlap.stats,overlap.character),.05);updateExpandedZone(overlap,overlap.zones[0],1);
  overlap.time=2;onCharacterProjectileHit(overlap,{talent:'star'},overlapTarget);
  for(const [at,expected] of [[2,124],[3,119],[4,118],[5,100]]){
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
    const runner=start(CHARACTERS[2]);runner.enemies=[];runner.level=10;target(runner);if(light)assert(runner.learnTalent('r_roam1'));
    for(let i=0;i<7;i++){runner.time=i*1.05;updateCharacterTalents(runner,1.05,runner.moveSpeed*1.05);onCharacterCast(runner)}
    cadence.push(runner.characterState.procs);
  }
  assert(cadence[1]>cadence[0],'light wind must improve sustained fire at the starting bow cadence');
  // All nine routes inherit only their stated gear and weapon triggers.
  equip(embers,{flame:4,blade:4},{area:5,haste:5});embers.time=20;embers.characterState.charge=0;embers.player.shield=0;
  const outer=target(embers,160,37);embers.grid.rebuild(embers.enemies);const outerHp=outer.hp;
  for(let i=0;i<5;i++){embers.time=20+i*.4;embers.hit(outer,1,0,37,0,false,'flame',true)}
  assert.equal(embers.characterState.procs,2,'fire ticks can fill the expanded lamp');assert(outer.burn&&outer.hp<outerHp-5);assert(Math.abs(embers.characterState.nextPulse-embers.time-4.2)<1e-9);
  assert.equal(characterHitMultiplier(embers,outer,'flame',true),1.2);assert.equal(characterHitMultiplier(embers,outer,'bolt',false),1);
  equip(delayedLamp,{blade:3,orbit:3},{armor:5,regen:5,haste:3});delayedLamp.learnTalent('w_guard3');delayedLamp.player.hp=10;delayedLamp.player.shield=0;delayedLamp.time=20;delayedLamp.characterState.charge=6;const guardHp=waitingEnemy.hp;
  updateCharacterTalents(delayedLamp,.05,0);assert.equal(delayedLamp.player.shield,26);assert.equal(delayedLamp.player.hp,16);assert.equal(guardHp-waitingEnemy.hp,180);assert.equal(characterHitMultiplier(delayedLamp,waitingEnemy,'orbit',false),1.2);assert.equal(characterHitMultiplier(delayedLamp,waitingEnemy,'orbit',true),1);
  equip(assault,{blade:4,flame:4,bolt:4},{speed:5,haste:5});assault.player.dashCooldown=0;assault.timers={blade:1,flame:.2,bolt:1};assault.dash();assert.equal(assault.timers.blade,.25);assert.equal(assault.timers.flame,0);assert.equal(assault.timers.bolt,1);assert(Math.abs(assault.player.dashCooldown-2.1)<1e-9);
  equip(stars,{sentinel:4},{soulpact:3,haste:5,area:4,amount:2});stars.projectiles=[];stars.characterState.starClock=0;updateCharacterTalents(stars,.05,0);
  assert.equal(stars.projectiles.length,6);assert.equal(stars.projectiles[0].r,5.6);assert(Math.abs(stars.projectiles[0].damage-34*1.35*1.54)<1e-9);assert(Math.abs(stars.characterState.starClock-.9*.7*.82)<1e-9);
  stars.timers={};stars.updateWeapons(.05);updateExpandedZone(stars,stars.zones.at(-1),.05);const extraStars=stars.projectiles.filter(p=>p.talent==='star').length;assert.equal(extraStars,7,'real summon cast emits an extra companion star');onCharacterCast(stars,'sentinel');assert.equal(stars.projectiles.filter(p=>p.talent==='star').length,7,'extra star shares its own cooldown');
  equip(cold,{frost:4,bolt:4},{duration:4,area:3,haste:5});cold.time=20;cold.projectiles=[];cold.characterState.nextStar=0;cold.stats.criticalChance=0;onCharacterProjectileHit(cold,{talent:'star'},coldTarget);assert(Math.abs(coldTarget.slow-2.88)<1e-9);assert(Math.abs(coldTarget.freeze-1.92)<1e-9);assert.equal(cold.characterState.nextCold,22.8);
  cold.hit(coldTarget,1,0,37,0,false,'bolt');assert.equal(cold.projectiles.length,1,'weapon hit follows up an actual cold target');onCharacterHit(cold,coldTarget,'talent',true);onCharacterHit(cold,coldTarget,'bolt',false);assert.equal(cold.projectiles.length,1);
  equip(scholar,{bell:4,bolt:4},{growth:5});scholar.time=20;scholar.characterState.xp=0;scholar.characterState.nextWell=0;scholar.timers={bell:1,bolt:1};const spiritMarked=target(scholar,200,37,1);scholar.hit(spiritMarked,1,0,37,0,false,'bell');assert(scholar.drops.at(-1).starLinked,'spirit weapon killing blow recalls XP');const recalled=scholar.characterState.starXp;onXpPickup(scholar,14,true);assert.equal(scholar.characterState.starXp-recalled,21);assert.equal(scholar.characterState.xp,0);assert(Math.abs(scholar.timers.bell-.2)<1e-9);assert.equal(scholar.timers.bolt,1);assert.equal(scholar.player.shield,14);
  equip(wind,{bolt:4},{amount:2,area:4,haste:5});wind.time=20;wind.projectiles=[];wind.characterState.charge=0;wind.characterState.nextQuiver=0;const quiverTarget=target(wind);
  onCharacterHit(wind,quiverTarget,'bolt',false);onCharacterHit(wind,quiverTarget,'bolt',false);assert.equal(wind.characterState.charge,6);wind.time+=.21;onCharacterHit(wind,quiverTarget,'flame',true);assert.equal(wind.characterState.charge,6);onCharacterHit(wind,quiverTarget,'prism',false);assert.equal(wind.characterState.charge,12);
  updateCharacterTalents(wind,.05,80);onCharacterCast(wind,'bolt');assert.equal(wind.projectiles.length,5);assert.equal(wind.projectiles[0].r,5.6);assert(Math.abs(wind.projectiles[0].vx**2+wind.projectiles[0].vy**2-(340*1.4)**2)<1e-6);assert(Math.abs(wind.characterState.nextWind-wind.time-1.05)<1e-9);
  equip(stride,{bolt:4,prism:4,blade:4},{speed:5,haste:5});stride.player.dashCooldown=0;stride.timers={bolt:.2,prism:1,blade:1};stride.dash();assert.equal(stride.characterState.charge,40);assert.equal(stride.timers.bolt,0);assert.equal(stride.timers.prism,.5);assert.equal(stride.timers.blade,1);updateCharacterTalents(stride,.05,1);assert.equal(stride.characterState.nextGhost,stride.time+.56);
  sight.time=20;sight.projectiles=[];equip(sight,{bolt:4},{luck:5,haste:5});sight.stats.criticalChance=1;onCharacterProjectileHit(sight,{talent:'wind'},markedWind);sight.hit(markedWind,1,0,37,0,false,'bolt');assert.equal(sight.projectiles.length,1,'one critical weapon hit counts twice for final pursuit');assert.equal(sight.characterState.nextHunt,20.7);
  for(const character of CHARACTERS)for(const branch of CHARACTER_TALENTS[character.id].branches){
    const meter=start(character);meter.level=30;meter.characterState.charge=character.id==='warden'?6:80;meter.characterState.xp=60;
    for(const node of branch.nodes)assert(meter.learnTalent(node.id));
    for(const at of [0,100]){
      meter.time=at;const progress=characterTalentProgress(meter),summary=characterTalentSummary(meter);
      assert(Number.isFinite(progress.value)&&Number.isFinite(progress.max)&&progress.max>0&&progress.value>=0&&progress.value<=progress.max,'bounded progress after learning '+branch.name);
      assert(!/NaN|Infinity|undefined/.test(progress.label+' '+summary),'valid talent feedback for '+branch.name);
    }
  }
  {
  // Three timed, randomly placed tasks share the actual choice transaction.
  const trialGame=kind=>{const game=start();game.time=60;game.enemies=[];updateWorldEvents(game,0);Object.assign(game.shrines[0],{kind,index:ALTAR_ORDER.indexOf(kind),goal:kind==='vigil'?12:kind==='hunt'?1:6});assert.equal(game.shrines.length,1);Object.assign(game.player,{x:game.shrines[0].x,y:game.shrines[0].y,hp:40,shield:0});game.spawnClock=game.waveClock=1e9;game.xpNext=1e9;game.bossMilestones=new Set([180,360,600]);return game};
  const completeTask=game=>{const s=game.activeEvent;if(s.kind==='hunt')game.kill(s.guardian);else if(s.kind==='vigil')s.progress=s.goal;else for(const mote of s.motes)Object.assign(mote,{x:game.player.x,y:game.player.y});updateWorldEvents(game,.05)};
  const scheduled=start(),spawned=[];assert.equal(scheduled.shrines.length,0);
  for(const time of [59.99,60,239.99,240,419.99,420,600,900]){scheduled.time=time;Object.assign(scheduled.player,{x:time*2,y:-time});updateWorldEvents(scheduled,0);assert.equal(scheduled.shrines.length,ALTAR_TIMES.filter(t=>time>=t).length);const fresh=scheduled.shrines.at(-1);if(fresh&&!spawned.includes(fresh)){spawned.push(fresh);const d=Math.hypot(fresh.x-scheduled.player.x,fresh.y-scheduled.player.y);assert(d>=179&&d<=261)}}
  assert.equal(spawned.length,3);assert.deepEqual(spawned.map(s=>s.kind),ALTAR_ORDER);assert.equal(scheduled.shrines.filter(s=>s.state==='idle').length,3);
  Object.assign(scheduled.player,{x:spawned[2].x,y:spawned[2].y});assert.equal(nearestWorldEvent(scheduled),spawned[0],'a nearer late altar cannot bypass the easy task');assert(!scheduled.interact());
  assert.equal(scheduled.eventsFailed,0);const retained=scheduled.shrines[0];Object.assign(scheduled.player,{x:retained.x,y:retained.y});assert.equal(nearestWorldEvent(scheduled),retained);assert(worldEventStatus(scheduled).canStart,'unaccepted altars can still be accepted after minute nine');assert(scheduled.interact());assert.equal(scheduled.activeEvent,retained);scheduled.end(false);assert.equal(scheduled.eventsFailed,1);assert.equal(scheduled.shrines.filter(s=>s.state==='idle').length,2,'ending the run only fails an accepted task');
  const alternate=start();alternate.time=60;updateWorldEvents(alternate,0);assert.notEqual(alternate.shrines[0].x,scheduled.shrines[0].x,'positions are rolled anew');
  const failedOrder=start();for(const time of ALTAR_TIMES){failedOrder.time=time;updateWorldEvents(failedOrder,0)}Object.assign(failedOrder.player,{x:failedOrder.shrines[0].x,y:failedOrder.shrines[0].y});assert(failedOrder.interact());failedOrder.time+=45;updateWorldEvents(failedOrder,0);assert.equal(nearestWorldEvent(failedOrder),failedOrder.shrines[1],'a failed early task advances to the next task');assert.equal(failedOrder.gold,0);
  for(const kind of Object.keys(EVENT_TYPES)){
    const game=trialGame(kind);game.update(.05);assert.equal(game.player.hp,40);assert.equal(game.gold,0);assert.equal(game.xp,0);assert.equal(game.eventsCompleted,0);
    assert(worldEventStatus(game).detail.includes(EVENT_TYPES[kind].hint));assert(game.interact());assert(!startWorldEvent(game));const shrine=game.activeEvent;
    if(kind==='vigil'){game.player.x+=100;updateWorldEvents(game,2);assert.equal(shrine.progress,0);game.player.x-=100}
    completeTask(game);assert.equal(game.state,'reward');assert.equal(game.eventsCompleted,1);assert.equal(game.eventChoices.length,3);assert.equal(new Set(game.eventChoices).size,3);assert.equal(game.boons.length,0);assert.equal(game.weapons.blade,1);assert.equal(game.xp,0);assert.equal(game.rerolls,3);assert.equal(game.player.shield,0,'no old automatic event payout');
    assert(!game.interact());assert(!game.chooseAltarReward(3));assert(!game.chooseAltarReward('0'));
    const choices=[...game.eventChoices],pending=game.pendingLevels;game.pause();updateWorldEvents(game,99);assert(!game.chooseAltarReward(0));assert.deepEqual(game.eventChoices,choices);game.resume();assert.equal(game.state,'reward');assert.equal(game.pendingLevels,pending);
    const id=choices[0],gold=game.gold;assert(game.chooseAltarReward(0));assert.deepEqual(game.boons,[id]);assert.equal(game.state,'running');assert.equal(game.eventChoices.length,0);assert(!game.chooseAltarReward(1),'one task pays once');
    const bonus=ALTAR_REWARDS[ALTAR_ORDER.indexOf(kind)];assert.equal(game.gold,gold+bonus.gold);assert.equal(game.xp,bonus.xp*game.xpMultiplier);assert.equal(game.altarRewardIndex,null);assert(game.eventReward.rewards.includes('余烬 +'+bonus.gold));
    assert(!game.drops.some(d=>d.type==='chest'),'hunt guardians do not also drop a chest');
    const current=game.stats;game.openChest(25);assert.deepEqual(game.stats.boons,[id]);assert.equal(game.stats.damageTakenMultiplier,current.damageTakenMultiplier,'rebuilding equipment keeps the bargain');
    game.start(game.character);assert.deepEqual(game.boons,[]);assert.deepEqual(game.eventChoices,[]);assert.deepEqual(game.weaponEmpowerments,{});
  }
  for(const id of Object.keys(ALTAR_BOONS)){
    const game=trialGame('vigil'),plain=characterStats(game.character);assert(game.interact());completeTask(game);game.eventChoices=[id];assert(game.chooseAltarReward(0));const boon=ALTAR_BOONS[id];
    assert(boon.positive&&boon.negative&&(Object.keys(boon.multiply||{}).length||Object.keys(boon.add||{}).length)&&Object.keys(boon.difficulty).length,'every boon has a real gain and enemy-pressure cost');
    for(const [key,factor] of Object.entries(boon.multiply||{})){const expected=key==='maxHp'?Math.round(plain[key]*factor):plain[key]*factor;assert(Math.abs(game.stats[key]-expected)<1e-9,id+' '+key)}
    for(const [key,value] of Object.entries(boon.add||{}))assert.equal(game.stats[key],plain[key]+value,id+' '+key);
    assert(Math.abs(game.player.hp-Math.min(game.player.maxHp,game.player.maxHp*40/90+20))<1e-9,'apply completion healing after preserving the health percentage');
    game.level=30;assert(game.learnTalent('w_flame1'));assert.deepEqual(game.stats.boons,[id],'learning a talent retains a bargain');
    const valued=weaponStats('bolt',2,game.stats,game.character);assert(Number.isFinite(valued.damage)&&valued.cooldown>0);
  }
  const skipped=trialGame('vigil');assert(skipped.interact());completeTask(skipped);assert(skipped.chooseAltarReward(-1));assert.equal(skipped.weapons.blade,2);assert.equal(skipped.boons.length,0);
  for(const [index,kind] of ALTAR_ORDER.entries()){
    const g=trialGame(kind);assert(g.interact());completeTask(g);const gold=g.gold;assert(g.chooseAltarReward(-1));assert.equal(g.weapons.blade,2+index);assert.equal(g.gold,gold+ALTAR_REWARDS[index].gold);assert.equal(g.xp,ALTAR_REWARDS[index].xp);assert.equal(g.player.hp,40+ALTAR_REWARDS[index].heal);
    const maxed=trialGame(kind);equip(maxed,{blade:6});assert(maxed.interact());completeTask(maxed);assert(maxed.chooseAltarReward(-1));assert.equal(maxed.weaponEmpowerments.blade,index+1);
  }
  const crossed=trialGame('hunt');crossed.time=420;equip(crossed,{blade:5});assert(crossed.interact());completeTask(crossed);assert(crossed.chooseAltarReward(-1));assert.equal(crossed.weapons.blade,6);assert.equal(crossed.weaponEmpowerments.blade,2,'remaining bonus rolls turn into tempering after reaching the level cap');
  const wholeRun=trialGame('vigil');
  for(const at of ALTAR_TIMES){wholeRun.time=at;updateWorldEvents(wholeRun,0);const s=wholeRun.shrines.at(-1);Object.assign(wholeRun.player,{x:s.x,y:s.y});wholeRun.enemies=[];assert(wholeRun.interact());completeTask(wholeRun);assert(wholeRun.eventChoices.every(id=>!wholeRun.boons.includes(id)));assert(wholeRun.chooseAltarReward(0))}
  assert.equal(wholeRun.eventsCompleted,3);assert.equal(wholeRun.boons.length,3);wholeRun.time=900;updateWorldEvents(wholeRun,0);assert.equal(wholeRun.shrines.length,3);
  const timedVigil=trialGame('vigil');timedVigil.interact();updateWorldEvents(timedVigil,11.9);assert.equal(timedVigil.state,'running');assert.equal(timedVigil.activeEvent.progress,11.9);updateWorldEvents(timedVigil,.11);assert.equal(timedVigil.state,'reward','twelve accumulated seconds actually complete the vigil');
  const waitingTalent=trialGame('vigil');waitingTalent.interact();completeTask(waitingTalent);const heldChoices=[...waitingTalent.eventChoices];waitingTalent.level=10;waitingTalent.state='status';waitingTalent.statusReturn='reward';assert(waitingTalent.learnTalent('w_flame1'));assert.deepEqual(waitingTalent.eventChoices,heldChoices,'talent inspection and learning do not reroll altar choices');
  const actual=boon=>{const game=trialGame('vigil');game.interact();completeTask(game);game.eventChoices=[boon];game.chooseAltarReward(0);game.enemies=[];game.drops=[];game.player.x=0;game.player.y=37;game.stats.criticalChance=0;return game};
  const areaBoon=actual('horizon'),far=target(areaBoon,90,37);areaBoon.grid.rebuild(areaBoon.enemies);areaBoon.timers={};const farHp=far.hp;areaBoon.updateWeapons(.01);assert(far.hp<farHp,'expanded blade really hits outside the original range');
  const doubleBoon=actual('twins');equip(doubleBoon,{bolt:1});doubleBoon.stats=characterStats(doubleBoon.character,{}, {},{},doubleBoon.weapons,doubleBoon.boons);target(doubleBoon);doubleBoon.updateWeapons(.01);assert.equal(doubleBoon.projectiles.length,3,'extra shots are spawned by the actual weapon');
  const speedBoon=actual('frenzy');target(speedBoon);speedBoon.updateWeapons(.01);assert(speedBoon.timers.blade<.83,'frenzy changes the real weapon timer');
  const growthBoon=actual('harvest');assert.equal(growthBoon.gainXp(10),13.5);const regenBoon=actual('renewal');regenBoon.player.hp=10;regenBoon.update(1);assert(Math.abs(regenBoon.player.hp-10.8)<1e-9,'regeneration acts in the live loop');
  const starBoon=start(CHARACTERS[1]);starBoon.boons=['souls'];starBoon.stats=characterStats(starBoon.character,{}, {},{},starBoon.weapons,starBoon.boons);starBoon.enemies=[];target(starBoon);updateCharacterTalents(starBoon,1,0);assert(Math.abs(starBoon.projectiles[0].damage-10.8*1.45)<1e-9,'companion stars inherit the altar soul benefit');
  const maxed=trialGame('vigil');equip(maxed,{solar:3,blade:6});assert(maxed.interact());completeTask(maxed);const hp=maxed.player.hp;assert(maxed.chooseAltarReward(-1));assert.equal(Object.keys(maxed.weaponEmpowerments).length,1);const key=Object.keys(maxed.weaponEmpowerments)[0],base=weaponStats(key,maxed.weapons[key],characterStats(maxed.character,{}, {},{},maxed.weapons),maxed.character);assert(Math.abs(weaponStats(key,maxed.weapons[key],maxed.stats,maxed.character).damage/base.damage-1.12)<1e-9);assert.equal(maxed.player.hp,Math.min(maxed.player.maxHp,hp+20),'skipping retains the completion healing');
  const pendingTrial=trialGame('vigil');pendingTrial.pendingLevels=2;assert(pendingTrial.interact());pendingTrial.activeEvent.progress=12;pendingTrial.update(.01);assert.equal(pendingTrial.state,'reward');assert.equal(pendingTrial.pendingLevels,2);pendingTrial.chooseAltarReward(-1);pendingTrial.update(.01);assert.equal(pendingTrial.state,'level');assert.equal(pendingTrial.pendingLevels,1,'reward choice preserves queued level upgrades');
  const xpTrial=trialGame('vigil');xpTrial.level=9;xpTrial.xpNext=80;assert(xpTrial.interact());completeTask(xpTrial);assert.equal(xpTrial.level,9);xpTrial.chooseAltarReward(-1);assert.equal(xpTrial.level,10);assert.equal(xpTrial.pendingLevels,1);assert(xpTrial.pendingTalentChoice);xpTrial.presentLevelChoices();assert.equal(xpTrial.state,'talent','completion XP respects talent-before-equipment priority');
  const expiredTrial=trialGame('vigil');assert(expiredTrial.interact());expiredTrial.state='paused';updateWorldEvents(expiredTrial,12);assert.equal(expiredTrial.activeEvent.progress,0);expiredTrial.state='running';expiredTrial.player.hp=0;updateWorldEvents(expiredTrial,12);assert.equal(expiredTrial.eventsCompleted,0);expiredTrial.player.hp=40;expiredTrial.time=105;updateWorldEvents(expiredTrial,.05);assert.equal(expiredTrial.eventsFailed,1);assert.equal(expiredTrial.gold,0);assert.equal(expiredTrial.eventChoices.length,0);
  const bossTrial=trialGame('souls');assert(bossTrial.interact());bossTrial.spawnBoss(180);updateWorldEvents(bossTrial,.05);assert.equal(bossTrial.eventsFailed,1);assert.equal(bossTrial.activeEvent,null);
  const soulGuide=trialGame('souls');soulGuide.interact();const soulAltar=soulGuide.activeEvent,nearestMote=worldEventTarget(soulGuide);assert(nearestMote&&soulAltar.motes.includes(nearestMote));assert.equal(Math.hypot(nearestMote.x-soulGuide.player.x,nearestMote.y-soulGuide.player.y),Math.min(...soulAltar.motes.map(m=>Math.hypot(m.x-soulGuide.player.x,m.y-soulGuide.player.y))));assert(worldEventStatus(soulGuide).detail.includes('魂光 0/6'));assert(worldEventStatus(soulGuide).guide.includes('青白光柱'));Object.assign(soulGuide.player,{x:nearestMote.x,y:nearestMote.y});updateWorldEvents(soulGuide,0);assert(nearestMote.collected);assert.notEqual(worldEventTarget(soulGuide),nearestMote);assert.equal(soulAltar.progress,1);
  for(const kind of Object.keys(EVENT_TYPES)){
    const guidance=trialGame(kind),messages=[];guidance.on=(event,data)=>messages.push({event,data});assert(guidance.interact());assert.equal(guidance.bannerUntil,guidance.time+3);
    assert(messages.some(m=>m.event==='banner'&&m.data.title.includes({vigil:'灯圈',hunt:'守卫',souls:'魂光'}[kind])),'brief instructions identify the task');
    guidance.lastPhase=pressureAt(guidance.time).index;Object.assign(guidance.player,{x:guidance.player.x+90,y:guidance.player.y+90,invincible:9});for(let i=0;i<65;i++)guidance.update(.05);
    assert(messages.some(m=>m.event==='bannerHide'),'task instructions dismiss after three seconds');assert(guidance.activeEvent,'dismissing the hint leaves the task running');
    const labels=[],g=new Proxy({fillText:(text,x,y)=>labels.push({text,x,y})},{get:(o,key)=>o[key]??(()=>{})});
    const objective=worldEventTarget(guidance),label={vigil:'守灯仪式',hunt:'守卫',souls:'魂光'}[kind],d=Math.round(Math.hypot(objective.x-guidance.player.x,objective.y-guidance.player.y));
    drawWorldEvents(guidance,g,guidance.w/2-objective.x,guidance.h/2-objective.y);
    assert(labels.some(l=>l.text.includes(label)&&l.text.endsWith(' · '+d)),'on-map objective has the current distance');
    for(const [dx,dy] of [[2000,0],[-2000,0],[0,2000],[0,-2000]]){
      labels.length=0;guidance.drawCompass(g,{x:objective.x-dx,y:objective.y-dy},320,568);
      assert(labels.some(l=>l.text.endsWith(' · '+d)&&l.x>=50&&l.x<=270&&l.y>=0&&l.y<=568),'off-screen direction retains distance inside each map edge');
    }
  }
  const fullTrial=trialGame('hunt');fullTrial.pressure.cap=0;assert(!fullTrial.interact());fullTrial.pressure.cap=2;assert(fullTrial.interact());fullTrial.time=65;updateWorldEvents(fullTrial,.05);assert.equal(fullTrial.enemies.length,2);
  const soulBoon=characterStats(CHARACTERS[1],{}, {},{}, {orbit:1},['souls']);assert.equal(weaponStats('orbit',1,soulBoon,CHARACTERS[1]).damage/weaponStats('orbit',1,characterStats(CHARACTERS[1]),CHARACTERS[1]).damage,1.45);assert.equal(weaponStats('blade',1,soulBoon,CHARACTERS[1]).damage,weaponStats('blade',1,characterStats(CHARACTERS[1]),CHARACTERS[1]).damage);
  const fragile=start();fragile.boons=['stride'];fragile.stats=characterStats(fragile.character,{}, {},{},fragile.weapons,fragile.boons);fragile.player.shield=0;fragile.player.invincible=0;fragile.hurt(25,0,0);assert.equal(fragile.damageTaken,25,'stride no longer penalizes the hero; enemies carry its cost');
  for(const milestone of [180,360,600]){const bossGame=start();bossGame.enemies=[];bossGame.spawnBoss(milestone);const boss=bossGame.enemies.find(e=>e.boss);bossGame.kill(boss);assert.equal(bossGame.drops.filter(d=>d.type==='magnet').length,1);bossGame.kill(boss);assert.equal(bossGame.drops.filter(d=>d.type==='magnet').length,1,'no duplicate boss drop');bossGame.drops.push({type:'xp',x:2000,y:2000,value:10,r:3,age:0});const magnet=bossGame.drops.find(d=>d.type==='magnet');Object.assign(magnet,{x:bossGame.player.x,y:bossGame.player.y});bossGame.updateDrops(.01);assert(bossGame.drops.filter(d=>d.type==='xp').every(d=>d.attracted),'boss magnet attracts even off-screen XP');}
  const chestTrial=start();equip(chestTrial,{blade:6},{growth:5});chestTrial.player.hp=chestTrial.player.maxHp-5;const chestRewards=chestTrial.openChest(60);assert.equal(chestRewards.length,4);assert(chestRewards.slice(0,2).every(text=>text.includes('+')&&!text.includes('LV.')));assert.deepEqual(chestRewards.slice(2),['生命 +5','余烬 +60']);assert(Object.keys(chestTrial.weaponUpgrades.blade).length>0);assert.equal(chestTrial.weapons.blade,6);assert.equal(chestTrial.xp,0);
  chestTrial.banished.add('blade');assert.deepEqual(chestTrial.openChest(60),['经验 +36（无可强化装备）','经验 +36（无可强化装备）','余烬 +60']);
  const pausedTrial=trialGame('vigil');pausedTrial.pause();assert(!worldEventStatus(pausedTrial).canStart);assert(!pausedTrial.interact());
  for(const id of Object.keys(ALTAR_BOONS)){
    const boon=actual(id),plain=characterStats(boon.character);
    for(const key of ['damageMultiplier','maxHp','moveSpeed','xpMultiplier','pickupRadius','areaMultiplier'])assert(boon.stats[key]>=plain[key],id+' has no hero-stat penalty');
    assert(boon.stats.haste<=plain.haste&&boon.stats.dashCooldown<=plain.dashCooldown);
    const baseline=pressureAt(240),modified=pressureAt(240,0,boon.stats.difficulty);boon.time=240;
    const enemy=boon.spawnEnemy('knight');assert.equal(enemy.maxHp,ENEMIES.knight.hp*modified.hp);assert.equal(enemy.damage,ENEMIES.knight.damage*modified.damage);assert.equal(enemy.speed,ENEMIES.knight.speed*modified.speed);
    assert.equal(modified.hp/baseline.hp,boon.stats.difficulty.hp);assert.equal(modified.damage/baseline.damage,boon.stats.difficulty.damage);
    assert(Object.values(boon.stats.difficulty).some((value,index)=>value!==Object.values(plain.difficulty)[index]),id+' changes actual enemy pressure');
    boon.enemies=[];boon.spawnBoss(600);const bosses=boon.enemies.filter(e=>e.final);assert.equal(bosses.length,1+boon.stats.difficulty.bosses);assert.equal(bosses[0].maxHp,42000*boon.stats.difficulty.hp);assert.equal(bosses[0].damage,52*boon.stats.difficulty.damage);assert.equal(bosses[0].speed,45*boon.stats.difficulty.speed);
  }
  const stacked=characterStats(CHARACTERS[0],{}, {},{}, {},['horizon','harvest','horizon','frenzy','precision','glass','twins']);assert.deepEqual(stacked.difficulty,{hp:1,damage:1,speed:1,population:2,elite:2,bosses:2});
  const population=boons=>{
    const g=start();g.enemies=[];g.time=240;g.boons=boons;g.stats=characterStats(g.character,{}, {},{},g.weapons,boons);g.pressure=pressureAt(g.time,0,g.stats.difficulty);g.waveCount=0;g.spawnWave();
    return {count:g.enemies.length,cap:g.pressure.cap,interval:g.pressure.interval};
  };
  const normalPopulation=population([]),densePopulation=population(['horizon']);assert.equal(densePopulation.count,normalPopulation.count*1.5,'the actual wave contains 50% more enemies');assert.equal(densePopulation.interval,normalPopulation.interval/1.5);assert.equal(densePopulation.cap,Math.round(normalPopulation.cap*1.5));
  const arrivals=(boons,dt)=>{
    const g=start();g.time=240;g.enemies=[];g.nextShrine=3;g.bossMilestones=new Set([180,360,600]);g.waveClock=1e9;g.spawnClock=0;g.xpNext=1e9;g.stats=characterStats(g.character,{}, {},{},g.weapons,boons);let count=0;const spawn=g.spawnEnemy;
    g.spawnEnemy=function(...args){count++;return spawn.apply(this,args)};
    for(let i=0;i<Math.round(60/dt);i++){g.update(dt);g.enemies=[]}return count;
  };
  for(const dt of [.025,.05])assert(Math.abs(arrivals(['horizon'],dt)/arrivals([],dt)-1.5)<.02,'50% more regular arrivals survive real frame intervals');
  assert.equal(pressureAt(179.99).eliteChance,0);assert.equal(pressureAt(180).eliteChance,.02);
  const eliteRoll=Math.random;Math.random=()=>.025;
  try{for(const boons of [[],['frenzy']]){
    const g=start();g.time=240;g.enemies=[];g.boons=boons;g.stats=characterStats(g.character,{}, {},{},g.weapons,boons);g.spawnClock=0;g.waveClock=1e9;g.bossMilestones=new Set([180,360,600]);g.update(.01);
    assert.equal(g.enemies.length,4);assert(g.enemies.every(e=>e.elite===!!boons.length),'a 2.5% roll lies between the actual 2% and 3% elite chances');
  }}finally{Math.random=eliteRoll}
  const multiboss=start();multiboss.time=179.99;multiboss.enemies=[];multiboss.spawnClock=multiboss.waveClock=1e9;multiboss.xpNext=1e9;multiboss.update(.02);assert.equal(multiboss.enemies.filter(e=>e.boss).length,1);
  for(const id of ['glass','twins']){multiboss.enemies=[];multiboss.state='reward';multiboss.eventChoices=[id];assert(multiboss.chooseAltarReward(0));multiboss.time=id==='glass'?359.99:599.99;multiboss.update(.02);assert.equal(multiboss.enemies.filter(e=>e.boss).length,id==='glass'?2:3,'extra bosses apply only to future milestone waves')}
  const finals=multiboss.enemies.filter(e=>e.final);multiboss.kill(finals[0]);assert(!multiboss.finalDefeated);multiboss.update(.01);assert(!multiboss.ended,'one defeated final boss cannot end a multi-boss fight');
  multiboss.kill(finals[1]);assert(!multiboss.finalDefeated);multiboss.kill(finals[2]);assert(multiboss.finalDefeated);assert.equal(multiboss.drops.filter(d=>d.type==='magnet').length,3);let settlements=0;multiboss.on=event=>{if(event==='end')settlements++};multiboss.update(.01);multiboss.end(true);assert.equal(settlements,1,'victory settles exactly once after all final bosses die');
  multiboss.start(multiboss.character);assert.deepEqual(multiboss.stats.difficulty,{hp:1,damage:1,speed:1,population:1,elite:1,bosses:0});
  }
  console.log('PASS: all twelve altar costs increase enemy pressure; density, elite rolls, future boss waves, all-boss victory and run reset.');
  {
    for(const boons of [[],['horizon','frenzy','glass'],['horizon','harvest','frenzy','precision','glass','twins']]){
      const g=start();g.boons=boons;equip(g,{blade:1});g.enemies=[];g.time=300;
      for(let i=0;i<30;i++){const elite=g.spawnEnemy('skeleton',true);g.kill(elite);g.kill(elite)}
      assert.equal(g.drops.filter(d=>d.type==='chest').length,0);assert.equal(g.drops.filter(d=>d.type==='xp').length,30);assert(g.drops.filter(d=>d.type==='xp').every(d=>d.elite&&d.value===ENEMIES.skeleton.xp*8));
      for(const milestone of [180,360,600])g.spawnBoss(milestone);
      const bosses=g.enemies.filter(e=>e.boss),count=1+g.stats.difficulty.bosses;
      for(const milestone of [360,180,600]){
        const wave=bosses.filter(e=>e.bossWave===milestone);assert.equal(wave.length,count);const before=g.drops.filter(d=>d.type==='chest').length;
        for(const [index,boss] of wave.reverse().entries()){g.kill(boss);g.kill(boss);assert.equal(g.drops.filter(d=>d.type==='chest').length,before+(index===count-1?1:0),'each overlapping boss wave pays once on its last death')}
      }
      assert.equal(g.drops.filter(d=>d.type==='chest').length,3);assert.equal(g.drops.filter(d=>d.type==='magnet').length,count*3);assert.equal(g.drops.filter(d=>d.type==='xp').length,30+count*3);
    }
    console.log('PASS: normal and stacked population/elite/boss contracts retain 8x elite XP and one chest per completed boss wave, with per-boss magnets and no duplicate rewards.');
  }
  {
    const expedition=(stage='foundry',character=CHARACTERS[3])=>{const g=start(character);g.start(character,{}, {stage});g.enemies=[];g.stats.criticalChance=0;g.player.invincible=0;return g};
    assert.equal(expedition('__proto__').stage,'graveyard');
    for(const stage of Object.keys(STAGES)){
      const g=expedition(stage);for(let time=0;time<=720;time+=60){const p=pressureAt(time,0,{},stage);assert(Object.entries(p.roster).every(([key,weight])=>ENEMIES[key]&&weight>0));assert(Number.isFinite(p.hp))}
      g.time=30;updateExpedition(g);assert.equal(g.hazards.length,stage==='graveyard'?0:stage==='foundry'?3:1);
      const first=g.hazards.length;updateExpedition(g);assert.equal(g.hazards.length,first,'hazards obey their schedule');
      g.hazards=[];g.time=100;g.activeEvent={};updateExpedition(g);assert.equal(g.hazards.length,0,'no environment hazard during an altar challenge');g.activeEvent=null;
      g.boons=['glass'];equip(g,{},{});
      for(const [i,milestone] of [180,360,600].entries()){
        g.time=milestone;g.spawnBoss(milestone);const bosses=g.enemies.filter(e=>e.boss&&!e.dead);assert.equal(bosses.length,2);assert(bosses.every(e=>e.name===STAGES[stage].bosses[i]));
        for(const boss of bosses){boss.attack=0;g.updateEnemy(boss,.05)}
        if(stage==='coast')assert(g.hazards.some(h=>h.type==='tide'),'coast boss uses its own attack');
        if(stage==='foundry')assert(g.hazards.some(h=>h.type==='blast'),'foundry boss uses its own attack');
        const before=g.drops.filter(d=>d.type==='chest').length;g.kill(bosses[0]);assert.equal(g.drops.filter(d=>d.type==='chest').length,before);g.kill(bosses[1]);assert.equal(g.drops.filter(d=>d.type==='chest').length,before+1);
      }
      assert(g.finalDefeated);g.end(true);assert.equal(g.result.stage,stage);assert.equal(g.reward-g.earnedEmbers,STAGES[stage].reward);
    }
    for(const [x,y,hit] of [[0,37,false],[30,37,false],[32,37,true],[90,37,true],[90,65,false],[270,37,false],[264,37,true]]){
      const g=expedition('coast');g.player.x=x;g.player.y=y;const hp=g.player.hp;g.hazards=[{type:'tide',x:0,y:37,gap:0,r:260,t:1,max:1,damage:20}];g.updateHazards(.99);assert.equal(g.player.hp,hp,'warning does no damage');g.updateHazards(.02);assert.equal(g.player.hp<hp,hit,'tide collision '+x+','+y);assert.equal(g.hazards.length,0);
    }
    const guard=expedition(),iron=guard.spawnEnemy('bulwark');Object.assign(iron,{x:50,y:37,hp:1000,maxHp:1000,speed:0,guardAngle:Math.PI});guard.hit(iron,100,0,37,0,false);assert.equal(iron.hp,945);guard.hit(iron,100,100,37,0,false);assert.equal(iron.hp,845,'rear damage bypasses shield');guard.hit(iron,100,0,37,0,false,null,true);assert.equal(iron.hp,745,'status damage bypasses shield');guard.player.x=100;guard.updateEnemy(iron,.1);assert(Math.abs(iron.guardAngle-Math.PI)<.1,'guard cannot turn instantly');
    const summon=expedition(),priest=summon.spawnEnemy('oracle');Object.assign(priest,{x:100,y:37,attack:0});summon.updateEnemy(priest,.05);const children=summon.enemies.filter(e=>e.summoned);assert.equal(children.length,2);const gold=summon.gold;for(const child of children)summon.kill(child);assert.equal(summon.gold,gold);assert.equal(summon.drops.length,0,'summons cannot farm supplies or zero-value XP');
    for(const kind of ['siren','cinderling']){const g=expedition(),e=g.spawnEnemy(kind);Object.assign(e,{x:100,y:37,attack:0});g.updateEnemy(e,.05);assert(g.projectiles.some(b=>b.enemy&&b.damage>0),kind+' really shoots')}
    const fuse=expedition(),bomber=fuse.spawnEnemy('bomber');Object.assign(bomber,{x:45,y:37,speed:0});fuse.updateEnemy(bomber,.05);assert(bomber.fuse>1);const before=fuse.player.hp;fuse.updateEnemy(bomber,1.4);assert(bomber.dead&&fuse.player.hp<before,'bomber waits then explodes');
    const frozenBomb=expedition(),held=frozenBomb.spawnEnemy('bomber');Object.assign(held,{x:45,y:37,speed:0});frozenBomb.updateEnemy(held,.05);held.freeze=3;held.x=60;frozenBomb.updateEnemy(held,1);frozenBomb.updateHazards(1);assert.equal(frozenBomb.hazards[0].x,60);assert.equal(frozenBomb.hazards[0].t,1.35,'freeze retains the real fuse warning');frozenBomb.kill(held);frozenBomb.updateHazards(.01);assert.equal(frozenBomb.hazards.length,0,'killing the bomber cancels the warning');
    const rush=expedition('coast'),leech=rush.spawnEnemy('leech');Object.assign(leech,{x:100,y:37,speed:0,attack:0});rush.updateEnemy(leech,.05);assert(leech.lungeWindup>0);rush.updateEnemy(leech,1.01);rush.updateEnemy(leech,.1);assert(leech.x<100,'leech lunges after its warning');
    for(const character of CHARACTERS.slice(3))for(const branch of CHARACTER_TALENTS[character.id].branches){
      const g=expedition('graveyard',character);g.level=30;equip(g,{[character.weapon]:1,bolt:1},{armor:3});g.player.hp=20;g.player.shield=0;const victims=Array.from({length:7},(_,i)=>target(g,32+i*5,37,1e7));g.grid.rebuild(g.enemies);
      const charge=()=>{g.time+=4;if(character.id==='smith')for(let i=0;i<8;i++){g.time+=.3;g.hit(victims[0],1,0,37,0,false,'capacitor')}else updateCharacterTalents(g,1,90)};
      charge();assert(g.characterState.procs>0&&g.damageByWeapon.talent>0,'unlearned innate deals damage');
      for(const node of branch.nodes){assert(g.learnTalent(node.id));charge();assert(g.characterState.procs>1)}
      if(branch===CHARACTER_TALENTS.smith.branches[0]){assert(victims.filter(e=>e.markUntil>g.time).length===6);assert(characterTalentSummary(g).includes('6 层'))}
      if(branch===CHARACTER_TALENTS.smith.branches[1]){assert.equal(g.player.shield,34);assert(g.player.hp>20);assert(g.damageByWeapon.talent>0)}
      if(branch===CHARACTER_TALENTS.mariner.branches[0])assert(victims.every(e=>e.freeze>=1));
      if(branch===CHARACTER_TALENTS.mariner.branches[1]){assert.equal(g.player.shield,18);assert(g.player.hp>20);assert(victims.every(e=>e.markUntil>g.time))}
      if(branch.nodes[0].id.includes('_guard'))assert(compatibleWeapons('bulwark',g.weapons,{},g.talents,g.character.id).length,'new shield talents enable shield-break relics');
      if(branch.nodes[0].id.includes('_dash')){g.timers={[character.weapon]:5,bolt:5};g.player.dashCooldown=0;const damage=g.damageByWeapon.talent;g.dash();assert(g.damageByWeapon.talent>damage,'dash route adds actual damage');assert(g.timers[character.weapon]<5,'dash advances matching cooldown')}
      assert(!/undefined|NaN/.test(characterTalentSummary(g)));g.start(character);assert.equal(g.characterState.procs,0);assert.equal(g.characterState.charge,0);
    }
    const circuit=expedition();equip(circuit,{capacitor:1},{circuit:3});const origin=target(circuit,40,37,1e7),other=target(circuit,70,37,1e7);circuit.grid.rebuild(circuit.enemies);for(let i=0;i<6;i++)circuit.hit(origin,1,0,37,0,false,'capacitor');assert.equal(circuit.relicProcs.circuit,1);assert(other.hp<other.maxHp);assert.equal(circuit.circuitCharge,0,'secondary arcs do not charge themselves');
    const brine=expedition('coast');equip(brine,{tide:1},{brine:3});const salted=target(brine);brine.hit(salted,1,0,37,0,false,'tide');assert(salted.slow>2&&Math.abs(salted.marks.brine.multiplier-1.16)<1e-9);
    assert.deepEqual(compatibleWeapons('rime',{blade:1},{},{},'mariner'),['blade']);assert.deepEqual(compatibleWeapons('bulwark',{bolt:1},{emberheart:1},{},'smith'),['bolt']);
    const wake=expedition();equip(wake,{bolt:1},{wake:3});wake.player.lastX=1;wake.player.lastY=0;wake.dash();assert.equal(wake.projectiles.length,5);assert(wake.projectiles.every(b=>b.vx<0&&b.refracted));
    const jar=expedition();equip(jar,{}, {souljar:3});for(let i=0;i<11;i++)jar.kill(target(jar));assert.equal(jar.projectiles.length,0);const child=target(jar);child.summoned=true;jar.kill(child);assert.equal(jar.projectiles.length,0);jar.kill(target(jar));assert.equal(jar.projectiles.length,3);assert.equal(jar.souljarCharge,0);
    const dial=expedition();equip(dial,{bolt:1,capacitor:1},{sundial:3});dial.timers={bolt:2,capacitor:5};for(let i=0;i<5;i++)onWeaponCast(dial,'bolt');assert.equal(dial.timers.capacitor,3.5);assert.equal(dial.timers.bolt,2);
    const heart=expedition();equip(heart,{}, {emberheart:3});heart.player.hp=30;heart.player.shield=0;const elite=target(heart);elite.elite=true;heart.kill(elite);assert.equal(heart.player.hp,38);assert.equal(heart.player.shield,16);heart.kill(elite);assert.equal(heart.player.hp,38,'a corpse cannot heal twice');
    for(const g of [circuit,jar,dial]){g.start(g.character);assert.equal(g.circuitCharge,0);assert.equal(g.souljarCharge,0);assert.equal(g.sundialCasts,0)}
    for(const key of ['tide','maelstrom']){const g=expedition();equip(g,{[key]:maxWeaponLevel(key)});const e=target(g);g.grid.rebuild(g.enemies);g.updateWeapons(.01);const wave=g.zones[0];updateExpandedZone(g,wave,.1);const hp=e.hp;updateExpandedZone(g,wave,.1);assert(e.hp<e.maxHp&&e.hp===hp,'one moving wave cannot repeatedly damage a target')}
    console.log('PASS: all three chapters and six new enemies, boss attacks/rewards, tide safe-gap edges, finite shield turning, summon loot, both innates, eighteen talent nodes, six relics and run resets.');
  }
  console.log('PASS: 44 weapons / 88 live attacks, 24 fusions, 45 innate-driven talent nodes, three timed shrines, twelve altar bargains and growth parity.');

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
    builds.push({...builds[0],name:'opening-max-meta',meta:fullPermanent}, {...builds[1],name:'early-max-meta',meta:fullPermanent});
    const lateRoutes=[
      {name:'fire',weapons:{solar:3,bell:4,bolt:4},pair:{embercore:3,cinder:3}},
      {name:'frost',weapons:{blade:4,glacier:3,bolt:4},pair:{hoarfrost:3,rime:3}},
      {name:'lightning',weapons:{blade:4,tempest:3,bolt:5},pair:{frostbrand:3,stormseal:3}},
      {name:'poison',weapons:{blade:4,pestilence:3,bolt:4},pair:{venomfang:3,spore:3}},
      {name:'summon',weapons:{blade:4,stormsentry:3,bolt:4},pair:{soulpact:3,duration:3}},
      {name:'blood',weapons:{blade:4,bloodmoon:3,bolt:5},pair:{luck:3,deadeye:3}},
    ];
    for(const route of lateRoutes)for(const at of [360,480,540,600])for(const linked of [false,true])builds.push({name:route.name+'-'+(linked?'linked':'mixed')+'-'+at,at,level:30,weapons:route.weapons,passives:{power:3,haste:3,area:3,armor:3,...(linked?route.pair:{echo:3,forkseed:3})},late:true,boss:at===600,linked,route:route.name});
    const budget=build=>Object.entries(build.weapons).reduce((sum,[key,level])=>sum+level+(FUSIONS[key]?.ingredients.reduce((cost,i)=>cost+i.required,0)||0),0)+Object.values(build.passives).reduce((a,b)=>a+b,0);
    assert(builds.filter(b=>b.at===450).every(b=>budget(b)===37),'late builds spend the same upgrade budget, including consumed fusion materials');
    assert(builds.filter(b=>b.late).every(b=>budget(b)===37),'late route comparisons use the same 37-point budget');
    for(const build of builds){
      const consumed=Object.keys(build.weapons).flatMap(key=>FUSIONS[key]?.ingredients.map(i=>i.id)||[]);
      assert(build.weapons.blade||consumed.includes('blade'),'the starting weapon must remain equipped or be consumed by a fusion');
      assert.equal(new Set(consumed).size,consumed.length,'fusion routes cannot share consumed ingredients');
      assert(!consumed.some(key=>build.weapons[key]||build.passives[key]),'consumed ingredients cannot also be equipped');
    }
    for(const build of builds)for(const moving of [false,true])for(const trial of [311,733,1193,1733,2237]){
      seed=trial;const game=start();game.time=build.at;game.level=build.level;game.enemies=[];game.shrines=[];game.nextShrine=ALTAR_TIMES.length;game.bossMilestones=new Set(build.boss?[180,360]:[180,360,600]);game.xpNext=1e9;game.waveClock=15;
      game.meta=build.meta||{};
      // Fixed-budget comparisons ignore chest upgrades while keeping enemies and other supplies.
      game.openChest=()=>{};
      equip(game,build.weapons,build.passives);
      // Gear-only controls keep the innate: learned talents now supply their own weapon synergies.
      if(!build.late)for(const node of CHARACTER_TALENTS.warden.branches[0].nodes)game.learnTalent(node.id);
      if(build.late)assert.equal(Object.entries(game.weapons).some(([key,level])=>weaponStats(key,level,game.stats,game.character).resonance),build.linked,'only the deliberately linked loadout receives resonance');
      const initialKills=game.kills;let frames=0;
      for(;frames<(build.boss?1800:1200)&&!game.ended;frames++){
        const p=game.player;
        if(moving){
          let dx=Math.cos(game.time*.18),dy=Math.sin(game.time*.18),nearest=Infinity;
          for(const e of game.enemies){if(e.dead)continue;const x=p.x-e.x,y=p.y-e.y,d=Math.hypot(x,y)||1;nearest=Math.min(nearest,d-e.r);if(d<65){const strength=(65-d)/65*3;dx+=x/d*strength;dy+=y/d*strength}}
          for(const b of game.projectiles)if(b.enemy){const x=p.x-b.x,y=p.y-9-b.y,d=Math.hypot(x,y)||1;if(d<45&&x*b.vx+y*b.vy>0){dx+=x/d*2;dy+=y/d*2}}
          const length=Math.hypot(dx,dy)||1;game.stick={x:dx/length,y:dy/length};if(nearest<24)game.dash();
        }
        game.update(.05);
      }
      reports.push({name:build.name,at:build.at,budget:budget(build),moving,seed:trial,seconds:Number((frames*.05).toFixed(1)),hp:Math.max(0,Math.round(game.player.hp)),won:!!game.finalDefeated,damageTaken:game.damageTaken,kills:game.kills-initialKills,remaining:game.enemies.length});
    }
    mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/pressure-report.json',JSON.stringify(reports,null,2));
    for(const build of builds)for(const moving of [false,true]){
      const group=reports.filter(r=>r.name===build.name&&r.moving===moving),mean=key=>Math.round(group.reduce((sum,r)=>sum+r[key],0)/group.length);
      console.log(JSON.stringify({name:build.name,at:build.at,moving,survived:group.filter(r=>r.hp>0).length,won:group.filter(r=>r.won).length,seconds:mean('seconds'),damageTaken:mean('damageTaken'),kills:mean('kills'),remaining:mean('remaining')}));
      if(build.at<450&&!build.late)assert(moving?group.every(r=>r.seconds===60):group.every(r=>r.seconds<60),'early survival should require movement: '+build.name);
    }
    const total=(name,key)=>reports.filter(r=>r.name===name&&r.moving).reduce((sum,r)=>sum+r[key],0);
    // More kills and at least 25% fewer remaining threats measure room to move under the same spawn budget.
    assert(total('chain-lightning','kills')>total('raw-late','kills')&&total('chain-lightning','remaining')<total('raw-late','remaining')*.75,'finishing a linked build must open a late clear-speed advantage');
    for(const route of lateRoutes)for(const at of [360,480,540]){
      const linked=route.name+'-linked-'+at,mixed=route.name+'-mixed-'+at;
      assert(total(linked,'kills')>total(mixed,'kills')*1.05&&total(linked,'remaining')<total(mixed,'remaining')*.85,'linked '+route.name+' must create a measurable clear-speed and space advantage at '+at);
    }
    assert(reports.filter(r=>r.name.includes('-mixed-')&&!r.moving).every(r=>r.hp===0),'unlinked gear cannot idle through late hordes or the final boss');
    console.log('PASS: '+reports.length+' pressure scenarios, movement advantage, six linked routes across minutes 6–10, and equal-budget controls.');
  }

  if(process.argv.includes('--talents')){
    // Same gear, level, movement policy and seeds within each character; healing starts with room to work.
    const loadouts=[{blade:6,orbit:4,flame:3},{orbit:6,bolt:4,frost:3},{bolt:6,blade:4,storm:3},{capacitor:6,needle:4,storm:3},{tide:6,lantern:4,frost:3}],reports=[];
    for(const [index,character] of CHARACTERS.entries())for(const branch of CHARACTER_TALENTS[character.id].branches)for(const trial of [311,733,1193]){
      seed=trial;const game=start(character);game.time=300;game.level=30;game.enemies=[];game.shrines=[];game.nextShrine=ALTAR_TIMES.length;game.bossMilestones=new Set([180,360,600]);game.xpNext=1e9;game.waveClock=1e9;
      game.openChest=()=>{};equip(game,loadouts[index],{power:2,haste:2});const initialHp=game.player.hp=game.player.maxHp*.65;
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
      assert(report.procs>0&&report.talentDamage>0,'innate must trigger in the live loop: '+branch.name);assert.equal(game.level,30);assert.equal(Object.keys(game.talents).length,3);assert.deepEqual(game.weapons,loadouts[index]);
      reports.push(report);
    }
    mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/talent-report.json',JSON.stringify(reports,null,2));
    for(const character of CHARACTERS)for(const branch of CHARACTER_TALENTS[character.id].branches){
      const group=reports.filter(r=>r.character===character.id&&r.branch===branch.name),mean=key=>Math.round(group.reduce((sum,r)=>sum+r[key],0)/group.length);
      console.log(JSON.stringify({character:character.id,branch:branch.name,survived:group.filter(r=>r.survived).length,kills:mean('kills'),talentDamage:mean('talentDamage'),procs:mean('procs'),hp:mean('hp'),shield:mean('shield'),wells:mean('wells'),hunts:mean('hunts'),coldBursts:mean('coldBursts'),starXp:mean('starXp')}));
    }
    console.log('PASS: 45 live talent-branch trials with fixed gear and three seeds per specialization.');
  }

  if(process.argv.includes('--difficulty')){
    // Full permanent trees and one legal three-point route; equal 37-point gear, actual damage and no chest upgrades.
    const reports=[],loadouts=[
      [{bloodmoon:3,solar:3,bell:6},{armor:4,power:3,haste:3}],
      [{blade:1,glacier:3,tempest:3,storm:5},{frostbrand:3,stormseal:3,rime:3,haste:1}],
      [{blade:1,thunderbolt:3,soulchain:3,lance:5},{conductor:3,power:3,haste:3}],
      [{capacitor:1,arcforge:3,frostloom:3,storm:5},{circuit:3,power:3,haste:3}],
      [{tide:1,maelstrom:3,beacon:3,frost:5},{brine:3,power:3,haste:3}],
    ];
    for(const [weapons,passives] of loadouts)assert.equal(Object.entries(weapons).reduce((sum,[key,level])=>sum+level+(FUSIONS[key]?.ingredients.reduce((n,item)=>n+item.required,0)||0),0)+Object.values(passives).reduce((a,b)=>a+b,0),37);
    for(const bargains of [[],['horizon','frenzy','glass']])for(const [index,character] of CHARACTERS.entries())for(const branch of CHARACTER_TALENTS[character.id].branches)for(const at of [540,600])for(const moving of [false,true])for(const trial of [311,733,1193]){
      seed=trial;const game=start(character);game.start(character,fullPermanent);game.time=at;game.level=30;game.enemies=[];game.nextShrine=3;game.bossMilestones=new Set(at===600?[180,360]:[180,360,600]);game.xpNext=1e9;game.waveClock=15;
      game.boons=[...bargains];game.openChest=()=>{};let bossesSpawned=0;const spawnBoss=game.spawnBoss;game.spawnBoss=function(milestone){spawnBoss.call(this,milestone);bossesSpawned=this.enemies.filter(e=>e.boss&&!e.dead).length};equip(game,...loadouts[index]);for(const node of branch.nodes)assert(game.learnTalent(node.id));let frames=0;
      for(;frames<(at===600?1800:1200)&&!game.ended;frames++){
        const p=game.player;
        if(moving){
          const boss=game.enemies.find(e=>e.boss&&!e.dead);let dx=Math.cos(game.time*.18),dy=Math.sin(game.time*.18),nearest=Infinity;
          if(boss){const d=Math.hypot(boss.x-p.x,boss.y-p.y)||1;dx=(boss.x-p.x)/d*(d>170?1:d<100?-1:0)+dy*.6;dy=(boss.y-p.y)/d*(d>170?1:d<100?-1:0)-dx*.6}
          for(const e of game.enemies){if(e.dead)continue;const x=p.x-e.x,y=p.y-e.y,d=Math.hypot(x,y)||1;nearest=Math.min(nearest,d-e.r);if(d<65){const strength=(65-d)/65*3;dx+=x/d*strength;dy+=y/d*strength}}
          for(const b of game.projectiles)if(b.enemy){const x=p.x-b.x,y=p.y-9-b.y,d=Math.hypot(x,y)||1;if(d<45&&x*b.vx+y*b.vy>0){dx+=x/d*2;dy+=y/d*2}}
          for(const h of game.hazards)if(h.type==='blast'){const x=p.x-h.x,y=p.y-h.y,d=Math.hypot(x,y)||1;if(d<h.r+30){dx+=x/d*3;dy+=y/d*3}}
          const length=Math.hypot(dx,dy)||1;game.stick={x:dx/length,y:dy/length};if(nearest<28)game.dash();
        }
        game.update(.05);
      }
      const report={bargains:[...bargains],bossesSpawned,character:character.id,branch:branch.name,at,moving,seed:trial,seconds:Math.round(frames*.05),alive:game.player.hp>0,won:!!game.finalDefeated,hp:Math.max(0,Math.round(game.player.hp)),damageTaken:game.damageTaken,kills:game.kills,remaining:game.enemies.filter(e=>!e.dead).length,bossHp:game.enemies.filter(e=>e.final&&!e.dead).reduce((n,e)=>n+e.hp,0),talentProcs:game.characterState.procs};
      assert.equal(Object.keys(game.talents).length,3);assert(Object.values(report).filter(v=>typeof v==='number').every(Number.isFinite));reports.push(report);
    }
    mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/difficulty-report.json',JSON.stringify(reports,null,2));
    for(const contracted of [false,true])for(const at of [540,600])for(const moving of [false,true]){const rows=reports.filter(r=>!!r.bargains.length===contracted&&r.at===at&&r.moving===moving),mean=k=>Math.round(rows.reduce((s,r)=>s+r[k],0)/rows.length);console.log(JSON.stringify({contracted,at,moving,runs:rows.length,alive:rows.filter(r=>r.alive).length,won:rows.filter(r=>r.won).length,damageTaken:mean('damageTaken'),kills:mean('kills'),remaining:mean('remaining'),bossHp:mean('bossHp')}))}

    const base=reports.filter(r=>!r.bargains.length),bosses=base.filter(r=>r.at===600),hordes=base.filter(r=>r.at===540);
    assert(bosses.filter(r=>r.moving&&r.won).length>=18,'max-growth formed builds retain a practical moving boss window');
    assert(bosses.filter(r=>!r.moving&&r.won).length<=6,'max-growth boss fights cannot routinely be won standing still');
    assert(hordes.filter(r=>r.moving&&r.alive).length>=24&&hordes.filter(r=>!r.moving&&r.alive).length<=12,'full talents still reward movement through the late horde');
    assert(reports.filter(r=>r.at===600).every(r=>r.bossesSpawned===(r.bargains.length?2:1)),'the live benchmark spawns the contracted number of final bosses');
    console.log('PASS: '+reports.length+' full-permanent-growth, legal three-point talent trials across all nine branches, late hordes, bosses and three stacked contracts.');

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

  if(process.argv.includes('--simulate')||process.argv.includes('--progression')||process.argv.includes('--expeditions')){
    const reports=[],compare=process.argv.includes('--progression'),chapters=process.argv.includes('--expeditions');
    for(const stage of chapters?['foundry','coast']:['graveyard'])for(const invulnerable of compare?[true]:[false,true])for(const index of compare?[0]:chapters?[3,4]:[0,1,2,3,4])for(const bargains of compare?[[],['horizon','frenzy','glass']]:[[]]){
      seed=137+index;const game=start(CHARACTERS[index]),checkpoints=[];
      if(compare){game.start(CHARACTERS[index],fullPermanent);game.nextShrine=ALTAR_TIMES.length}
      if(chapters)game.start(CHARACTERS[index],{}, {stage});
      let firstMaxAt=null,refinementChoices=0,chests=0,eliteKills=0,noGrowthChoices=0;
      const openChest=game.openChest.bind(game);game.openChest=value=>{chests++;return openChest(value)};
      const kill=game.kill.bind(game);game.kill=enemy=>{if(!enemy.dead&&enemy.elite&&!enemy.boss)eliteKills++;return kill(enemy)};
      const preferred=[['blade','flame','lance','meteor','power','haste','embercore','cinder','armor','aegis'],['orbit','frost','tether','bell','rime','power','area','haste','aegis','regen'],['bolt','storm','shard','sentinel','conductor','lens','power','haste','luck','focus'],['capacitor','sentinel','needle','frost','storm','power','haste','circuit','conductor','armor','aegis'],['tide','tether','lantern','bell','needle','frost','brine','soulpact','power','haste','armor','aegis']][index];
      let nextCheckpoint=60;
      for(let frame=0;frame<14400&&!game.ended;frame++){
        if(game.state==='running')for(const [i,id] of bargains.entries())if(game.time>=ALTAR_TIMES[i]&&!game.boons.includes(id)){game.state='reward';game.eventChoices=[id];game.chooseAltarReward(0)}
        for(const branch of CHARACTER_TALENTS[game.character.id].branches)for(const node of branch.nodes)if(talentNodeState(game,node.id).available)game.learnTalent(node.id);
        if(game.state==='talent')game.state='running';
        if(game.state==='level'){
          const injured=game.player.hp/game.player.maxHp<.5;
          const scored=game.choices.map((item,i)=>({i,score:item.fusion?500:item.refinement?20+(preferred.includes(item.key)?5:0):(item.weapon&&item.current?60+item.current*3:0)+(preferred.includes(item.key)?70-preferred.indexOf(item.key):0)+(item.weapon?10:0)+(injured&&['vitality','aegis','armor','regen'].includes(item.key)?145:0)}));
          scored.sort((a,b)=>b.score-a.score);const item=game.choices[scored[0].i];if(item.refinement)refinementChoices++;if(item.key==='heal')noGrowthChoices++;game.chooseUpgrade(scored[0].i);continue;
        }
        const p=game.player;if(invulnerable)p.invincible=2;
        let goal=null,best=Infinity;
        for(const d of game.drops){if(d.dead||d.type==='heal'&&p.hp>=p.maxHp)continue;const distance=Math.hypot(d.x-p.x,d.y-p.y)*(d.type==='chest'?.25:d.type==='heal'&&p.hp<p.maxHp*.5?.2:1);if(distance<best){best=distance;goal=d}}
        goal||=game.closest(p.x,p.y,800);
        let dx=goal?goal.x-p.x:Math.cos(game.time*.06),dy=goal?goal.y-p.y:Math.sin(game.time*.06),length=Math.hypot(dx,dy)||1;dx/=length;dy/=length;
        let nearest=Infinity;const avoid=game.time<100&&index===1?75:65;
        for(const e of game.enemies){if(e.dead)continue;const x=p.x-e.x,y=p.y-e.y,d=Math.hypot(x,y)||1;nearest=Math.min(nearest,d-e.r);if(d<avoid){const weight=(avoid-d)/avoid*2.8;dx+=x/d*weight;dy+=y/d*weight}}
        for(const b of game.projectiles)if(b.enemy){const x=p.x-b.x,y=p.y-9-b.y,d=Math.hypot(x,y)||1;if(d<45&&x*b.vx+y*b.vy>0){dx+=x/d*2;dy+=y/d*2}}
        for(const h of game.hazards){if(h.type==='tide'){if(Math.abs(p.y-h.y)<45&&Math.abs(p.x-h.gap)>25){dx+=Math.sign(h.gap-p.x)*3;dy+=Math.sign(p.y-h.y||1)*2}continue}if(h.type!=='blast')continue;const x=p.x-h.x,y=p.y-h.y,d=Math.hypot(x,y)||1;if(d<h.r+30){dx+=x/d*3;dy+=y/d*3}}
        length=Math.hypot(dx,dy)||1;game.stick={x:dx/length,y:dy/length};if(nearest<24)game.dash();game.update(.05);
        if(firstMaxAt===null&&Object.entries(game.weapons).some(([key,level])=>level===maxWeaponLevel(key)))firstMaxAt=Math.round(game.time);
        if(game.time>=nextCheckpoint){checkpoints.push({time:nextCheckpoint,level:game.level,kills:game.kills,hp:Math.round(p.hp),chests,eliteKills,refinementChoices});nextCheckpoint+=60}
      }
      reports.push({stage,character:game.character.id,mode:invulnerable?'collector (damage disabled)':'survival bot',bargains,firstMaxAt,chests,eliteKills,refinementChoices,noGrowthChoices,time:Math.round(game.time),won:!!game.finalDefeated,level:game.level,kills:game.kills,damageTaken:game.damageTaken,weapons:game.weapons,passives:game.passives,weaponUpgrades:game.weaponUpgrades,talents:Object.keys(game.talents),checkpoints});
      if(chapters){assert(Number.isFinite(game.player.hp)&&Number.isFinite(game.xp));assert(chests<=3);if(invulnerable)assert(game.time>=600,'chapter collector reaches its final boss');assert.equal(game.stage,stage)}
      if(compare){assert.equal(noGrowthChoices,0);assert(chests<=3,'contracts cannot multiply boss chests');assert(game.time>=600,'the collector comparison reaches the last minute')}
      console.log(JSON.stringify(reports.at(-1)));
    }
    mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/'+(chapters?'expeditions':compare?'progression':'balance')+'-report.json',JSON.stringify(reports,null,2));
  }
  if(process.argv.includes('--opening')){
    const reports=[],times=[30,60,120,180],trials=[311,733,1193];
    for(const [index,character] of CHARACTERS.entries())for(const fullMeta of [false,true])for(const trial of trials){
      seed=trial;const game=start(character),meta=fullMeta?fullPermanent:{};game.start(character,meta);
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
        if(game.state==='talent')game.state='running';
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
      // Stronger permanent XP may advance LV2; later pacing and one-shot limits stay shared.
      for(const [level,earliest,latest] of [[2,meta==='max'?8:10,25],[3,23,45],[4,35,65]]){const at=median(group.map(r=>r.levelTimes[level]));assert(at!==null&&at>=earliest&&at<=latest,character.id+' '+meta+' upgrade pacing LV'+level)}
      for(const level of [3,4])assert(median(group.map(r=>r.levelTimes[level]-r.levelTimes[level-1]))>=10,character.id+' '+meta+' consecutive upgrades need time to play');
      for(const [index,range] of [[1,[3,5]],[2,[6,10]],[3,[meta==='max'?9:8,14]]]){const level=median(group.map(r=>r.checkpoints[index].level));assert(level>=range[0]&&level<=range[1],character.id+' '+meta+' growth at '+times[index])}
      for(const band of hits){assert(band.skeleton.total>=20&&band.bat.total>=20,'one-shot limits need sufficient actual contacts');assert(band.skeleton.percent<=20&&band.bat.percent<=35,character.id+' '+meta+' primary attacks must not routinely erase healthy early enemies')}
      console.log(JSON.stringify({character:character.id,meta,mode:'collector',medianLevelTimes:Object.fromEntries([2,3,4].map(level=>[level,median(group.map(r=>r.levelTimes[level]))])),medianCheckpointLevels:times.map((time,i)=>({time,level:median(group.map(r=>r.checkpoints[i].level))})),hits}));
    }
    console.log('PASS: 30 opening collectors meet upgrade pacing, three-minute growth and noncritical primary-hit limits; fresh and fully upgraded saves.');
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
      for(let i=0;i<120;i++){if(await evaluate('return document.readyState!=="loading"&&!!document.getElementById("world")'))break;await delay(500)}
      assert.equal(await evaluate('const {game}=await import("/src/main.js");return game.state'),'menu');
      if(process.argv.includes('--icon-menus')){
        let touch=false;
        const activate=async selector=>{
          const point=await evaluate(`const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect();if(!r.width||document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')!==e)throw Error('unreachable '+${JSON.stringify(selector)});return {x:r.x+r.width/2,y:r.y+r.height/2}`);
          if(touch){await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
          else for(const type of ['mousePressed','mouseReleased'])await call('Input.dispatchMouseEvent',{type,...point,button:'left',clickCount:1});
        };
        const fit=async(label,selector)=>{
          const issues=await evaluate(`const root=document.querySelector(${JSON.stringify(selector)}),issues=[];for(const e of [root,...root.querySelectorAll('*')]){if(!e.getClientRects().length||e.closest('.detail-bubble'))continue;const r=e.getBoundingClientRect();if(r.top<0||r.left<0||r.right>innerWidth+1||r.bottom>innerHeight+1)issues.push((e.id||e.className)+' bounds');if(['auto','hidden','scroll'].includes(getComputedStyle(e).overflowY)&&e.scrollHeight>e.clientHeight+2)issues.push((e.id||e.className)+' scroll');if(e.matches('.icon-choice')&&(r.width<40||r.height<44))issues.push('small '+e.textContent)}return issues`);
          if(issues.length)await shot('icon-menu-failure');assert.deepEqual(issues,[],label);
        };
        await evaluate(`const {WEAPONS,PASSIVES,PICKUPS}=await import('/src/data.js'),{FUSIONS}=await import('/src/fusions.js');localStorage.setItem('afterlight-save-v1',JSON.stringify({embers:50000,discoveredFusions:Object.keys(FUSIONS),discoveredItems:Object.fromEntries([...Object.keys(WEAPONS).map(key=>['weapon:'+key,6]),...Object.keys(PASSIVES).map(key=>['passive:'+key,5]),...Object.keys(PICKUPS).map(key=>['pickup:'+key,1])])}));dispatchEvent(new StorageEvent('storage',{key:'afterlight-save-v1'}));`);
        for(const [width,height] of [[1280,800],[1024,600],[390,844],[320,568],[568,320],[667,375],[844,390]]){
          touch=width<=700||height<=500;await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:touch});await call('Emulation.setTouchEmulationEnabled',{enabled:touch,maxTouchPoints:1});
          await evaluate(`const {game}=await import('/src/main.js');game.returnToMenu();document.getElementById('play-button').click()`);
          for(const key of Object.keys(STAGES)){await activate('#stage-choices [data-choice='+key+']');assert.equal(await evaluate('return document.querySelector("#stage-choices [aria-pressed=true]").dataset.choice'),key);await fit('prepare '+width+' '+key,'#camp-prepare')}
          await shot('icon-maps-'+width+'x'+height);await activate('#start-button');assert.equal(await evaluate('const {game}=await import("/src/main.js");game.state="paused";return game.stage'),'coast');
          await evaluate(`const {game}=await import('/src/main.js'),{characterStats}=await import('/src/stats.js'),{ALTAR_BOONS}=await import('/src/content.js');game.weapons={blade:1,storm:1};game.passives={power:1,circuit:1};game.boons=[Object.keys(ALTAR_BOONS)[0]];game.stats=characterStats(game.character,game.passives,game.meta,game.talents,game.weapons,game.boons);document.getElementById('status-button').click()`);
          assert.equal(await evaluate('return document.querySelectorAll("select,[role=combobox]").length'),0,'the whole game contains no dropdown controls');
          if(touch){
            for(const key of await evaluate('return [...document.querySelector("#sheet-attributes>.mobile-picker").children].map(b=>b.dataset.choice)')){await activate('#sheet-attributes>.mobile-picker [data-choice='+key+']');await fit('attributes '+width+' '+key,'.sheet-panel')}
            await shot('icon-attributes-'+width+'x'+height);
          }
          for(const [tab,selector] of [['items','.collection-category'],['catalog','#catalog-category']]){
            await activate('#sheet-tab-'+tab);
            for(const key of await evaluate(`return [...document.querySelector(${JSON.stringify(selector)}).children].map(b=>b.dataset.choice)`)){
              await activate(selector+' [data-choice='+key+']');assert.equal(await evaluate(`return document.querySelector(${JSON.stringify(selector+' [aria-pressed=true]')}).dataset.choice`),key);
              assert(await evaluate(`const {catalogItem}=await import('/src/data.js'),key=${JSON.stringify(key)},tab=${JSON.stringify(tab)},tiles=[...document.querySelectorAll(tab==='catalog'?'#catalog-list .catalog-item':'#sheet-items .catalog-item')];return tiles.length>0&&tiles.every(b=>key==='all'||(tab==='catalog'?catalogItem(b.dataset.itemId).category:document.getElementById(b.dataset.itemId).dataset.category)===key)`),'category filters actual entries '+key);
              if(touch)await fit(tab+' '+key+' '+width,'.sheet-panel');
            }
            await activate(selector+' [data-choice=all]');await shot('icon-'+tab+'-'+width+'x'+height);
            if(tab==='catalog'&&touch)for(const id of await evaluate('return [...document.querySelectorAll("#catalog-list button")].map(b=>b.dataset.itemId)')){
              await activate('#catalog-list [data-item-id="'+id+'"]');
              const detail=await evaluate('const b=document.getElementById("catalog-detail"),r=b.getBoundingClientRect(),c=document.getElementById("catalog-detail-body"),a=document.querySelector("#catalog-list .selected").getBoundingClientRect();return {fits:r.top>=0&&r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,scroll:c.scrollHeight-c.clientHeight,overlap:r.left<a.right&&r.right>a.left&&r.top<a.bottom&&r.bottom>a.top}');
              if(!detail.fits||detail.scroll>1||detail.overlap)await shot('icon-menu-failure');assert(detail.fits&&detail.scroll<=1&&!detail.overlap,'catalog bubble '+width+' '+id+': '+JSON.stringify(detail));await activate('#catalog-detail-close');
            }
          }
          await activate('#sheet-close');await evaluate(`const {game}=await import('/src/main.js');game.returnToMenu();document.getElementById('archive-button').click()`);await fit('guide grid '+width,'.archive-panel');await shot('icon-guide-'+width+'x'+height);
          for(let i=0;i<17;i++){
            const selector='.guide-grid>.mobile-picker [data-choice="'+i+'"]';await activate(selector);assert.equal(await evaluate('return document.querySelectorAll(".guide-grid article.mobile-selected").length'),1);await fit('guide detail '+width+' '+i,'.archive-panel');
            await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});assert.equal(await evaluate('return document.activeElement.dataset.choice'),String(i),'guide returns focus');
          }
          await activate('#archive-screen .close-button');
          await evaluate(`const {game}=await import('/src/main.js');game.start(game.character);game.time=600;game.damageByWeapon={blade:25000,storm:5000};game.end(true);for(let i=0;i<100&&document.getElementById('end-screen').classList.contains('hidden');i++)await new Promise(r=>setTimeout(r,10))`);
          if(touch){for(const key of ['summary','damage']){await activate('#end-report>.mobile-picker [data-choice='+key+']');await fit('result '+width+' '+key,'.end-panel')}await shot('icon-result-'+width+'x'+height)}
        }
        touch=false;await call('Emulation.setTouchEmulationEnabled',{enabled:false});await call('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});await evaluate(`const {game}=await import('/src/main.js');game.returnToMenu();document.getElementById('play-button').click();document.querySelector('#stage-choices [data-choice=graveyard]').focus()`);
        for(const [key,code,windowsVirtualKeyCode,text] of [['ArrowRight','ArrowRight',39],['Enter','Enter',13,'\r']]){await call('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode,...(text?{text}:{})});await call('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode})}
        assert.equal(await evaluate('return document.querySelector("#stage-choices [aria-pressed=true]").dataset.choice'),'foundry');await activate('#start-button');assert.equal(await evaluate('const {game}=await import("/src/main.js");return game.stage'),'foundry');assert.equal(errors.length,0,JSON.stringify(errors));
        console.log('PASS: no dropdowns; seven layouts cover map icons and real departures, all equipment/catalog categories, eight attribute groups, seventeen guide entries, result tabs, touch, keyboard selection, focus restoration and zero runtime exceptions.');
      }else if(process.argv.includes('--expansion')){
        const activate=async selector=>{
          const point=await evaluate('const e=document.querySelector('+JSON.stringify(selector)+'),r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}');
          for(const type of ['mousePressed','mouseReleased'])await call('Input.dispatchMouseEvent',{type,...point,button:'left',clickCount:1});
        };
        for(const [width,height] of [[1280,800],[1024,600],[390,844],[320,568],[568,320],[667,375],[844,390]]){
          const mobile=width<701||height<500;await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});await call('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:1});
          await evaluate('const {game}=await import("/src/main.js");game.returnToMenu();document.getElementById("play-button").click()');await delay(100);
          const layout=await evaluate(`const menu=document.getElementById('menu'),controls=[...document.querySelectorAll('#camp-prepare button')],top=document.getElementById('masthead').getBoundingClientRect().bottom;return {size:[menu.clientWidth,menu.scrollWidth,menu.clientHeight,menu.scrollHeight],controls:controls.filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return {name:e.id||e.textContent.trim(),w:r.width,h:r.height,fits:r.top>=top&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth}}),characters:document.querySelectorAll('.character-card').length,stages:document.querySelectorAll('#stage-choices button').length};`);
          await shot('expansion-prepare-'+width+'x'+height);assert.equal(layout.characters,5);assert.equal(layout.stages,3);assert(layout.size[1]<=layout.size[0]+1&&layout.size[3]<=layout.size[2]+1,'prepare fits '+width+'x'+height+': '+JSON.stringify(layout));assert(layout.controls.every(c=>c.w>=44&&c.h>=44&&c.fits),'accessible controls '+width+'x'+height+': '+JSON.stringify(layout));
          await activate('#camp-weapon-button');
          for(const key of Object.keys(STARTING_WEAPONS)){
            await evaluate('document.querySelector("[data-starter='+key+']").click()');
            assert.deepEqual(await evaluate('const p=document.querySelector(".weapon-panel"),b=document.getElementById("weapon-detail"),issues=[];for(const e of [p,...p.querySelectorAll(".meta-heading,#weapon-choices,#weapon-feedback"),b,...b.querySelectorAll(".detail-bubble-copy,h3,p,button")]){const r=e.getBoundingClientRect();if(!r.width)continue;if(r.left<0||r.top<0||r.right>innerWidth+1||r.bottom>innerHeight+1||e!==b&&(e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1))issues.push(e.id||e.className)}return issues'),[],'expanded starter menu '+key+' '+width+'x'+height);
          }
          await shot('expansion-starters-'+width+'x'+height);await evaluate('document.getElementById("weapon-detail-close").click();document.querySelector("#weapon-screen [data-close]").click()');
          for(const [index,stage] of [[3,'foundry'],[4,'coast']]){
            const selector='#characters .character-card:nth-child('+(index+1)+')';
            if(mobile){const point=await evaluate('const r=document.querySelector('+JSON.stringify(selector)+').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}');await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}else await activate(selector);
            await activate('#stage-choices [data-choice="'+stage+'"]');
            await activate('#menu-talents-button');assert.equal(await evaluate('return document.querySelectorAll("#sheet-talents .talent-node:not(.innate)").length'),9);await shot('expansion-talents-'+index+'-'+width+'x'+height);await activate('#sheet-close');
            await activate('#start-button');
            const live=await evaluate('const {game}=await import("/src/main.js");game.state="paused";return {character:game.character.id,stage:game.stage,weapon:Object.keys(game.weapons)[0],label:document.getElementById("stage-label").textContent}');assert.equal(live.character,CHARACTERS[index].id);assert.equal(live.stage,stage);assert.equal(live.weapon,CHARACTERS[index].weapon);
            await evaluate(`const {game}=await import('/src/main.js'),{characterStats}=await import('/src/stats.js');game.time=180;game.enemies=[];game.effects=[];game.level=30;game.talents={};game.weapons=${JSON.stringify(stage==='foundry'?{arcforge:3,needle:6}:{maelstrom:3,beacon:3})};game.passives={area:2,haste:2};game.stats=characterStats(game.character,game.passives,{},game.talents,game.weapons);const kinds=${JSON.stringify(stage==='foundry'?['cinderling','bomber','bulwark','oracle']:['siren','leech','oracle','ghost'])};for(let i=0;i<24;i++){const a=i*Math.PI/12,e=game.spawnEnemy(kinds[i%4]);e.x=game.player.x+Math.cos(a)*(65+i%4*20);e.y=game.player.y+Math.sin(a)*(65+i%4*20);e.hp=e.maxHp=1e6;e.speed=0}game.grid.rebuild(game.enemies);game.updateWeapons(.01);for(let i=0;i<3;i++){game.updateProjectiles(.05);game.updateZones(.05)}game.nextStageHazard=0;const {updateExpedition}=await import('/src/expeditions.js');updateExpedition(game);game.on('weapons');game.on('hud');game.render();`);
            await shot('expansion-'+stage+'-'+width+'x'+height);assert(await evaluate('const {game}=await import("/src/main.js");return !Object.values(game.stats).some(v=>typeof v==="number"&&!Number.isFinite(v))'));assert.equal(errors.length,0,JSON.stringify(errors));
            await evaluate('const {game}=await import("/src/main.js");game.returnToMenu();document.getElementById("play-button").click()');
          }
        }
        await call('Emulation.setTouchEmulationEnabled',{enabled:false});await call('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
        await evaluate('const b=document.querySelector("#stage-choices [data-choice=graveyard]");b.click();b.focus()');
        await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});assert.equal(await evaluate('return document.querySelector("#stage-choices [aria-pressed=true]").dataset.choice'),'foundry');
        await activate('#start-button');assert.equal(await evaluate('const {game}=await import("/src/main.js");game.pause();return game.stage'),'foundry');await activate('#restart-button');await delay(300);assert.equal(await evaluate('const {game}=await import("/src/main.js");game.pause();return game.stage'),'foundry','restart retains chosen stage');
        await evaluate('const {game}=await import("/src/main.js");game.returnToMenu();document.getElementById("camp-library-button").click();document.getElementById("archive-button").click()');
        const guide=await evaluate('return document.querySelector(".guide-grid").textContent');for(const name of ['焚星熔炉','沉钟海岸','裂隙司祭','裂潮兽'])assert(guide.includes(name));await shot('expansion-field-guide');
        assert.equal(errors.length,0,JSON.stringify(errors));console.log('PASS: expansion character/stage selection, eighteen talent entries, chapter combat and sprites in seven desktop/phone layouts, real touch and keyboard controls, restart, field guide and zero runtime exceptions.');
      }else if(process.argv.includes('--refinements')){
        const cases=[[['blade','damage','white'],['bolt','damage','green'],['hailfire','damage','purple'],['storm','damage','gold']],[['bolt','amount','purple'],['soulforge','amount','gold'],['hailfire','anomaly','purple'],['thorn','damage','gold']],[['hailfire','control','purple'],['thorn','duration','green'],['storm','haste','gold'],['bolt','damage','gold']]];
        for(const [width,height] of [[1280,800],[390,844],[370,665],[320,568],[568,320],[667,375],[844,390]]){
          const mobile=width<701||height<500;
          await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});await call('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:1});
          for(const [caseIndex,selection] of cases.entries()){
            await evaluate(`
              const {game}=await import('/src/main.js'),{characterStats}=await import('/src/stats.js'),{upgradePool}=await import('/src/balance.js');
              if(!document.getElementById('status-screen').classList.contains('hidden'))document.getElementById('sheet-close').click();
              game.start(game.character);game.level=40;game.time=480;game.nextShrine=3;game.bossMilestones=new Set([180,360,600]);game.enemies=[];game.player.invincible=999;game.spawnClock=game.waveClock=1e9;
              game.weapons={blade:6,bolt:6,hailfire:3,soulforge:3,thorn:6,storm:6};game.passives={power:5,haste:5,area:3,armor:5,luck:5,focus:3};game.stats=characterStats(game.character,game.passives,game.meta,game.talents,game.weapons,game.boons,game.weaponEmpowerments,game.metaBuffs,game.growth,game.weaponUpgrades);
              const pool=upgradePool(game);game.choices=${JSON.stringify(selection)}.map(([key,refinement,rarity])=>pool.find(item=>item.key===key&&item.refinement===refinement&&item.rarity===rarity));if(game.choices.some(item=>!item))throw Error('missing refinement');
              game.state='level';game.pendingLevels=2;game.on('weapons');game.on('hud');game.on('level');
            `);
            await delay(80);
            const layout=await evaluate(`const panel=document.querySelector('.level-modal'),cards=[...document.querySelectorAll('.refinement-card')];return {panelFits:panel.scrollHeight<=panel.clientHeight+1&&panel.scrollWidth<=panel.clientWidth+1,size:[panel.clientHeight,panel.scrollHeight,panel.clientWidth,panel.scrollWidth],cards:cards.map(b=>{const r=b.getBoundingClientRect(),art=b.querySelector('canvas'),icon=art.getBoundingClientRect();return {text:b.innerText,visible:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth&&icon.width>=24&&icon.height>=24&&icon.top>=r.top&&icon.bottom<=r.bottom&&document.elementFromPoint(icon.x+icon.width/2,icon.y+icon.height/2)?.closest('.upgrade-card')===b,overflow:b.scrollWidth>b.clientWidth+1||b.scrollHeight>b.clientHeight+1}}),rarities:cards.map(b=>b.dataset.rarity)};`);
            await shot('refinement-'+width+'x'+height+'-'+caseIndex);
            assert(layout.panelFits,'refinement panel fits '+width+'x'+height+' case '+caseIndex+': '+JSON.stringify(layout));assert.equal(layout.cards.length,4);assert(layout.cards.every(card=>card.visible&&!card.overflow&&!/undefined|NaN|LV\. 6 → LV\. 6/.test(card.text)),JSON.stringify(layout));assert.deepEqual(layout.rarities,selection.map(item=>item[2]));
            const before=await evaluate(`const {game}=await import('/src/main.js');return JSON.stringify([game.choices,game.rerolls,game.pendingLevels,game.weaponUpgrades]);`);
            await evaluate('document.getElementById("level-status-button").click();document.getElementById("sheet-close").click()');
            assert.equal(await evaluate(`const {game}=await import('/src/main.js');return JSON.stringify([game.choices,game.rerolls,game.pendingLevels,game.weaponUpgrades]);`),before,'status preserves refinement choices');
            await evaluate(`const {game}=await import('/src/main.js');game.pendingLevels=0;`);
            const selected=3,[key,refinement]=selection[selected];
            if(mobile){const point=await evaluate(`const r=document.querySelectorAll('.upgrade-card')[${selected}].getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height-12};`);await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
            else{const code=(caseIndex===2?'Numpad':'Digit')+(selected+1);await call('Input.dispatchKeyEvent',{type:'keyDown',key:String(selected+1),code});await call('Input.dispatchKeyEvent',{type:'keyUp',key:String(selected+1),code})}
            const selectedState=await evaluate(`const {game}=await import('/src/main.js');return {state:game.state,upgrades:game.weaponUpgrades,hidden:document.getElementById('level-screen').classList.contains('hidden')};`);
            assert(selectedState.state==='running'&&selectedState.upgrades[key]?.[refinement]===.16&&selectedState.hidden,'real selection at '+width+'x'+height+' case '+caseIndex+': '+JSON.stringify(selectedState));
            await evaluate(`const {game}=await import('/src/main.js');game.pause();document.getElementById('status-button').click();document.getElementById('sheet-tab-items').click();document.querySelector('[data-item-id="sheet-weapon-${key}"]').click();`);
            assert(await evaluate(`return document.getElementById('sheet-weapon-${key}').textContent.includes('满级精修')&&document.getElementById('items-detail').matches(':popover-open');`),'equipment detail exposes accumulated refinements');
          }
        }
        await evaluate(`document.getElementById('sheet-close').click();const {game}=await import('/src/main.js');game.start(game.character);game.state='paused';if(Object.keys(game.weaponUpgrades).length)throw Error('refinements survived restart');`);
        assert.equal(errors.length,0,JSON.stringify(errors));console.log('PASS: seven desktop/phone layouts show four refinement rarities, real gains, touch/keyboard selection, preserved choices, equipment summaries and restart with zero runtime exceptions.');
      }else{
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
        assert(await evaluate('return document.querySelectorAll(".meta-tree").length===3&&document.querySelectorAll("#meta-upgrades .meta-node").length===15&&!document.getElementById("meta-detail").matches(":popover-open")&&!document.getElementById("meta-tabs")'),'three pure growth trees are separate from starter weapons');
        assert(await evaluate('const p=document.querySelector(".meta-panel"),r=p.getBoundingClientRect();return p.scrollHeight<=p.clientHeight+1&&p.scrollWidth<=p.clientWidth+1&&r.top>=12&&r.bottom<=innerHeight-12&&[...document.querySelectorAll("#meta-upgrades .meta-node")].every(b=>{const q=b.getBoundingClientRect();return q.width>=44&&q.height>=44&&document.elementFromPoint(q.x+q.width/2,q.y+q.height/2)?.closest("button")===b})'),'all fifteen nodes fit without scrolling at '+width+'x'+height);
        await evaluate('document.querySelector("[data-meta=vitality]").click()');assert(await evaluate('return document.getElementById("meta-buy").disabled&&document.getElementById("meta-detail-state").textContent.includes("还差 60")'),'zero balance explains the unavailable purchase');
        await evaluate('document.getElementById("meta-detail-close").click()');
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
      assert(await evaluate('const {game}=await import("/src/main.js");document.getElementById("start-button").click();game.gold=588;game.time=120;game.end(false,true,"camp");for(let i=0;i<50&&game.state!=="menu";i++)await new Promise(r=>setTimeout(r,10));return game.state==="menu"&&document.getElementById("meta-count").textContent==="600 ✦"&&!document.getElementById("camp-home").classList.contains("hidden")'),'settlement returns to the home menu with the updated balance');
      await evaluate('document.getElementById("meta-button").click();');await delay(300);
      const purchase=await evaluate('const b=document.querySelector("[data-meta=vitality]");b.scrollIntoView({block:"center"});const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}');
      for(const type of ['mousePressed','mouseReleased'])await call('Input.dispatchMouseEvent',{type,x:purchase.x,y:purchase.y,button:'left',clickCount:1});
      await evaluate('document.getElementById("meta-buy").click()');
      assert(await evaluate('const {readSave}=await import("/src/data.js");for(let i=0;i<50&&!document.getElementById("meta-feedback").textContent.includes("已强化");i++)await new Promise(r=>setTimeout(r,10));const save=readSave();return save.embers===540&&save.meta.vitality===1&&document.getElementById("ember-balance").textContent==="540"&&document.getElementById("meta-count").textContent==="540 ✦"&&document.getElementById("meta-feedback").textContent.includes("下次出征生效")&&document.activeElement.id==="meta-buy"'),'real purchase persists, updates both balances and preserves keyboard focus');
      await shot('camp-altar-purchased');await evaluate('document.getElementById("meta-detail-close").click()');
      for(const [width,height] of [[370,665],[320,568],[568,320]]){
        await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
        assert(await evaluate('const panel=document.querySelector(".meta-panel"),r=panel.getBoundingClientRect(),feedback=document.getElementById("meta-feedback").getBoundingClientRect();return panel.scrollHeight<=panel.clientHeight+1&&panel.scrollWidth<=panel.clientWidth+1&&r.top>=12&&r.bottom<=innerHeight-12&&feedback.height>0&&feedback.top>=r.top&&feedback.bottom<=r.bottom&&[...panel.querySelectorAll("button")].filter(b=>b.getClientRects().length).every(b=>{const s=b.getBoundingClientRect();return s.top>=r.top&&s.bottom<=r.bottom})'),'purchase feedback and every altar action remain visible at '+width+'x'+height);
        await shot('camp-altar-purchased-'+width+'x'+height);
      }
      await call('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
      await evaluate('document.querySelector("#meta-screen [data-close]").click();document.getElementById("menu").scrollTop=0;');await shot('camp-upgraded');
      assert(await evaluate('document.getElementById("play-button").click();document.getElementById("start-button").click();const {game}=await import("/src/main.js");return game.state==="running"'));
      await evaluate('const {game}=await import("/src/main.js");const {characterStats}=await import("/src/stats.js");game.time=185;game.level=17;game.weapons={blade:4,flame:4,shard:3};game.passives={power:2,frostbrand:2,rime:2};game.choiceHistory=["flame","cinder","flame","cinder"];game.stats=characterStats(game.character,game.passives,game.meta,game.talents,game.weapons);game.player.maxHp=game.stats.maxHp;game.state="level";game.choices=game.rollUpgrades();game.on("weapons");game.on("hud");game.on("level");');
      await delay(100);await shot('upgrade-desktop');
      assert(await evaluate('return document.getElementById("upgrade-affinity").textContent.includes("火焰")&&document.querySelectorAll(".upgrade-card:not(.fusion-card) .item-tags").length===3'));
      assert(await evaluate('const {game}=await import("/src/main.js");const before=JSON.stringify(game.choices);document.getElementById("level-menu-button").click();if(game.state!=="paused")return false;document.getElementById("resume-button").click();return game.state==="level"&&before===JSON.stringify(game.choices)'));
      assert(await evaluate('document.querySelector(".banish-button").click();const {game}=await import("/src/main.js");return game.banishes===2&&game.banished.size===1'));
      assert(await evaluate('const {game}=await import("/src/main.js");const index=game.choices.findIndex(i=>i.key==="solar"&&i.fusion);document.querySelectorAll(".upgrade-card")[index].click();return game.weapons.solar===1&&!game.weapons.blade&&!game.weapons.flame&&game.discoveredFusions.has("solar")'));
      await evaluate('document.getElementById("status-button").click();document.getElementById("sheet-tab-items").click();');
      await shot('build-desktop');
      assert(await evaluate('return document.getElementById("sheet-build-summary").textContent.includes("3 / 6")'));
      await evaluate('document.getElementById("sheet-close").click();const {game}=await import("/src/main.js");const {characterStats}=await import("/src/stats.js");game.time=602;game.level=40;game.weapons={starfall:2,ricochet:2,soulchain:2,lance:4,sentinel:4,frost:4};game.passives={aegis:2,venomfang:2,rime:2,area:1,armor:2,thorns:2};game.stats=characterStats(game.character,game.passives,game.meta,game.talents,game.weapons);game.player.hp=game.player.maxHp=game.stats.maxHp;game.player.invincible=50;game.enemies=[];game.drops=[];game.zones=[];game.projectiles=[];game.bossMilestones=new Set([180,360,600]);game.spawnClock=10;game.waveClock=10;game.pendingLevels=0;game.xpNext=10000;for(let i=0;i<100;i++){const e=game.spawnEnemy(i%4===0?"knight":i%3===0?"ghost":"reaper");const a=i*2.4,r=85+(i%10)*12;e.x=game.player.x+Math.cos(a)*r;e.y=game.player.y+Math.sin(a)*r;}game.spawnBoss(600);game.on("weapons");for(let i=0;i<96;i++)game.update(.025);game.state="over";game.on("hud");game.render();');
      await delay(100);await shot('combat-desktop');
      await evaluate('const {game}=await import("/src/main.js");game.state="running";game.end(false);for(let i=0;i<100&&document.getElementById("end-screen").classList.contains("hidden");i++)await new Promise(r=>setTimeout(r,10));');
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
            for(let i=0;i<choices.length;i+=4){
              game.choices=choices.slice(i,i+4);game.on('level');
              const modal=document.querySelector('.level-modal'),footer=document.querySelector('.level-footer').getBoundingClientRect();
              const buttons=[...document.querySelectorAll('#level-screen button')].filter(e=>e.getClientRects().length),cards=[...document.querySelectorAll('.upgrade-card')];
              const fits=modal.scrollHeight<=modal.clientHeight+1&&modal.scrollWidth<=modal.clientWidth+1&&buttons.every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth})&&cards.every(e=>{
                const r=e.getBoundingClientRect(),art=e.querySelector('canvas'),icon=art.getBoundingClientRect(),pixels=art.getContext('2d').getImageData(0,0,art.width,art.height).data;return icon.width>=24&&icon.height>=24&&pixels.some((value,index)=>index%4===3&&value>0)&&document.elementFromPoint(icon.x+icon.width/2,icon.y+icon.height/2)?.closest('.upgrade-card')===e&&r.bottom<=footer.top&&e.scrollHeight<=e.clientHeight+1&&e.scrollWidth<=e.clientWidth+1&&[...e.children].filter(c=>c.getClientRects().length).every(c=>{const s=c.getBoundingClientRect();return s.top>=r.top&&s.bottom<=r.bottom+1&&s.left>=r.left&&s.right<=r.right+1});
              });
              if(!fits)return {items:game.choices.map(c=>c.key),known,panel:[modal.clientHeight,modal.scrollHeight],cards:cards.map(e=>({text:e.innerText,size:[e.clientWidth,e.scrollWidth,e.clientHeight,e.scrollHeight]}))};
            }
          }
          game.discoveredFusions=discovered;game.choices=[choices.find(c=>c.key==='forkseed'),choices.find(c=>c.key==='spore'),choices.find(c=>c.key==='stormcoil'),choices.find(c=>c.key==='blade')];game.on('level');return failures;
        `);
        await shot('upgrade-'+width+'x'+height);
        assert.deepEqual(layouts,[],'mobile upgrade choices, full effects and actions fit '+width+'x'+height);
      }
      await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
      const pendingChoices=await evaluate('const {game}=await import("/src/main.js");return JSON.stringify([game.choices,game.pendingLevels,game.rerolls])');
      await evaluate('document.getElementById("level-tree-button").click();document.getElementById("sheet-close").click();document.getElementById("level-status-button").click();document.getElementById("sheet-tab-catalog").click();');await delay(100);await shot('catalog-mobile');
      assert(await evaluate('const tiles=[...document.querySelectorAll("#catalog-list .catalog-item")];return tiles.length>0&&tiles.length<=12&&Number(document.getElementById("catalog-count").textContent.split("/")[0])>=tiles.length&&!document.getElementById("catalog-detail").matches(":popover-open")&&tiles.every(tile=>tile.children.length===1&&tile.children[0].tagName==="CANVAS"&&!!tile.getAttribute("aria-label"))'),'catalog opens as accessible icon-only tiles without automatic effect details');
      const catalogTouch=await evaluate('const r=document.querySelector("#catalog-list button").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}');
      await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[catalogTouch]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      assert(await evaluate('return document.getElementById("catalog-detail").matches(":popover-open")&&!!document.getElementById("catalog-list").getClientRects().length'),'touch opens the floating effect over the same grid');
      await shot('catalog-bubble-mobile');
      const outside=await evaluate('const r=document.getElementById("catalog-count").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}');
      await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[outside]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      assert(await evaluate('const {game}=await import("/src/main.js");return game.state==="status"&&!document.getElementById("catalog-detail").matches(":popover-open")'),'tapping outside only dismisses the detail');
      await evaluate('document.querySelector("#catalog-list button").focus()');
      await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
      assert.equal(await evaluate('return document.activeElement.id'),'catalog-detail-close','keyboard enters the bubble controls');
      await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
      assert(await evaluate('return !document.getElementById("catalog-detail").matches(":popover-open")&&document.activeElement.parentElement.id==="catalog-list"'),'Escape restores the focused tile');
      await evaluate('document.querySelector("#catalog-list button").click();document.getElementById("sheet-tab-talents").click()');
      assert(await evaluate('return !document.getElementById("catalog-detail").matches(":popover-open")'),'switching tabs clears the floating catalog detail');
      await evaluate('document.getElementById("sheet-close").click();');
      assert.equal(await evaluate('const {game}=await import("/src/main.js");return JSON.stringify([game.choices,game.pendingLevels,game.rerolls])'),pendingChoices,'mobile references preserve the upgrade choices');
      assert(await evaluate('document.getElementById("reroll-button").click();const {game}=await import("/src/main.js");return game.rerolls===2&&game.state==="level"'));
      await evaluate('const {game}=await import("/src/main.js");game.pendingLevels=0;');
      for(const selector of ['.banish-button','.upgrade-card']){
        const point=await evaluate('const r=document.querySelector('+JSON.stringify(selector)+').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}');
        await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        assert(await evaluate('const {game}=await import("/src/main.js");return '+JSON.stringify(selector)+'===".banish-button"?game.banishes===2&&game.state==="level":game.state==="running"'),'touch '+selector+' activates only its intended action');
      }
      const visuals=await evaluate('const {game}=await import("/src/main.js");const {WEAPONS}=await import("/src/data.js");const {characterStats}=await import("/src/stats.js");let frames=0;game.passives={area:3,amount:2,luck:3,deadeye:3};game.stats=characterStats(game.character,game.passives,{});game.player.invincible=1000;game.pendingLevels=0;game.xpNext=1e9;game.spawnClock=game.waveClock=1e9;game.bossMilestones=new Set([180,360,600]);for(const [key,data] of Object.entries(WEAPONS)){game.state="running";game.weapons={[key]:data.maxLevel||6};game.timers={};game.projectiles=[];game.zones=[];game.effects=[];game.enemies=[];for(let i=0;i<16;i++){const e=game.spawnEnemy("skeleton",false,30+i*8);e.hp=e.maxHp=1e8;}for(let i=0;i<100;i++){game.update(.05);game.render();frames++;}}game.state="over";return frames;');
      assert.equal(visuals,Object.keys(WEAPONS).length*100);
      await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
      await call('Emulation.setTouchEmulationEnabled',{enabled:false});
      for(const character of CHARACTERS){
        const before=await evaluate(`const {game}=await import('/src/main.js');const {CHARACTERS}=await import('/src/data.js');game.start(CHARACTERS.find(c=>c.id==='${character.id}'));game.level=30;game.time=240;game.pendingLevels=2;game.state='level';game.choices=game.rollUpgrades();game.on('level');return JSON.stringify([game.choices,game.rerolls,game.pendingLevels]);`);
        await call('Input.dispatchKeyEvent',{type:'keyDown',key:'t',code:'KeyT'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'t',code:'KeyT'});
        assert(await evaluate('const {game}=await import("/src/main.js");return game.state==="status"&&document.querySelectorAll(".talent-node").length===10&&[...document.querySelectorAll(".talent-node")].every(n=>!n.textContent.trim()&&n.querySelector("canvas"))&&!document.querySelector("#talent-detail:popover-open")'));
        const hover=await evaluate('const r=document.getElementById("talent-innate").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}');
        await call('Input.dispatchMouseEvent',{type:'mouseMoved',...hover});
        assert(await evaluate('return document.getElementById("talent-detail").matches(":popover-open")&&document.getElementById("talent-detail-title").textContent.length>0'),'hover opens innate details');
        await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});
        await evaluate('document.querySelector("#talent-detail .detail-bubble-close").click()');
        await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowDown',code:'ArrowDown'});
        assert.equal(await evaluate('return document.activeElement.id'),'talent-'+CHARACTER_TALENTS[character.id].branches[0].nodes[0].id);
        for(const [tier,node] of CHARACTER_TALENTS[character.id].branches[0].nodes.entries()){
          await evaluate(`document.getElementById('talent-${node.id}').focus()`);
          await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
          assert(await evaluate(`const {game}=await import('/src/main.js');return !game.talents['${node.id}']&&document.activeElement.classList.contains('talent-learn');`),'keyboard inspection never spends a point');
          await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
          assert(await evaluate(`const {game}=await import('/src/main.js');return !!game.talents['${node.id}'];`));
          assert.equal(await evaluate('return document.activeElement.id'),'talent-'+node.id,'learning retains the inspected node');
        }
        assert(await evaluate('document.getElementById("talent-innate").click();const m=document.getElementById("hud-talent-meter");return m.value>=0&&m.value<=m.max&&!!m.getAttribute("aria-label")&&document.querySelector(".talent-current").textContent.includes("伤害")'),'live meter and current values');
        assert(await evaluate('return document.querySelectorAll(".talent-node.excluded").length===6'));
        await shot('talents-'+character.id+'-desktop');
        await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
        assert(await evaluate('const {game}=await import("/src/main.js");return game.state==="status"&&!document.querySelector("#talent-detail:popover-open")'),'first Escape only dismisses the speech bubble');
        await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
        assert.equal(await evaluate('const {game}=await import("/src/main.js");if(game.state!=="level")return "wrong state";return JSON.stringify([game.choices,game.rerolls,game.pendingLevels]);'),before,'talent tree must preserve pending upgrades');
      }
      await evaluate('const {game}=await import("/src/main.js");const {CHARACTERS}=await import("/src/data.js");const {characterStats}=await import("/src/stats.js");game.start(CHARACTERS[1]);game.level=24;game.time=240;game.weapons={sentinel:5,meteor:4,frost:4};game.passives={soulpact:2,hoarfrost:2,rotclock:2,bulwark:2,forkseed:2,stormcoil:2};game.stats=characterStats(game.character,game.passives,game.meta,game.talents,game.weapons);game.on("weapons");game.state="level";');
      for(const key of ['soulforge','hailfire']){
        assert(await evaluate(`const {game}=await import('/src/main.js');const {fusionChoice}=await import('/src/fusions.js');game.state='level';game.choices=[fusionChoice('${key}',game.weapons,game.passives)];game.on('level');document.querySelector('.upgrade-card').click();return game.weapons['${key}']===1&&game.discoveredFusions.has('${key}');`));
      }
      await evaluate('document.getElementById("status-button").click();document.getElementById("sheet-tab-items").click();');
      assert(await evaluate(`const {game}=await import('/src/main.js');const {weaponStats}=await import('/src/stats.js');document.querySelector('#sheet-items [data-item-id="sheet-weapon-soulforge"]').click();return document.getElementById('items-detail').matches(':popover-open')&&document.querySelector('#sheet-weapon-soulforge .sheet-facts dd').textContent===String(Math.round(weaponStats('soulforge',game.weapons.soulforge,game.stats,game.character).damage))`));
      await shot('new-content-desktop');
      await evaluate('document.getElementById("sheet-tab-catalog").click();const input=document.getElementById("catalog-search");input.value="召唤";input.dispatchEvent(new Event("input",{bubbles:true}));');
      assert(await evaluate('return document.querySelectorAll("#catalog-list .catalog-item").length>=3&&document.getElementById("catalog-count").textContent.endsWith("/ 96")'));
      await shot('tag-catalog-desktop');await evaluate('document.getElementById("sheet-close").click();');
      await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
      await evaluate('const {game}=await import("/src/main.js");const {CHARACTERS}=await import("/src/data.js");game.start(CHARACTERS[1]);game.level=18;document.getElementById("hud-talents-button").click();');
      const touch=await evaluate('const r=document.getElementById("talent-s_frost1").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};');
      await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(100);
      assert(await evaluate('const {game}=await import("/src/main.js");const root=document.getElementById("status-screen");return !game.talents.s_frost1&&!!document.querySelector("#talent-detail:popover-open .talent-learn")&&root.scrollWidth<=innerWidth&&[...document.querySelectorAll(".talent-node")].every(e=>e.getBoundingClientRect().right<=innerWidth);'));
      const learnTouch=await evaluate('const r=document.querySelector(".talent-learn").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}');
      await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[learnTouch]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      assert(await evaluate('const {game}=await import("/src/main.js");return game.talents.s_frost1&&document.querySelectorAll(".talent-node.excluded").length===6'));
      await shot('talents-mobile');
      await evaluate('document.getElementById("sheet-close").click();const {game}=await import("/src/main.js");game.returnToMenu();document.getElementById("play-button").click();document.getElementById("menu-talents-button").click();');
      assert(await evaluate('document.querySelector(".talent-branch .talent-node").click();return [...document.querySelectorAll(".talent-node")].every(e=>!e.disabled)&&!document.querySelector(".talent-learn")'),'camp is a read-only preview');
      assert(await evaluate('return !document.querySelector(".talent-current")'),'camp must not show the previous run stats');
      assert(await evaluate('const {game}=await import("/src/main.js");const cards=[...document.querySelector("#sheet-items .collection-cards").children];return document.getElementById("sheet-items-label").textContent==="装备预览"&&cards.length===1&&cards[0].id==="sheet-weapon-"+game.character.weapon'),'camp previews only the starting equipment');
      await evaluate('document.getElementById("sheet-close").click();const {game}=await import("/src/main.js");const {characterStats}=await import("/src/stats.js");game.start(game.character,{vitality:5,power:5,regen:5,magnet:5});game.passives={regen:2};game.stats=characterStats(game.character,game.passives,game.meta,game.talents,game.weapons);document.getElementById("status-button").click();');
      assert(await evaluate('const rows=[...document.querySelectorAll(".sheet-stat")];return rows.find(e=>e.textContent.includes("持续恢复")).textContent.includes("0.44")&&rows.find(e=>e.textContent.includes("避伤恢复")).textContent.includes("0.4")&&document.getElementById("sheet-stat-grid").textContent.includes("护盾受击也会打断")'));
      await evaluate('document.querySelector("#sheet-attributes>.mobile-picker [data-choice=stats-4]").click();');
      await shot('recovery-mobile');
      await call('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});await call('Emulation.setTouchEmulationEnabled',{enabled:false});
      await evaluate('document.getElementById("sheet-tab-attributes").click();');await shot('recovery-desktop');
      await evaluate('document.getElementById("sheet-close").click()');
      await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
      for(const [width,height] of [[378,668],[320,568],[844,390]]){
        await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
        await evaluate('const {game}=await import("/src/main.js");const {CHARACTERS}=await import("/src/data.js");game.start(CHARACTERS[0]);game.time=8;game.player.invincible=999;game.bannerUntil=game.toastUntil=0;document.getElementById("event-banner").classList.remove("visible");document.getElementById("toast").classList.remove("visible");game.on("hud");');
        assert(await evaluate(`
          const ids=['status-button','pause-button','hud-talents-button','fusion-tracker','hud-catalog-button','hud-loadout-button','touch-dash'];
          const rects=ids.map(id=>document.getElementById(id).getBoundingClientRect());
          const center={left:innerWidth*.28,right:innerWidth*.72,top:innerHeight*.36,bottom:innerHeight*.7};
          return document.documentElement.scrollWidth<=innerWidth&&!document.getElementById('world-event-card')&&rects.every(r=>r.width>=44&&r.height>=44&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&(r.right<=center.left||r.left>=center.right||r.bottom<=center.top||r.top>=center.bottom))&&rects.every((r,i)=>rects.slice(i+1).every(s=>r.right<=s.left||r.left>=s.right||r.bottom<=s.top||r.top>=s.bottom));
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
      // Timed altar choices: real task completion, paused clocks, explicit costs and safe skipping.
      const prepareAltar=async kind=>evaluate('if(!document.getElementById("status-screen").classList.contains("hidden"))document.getElementById("sheet-close").click();const {game}=await import("/src/main.js"),{updateWorldEvents,ALTAR_ORDER}=await import("/src/world-events.js");game.start(game.character);game.time=60;game.enemies=[];game.spawnClock=game.waveClock=1e9;game.xpNext=1e9;game.bossMilestones=new Set([180,360,600]);game.player.invincible=999;updateWorldEvents(game,0);Object.assign(game.shrines[0],{kind:'+JSON.stringify(kind)+',index:ALTAR_ORDER.indexOf('+JSON.stringify(kind)+'),goal:'+JSON.stringify(kind==='vigil'?12:kind==='hunt'?1:6)+'});Object.assign(game.player,{x:game.shrines[0].x,y:game.shrines[0].y});game.on("hud");');
      const finishAltar=async()=>evaluate('const {game}=await import("/src/main.js"),{updateWorldEvents}=await import("/src/world-events.js"),s=game.activeEvent;if(s.kind==="hunt")game.kill(s.guardian);else if(s.kind==="vigil")s.progress=s.goal;else for(const mote of s.motes)Object.assign(mote,{x:game.player.x,y:game.player.y});updateWorldEvents(game,.01);game.enemies=[];game.drops=[];');
      const altarFit=async label=>assert.deepEqual(await evaluate('const p=document.querySelector(".altar-panel"),r=p.getBoundingClientRect(),issues=[];if(r.top<0||r.left<0||r.bottom>innerHeight||r.right>innerWidth||p.scrollHeight>p.clientHeight+1)issues.push("panel overflow");for(const e of p.querySelectorAll("button,h2,h3,p")){const b=e.getBoundingClientRect();if(b.top<r.top||b.bottom>r.bottom||b.left<r.left||b.right>r.right||e.scrollWidth>e.clientWidth+1)issues.push(e.textContent);if(e.tagName==="BUTTON"&&document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest("button")!==e)issues.push("covered button")}return issues;'),[],label);
      for(const [width,height] of [[1280,900],[800,600],[390,844],[370,665],[320,568],[568,320],[667,375],[844,390]]){
        const mobile=width<=700||height<=500;await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});await call('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:1});
        for(const kind of ['vigil','hunt','souls']){
          await prepareAltar(kind);await delay(80);
          if(mobile){const point=await evaluate('const r=document.getElementById("world-event-start").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}');await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
          else{await call('Input.dispatchKeyEvent',{type:'keyDown',key:'e',code:'KeyE'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'e',code:'KeyE'})}
          assert(await evaluate('const {game}=await import("/src/main.js");return game.activeEvent?.kind==='+JSON.stringify(kind)),'direct task acceptance '+kind);
          await finishAltar();assert(await evaluate('const {game}=await import("/src/main.js");return game.state==="reward"&&game.eventChoices.length===3&&new Set(game.eventChoices).size===3&&game.eventsCompleted===1&&!game.activeEvent&&document.querySelectorAll(".altar-choice").length===3'),'task completion offers exactly three distinct choices');
          const frozen=await evaluate('const {game}=await import("/src/main.js");return [game.time,game.player.x,game.player.hp,game.eventChoices]');await delay(120);assert.deepEqual(await evaluate('const {game}=await import("/src/main.js");return [game.time,game.player.x,game.player.hp,game.eventChoices]'),frozen,'world freezes while choosing');
          await altarFit('altar '+kind+' '+width+'x'+height);
          if(kind==='hunt')await shot('altar-staged-rewards-'+width+'x'+height);
          if(kind==='vigil'){
            await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
            assert(await evaluate('const {game}=await import("/src/main.js");return game.state==="paused"&&game.pauseReturn==="reward"'));
            await evaluate('document.getElementById("resume-button").click();document.getElementById("altar-status").click()');assert(await evaluate('const {game}=await import("/src/main.js");return game.state==="status"&&document.getElementById("sheet-return").textContent.includes("祭坛奖励")'));
            await evaluate('document.getElementById("sheet-close").click()');
          }
          if(kind==='hunt'){
            const before=await evaluate('const {game}=await import("/src/main.js");return game.weapons[game.character.weapon]');await evaluate('document.getElementById("altar-skip").click()');assert(await evaluate('const {game}=await import("/src/main.js");return game.boons.length===0&&game.weapons[game.character.weapon]==='+JSON.stringify(before+3)),'stage three skip upgrades an owned weapon three times');
          }else{
            const picked=await evaluate('const {game}=await import("/src/main.js");return game.eventChoices[1]');
            if(mobile){const point=await evaluate('const r=document.querySelectorAll(".altar-choice")[1].getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}');await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
            else{await call('Input.dispatchKeyEvent',{type:'keyDown',key:'2',code:'Digit2'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'2',code:'Digit2'})}
            assert(await evaluate('const {game}=await import("/src/main.js");return game.boons.length===1&&game.boons[0]==='+JSON.stringify(picked)+'&&game.state==="running"'),'real choice applies once');
            await evaluate('document.getElementById("hud-loadout-button").click()');assert(await evaluate('const {game}=await import("/src/main.js"),{ALTAR_BOONS}=await import("/src/content.js");const id=game.boons[0],button=[...document.querySelectorAll("#sheet-items .catalog-item")].find(b=>b.dataset.itemId==="sheet-boon-"+id);button.click();const text=document.getElementById("sheet-boon-"+id).textContent;return document.getElementById("items-detail").matches(":popover-open")&&text.includes(ALTAR_BOONS[id].positive)&&text.includes(ALTAR_BOONS[id].negative)'),'bargain is inspectable in the current equipment');await evaluate('document.getElementById("sheet-close").click()');
          }
        }
        const all=Object.keys(ALTAR_BOONS);
        for(let i=0;i<all.length;i+=3){await prepareAltar('vigil');await evaluate('const {game}=await import("/src/main.js");game.state="reward";game.eventChoices='+JSON.stringify(all.slice(i,i+3))+';if('+i+'===9)game.weapons={blade:6};game.on("altarReward");');await altarFit('all bargain descriptions '+width+' '+i);if(i===0)await shot('altar-rewards-'+width+'x'+height);await evaluate('document.getElementById("altar-skip").click()')}
      }
      // End timed altar UI coverage.
      // Brief task banners yield to persistent map directions and distances.
      for(const [width,height] of [[1280,900],[800,600],[390,844],[370,665],[320,568],[568,320],[667,375],[844,390]]){
        const mobile=width<=700||height<=500;await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});await call('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:1});await delay(60);
        for(const kind of ['vigil','hunt','souls']){
          await prepareAltar(kind);
          await evaluate('const {game}=await import("/src/main.js");game.lastPhase=(await import("/src/balance.js")).pressureAt(game.time).index;game.camera={x:game.player.x,y:game.player.y};game.time+=3.1;game.update(.01);game.on("hud");game.state="paused"');await delay(450);
          assert(await evaluate('return !document.getElementById("world-event-card")&&getComputedStyle(document.getElementById("event-banner")).opacity==="0"'),'the initial task hint fades '+kind+' '+width);
          const point=await evaluate('const b=document.getElementById("world-event-start"),r=b.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return {x,y,visible:r.width>=44&&r.height>=44&&x>=0&&x<=innerWidth&&y>=0&&y<=innerHeight&&document.elementFromPoint(x,y)?.closest("button")===b}');assert(point.visible,'task acceptance remains reachable after the hint fades');
          await evaluate('const {game}=await import("/src/main.js");game.state="running"');
          if(mobile){await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y}]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
          else for(const type of ['mousePressed','mouseReleased'])await call('Input.dispatchMouseEvent',{type,x:point.x,y:point.y,button:'left',clickCount:1});
          assert(await evaluate('const {game}=await import("/src/main.js");return game.activeEvent?.kind==='+JSON.stringify(kind)+'&&document.getElementById("event-banner").classList.contains("visible")'),'acceptance briefly explains the objective');
          await evaluate('const {game}=await import("/src/main.js");game.time+=3.1;game.update(.01);game.state="paused";game.on("hud")');await delay(450);
          assert(await evaluate('const {game}=await import("/src/main.js");return !!game.activeEvent&&getComputedStyle(document.getElementById("event-banner")).opacity==="0"&&document.getElementById("world-event-start").classList.contains("hidden")'),'accepted tasks continue with a clear top HUD');
          const mapLabels=await evaluate('const {game}=await import("/src/main.js"),{worldEventTarget}=await import("/src/world-events.js"),target=worldEventTarget(game),g=game.g,fill=g.fillText,labels=[];g.fillText=function(text,x,y){labels.push({text,x,y});return fill.call(this,text,x,y)};try{game.render()}finally{g.fillText=fill}const d=Math.round(Math.hypot(target.x-game.player.x,target.y-game.player.y));return labels.filter(l=>l.text.endsWith(" · "+d)).map(l=>({...l,w:game.w,h:game.h}));');
          assert(mapLabels.length&&mapLabels.every(l=>l.x>=0&&l.x<=l.w&&l.y>=0&&l.y<=l.h),'map labels retain the objective distance '+kind+' '+width);
          if(kind==='souls')await shot('task-map-only-'+width+'x'+height);
          const edgeLabels=await evaluate('const {game}=await import("/src/main.js"),{worldEventTarget}=await import("/src/world-events.js"),target=worldEventTarget(game),g=game.g,fill=g.fillText,labels=[];g.fillText=function(text,x,y){labels.push({text,x,y});return fill.call(this,text,x,y)};try{game.drawCompass(g,{x:target.x,y:target.y+2000},game.w,game.h)}finally{g.fillText=fill}return labels.filter(l=>l.text.includes(" · ")).map(l=>({...l,left:(l.x-50)*game.dpr,right:(l.x+50)*game.dpr,top:(l.y-6)*game.dpr,bottom:(l.y+6)*game.dpr}));');
          assert(edgeLabels.length&&edgeLabels.every(l=>l.left>=0&&l.right<=width&&l.top>=100&&l.bottom<height),'northward map labels stay below the top HUD '+kind+' '+width);

        }
      }
      console.log('PASS: three-second task hints fade; desktop/touch acceptance and map distances remain usable at eight sizes.');
      // End brief task hint coverage.
      // Active buffs use real game timers; run-long contracts and shields have distinct labels.
      for(const [width,height] of [[1280,900],[800,600],[390,844],[370,665],[320,568],[568,320],[667,375],[844,390]]){
        const mobile=width<=700||height<=500;await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});await call('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:1});await delay(60);
        for(const index of [0,1,2]){
          await evaluate('const {game}=await import("/src/main.js"),{CHARACTERS,META}=await import("/src/data.js"),{CHARACTER_TALENTS}=await import("/src/talents.js");if(!document.getElementById("status-screen").classList.contains("hidden"))document.getElementById("sheet-close").click();game.start(CHARACTERS['+index+'],Object.fromEntries(Object.entries(META).map(([key,info])=>[key,info.max])));game.time=100;game.level=30;game.nextShrine=3;game.enemies=[];game.spawnClock=game.waveClock=1e9;game.xpNext=1e9;game.lastPhase=1;game.bossMilestones=new Set([180,360,600]);for(const node of CHARACTER_TALENTS[game.character.id].branches['+([2,0,1][index])+'].nodes)game.learnTalent(node.id);for(const id of ["horizon","frenzy","glass"]){game.state="reward";game.eventChoices=[id];game.chooseAltarReward(0)}const e=game.spawnEnemy("skeleton");Object.assign(e,{x:game.player.x+50,y:game.player.y,hp:1e9,maxHp:1e9});const roll=Math.random;Math.random=()=>0;try{game.hit(e,1,game.player.x,game.player.y,0,false,game.character.weapon)}finally{Math.random=roll}game.dash();game.player.shield=16;game.player.invincible=2;game.enemies=[];game.projectiles=[];game.zones=[];game.state="paused";game.on("hud");game.render()');
          const labels=await evaluate('return Object.fromEntries([...document.querySelectorAll("#hud-buffs li")].map(e=>[e.dataset.buff,e.lastElementChild.textContent]))');assert.equal(labels.tempo,'6.0s');assert.equal(labels.flare,'8.0s');assert.equal(labels.wind,'6.0s');assert.equal(labels.invincible,'2.0s');assert.equal(labels.shield,'16盾');for(const id of ['horizon','frenzy','glass'])assert.equal(labels[id],'本局');
          if(index!==1)assert.equal(labels[index===0?'assaultUntil':'ghostUntil'],index===0?'4.0s':'3.0s');
          assert.deepEqual(await evaluate('const list=document.getElementById("hud-buffs"),issues=[];for(const e of list.children){const r=e.getBoundingClientRect(),label=e.lastElementChild;if(r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight||label.scrollWidth>label.clientWidth+1)issues.push(e.dataset.buff);if(!e.getAttribute("aria-label")||e.getAttribute("role")!=="img")issues.push("missing accessible label");for(const b of document.querySelectorAll("#hud button")){if(!b.getClientRects().length)continue;const q=b.getBoundingClientRect();if(r.left<q.right&&r.right>q.left&&r.top<q.bottom&&r.bottom>q.top)issues.push("overlaps "+b.id)}}return issues;'),[],'buff icons fit without covering controls '+width+' '+index);
          await delay(120);assert.deepEqual(await evaluate('return Object.fromEntries([...document.querySelectorAll("#hud-buffs li")].map(e=>[e.dataset.buff,e.lastElementChild.textContent]))'),labels,'paused buff countdowns freeze');
          if(index===0)await shot('buff-countdowns-'+width+'x'+height);
          await evaluate('const {game}=await import("/src/main.js");game.state="running";for(let i=0;i<10;i++)game.update(.05);game.state="paused";game.on("hud")');assert.equal(await evaluate('return document.querySelector("#hud-buffs [data-buff=tempo] span").textContent'),'5.5s','countdown follows elapsed game time');
          await evaluate('const {game}=await import("/src/main.js");game.state="running";for(let i=0;i<154;i++)game.update(.05);game.state="paused";game.on("hud")');assert.deepEqual(await evaluate('return [...document.querySelectorAll("#hud-buffs li")].map(e=>e.dataset.buff)'),['shield','horizon','frenzy','glass'],'expired temporary effects disappear while shield and run contracts remain');
          await evaluate('const {game}=await import("/src/main.js");game.enemies=[];game.spawnBoss(600);game.on("hud")');assert(await evaluate('return document.getElementById("boss-name").textContent.includes("剩余 2 位")'),'extra final bosses are counted in the HUD');
          await evaluate('const {game}=await import("/src/main.js");const bosses=game.enemies.filter(e=>e.final);game.kill(bosses[0]);game.on("hud");if(game.finalDefeated||document.getElementById("boss-bar").classList.contains("hidden"))throw Error("premature victory");if(document.querySelector("#hud-buffs [data-buff=tempo] span").textContent!=="10.0s")throw Error("conquest must display its real ten-second buff");game.kill(bosses[1]);if(!game.finalDefeated)throw Error("all bosses must finish the fight");game.start(game.character);game.on("hud")');assert(await evaluate('return !document.querySelector("#hud-buffs [data-buff=tempo]")&&!document.querySelector("#hud-buffs [data-buff=glass]")'),'restarting clears timed effects and contracts');
        }
      }
      console.log('PASS: active buff icons, actual countdowns, pause/expiration/reset, run contracts, shield values and multi-boss HUD across three characters and eight sizes.');
      // End buff HUD coverage.


      await evaluate('const {game}=await import("/src/main.js");game.returnToMenu();document.getElementById("meta-button").click();');
      assert(await evaluate('return document.getElementById("meta-upgrades").textContent.includes("星火")'));await shot('recovery-altar');
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
          const latest=readSave(),summary={purchases:results.filter(r=>r.purchased).length,embers:latest.embers,level:latest.meta.vitality,runs:latest.runs,kills:latest.kills,syncedAudio:sibling.sound.muted===muted&&gain===(muted?0:.55)};
          const {META}=await import('/src/data.js');localStorage.setItem('afterlight-save-v1',JSON.stringify({metaVersion:3,embers:300,meta:Object.fromEntries(Object.entries(META).map(([key,info])=>[key,info.max]))}));
          await Promise.all(frames.map((frame,i)=>frame.contentWindow.eval('(async()=>{const {readSave,writeSave}=await import("/src/data.js");return writeSave(readSave(),{result:{reward:'+(i?11:7)+',time:60,kills:3,won:false}})})()')));
          summary.refundBalance=readSave().embers;summary.refundVersion=JSON.parse(localStorage.getItem('afterlight-save-v1')).metaVersion;return summary;
        }finally{for(const frame of frames)frame.remove()}
      `);
      assert.deepEqual(concurrentSave,{purchases:1,embers:58,level:1,runs:2,kills:6,syncedAudio:true,refundBalance:435618,refundVersion:4},'independent pages must serialize purchases, preserve settlements and apply one price refund');
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
        const {characterStats}=await import('/src/stats.js');game.stats=characterStats(game.character,game.passives,game.meta,game.talents,game.weapons);
        document.getElementById('status-button').click();
      `);
      const mobileFit=async label=>assert.deepEqual(await evaluate(`
        const panel=document.querySelector('.modal-wrap:not(.hidden) :is(.panel,.level-modal)'),rect=panel.getBoundingClientRect(),issues=[];
        if(rect.left<0||rect.top<0||rect.right>innerWidth+1||rect.bottom>innerHeight+1)issues.push('panel outside viewport');
        for(const element of [panel,...panel.querySelectorAll('*')]){
          if(!element.getClientRects().length||element.closest('details:not([open]),.detail-bubble')||element.matches('option'))continue;
          const style=getComputedStyle(element),r=element.getBoundingClientRect();
          if(['auto','scroll','hidden'].includes(style.overflowY)&&element.scrollHeight>element.clientHeight+2)issues.push((element.id||element.className)+' vertical overflow');
          if(r.left<rect.left-1||r.right>rect.right+1||r.top<rect.top-1||r.bottom>rect.bottom+1)issues.push((element.id||element.className)+' outside panel');
        }
        for(const bubble of panel.querySelectorAll('.detail-bubble:popover-open')){const r=bubble.getBoundingClientRect(),copy=bubble.querySelector('.detail-bubble-copy');if(r.top<0||r.left<0||r.right>innerWidth||r.bottom>innerHeight)issues.push('bubble outside viewport');if(copy.scrollHeight>copy.clientHeight+2)issues.push('bubble content overflow')}
        return issues;
      `),[],label);
      const chooseMobile=async(selector,value)=>evaluate(`const picker=document.querySelector(${JSON.stringify(selector)});if(picker.classList.contains('hidden'))picker.parentElement.querySelector('.mobile-page-back').click();[...picker.children].find(button=>button.dataset.choice===${JSON.stringify(value)}).click();`);
      const visitMobile=async(selector,label)=>{
        const options=await evaluate(`const picker=document.querySelector(${JSON.stringify(selector)});return picker?[...picker.children].map(button=>button.dataset.choice):[];`);
        for(const value of options){await chooseMobile(selector,value);await mobileFit(label+' / '+value)}
      };
      for(const [width,height] of [[370,665],[320,568],[390,844],[568,320],[667,375],[844,390]]){
        await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await delay(50);
        for(const tab of ['attributes','talents','items','fusion','catalog']){
          await evaluate(`document.getElementById('sheet-tab-${tab}').click()`);
          if(tab==='attributes')await visitMobile('#sheet-attributes>.mobile-pages-picker','attributes '+width);
          if(tab==='talents'){
            for(const id of await evaluate('return [...document.querySelectorAll(".talent-node")].map(e=>e.id)')){
              await evaluate('document.getElementById('+JSON.stringify(id)+').click()');
              assert(await evaluate('const b=document.getElementById("talent-detail"),r=b.getBoundingClientRect();return b.matches(":popover-open")&&r.top>=0&&r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight'),'talent bubble '+id+' '+width);
              await evaluate('document.querySelector("#talent-detail .detail-bubble-close").click()');
            }
            await mobileFit('icon tree '+width);
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
                  assert(await evaluate(`const root=document.querySelector('${selector}'),id=${JSON.stringify(id)};[...root.querySelectorAll('.catalog-item')].find(button=>button.dataset.itemId===id).click();return !root.querySelector('.catalog-browser').classList.contains('hidden')&&root.querySelector('.detail-bubble').matches(':popover-open')&&!document.getElementById(id).classList.contains('hidden')&&document.activeElement===root.querySelector('.detail-bubble-close');`),'tile opens the selected equipment or recipe');
                  await mobileFit(tab+' effect '+width+' '+id);
                  if(tab==='fusion')assert(await evaluate(`
                    const root=document.querySelector('${selector}'),id=${JSON.stringify(id)},button=document.getElementById(id).querySelector('.fusion-track-button');
                    if(!button||!button.hasAttribute('aria-pressed')||button.disabled)return true;
                    const before=button.getAttribute('aria-pressed');button.click();const next=document.getElementById(id).querySelector('.fusion-track-button');
                    if(root.dataset.selected!==id||!root.querySelector('.detail-bubble').matches(':popover-open')||next.getAttribute('aria-pressed')===before||document.activeElement!==next)return false;
                    next.click();return document.getElementById(id).querySelector('.fusion-track-button').getAttribute('aria-pressed')===before;
                  `),'tracking preserves the current recipe and keyboard focus');
                  await evaluate(`document.querySelector('${selector} .detail-bubble-close').click()`);
                  assert.deepEqual(await evaluate(`return [document.querySelector('${selector} .collection-page').textContent,document.activeElement.dataset.itemId]`),[page,id],'back restores the equipment or recipe page and focus');
                }
                if(await evaluate(`return document.querySelector('${selector} .collection-next').disabled`))break;
                await evaluate(`document.querySelector('${selector} .collection-next').click()`);
              }
            }
            const expected=tab==='items'?await evaluate(`const {game}=await import('/src/main.js');return [...Object.keys(game.weapons).map(key=>'sheet-weapon-'+key),...Object.keys(game.passives).map(key=>'sheet-passive-'+key)]`):await evaluate(`return [...document.querySelector('${selector} .collection-cards').children].map(card=>card.id)`);
            assert.deepEqual([...seen].sort(),expected.sort(),'all equipment and known recipes remain reachable');
            if(tab==='items')assert(await evaluate('return document.getElementById("sheet-items-label").textContent==="本局装备"&&![...document.querySelector("#sheet-items .collection-category").children].some(button=>button.dataset.choice==="pickup")'),'the loadout does not duplicate the permanent pickup catalog');
            await evaluate(`document.querySelector('${selector} .catalog-item').click()`);
            await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
            assert(await evaluate(`const {game}=await import('/src/main.js');return game.state==='status'&&!document.querySelector('${selector} .detail-bubble').matches(':popover-open')`),'Escape returns to the icon grid');
          }

          if(tab==='catalog'){
            await chooseMobile('#catalog-category','all');await evaluate('document.getElementById("catalog-clear").click()');
            const seen=[];
            while(true){
              const page=await evaluate('return document.getElementById("catalog-page").textContent'),ids=await evaluate('return [...document.querySelectorAll("#catalog-list .catalog-item")].map(button=>button.dataset.itemId)');
              assert(ids.length>0&&ids.length<=12);seen.push(...ids);
              if(width===390&&ids.includes('weapon:crescent')){
                const parked=await evaluate('const r=[...document.querySelectorAll("#catalog-list button")].find(b=>b.dataset.itemId==="weapon:crescent").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}');
                await call('Input.dispatchMouseEvent',{type:'mouseMoved',...parked});
                assert(await evaluate('return document.getElementById("catalog-detail").matches(":popover-open")'),'mouse movement opens the hovered item');
                const sibling=ids.find(id=>id!=='weapon:crescent');await evaluate('[...document.querySelectorAll("#catalog-list button")].find(b=>b.dataset.itemId==='+JSON.stringify(sibling)+').click();document.getElementById("catalog-detail-close").click()');await delay(60);
                assert(await evaluate('return document.activeElement.dataset.itemId==='+JSON.stringify(sibling)+'&&!document.getElementById("catalog-detail").matches(":popover-open")'),'uncovering a stationary pointer cannot reopen another item or steal keyboard focus');
                await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});
              }
              await mobileFit('catalog grid '+width+' '+page);
              for(const id of ids){
                assert(await evaluate(`const {catalogItem}=await import('/src/data.js');const id=${JSON.stringify(id)},item=catalogItem(id);[...document.querySelectorAll('#catalog-list .catalog-item')].find(button=>button.dataset.itemId===id).click();return !document.getElementById('catalog-browser').classList.contains('hidden')&&document.getElementById('catalog-detail').matches(':popover-open')&&document.querySelector('#catalog-detail .catalog-description').textContent===item.data.desc&&document.getElementById('catalog-detail-title').textContent===item.data.name&&document.activeElement.id==='catalog-detail-close';`),'click opens one short effect');
                assert(await evaluate('const b=document.getElementById("catalog-detail"),r=b.getBoundingClientRect(),c=document.getElementById("catalog-detail-body"),a=document.querySelector("#catalog-list .selected").getBoundingClientRect(),close=document.getElementById("catalog-detail-close").getBoundingClientRect();return r.top>=0&&r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&c.scrollHeight<=c.clientHeight+1&&!(r.left<a.right&&r.right>a.left&&r.top<a.bottom&&r.bottom>a.top)&&document.elementFromPoint(close.x+close.width/2,close.y+close.height/2)?.id==="catalog-detail-close"'),'full speech bubble fits '+width+' '+id);
                await evaluate('document.getElementById("catalog-detail-close").click()');
                assert.deepEqual(await evaluate('return [document.getElementById("catalog-page").textContent,document.activeElement.dataset.itemId]'),[page,id],'return preserves the page and focused tile');
              }
              if(await evaluate('return document.getElementById("catalog-next").disabled'))break;
              await evaluate('document.getElementById("catalog-next").click()');
            }
            assert.equal(new Set(seen).size,seen.length,'no duplicate tiles across pages');assert.equal(seen.length,96,'every discovered item can be reached by paging');
            await chooseMobile('#catalog-category','pickup');await mobileFit('pickup category '+width);
            assert(await evaluate('return [...document.querySelectorAll("#catalog-list .catalog-item")].every(button=>button.dataset.itemId.startsWith("pickup:"))'));
            await chooseMobile('#catalog-category','all');
            await evaluate('const input=document.getElementById("catalog-search");input.value="不存在的道具";input.dispatchEvent(new Event("input"));');await mobileFit('empty search '+width);await evaluate('document.getElementById("catalog-clear").click()');
            await evaluate('document.querySelector("#catalog-list .catalog-item").click()');
            await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
            assert(await evaluate('const {game}=await import("/src/main.js");return game.state==="status"&&!document.getElementById("catalog-detail").matches(":popover-open")'),'Escape dismisses the bubble while keeping the collection');
          }
          await mobileFit(tab+' '+width+'x'+height);await shot('menus-'+tab+'-'+width+'x'+height);
        }
        await evaluate(`
          document.getElementById('sheet-tab-items').click();document.querySelector('#sheet-items .collection-category [data-choice=weapon]').click();
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
        await evaluate('const {game}=await import("/src/main.js");game.returnToMenu();game.start(game.character);game.level=30;game.time=300;game.player.invincible=1e9;game.spawnClock=game.waveClock=1e9;game.weapons={solar:3,glacier:3,meteor:5,flame:6};game.passives={soulpact:3,bulwark:3,haste:5,curse:5,regen:5,volatile:3};const {characterStats}=await import("/src/stats.js");game.stats=characterStats(game.character,game.passives,game.meta,game.talents,game.weapons);document.getElementById("status-button").click()');
      }
      // Every status rank displays its current/next cooldown without clipping its purchase action.
      for(const [width,height] of [[1280,900],[800,600],[390,844],[370,665],[320,568],[568,320],[667,375],[844,390]]){
        await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=700||height<=500});await delay(60);
        await evaluate('const {game}=await import("/src/main.js");if(!document.getElementById("status-screen").classList.contains("hidden"))document.getElementById("sheet-close").click();game.returnToMenu();document.getElementById("meta-button").click()');
        for(const [key,info] of Object.entries(META).filter(([,info])=>info.cooldowns))for(let rank=0;rank<=info.max;rank++){
          await evaluate('const {META}=await import("/src/data.js");localStorage.setItem("afterlight-save-v1",JSON.stringify({metaVersion:4,embers:1000000,meta:{...Object.fromEntries(Object.entries(META).map(([key,info])=>[key,info.max])),['+JSON.stringify(key)+']:'+rank+'}}));dispatchEvent(new StorageEvent("storage",{key:"afterlight-save-v1"}));document.querySelector("[data-meta='+key+']").click()');
          const fit=await evaluate('const b=document.getElementById("meta-detail"),r=b.getBoundingClientRect(),c=b.querySelector(".detail-bubble-copy"),buy=document.getElementById("meta-buy"),a=buy.getBoundingClientRect();return {out:r.top<0||r.left<0||r.bottom>innerHeight||r.right>innerWidth,clipped:c.scrollHeight>c.clientHeight+1||c.scrollWidth>c.clientWidth+1,covered:document.elementFromPoint(a.x+a.width/2,a.y+a.height/2)!==buy,state:document.getElementById("meta-detail-state").textContent,disabled:buy.disabled}');
          assert(!fit.out&&!fit.clipped&&!fit.covered,'status rank fits '+key+' '+rank+' '+width+'x'+height);assert.equal(fit.disabled,rank===info.max);if(rank)assert(fit.state.includes('当前冷却 '+info.cooldowns[rank-1]+' 秒'));if(rank&&rank<info.max)assert(fit.state.includes('→ '+info.cooldowns[rank]+' 秒'));
        }
        await shot('status-ranks-'+width+'x'+height);await evaluate('document.querySelector("#meta-screen [data-close]").click()');
      }
      // End status-rank coverage.
      // Starter icon controls share the permanent tree's bubbles at every supported size.
      for(const [width,height] of [[1280,900],[800,600],[390,844],[370,665],[320,568],[568,320],[667,375],[844,390]]){
        await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=700||height<=500});await delay(60);
        await evaluate('const {game}=await import("/src/main.js");if(!document.getElementById("status-screen").classList.contains("hidden"))document.getElementById("sheet-close").click();game.returnToMenu();localStorage.setItem("afterlight-save-v1",JSON.stringify({embers:30000}));dispatchEvent(new StorageEvent("storage",{key:"afterlight-save-v1"}));document.getElementById("play-button").click();document.getElementById("camp-weapon-button").click()');
        assert.equal(await evaluate('return document.querySelectorAll("#weapon-choices [data-starter]").length'),Object.keys(STARTING_WEAPONS).length+1);
        for(const key of ['default',...Object.keys(STARTING_WEAPONS)]){
          await evaluate('document.querySelector("[data-starter='+key+']").click()');
          assert.deepEqual(await evaluate('const p=document.querySelector(".weapon-panel"),b=document.getElementById("weapon-detail"),issues=[];for(const e of [p,...p.querySelectorAll(".meta-heading,#weapon-choices,#weapon-feedback"),b,...b.querySelectorAll(".detail-bubble-copy,h3,p,button")]){const r=e.getBoundingClientRect();if(!r.width)continue;if(r.left<0||r.top<0||r.right>innerWidth+1||r.bottom>innerHeight+1||e!==b&&(e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1))issues.push(e.id||e.className)}for(const e of b.querySelectorAll("button:not(:disabled)")){const r=e.getBoundingClientRect();if(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest("button")!==e)issues.push("covered "+e.id)}return issues'),[],'starter fits '+key+' '+width+'x'+height);
        }
        await shot('starter-icons-'+width+'x'+height);
        await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
        assert(await evaluate('return !document.getElementById("weapon-detail").matches(":popover-open")&&!document.getElementById("weapon-screen").classList.contains("hidden")&&document.activeElement.dataset.starter==="crescent"'),'first Escape returns to starter icon '+width+'x'+height);
        await call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowLeft',code:'ArrowLeft',windowsVirtualKeyCode:37});
        assert(await evaluate('return document.activeElement.dataset.starter==="sentinel"&&document.getElementById("weapon-detail").matches(":popover-open")'),'arrow key opens adjacent starter');
        await evaluate('document.getElementById("weapon-detail-close").click();document.querySelector("#weapon-screen [data-close]").click()');
      }
      // Upgrade a complete path through real controls, including locked prerequisites and costly abilities.
      await call('Emulation.setDeviceMetricsOverride',{width:320,height:568,deviceScaleFactor:1,mobile:true});await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
      await evaluate('const {game}=await import("/src/main.js"),{readSave,writeSave}=await import("/src/data.js");await writeSave(readSave());if(!document.getElementById("status-screen").classList.contains("hidden"))document.getElementById("sheet-close").click();game.returnToMenu();localStorage.setItem("afterlight-save-v1",JSON.stringify({embers:10000}));dispatchEvent(new StorageEvent("storage",{key:"afterlight-save-v1"}));document.getElementById("meta-button").click();document.querySelector("[data-meta=conquest]").click()');
      assert(await evaluate('return document.getElementById("meta-buy").disabled&&document.getElementById("meta-detail-state").textContent.includes("余烬之力")'),'later abilities cannot bypass any prerequisite');
      for(const key of META_TREES[0].nodes)for(let rank=0;rank<META[key].max;rank++){
        await evaluate('document.getElementById("meta-detail-close").click();document.querySelector("[data-meta='+key+']").click()');await delay(50);
        assert.equal(await evaluate('return document.getElementById("meta-buy").textContent'),'强化 '+metaCost(key,rank).toLocaleString()+' ✦','the actual purchase control shows the reduced price');
        const point=await evaluate('const b=document.getElementById("meta-buy"),r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,disabled:b.disabled,covered:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)!==b}');assert(!point.disabled&&!point.covered,'purchase action fits '+key+' rank '+rank);
        await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y}]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        assert(await evaluate('const {readSave}=await import("/src/data.js");for(let i=0;i<50;i++){if(readSave().meta['+JSON.stringify(key)+']==='+JSON.stringify(rank+1)+')return true;await new Promise(r=>setTimeout(r,10))}return false'),'tree purchase saves '+key+' rank '+rank);
      }
      assert(await evaluate('const {readSave}=await import("/src/data.js");return readSave().embers===2400&&document.getElementById("meta-buy").disabled'),'full path spends exactly its published price');await shot('permanent-path-completed');
      await call('Page.reload');await delay(900);assert(await evaluate('const {readSave}=await import("/src/data.js");const s=readSave();return s.meta.power===5&&s.meta.reach===5&&s.meta.tempo===3&&s.meta.flare===2&&s.meta.conquest===1&&s.metaVersion===4&&s.embers===2400'),'growth path survives reload');
      await evaluate('const {META,readSave,writeSave}=await import("/src/data.js");localStorage.setItem("afterlight-save-v1",JSON.stringify({metaVersion:2,embers:700,meta:Object.fromEntries(Object.entries(META).map(([key,info])=>[key,info.cooldowns?3:info.max]))}));dispatchEvent(new StorageEvent("storage",{key:"afterlight-save-v1"}));await writeSave(readSave())');
      await call('Page.reload');await delay(900);assert(await evaluate('const {readSave}=await import("/src/data.js");const s=readSave();return s.metaVersion===4&&s.embers===754000&&s.meta.flare===2&&s.meta.conquest===1&&s.meta.ward===2&&s.meta.laststand===1'),'rank-reduction refund and retained skills survive browser reload');
      // Starter weapons are unlocked separately, with no relics or milestone guarantees.
      await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
      await evaluate('const {game}=await import("/src/main.js");if(!document.getElementById("status-screen").classList.contains("hidden"))document.getElementById("sheet-close").click();game.returnToMenu();localStorage.setItem("afterlight-save-v1",JSON.stringify({embers:30000}));dispatchEvent(new StorageEvent("storage",{key:"afterlight-save-v1"}));document.getElementById("play-button").click();document.getElementById("camp-weapon-button").click();await new Promise(r=>setTimeout(r,60));document.querySelector("[data-starter=flame]").click()');
      await shot('starter-unlock-ready');
      for(const id of ['weapon-buy','weapon-equip']){
        const point=await evaluate('const r=document.getElementById('+JSON.stringify(id)+').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}');await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        assert(await evaluate('const {readSave}=await import("/src/data.js");for(let i=0;i<50;i++){const s=readSave();if('+(id==='weapon-buy'?'s.weaponUnlocks.includes("flame")':'s.selectedWeapon==="flame"')+')return true;await new Promise(r=>setTimeout(r,10))}return false'),'touch '+id+' saves');
      }
      assert(await evaluate('const {readSave}=await import("/src/data.js");return readSave().embers===29400&&!document.getElementById("legacy-choice")&&!document.getElementById("meta-tabs")'));
      await evaluate('document.querySelector("#weapon-screen [data-close]").click();document.getElementById("menu-status-button").click()');assert.equal(await evaluate('return [...document.querySelector("#sheet-items .collection-cards").children].map(c=>c.id).join()'),'sheet-weapon-flame');
      await evaluate('document.getElementById("sheet-close").click();document.getElementById("start-button").click()');assert(await evaluate('const {game}=await import("/src/main.js");return Object.keys(game.weapons).join()==="flame"&&Object.keys(game.passives).length===0'));
      await call('Page.reload');await delay(900);assert(await evaluate('const {readSave}=await import("/src/data.js");const s=readSave();return s.selectedWeapon==="flame"&&s.weaponUnlocks.includes("flame")&&s.embers===29400'),'starter unlock and selection survive reload');
      // Rare growth remains visible in real equipment details after the next talent rebuild.
      for(const [width,height] of [[320,568],[568,320]]){
        await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await delay(60);
        await evaluate('const {game}=await import("/src/main.js"),{CHARACTERS}=await import("/src/data.js");game.start(CHARACTERS[0]);game.passives={everseed:3};game.level=10;game.learnTalent("w_flame1");const e=game.spawnEnemy("skeleton"),roll=Math.random;Math.random=()=>0;try{game.hit(e,1,e.x,e.y,0,false,"talent",true)}finally{Math.random=roll}game.growth.area=3;game.growth.vitality=2;game.level=20;game.learnTalent("w_flame2");game.state="paused";document.getElementById("status-button").click();document.getElementById("sheet-tab-items").click();document.querySelector("[data-item-id=sheet-passive-everseed]").click()');
        assert(await evaluate('const c=document.getElementById("sheet-passive-everseed");return c.textContent.includes("伤害 +1%")&&c.textContent.includes("范围 +3%")&&c.textContent.includes("生命上限 +4")&&c.textContent.includes("本局触发 1 次")'),'equipment shows current growth totals');
        assert(await evaluate('const b=document.getElementById("items-detail"),r=b.getBoundingClientRect(),c=b.querySelector(".detail-bubble-copy");return b.matches(":popover-open")&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&c.scrollHeight<=c.clientHeight+1&&c.scrollWidth<=c.clientWidth+1'),'rare growth description and totals fit '+width+'x'+height);
        await shot('growth-detail-'+width+'x'+height);await evaluate('document.getElementById("sheet-close").click()');
      }
      // The same resonance values drive the offer, real selection, equipment detail and touch layout.
      for(const [width,height] of [[1366,768],[390,844],[320,568],[568,320]]){
        await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<701||height<500});
        await evaluate(`
          const {game}=await import('/src/main.js'),{characterStats}=await import('/src/stats.js'),{upgradePool}=await import('/src/balance.js'),{FUSIONS}=await import('/src/fusions.js');
          if(!document.getElementById('status-screen').classList.contains('hidden'))document.getElementById('sheet-close').click();game.returnToMenu();game.start(game.character);
          game.discoveredFusions=new Set(Object.keys(FUSIONS));game.level=30;game.time=540;game.weapons={solar:3,bolt:4};game.passives={embercore:3,cinder:2,haste:3,area:3,power:3,armor:3};game.stats=characterStats(game.character,game.passives,game.meta,game.talents,game.weapons);
          game.player.invincible=999;game.spawnClock=game.waveClock=999;game.bossMilestones=new Set([180,360,600]);game.state='level';const pool=upgradePool(game);game.choices=['cinder','haste','bolt','power'].map(key=>pool.find(item=>item.key===key));game.on('level');
        `);
        assert(await evaluate('return document.querySelector(".upgrade-card .rarity").textContent.includes("共振Ⅱ")&&document.querySelector(".upgrade-card .relic-card-link").textContent.includes("30%")'),'the offer explains the new resonance tier');
        await shot('resonance-offer-'+width+'x'+height);await mobileFit('resonance offer '+width);
        await evaluate('document.querySelector(".upgrade-card").click();const {game}=await import("/src/main.js");const {weaponStats}=await import("/src/stats.js");if(weaponStats("solar",3,game.stats,game.character).resonance?.rank!==2)throw Error("selected resonance did not apply");document.getElementById("status-button").click();document.getElementById("sheet-tab-items").click();document.querySelector("[data-item-id=sheet-weapon-solar]").click()');
        assert(await evaluate('return document.querySelector("#sheet-weapon-solar .collection-note").textContent.includes("共振Ⅱ")'),'equipment shows the applied resonance');
        await mobileFit('resonance weapon '+width);await shot('resonance-weapon-'+width+'x'+height);
        for(const id of ['embercore','venomfang','hoarfrost','frostbrand','soulpact','luck','haste']){
          await evaluate('document.getElementById("sheet-close").click();const {game}=await import("/src/main.js"),{characterStats}=await import("/src/stats.js");game.passives={['+JSON.stringify(id)+']:3};game.stats=characterStats(game.character,game.passives,game.meta,game.talents,game.weapons);document.getElementById("status-button").click();document.getElementById("sheet-tab-items").click();document.querySelector("[data-item-id=sheet-passive-'+id+']").click()');
          await mobileFit('resonance partners '+id+' '+width);if(id==='embercore')await shot('resonance-partners-'+width+'x'+height);
        }
      }
      // Talent points interrupt equipment choices first; task objectives remain readable above effects.
      {
        const taskTap=async selector=>{const point=await evaluate('const e=document.querySelector('+JSON.stringify(selector)+'),r=e.getBoundingClientRect();if(!r.width)throw Error("hidden action "+'+JSON.stringify(selector)+');return {x:r.x+r.width/2,y:r.y+r.height/2}');await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})};
        for(const [width,height] of [[1280,900],[800,600],[390,844],[370,665],[320,568],[568,320],[667,375],[844,390]]){
          await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<701||height<500});await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await delay(60);
          for(const milestone of [10,20,30]){
            await evaluate('const {game}=await import("/src/main.js"),{CHARACTERS}=await import("/src/data.js"),{xpForLevel}=await import("/src/balance.js"),{CHARACTER_TALENTS}=await import("/src/talents.js");if(!document.getElementById("status-screen").classList.contains("hidden"))document.getElementById("sheet-close").click();game.start(CHARACTERS['+([10,20,30].indexOf(milestone))+']);game.enemies=[];game.nextShrine=3;game.spawnClock=game.waveClock=1e9;game.level='+JSON.stringify(milestone-1)+';const branch=CHARACTER_TALENTS[game.character.id].branches[0];for(let i=0;i<'+JSON.stringify(milestone/10-1)+';i++)game.learnTalent(branch.nodes[i].id);game.xp=0;game.xpNext=xpForLevel(game.level);game.pendingLevels=2;game.gainXp(game.xpNext);game.update(.01)');
            const stopped=await evaluate('const {game}=await import("/src/main.js");return {time:game.time,pending:game.pendingLevels,state:game.state,origin:game.statusReturn}');assert.equal(stopped.state,'status');assert.equal(stopped.origin,'talent');assert.equal(stopped.pending,3);await delay(90);assert(await evaluate('const {game}=await import("/src/main.js");return game.time==='+JSON.stringify(stopped.time)+'&&document.getElementById("level-screen").classList.contains("hidden")'),'talent choice freezes combat before equipment choices');
            await mobileFit('automatic talent '+milestone+' '+width);assert(await evaluate('return document.getElementById("sheet-return").textContent.includes("保留天赋点")&&document.getElementById("sheet-talents").textContent.includes("先选天赋")'));
            if(milestone===10){
              await shot('talent-priority-'+width+'x'+height);
              if(width===320){await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})}
              else await taskTap(width===1280?'#sheet-close':'#sheet-return');
              assert(await evaluate('const {game}=await import("/src/main.js"),{talentPoints}=await import("/src/talents.js");return game.state==="level"&&game.pendingLevels===2&&talentPoints(game)===1'),'deferring keeps the point and consumes only the next equipment choice');
              const choices=await evaluate('const {game}=await import("/src/main.js");return JSON.stringify(game.choices)');await evaluate('document.getElementById("level-tree-button").click()');
              await evaluate('document.querySelector(".talent-node.available").click()');await taskTap('#talent-detail .talent-learn');await evaluate('document.getElementById("sheet-return").click()');assert(await evaluate('const {game}=await import("/src/main.js");return game.state==="level"&&JSON.stringify(game.choices)==='+JSON.stringify(choices)),'spending a retained point preserves the existing upgrade roll');
            }else{
              await evaluate('document.querySelector(".talent-node.available").click()');await taskTap('#talent-detail .talent-learn');assert(await evaluate('const {game}=await import("/src/main.js"),{talentPoints}=await import("/src/talents.js");return game.state==="level"&&game.pendingLevels===2&&talentPoints(game)===0&&document.getElementById("status-screen").classList.contains("hidden")'),'learning the new talent immediately continues with equipment choices');
            }
          }
          await evaluate('const {game}=await import("/src/main.js"),{updateWorldEvents}=await import("/src/world-events.js");game.start(game.character);game.time=60;game.enemies=[];updateWorldEvents(game,0);const s=game.shrines[0];Object.assign(s,{kind:"souls",index:1,goal:6});Object.assign(game.player,{x:s.x,y:s.y});game.camera={x:s.x,y:s.y};game.spawnClock=game.waveClock=1e9;game.pendingLevels=0;game.xpNext=1e9;game.on("hud")');
          await taskTap('#world-event-start');assert(await evaluate('const {game}=await import("/src/main.js");return game.activeEvent?.kind==="souls"'));await evaluate('const {game}=await import("/src/main.js");game.state="paused";game.on("hud");const p=game.player;for(let i=0;i<40;i++)game.effects.push({type:"frost",x:p.x+Math.cos(i)*100,y:p.y+Math.sin(i)*100,r:170,t:2,max:2});game.flash=.7;game.render()');await shot('soul-guidance-'+width+'x'+height);
          assert(await evaluate('const {game}=await import("/src/main.js");return !document.getElementById("world-event-card")&&document.getElementById("event-banner").textContent.includes("回收 6 枚魂光")&&game.bannerUntil-game.time>2.5&&game.bannerUntil-game.time<=3'),'task uses a brief existing banner');
          await evaluate('const {game}=await import("/src/main.js"),{worldEventTarget,updateWorldEvents}=await import("/src/world-events.js"),m=worldEventTarget(game);Object.assign(game.player,{x:m.x,y:m.y});game.state="running";updateWorldEvents(game,0);game.state="paused";game.on("hud")');assert(await evaluate('const {game}=await import("/src/main.js"),{worldEventTarget}=await import("/src/world-events.js");return game.activeEvent.progress===1&&!worldEventTarget(game).collected'),'collecting a mote advances the map target');
        }
        await evaluate('const {game}=await import("/src/main.js"),{updateWorldEvents}=await import("/src/world-events.js");game.start(game.character);game.enemies=[];for(const time of [60,240,420,900]){game.time=time;updateWorldEvents(game,0)}const s=game.shrines[0];Object.assign(game.player,{x:s.x,y:s.y});game.on("hud");if(game.shrines.filter(s=>s.state==="idle").length!==3||game.eventsFailed||!game.interact())throw Error("unaccepted altars must persist")');
        console.log('PASS: automatic LV10/20/30 priority, retained points, eight-size task guidance and persistent unaccepted altars.');
      }
      // End talent/task coverage.
      // Hover previews close on exit; only an explicit click/touch/Enter pins a bubble.
      {
        await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await call('Emulation.setTouchEmulationEnabled',{enabled:false});
        const bubblePoint=async selector=>evaluate('const e=document.querySelector('+JSON.stringify(selector)+'),r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}');
        const moveBubble=async point=>call('Input.dispatchMouseEvent',{type:'mouseMoved',...point});
        const clickBubble=async selector=>{const point=await bubblePoint(selector);for(const type of ['mousePressed','mouseReleased'])await call('Input.dispatchMouseEvent',{type,...point,button:'left',clickCount:1})};
        const leaveBubble=async()=>{await moveBubble({x:4,y:4});await delay(220)};
        const openBubble=async id=>evaluate('return document.getElementById('+JSON.stringify(id)+').matches(":popover-open")');
        for(const [kind,id,selector] of [['meta','meta-detail','#meta-upgrades .meta-node'],['weapon','weapon-detail','#weapon-choices .meta-node'],['talents','talent-detail','.talent-node'],['items','items-detail','#sheet-items .catalog-item'],['fusion','fusion-detail','#sheet-fusion .catalog-item'],['catalog','catalog-detail','#catalog-list .catalog-item']]){
          await evaluate('const {game}=await import("/src/main.js"),{WEAPONS}=await import("/src/data.js"),{FUSIONS}=await import("/src/fusions.js"),{characterStats}=await import("/src/stats.js");if(!document.getElementById("status-screen").classList.contains("hidden"))document.getElementById("sheet-close").click();game.returnToMenu();localStorage.setItem("afterlight-save-v1",JSON.stringify({embers:500000,discoveredFusions:Object.keys(FUSIONS),discoveredItems:Object.fromEntries(Object.keys(WEAPONS).map(key=>["weapon:"+key,1]))}));dispatchEvent(new StorageEvent("storage",{key:"afterlight-save-v1"}));if('+JSON.stringify(kind)+'==="meta")document.getElementById("meta-button").click();else if('+JSON.stringify(kind)+'==="weapon"){document.getElementById("play-button").click();document.getElementById("camp-weapon-button").click()}else{game.start(game.character);game.weapons={blade:1,flame:1,bolt:1,frost:1,orbit:1,storm:1};game.passives={power:1,haste:1,area:1};game.level=20;game.stats=characterStats(game.character,game.passives,game.meta,game.talents,game.weapons);game.state="paused";document.getElementById("status-button").click();document.getElementById("sheet-tab-'+kind+'").click()}');await delay(80);
          const first='[data-popup-test=first]',second='[data-popup-test=second]';await evaluate('for(const e of document.querySelectorAll("[data-popup-test]"))delete e.dataset.popupTest;document.querySelector('+JSON.stringify(selector)+').dataset.popupTest="first"');
          await moveBubble(await bubblePoint(first));assert(await openBubble(id),kind+' mouse hover opens a preview');
          await evaluate('const next=[...document.querySelectorAll('+JSON.stringify(selector)+')].slice(1).find(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest("button")===e});if(!next)throw Error("no second visible icon");next.dataset.popupTest="second"');
          await moveBubble(await bubblePoint(second));await delay(220);assert(await openBubble(id),kind+' hovering another icon updates its preview');
          await leaveBubble();assert(!(await openBubble(id)),kind+' mouse exit closes the preview');
          await moveBubble(await bubblePoint(first));await moveBubble(await bubblePoint('#'+id));await delay(220);assert(await openBubble(id),kind+' preview stays accessible inside the bubble');
          await clickBubble(first);await leaveBubble();assert(await openBubble(id),kind+' clicking pins across mouse exit');
          await moveBubble(await bubblePoint(second));await delay(220);assert(await evaluate('return document.querySelector('+JSON.stringify(first)+').getAttribute("aria-expanded")==="true"'),kind+' hovering another icon does not replace a pinned detail');
          await clickBubble(second);await leaveBubble();assert(await evaluate('return document.querySelector('+JSON.stringify(second)+').getAttribute("aria-expanded")==="true"'),kind+' clicking another icon changes the pinned detail');
          if(kind==='meta'){await clickBubble('#meta-detail .detail-bubble-close');await clickBubble(first)}
          const action={meta:'#meta-buy',weapon:'#weapon-buy',talents:'#talent-detail .talent-learn',fusion:'#fusion-detail .fusion-track-button'}[kind];
          if(action&&await evaluate('return !!document.querySelector('+JSON.stringify(action)+')&&!document.querySelector('+JSON.stringify(action)+').disabled')){
            await clickBubble(action);await delay(180);await leaveBubble();assert(await openBubble(id),kind+' purchasing or learning keeps the clicked detail pinned');
            await evaluate('for(const e of document.querySelectorAll("[data-popup-test=first]"))delete e.dataset.popupTest;document.querySelector('+JSON.stringify(selector)+').dataset.popupTest="first"');
          }
          await clickBubble('#'+id+' .detail-bubble-close');assert(!(await openBubble(id)),kind+' close button dismisses the pin');
          await moveBubble(await bubblePoint(first));await leaveBubble();assert(!(await openBubble(id)),kind+' closing clears the old pin');
          await evaluate('document.activeElement.blur();document.querySelector('+JSON.stringify(first)+').focus()');assert(await openBubble(id),kind+' keyboard focus opens preview');
          await evaluate('document.querySelector(".modal-wrap:not(.hidden) .close-button, .modal-wrap:not(.hidden) #sheet-close").focus()');assert(!(await openBubble(id)),kind+' focus leaving closes keyboard preview');
          await evaluate('document.querySelector('+JSON.stringify(first)+').focus()');await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await leaveBubble();assert(await openBubble(id),kind+' Enter pins keyboard detail');
          await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});assert(!(await openBubble(id)),kind+' Escape dismisses without reopening on restored focus');
          await clickBubble(first);await clickBubble('.modal-wrap:not(.hidden) .meta-heading h2, .modal-wrap:not(.hidden) .sheet-header h2');assert(!(await openBubble(id)),kind+' clicking blank space dismisses the pinned detail');
          await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});const touch=await bubblePoint(first);await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(220);assert(await evaluate('return document.getElementById('+JSON.stringify(id)+').matches(":popover-open")&&document.getElementById('+JSON.stringify(id)+').dataset.pinned==="true"'),kind+' touch pins the same detail');
          await evaluate('document.querySelector('+JSON.stringify('#'+id+' .detail-bubble-close')+').click()');await call('Emulation.setTouchEmulationEnabled',{enabled:false});
        }
        await evaluate('document.getElementById("sheet-close").click();const {game}=await import("/src/main.js");game.returnToMenu()');
        console.log('PASS: all six bubble types support hover exit, entering the bubble, click/touch pin, pinned switching, action rebuilds, blank dismissal, keyboard focus and Enter/Escape.');
      }
      // End hover-preview coverage.
      assert.equal(errors.length,0,JSON.stringify(errors));
      console.log('PASS: native Chrome desktop/touch rendering, 44 weapon effects, adaptive tag UI/search, two new fusion transactions, five talent trees, shrine controls, concurrent save transactions, growth tree and starter weapon persistence, choice preservation and zero runtime exceptions. Screenshots: artifacts/.');
      }
    }finally{socket?.close();browser.kill()}
  }
}finally{Math.random=originalRandom}
