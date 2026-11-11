import {TAU,diamond,pixelText} from './art.js';

export const EVENT_TYPES={
  vigil:{name:'守灯仪式',color:'#e7bf83',hint:'在灯圈内累计守护 12 秒；离圈暂停，援兵每 5 秒出现',reward:'护盾补至 12 · 余烬 +20'},
  hunt:{name:'猎影悬赏',color:'#dca08a',hint:'击败召来的精英守卫；援兵每 5 秒出现',reward:'已有装备强化一次（已满则经验 +24）· 余烬 +25'},
  souls:{name:'归魂引路',color:'#a6d9cf',hint:'绕祭坛收回 6 枚魂光；援兵每 5 秒出现',reward:'基础经验 +30 · 重铸 +1（最多 5）'},
};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

export function resetWorldEvents(game){
  const kinds=Object.keys(EVENT_TYPES);
  game.shrines=Array.from({length:8},(_,i)=>{const a=i*2.39996,r=330+Math.floor(i/2)*290,kind=kinds[i%kinds.length];return {kind,x:Math.cos(a)*r,y:Math.sin(a)*r,state:'idle',used:false,progress:0,goal:kind==='vigil'?12:kind==='hunt'?1:6}});
  game.activeEvent=null;game.eventsCompleted=0;game.eventsFailed=0;
}

export function nearestWorldEvent(game){
  if(game.activeEvent)return game.activeEvent;
  if(!game.player)return null;
  let nearest=null,best=Infinity;
  for(const s of game.shrines||[])if(s.state==='idle'){const d=distance(game.player,s);if(d<best){best=d;nearest=s}}
  return nearest;
}

function unavailable(game,s,preview=false){
  if((game.state!=='running'&&!(preview&&game.state==='paused'&&game.pauseReturn==='running'))||!game.player||game.player.hp<=0)return '仅可在战斗中开启';
  if(game.activeEvent)return '先完成当前事件';
  if(!s||s.state!=='idle')return '附近没有可用祭坛';
  if(game.time<45)return '开局 45 秒后开放';
  if(game.time>=540)return '最终决战将至，祭坛已关闭';
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
  const type=EVENT_TYPES[s.kind];game.banner(type.name+' · 已开启','45 秒内完成 · 敌群将增援',3);game.toast(type.hint+'。奖励：'+type.reward,5);game.on('hud');
  return true;
}

export function updateWorldEvents(game,dt){
  const s=game.activeEvent;if(!s||game.state!=='running'||game.player.hp<=0)return;
  const boss=game.enemies.some(e=>e.boss&&!e.dead);
  if(boss||game.time>=s.endsAt){
    s.state='failed';s.used=true;game.activeEvent=null;game.eventsFailed++;
    game.toast(boss?'首领打断了仪式 · 本次事件结束':'事件期限已到 · 本次未获奖励',3);game.on('hud');return;
  }
  if(s.kind==='vigil'&&distance(game.player,s)<=80)s.progress=Math.min(s.goal,s.progress+dt);
  if(s.kind==='hunt'&&s.guardian.dead)s.progress=1;
  if(s.kind==='souls')for(const mote of s.motes)if(!mote.collected&&distance(game.player,mote)<=16){mote.collected=true;s.progress++;game.burst(mote.x,mote.y-8,7,EVENT_TYPES.souls.color,35);game.sound.play('xp')}
  if(s.progress>=s.goal){
    s.state='complete';s.used=true;game.activeEvent=null;game.eventsCompleted++;
    if(s.kind==='vigil'){game.player.shield=Math.max(game.player.shield,12);game.gold+=20}
    if(s.kind==='hunt')game.openChest(25);
    if(s.kind==='souls'){game.gainXp(30);game.rerolls=Math.min(5,game.rerolls+1)}
    const type=EVENT_TYPES[s.kind];game.effects.push({type:'pulse',x:s.x,y:s.y-8,r:85,color:type.color,t:.8,max:.8});game.sound.play('chest');game.toast(type.name+'完成 · '+type.reward,4);game.on('hud');return;
  }
  if(game.time>=s.nextWave){
    s.nextWave=game.time+5;
    for(let i=0;i<3&&game.enemies.length<game.pressure.cap;i++)game.spawnEnemy(game.time<120?'skeleton':'ghoul',false,150+i*12);
  }
}

export function worldEventStatus(game){
  const s=nearestWorldEvent(game),empty={visible:false,name:'战场事件',detail:'',reward:'',progress:0,max:1,canStart:false,active:false};
  if(!s||!game.player||game.time>=540&&!game.activeEvent)return empty;
  const type=EVENT_TYPES[s.kind],active=s===game.activeEvent,d=Math.round(distance(game.player,s)),blocked=unavailable(game,s,true);
  const detail=active?(s.kind==='vigil'?(distance(game.player,s)<=80?'守护中':'返回灯圈继续守护')+' · '+s.progress.toFixed(1)+'/12 秒':s.kind==='hunt'?'击败精英守卫':'已回收 '+s.progress+'/6 魂光')+' · 剩余 '+Math.min(45,Math.max(0,Math.ceil(s.endsAt-game.time)))+' 秒':d>45?'距离 '+d+' · '+blocked:blocked||type.hint+' · 限时 45 秒';
  return {visible:true,name:type.name,detail,reward:type.reward,progress:s.progress,max:s.goal,canStart:!blocked,active};
}

export function drawWorldEvents(game,g,ox,oy){
  const nearest=nearestWorldEvent(game);
  const guardian=game.activeEvent?.kind==='hunt'?game.activeEvent.guardian:null;
  if(guardian&&!guardian.dead){g.save();g.globalAlpha=1;diamond(g,guardian.x+ox,guardian.y+oy-32,4,EVENT_TYPES.hunt.color);g.restore()}
  for(const s of game.shrines||[]){
    const x=s.x+ox,y=s.y+oy;if(x<-180||x>game.w+180||y<-180||y>game.h+180)continue;
    const type=EVENT_TYPES[s.kind],active=s===game.activeEvent;
    g.save();g.globalAlpha=s.used?.35:1;
    if(active&&s.kind==='vigil'){g.strokeStyle=type.color+'99';g.lineWidth=1;g.beginPath();g.arc(x,y,80,0,TAU);g.stroke();g.fillStyle=type.color+'0d';g.fill()}
    diamond(g,x,y-38,active?5:3,type.color);
    if(!s.used&&(active||s===nearest&&distance(game.player,s)<160))pixelText(g,type.name,x,y-49,type.color,8);
    if(active){
      g.fillStyle='#0c1918';g.fillRect(x-20,y+13,40,4);g.fillStyle=type.color;g.fillRect(x-19,y+14,38*s.progress/s.goal,2);
      if(s.kind==='souls')for(const mote of s.motes)if(!mote.collected){const mx=mote.x+ox,my=mote.y+oy;diamond(g,mx,my-7,5,type.color);diamond(g,mx,my-7,2,'#eef3d9')}
    }
    g.restore();
  }
}
