import {WEAPONS} from './data.js';
import {WEAPON_FAMILIES,relicValues} from './content.js';

// The simulation and character sheet use the same effective values.
export function characterStats(character, passives = {}, meta = {}, talents = {}) {
  return {
    talents,
    soulpact:relicValues('soulpact',passives.soulpact||0),
    maxHp: character.hp + (meta.vitality || 0) * 5 + (passives.vitality || 0) * 12,
    damageMultiplier: character.damage * (1 + (meta.power || 0) * .03 + (passives.power || 0) * .12 + (passives.curse || 0) * .10),
    haste: Math.max(.7, 1 - (passives.haste || 0) * .06),
    moveSpeed: character.speed * (1 + (passives.speed || 0) * .06),
    pickupRadius: 42 * (character.id === 'witch' ? 1.35 : 1) * (1 + (passives.magnet || 0) * .35),
    xpMultiplier: 1 + (passives.growth || 0) * .10 + (meta.magnet || 0) * .04 + (passives.curse || 0) * .08,
    armor: (passives.armor || 0) * 2,
    regeneration: (passives.regen || 0) * .22,
    recovery: (meta.regen || 0) * .08,
    criticalChance: .05 + (passives.luck || 0) * .05,
    criticalMultiplier: 2 + (passives.focus || 0) * .25,
    areaMultiplier: 1 + (passives.area || 0) * .10,
    durationMultiplier: 1 + (passives.duration || 0) * .15,
    amount: passives.amount || 0,
    curse: passives.curse || 0,
    dashCooldown: 3 * (1 - (passives.speed || 0) * .06),
    dashDuration: .22,
    dashInvincibility: .38,
    dashSpeedMultiplier: 4.7,
  };
}

function baseWeaponStats(kind, level, stats, character) {
  const evolved = !WEAPONS[kind].fusion && level === 6;
  const damage = base => base * stats.damageMultiplier;
  const common = {level, evolved, fusion:!!WEAPONS[kind].fusion, cooldown: WEAPONS[kind].cooldown * stats.haste * (1 - Math.min(.35, (level - 1) * (WEAPONS[kind].fusion ? .12 : .055)))};
  switch (kind) {
    case 'hailfire': return {...common,damage:damage(100+level*36),count:1+level,radius:49+level*7,delay:.8,duration:2.6+level*.4,fieldDamage:damage(14+level*7),hitInterval:.6,freeze:.65+level*.15,bossFreeze:.2,slowDuration:1.8};
    case 'soulforge': return {...common,damage:damage(20+level*12),count:1+level,duration:9+level,fireInterval:.85-level*.06,range:240,pierce:2,homing:true,blastDamage:damage(75+level*30),blastRadius:75+level*7};
    case 'shard': return {...common,damage:damage(18+level*9),count:evolved?4:1+Math.floor((level-1)/2),bounces:evolved?5:1+Math.floor(level/2),range:145,radius:5};
    case 'meteor': return {...common,damage:damage(45+level*22),count:1+Math.floor((level-1)/2),radius:32+level*4,delay:.95-level*.04,duration:evolved?2.8:0,fieldDamage:damage(8+level*4),hitInterval:.6};
    case 'mine': return {...common,damage:damage(32+level*19),count:evolved?4:1+Math.floor((level-1)/2),radius:38+level*5,armTime:.55,lifetime:9+level*.5,duration:0};
    case 'tether': return {...common,damage:damage(17+level*11),count:2+Math.floor(level/2),range:140+level*6,pull:20+level*5,slowDuration:1+level*.1,blastDamage:evolved?damage(45):0,blastRadius:34};
    case 'sentinel': return {...common,damage:damage(9+level*6),count:evolved?2:1,duration:5.5+level*.55,fireInterval:.85-level*.055,range:170+level*10,pierce:level>=5?2:1};
    case 'lance': return {...common,damage:damage(22+level*15),range:115+level*11,width:7+level,strikes:evolved?2:1,echoDelay:.18};
    case 'starfall': return {...common,damage:damage(110+level*40),count:2+level,radius:52+level*6,delay:.65,duration:3+level*.3,fieldDamage:damage(14+level*8),hitInterval:.6,vulnerability:1.1+level*.03};
    case 'bastion': return {...common,damage:damage(30+level*15),count:level===3?2:1,duration:9+level,fireInterval:.7-level*.05,range:210+level*10,pierce:3,shield:12+level*4,shieldRadius:70};
    case 'wintermine': return {...common,damage:damage(100+level*35),count:2+level,radius:65+level*6,armTime:.55,lifetime:10,duration:2.4+level*.3,freeze:1+level*.2,bossFreeze:.25,fieldDamage:damage(12+level*8),hitInterval:.6,slowDuration:1.5};
    case 'soulchain': return {...common,damage:damage(65+level*25),count:4+level*2,range:180,pull:42+level*8,slowDuration:2.2,blastDamage:damage(50+level*25),blastRadius:40+level*5,echoDelay:.5};
    case 'ricochet': return {...common,damage:damage(42+level*18),count:2+level,bounces:5+level,range:175,radius:6,splitDamage:damage(14+level*6)};
    case 'execution': return {...common,damage:damage(100+level*40),range:210+level*18,width:15+level*3,strikes:level===3?2:1,echoDelay:.18,executeMultiplier:1.4+level*.2,threshold:.35};
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
    case 'blade': return {...common, damage: damage(evolved ? 75 : 20 + 6 * (level - 1)), radius: 51 + level * 8, arc: evolved ? Math.PI * 2 : 1.6 + level * .23};
    case 'bolt': return {...common, damage: damage(evolved ? 40 : 10 + 2 * (level - 1)), count: (evolved ? 6 : 1 + Math.floor((level - 1) / 2)) + (character.id === 'ranger' ? 1 : 0), pierce: 1 + Math.floor(level / 2), homing: evolved};
    case 'orbit': return {...common, damage: damage(evolved ? 65 : 8 + level * 7), count: evolved ? 6 : 2 + Math.floor((level - 1) / 2), radius: 37 + level * 6, outerOffset: evolved ? 25 : 0, hitInterval: .38};
    case 'storm': return {...common, damage: damage(evolved ? 190 : 38 + level * 20), count: evolved ? 9 : level + 1, chainRange: 180};
    case 'flame': return {...common, damage: damage(20 + level * 8), count: evolved ? 3 : level >= 4 ? 2 : 1, burnDamage: damage(6 + level * 4), radius: 21 + level * 5, duration: 2.1 + level * .35, hitInterval: .45};
    case 'frost': return {...common, damage: damage(evolved ? 110 : 10 + level * 9), radius: 66 + level * 12, slowDuration: 2.8 + level * .35, slowMultiplier: .45, freeze: evolved ? 2 : 0, bossFreeze: evolved ? .7 : 0};
  }
}

// One modifier path keeps every weapon, fusion, preview and combat effect in agreement.
export function weaponStats(kind,level,stats,character){
  const values=baseWeaponStats(kind,level,stats,character);
  const area=stats.areaMultiplier||1,duration=stats.durationMultiplier||1;
  for(const key of ['radius','range','width','innerRadius','outerOffset','fieldRadius','splashRadius','blastRadius','shieldRadius'])if(values[key]!==undefined)values[key]=Math.round(values[key]*area);
  for(const key of ['duration','fieldDuration','slowDuration','freeze','poisonDuration','lifetime'])if(values[key]!==undefined)values[key]*=duration;
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
