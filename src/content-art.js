// 24×24 pixel silhouettes; no external image assets or smoothing.
export function drawContentIcon(g,kind) {
  const box=(c,x,y,w,h)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h)};
  const gem=(c,x,y,r)=>{for(let row=-r;row<=r;row++){const width=r-Math.abs(row);box(c,x-width,y+row,width*2+1,1)}};
  const ring=(color,cx,cy,r)=>{for(let i=0;i<16;i++){const a=i*Math.PI/8;box(color,cx+Math.cos(a)*r,cy+Math.sin(a)*r,2,2)}};
  const slash=color=>{box('#776963',6,4,2,18);for(let i=0;i<13;i++){const a=-1.7+i*.22;box(color,10+Math.cos(a)*9,11+Math.sin(a)*9,3,3)}box('#f5ead4',15,4,4,2);box('#ac9a82',4,17,7,2)};
  if(kind==='everseed'){ring('#9e925e',12,12,8);gem('#a6bc75',12,13,5);gem('#eed697',12,11,3);box('#6e9c63',11,15,2,7);box('#a3c481',6,17,5,2);box('#e8ca82',16,3,2,4);box('#e8ca82',15,4,4,2);return true}
  if(kind==='hailfire'){gem('#a8d8df',9,13,8);gem('#e69f6a',15,12,7);gem('#f1e5c1',12,12,3);box('#a8d8df',7,2,2,6);box('#e69f6a',16,2,2,6);return true}
  if(kind==='soulforge'){box('#7a9291',4,19,16,3);box('#a2c2ba',6,5,3,15);box('#a2c2ba',15,5,3,15);box('#b9d8cc',7,3,10,3);gem('#c7e9dd',12,12,5);gem('#f2f0c9',4,7,2);gem('#f2f0c9',21,7,2);return true}
  if(kind==='soulpact'){box('#708783',6,3,13,18);box('#b1d1c9',8,4,3,16);gem('#b7dddd',15,11,5);gem('#eff0d3',15,10,2);return true}
  if(kind==='hoarfrost'){gem('#719ba6',12,12,10);box('#d7e9da',11,3,2,18);box('#d7e9da',3,11,18,2);for(let i=0;i<6;i++)box('#acd9df',6+i*2,6+i*2,2,2);return true}
  if(kind==='rotclock'){box('#aea87a',5,2,14,3);box('#aea87a',5,20,14,3);for(let i=0;i<5;i++){box('#c1ce8c',7+i,5+i,10-i*2,1);box('#c1ce8c',7+i,19-i,10-i*2,1)}gem('#e4cf8c',12,12,2);return true}
  if(kind==='bulwark'){gem('#9cae8d',12,11,10);gem('#d4ddaf',12,10,7);box('#465447',11,3,2,7);box('#465447',8,10,6,2);box('#465447',8,12,2,7);gem('#efe8b9',20,19,3);return true}
  if(kind==='forkseed'){box('#cfb9c3',11,10,3,12);for(let i=0;i<8;i++){box('#d6b6ce',11-i,11-i,3,2);box('#d6b6ce',12+i,11-i,3,2)}gem('#f1d5c2',5,4,3);gem('#f1d5c2',19,4,3);return true}
  if(kind==='stormcoil'){box('#9f9ab4',9,2,6,5);box('#9f9ab4',5,9,14,12);box('#c2b4dc',7,11,10,9);for(let i=0;i<4;i++)box('#f1dfb7',10+i%2*3,9+i*3,4,3);box('#e7e2d2',6,11,2,6);return true}
  if(['shard','ricochet'].includes(kind)){
    box('#b9ad94',5,10,14,4);box('#e6ddc0',10,5,4,14);for(const [x,y] of [[3,8],[17,8],[8,3],[8,17]])gem('#e6ddc0',x+2,y+2,3);gem('#6d675c',12,12,2);if(kind==='ricochet')ring('#e0c784',11,11,10);return true;
  }
  if(['meteor','starfall','supernova'].includes(kind)){
    for(let i=0;i<5;i++){box('#9c6653',4+i*2,1+i*2,4,7);box('#e7a565',7+i*2,2+i*2,2,5)}gem('#815047',14,16,7);gem('#e8a363',14,15,5);gem('#f6dca0',15,14,2);if(kind!=='meteor'){gem(kind==='starfall'?'#ead7a4':'#ddbfe8',4,18,3);gem('#ead7a4',20,4,2)}return true;
  }
  if(['mine','wintermine','pestilence'].includes(kind)){
    const c=kind==='wintermine'?'#addce2':kind==='pestilence'?'#becf76':'#dfb870';box('#555c49',3,12,18,8);box('#839075',5,9,14,7);box(c,6,12,12,3);box('#d9d8b2',11,4,2,7);gem(c,12,4,3);box('#323f34',7,17,3,3);box('#323f34',14,17,3,3);if(kind!=='mine')ring(c,11,12,10);return true;
  }
  if(['sentinel','bastion','stormsentry'].includes(kind)){
    const c=kind==='stormsentry'?'#c2a5e7':kind==='bastion'?'#d9e3a6':'#adc6a1';box('#657965',4,20,16,3);box('#85947b',7,9,10,12);box('#bec6a3',8,10,3,9);box('#485e51',5,7,14,4);gem(c,12,5,5);gem('#f4ead1',12,4,2);if(kind!=='sentinel'){box(c,2,11,2,6);box(c,20,11,2,6)}return true;
  }
  if(['tether','soulchain'].includes(kind)){
    for(let i=0;i<3;i++)ring(i%2?'#b7cdce':'#839dac',5+i*6,5+i*6,4);if(kind==='soulchain'){gem('#d8cff0',18,4,3);gem('#bacfe8',4,18,3)}return true;
  }
  if(['lance','execution','executioner'].includes(kind)){
    for(let i=0;i<17;i++)box('#a39165',3+i,21-i,2,2);gem('#e9dcaa',18,5,5);box('#fff0c8',17,3,2,5);if(kind==='execution'||kind==='executioner'){box('#b48c79',7,5,6,6);box('#ead9ae',5,5,4,8);gem('#d69e8b',5,18,2)}return true;
  }
  if(['area','growth','curse','amount','focus','duration'].includes(kind)){
    if(kind==='area'){box('#827f9a',4,3,16,18);box('#b0b9cc',6,5,12,14);for(const [x,y] of [[8,8],[15,7],[12,14]])gem('#f0deb2',x,y,2)}
    if(kind==='growth'||kind==='curse'){const c=kind==='curse'?'#be99ce':'#becf94';box('#62694c',3,10,18,10);for(let i=0;i<3;i++){box(c,3+i*7,5-i%2*3,4,14);gem('#eddfac',5+i*7,5-i%2*3,2)}box(c,4,18,16,3)}
    if(kind==='amount'){ring('#d3c7a4',8,10,6);ring('#9cac99',15,14,6);gem('#eee1b6',8,10,2);gem('#d8e7d0',15,14,2)}
    if(kind==='focus'){ring('#bd9c91',11,11,7);box('#e7c8b0',11,2,2,20);box('#e7c8b0',2,11,20,2);gem('#f4e0b4',12,12,2)}
    if(kind==='duration'){box('#8d8c69',6,20,12,2);box('#c9c39d',9,8,6,12);box('#f0dfac',10,8,2,12);gem('#edb667',12,5,4);gem('#fff0b9',12,5,2)}return true;
  }
  if(['frostbrand','venomfang','volatile','stormseal','deadeye','aegis','thorns','dashfire','harvest'].includes(kind)){
    if(kind==='frostbrand'||kind==='venomfang'){const c=kind==='frostbrand'?'#acd9e7':'#bad381';for(let i=0;i<15;i++)box(c,4+i,20-i,2,2);gem(c,17,5,4);gem('#eef2d0',17,4,2)}
    if(kind==='volatile'){box('#b6bd9c',10,3,4,7);box('#6f8461',5,11,14,10);box('#b5cb73',6,14,6,6);box('#d9a177',12,14,6,6);box('#efe4c2',7,12,2,5);box('#a28e68',9,2,6,3)}
    if(kind==='stormseal'){box('#98adbb',5,3,14,19);box('#d1dbe1',7,5,10,15);for(let i=0;i<5;i++)box('#8977b0',9+i%2*3,5+i*3,5,3)}
    if(kind==='deadeye'){for(let i=0;i<9;i++)box('#b9a6b9',3+i*2,11-Math.sin(i*Math.PI/8)*5,2,Math.max(2,Math.sin(i*Math.PI/8)*10));gem('#725c7f',12,11,5);gem('#e2ceb5',12,11,2)}
    if(kind==='aegis'||kind==='thorns'){gem('#6e8268',12,11,10);gem(kind==='aegis'?'#c7d7ad':'#bfb8a2',12,10,7);box('#eff0c3',11,5,2,12);if(kind==='thorns')for(const x of [3,18]){box('#decda6',x,4,2,6);box('#decda6',x,14,2,6)}}
    if(kind==='dashfire'){box('#899774',4,7,7,11);box('#bcc49b',4,16,15,4);gem('#e0a568',17,9,5);gem('#f1d49b',17,9,2)}
    if(kind==='harvest'){box('#b9ba8b',10,5,3,16);for(let i=0;i<3;i++){gem('#d7dc9b',7,7+i*4,2);gem('#9bb778',15,5+i*4,2)}box('#e4d1a0',7,20,10,2)}return true;
  }
  if(['crescent','eclipse','bloodmoon'].includes(kind)) {
    slash(kind==='bloodmoon'?'#d88d9b':kind==='eclipse'?'#c0aada':'#b9c7e2');
    if(kind!=='crescent'){ring(kind==='bloodmoon'?'#d18a8a':'#9f89cc',11,12,5);gem('#f2dccb',11,11,2)}
    return true;
  }
  if(['thorn','plague','spore'].includes(kind)) {
    if(kind==='spore'){gem('#71884b',12,12,9);for(const [x,y] of [[8,9],[15,7],[14,15],[7,16]]){gem('#b8cd83',x,y,3);box('#e7e4ac',x,y-1,1,2)}}
    else{box('#806e50',9,2,6,3);box('#bdc997',10,5,4,4);box('#516b41',6,10,12,10);box('#9eb767',7,13,10,7);box('#dbe4a1',8,10,2,5);box('#7f9d57',9,20,6,2);gem('#e0d899',12,16,2);if(kind==='plague'){ring('#c0cf79',11,12,10);gem('#e7eaa7',18,4,3)}}
    return true;
  }
  if(['bell','requiem','echo'].includes(kind)) {
    const c=kind==='requiem'?'#9ecebc':kind==='echo'?'#d0c496':'#c8a575';
    box('#857053',10,3,4,3);box(c,8,7,8,10);box(c,6,11,12,8);box('#eee0b1',9,7,2,9);box('#746650',4,18,16,2);box('#cfba84',10,20,4,2);
    if(kind==='requiem'){gem('#b7e5cf',3,8,3);gem('#e1f0ce',20,8,3)}
    if(kind==='echo'){box('#d7d0a9',2,10,2,6);box('#d7d0a9',20,10,2,6)}
    return true;
  }
  if(['prism','tempest','lens'].includes(kind)) {
    gem('#8f77a2',12,12,10);gem('#c6b1d5',12,11,7);gem('#efd9e6',12,10,4);box('#faf1dc',11,4,2,8);
    if(kind==='lens'){box('#a9926b',16,17,3,5);ring('#cbb385',11,10,7)}
    if(kind==='tempest'){for(let i=0;i<6;i++)box('#f9e7b4',17-i,3+i*3,4,3);box('#899acf',2,11,5,2)}
    return true;
  }
  if(['rime','absolute'].includes(kind)) {
    box('#6c9aa6',5,3,14,17);box('#9ecbd1',7,5,10,13);box('#dceceb',9,7,6,9);box('#f1f2d7',11,3,2,19);box('#edf1dc',4,11,16,2);
    if(kind==='absolute'){gem('#c4e9e8',3,3,2);gem('#c4e9e8',20,3,2);gem('#c4e9e8',3,20,2);gem('#c4e9e8',20,20,2)}
    return true;
  }
  if(kind==='embercore'||kind==='cinder') {
    gem('#735446',12,13,9);gem(kind==='cinder'?'#c58155':'#db9a59',12,12,6);gem('#f5d48f',12,11,3);
    box('#e5b16d',9,2,2,4);box('#f3d2a0',15,4,2,3);if(kind==='cinder'){box('#3a3c32',7,12,10,2);box('#5d4e40',12,9,2,11)}
    return true;
  }
  if(kind==='conductor') {
    box('#aab1bd',11,3,2,17);box('#d4c1a7',7,16,10,2);box('#867995',9,18,6,4);
    for(let i=0;i<4;i++){box('#cebce7',6+i*2,3+i*3,5,2);box('#f4e9e6',7+i*2,3+i*3,2,1)}
    return true;
  }
  if(kind==='siphon') {
    box('#c7c4ac',6,4,11,5);box('#ece4c8',8,8,8,5);box('#dfd6b8',10,13,5,4);box('#e4c9b1',12,17,2,4);gem('#b97881',6,16,3);box('#f5a6a0',6,14,1,2);
    return true;
  }
  return false;
}
