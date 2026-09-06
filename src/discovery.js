import {WEAPONS,catalogItem,normalizeItemDiscoveries} from './data.js';
import {FUSIONS} from './fusions.js';

// Discovery is a permanent record of acquisition, independent of current equipment.
export function rememberItems(save,items) {
  const updates=normalizeItemDiscoveries(items),fresh=[];
  save.discoveredItems??={};let changed=false;
  for(const [id,level] of Object.entries(updates)) {
    const item=catalogItem(id);
    if(item.category==='fusion'&&!save.discoveredFusions.includes(item.key))continue;
    const previous=save.discoveredItems[id]||0;
    if(level<=previous)continue;
    save.discoveredItems[id]=level;changed=true;
    if(!previous)fresh.push(item);
  }
  return {changed,fresh};
}

export function rememberInventory(save,game) {
  return rememberItems(save,Object.fromEntries([
    ...Object.entries(game.weapons||{}).map(([id,level])=>['weapon:'+id,level]),
    ...Object.entries(game.passives||{}).map(([id,level])=>['passive:'+id,level]),
  ]));
}

export function recoverFusionDiscoveries(save) {
  const records={};
  // Legacy saves prove that both ingredients were owned at least at recipe level.
  for(const key of save.discoveredFusions) {
    const recipe=FUSIONS[key];if(!recipe||!WEAPONS[key])continue;
    records['weapon:'+key]=1;
    for(const item of recipe.ingredients){const id=item.type+':'+item.id;records[id]=Math.max(records[id]||0,item.required)}
  }
  return rememberItems(save,records);
}
