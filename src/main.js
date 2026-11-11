import {Game,RUN_DURATION} from './game.js';
import {Sound} from './audio.js';
import {paintIcon,paintAvatar,fire,glow,drawSprite} from './art.js';
import {CHARACTERS,WEAPONS,PASSIVES,PICKUPS,META,formatTime,readSave,writeSave,refreshSave,catalogItem} from './data.js';
import {CharacterSheet} from './status.js';
import {FUSIONS,WEAPON_SLOTS,PASSIVE_SLOTS,maxWeaponLevel,weaponName,fusionState,ingredientData,fusionUsesRelic} from './fusions.js';
import {compatibleWeapons,relicDescription,BUILD_TAGS,itemTags} from './content.js';
import {rememberItems,rememberInventory,recoverFusionDiscoveries} from './discovery.js';
import {pressureAt,itemRarity,buildProfile} from './balance.js';
import {weaponStats} from './stats.js';
import {passiveEffect} from './item-info.js';
import {CHARACTER_TALENTS,talentPoints,characterTalentStatus,characterTalentProgress} from './talents.js';
import {worldEventStatus} from './world-events.js';

const $=id=>document.getElementById(id);
const show=id=>$(id).classList.remove('hidden');
const hide=id=>$(id).classList.add('hidden');
const save=readSave();
const sound=new Sound();sound.muted=save.muted;
const game=new Game($('world'),sound);
game.discoveredFusions=new Set(save.discoveredFusions);
const sheet=new CharacterSheet(game,save,sound);
let selected=0,lastFocus=null,lastBoss=null,buyingMeta=false,settling=false;
const overlays=['level-screen','pause-screen','end-screen','archive-screen','meta-screen','status-screen'];

function text(id,value){const element=$(id),next=String(value);if(element.textContent!==next)element.textContent=next}
function closeOverlays(){for(const id of overlays)hide(id)}
function openModal(id){lastFocus=document.activeElement;show(id);requestAnimationFrame(()=>$(id).querySelector('button:not(:disabled)')?.focus({preventScroll:true}))}
function closeModal(id){hide(id);if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true})}
function announce(value){text('announcer',value)}
async function saveProgress(change){
 const result=await writeSave(save,change);game.itemDiscoveryPersisted=result.persisted;
 if(sound.muted!==save.muted)sound.toggle();
 for(const key of save.discoveredFusions)game.discoveredFusions.add(key);
 updateMenu();return result;
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
function openStatus(options){if(!settling&&sheet.open(options))resetTouchInput()}
function openFusionBook(){if(sheet.visible)sheet.selectTab('fusion');else openStatus({tab:'fusion'})}
function openTalentTree(){if(sheet.visible)sheet.selectTab('talents');else openStatus({tab:'talents'})}
function updateTalentHud(){
 const points=talentPoints(game);text('hud-talent-points',points>0?'天赋 +'+points:'天赋');
 text('hud-talent-state',characterTalentStatus(game));$('hud-talents-button').classList.toggle('ready',points>0);
 const progress=characterTalentProgress(game),meter=$('hud-talent-meter');meter.max=progress.max;meter.value=progress.value;meter.setAttribute('aria-label',progress.label);
 text('hud-talent-progress',progress.label);$('hud-talents-button').classList.toggle('charged',progress.ready);$('hud-talents-button').style.setProperty('--talent-color',CHARACTER_TALENTS[game.character.id].color);
 $('hud-talents-button').setAttribute('aria-label','角色天赋 · '+(points>0?'可用 '+points+' 点 · ':'')+characterTalentStatus(game)+' · '+progress.label);$('hud-talents-button').title=$('hud-talents-button').getAttribute('aria-label')+' [T]';
 text('level-talent-note','获得 '+points+' 个天赋点 · 强化角色专属能力');$('level-talents-button').classList.toggle('hidden',points<=0);
 text('level-tree-label',points>0?'天赋 +'+points:'天赋树');$('level-tree-button').classList.toggle('ready',points>0);
}
function updateEventHud(){
 const event=worldEventStatus(game),card=$('world-event-card'),visible=event.visible&&(event.active||event.canStart);card.classList.toggle('hidden',!visible);$('pause-event').classList.toggle('hidden',!visible);if(!visible)return;
 text('world-event-name',event.name);text('pause-event-name',event.name);text('world-event-detail',event.detail);text('world-event-reward',event.reward);
 text('world-event-summary',event.active?event.detail:'附近有祭坛 · 查看目标与奖励');
 $('world-event-preview').setAttribute('aria-label',event.name+' · '+(event.active?event.detail:'查看挑战目标、风险和奖励')+' · 打开后暂停');
 card.classList.toggle('active',event.active);text('world-event-label',event.active?'挑战进行中':'可选祭坛挑战');
 const meter=$('world-event-meter');meter.classList.toggle('hidden',!event.active);meter.max=event.max||1;meter.value=event.progress||0;meter.setAttribute('aria-label',event.name+' · '+event.detail);
 const button=$('world-event-start');button.classList.toggle('hidden',!event.canStart);button.disabled=!event.canStart;
}
function previewWorldEvent(){
 const event=worldEventStatus(game);if(!event.active&&!event.canStart)return;
 if(game.state==='paused'){if(event.canStart){game.resume();game.interact()}return}
 if(game.state!=='running')return;openRunMenu();requestAnimationFrame(()=>$('pause-event').focus({preventScroll:true}));
}

function buildCharacters(){
 $('characters').replaceChildren();
 CHARACTERS.forEach((character,index)=>{
  const b=document.createElement('button');b.className='character-card'+(selected===index?' active':'');b.setAttribute('aria-pressed',String(selected===index));b.setAttribute('aria-label',character.name+'：'+character.description.replace(/<[^>]*>/g,''));
  const portrait=document.createElement('canvas');portrait.width=32;portrait.height=44;paintAvatar(portrait,character.id);
  const label=document.createElement('span');const strong=document.createElement('strong');strong.textContent=character.name;const small=document.createElement('small');small.textContent=character.english;label.append(strong,small);b.append(portrait,label);
  b.addEventListener('click',()=>{selected=index;game.character=character;buildCharacters();sound.init();sound.play('select')});$('characters').append(b);
 });
 $('character-description').innerHTML=CHARACTERS[selected].description;text('character-tag',CHARACTERS[selected].tag);
 const innate=CHARACTER_TALENTS[CHARACTERS[selected].id];text('menu-innate-name',innate.name);text('menu-innate-description',innate.hint);$('menu-talents-button').style.setProperty('--talent-color',innate.color);paintIcon($('menu-innate-icon'),innate.icon);
}
function updateMenu(){text('meta-count',save.embers+' ✦');text('sound-icon',sound.muted?'♪̸':'♫');$('sound-button').setAttribute('aria-label',sound.muted?'开启声音':'关闭声音');$('sound-button').setAttribute('aria-pressed',String(!sound.muted));text('arsenal-count',Object.values(WEAPONS).filter(w=>!w.fusion).length);text('fusion-count',Object.keys(FUSIONS).length);text('relic-count',Object.keys(PASSIVES).length)}
function start(){if(settling||game.state!=='menu'&&game.state!=='over')return;refreshSave(save);resetTouchInput();closeOverlays();sound.init();sound.play('select');game.start(CHARACTERS[selected],save.meta)}
function openRunMenu(){
 if(sheet.visible){if(!['running','paused','level'].includes(sheet.origin))return;sheet.close()}
 if(game.state==='paused'){openModal('pause-screen');return}
 resetTouchInput();game.pause();
}
function finishRun(destination){
 if(game.state!=='paused')return;
 resetTouchInput();game.end(false,true,destination);
}
function toggleSound(){sound.init();sound.toggle();saveProgress({muted:sound.muted});updateMenu()}
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{if(game.state==='running')game.toast('当前浏览器不支持全屏，可以使用浏览器的全屏功能。')}}

function updateHud(){
 const p=game.player;if(!p)return;const hp=Math.max(0,Math.ceil(p.hp));text('health-label',hp+' / '+p.maxHp);$('health-fill').style.width=Math.max(0,p.hp/p.maxHp*100)+'%';$('xp-fill').style.width=Math.min(100,game.xp/game.xpNext*100)+'%';text('xp-label','LEVEL '+String(game.level).padStart(2,'0'));text('level-label','LV. '+game.level);text('timer',formatTime(game.time));text('time-left',game.time<RUN_DURATION?formatTime(RUN_DURATION-game.time):'击败首领');text('kill-count',game.kills.toLocaleString());text('gold-count',game.gold.toLocaleString());
 const phase=game.pressure||pressureAt(game.time);text('phase-label',phase.name);text('threat-label',phase.hint);
 updateTalentHud();
 updateEventHud();
 text('shield-label',game.player.shield>0?'◇ 护盾 '+Math.ceil(game.player.shield):'');
 $('night-progress-fill').style.width=Math.min(100,game.time/RUN_DURATION*100)+'%';
 text('next-encounter',game.time<180?'03:00 · 墓园看守':game.time<360?'06:00 · 无名葬钟':game.time<600?'10:00 · 蚀月君王':'终局 · 击败君王');
 text('curse-label',game.stats.curse?'禁忌 '+game.stats.curse+' · 怪物强化':'');
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
 const passiveDock=$('passive-dock');passiveDock.replaceChildren();
 for(const [key,level] of Object.entries(game.passives)){
  const slot=document.createElement('button');slot.className='passive-slot';slot.title=PASSIVES[key].name+' · LV. '+level;slot.setAttribute('aria-label',slot.title);slot.addEventListener('click',()=>openStatus({tab:'items'}));
  const art=document.createElement('canvas');art.width=art.height=24;paintIcon(art,key);const tag=document.createElement('span');tag.textContent=level;slot.append(art,tag);passiveDock.append(slot);
 }
 for(let i=Object.keys(game.passives).length;i<PASSIVE_SLOTS;i++){const slot=document.createElement('div');slot.className='passive-slot empty';slot.title='空余道具位';passiveDock.append(slot)}
 updateFusionTracker();
 text('hud-loadout-count',Object.keys(game.weapons).length+'/'+WEAPON_SLOTS+' 武器 · '+Object.keys(game.passives).length+'/'+PASSIVE_SLOTS+' 道具');
}
function updateFusionTracker(){
 if(!game.weapons)return;
 const ready=Object.keys(FUSIONS).filter(key=>fusionState(key,game.weapons,game.passives,game).ready),key=game.trackedFusion;
 $('fusion-tracker').classList.toggle('ready',ready.length>0);
 text('fusion-tracker-compact',ready.length?'融合可用':key?'融合追踪':'融合');
 if(key&&FUSIONS[key]&&game.discoveredFusions.has(key)){
  const progress=fusionState(key,game.weapons,game.passives,game);
  text('fusion-tracker-title',WEAPONS[key].name);
  text('fusion-tracker-detail',progress.ready?'材料齐备 · 下次升级融合':progress.ingredients.map(i=>ingredientData(i).name+' '+i.level+'/'+i.required).join(' · '));
 }else{
  text('fusion-tracker-title',ready.length?'装备正在共鸣':'融合手记 · '+game.discoveredFusions.size+'/'+Object.keys(FUSIONS).length);
  text('fusion-tracker-detail',ready.length?'下次升级可尝试融合':'亲手铸成，才会记入图谱');
 }
 $('fusion-tracker').setAttribute('aria-label',$('fusion-tracker-title').textContent+' · '+$('fusion-tracker-detail').textContent+' · 查看融合图谱');$('fusion-tracker').title=$('fusion-tracker').getAttribute('aria-label')+' [G]';
}
function buildUpgrades(reveal=true){
 text('new-level','等级 '+game.level);text('rerolls-left',game.rerolls);$('reroll-button').disabled=game.rerolls===0;$('upgrade-cards').replaceChildren();
 text('upgrade-capacity','武器 '+Object.keys(game.weapons).length+'/'+WEAPON_SLOTS+'  ·  道具 '+Object.keys(game.passives).length+'/'+PASSIVE_SLOTS+'  ·  放逐剩余 '+game.banishes+' 次');
 text('upgrade-era',game.time<120?'02:00 解锁独立进化 · 03:00 解锁融合':game.time<180?'独立进化已开放 · 03:00 解锁融合':'融合已开放 · 留意材料间的共鸣');
 const profile=buildProfile(game),trend=$('upgrade-affinity');trend.replaceChildren();
 const lead=document.createElement('b');lead.textContent=profile.leading.length?'本局倾向':'尚在探索';trend.append(lead);
 for(const tag of profile.leading){const chip=document.createElement('span');chip.className='build-tag matched';chip.style.setProperty('--tag-color',BUILD_TAGS[tag].color);chip.textContent=BUILD_TAGS[tag].name;trend.append(chip)}
 const hint=document.createElement('small');hint.textContent='近期选择会提高同标签权重 · 改选可转型';trend.append(hint);
 updateTalentHud();
 game.choices.forEach((item,index)=>{
  const fusedUpgrade=item.weapon&&WEAPONS[item.key].fusion,unknown=item.fusion&&!game.discoveredFusions.has(item.key),relic=!item.weapon&&PASSIVES[item.key]?.relic;
  const goal=!item.fusion&&FUSIONS[game.trackedFusion]?.ingredients.some(i=>i.id===item.key&&item.current<i.required);
  const button=document.createElement('button');button.className='upgrade-card'+(item.evolution?' evolution':'')+(item.fusion?' fusion-card':'')+(goal?' tracked-material':'')+(relic?' relic-card':!item.weapon&&PASSIVES[item.key]?' blessing-card':'');button.style.setProperty('--card-color',item.color);
  const rarity=document.createElement('div');rarity.className='rarity';const type=document.createElement('span');type.textContent=item.fusion?(unknown?'◇ 首次共鸣 · 未知融合':fusionUsesRelic(item.key)?'◆ 武器与道具融合':'◆ 双武器融合'):goal?'◇ 已追踪的融合材料':fusedUpgrade?'◆ 融合武器强化':item.evolution?'✦ 传说 · 武器进化':itemRarity(item.weapon?WEAPONS[item.key]:PASSIVES[item.key]).name+' · '+(item.weapon?(item.current?'武器强化':'全新武器'):relic?'联动遗物':'属性祝福');const key=document.createElement('kbd');key.textContent=index+1;rarity.append(type,key);
  const art=document.createElement('canvas');art.width=24;art.height=24;if(!unknown)paintIcon(art,item.key==='heal'?'vitality':item.key);else{art.className='unknown-fusion-art';const g=art.getContext('2d');g.fillStyle='#d0bd92';g.font='20px monospace';g.textAlign='center';g.fillText('?',12,19)}
  const title=document.createElement('h3');title.textContent=unknown?'未命名的力量':item.name;title.style.color=item.fusion?item.color:item.evolution?'#ebc78d':'';
  const category=document.createElement('span');category.className='upgrade-type';category.textContent=unknown?'融合成功后揭晓':item.weapon?WEAPONS[item.key].category:relic?'遗物 / '+PASSIVES[item.key].trigger:'被动 / 永续生效';
  const description=document.createElement('p');description.textContent=unknown?'消耗下列材料，铸成未知武器并记入图谱。'+(fusionUsesRelic(item.key)?'道具的独立效果随之失去。':''):relic?relicDescription(item.key,item.next,game.stats):item.description;const bottom=document.createElement('div');bottom.className='upgrade-bottom';const from=document.createElement('span');from.textContent=item.fusion?(fusionUsesRelic(item.key)?'武器＋道具':'双武器')+' → LV. '+item.next:item.evolution?'LV. 5 → EVOLVED':item.current?'LV. '+item.current+' → LV. '+item.next:'解锁 · LV. 1';const arrow=document.createElement('span');arrow.textContent=item.fusion?'融合 ↗':'选择 ↗';bottom.append(from,arrow);button.append(rarity,art,title,category,description);
  if(item.reason){const reason=document.createElement('span');reason.className='upgrade-reason';reason.textContent=item.reason;button.append(reason)}
  if(!unknown&&itemTags(item.key).length){
   const tags=document.createElement('div');tags.className='item-tags';
   for(const tag of itemTags(item.key)){const chip=document.createElement('span');chip.className='build-tag'+(profile.scores[tag]>=.25?' matched':'');chip.textContent=BUILD_TAGS[tag].name;chip.style.setProperty('--tag-color',BUILD_TAGS[tag].color);tags.append(chip)}
   button.append(tags);
   if(item.affinity>=1.1){const note=document.createElement('small');note.className='affinity-boost';note.textContent='标签加权 ×'+item.affinity.toFixed(2);note.title='这是本局标签对抽取权重的倍率，不是出现概率。稀有度、装备位和联动条件也会影响最终结果。';button.append(note)}
  }
  if(item.weapon&&!item.fusion){
   const next=weaponStats(item.key,item.next,game.stats,game.character),current=item.current?weaponStats(item.key,item.current,game.stats,game.character):null;
   const facts=document.createElement('div');facts.className='upgrade-gains';
   const fields=[['damage','伤害'],['cooldown','间隔'],next.count?['count','数量']:next.radius?['radius','范围']:['range','距离']];
   for(const [key,label] of fields){if(!next[key])continue;const row=document.createElement('span');row.textContent=label+' '+(current?Number(current[key].toFixed(2))+' → ':'')+Number(next[key].toFixed(2))+(key==='cooldown'?'s':'');facts.append(row)}button.append(facts);
  }else if(!item.weapon&&!relic&&PASSIVES[item.key]){const total=document.createElement('div');total.className='upgrade-gains';total.textContent='升级后：'+passiveEffect(item.key,item.next);button.append(total)}
  if(item.fusion){const ingredients=document.createElement('div');ingredients.className='fusion-card-materials';ingredients.textContent='消耗：'+item.ingredients.map(i=>`${ingredientData(i).name} LV.${i.level}`).join(' ＋ ');button.append(ingredients)}
  if(relic){
   const linked=compatibleWeapons(item.key,game.weapons,game.passives,game.talents,game.character.id),note=document.createElement('div');note.className='relic-card-link';
   const broad=PASSIVES[item.key].families.some(tag=>['guard','dash','pickup'].includes(tag));
   note.textContent=(linked.length?(broad?'触发方式：'+PASSIVES[item.key].trigger:'当前联动：'+linked.map(id=>WEAPONS[id].name).join('、')):'尚缺稳定触发来源')+(PASSIVES[item.key].catalyst?' · 可作为融合材料':'');note.dataset.compact=linked.length?'联动已就绪':'尚缺触发来源';button.append(note);
  }
  button.append(bottom);
  const option=document.createElement('div');option.className='upgrade-option';option.append(button);
  if(!item.fusion&&item.key!=='heal'){const banish=document.createElement('button');banish.className='banish-button';banish.textContent='放逐';banish.disabled=game.banishes<=0;banish.title='本局不再出现或升级此装备，已有效果保留；刷新候选项。';banish.setAttribute('aria-label','放逐'+item.name+'，本局不再出现，已装备效果保留');banish.addEventListener('click',()=>game.banish(index));option.append(banish)}
  button.addEventListener('click',()=>game.chooseUpgrade(index));$('upgrade-cards').append(option);
 });
 if(reveal){show('level-screen');announce('余烬觉醒，等级 '+game.level+'。选择一种升级。');requestAnimationFrame(()=>$('upgrade-cards').querySelector('button')?.focus({preventScroll:true}))}
}
function pauseStats(){
 const active=Object.values(game.weapons).filter(n=>n===6).length;
 $('pause-stats').innerHTML=`<span><b>${formatTime(game.time)}</b>守夜时间</span><span><b>${game.kills.toLocaleString()}</b>击败敌人</span><span><b>+${Math.round((game.damageMultiplier-1)*100)}%</b>额外伤害</span><span><b>${active}</b>进化武器</span>`;
 text('pause-context',game.pauseReturn==='level'?'升级选择已保留，返回后继续选择。':(game.pressure||pressureAt(game.time)).hint+' · 下一场 '+$('next-encounter').textContent+(game.stats.curse?' · 禁忌 '+game.stats.curse:''));
 updateEventHud();
 text('resume-label',game.pauseReturn==='level'?'返回升级选择':'继续守夜');
 text('pause-reward','本局可结算 +'+game.earnedEmbers.toLocaleString()+' 余烬');
 text('restart-description','使用'+game.character.name+'，从 00:00 / LV.1 重开');
}
async function endRun(result){
 hide('hud');hide('pause-screen');hide('level-screen');settling=true;refreshSave(save);const record=result.time>save.best;const {persisted}=await saveProgress({result});settling=false;
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
 const damage=Object.entries(game.damageByWeapon).sort((a,b)=>b[1]-a[1]),total=damage.reduce((sum,[,value])=>sum+value,0);
 $('end-damage').innerHTML='<h3>本局伤害记录</h3>'+damage.slice(0,3).map(([key,value])=>`<div><span>${WEAPONS[key]?.name||(key==='talent'?'角色天赋':'遗物与次生伤害')}</span><b>${Math.round(value).toLocaleString()} · ${Math.round(value/(total||1)*100)}%</b></div>`).join('')+`<div><span>累计输出 / 承受伤害（不含护盾）</span><b>${Math.round(total).toLocaleString()} / ${game.damageTaken}</b></div>`;
 const eventRow=document.createElement('div'),eventLabel=document.createElement('span'),eventCount=document.createElement('b');eventLabel.textContent='祭坛挑战 · 完成 / 未完成';eventCount.textContent=(game.eventsCompleted||0)+' / '+(game.eventsFailed||0);eventRow.append(eventLabel,eventCount);$('end-damage').append(eventRow);
 text('record-label',!persisted?'浏览器存储不可用 · 本次成长仅在当前页面保留':result.won?'✦ 黎明守护者 · 额外奖励 250 余烬':record?'✦ 新纪录 · 你又走远了一点':'余烬已存入祭坛');
 const c=$('end-art'),g=c.getContext('2d');g.clearRect(0,0,96,64);g.imageSmoothingEnabled=false;glow(g,49,40,36,result.won?'#e1cb6f33':'#e1a66f22');drawSprite(g,CHARACTERS[selected].id,30,55,{flip:false,alpha:result.won?1:.7});fire(g,65,53,3,result.won?1:.7);
 openModal('end-screen');updateMenu();announce(result.won?'远征胜利。长夜已尽。':'远征结束。获得 '+result.reward+' 余烬。');
}
function buildMeta(){
 text('ember-balance',save.embers.toLocaleString());$('meta-upgrades').replaceChildren();for(const [key,info] of Object.entries(META)){
  const level=save.meta[key]||0,cost=info.cost*(level+1);const row=document.createElement('div');row.className='meta-upgrade';const art=document.createElement('canvas');art.width=24;art.height=24;paintIcon(art,key);const words=document.createElement('div');const heading=document.createElement('h3');heading.textContent=info.name+' '+level+'/'+info.max;const desc=document.createElement('small');desc.textContent=info.desc;words.append(heading,desc);const button=document.createElement('button');button.textContent=level>=info.max?'已满级':cost+' ✦';button.disabled=buyingMeta||level>=info.max||save.embers<cost;button.setAttribute('aria-label','升级'+info.name+'，消耗 '+cost+' 余烬');button.addEventListener('click',async()=>{if(buyingMeta)return;buyingMeta=true;buildMeta();const {persisted,purchased}=await saveProgress({purchase:key});buyingMeta=false;buildMeta();if(purchased){sound.init();sound.play('chest')}else{const note=persisted?'存档已更新，请按最新价格选择升级。':'浏览器暂未保存，本次购买未扣款。';text('meta-best',note);announce(note)}});row.append(art,words,button);$('meta-upgrades').append(row);
 }text('meta-best',`远征 ${save.runs} 次  ·  最长守夜 ${formatTime(save.best)}  ·  累计击败 ${save.kills.toLocaleString()}  ·  破晓 ${save.wins} 次`);
}

game.on=(event,data)=>{
 if(event==='start')start();
 if(event==='startRun'){hide('menu');hide('camp-return-note');closeOverlays();show('hud');$('event-banner').classList.remove('visible');$('toast').classList.remove('visible');document.body.classList.add('playing');text('player-name',game.character.name);paintAvatar($('hud-avatar'),game.character.id);document.activeElement?.blur();announce('远征开始。WASD 移动，空格冲刺，Esc 打开菜单。')}
 if(event==='hud')updateHud();
 if(event==='weapons'){storeItemDiscoveries(rememberInventory(save,game));buildDock()}
 if(event==='level'){resetTouchInput();buildUpgrades()}
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
 if(event==='talentTree')openTalentTree();
 if(event==='worldEvent')previewWorldEvent();
 if(event==='talentPoints')updateTalentHud();
 if(event==='talentLearned'){
  if(sheet.visible){
   const scroll=$('sheet-scroll').scrollTop;sheet.build();$('sheet-scroll').scrollTop=scroll;
   const column=$('talent-'+data).closest('.talent-branch'),next=column.querySelector('button:not(:disabled)'),tab=document.querySelectorAll('.talent-branch-tabs button')[sheet.talentBranch];
   (next||(tab.getClientRects().length?tab:column.querySelector('h4'))).focus({preventScroll:true});if(next)next.scrollIntoView({block:'nearest'});
  }
  if(game.state==='level'||sheet.visible&&sheet.origin==='level')buildUpgrades(false);
  announce('已学会角色天赋。剩余 '+talentPoints(game)+' 个天赋点。');
 }
 if(event==='itemCatalog')openItemCatalog();
 if(event==='pickup')storeItemDiscoveries(rememberItems(save,{['pickup:'+data]:1}));
 if(event==='fusionProgress')updateFusionTracker();
 if(event==='fusionDiscovered'){save.discoveredFusions=[...game.discoveredFusions];rememberInventory(save,game);recoverFusionDiscoveries(save);saveProgress().then(({persisted})=>{game.discoveryPersisted=persisted});updateDiscoveryBadges();announce('首次发现 '+WEAPONS[data].name+'，融合图谱与道具图鉴已解锁。')}
 if(event==='sound')toggleSound();
 if(event==='fullscreen')fullscreen();
 if(event==='banner'){$('event-banner').replaceChildren();const title=document.createTextNode(data.title);const subtitle=document.createElement('small');subtitle.textContent=data.subtitle;$('event-banner').append(title,subtitle);$('event-banner').classList.add('visible')}
 if(event==='bannerHide')$('event-banner').classList.remove('visible');
 if(event==='toast'){text('toast',data);$('toast').classList.add('visible')}
 if(event==='toastHide')$('toast').classList.remove('visible');
 if(event==='end'){resetTouchInput();endRun(data)}
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
$('skip-button').addEventListener('click',()=>game.skipUpgrade());
$('world-event-preview').addEventListener('click',previewWorldEvent);
$('world-event-start').addEventListener('click',previewWorldEvent);
$('hud-loadout-button').addEventListener('click',()=>openStatus({tab:'items'}));
for(const id of ['menu-status-button','status-button','pause-status-button','level-status-button','end-status-button'])$(id).addEventListener('click',()=>openStatus());
for(const id of ['fusion-tracker','level-fusion-button'])$(id).addEventListener('click',openFusionBook);
for(const id of ['menu-talents-button','hud-talents-button','level-talents-button','level-tree-button'])$(id).addEventListener('click',openTalentTree);
for(const id of ['menu-catalog-button','hud-catalog-button','pause-catalog-button','level-catalog-button','end-catalog-button'])$(id).addEventListener('click',openItemCatalog);
$('archive-button').addEventListener('click',()=>{sound.init();sound.play('select');openModal('archive-screen')});
$('meta-button').addEventListener('click',()=>{refreshSave(save);buildMeta();sound.init();sound.play('select');openModal('meta-screen')});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
for(const id of ['archive-screen','meta-screen'])$(id).addEventListener('click',e=>{if(e.target===$(id))closeModal(id)});

// Keep keyboard focus inside dialogs without interfering with gameplay shortcuts.
document.addEventListener('keydown',e=>{
 if(e.code!=='Tab')return;const active=document.querySelector('.modal-wrap:not(.hidden)');if(!active)return;const focusables=[...active.querySelectorAll('button:not(:disabled):not([tabindex="-1"]),[href],input,summary,[tabindex="0"]')].filter(element=>!element.closest('.hidden')&&element.getClientRects().length);if(!focusables.length)return;const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
});

const movementSurface=$('world'),joystick=$('joystick'),stick=joystick.querySelector('i');let activePointer=null;
function resetTouchInput(){const pointer=activePointer;activePointer=null;game.stick={x:0,y:0};stick.style.transform='';joystick.classList.remove('floating');joystick.style.left=joystick.style.top='';if(pointer!==null&&movementSurface.hasPointerCapture(pointer))movementSurface.releasePointerCapture(pointer)}
function updateJoystick(e){const box=joystick.getBoundingClientRect();let x=e.clientX-(box.left+box.width/2),y=e.clientY-(box.top+box.height/2);const d=Math.hypot(x,y),max=box.width*.34;if(d>max){x=x/d*max;y=y/d*max}game.stick={x:x/max,y:y/max};stick.style.transform=`translate(${x}px,${y}px)`}
movementSurface.addEventListener('pointerdown',e=>{
 if(activePointer!==null||game.state!=='running'||!['touch','pen'].includes(e.pointerType)||e.clientY<innerHeight/2||!joystick.getClientRects().length)return;
 e.preventDefault();activePointer=e.pointerId;joystick.style.left=e.clientX+'px';joystick.style.top=e.clientY+'px';joystick.classList.add('floating');movementSurface.setPointerCapture(e.pointerId);updateJoystick(e);
});
movementSurface.addEventListener('pointermove',e=>{if(e.pointerId===activePointer){e.preventDefault();updateJoystick(e)}});
function resetJoystick(e){if(e.pointerId===activePointer)resetTouchInput()}
for(const event of ['pointerup','pointercancel','lostpointercapture'])movementSurface.addEventListener(event,resetJoystick);
window.addEventListener('resize',resetTouchInput);
$('touch-dash').addEventListener('pointerdown',e=>{e.preventDefault();game.dash()});
$('touch-dash').addEventListener('click',()=>game.dash());

window.addEventListener('storage',event=>{
 if(event.key!=='afterlight-save-v1')return;
 refreshSave(save);if(sound.muted!==save.muted)sound.toggle();
 for(const key of save.discoveredFusions)game.discoveredFusions.add(key);
 recoverFusionDiscoveries(save);updateDiscoveryBadges();
 if(sheet.visible)sheet.build();updateFusionTracker();updateMenu();if(!$('meta-screen').classList.contains('hidden'))buildMeta();
});
if(recoverFusionDiscoveries(save).changed)saveProgress();
updateDiscoveryBadges();buildCharacters();updateMenu();
export {game};
