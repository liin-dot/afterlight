import {WEAPONS,PASSIVES,PICKUPS,catalogItem} from './data.js';
import {BUILD_TAGS,itemTags} from './content.js';
import {paintIcon,drawSprite,diamond} from './art.js';

const $=id=>document.getElementById(id);
const categories={all:'全部',weapon:'基础武器',fusion:'融合武器',passive:'属性祝福',relic:'联动遗物',pickup:'拾取物'};
const allItems=[...Object.keys(WEAPONS).map(key=>'weapon:'+key),...Object.keys(PASSIVES).map(key=>'passive:'+key),...Object.keys(PICKUPS).map(key=>'pickup:'+key)].map(catalogItem);
const node=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e};

export function itemArt(item) {
  const c=node('canvas');c.width=c.height=24;c.setAttribute('aria-hidden','true');
  if(item.type!=='pickup'){paintIcon(c,item.key);return c}
  const g=c.getContext('2d');g.imageSmoothingEnabled=false;
  if(item.key==='chest')drawSprite(g,'chest',12,21);
  if(item.key==='heal'){g.fillStyle='#5d794b';g.fillRect(10,3,4,5);g.fillStyle='#b8ce8d';g.fillRect(7,9,11,12);g.fillStyle='#e0e6b0';g.fillRect(9,10,3,7);g.fillStyle='#536b40';g.fillRect(9,7,7,3)}
  if(item.key==='xp'){diamond(g,12,12,8,'#87ac62');diamond(g,11,10,4,'#d9e7b0')}
  if(item.key==='magnet'){diamond(g,12,12,9,'#7facbd');diamond(g,12,12,5,'#dceee0')}
  const icon={hourglass:'haste',nova:'meteor',ward:'aegis'}[item.key];if(icon)paintIcon(c,icon);
  return c;
}

export function effectText(text,className='catalog-description') {
  const p=node('p',className);
  for(const part of text.split(/([+−-]?\d+(?:\.\d+)?%?)/g))p.append(/^[-+−]?\d/.test(part)?node('b','effect-number',part):document.createTextNode(part));
  return p;
}

export class ItemCatalog {
  constructor(sheet) {
    this.sheet=sheet;this.category='all';this.query='';this.page=0;
    this.phone=matchMedia('(max-width:700px)');this.landscape=matchMedia('(max-height:500px)');this.short=matchMedia('(max-height:680px)');
    for(const media of [this.phone,this.landscape,this.short])media.addEventListener('change',()=>{this.page=0;this.render();for(const tab of ['items','fusion'])this.sheet.renderCollection(tab)});
    $('catalog-search').addEventListener('input',e=>{this.query=e.target.value.trim().toLocaleLowerCase();this.page=0;this.render()});
    $('catalog-clear').addEventListener('click',()=>{this.query='';this.page=0;$('catalog-search').value='';this.render();$('catalog-search').focus()});
    $('catalog-category').addEventListener('change',e=>{this.category=e.target.value;this.page=0;this.render()});
    for(const [id,step] of [['catalog-prev',-1],['catalog-next',1]])$(id).addEventListener('click',()=>{this.page+=step;this.render();this.closing=true;$('catalog-list').querySelector('button')?.focus({preventScroll:true});this.closing=false});
    $('catalog-detail-close').addEventListener('click',()=>this.hideDetail(true));
    $('catalog-detail').addEventListener('beforetoggle',event=>{if(event.newState==='closed'){this.anchor?.classList.remove('selected');this.anchor?.setAttribute('aria-expanded','false')}});
  }

  get pageSize(){return this.landscape.matches||this.phone.matches?12:this.short.matches?14:21}

  build() {
    const {save,game}=this.sheet;
    this.known=allItems.filter(item=>save.discoveredItems[item.id]&&(item.category!=='fusion'||game.discoveredFusions.has(item.key)));
    $('sheet-catalog-count').textContent=this.known.length;
    $('catalog-count').textContent=this.known.length+' / '+allItems.length;
    $('catalog-save-note').textContent=game.itemDiscoveryPersisted===false?'发现已暂存本页，尚未保存到浏览器。':'';
    this.render();
  }

  openItem(id) {
    if(this.closing||this.sheet.tab!=='catalog')return;
    const item=this.known.find(item=>item.id===id),anchor=[...$('catalog-list').children].find(button=>button.dataset.itemId===id);
    if(!item||!anchor)return;
    this.anchor?.classList.remove('selected');this.anchor?.setAttribute('aria-expanded','false');this.anchor=anchor;
    anchor.classList.add('selected');anchor.setAttribute('aria-expanded','true');
    const title=node('h3','',item.data.name),description=effectText(item.data.desc);title.id='catalog-detail-title';description.id='catalog-detail-description';
    $('catalog-detail-body').replaceChildren(node('small','',categories[item.category]+(item.type==='pickup'?'':' · 基础效果')),title,description);
    const bubble=$('catalog-detail');if(!bubble.matches(':popover-open'))bubble.showPopover();
    this.sheet.positionBubble(bubble,anchor);
  }

  hideDetail(focus=false) {
    const bubble=$('catalog-detail');if(!bubble.matches(':popover-open'))return;
    this.closing=true;bubble.hidePopover();if(focus)this.anchor?.focus({preventScroll:true});this.closing=false;
  }

  render() {
    if(!this.known)return;
    this.hideDetail();
    $('catalog-category').replaceChildren(...Object.entries(categories).map(([key,label])=>{const option=node('option','',label);option.value=key;return option}));
    $('catalog-category').value=this.category;
    this.entries=this.known.filter(item=>(this.category==='all'||item.category===this.category)&&(!this.query||[item.data.name,item.data.evolution,item.data.desc,item.data.trigger,categories[item.category],...(item.type==='pickup'?[]:itemTags(item.key).map(tag=>BUILD_TAGS[tag].name))].filter(Boolean).join(' ').toLocaleLowerCase().includes(this.query)));
    const pages=Math.max(1,Math.ceil(this.entries.length/this.pageSize));
    this.page=Math.max(0,Math.min(this.page,pages-1));
    const entries=this.entries.slice(this.page*this.pageSize,(this.page+1)*this.pageSize);
    $('catalog-list').replaceChildren(...entries.map(item=>{
      const button=node('button','catalog-item');button.dataset.itemId=item.id;button.setAttribute('aria-label',item.data.name);button.setAttribute('aria-controls','catalog-detail');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');
      button.append(itemArt(item));button.addEventListener('click',event=>{this.openItem(item.id);if(event.detail===0)$('catalog-detail-close').focus({preventScroll:true})});
      button.addEventListener('focus',()=>this.openItem(item.id));button.addEventListener('pointermove',event=>{if(event.pointerType==='mouse'&&button.getAttribute('aria-expanded')!=='true')this.openItem(item.id)});return button;
    }));
    $('catalog-prev').disabled=this.page===0;$('catalog-next').disabled=this.page===pages-1;
    $('catalog-page').textContent=(this.page+1)+' / '+pages;$('catalog-pagination').classList.toggle('hidden',!this.entries.length);
    const empty=$('catalog-empty');empty.classList.toggle('hidden',this.entries.length>0);
    empty.textContent=this.query?'没有找到相关道具。':'尚未发现这类道具，出征后再来看看。';
  }
}
