import {weaponStats} from './stats.js';
const number=(n,digits=1)=>Number(n.toFixed(digits)).toLocaleString('zh-CN',{maximumFractionDigits:digits});
const percent=v=>number(v*100)+'%';
const seconds=v=>number(v,2)+' 秒';
const damage=v=>String(Math.round(v));
export const resonanceText=values=>values.resonance?values.resonance.name+' · 共振'+(values.resonance.rank===2?'Ⅱ':'Ⅰ')+'：间隔 −'+values.resonance.rank*15+'% / 范围 +'+values.resonance.rank*20+'%':'共振：融合武器与一套适配联动均达 LV.2，全部 LV.3 后强化。';

export const passiveEffect = (key, level) => ({
  power: `武器伤害加成 +${level * 12}%。`,
  vitality: `最大生命 +${level * 12}。`,
  haste: `武器施放、召唤射击、环绕接触与领域伤害间隔缩短 ${level * 6}%。`,
  speed: `移动速度 +${level * 6}%，拾取范围 +${level * 6}%。`,
  magnet: `拾取范围 +${level * 35}%。`,
  armor: `每次受伤减少 ${level * 2} 点；至少承受原始伤害的 30%。`,
  regen: `每秒恢复 ${number(level * .22)} 点生命。`,
  luck: `暴击率增加 ${level * 5} 个百分点；基础暴击伤害为 2 倍。`,
  area: `武器范围、光束宽度、连锁与弹跳距离 +${level * 10}%。`,
  duration: `武器领域、减速与普通敌人冻结持续 +${level * 15}%；首领冻结不变。`,
  amount: `武器弹数、环绕物或落雷目标 +${level}；不增加炮台数量。`,
  focus: `暴击伤害倍率 +${number(level * .25,2)}。`,
  growth: `经验获取 +${level * 10}%。`,
  curse: `伤害 +${level * 10}%，经验 +${level * 8}%；敌人生命 +${level * 12}%，生成频率 +${level * 8}%，速度 +${level * 3}%。`,
}[key]);

export function weaponFacts(kind, values) {
    const v = values;
    const facts = [[kind === 'flame' ? '火种直击' : ['orbit','glacier'].includes(kind) ? '接触伤害' : '单次伤害', damage(v.damage)]];
    if (kind !== 'orbit') facts.push(['施放冷却', seconds(v.cooldown)]);
    if(['capacitor','arcforge'].includes(kind))facts.push(['连锁目标',v.count+' 个'],['连锁距离',v.chainRange+' 像素']);
    if(['tide','maelstrom'].includes(kind))facts.push(['每轮潮环',v.count+' 道'],['潮环半径',v.radius+' 像素'],['行进持续',seconds(v.duration)],['命中规则','每道对每名敌人一次']);
    if(['needle','frostloom','lantern','beacon'].includes(kind))facts.push(['每轮弹数',v.count+' 枚'],['每弹命中上限',v.pierce+' 个目标'],['追踪',v.homing?'自动转向':'直线飞行']);
    if(['capacitor','arcforge','frostloom','lantern','beacon'].includes(kind)&&v.blastDamage)facts.push(['附带震荡伤害',damage(v.blastDamage)],['震荡半径',v.blastRadius+' 像素']);
    if(['tide','maelstrom','needle','frostloom'].includes(kind)){facts.push(['减速 55%',seconds(v.slowDuration)]);if(v.freeze)facts.push(['普通敌人 / 首领冻结',seconds(v.freeze)+' / '+seconds(v.bossFreeze)])}
    if (kind === 'solar') facts.push(['全周斩击半径', v.radius + ' 像素'], ['灼烧伤害', `${damage(v.burnDamage)} / ${seconds(v.hitInterval)}`], ['火环范围', `${v.innerRadius}–${v.radius} 像素`], ['火环持续', seconds(v.duration)]);
    if (kind === 'thunderbolt') facts.push(['每轮追踪箭', v.count + ' 枚'], ['每矢最多命中', v.pierce + ' 个敌人'], ['每矢首次命中连锁', v.chainCount + ' 个其他目标'], ['连锁伤害', damage(v.chainDamage)], ['连锁搜索范围', v.chainRange + ' 像素']);
    if (kind === 'glacier') facts.push(['寒晶数量', v.count + ' 颗'], ['接触间隔', seconds(v.hitInterval)], ['环绕半径', v.radius + ' 像素'], ['寒域半径 / 持续', v.fieldRadius + ' 像素 / ' + seconds(v.fieldDuration)], ['寒域持续伤害', `${damage(v.fieldDamage)} / ${seconds(v.fieldInterval)}`], ['终结冰爆伤害', damage(v.blastDamage)], ['敌人 / 首领冻结', `${seconds(v.freeze)} / ${seconds(v.bossFreeze)}`], ['牵引与减速', '牵引至寒晶环 · 减速 55%']);
    if (kind === 'blade') facts.push(['斩击半径', v.radius + ' 像素'], ['斩击角度', number(v.arc * 180 / Math.PI) + '°']);
    if (kind === 'bolt') facts.push(['每轮弩矢', v.count + ' 枚'], ['每矢最多命中', v.pierce + ' 个敌人']);
    if (kind === 'orbit') facts.push(['游魂数量', v.count + ' 盏'], ['环绕半径', v.evolved ? `${v.radius} / ${v.radius + v.outerOffset} 像素` : v.radius + ' 像素'], ['游魂接触半径', v.contactRadius + ' 像素'], ['同一敌人命中间隔', seconds(v.hitInterval)]);
    if (kind === 'storm') facts.push(['最多落雷目标', v.count + ' 个'], ['连锁搜索范围', v.chainRange + ' 像素']);
    if (kind === 'flame') facts.push(['每轮火种', v.count + ' 颗'], ['燃烧伤害', `${damage(v.burnDamage)} / ${seconds(v.hitInterval)}`], ['燃烧半径', v.radius + ' 像素'], ['火焰持续', seconds(v.duration)]);
    if (kind === 'frost') facts.push(['冲击半径', v.radius + ' 像素'], ['减速效果', `${percent(1 - v.slowMultiplier)} · ${seconds(v.slowDuration)}`]);
    if (kind === 'frost' && v.evolved) facts.push(['普通敌人冻结', seconds(v.freeze)], ['首领冻结', seconds(v.bossFreeze)]);
    if (['crescent','eclipse','bloodmoon'].includes(kind)) facts.push(['每轮月镰',v.count+' 柄'],['切割半径',v.radius+' 像素'],['飞出距离',number(v.flightTime*v.flightSpeed)+' 像素'],['飞出后折返',seconds(v.flightTime)],['返程伤害',damage(v.damage*v.returnMultiplier)],['往返命中','每段各可命中同一敌人一次']);
    if (kind==='eclipse') facts.push(['附带范围切割',damage(v.splashDamage)],['切割波及半径',v.splashRadius+' 像素']);
    if (kind==='bloodmoon') facts.push(['每次汲取生命',v.heal+' 点'],['汲取冷却',seconds(v.healCooldown)]);
    if (['thorn','plague'].includes(kind)) facts.push(['每轮毒瓶 / 疫种',v.count+' 枚'],['毒池半径',v.radius+' 像素'],['毒池伤害',damage(v.fieldDamage)+' / '+seconds(v.hitInterval)],['毒池持续',seconds(v.duration)],['侵蚀伤害',damage(v.poisonDamage)+' / 秒'],['侵蚀持续',seconds(v.poisonDuration)]);
    if (kind==='plague') facts.push(['终结孢爆伤害',damage(v.blastDamage)]);
    if (['bell','requiem'].includes(kind)) facts.push(['钟波半径',v.radius+' 像素'],['额外回响',v.echoCount+' 次'],['每次回响伤害',damage(v.echoDamage)],['回响间隔',seconds(v.echoDelay)]);
    if (kind==='requiem') facts.push(['每轮追魂',v.count+' 枚'],['追魂伤害',damage(v.soulDamage)],['每枚魂火命中上限','2 个目标']);
    if (['prism','tempest'].includes(kind)) facts.push(['每轮光束',v.count+' 道'],['穿透距离',v.range+' 像素'],['光束宽度',v.width*2+' 像素']);
    if (kind==='tempest') facts.push(['每轮连锁目标',v.chainCount+' 个'],['连锁伤害',damage(v.chainDamage)]);
    if (kind==='absolute') facts.push(['圣域半径',v.radius+' 像素'],['普通敌人 / 首领冻结',seconds(v.freeze)+' / '+seconds(v.bossFreeze)],['延迟碎冰伤害',damage(v.blastDamage)],['碎冰延迟',seconds(v.echoDelay)]);
    if(['shard','ricochet'].includes(kind))facts.push(['每轮骨轮',v.count+' 枚'],['每轮最多命中',v.bounces+1+' 个不同目标'],['弹跳搜索范围',v.range+' 像素']);
    if(kind==='ricochet')facts.push(['首击分裂','2 枚追踪骨片'],['每枚骨片伤害',damage(v.splitDamage)]);
    if(['meteor','starfall','supernova','hailfire'].includes(kind))facts.push(['每轮最多落点',v.count+' 处'],['爆炸半径',v.radius+' 像素'],['首枚落地延迟',seconds(v.delay)]);
    if(['mine','wintermine','pestilence'].includes(kind))facts.push(['每轮陷阱',v.count+' 枚'],['爆炸半径',v.radius+' 像素'],['武装时间',seconds(v.armTime)],['留存上限',seconds(v.lifetime)],['同时留存','最多 12 枚；旧陷阱会引爆']);
    if(['starfall','wintermine','pestilence','hailfire'].includes(kind)||kind==='meteor'&&v.evolved)facts.push(['残留领域持续',seconds(v.duration)],['领域伤害',damage(v.fieldDamage)+' / '+seconds(v.hitInterval)]);
    if(kind==='starfall')facts.push(['易伤标记','伤害 +'+number((v.vulnerability-1)*100)+'% · 3 秒']);
    if(kind==='supernova')facts.push(['交叉光束','4 道 · 各 '+damage(v.beamDamage)+' 伤害'],['每道光束长度',v.range+' 像素']);
    if(kind==='wintermine'||kind==='hailfire')facts.push(['普通敌人 / 首领冻结',seconds(v.freeze)+' / '+seconds(v.bossFreeze)]);
    if(kind==='pestilence')facts.push(['侵蚀伤害',damage(v.poisonDamage)+' / 秒'],['侵蚀持续',seconds(v.poisonDuration)],['终结毒爆',damage(v.blastDamage)]);
    if(['sentinel','bastion','stormsentry','soulforge'].includes(kind))facts.push([kind==='soulforge'?'每轮追踪魂火':'每轮石弹',v.count+' 枚'],['射击间隔',seconds(v.fireInterval)],['召唤物持续',seconds(v.duration)],['每弹命中上限',v.pierce+' 个目标'],['索敌范围',v.range+' 像素'],['召唤物上限','同时存在 2 座']);
    if(kind==='soulforge')facts.push(['散魂震波',damage(v.blastDamage)],['散魂半径',v.blastRadius+' 像素']);
    if(kind==='bastion')facts.push(['近身守护','每 5 秒补至 '+v.shield+' 护盾'],['守护范围',v.shieldRadius+' 像素']);
    if(kind==='stormsentry')facts.push(['每轮首弹连锁',v.chainCount+' 个目标'],['连锁伤害',damage(v.chainDamage)]);
    if(['tether','soulchain'].includes(kind))facts.push(['最多锁定',v.count+' 个目标'],['连锁范围',v.range+' 像素'],['牵引距离',v.pull+' 像素 · 首领 12%'],['减速持续',seconds(v.slowDuration)]);
    if((kind==='tether'||kind==='soulchain')&&v.blastDamage)facts.push(['延迟震爆',damage(v.blastDamage)],['震爆半径',v.blastRadius+' 像素']);
    if(['lance','execution'].includes(kind))facts.push(['枪芒长度',v.range+' 像素'],['枪芒宽度',v.width*2+' 像素'],['每轮突刺',v.strikes+' 次']);
    if(kind==='execution')facts.push(['处决阈值',percent(v.threshold)+' 生命以下'],['处决增伤',percent(v.executeMultiplier-1)+' · 首领减半']);
    facts.push(['直接命中暴击率',percent(v.criticalChance)],['异常触发率',percent(v.anomalyChance)]);
    return facts;
  }


export function weaponExtra(key,v,stats,character){
 return key==='bolt'&&v.homing?' 进化后弩矢会追踪敌人。':key==='orbit'&&v.evolved?' 两组游魂沿内外双环反向旋转。':key==='flame'&&v.evolved?' 飞行中每 0.2 秒留下半径 '+number(20*stats.areaMultiplier*(1+(stats.weaponUpgrades?.flame?.area||0)))+' 像素的火路，持续 '+seconds(1.4*stats.durationMultiplier*(1+(stats.weaponUpgrades?.flame?.duration||0)))+'，每 '+seconds(weaponStats('flame',3,stats,character).hitInterval)+'造成 '+damage(weaponStats('flame',3,stats,character).burnDamage)+' 伤害。':'';
}
