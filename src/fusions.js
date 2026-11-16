import {WEAPONS,PASSIVES} from './data.js';

export const WEAPON_SLOTS = 5;
export const PASSIVE_SLOTS = 5;
export const FUSION_TIME = 180;
const weapon=(id,required=4)=>({id,type:'weapon',required});
const relic=id=>({id,type:'passive',required:2});
export const FUSIONS = {
  arcforge:{id:'arcforge',ingredients:[weapon('capacitor'),weapon('sentinel')],motto:'以雷为薪，以心为炉。',effect:'跳跃电弧 + 连锁末端雷爆'},
  maelstrom:{id:'maelstrom',ingredients:[weapon('tide'),weapon('tether')],motto:'所有归途，终将汇入潮眼。',effect:'移动潮眼 + 牵引与冻结'},
  frostloom:{id:'frostloom',ingredients:[weapon('needle'),weapon('frost')],motto:'万针织雪，长夜无声。',effect:'追踪穿透冰针 + 首击碎冰'},
  beacon:{id:'beacon',ingredients:[weapon('lantern'),weapon('bell')],motto:'彼岸不是终点，是千万盏归灯。',effect:'追踪魂灯群 + 首击范围共鸣'},
  hailfire:{id:'hailfire',ingredients:[weapon('meteor'),weapon('frost')],motto:'群星披雪，落地成灰。',effect:'冻结陨星 + 持续灼烧与减速寒域'},
  soulforge:{id:'soulforge',ingredients:[weapon('sentinel',5),relic('soulpact')],motto:'一座空龛，住满不愿远去的星。',effect:'穿透追魂齐射 + 灵龛消散震波'},
  solar:{id:'solar',ingredients:[weapon('blade'),weapon('flame')],motto:'刃为骨，火为魂。',effect:'360° 日轮斩 + 持续灼烧火环'},
  whirlwind:{id:'whirlwind',ingredients:[weapon('axe'),weapon('blade')],motto:'双刃起处，长风裂阵。',effect:'随身双重旋斩 + 外圈斧刃重击'},
  quake:{id:'quake',ingredients:[weapon('hammer'),weapon('bell')],motto:'一锤落下，山岳回声。',effect:'全周重锤 + 两次随身击退余震'},
  thunderbolt:{id:'thunderbolt',ingredients:[weapon('bolt'),weapon('storm')],motto:'一箭贯星，万雷随行。',effect:'追踪穿透箭 + 命中连锁雷霆'},
  glacier:{id:'glacier',ingredients:[weapon('orbit'),weapon('frost')],motto:'灵魂归寂，长夜凝霜。',effect:'护身寒晶 + 牵引寒域 + 终结冰爆'},
  eclipse:{id:'eclipse',ingredients:[weapon('crescent'),weapon('blade')],motto:'月缺之处，锋刃生长。',effect:'往返巨镰 + 命中范围切割'},
  requiem:{id:'requiem',ingredients:[weapon('bell'),weapon('orbit')],motto:'钟声落尽，亡魂渡河。',effect:'双重冥钟震波 + 多枚追踪魂火'},
  plague:{id:'plague',ingredients:[weapon('thorn',5),relic('spore')],motto:'旧土之下，万棘苏生。',effect:'广域疫庭 + 持续侵蚀 + 终结孢爆'},
  bloodmoon:{id:'bloodmoon',ingredients:[weapon('crescent',5),relic('siphon')],motto:'以血为契，向月借生。',effect:'往返血镰 + 固有生命汲取'},
  tempest:{id:'tempest',ingredients:[weapon('prism',5),relic('conductor')],motto:'一线天光，万雷齐鸣。',effect:'扇形穿透雷束 + 连锁闪电'},
  absolute:{id:'absolute',ingredients:[weapon('frost',5),relic('rime')],motto:'万物静止，直到冰裂。',effect:'广域冻结 + 延迟碎冰重击'},
  starfall:{id:'starfall',ingredients:[weapon('meteor',5),relic('embercore')],motto:'所有坠星，都曾是一盏灯。',effect:'陨星雨 + 燃烧领域 + 短暂易伤'},
  bastion:{id:'bastion',ingredients:[weapon('sentinel',5),relic('aegis')],motto:'此地灯火，不许熄灭。',effect:'穿透炮台 + 近距离周期护盾'},
  wintermine:{id:'wintermine',ingredients:[weapon('mine'),weapon('frost')],motto:'脚步落下，寒冬醒来。',effect:'感应冰棺 + 冻结爆炸 + 减速寒域'},
  soulchain:{id:'soulchain',ingredients:[weapon('tether'),weapon('bell')],motto:'钟声所至，冥河皆牢。',effect:'连锁禁锢 + 每个锁定点的延迟震爆'},
  ricochet:{id:'ricochet',ingredients:[weapon('shard',5),relic('lens')],motto:'白骨散尽，长风未止。',effect:'多重跳弹 + 首击分裂追踪骨片'},
  execution:{id:'execution',ingredients:[weapon('lance',5),relic('executioner')],motto:'破晓之前，裁决已至。',effect:'全周环扫 + 双重追刺 + 低血处决增伤'},
  supernova:{id:'supernova',ingredients:[weapon('meteor'),weapon('prism')],motto:'群星熔于一瞬。',effect:'延迟轰炸 + 落点四向贯穿光束'},
  stormsentry:{id:'stormsentry',ingredients:[weapon('sentinel'),weapon('storm')],motto:'无人值守，雷声不息。',effect:'固定雷塔 + 穿透电弹 + 首发连锁'},
  pestilence:{id:'pestilence',ingredients:[weapon('mine'),weapon('thorn')],motto:'每一步归途，都开出腐花。',effect:'孢子地雷 + 侵蚀疫池 + 终结毒爆'},
};

export const maxWeaponLevel=key=>WEAPONS[key].maxLevel||6;
export const weaponName=(key,level)=>!WEAPONS[key].fusion&&level===6?WEAPONS[key].evolution:WEAPONS[key].name;
export const ingredientData=item=>item.type==='passive'?PASSIVES[item.id]:WEAPONS[item.id];
export const fusionUsesRelic=key=>FUSIONS[key].ingredients.some(i=>i.type==='passive');

export function fusionState(key,weapons={},passives={},context={}) {
  const recipe=FUSIONS[key];
  const ingredients=recipe.ingredients.map(item=>({...item,level:(item.type==='passive'?passives:weapons)[item.id]||0}));
  const forged=Boolean(weapons[key]);
  const consumed=ingredients.some(item=>(item.type==='passive'?context.consumedPassives:context.consumedWeapons)?.has(item.id));
  const noSlot=Object.keys(weapons).length>=WEAPON_SLOTS&&ingredients.some(item=>item.type==='weapon'&&!item.level);
  const noPassiveSlot=Object.keys(passives).length>=PASSIVE_SLOTS&&ingredients.some(item=>item.type==='passive'&&!item.level);
  const banished=context.banished?.has(key)||ingredients.some(item=>item.level<item.required&&context.banished?.has(item.id));
  const blocked=!forged&&(consumed||noSlot||noPassiveSlot||banished);
  const waiting=Number.isFinite(context.time)&&context.time<FUSION_TIME;
  const ready=!forged&&!blocked&&!waiting&&ingredients.every(item=>item.level>=item.required);
  const level=forged?weapons[key]:Math.min(3,1+ingredients.filter(item=>item.level>=(item.type==='weapon'?6:PASSIVES[item.id].max)).length);
  const progress=ingredients.reduce((sum,item)=>sum+Math.min(item.level,item.required),0);
  const total=ingredients.reduce((sum,item)=>sum+item.required,0);
  return {key,ingredients,forged,ready,blocked,waiting,reason:consumed?'材料已用于其他融合':banished?'所需材料已放逐':noSlot?'武器位已满，无法获得缺失武器':noPassiveSlot?'道具位已满，无法获得缺失道具':waiting?'03:00 后开启融合':'',level,progress,total};
}

export function fusionChoice(key,weapons,passives) {
  const state=fusionState(key,weapons,passives),data=WEAPONS[key],usesRelic=fusionUsesRelic(key);
  return {key,fusion:true,weapon:true,current:0,next:state.level,name:data.name,color:data.color,
    description:FUSIONS[key].effect+'。'+(usesRelic?'道具独立效果消失。':'合为一格。'),
    ingredients:state.ingredients.map(item=>({...item}))};
}
