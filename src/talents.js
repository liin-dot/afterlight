import {WEAPON_FAMILIES} from './content.js';
import {TAU,diamond,glow} from './art.js';

export const TALENT_LEVELS=[10,20,30];
export const CHARACTER_TALENTS={
  smith:{name:'雷炉之心',color:'#e8b477',icon:'capacitor',style:'蓄电连锁 · 护甲与过载',
    description:'雷电或投射物武器直接命中积蓄电荷，每 0.25 秒最多一层；8 层向附近 3 个敌人放电。放电最短间隔 3 秒，伤害随等级成长。自带 1 点护甲。',
    loop:'雷电与弹道命中 → 电荷蓄满 → 连锁放电',hint:'持续命中为雷炉充能，让密集敌群成为放电目标。',families:['lightning','projectile'],items:['circuit','conductor','armor','stormcoil'],
    branches:[
      {name:'过载',role:'提前放电 → 强化电弧 → 连锁破甲',nodes:[
        {id:'f_arc1',name:'快充',icon:'capacitor',description:'放电需求由 8 层降至 6 层；放电间隔继承攻击速度。'},
        {id:'f_arc2',name:'熔弧',icon:'arcforge',description:'放电伤害 +40%，搜敌范围 +25%。'},
        {id:'f_arc3',name:'天炉',icon:'stormcoil',description:'放电目标由 3 增至 6，命中附加 20% 易伤，持续 3 秒。'},
      ]},
      {name:'钢心',role:'放电造盾 → 修补生命 → 护甲增幅',nodes:[
        {id:'f_guard1',name:'绝缘',icon:'aegis',description:'每次蓄满放电将护盾补至 10；每点护甲再增加 2，额外最多 12。'},
        {id:'f_guard2',name:'淬火',icon:'emberheart',description:'蓄满放电时恢复 3 点生命。'},
        {id:'f_guard3',name:'不熄炉',icon:'bulwark',description:'放电增加护甲 ×12 伤害；补充的护盾再增加 12。'},
      ]},
      {name:'行雷',role:'冲刺充能 → 移动放电 → 重置雷炉',nodes:[
        {id:'f_dash1',name:'踏电',icon:'speed',description:'冲刺增加 4 层电荷，蓄满可正常放电。'},
        {id:'f_dash2',name:'雷步',icon:'conductor',description:'冲刺额外释放一次 60% 伤害放电，不消耗电荷。'},
        {id:'f_dash3',name:'疾铸',icon:'sundial',description:'冲刺使蓄满放电立即就绪，并推进雷电、投射物武器剩余施放冷却 1 秒。'},
      ]},
    ]},
  mariner:{name:'归潮步履',color:'#94d9df',icon:'tide',style:'移动潮环 · 控场与续航',
    description:'每移动 90 距离释放一次潮环，伤害随等级成长，并减速 55% 持续 1.5 秒。潮环最短间隔 2 秒，可在冷却期间蓄满。自带冲刺冷却 −15%。',
    loop:'移动蓄潮 → 潮环减速 → 穿越缺口继续移动',hint:'用走位蓄起潮环，减速追兵后寻找下一处缺口。',families:['cold','area','spirit'],items:['brine','wake','speed','duration'],
    branches:[
      {name:'寒潮',role:'扩散潮环 → 强化浪涌 → 深寒冻结',nodes:[
        {id:'m_tide1',name:'涨潮',icon:'area',description:'潮环范围 +35%，并继承范围与持续时间属性。'},
        {id:'m_tide2',name:'怒涛',icon:'maelstrom',description:'潮环伤害 +50%，触发间隔继承攻击速度。'},
        {id:'m_tide3',name:'冰海',icon:'frostloom',description:'潮环冻结普通敌人 1 秒、首领 0.2 秒，普通冻结继承持续时间。'},
      ]},
      {name:'归港',role:'潮环护盾 → 生命回流 → 安全港湾',nodes:[
        {id:'m_guard1',name:'浮灯',icon:'lantern',description:'蓄满潮环时将护盾补至 8。'},
        {id:'m_guard2',name:'回流',icon:'regen',description:'蓄满潮环恢复 2 点生命，最短每 4 秒一次。'},
        {id:'m_guard3',name:'避风港',icon:'beacon',description:'潮环护盾提高至 18；潮环命中附加 15% 易伤，持续 3 秒。'},
      ]},
      {name:'远航',role:'缩短蓄潮 → 冲刺掀浪 → 加速返航',nodes:[
        {id:'m_dash1',name:'顺流',icon:'speed',description:'蓄潮需求由 90 距离降至 65。'},
        {id:'m_dash2',name:'破浪',icon:'wake',description:'冲刺起点立即释放 70% 伤害潮环，不消耗蓄潮、不补盾或回血。'},
        {id:'m_dash3',name:'千帆',icon:'tide',description:'冲刺充满蓄潮并结束潮环冷却；推进寒霜、灵魂武器剩余施放冷却 0.8 秒。'},
      ]},
    ]},
  warden:{name:'守灯誓约',color:'#e8b578',icon:'aegis',style:'近身作战 · 灯火与护盾',
    description:'出征自带 8 点护盾。85 范围内的武器直接命中积蓄灯火；每 6 层释放震荡并将护盾补至 8。每 0.35 秒积蓄一层，震荡最短间隔 6 秒；冷却期间蓄满会在冷却结束自动释放。',
    loop:'近身命中 → 积蓄灯火 → 震荡清场、补充灯盾',
    hint:'贴近敌人累积灯火，以护盾支撑近战。',families:['melee','fire'],items:['armor','aegis','thorns','siphon'],
    branches:[
      {name:'薪火',role:'灯火震荡 → 燃烧 → 范围回响',nodes:[
        {id:'w_flame1',name:'添薪',icon:'embercore',description:'灯火需求降至 5 层，震荡伤害 +40%。震荡继承星图卷轴的范围、时隙沙漏的攻速。'},
        {id:'w_flame2',name:'焚痕',icon:'cinder',description:'震荡点燃敌人 3 秒，可联动爆燃与腐时沙漏。近身火焰武器的持续命中也能蓄火，共用 0.35 秒间隔。'},
        {id:'w_flame3',name:'焚城',icon:'solar',description:'震荡范围 +35%，追加一次 70% 伤害回响。近战、火焰武器攻击燃烧目标伤害 +20%；回响不补盾或蓄火。'},
      ]},
      {name:'灯壁',role:'积满灯火 → 厚盾回复 → 留存灯芯',nodes:[
        {id:'w_guard1',name:'灯罩',icon:'aegis',description:'蓄满补至 16 灯盾，每点护甲再提高 1 点，上限 26。震荡范围与间隔继承范围、攻速道具。'},
        {id:'w_guard2',name:'余温',icon:'regen',description:'蓄满恢复 3 生命，持续恢复属性每秒 1 点再增加 3 点，上限 6。持盾时，近战与灵魂武器直接伤害 +20%。'},
        {id:'w_guard3',name:'灯火不灭',icon:'vitality',description:'震荡增加护甲×8伤害。蓄满储存灯芯；致命受击消耗它，恢复 35% 生命、补至 24 护盾并震荡，3 秒无敌。每局一次。'},
      ]},
      {name:'征途',role:'冲刺添火 → 破围震荡 → 加速蓄放',nodes:[
        {id:'w_dash1',name:'携灯',icon:'speed',description:'冲刺积蓄 3 层灯火，蓄满可正常补盾。震荡继承范围与攻速道具；夜行之靴让冲刺添火更频繁。'},
        {id:'w_dash2',name:'破围',icon:'bell',description:'冲刺起点释放 80% 伤害震荡，与踏火灰、霜行石一起封锁追兵；这次震荡不补盾、不恢复生命。'},
        {id:'w_dash3',name:'逐日',icon:'lance',description:'冲刺后 4 秒内近身命中蓄火翻倍，蓄满间隔降至 2.5 秒。每次冲刺推进近战、火焰武器剩余施放冷却 0.75 秒。'},
      ]},
    ]},
  witch:{name:'伴星契约',color:'#b7d9e8',icon:'orbit',style:'伴星召唤 · 控制与灵光',
    description:'自带一颗不占武器位的伴星，每 1.3 秒向 420 范围内的敌人发射追踪星火。星火伤害随角色等级成长，天赋可增加伴星、控制或灵光联动。',
    loop:'伴星发射 → 星火命中 → 火力、寒月或引星回收',
    hint:'让伴星负责追击，用环绕武器清理近敌。',families:['spirit','cold','summon'],items:['area','duration','growth','rime'],
    branches:[
      {name:'星群',role:'增加伴星 → 星火穿透 → 密集齐射',nodes:[
        {id:'s_swarm1',name:'双星',icon:'amount',description:'伴星增至 2 颗。星火继承时隙沙漏攻速，以及牧魂契的伤害和射速加成。'},
        {id:'s_swarm2',name:'星芒',icon:'prism',description:'星火伤害 +35%，穿透 2 个目标；星图卷轴扩大星火的命中半径。'},
        {id:'s_swarm3',name:'星海',icon:'glacier',description:'4 颗伴星，基础间隔 0.9 秒；双生银币每级再添 1 颗。灵魂或召唤武器施放追加星火，最短 0.5 秒。'},
      ]},
      {name:'寒月',role:'星火减速 → 易伤 → 冰爆冻结',nodes:[
        {id:'s_frost1',name:'月痕',icon:'frostbrand',description:'星火减速 55% 持续 1.8 秒，可触发碎冰与冰雷；继承长明烛持续时间和时隙沙漏攻速。'},
        {id:'s_frost2',name:'月蚀',icon:'deadeye',description:'星火施加 18% 易伤，持续 3 秒。武器直接命中寒冷敌人追加星火追击，共享间隔 0.8 秒，追加星火不递归触发。'},
        {id:'s_frost3',name:'永夜',icon:'absolute',description:'星火命中触发半径 100 冰爆，冻结普通敌人 1.2 秒、首领 0.25 秒；冷却 4 秒。范围、普通冻结与冷却分别继承对应道具。'},
      ]},
      {name:'引星',role:'星火标记 → 灵光归巢 → 反哺伴星',nodes:[
        {id:'s_scholar1',name:'引星',icon:'magnet',description:'星火、灵魂与召唤武器直接命中附加 4 秒引星标记。标记目标死亡后，经验结晶自动飞向你；星火继承攻速。'},
        {id:'s_scholar2',name:'灵泉',icon:'harvest',description:'回收引星经验累计 30，恢复 3 生命、补至 8 护盾；经验倍率也提高充能。最短 4 秒，最多储存一次充能。'},
        {id:'s_scholar3',name:'群星馈赠',icon:'requiem',description:'灵泉需求降至 20，护盾提高至 14；触发时发射 6 枚星火，并推进灵魂、召唤武器剩余施放冷却 0.8 秒。'},
      ]},
    ]},
  ranger:{name:'猎风步法',color:'#c9d69e',icon:'bolt',style:'移动蓄势 · 齐射与追猎',
    description:'移动 80 像素积满猎风，下一次武器主动施放追加一支穿透风矢，最短间隔 1.5 秒。停留超过 2 秒后蓄势衰减；风矢伤害随角色等级成长。',
    loop:'移动蓄满猎风 → 武器施放 → 追加穿透风矢',
    hint:'一边回收灵光一边蓄势，让移动转化为火力。',families:['projectile'],items:['speed','luck','focus','conductor'],
    branches:[
      {name:'穿风',role:'强化风矢 → 穿透敌群 → 追踪齐射',nodes:[
        {id:'r_shot1',name:'锐矢',icon:'bolt',description:'风矢伤害 +40%，继承时隙沙漏攻速。星图卷轴扩大风矢的命中半径与射程。'},
        {id:'r_shot2',name:'穿林',icon:'shard',description:'风矢穿透 3 个目标。投射物、光束武器直接命中补充 6 距离猎风蓄势，共享间隔 0.2 秒。'},
        {id:'r_shot3',name:'贯星',icon:'thunderbolt',description:'每轮发射 3 支追踪风矢；双生银币每级额外增加 1 支。武器齐射补充蓄势，再由下一次施放释放猎风。'},
      ]},
      {name:'游猎',role:'缩短蓄势 → 冲刺充满 → 移动连射',nodes:[
        {id:'r_roam1',name:'轻风',icon:'speed',description:'猎风需求降至 60 距离、间隔降至 1 秒并继承攻速。夜行之靴每级再减 4 距离，最低 40。'},
        {id:'r_roam2',name:'借风',icon:'aegis',description:'冲刺充满猎风并结束疾射冷却，下一次武器施放追加风矢；冲刺遗物与移速装备可同步发挥。'},
        {id:'r_roam3',name:'无踪',icon:'crescent',description:'冲刺后 3 秒内，移动时每 0.8 秒追加风矢并继承攻速。冲刺还推进投射物、光束武器剩余施放冷却 0.5 秒。'},
      ]},
      {name:'追猎',role:'风矢留痕 → 武器追击 → 风矢接力',nodes:[
        {id:'r_sight1',name:'风痕',icon:'deadeye',description:'风矢留下 4 秒风痕，武器直击与领域对其伤害 +18%。风矢发射间隔继承时隙沙漏攻速。'},
        {id:'r_sight2',name:'追猎',icon:'focus',description:'武器对同一风痕目标直接命中 3 次追加风矢，暴击计 2 次。共享间隔 1 秒并继承攻速；风矢不递归追猎。'},
        {id:'r_sight3',name:'绝息',icon:'execution',description:'风痕延长至 6 秒，追猎只需 2 次命中；风矢再次命中风痕目标时伤害 +80%，适合暴击与高频武器接力。'},
      ]},
    ]},
};

export const talentPoints=game=>TALENT_LEVELS.filter(level=>game.level>=level).length-Object.keys(game.talents||{}).length;
export function talentNodeState(game,id){
  const definition=CHARACTER_TALENTS[game.character.id];
  const branch=definition?.branches.find(b=>b.nodes.some(n=>n.id===id)),tier=branch?.nodes.findIndex(n=>n.id===id);
  if(!branch)return {available:false,reason:'其他角色的天赋'};
  const learned=!!game.talents?.[id],requiredLevel=TALENT_LEVELS[tier];
  const selected=definition.branches.find(b=>b.nodes.some(n=>game.talents?.[n.id])),exclusive=!!selected&&selected!==branch;
  const reason=learned?'已学会':exclusive?'本局已锁定「'+selected.name+'」路线':game.level<requiredLevel?'需要 LV. '+requiredLevel:tier>0&&!game.talents?.[branch.nodes[tier-1].id]?'先学习「'+branch.nodes[tier-1].name+'」':talentPoints(game)<=0?'需要 1 天赋点':!selected?'学习并锁定「'+branch.name+'」':'学习 · 1 天赋点';
  return {available:!learned&&!exclusive&&game.level>=requiredLevel&&(tier===0||!!game.talents?.[branch.nodes[tier-1].id])&&talentPoints(game)>0,learned,exclusive,reason,tier,node:branch.nodes[tier]};
}

export function resetCharacterTalents(game){
  game.talents={};
  game.characterState={charge:0,nextCharge:0,nextPulse:0,starClock:.5,nextStar:0,nextWind:0,nextQuiver:0,still:0,xp:0,nextWell:0,nextCold:0,nextHunt:0,ghostUntil:0,nextGhost:0,assaultUntil:0,reviveReady:false,revived:false,procs:0,wells:0,hunts:0,coldBursts:0,starXp:0,echoes:[]};
  if(game.character.id==='warden')game.player.shield=8;
}

const starCount=game=>game.talents.s_swarm3?4+Math.min(2,game.stats.amount):game.talents.s_swarm1?2:1;
const emberLimit=t=>t.w_flame1?5:6;
const windLimit=game=>game.talents.r_roam1?Math.max(40,60-(game.passives.speed||0)*4):80;
const windInterval=game=>(game.talents.r_roam1?1:1.5)*(Object.keys(game.talents).length?game.stats.haste:1);
const wellLimit=t=>t.s_scholar3?20:30;
const starInterval=game=>(game.talents.s_swarm3?.9:1.3)*(Object.keys(game.talents).length?game.stats.haste:1)*(game.talents.s_swarm1?game.stats.soulpact.interval:1);
const starDamage=game=>(10+game.level*.8)*game.stats.damageMultiplier*game.stats.summonMultiplier*(game.talents.s_swarm2?1.35:1)*(game.talents.s_swarm1?game.stats.soulpact.multiplier:1);
const windDamage=game=>(16+game.level)*game.stats.damageMultiplier*(game.talents.r_shot1?1.4:1);
const emberDamage=game=>((24+game.level*2)*(game.talents.w_flame1?1.4:1)+(game.talents.w_guard3?game.stats.armor*8:0))*game.stats.damageMultiplier;
const emberRadius=game=>(game.talents.w_flame3?115:85)*(Object.keys(game.talents).length?game.stats.areaMultiplier:1);
const nearby=(game,x,y,r)=>game.grid.near(x,y,r+30).filter(e=>!e.dead&&Math.hypot(e.x-x,e.y-y)<=r+e.r);
const forgeLimit=t=>t.f_arc1?6:8;
const tideLimit=t=>t.m_dash1?65:90;
const forgeDamage=game=>((20+game.level*1.5)*(game.talents.f_arc2?1.4:1)+(game.talents.f_guard3?game.stats.armor*12:0))*game.stats.damageMultiplier;
const tideDamage=game=>(18+game.level*1.2)*game.stats.damageMultiplier*(game.talents.m_tide2?1.5:1);
export function onCharacterLearn(game){
  const s=game.characterState,t=game.talents;
  s.charge=Math.min(s.charge,game.character.id==='smith'?forgeLimit(t):game.character.id==='mariner'?tideLimit(t):game.character.id==='warden'?emberLimit(t):windLimit(game));
  s.xp=Math.min(s.xp,wellLimit(t));
  s.nextWind=Math.min(s.nextWind,game.time+windInterval(game));s.starClock=Math.min(s.starClock,starInterval(game));
}
function starPosition(game,index){const angle=game.time*1.4+index*TAU/starCount(game);return {x:game.player.x+Math.cos(angle)*27,y:game.player.y-8+Math.sin(angle)*18}}

function fireStar(game,x,y,angle){
  game.projectiles.push({type:'soul',source:'talent',talent:'star',x,y,vx:Math.cos(angle)*190,vy:Math.sin(angle)*190,r:4*(game.talents.s_swarm2?game.stats.areaMultiplier:1),t:2.6,damage:starDamage(game),pierce:game.talents.s_swarm2?2:1,hit:new Set(),homing:true,trail:[]});
}
function fireWind(game,target){
  target=target&&!target.dead?target:game.closest(game.player.x,game.player.y,440);if(!target)return false;
  const t=game.talents,count=t.r_shot3?3+Math.min(2,game.stats.amount):1,angle=Math.atan2(target.y-game.player.y,target.x-game.player.x),area=t.r_shot1?game.stats.areaMultiplier:1;
  for(let i=0;i<count;i++){
    const a=angle+(i-(count-1)/2)*.15;
    game.projectiles.push({type:'bolt',source:'talent',talent:'wind',x:game.player.x,y:game.player.y-8,vx:Math.cos(a)*340*area,vy:Math.sin(a)*340*area,r:4*area,t:1.8,damage:windDamage(game),pierce:2+(t.r_shot2?1:0),hit:new Set(),homing:!!t.r_shot3,trail:[]});
  }
  game.characterState.procs++;return true;
}
function emberPulse(game,x,y,scale=1,echo=false){
  const t=game.talents,r=emberRadius(game),damage=emberDamage(game)*scale;
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
  s.charge=0;s.nextPulse=game.time+(s.assaultUntil>game.time?2.5:6)*(Object.keys(t).length?game.stats.haste:1);s.procs++;
  p.shield=Math.max(p.shield,t.w_guard1?16+Math.min(10,game.stats.armor):8);
  if(t.w_guard2)p.hp=Math.min(p.maxHp,p.hp+Math.min(6,3+game.stats.regeneration*3));
  if(t.w_guard3&&!s.revived&&!s.reviveReady){s.reviveReady=true;game.texts.push({x:p.x,y:p.y-35,text:'灯芯已存',t:1.2,max:1.2,color:'#e8b578'})}
  emberPulse(game,p.x,p.y);
}

function forgeDischarge(game,scale=1){
  const p=game.player,t=game.talents,targets=nearby(game,p.x,p.y,t.f_arc2?300:240).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)).slice(0,t.f_arc3?6:3);
  for(const e of targets){if(t.f_arc3)game.markEnemy(e,'forge',1.2,3);game.effects.push({type:'lightning',x:p.x,y:p.y-8,tx:e.x,ty:e.y-8,t:.28,max:.28,seed:game.time,lvl:2});game.hit(e,forgeDamage(game)*scale,p.x,p.y,25,false,'talent',true)}
  return targets.length>0;
}
function chargeForge(game,amount){
  const s=game.characterState,t=game.talents,p=game.player;s.charge=Math.min(forgeLimit(t),s.charge+amount);
  if(s.charge<forgeLimit(t)||game.time<s.nextPulse||!forgeDischarge(game))return;
  s.charge=0;s.nextPulse=game.time+3*(t.f_arc1?game.stats.haste:1);s.procs++;
  if(t.f_guard1)p.shield=Math.max(p.shield,10+Math.min(12,game.stats.armor*2)+(t.f_guard3?12:0));
  if(t.f_guard2)p.hp=Math.min(p.maxHp,p.hp+3);
}
function tidePulse(game,scale=1){
  const p=game.player,t=game.talents,r=65*(t.m_tide1?1.35*game.stats.areaMultiplier:1),duration=t.m_tide1?game.stats.durationMultiplier:1;
  game.effects.push({type:'pulse',x:p.x,y:p.y-8,r,color:'#94d9df',t:.6,max:.6});
  for(const e of nearby(game,p.x,p.y,r)){e.slow=Math.max(e.slow,1.5*duration);if(t.m_tide3)e.freeze=Math.max(e.freeze,e.boss?.2:duration);if(t.m_guard3)game.markEnemy(e,'harbor',1.15,3);game.hit(e,tideDamage(game)*scale,p.x,p.y,50,false,'talent',true)}
}
function chargeTide(game,moved){
  const s=game.characterState,t=game.talents,p=game.player;s.charge=Math.min(tideLimit(t),s.charge+moved);
  if(s.charge<tideLimit(t)||game.time<s.nextPulse)return;
  s.charge=0;s.nextPulse=game.time+2*(t.m_tide2?game.stats.haste:1);s.procs++;tidePulse(game);
  if(t.m_guard1)p.shield=Math.max(p.shield,t.m_guard3?18:8);
  if(t.m_guard2&&game.time>=s.nextWell){p.hp=Math.min(p.maxHp,p.hp+2);s.nextWell=game.time+4}
}

export function updateCharacterTalents(game,dt,moved){
  const s=game.characterState,t=game.talents,p=game.player;
  if(game.character.id==='warden'&&p.hp>0)chargeEmber(game,0);
  if(game.character.id==='smith'&&p.hp>0)chargeForge(game,0);
  if(game.character.id==='mariner'&&p.hp>0)chargeTide(game,moved);
  if(game.character.id==='witch'){
    if(t.s_scholar2)onCharacterXp(game,0);
    s.starClock-=dt;
    if(s.starClock<=0){const target=game.closest(p.x,p.y,420);if(target){for(let i=0;i<starCount(game);i++){const star=starPosition(game,i);fireStar(game,star.x,star.y,Math.atan2(target.y-8-star.y,target.x-star.x))}s.starClock=starInterval(game);s.procs++}}
  }
  if(game.character.id==='ranger'){
    if(moved>.05){s.charge=Math.min(windLimit(game),s.charge+moved);s.still=0}else{s.still+=dt;if(s.still>2)s.charge=Math.max(0,s.charge-dt*40)}
    if(moved>.05&&s.ghostUntil>game.time&&s.nextGhost<=game.time&&fireWind(game)){s.nextGhost=game.time+.8*game.stats.haste}
  }
  for(const echo of s.echoes)if(echo.at<=game.time)emberPulse(game,echo.x,echo.y,echo.scale,true);
  s.echoes=s.echoes.filter(e=>e.at>game.time);
}

export function onCharacterCast(game,kind){
  const s=game.characterState;
  if(game.character.id==='ranger'&&s.charge>=windLimit(game)&&s.nextWind<=game.time&&fireWind(game)){s.charge=0;s.nextWind=game.time+windInterval(game)}
  if(game.talents.s_swarm3&&(WEAPON_FAMILIES[kind]||[]).some(tag=>tag==='spirit'||tag==='summon')&&s.nextStar<=game.time){
    const target=game.closest(game.player.x,game.player.y,420);if(target){s.nextStar=game.time+.5;fireStar(game,game.player.x,game.player.y-8,Math.atan2(target.y-game.player.y,target.x-game.player.x))}
  }
}
export function characterHitMultiplier(game,e,source,periodic){
  const tags=WEAPON_FAMILIES[source];if(!tags)return 1;const t=game.talents;
  if(t.w_flame3&&e.burningUntil>game.time&&(tags.includes('melee')||tags.includes('fire')))return 1.2;
  if(t.w_guard2&&!periodic&&game.player.shield>0&&(tags.includes('melee')||tags.includes('spirit')))return 1.2;
  return t.r_sight1&&e.windMarkedUntil>game.time?1.18:1;
}
export function onCharacterHit(game,e,source,periodic,critical=false){
  const tags=WEAPON_FAMILIES[source];if(!tags)return;
  const s=game.characterState,t=game.talents,p=game.player;
  if(game.character.id==='warden'&&(!periodic||t.w_flame2&&tags.includes('fire'))&&Math.hypot(e.x-p.x,e.y-p.y)<=emberRadius(game)){
    const ready=game.time>=s.nextCharge;
    if(ready)s.nextCharge=game.time+.35;
    chargeEmber(game,ready?(s.assaultUntil>game.time?2:1):0);
  }
  if(periodic)return;
  if(game.character.id==='smith'&&(tags.includes('lightning')||tags.includes('projectile'))&&game.time>=s.nextCharge){s.nextCharge=game.time+.25;chargeForge(game,1)}
  if(t.s_scholar1&&(tags.includes('spirit')||tags.includes('summon')))e.starMarkedUntil=game.time+4;
  if(t.s_frost2&&(e.slow>0||e.freeze>0)&&e.hp>0&&!e.dead&&s.nextStar<=game.time){s.nextStar=game.time+.8;fireStar(game,p.x,p.y-8,Math.atan2(e.y-p.y,e.x-p.x))}
  if(t.r_shot2&&(tags.includes('projectile')||tags.includes('beam'))&&s.nextQuiver<=game.time){s.nextQuiver=game.time+.2;s.charge=Math.min(windLimit(game),s.charge+6)}
  if(t.r_sight2&&e.windMarkedUntil>game.time&&e.hp>0&&!e.dead){
    const hits=t.r_sight3?2:3;e.windHits=Math.min(hits,(e.windHits||0)+(critical?2:1));
    if(e.windHits>=hits&&game.time>=s.nextHunt){e.windHits=0;s.nextHunt=game.time+game.stats.haste;if(fireWind(game,e))s.hunts++}
  }
}
export function onCharacterProjectileHit(game,b,e){
  const t=game.talents,s=game.characterState;
  if(b.talent==='wind'){
    const marked=e.windMarkedUntil>game.time;
    if(t.r_sight1){if(!marked)e.windHits=0;e.windMarkedUntil=game.time+(t.r_sight3?6:4)}
    return marked&&t.r_sight3?1.8:1;
  }
  if(b.talent!=='star')return 1;
  if(t.s_scholar1)e.starMarkedUntil=game.time+4;
  if(t.s_frost1)e.slow=Math.max(e.slow,1.8*game.stats.durationMultiplier);
  if(t.s_frost2)game.markEnemy(e,'moon',1.18,3);
  if(t.s_frost3&&s.nextCold<=game.time){
    const r=100*game.stats.areaMultiplier;s.nextCold=game.time+4*game.stats.haste;s.coldBursts++;game.effects.push({type:'frost',x:e.x,y:e.y-8,r,t:.65,max:.65});
    for(const other of nearby(game,e.x,e.y,r)){other.freeze=Math.max(other.freeze,other.boss?.25:1.2*game.stats.durationMultiplier);game.hit(other,(40+game.level*1.5)*game.stats.damageMultiplier,e.x,e.y,40,false,'talent',true)}
  }
  return 1;
}
export function onCharacterDash(game){
  const t=game.talents,s=game.characterState,p=game.player;
  if(t.f_dash3)s.nextPulse=game.time;
  if(t.f_dash1)chargeForge(game,4);
  if(t.f_dash2)forgeDischarge(game,.6);
  if(t.m_dash2)tidePulse(game,.7);
  if(t.m_dash3){s.nextPulse=game.time;chargeTide(game,tideLimit(t))}
  for(const kind of Object.keys(game.weapons)){const tags=WEAPON_FAMILIES[kind]||[];if(t.f_dash3&&tags.some(tag=>tag==='lightning'||tag==='projectile')||t.m_dash3&&tags.some(tag=>tag==='cold'||tag==='spirit'))game.timers[kind]=Math.max(0,(game.timers[kind]||0)-(t.f_dash3?1:.8))}
  if(t.w_dash3){s.assaultUntil=game.time+4;s.nextPulse=Math.min(s.nextPulse,game.time+2.5*game.stats.haste)}
  if(t.w_dash1)chargeEmber(game,3);
  if(t.w_dash2)emberPulse(game,p.x,p.y,.8);
  if(t.r_roam2){s.charge=windLimit(game);s.nextWind=game.time}
  if(t.r_roam3){s.ghostUntil=game.time+3;s.nextGhost=game.time}
  for(const kind of Object.keys(game.weapons)){const tags=WEAPON_FAMILIES[kind];if(t.w_dash3&&(tags.includes('melee')||tags.includes('fire'))||t.r_roam3&&(tags.includes('projectile')||tags.includes('beam')))game.timers[kind]=Math.max(0,(game.timers[kind]||0)-(t.w_dash3?.75:.5))}
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
  if(starLinked)s.starXp+=amount*game.stats.xpMultiplier;
  if(!t.s_scholar2)return;s.xp=Math.min(wellLimit(t),s.xp+(starLinked?amount*game.stats.xpMultiplier:0));
  if(s.xp>=wellLimit(t)&&game.time>=s.nextWell){
    s.xp=0;s.nextWell=game.time+4;s.wells++;p.hp=Math.min(p.maxHp,p.hp+3);p.shield=Math.max(p.shield,t.s_scholar3?14:8);
    game.effects.push({type:'pulse',x:p.x,y:p.y-8,r:35,color:'#b7d9e8',t:.5,max:.5});game.texts.push({x:p.x,y:p.y-35,text:'灵泉',t:1,max:1,color:'#b7d9e8'});
    if(t.s_scholar3){for(let i=0;i<6;i++)fireStar(game,p.x,p.y-8,i*TAU/6);for(const kind of Object.keys(game.weapons))if(WEAPON_FAMILIES[kind].some(tag=>tag==='spirit'||tag==='summon'))game.timers[kind]=Math.max(0,(game.timers[kind]||0)-.8)}
  }
}

export function characterTalentProgress(game){
  const s=game.characterState,t=game.talents;if(!s)return {value:0,max:1,label:'出征后激活',ready:false};
  if(game.character.id==='smith'||game.character.id==='mariner'){
    const forge=game.character.id==='smith',max=forge?forgeLimit(t):tideLimit(t),left=Math.max(0,s.nextPulse-game.time);
    return {value:Math.min(max,s.charge),max,label:s.charge>=max?(left?'蓄满 · 冷却 '+left.toFixed(1)+'s':'蓄满 · 待发'):forge?'雷电与弹道命中蓄电':'移动积蓄归潮',ready:s.charge>=max&&!left};
  }
  if(game.character.id==='witch'){
    if(t.s_scholar2)return {value:s.xp,max:wellLimit(t),label:s.xp>=wellLimit(t)?'灵泉冷却 '+Math.max(0,s.nextWell-game.time).toFixed(1)+'s':'引星经验 '+Math.floor(s.xp)+'/'+wellLimit(t),ready:s.xp>=wellLimit(t)&&s.nextWell<=game.time};
    const interval=starInterval(game);return {value:Math.min(interval,Math.max(0,interval-s.starClock)),max:interval,label:s.starClock<=0?'星火待敌':'星火齐射 '+s.starClock.toFixed(1)+'s',ready:s.starClock<=0};
  }
  const warden=game.character.id==='warden',max=warden?emberLimit(t):windLimit(game),left=Math.max(0,(warden?s.nextPulse:s.nextWind)-game.time),full=s.charge>=max;
  return {value:Math.min(max,s.charge),max,label:full?(left>0?'蓄满 · 冷却 '+left.toFixed(1)+'s':warden?'灯火待放':'蓄满 · 等待武器施放'):(warden?'近身命中蓄火':'移动蓄积猎风'),ready:full&&left===0};
}
export function characterTalentSummary(game){
  const t=game.talents,s=game.characterState;
  if(game.character.id==='smith')return forgeLimit(t)+' 层电荷 · 放电 '+Math.round(forgeDamage(game))+' 伤害 ×'+(t.f_arc3?6:3)+' 目标 · 本局放电 '+s.procs+' 次';
  if(game.character.id==='mariner')return tideLimit(t)+' 距离蓄潮 · 潮环 '+Math.round(tideDamage(game))+' 伤害 · 本局归潮 '+s.procs+' 次';
  if(game.character.id==='warden')return emberLimit(t)+' 层触发 · 震荡 '+Math.round(emberDamage(game))+' 伤害 / '+Math.round(emberRadius(game))+' 范围 · 灯盾 '+(t.w_guard1?16+Math.min(10,game.stats.armor):8)+' · 本局蓄满 '+s.procs+' 次';
  if(game.character.id==='witch')return starCount(game)+' 伴星 · 星火 '+Math.round(starDamage(game))+' 伤害 / '+Number(starInterval(game).toFixed(2))+' 秒 · '+(t.s_swarm2?2:1)+' 目标'+(t.s_scholar2?' · 灵泉 '+s.wells+' 次 / 引星回收 '+Math.round(s.starXp):t.s_frost3?' · 冰爆 '+s.coldBursts+' 次':' · 本局齐射 '+s.procs+' 次');
  return windLimit(game)+' 距离蓄满 · 风矢 '+Math.round(windDamage(game))+' 伤害 ×'+(t.r_shot3?3+Math.min(2,game.stats.amount):1)+' / '+Number(windInterval(game).toFixed(2))+' 秒 · 穿透 '+(t.r_shot2?3:2)+' 目标'+(t.r_sight2?' · 追猎 '+s.hunts+' 次':' · 本局疾射 '+s.procs+' 次');
}
export function characterTalentStatus(game){
  const s=game.characterState,t=game.talents;if(!s)return '';
  if(game.character.id==='smith'||game.character.id==='mariner')return (game.character.id==='smith'?'电荷 ':'归潮 ')+Math.floor(s.charge)+'/'+(game.character.id==='smith'?forgeLimit(t):tideLimit(t))+(s.nextPulse>game.time?' · 冷却 '+(s.nextPulse-game.time).toFixed(1)+'s':' · 就绪');
  if(game.character.id==='warden')return '灯火 '+s.charge+'/'+emberLimit(t)+(s.nextPulse>game.time?' · 震荡 '+(s.nextPulse-game.time).toFixed(1)+'s':' · 震荡就绪')+(t.w_guard3?(s.revived?' · 灯芯已用':s.reviveReady?' · 灯芯已存':' · 灯芯待蓄'):'');
  if(game.character.id==='witch')return '伴星 ×'+starCount(game)+' · 星火 '+Math.round(starDamage(game))+' 伤害'+(t.s_scholar2?' · 引星 '+Math.floor(s.xp)+'/'+wellLimit(t):'');
  return '猎风 '+Math.floor(s.charge)+'/'+windLimit(game)+(s.nextWind>game.time?' · 疾射 '+(s.nextWind-game.time).toFixed(1)+'s':s.charge>=windLimit(game)?' · 疾射待发':' · 移动蓄势');
}
export function drawCharacterTalents(game,g,ox,oy){
  const p=game.player;
  const progress=characterTalentProgress(game),color=CHARACTER_TALENTS[game.character.id].color;
  g.fillStyle='#0a161ddd';g.fillRect(Math.round(p.x+ox)-13,Math.round(p.y+oy)+10,26,4);g.fillStyle=progress.ready?'#f3ebc2':color;g.fillRect(Math.round(p.x+ox)-12,Math.round(p.y+oy)+11,24*progress.value/progress.max,2);
  if(game.characterState.reviveReady)diamond(g,p.x+ox,p.y+oy-33,3,'#e8b578');
  if(game.character.id==='witch')for(let i=0;i<starCount(game);i++){const star=starPosition(game,i);glow(g,star.x+ox,star.y+oy,12,'#bfdcec33');diamond(g,star.x+ox,star.y+oy,4,'#bad7e7');diamond(g,star.x+ox,star.y+oy,2,'#f0f1d4')}
  if(game.character.id==='ranger'&&game.characterState.charge>=windLimit(game)){g.strokeStyle='#d2deab99';g.beginPath();g.arc(p.x+ox,p.y+oy-8,14,-.5,.5);g.stroke()}
}
