import {paintAvatar, paintIcon} from './art.js';
import {WEAPONS, PASSIVES, META, META_TREES, startingLoadout, formatTime,catalogItem} from './data.js';
import {characterStats, weaponStats} from './stats.js';
import {FUSIONS,WEAPON_SLOTS,PASSIVE_SLOTS,maxWeaponLevel,weaponName,fusionState,ingredientData} from './fusions.js';
import {relicDescription,compatibleWeapons,SYNERGIES,ALTAR_BOONS,refinementGain,weaponAnomalyText} from './content.js';
import {passiveEffect,weaponFacts,resonanceText} from './item-info.js';
import {ItemCatalog,itemArt,effectText} from './catalog.js';
import {CHARACTER_TALENTS,TALENT_LEVELS,talentPoints,talentNodeState,characterTalentSummary} from './talents.js';

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
      const categories=root.querySelector('.collection-category');
      if(categories)for(const [key,label,icon] of [['all','全部','amount'],['weapon','武器','blade'],['passive','祝福','power'],['relic','遗物','stormcoil'],['boon','契约','curse']]){
        const button=node('button','icon-choice');button.dataset.choice=key;button.title=label;button.setAttribute('aria-label',label);button.append(artwork(icon),node('span','',label));
        button.addEventListener('click',()=>{categories.dataset.value=key;this.hideCollection(tab);root.dataset.page=0;this.renderCollection(tab)});categories.append(button);
      }
      for(const [selector,step] of [['.collection-prev',-1],['.collection-next',1]])root.querySelector(selector).addEventListener('click',()=>{this.hideCollection(tab);root.dataset.page=Number(root.dataset.page||0)+step;this.renderCollection(tab);this.collectionClosing=true;root.querySelector('.catalog-item')?.focus({preventScroll:true});this.collectionClosing=false});
      root.querySelector('.detail-bubble-close').addEventListener('click',()=>this.hideCollection(tab,true));
      root.querySelector('.detail-bubble').addEventListener('beforetoggle',event=>{if(event.newState==='closed'){root.dataset.selected='';root.collectionAnchor?.classList.remove('selected');root.collectionAnchor?.setAttribute('aria-expanded','false')}});
    }
    $('sheet-close').addEventListener('click', () => this.close());
    $('sheet-return').addEventListener('click', () => this.close());
    $('status-screen').addEventListener('keydown',event=>{
      if(event.code==='Escape'&&document.querySelector('#status-screen .detail-bubble:popover-open')){event.preventDefault();event.stopPropagation();this.hideDetails(true)}
    });
    window.addEventListener('resize',()=>this.hideDetails());
    $('sheet-scroll').addEventListener('scroll',()=>this.hideDetails());
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
    if (this.visible || !['menu', 'running', 'paused', 'level', 'reward', 'talent', 'over'].includes(this.game.state)) return false;
    const modal = document.querySelector('.modal-wrap:not(.hidden)');
    if (modal && !['pause-screen', 'level-screen', 'reward-screen', 'end-screen'].includes(modal.id)) return false;
    this.origin = this.game.state;
    this.previousFocus = document.activeElement;
    this.previousModal = modal;
    if (modal) modal.classList.add('hidden');
    this.visible = true;
    this.game.statusReturn = this.origin;
    this.game.state = 'status';
    this.game.keys.clear();
    this.game.stick = {x: 0, y: 0};
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
    this.hideDetails();
    this.visible = false;
    $('status-screen').classList.add('hidden');
    for (const [element, wasInert] of this.inertStates) element.inert = wasInert;
    this.game.state = this.origin==='talent'?'running':this.origin;
    this.game.statusReturn = null;
    this.game.keys.clear();
    this.game.stick = {x: 0, y: 0};
    if (this.previousModal) this.previousModal.classList.remove('hidden');
    if (['running','talent'].includes(this.origin)) document.activeElement?.blur();
    else if (this.previousFocus?.isConnected && !this.previousFocus.closest('.hidden')) this.previousFocus.focus({preventScroll: true});
    this.sound.play('select');
    put('announcer', this.origin === 'running' ? '已关闭角色状态，继续守夜。' : '已返回原界面。');
    if(this.origin==='talent')this.game.presentLevelChoices();
  }

  selectTab(tab) {
    this.hideDetails();
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
    put('sheet-title',({catalog:'道具图鉴',items:this.origin==='menu'?'装备预览':'本局装备',fusion:'融合图谱',talents:this.origin==='talent'?'选择天赋':'角色天赋'})[this.tab]||'角色状态');
  }

  mobilePages(root, label, entries) {
    entries=entries.filter(([,,elements])=>elements.length);
    root.querySelector(':scope > .mobile-pages-picker')?.remove();root.querySelector(':scope > .mobile-page-back')?.remove();
    if(!entries.length)return;
    const guide=root.matches('.guide-grid'),picker=node('div','icon-choices mobile-picker mobile-pages-picker'),back=node('button','mobile-page-back hidden','← 返回手记');picker.setAttribute('role','group');picker.setAttribute('aria-label',label);
    for(const [id,title,elements,icon] of entries){
      const button=node('button','icon-choice'),original=elements[0].querySelector('canvas'),art=artwork(icon||'growth');button.dataset.choice=id;button.title=title;button.setAttribute('aria-label',title);
      if(!icon&&original){const g=art.getContext('2d');g.clearRect(0,0,24,24);g.drawImage(original,0,0,24,24)}
      button.append(art,node('span','',title));button.addEventListener('click',()=>{root.showMobilePage(id);if(guide)back.focus({preventScroll:true})});picker.append(button);
      for(const element of elements){element.classList.add('mobile-page');element.mobilePage={root,id}}
    }
    root.showMobilePage=id=>{
      root.dataset.mobilePage=id??'';
      for(const button of picker.children)button.setAttribute('aria-pressed',String(button.dataset.choice===id));
      for(const [key,,elements] of entries)for(const element of elements)element.classList.toggle('mobile-selected',key===id);
      if(guide){picker.classList.toggle('hidden',id!=null);back.classList.toggle('hidden',id==null)}
    };
    root.prepend(picker);
    if(guide){root.prepend(back);back.addEventListener('click',()=>{const id=root.dataset.mobilePage;root.showMobilePage(null);[...picker.children].find(button=>button.dataset.choice===id)?.focus({preventScroll:true})})}
    root.showMobilePage(entries.some(([id])=>id===root.dataset.mobilePage)?root.dataset.mobilePage:guide?null:entries[0][0]);
  }

  reveal(element) {
    if(!element)return;
    const collection=element.closest('#sheet-items,#sheet-fusion');
    if(collection){
      const tab=collection.id.slice(6),picker=collection.querySelector('.collection-category');
      this.hideDetails();if(this.tab!==tab)this.selectTab(tab);
      if(picker&&picker.dataset.value!=='all'&&picker.dataset.value!==element.dataset.category)picker.dataset.value=element.dataset.category;
      const entries=[...collection.querySelector('.collection-cards').children].filter(card=>!picker||picker.dataset.value==='all'||picker.dataset.value===card.dataset.category);
      collection.dataset.page=Math.max(0,Math.floor(entries.indexOf(element)/this.catalog.pageSize));this.renderCollection(tab);this.showCollection(element);
      collection.querySelector('.detail-bubble-close').focus({preventScroll:true});return;
    }
    for(let current=element;current;current=current.parentElement)if(current.mobilePage){const {root,id}=current.mobilePage;root.showMobilePage(id)}
    element.scrollIntoView({block:'nearest'});
  }

  renderCollection(tab) {
    const root=$('sheet-'+tab),cards=[...root.querySelector('.collection-cards').children];
    const bubble=root.querySelector('.detail-bubble'),restore=bubble.matches(':popover-open')?root.dataset.selected:null,pinned=bubble.dataset.pinned;this.hideCollection(tab);
    const category=root.querySelector('.collection-category')?.dataset.value||'all';
    for(const button of root.querySelectorAll('.collection-category button'))button.setAttribute('aria-pressed',String(button.dataset.choice===category));
    const entries=cards.filter(card=>tab==='fusion'||category==='all'||card.dataset.category===category);
    for(const card of cards)card.classList.add('hidden');
    const size=this.catalog.pageSize,pages=Math.max(1,Math.ceil(entries.length/size)),page=Math.max(0,Math.min(Number(root.dataset.page||0),pages-1));root.dataset.page=page;
    root.querySelector('.catalog-list').replaceChildren(...entries.slice(page*size,(page+1)*size).map(card=>{
      const title=card.querySelector('h4').textContent,button=node('button','catalog-item'+(card.classList.contains('tracked')?' tracked':''));
      button.dataset.itemId=card.id;button.setAttribute('aria-label',title+(card.dataset.badge?' · '+card.dataset.badge:''));button.setAttribute('aria-controls',tab+'-detail');button.setAttribute('aria-expanded','false');button.setAttribute('aria-haspopup','dialog');
      const icon=card.querySelector('.detail-art canvas');
      if(icon){const canvas=node('canvas');canvas.width=canvas.height=24;canvas.setAttribute('aria-hidden','true');canvas.getContext('2d').drawImage(icon,0,0);button.append(canvas)}else button.append(node('span','sealed-icon','?'));
      button.addEventListener('click',event=>{this.showCollection(card);if(event.detail===0)root.querySelector('.detail-bubble-close').focus({preventScroll:true})});
      button.addEventListener('focus',()=>this.showCollection(card));button.addEventListener('pointermove',event=>{if(event.pointerType==='mouse'&&button.getAttribute('aria-expanded')!=='true')this.showCollection(card)});return button;
    }));
    root.querySelector('.collection-prev').disabled=page===0;root.querySelector('.collection-next').disabled=page===pages-1;
    root.querySelector('.collection-page').textContent=(page+1)+' / '+pages;root.querySelector('.catalog-pagination').classList.toggle('hidden',!entries.length);root.querySelector('.catalog-empty').classList.toggle('hidden',!!entries.length);
    $('sheet-scroll').scrollTop=0;
    if(restore){const card=cards.find(card=>card.id===restore);if(card){this.showCollection(card);if(pinned)bubble.dataset.pinned=pinned}}
  }

  showCollection(card){
    const root=card.closest('#sheet-items,#sheet-fusion');if(this.collectionClosing||!this.visible||this.tab!==root.id.slice(6))return;
    const anchor=[...root.querySelectorAll('.catalog-item')].find(button=>button.dataset.itemId===card.id);if(!anchor)return;
    root.collectionAnchor?.classList.remove('selected');root.collectionAnchor?.setAttribute('aria-expanded','false');root.collectionAnchor=anchor;root.dataset.selected=card.id;
    for(const other of root.querySelector('.collection-cards').children)other.classList.toggle('hidden',other!==card);
    anchor.classList.add('selected');anchor.setAttribute('aria-expanded','true');
    const bubble=root.querySelector('.detail-bubble'),title=card.querySelector('h4');title.id=card.id+'-title';bubble.setAttribute('aria-labelledby',title.id);
    if(!bubble.matches(':popover-open'))bubble.showPopover();this.positionBubble(bubble,anchor);
  }

  hideCollection(tab,focus=false){
    const root=$('sheet-'+tab),bubble=root.querySelector('.detail-bubble');if(!bubble.matches(':popover-open'))return;
    this.collectionClosing=true;bubble.hidePopover();if(focus)root.collectionAnchor?.focus({preventScroll:true});this.collectionClosing=false;
  }

  build() {
    const preview = this.origin === 'menu';
    const game = this.game, character = game.character;
    // Runs retain the altar bonuses they started with; the camp previews the next run.
    const meta = preview ? this.save.meta : game.meta;
    const loadout = preview ? startingLoadout(character,this.save) : game;
    const passives = loadout.passives;
    const weapons = loadout.weapons;
    const stats = preview ? characterStats(character, passives, meta,{},weapons) : game.stats;
    const hp = preview ? stats.maxHp : Math.max(0, game.player.hp);
    const maxHp = preview ? stats.maxHp : game.player.maxHp;
    const xp = preview ? 0 : game.xp, nextXp = preview ? 8 : game.xpNext;
    paintAvatar($('sheet-avatar'), character.id);
    put('sheet-name', character.name);
    put('sheet-level', 'LV. ' + (preview ? 1 : game.level));
    put('sheet-lore', character.lore);
    put('sheet-talent', character.description.replace(/<[^>]*>/g, '').replace(WEAPONS[character.weapon].name,WEAPONS[Object.keys(weapons)[0]].name));
    put('sheet-health', number(hp) + ' / ' + maxHp);
    put('sheet-xp', number(xp) + ' / ' + nextXp);
    $('sheet-health-fill').style.width = Math.min(100, hp / maxHp * 100) + '%';
    $('sheet-xp-fill').style.width = Math.min(100, xp / nextXp * 100) + '%';
    put('sheet-context', preview ? '出征预览 · 已计入永久成长' : this.origin === 'over' ? '本局最终状态 · 远征已经结束' : this.origin === 'level' ? '升级选择已保留 · 战斗暂停中' : '战斗暂停中 · 从容查看你的成长');
    put('sheet-run', preview ? '起始武器 · ' + WEAPONS[Object.keys(weapons)[0]].name : formatTime(game.time) + ' 守夜 · ' + game.kills.toLocaleString() + ' 击败 · ' + game.gold.toLocaleString() + ' 余烬');
    put('sheet-return', this.origin==='talent'?(talentPoints(game)>0?'保留天赋点，继续升级 ↗':'继续升级 ↗'):({menu: '返回营地 ↗', running: '继续守夜 ↗', paused: '返回暂停界面 ↗', level: '返回升级选择 ↗', reward: '返回祭坛奖励 ↗', over: '返回远征结算 ↗'})[this.origin]);
    $('sheet-menu-button').classList.toggle('hidden',!['running','paused','level','reward'].includes(this.origin));
    put('sheet-meta-note', preview ? '下次出征生效' : '本次出征时的祭坛加成');
    put('sheet-item-count', Object.keys(weapons).length + Object.keys(passives).length+(preview?0:game.boons.length));
    put('sheet-items-label',preview?'装备预览':'本局装备');
    this.buildAttributes(character, stats, passives, meta, preview);
    this.buildTalents(character,preview);
    put('sheet-build-summary',`武器 ${Object.keys(weapons).length} / ${WEAPON_SLOTS} · 道具 ${Object.keys(passives).length} / ${PASSIVE_SLOTS}`);
    const boons=(preview?[]:game.boons||[]).map(id=>{
      const boon=ALTAR_BOONS[id],card=this.itemCard(catalogItem('passive:'+boon.icon),boon.name,'祭坛契约','本局生效');card.id='sheet-boon-'+id;card.dataset.category='boon';card.append(effectText(boon.positive+'；'+boon.negative+'。'));return card;
    });
    $('sheet-items').querySelector('.collection-cards').replaceChildren(...this.buildWeapons(character,stats,weapons),...this.buildPassives(passives,stats,weapons),...boons);
    this.renderCollection('items');
    this.buildMeta(meta,preview);
    const attributes=[...$('sheet-stat-grid').children],groups=[];
    for(let i=0;i<attributes.length;i+=4)groups.push(['stats-'+i,['战斗','续航','增幅','机制','冲刺'][i/4],attributes.slice(i,i+4),['blade','regen','luck','duration','speed'][i/4]]);
    groups.push(...META_TREES.map((tree,index)=>['meta-'+tree.id,tree.name,[$('sheet-meta').children[index]],tree.nodes[0]]));
    this.mobilePages($('sheet-attributes'),'选择属性分类',groups);
    this.buildFusions(weapons,passives,preview);
    this.catalog.build();
  }

  buildTalents(character,preview){
    const game=preview?{character,level:1,talents:{}}:this.game,definition=CHARACTER_TALENTS[character.id];
    const points=talentPoints(game),learned=Object.keys(game.talents||{}).length,readOnly=preview||this.origin==='over';
    this.hideDetails();
    put('sheet-talent-count',preview?'预览':points>0?'+'+points:learned+'/3');
    const root=$('sheet-talents');root.replaceChildren();root.style.setProperty('--talent-color',definition.color);
    const selected=definition.branches.find(branch=>branch.nodes.some(talent=>game.talents[talent.id]));
    const budget=node('div','talent-budget');budget.append(node('b','',preview?'天赋预览':points+' 点可用'),node('span','',selected?'已锁定 · '+selected.name:'首次学习锁定路线'));
    root.append(budget,node('p','talent-rules',this.origin==='talent'?'获得天赋点 · 先选天赋，再选升级；也可保留点数。':'LV.'+TALENT_LEVELS.join(' / ')+' 各 1 点 · 点选图标查看'));
    const tree=node('div','talent-tree');tree.setAttribute('aria-label',definition.name+'天赋树');
    const bubble=node('div','detail-bubble');bubble.id='talent-detail';bubble.popover='auto';bubble.setAttribute('role','dialog');bubble.setAttribute('aria-labelledby','talent-detail-title');
    bubble.addEventListener('beforetoggle',event=>{if(event.newState==='closed'){this.talentAnchor?.classList.remove('selected');this.talentAnchor?.setAttribute('aria-expanded','false')}});
    const buttonFor=(talent,branch,tier)=>{
      const state=branch?talentNodeState(game,talent.id):null;
      const button=node('button','talent-node'+(!branch?' innate':state.learned?' learned':state.exclusive?' excluded':state.available&&!readOnly?' available':' locked'));
      button.id='talent-'+(talent.id||'innate');button.append(artwork(talent.icon));
      button.setAttribute('aria-label',(branch?branch.name+' · '+talent.name+' · '+state.reason:'初始被动 · '+definition.name));button.setAttribute('aria-controls',bubble.id);button.setAttribute('aria-expanded','false');button.setAttribute('aria-haspopup','dialog');
      const inspect=()=>{
        if(this.talentClosing)return;
        this.talentAnchor?.classList.remove('selected');this.talentAnchor?.setAttribute('aria-expanded','false');this.talentAnchor=button;
        button.classList.add('selected');button.setAttribute('aria-expanded','true');
        const title=node('h3','',talent.name);title.id='talent-detail-title';
        const close=node('button','detail-bubble-close','×');close.setAttribute('aria-label','收起天赋详情');close.addEventListener('click',()=>this.hideDetails(true));
        const copy=node('div','detail-bubble-copy');copy.append(node('small','',branch?branch.name+' · '+['强化','联动','专精'][tier]+' · LV.'+TALENT_LEVELS[tier]:'初始被动 · 开局拥有'),title,node('p','',talent.description));
        if(!branch&&!preview)copy.append(node('p','talent-current',characterTalentSummary(this.game)));
        if(branch){
          const reason=state.learned?'✓ 已学会':preview?'出征后获得天赋点':this.origin==='over'?'远征已结束':state.reason;
          copy.append(node('p','talent-detail-state',reason));
          if(state.available&&!readOnly){const learn=node('button','talent-learn',selected?'学习 · 1 点':'学习并锁定此路线 · 1 点');learn.addEventListener('click',()=>this.game.learnTalent(talent.id));copy.append(learn)}
        }
        bubble.replaceChildren(close,copy);if(!bubble.matches(':popover-open'))bubble.showPopover();
        this.positionBubble(bubble,button);
      };
      button.addEventListener('click',event=>{inspect();if(event.detail===0)(bubble.querySelector('.talent-learn')||bubble.querySelector('.detail-bubble-close'))?.focus({preventScroll:true})});button.addEventListener('focus',inspect);
      button.addEventListener('pointermove',event=>{if(event.pointerType==='mouse'&&button.getAttribute('aria-expanded')!=='true')inspect()});
      return button;
    };
    const innate=buttonFor(definition);innate.addEventListener('keydown',event=>{if(event.code==='ArrowDown'){event.preventDefault();$('talent-'+(selected||definition.branches[0]).nodes[0].id).focus({preventScroll:true})}});tree.append(innate);
    const branches=node('div','talent-branches');
    definition.branches.forEach((branch,index)=>{
      const column=node('div','talent-branch'+(selected===branch?' chosen':''));column.setAttribute('role','group');column.setAttribute('aria-label',branch.name);
      branch.nodes.forEach((talent,tier)=>{
        const button=buttonFor(talent,branch,tier);
        button.addEventListener('keydown',event=>{
          const step={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.code];if(!step)return;
          event.preventDefault();const next=definition.branches[(index+step[0]+3)%3].nodes[tier+step[1]];
          if(next)$('talent-'+next.id).focus({preventScroll:true});else if(tier===0&&step[1]===-1)$('talent-innate').focus({preventScroll:true});
        });column.append(button);
      });branches.append(column);
    });tree.append(branches);root.append(tree,bubble);
  }

  hideDetails(focus=false){
    for(const tab of ['items','fusion'])this.hideCollection(tab,focus);
    this.catalog.hideDetail(focus);
    const bubble=$('talent-detail');if(!bubble?.matches(':popover-open'))return;
    this.talentClosing=true;bubble.hidePopover();if(focus)this.talentAnchor?.focus({preventScroll:true});this.talentClosing=false;
  }

  positionBubble(bubble,button){
    const anchor=button.getBoundingClientRect(),gap=14,pad=12;
    bubble.style.maxHeight=(innerHeight-pad*2)+'px';bubble.style.left='0px';bubble.style.top='0px';
    const {width,height}=bubble.getBoundingClientRect();let left,top,side;
    if(innerWidth-anchor.right>=width+gap+pad){side='right';left=anchor.right+gap;top=Math.max(pad,Math.min(anchor.y+(anchor.height-height)/2,innerHeight-height-pad))}
    else if(anchor.left>=width+gap+pad){side='left';left=anchor.left-width-gap;top=Math.max(pad,Math.min(anchor.y+(anchor.height-height)/2,innerHeight-height-pad))}
    else{
      side=anchor.top>innerHeight-anchor.bottom?'above':'below';left=Math.max(pad,Math.min(anchor.x+(anchor.width-width)/2,innerWidth-width-pad));
      const space=(side==='above'?anchor.top:innerHeight-anchor.bottom)-gap-pad;bubble.style.maxHeight=Math.max(100,space)+'px';
      top=side==='above'?anchor.top-gap-bubble.getBoundingClientRect().height:anchor.bottom+gap;
    }
    bubble.dataset.side=side;bubble.style.left=left+'px';bubble.style.top=top+'px';
    bubble.style.setProperty('--tail',Math.max(20,Math.min((side==='left'||side==='right'?anchor.y+anchor.height/2-top:anchor.x+anchor.width/2-left),(side==='left'||side==='right'?bubble.offsetHeight:width)-20))+'px');
  }

  buildAttributes(character, stats, p, m, preview) {
    const dashLeft = preview ? 0 : this.game.player.dashCooldown;
    const dashState = !preview && this.game.player.dashTime > 0 ? '正在冲刺' : dashLeft > 0 ? '剩余 ' + seconds(dashLeft) : '已就绪';
    const rows = [
      ['vitality', '最大生命', stats.maxHp, '点', source(['角色基础 ' + character.hp, m.vitality && `长明之躯 +${m.vitality * 4}`, p.vitality && `不灭之心 +${p.vitality * 12}`])],
      ['power', '武器伤害', percent(stats.damageMultiplier), '倍率', source([`角色基础 ×${number(character.damage, 2)}`, m.power && `祭坛 +${m.power * 3}%`, p.power && `猩红誓约 +${p.power * 12}%`,p.curse&&`禁忌烛冠 +${p.curse*10}%`])],
      ['haste', '武器间隔缩减', percent(1-stats.haste*(stats.metaBuffs.haste||1)), '', p.haste ? `时隙沙漏 ${p.haste} 级；含召唤、环绕与领域，共振另计。` : '暂无间隔祝福；武器等级与共振仍会影响实际频率。'],
      ['speed', '移动速度', number(stats.moveSpeed*(stats.metaBuffs.move||1)), '像素 / 秒', source([`角色基础 ${character.speed}`,m.pace&&'行旅轻步 +'+m.pace*2+'%', p.speed && `夜行之靴 +${p.speed * 6}%`])],
      ['armor', '伤害减免', stats.armor, '点 / 次', (character.id==='smith'?'铸雷师自带 1 护甲。':'')+'护甲扣除固定伤害；至少承受原始伤害的 30%，再由护盾吸收。'],
      ['regen', '持续恢复', number(stats.regeneration,2), '点 / 秒', p.regen ? '复苏苔芽在战斗中持续恢复。' : '需要本局选择恢复道具。'],
      ['regen', '避伤恢复', number(stats.recovery,2), '点 / 秒', '春回之息：连续 4 秒未受攻击后生效；护盾受击也会打断。'],
      ['magnet', '拾取范围', number(stats.pickupRadius), '像素', source(['基础半径 42', character.id === 'witch' && '逐星者 ×1.35', p.magnet && `引魂石 ×${number(1 + p.magnet * .35, 2)}`])],
      ['growth', '经验获取', percent(stats.xpMultiplier), '倍率', source(['基础 100%', p.growth && `记忆冠冕 +${p.growth * 10}%`, m.magnet && `祭坛 +${m.magnet * 3}%`,p.curse&&`禁忌烛冠 +${p.curse*8}%`])],
      ['luck', '暴击率', percent(stats.criticalChance), '', source(['武器直接命中独立判定，基础 5%', p.luck && `命运四叶 +${p.luck * 5} 个百分点`])],
      ['focus', '暴击伤害', percent(stats.criticalMultiplier), '倍率', '持续状态、天赋与遗物的追加伤害不暴击。'],
      ['area','武器范围',percent(stats.areaMultiplier*(stats.metaBuffs.area||1)),'倍率','含半径、光束、连锁及月镰距离；共振加成见装备。'],
      ['duration','持续时间',percent(stats.durationMultiplier),'倍率','增加武器领域、减速与普通敌人冻结时间；首领冻结不变。'],
      ['amount','额外数量',stats.amount,'个','弹数、环绕物与落雷目标；炮台数量上限仍为 2。'],
      ['aegis','当前护盾',preview?(character.id==='warden'?8:0):number(this.game.player.shield),'点','护盾先于生命承受伤害，多个来源取较高值。'],
      ['curse','禁忌等级',stats.curse,'级',stats.curse?`敌人生命 +${stats.curse*12}%，生成频率 +${stats.curse*8}%，速度 +${stats.curse*3}%。`:'未持有禁忌烛冠；怪物按时间变强，不随你的等级额外膨胀。'],
      ['speed', '冲刺冷却', number(stats.dashCooldown, 2), '秒', source([dashState,'基础 3 秒',character.id==='mariner'&&'渡潮人缩短 15%',p.speed&&`夜行之靴缩短 ${p.speed * 6}%`])],
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
      link.addEventListener('click',()=>{this.selectTab('fusion');const recipe=$('recipe-'+key);if(recipe)this.reveal(recipe);else{this.renderCollection('fusion');this.collectionClosing=true;$('sheet-fusion').querySelector('.catalog-item')?.focus({preventScroll:true});this.collectionClosing=false}});actions.append(link);
    }
    if(actions.children.length)card.append(actions);
  }

  buildWeapons(character,stats,weapons) {
    return Object.entries(weapons).map(([key,level])=>{
      const data=WEAPONS[key],values=weaponStats(key,level,stats,character);
      const card=this.itemCard(catalogItem('weapon:'+key),weaponName(key,level),values.fusion?'融合武器':data.category,values.evolved?'已进化':'LV. '+level+' / '+maxWeaponLevel(key));
      card.dataset.category='weapon';card.dataset.badge=values.evolved?'✦':values.resonance?'共振'+(values.resonance.rank===2?'Ⅱ':'Ⅰ'):'LV.'+level;card.id='sheet-weapon-'+key;
      card.append(effectText(values.evolved?data.upgrades.at(-1).replace(/^进化：/,''):data.desc));
      const facts=node('dl','sheet-facts');
      for(const [label,value] of weaponFacts(key,values).slice(0,4)){const pair=node('div');pair.append(node('dt','',label),node('dd','',value));facts.append(pair)}
      card.append(facts);if(stats.empowerments?.[key])card.append(effectText('祭坛淬炼 · 伤害 +'+stats.empowerments[key]*12+'%，已计入数值。','collection-note'));if(stats.weaponUpgrades?.[key])card.append(effectText('满级精修：'+Object.entries(stats.weaponUpgrades[key]).map(([id,value])=>refinementGain(id,value)).join('；')+'。同类收益累加，已计入战斗与预览；概率最高 100%。','collection-note'));if(values.anomalyChance)card.append(effectText('直接命中：'+weaponAnomalyText(key)+'。','collection-note'));if(values.resonance)card.append(effectText(resonanceText(values),'collection-note'));this.addFusionLink(card,key);return card;
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
      card.append(formula,effectText(history?'铸成于 '+formatTime(history.time)+' · 当前 LV. '+state.level:'成品 LV. '+state.level+' · 消耗材料的全部等级与效果，材料本局不再出现。','collection-note'));
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
        const linked=compatibleWeapons(key,weapons,passives,stats.talents,this.game.character.id,stats.weaponUpgrades);
        const status=linked.length?'联动就绪':'缺少触发来源';
        card.append(effectText(key==='soulpact'?'持续强化灵魂与召唤武器，已计入当前武器数值。'+(stats.talents?.s_swarm1?'星群伴星同时继承伤害与射速。':''):status+' · 本局触发 '+(this.origin==='menu'?0:(this.game.relicProcs?.[key]||0))+' 次。','collection-note'));
      }
      if(key==='vitality')card.append(effectText('获得时立即恢复 12 点生命。','collection-note'));
      if(key==='haste')card.append(effectText('附着燃烧、侵蚀的伤害节奏不变；遗物随实际施放与命中触发。','collection-note'));
      if(key==='everseed'){
        const growth=this.origin==='menu'?{}:this.game.growth;
        card.append(effectText('本局累计：伤害 +'+(growth.damage||0)+'% · 范围 +'+(growth.area||0)+'% · 生命上限 +'+(growth.vitality||0)*2+'。','collection-note'));
      }
      const links=SYNERGIES.filter(link=>link.resonance&&link.items.includes(key));
      if(links.length)card.append(effectText('共振搭配：'+links.map(link=>link.items.filter(id=>id!==key).map(id=>PASSIVES[id].name).join('＋')).join(' / ')+'。融合与整套装备均需 LV.2；LV.3 强化。','collection-note'));
      if(this.origin!=='menu'&&this.game.banished?.has(key))card.append(node('p','collection-note','已放逐 · 保留当前效果，本局不再升级。'));
      this.addFusionLink(card,key);return card;
    });
  }


  buildMeta(meta,preview) {
    const basics={power:level=>'伤害 +'+level*3+'%',reach:level=>'武器范围 +'+level*3+'%',magnet:level=>'经验 +'+level*3+'%',pace:level=>'移速 +'+level*2+'%',vitality:level=>'初始生命 +'+level*4,regen:level=>'避伤 4 秒后恢复 '+number(level*.08,2)+' / 秒'};
    $('sheet-meta').replaceChildren(...META_TREES.map(tree=>{
      const card=node('article','sheet-meta-card'),words=node('div');words.append(node('h4','',tree.name+' · 永久成长'));
      for(const key of tree.nodes){const level=meta[key]||0;if(!level)continue;const info=META[key],effect=basics[key]?basics[key](level):'LV.'+level+'/'+info.max+(info.cooldowns?' · 冷却 '+info.cooldowns[level-1]+' 秒':' · 每局一次')+(!preview?' · 本局触发 '+(this.game.relicProcs['meta_'+key]||0)+' 次':'');words.append(node('p','',info.name+' · '+effect))}
      if(words.children.length===1)words.append(node('p','','尚未强化 · 营地余烬祭坛可查看成长树'));
      card.append(artwork(META[tree.nodes[0]].icon),words);return card;
    }));
  }

}
