import {WEAPONS,PASSIVES} from './data.js';

export const WEAPON_SLOTS = 6;
const weapon=(id,required=3)=>({id,type:'weapon',required});
const relic=id=>({id,type:'passive',required:2});
export const FUSIONS = {
  solar:{id:'solar',ingredients:[weapon('blade'),weapon('flame')],motto:'刃为骨，火为魂。',effect:'360° 日轮斩 + 持续灼烧火环'},
  thunderbolt:{id:'thunderbolt',ingredients:[weapon('bolt'),weapon('storm')],motto:'一箭贯星，万雷随行。',effect:'追踪穿透箭 + 命中连锁雷霆'},
  glacier:{id:'glacier',ingredients:[weapon('orbit'),weapon('frost')],motto:'灵魂归寂，长夜凝霜。',effect:'护身寒晶 + 牵引寒域 + 终结冰爆'},
  eclipse:{id:'eclipse',ingredients:[weapon('crescent'),weapon('blade')],motto:'月缺之处，锋刃生长。',effect:'往返巨镰 + 命中范围切割'},
  requiem:{id:'requiem',ingredients:[weapon('bell'),weapon('orbit')],motto:'钟声落尽，亡魂渡河。',effect:'双重冥钟震波 + 多枚追踪魂火'},
  plague:{id:'plague',ingredients:[weapon('thorn',4),relic('spore')],motto:'旧土之下，万棘苏生。',effect:'广域疫庭 + 持续侵蚀 + 终结孢爆'},
  bloodmoon:{id:'bloodmoon',ingredients:[weapon('crescent',4),relic('siphon')],motto:'以血为契，向月借生。',effect:'往返血镰 + 固有生命汲取'},
  tempest:{id:'tempest',ingredients:[weapon('prism',4),relic('conductor')],motto:'一线天光，万雷齐鸣。',effect:'扇形穿透雷束 + 连锁闪电'},
  absolute:{id:'absolute',ingredients:[weapon('frost',4),relic('rime')],motto:'万物静止，直到冰裂。',effect:'广域冻结 + 延迟碎冰重击'},
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
  const blocked=!forged&&(consumed||noSlot);
  const ready=!forged&&!blocked&&ingredients.every(item=>item.level>=item.required);
  const level=forged?weapons[key]:Math.min(3,1+ingredients.filter(item=>item.level>=(item.type==='weapon'?6:PASSIVES[item.id].max)).length);
  const progress=ingredients.reduce((sum,item)=>sum+Math.min(item.level,item.required),0);
  const total=ingredients.reduce((sum,item)=>sum+item.required,0);
  return {key,ingredients,forged,ready,blocked,reason:consumed?'材料已用于其他融合':noSlot?'武器位已满，无法获得缺失武器':'',level,progress,total};
}

export function fusionChoice(key,weapons,passives) {
  const state=fusionState(key,weapons,passives),data=WEAPONS[key],usesRelic=fusionUsesRelic(key);
  return {key,fusion:true,weapon:true,current:0,next:state.level,name:data.name,color:data.color,
    description:FUSIONS[key].effect+'。'+(usesRelic?'消耗武器与道具；道具的独立效果随之失去，获得成品固有效果。':'消耗两件武器，合为一格。'),
    ingredients:state.ingredients.map(item=>({...item}))};
}
