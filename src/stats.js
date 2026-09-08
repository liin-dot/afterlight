import {WEAPONS} from './data.js';

// The simulation and character sheet use the same effective values.
export function characterStats(character, passives = {}, meta = {}) {
  return {
    maxHp: character.hp + (meta.vitality || 0) * 8 + (passives.vitality || 0) * 18,
    damageMultiplier: character.damage * (1 + (meta.power || 0) * .05 + (passives.power || 0) * .15),
    haste: Math.max(.48, 1 - (passives.haste || 0) * .08),
    moveSpeed: character.speed * (1 + (passives.speed || 0) * .08),
    pickupRadius: 38 * (character.id === 'witch' ? 1.35 : 1) * (1 + (passives.magnet || 0) * .30),
    xpMultiplier: 1 + (passives.magnet || 0) * .10 + (meta.magnet || 0) * .10,
    armor: (passives.armor || 0) * 2,
    regeneration: (passives.regen || 0) * .45 + (meta.regen || 0) * .1,
    criticalChance: .05 + (passives.luck || 0) * .08,
    criticalMultiplier: 2,
    dashCooldown: 2.5 * (1 - (passives.speed || 0) * .08),
    dashDuration: .22,
    dashInvincibility: .38,
    dashSpeedMultiplier: 4.7,
  };
}

export function weaponStats(kind, level, stats, character) {
  const evolved = !WEAPONS[kind].fusion && level === 6;
  const damage = base => base * stats.damageMultiplier;
  const common = {level, evolved, fusion:!!WEAPONS[kind].fusion, cooldown: WEAPONS[kind].cooldown * stats.haste * (1 - Math.min(.35, (level - 1) * (WEAPONS[kind].fusion ? .12 : .055)))};
  switch (kind) {
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
    case 'blade': return {...common, damage: damage(evolved ? 125 : 14 + 14 * level), radius: 51 + level * 8, arc: evolved ? Math.PI * 2 : 1.6 + level * .23};
    case 'bolt': return {...common, damage: damage(17 + level * 8), count: (evolved ? 6 : 1 + Math.floor(level / 2)) + (character.id === 'ranger' ? 1 : 0), pierce: 1 + Math.floor(level / 2), homing: evolved};
    case 'orbit': return {...common, damage: damage(evolved ? 65 : 8 + level * 7), count: evolved ? 6 : 2 + Math.floor((level - 1) / 2), radius: 37 + level * 6, outerOffset: evolved ? 25 : 0, hitInterval: .38};
    case 'storm': return {...common, damage: damage(evolved ? 190 : 38 + level * 20), count: evolved ? 9 : level + 1, chainRange: 180};
    case 'flame': return {...common, damage: damage(20 + level * 8), count: evolved ? 3 : level >= 4 ? 2 : 1, burnDamage: damage(6 + level * 4), radius: 21 + level * 5, duration: 2.1 + level * .35, hitInterval: .45};
    case 'frost': return {...common, damage: damage(evolved ? 110 : 10 + level * 9), radius: 66 + level * 12, slowDuration: 2.8 + level * .35, slowMultiplier: .45, freeze: evolved ? 2 : 0, bossFreeze: evolved ? .7 : 0};
  }
}
