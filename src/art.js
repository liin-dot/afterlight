// All artwork is drawn on a low-resolution canvas, one pixel at a time.
// No sprite packs, image downloads, or rendering libraries are used.
export const TAU = Math.PI * 2;
export const palette = { gold:'#dfa66b', light:'#eee3b4', green:'#a6d788', cyan:'#92d9ce', purple:'#bdabd9', red:'#c97967' };
export function hash(x, y = 0, seed = 0) { let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295; }
export const lerp = (a,b,t) => a + (b-a)*t;
export const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
export function canvas(w,h) { const c=document.createElement('canvas');c.width=w;c.height=h;return c; }
function rect(g,color,x,y,w,h){g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function poly(g,color,points){g.fillStyle=color;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();}
function pixels(g, rows, colors, ox=0, oy=0){rows.forEach((row,y)=>[...row].forEach((p,x)=>{if(colors[p])rect(g,colors[p],ox+x,oy+y,1,1)}));}
const cache = new Map();

const humanoid = [
 '      ooooo      ',
 '     occccco     ',
 '    occchccco    ',
 '    occhhccco    ',
 '   occccccccco   ',
 '   ocsooooscco   ',
 '   ocsellecsco   ',
 '    osssssooo    ',
 '    ooosooooo    ',
 '   occbbbbccco   ',
 '  occlbggblccco  ',
 '  ocllbbbblccco  ',
 ' oocclbbblcccoo  ',
 ' ossocbbbccosso  ',
 ' ossocbbbccosso  ',
 '  ooocbbbccooo   ',
 '   occbbcccco    ',
 '  occcbbccccco   ',
 '  occcbbccccco   ',
 '   oobbbbooo     ',
 '    oddoddo      ',
 '    oddoddo      ',
 '   odddoddodo    ',
 '   oooo oooo     ',
];
const charColors = {
 warden:{o:'#131e1b',c:'#aa694c',h:'#d19569',s:'#b7a58b',e:'#f6d299',l:'#dec49a',b:'#343b32',g:'#d2a779',d:'#3e4838'},
 witch:{o:'#131e1d',c:'#76658c',h:'#b49dc5',s:'#b6b9b1',e:'#b8f2dd',l:'#d6e5ce',b:'#353c4d',g:'#85cbb6',d:'#3a3c46'},
 ranger:{o:'#101e1a',c:'#738659',h:'#a5b57d',s:'#c2af8c',e:'#e0e4a5',l:'#eee0ac',b:'#2a4332',g:'#be995f',d:'#3b4731'},
};

export function sprite(kind,frame=0,variant=0){
 const key=`${kind}:${frame%2}:${variant}`;if(cache.has(key))return cache.get(key);
 let c=canvas(32,40),g=c.getContext('2d');g.imageSmoothingEnabled=false;
 if(charColors[kind]){
   const colors=charColors[kind];pixels(g,humanoid,colors,7,7);
   if(frame%2){rect(g,colors.o,10,27,13,5);rect(g,colors.d,12,27,3,3);rect(g,colors.d,19,26,3,3);rect(g,colors.o,18,29,6,1)}
   if(kind==='warden'){rect(g,'#272a24',25,16,2,15);rect(g,'#777d6b',26,13,2,13);rect(g,'#dcdabc',26,14,1,11);rect(g,'#bd935b',23,25,6,2);rect(g,'#755238',26,27,2,4);rect(g,'#eee0b1',27,13,1,2)}
   if(kind==='witch'){rect(g,'#584636',26,14,2,18);rect(g,'#b79b71',26,16,1,14);rect(g,'#52776b',24,11,6,6);rect(g,'#a1e1c7',25,10,4,5);rect(g,'#e7f5d8',26,10,2,2);rect(g,'#6d5b88',13,5,8,3);rect(g,'#9581a8',14,3,5,3);rect(g,'#bfacc4',15,2,3,2)}
   if(kind==='ranger'){rect(g,'#543f2e',24,13,2,19);rect(g,'#b8945a',25,13,2,3);rect(g,'#b8945a',27,16,2,13);rect(g,'#b8945a',25,29,2,3);rect(g,'#d1c497',25,17,1,12);rect(g,'#b89b69',25,22,7,1);rect(g,'#e3d9ad',30,21,2,3)}
 }else if(kind==='skeleton'){
   pixels(g,[
    '   ooooo   ','  obbbbbo  ',' obbhbbbbo ',' obooboobbo',' obooboobbo','  obbbbbo  ','   bobob   ','    ooo    ',' obbooboob ','ob obbbo bo','ob bbbbo bo','ob obbbo bo',' b obobo b ','   obobo   ','   obobo   ','   bo ob   ','  obo obo  ','  bb   bb  '
   ],{o:'#29372e',b:'#bfc1a1',h:'#e1dec0'},10,13);
   rect(g,'#e3b883',13,17,1,1);rect(g,'#e3b883',17,17,1,1);if(frame%2){rect(g,'#314333',11,30,12,2);rect(g,'#bfc1a1',12,28,2,2);rect(g,'#bfc1a1',18,29,3,2)}
 }else if(kind==='ghoul'){
   pixels(g,['    ooooo    ','  ooggghoo   ','  oggghgggo  ',' oggoggoggo  ',' oggoggoggo  ','  oggooggo   ',' oooggoogoo  ','oggggggggggo ','ogggdggdgggo ','oggdddddggo  ','og odddd go  ',' o odddo o   ','   odddo     ','  oogggoo    ','  ogo ogo    ','  ggo ogg    '],{o:'#1d2923',g:'#778f61',h:'#abb685',d:'#475b41'},9,15);
 }else if(kind==='bat'){
   const up=frame%2?4:0;poly(g,'#27352e',[[2,20-up],[8,22],[12,17],[16,21],[20,17],[24,22],[31,20-up],[28,28],[23,25],[20,30],[12,30],[9,25],[4,28]]);poly(g,'#7f7282',[[3,21-up],[10,24],[12,19],[15,23],[20,20],[22,25],[30,21-up],[26,27],[22,25],[19,28],[13,28],[9,25],[5,27]]);rect(g,'#514a60',13,22,8,8);rect(g,'#dfaa87',14,24,2,1);rect(g,'#dfaa87',18,24,2,1);
 }else if(kind==='ghost'){
   pixels(g,['     pppp     ','   ppggggpp   ','  pggglggggp  ',' pgglllllgggp ',' pgllgllgllgp ',' pgllgllgllgp ',' pggllllllggp ',' pggggggggggp ',' pggggggggggp ',' pgcggccggcgp ',' pgcccggccggp ',' pcccppccppcp ','  ppp  pp  p  '],{p:'#365c56',g:'#7fa999',l:'#c0d5bc',c:'#52877a'},9,12+frame%2);
 }else if(kind==='knight'){
   pixels(g,['    ooooo    ','   occccco   ','  occchccco  ','  occcccco   ','  obbobbbo   ','  ooeoeeoo   ','   occcco    ','  occggcco   ',' oooccccooo  ','occchccccc co','occccggcco co','occcccccco co','occoccccoo co','occocccco  co',' o occcco  o ','   ococco    ','   odo do    ','  oddo ddo   ','  oooo ooo   '],{o:'#192625',c:'#607777',h:'#92a3a0',b:'#253a3c',e:'#ddaa80',g:'#b49971',d:'#394a46'},8,11);rect(g,'#879b8f',27,17,2,16);rect(g,'#d8d8b2',28,17,1,13);rect(g,'#ad9568',24,29,7,2);
 }else if(kind==='reaper'){
   pixels(g,humanoid,{o:'#111a1a',c:'#393946',h:'#696173',s:'#aab49d',e:'#e6a276',l:'#dbe0b6',b:'#202c2b',g:'#a67967',d:'#2b3432'},7,6);rect(g,'#716046',28,9,2,25);rect(g,'#b4beb0',20,8,10,2);rect(g,'#d7dabc',18,10,6,2);rect(g,'#c0c9ab',16,12,4,2);rect(g,'#7e978a',14,14,4,4);
 }else if(kind==='tree'){
   c=canvas(74,100);g=c.getContext('2d');rect(g,'#162820',30,70,12,25);rect(g,'#443d2b',32,59,8,36);rect(g,'#5b5136',33,70,3,23);rect(g,'#263423',25,93,23,3);
   const hues=['#172d24','#1c3428','#243d2c','#2b4530','#314b32'];
   for(let layer=0;layer<6;layer++){const y=79-layer*11,half=33-layer*4;poly(g,hues[layer%3],[[36,y-27],[36-half,y-2],[39-half,y-2],[39-half-5,y+4],[29,y+7],[36,y+10],[49,y+6],[36+half,y+3],[36+half-4,y-3]]);for(let j=0;j<20;j++){let rx=hash(j,layer,variant),ry=hash(j+44,layer,variant);let xx=36+(rx-.5)*half*1.5,yy=y-15+ry*19;if(Math.abs(xx-36)<(yy-y+29)*1.25)rect(g,hues[2+((j+layer)%3)],xx,yy,2+Math.floor(hash(j,3)*6),2);}}
   rect(g,'#597050',36,8,2,5);rect(g,'#4a6543',32,20,4,2);
 }else if(kind==='deadTree'){
   c=canvas(60,89);g=c.getContext('2d');poly(g,'#263a2b',[[23,86],[27,55],[24,42],[14,34],[9,19],[14,22],[19,31],[27,34],[30,9],[34,4],[32,31],[35,40],[44,30],[46,14],[49,13],[49,34],[37,48],[37,66],[42,85]]);rect(g,'#586049',29,42,3,40);rect(g,'#414f39',33,25,2,59);rect(g,'#6b7050',29,34,2,17);rect(g,'#40543b',17,32,8,3);
 }else if(kind==='grave'){
   c=canvas(27,30);g=c.getContext('2d');rect(g,'#17271e',3,26,22,3);rect(g,'#405047',5,7,17,20);rect(g,'#536456',7,4,13,22);rect(g,'#6d7b65',9,3,9,2);rect(g,'#76836b',7,7,2,15);rect(g,'#34483b',19,8,3,18);rect(g,'#344b3c',10,12,8,2);rect(g,'#344b3c',13,9,2,10);rect(g,'#839075',9,6,8,1);rect(g,'#304832',4,24,18,4);rect(g,'#6a7951',5,24,6,2);rect(g,'#607249',19,22,4,3);rect(g,'#87915f',20,22,2,1);
 }else if(kind==='cross'){
   c=canvas(24,36);g=c.getContext('2d');rect(g,'#25372a',3,31,19,3);rect(g,'#495b4c',9,4,7,28);rect(g,'#6e7b61',9,4,3,24);rect(g,'#52624e',3,11,20,7);rect(g,'#7d8669',3,11,20,2);rect(g,'#314836',13,19,2,10);rect(g,'#738158',7,30,12,3);
 }else if(kind==='bush'){
   c=canvas(33,22);g=c.getContext('2d');for(let i=0;i<15;i++){let x=4+hash(i,8,variant)*23,y=6+hash(i,9,variant)*10;rect(g,['#283e29','#344c30','#46603b','#587044'][i%4],x,y,5,4)}for(let i=0;i<4;i++)rect(g,'#9c9f63',9+hash(i,2,variant)*14,7+hash(i,3,variant)*10,2,1);
 }else if(kind==='pillar'){
   c=canvas(34,61);g=c.getContext('2d');rect(g,'#24372b',2,56,30,3);rect(g,'#4b5b4a',6,48,22,8);rect(g,'#68735b',5,47,24,3);rect(g,'#485b49',10,15,15,32);rect(g,'#657560',10,15,4,32);rect(g,'#344c3e',23,15,3,33);rect(g,'#77816a',7,10,21,5);rect(g,'#4a5c4a',8,5,18,5);rect(g,'#889177',9,4,15,2);for(let i=0;i<3;i++){rect(g,'#314c37',11+i*3,26+i*8,10,1)}rect(g,'#81905a',5,49,8,2);rect(g,'#69834a',7,45,4,3);
 }else if(kind==='arch'){
   c=canvas(132,100);g=c.getContext('2d');rect(g,'#10221a',12,90,108,6);for(let side=0;side<2;side++){const x=side?101:13;rect(g,'#455a49',x,38,20,55);rect(g,'#657661',x,38,5,51);rect(g,'#2e4537',x+17,38,4,51);rect(g,'#6c7b63',x-3,86,27,6);rect(g,'#354c3a',x-1,90,26,4);for(let j=0;j<5;j++){rect(g,'#233d2d',x,42+j*9,20,1);rect(g,'#829077',x+1,43+j*9,3,1)}rect(g,'#718060',x-2,36,25,6)}
   const stones=[[20,25,20,13],[28,14,20,13],[43,7,20,12],[61,3,19,13],[80,8,20,13],[97,19,19,16]];
   for(const [x,y,w,h] of stones){rect(g,'#334e3c',x,y,w,h);rect(g,'#637b60',x,y,w-2,h-2);rect(g,'#8d9574',x,y,w-2,2);rect(g,'#415d42',x+w-5,y+3,3,h-3)}
   rect(g,'#698350',30,18,11,3);rect(g,'#829252',33,14,6,4);rect(g,'#5d7a45',93,31,15,3);rect(g,'#506c3c',97,32,3,18);rect(g,'#6c844a',102,32,2,12);rect(g,'#7d8b50',104,30,5,3);rect(g,'#3a543a',53,23,3,8);rect(g,'#677a4c',52,27,3,10);
 }else if(kind==='shrine'){
   c=canvas(45,54);g=c.getContext('2d');rect(g,'#1b3326',3,46,38,6);rect(g,'#5c6b53',5,43,34,6);rect(g,'#839075',5,43,34,2);rect(g,'#384e3b',10,37,25,6);rect(g,'#69785c',12,25,22,13);rect(g,'#8b9872',12,25,22,2);rect(g,'#354c3a',16,29,13,2);rect(g,'#788965',16,20,14,5);rect(g,'#a3a879',17,21,12,2);rect(g,'#497650',19,6,8,14);rect(g,'#9ac992',20,4,6,14);rect(g,'#d3e4b2',21,5,2,8);rect(g,'#709765',17,11,3,6);rect(g,'#a7c180',25,10,4,6);
 }else if(kind==='lantern'){
   c=canvas(17,38);g=c.getContext('2d');rect(g,'#26352a',6,28,5,9);rect(g,'#706349',7,19,2,15);rect(g,'#aa8c55',4,7,9,2);rect(g,'#6d5d42',3,10,11,12);rect(g,'#d59151',5,10,7,10);rect(g,'#edd08a',6,11,4,8);rect(g,'#ffedb5',7,12,2,5);rect(g,'#3d4936',3,20,11,3);rect(g,'#8c8257',4,9,1,11);rect(g,'#7e724c',12,9,1,11);rect(g,'#5b5a43',6,5,5,2);
 }else if(kind==='chest'){
   c=canvas(25,25);g=c.getContext('2d');rect(g,'#253125',2,19,21,3);rect(g,'#7e5733',3,9,18,11);rect(g,'#b08547',3,7,18,5);rect(g,'#d4aa66',5,6,14,2);rect(g,'#553c2d',3,13,18,2);rect(g,'#d2ad68',6,9,2,10);rect(g,'#d2ad68',16,9,2,10);rect(g,'#e3c887',11,12,3,4);rect(g,'#eedca1',11,12,3,1);
 }
 cache.set(key,c);return c;
}

export function drawSprite(g,kind,x,y,{frame=0,flip=false,scale=1,alpha=1,variant=0}={}){
 const s=sprite(kind,frame,variant);const anchor=s.width===32&&s.height===40?10:4;g.save();g.globalAlpha*=alpha;g.translate(Math.round(x),Math.round(y));if(flip)g.scale(-1,1);g.drawImage(s,Math.round(-s.width*scale/2),Math.round((-s.height+anchor)*scale),Math.round(s.width*scale),Math.round(s.height*scale));
 g.restore();
}

import {drawContentIcon} from './content-art.js';
const iconCache=new Map();
export function icon(kind){
 if(iconCache.has(kind))return iconCache.get(kind);const c=canvas(24,24),g=c.getContext('2d');
 if(drawContentIcon(g,kind)){iconCache.set(kind,c);return c}
 if(kind==='solar'){for(let i=0;i<12;i++){let a=i*TAU/12;rect(g,i%2?'#edc581':'#c98348',11+Math.cos(a)*9,11+Math.sin(a)*9,3,3)}rect(g,'#ba673e',7,7,11,11);rect(g,'#efb665',9,7,7,11);rect(g,'#ffdf9c',11,5,3,13);rect(g,'#ffefc1',12,5,1,10);rect(g,'#886340',7,16,11,2);rect(g,'#e3b77a',11,18,3,4)}
 if(kind==='thunderbolt'){g.drawImage(icon('bolt'),0,0);poly(g,'#655782',[[13,1],[21,1],[16,8],[22,8],[10,23],[13,13],[7,13]]);poly(g,'#c7b9e8',[[14,2],[19,2],[14,10],[19,10],[12,19],[15,11],[10,11]]);rect(g,'#f3e9ff',14,3,2,4);rect(g,'#a5e4e0',3,3,2,2);rect(g,'#b6c7f1',19,18,2,2)}
 if(kind==='glacier'){for(let i=0;i<5;i++){let a=i*TAU/5-1.6,x=12+Math.cos(a)*8,y=12+Math.sin(a)*8;poly(g,'#71a9ba',[[x,y-4],[x+3,y],[x,y+4],[x-3,y]]);rect(g,'#d3eee5',x,y-2,1,3)}rect(g,'#446e82',8,8,8,8);rect(g,'#a7d9da',10,7,4,10);rect(g,'#a7d9da',7,10,10,4);rect(g,'#edfae0',11,9,2,5)}
 if(kind==='blade'){poly(g,'#6b8880',[[5,18],[8,12],[17,3],[21,2],[20,6],[11,15]]);poly(g,'#e5e6b9',[[7,16],[9,12],[18,3],[20,3],[19,6],[10,15]]);rect(g,'#bb8b4f',4,12,3,3);rect(g,'#e4b877',6,14,3,3);rect(g,'#ad7543',8,16,3,3);rect(g,'#755337',3,17,4,4);rect(g,'#d2a25e',2,20,3,2)}
 if(kind==='bolt'){rect(g,'#897049',6,8,3,13);rect(g,'#d0ad70',8,6,10,2);rect(g,'#d0ad70',18,8,2,10);rect(g,'#b79663',8,19,10,2);rect(g,'#d4d4a2',8,9,1,9);rect(g,'#819868',2,13,18,2);rect(g,'#e6dfab',18,11,3,6);rect(g,'#e6dfab',21,13,2,2)}
 if(kind==='orbit'){for(let i=0;i<3;i++){let x=12+Math.cos(i*TAU/3-.5)*7,y=12+Math.sin(i*TAU/3-.5)*7;rect(g,'#486e65',x-3,y-3,6,6);rect(g,'#a6dcd0',x-2,y-2,4,4);rect(g,'#e4f2d2',x-1,y-2,2,2)}rect(g,'#80a996',10,10,4,4);rect(g,'#c0dbc0',11,11,2,2)}
 if(kind==='storm'){poly(g,'#727d8d',[[13,1],[20,1],[15,10],[20,10],[7,24],[10,14],[4,14]]);poly(g,'#ddcc9b',[[12,2],[17,2],[13,11],[17,11],[9,21],[12,12],[7,12]]);rect(g,'#fbebc6',12,5,2,5)}
 if(kind==='flame'){pixels(g,['      r     ','     rrr    ','    rryr r  ','   rryyrrrr ','  rryyyyryr ',' rryyyyyyyr ',' rryylyyyyrr',' ryylllyyyrr',' ryyllllyyrr','  rylllyyrr ','   ryyyrrr  ','    rrrr    '],{r:'#b96845',y:'#e8ad59',l:'#ffe1a1'},6,5)}
 if(kind==='frost'){rect(g,'#5e9b9f',4,10,16,4);rect(g,'#5e9b9f',10,4,4,16);for(let i=0;i<5;i++){rect(g,'#99d5ce',5+i*3,5+i*3,2,2);rect(g,'#99d5ce',17-i*3,5+i*3,2,2)}rect(g,'#bee5d5',5,11,14,2);rect(g,'#bee5d5',11,5,2,14);rect(g,'#e3f1d6',10,10,4,4)}
 if(kind==='power'){pixels(g,['   rr   rr   ','  rllr rllr  ',' rllllrllllr ',' rlllllllllr ',' rlllllllllr ','  rlllllllr  ','   rlllllr   ','    rlllr    ','     rlr     '],{r:'#955e50',l:'#d89977'},6,7);rect(g,'#edd0a0',8,8,3,2)}
 if(kind==='vitality'||kind==='regen'){rect(g,'#355540',7,3,10,18);rect(g,'#355540',3,7,18,10);rect(g,'#a2bb88',9,4,6,16);rect(g,'#a2bb88',4,9,16,6);rect(g,'#d6dfaf',9,9,6,6);rect(g,'#e5ecc6',10,5,2,5)}
 if(kind==='haste'||kind==='speed'){pixels(g,['     gg     ','    glg     ','   gllg     ','  gllg      ',' gllllggggg ',' gllllllllg ',' ggggglllg  ','     gllg   ','    gllg    ','   gllg     ','   ggg      '],{g:'#5e8055',l:'#b3cb91'},6,6)}
 if(kind==='magnet'){rect(g,'#54747a',5,4,4,12);rect(g,'#54747a',15,4,4,12);rect(g,'#83b7b6',6,5,3,10);rect(g,'#83b7b6',15,5,3,10);rect(g,'#83b7b6',8,14,8,5);rect(g,'#cfe0c4',5,3,4,4);rect(g,'#cfe0c4',15,3,4,4);rect(g,'#bcded1',8,15,2,2);rect(g,'#597978',10,18,4,2)}
 if(kind==='armor'){poly(g,'#728773',[[4,4],[12,1],[20,4],[20,14],[12,22],[4,14]]);poly(g,'#b4c3a1',[[6,5],[12,3],[18,5],[18,13],[12,19],[6,13]]);poly(g,'#6c8974',[[12,5],[17,6],[17,12],[12,17]]);rect(g,'#dce0b4',8,7,2,6)}
 if(kind==='luck'){pixels(g,['   gg gg   ','  gllgllg  ',' glllllllg ','  glllllg  ','   glllg   ','  glllllg  ',' glllllllg ','  gllgllg  ','   gg gg   '],{g:'#4f7951',l:'#b4c97c'},6,5);rect(g,'#7f9a5e',12,13,2,8)}
 iconCache.set(kind,c);return c;
}
export function paintIcon(target,kind){const g=target.getContext('2d');g.imageSmoothingEnabled=false;g.clearRect(0,0,target.width,target.height);g.drawImage(icon(kind),0,0,target.width,target.height)}
export function paintAvatar(target,kind){const g=target.getContext('2d');g.imageSmoothingEnabled=false;g.clearRect(0,0,target.width,target.height);const s=sprite(kind);g.drawImage(s,0,0,target.width,target.height)}

export class Landscape{
 constructor(){this.chunks=new Map();this.objects=new Map();}
 chunk(cx,cy){
  const key=cx+','+cy;if(this.chunks.has(key))return this.chunks.get(key);const c=canvas(256,256),g=c.getContext('2d');g.fillStyle='#273c2d';g.fillRect(0,0,256,256);
  for(let j=0;j<8;j++)for(let i=0;i<8;i++){let r=hash(cx*8+i,cy*8+j,3);rect(g,['#293e2e','#283d2e','#263b2d','#2b3e2e'][Math.floor(r*4)],i*32,j*32,32,32)}
  for(let i=0;i<500;i++){let x=hash(i,cx,cy*3+77)*256,y=hash(i,cy,cx*3+12)*256,r=hash(i,cy,55);rect(g,['#334831','#3b4e34','#22372a','#30472f','#45603b'][Math.floor(r*5)],x,y,1+Math.floor(r*4),1);if(r>.78)rect(g,'#4c6040',x+1,y-2,1,3)}
  for(let i=0;i<23;i++){let x=hash(i,cx,cy+15)*256,y=hash(i,cy,cx+48)*256;rect(g,'#203829',x,y,6,3);rect(g,'#495a41',x,y-1,4,2);rect(g,'#617056',x+1,y-1,2,1)}
  for(let i=0;i<9;i++){let x=hash(i,cx,cy+118)*256,y=hash(i,cy,cx+122)*256;rect(g,'#657347',x,y,1,2);rect(g,'#a0a177',x,y-1,2,1)}
  // Broken flagstones and an ancient processional path through the entire cemetery.
  for(let j=0;j<16;j++)for(let i=0;i<16;i++){let wx=cx*256+i*16,wy=cy*256+j*16;let circle=Math.hypot(wx,wy);let path=Math.abs(wx+Math.sin(wy/140)*16)<32||Math.abs(wy)<25;let plaza=circle<117;if((path||plaza)&&hash(wx,wy,48)>.15){let x=i*16+1,y=j*16+1,r=hash(wx,wy,21);rect(g,r>.5?'#465344':'#3f4e3e',x,y,14,14);rect(g,'#53604a',x,y,14,1);rect(g,'#2f4232',x,y+13,14,1);if(r>.7){rect(g,'#283e2b',x+8,y+2,1,6);rect(g,'#283e2b',x+7,y+7,1,5)}if(r<.3)rect(g,'#60734c',x+1,y+8,4,2)}}
  this.chunks.set(key,c);if(this.chunks.size>100)this.chunks.delete(this.chunks.keys().next().value);return c;
 }
 drawFloor(g,camera,w,h,t){
   const left=camera.x-w/2,top=camera.y-h/2;const minX=Math.floor(left/256),minY=Math.floor(top/256);for(let cy=minY;cy<=Math.floor((top+h)/256);cy++)for(let cx=minX;cx<=Math.floor((left+w)/256);cx++)g.drawImage(this.chunk(cx,cy),Math.round(cx*256-left),Math.round(cy*256-top));
   let sx=Math.round(-left),sy=Math.round(-top);
   g.save();g.translate(sx,sy);g.strokeStyle='#8b966144';g.lineWidth=1;g.beginPath();g.arc(0,0,78,0,TAU);g.stroke();g.strokeStyle='#243929';g.beginPath();g.arc(0,0,72,0,TAU);g.stroke();
   for(let i=0;i<12;i++){let a=i*TAU/12;rect(g,'#82866188',Math.cos(a)*78-1,Math.sin(a)*78-1,3,3)}
   // Hand-set stone plinth around the last campfire.
   for(let j=0;j<3;j++)for(let i=0;i<5;i++){rect(g,'#1e3326',-42+i*17,-10+j*10,16,9);rect(g,'#566148',-42+i*17,-12+j*10,16,9);rect(g,'#6b7252',-42+i*17,-12+j*10,16,1)}
   g.restore();
 }
 getObjects(camera,w,h){
   const list=[{kind:'arch',x:0,y:-48},{kind:'pillar',x:-82,y:7},{kind:'pillar',x:82,y:7},{kind:'lantern',x:-53,y:53},{kind:'lantern',x:53,y:53},{kind:'grave',x:126,y:51},{kind:'grave',x:141,y:90},{kind:'cross',x:-135,y:86}];
   const cell=90;const left=Math.floor((camera.x-w/2-85)/cell),right=Math.ceil((camera.x+w/2+85)/cell),top=Math.floor((camera.y-h/2-20)/cell),bottom=Math.ceil((camera.y+h/2+110)/cell);
   for(let cy=top;cy<=bottom;cy++)for(let cx=left;cx<=right;cx++){
    const key=cx+','+cy;let items=this.objects.get(key);if(!items){items=[];let x=cx*cell+hash(cx,cy,67)*cell,y=cy*cell+hash(cx,cy,68)*cell;
     if(Math.hypot(x,y)>140&&Math.abs(x)>44&&Math.abs(y)>40){let r=hash(cx,cy,17);let kind=r<.30?'tree':r<.42?'deadTree':r<.65?'grave':r<.78?'cross':r<.93?'bush':'pillar';items.push({kind,x,y,variant:Math.floor(hash(cx,cy,13)*4)});if(r<.29)items.push({kind:'bush',x:x+18,y:y+8,variant:2});if(r>.4&&r<.59)items.push({kind:'grave',x:x+22,y:y+4});if(r>.7&&r<.78)items.push({kind:'lantern',x:x-20,y:y+8})}
     this.objects.set(key,items);if(this.objects.size>1800)this.objects.delete(this.objects.keys().next().value)}list.push(...items)
   }return list.filter(o=>Math.abs(o.x-camera.x)<w/2+80&&o.y-camera.y>-h/2-15&&o.y-camera.y<h/2+115);
 }
}

export function glow(g,x,y,r,color,alpha=1){g.save();g.globalAlpha=alpha;const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,color);gr.addColorStop(1,'transparent');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);g.restore()}
export function fire(g,x,y,t,scale=1){
 g.save();g.translate(Math.round(x),Math.round(y));g.scale(scale,scale);rect(g,'#17251b',-15,0,30,5);rect(g,'#5d4930',-13,-1,25,4);rect(g,'#927046',-11,-2,9,3);rect(g,'#9b7746',4,-2,9,2);rect(g,'#6d6948',-17,2,6,4);rect(g,'#8d8260',13,1,5,4);
 for(let j=0;j<5;j++){let xx=-10+j*4,ht=8+Math.sin(t*8+j*2)*4+(j===2?13:3);rect(g,'#a35732',xx,-ht,5,ht);rect(g,'#d5803e',xx+1,-ht+3,4,ht-2);rect(g,'#ecb665',xx+1,-ht+7,3,ht-6);if(ht>14)rect(g,'#f4dda2',xx+1,-8,2,8)}
 for(let i=0;i<9;i++){let cycle=(t*(.5+hash(i,2)*.5)+hash(i,1))%1;rect(g,cycle>.7?'#a77b47':'#e6b168',Math.sin(cycle*5+i)*10, -7-cycle*44,1,2)}g.restore();
}
export function shadow(g,x,y,r,alpha=.25){g.fillStyle=`rgba(5,17,9,${alpha})`;g.beginPath();g.ellipse(Math.round(x),Math.round(y)+2,r,r*.35,0,0,TAU);g.fill()}
export function diamond(g,x,y,size,color){g.fillStyle=color;g.beginPath();g.moveTo(x,y-size);g.lineTo(x+size*.7,y);g.lineTo(x,y+size);g.lineTo(x-size*.7,y);g.fill()}
export function pixelText(g,text,x,y,color='#eee1b3',size=8,align='center'){g.font=`bold ${size}px Consolas,monospace`;g.textAlign=align;g.textBaseline='middle';g.fillStyle='#101e16';g.fillText(text,Math.round(x)+1,Math.round(y)+1);g.fillStyle=color;g.fillText(text,Math.round(x),Math.round(y))}
