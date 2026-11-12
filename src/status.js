import {paintAvatar, paintIcon} from './art.js';
import {WEAPONS, PASSIVES, META, formatTime,catalogItem} from './data.js';
import {characterStats, weaponStats} from './stats.js';
import {FUSIONS,WEAPON_SLOTS,PASSIVE_SLOTS,maxWeaponLevel,weaponName,fusionState,ingredientData} from './fusions.js';
import {relicDescription,compatibleWeapons} from './content.js';
import {passiveEffect,weaponFacts} from './item-info.js';
import {ItemCatalog,itemArt,effectText} from './catalog.js';
import {CHARACTER_TALENTS,TALENT_LEVELS,talentPoints,talentNodeState,characterTalentStatus,characterTalentSummary} from './talents.js';

const $ = id => document.getElementById(id);
const number = (value, digits = 1) => Number(value.toFixed(digits)).toLocaleString('zh-CN', {maximumFractionDigits: digits});
const percent = value => number(value * 100) + '%';
const seconds = value => number(value, 2) + ' 秒';
const put = (id, value) => { $(id).textContent = value; };
function node(tag, className, content) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== undefined) element.textContent = content;
  return element;
}
function artwork(key) {
  const art = node('canvas');
  art.width = art.height = 24;
  art.setAttribute('aria-hidden', 'true');
  paintIcon(art, key);
  return art;
}
function source(parts) { return parts.filter(Boolean).join(' · '); }



export class CharacterSheet {
  constructor(game, save, sound) {
    this.game = game;
    this.save = save;
    this.sound = sound;
    this.visible = false;
    this.tab = 'attributes';
    this.tabs = ['attributes', 'talents', 'items', 'fusion', 'catalog'];
    this.catalog=new ItemCatalog(this);
    this.mobile=matchMedia('(max-width:700px),(max-height:500px)');
    for(const tab of ['items','fusion']){
      const root=$('sheet-'+tab);
      root.querySelector('.collection-category')?.addEventListener('change',()=>{root.dataset.page=0;root.dataset.selected='';this.renderCollection(tab)});
      for(const [selector,step] of [['.collection-prev',-1],['.collection-next',1]])root.querySelector(selector).addEventListener('click',()=>{root.dataset.page=Number(root.dataset.page||0)+step;this.renderCollection(tab);root.querySelector('.catalog-item')?.focus({preventScroll:true})});
      root.querySelector('.catalog-back').addEventListener('click',()=>this.backCollection(tab));
      root.querySelector('.catalog-detail').addEventListener('keydown',event=>{if(event.code==='Escape'){event.preventDefault();event.stopPropagation();this.backCollection(tab)}});
    }
    $('sheet-close').addEventListener('click', () => this.close());
    $('sheet-return').addEventListener('click', () => this.close());
    // The backdrop intentionally does not dismiss the sheet during combat.
    for (const [index, tab] of this.tabs.entries()) {
      const button = $('sheet-tab-' + tab);
      button.addEventListener('click', () => this.selectTab(tab));
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.code)) return;
        event.preventDefault();
        const next = event.code === 'Home' ? 0 : event.code === 'End' ? this.tabs.length - 1 : (index + (event.code === 'ArrowRight' ? 1 : -1) + this.tabs.length) % this.tabs.length;
        this.selectTab(this.tabs[next]);
        $('sheet-tab-' + this.tabs[next]).focus({preventScroll: true});
      });
    }
  }

  open({tab = 'attributes', weapon = null} = {}) {
    if (this.visible || !['menu', 'running', 'paused', 'level', 'over'].includes(this.game.state)) return false;
    const modal = document.querySelector('.modal-wrap:not(.hidden)');
    if (modal && !['pause-screen', 'level-screen', 'end-screen'].includes(modal.id)) return false;
    this.origin = this.game.state;
    this.previousFocus = document.activeElement;
    this.previousModal = modal;
    if (modal) modal.classList.add('hidden');
    this.visible = true;
    this.game.statusReturn = this.origin;
    this.game.state = 'status';
    this.game.keys.clear();
    this.game.stick = {x: 0, y: 0};
    this.catalog.selected=null;
    for(const tab of ['items','fusion'])$('sheet-'+tab).dataset.selected='';
    this.inertStates = [...$('app').children].filter(element => !['status-screen', 'announcer'].includes(element.id)).map(element => [element, element.inert]);
    for (const [element] of this.inertStates) element.inert = true;
    this.build();
    this.selectTab(tab);
    $('status-screen').classList.remove('hidden');
    this.sound.init();
    this.sound.play('select');
    put('announcer', '角色状态已打开。角色属性与道具效果可切换，按 C 或 Esc 返回。');
    $('sheet-tab-' + this.tab).focus({preventScroll: true});
    if (weapon) {
      const card = $('sheet-weapon-' + weapon);
      if (card) this.reveal(card);
    }
    return true;
  }

  close() {
    if (!this.visible) return;
    this.visible = false;
    $('status-screen').classList.add('hidden');
    for (const [element, wasInert] of this.inertStates) element.inert = wasInert;
    this.game.state = this.origin;
    this.game.statusReturn = null;
    this.game.keys.clear();
    this.game.stick = {x: 0, y: 0};
    if (this.previousModal) this.previousModal.classList.remove('hidden');
    if (this.origin === 'running') document.activeElement?.blur();
    else if (this.previousFocus?.isConnected && !this.previousFocus.closest('.hidden')) this.previousFocus.focus({preventScroll: true});
    this.sound.play('select');
    put('announcer', this.origin === 'running' ? '已关闭角色状态，继续守夜。' : '已返回原界面。');
  }

  selectTab(tab) {
    this.tab = this.tabs.includes(tab) ? tab : 'attributes';
    for (const key of this.tabs) {
      const active = key === this.tab;
      $('sheet-tab-' + key).setAttribute('aria-selected', String(active));
      $('sheet-tab-' + key).tabIndex = active ? 0 : -1;
      $('sheet-' + key).classList.toggle('hidden', !active);
    }
    $('sheet-scroll').scrollTop = 0;
    $('status-screen').classList.toggle('collection-mode',['items','fusion','catalog'].includes(this.tab));
    $('status-screen').classList.toggle('talent-mode',this.tab==='talents');
    put('sheet-title',({catalog:'道具图鉴',items:this.origin==='menu'?'装备预览':'本局装备',fusion:'融合图谱',talents:'角色天赋'})[this.tab]||'角色状态');
  }

  mobilePages(root, label, entries) {
    entries=entries.filter(([,,elements])=>elements.length);
    root.querySelector(':scope > .mobile-pages-picker')?.remove();
    if(!entries.length)return;
    const picker=node('select','mobile-picker mobile-pages-picker');picker.setAttribute('aria-label',label);
    for(const [id,title,elements] of entries){
      const option=node('option','',title);option.value=id;picker.append(option);
      for(const element of elements){element.classList.add('mobile-page');element.mobilePage={root,id}}
    }
    root.showMobilePage=id=>{
      root.dataset.mobilePage=id;picker.value=id;
      for(const [key,,elements] of entries)for(const element of elements)element.classList.toggle('mobile-selected',key===id);
    };
    picker.addEventListener('change',()=>root.showMobilePage(picker.value));root.prepend(picker);
    root.showMobilePage(entries.some(([id])=>id===root.dataset.mobilePage)?root.dataset.mobilePage:entries[0][0]);
  }

  reveal(element) {
    if(!element)return;
    const collection=element.closest('#sheet-items,#sheet-fusion');
    if(collection){collection.dataset.selected=element.id;collection.dataset.lastSelected=element.id;this.renderCollection(collection.id.slice(6));collection.querySelector('.catalog-back').focus({preventScroll:true});return}
    for(let current=element;current;current=current.parentElement)if(current.mobilePage){const {root,id}=current.mobilePage;root.showMobilePage(id)}
    element.scrollIntoView({block:'nearest'});
  }

  renderCollection(tab) {
    const root=$('sheet-'+tab),cards=[...root.querySelector('.collection-cards').children];
    if(!cards.length)return;
    const category=root.querySelector('.collection-category')?.value||'all';
    const entries=cards.filter(card=>tab==='fusion'||category==='all'||card.dataset.category===category);
    const selected=cards.find(card=>card.id===root.dataset.selected);
    root.querySelector('.catalog-browser').classList.toggle('hidden',!!selected);root.querySelector('.catalog-detail').classList.toggle('hidden',!selected);
    for(const card of cards)card.classList.toggle('hidden',card!==selected);
    const size=this.catalog.pageSize,pages=Math.max(1,Math.ceil(entries.length/size)),page=Math.max(0,Math.min(Number(root.dataset.page||0),pages-1));root.dataset.page=page;
    root.querySelector('.catalog-list').replaceChildren(...entries.slice(page*size,(page+1)*size).map(card=>{
      const title=card.querySelector('h4').textContent,button=node('button','catalog-item'+(root.dataset.lastSelected===card.id||card.classList.contains('tracked')?' selected':''));
      button.dataset.itemId=card.id;button.title=title;button.setAttribute('aria-controls',tab+'-detail');
      const icon=card.querySelector('.detail-art canvas');
      if(icon){const canvas=node('canvas');canvas.width=canvas.height=24;canvas.setAttribute('aria-hidden','true');canvas.getContext('2d').drawImage(icon,0,0);button.append(canvas)}else button.append(node('span','sealed-icon','?'));
      button.append(node('strong','',title));
      if(card.dataset.badge)button.append(node('small','tile-badge',card.dataset.badge));
      button.addEventListener('click',()=>this.reveal(card));return button;
    }));
    root.querySelector('.collection-prev').disabled=page===0;root.querySelector('.collection-next').disabled=page===pages-1;
    root.querySelector('.collection-page').textContent=(page+1)+' / '+pages;root.querySelector('.catalog-pagination').classList.toggle('hidden',!entries.length);root.querySelector('.catalog-empty').classList.toggle('hidden',!!entries.length);
    $('sheet-scroll').scrollTop=0;
  }

  backCollection(tab) {
    const root=$('sheet-'+tab),id=root.dataset.selected,card=document.getElementById(id),picker=root.querySelector('.collection-category');
    if(picker&&card&&picker.value!=='all'&&picker.value!==card.dataset.category)picker.value=card.dataset.category;
    root.dataset.selected='';
    const entries=[...root.querySelector('.collection-cards').children].filter(card=>!picker||picker.value==='all'||card.dataset.category===picker.value);
    root.dataset.page=Math.max(0,Math.floor(entries.indexOf(card)/this.catalog.pageSize));this.renderCollection(tab);
    [...root.querySelector('.catalog-list').children].find(button=>button.dataset.itemId===id)?.focus({preventScroll:true});
  }

  build() {
    const preview = this.origin === 'menu';
    const game = this.game, character = game.character;
    // Runs retain the altar bonuses they started with; the camp previews the next run.
    const meta = preview ? this.save.meta : game.meta;
    const passives = preview ? {} : game.passives;
    const weapons = preview ? {[character.weapon]: 1} : game.weapons;
    const stats = preview ? characterStats(character, passives, meta) : game.stats;
    const hp = preview ? stats.maxHp : Math.max(0, game.player.hp);
    const maxHp = preview ? stats.maxHp : game.player.maxHp;
    const xp = preview ? 0 : game.xp, nextXp = preview ? 8 : game.xpNext;
    paintAvatar($('sheet-avatar'), character.id);
    put('sheet-name', character.name);
    put('sheet-level', 'LV. ' + (preview ? 1 : game.level));
    put('sheet-lore', character.lore);
    put('sheet-talent', character.description.replace(/<[^>]*>/g, ''));
    put('sheet-health', number(hp) + ' / ' + maxHp);
    put('sheet-xp', number(xp) + ' / ' + nextXp);
    $('sheet-health-fill').style.width = Math.min(100, hp / maxHp * 100) + '%';
    $('sheet-xp-fill').style.width = Math.min(100, xp / nextXp * 100) + '%';
    put('sheet-context', preview ? '出征预览 · 已计入永久成长' : this.origin === 'over' ? '本局最终状态 · 远征已经结束' : this.origin === 'level' ? '升级选择已保留 · 战斗暂停中' : '战斗暂停中 · 从容查看你的成长');
    put('sheet-run', preview ? '起始武器 · ' + WEAPONS[character.weapon].name : formatTime(game.time) + ' 守夜 · ' + game.kills.toLocaleString() + ' 击败 · ' + game.gold.toLocaleString() + ' 余烬');
    put('sheet-return', ({menu: '返回营地 ↗', running: '继续守夜 ↗', paused: '返回暂停界面 ↗', level: '返回升级选择 ↗', over: '返回远征结算 ↗'})[this.origin]);
    $('sheet-menu-button').classList.toggle('hidden',!['running','paused','level'].includes(this.origin));
    put('sheet-meta-note', preview ? '下次出征生效' : '本次出征时的祭坛加成');
    put('sheet-item-count', Object.keys(weapons).length + Object.keys(passives).length);
    put('sheet-items-label',preview?'装备预览':'本局装备');
    this.buildAttributes(character, stats, passives, meta, preview);
    this.buildTalents(character,preview);
    put('sheet-build-summary',`武器 ${Object.keys(weapons).length} / ${WEAPON_SLOTS} · 道具 ${Object.keys(passives).length} / ${PASSIVE_SLOTS}`);
    $('sheet-items').querySelector('.collection-cards').replaceChildren(...this.buildWeapons(character,stats,weapons),...this.buildPassives(passives,stats,weapons));
    this.renderCollection('items');
    this.buildMeta(meta);
    const attributes=[...$('sheet-stat-grid').children],groups=[];
    for(let i=0;i<attributes.length;i+=4)groups.push(['stats-'+i,'角色属性 · '+(i/4+1)+' / '+Math.ceil(attributes.length/4),attributes.slice(i,i+4)]);
    groups.push(['meta','永久祭坛',[...$('sheet-meta').children]]);
    this.mobilePages($('sheet-attributes'),'选择属性分类',groups);
    this.buildFusions(weapons,passives,preview);
    this.catalog.build();
  }

  buildTalents(character,preview){
    const game=preview?{character,level:1,talents:{}}:this.game,definition=CHARACTER_TALENTS[character.id];
    const points=talentPoints(game),learned=Object.keys(game.talents||{}).length,readOnly=preview||this.origin==='over';
    put('sheet-talent-count',preview?'预览':points>0?'+'+points:learned+'/6');
    const root=$('sheet-talents');root.replaceChildren();root.style.setProperty('--talent-color',definition.color);
    const intro=node('div','talent-intro'),identity=node('div','talent-identity');
    identity.append(artwork(definition.icon),node('small','talent-root-label','初始被动 · 开局已拥有'),node('div','',definition.style));intro.append(identity,node('h3','',definition.name),node('p','',definition.description),node('p','talent-flow',definition.loop));
    if(!preview)intro.append(node('small','talent-live',characterTalentStatus(this.game)),node('p','talent-current','当前效果 · '+characterTalentSummary(this.game)));
    const budget=node('div','talent-budget');budget.append(node('strong','',preview?'六次成长':points+' 点可用'),node('span','',preview?'出征后赚取天赋点':'已投入 '+learned+' / 6'));intro.append(budget);root.append(intro);
    const milestones=node('div','talent-milestones');
    for(const level of TALENT_LEVELS)milestones.append(node('span',game.level>=level?'earned':'','LV.'+level+' · +1'));
    root.append(milestones,node('p','talent-rules','以下三路均强化「'+definition.name+'」。每节点 1 点，沿同列依次学习；LV.18 开放最终专精，三选一。'+(preview?'最多投入 6 点，可跨分支组合前两层。':'不占装备位或装备升级机会；本局不可撤回，重开重置。')));
    const tabs=node('div','talent-branch-tabs');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','天赋分支');
    const branches=node('div','talent-branches');this.talentBranch??=0;
    definition.branches.forEach((branch,index)=>{
      const tab=node('button','',branch.name);tab.setAttribute('aria-pressed',String(index===this.talentBranch));
      tab.addEventListener('click',()=>{this.talentBranch=index;for(const [i,b] of [...tabs.children].entries())b.setAttribute('aria-pressed',String(i===index));for(const [i,b] of [...branches.children].entries())b.classList.toggle('selected',i===index);root.showMobilePage('branch-'+index)});tabs.append(tab);
      const column=node('section','talent-branch'+(index===this.talentBranch?' selected':'')),heading=node('h4','',branch.name);heading.tabIndex=-1;column.append(heading,node('p','',branch.role));
      branch.nodes.forEach((talent,tier)=>{
        const state=talentNodeState(game,talent.id),card=node('button','talent-node'+(state.learned?' learned':state.exclusive?' excluded':state.available&&!readOnly?' available':' locked'));
        card.id='talent-'+talent.id;card.disabled=readOnly||!state.available;card.setAttribute('aria-label',talent.name+'。'+talent.description+'。'+state.reason);
        const head=node('span','talent-node-head');head.append(artwork(talent.icon),node('b','',talent.name),node('em','',['强化','联动','专精'][tier]));
        card.append(head,node('span','talent-node-description',talent.description),node('span','talent-node-state',state.learned?'✓ 已学会':this.origin==='over'?'远征已结束':state.reason));
        card.addEventListener('click',()=>{this.talentBranch=index;this.game.learnTalent(talent.id)});column.append(card);
      });branches.append(column);
      this.mobilePages(column,'选择天赋节点',branch.nodes.map((talent,tier)=>[talent.id,(tier+1)+' · '+talent.name+(game.talents[talent.id]?' · 已学会':''),[column.querySelector('#talent-'+talent.id)]]));
    });root.append(tabs,branches);
    root.dataset.mobilePage??='branch-'+this.talentBranch;
    this.mobilePages(root,'选择天赋分支',[
      ...definition.branches.map((branch,index)=>['branch-'+index,branch.name+' · 天赋分支',[branches.children[index]]]),
      ['innate','初始被动 · '+definition.name,[intro]],['rules','成长规则',[milestones,root.querySelector('.talent-rules')]],
    ]);
    root.querySelector(':scope>.mobile-picker').addEventListener('change',e=>{if(e.target.value.startsWith('branch-'))tabs.children[Number(e.target.value.slice(-1))].click()});
    const compact=node('div','talent-mobile-summary');compact.append(node('b','',definition.name),node('span','',preview?'天赋预览':points+' 点可用 · 已学 '+learned+'/6'));root.prepend(compact);
  }

  buildAttributes(character, stats, p, m, preview) {
    const dashLeft = preview ? 0 : this.game.player.dashCooldown;
    const dashState = !preview && this.game.player.dashTime > 0 ? '正在冲刺' : dashLeft > 0 ? '剩余 ' + seconds(dashLeft) : '已就绪';
    const rows = [
      ['vitality', '最大生命', stats.maxHp, '点', source(['角色基础 ' + character.hp, m.vitality && `长明之躯 +${m.vitality * 5}`, p.vitality && `不灭之心 +${p.vitality * 12}`])],
      ['power', '武器伤害', percent(stats.damageMultiplier), '倍率', source([`角色基础 ×${number(character.damage, 2)}`, m.power && `祭坛 +${m.power * 3}%`, p.power && `猩红誓约 +${p.power * 12}%`,p.curse&&`禁忌烛冠 +${p.curse*10}%`])],
      ['haste', '施放冷却缩减', percent(1 - stats.haste), '', p.haste ? `时隙沙漏 ${p.haste} 级；再与武器自身冷却相乘。游魂灯的接触间隔不变。` : '暂无冷却祝福；每种武器仍有独立的等级冷却。'],
      ['speed', '移动速度', number(stats.moveSpeed), '像素 / 秒', source([`角色基础 ${character.speed}`, p.speed && `夜行之靴 +${p.speed * 6}%`])],
      ['armor', '伤害减免', stats.armor, '点 / 次', '护甲扣除固定伤害；至少承受原始伤害的 30%，再由护盾吸收。'],
      ['regen', '持续恢复', number(stats.regeneration,2), '点 / 秒', p.regen ? '复苏苔芽在战斗中持续恢复。' : '需要本局选择恢复道具。'],
      ['regen', '避伤恢复', number(stats.recovery,2), '点 / 秒', '春回之息：连续 6 秒未受攻击后生效；护盾受击也会打断。'],
      ['magnet', '拾取范围', number(stats.pickupRadius), '像素', source(['基础半径 42', character.id === 'witch' && '逐星者 ×1.35', p.magnet && `引魂石 ×${number(1 + p.magnet * .35, 2)}`])],
      ['growth', '经验获取', percent(stats.xpMultiplier), '倍率', source(['基础 100%', p.growth && `记忆冠冕 +${p.growth * 10}%`, m.magnet && `祭坛 +${m.magnet * 4}%`,p.curse&&`禁忌烛冠 +${p.curse*8}%`])],
      ['luck', '暴击率', percent(stats.criticalChance), '', source(['武器直接命中独立判定，基础 5%', p.luck && `命运四叶 +${p.luck * 5} 个百分点`])],
      ['focus', '暴击伤害', percent(stats.criticalMultiplier), '倍率', '持续状态、天赋与遗物的追加伤害不暴击。'],
      ['area','武器范围',percent(stats.areaMultiplier),'倍率','包括攻击半径、光束宽度与距离；不增加遗物范围。'],
      ['duration','持续时间',percent(stats.durationMultiplier),'倍率','增加武器领域、减速与普通敌人冻结时间；首领冻结不变。'],
      ['amount','额外数量',stats.amount,'个','弹数、环绕物与落雷目标；炮台数量上限仍为 2。'],
      ['aegis','当前护盾',preview?(character.id==='warden'?8:0):number(this.game.player.shield),'点','护盾先于生命承受伤害，多个来源取较高值。'],
      ['curse','禁忌等级',stats.curse,'级',stats.curse?`敌人生命 +${stats.curse*12}%，生成频率 +${stats.curse*8}%，速度 +${stats.curse*3}%。`:'未持有禁忌烛冠；怪物按时间变强，不随你的等级额外膨胀。'],
      ['speed', '冲刺冷却', number(stats.dashCooldown, 2), '秒', source([dashState,'基础 3 秒',p.speed&&`夜行之靴缩短 ${p.speed * 6}%`])],
      ['armor', '冲刺保护', number(stats.dashInvincibility, 2), '秒', `${number(stats.dashDuration, 2)} 秒冲刺，速度 ×${stats.dashSpeedMultiplier}；冲刺起手获得无敌。`],
    ];
    $('sheet-stat-grid').replaceChildren(...rows.map(([key, label, value, unit, detail]) => {
      const card = node('article', 'sheet-stat'), list = node('dl'), term = node('dt');
      term.append(artwork(key), document.createTextNode(label));
      const definition = node('dd', '', String(value));
      if (unit) definition.append(node('small', '', unit));
      list.append(term, definition);
      card.append(list, node('p', '', detail));
      return card;
    }));
  }

  itemCard(item,title,category,badge) {
    const card=node('article','collection-card'),header=node('div','catalog-detail-head'),words=node('div'),art=node('div','detail-art');
    card.dataset.category=item.category;
    words.append(node('small','',category),node('h4','',title));header.append(words,node('span','detail-badge',badge));art.append(itemArt(item));card.append(header,art);
    return card;
  }

  addFusionLink(card,key) {
    const actions=node('div','collection-actions');
    if(Object.values(FUSIONS).some(recipe=>this.game.discoveredFusions.has(recipe.id)&&(recipe.id===key||recipe.ingredients.some(item=>item.id===key)))){
      const link=node('button','sheet-recipe-link','融合图谱 ↗');
      link.addEventListener('click',()=>{this.selectTab('fusion');const recipe=$('recipe-'+key);if(recipe)this.reveal(recipe);else{$('sheet-fusion').dataset.selected='';this.renderCollection('fusion');$('sheet-fusion').querySelector('.catalog-item')?.focus({preventScroll:true})}});actions.append(link);
    }
    if(actions.children.length)card.append(actions);
  }

  buildWeapons(character,stats,weapons) {
    return Object.entries(weapons).map(([key,level])=>{
      const data=WEAPONS[key],values=weaponStats(key,level,stats,character);
      const card=this.itemCard(catalogItem('weapon:'+key),weaponName(key,level),values.fusion?'融合武器':data.category,values.evolved?'已进化':'LV. '+level+' / '+maxWeaponLevel(key));
      card.dataset.category='weapon';card.dataset.badge=values.evolved?'✦':'LV.'+level;card.id='sheet-weapon-'+key;
      card.append(effectText(values.evolved?data.upgrades.at(-1).replace(/^进化：/,''):data.desc));
      const facts=node('dl','sheet-facts');
      for(const [label,value] of weaponFacts(key,values).slice(0,4)){const pair=node('div');pair.append(node('dt','',label),node('dd','',value));facts.append(pair)}
      card.append(facts);this.addFusionLink(card,key);return card;
    });
  }

  buildFusions(weapons,passives,preview) {
    const game=this.game,tracked=preview?game.plannedFusion:game.trackedFusion;
    const known=Object.values(FUSIONS).filter(recipe=>game.discoveredFusions.has(recipe.id)),remaining=Object.keys(FUSIONS).length-known.length;
    put('sheet-fusion-count',known.length+'/'+Object.keys(FUSIONS).length);put('sheet-discovery-count',known.length+' / '+Object.keys(FUSIONS).length);
    const cards=known.map(recipe=>{
      const key=recipe.id,data=WEAPONS[key],state=fusionState(key,weapons,passives,preview?{}:game),history=!preview?game.fusions?.[key]:null;
      const status=state.forged?'本局已铸成':state.blocked?'路线关闭':state.ready?'材料齐备':state.waiting&&state.progress===state.total?'03:00 后可融合':tracked===key?'正在追踪':'材料未齐';
      const card=this.itemCard(catalogItem('weapon:'+key),data.name,'融合配方',status);card.id='recipe-'+key;
      card.classList.add('fusion-recipe');card.classList.toggle('tracked',tracked===key);card.dataset.badge=state.forged?'◆':tracked===key?'◇':state.ready?'✦':'';
      card.append(effectText(recipe.effect));
      const formula=node('div','fusion-formula');
      for(const ingredient of state.ingredients){
        const saved=history?.ingredients.find(item=>item.id===ingredient.id),level=saved?.level||ingredient.level,met=level>=ingredient.required;
        const component=node('div','fusion-component'+(met?' met':'')),words=node('div');
        words.append(node('strong','',ingredientData(ingredient).name),node('small','',saved?'已融入 · LV. '+level:'LV. '+level+' / '+ingredient.required+(met?' ✓':'')));
        component.append(artwork(ingredient.id),words);formula.append(component);
      }
      card.append(formula,effectText(history?'铸成于 '+formatTime(history.time)+' · 当前 LV. '+state.level:'成品 LV. '+state.level+' · 消耗两件材料的全部等级及独立效果，材料本局不再出现。','collection-note'));
      const action=node('button','fusion-track-button');
      if(state.forged){action.textContent='查看当前武器 ↗';action.addEventListener('click',()=>{this.selectTab('items');this.reveal($('sheet-weapon-'+key))})}
      else if(this.origin==='over'){action.textContent='本次远征已结束';action.disabled=true}
      else if(state.blocked){action.textContent=state.reason;action.disabled=true}
      else if(state.ready&&this.origin==='level'&&game.choices.some(item=>item.fusion&&item.key===key)){action.textContent='返回升级 · 选择融合卡 ↗';action.addEventListener('click',()=>this.close())}
      else{
        action.textContent=tracked===key?'取消追踪':preview?'追踪配方 · 下局生效':'追踪配方 · 下次升级生效';action.setAttribute('aria-pressed',String(tracked===key));
        action.addEventListener('click',()=>{
          const next=tracked===key?null:key;if(preview)game.plannedFusion=next;else game.trackedFusion=next;
          this.sound.play('select');this.buildFusions(weapons,passives,preview);game.on('fusionProgress');
          $('recipe-'+key).querySelector('.fusion-track-button').focus({preventScroll:true});put('announcer',next?'已追踪 '+data.name+'，下次生成升级选项时生效。':'已取消配方追踪。');
        });
      }
      card.append(action);return card;
    });
    if(remaining){
      const sealed=node('article','collection-card');sealed.id='recipe-sealed';
      const head=node('div','catalog-detail-head'),words=node('div'),art=node('div','detail-art');words.append(node('small','','尚未发现'),node('h4','','未知融合'));head.append(words);art.append(node('span','sealed-icon','?'));
      sealed.append(head,art,effectText('还有 '+remaining+' 种未知力量。提升武器与遗物等级，满足隐藏条件后，在升级时选择「未知融合」即可记录配方。'));cards.push(sealed);
    }
    $('sheet-fusion-recipes').replaceChildren(...cards);this.renderCollection('fusion');
  }

  buildPassives(passives,stats,weapons) {
    return Object.entries(passives).map(([key,level])=>{
      const data=PASSIVES[key],description=data.relic?relicDescription(key,level,stats):passiveEffect(key,level);
      const card=this.itemCard(catalogItem('passive:'+key),data.name,data.relic?'联动遗物 · '+data.trigger:'属性祝福','LV. '+level+' / '+data.max);card.id='sheet-passive-'+key;card.dataset.badge='LV.'+level;
      card.append(effectText(description));
      if(data.relic){
        const linked=compatibleWeapons(key,weapons,passives,stats.talents,this.game.character.id);
        const status=linked.length?'联动就绪':'缺少触发来源';
        card.append(effectText(key==='soulpact'?'持续强化灵魂与召唤武器，已计入当前武器数值。':status+' · 本局触发 '+(this.origin==='menu'?0:(this.game.relicProcs?.[key]||0))+' 次。','collection-note'));
      }
      if(key==='vitality')card.append(effectText('获得时立即恢复 12 点生命。','collection-note'));
      if(key==='haste')card.append(effectText('环绕接触、持续伤害和遗物触发冷却不变。','collection-note'));
      if(this.origin!=='menu'&&this.game.banished?.has(key))card.append(node('p','collection-note','已放逐 · 保留当前效果，本局不再升级。'));
      this.addFusionLink(card,key);return card;
    });
  }


  buildMeta(meta) {
    $('sheet-meta').replaceChildren(...Object.entries(META).map(([key, info]) => {
      const level = meta[key] || 0;
      const effects = {vitality: `初始生命 +${level * 5}`, power: `武器伤害加成 +${level * 3}%`, magnet: `经验获取 +${level * 4}%`, regen: `连续 6 秒未受攻击后，每秒恢复 ${number(level * .08,2)} 点生命`};
      const card = node('article', 'sheet-meta-card' + (level ? '' : ' inactive')), words = node('div'), title = node('h4', '', info.name);
      title.append(node('span', '', `LV. ${level} / ${info.max}`));
      words.append(title, node('p', '', level ? effects[key] : '未获得 · 可在营地的余烬祭坛提升'));
      card.append(artwork(key), words);
      return card;
    }));
  }

}
