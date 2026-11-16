import {WEAPON_FAMILIES} from './content.js';
import {weaponStats} from './stats.js';

export const CORE_LEVELS=[5,15,25];
export const RUN_CORES={
  edge:{name:'破空余波',icon:'lance',color:'#e4bf8c',tags:['melee','projectile'],families:['melee'],style:'近战延伸',
    description:v=>`近战施放时追加 ${v.count} 道直行余波，每道造成武器伤害的 ${v.ratio*100}%，穿透 ${v.pierce} 个目标；间隔至少 0.8 秒。`},
  prism:{name:'追猎折光',icon:'shard',color:'#cab9ef',tags:['projectile'],families:['projectile','beam'],style:'弹道追击',
    description:v=>`远程直接命中后，向其他敌人折射 ${v.count} 枚追踪棱片，每枚造成该次伤害的 ${Math.round(v.ratio*100)}%；间隔 1 秒。`},
  garden:{name:'灰烬花园',icon:'cinder',color:'#e8ab7a',tags:['fire','area'],style:'击杀铺场',
    description:v=>`直接命中的目标在 4 秒内死亡生成半径 ${v.radius} 的火场，持续 ${v.duration} 秒，每半秒 ${v.damage} 伤害；最多 6 处，生成间隔 0.45 秒。`},
  stride:{name:'踏霜回击',icon:'hoarfrost',color:'#b2dfe8',tags:['mobility','cold','control'],style:'移动蓄力',
    description:v=>`移动 240 距离蓄霜，下次直接命中冻结目标周围 ${v.radius} 范围 ${v.freeze} 秒（首领 0.15 秒），造成 ${v.damage} 伤害。`},
  ward:{name:'灯盾反冲',icon:'bulwark',color:'#d2d7b0',tags:['guard','area'],style:'护盾反击',
    description:v=>`每 8 秒护盾补至 ${v.shield}；受击吸收护盾时释放半径 ${v.radius} 的反冲，每吸收 1 点造成 ${v.ratio} 伤害，间隔 2 秒。`},
  harvest:{name:'拾光蓄炮',icon:'harvest',color:'#bdd396',tags:['growth','projectile'],style:'经验蓄炮',
    description:v=>`拾取累计 20 点基础经验蓄满一炮，下次直接命中向目标贯穿 ${v.range} 距离，造成 ${v.damage} 伤害；最多储存 3 炮，间隔 1 秒。`},
  weave:{name:'交错回响',icon:'echo',color:'#afd7cf',tags:['spirit','summon'],style:'多武器轮转',
    description:v=>`连续施放中，每切换一次武器积累一层，3 层释放 ${v.count} 枚追踪魂矢，每枚 ${v.damage} 伤害；间隔 1.5 秒。`},
  focus:{name:'静定棱镜',icon:'prism',color:'#d9c28c',tags:['projectile','guard'],style:'驻足狙击',
    description:v=>`站定蓄力 1.5 秒后，下次直接命中追加 ${v.range} 距离的贯穿光束，造成 ${v.damage} 伤害；移动清空蓄力，间隔 2.5 秒。`},
};

export function coreValues(key,rank,game){
  const power=(18+(game.level||1)*1.8)*(game.stats?.damageMultiplier||1);
  switch(key){
    case 'edge':return {count:rank===3?2:1,ratio:rank===1?.5:.7,pierce:rank+1};
    case 'prism':return {count:rank===3?2:1,ratio:rank===1?.35:.5};
    case 'garden':return {radius:36+rank*8,duration:2+rank*.5,damage:Math.round(power*(.3+rank*.1))};
    case 'stride':return {radius:50+rank*15,freeze:Number((.5+rank*.3).toFixed(1)),damage:Math.round(power*(1+rank*.25))};
    case 'ward':return {shield:4+rank*4,radius:85+rank*15,ratio:3+rank};
    case 'harvest':return {range:220+rank*40,damage:Math.round(power*(1.5+rank*.5))};
    case 'weave':return {count:rank+1,damage:Math.round(power*.7)};
    case 'focus':return {range:260+rank*50,damage:Math.round(power*(1.5+rank*.5))};
  }
}
export const coreDescription=(key,rank,game)=>RUN_CORES[key].description(coreValues(key,rank,game));
export function coreProgress(game,key){
  const s=game.coreState;
  if(!coreReady(game,key))return '待联动';
  if(key==='stride')return s.frostReady?'就绪':Math.floor((s.travel||0)/240*100)+'%';
  if(key==='harvest')return s.xp>=20?Math.floor(s.xp/20)+'炮':Math.floor(s.xp)+'/20';
  if(key==='weave')return (s.switches||0)+'/3';
  if(key==='focus')return (s.focusNext||0)>game.time?((s.focusNext||0)-game.time).toFixed(1)+'s':s.still>=1.5?'就绪':(s.still||0).toFixed(1)+'s';
  return ['','Ⅰ','Ⅱ','Ⅲ'][game.cores[key]];
}
export function coreReady(game,key){
  const families=RUN_CORES[key].families;
  return families?Object.keys(game.weapons).some(id=>families.some(tag=>(WEAPON_FAMILIES[id]||[]).includes(tag))):key!=='weave'||Object.keys(game.weapons).length>=2;
}
export function coreChoice(game,key){
  const current=game.cores[key]||0,info=RUN_CORES[key];
  return {key,core:true,current,next:current+1,name:info.name,color:info.color,description:coreDescription(key,current+1,game),reason:current?'深化已有核心 · 本次效果替换旧阶':'本局生效 · 不占装备位'};
}
export function rollCoreChoices(game,previous=[]){
  const pool=Object.keys(RUN_CORES).filter(key=>(game.cores[key]||0)<3&&coreReady(game,key)),picked=[];
  const take=keys=>{const fresh=keys.filter(key=>!previous.includes(key)),available=fresh.length?fresh:keys;if(!available.length)return;const key=available[Math.floor(Math.random()*available.length)];picked.push(key);pool.splice(pool.indexOf(key),1)};
  take(pool.filter(key=>game.cores[key]));
  // ponytail: at most eight cores and four draws; use an indexed sampler if the catalogue grows into thousands.
  while(picked.length<4&&pool.length)take(pool);
  // The deepening option should not always occupy the first keyboard shortcut.
  for(let i=picked.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[picked[i],picked[j]]=[picked[j],picked[i]]}
  return picked.map(key=>coreChoice(game,key));
}
export function learnCore(game,item){
  if(!game.coreDraft||!RUN_CORES[item.key]||!Number.isInteger(item.next)||item.next!==(game.cores[item.key]||0)+1||item.next>3||!coreReady(game,item.key))return false;
  game.cores[item.key]=item.next;
  if(item.key==='ward'){game.player.shield=Math.max(game.player.shield,coreValues('ward',item.next,game).shield);game.coreState.shieldNext=game.time+8}
  game.toast(item.name+' · '+['','Ⅰ','Ⅱ','Ⅲ'][item.next]+'阶 · '+RUN_CORES[item.key].style,4);
  return true;
}

function proc(game,key,interval){
  const state=game.coreState;
  if((state[key+'Next']||0)>game.time)return false;
  state[key+'Next']=game.time+interval;state.procs[key]=(state.procs[key]||0)+1;return true;
}
function coreShot(game,key,x,y,angle,damage,pierce=1,homing=true,exclude=[]){
  game.projectiles.push({type:key==='prism'?'refraction':'soul',source:'core_'+key,color:RUN_CORES[key].color,core:true,x,y:y-9,vx:Math.cos(angle)*280,vy:Math.sin(angle)*280,r:4,damage,pierce,t:1.6,hit:new Set(exclude),homing,trail:[],angle});
}
function coreBeam(game,key,target,v){
  const p=game.player,a=Math.atan2(target.y-p.y,target.x-p.x),dx=Math.cos(a),dy=Math.sin(a);
  game.effects.push({type:'beam',x:p.x,y:p.y-9,tx:p.x+dx*v.range,ty:p.y+dy*v.range-9,width:7,color:RUN_CORES[key].color,t:.35,max:.35});
  for(const e of game.grid.near(p.x+dx*v.range/2,p.y+dy*v.range/2,v.range/2+35)){
    const along=Math.max(0,Math.min(v.range,(e.x-p.x)*dx+(e.y-p.y)*dy));
    if(Math.hypot(e.x-p.x-dx*along,e.y-p.y-dy*along)<e.r+7)game.hit(e,v.damage,p.x,p.y,35,false,'core_'+key,true);
  }
}

export function onCoreHit(game,e,kind,periodic,damage){
  const tags=WEAPON_FAMILIES[kind];if(periodic||!tags||game.player.hp<=0)return;
  const c=game.cores,s=game.coreState,p=game.player;
  if(c.prism&&tags.some(tag=>tag==='projectile'||tag==='beam')&&game.closest(e.x,e.y,220,new Set([e.id]))&&proc(game,'prism',1)){
    const v=coreValues('prism',c.prism,game),excluded=new Set([e.id]);
    for(let i=0;i<v.count;i++){const other=game.closest(e.x,e.y,220,excluded);if(!other)break;excluded.add(other.id);coreShot(game,'prism',e.x,e.y,Math.atan2(other.y-e.y,other.x-e.x),damage*v.ratio,1,true,[e.id])}
  }
  if(c.stride&&s.frostReady){
    s.frostReady=false;proc(game,'stride',0);const v=coreValues('stride',c.stride,game);
    game.effects.push({type:'frost',x:e.x,y:e.y-8,r:v.radius,t:.65,max:.65});
    for(const other of game.grid.near(e.x,e.y,v.radius+30))if(!other.dead&&Math.hypot(other.x-e.x,other.y-e.y)<v.radius+other.r){other.freeze=Math.max(other.freeze,other.boss?.15:v.freeze);other.slow=Math.max(other.slow,2);game.hit(other,v.damage,e.x,e.y,25,false,'core_stride',true)}
  }
  if(c.harvest&&s.xp>=20&&proc(game,'harvest',1)){s.xp-=20;coreBeam(game,'harvest',e,coreValues('harvest',c.harvest,game))}
  if(c.focus&&s.still>=1.5&&proc(game,'focus',2.5)){s.still=0;coreBeam(game,'focus',e,coreValues('focus',c.focus,game))}
}
export function onCoreCast(game,kind){
  if(!WEAPON_FAMILIES[kind]||game.player.hp<=0)return;
  const c=game.cores,s=game.coreState,p=game.player;
  if(c.edge&&WEAPON_FAMILIES[kind].includes('melee')&&proc(game,'edge',.8)){
    const v=coreValues('edge',c.edge,game),target=game.closest(p.x,p.y,350),angle=target?Math.atan2(target.y-p.y,target.x-p.x):Math.atan2(p.lastY,p.lastX),damage=weaponStats(kind,game.weapons[kind],game.stats,game.character).damage*v.ratio;
    for(let i=0;i<v.count;i++)coreShot(game,'edge',p.x,p.y,angle+(i-(v.count-1)/2)*.22,damage,v.pierce,false);
  }
  if(c.weave){
    if(s.lastCast&&s.lastCast!==kind)s.switches=Math.min(3,(s.switches||0)+1);s.lastCast=kind;
    const target=game.closest(p.x,p.y,350);
    if(s.switches>=3&&target&&proc(game,'weave',1.5)){
      s.switches=0;const v=coreValues('weave',c.weave,game),angle=Math.atan2(target.y-p.y,target.x-p.x);
      for(let i=0;i<v.count;i++)coreShot(game,'weave',p.x,p.y,angle+(i-(v.count-1)/2)*.35,v.damage);
    }
  }
}
export function onCoreKill(game,e){
  if(!game.cores.garden||!e.coreGardenUntil||e.coreGardenUntil<game.time||game.player.hp<=0||!proc(game,'garden',.45))return;
  const v=coreValues('garden',game.cores.garden,game),fields=game.zones.filter(z=>z.source==='core_garden'&&z.t>0);
  if(fields.length>=6)fields[0].t=0;
  game.zones.push({kind:'relicFire',source:'core_garden',core:true,x:e.x,y:e.y,r:v.radius,t:v.duration,max:v.duration,tick:0,damage:v.damage,seed:game.time});
}
export function onCoreHurt(game,absorbed){
  if(!game.cores.ward||absorbed<=0||game.player.hp<=0||!proc(game,'ward',2))return;
  const v=coreValues('ward',game.cores.ward,game),p=game.player;
  game.effects.push({type:'pulse',x:p.x,y:p.y-8,r:v.radius,color:RUN_CORES.ward.color,t:.45,max:.45});
  for(const e of game.grid.near(p.x,p.y,v.radius+30))if(!e.dead&&Math.hypot(e.x-p.x,e.y-p.y)<v.radius+e.r)game.hit(e,absorbed*v.ratio,p.x,p.y,100,false,'core_ward',true);
}
export function updateCores(game,dt,moved){
  if(game.player.hp<=0)return;const s=game.coreState;
  if(game.cores.focus)s.still=moved>0?0:Math.min(1.5,(s.still||0)+dt);
  if(game.cores.stride&&!s.frostReady){s.travel=(s.travel||0)+moved;if(s.travel>=240){s.travel=0;s.frostReady=true}}
  if(game.cores.ward&&(s.shieldNext||0)<=game.time){s.shieldNext=game.time+8;game.player.shield=Math.max(game.player.shield,coreValues('ward',game.cores.ward,game).shield)}
}
