import {TAU,hash,diamond} from './art.js';
import {artAvailable} from './assets.js';

export const STAGES={
  graveyard:{name:'遗忘墓园',subtitle:'第一章 · 最后一盏灯',color:'#bdd397',hint:'十五分钟守夜，躲避首领冲锋与落点。',reward:250,bosses:['墓园看守','无名葬钟','长夜执刑者','蚀月君王'],bossKinds:['knight','knight','reaper','reaper']},
  foundry:{name:'焚星熔炉',subtitle:'第二章 · 熄灭天火',color:'#eda376',hint:'绕过铁卫正面，避开自爆；首领落点以橙色圆圈预警。',reward:350,hp:1.08,wave:'cinderling',bosses:['炉心监工','熔铁巨像','焚星铁卫','焚城铸王'],bossKinds:['bomber','bulwark','bulwark','oracle'],
    rosters:[{cinderling:60,skeleton:30,bat:10},{cinderling:45,bomber:25,ghoul:30},{bulwark:25,cinderling:35,bomber:25,ghost:15},{bulwark:30,oracle:15,bomber:30,cinderling:25},{oracle:20,bulwark:35,bomber:20,reaper:25},{bulwark:30,oracle:25,reaper:25,cinderling:20}]},
  coast:{name:'沉钟海岸',subtitle:'第三章 · 逆潮归航',color:'#91d7e0',hint:'避开歌妖远射与裂潮兽突进；首领潮汐留有青色缺口。',reward:400,hp:1.12,wave:'leech',bosses:['沉钟歌者','裂潮之牙','深潮祭司','无潮女王'],bossKinds:['siren','leech','oracle','siren'],
    rosters:[{leech:35,skeleton:50,bat:15},{leech:35,siren:20,ghoul:30,ghost:15},{siren:25,leech:35,bulwark:15,ghost:25},{siren:25,oracle:15,leech:35,knight:25},{oracle:20,siren:25,leech:35,reaper:20},{oracle:20,siren:30,reaper:25,leech:25}]},
};

// Returns a movement multiplier; attack clocks use simulation time and freeze with the game.
export function expeditionEnemy(game,e,dt,d,dx,dy){
  const p=game.player;
  if(e.boss&&game.stage!=='graveyard'){
    if(e.hp/e.maxHp<.5&&!e.enraged){e.enraged=true;e.speed*=1.28;game.banner(e.name+' · 狂怒','攻势加快 · 寻找安全缺口',2.5)}
    if(e.attack<=0){
      if(game.stage==='foundry'){
        for(let i=0;i<(e.final?7:4);i++){const a=i*TAU/(e.final?7:4),r=i?85:0;game.hazards.push({type:'blast',x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r,r:27,t:1.5+i*.12,max:1.5+i*.12,damage:e.damage*.7,color:'#edaa6d'})}
      }else{
        game.hazards.push({type:'tide',x:p.x,y:p.y,r:280,gap:p.x+(Math.random()-.5)*120,t:1.8,max:1.8,damage:e.damage*.7,color:'#9bd9e3'});
        const count=e.final?12:8,gap=Math.floor(Math.random()*count);
        for(let i=0;i<count;i++)if(i!==gap&&i!==(gap+1)%count)shot(game,e,i*TAU/count,55,e.damage*.45);
      }
      e.attack=(e.final?4.2:5.5)*(e.enraged?.8:1);
    }
    return .85;
  }
  if(e.kind==='bulwark'){
    const angle=Math.atan2(dy,dx);e.guardAngle??=angle;const delta=Math.atan2(Math.sin(angle-e.guardAngle),Math.cos(angle-e.guardAngle));e.guardAngle+=Math.max(-dt*.8,Math.min(dt*.8,delta));e.flip=Math.cos(e.guardAngle)<0;
  }
  if(e.kind==='bomber'){
    if(e.fuse>0){e.fuse-=dt;if(e.fuse<=0){game.effects.push({type:'enemyBlast',x:e.x,y:e.y,r:50,t:.5,max:.5});if(d<50+p.r)game.hurt(e.damage*1.3,e.x,e.y);game.kill(e)}return 0}
    if(d<70){e.fuse=1.35;game.hazards.push({type:'blast',x:e.x,y:e.y,r:50,t:1.35,max:1.35,visualOnly:true,enemy:e,color:'#edaa6d'});return 0}
  }
  if(e.kind==='leech'){
    if(e.lungeTime>0){e.lungeTime-=dt;e.x+=e.lungeX*150*dt;e.y+=e.lungeY*150*dt;return 0}
    if(e.lungeWindup>0){e.lungeWindup-=dt;if(e.lungeWindup<=0)e.lungeTime=.45;return 0}
    if(e.attack<=0&&d>45&&d<190){e.attack=5;e.lungeWindup=1;e.lungeX=dx/d;e.lungeY=dy/d;game.hazards.push({type:'line',x:e.x,y:e.y,tx:e.x+dx/d*90,ty:e.y+dy/d*90,t:1,max:1,visualOnly:true});return 0}
  }
  if(['siren','cinderling','oracle'].includes(e.kind)&&d<230&&e.attack<=0){
    if(e.kind==='oracle'){
      for(let i=0;i<2&&game.enemies.length<game.pressure.cap;i++){const child=game.spawnEnemy(game.stage==='foundry'?'cinderling':'leech');child.x=e.x+(i?25:-25);child.y=e.y+20;child.xp=0;child.score=0;child.summoned=true}
      game.effects.push({type:'pulse',x:e.x,y:e.y,r:35,color:'#c8b4de',t:.7,max:.7});e.attack=9;
    }else{
      // ponytail: cap ranged crossfire at twelve live shots; use a maintained count if the pool grows substantially.
      if(game.projectiles.filter(b=>b.enemy&&b.t>0).length<10){const a=Math.atan2(dy,dx);for(const offset of e.kind==='siren'?[-.3,0,.3]:[0])shot(game,e,a+offset,65,e.damage*.7)}
      e.attack=6+Math.random()*2;
    }
    return .25;
  }
  return ['siren','oracle'].includes(e.kind)&&d<160?.35:1;
}
function shot(game,e,a,speed,damage){game.projectiles.push({x:e.x,y:e.y-12,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:4,damage,enemy:true,type:'enemy',t:4,hit:new Set()})}

export function drawExpeditionFloor(game,g,cam,w,h){
  if(game.stage==='graveyard')return;
  if(artAvailable()){game.landscape.drawFloor(g,cam,w,h,game.ambient,game.stage);return}
  const forge=game.stage==='foundry',left=cam.x-w/2,top=cam.y-h/2;
  g.fillStyle=forge?'#292526':'#172f37';g.fillRect(0,0,w,h);
  for(let cy=Math.floor(top/64);cy<=Math.floor((top+h)/64);cy++)for(let cx=Math.floor(left/64);cx<=Math.floor((left+w)/64);cx++){
    const x=cx*64-left,y=cy*64-top,n=hash(cx,cy,93);g.fillStyle=forge?(n>.5?'#403334':'#342c2c'):(n>.5?'#243c44':'#20363d');g.fillRect(x+1,y+1,62,62);
    g.fillStyle=forge?'#6d4840':'#42616b';g.fillRect(x+5,y+4,49,1);
    if(n>.64){g.strokeStyle=forge?'#d784453f':'#84c3cf33';g.beginPath();g.moveTo(x+7,y+55);g.lineTo(x+24,y+28);g.lineTo(x+49,y+34);g.lineTo(x+62,y+10);g.stroke()}
    if(n<.25){g.fillStyle=forge?'#e39f6729':'#82b8c822';g.fillRect(x+13,y+19,29,3);g.fillRect(x+21,y+25,29,2)}
  }
}

export function drawTideHazard(g,h,ox,oy){
  const x=h.x+ox,y=h.y+oy,gap=h.gap+ox,alpha=.18+.25*(1-h.t/h.max);
  g.fillStyle=`rgba(125,218,232,${alpha})`;g.fillRect(x-h.r,y-20,gap-38-(x-h.r),40);g.fillRect(gap+38,y-20,x+h.r-gap-38,40);
  g.strokeStyle='#a6e3e8';g.strokeRect(gap-38,y-24,76,48);diamond(g,gap,y,5,'#d9f0d9');
}
