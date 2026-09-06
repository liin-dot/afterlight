// All entries are local, original game content. Levels share the combat formulas in stats.js.
export const NEW_WEAPONS = {
  crescent: {name:'回旋月镰',evolution:'终焉·月蚀',color:'#c3cbe5',category:'刃器 / 往返投掷',desc:'投出穿透敌群的月镰，飞出后折返身边；往返各可命中一次。',upgrades:['投出一柄月镰，往返切割。','增加直击伤害与切割范围。','同时投出两柄月镰。','提高伤害，往返覆盖更宽。','同时投出三柄月镰。','进化：四柄巨大月镰，回收途中追随角色。'],cooldown:2.2},
  thorn: {name:'黑棘毒瓶',evolution:'终焉·瘟潮',color:'#afc978',category:'毒素 / 毒池与侵蚀',desc:'向敌人投出毒瓶，落地留下毒池，持续施加侵蚀。',upgrades:['解锁毒瓶；毒池与侵蚀分别造成持续伤害。','扩大毒池，提高毒素伤害。','一次投出两瓶毒剂。','延长毒池持续时间。','侵蚀伤害与毒池范围提高。','进化：三重瘟潮，留下广域毒池。'],cooldown:3.5},
  bell: {name:'送葬铜钟',evolution:'终焉·丧钟',color:'#d4b47d',category:'灵魂 / 双重震波',desc:'敲响身边的铜钟，第一道震波击退敌人，短暂延迟后回响再次命中。',upgrades:['解锁双重钟波，第二击为首击的 60%。','提高钟波伤害与范围。','回响伤害提高至首击的 80%。','进一步扩大钟波范围。','回响伤害提高至首击的 100%。','进化：三重丧钟，末次回响造成额外重击。'],cooldown:3.8},
  prism: {name:'裂光棱镜',evolution:'终焉·万华',color:'#e0bfe2',category:'光束 / 穿透折射',desc:'朝最近的敌人发射贯穿光束；成长后分出扇形光束，切开整条路径。',upgrades:['解锁穿透光束。','提高光束伤害与宽度。','一次发射两道光束。','提高照射距离和伤害。','一次发射三道光束。','进化：五道万华光束，横扫敌群。'],cooldown:2.5},
  eclipse: {name:'蚀月收割者',fusion:true,maxLevel:3,color:'#d5c9ed',category:'融合 / 往返巨镰',desc:'发射多柄蚀月巨镰；去程贯穿，返程再斩，命中附带小范围切割。',upgrades:['铸成蚀月巨镰，往返均产生范围切割。','增加一柄巨镰，强化切割范围。','月蚀极境：更多巨镰与更高返程伤害。'],cooldown:2.1},
  requiem: {name:'冥河渡魂',fusion:true,maxLevel:3,color:'#aedacb',category:'融合 / 钟波与追魂',desc:'冥钟震退近敌并唤出追魂灯火，随后第二道钟波扫过战场。',upgrades:['融合为冥钟，震波召唤追踪灵魂。','增加追魂数量，提高钟波伤害。','渡魂极境：更密集的追魂与更强回响。'],cooldown:3.2},
  plague: {name:'万棘疫庭',fusion:true,maxLevel:3,color:'#c2d783',category:'融合 / 疫池与孢爆',desc:'投出疫种形成大片毒庭，持续侵蚀敌人；毒庭消散时引发孢子爆裂。',upgrades:['毒瓶与孢子囊融为疫种，毒庭结束时爆裂。','增加一枚疫种，扩大孢爆范围。','疫庭极境：三枚疫种，强化持续侵蚀。'],cooldown:3.7},
  bloodmoon: {name:'饮血月冕',fusion:true,maxLevel:3,color:'#e1a0a2',category:'融合 / 血镰与汲取',desc:'血色月镰往返收割，命中汲取生命；汲取有独立冷却，不随命中数量无限增长。',upgrades:['月镰吞下血契牙，获得固有汲取能力。','增加血镰与每次恢复量。','血月极境：更强血镰，更短汲取冷却。'],cooldown:2},
  tempest: {name:'万雷天光',fusion:true,maxLevel:3,color:'#d0bbf4',category:'融合 / 雷束与传导',desc:'折射雷束贯穿敌群，每次施放从首个命中目标向周围传导连锁闪电。',upgrades:['棱镜熔入引雷针，光束获得连锁雷霆。','增加光束与连锁目标。','天光极境：五道雷束覆盖战场。'],cooldown:2.3},
  absolute: {name:'零度圣域',fusion:true,maxLevel:3,color:'#b7e6ec',category:'融合 / 冻结与碎冰',desc:'展开冻结领域，短暂延迟后碎冰震爆；可冻结首领，但首领冻结时间更短。',upgrades:['寒霜与霜纹镜融为圣域，冻结后碎冰。','扩大圣域，提高两段伤害。','零度极境：更长冻结与更强碎冰。'],cooldown:4.6},
};

export const RELICS = {
  embercore:{name:'不熄燃芯',color:'#e5a16a',max:3,relic:true,trigger:'刃器、投射物命中',families:['melee','projectile'],desc:'刃器或投射物命中点燃敌人，灼烧持续 2 秒。',lore:'灰烬中仍在跳动的火。'},
  conductor:{name:'引雷针',color:'#c4b2e9',max:3,relic:true,catalyst:true,trigger:'投射物、光束命中',families:['projectile','beam'],desc:'命中后向附近其他敌人传导闪电，有独立触发冷却。',lore:'将远方的雷声缝入武器。'},
  rime:{name:'霜纹镜',color:'#aee1e1',max:3,relic:true,catalyst:true,trigger:'攻击减速或冻结的敌人',families:['cold'],desc:'攻击寒冷敌人触发范围碎冰，有独立触发冷却。',lore:'镜中封着一场尚未落下的雪。'},
  spore:{name:'孢子囊',color:'#b4c978',max:3,relic:true,catalyst:true,trigger:'击败被侵蚀的敌人',families:['poison'],desc:'侵蚀中的敌人死亡时释放毒爆，并向附近敌人传播侵蚀。',lore:'每一场凋零，都是新的播种。'},
  siphon:{name:'血契牙',color:'#d99498',max:3,relic:true,catalyst:true,trigger:'刃器命中',families:['melee'],desc:'刃器命中时汲取生命，有独立触发冷却。',lore:'用敌人的生命偿还长夜。'},
  echo:{name:'回声铃',color:'#d4c190',max:3,relic:true,trigger:'主动施放武器',families:['cast'],desc:'每施放三次武器，在身边释放一次额外震波。环绕接触不计数。',lore:'第三声，来自你身后的黑暗。'},
  lens:{name:'裂光透镜',color:'#d9bada',max:3,relic:true,trigger:'发射投射物',families:['projectile'],desc:'每轮投射物追加一枚折射弹，追踪敌人并造成原弹部分伤害。',lore:'一道光，照出另一条道路。'},
  cinder:{name:'死火余烬',color:'#d9a377',max:3,relic:true,trigger:'击败燃烧的敌人',families:['fire'],desc:'燃烧中的敌人死亡时引发爆燃，对周围敌人造成范围伤害。',lore:'熄灭前，最后一次盛放。'},
};

export const WEAPON_FAMILIES = {
  blade:['melee','cast'], bolt:['projectile','cast'], orbit:['spirit'], storm:['lightning','cast'],
  flame:['fire','projectile','cast'], frost:['cold','cast'], crescent:['melee','projectile','cast'],
  thorn:['poison','projectile','cast'], bell:['spirit','cast'], prism:['beam','cast'],
  solar:['melee','fire','cast'], thunderbolt:['projectile','lightning','cast'], glacier:['spirit','cold','cast'],
  eclipse:['melee','projectile','cast'], requiem:['spirit','projectile','cast'], plague:['poison','projectile','cast'],
  bloodmoon:['melee','projectile','cast'], tempest:['beam','lightning','cast'], absolute:['cold','cast'],
};

export function relicValues(key,level,stats) {
  const damage=base=>base*(stats?.damageMultiplier||1);
  switch(key) {
    case 'embercore': return {damage:damage(5+level*4),duration:2,interval:.5};
    case 'conductor': return {damage:damage(18+level*12),count:level+1,range:130,cooldown:1.8-level*.2};
    case 'rime': return {damage:damage(22+level*16),radius:38+level*8,cooldown:1.6};
    case 'spore': return {damage:damage(15+level*12),radius:42+level*8,poisonDamage:damage(7+level*5),duration:3,cooldown:.3};
    case 'siphon': return {heal:level+1,cooldown:1.4-level*.2};
    case 'echo': return {damage:damage(20+level*18),radius:65+level*14,casts:3,cooldown:.6};
    case 'lens': return {multiplier:.3+level*.15};
    case 'cinder': return {damage:damage(22+level*18),radius:40+level*10,cooldown:.3};
  }
}

export function relicDescription(key,level,stats) {
  const v=relicValues(key,level,stats),d=n=>Math.round(n),s=n=>Number(n.toFixed(2));
  switch(key) {
    case 'embercore': return '刃器或投射物命中点燃 2 秒，每 0.5 秒造成 '+d(v.damage)+' 灼烧伤害；重复命中刷新持续时间。';
    case 'conductor': return '投射物或光束命中，向 '+v.count+' 个其他目标传导各 '+d(v.damage)+' 伤害；触发冷却 '+s(v.cooldown)+' 秒。';
    case 'rime': return '攻击减速或冻结的敌人，触发半径 '+v.radius+' 的碎冰，造成 '+d(v.damage)+' 伤害；冷却 1.6 秒。';
    case 'spore': return '被侵蚀的敌人死亡时，在半径 '+v.radius+' 内造成 '+d(v.damage)+' 毒爆伤害，并传播持续 3 秒、每秒 '+d(v.poisonDamage)+' 伤害的侵蚀；触发冷却 0.3 秒。';
    case 'siphon': return '刃器命中恢复 '+v.heal+' 点生命；触发冷却 '+s(v.cooldown)+' 秒。';
    case 'echo': return '每施放 '+v.casts+' 次武器产生半径 '+v.radius+' 的回声，造成 '+d(v.damage)+' 伤害；最短间隔 0.6 秒。环绕接触不计数。';
    case 'lens': return '每轮投射物追加一枚追踪折射弹，伤害为该轮单枚投射物的 '+d(v.multiplier*100)+'%；附加弹不重复折射。';
    case 'cinder': return '燃烧中的敌人死亡时，在半径 '+v.radius+' 内引发 '+d(v.damage)+' 伤害的爆燃；触发冷却 0.3 秒。';
  }
}

export function compatibleWeapons(key,weapons,passives={}) {
  const families=RELICS[key]?.families||[];
  return Object.keys(weapons).filter(id=>{
    const tags=WEAPON_FAMILIES[id]||[];
    return tags.some(tag=>families.includes(tag)) || key==='cinder'&&passives.embercore&&tags.some(tag=>RELICS.embercore.families.includes(tag));
  });
}
