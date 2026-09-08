import {paintAvatar, paintIcon} from './art.js';
import {WEAPONS, PASSIVES, META, formatTime} from './data.js';
import {characterStats, weaponStats} from './stats.js';
import {FUSIONS,WEAPON_SLOTS,maxWeaponLevel,weaponName,fusionState,ingredientData,fusionUsesRelic} from './fusions.js';
import {relicDescription,compatibleWeapons} from './content.js';
import {passiveEffect,weaponFacts,weaponExtra} from './item-info.js';
import {ItemCatalog} from './catalog.js';

const $ = id => document.getElementById(id);
const number = (value, digits = 1) => Number(value.toFixed(digits)).toLocaleString('zh-CN', {maximumFractionDigits: digits});
const percent = value => number(value * 100) + '%';
const seconds = value => number(value, 2) + ' 秒';
const damage = value => String(Math.round(value));
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
    this.tabs = ['attributes', 'items', 'fusion', 'catalog'];
    this.catalog=new ItemCatalog(this);
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
    this.inertStates = [...$('app').children].filter(element => !['status-screen', 'announcer'].includes(element.id)).map(element => [element, element.inert]);
    for (const [element] of this.inertStates) element.inert = true;
    this.build();
    this.selectTab(tab);
    $('status-screen').classList.remove('hidden');
    this.sound.init();
    this.sound.play('select');
    put('announcer', '角色状态已打开。角色属性与道具效果可切换，按 C 或 Esc 返回。');
    requestAnimationFrame(() => {
      if (!this.visible) return;
      $('sheet-tab-' + this.tab).focus({preventScroll: true});
      if (weapon) {
        const card = $('sheet-weapon-' + weapon);
        if (card) { card.classList.add('focused'); card.scrollIntoView({block: 'nearest'}); }
      }
    });
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
    $('status-screen').classList.toggle('catalog-mode',this.tab==='catalog');
    put('sheet-title',this.tab==='catalog'?'道具图鉴':'角色状态');
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
    const xp = preview ? 0 : game.xp, nextXp = preview ? 10 : game.xpNext;
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
    this.buildAttributes(character, stats, passives, meta, preview);
    this.buildWeapons(character, stats, weapons);
    this.buildPassives(passives,stats,weapons);
    this.buildMeta(meta);
    this.buildPickups(stats);
    this.buildFusions(character,stats,weapons,passives,preview);
    this.catalog.build({character,stats,weapons,passives,preview});
  }

  buildAttributes(character, stats, p, m, preview) {
    const dashLeft = preview ? 0 : this.game.player.dashCooldown;
    const dashState = !preview && this.game.player.dashTime > 0 ? '正在冲刺' : dashLeft > 0 ? '剩余 ' + seconds(dashLeft) : '已就绪';
    const rows = [
      ['vitality', '最大生命', stats.maxHp, '点', source(['角色基础 ' + character.hp, m.vitality && `长明之躯 +${m.vitality * 8}`, p.vitality && `不灭之心 +${p.vitality * 18}`])],
      ['power', '武器伤害', percent(stats.damageMultiplier), '倍率', source([`角色基础 ×${number(character.damage, 2)}`, `加成池 +${number(((m.power || 0) * .05 + (p.power || 0) * .15) * 100)}%`, m.power && `祭坛 +${m.power * 5}%`, p.power && `猩红誓约 +${p.power * 15}%`])],
      ['haste', '施放冷却缩减', percent(1 - stats.haste), '', p.haste ? `时隙沙漏 ${p.haste} 级；再与武器自身冷却相乘。游魂灯的接触间隔不变。` : '暂无冷却祝福；每种武器仍有独立的等级冷却。'],
      ['speed', '移动速度', number(stats.moveSpeed), '像素 / 秒', source([`角色基础 ${character.speed}`, p.speed ? `夜行之靴 +${p.speed * 8}%` : '暂无额外加成'])],
      ['armor', '伤害减免', stats.armor, '点 / 次', p.armor ? `旧王护符 ${p.armor} 级；受伤扣除固定数值，最低为 1。` : '暂无护符；固定减伤不等于百分比减伤。'],
      ['regen', '生命恢复', number(stats.regeneration), '点 / 秒', source([p.regen && `复苏苔芽 +${number(p.regen * .45)}`, m.regen && `春回之息 +${number(m.regen * .1)}`]) || '暂无持续恢复效果。'],
      ['magnet', '拾取范围', number(stats.pickupRadius), '像素', source(['基础半径 38', character.id === 'witch' && '逐星者 ×1.35', p.magnet && `引魂石 ×${number(1 + p.magnet * .3, 2)}`])],
      ['magnet', '经验获取', percent(stats.xpMultiplier), '倍率', source(['基础 100%', p.magnet && `引魂石 +${p.magnet * 10}%`, m.magnet && `引路之光 +${m.magnet * 10}%`])],
      ['luck', '暴击率', percent(stats.criticalChance), '', source(['基础 5%', p.luck && `命运四叶 +${p.luck * 8} 个百分点`])],
      ['blade', '暴击伤害', percent(stats.criticalMultiplier), '倍率', '每次命中独立判定；伤害乘以 2 后取整。'],
      ['speed', '冲刺冷却', number(stats.dashCooldown, 2), '秒', source([dashState, p.speed ? `夜行之靴缩短 ${p.speed * 8}%` : '基础冷却 2.5 秒'])],
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

  itemCard(key, title, category, badge, evolved = false) {
    const card = node('article', 'sheet-item' + (evolved ? ' evolved' : ''));
    const header = node('div', 'sheet-item-header'), words = node('div');
    words.append(node('h4', '', title), node('small', '', category));
    header.append(artwork(key), words, node('span', 'sheet-badge', badge));
    card.append(header);
    return card;
  }


  buildWeapons(character, stats, weapons) {
    put('sheet-weapon-count', Object.keys(weapons).length + ' / ' + WEAPON_SLOTS);
    const cards = Object.entries(weapons).map(([key, level]) => {
      const data = WEAPONS[key], v = weaponStats(key, level, stats, character);
      const card = this.itemCard(key, weaponName(key,level), data.category, v.fusion ? `◆ LV. ${level} / ${maxWeaponLevel(key)}` : v.evolved ? '✦ 已进化' : 'LV. ' + level, v.evolved);
      if(v.fusion)card.classList.add('fused');
      card.id = 'sheet-weapon-' + key;
      const extras = weaponExtra(key,v,stats,character);
      card.append(node('p', 'sheet-item-description', data.desc + extras));
      const facts = node('dl', 'sheet-facts');
      for (const [label, value] of weaponFacts(key, v)) {
        const pair = node('div'); pair.append(node('dt', '', label), node('dd', '', value)); facts.append(pair);
      }
      card.append(facts);
      const next = node('p', 'sheet-next');
      if (level >= maxWeaponLevel(key)) next.textContent = v.fusion ? '◆ 融合武器已达到极境。伤害仍受角色祝福强化。' : '✦ 已达到最终形态。伤害仍可受角色祝福强化。';
      else {
        const future = weaponStats(key, level + 1, stats, character);
        const lead = node('strong', '', level === 5 ? '下一阶 · ' + data.evolution : '下一级 · LV. ' + (level + 1));
        const change = weaponFacts(key, future).map(([label, value]) => label + ' ' + value).join('；');
        next.append(lead, node('br'), document.createTextNode(change + '。'));
      }
      card.append(next);
      if(this.save.discoveredItems['weapon:'+key]){
        const link=node('button','sheet-recipe-link','▤ 查看永久图鉴与全部等级 ↗');
        link.addEventListener('click',()=>this.catalog.openItem('weapon:'+key));card.append(link);
      }
      for(const recipe of Object.values(FUSIONS).filter(recipe=>this.game.discoveredFusions.has(recipe.id)&&(recipe.id===key||recipe.ingredients.some(i=>i.id===key)))){
        const link=node('button','sheet-recipe-link',v.fusion?'◆ 查看已发现的融合来源 ↗':'◇ 已发现路线 · '+WEAPONS[recipe.id].name+' ↗');
        link.addEventListener('click',()=>{this.selectTab('fusion');$('recipe-'+recipe.id)?.scrollIntoView({block:'nearest'});$('recipe-'+recipe.id)?.focus({preventScroll:true})});
        card.append(link);
      }
      return card;
    });
    $('sheet-weapons').replaceChildren(...cards);
    if (cards.length < WEAPON_SLOTS) $('sheet-weapons').append(node('p', 'sheet-empty', `还有 ${WEAPON_SLOTS - cards.length} 个武器位置。双武器融合可释放一格；武器与道具融合维持武器位数量。已消耗材料本局不会再次出现。`));
  }

  buildFusions(character,stats,weapons,passives,preview) {
    const game=this.game,tracked=preview?game.plannedFusion:game.trackedFusion;
    const known=Object.values(FUSIONS).filter(recipe=>game.discoveredFusions.has(recipe.id));
    const remaining=Object.keys(FUSIONS).length-known.length;
    put('sheet-fusion-count',known.length+'/'+Object.keys(FUSIONS).length);
    put('sheet-discovery-count',known.length+' / '+Object.keys(FUSIONS).length);
    const cards=known.map(recipe=>{
      const key=recipe.id,data=WEAPONS[key],state=fusionState(key,weapons,passives,preview?{}:game);
      const history=!preview?game.fusions?.[key]:null;
      const card=node('article','fusion-recipe'+(state.forged?' forged':state.ready?' ready':'')+(tracked===key?' tracked':'')+(state.blocked?' unavailable':''));
      card.id='recipe-'+key;card.tabIndex=-1;card.style.setProperty('--fusion-color',data.color);
      const head=node('div','fusion-recipe-heading'),title=node('div');
      title.append(node('span','fusion-kicker',recipe.motto),node('h4','',data.name));
      head.append(title,node('span','fusion-state',state.forged?'◆ 本局已铸成':state.blocked?'本局路线关闭':state.ready?'✦ 材料齐备':tracked===key?'◇ 正在追踪':'已发现 · 材料未齐'));card.append(head);
      const formula=node('div','fusion-formula');
      state.ingredients.forEach((ingredient,index)=>{
        if(index)formula.append(node('span','fusion-operator','＋'));
        const saved=history?.ingredients.find(item=>item.id===ingredient.id),level=saved?.level||ingredient.level;
        const met=level>=ingredient.required;
        const component=node('div','fusion-component'+(met?' met':''));
        component.append(artwork(ingredient.id),node('strong','',ingredientData(ingredient).name),node('small','fusion-material-type',ingredient.type==='passive'?'联动道具 · 会消耗':'武器 · 会消耗'),node('small','',saved?'已融入 · LV. '+level:met?'✓ LV. '+level+' · 就绪':'LV. '+level+' / '+ingredient.required));
        formula.append(component);
      });
      formula.append(node('span','fusion-operator','→'));
      const result=node('div','fusion-component fusion-result');result.append(artwork(key),node('strong','',data.name),node('small','',(state.forged?'当前':'成品')+' LV. '+state.level));formula.append(result);card.append(formula);
      const progress=node('div','fusion-progress');const fill=node('i');fill.style.width=(state.forged?100:state.progress/state.total*100)+'%';progress.append(fill);card.append(progress);
      card.append(node('p','fusion-effect',recipe.effect));
      const values=weaponStats(key,state.level,stats,character),facts=node('div','fusion-preview');
      for(const [label,value] of weaponFacts(key,values).slice(0,3)){const fact=node('span');fact.append(node('b','',value),node('small','',label));facts.append(fact)}card.append(facts);
      card.append(node('p','fusion-inheritance',history?'铸成于 '+formatTime(history.time)+' · 初始 LV. '+history.initialLevel+' · 图谱发现记录永久保留。':'成品 LV. '+state.level+'：基础 1 级；已进化武器、满级融合道具各额外 +1 级，最高 3 级。'));
      if(fusionUsesRelic(key))card.append(node('p','fusion-consumption','融合会消耗道具全部等级，失去该道具的独立联动效果；成品使用上方列出的固有效果。'));
      const action=node('button','fusion-track-button');
      if(state.forged){action.textContent='查看当前武器效果 ↗';action.addEventListener('click',()=>{this.selectTab('items');$('sheet-weapon-'+key)?.scrollIntoView({block:'nearest'});$('sheet-items').focus({preventScroll:true})})}
      else if(this.origin==='over'){action.textContent='本次远征已结束';action.disabled=true}
      else if(state.blocked){action.textContent=state.reason;action.disabled=true}
      else if(state.ready&&this.origin==='level'&&game.choices.some(item=>item.fusion&&item.key===key)){action.textContent='返回升级选择 · 选择融合卡 ↗';action.addEventListener('click',()=>this.close())}
      else{
        action.textContent=tracked===key?'取消追踪':preview?'追踪此配方 · 下局生效':state.ready?'追踪此配方 · 下次升级优先融合':'追踪此配方 · 优先提供材料';
        action.setAttribute('aria-pressed',String(tracked===key));
        action.addEventListener('click',()=>{
          const next=tracked===key?null:key;
          if(preview)game.plannedFusion=next;else game.trackedFusion=next;
          this.sound.play('select');this.buildFusions(character,stats,weapons,passives,preview);game.on('fusionProgress');
          $('recipe-'+key)?.querySelector('button')?.focus({preventScroll:true});
          put('announcer',next?'已追踪 '+data.name+'，下次生成升级选项时生效。':'已取消配方追踪。');
        });
      }
      card.append(action);return card;
    });
    if(remaining){
      const sealed=node('article','fusion-sealed');
      sealed.append(node('span','sealed-sigil','?'),node('span','fusion-kicker','UNWRITTEN / 尚未写下的力量'),node('h4','',known.length?'还有 '+remaining+' 种力量，等待你亲手发现。':'手记尚空，传说从你开始。'),node('p','', '尝试组合武器与遗物，提升它们的等级。满足隐藏条件时，升级选项会出现「未知融合」。亲手选择并铸成后，名称、配方和效果才会记入这里。'),node('small','', '发现时立即保存 · 无需通关 · 未知配方不可追踪'));
      cards.push(sealed);
    }
    $('sheet-fusion-recipes').replaceChildren(...cards);
  }

  buildPassives(passives,stats,weapons) {
    const entries=Object.entries(passives),basics=entries.filter(([key])=>!PASSIVES[key].relic),relics=entries.filter(([key])=>PASSIVES[key].relic);
    put('sheet-passive-count',basics.length+' / '+Object.values(PASSIVES).filter(v=>!v.relic).length);
    put('sheet-relic-count',relics.length+' / '+Object.values(PASSIVES).filter(v=>v.relic).length);
    const build=([key,level])=>{
      const data=PASSIVES[key],description=data.relic?relicDescription(key,level,stats):passiveEffect(key,level);
      const card=this.itemCard(key,data.name,data.relic?'联动遗物 / '+data.trigger:'被动祝福 / 累计效果','LV. '+level+' / '+data.max);
      if(data.relic)card.classList.add('relic-item');
      card.append(node('p','sheet-effect',description));
      if(data.relic){
        const linked=compatibleWeapons(key,weapons,passives),status=node('div','relic-synergy'+(linked.length?' active':''));
        status.append(node('b','',linked.length?'◆ 联动已就绪':'◇ 等待合适的武器'),node('span','',linked.length?linked.map(id=>weaponName(id,weapons[id])).join(' · '):'获得对应武器后自动触发，无需手动开启。'));
        card.append(status,node('p','sheet-effect-note','本局触发 '+(this.origin==='menu'?0:this.game.relicProcs?.[key]||0)+' 次 · 伤害已计入角色加成。'));
        if(data.catalyst)card.append(node('p','relic-catalyst','◇ 可参与未知融合 · 融合会消耗该道具。'));
        for(const recipe of Object.values(FUSIONS).filter(r=>this.game.discoveredFusions.has(r.id)&&r.ingredients.some(i=>i.id===key))){
          const link=node('button','sheet-recipe-link','已发现路线 · '+WEAPONS[recipe.id].name+' ↗');link.addEventListener('click',()=>{this.selectTab('fusion');$('recipe-'+recipe.id)?.scrollIntoView({block:'nearest'})});card.append(link);
        }
      }
      if(key==='vitality')card.append(node('p','sheet-effect-note','每次获得时立即恢复 20 点生命，上限为最大生命。'));
      if(key==='haste')card.append(node('p','sheet-effect-note','缩短武器施放冷却；环绕接触、持续伤害和遗物触发冷却不受影响。'));
      const next=node('p','sheet-next');
      next.textContent=level>=data.max?'已满级 · 当前效果持续至被融合消耗或本次远征结束。':'下一级累计：'+(data.relic?relicDescription(key,level+1,stats):passiveEffect(key,level+1));
      card.append(next);
      if(this.save.discoveredItems['passive:'+key]){
        const link=node('button','sheet-recipe-link','▤ 查看永久图鉴与全部等级 ↗');
        link.addEventListener('click',()=>this.catalog.openItem('passive:'+key));card.append(link);
      }
      return card;
    };
    $('sheet-passives').replaceChildren(...basics.map(build));
    $('sheet-relics').replaceChildren(...relics.map(build));
    if(!basics.length)$('sheet-passives').append(node('p','sheet-empty','尚未获得属性祝福。升级选择可提升伤害、生命、冷却等属性。'));
    if(!relics.length)$('sheet-relics').append(node('p','sheet-empty','尚未获得联动遗物。留意升级中的「联动遗物」卡，它们会响应武器的命中、施放或击杀；部分遗物也能作为融合材料。'));
  }

  buildMeta(meta) {
    $('sheet-meta').replaceChildren(...Object.entries(META).map(([key, info]) => {
      const level = meta[key] || 0;
      const effects = {vitality: `初始生命 +${level * 8}`, power: `武器伤害加成 +${level * 5}%`, magnet: `经验获取 +${level * 10}%`, regen: `每秒恢复 ${number(level * .1)} 点生命`};
      const card = node('article', 'sheet-meta-card' + (level ? '' : ' inactive')), words = node('div'), title = node('h4', '', info.name);
      title.append(node('span', '', `LV. ${level} / ${info.max}`));
      words.append(title, node('p', '', level ? effects[key] : '未获得 · 可在营地的余烬祭坛提升'));
      card.append(artwork(key), words);
      return card;
    }));
  }

  buildPickups(stats) {
    const rows = [
      ['灵光结晶', `拾取后获得经验；结晶所含经验随敌人而变，当前按 ${percent(stats.xpMultiplier)} 获取。`],
      ['生命药草', '拾取后立即恢复 16 点生命，不超过最大生命。'],
      ['引魂之光', '让地面上现有的全部经验结晶向你飞来；不永久改变拾取半径。'],
      ['古老宝箱', `恢复 14 点生命，并随机强化一件已持有武器：普通武器最高进化，融合武器最高 3 级。所有装备都达到各自上限后改为 ${number(32 * stats.xpMultiplier)} 经验。精英宝箱另赠 25 余烬，首领宝箱赠 60。宝箱不会自动融合。`],
      ['古老祭坛', `靠近自动点亮，每座仅一次：恢复 25 点生命，获得 15 余烬与 ${number(12 * stats.xpMultiplier)} 经验。`],
      ['生命甘露', '所有武器与被动都满级后的升级馈赠：恢复 50% 最大生命并获得 30 余烬。'],
    ];
    $('sheet-pickups').replaceChildren(...rows.map(([title, description]) => {
      const entry = node('article'); entry.append(node('h4', '', title), node('p', '', description)); return entry;
    }));
    $('sheet-pickups').parentElement.open = false;
  }
}
