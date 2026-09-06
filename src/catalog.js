import {WEAPONS,PASSIVES,PICKUPS,catalogItem} from './data.js';
import {FUSIONS,ingredientData,weaponName} from './fusions.js';
import {characterStats,weaponStats} from './stats.js';
import {relicDescription,compatibleWeapons} from './content.js';
import {passiveEffect,weaponFacts,weaponExtra} from './item-info.js';
import {paintIcon,drawSprite,diamond} from './art.js';

const $=id=>document.getElementById(id);
const categories={all:'全部',weapon:'基础武器',fusion:'融合武器',passive:'属性祝福',relic:'联动遗物',pickup:'拾取物'};
const allItems=[...Object.keys(WEAPONS).map(key=>'weapon:'+key),...Object.keys(PASSIVES).map(key=>'passive:'+key),...Object.keys(PICKUPS).map(key=>'pickup:'+key)].map(catalogItem);
const neutral={id:'catalog',hp:100,speed:100,damage:1};
const baseStats=characterStats(neutral);
const node=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e};

function art(item) {
  const c=node('canvas');c.width=c.height=24;c.setAttribute('aria-hidden','true');
  if(item.type!=='pickup'){paintIcon(c,item.key);return c}
  const g=c.getContext('2d');g.imageSmoothingEnabled=false;
  if(item.key==='chest')drawSprite(g,'chest',12,21);
  if(item.key==='heal'){g.fillStyle='#5d794b';g.fillRect(10,3,4,5);g.fillStyle='#b8ce8d';g.fillRect(7,9,11,12);g.fillStyle='#e0e6b0';g.fillRect(9,10,3,7);g.fillStyle='#536b40';g.fillRect(9,7,7,3)}
  if(item.key==='xp'){diamond(g,12,12,8,'#87ac62');diamond(g,11,10,4,'#d9e7b0')}
  if(item.key==='magnet'){diamond(g,12,12,9,'#7facbd');diamond(g,12,12,5,'#dceee0')}
  return c;
}

export class ItemCatalog {
  constructor(sheet) {
    this.sheet=sheet;this.category='all';this.query='';this.selected=null;this.levels={};this.mode='base';
    $('catalog-search').addEventListener('input',e=>{this.query=e.target.value.trim().toLocaleLowerCase();this.render()});
    $('catalog-clear').addEventListener('click',()=>{this.query='';$('catalog-search').value='';this.render();$('catalog-search').focus()});
  }

  build(context) {
    this.context=context;
    const {save,game}=this.sheet;
    this.known=allItems.filter(item=>save.discoveredItems[item.id]&&(item.category!=='fusion'||game.discoveredFusions.has(item.key)));
    $('sheet-catalog-count').textContent=this.known.length;
    $('catalog-count').textContent=this.known.length+' / '+allItems.length;
    $('catalog-context').textContent=context.preview?'营地查阅 · 历次远征发现永久保留':this.sheet.origin==='over'?'远征已结束 · 所有已发现条目仍可查阅':'战斗已暂停 · 可查阅历次远征的发现';
    $('catalog-save-note').textContent=game.itemDiscoveryPersisted===false?'本页发现已记录；浏览器存储暂不可用，跨次打开可能丢失。':'首次获得与最高等级会立即保存，消耗或远征结束后仍保留。旧融合存档按可确认的最低已达等级补录。';
    this.render();
  }

  openItem(id) {
    if(!this.known.some(item=>item.id===id))return;
    this.category='all';this.query='';$('catalog-search').value='';this.selected=id;
    this.render();this.sheet.selectTab('catalog');
    requestAnimationFrame(()=>$('catalog-detail').focus({preventScroll:true}));
  }

  render() {
    if(!this.known)return;
    const filters=Object.entries(categories).map(([key,label])=>{
      const count=this.known.filter(item=>key==='all'||item.category===key).length;
      const b=node('button','catalog-filter',label+' '+count);b.setAttribute('aria-pressed',String(key===this.category));
      b.addEventListener('click',()=>{this.category=key;this.render();$('catalog-filters').querySelector('[aria-pressed="true"]')?.focus({preventScroll:true})});return b;
    });
    $('catalog-filters').replaceChildren(...filters);
    const entries=this.known.filter(item=>(this.category==='all'||item.category===this.category)&&(!this.query||[item.data.name,item.data.evolution,item.data.desc,item.data.trigger,categories[item.category]].filter(Boolean).join(' ').toLocaleLowerCase().includes(this.query)));
    if(!entries.some(item=>item.id===this.selected))this.selected=entries[0]?.id||null;
    const total=allItems.filter(item=>this.category==='all'||item.category===this.category).length;
    const knownCount=this.known.filter(item=>this.category==='all'||item.category===this.category).length;
    $('catalog-list-count').textContent=this.query?'找到 '+entries.length+' 件已发现道具':knownCount+' 件已发现 · '+(total-knownCount)+' 件待发现';
    $('catalog-list').replaceChildren(...entries.map(item=>{
      const b=node('button','catalog-item'+(item.id===this.selected?' selected':'')),words=node('span');
      b.dataset.itemId=item.id;b.style.setProperty('--item-color',item.data.color);b.setAttribute('aria-pressed',String(item.id===this.selected));b.setAttribute('aria-controls','catalog-detail');
      words.append(node('strong','',item.data.name),node('small','',categories[item.category]));
      const level=this.sheet.save.discoveredItems[item.id];
      b.append(art(item),words,node('span','catalog-item-level',item.type==='pickup'?'已拾取':'最高 '+(level===6?'✦':'LV.'+level)));
      b.addEventListener('click',()=>{
        this.selected=item.id;this.renderDetail();
        for(const button of $('catalog-list').querySelectorAll('button')){const active=button.dataset.itemId===item.id;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active))}
      });return b;
    }));
    const empty=$('catalog-empty');empty.classList.toggle('hidden',entries.length>0);
    empty.replaceChildren(node('span','catalog-empty-mark','◇'),node('h4','',this.query?'没有匹配的已发现道具':this.known.length?'这一类还没有记录':'从第一次拾起开始。'),node('p','',this.query?'可搜索已发现道具的名称、效果或触发条件。':'出征后获得起始武器、选择升级、拾取战利品或完成融合，都会在这里留下记录。仅看见升级候选不算获得。'));
    $('catalog-layout').classList.toggle('hidden',!entries.length);
    this.renderDetail();
  }

  renderDetail() {
    const item=this.known.find(i=>i.id===this.selected),target=$('catalog-detail');
    target.replaceChildren();if(!item)return;
    const {key,data,type}=item,record=this.sheet.save.discoveredItems[item.id];
    const level=Math.max(1,Math.min(item.maxLevel,this.levels[item.id]||record));this.levels[item.id]=level;
    const current=this.context.preview?0:(type==='weapon'?this.context.weapons[key]:type==='passive'?this.context.passives[key]:0)||0;
    target.style.setProperty('--item-color',data.color);
    const header=node('div','catalog-detail-head'),identity=node('div');
    identity.append(node('span','catalog-kicker',categories[item.category]+' / 已发现'),node('h4','',type==='weapon'?weaponName(key,level):data.name),node('small','',type==='pickup'?'获得后永久记录':'最高已记录 '+(record===6?'已进化':'LV. '+record)+' / '+item.maxLevel));
    header.append(art(item),identity);target.append(header);
    if(type!=='pickup')target.append(node('p','catalog-ownership',this.context.preview?'历次远征发现 · 查看不会影响下次出征装备':current?'本局已装备 · LV. '+current:'本局未装备 · 曾经获得的记录仍可查阅'));
    if(type!=='pickup'){
      const toolbar=node('div','catalog-levels');toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','预览道具等级');toolbar.append(node('span','','等级预览'));
      for(let i=1;i<=item.maxLevel;i++){
        const b=node('button','',i===6?'进化':'LV.'+i);b.setAttribute('aria-pressed',String(i===level));b.setAttribute('aria-label',(i===6?'进化形态':'等级 '+i)+(i>record?'，尚未达到，可预览':''));
        if(i<=record)b.classList.add('attained');
        b.addEventListener('click',()=>{this.levels[item.id]=i;this.renderDetail();$('catalog-detail').querySelector('.catalog-levels [aria-pressed="true"]')?.focus({preventScroll:true})});toolbar.append(b);
      }
      target.append(toolbar,node('p','catalog-level-note',level>record?'尚未达到此等级 · 仅预览成长效果':'已在远征中达到此等级'));
      const modes=node('div','catalog-values-mode');modes.setAttribute('role','group');modes.setAttribute('aria-label','数值计算方式');
      for(const [mode,label] of [['base','基础数值'],['character',this.context.preview?'以出征角色预览':'以本局角色预览']]){
        const b=node('button','',label);b.setAttribute('aria-pressed',String(mode===this.mode));b.addEventListener('click',()=>{this.mode=mode;this.renderDetail();$('catalog-detail').querySelector('.catalog-values-mode [aria-pressed="true"]')?.focus({preventScroll:true})});modes.append(b);
      }
      if(type==='weapon'||data.relic)target.append(modes,node('p','catalog-values-note',this.mode==='base'?'不含角色天赋、祭坛或属性祝福；暴击另算。':'使用角色当前加成计算所选等级，仅作效果预览；道具尚未装备时不会因查看而生效。'));
    }
    const stats=this.mode==='base'?baseStats:this.context.stats,character=this.mode==='base'?neutral:this.context.character;
    if(type==='weapon'){
      const values=weaponStats(key,level,stats,character);
      target.append(node('p','catalog-description',data.desc+weaponExtra(key,values,stats,character)));
      const facts=node('dl','sheet-facts');
      for(const [label,value] of weaponFacts(key,values)){const pair=node('div');pair.append(node('dt','',label),node('dd','',value));facts.append(pair)}target.append(facts);
      target.append(node('p','catalog-acquisition','获得方式：'+(data.fusion?'在远征的升级选择中完成对应融合；成品可继续升级或由宝箱强化。':'从升级选择中获得；部分角色以该武器出征。升级与宝箱可强化，最高进化至 6 级。')));
    }else if(type==='passive'){
      target.append(node('p','catalog-description',data.relic?relicDescription(key,level,stats):passiveEffect(key,level)));
      if(key==='vitality')target.append(node('p','catalog-description','每次升级此祝福时，还会立即恢复 35 点生命，不超过最大生命。'));
      if(key==='haste')target.append(node('p','catalog-description','仅影响武器施放冷却；环绕接触、持续伤害和遗物触发冷却不受影响。'));
      if(data.relic){target.append(node('div','catalog-trigger','触发条件 · '+data.trigger));if(data.lore)target.append(node('p','catalog-lore',data.lore))}
      if(data.catalyst)target.append(node('p','catalog-acquisition','可作为融合材料。融合会消耗全部等级并失去原有独立效果；只有已发现的路线会在下方展示。'));
      target.append(node('p','catalog-acquisition','获得方式：升级时选择'+(data.relic?'联动遗物':'属性祝福')+'，最高 '+item.maxLevel+' 级。'));
    }else{
      target.append(node('p','catalog-description',data.desc),node('p','catalog-acquisition','获得方式：'+data.source));
      if(key==='xp'||key==='chest')target.append(node('p','catalog-description','角色当前经验倍率：'+Number((this.context.stats.xpMultiplier*100).toFixed(1))+'%。'));
    }
    this.appendSynergies(target,item);
    this.appendRecipes(target,item);
  }

  appendSynergies(target,item) {
    let linked=[];
    if(item.type==='weapon')linked=this.known.filter(i=>i.category==='relic'&&compatibleWeapons(i.key,{[item.key]:1}).length);
    if(item.category==='relic'){
      const weapons=Object.fromEntries(this.known.filter(i=>i.type==='weapon').map(i=>[i.key,1]));
      const ids=compatibleWeapons(item.key,weapons);
      linked=this.known.filter(i=>i.type==='weapon'&&ids.includes(i.key));
    }
    if(item.type!=='weapon'&&item.category!=='relic')return;
    const block=node('div','catalog-related');block.append(node('h5','','已发现的联动搭配'));
    if(!linked.length)block.append(node('p','','继续探索，获得对应装备后会在这里补全搭配。'));
    for(const other of linked){const b=node('button','',other.data.name+' ↗');b.addEventListener('click',()=>this.openItem(other.id));block.append(b)}
    target.append(block);
  }

  appendRecipes(target,item) {
    const recipes=Object.values(FUSIONS).filter(r=>this.sheet.game.discoveredFusions.has(r.id)&&(item.type==='weapon'&&r.id===item.key||r.ingredients.some(i=>i.type===item.type&&i.id===item.key)));
    if(!recipes.length)return;
    const block=node('div','catalog-related');block.append(node('h5','','已发现的融合路线'));
    for(const recipe of recipes){
      const b=node('button','catalog-recipe',WEAPONS[recipe.id].name+' ↗');
      b.append(node('small','',recipe.ingredients.map(i=>ingredientData(i).name+' LV.'+i.required).join(' ＋ ')));
      b.addEventListener('click',()=>{this.sheet.selectTab('fusion');$('recipe-'+recipe.id)?.scrollIntoView({block:'nearest'});$('recipe-'+recipe.id)?.focus({preventScroll:true})});block.append(b);
    }
    target.append(block);
  }
}
