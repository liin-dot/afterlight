import {Game,RUN_DURATION} from './game.js';
import {Sound} from './audio.js';
import {paintIcon,paintAvatar,fire,glow,drawSprite} from './art.js';
import {CHARACTERS,WEAPONS,PASSIVES,PICKUPS,META,META_TREES,metaState,STARTING_WEAPONS,startingLoadout,formatTime,readSave,writeSave,refreshSave,catalogItem} from './data.js';
import {CharacterSheet} from './status.js';
import {FUSIONS,WEAPON_SLOTS,PASSIVE_SLOTS,maxWeaponLevel,weaponName,fusionState,ingredientData,fusionUsesRelic} from './fusions.js';
import {compatibleWeapons,relicDescription,BUILD_TAGS,itemTags,ALTAR_BOONS} from './content.js';
import {rememberItems,rememberInventory,recoverFusionDiscoveries} from './discovery.js';
import {pressureAt,itemRarity,buildProfile,upgradePool} from './balance.js';
import {characterStats,weaponStats} from './stats.js';
import {passiveEffect,resonanceText} from './item-info.js';
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
let selected=0,lastFocus=null,lastBoss=null,buyingMeta=false,settling=false,campPage='home';
let viewedWeapon=save.selectedWeapon||'default',viewedMeta='power',metaClosing=false,weaponClosing=false;
const overlays=['level-screen','reward-screen','pause-screen','end-screen','archive-screen','meta-screen','weapon-screen','status-screen'];
const touchInput=matchMedia('(pointer:coarse)');

function text(id,value){const element=$(id),next=String(value);if(element.textContent!==next)element.textContent=next}
function closeOverlays(){hideMetaDetail();hideWeaponDetail();for(const id of overlays)hide(id)}
function openModal(id){lastFocus=document.activeElement;show(id);requestAnimationFrame(()=>$(id).querySelector('button:not(:disabled)')?.focus({preventScroll:true}))}
function closeModal(id){if(id==='meta-screen')hideMetaDetail();if(id==='weapon-screen')hideWeaponDetail();hide(id);if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true})}
function openCampPage(page){
 const previous=campPage;campPage=page;
 for(const name of ['home','prepare','library'])$('camp-'+name).classList.toggle('hidden',name!==page);
 $('menu').scrollTop=0;
 (page==='prepare'?$('characters').querySelector('[aria-pressed="true"]'):page==='library'?$('menu-catalog-button'):$(previous==='library'?'camp-library-button':'play-button')).focus({preventScroll:true});
}
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
 text('menu-catalog-count',count+'/'+total);text('hud-catalog-count',count);text('menu-fusion-count',game.discoveredFusions.size+'/'+Object.keys(FUSIONS).length);
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
 const reward=game.eventReward,notice=$('event-reward-toast');notice.classList.toggle('hidden',!reward);
 if(reward){text('event-reward-toast',reward.name+' · 完成\n'+reward.rewards.join(' · '));notice.style.opacity=Math.min(1,Math.max(0,reward.expiresAt-game.time))}
 const event=worldEventStatus(game),card=$('world-event-card'),visible=event.visible;card.classList.toggle('hidden',!visible);
 const button=$('world-event-start'),host=touchInput.matches?$('touch-controls'):card.querySelector('.world-event-heading');
 if(button.parentElement!==host)host.append(button);
 button.classList.toggle('hidden',!event.canStart);button.disabled=!event.canStart;
 if(!visible)return;
 text('world-event-name',event.name);text('world-event-detail',event.detail);text('world-event-reward','奖励：'+event.reward);
 button.setAttribute('aria-label','接受任务：'+event.name);card.classList.toggle('active',event.active);
 const meter=$('world-event-meter');meter.classList.toggle('hidden',!event.active);meter.max=event.max||1;meter.value=event.progress||0;meter.setAttribute('aria-label',event.name+' · '+event.detail);
}

function buildCharacters(){
 $('characters').replaceChildren();
 CHARACTERS.forEach((character,index)=>{
  const b=document.createElement('button');b.className='character-card'+(selected===index?' active':'');b.setAttribute('aria-pressed',String(selected===index));b.setAttribute('aria-label',character.name+'：'+character.description.replace(/<[^>]*>/g,''));
  const portrait=document.createElement('canvas');portrait.width=32;portrait.height=44;paintAvatar(portrait,character.id);
  const label=document.createElement('span');const strong=document.createElement('strong');strong.textContent=character.name;const small=document.createElement('small');small.textContent=character.english;label.append(strong,small);b.append(portrait,label);
  b.addEventListener('click',()=>{selected=index;game.character=character;buildCharacters();$('characters').children[index].focus({preventScroll:true});sound.init();sound.play('select')});$('characters').append(b);
 });
 text('character-tag',CHARACTERS[selected].tag);updatePreparation();
 const innate=CHARACTER_TALENTS[CHARACTERS[selected].id];text('menu-innate-name',innate.name);text('menu-innate-description',innate.hint);$('menu-talents-button').style.setProperty('--talent-color',innate.color);paintIcon($('menu-innate-icon'),innate.icon);
}
function updatePreparation(){
 const character=CHARACTERS[selected],loadout=startingLoadout(character,save),weapon=Object.keys(loadout.weapons)[0];
 $('character-description').innerHTML=character.description.replace(WEAPONS[character.weapon].name,WEAPONS[weapon].name);
 text('camp-weapon-label',WEAPONS[weapon].name+' · LV.1');
 text('camp-start-context',character.name+' · '+WEAPONS[weapon].name+'起手');
}
function updateMenu(){
 text('meta-count',save.embers.toLocaleString()+' ✦');
 updatePreparation();
 text('sound-icon',sound.muted?'♪̸':'♫');$('sound-button').setAttribute('aria-label',sound.muted?'开启声音':'关闭声音');$('sound-button').setAttribute('aria-pressed',String(!sound.muted));
}
function start(){if(settling||game.state!=='menu'&&game.state!=='over')return;refreshSave(save);resetTouchInput();closeOverlays();sound.init();sound.play('select');game.start(CHARACTERS[selected],save.meta,save)}
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
function buildAltarRewards(){
 $('altar-choices').replaceChildren(...game.eventChoices.map((id,index)=>{
  const boon=ALTAR_BOONS[id],button=document.createElement('button');button.className='altar-choice';
  const icon=document.createElement('canvas');icon.width=icon.height=24;icon.setAttribute('aria-hidden','true');paintIcon(icon,boon.icon);
  const heading=document.createElement('h3'),gain=document.createElement('p'),cost=document.createElement('p');heading.textContent=(index+1)+' · '+boon.name;gain.className='altar-gain';gain.textContent='收益 · '+boon.positive;cost.className='altar-cost';cost.textContent='代价 · '+boon.negative;
  button.append(icon,heading,gain,cost);button.addEventListener('click',()=>game.chooseAltarReward(index));return button;
 }));
 const canUpgrade=upgradePool(game).some(item=>item.weapon&&item.current>0);
 text('altar-skip',canUpgrade?'跳过 · 随机强化一件武器 1 级':'跳过 · 随机淬炼一件武器（伤害 +12%）');
 openModal('reward-screen');announce('祭坛挑战完成。选择一项特殊奖励，或跳过并强化武器。');
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
  let resonance=null;
  if(!item.fusion&&item.key!=='heal'){
   const weapons={...game.weapons,...(item.weapon?{[item.key]:item.next}:{})},passives={...game.passives,...(!item.weapon?{[item.key]:item.next}:{})},stats=characterStats(game.character,passives,game.meta,game.talents,weapons,game.boons,game.weaponEmpowerments,game.metaBuffs,game.growth);
   for(const [kind,level] of Object.entries(weapons)){const after=weaponStats(kind,level,stats,game.character),before=game.weapons[kind]?weaponStats(kind,game.weapons[kind],game.stats,game.character):null;if((after.resonance?.rank||0)>(before?.resonance?.rank||0)){resonance=after;break}}
  }
  const button=document.createElement('button');button.className='upgrade-card'+(item.evolution?' evolution':'')+(item.fusion?' fusion-card':'')+(goal?' tracked-material':'')+(relic?' relic-card':!item.weapon&&PASSIVES[item.key]?' blessing-card':'');button.style.setProperty('--card-color',item.color);
  const rarity=document.createElement('div');rarity.className='rarity';const type=document.createElement('span');type.textContent=item.fusion?(unknown?'◇ 首次共鸣 · 未知融合':fusionUsesRelic(item.key)?'◆ 武器与道具融合':'◆ 双武器融合'):goal?'◇ 已追踪的融合材料':fusedUpgrade?'◆ 融合武器强化':item.evolution?'✦ 传说 · 武器进化':itemRarity(item.weapon?WEAPONS[item.key]:PASSIVES[item.key]).name+' · '+(item.weapon?(item.current?'武器强化':'全新武器'):relic?'联动遗物':'属性祝福');const key=document.createElement('kbd');key.textContent=index+1;rarity.append(type,key);
  if(resonance)type.textContent='✦ 解锁共振'+(resonance.resonance.rank===2?'Ⅱ':'Ⅰ')+' · '+resonance.resonance.name;
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
   const broad=PASSIVES[item.key].families.some(tag=>['guard','dash','pickup'].includes(tag)),companion=item.key==='soulpact'&&game.talents.s_swarm1;
   note.textContent=(companion?'当前联动：星群伴星'+(linked.length?'、'+linked.map(id=>WEAPONS[id].name).join('、'):''):linked.length?(broad?'触发方式：'+PASSIVES[item.key].trigger:'当前联动：'+linked.map(id=>WEAPONS[id].name).join('、')):'尚缺稳定触发来源')+(PASSIVES[item.key].catalyst?' · 可作为融合材料':'');note.dataset.compact=linked.length||companion?'联动已就绪':'尚缺触发来源';if(!resonance)button.append(note);
  }
  if(resonance){const note=document.createElement('div');note.className='relic-card-link';note.textContent=resonanceText(resonance);note.dataset.compact='间隔 −'+resonance.resonance.rank*15+'% · 范围 +'+resonance.resonance.rank*20+'%';button.append(note)}
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
 text('pause-context',game.pauseReturn==='reward'?'祭坛奖励选择已保留，返回后继续选择。':game.pauseReturn==='level'?'升级选择已保留，返回后继续选择。':(game.pressure||pressureAt(game.time)).hint+' · 下一场 '+$('next-encounter').textContent+(game.stats.curse?' · 禁忌 '+game.stats.curse:''));
 updateEventHud();
 text('resume-label',game.pauseReturn==='reward'?'返回祭坛奖励':game.pauseReturn==='level'?'返回升级选择':'继续守夜');
 text('pause-reward','本局可结算 +'+game.earnedEmbers.toLocaleString()+' 余烬');
 text('restart-description','使用'+game.character.name+'，从 00:00 / LV.1 重开');
}
async function endRun(result){
 hide('hud');hide('pause-screen');hide('level-screen');hide('reward-screen');settling=true;refreshSave(save);const record=result.time>save.best;const {persisted}=await saveProgress({result});settling=false;

 if(result.destination==='restart'){
  selected=Math.max(0,CHARACTERS.findIndex(character=>character.id===game.character.id));
  updateMenu();start();
  game.toast('已重新开始 · 上局结算 +'+result.reward+' 余烬'+(persisted?'':' · 浏览器暂未保存'),4);
  return;
 }
 if(result.destination==='camp'){
  game.returnToMenu();
  text('camp-return-note','远征已结束 · +'+result.reward+' 余烬'+(persisted?' · 已保存':' · 暂存于本页'));
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
 const reopen=$('meta-detail').matches(':popover-open');hideMetaDetail();
 text('ember-balance',save.embers.toLocaleString());$('meta-upgrades').replaceChildren(...META_TREES.map(tree=>{
  const row=document.createElement('section');row.className='meta-tree';row.setAttribute('aria-label',tree.name+'成长树');
  const heading=document.createElement('h3');heading.textContent=tree.name;const hint=document.createElement('small');hint.textContent=tree.hint;heading.append(hint);row.append(heading);
  for(const [index,key] of tree.nodes.entries()){
   const info=META[key],state=metaState(save.meta,key),button=document.createElement('button');button.className='meta-node'+(state.maxed?' learned':state.prerequisite?' locked':' available');button.dataset.meta=key;
   button.setAttribute('aria-label',info.name+' · '+state.level+'/'+info.max+(state.prerequisite?' · 需先满级'+META[state.prerequisite].name:''));button.setAttribute('aria-controls','meta-detail');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');
   const icon=document.createElement('canvas');icon.width=icon.height=24;icon.setAttribute('aria-hidden','true');paintIcon(icon,info.icon);const rank=document.createElement('small');rank.textContent=state.level+'/'+info.max;button.append(icon,rank);
   button.addEventListener('click',event=>{showMetaDetail(key);if(event.detail===0)($('meta-buy').disabled?$('meta-detail-close'):$('meta-buy')).focus({preventScroll:true})});button.addEventListener('focus',()=>showMetaDetail(key));button.addEventListener('pointermove',event=>{if(event.pointerType==='mouse'&&button.getAttribute('aria-expanded')!=='true')showMetaDetail(key)});
   button.addEventListener('keydown',event=>{const step={ArrowLeft:-1,ArrowRight:1}[event.code];if(!step)return;event.preventDefault();row.querySelectorAll('button')[(index+step+tree.nodes.length)%tree.nodes.length].focus({preventScroll:true})});row.append(button);
  }return row;
 }));
 if(reopen&&!$('meta-screen').classList.contains('hidden'))showMetaDetail(viewedMeta);
 text('meta-best',`远征 ${save.runs} 次  ·  最长守夜 ${formatTime(save.best)}  ·  累计击败 ${save.kills.toLocaleString()}  ·  破晓 ${save.wins} 次`);
}
function hideMetaDetail(focus=false){
 const bubble=$('meta-detail');if(!bubble.matches(':popover-open'))return;metaClosing=true;bubble.hidePopover();if(focus)document.querySelector('[data-meta="'+viewedMeta+'"]').focus({preventScroll:true});metaClosing=false;
}
function showMetaDetail(key){
 if(metaClosing||$('meta-screen').classList.contains('hidden'))return;
 viewedMeta=key;const info=META[key],state=metaState(save.meta,key),button=document.querySelector('[data-meta="'+key+'"]');
 for(const node of document.querySelectorAll('#meta-upgrades .meta-node')){node.classList.toggle('selected',node===button);node.setAttribute('aria-expanded',String(node===button))}
 text('meta-detail-title',info.name+' · '+state.level+' / '+info.max);text('meta-detail-effect',info.desc);
 text('meta-detail-state',state.maxed?'已达最高等级':state.prerequisite?'前置「'+META[state.prerequisite].name+'」满级后开放':save.embers<state.cost?'还差 '+(state.cost-save.embers).toLocaleString()+' 余烬':'可强化 · 下次出征生效');
 $('meta-buy').disabled=buyingMeta||!state.available||save.embers<state.cost;text('meta-buy',state.maxed?'已满级':'强化 '+state.cost.toLocaleString()+' ✦');
 if(!$('meta-detail').matches(':popover-open'))$('meta-detail').showPopover();sheet.positionBubble($('meta-detail'),button);
}
function buildWeaponChoices(){
 const reopen=$('weapon-detail').matches(':popover-open');hideWeaponDetail();text('weapon-balance',save.embers.toLocaleString());
 $('weapon-choices').replaceChildren(...['default',...Object.keys(STARTING_WEAPONS)].map((key,index,keys)=>{
  const unlocked=key==='default'||save.weaponUnlocks.includes(key),equipped=save.selectedWeapon===(key==='default'?null:key),name=WEAPONS[key==='default'?CHARACTERS[selected].weapon:key].name;
  const button=document.createElement('button');button.className='meta-node'+(equipped?' learned':unlocked?' available':' locked');button.dataset.starter=key;button.setAttribute('aria-label',(key==='default'?'角色默认 · ':'')+name+' · '+(equipped?'已选择':unlocked?'已解锁':STARTING_WEAPONS[key].cost+' 余烬'));button.setAttribute('aria-pressed',String(equipped));button.setAttribute('aria-controls','weapon-detail');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');
  const icon=document.createElement('canvas');icon.width=icon.height=24;icon.setAttribute('aria-hidden','true');paintIcon(icon,key==='default'?CHARACTERS[selected].weapon:key);const state=document.createElement('small');state.textContent=equipped?'已选择':key==='default'?'默认':unlocked?'已解锁':STARTING_WEAPONS[key].cost+' ✦';button.append(icon,state);
  button.addEventListener('click',event=>{showWeaponDetail(key);if(event.detail===0)($('weapon-buy').disabled?$('weapon-equip').disabled?$('weapon-detail-close'):$('weapon-equip'):$('weapon-buy')).focus({preventScroll:true})});button.addEventListener('focus',()=>showWeaponDetail(key));button.addEventListener('pointermove',event=>{if(event.pointerType==='mouse'&&button.getAttribute('aria-expanded')!=='true')showWeaponDetail(key)});
  button.addEventListener('keydown',event=>{const columns=getComputedStyle($('weapon-choices')).gridTemplateColumns.split(' ').length,step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[event.code];if(!step)return;event.preventDefault();$('weapon-choices').children[(index+step+keys.length)%keys.length].focus({preventScroll:true})});return button;
 }));
 if(reopen&&!$('weapon-screen').classList.contains('hidden'))showWeaponDetail(viewedWeapon);
}
function hideWeaponDetail(focus=false){
 const bubble=$('weapon-detail');if(!bubble.matches(':popover-open'))return;weaponClosing=true;bubble.hidePopover();if(focus)document.querySelector('[data-starter="'+viewedWeapon+'"]').focus({preventScroll:true});weaponClosing=false;
}
function showWeaponDetail(key){
 if(weaponClosing||$('weapon-screen').classList.contains('hidden'))return;
 viewedWeapon=key;
 const button=document.querySelector('[data-starter="'+key+'"]');for(const node of $('weapon-choices').children){node.classList.toggle('selected',node===button);node.setAttribute('aria-expanded',String(node===button))}
 const info=STARTING_WEAPONS[key],unlocked=key==='default'||save.weaponUnlocks.includes(key),equipped=save.selectedWeapon===(key==='default'?null:key),weapon=WEAPONS[key==='default'?CHARACTERS[selected].weapon:key];
 text('weapon-detail-title',weapon.name+(key==='default'?' · 默认':''));text('weapon-description',weapon.desc);
 text('weapon-status',unlocked?'出征携带这一件 LV.1 武器。':save.embers<info.cost?'还差 '+(info.cost-save.embers).toLocaleString()+' 余烬':'解锁后所有角色均可使用');
 $('weapon-buy').disabled=buyingMeta||unlocked||save.embers<info.cost;text('weapon-buy',unlocked?'已解锁':'解锁 '+info.cost+' ✦');
 $('weapon-equip').disabled=buyingMeta||!unlocked;text('weapon-equip',equipped?'已选择':'选择起手');$('weapon-equip').setAttribute('aria-pressed',String(equipped));
 if(!$('weapon-detail').matches(':popover-open'))$('weapon-detail').showPopover();sheet.positionBubble($('weapon-detail'),button);
}
function openMeta(){refreshSave(save);updateMenu();buildMeta();text('meta-feedback','');sound.init();sound.play('select');openModal('meta-screen')}
function openWeaponChoices(){refreshSave(save);viewedWeapon=save.selectedWeapon||'default';buildWeaponChoices();text('weapon-feedback','');sound.init();sound.play('select');openModal('weapon-screen')}
async function saveWeapon(change){
 if(buyingMeta)return;buyingMeta=true;buildWeaponChoices();text('weapon-feedback','正在保存…');
 const result=await saveProgress(change);buyingMeta=false;buildWeaponChoices();
 text('weapon-feedback',!result.persisted?'浏览器暂未保存，本次操作未生效。':result.unlocked?'武器已解锁，可选择为开局武器。':result.selected?'起手武器已保存，下次出征生效。':'余额或解锁状态已更新。');
 if(!$('weapon-screen').classList.contains('hidden')){showWeaponDetail(viewedWeapon);($('weapon-equip').disabled?$('weapon-buy'):$('weapon-equip')).focus({preventScroll:true})}
}

game.on=(event,data)=>{
 if(event==='start')openCampPage('prepare');
 if(event==='startRun'){hide('menu');hide('camp-return-note');closeOverlays();show('hud');$('event-banner').classList.remove('visible');$('toast').classList.remove('visible');document.body.classList.add('playing');text('player-name',game.character.name);paintAvatar($('hud-avatar'),game.character.id);document.activeElement?.blur();announce('远征开始。WASD 移动，空格冲刺，Esc 打开菜单。')}
 if(event==='hud')updateHud();
 if(event==='weapons'){storeItemDiscoveries(rememberInventory(save,game));buildDock()}
 if(event==='level'){resetTouchInput();buildUpgrades()}
 if(event==='upgrade'){hide('level-screen');document.activeElement?.blur()}
 if(event==='choose')game.chooseUpgrade(data);
 if(event==='pause'){resetTouchInput();hide('level-screen');hide('reward-screen');pauseStats();openModal('pause-screen')}
 if(event==='resume'){
  hide('pause-screen');resetTouchInput();
  if(data==='level'){show('level-screen');requestAnimationFrame(()=>$('upgrade-cards').querySelector('button')?.focus({preventScroll:true}))}
  else if(data==='reward')buildAltarRewards();
  else document.activeElement?.blur();
 }
 if(event==='restartRun')finishRun('restart');
 if(event==='quitRun')finishRun('camp');
 if(event==='status')openStatus();
 if(event==='closeStatus')sheet.close();
 if(event==='fusionBook')openFusionBook();
 if(event==='talentTree')openTalentTree();
 if(event==='talentPoints')updateTalentHud();
 if(event==='talentLearned'){
  if(sheet.visible){
   sheet.build();$('talent-'+data).focus({preventScroll:true});
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
 if(event==='altarReward'){resetTouchInput();buildAltarRewards()}
 if(event==='altarChosen'){hide('reward-screen');document.activeElement?.blur();announce('已获得：'+game.eventReward.rewards.join('；'))}
 if(event==='end'){resetTouchInput();endRun(data)}
 if(event==='menu'){resetTouchInput();closeOverlays();hide('hud');show('menu');document.body.classList.remove('playing');updateMenu();openCampPage('home')}
 if(event==='closeMenuModal'){const modal=['archive-screen','meta-screen','weapon-screen'].find(id=>!$(id).classList.contains('hidden'));if(modal)closeModal(modal);else if(campPage!=='home')openCampPage('home')}
};

$('start-button').addEventListener('click',start);
$('altar-skip').addEventListener('click',()=>game.chooseAltarReward(-1));
$('altar-menu').addEventListener('click',()=>game.pause());
$('altar-status').addEventListener('click',()=>openStatus({tab:'items'}));
document.querySelectorAll('[data-camp-target]').forEach(button=>button.addEventListener('click',()=>{openCampPage(button.dataset.campTarget);sound.init();sound.play('select')}));
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
for(const type of ['pointerdown','click'])$('world-event-start').addEventListener(type,e=>{
 const touch=e.pointerType==='touch'||e.pointerType==='pen';if((type==='pointerdown')!==touch)return;
 // Touch responds on press while another finger moves; its later click must not act twice.
 e.preventDefault();game.interact();updateEventHud();
});
$('hud-loadout-button').addEventListener('click',()=>openStatus({tab:'items'}));
for(const id of ['menu-status-button','status-button','pause-status-button','level-status-button','end-status-button'])$(id).addEventListener('click',()=>openStatus());
for(const id of ['menu-fusion-button','fusion-tracker','level-fusion-button'])$(id).addEventListener('click',openFusionBook);
for(const id of ['menu-talents-button','hud-talents-button','level-talents-button','level-tree-button'])$(id).addEventListener('click',openTalentTree);
for(const id of ['menu-catalog-button','hud-catalog-button','pause-catalog-button','level-catalog-button','end-catalog-button'])$(id).addEventListener('click',openItemCatalog);
$('archive-button').addEventListener('click',()=>{sound.init();sound.play('select');openModal('archive-screen')});
$('meta-button').addEventListener('click',()=>openMeta());
$('camp-weapon-button').addEventListener('click',openWeaponChoices);
$('meta-detail-close').addEventListener('click',()=>hideMetaDetail(true));
$('meta-detail').addEventListener('beforetoggle',event=>{if(event.newState==='closed')for(const button of document.querySelectorAll('#meta-upgrades .meta-node')){button.classList.remove('selected');button.setAttribute('aria-expanded','false')}});
$('meta-screen').addEventListener('keydown',event=>{if(event.code==='Escape'&&$('meta-detail').matches(':popover-open')){event.preventDefault();event.stopPropagation();hideMetaDetail(true)}});
window.addEventListener('resize',()=>{hideMetaDetail();hideWeaponDetail()});
$('meta-buy').addEventListener('click',async()=>{
 if(buyingMeta)return;const key=viewedMeta,level=save.meta[key];buyingMeta=true;text('meta-feedback','正在保存强化…');showMetaDetail(key);
 const {persisted,purchased}=await saveProgress({purchase:key,metaLevel:level});buyingMeta=false;buildMeta();
 text('meta-feedback',purchased?META[key].name+'已强化至 '+save.meta[key]+' 级，下次出征生效。':persisted?'前置、等级或余额已更新，请查看当前条件。':'浏览器暂未保存，本次购买未扣款。');
 if(purchased){sound.init();sound.play('chest')}
 if(!$('meta-screen').classList.contains('hidden')){showMetaDetail(key);($('meta-buy').disabled?$('meta-detail-close'):$('meta-buy')).focus({preventScroll:true})}
});
$('weapon-detail-close').addEventListener('click',()=>hideWeaponDetail(true));
$('weapon-detail').addEventListener('beforetoggle',event=>{if(event.newState==='closed')for(const button of $('weapon-choices').children){button.classList.remove('selected');button.setAttribute('aria-expanded','false')}});
$('weapon-screen').addEventListener('keydown',event=>{if(event.code==='Escape'&&$('weapon-detail').matches(':popover-open')){event.preventDefault();event.stopPropagation();hideWeaponDetail(true)}});
$('weapon-buy').addEventListener('click',()=>saveWeapon({unlockWeapon:viewedWeapon}));
$('weapon-equip').addEventListener('click',()=>saveWeapon({selectWeapon:viewedWeapon==='default'?null:viewedWeapon}));

document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
for(const id of ['archive-screen','meta-screen','weapon-screen'])$(id).addEventListener('click',e=>{if(e.target===$(id))closeModal(id)});
sheet.mobilePages(document.querySelector('.guide-grid'),'选择手记主题',[...document.querySelectorAll('.guide-grid article')].map((article,i)=>[String(i),article.querySelector('h3').textContent,[article]]));
sheet.mobilePages($('end-report'),'选择结算内容',[['summary','远征概览',[$('end-stats')]],['damage','战斗记录',[$('end-damage')]]]);

// Keep keyboard focus inside dialogs without interfering with gameplay shortcuts.
document.addEventListener('keydown',e=>{
 if(e.code!=='Tab')return;const active=document.querySelector('.modal-wrap:not(.hidden)');if(!active)return;const focusables=[...active.querySelectorAll('button:not(:disabled):not([tabindex="-1"]),[href],input,select,summary,[tabindex="0"]')].filter(element=>!element.closest('.hidden')&&element.getClientRects().length);if(!focusables.length)return;const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
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
 if(sheet.visible)sheet.build();updateFusionTracker();updateMenu();if(!$('meta-screen').classList.contains('hidden'))buildMeta();if(!$('weapon-screen').classList.contains('hidden'))buildWeaponChoices();
});
if(recoverFusionDiscoveries(save).changed)saveProgress();
updateDiscoveryBadges();buildCharacters();updateMenu();
export {game};
