import {WEAPONS,PASSIVES} from './data.js';
import {FUSIONS,WEAPON_SLOTS,PASSIVE_SLOTS,maxWeaponLevel,weaponName,fusionState,fusionChoice} from './fusions.js';
import {relicDescription,compatibleWeapons,WEAPON_FAMILIES,BUILD_TAGS,itemTags,WEAPON_REFINEMENTS,REFINEMENT_RARITIES,refinementGain,weaponAnomalyText} from './content.js';
import {weaponStats,refinementValue} from './stats.js';
import {CHARACTER_TALENTS} from './talents.js';
import {STAGES} from './expeditions.js';

export const RUN_DURATION=900;
export const PHASES=[
  {at:0,name:'拾火',hint:'保持走位 · 前中期避免硬抗',hp:1.1,damage:1.15,speed:1.03,count:1,interval:1.05,cap:85,roster:{skeleton:80,bat:20}},
  {at:60,name:'夜翼',hint:'幽魂加入围猎 · 走位避开远射',hp:2.6,damage:1.27,speed:1.08,count:2,interval:.98,cap:115,roster:{skeleton:30,ghoul:35,bat:25,ghost:10}},
  {at:120,name:'幽火',hint:'保持清场路线 · 为融合准备材料',hp:4.2,damage:1.42,speed:1.14,count:3,interval:.98,cap:145,roster:{skeleton:25,ghoul:35,bat:20,ghost:20}},
  {at:180,name:'墓门',hint:'首领来袭 · 三分钟后开启融合',hp:6.2,damage:1.58,speed:1.2,count:3,interval:.95,cap:155,roster:{skeleton:20,ghoul:35,ghost:25,knight:20}},
  {at:240,name:'回响',hint:'完成控制与输出联动 · 避免硬抗',hp:7.3,damage:1.74,speed:1.25,count:4,interval:.94,cap:185,roster:{skeleton:20,ghoul:30,bat:25,ghost:15,knight:10}},
  {at:300,name:'铁棘',hint:'重甲压境 · 成型组合开始反攻',hp:8.4,damage:1.9,speed:1.3,count:4,interval:.88,cap:205,roster:{ghoul:25,bat:15,ghost:15,knight:35,reaper:10}},
  {at:360,name:'葬钟',hint:'第二位守门人 · 避开锁定冲锋',hp:9.9,damage:2.08,speed:1.34,count:4,interval:.86,cap:215,roster:{ghoul:20,ghost:25,knight:30,reaper:25}},
  {at:420,name:'猎月',hint:'收割者突进 · 提前横移避开正面',hp:11.2,damage:2.24,speed:1.38,count:5,interval:.84,cap:235,roster:{bat:30,ghost:20,knight:20,reaper:30}},
  {at:480,name:'蚀潮',hint:'控制与穿透 · 打开一条生路',hp:12.6,damage:2.4,speed:1.43,count:5,interval:.8,cap:255,roster:{ghoul:15,bat:20,ghost:20,knight:20,reaper:25}},
  {at:540,name:'长夜合围',hint:'完成融合联动 · 为成型反攻准备',hp:14,damage:2.56,speed:1.48,count:6,interval:.78,cap:275,roster:{bat:15,ghost:15,knight:30,reaper:40}},
  {at:600,name:'余烬反攻',hint:'构筑成型 · 清扫怪潮并继续精修',hp:15.2,damage:2.7,speed:1.5,count:6,interval:.78,cap:275,roster:{ghoul:20,bat:20,ghost:15,knight:20,reaper:25}},
  {at:660,name:'百魂回响',hint:'收集灵光 · 让精修放大联动',hp:16,damage:2.7,speed:1.5,count:6,interval:.78,cap:275,roster:{bat:25,ghost:20,knight:25,reaper:30}},
  {at:720,name:'破阵',hint:'穿透与范围 · 打开清场路线',hp:16.8,damage:2.7,speed:1.5,count:6,interval:.78,cap:275,roster:{bat:15,ghost:15,knight:30,reaper:40}},
  {at:780,name:'逐暗',hint:'保持联动 · 回收怪潮留下的经验',hp:17.6,damage:2.7,speed:1.5,count:6,interval:.78,cap:275,roster:{bat:20,ghost:20,knight:25,reaper:35}},
  {at:840,name:'黎明前夕',hint:'最后一次围猎 · 为君王保留补给',hp:18.4,damage:2.7,speed:1.5,count:6,interval:.78,cap:275,roster:{bat:10,ghost:15,knight:35,reaper:40}},
  {at:RUN_DURATION,name:'破晓',hint:'击败蚀月君王 · 警惕环形弹幕缺口',hp:19.2,damage:2.7,speed:1.5,count:4,interval:1.05,cap:150,roster:{ghost:20,knight:40,reaper:40}},
];

export function pressureAt(time,curse=0,difficulty={},stage='graveyard'){
  const index=Math.min(PHASES.length-1,Math.max(0,Math.floor(time/60))),phase=PHASES[index],next=PHASES[Math.min(index+1,PHASES.length-1)];
  const fraction=Math.min(1,Math.max(0,(time-phase.at)/60));
  const bossBreather=(time>=180&&time<192)||(time>=360&&time<372);
  const chapter=STAGES[stage]||STAGES.graveyard;
  return {...phase,name:stage==='graveyard'?phase.name:time>=RUN_DURATION?chapter.bosses[2]:chapter.name+' · '+(index+1),hint:stage==='graveyard'?phase.hint:chapter.hint,roster:chapter.rosters?.[Math.min(5,Math.floor(time/120))]||phase.roster,index,hp:(phase.hp+(next.hp-phase.hp)*fraction)*(1+curse*.12)*(difficulty.hp||1)*(chapter.hp||1),damage:(phase.damage+(next.damage-phase.damage)*fraction)*(difficulty.damage||1),
    speed:(phase.speed+(next.speed-phase.speed)*fraction)*(1+curse*.03)*(difficulty.speed||1),interval:phase.interval/((1+curse*.08)*(bossBreather?.6:1)*(difficulty.population||1)),
    cap:Math.round(phase.cap*(difficulty.population||1)),eliteChance:time<180?0:.02*(difficulty.elite||1)};
}

export const xpForLevel=level=>Math.round(18+6*(level-1)+1.4*Math.pow(Math.max(0,level-5),1.65));
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
    if(game.banished?.has(key)||(weapon?game.consumedWeapons:game.consumedPassives)?.has(key))continue;
    if(current>=max){
      if(!weapon)continue;
      const values=weaponStats(key,current,game.stats,game.character),tags=WEAPON_FAMILIES[key]||[];
      const refinements=Object.entries(WEAPON_REFINEMENTS).filter(([id,info])=>(!info.tags||info.tags.some(tag=>tags.includes(tag)))&&(!info.fields||info.fields.some(field=>values[field]>0))&&!(id==='duration'&&tags.includes('summon')&&values.duration>=values.cooldown*2));
      for(const [refinement,info] of refinements)for(const [rarity,tier] of Object.entries(REFINEMENT_RARITIES)){
        const value=refinementValue(game.stats,key,refinement,rarity);if(!value)continue;
        pool.push({key,weapon:true,current,next:current,refinement,rarity,value,choiceId:key+':'+refinement,name:weaponName(key,current)+' · '+info.name,color:tier.color,
          description:refinementGain(refinement,value)+'。'+(refinement==='anomaly'?'命中时：'+weaponAnomalyText(key)+'。':refinement==='control'?'首领冻结时长不变。':refinement==='amount'?(tags.includes('summon')?'增加齐射弹数，召唤物仍最多 2 座。':'本武器精修额外数量上限 +4。'):''),
          weight:itemRarity(data).weight*2.25*tagAffinity(key,profile).multiplier*tier.weight/100/refinements.length,reason:'满级精修 · 仅此武器生效 · 同类收益累加'});
      }
      continue;
    }
    if(weapon&&data.fusion&&!current)continue;
    if(!current&&(weapon?weaponCount>=WEAPON_SLOTS:passiveCount>=PASSIVE_SLOTS))continue;
    const evolution=weapon&&!data.fusion&&current===5;
    if(evolution&&game.time<120)continue;
    const linked=data.relic?compatibleWeapons(key,game.weapons,game.passives,game.talents,game.character.id,game.weaponUpgrades):[];
    const enables=!current&&Object.keys(game.passives).some(id=>PASSIVES[id].relic&&!compatibleWeapons(id,game.weapons,game.passives,game.talents,game.character.id,game.weaponUpgrades).length&&compatibleWeapons(id,weapon?{...game.weapons,[key]:1}:game.weapons,weapon?game.passives:{...game.passives,[key]:1},game.talents,game.character.id,game.weaponUpgrades).length);
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
  const available=Object.keys(FUSIONS).filter(key=>!game.banished?.has(key)&&fusionState(key,game.weapons,game.passives,game).ready);
  const limitRefinements=available.length>0||pool.some(item=>!item.refinement);
  // ponytail: four weighted draws scan a small catalogue; use an indexed sampler if the pool grows into thousands.
  const weight=item=>item.weight*(previous.includes(item.choiceId||item.key)?.12:1);
  const take=item=>{if(!item)return;result.push(item);for(let i=pool.length-1;i>=0;i--)if((pool[i].choiceId||pool[i].key)===(item.choiceId||item.key)||limitRefinements&&item.refinement&&pool[i].refinement)pool.splice(i,1)};
  if(available.length){const key=available.includes(game.trackedFusion)?game.trackedFusion:available[Math.floor(Math.random()*available.length)];take(fusionChoice(key,game.weapons,game.passives))}
  if(FUSIONS[game.trackedFusion]&&game.discoveredFusions?.has(game.trackedFusion)){
    const state=fusionState(game.trackedFusion,game.weapons,game.passives,game);
    if(!state.forged&&!state.blocked)take(weightedPick(pool.filter(item=>state.ingredients.some(i=>i.id===item.key&&i.level<i.required)),weight));
  }
  if(result.length<4&&!result.some(item=>item.weapon&&item.current&&!item.refinement))take(weightedPick(pool.filter(item=>item.weapon&&item.current&&!item.refinement),weight));
  if(result.length<4)take(weightedPick(pool.filter(item=>item.refinement),weight));
  if(result.length<4&&Object.keys(game.weapons).length<2)take(weightedPick(pool.filter(item=>item.weapon&&!item.current),weight));
  if(result.length<4&&game.level%4===0)take(weightedPick(pool.filter(item=>!item.weapon&&PASSIVES[item.key].relic&&compatibleWeapons(item.key,game.weapons,game.passives,game.talents,game.character.id,game.weaponUpgrades).length),weight));
  if(result.length<4&&game.level>=5&&Math.random()<.22){
    const pivot=weightedPick(pool.filter(item=>!item.current&&item.affinity<1.18&&(!PASSIVES[item.key]?.relic||compatibleWeapons(item.key,game.weapons,game.passives,game.talents,game.character.id,game.weaponUpgrades).length)),weight);
    if(pivot)take({...pivot,reason:'转型机会',exploration:true});
  }
  while(result.length<4&&pool.length)take(weightedPick(pool,weight));
  if(!result.length)result.push({key:'heal',weapon:false,current:0,next:1,name:'余烬余韵',description:'恢复 12 点生命，获得 15 余烬。',color:'#c1d49c'});
  return result;
}
