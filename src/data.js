import {NEW_WEAPONS,RELICS} from './content.js';

export const CHARACTERS = [
 {id:'warden',name:'守灯人',english:'WARDEN',tag:'近战 · 均衡',weapon:'blade',hp:110,speed:88,damage:1.10,description:'<b>余烬长刃</b> 起手 · 伤害 +10% · 生命 110',lore:'背着最后一盏灯，走进无人归来的墓园。'},
 {id:'witch',name:'逐星者',english:'SEER',tag:'法术 · 环绕',weapon:'orbit',hp:85,speed:91,damage:1,description:'<b>游魂灯</b> 起手 · 拾取范围 +35% · 生命 85',lore:'群星熄灭以后，她仍听得见灵魂的回声。'},
 {id:'ranger',name:'荒野客',english:'RANGER',tag:'远程 · 敏捷',weapon:'bolt',hp:95,speed:102,damage:1,description:'<b>荆棘连弩</b> 起手 · 弩矢数量 +1 · 生命 95',lore:'比黑暗更安静，比死亡快一步。'},
];
export const WEAPONS = {
 ...NEW_WEAPONS,
 solar:{name:'焚天日轮',fusion:true,maxLevel:3,color:'#efb16a',category:'融合 / 环斩与灼烧',desc:'长刃与火种合为炽烈日轮。全周斩击后留下持续灼烧的火环。',upgrades:['融合为日轮，斩击与火环同时生效。','提高日轮与灼烧伤害，扩大火环。','日轮达到极境，伤害与攻击范围再次提升。'],cooldown:1.7},
 thunderbolt:{name:'雷棘贯星',fusion:true,maxLevel:3,color:'#c9b9f2',category:'融合 / 追踪与连锁',desc:'弩矢追踪并穿透敌群，每枚箭矢首次命中时向附近敌人传导连锁雷霆。',upgrades:['融合为雷霆连弩，追踪箭矢触发连锁闪电。','增加一枚弩矢、一次穿透与一个连锁目标。','箭雨达到极境，再次提升数量、穿透与雷击伤害。'],cooldown:1.5},
 glacier:{name:'寂星寒狱',fusion:true,maxLevel:3,color:'#a1e0e1',category:'融合 / 环绕与寒域',desc:'寒晶绕身自动迎敌；周期展开寒域，牵引与冻结敌人，寒域消散时引发冰爆。',upgrades:['融合为寒晶星环，并解锁引力寒域。','增加一颗寒晶，扩大寒域并强化冰爆。','寒狱达到极境，再增一颗寒晶并缩短寒域冷却。'],cooldown:4.4},
 blade:{name:'余烬长刃',evolution:'终焉·日轮',color:'#e2bf80',category:'近战 / 扇形斩击',desc:'朝最近的敌人挥出弧形剑气。',upgrades:['解锁自动斩击，伤害 28。','伤害 42，攻击距离 +8。','伤害 56，挥砍更快、范围更广。','伤害 70，攻击距离 +8。','伤害 84，剑气覆盖更大范围。','进化：360° 日轮斩，伤害 125。'],cooldown:1.1},
 bolt:{name:'荆棘连弩',evolution:'终焉·万箭',color:'#c4d29b',category:'远程 / 穿透弩矢',desc:'发射穿刺黑暗的弩矢。',upgrades:['解锁自动弩矢，伤害 25。','增加一枚弩矢，伤害 33。','弩矢穿透 2 个敌人，伤害 41。','再增一枚弩矢，伤害 49。','穿透与射速提高，伤害 57。','进化：追踪箭雨，多重穿透。'],cooldown:1.05},
 orbit:{name:'游魂灯',evolution:'终焉·星环',color:'#a2d5c5',category:'法术 / 环绕守护',desc:'让不灭的灵魂围绕你旋转。',upgrades:['解锁 2 盏游魂灯，接触伤害 15。','环绕半径提升，伤害 22。','增加 1 盏游魂灯，伤害 29。','扩大环绕半径，伤害 36。','增加 1 盏游魂灯，伤害 43。','进化：六灯双环，伤害 65。'],cooldown:0},
 storm:{name:'天谴雷符',evolution:'终焉·神罚',color:'#d4c3eb',category:'法术 / 连锁落雷',desc:'唤来紫色雷霆，击穿成群敌人。',upgrades:['解锁落雷，轰击 2 个目标。','落雷目标 +1，伤害 78。','落雷目标 +1，伤害 98。','落雷目标 +1，伤害 118。','落雷目标 +1，冷却缩短。','进化：九道神罚，伤害 190。'],cooldown:4.1},
 flame:{name:'炼狱火种',evolution:'终焉·焚世',color:'#eaa16b',category:'元素 / 持续燃烧',desc:'投掷火种，在地面留下燃烧区域。',upgrades:['解锁火种，生成持续火焰。','伤害提高，火焰范围 +5。','火焰持续时间延长，范围 +5。','同时投出 2 颗火种。','伤害提高，火焰范围 +5。','进化：三重焚世火，留下烈焰之路。'],cooldown:3.1},
 frost:{name:'霜月祷言',evolution:'终焉·永冬',color:'#acdfe0',category:'元素 / 减速脉冲',desc:'释放寒霜冲击，减缓附近敌人。',upgrades:['解锁寒霜脉冲，减速 55%。','伤害提高，范围 +12。','冷却缩短，范围 +12。','减速持续更久，范围 +12。','伤害提高，范围 +12。','进化：冻结敌人 2 秒并造成重创。'],cooldown:5.2},
};
export const PASSIVES = {
 ...RELICS,
 power:{name:'猩红誓约',desc:'所有武器伤害 +15%。',color:'#d5957c',max:5},
 vitality:{name:'不灭之心',desc:'最大生命 +25，并立即恢复 35 点生命。',color:'#b7ce92',max:5},
 haste:{name:'时隙沙漏',desc:'所有武器冷却缩短 8%。',color:'#d8c997',max:5},
 speed:{name:'夜行之靴',desc:'移动速度 +8%，冲刺冷却缩短 8%。',color:'#b1c696',max:5},
 magnet:{name:'引魂石',desc:'拾取范围 +30%，经验获取 +10%。',color:'#92c4c2',max:5},
 armor:{name:'旧王护符',desc:'每次受伤减少 2 点，最低仍受到 1 点伤害。',color:'#b9c4a1',max:5},
 regen:{name:'复苏苔芽',desc:'每秒恢复 0.7 点生命。',color:'#a9c591',max:5},
 luck:{name:'命运四叶',desc:'暴击几率 +8%，暴击造成双倍伤害。',color:'#bbc58c',max:5},
};
export const META = {
 vitality:{name:'长明之躯',desc:'每级 +10 初始生命',max:5,cost:50},
 power:{name:'余烬之力',desc:'每级 +5% 武器伤害',max:5,cost:65},
 magnet:{name:'引路之光',desc:'每级 +10% 经验获取',max:5,cost:55},
 regen:{name:'春回之息',desc:'每级 +0.2 生命 / 秒',max:5,cost:75},
};
export const PICKUPS = {
 xp:{name:'灵光结晶',color:'#b3cc89',desc:'拾取后获得经验。不同敌人掉落的结晶包含不同经验，较大的结晶也可能由多颗合并而成。',source:'击败敌人后掉落。'},
 heal:{name:'生命药草',color:'#bfd394',desc:'拾取后立即恢复 18 点生命，不超过最大生命。',source:'击败敌人时有机会掉落。'},
 magnet:{name:'引魂之光',color:'#a6d9e2',desc:'让地面上现有的全部经验结晶向你飞来；不会永久改变拾取范围。',source:'击败普通敌人时有机会掉落。'},
 chest:{name:'古老宝箱',color:'#e0bd78',desc:'恢复 20 点生命，随机强化一件未满级的已持有武器。普通武器最高 6 级，融合武器最高 3 级；武器全部满级时改为获得 45 基础经验。精英宝箱另赠 25 余烬，首领宝箱赠 60 余烬。宝箱不会自动融合。',source:'击败精英或首领后掉落。'},
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
