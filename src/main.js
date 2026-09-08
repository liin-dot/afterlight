import {Game,RUN_DURATION} from './game.js';
import {Sound} from './audio.js';
import {paintIcon,paintAvatar,fire,glow,drawSprite} from './art.js';
import {CHARACTERS,WEAPONS,PASSIVES,PICKUPS,META,formatTime,readSave,writeSave,mergeItemDiscoveries,catalogItem} from './data.js';
import {CharacterSheet} from './status.js';
import {FUSIONS,WEAPON_SLOTS,maxWeaponLevel,weaponName,fusionState,ingredientData,fusionUsesRelic} from './fusions.js';
import {compatibleWeapons} from './content.js';
import {rememberItems,rememberInventory,recoverFusionDiscoveries} from './discovery.js';

const $=id=>document.getElementById(id);
const show=id=>$(id).classList.remove('hidden');
const hide=id=>$(id).classList.add('hidden');
const save=readSave();
const sound=new Sound();sound.muted=save.muted;
const game=new Game($('world'),sound);
game.discoveredFusions=new Set(save.discoveredFusions);
const sheet=new CharacterSheet(game,save,sound);
let selected=0,lastFocus=null,lastBoss=null;
const overlays=['level-screen','pause-screen','end-screen','archive-screen','meta-screen','status-screen'];

function text(id,value){const element=$(id),next=String(value);if(element.textContent!==next)element.textContent=next}
function closeOverlays(){for(const id of overlays)hide(id)}
function openModal(id){lastFocus=document.activeElement;show(id);requestAnimationFrame(()=>$(id).querySelector('button:not(:disabled)')?.focus({preventScroll:true}))}
function closeModal(id){hide(id);if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true})}
function announce(value){text('announcer',value)}
function saveProgress(){
 const persisted=writeSave(save);game.itemDiscoveryPersisted=persisted;
 for(const key of save.discoveredFusions)game.discoveredFusions.add(key);
 return persisted;
}
function updateDiscoveryBadges(){
 const count=Object.keys(save.discoveredItems).filter(id=>{const item=catalogItem(id);return item&&(item.category!=='fusion'||game.discoveredFusions.has(item.key))}).length;
 const total=Object.keys(WEAPONS).length+Object.keys(PASSIVES).length+Object.keys(PICKUPS).length;
 text('menu-catalog-count',count+'/'+total);text('hud-catalog-count',count);
}
function storeItemDiscoveries(change){
 if(!change.changed)return;
 saveProgress();updateDiscoveryBadges();
 if(change.fresh.length&&game.state!=='menu')announce('道具图鉴新增：'+change.fresh.map(item=>item.data.name).join('、')+'。按 I 查看。');
}
function openItemCatalog(){if(sheet.visible)sheet.selectTab('catalog');else openStatus({tab:'catalog'})}
function openStatus(options){if(sheet.open(options))resetTouchInput()}
function openFusionBook(){if(sheet.visible)sheet.selectTab('fusion');else openStatus({tab:'fusion'})}

function buildCharacters(){
 $('characters').replaceChildren();
 CHARACTERS.forEach((character,index)=>{
  const b=document.createElement('button');b.className='character-card'+(selected===index?' active':'');b.setAttribute('aria-pressed',String(selected===index));b.setAttribute('aria-label',character.name+'：'+character.description.replace(/<[^>]*>/g,''));
  const portrait=document.createElement('canvas');portrait.width=32;portrait.height=44;paintAvatar(portrait,character.id);
  const label=document.createElement('span');const strong=document.createElement('strong');strong.textContent=character.name;const small=document.createElement('small');small.textContent=character.english;label.append(strong,small);b.append(portrait,label);
  b.addEventListener('click',()=>{selected=index;game.character=character;buildCharacters();sound.init();sound.play('select')});$('characters').append(b);
 });
 $('character-description').innerHTML=CHARACTERS[selected].description;text('character-tag',CHARACTERS[selected].tag);
}
function updateMenu(){text('meta-count',save.embers+' ✦');text('sound-icon',sound.muted?'♪̸':'♫');$('sound-button').setAttribute('aria-label',sound.muted?'开启声音':'关闭声音');$('sound-button').setAttribute('aria-pressed',String(!sound.muted))}
function start(){if(game.state!=='menu'&&game.state!=='over')return;resetTouchInput();closeOverlays();sound.init();sound.play('select');game.start(CHARACTERS[selected],save.meta)}
function openRunMenu(){
 if(sheet.visible){if(!['running','paused','level'].includes(sheet.origin))return;sheet.close()}
 if(game.state==='paused'){openModal('pause-screen');return}
 resetTouchInput();game.pause();
}
function finishRun(destination){
 if(game.state!=='paused')return;
 resetTouchInput();game.end(false,true,destination);
}
function toggleSound(){sound.init();sound.toggle();save.muted=sound.muted;saveProgress();updateMenu()}
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{if(game.state==='running')game.toast('当前浏览器不支持全屏，可以使用浏览器的全屏功能。')}}

function updateHud(){
 const p=game.player;if(!p)return;const hp=Math.max(0,Math.ceil(p.hp));text('health-label',hp+' / '+p.maxHp);$('health-fill').style.width=Math.max(0,p.hp/p.maxHp*100)+'%';$('xp-fill').style.width=Math.min(100,game.xp/game.xpNext*100)+'%';text('xp-label','LEVEL '+String(game.level).padStart(2,'0'));text('level-label','LV. '+game.level);text('timer',formatTime(game.time));text('time-left',game.time<RUN_DURATION?formatTime(RUN_DURATION-game.time):'击败首领');text('kill-count',game.kills.toLocaleString());text('gold-count',game.gold.toLocaleString());
 text('phase-label',game.time<60?'月下初行':game.time<120?'夜色渐深':game.time<240?'暗潮汹涌':game.time<360?'群魔苏醒':game.time<480?'黎明将至':game.time<RUN_DURATION?'最后的守望':'破晓之战');
 text('threat-label','威胁等级 '+['I','II','III','IV','V','VI','VII','VIII','IX','X','XI'][Math.min(10,Math.floor(game.time/60))]);
 const maxCooldown=game.stats.dashCooldown;$('dash-cooldown').style.height=Math.min(100,game.player.dashCooldown/maxCooldown*100)+'%';$('touch-dash').style.opacity=game.player.dashCooldown>0?'.45':'1';
 const bosses=game.enemies.filter(e=>e.boss&&!e.dead);const boss=bosses.find(e=>e.final)||bosses[0];if(boss){show('boss-bar');text('boss-name',boss.name+(boss.enraged?' · 狂怒':''));$('boss-fill').style.width=Math.max(0,boss.hp/boss.maxHp*100)+'%';text('boss-health',Math.max(0,Math.ceil(boss.hp)).toLocaleString()+' / '+boss.maxHp.toLocaleString());lastBoss=boss.id}else{hide('boss-bar');lastBoss=null}
}
function buildDock(){
 const dock=$('weapon-dock');dock.replaceChildren();for(const [key,level] of Object.entries(game.weapons)){
  const fused=WEAPONS[key].fusion;
  const slot=document.createElement('button');slot.className='weapon-slot'+(level===6?' evolved':'')+(fused?' fused':'');slot.title=weaponName(key,level)+' · '+(fused?'融合 LV. '+level+'/'+maxWeaponLevel(key):level===6?'已进化':'等级 '+level)+' · 点击查看效果';slot.setAttribute('aria-label',slot.title);slot.setAttribute('aria-haspopup','dialog');slot.addEventListener('click',()=>openStatus({tab:'items',weapon:key}));
  const art=document.createElement('canvas');art.width=24;art.height=24;paintIcon(art,key);const tag=document.createElement('span');tag.className='weapon-level';tag.textContent=fused?'◆'+level:level===6?'✦':String(level);slot.append(art,tag);dock.append(slot);
 }
 for(let i=Object.keys(game.weapons).length;i<WEAPON_SLOTS;i++){const slot=document.createElement('div');slot.className='weapon-slot empty';slot.title='未获得的武器';dock.append(slot)}
 updateFusionTracker();
}
function updateFusionTracker(){
 if(!game.weapons)return;
 const ready=Object.keys(FUSIONS).filter(key=>fusionState(key,game.weapons,game.passives,game).ready),key=game.trackedFusion;
 $('fusion-tracker').classList.toggle('ready',ready.length>0);
 if(key&&FUSIONS[key]&&game.discoveredFusions.has(key)){
  const progress=fusionState(key,game.weapons,game.passives,game);
  text('fusion-tracker-title',WEAPONS[key].name);
  text('fusion-tracker-detail',progress.ready?'材料齐备 · 下次升级融合':progress.ingredients.map(i=>ingredientData(i).name+' '+i.level+'/'+i.required).join(' · '));
 }else{
  text('fusion-tracker-title',ready.length?'装备正在共鸣':'融合手记 · '+game.discoveredFusions.size+'/'+Object.keys(FUSIONS).length);
  text('fusion-tracker-detail',ready.length?'下次升级可尝试融合':'亲手铸成，才会记入图谱');
 }
}
function buildUpgrades(){
 text('new-level','等级 '+game.level);text('rerolls-left',game.rerolls);$('reroll-button').disabled=game.rerolls===0;$('upgrade-cards').replaceChildren();
 game.choices.forEach((item,index)=>{
  const fusedUpgrade=item.weapon&&WEAPONS[item.key].fusion,unknown=item.fusion&&!game.discoveredFusions.has(item.key),relic=!item.weapon&&PASSIVES[item.key]?.relic;
  const goal=!item.fusion&&FUSIONS[game.trackedFusion]?.ingredients.some(i=>i.id===item.key&&item.current<i.required);
  const button=document.createElement('button');button.className='upgrade-card'+(item.evolution?' evolution':'')+(item.fusion?' fusion-card':'')+(goal?' tracked-material':'')+(relic?' relic-card':'');button.style.setProperty('--card-color',item.color);
  const rarity=document.createElement('div');rarity.className='rarity';const type=document.createElement('span');type.textContent=item.fusion?(unknown?'◇ 首次共鸣 · 未知融合':fusionUsesRelic(item.key)?'◆ 武器与道具融合':'◆ 双武器融合'):goal?'◇ 已追踪的融合材料':fusedUpgrade?'◆ 融合武器强化':item.evolution?'✦ 传说 · 武器进化':item.weapon?(item.current?'武器强化':'全新武器'):relic?'◇ 联动遗物':'被动祝福';const key=document.createElement('kbd');key.textContent=index+1;rarity.append(type,key);
  const art=document.createElement('canvas');art.width=24;art.height=24;if(!unknown)paintIcon(art,item.key==='heal'?'vitality':item.key);else{art.className='unknown-fusion-art';const g=art.getContext('2d');g.fillStyle='#d0bd92';g.font='20px monospace';g.textAlign='center';g.fillText('?',12,19)}
  const title=document.createElement('h3');title.textContent=unknown?'未命名的力量':item.name;title.style.color=item.fusion?item.color:item.evolution?'#ebc78d':'';
  const category=document.createElement('span');category.className='upgrade-type';category.textContent=unknown?'融合成功后揭晓':item.weapon?WEAPONS[item.key].category:relic?'遗物 / '+PASSIVES[item.key].trigger:'被动 / 永续生效';
  const description=document.createElement('p');description.textContent=unknown?'这两件装备正在共鸣。选择后消耗下方材料，铸成未知武器，并将它永久记录进融合图谱。'+(fusionUsesRelic(item.key)?'被消耗道具的独立效果会失去。':''):item.description;const bottom=document.createElement('div');bottom.className='upgrade-bottom';const from=document.createElement('span');from.textContent=item.fusion?(fusionUsesRelic(item.key)?'武器＋道具':'双武器')+' → LV. '+item.next:item.evolution?'LV. 5 → EVOLVED':item.current?'LV. '+item.current+' → LV. '+item.next:'解锁 · LV. 1';const arrow=document.createElement('span');arrow.textContent=item.fusion?'融合 ↗':'选择 ↗';bottom.append(from,arrow);button.append(rarity,art,title,category,description);
  if(item.fusion){const ingredients=document.createElement('div');ingredients.className='fusion-card-materials';ingredients.textContent=item.ingredients.map(i=>`${ingredientData(i).name} LV.${i.level}（消耗）`).join(' ＋ ');button.append(ingredients)}
  if(relic){
   const linked=compatibleWeapons(item.key,game.weapons,game.passives),note=document.createElement('div');note.className='relic-card-link';
   note.textContent=(linked.length?'当前联动：'+linked.map(id=>WEAPONS[id].name).join('、'):'待搭配对应武器')+(PASSIVES[item.key].catalyst?' · 可作为融合材料':'');button.append(note);
  }
  button.append(bottom);
  button.addEventListener('click',()=>game.chooseUpgrade(index));$('upgrade-cards').append(button);
 });
 show('level-screen');announce('余烬觉醒，等级 '+game.level+'。选择一种升级。');requestAnimationFrame(()=>$('upgrade-cards').querySelector('button')?.focus({preventScroll:true}));
}
function pauseStats(){
 const active=Object.values(game.weapons).filter(n=>n===6).length;
 $('pause-stats').innerHTML=`<span><b>${formatTime(game.time)}</b>守夜时间</span><span><b>${game.kills.toLocaleString()}</b>击败敌人</span><span><b>+${Math.round((game.damageMultiplier-1)*100)}%</b>额外伤害</span><span><b>${active}</b>进化武器</span>`;
 text('pause-context',game.pauseReturn==='level'?'升级选择已保留，返回后继续选择。':'战斗已暂停，准备好再出发。');
 text('resume-label',game.pauseReturn==='level'?'返回升级选择':'继续守夜');
 text('pause-reward','本局可结算 +'+game.earnedEmbers.toLocaleString()+' 余烬');
 text('restart-description','使用'+game.character.name+'，从 00:00 / LV.1 重开');
}
function endRun(result){
 hide('hud');hide('pause-screen');hide('level-screen');const record=result.time>save.best;save.embers+=result.reward;save.best=Math.max(save.best,result.time);save.kills+=result.kills;save.runs++;if(result.won)save.wins++;const persisted=saveProgress();
 if(result.destination==='restart'){
  selected=Math.max(0,CHARACTERS.findIndex(character=>character.id===game.character.id));
  updateMenu();start();
  game.toast('已重新开始 · 上局结算 +'+result.reward+' 余烬'+(persisted?'':' · 浏览器暂未保存'),4);
  return;
 }
 if(result.destination==='camp'){
  game.returnToMenu();
  text('camp-return-note','远征已结束 · +'+result.reward+' 余烬'+(persisted?'已入账 · 图鉴发现已保留':'暂存于本页 · 浏览器存储不可用'));
  show('camp-return-note');announce('已退出远征，返回营地。获得 '+result.reward+' 余烬。');
  return;
 }
 text('end-eyebrow',result.won?'THE DAWN REMEMBERS YOUR NAME':'THE EMBER NEVER DIES');text('end-title',result.won?'长夜已尽，黎明是你。':result.abandoned?'灯火尚存，暂别长夜。':'灯灭，余烬犹存。');text('end-description',result.won?'你击败了蚀月君王。第一缕晨光，终于穿过墓园。':result.abandoned?'带上收获的余烬，下一次会走得更远。':'每一次倒下，都让下一盏灯更明亮。');
 const fields=[[formatTime(result.time),'守夜时间'],[result.kills.toLocaleString(),'击败敌人'],['LV. '+result.level,'最终等级'],['+'+result.reward.toLocaleString(),'收获余烬']];$('end-stats').replaceChildren();fields.forEach(([value,label],i)=>{let d=document.createElement('div');if(i===3)d.className='gold';let strong=document.createElement('strong');strong.textContent=value;let span=document.createElement('span');span.textContent=label;d.append(strong,span);$('end-stats').append(d)});
 text('record-label',!persisted?'浏览器存储不可用 · 本次成长仅在当前页面保留':result.won?'✦ 黎明守护者 · 额外奖励 250 余烬':record?'✦ 新纪录 · 你又走远了一点':'余烬已存入祭坛');
 const c=$('end-art'),g=c.getContext('2d');g.clearRect(0,0,96,64);g.imageSmoothingEnabled=false;glow(g,49,40,36,result.won?'#e1cb6f33':'#e1a66f22');drawSprite(g,CHARACTERS[selected].id,30,55,{flip:false,alpha:result.won?1:.7});fire(g,65,53,3,result.won?1:.7);
 openModal('end-screen');updateMenu();announce(result.won?'远征胜利。长夜已尽。':'远征结束。获得 '+result.reward+' 余烬。');
}
function buildMeta(){
 text('ember-balance',save.embers.toLocaleString());$('meta-upgrades').replaceChildren();for(const [key,info] of Object.entries(META)){
  const level=save.meta[key]||0,cost=info.cost*(level+1);const row=document.createElement('div');row.className='meta-upgrade';const art=document.createElement('canvas');art.width=24;art.height=24;paintIcon(art,key);const words=document.createElement('div');const heading=document.createElement('h3');heading.textContent=info.name+' '+level+'/'+info.max;const desc=document.createElement('small');desc.textContent=info.desc;words.append(heading,desc);const button=document.createElement('button');button.textContent=level>=info.max?'已满级':cost+' ✦';button.disabled=level>=info.max||save.embers<cost;button.setAttribute('aria-label','升级'+info.name+'，消耗 '+cost+' 余烬');button.addEventListener('click',()=>{if((save.meta[key]||0)>=info.max||save.embers<cost)return;save.embers-=cost;save.meta[key]=(save.meta[key]||0)+1;saveProgress();sound.init();sound.play('chest');buildMeta();updateMenu()});row.append(art,words,button);$('meta-upgrades').append(row);
 }text('meta-best',`远征 ${save.runs} 次  ·  最长守夜 ${formatTime(save.best)}  ·  累计击败 ${save.kills.toLocaleString()}  ·  破晓 ${save.wins} 次`);
}

game.on=(event,data)=>{
 if(event==='start')start();
 if(event==='startRun'){hide('menu');hide('camp-return-note');closeOverlays();show('hud');$('event-banner').classList.remove('visible');$('toast').classList.remove('visible');document.body.classList.add('playing');text('player-name',game.character.name);paintAvatar($('hud-avatar'),game.character.id);document.activeElement?.blur();announce('远征开始。WASD 移动，空格冲刺，Esc 打开菜单。')}
 if(event==='hud')updateHud();
 if(event==='weapons'){storeItemDiscoveries(rememberInventory(save,game));buildDock()}
 if(event==='level')buildUpgrades();
 if(event==='upgrade'){hide('level-screen');document.activeElement?.blur()}
 if(event==='choose')game.chooseUpgrade(data);
 if(event==='pause'){resetTouchInput();hide('level-screen');pauseStats();openModal('pause-screen')}
 if(event==='resume'){
  hide('pause-screen');resetTouchInput();
  if(data==='level'){show('level-screen');requestAnimationFrame(()=>$('upgrade-cards').querySelector('button')?.focus({preventScroll:true}))}
  else document.activeElement?.blur();
 }
 if(event==='restartRun')finishRun('restart');
 if(event==='quitRun')finishRun('camp');
 if(event==='status')openStatus();
 if(event==='closeStatus')sheet.close();
 if(event==='fusionBook')openFusionBook();
 if(event==='itemCatalog')openItemCatalog();
 if(event==='pickup')storeItemDiscoveries(rememberItems(save,{['pickup:'+data]:1}));
 if(event==='fusionProgress')updateFusionTracker();
 if(event==='fusionDiscovered'){save.discoveredFusions=[...game.discoveredFusions];rememberInventory(save,game);recoverFusionDiscoveries(save);game.discoveryPersisted=saveProgress();updateDiscoveryBadges();announce('首次发现 '+WEAPONS[data].name+'，融合图谱与道具图鉴已解锁。')}
 if(event==='sound')toggleSound();
 if(event==='fullscreen')fullscreen();
 if(event==='banner'){$('event-banner').replaceChildren();const title=document.createTextNode(data.title);const subtitle=document.createElement('small');subtitle.textContent=data.subtitle;$('event-banner').append(title,subtitle);$('event-banner').classList.add('visible')}
 if(event==='bannerHide')$('event-banner').classList.remove('visible');
 if(event==='toast'){text('toast',data);$('toast').classList.add('visible')}
 if(event==='toastHide')$('toast').classList.remove('visible');
 if(event==='end')endRun(data);
 if(event==='menu'){resetTouchInput();closeOverlays();hide('hud');show('menu');document.body.classList.remove('playing');updateMenu();$('start-button').focus({preventScroll:true})}
 if(event==='closeMenuModal'){for(const id of ['archive-screen','meta-screen'])if(!$(id).classList.contains('hidden'))closeModal(id)}
};

$('start-button').addEventListener('click',start);
$('retry-button').addEventListener('click',start);
$('home-button').addEventListener('click',()=>game.returnToMenu());
$('sound-button').addEventListener('click',toggleSound);
$('fullscreen-button').addEventListener('click',fullscreen);
for(const id of ['pause-button','level-menu-button','sheet-menu-button'])$(id).addEventListener('click',openRunMenu);
$('resume-button').addEventListener('click',()=>game.resume());
$('restart-button').addEventListener('click',()=>finishRun('restart'));
$('quit-button').addEventListener('click',()=>finishRun('camp'));
$('reroll-button').addEventListener('click',()=>game.reroll());
for(const id of ['menu-status-button','status-button','pause-status-button','level-status-button','end-status-button'])$(id).addEventListener('click',()=>openStatus());
for(const id of ['fusion-tracker','level-fusion-button'])$(id).addEventListener('click',openFusionBook);
for(const id of ['menu-catalog-button','hud-catalog-button','pause-catalog-button','level-catalog-button','end-catalog-button'])$(id).addEventListener('click',openItemCatalog);
$('archive-button').addEventListener('click',()=>{sound.init();sound.play('select');openModal('archive-screen')});
$('meta-button').addEventListener('click',()=>{buildMeta();sound.init();sound.play('select');openModal('meta-screen')});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
for(const id of ['archive-screen','meta-screen'])$(id).addEventListener('click',e=>{if(e.target===$(id))closeModal(id)});

// Keep keyboard focus inside dialogs without interfering with gameplay shortcuts.
document.addEventListener('keydown',e=>{
 if(e.code!=='Tab')return;const active=document.querySelector('.modal-wrap:not(.hidden)');if(!active)return;const focusables=[...active.querySelectorAll('button:not(:disabled):not([tabindex="-1"]),[href],input,summary,[tabindex="0"]')].filter(element=>!element.closest('.hidden')&&element.getClientRects().length);if(!focusables.length)return;const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
});

const joystick=$('joystick'),stick=joystick.querySelector('i');let activePointer=null;
function resetTouchInput(){const pointer=activePointer;activePointer=null;game.stick={x:0,y:0};stick.style.transform='';if(pointer!==null&&joystick.hasPointerCapture(pointer))joystick.releasePointerCapture(pointer)}
function updateJoystick(e){const box=joystick.getBoundingClientRect();let x=e.clientX-(box.left+box.width/2),y=e.clientY-(box.top+box.height/2);const d=Math.hypot(x,y),max=box.width*.34;if(d>max){x=x/d*max;y=y/d*max}game.stick={x:x/max,y:y/max};stick.style.transform=`translate(${x}px,${y}px)`}
joystick.addEventListener('pointerdown',e=>{if(activePointer!==null)return;e.preventDefault();activePointer=e.pointerId;joystick.setPointerCapture(e.pointerId);updateJoystick(e)});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===activePointer){e.preventDefault();updateJoystick(e)}});
function resetJoystick(e){if(e.pointerId!==activePointer)return;activePointer=null;game.stick={x:0,y:0};stick.style.transform='';if(joystick.hasPointerCapture(e.pointerId))joystick.releasePointerCapture(e.pointerId)}
joystick.addEventListener('pointerup',resetJoystick);joystick.addEventListener('pointercancel',resetJoystick);joystick.addEventListener('lostpointercapture',resetJoystick);
$('touch-dash').addEventListener('pointerdown',e=>{e.preventDefault();game.dash()});

window.addEventListener('storage',event=>{
 if(event.key!=='afterlight-save-v1')return;
 const latest=readSave();
 for(const key of latest.discoveredFusions)game.discoveredFusions.add(key);
 save.discoveredItems=mergeItemDiscoveries(save.discoveredItems,latest.discoveredItems);
 save.discoveredFusions=[...game.discoveredFusions];
 recoverFusionDiscoveries(save);updateDiscoveryBadges();
 if(sheet.visible)sheet.build();updateFusionTracker();
});
if(recoverFusionDiscoveries(save).changed)saveProgress();
updateDiscoveryBadges();buildCharacters();updateMenu();
