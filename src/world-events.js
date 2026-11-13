import {TAU,diamond,pixelText} from './art.js';
import {ALTAR_BOONS} from './content.js';

export const EVENT_TYPES={
  vigil:{name:'守灯仪式',color:'#e7bf83',hint:'在灯圈内累计守护 12 秒；离圈暂停，援兵每 5 秒出现',reward:'特殊奖励三选一 · 可跳过并随机强化武器'},
  hunt:{name:'猎影悬赏',color:'#dca08a',hint:'击败召来的精英守卫；援兵每 5 秒出现',reward:'特殊奖励三选一 · 可跳过并随机强化武器'},
  souls:{name:'归魂引路',color:'#a6d9cf',hint:'沿青白光柱回收 6 枚魂光，靠近自动收取；援兵每 5 秒出现',reward:'特殊奖励三选一 · 可跳过并随机强化武器'},
};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

export const ALTAR_TIMES=[60,240,420];
export const ALTAR_ORDER=['vigil','souls','hunt'];
export const ALTAR_REWARDS=[
  {xp:80,gold:40,heal:20,upgrades:1},
  {xp:160,gold:80,heal:30,upgrades:2},
  {xp:240,gold:120,heal:40,upgrades:3},
];
export function resetWorldEvents(game){
  game.shrines=[];game.nextShrine=0;
  game.activeEvent=null;game.eventReward=null;game.eventChoices=[];game.altarRewardIndex=null;game.boons=[];game.weaponEmpowerments={};game.eventsCompleted=0;game.eventsFailed=0;
}

export function nearestWorldEvent(game){
  if(game.activeEvent)return game.activeEvent;
  if(!game.player)return null;
  return (game.shrines||[]).find(s=>s.state==='idle')||null;
}

export function worldEventTarget(game){
  const s=nearestWorldEvent(game);if(!s||!game.player)return null;
  if(s===game.activeEvent&&s.kind==='hunt')return s.guardian?.dead?null:s.guardian;
  if(s===game.activeEvent&&s.kind==='souls')return s.motes.filter(m=>!m.collected).reduce((nearest,m)=>!nearest||distance(game.player,m)<distance(game.player,nearest)?m:nearest,null);
  return s;
}

function unavailable(game,s){
  if(game.state!=='running'||!game.player||game.player.hp<=0)return '仅可在战斗中开启';
  if(game.activeEvent)return '先完成当前事件';
  if(!s||s.state!=='idle')return '附近没有可用祭坛';
  if(game.enemies.some(e=>e.boss&&!e.dead)||game.time>=155&&game.time<180||game.time>=335&&game.time<360)return '首领来袭期间暂停开启';
  if(distance(game.player,s)>45)return '靠近祭坛至 45 距离内';
  if(s.kind==='hunt'&&game.enemies.length>=game.pressure.cap)return '先清理附近敌群，再召来守卫';
  return '';
}

export function startWorldEvent(game){
  const s=nearestWorldEvent(game);if(unavailable(game,s))return false;
  s.state='active';s.progress=0;s.endsAt=game.time+45;s.nextWave=game.time+5;game.activeEvent=s;
  if(s.kind==='hunt'){
    s.guardian=game.spawnEnemy('knight',true,145);s.guardian.eventGuardian=true;
  }
  if(s.kind==='souls')s.motes=Array.from({length:6},(_,i)=>{const a=i*TAU/6,r=110+(i%2)*50;return {x:s.x+Math.cos(a)*r,y:s.y+Math.sin(a)*r,collected:false}});
  game.banner({vigil:'守灯 · 留在灯圈内 12 秒',hunt:'猎影 · 击败标记守卫',souls:'归魂 · 回收 6 枚魂光'}[s.kind],'限时 45 秒 · '+EVENT_TYPES[s.kind].hint,3);game.on('hud');
  return true;
}

export function updateWorldEvents(game,dt){
  if(game.state!=='running'||game.player.hp<=0)return;
  if(game.eventReward&&game.time>=game.eventReward.expiresAt)game.eventReward=null;
  if(game.nextShrine<ALTAR_TIMES.length&&game.time>=ALTAR_TIMES[game.nextShrine]){
    const index=game.nextShrine++,kind=ALTAR_ORDER[index],angle=Math.random()*TAU,radius=180+Math.random()*80;
    game.shrines.push({kind,index,x:game.player.x+Math.cos(angle)*radius,y:game.player.y+Math.sin(angle)*radius,state:'idle',used:false,progress:0,goal:kind==='vigil'?12:kind==='hunt'?1:6});
    game.banner('祭坛显现 · '+(index+1)+' / 3',EVENT_TYPES[kind].name+' · 按顺序接取挑战',3);game.on('hud');
  }
  const s=game.activeEvent;if(!s)return;
  const boss=game.enemies.some(e=>e.boss&&!e.dead);
  if(boss||game.time>=s.endsAt){
    s.state='failed';s.used=true;game.activeEvent=null;game.eventsFailed++;
    game.toast(boss?'首领打断了仪式 · 本次事件结束':'事件期限已到 · 本次未获奖励',3);game.on('hud');return;
  }
  if(s.kind==='vigil'&&distance(game.player,s)<=80)s.progress=Math.min(s.goal,s.progress+dt);
  if(s.kind==='hunt'&&s.guardian.dead)s.progress=1;
  if(s.kind==='souls')for(const mote of s.motes)if(!mote.collected&&distance(game.player,mote)<=16){mote.collected=true;s.progress++;game.burst(mote.x,mote.y-8,7,EVENT_TYPES.souls.color,35);game.sound.play('xp');game.toast('魂光 '+s.progress+'/6 · 沿指引寻找下一枚',1.5)}
  if(s.progress>=s.goal){
    s.state='complete';s.used=true;game.activeEvent=null;game.eventsCompleted++;
    const pool=Object.keys(ALTAR_BOONS).filter(id=>!game.boons.includes(id));game.eventChoices=[];
    for(let i=0;i<3&&pool.length;i++)game.eventChoices.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
    game.state='reward';game.keys.clear();game.stick={x:0,y:0};
    const type=EVENT_TYPES[s.kind];game.eventReward=null;game.altarRewardIndex=s.index;
    game.effects.push({type:'pulse',x:s.x,y:s.y-8,r:85,color:type.color,t:.8,max:.8});game.sound.play('chest');game.on('altarReward',{name:type.name});game.on('hud');return;
  }
  if(game.time>=s.nextWave){
    s.nextWave=game.time+5;
    for(let i=0;i<3&&game.enemies.length<game.pressure.cap;i++)game.spawnEnemy(game.time<120?'skeleton':'ghoul',false,150+i*12);
  }
}

export function worldEventStatus(game){
  const s=nearestWorldEvent(game),empty={visible:false,name:'战场事件',detail:'',guide:'',reward:'特殊奖励三选一 · 可跳过并随机强化武器',progress:0,max:1,canStart:false,active:false};
  if(!s||!game.player||!game.activeEvent&&game.enemies.some(e=>e.boss&&!e.dead))return empty;
  const type=EVENT_TYPES[s.kind],active=s===game.activeEvent,d=Math.round(distance(game.player,s)),blocked=unavailable(game,s);
  const target=worldEventTarget(game),direction=target?['→','↘','↓','↙','←','↖','↑','↗'][(Math.round(Math.atan2(target.y-game.player.y,target.x-game.player.x)/TAU*8)+8)%8]+' '+Math.round(distance(game.player,target)):'';
  const detail=active?(s.kind==='vigil'?(distance(game.player,s)<=80?'守护中':'返回灯圈')+' · '+s.progress.toFixed(1)+'/12 秒':s.kind==='hunt'?'守卫 · '+direction:'魂光 '+s.progress+'/6 · 最近 '+direction)+' · 剩余 '+Math.min(45,Math.max(0,Math.ceil(s.endsAt-game.time)))+' 秒':d>45?'距离 '+d+' · 未接取将一直保留':blocked||type.hint+' · 限时 45 秒';
  const guide=active?{vigil:'留在金色灯圈内；离圈暂停进度',hunt:'追击红色「守卫」标记，击杀后完成',souls:'朝青白光柱移动，贴近自动回收'}[s.kind]:(blocked&&d<=45?blocked:'依序接取 · 未接取 '+game.shrines.filter(s=>s.state==='idle').length+' 座 · '+(d>45?type.hint:'接取后开始计时'));
  const reward=ALTAR_REWARDS[s.index];
  return {visible:true,name:(s.index+1)+' / 3 · '+type.name,detail,guide,reward:'经验 +'+reward.xp+' · 余烬 +'+reward.gold+' · 生命 +'+reward.heal+' · 契约或 '+reward.upgrades+' 次武器强化',progress:s.progress,max:s.goal,canStart:!blocked,active};
}

export function drawWorldEvents(game,g,ox,oy){
  const nearest=nearestWorldEvent(game),target=worldEventTarget(game);
  const guardian=game.activeEvent?.kind==='hunt'?game.activeEvent.guardian:null;
  if(guardian&&!guardian.dead){const x=guardian.x+ox,y=guardian.y+oy;g.save();g.globalAlpha=1;if(x>=55&&x<=game.w-55&&y>=50&&y<=game.h-50){g.fillStyle='#081710';g.fillRect(x-50,y-52,100,15);pixelText(g,'守卫 · '+Math.round(distance(game.player,guardian)),x,y-44,EVENT_TYPES.hunt.color,10)}diamond(g,x,y-29,7,EVENT_TYPES.hunt.color);diamond(g,x,y-29,3,'#fff3da');g.restore()}
  const souls=game.activeEvent?.kind==='souls'?game.activeEvent:null;
  if(souls){
    g.save();g.globalAlpha=1;
    if(target){g.strokeStyle='#0a201b';g.lineWidth=4;g.setLineDash([5,4]);g.beginPath();g.moveTo(game.player.x+ox,game.player.y+oy);g.lineTo(target.x+ox,target.y+oy);g.stroke();g.strokeStyle='#9cece1';g.lineWidth=1.5;g.stroke();g.setLineDash([])}
    for(const [index,mote] of souls.motes.entries())if(!mote.collected){
      const x=mote.x+ox,y=mote.y+oy,pulse=1+Math.sin(game.ambient*5+index)*.12;
      if(x<-35||x>game.w+35||y<-40||y>game.h+50)continue;
      g.fillStyle='#071d17';g.beginPath();g.ellipse(x,y,15*pulse,9*pulse,0,0,TAU);g.fill();g.strokeStyle=mote===target?'#fff4bd':'#9cece1';g.lineWidth=2;g.stroke();
      g.fillStyle='#8fe6dccc';g.fillRect(x-2,y-35,4,29);g.fillStyle='#f4ffe8';g.fillRect(x-1,y-32,2,24);diamond(g,x,y-10,9,'#071d17');diamond(g,x,y-10,6,'#9cece1');diamond(g,x,y-11,3,'#f4ffe8');
      if(x>=55&&x<=game.w-55&&y>=50&&y<=game.h-50){const label='魂光 '+(index+1)+(mote===target?' · '+Math.round(distance(game.player,mote)):''),half=mote===target?50:23;
        g.fillStyle='#071d17';g.fillRect(x-half,y-52,half*2,14);pixelText(g,label,x,y-45,'#d9fff1',10)}
    }
    g.restore();
  }
  for(const s of game.shrines||[]){
    const x=s.x+ox,y=s.y+oy;if(x<-180||x>game.w+180||y<-180||y>game.h+180)continue;
    const type=EVENT_TYPES[s.kind],active=s===game.activeEvent;
    g.save();g.globalAlpha=s.used?.35:1;
    if(active&&s.kind==='vigil'){g.beginPath();g.arc(x,y,80,0,TAU);g.strokeStyle='#071711';g.lineWidth=5;g.stroke();g.strokeStyle=type.color;g.lineWidth=2;g.stroke();g.fillStyle=type.color+'0d';g.fill()}
    diamond(g,x,y-38,active?5:3,type.color);
    if(!s.used&&(active||s===nearest)&&x>=64&&x<=game.w-64&&y>=62&&y<=game.h-50){g.fillStyle='#071711';g.fillRect(x-60,y-62,120,15);pixelText(g,(active?type.name:'祭坛')+' · '+Math.round(distance(game.player,s)),x,y-54,type.color,9)}
    if(active){
      g.fillStyle='#0c1918';g.fillRect(x-20,y+13,40,4);g.fillStyle=type.color;g.fillRect(x-19,y+14,38*s.progress/s.goal,2);
    }
    g.restore();
  }
}
