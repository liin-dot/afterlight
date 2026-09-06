// A small generative soundtrack: bowed triangle drones, bell motifs, and soft noise.
// Everything is synthesized locally after the first user gesture.
export class Sound{
 constructor(){this.ctx=null;this.muted=false;this.beat=0;this.nextBeat=0;this.last={};this.intensity=0;}
 init(){
  if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});return}
  try{this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=this.muted?0:.55;this.master.connect(this.ctx.destination);this.music=this.ctx.createGain();this.music.gain.value=.3;this.music.connect(this.master);this.fx=this.ctx.createGain();this.fx.gain.value=.48;this.fx.connect(this.master);
   this.delay=this.ctx.createDelay(1);this.delay.delayTime.value=.375;const feedback=this.ctx.createGain();feedback.gain.value=.24;const wet=this.ctx.createGain();wet.gain.value=.18;this.delay.connect(feedback);feedback.connect(this.delay);this.delay.connect(wet);wet.connect(this.master);
   this.noise=this.ctx.createBuffer(1,this.ctx.sampleRate*.4,this.ctx.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);this.nextBeat=this.ctx.currentTime+.1;
  }catch{this.ctx=null}
 }
 toggle(){this.muted=!this.muted;if(this.master)this.master.gain.setTargetAtTime(this.muted?0:.55,this.ctx.currentTime,.07);return this.muted}
 tone(freq,duration=.15,type='triangle',volume=.1,at=0,endFreq=0,destination=null){
  if(!this.ctx||this.ctx.state!=='running')return;const t=this.ctx.currentTime+at,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),t+duration);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(Math.max(.002,volume),t+.012);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(destination||this.fx);if(destination===this.music)g.connect(this.delay);o.start(t);o.stop(t+duration+.02);
 }
 hiss(duration=.15,volume=.1,frequency=1500){if(!this.ctx||this.ctx.state!=='running')return;const s=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),g=this.ctx.createGain(),t=this.ctx.currentTime;s.buffer=this.noise;filter.type='lowpass';filter.frequency.value=frequency;g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);s.connect(filter);filter.connect(g);g.connect(this.fx);s.start();s.stop(t+duration)}
 play(name){
  if(!this.ctx||this.muted)return;const t=this.ctx.currentTime;if(t-(this.last[name]||-10)<({hit:.065,xp:.065,shoot:.12,slash:.15}[name]||.03))return;this.last[name]=t;
  if(name==='hit'){this.tone(140,.065,'triangle',.11,0,50);this.hiss(.04,.06,1000)}
  if(name==='xp')this.tone(800+Math.random()*360,.065,'sine',.038);
  if(name==='slash'){this.hiss(.14,.18,1800);this.tone(280,.10,'triangle',.07,0,80)}
  if(name==='shoot')this.tone(520,.08,'triangle',.06,0,160);
  if(name==='hurt'){this.tone(160,.22,'sawtooth',.09,0,55);this.hiss(.13,.15,700)}
  if(name==='dash'){this.hiss(.2,.19,3000);this.tone(140,.18,'sine',.10,0,450)}
  if(name==='level'){[392,493.88,587.33,783.99].forEach((f,i)=>this.tone(f,.65,'triangle',.15,i*.10))}
  if(name==='fusion'){this.hiss(.45,.16,1600);[130.81,196,261.63,392,523.25,783.99,1046.5].forEach((f,i)=>this.tone(f,1.5,'triangle',.14,i*.11));this.tone(65.4,1.8,'sine',.16)}
  if(name==='select'){this.tone(580,.07,'triangle',.09);this.tone(870,.13,'sine',.07,.06)}
  if(name==='chest'){[440,554,659,880,1108].forEach((f,i)=>this.tone(f,.6,'triangle',.12,i*.075))}
  if(name==='storm'){this.hiss(.3,.3,2000);this.tone(70,.3,'sawtooth',.12,0,30)}
  if(name==='flame'){this.hiss(.25,.16,700);this.tone(85,.25,'triangle',.1,0,45)}
  if(name==='frost'){this.tone(1400,.35,'sine',.1,0,400);this.hiss(.2,.07,5000)}
  if(name==='boss'){[65.4,69.3,98].forEach((f,i)=>this.tone(f,2,'sawtooth',.06,i*.12));this.hiss(.5,.15,400)}
  if(name==='death'){[220,196,164.8,110].forEach((f,i)=>this.tone(f,1,'triangle',.14,i*.2))}
  if(name==='win'){[261.6,329.6,392,523.3,659.3,784].forEach((f,i)=>this.tone(f,1.8,'triangle',.12,i*.18))}
 }
 update(intensity=0,paused=false){
  if(!this.ctx||this.ctx.state!=='running')return;const now=this.ctx.currentTime;if(this.nextBeat<now-1)this.nextBeat=now+.1;if(this.nextBeat>now+.15)return;let wait=Math.max(0,this.nextBeat-now);const note=[146.83,174.61,220,196,130.81,164.81,196,174.61][Math.floor(this.beat/8)%8];
  if(this.beat%4===0){this.tone(note/2,3.1,'triangle',.10,wait,0,this.music);this.tone(note,2.7,'sine',.055,wait,0,this.music)}
  if(this.beat%2===0&&!paused){const motif=[2,3,2.6667,2,1.5,2,2.6667,3][Math.floor(this.beat/2)%8];this.tone(note*motif,1.1,'sine',.045+intensity*.02,wait,0,this.music)}
  if(intensity>.35&&!paused&&this.beat%2===1)this.tone(note/4,.21,'triangle',.08,wait,note/8,this.music);
  this.beat++;this.nextBeat+=.47;
 }
}
