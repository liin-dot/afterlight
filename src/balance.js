import {WEAPONS,PASSIVES} from './data.js';
import {FUSIONS,WEAPON_SLOTS,PASSIVE_SLOTS,maxWeaponLevel,fusionState,fusionChoice} from './fusions.js';
import {relicDescription,compatibleWeapons,WEAPON_FAMILIES,BUILD_TAGS,itemTags} from './content.js';
import {CHARACTER_TALENTS} from './talents.js';

export const RUN_DURATION=600;
export const PHASES=[
  {at:0,name:'拾火',hint:'建立主武器 · 留意脚边灵光',hp:1,damage:1,speed:1,count:1,interval:1.15,cap:85,roster:{skeleton:85,bat:15}},
  {at:60,name:'夜翼',hint:'蝠群穿行 · 冲刺越过包围',hp:1.25,damage:1.07,speed:1.04,count:2,interval:1.05,cap:115,roster:{skeleton:45,ghoul:25,bat:30}},
  {at:120,name:'幽火',hint:'幽魂远射 · 优先清理侧翼',hp:1.6,damage:1.14,speed:1.08,count:3,interval:1,cap:145,roster:{skeleton:30,ghoul:30,bat:25,ghost:15}},
  {at:180,name:'墓门',hint:'首领来袭 · 三分钟后开启融合',hp:2.05,damage:1.23,speed:1.12,count:3,interval:.95,cap:155,roster:{skeleton:20,ghoul:35,ghost:25,knight:20}},
  {at:240,name:'回响',hint:'收拢掉落 · 完善遗物联动',hp:2.65,damage:1.34,speed:1.16,count:4,interval:.94,cap:185,roster:{skeleton:20,ghoul:30,bat:25,ghost:15,knight:10}},
  {at:300,name:'铁棘',hint:'重甲压境 · 单体伤害开始重要',hp:3.45,damage:1.45,speed:1.2,count:4,interval:.88,cap:205,roster:{ghoul:25,bat:15,ghost:15,knight:35,reaper:10}},
  {at:360,name:'葬钟',hint:'第二位守门人 · 避开锁定冲锋',hp:4.35,damage:1.56,speed:1.24,count:4,interval:.86,cap:215,roster:{ghoul:20,ghost:25,knight:30,reaper:25}},
  {at:420,name:'猎月',hint:'收割者突进 · 给冲刺留出空档',hp:5.5,damage:1.67,speed:1.28,count:5,interval:.84,cap:235,roster:{bat:30,ghost:20,knight:20,reaper:30}},
  {at:480,name:'蚀潮',hint:'控制与穿透 · 打开一条生路',hp:6.8,damage:1.78,speed:1.32,count:5,interval:.8,cap:255,roster:{ghoul:15,bat:20,ghost:20,knight:20,reaper:25}},
  {at:540,name:'长夜尽头',hint:'最后一次围猎 · 为君王保留补给',hp:8.3,damage:1.89,speed:1.36,count:6,interval:.78,cap:275,roster:{bat:10,ghost:15,knight:35,reaper:40}},
  {at:600,name:'破晓',hint:'击败蚀月君王 · 警惕环形弹幕缺口',hp:9.8,damage:2,speed:1.38,count:4,interval:1.05,cap:150,roster:{ghost:20,knight:40,reaper:40}},
];

export function pressureAt(time,curse=0){
  const index=Math.min(PHASES.length-1,Math.max(0,Math.floor(time/60))),phase=PHASES[index],next=PHASES[Math.min(index+1,PHASES.length-1)];
  const fraction=Math.min(1,Math.max(0,(time-phase.at)/60));
  const bossBreather=(time>=180&&time<202)||(time>=360&&time<382);
  return {...phase,index,hp:(phase.hp+(next.hp-phase.hp)*fraction)*(1+curse*.12),damage:phase.damage+(next.damage-phase.damage)*fraction,
    speed:(phase.speed+(next.speed-phase.speed)*fraction)*(1+curse*.03),interval:phase.interval/((1+curse*.08)*(bossBreather?.6:1))};
}

export const xpForLevel=level=>Math.round(8+4*(level-1)+1.4*Math.pow(Math.max(0,level-5),1.65));
export const RARITIES={common:{name:'常见',weight:100,color:'#b5c69c'},uncommon:{name:'精良',weight:70,color:'#8fd4c0'},rare:{name:'稀有',weight:42,color:'#c9b1e6'}};
export const itemRarity=data=>RARITIES[data?.rarity]||RARITIES.common;

export function recordUpgradeChoice(game,key){
  if(!Object.hasOwn(WEAPONS,key)&&!Object.hasOwn(PASSIVES,key))return;
  game.choiceHistory=[...(game.choiceHistory||[]),key].slice(-12);
}

export function buildProfile(game){
  const scores={};
  const add=(key,weight)=>{const tags=itemTags(key).filter(tag=>tag!=='versatile');for(const tag of tags)scores[tag]=(scores[tag]||0)+weight/tags.length};
  // Equipped items are a weak anchor; recent deliberate choices drive the larger signal.
  for(const [key,level] of Object.entries({...game.weapons,...game.passives}))add(key,.18+Math.min(4,level-1)*.04);
  const history=game.choiceHistory||[];
  for(let i=history.length-1;i>=0;i--)add(history[i],.82**(history.length-1-i));
  const leading=Object.keys(scores).filter(tag=>scores[tag]>=.25).sort((a,b)=>scores[b]-scores[a]).slice(0,3);
  return {scores,leading};
}

export function tagAffinity(key,profile){
  const matches=itemTags(key).filter(tag=>profile.scores[tag]>0).sort((a,b)=>profile.scores[b]-profile.scores[a]);
  const strength=(profile.scores[matches[0]]||0)+(profile.scores[matches[1]]||0)*.25;
  return {multiplier:1+1.6*Math.min(1,strength/3),matches};
}

export function weightedPick(items,weight=item=>item.weight,random=Math.random){
  const total=items.reduce((sum,item)=>sum+Math.max(0,weight(item)),0);
  if(!items.length||total<=0)return null;
  let roll=random()*total;
  for(const item of items){roll-=Math.max(0,weight(item));if(roll<0)return item}
  return items.at(-1);
}

export function upgradePool(game){
  const pool=[],weaponCount=Object.keys(game.weapons).length,passiveCount=Object.keys(game.passives).length,profile=buildProfile(game);
  for(const [weapon,entries] of [[true,WEAPONS],[false,PASSIVES]])for(const [key,data] of Object.entries(entries)){
    const current=(weapon?game.weapons:game.passives)[key]||0,max=weapon?maxWeaponLevel(key):data.max;
    if(current>=max||game.banished?.has(key)||(weapon?game.consumedWeapons:game.consumedPassives)?.has(key))continue;
    if(weapon&&data.fusion&&!current)continue;
    if(!current&&(weapon?weaponCount>=WEAPON_SLOTS:passiveCount>=PASSIVE_SLOTS))continue;
    const evolution=weapon&&!data.fusion&&current===5;
    if(evolution&&game.time<120)continue;
    const linked=data.relic?compatibleWeapons(key,game.weapons,game.passives,game.talents,game.character.id):[];
    const enables=!current&&Object.keys(game.passives).some(id=>PASSIVES[id].relic&&!compatibleWeapons(id,game.weapons,game.passives,game.talents,game.character.id).length&&compatibleWeapons(id,weapon?{...game.weapons,[key]:1}:game.weapons,weapon?game.passives:{...game.passives,[key]:1},game.talents,game.character.id).length);
    let weight=itemRarity(data).weight*(current?(weapon?2.25:1.7):1);
    if(data.relic)weight*=linked.length?1.8:.22;
    if(!weapon&&!data.relic&&passiveCount<2)weight*=1.25;
    if(weapon&&!current)weight*=weaponCount<2?1.65:weaponCount>=4?.65:1;
    const related=Object.keys(FUSIONS).some(id=>{
      const state=fusionState(id,game.weapons,game.passives,game);
      return !state.blocked&&!state.forged&&state.ingredients.some(i=>i.id===key)&&state.ingredients.some(i=>i.id!==key&&i.level>0);
    });
    if(related)weight*=1.25;
    if(enables)weight*=1.8;
    const specialty=CHARACTER_TALENTS[game.character.id],affinity=weapon?(WEAPON_FAMILIES[key]||[]).some(tag=>specialty.families.includes(tag)):specialty.items.includes(key);
    if(affinity)weight*=1.18;
    if((key==='vitality'||key==='regen')&&game.player.hp<game.player.maxHp*.4)weight*=1.6;
    const fit=tagAffinity(key,profile);weight*=fit.multiplier;
    pool.push({key,weapon,current,next:current+1,evolution,name:evolution?data.evolution:data.name,
      description:data.relic?relicDescription(key,current+1,game.stats):weapon?data.upgrades[current]:data.desc,color:data.color,weight,affinity:fit.multiplier,
      reason:enables?'补齐遗物触发来源':current?'强化现有装备':linked.length?'联动已就绪':data.relic?'尚缺触发来源':fit.multiplier>=1.2?'顺应'+fit.matches.slice(0,2).map(tag=>BUILD_TAGS[tag].name).join(' / ')+'倾向':related?'与已有材料共鸣':affinity?'契合角色专长':'扩展构筑'});
  }
  return pool;
}

export function rollUpgradeChoices(game,previous=[]){
  const pool=upgradePool(game),result=[];
  // ponytail: three weighted draws scan a small catalogue; use an indexed sampler if the pool grows into thousands.
  const weight=item=>item.weight*(previous.includes(item.key)?.12:1);
  const take=item=>{if(!item)return;result.push(item);const index=pool.findIndex(p=>p.key===item.key);if(index>=0)pool.splice(index,1)};
  const available=Object.keys(FUSIONS).filter(key=>!game.banished?.has(key)&&fusionState(key,game.weapons,game.passives,game).ready);
  if(available.length){const key=available.includes(game.trackedFusion)?game.trackedFusion:available[Math.floor(Math.random()*available.length)];take(fusionChoice(key,game.weapons,game.passives))}
  if(FUSIONS[game.trackedFusion]&&game.discoveredFusions?.has(game.trackedFusion)){
    const state=fusionState(game.trackedFusion,game.weapons,game.passives,game);
    if(!state.forged&&!state.blocked)take(weightedPick(pool.filter(item=>state.ingredients.some(i=>i.id===item.key&&i.level<i.required)),weight));
  }
  if(result.length<3&&!result.some(item=>item.weapon&&item.current))take(weightedPick(pool.filter(item=>item.weapon&&item.current),weight));
  if(result.length<3&&Object.keys(game.weapons).length<2)take(weightedPick(pool.filter(item=>item.weapon&&!item.current),weight));
  if(result.length<3&&game.level%4===0)take(weightedPick(pool.filter(item=>!item.weapon&&PASSIVES[item.key].relic&&compatibleWeapons(item.key,game.weapons,game.passives,game.talents,game.character.id).length),weight));
  if(result.length<3&&game.level>=5&&Math.random()<.22){
    const pivot=weightedPick(pool.filter(item=>!item.current&&item.affinity<1.18&&(!PASSIVES[item.key]?.relic||compatibleWeapons(item.key,game.weapons,game.passives,game.talents,game.character.id).length)),weight);
    if(pivot)take({...pivot,reason:'转型机会',exploration:true});
  }
  while(result.length<3&&pool.length)take(weightedPick(pool,weight));
  if(!result.length)result.push({key:'heal',weapon:false,current:0,next:1,name:'余烬余韵',description:'恢复 12 点生命，获得 15 余烬。',color:'#c1d49c'});
  return result;
}
