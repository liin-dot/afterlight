import {WEAPON_FAMILIES} from './content.js';
import {TAU,diamond,glow} from './art.js';

export const TALENT_LEVELS=[4,8,12,18,24,30];
export const CHARACTER_TALENTS={
  warden:{name:'守灯誓约',color:'#e8b578',icon:'aegis',style:'近身作战 · 灯火与护盾',
    description:'出征自带 8 点护盾。85 范围内的武器直接命中积蓄灯火；每 6 层释放震荡并将护盾补至 8。每 0.35 秒积蓄一层，震荡最短间隔 5 秒。',
    hint:'贴近敌人累积灯火，以护盾支撑近战。',families:['melee','fire'],items:['armor','aegis','thorns','siphon'],
    branches:[
      {name:'薪火',role:'扩大近战与震荡输出',nodes:[
        {id:'w_flame1',name:'赤刃',icon:'blade',description:'刃器类武器伤害 +15%；灯火震荡伤害 +30%。'},
        {id:'w_flame2',name:'焚痕',icon:'embercore',description:'灯火震荡点燃敌人 3 秒，每 0.5 秒造成随角色等级成长的灼烧伤害。'},
        {id:'w_flame3',name:'焚城',icon:'solar',description:'灯火震荡范围 +25%，0.45 秒后追加一次 70% 伤害的回响。回响不补盾、不积蓄灯火。'},
      ]},
      {name:'灯壁',role:'提高承伤与恢复能力',nodes:[
        {id:'w_guard1',name:'铁誓',icon:'armor',description:'护甲 +2；守灯誓约补充的护盾上限由 8 提高至 16。'},
        {id:'w_guard2',name:'余温',icon:'regen',description:'每次积满灯火释放震荡时，额外恢复 3 点生命。冲刺震荡与回响不触发恢复。'},
        {id:'w_guard3',name:'灯火不灭',icon:'vitality',description:'每局一次：受到致命伤害时，恢复 35% 最大生命，获得 3 秒无敌并补至 24 护盾。'},
      ]},
      {name:'征途',role:'以冲刺切入并打开包围',nodes:[
        {id:'w_dash1',name:'踏阵',icon:'speed',description:'冲刺冷却缩短 15%；冲刺时将护盾补至 8。'},
        {id:'w_dash2',name:'破围',icon:'bell',description:'冲刺起点释放一次 50% 伤害的灯火震荡。可继承已学会的焚痕与焚城，不补盾或恢复生命。'},
        {id:'w_dash3',name:'逐日',icon:'lance',description:'冲刺后 4 秒内，武器直接命中伤害 +35%。再次冲刺刷新持续时间，不叠加。'},
      ]},
    ]},
  witch:{name:'伴星契约',color:'#b7d9e8',icon:'orbit',style:'伴星召唤 · 控制与灵光',
    description:'自带一颗不占武器位的伴星，每 1.8 秒向附近敌人发射追踪星火。星火伤害随角色等级成长，天赋可增加伴星、控制或灵光联动。',
    hint:'让伴星负责追击，用环绕武器清理近敌。',families:['spirit','cold','summon'],items:['area','duration','growth','rime'],
    branches:[
      {name:'星群',role:'强化伴星持续输出',nodes:[
        {id:'s_swarm1',name:'双星',icon:'amount',description:'伴星数量由 1 提高至 2，每颗伴星独立发射一枚星火。'},
        {id:'s_swarm2',name:'星芒',icon:'prism',description:'星火伤害 +25%，每枚星火可以穿透并命中两个敌人。'},
        {id:'s_swarm3',name:'星海',icon:'glacier',description:'伴星数量提高至 4，发射间隔由 1.8 秒缩短至 1.4 秒。'},
      ]},
      {name:'寒月',role:'减速、易伤与冻结',nodes:[
        {id:'s_frost1',name:'月痕',icon:'frostbrand',description:'星火命中使敌人减速 55%，持续 1.4 秒。'},
        {id:'s_frost2',name:'月蚀',icon:'deadeye',description:'星火命中施加 3 秒易伤，目标受到伤害 +12%；与其他易伤取较高值。'},
        {id:'s_frost3',name:'永夜',icon:'absolute',description:'星火命中触发半径 85 的冰爆，冻结普通敌人 1.2 秒、首领 0.25 秒；共享冷却 6 秒。'},
      ]},
      {name:'灵知',role:'通过回收经验强化续航',nodes:[
        {id:'s_scholar1',name:'观星',icon:'growth',description:'经验加成 +8 个百分点，拾取范围额外 +20%。'},
        {id:'s_scholar2',name:'灵泉',icon:'harvest',description:'累计回收 60 基础经验，恢复 3 生命并将护盾补至 4；最短间隔 4 秒，最多储存一次充能。'},
        {id:'s_scholar3',name:'群星馈赠',icon:'requiem',description:'经验加成再加 12 个百分点；灵泉护盾提高至 14，并额外释放 6 枚星火。'},
      ]},
    ]},
  ranger:{name:'猎风步法',color:'#c9d69e',icon:'bolt',style:'移动蓄势 · 穿透与暴击',
    description:'移动 80 像素积满猎风，下一次武器主动施放追加一支穿透风矢，最短间隔 1.5 秒。停留超过 2 秒后蓄势衰减；风矢伤害随角色等级成长。',
    hint:'一边回收灵光一边蓄势，让移动转化为火力。',families:['projectile'],items:['speed','luck','focus','conductor'],
    branches:[
      {name:'穿风',role:'强化投射物与疾射',nodes:[
        {id:'r_shot1',name:'锐矢',icon:'bolt',description:'投射物类武器伤害 +12%；猎风风矢伤害 +25%。'},
        {id:'r_shot2',name:'破甲',icon:'shard',description:'可穿透的投射物武器穿透目标 +1，弹跳武器弹跳次数 +1；风矢穿透目标 +1。'},
        {id:'r_shot3',name:'贯星',icon:'thunderbolt',description:'每次猎风疾射改为同时发射 3 支追踪风矢。'},
      ]},
      {name:'游猎',role:'提高走位与冲刺收益',nodes:[
        {id:'r_roam1',name:'疾步',icon:'speed',description:'移动速度额外 +10%，冲刺冷却缩短 10%。'},
        {id:'r_roam2',name:'借风',icon:'aegis',description:'冲刺立即充满猎风，冲刺无敌时间增加 0.12 秒。'},
        {id:'r_roam3',name:'无踪',icon:'crescent',description:'冲刺后 3 秒内，每秒自动追加一支风矢，不消耗猎风蓄势；再次冲刺刷新持续时间。'},
      ]},
      {name:'鹰眼',role:'远距输出与暴击追击',nodes:[
        {id:'r_sight1',name:'猎眼',icon:'luck',description:'武器暴击率增加 8 个百分点。'},
        {id:'r_sight2',name:'远狩',icon:'focus',description:'武器直接命中 160 像素以外的目标时，伤害 +20%。'},
        {id:'r_sight3',name:'绝息',icon:'execution',description:'暴击伤害倍率 +0.5；武器暴击追加一支风矢，追击当前目标，最短间隔 1 秒。'},
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
  game.characterState={charge:0,nextCharge:0,nextPulse:0,starClock:.5,nextWind:0,still:0,xp:0,nextWell:0,nextCold:0,nextCritical:0,ghostUntil:0,nextGhost:0,assaultUntil:0,revived:false,procs:0,echoes:[]};
  if(game.character.id==='warden')game.player.shield=8;
}

const starCount=t=>t.s_swarm3?4:t.s_swarm1?2:1;
const starDamage=game=>(10+game.level*.8)*game.stats.damageMultiplier*(game.talents.s_swarm2?1.25:1);
const nearby=(game,x,y,r)=>game.grid.near(x,y,r+30).filter(e=>!e.dead&&Math.hypot(e.x-x,e.y-y)<=r+e.r);
function starPosition(game,index){const angle=game.time*1.4+index*TAU/starCount(game.talents);return {x:game.player.x+Math.cos(angle)*27,y:game.player.y-8+Math.sin(angle)*18}}

function fireStar(game,x,y,angle){
  game.projectiles.push({type:'soul',source:'talent',talent:'star',x,y,vx:Math.cos(angle)*190,vy:Math.sin(angle)*190,r:4,t:2.6,damage:starDamage(game),pierce:game.talents.s_swarm2?2:1,hit:new Set(),homing:true,trail:[]});
}
function fireWind(game,target){
  target=target&&!target.dead?target:game.closest(game.player.x,game.player.y,440);if(!target)return false;
  const t=game.talents,count=t.r_shot3?3:1,angle=Math.atan2(target.y-game.player.y,target.x-game.player.x);
  for(let i=0;i<count;i++){
    const a=angle+(i-(count-1)/2)*.15;
    game.projectiles.push({type:'bolt',source:'talent',talent:'wind',x:game.player.x,y:game.player.y-8,vx:Math.cos(a)*340,vy:Math.sin(a)*340,r:4,t:1.8,damage:(16+game.level)*game.stats.damageMultiplier*(t.r_shot1?1.25:1),pierce:2+(t.r_shot2?1:0),hit:new Set(),homing:!!t.r_shot3,trail:[]});
  }
  game.characterState.procs++;return true;
}
function emberPulse(game,x,y,scale=1,echo=false){
  const t=game.talents,r=t.w_flame3?106:85,damage=(24+game.level*2)*game.stats.damageMultiplier*(t.w_flame1?1.3:1)*scale;
  game.effects.push({type:'pulse',x,y:y-8,r,color:'#e8ae72',t:.55,max:.55});game.burst(x,y-8,12,'#e8ae72',85);
  for(const e of nearby(game,x,y,r)){
    if(t.w_flame2){e.burningUntil=Math.max(e.burningUntil||0,game.time+3);e.burn={damage:Math.max(e.burn?.damage||0,(6+game.level*.5)*game.stats.damageMultiplier),until:Math.max(e.burn?.until||0,game.time+3),next:e.burn?.next??game.time+.5}}
    game.hit(e,damage,x,y,70,false,'talent',true);
  }
  if(t.w_flame3&&!echo)game.characterState.echoes.push({x,y,scale:scale*.7,at:game.time+.45});
}

export function updateCharacterTalents(game,dt,moved){
  const s=game.characterState,t=game.talents,p=game.player;
  if(game.character.id==='witch'){
    if(t.s_scholar2)onCharacterXp(game,0);
    s.starClock-=dt;
    if(s.starClock<=0){const target=game.closest(p.x,p.y,360);if(target){for(let i=0;i<starCount(t);i++){const star=starPosition(game,i);fireStar(game,star.x,star.y,Math.atan2(target.y-8-star.y,target.x-star.x))}s.starClock=t.s_swarm3?1.4:1.8;s.procs++}}
  }
  if(game.character.id==='ranger'){
    if(moved>.05){s.charge=Math.min(80,s.charge+moved);s.still=0}else{s.still+=dt;if(s.still>2)s.charge=Math.max(0,s.charge-dt*40)}
    if(s.ghostUntil>game.time&&s.nextGhost<=game.time&&fireWind(game)){s.nextGhost=game.time+1}
  }
  for(const echo of s.echoes)if(echo.at<=game.time)emberPulse(game,echo.x,echo.y,echo.scale,true);
  s.echoes=s.echoes.filter(e=>e.at>game.time);
}

export function onCharacterCast(game){
  const s=game.characterState;
  if(game.character.id==='ranger'&&s.charge>=80&&s.nextWind<=game.time&&fireWind(game)){s.charge=0;s.nextWind=game.time+1.5}
}
export function characterHitMultiplier(game,e,source,periodic){
  if(periodic||!WEAPON_FAMILIES[source])return 1;
  const t=game.talents;
  return (t.w_dash3&&game.characterState.assaultUntil>game.time?1.35:1)*(t.r_sight2&&Math.hypot(e.x-game.player.x,e.y-game.player.y)>160?1.2:1);
}
export function onCharacterHit(game,e,source,critical,periodic){
  if(periodic||!WEAPON_FAMILIES[source])return;
  const s=game.characterState,t=game.talents,p=game.player;
  if(game.character.id==='warden'&&Math.hypot(e.x-p.x,e.y-p.y)<=85){
    if(game.time>=s.nextCharge){s.charge=Math.min(6,s.charge+1);s.nextCharge=game.time+.35}
    if(s.charge>=6&&game.time>=s.nextPulse){
      s.charge=0;s.nextPulse=game.time+5;s.procs++;p.shield=Math.max(p.shield,t.w_guard1?16:8);
      if(t.w_guard2)p.hp=Math.min(p.maxHp,p.hp+3);
      emberPulse(game,p.x,p.y);
    }
  }
  if(t.r_sight3&&critical&&game.time>=s.nextCritical){s.nextCritical=game.time+1;fireWind(game,e)}
}
export function onCharacterProjectileHit(game,b,e){
  if(b.talent!=='star')return;
  const t=game.talents,s=game.characterState;
  if(t.s_frost1)e.slow=Math.max(e.slow,1.4);
  if(t.s_frost2){e.markMultiplier=Math.max(e.markUntil>game.time?e.markMultiplier:1,1.12);e.markUntil=game.time+3}
  if(t.s_frost3&&s.nextCold<=game.time){
    s.nextCold=game.time+6;game.effects.push({type:'frost',x:e.x,y:e.y-8,r:85,t:.65,max:.65});
    for(const other of nearby(game,e.x,e.y,85)){other.freeze=Math.max(other.freeze,other.boss?.25:1.2);game.hit(other,(30+game.level)*game.stats.damageMultiplier,e.x,e.y,40,false,'talent',true)}
  }
}
export function onCharacterDash(game){
  const t=game.talents,s=game.characterState,p=game.player;
  if(t.w_dash1)p.shield=Math.max(p.shield,8);
  if(t.w_dash2)emberPulse(game,p.x,p.y,.5);
  if(t.w_dash3)s.assaultUntil=game.time+4;
  if(t.r_roam2)s.charge=80;
  if(t.r_roam3){s.ghostUntil=game.time+3;s.nextGhost=game.time}
}
export function onCharacterHurt(game){
  const p=game.player,s=game.characterState;
  if(p.hp<=0&&game.talents.w_guard3&&!s.revived){
    s.revived=true;p.hp=p.maxHp*.35;p.shield=Math.max(p.shield,24);p.invincible=3;
    game.effects.push({type:'pulse',x:p.x,y:p.y-8,r:140,color:'#ffe2a8',t:1,max:1});game.banner('灯火不灭 · 誓约重燃','本局保命已触发 · 3 秒无敌',3);
  }
}
export function onCharacterXp(game,amount){
  const t=game.talents,s=game.characterState,p=game.player;
  if(!t.s_scholar2)return;s.xp=Math.min(60,s.xp+amount);
  if(s.xp>=60&&game.time>=s.nextWell){
    s.xp=0;s.nextWell=game.time+4;p.hp=Math.min(p.maxHp,p.hp+3);p.shield=Math.max(p.shield,t.s_scholar3?14:4);
    if(t.s_scholar3)for(let i=0;i<6;i++)fireStar(game,p.x,p.y-8,i*TAU/6);
  }
}

export function characterTalentStatus(game){
  const s=game.characterState;if(!s)return '';
  if(game.character.id==='warden')return '灯火 '+s.charge+'/6'+(s.nextPulse>game.time?' · 震荡 '+(s.nextPulse-game.time).toFixed(1)+'s':' · 震荡就绪')+(game.talents.w_guard3?(s.revived?' · 重燃已用':' · 重燃待命'):'');
  if(game.character.id==='witch')return '伴星 ×'+starCount(game.talents)+' · 星火 '+Math.round(starDamage(game))+' 伤害'+(game.talents.s_scholar2?' · 灵泉 '+s.xp+'/60':'');
  return '猎风 '+Math.floor(s.charge)+'/80'+(s.charge>=80?' · 疾射待发':' · 移动蓄势');
}
export function drawCharacterTalents(game,g,ox,oy){
  const p=game.player;
  if(game.character.id==='witch')for(let i=0;i<starCount(game.talents);i++){const star=starPosition(game,i);glow(g,star.x+ox,star.y+oy,12,'#bfdcec33');diamond(g,star.x+ox,star.y+oy,4,'#bad7e7');diamond(g,star.x+ox,star.y+oy,2,'#f0f1d4')}
  if(game.character.id==='ranger'&&game.characterState.charge>=80){g.strokeStyle='#d2deab99';g.beginPath();g.arc(p.x+ox,p.y+oy-8,14,-.5,.5);g.stroke()}
}
