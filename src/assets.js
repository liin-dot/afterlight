// CC0 source packs and modifications are recorded in assets/CREDITS.md.
const sheets={},frames={},spriteCache=new Map(),tileCache=new Map();
const TAU=Math.PI*2;
export const artAvailable=()=>!!(sheets.dungeon&&sheets.spells&&sheets['tiny-dungeon']);
export async function loadArt(){
 const results=await Promise.allSettled(['dungeon','tiny-dungeon','spells'].map(async name=>{
  const image=new Image();image.src=new URL('../assets/'+name+'.png',import.meta.url);await image.decode();
  if(name!=='tiny-dungeon'){const response=await fetch(new URL('../assets/'+(name==='dungeon'?'dungeon':'spell')+'-frames.json',import.meta.url));if(!response.ok)throw Error(name+' frame map unavailable');frames[name]=await response.json()}
  sheets[name]=image;
 }));
 // The original canvas art remains available when an asset cannot be loaded.
 return results.every(result=>result.status==='fulfilled');
}
export function dungeon(g,name,x,y,w,h){
 const rect=frames.dungeon?.[name];if(!sheets.dungeon||!rect)return false;
 g.drawImage(sheets.dungeon,...rect,Math.round(x),Math.round(y),Math.round(w??rect[2]),Math.round(h??rect[3]));return true;
}
export function tiny(g,index,x,y,w=16,h=16){
 if(!sheets['tiny-dungeon'])return false;
 g.drawImage(sheets['tiny-dungeon'],index%12*16,Math.floor(index/12)*16,16,16,Math.round(x),Math.round(y),Math.round(w),Math.round(h));return true;
}
export function spell(g,name,x,y,time=0,size=20,angle=0,stretch=1){
 const rect=frames.spells?.[name];if(!sheets.spells||!rect)return false;
 const [sx,sy,w,h,count]=rect,frame=((Math.floor(time*12)%count)+count)%count;
 g.save();g.translate(Math.round(x),Math.round(y));if(angle)g.rotate(angle);
 g.drawImage(sheets.spells,sx+frame*w,sy,w,h,-size*stretch/2,-size/2,size*stretch,size);g.restore();return true;
}
const equipmentIcons={blade:'weapon_knight_sword',bolt:'weapon_bow',lance:'weapon_spear',axe:'weapon_waraxe',hammer:'weapon_hammer',whirlwind:'weapon_double_axe',quake:'weapon_big_hammer'};
export function packedIcon(g,kind){
 if(!artAvailable())return false;
 const name=equipmentIcons[kind];
 if(name){const rect=frames.dungeon[name],scale=Math.min(22/rect[2],22/rect[3]);dungeon(g,name,(24-rect[2]*scale)/2,(24-rect[3]*scale)/2,rect[2]*scale,rect[3]*scale);return true}
 if(kind==='needle'||kind==='frostloom'){const count=kind==='frostloom'?3:1;for(let i=0;i<count;i++){const offset=(i-(count-1)/2)*3;spell(g,'ice-lance',12+offset,12+offset,.1,23,-Math.PI/4)}return true}
 return false;
}
const actors={
 warden:['knight_m',1.2,'weapon_knight_sword'],witch:['wizzard_f',1.2,'weapon_green_magic_staff'],ranger:['elf_f',1.4,'weapon_bow'],smith:['dwarf_m',1.2,'weapon_big_hammer'],mariner:['wizzard_m',1.2,'weapon_spear'],
 skeleton:['skelet',1.15],ghoul:['tiny_zombie',1.25],ghost:['angel',1.25],knight:['masked_orc',1.2,'weapon_rusty_sword'],reaper:['necromancer',1.3,'weapon_red_magic_staff'],
 cinderling:['imp',1.2],bomber:['chort',1.2],bulwark:['orc_warrior',1.2],siren:['lizard_f',1],leech:['slug',1.2],oracle:['orc_shaman',1.2,'weapon_green_magic_staff'],
};
export const PACK_ACTORS=Object.keys(actors);
export function packedSprite(kind,frame=0,variant=0,moving=false){
 if(!sheets.dungeon||!sheets['tiny-dungeon'])return null;
 const key=[kind,frame%4,variant,moving].join(':');if(spriteCache.has(key))return spriteCache.get(key);
 const actor=actors[kind],sizes={grave:[30,34],cross:[28,38],pillar:[34,61],arch:[132,100],furnace:[52,66],chest:[25,25],crate:[32,42],scrap:[34,24],wreck:[52,34],seaweed:[34,32],tideStone:[30,36],anvil:[46,36]};
 if(!actor&&!sizes[kind])return null;
 const c=document.createElement('canvas');[c.width,c.height]=sizes[kind]||[32,40];const g=c.getContext('2d');g.imageSmoothingEnabled=false;
 if(actor){
  const [name,scale,weapon]=actor;let base=name+'_'+(moving?'run':'idle')+'_anim_f';
  if(!frames.dungeon[base+'0'])base=name+'_anim_f';
  const count=frames.dungeon[base+'3']?4:frames.dungeon[base+'2']?3:2,id=base+frame%count;
  const rect=frames.dungeon[id];if(!rect)return null;
  const w=rect[2]*scale,h=rect[3]*scale;dungeon(g,id,16-w/2,30-h,w,h);
  if(weapon){const rect=frames.dungeon[weapon];dungeon(g,weapon,23,10+(frame%2),rect[2]*.7,rect[3]*.7)}
  if(kind==='bulwark'){g.fillStyle='#1b2534';g.fillRect(18,16,13,18);g.fillStyle='#8a9ca3';g.fillRect(19,17,11,15);g.fillStyle='#e5c07b';g.fillRect(23,18,3,13);g.fillRect(20,21,9,2)}
  if(kind==='bomber')dungeon(g,'bomb_f'+frame%3,9,16,15,15);
  if(kind==='mariner'){g.globalCompositeOperation='source-atop';g.fillStyle='#49bacc40';g.fillRect(0,0,32,40);g.globalCompositeOperation='source-over';g.fillStyle='#c0ece2';g.fillRect(24,12,1,13);g.fillRect(21,16,7,1)}
  if(kind==='ghost'){g.globalCompositeOperation='source-atop';g.fillStyle='#96e2d280';g.fillRect(0,0,32,40)}
 }else if(kind==='grave'||kind==='cross')tiny(g,kind==='grave'?65:64,0,0,c.width,c.height-4);
 else if(kind==='pillar')dungeon(g,'column',7,0,20,58);
 else if(kind==='chest')dungeon(g,'chest_full_open_anim_f0',0,0,25,25);
 else if(kind==='arch'){
  dungeon(g,'doors_frame_left',2,32,32,64);dungeon(g,'doors_frame_right',98,32,32,64);dungeon(g,'doors_frame_top',34,0,64,32);
  tiny(g,19,50,11,32,32);
 }else if(kind==='furnace'){
  dungeon(g,'wall_fountain_top_2',2,0,48,24);dungeon(g,'wall_fountain_mid_red_anim_f'+frame%3,2,24,48,24);dungeon(g,'wall_fountain_basin_red_anim_f'+frame%3,2,48,48,16);
 }else if(kind==='crate')dungeon(g,'crate',0,0,32,40);
 else if(kind==='scrap'){
  g.fillStyle='#25292d';g.fillRect(3,15,26,5);g.fillStyle='#505451';g.fillRect(4,12,11,5);g.fillRect(18,14,12,4);g.fillStyle='#777568';g.fillRect(5,12,8,1);g.fillRect(19,14,8,1);g.fillStyle='#8e7155';g.fillRect(8,13,2,2);g.fillRect(22,15,2,2);
 }
 else if(kind==='wreck'){g.save();g.translate(22,17);g.rotate(-.22);dungeon(g,'crate',-20,-12,28,25);tiny(g,77,-3,-2,32,16);g.restore()}
 else if(kind==='seaweed'){
  for(let i=0;i<5;i++){g.fillStyle=i%2?'#457c79':'#64968b';for(let j=0;j<7;j++)g.fillRect(6+i*5+Math.round(Math.sin(j*.8+i)*2),27-j*3,2,4)}
 }else if(kind==='tideStone'){tiny(g,65,0,0,30,32);g.globalCompositeOperation='source-atop';g.fillStyle='#5ab8ca55';g.fillRect(0,0,30,36)}
 else if(kind==='anvil'){
  g.fillStyle='#31363e';g.fillRect(16,10,17,19);g.fillRect(10,27,30,4);g.fillStyle='#737b7c';g.fillRect(6,7,34,7);g.fillRect(2,7,10,3);g.fillStyle='#9d9b8b';g.fillRect(8,6,31,2);
 }
 if(['grave','cross','tideStone'].includes(kind)){g.globalCompositeOperation='source-atop';g.fillStyle=kind==='tideStone'?'#19455288':'#1c3834aa';g.fillRect(0,0,c.width,c.height)}
 spriteCache.set(key,c);return c;
}
function terrainTile(stage,index){
 const key=stage+':'+index;if(tileCache.has(key))return tileCache.get(key);
 const c=document.createElement('canvas');c.width=c.height=32;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
 if(stage==='coast')tiny(g,48+index%6,0,0,32,32);else dungeon(g,'floor_'+(index%8+1),0,0,32,32);
 g.globalCompositeOperation='source-atop';g.fillStyle={graveyard:'#142c29c4',foundry:'#27282ec4',coast:'#19343bc4'}[stage];g.fillRect(0,0,32,32);
 g.globalCompositeOperation='multiply';g.fillStyle=stage==='foundry'?'#b4a4a0':stage==='coast'?'#aac6c7':'#a3bdb5';g.fillRect(0,0,32,32);
 tileCache.set(key,c);return c;
}
export function terrainChunk(g,cx,cy,stage,noise){
 if(!sheets.dungeon||!sheets['tiny-dungeon'])return false;
 for(let j=0;j<8;j++)for(let i=0;i<8;i++){
  const wx=cx*8+i,wy=cy*8+j,n=noise(wx,wy),x=i*32,y=j*32;g.drawImage(terrainTile(stage,Math.floor(n*8)),x,y);
  if(stage==='graveyard'){
   const path=Math.abs(wx*32+Math.sin(wy*.3)*18)<28||Math.abs(wy*32)<24;
   if(path){g.globalAlpha=.38;dungeon(g,'floor_'+(Math.floor(n*8)+1),x,y,32,32);g.globalAlpha=1}
   else if(n>.82){g.fillStyle='#56816c';for(let k=0;k<3;k++){g.fillRect(x+4+k*4,y+20-k,1,3+k%2);g.fillRect(x+3+k*4,y+19-k,1,2)}}
  }else if(stage==='foundry'){
   if(wy%7===0){g.fillStyle='#6f5a4b';g.fillRect(x,y+9,32,2);g.fillRect(x,y+22,32,2);g.fillStyle='#22232b';for(let k=0;k<4;k++)g.fillRect(x+k*8,y+11,3,11)}
   if(n>.9){g.fillStyle='#b06d3d66';g.fillRect(x+7,y+4,1,12);g.fillRect(x+8,y+15,9,1)}
  }else if(n>.64){
   g.strokeStyle='#6d9fa54d';g.beginPath();g.moveTo(x+3,y+21);g.quadraticCurveTo(x+15,y+16,x+27,y+20);g.stroke();g.fillStyle='#9cb9ac';g.fillRect(x+22,y+7,2,1);
  }
 }
 // Ground ornaments are texture only; hazard telegraphs are rendered by Game.
 if(stage==='foundry'&&noise(cx,cy)>.6){g.strokeStyle='#af774b33';g.strokeRect(68,68,120,120);g.strokeRect(74,74,108,108)}
 if(stage==='coast'&&noise(cx,cy)>.45){g.strokeStyle='#77bec52b';for(let i=0;i<3;i++){g.beginPath();g.ellipse(128,128,65+i*8,30+i*5,-.3,.2,TAU*.7);g.stroke()}}
 return true;
}
