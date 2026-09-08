import {weaponStats} from './stats.js';
const number=(n,digits=1)=>Number(n.toFixed(digits)).toLocaleString('zh-CN',{maximumFractionDigits:digits});
const percent=v=>number(v*100)+'%';
const seconds=v=>number(v,2)+' 秒';
const damage=v=>String(Math.round(v));

export const passiveEffect = (key, level) => ({
  power: `武器伤害加成 +${level * 15}%。`,
  vitality: `最大生命 +${level * 18}。`,
  haste: `所有武器的施放冷却缩短 ${level * 8}%。`,
  speed: `移动速度 +${level * 8}%，冲刺冷却缩短 ${level * 8}%。`,
  magnet: `拾取范围 +${level * 30}%，经验获取 +${level * 10}%。`,
  armor: `每次受伤减少 ${level * 2} 点；最低仍受到 1 点伤害。`,
  regen: `每秒恢复 ${number(level * .45)} 点生命。`,
  luck: `暴击率增加 ${level * 8} 个百分点；暴击伤害为 2 倍。`,
}[key]);

export function weaponFacts(kind, values) {
    const v = values;
    const facts = [[kind === 'flame' ? '火种直击' : ['orbit','glacier'].includes(kind) ? '接触伤害' : '单次伤害', damage(v.damage)]];
    if (kind !== 'orbit') facts.push(['施放冷却', seconds(v.cooldown)]);
    if (kind === 'solar') facts.push(['全周斩击半径', v.radius + ' 像素'], ['灼烧伤害', `${damage(v.burnDamage)} / ${seconds(v.hitInterval)}`], ['火环范围', `${v.innerRadius}–${v.radius} 像素`], ['火环持续', seconds(v.duration)]);
    if (kind === 'thunderbolt') facts.push(['每轮追踪箭', v.count + ' 枚'], ['每矢最多命中', v.pierce + ' 个敌人'], ['每矢首次命中连锁', v.chainCount + ' 个其他目标'], ['连锁伤害', damage(v.chainDamage)], ['连锁搜索范围', v.chainRange + ' 像素']);
    if (kind === 'glacier') facts.push(['寒晶数量', v.count + ' 颗'], ['接触间隔', seconds(v.hitInterval)], ['环绕半径', v.radius + ' 像素'], ['寒域半径 / 持续', v.fieldRadius + ' 像素 / ' + seconds(v.fieldDuration)], ['寒域持续伤害', `${damage(v.fieldDamage)} / ${seconds(v.fieldInterval)}`], ['终结冰爆伤害', damage(v.blastDamage)], ['敌人 / 首领冻结', `${seconds(v.freeze)} / ${seconds(v.bossFreeze)}`], ['牵引与减速', '持续牵引 · 减速 55%']);
    if (kind === 'blade') facts.push(['斩击半径', v.radius + ' 像素'], ['斩击角度', number(v.arc * 180 / Math.PI) + '°']);
    if (kind === 'bolt') facts.push(['每轮弩矢', v.count + ' 枚'], ['每矢最多命中', v.pierce + ' 个敌人']);
    if (kind === 'orbit') facts.push(['游魂数量', v.count + ' 盏'], ['环绕半径', v.evolved ? `${v.radius} / ${v.radius + v.outerOffset} 像素` : v.radius + ' 像素'], ['同一敌人命中间隔', seconds(v.hitInterval)]);
    if (kind === 'storm') facts.push(['最多落雷目标', v.count + ' 个'], ['连锁搜索范围', v.chainRange + ' 像素']);
    if (kind === 'flame') facts.push(['每轮火种', v.count + ' 颗'], ['燃烧伤害', `${damage(v.burnDamage)} / ${seconds(v.hitInterval)}`], ['燃烧半径', v.radius + ' 像素'], ['火焰持续', seconds(v.duration)]);
    if (kind === 'frost') facts.push(['冲击半径', v.radius + ' 像素'], ['减速效果', `${percent(1 - v.slowMultiplier)} · ${seconds(v.slowDuration)}`]);
    if (kind === 'frost' && v.evolved) facts.push(['普通敌人冻结', seconds(v.freeze)], ['首领冻结', seconds(v.bossFreeze)]);
    if (['crescent','eclipse','bloodmoon'].includes(kind)) facts.push(['每轮月镰',v.count+' 柄'],['切割半径',v.radius+' 像素'],['飞出后折返',seconds(v.flightTime)],['返程伤害',damage(v.damage*v.returnMultiplier)],['往返命中','每段各可命中同一敌人一次']);
    if (kind==='eclipse') facts.push(['附带范围切割',damage(v.splashDamage)],['切割波及半径',v.splashRadius+' 像素']);
    if (kind==='bloodmoon') facts.push(['每次汲取生命',v.heal+' 点'],['汲取冷却',seconds(v.healCooldown)]);
    if (['thorn','plague'].includes(kind)) facts.push(['每轮毒瓶 / 疫种',v.count+' 枚'],['毒池半径',v.radius+' 像素'],['毒池伤害',damage(v.fieldDamage)+' / '+seconds(v.hitInterval)],['毒池持续',seconds(v.duration)],['侵蚀伤害',damage(v.poisonDamage)+' / 秒'],['侵蚀持续',seconds(v.poisonDuration)]);
    if (kind==='plague') facts.push(['终结孢爆伤害',damage(v.blastDamage)]);
    if (['bell','requiem'].includes(kind)) facts.push(['钟波半径',v.radius+' 像素'],['额外回响',v.echoCount+' 次'],['每次回响伤害',damage(v.echoDamage)],['回响间隔',seconds(v.echoDelay)]);
    if (kind==='requiem') facts.push(['每轮追魂',v.count+' 枚'],['追魂伤害',damage(v.soulDamage)],['每枚魂火命中上限','2 个目标']);
    if (['prism','tempest'].includes(kind)) facts.push(['每轮光束',v.count+' 道'],['穿透距离',v.range+' 像素'],['光束宽度',v.width*2+' 像素']);
    if (kind==='tempest') facts.push(['每轮连锁目标',v.chainCount+' 个'],['连锁伤害',damage(v.chainDamage)]);
    if (kind==='absolute') facts.push(['圣域半径',v.radius+' 像素'],['普通敌人 / 首领冻结',seconds(v.freeze)+' / '+seconds(v.bossFreeze)],['延迟碎冰伤害',damage(v.blastDamage)],['碎冰延迟',seconds(v.echoDelay)]);
    return facts;
  }


export function weaponExtra(key,v,stats,character){
 return key==='bolt'&&v.homing?' 进化后弩矢会追踪敌人。':key==='orbit'&&v.evolved?' 两组游魂沿内外双环反向旋转。':key==='flame'&&v.evolved?' 飞行中每 0.2 秒留下半径 20 像素的火路，持续 1.4 秒，每 0.45 秒造成 '+damage(weaponStats('flame',3,stats,character).burnDamage)+' 伤害。':'';
}
