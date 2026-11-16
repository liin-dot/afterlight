import {WEAPONS} from './data.js';
import {WEAPON_FAMILIES,WEAPON_REFINEMENTS,REFINEMENT_RARITIES,RELICS,SYNERGIES,relicValues,compatibleWeapons,ALTAR_BOONS} from './content.js';

// The simulation and character sheet use the same effective values.
export function characterStats(character, passives = {}, meta = {}, talents = {}, weapons = {}, boons = [], empowerments = {}, metaBuffs = {}, growth = {}, weaponUpgrades = {}) {
  const stats={
    boons:[...boons],empowerments:{...empowerments},metaBuffs,growth:{...growth},weaponUpgrades,summonMultiplier:1,damageTakenMultiplier:1,
    difficulty:{hp:1,damage:1,speed:1,population:1,elite:1,bosses:0},
    talents,
    passives:{...passives},
    weapons:{...weapons},
    resonances:SYNERGIES.filter(link=>link.resonance&&link.items.every(key=>(passives[key]||0)>=2)).map(link=>({...link,rank:Math.min(2,...link.items.map(key=>passives[key]-1))})),
    soulpact:relicValues('soulpact',passives.soulpact||0),
    maxHp: character.hp + (meta.vitality || 0) * 4 + (passives.vitality || 0) * 12 + (growth.vitality||0)*2,
    damageMultiplier: character.damage * (1 + (meta.power || 0) * .03 + (passives.power || 0) * .12 + (passives.curse || 0) * .10)*(1+(growth.damage||0)*.01),
    haste: Math.max(.7, 1 - (passives.haste || 0) * .06),
    moveSpeed: character.speed * (1 + (passives.speed || 0) * .06 + (meta.pace||0)*.02)*(character.id==='mariner'?1.1:1),
    pickupRadius: 48 * (character.id === 'witch' ? 1.35 : 1) * (1 + (passives.magnet || 0) * .35 + (passives.speed||0)*.06),
    xpMultiplier: 1 + (passives.growth || 0) * .10 + (meta.magnet || 0) * .03 + (passives.curse || 0) * .08,
    armor: (passives.armor || 0) * 2 + (character.id==='smith'?1:0),
    regeneration: (passives.regen || 0) * .22,
    recovery: (meta.regen || 0) * .08,
    criticalChance: .05 + (passives.luck || 0) * .05,
    criticalMultiplier: 2 + (passives.focus || 0) * .25,
    areaMultiplier: (1 + (passives.area || 0) * .10 + (meta.reach||0)*.03)*(1+(growth.area||0)*.01),
    durationMultiplier: 1 + (passives.duration || 0) * .15,
    amount: passives.amount || 0,
    curse: passives.curse || 0,
  };
  for(const id of new Set(boons)){
    const boon=ALTAR_BOONS[id];if(!boon)continue;
    for(const [key,value] of Object.entries(boon.multiply||{}))stats[key]*=value;
    for(const [key,value] of Object.entries(boon.add||{}))stats[key]+=value;
    for(const [key,value] of Object.entries(boon.difficulty))stats.difficulty[key]+=value;
  }
  stats.maxHp=Math.max(1,Math.round(stats.maxHp));stats.criticalChance=Math.min(1,stats.criticalChance);
  return stats;
}

function baseWeaponStats(kind, level, stats, character) {
  const evolved = !WEAPONS[kind].fusion && level === 6;
  const damage = base => base * stats.damageMultiplier*(1+(stats.empowerments?.[kind]||0)*.12)*((WEAPON_FAMILIES[kind]||[]).some(tag=>tag==='spirit'||tag==='summon')?stats.summonMultiplier:1);
  const common = {level, evolved, fusion:!!WEAPONS[kind].fusion, cooldown: WEAPONS[kind].cooldown * stats.haste * (1 - Math.min(.35, (level - 1) * (WEAPONS[kind].fusion ? .12 : .055)))};
  switch (kind) {
    case 'capacitor': return {...common,damage:damage(12+level*5),count:2+Math.floor(level/2),chainRange:125+level*8,blastDamage:evolved?damage(65):0,blastRadius:48};
    case 'arcforge': return {...common,damage:damage(70+level*28),count:5+level*2,chainRange:180,blastDamage:damage(85+level*40),blastRadius:65+level*8};
    case 'tide': return {...common,damage:damage(15+level*7),count:evolved?3:level>=3?2:1,radius:25+level*4,duration:1.8,slowDuration:1.2+level*.2,freeze:evolved?.7:0,bossFreeze:.15};
    case 'maelstrom': return {...common,damage:damage(80+level*35),count:2+level,radius:42+level*5,duration:2.2,slowDuration:2.4,freeze:1+level*.2,bossFreeze:.2,pull:30};
    case 'needle': return {...common,damage:damage(9+level*5),count:evolved?6:2+Math.floor((level-1)/2),pierce:2+Math.floor(level/2),slowDuration:1.2,freeze:evolved?.4:0,bossFreeze:.12};
    case 'frostloom': return {...common,damage:damage(30+level*14),count:4+level,pierce:3+level,homing:true,slowDuration:2,freeze:.5+level*.1,bossFreeze:.15,blastDamage:damage(30+level*15),blastRadius:35+level*5};
    case 'lantern': return {...common,damage:damage(16+level*7),count:2+Math.floor((level-1)/2),pierce:level>=4?2:1,homing:true,blastDamage:evolved?damage(40):0,blastRadius:35};
    case 'beacon': return {...common,damage:damage(45+level*20),count:4+level*2,pierce:3,homing:true,blastDamage:damage(45+level*20),blastRadius:45+level*5};
    case 'hailfire': return {...common,damage:damage(100+level*36),count:1+level,radius:49+level*7,delay:.8,duration:2.6+level*.4,fieldDamage:damage(14+level*7),hitInterval:.6,freeze:.65+level*.15,bossFreeze:.2,slowDuration:1.8};
    case 'soulforge': return {...common,damage:damage(20+level*12),count:1+level,duration:9+level,fireInterval:.85-level*.06,range:240,pierce:2,homing:true,blastDamage:damage(75+level*30),blastRadius:75+level*7};
    case 'shard': return {...common,damage:damage(18+level*9),count:evolved?4:1+Math.floor((level-1)/2),bounces:evolved?5:1+Math.floor(level/2),range:145,radius:5};
    case 'meteor': return {...common,damage:damage(45+level*22),count:1+Math.floor((level-1)/2),radius:32+level*4,delay:.95-level*.04,duration:evolved?2.8:0,fieldDamage:damage(8+level*4),hitInterval:.6};
    case 'mine': return {...common,damage:damage(32+level*19),count:evolved?4:1+Math.floor((level-1)/2),radius:38+level*5,armTime:.55,lifetime:9+level*.5,duration:0};
    case 'tether': return {...common,damage:damage(17+level*11),count:2+Math.floor(level/2),range:140+level*6,rootDuration:1+level*.1,bossRoot:.25,blastDamage:evolved?damage(45):0,blastRadius:34};
    case 'sentinel': return {...common,damage:damage(9+level*6),count:evolved?2:1,duration:5.5+level*.55,fireInterval:.85-level*.055,range:170+level*10,pierce:level>=5?2:1};
    case 'lance': return {...common,damage:damage(30+level*14),range:135+level*12,width:12+level*2,radius:66+level*9,arc:evolved?Math.PI*2:Math.PI*1.2,sweepDamage:damage(14+level*6),strikes:evolved?2:1,echoDelay:.18};
    case 'axe': return {...common,damage:damage(evolved?175:40+level*15),radius:78+level*8,arc:evolved?Math.PI*2:Math.PI*(1.25+level*.07),edgeMultiplier:1.5,knock:125};
    case 'hammer': return {...common,damage:damage(35+level*20),radius:74+level*7,arc:Math.PI*2,impact:true,knock:180,slowDuration:.65+level*.08,echoCount:evolved?1:0,echoDamage:damage(90),echoDelay:.3};
    case 'whirlwind': return {...common,damage:damage(90+level*30),radius:116+level*12,arc:Math.PI*2,edgeMultiplier:1.5,knock:95,echoCount:1,echoDamage:damage(90+level*30),echoDelay:.22};
    case 'quake': return {...common,damage:damage(90+level*35),radius:110+level*12,arc:Math.PI*2,impact:true,knock:200,slowDuration:1+level*.15,echoCount:2,echoDamage:damage(60+level*25),echoDelay:.32};
    case 'starfall': return {...common,damage:damage(110+level*40),count:2+level,radius:52+level*6,delay:.65,duration:3+level*.3,fieldDamage:damage(14+level*8),hitInterval:.6,vulnerability:1.1+level*.03};
    case 'bastion': return {...common,damage:damage(30+level*15),count:level===3?2:1,duration:9+level,fireInterval:.7-level*.05,range:210+level*10,pierce:3,shield:12+level*4,shieldRadius:70};
    case 'wintermine': return {...common,damage:damage(100+level*35),count:2+level,radius:65+level*6,armTime:.55,lifetime:10,duration:2.4+level*.3,freeze:1+level*.2,bossFreeze:.25,fieldDamage:damage(12+level*8),hitInterval:.6,slowDuration:1.5};
    case 'soulchain': return {...common,damage:damage(65+level*25),count:4+level*2,range:180,rootDuration:2.2,bossRoot:.45,blastDamage:damage(50+level*25),blastRadius:40+level*5,echoDelay:.5};
    case 'ricochet': return {...common,damage:damage(42+level*18),count:2+level,bounces:5+level,range:175,radius:6,splitDamage:damage(14+level*6)};
    case 'execution': return {...common,damage:damage(105+level*40),range:195+level*20,width:18+level*3,radius:100+level*12,arc:Math.PI*2,sweepDamage:damage(45+level*25),strikes:2,echoDelay:.18,executeMultiplier:1.4+level*.2,threshold:.35};
    case 'supernova': return {...common,damage:damage(100+level*45),count:1+level,radius:60+level*6,delay:.85,duration:0,beamDamage:damage(40+level*20),range:130+level*12,width:6};
    case 'stormsentry': return {...common,damage:damage(22+level*12),count:level===3?2:1,duration:9+level,fireInterval:.7-level*.05,range:220,pierce:2,chainDamage:damage(18+level*10),chainCount:2+level,chainRange:130};
    case 'pestilence': return {...common,damage:damage(75+level*30),count:1+level,radius:56+level*6,armTime:.55,lifetime:10,duration:3+level*.5,fieldDamage:damage(12+level*8),hitInterval:.6,poisonDamage:damage(10+level*5),poisonDuration:3,blastDamage:damage(45+level*22)};
    case 'crescent': return {...common,damage:damage(evolved?92:23+level*13),count:evolved?4:1+Math.floor((level-1)/2),radius:evolved?15:8+level,flightTime:.65,returnMultiplier:1};
    case 'thorn': return {...common,damage:damage(12+level*8),count:evolved?3:level>=3?2:1,radius:28+level*6,duration:3+level*.35,hitInterval:.65,fieldDamage:damage(6+level*4),poisonDamage:damage(7+level*5),poisonDuration:3};
    case 'bell': return {...common,damage:damage(evolved?145:24+level*16),radius:73+level*11,echoCount:evolved?2:1,echoDamage:damage(evolved?175:(24+level*16)*(.6+Math.floor((level-1)/2)*.2)),echoDelay:.45};
    case 'prism': return {...common,damage:damage(evolved?130:22+level*16),count:evolved?5:1+Math.floor((level-1)/2),range:210+level*17,width:5+level};
    case 'eclipse': return {...common,damage:damage(75+level*35),count:2+level,radius:16+level*2,flightTime:.8,returnMultiplier:1+level*.15,splashDamage:damage(25+level*18),splashRadius:25+level*6};
    case 'requiem': return {...common,damage:damage(80+level*40),radius:112+level*13,echoDamage:damage(65+level*35),echoCount:1,echoDelay:.55,count:4+level*2,soulDamage:damage(32+level*18)};
    case 'plague': return {...common,damage:damage(45+level*22),count:level,radius:58+level*11,duration:3.4,hitInterval:.6,fieldDamage:damage(23+level*12),poisonDamage:damage(23+level*12),poisonDuration:3,blastDamage:damage(95+level*45)};
    case 'bloodmoon': return {...common,damage:damage(65+level*30),count:1+level,radius:14+level*2,flightTime:.7,returnMultiplier:1.25,heal:1+level,healCooldown:1.4-level*.15};
    case 'tempest': return {...common,damage:damage(85+level*35),count:2+level,range:310+level*20,width:10+level*2,chainDamage:damage(35+level*20),chainCount:3+level,chainRange:165};
    case 'absolute': return {...common,damage:damage(70+level*32),radius:125+level*13,freeze:1.6+level*.2,bossFreeze:.45+level*.1,blastDamage:damage(110+level*55),echoDelay:.65,slowDuration:3.2};
    case 'solar': return {...common, damage:damage(110 + level * 60), radius:94 + level * 12, arc:Math.PI * 2, burnDamage:damage(40 + level * 15), innerRadius:32, duration:1.8, hitInterval:.45};
    case 'thunderbolt': return {...common, damage:damage(70 + level * 22), count:3 + level + (character.id === 'ranger' ? 1 : 0), pierce:2 + level, homing:true, chainDamage:damage(40 + level * 15), chainCount:2 + level, chainRange:150};
    case 'glacier': return {...common, damage:damage(30 + level * 12), count:4 + level, radius:53 + level * 6, outerOffset:0, hitInterval:.38, fieldRadius:105 + level * 12, fieldDamage:damage(20 + level * 10), fieldInterval:.6, fieldDuration:3, pullSpeed:80, freeze:1.1, bossFreeze:.35, blastDamage:damage(100 + level * 40)};
    case 'blade': return {...common, damage: damage(evolved ? 85 : 20 + 6 * (level - 1)), radius: 65 + level * 8, arc: evolved ? Math.PI * 2 : 2.4 + level * .15};
    case 'bolt': return {...common, damage: damage(evolved ? 40 : 10 + 2 * (level - 1)), count: (evolved ? 6 : 1 + Math.floor((level - 1) / 2)) + (character.id === 'ranger' ? 1 : 0), pierce: 1 + Math.floor(level / 2), homing: evolved};
    case 'orbit': return {...common, damage: damage(evolved ? 65 : 8 + level * 7), count: evolved ? 6 : 2 + Math.floor((level - 1) / 2), radius: 45 + level * 6, contactRadius: 20, outerOffset: evolved ? 25 : 0, hitInterval: .38};
    case 'storm': return {...common, damage: damage(evolved ? 190 : 38 + level * 20), count: evolved ? 9 : level + 1, chainRange: 180};
    case 'flame': return {...common, damage: damage(20 + level * 8), count: evolved ? 3 : level >= 4 ? 2 : 1, burnDamage: damage(6 + level * 4), radius: 21 + level * 5, duration: 2.1 + level * .35, hitInterval: .45};
    case 'frost': return {...common, damage: damage(evolved ? 110 : 10 + level * 9), radius: 66 + level * 12, slowDuration: 2.8 + level * .35, slowMultiplier: .45, freeze: evolved ? 2 : 0, bossFreeze: evolved ? .7 : 0};
  }
}

// One modifier path keeps every weapon, fusion, preview and combat effect in agreement.
export function weaponStats(kind,level,stats,character){
  const values=baseWeaponStats(kind,level,stats,character);
  const upgrades=stats.weaponUpgrades?.[kind]||{};
  for(const [key,amount] of Object.entries(upgrades)){
    const fields=key==='damage'?Object.keys(values).filter(field=>field==='damage'||field.endsWith('Damage')):WEAPON_REFINEMENTS[key]?.fields||[];
    for(const field of fields)if(values[field]!==undefined)values[field]=WEAPON_REFINEMENTS[key].flat?values[field]+amount:key==='haste'?values[field]/(1+amount):values[field]*(1+amount);
  }
  values.criticalChance=Math.min(1,stats.criticalChance+(upgrades.critical||0));values.anomalyChance=Math.min(1,upgrades.anomaly||0);
  if(values.fusion&&level>=2)for(const link of stats.resonances||[]){
    const rank=Math.min(level-1,link.rank),weapons={...stats.weapons,[kind]:level};
    const linked=link.items.filter(key=>RELICS[key]).map(key=>compatibleWeapons(key,weapons,stats.passives,stats.talents,character.id,stats.weaponUpgrades));
    if(rank>(values.resonance?.rank||0)&&linked.every(ids=>ids.length)&&linked.some(ids=>ids.includes(kind)))values.resonance={...link,rank};
  }
  const rank=values.resonance?.rank||0,tempo=(1-rank*.15)*(stats.metaBuffs.haste||1);
  const area=(stats.areaMultiplier||1)*(1+rank*.2)*(stats.metaBuffs.area||1),duration=stats.durationMultiplier||1;
  for(const key of ['radius','contactRadius','range','chainRange','width','innerRadius','outerOffset','fieldRadius','splashRadius','blastRadius','shieldRadius'])if(values[key]!==undefined)values[key]=Math.round(values[key]*area);
  values.cooldown*=tempo;
  for(const key of ['hitInterval','fieldInterval','fireInterval'])if(values[key]!==undefined)values[key]*=stats.haste*tempo;
  if(values.flightTime){values.flightSpeed=210*area*(1+(upgrades.area||0));values.returnSpeed=290*area*(1+(upgrades.area||0))}
  for(const key of ['duration','fieldDuration','slowDuration','rootDuration','freeze','poisonDuration','lifetime'])if(values[key]!==undefined)values[key]*=duration;
  if(values.count!==undefined)values.count+=stats.amount||0;
  if(values.fusion){
    for(const key of Object.keys(values))if(key==='damage'||key.endsWith('Damage'))values[key]*=.78+level*.12;
    values.cooldown*=1.08;
  }
  const tags=WEAPON_FAMILIES[kind]||[];
  const pact=(tags.includes('spirit')||tags.includes('summon'))?stats.soulpact?.multiplier||1:1;
  for(const key of Object.keys(values))if(key==='damage'||key.endsWith('Damage'))values[key]*=pact;
  if(tags.includes('summon')&&values.fireInterval)values.fireInterval*=stats.soulpact?.interval||1;
  return values;
}

export function refinementValue(stats,key,refinement,rarity){
  const info=WEAPON_REFINEMENTS[refinement],tier=REFINEMENT_RARITIES[rarity];if(!info||!tier)return 0;
  const value=info.values[tier.index],current=stats.weaponUpgrades?.[key]?.[refinement]||0;
  const max=refinement==='critical'?1-stats.criticalChance:info.max??Infinity,remaining=Math.max(0,Number((max-current).toFixed(8)));
  return info.flat&&remaining<value?0:Math.min(value,remaining);
}
