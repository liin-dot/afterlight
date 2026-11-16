import {NEW_WEAPONS,RELICS,itemTags} from './content.js';

export const CHARACTERS = [
 {id:'warden',name:'守灯人',english:'WARDEN',tag:'近战 · 灯火反击',weapon:'blade',hp:90,speed:88,damage:1.10,description:'<b>余烬长刃</b> 起手 · 伤害 +10% · 生命 90',lore:'背着最后一盏灯，走进无人归来的墓园。'},
 {id:'witch',name:'逐星者',english:'SEER',tag:'召唤 · 星轨法术',weapon:'orbit',hp:70,speed:91,damage:1,description:'<b>游魂灯</b> 起手 · 拾取范围 +35% · 生命 70',lore:'群星熄灭以后，她仍听得见灵魂的回声。'},
 {id:'ranger',name:'荒野客',english:'RANGER',tag:'游击 · 动量疾射',weapon:'bolt',hp:80,speed:102,damage:1,description:'<b>荆棘连弩</b> 起手 · 弩矢数量 +1 · 生命 80',lore:'比黑暗更安静，比死亡快一步。'},
 {id:'smith',name:'铸雷师',english:'SMITH',tag:'蓄能 · 连锁放电',weapon:'capacitor',hp:100,speed:84,damage:1,description:'<b>鸣雷线圈</b> 起手 · 护甲 +1 · 生命 100',lore:'他把最后一道雷，锻进了不会熄灭的心脏。'},
 {id:'mariner',name:'渡潮人',english:'MARINER',tag:'游走 · 潮汐控制',weapon:'tide',hp:78,speed:98,damage:1,description:'<b>回潮法印</b> 起手 · 移速 +10% · 生命 78',lore:'海吞没了归途，她便把潮汐带上岸。'},
];
export const WEAPONS = {
 ...NEW_WEAPONS,
 solar:{name:'焚天日轮',fusion:true,maxLevel:3,color:'#efb16a',category:'融合 / 环斩与灼烧',desc:'长刃与火种合为炽烈日轮。全周斩击后留下持续灼烧的火环。',upgrades:['融合为日轮，斩击与火环同时生效。','提高日轮与灼烧伤害，扩大火环。','日轮达到极境，伤害与攻击范围再次提升。'],cooldown:1.7},
 thunderbolt:{name:'雷棘贯星',fusion:true,maxLevel:3,color:'#c9b9f2',category:'融合 / 追踪与连锁',desc:'弩矢追踪并穿透敌群，每枚箭矢首次命中时向附近敌人传导连锁雷霆。',upgrades:['融合为雷霆连弩，追踪箭矢触发连锁闪电。','增加一枚弩矢、一次穿透与一个连锁目标。','箭雨达到极境，再次提升数量、穿透与雷击伤害。'],cooldown:1.5},
 glacier:{name:'寂星寒狱',fusion:true,maxLevel:3,color:'#a1e0e1',category:'融合 / 环绕与寒域',desc:'寒晶绕身自动迎敌；周期展开寒域，牵引与冻结敌人，寒域消散时引发冰爆。',upgrades:['融合为寒晶星环，并解锁引力寒域。','增加一颗寒晶，扩大寒域并强化冰爆。','寒狱达到极境，再增一颗寒晶并缩短寒域冷却。'],cooldown:4.4},
 blade:{name:'余烬长刃',evolution:'终焉·日轮',color:'#e2bf80',category:'近战 / 扇形斩击',desc:'朝最近的敌人快速挥出宽幅剑气，击退身前敌群；进化后斩击覆盖全周。',upgrades:['解锁宽幅扇形斩击。','提高伤害与攻击距离。','挥砍更快、范围更广。','提高伤害与攻击距离。','剑气覆盖半周。','进化：全周日轮斩，重创周围敌人。'],cooldown:1.1},
 bolt:{name:'荆棘连弩',evolution:'终焉·万箭',color:'#c4d29b',category:'远程 / 穿透弩矢',desc:'发射穿刺黑暗的弩矢。',upgrades:['解锁自动弩矢。','提高伤害与穿透目标。','增加一枚弩矢，提高伤害与射速。','提高伤害并再次增加穿透。','增加一枚弩矢，提高伤害与射速。','进化：追踪箭雨，多重穿透。'],cooldown:1.05},
 orbit:{name:'游魂灯',evolution:'终焉·星环',color:'#a2d5c5',category:'法术 / 环绕守护',desc:'让不灭的灵魂围绕你旋转。',upgrades:['解锁环绕游魂，接触敌人造成伤害。','提高环绕半径与接触伤害。','增加游魂数量与伤害。','提高环绕半径与接触伤害。','增加游魂数量与伤害。','进化：内外双环反向旋转。'],cooldown:0},
 storm:{name:'天谴雷符',evolution:'终焉·神罚',color:'#d4c3eb',category:'法术 / 连锁落雷',desc:'唤来紫色雷霆，击穿成群敌人。',upgrades:['解锁多目标落雷。','增加落雷目标与伤害。','增加落雷目标与伤害。','增加落雷目标与伤害。','增加落雷目标，冷却缩短。','进化：密集神罚轰击敌阵。'],cooldown:4.1},
 flame:{name:'炼狱火种',evolution:'终焉·焚世',color:'#eaa16b',category:'元素 / 持续燃烧',desc:'投掷火种，在地面留下燃烧区域。',upgrades:['解锁火种，生成持续火焰。','提高火焰伤害与范围。','火焰持续更久，范围更广。','增加每轮火种数量。','提高火焰伤害与范围。','进化：更多火种，飞行时留下烈焰之路。'],cooldown:3.1},
 frost:{name:'霜月祷言',evolution:'终焉·永冬',color:'#acdfe0',category:'元素 / 减速脉冲',desc:'释放寒霜冲击，减缓附近敌人。',upgrades:['解锁寒霜脉冲，减速 55%。','提高伤害与范围。','缩短冷却，扩大范围。','减速持续更久，范围更广。','提高伤害与范围。','进化：冻结敌人并造成重创。'],cooldown:5.2},
};
export const PASSIVES = {
 ...RELICS,
 power:{name:'猩红誓约',desc:'所有武器伤害 +12%。',color:'#d5957c',max:5},
 vitality:{name:'不灭之心',desc:'最大生命 +12，并立即恢复 12 点生命。',color:'#b7ce92',max:5},
 haste:{name:'时隙沙漏',desc:'武器施放、召唤射击、环绕接触与领域伤害间隔缩短 6%。',color:'#d8c997',max:5,rarity:'uncommon'},
 speed:{name:'夜行之靴',desc:'移动速度 +6%，拾取范围 +6%。',color:'#b1c696',max:5},
 magnet:{name:'引魂石',desc:'拾取范围 +35%。更安全地回收战场经验。',color:'#92c4c2',max:5},
 armor:{name:'旧王护符',desc:'每次受伤减少 2 点；仍至少承受原伤害的 30%。',color:'#b9c4a1',max:5},
 regen:{name:'复苏苔芽',desc:'每秒恢复 0.22 点生命。',color:'#a9c591',max:5},
 luck:{name:'命运四叶',desc:'暴击几率 +5 个百分点。基础暴击造成双倍伤害。',color:'#bbc58c',max:5},
 area:{name:'星图卷轴',desc:'武器范围、光束宽度、连锁与弹跳距离 +10%。',color:'#b4bbde',max:3,rarity:'uncommon'},
 duration:{name:'长明烛',desc:'武器领域、减速与普通敌人冻结、禁锢持续时间 +15%；不延长首领冻结、禁锢。',color:'#e7ca91',max:3},
 amount:{name:'双生银币',desc:'武器弹数、环绕物或落雷目标 +1；不增加炮台数量。',color:'#d9d7ae',max:2,rarity:'rare'},
 focus:{name:'破军徽记',desc:'暴击伤害倍率 +0.25。与命运四叶、猎魂目配合。',color:'#dca9a1',max:3,rarity:'uncommon'},
 growth:{name:'记忆冠冕',desc:'经验获取 +10%。占用一个道具位，提前投资成长。',color:'#bcd49d',max:3,rarity:'uncommon'},
 curse:{name:'禁忌烛冠',desc:'伤害 +10%、经验 +8%；敌人生命 +12%、生成频率 +8%、速度 +3%。',color:'#c399cf',max:3,rarity:'rare'},
};
export const META = {
 power:{name:'余烬之力',icon:'power',desc:'每级 +3% 武器伤害，最多 +15%。',max:5,cost:60,costs:[60,90,120,150,180]},
 reach:{name:'星火余照',icon:'area',desc:'每级 +3% 武器范围，最多 +15%。',max:5,cost:120,costs:[120,160,200,240,280]},
 tempo:{name:'战意微燃',icon:'haste',desc:'武器直接命中有 12% 概率使武器攻击间隔缩短 15%，持续 6 秒。',max:3,cost:400,costs:[400,600,800],cooldowns:[20,15,10]},
 flare:{name:'扩焰回响',icon:'area',desc:'武器直接命中有 10% 概率使武器范围增加 25%，持续 8 秒。',max:2,cost:1000,costs:[1000,1400],cooldowns:[24,12]},
 conquest:{name:'破阵薪火',icon:'solar',desc:'击败精英或首领后，同时获得间隔 −15%、范围 +25%、移速 +15%，持续 10 秒，不叠加。',max:1,cost:1800,cooldowns:[18]},
 magnet:{name:'引路之光',icon:'growth',desc:'每级 +3% 经验获取，最多 +15%。',max:5,cost:60,costs:[60,90,120,150,180]},
 pace:{name:'行旅轻步',icon:'speed',desc:'每级 +2% 移速，最多 +10%。',max:5,cost:120,costs:[120,160,200,240,280]},
 wind:{name:'猎风应答',icon:'speed',desc:'武器直接命中有 12% 概率使移速增加 15%，持续 6 秒。',max:3,cost:400,costs:[400,600,800],cooldowns:[20,15,10]},
 chill:{name:'寒光留痕',icon:'frostbrand',desc:'武器直接命中有 12% 概率使目标减速 55%，持续 1.5 秒。',max:2,cost:1000,costs:[1000,1400],cooldowns:[4,2]},
 omen:{name:'蚀星刻印',icon:'deadeye',desc:'武器直接命中异常状态目标，有 15% 概率施加 15% 易伤，持续 6 秒，只取最高易伤。',max:1,cost:1800,cooldowns:[6]},
 vitality:{name:'长明之躯',icon:'vitality',desc:'每级 +4 初始生命，最多 +20。',max:5,cost:60,costs:[60,90,120,150,180]},
 regen:{name:'春回之息',icon:'regen',desc:'连续 4 秒未受攻击后，每级恢复 0.08 生命 / 秒，最多 0.4。',max:5,cost:120,costs:[120,160,200,240,280]},
 blood:{name:'拾烬回生',icon:'siphon',desc:'击杀有 10% 概率恢复 2 生命，不超过最大生命。',max:3,cost:400,costs:[400,600,800],cooldowns:[6,4.5,3]},
 ward:{name:'护灯余光',icon:'aegis',desc:'受击后有 20% 概率将护盾补至 8，不与较高护盾叠加。',max:2,cost:1000,costs:[1000,1400],cooldowns:[20,10]},
 laststand:{name:'绝境续灯',icon:'aegis',desc:'非致命受击后生命降至 25% 以下，恢复 10 生命、护盾补至 20；每局一次，不能抵挡致命伤害。',max:1,cost:1800},
};
export const META_TREES=[
 {id:'ember',name:'星火',hint:'输出 · 范围',nodes:['power','reach','tempo','flare','conquest']},
 {id:'stars',name:'游星',hint:'移动 · 异常',nodes:['magnet','pace','wind','chill','omen']},
 {id:'light',name:'长明',hint:'生存 · 恢复',nodes:['vitality','regen','blood','ward','laststand']},
];
export const metaCost=(key,level)=>META[key].costs?.[level]??META[key].cost*(level+1)**2;
export function metaState(meta,key){
 if(!Object.hasOwn(META,key))return null;
 const info=META[key],level=meta[key]||0,tree=META_TREES.find(tree=>tree.nodes.includes(key));
 const prerequisite=tree.nodes.slice(0,tree.nodes.indexOf(key)).find(id=>(meta[id]||0)<META[id].max);
 return {level,cost:metaCost(key,level),cooldown:info.cooldowns?.[level-1],nextCooldown:info.cooldowns?.[level],maxed:level>=info.max,prerequisite,available:level<info.max&&!prerequisite};
}
export const STARTING_WEAPONS={
 capacitor:{cost:600,hint:'释放跳跃电弧，配合蓄电与雷电遗物。'},
 tide:{cost:600,hint:'推出移动潮环，以减速与击退打开道路。'},
 needle:{cost:600,hint:'扇形穿透寒针，适合移动拉扯。'},
 lantern:{cost:600,hint:'放飞追踪魂灯，围绕灵魂联动成长。'},
 flame:{cost:600,hint:'投掷火种，用持续火焰控制追兵。'},
 frost:{cost:600,hint:'释放寒霜脉冲，以减速争取生存空间。'},
 prism:{cost:600,hint:'发射贯穿光束，从直线敌群中打开缺口。'},
 thorn:{cost:600,hint:'射出毒刺，以侵蚀持续削弱敌人。'},
 sentinel:{cost:600,hint:'部署短暂存续的炮台，围绕阵地回收经验。'},
 crescent:{cost:600,hint:'抛出往返月镰，利用回旋路径击中敌群。'},
};
export function startingLoadout(character,preparation={}){
 const key=preparation.selectedWeapon,weapon=Object.hasOwn(STARTING_WEAPONS,key)&&preparation.weaponUnlocks?.includes(key)?key:character.weapon;
 return {weapons:{[weapon]:1},passives:{}};
}
export const PICKUPS = {
 xp:{name:'灵光结晶',color:'#b3cc89',desc:'拾取后获得经验。精英掉落醒目的大结晶，保留同类普通敌人 8 倍的基础经验；较大的结晶也可能由多颗合并而成。',source:'击败敌人后掉落；精英不再掉落升级宝箱。'},
 heal:{name:'生命药草',color:'#bfd394',desc:'拾取后立即恢复 12 点生命，不超过最大生命。',source:'击败敌人时有机会掉落；共享 20 秒间隔，地面最多保留一株。'},
 magnet:{name:'引魂之光',color:'#a6d9e2',desc:'让地面上现有的全部经验结晶向你飞来；不会永久改变拾取范围。',source:'普通敌人有机会掉落；每位首领必定额外掉落一枚。'},
 chest:{name:'古老宝箱',color:'#e0bd78',desc:'每波首领共享一个宝箱：强化已有装备两次、恢复 10 生命并赠 60 余烬。优先提升装备等级；没有可升等级时精修满级武器。排除放逐装备，不自动融合；完全无合法强化时每次改为 24 基础经验。',source:'同一波最后一名首领死亡时掉落；额外首领不增加宝箱数量。'},
 hourglass:{name:'凝时碎砂',color:'#b5dce7',desc:'立即冻结当前普通敌人 3 秒，首领仅冻结 0.3 秒。',source:'击败敌人时罕见掉落，与其他战术补给共享掉落间隔。'},
 nova:{name:'破晓火种',color:'#efb078',desc:'立即对半径 210 内的普通敌人造成 500 伤害，首领受到 250 伤害；伤害不触发遗物。',source:'击败敌人时罕见掉落，与其他战术补给共享掉落间隔。'},
 ward:{name:'灯盾残片',color:'#c2d9b1',desc:'护盾补至 20 点，先于生命承受伤害；不与已有护盾相加。',source:'击败敌人时罕见掉落，与其他战术补给共享掉落间隔。'},
};
export const ENEMIES = {
 cinderling:{name:'烬火侍从',hint:'中距离发射慢速火弹，保持横向移动。',hp:30,speed:31,damage:11,xp:2,r:7,score:1},
 bomber:{name:'爆炉残骸',hint:'靠近后停下蓄爆，离开橙圈或提前击杀。',hp:48,speed:34,damage:14,xp:4,r:9,score:2},
 bulwark:{name:'熔铁卫',hint:'正面减伤 45%，绕后或用领域与异常伤害。',hp:100,speed:20,damage:19,xp:6,r:11,score:3},
 siren:{name:'沉钟歌妖',hint:'发射三向音弹，穿过弹幕间隙。',hp:42,speed:27,damage:13,xp:3,r:8,score:2},
 leech:{name:'裂潮兽',hint:'直线蓄力后突进，向侧面闪避。',hp:29,speed:35,damage:10,xp:2,r:7,score:1},
 oracle:{name:'裂隙司祭',hint:'召唤无奖励援兵，优先打断源头。',hp:78,speed:19,damage:15,xp:8,r:10,score:4},
 skeleton:{hp:32,speed:29,damage:12,xp:2,r:7,score:1},
 ghoul:{hp:50,speed:24,damage:15,xp:3,r:9,score:1},
 bat:{hp:26,speed:55,damage:9,xp:1,r:7,score:1},
 ghost:{hp:44,speed:27,damage:14,xp:3,r:8,score:2},
 knight:{hp:115,speed:22,damage:21,xp:7,r:10,score:3},
 reaper:{hp:84,speed:42,damage:19,xp:5,r:9,score:2},
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
export function readSave(fallback={}){
  let d;try{d=JSON.parse(localStorage.getItem('afterlight-save-v1')||'{}')||{}}catch{d=fallback}
  const amount=(value,integer=true)=>{const n=typeof value==='number'||typeof value==='string'?Number(value):0;return Number.isFinite(n)?Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,integer?Math.floor(n):n)):0};
  const version=amount(d.metaVersion),legacy=version<2,meta={};let refund=0;
  for(const tree of META_TREES){let unlocked=true;for(const [index,key] of tree.nodes.entries()){
    const info=META[key],max=info.cooldowns?(legacy?1:version===2?3:info.max):info.max;
    const level=(info.cooldowns||info.max===1)&&!unlocked?0:Math.min(max,amount(d.meta?.[key]));unlocked&&=level===max;
    meta[key]=legacy&&info.cooldowns&&level?info.max:Math.min(info.max,level);
    if(version<4){
      // Keep historical prices fixed when refunding each save version's actual spend.
      const oldBase=index===0?{power:160,magnet:140,vitality:120}[key]:[0,0,10000,18000,30000][index];
      for(let rank=0;rank<level;rank++)refund+=index===0?oldBase*(rank+1)**2:index===1?4000+500*rank:oldBase*(1+rank*.5);
      for(let rank=0;rank<meta[key];rank++)refund-=metaCost(key,rank);
    }
  }}
  const oldWeapons={ember:'flame',frost:'frost',storm:'prism',blight:'thorn',stars:'sentinel',blood:'crescent'};
  const weaponUnlocks=[...new Set([...(Array.isArray(d.weaponUnlocks)?d.weaponUnlocks:[]),...Object.entries(oldWeapons).filter(([id])=>amount(d.legacyRanks?.[id])>=1).map(([,weapon])=>weapon)])].filter(key=>typeof key==='string'&&Object.hasOwn(STARTING_WEAPONS,key));
  const preferred=d.selectedWeapon??(typeof d.selectedLegacy==='string'&&Object.hasOwn(oldWeapons,d.selectedLegacy)?oldWeapons[d.selectedLegacy]:null),selectedWeapon=weaponUnlocks.includes(preferred)?preferred:null;
  refund+=Object.keys(oldWeapons).reduce((sum,id)=>sum+(amount(d.legacyRanks?.[id])>=2?2400:0)+(amount(d.legacyRanks?.[id])>=3?7200:0),0);
  return {embers:Math.min(Number.MAX_SAFE_INTEGER,amount(d.embers)+refund),best:amount(d.best,false),kills:amount(d.kills),runs:amount(d.runs),wins:amount(d.wins),metaVersion:4,meta,weaponUnlocks,selectedWeapon,muted:!!d.muted,discoveredFusions:normalizeDiscoveries(d.discoveredFusions),discoveredItems:normalizeItemDiscoveries(d.discoveredItems)};
}
let saveQueue=Promise.resolve(),lastStored=null,pendingMuted;
const pending={embers:0,best:0,kills:0,runs:0,wins:0};
export function refreshSave(save){
 const latest=readSave(lastStored||save);lastStored=structuredClone(latest);
 for(const key of ['embers','kills','runs','wins'])latest[key]=Math.min(Number.MAX_SAFE_INTEGER,latest[key]+pending[key]);
 latest.best=Math.max(latest.best,pending.best);if(pendingMuted!==undefined)latest.muted=pendingMuted;
 latest.discoveredFusions=normalizeDiscoveries([...latest.discoveredFusions,...(save.discoveredFusions||[])]);
 latest.discoveredItems=mergeItemDiscoveries(latest.discoveredItems,save.discoveredItems);
 return Object.assign(save,latest);
}
export function writeSave(save,change={}){
 const commit=(persist=true)=>{
  if(change.result){const r=change.result;pending.embers+=r.reward;pending.best=Math.max(pending.best,r.time);pending.kills+=r.kills;pending.runs++;if(r.won)pending.wins++}
  if(Object.hasOwn(change,'muted'))pendingMuted=!!change.muted;
  refreshSave(save);
  const next=structuredClone(save),level=next.meta[change.purchase]||0;
  const purchased=!!metaState(next.meta,change.purchase)?.available&&(change.metaLevel===undefined||change.metaLevel===level)&&next.embers>=metaCost(change.purchase,level);
  if(purchased){next.embers-=metaCost(change.purchase,level);next.meta[change.purchase]=level+1}
  const weaponInfo=Object.hasOwn(STARTING_WEAPONS,change.unlockWeapon)?STARTING_WEAPONS[change.unlockWeapon]:null;
  const unlocked=!!weaponInfo&&!next.weaponUnlocks.includes(change.unlockWeapon)&&next.embers>=weaponInfo.cost;
  if(unlocked){next.embers-=weaponInfo.cost;next.weaponUnlocks.push(change.unlockWeapon)}
  const selected=Object.hasOwn(change,'selectWeapon')&&(change.selectWeapon===null||next.weaponUnlocks.includes(change.selectWeapon));
  if(selected)next.selectedWeapon=change.selectWeapon;
  if(!persist)return {persisted:false,purchased:false,unlocked:false,selected:false};
  try{localStorage.setItem('afterlight-save-v1',JSON.stringify(next))}catch{return {persisted:false,purchased:false,unlocked:false,selected:false}}
  lastStored=structuredClone(next);for(const key of Object.keys(pending))pending[key]=0;pendingMuted=undefined;Object.assign(save,next);
  return {persisted:true,purchased,unlocked,selected};
 };
 // ponytail: without Web Locks, writes serialize within one page only; use IndexedDB for cross-tab transactions on those browsers.
 const task=async()=>{if(!globalThis.navigator?.locks)return commit();try{return await navigator.locks.request('afterlight-save-v1',()=>commit())}catch{return commit(false)}};
 const result=saveQueue.then(task);saveQueue=result.catch(()=>{});return result;
}
