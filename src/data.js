import {NEW_WEAPONS,RELICS} from './content.js';

export const CHARACTERS = [
 {id:'warden',name:'守灯人',english:'WARDEN',tag:'近战 · 灯火反击',weapon:'blade',hp:90,speed:88,damage:1.10,description:'<b>余烬长刃</b> 起手 · 伤害 +10% · 生命 90',lore:'背着最后一盏灯，走进无人归来的墓园。'},
 {id:'witch',name:'逐星者',english:'SEER',tag:'召唤 · 星轨法术',weapon:'orbit',hp:70,speed:91,damage:1,description:'<b>游魂灯</b> 起手 · 拾取范围 +35% · 生命 70',lore:'群星熄灭以后，她仍听得见灵魂的回声。'},
 {id:'ranger',name:'荒野客',english:'RANGER',tag:'游击 · 动量疾射',weapon:'bolt',hp:80,speed:102,damage:1,description:'<b>荆棘连弩</b> 起手 · 弩矢数量 +1 · 生命 80',lore:'比黑暗更安静，比死亡快一步。'},
];
export const WEAPONS = {
 ...NEW_WEAPONS,
 solar:{name:'焚天日轮',fusion:true,maxLevel:3,color:'#efb16a',category:'融合 / 环斩与灼烧',desc:'长刃与火种合为炽烈日轮。全周斩击后留下持续灼烧的火环。',upgrades:['融合为日轮，斩击与火环同时生效。','提高日轮与灼烧伤害，扩大火环。','日轮达到极境，伤害与攻击范围再次提升。'],cooldown:1.7},
 thunderbolt:{name:'雷棘贯星',fusion:true,maxLevel:3,color:'#c9b9f2',category:'融合 / 追踪与连锁',desc:'弩矢追踪并穿透敌群，每枚箭矢首次命中时向附近敌人传导连锁雷霆。',upgrades:['融合为雷霆连弩，追踪箭矢触发连锁闪电。','增加一枚弩矢、一次穿透与一个连锁目标。','箭雨达到极境，再次提升数量、穿透与雷击伤害。'],cooldown:1.5},
 glacier:{name:'寂星寒狱',fusion:true,maxLevel:3,color:'#a1e0e1',category:'融合 / 环绕与寒域',desc:'寒晶绕身自动迎敌；周期展开寒域，牵引与冻结敌人，寒域消散时引发冰爆。',upgrades:['融合为寒晶星环，并解锁引力寒域。','增加一颗寒晶，扩大寒域并强化冰爆。','寒狱达到极境，再增一颗寒晶并缩短寒域冷却。'],cooldown:4.4},
 blade:{name:'余烬长刃',evolution:'终焉·日轮',color:'#e2bf80',category:'近战 / 扇形斩击',desc:'朝最近的敌人挥出弧形剑气。',upgrades:['解锁自动扇形斩击。','提高伤害与攻击距离。','挥砍更快、范围更广。','提高伤害与攻击距离。','剑气覆盖更大范围。','进化：全周日轮斩，重创周围敌人。'],cooldown:1.1},
 bolt:{name:'荆棘连弩',evolution:'终焉·万箭',color:'#c4d29b',category:'远程 / 穿透弩矢',desc:'发射穿刺黑暗的弩矢。',upgrades:['解锁自动弩矢。','增加弩矢与穿透目标。','提高弩矢伤害与射速。','再次增加弩矢与穿透。','提高弩矢伤害与射速。','进化：追踪箭雨，多重穿透。'],cooldown:1.05},
 orbit:{name:'游魂灯',evolution:'终焉·星环',color:'#a2d5c5',category:'法术 / 环绕守护',desc:'让不灭的灵魂围绕你旋转。',upgrades:['解锁环绕游魂，接触敌人造成伤害。','提高环绕半径与接触伤害。','增加游魂数量与伤害。','提高环绕半径与接触伤害。','增加游魂数量与伤害。','进化：内外双环反向旋转。'],cooldown:0},
 storm:{name:'天谴雷符',evolution:'终焉·神罚',color:'#d4c3eb',category:'法术 / 连锁落雷',desc:'唤来紫色雷霆，击穿成群敌人。',upgrades:['解锁多目标落雷。','增加落雷目标与伤害。','增加落雷目标与伤害。','增加落雷目标与伤害。','增加落雷目标，冷却缩短。','进化：密集神罚轰击敌阵。'],cooldown:4.1},
 flame:{name:'炼狱火种',evolution:'终焉·焚世',color:'#eaa16b',category:'元素 / 持续燃烧',desc:'投掷火种，在地面留下燃烧区域。',upgrades:['解锁火种，生成持续火焰。','提高火焰伤害与范围。','火焰持续更久，范围更广。','增加每轮火种数量。','提高火焰伤害与范围。','进化：更多火种，飞行时留下烈焰之路。'],cooldown:3.1},
 frost:{name:'霜月祷言',evolution:'终焉·永冬',color:'#acdfe0',category:'元素 / 减速脉冲',desc:'释放寒霜冲击，减缓附近敌人。',upgrades:['解锁寒霜脉冲，减速 55%。','提高伤害与范围。','缩短冷却，扩大范围。','减速持续更久，范围更广。','提高伤害与范围。','进化：冻结敌人并造成重创。'],cooldown:5.2},
};
export const PASSIVES = {
 ...RELICS,
 power:{name:'猩红誓约',desc:'所有武器伤害 +12%。',color:'#d5957c',max:5},
 vitality:{name:'不灭之心',desc:'最大生命 +12，并立即恢复 12 点生命。',color:'#b7ce92',max:5},
 haste:{name:'时隙沙漏',desc:'所有武器施放冷却缩短 6%。',color:'#d8c997',max:5,rarity:'uncommon'},
 speed:{name:'夜行之靴',desc:'移动速度 +6%，冲刺冷却缩短 6%。',color:'#b1c696',max:5},
 magnet:{name:'引魂石',desc:'拾取范围 +35%。更安全地回收战场经验。',color:'#92c4c2',max:5},
 armor:{name:'旧王护符',desc:'每次受伤减少 2 点；仍至少承受原伤害的 30%。',color:'#b9c4a1',max:5},
 regen:{name:'复苏苔芽',desc:'每秒恢复 0.22 点生命。',color:'#a9c591',max:5},
 luck:{name:'命运四叶',desc:'暴击几率 +5 个百分点。基础暴击造成双倍伤害。',color:'#bbc58c',max:5},
 area:{name:'星图卷轴',desc:'武器范围、光束宽度与距离 +10%。',color:'#b4bbde',max:3,rarity:'uncommon'},
 duration:{name:'长明烛',desc:'武器领域、减速与普通敌人冻结持续时间 +15%；不延长首领冻结。',color:'#e7ca91',max:3},
 amount:{name:'双生银币',desc:'武器弹数、环绕物或落雷目标 +1；不增加炮台数量。',color:'#d9d7ae',max:2,rarity:'rare'},
 focus:{name:'破军徽记',desc:'暴击伤害倍率 +0.25。与命运四叶、猎魂目配合。',color:'#dca9a1',max:3,rarity:'uncommon'},
 growth:{name:'记忆冠冕',desc:'经验获取 +10%。占用一个道具位，提前投资成长。',color:'#bcd49d',max:3,rarity:'uncommon'},
 curse:{name:'禁忌烛冠',desc:'伤害 +10%、经验 +8%；敌人生命 +12%、生成频率 +8%、速度 +3%。',color:'#c399cf',max:3,rarity:'rare'},
};
export const META = {
 vitality:{name:'长明之躯',desc:'每级 +5 初始生命',max:5,cost:50},
 power:{name:'余烬之力',desc:'每级 +3% 武器伤害',max:5,cost:65},
 magnet:{name:'引路之光',desc:'每级 +4% 经验获取',max:5,cost:55},
 regen:{name:'春回之息',desc:'每级 +0.08 生命 / 秒',max:5,cost:75},
};
export const PICKUPS = {
 xp:{name:'灵光结晶',color:'#b3cc89',desc:'拾取后获得经验。不同敌人掉落的结晶包含不同经验，较大的结晶也可能由多颗合并而成。',source:'击败敌人后掉落。'},
 heal:{name:'生命药草',color:'#bfd394',desc:'拾取后立即恢复 16 点生命，不超过最大生命。',source:'击败敌人时有机会掉落。'},
 magnet:{name:'引魂之光',color:'#a6d9e2',desc:'让地面上现有的全部经验结晶向你飞来；不会永久改变拾取范围。',source:'击败普通敌人时有机会掉落。'},
 chest:{name:'古老宝箱',color:'#e0bd78',desc:'精英宝箱强化一次已持有装备并赠 25 余烬；首领宝箱强化两次、恢复 10 生命并赠 60 余烬。包括武器与道具，排除满级或已放逐装备；无可强化装备时每次改为 24 基础经验。不自动融合。',source:'击败精英或首领后掉落。'},
 hourglass:{name:'凝时碎砂',color:'#b5dce7',desc:'立即冻结当前普通敌人 3 秒，首领仅冻结 0.3 秒。',source:'击败敌人时罕见掉落，与其他战术补给共享掉落间隔。'},
 nova:{name:'破晓火种',color:'#efb078',desc:'立即对半径 210 内的普通敌人造成 500 伤害，首领受到 250 伤害；伤害不触发遗物。',source:'击败敌人时罕见掉落，与其他战术补给共享掉落间隔。'},
 ward:{name:'灯盾残片',color:'#c2d9b1',desc:'护盾补至 20 点，先于生命承受伤害；不与已有护盾相加。',source:'击败敌人时罕见掉落，与其他战术补给共享掉落间隔。'},
};
export const ENEMIES = {
 skeleton:{hp:26,speed:29,damage:9,xp:2,r:7,score:1},
 ghoul:{hp:50,speed:24,damage:13,xp:3,r:9,score:1},
 bat:{hp:18,speed:55,damage:7,xp:1,r:7,score:1},
 ghost:{hp:44,speed:27,damage:11,xp:3,r:8,score:2},
 knight:{hp:115,speed:22,damage:19,xp:7,r:10,score:3},
 reaper:{hp:84,speed:42,damage:16,xp:5,r:9,score:2},
};
export const formatTime=t=>`${String(Math.floor(Math.max(0,t)/60)).padStart(2,'0')}:${String(Math.floor(Math.max(0,t)%60)).padStart(2,'0')}`;
const normalizeDiscoveries = value => Array.isArray(value) ? [...new Set(value.filter(key => Object.hasOwn(WEAPONS,key) && WEAPONS[key].fusion))] : [];
export function catalogItem(id) {
 if(typeof id!=='string')return null;
 const [type,key,extra]=id.split(':');if(extra!==undefined)return null;
 const source=type==='weapon'?WEAPONS:type==='passive'?PASSIVES:type==='pickup'?PICKUPS:null;
 if(!source||!Object.hasOwn(source,key))return null;
 const data=source[key],category=type==='weapon'?(data.fusion?'fusion':'weapon'):type==='passive'?(data.relic?'relic':'passive'):'pickup';
 return {id,type,key,data,category,maxLevel:type==='weapon'?(data.maxLevel||6):type==='passive'?data.max:1};
}
export function normalizeItemDiscoveries(value) {
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 const entries=[];
 for(const [id,level] of Object.entries(value)){
  const item=catalogItem(id),amount=Number(level);
  if(item&&Number.isFinite(amount)&&amount>=1)entries.push([id,Math.min(item.maxLevel,Math.floor(amount))]);
 }
 return Object.fromEntries(entries);
}
export function mergeItemDiscoveries(...records) {
 const merged={};
 for(const record of records)for(const [id,level] of Object.entries(normalizeItemDiscoveries(record)))merged[id]=Math.max(merged[id]||0,level);
 return merged;
}
export function readSave(){
 try{
  const d=JSON.parse(localStorage.getItem('afterlight-save-v1')||'{}')||{};
  return {embers:Math.max(0,Number(d.embers)||0),best:Math.max(0,Number(d.best)||0),kills:Math.max(0,Number(d.kills)||0),runs:Math.max(0,Number(d.runs)||0),wins:Math.max(0,Number(d.wins)||0),meta:Object.fromEntries(Object.keys(META).map(k=>[k,Math.max(0,Math.min(5,Math.floor(Number(d.meta?.[k])||0)))])),muted:!!d.muted,discoveredFusions:normalizeDiscoveries(d.discoveredFusions),discoveredItems:normalizeItemDiscoveries(d.discoveredItems)};
 }catch{return {embers:0,best:0,kills:0,runs:0,wins:0,meta:{},muted:false,discoveredFusions:[],discoveredItems:{}}}
}
export function writeSave(save){
 try{
  let previous={};try{previous=JSON.parse(localStorage.getItem('afterlight-save-v1')||'{}')||{}}catch{}
  save.discoveredFusions=normalizeDiscoveries([...(save.discoveredFusions||[]),...normalizeDiscoveries(previous.discoveredFusions)]);
  save.discoveredItems=mergeItemDiscoveries(previous.discoveredItems,save.discoveredItems);
  localStorage.setItem('afterlight-save-v1',JSON.stringify(save));return true;
 }catch{return false}
}
