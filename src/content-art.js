// 24×24 pixel silhouettes; no external image assets or smoothing.
export function drawContentIcon(g,kind) {
  const box=(c,x,y,w,h)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h)};
  const gem=(c,x,y,r)=>{for(let row=-r;row<=r;row++){const width=r-Math.abs(row);box(c,x-width,y+row,width*2+1,1)}};
  const ring=(color,cx,cy,r)=>{for(let i=0;i<16;i++){const a=i*Math.PI/8;box(color,cx+Math.cos(a)*r,cy+Math.sin(a)*r,2,2)}};
  const slash=color=>{box('#776963',6,4,2,18);for(let i=0;i<13;i++){const a=-1.7+i*.22;box(color,10+Math.cos(a)*9,11+Math.sin(a)*9,3,3)}box('#f5ead4',15,4,4,2);box('#ac9a82',4,17,7,2)};
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
