import {WEAPON_FAMILIES} from './content.js';
import {TAU,diamond,glow} from './art.js';

export const TALENT_LEVELS=[4,8,12,18,24,30];
export const CHARACTER_TALENTS={
  warden:{name:'守灯誓约',color:'#e8b578',icon:'aegis',style:'近身作战 · 灯火与护盾',
    description:'出征自带 8 点护盾。85 范围内的武器直接命中积蓄灯火；每 6 层释放震荡并将护盾补至 8。每 0.35 秒积蓄一层，震荡最短间隔 6 秒；冷却期间蓄满会在冷却结束自动释放。',
    loop:'近身命中 → 积蓄灯火 → 震荡清场、补充灯盾',
    hint:'贴近敌人累积灯火，以护盾支撑近战。',families:['melee','fire'],items:['armor','aegis','thorns','siphon'],
    branches:[
      {name:'薪火',role:'灯火震荡 → 燃烧 → 范围回响',nodes:[
        {id:'w_flame1',name:'添薪',icon:'embercore',description:'灯火积满所需层数由 6 降至 5，灯火震荡伤害 +30%。'},
        {id:'w_flame2',name:'焚痕',icon:'embercore',description:'灯火震荡点燃敌人 3 秒，每 0.5 秒造成随角色等级成长的灼烧伤害。'},
        {id:'w_flame3',name:'焚城',icon:'solar',description:'灯火震荡范围 +25%，0.45 秒后追加一次 70% 伤害的回响。回响不补盾、不积蓄灯火。'},
      ]},
      {name:'灯壁',role:'积满灯火 → 厚盾回复 → 留存灯芯',nodes:[
        {id:'w_guard1',name:'灯罩',icon:'aegis',description:'积满灯火时，补充的灯盾由 8 提高至 16。多次补盾取较高值。'},
        {id:'w_guard2',name:'余温',icon:'regen',description:'积满灯火释放震荡时，额外恢复 3 点生命。破围震荡与回响不触发恢复。'},
        {id:'w_guard3',name:'灯火不灭',icon:'vitality',description:'积满灯火后储存灯芯。致命受击时消耗灯芯，恢复 35% 生命、补至 24 灯盾并释放震荡，获得 3 秒无敌；每局一次。'},
      ]},
      {name:'征途',role:'冲刺添火 → 破围震荡 → 加速蓄放',nodes:[
        {id:'w_dash1',name:'携灯',icon:'speed',description:'冲刺额外积蓄 2 层灯火；积满且冷却结束时，正常触发震荡与补盾。'},
        {id:'w_dash2',name:'破围',icon:'bell',description:'冲刺起点释放一次 50% 伤害的灯火震荡。可继承已学会的焚痕与焚城，不补盾或恢复生命。'},
        {id:'w_dash3',name:'逐日',icon:'lance',description:'冲刺后 4 秒内，近身命中每次积蓄 2 层灯火，蓄满震荡间隔降至 2.5 秒；已有剩余间隔也缩至最多 2.5 秒。'},
      ]},
    ]},
  witch:{name:'伴星契约',color:'#b7d9e8',icon:'orbit',style:'伴星召唤 · 控制与灵光',
    description:'自带一颗不占武器位的伴星，每 1.8 秒向附近敌人发射追踪星火。星火伤害随角色等级成长，天赋可增加伴星、控制或灵光联动。',
    loop:'伴星发射 → 星火命中 → 火力、寒月或引星回收',
    hint:'让伴星负责追击，用环绕武器清理近敌。',families:['spirit','cold','summon'],items:['area','duration','growth','rime'],
    branches:[
      {name:'星群',role:'增加伴星 → 星火穿透 → 密集齐射',nodes:[
        {id:'s_swarm1',name:'双星',icon:'amount',description:'伴星数量由 1 提高至 2，每颗伴星独立发射一枚星火。'},
        {id:'s_swarm2',name:'星芒',icon:'prism',description:'星火伤害 +25%，每枚星火可以穿透并命中两个敌人。'},
        {id:'s_swarm3',name:'星海',icon:'glacier',description:'伴星数量提高至 4，发射间隔由 1.8 秒缩短至 1.4 秒。'},
      ]},
      {name:'寒月',role:'星火减速 → 易伤 → 冰爆冻结',nodes:[
        {id:'s_frost1',name:'月痕',icon:'frostbrand',description:'星火命中使敌人减速 55%，持续 1.4 秒。'},
        {id:'s_frost2',name:'月蚀',icon:'deadeye',description:'星火命中施加 3 秒易伤，目标受到伤害 +12%；与其他易伤取较高值。'},
        {id:'s_frost3',name:'永夜',icon:'absolute',description:'星火命中触发半径 85 的冰爆，冻结普通敌人 1.2 秒、首领 0.25 秒；共享冷却 6 秒。'},
      ]},
      {name:'引星',role:'星火标记 → 灵光归巢 → 反哺伴星',nodes:[
        {id:'s_scholar1',name:'引星',icon:'magnet',description:'星火命中附加 3 秒引星标记。标记期间死亡的敌人，其经验结晶自动飞向你。'},
        {id:'s_scholar2',name:'灵泉',icon:'harvest',description:'回收引星结晶累计 30 基础经验，恢复 3 生命并补至 4 护盾；最短间隔 4 秒，最多储存一次充能。'},
        {id:'s_scholar3',name:'群星馈赠',icon:'requiem',description:'灵泉所需引星经验降至 20，护盾提高至 14；触发时额外释放 6 枚星火，继承已学会的星火效果。'},
      ]},
    ]},
  ranger:{name:'猎风步法',color:'#c9d69e',icon:'bolt',style:'移动蓄势 · 齐射与追猎',
    description:'移动 80 像素积满猎风，下一次武器主动施放追加一支穿透风矢，最短间隔 1.5 秒。停留超过 2 秒后蓄势衰减；风矢伤害随角色等级成长。',
    loop:'移动蓄满猎风 → 武器施放 → 追加穿透风矢',
    hint:'一边回收灵光一边蓄势，让移动转化为火力。',families:['projectile'],items:['speed','luck','focus','conductor'],
    branches:[
      {name:'穿风',role:'强化风矢 → 穿透敌群 → 追踪齐射',nodes:[
        {id:'r_shot1',name:'锐矢',icon:'bolt',description:'猎风风矢伤害 +25%，包括其他天赋触发的风矢。'},
        {id:'r_shot2',name:'穿林',icon:'shard',description:'每支风矢可穿透的目标由 2 增至 3。'},
        {id:'r_shot3',name:'贯星',icon:'thunderbolt',description:'每次猎风疾射改为同时发射 3 支追踪风矢。'},
      ]},
      {name:'游猎',role:'缩短蓄势 → 冲刺充满 → 移动连射',nodes:[
        {id:'r_roam1',name:'轻风',icon:'speed',description:'积满猎风所需移动距离由 80 降至 60 像素，疾射最短间隔由 1.5 秒缩至 1 秒。'},
        {id:'r_roam2',name:'借风',icon:'aegis',description:'冲刺立即充满猎风，并结束疾射冷却；下一次武器施放即可追加风矢。'},
        {id:'r_roam3',name:'无踪',icon:'crescent',description:'冲刺后 3 秒内，保持移动时每秒追加一轮风矢，不消耗猎风；停步暂停追加，再次冲刺刷新持续时间。'},
      ]},
      {name:'追猎',role:'风矢留痕 → 武器追击 → 风矢接力',nodes:[
        {id:'r_sight1',name:'风痕',icon:'deadeye',description:'风矢命中附加 4 秒风痕。武器直接命中风痕目标时，伤害 +12%。'},
        {id:'r_sight2',name:'追猎',icon:'focus',description:'武器每直接命中同一风痕目标 3 次，追加一轮风矢追击；共享间隔 1 秒，不消耗猎风。'},
        {id:'r_sight3',name:'绝息',icon:'execution',description:'风痕持续时间增至 6 秒，追击只需命中 2 次；风矢再次命中已有风痕的目标时，伤害 +50%。'},
      ]},
    ]},
};

export const talentPoints=game=>TALENT_LEVELS.filter(level=>game.level>=level).length-Object.keys(game.talents||{}).length;
export function talentNodeState(game,id){
  const definition=CHARACTER_TALENTS[game.character.id];
  const branch=definition?.branches.find(b=>b.nodes.some(n=>n.id===id)),tier=branch?.nodes.findIndex(n=>n.id===id);
  if(!branch)return {available:false,reason:'其他角色的天赋'};
  const learned=!!game.talents?.[id],requiredLevel=[4,8,18][tier];
  const exclusive=tier===2&&definition.branches.some(b=>b.nodes[2].id!==id&&game.talents?.[b.nodes[2].id]);
  const reason=learned?'已学会':exclusive?'本局已选择其他专精':game.level<requiredLevel?'需要 LV. '+requiredLevel:tier>0&&!game.talents?.[branch.nodes[tier-1].id]?'先学习「'+branch.nodes[tier-1].name+'」':talentPoints(game)<=0?'需要 1 天赋点':'学习 · 1 天赋点';
  return {available:!learned&&!exclusive&&game.level>=requiredLevel&&(tier===0||!!game.talents?.[branch.nodes[tier-1].id])&&talentPoints(game)>0,learned,exclusive,reason,tier,node:branch.nodes[tier]};
}

export function resetCharacterTalents(game){
  game.talents={};
  game.characterState={charge:0,nextCharge:0,nextPulse:0,starClock:.5,nextWind:0,still:0,xp:0,nextWell:0,nextCold:0,nextHunt:0,ghostUntil:0,nextGhost:0,assaultUntil:0,reviveReady:false,revived:false,procs:0,wells:0,hunts:0,coldBursts:0,starXp:0,echoes:[]};
  if(game.character.id==='warden')game.player.shield=8;
}

const starCount=t=>t.s_swarm3?4:t.s_swarm1?2:1;
const emberLimit=t=>t.w_flame1?5:6;
const windLimit=t=>t.r_roam1?60:80;
const windInterval=t=>t.r_roam1?1:1.5;
const wellLimit=t=>t.s_scholar3?20:30;
const starInterval=t=>t.s_swarm3?1.4:1.8;
const starDamage=game=>(10+game.level*.8)*game.stats.damageMultiplier*(game.talents.s_swarm2?1.25:1);
const windDamage=game=>(16+game.level)*game.stats.damageMultiplier*(game.talents.r_shot1?1.25:1);
const emberDamage=game=>(24+game.level*2)*game.stats.damageMultiplier*(game.talents.w_flame1?1.3:1);
const nearby=(game,x,y,r)=>game.grid.near(x,y,r+30).filter(e=>!e.dead&&Math.hypot(e.x-x,e.y-y)<=r+e.r);
export function onCharacterLearn(game){
  const s=game.characterState,t=game.talents;
  s.charge=Math.min(s.charge,game.character.id==='warden'?emberLimit(t):windLimit(t));
  s.xp=Math.min(s.xp,wellLimit(t));
  s.nextWind=Math.min(s.nextWind,game.time+windInterval(t));s.starClock=Math.min(s.starClock,starInterval(t));
}
function starPosition(game,index){const angle=game.time*1.4+index*TAU/starCount(game.talents);return {x:game.player.x+Math.cos(angle)*27,y:game.player.y-8+Math.sin(angle)*18}}

function fireStar(game,x,y,angle){
  game.projectiles.push({type:'soul',source:'talent',talent:'star',x,y,vx:Math.cos(angle)*190,vy:Math.sin(angle)*190,r:4,t:2.6,damage:starDamage(game),pierce:game.talents.s_swarm2?2:1,hit:new Set(),homing:true,trail:[]});
}
function fireWind(game,target){
  target=target&&!target.dead?target:game.closest(game.player.x,game.player.y,440);if(!target)return false;
  const t=game.talents,count=t.r_shot3?3:1,angle=Math.atan2(target.y-game.player.y,target.x-game.player.x);
  for(let i=0;i<count;i++){
    const a=angle+(i-(count-1)/2)*.15;
    game.projectiles.push({type:'bolt',source:'talent',talent:'wind',x:game.player.x,y:game.player.y-8,vx:Math.cos(a)*340,vy:Math.sin(a)*340,r:4,t:1.8,damage:windDamage(game),pierce:2+(t.r_shot2?1:0),hit:new Set(),homing:!!t.r_shot3,trail:[]});
  }
  game.characterState.procs++;return true;
}
function emberPulse(game,x,y,scale=1,echo=false){
  const t=game.talents,r=t.w_flame3?106:85,damage=emberDamage(game)*scale;
  game.effects.push({type:'pulse',x,y:y-8,r,color:'#e8ae72',t:.55,max:.55});game.burst(x,y-8,12,'#e8ae72',85);
  for(const e of nearby(game,x,y,r)){
    if(t.w_flame2){e.burningUntil=Math.max(e.burningUntil||0,game.time+3);e.burn={damage:Math.max(e.burn?.damage||0,(6+game.level*.5)*game.stats.damageMultiplier),until:Math.max(e.burn?.until||0,game.time+3),next:e.burn?.next??game.time+.5}}
    game.hit(e,damage,x,y,70,false,'talent',true);
  }
  if(t.w_flame3&&!echo)game.characterState.echoes.push({x,y,scale:scale*.7,at:game.time+.45});
}
function chargeEmber(game,amount){
  const s=game.characterState,t=game.talents,p=game.player;
  s.charge=Math.min(emberLimit(t),s.charge+amount);
  if(s.charge<emberLimit(t)||game.time<s.nextPulse)return;
  s.charge=0;s.nextPulse=game.time+(s.assaultUntil>game.time?2.5:6);s.procs++;
  p.shield=Math.max(p.shield,t.w_guard1?16:8);
  if(t.w_guard2)p.hp=Math.min(p.maxHp,p.hp+3);
  if(t.w_guard3&&!s.revived&&!s.reviveReady){s.reviveReady=true;game.texts.push({x:p.x,y:p.y-35,text:'灯芯已存',t:1.2,max:1.2,color:'#e8b578'})}
  emberPulse(game,p.x,p.y);
}

export function updateCharacterTalents(game,dt,moved){
  const s=game.characterState,t=game.talents,p=game.player;
  if(game.character.id==='warden'&&p.hp>0)chargeEmber(game,0);
  if(game.character.id==='witch'){
    if(t.s_scholar2)onCharacterXp(game,0);
    s.starClock-=dt;
    if(s.starClock<=0){const target=game.closest(p.x,p.y,360);if(target){for(let i=0;i<starCount(t);i++){const star=starPosition(game,i);fireStar(game,star.x,star.y,Math.atan2(target.y-8-star.y,target.x-star.x))}s.starClock=starInterval(t);s.procs++}}
  }
  if(game.character.id==='ranger'){
    if(moved>.05){s.charge=Math.min(windLimit(t),s.charge+moved);s.still=0}else{s.still+=dt;if(s.still>2)s.charge=Math.max(0,s.charge-dt*40)}
    if(moved>.05&&s.ghostUntil>game.time&&s.nextGhost<=game.time&&fireWind(game)){s.nextGhost=game.time+1}
  }
  for(const echo of s.echoes)if(echo.at<=game.time)emberPulse(game,echo.x,echo.y,echo.scale,true);
  s.echoes=s.echoes.filter(e=>e.at>game.time);
}

export function onCharacterCast(game){
  const s=game.characterState;
  if(game.character.id==='ranger'&&s.charge>=windLimit(game.talents)&&s.nextWind<=game.time&&fireWind(game)){s.charge=0;s.nextWind=game.time+windInterval(game.talents)}
}
export function characterHitMultiplier(game,e,source,periodic){
  if(periodic||!WEAPON_FAMILIES[source])return 1;
  return game.talents.r_sight1&&e.windMarkedUntil>game.time?1.12:1;
}
export function onCharacterHit(game,e,source,periodic){
  if(periodic||!WEAPON_FAMILIES[source])return;
  const s=game.characterState,t=game.talents,p=game.player;
  if(game.character.id==='warden'&&Math.hypot(e.x-p.x,e.y-p.y)<=85){
    const ready=game.time>=s.nextCharge;
    if(ready)s.nextCharge=game.time+.35;
    chargeEmber(game,ready?(s.assaultUntil>game.time?2:1):0);
  }
  if(t.r_sight2&&e.windMarkedUntil>game.time&&e.hp>0&&!e.dead){
    const hits=t.r_sight3?2:3;e.windHits=Math.min(hits,(e.windHits||0)+1);
    if(e.windHits>=hits&&game.time>=s.nextHunt){e.windHits=0;s.nextHunt=game.time+1;if(fireWind(game,e))s.hunts++}
  }
}
export function onCharacterProjectileHit(game,b,e){
  const t=game.talents,s=game.characterState;
  if(b.talent==='wind'){
    const marked=e.windMarkedUntil>game.time;
    if(t.r_sight1){if(!marked)e.windHits=0;e.windMarkedUntil=game.time+(t.r_sight3?6:4)}
    return marked&&t.r_sight3?1.5:1;
  }
  if(b.talent!=='star')return 1;
  if(t.s_scholar1)e.starMarkedUntil=game.time+3;
  if(t.s_frost1)e.slow=Math.max(e.slow,1.4);
  if(t.s_frost2)game.markEnemy(e,'moon',1.12,3);
  if(t.s_frost3&&s.nextCold<=game.time){
    s.nextCold=game.time+6;s.coldBursts++;game.effects.push({type:'frost',x:e.x,y:e.y-8,r:85,t:.65,max:.65});
    for(const other of nearby(game,e.x,e.y,85)){other.freeze=Math.max(other.freeze,other.boss?.25:1.2);game.hit(other,(30+game.level)*game.stats.damageMultiplier,e.x,e.y,40,false,'talent',true)}
  }
  return 1;
}
export function onCharacterDash(game){
  const t=game.talents,s=game.characterState,p=game.player;
  if(t.w_dash3){s.assaultUntil=game.time+4;s.nextPulse=Math.min(s.nextPulse,game.time+2.5)}
  if(t.w_dash1)chargeEmber(game,2);
  if(t.w_dash2)emberPulse(game,p.x,p.y,.5);
  if(t.r_roam2){s.charge=windLimit(t);s.nextWind=game.time}
  if(t.r_roam3){s.ghostUntil=game.time+3;s.nextGhost=game.time}
}
export function onCharacterHurt(game){
  const p=game.player,s=game.characterState;
  if(p.hp<=0&&s.reviveReady&&!s.revived){
    s.revived=true;s.reviveReady=false;s.charge=0;p.hp=p.maxHp*.35;p.shield=Math.max(p.shield,24);p.invincible=3;
    emberPulse(game,p.x,p.y);
    game.effects.push({type:'pulse',x:p.x,y:p.y-8,r:140,color:'#ffe2a8',t:1,max:1});game.banner('灯火不灭 · 誓约重燃','本局保命已触发 · 3 秒无敌',3);
  }
}
export function onCharacterXp(game,amount,starLinked=false){
  const t=game.talents,s=game.characterState,p=game.player;
  if(starLinked)s.starXp+=amount;
  if(!t.s_scholar2)return;s.xp=Math.min(wellLimit(t),s.xp+(starLinked?amount:0));
  if(s.xp>=wellLimit(t)&&game.time>=s.nextWell){
    s.xp=0;s.nextWell=game.time+4;s.wells++;p.hp=Math.min(p.maxHp,p.hp+3);p.shield=Math.max(p.shield,t.s_scholar3?14:4);
    game.effects.push({type:'pulse',x:p.x,y:p.y-8,r:35,color:'#b7d9e8',t:.5,max:.5});game.texts.push({x:p.x,y:p.y-35,text:'灵泉',t:1,max:1,color:'#b7d9e8'});
    if(t.s_scholar3)for(let i=0;i<6;i++)fireStar(game,p.x,p.y-8,i*TAU/6);
  }
}

export function characterTalentProgress(game){
  const s=game.characterState,t=game.talents;if(!s)return {value:0,max:1,label:'出征后激活',ready:false};
  if(game.character.id==='witch'){
    if(t.s_scholar2)return {value:s.xp,max:wellLimit(t),label:s.xp>=wellLimit(t)?'灵泉冷却 '+Math.max(0,s.nextWell-game.time).toFixed(1)+'s':'引星经验 '+s.xp+'/'+wellLimit(t),ready:s.xp>=wellLimit(t)&&s.nextWell<=game.time};
    const interval=starInterval(t);return {value:Math.min(interval,Math.max(0,interval-s.starClock)),max:interval,label:s.starClock<=0?'星火待敌':'星火齐射 '+s.starClock.toFixed(1)+'s',ready:s.starClock<=0};
  }
  const warden=game.character.id==='warden',max=warden?emberLimit(t):windLimit(t),left=Math.max(0,(warden?s.nextPulse:s.nextWind)-game.time),full=s.charge>=max;
  return {value:Math.min(max,s.charge),max,label:full?(left>0?'蓄满 · 冷却 '+left.toFixed(1)+'s':warden?'灯火待放':'蓄满 · 等待武器施放'):(warden?'近身命中蓄火':'移动蓄积猎风'),ready:full&&left===0};
}
export function characterTalentSummary(game){
  const t=game.talents,s=game.characterState;
  if(game.character.id==='warden')return emberLimit(t)+' 层触发 · 震荡 '+Math.round(emberDamage(game))+' 伤害 / '+(t.w_flame3?106:85)+' 范围 · 灯盾 '+(t.w_guard1?16:8)+' · 本局蓄满 '+s.procs+' 次';
  if(game.character.id==='witch')return starCount(t)+' 伴星 · 星火 '+Math.round(starDamage(game))+' 伤害 / '+starInterval(t)+' 秒 · '+(t.s_swarm2?2:1)+' 目标'+(t.s_scholar2?' · 灵泉 '+s.wells+' 次 / 引星回收 '+s.starXp:t.s_frost3?' · 冰爆 '+s.coldBursts+' 次':' · 本局齐射 '+s.procs+' 次');
  return windLimit(t)+' 距离蓄满 · 风矢 '+Math.round(windDamage(game))+' 伤害 ×'+(t.r_shot3?3:1)+' / '+windInterval(t)+' 秒 · 穿透 '+(t.r_shot2?3:2)+' 目标'+(t.r_sight2?' · 追猎 '+s.hunts+' 次':' · 本局疾射 '+s.procs+' 次');
}
export function characterTalentStatus(game){
  const s=game.characterState,t=game.talents;if(!s)return '';
  if(game.character.id==='warden')return '灯火 '+s.charge+'/'+emberLimit(t)+(s.nextPulse>game.time?' · 震荡 '+(s.nextPulse-game.time).toFixed(1)+'s':' · 震荡就绪')+(t.w_guard3?(s.revived?' · 灯芯已用':s.reviveReady?' · 灯芯已存':' · 灯芯待蓄'):'');
  if(game.character.id==='witch')return '伴星 ×'+starCount(t)+' · 星火 '+Math.round(starDamage(game))+' 伤害'+(t.s_scholar2?' · 引星 '+s.xp+'/'+wellLimit(t):'');
  return '猎风 '+Math.floor(s.charge)+'/'+windLimit(t)+(s.nextWind>game.time?' · 疾射 '+(s.nextWind-game.time).toFixed(1)+'s':s.charge>=windLimit(t)?' · 疾射待发':' · 移动蓄势');
}
export function drawCharacterTalents(game,g,ox,oy){
  const p=game.player;
  const progress=characterTalentProgress(game),color=CHARACTER_TALENTS[game.character.id].color;
  g.fillStyle='#0a161ddd';g.fillRect(Math.round(p.x+ox)-13,Math.round(p.y+oy)+10,26,4);g.fillStyle=progress.ready?'#f3ebc2':color;g.fillRect(Math.round(p.x+ox)-12,Math.round(p.y+oy)+11,24*progress.value/progress.max,2);
  if(game.characterState.reviveReady)diamond(g,p.x+ox,p.y+oy-33,3,'#e8b578');
  if(game.character.id==='witch')for(let i=0;i<starCount(game.talents);i++){const star=starPosition(game,i);glow(g,star.x+ox,star.y+oy,12,'#bfdcec33');diamond(g,star.x+ox,star.y+oy,4,'#bad7e7');diamond(g,star.x+ox,star.y+oy,2,'#f0f1d4')}
  if(game.character.id==='ranger'&&game.characterState.charge>=windLimit(game.talents)){g.strokeStyle='#d2deab99';g.beginPath();g.arc(p.x+ox,p.y+oy-8,14,-.5,.5);g.stroke()}
}
