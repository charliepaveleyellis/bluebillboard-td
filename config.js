// ─── LOGO PRELOAD ────────────────────────────────
var logoImg = new Image();
logoImg.src = 'logo.png';
var iconWhite = new Image();
iconWhite.src = 'icon-white.png';

// ─── MOBILE / PERFORMANCE ────────────────────────
var isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
var MAX_PARTICLES = isMobile ? 80 : 200;
var shakeX = 0, shakeY = 0;
var gridOffset = 0;

// ─── AUDIO (Web Audio API) ────────────────────────
var audioCtx=null;

function initAudio(){
  if(audioCtx) return;
  try { audioCtx=new (window.AudioContext||window.webkitAudioContext)(); } catch(e){ audioCtx=null; }
}

// Basic tone helper
function playTone(freq,type,dur,vol,detune){
  if(!audioCtx) return;
  try{
    var t=audioCtx.currentTime;
    var o=audioCtx.createOscillator();
    var g=audioCtx.createGain();
    o.type=type||'square';
    o.frequency.value=freq;
    if(detune) o.detune.value=detune;
    g.gain.setValueAtTime(vol||0.06,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+(dur||0.1));
    o.connect(g);g.connect(audioCtx.destination);
    o.start(t);o.stop(t+(dur||0.1));
  }catch(e){}
}

// Frequency sweep helper
function playSweep(startFreq,endFreq,type,dur,vol){
  if(!audioCtx) return;
  try{
    var t=audioCtx.currentTime;
    var o=audioCtx.createOscillator();
    var g=audioCtx.createGain();
    o.type=type||'sawtooth';
    o.frequency.setValueAtTime(startFreq,t);
    o.frequency.exponentialRampToValueAtTime(endFreq,t+dur);
    g.gain.setValueAtTime(vol||0.06,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.connect(g);g.connect(audioCtx.destination);
    o.start(t);o.stop(t+dur);
  }catch(e){}
}

// Noise burst helper (for explosions, impacts)
function playNoise(dur,vol){
  if(!audioCtx) return;
  try{
    var t=audioCtx.currentTime;
    var bufSize=audioCtx.sampleRate*dur;
    var buf=audioCtx.createBuffer(1,bufSize,audioCtx.sampleRate);
    var data=buf.getChannelData(0);
    for(var i=0;i<bufSize;i++) data[i]=(Math.random()*2-1);
    var src=audioCtx.createBufferSource();
    src.buffer=buf;
    var g=audioCtx.createGain();
    g.gain.setValueAtTime(vol||0.06,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    // Low-pass filter for thump
    var filt=audioCtx.createBiquadFilter();
    filt.type='lowpass';filt.frequency.value=800;
    src.connect(filt);filt.connect(g);g.connect(audioCtx.destination);
    src.start(t);src.stop(t+dur);
  }catch(e){}
}

// ── SHOOT — sharp digital zap, quick and punchy
function sfxShoot(){
  playSweep(1200,600,'square',0.04,0.05);
  playTone(2400,'sine',0.02,0.03);
}

// ── HIT — digital crunch impact
function sfxHit(){
  playNoise(0.06,0.06);
  playSweep(500,200,'square',0.06,0.04);
}

// ── KILL — glitchy digital dissolve with rising tone
function sfxKill(){
  playNoise(0.08,0.05);
  playSweep(300,1200,'sawtooth',0.15,0.06);
  setTimeout(function(){ playTone(1400,'sine',0.1,0.04); },50);
  setTimeout(function(){ playTone(1800,'sine',0.08,0.03); },100);
}

// ── WAVE — ominous alarm siren, rising threat
function sfxWave(){
  playSweep(200,500,'sawtooth',0.3,0.08);
  setTimeout(function(){ playSweep(300,700,'sawtooth',0.3,0.08); },150);
  setTimeout(function(){ playSweep(400,900,'square',0.4,0.06); },300);
  setTimeout(function(){ playTone(900,'sine',0.2,0.06); },500);
}

// ── PLACE — satisfying lock-in with confirmation beeps
function sfxPlace(){
  playTone(600,'sine',0.06,0.07);
  setTimeout(function(){ playTone(900,'sine',0.06,0.07); },60);
  setTimeout(function(){ playTone(1200,'triangle',0.1,0.06); },120);
  playNoise(0.04,0.03);
}

// ── EXPLOSION — heavy bass boom with debris scatter
function sfxExplosion(){
  playNoise(0.35,0.12);
  playSweep(150,30,'sawtooth',0.4,0.1);
  playTone(60,'sine',0.3,0.08);
  setTimeout(function(){ playNoise(0.15,0.05); },100);
  setTimeout(function(){ playSweep(800,200,'square',0.15,0.04); },50);
}

// ── UPGRADE — ascending power-up with sparkle
function sfxUpgrade(){
  playTone(400,'triangle',0.08,0.06);
  setTimeout(function(){ playTone(600,'triangle',0.08,0.06); },70);
  setTimeout(function(){ playTone(800,'triangle',0.08,0.06); },140);
  setTimeout(function(){ playTone(1200,'sine',0.12,0.07); },210);
  setTimeout(function(){ playTone(1600,'sine',0.15,0.05); playNoise(0.06,0.03); },280);
}

// ─── CAMERA ───────────────────────────────────────
(async function(){
  try {
    var s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
    document.getElementById('camera').srcObject=s;
  } catch(e){
    document.getElementById('camera').classList.add('hidden');
    document.getElementById('fallbackBg').classList.remove('hidden');
  }
})();

// ─── CANVAS ───────────────────────────────────────
var C=document.getElementById('game');
var X=C.getContext('2d');
function resize(){ C.width=window.innerWidth; C.height=window.innerHeight; if(typeof PATH_REL!=='undefined') buildDecorations(); }
window.addEventListener('resize',resize); C.width=window.innerWidth; C.height=window.innerHeight;

// ─── NEON COLOURS ────────────────────────────────
var COL={
  bbBlue:'#2ea3f2', navy:'#003d7a', cyan:'#00ffff', magenta:'#ff00ff',
  neonGreen:'#00ff66', neonRed:'#ff3355', purple:'#aa44ff', gold:'#ffdd00',
  dark:'#0a0a1a', white:'#fff',
  // Aliases for compatibility
  blue:'#2ea3f2', light:'#2ea3f2', red:'#ff3355', green:'#00ff66'
};

// ─── NEON GLOW HELPER ────────────────────────────
function neonGlow(color, blur, fn){
  var b = isMobile ? Math.floor(blur/2) : blur;
  X.shadowColor=color; X.shadowBlur=b;
  fn();
  X.shadowColor='transparent'; X.shadowBlur=0;
}

// ─── DRAW HEX HELPER ────────────────────────────
function drawHex(cx,cy,r){
  X.beginPath();
  for(var i=0;i<6;i++){
    var a=(i/6)*Math.PI*2-Math.PI/6;
    if(i===0) X.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);
    else X.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);
  }
  X.closePath();
}

// ─── PATH ─────────────────────────────────────────
var PATH_REL=[
  {x:0.5,y:-0.05},{x:0.5,y:0.07},{x:0.2,y:0.17},{x:0.15,y:0.31},
  {x:0.45,y:0.40},{x:0.8,y:0.33},{x:0.85,y:0.48},{x:0.55,y:0.57},
  {x:0.2,y:0.53},{x:0.15,y:0.66},{x:0.5,y:0.72},{x:0.5,y:0.84}
];

function getPath(){
  var p=[];
  for(var i=0;i<PATH_REL.length;i++) p.push({x:PATH_REL[i].x*C.width,y:PATH_REL[i].y*C.height});
  return p;
}

function posOnPath(t){
  var path=getPath(),totalLen=0,segs=[];
  for(var i=1;i<path.length;i++){
    var dx=path[i].x-path[i-1].x,dy=path[i].y-path[i-1].y;
    segs.push({len:Math.sqrt(dx*dx+dy*dy),i:i-1});
    totalLen+=segs[segs.length-1].len;
  }
  var dist=t*totalLen,walked=0;
  for(var i=0;i<segs.length;i++){
    if(walked+segs[i].len>=dist){
      var local=(dist-walked)/segs[i].len;
      var a=path[segs[i].i],b=path[segs[i].i+1];
      return {x:a.x+(b.x-a.x)*local,y:a.y+(b.y-a.y)*local};
    }
    walked+=segs[i].len;
  }
  return path[path.length-1];
}

// ─── DECORATIONS (BB network infrastructure) ─────
var decorations=[];
function buildDecorations(){
  decorations=[];
  var path=getPath();
  for(var i=0;i<25;i++){
    var dx=30+Math.random()*(C.width-60);
    var dy=60+Math.random()*(C.height-160);
    var onPath=false;
    for(var j=0;j<path.length;j++){
      var ddx=dx-path[j].x,ddy=dy-path[j].y;
      if(Math.sqrt(ddx*ddx+ddy*ddy)<45){onPath=true;break;}
    }
    if(onPath) continue;
    var r=Math.random();
    var type=r<0.3?'billboard':r<0.5?'signal':r<0.7?'server':'datanode';
    decorations.push({x:dx,y:dy,type:type,size:6+Math.random()*8,sway:Math.random()*Math.PI*2,
      phase:Math.random()*Math.PI*2});
  }
}

// ─── TOWER / ENEMY DEFS ──────────────────────────
var TOWER_DEFS={
  basic: {cost:40,range:85,rate:22,dmg:1.2,color:COL.bbBlue,name:'Blaster',splash:0,upgCost:50},
  slow:  {cost:60,range:75,rate:35,dmg:0.4,color:COL.cyan,name:'Freeze',splash:0,slow:0.6,upgCost:65},
  splash:{cost:110,range:90,rate:50,dmg:2.5,color:COL.neonRed,name:'Cannon',splash:45,upgCost:100},
  sniper:{cost:90,range:9999,rate:120,dmg:7,color:COL.gold,name:'Sniper',splash:0,upgCost:85},
  poison:{cost:70,range:80,rate:30,dmg:0.5,color:COL.neonGreen,name:'Poison',splash:0,poison:4,upgCost:70},
  chain: {cost:130,range:90,rate:45,dmg:2,color:COL.purple,name:'Tesla',splash:0,chain:3,upgCost:110},
  rapid: {cost:65,range:80,rate:10,dmg:0.6,color:'#4488ff',name:'Minigun',splash:0,upgCost:55}
};

var PATHS={
  basic:{
    A:{name:'Overcharge',icon:'\u26A1',levels:[
      {cost:60,desc:'+DMG, Slow hit',dmgMult:1.6,addSlow:0.3},
      {cost:100,desc:'Piercing shots',dmgMult:1.5,pierce:true},
      {cost:280,desc:'PLASMA CANNON',dmgMult:2,addSplash:30}
    ]},
    B:{name:'Twin Shot',icon:'\u2747',levels:[
      {cost:60,desc:'Double shot',multishot:2},
      {cost:100,desc:'Triple shot',multishot:3,rateMod:-4},
      {cost:280,desc:'BULLET STORM',multishot:5,rateMod:-3}
    ]}
  },
  slow:{
    A:{name:'Permafrost',icon:'\u2744',levels:[
      {cost:75,desc:'Frozen +50% DMG',bonusDmgMark:0.5},
      {cost:120,desc:'Deep freeze 3s',slowDur:180},
      {cost:320,desc:'ABSOLUTE ZERO',shatter:0.2,dmgMult:1.5}
    ]},
    B:{name:'Blizzard',icon:'\u2602',levels:[
      {cost:75,desc:'+Range, AOE slow',rangeMod:30,splashSlow:40},
      {cost:120,desc:'Huge blizzard',rangeMod:40,splashSlow:60},
      {cost:320,desc:'ICE AGE',rangeMod:9000,slowDur:240}
    ]}
  },
  rapid:{
    A:{name:'Overdrive',icon:'\u21BB',levels:[
      {cost:65,desc:'2x Fire speed',rateMult:0.5},
      {cost:110,desc:'3x Speed + DMG',rateMult:0.65,dmgMult:1.5},
      {cost:300,desc:'HYPERDRIVE',rateMult:0.4,dmgMult:1.5}
    ]},
    B:{name:'Heavy Rounds',icon:'\u25C6',levels:[
      {cost:65,desc:'+DMG, Break shields',dmgMult:2.5,armorBreak:true},
      {cost:110,desc:'Huge DMG',dmgMult:2},
      {cost:300,desc:'RAILGUN',dmgMult:3,pierce:true}
    ]}
  },
  poison:{
    A:{name:'Plague',icon:'\u2623',levels:[
      {cost:80,desc:'Spreads on kill',spreadPoison:true},
      {cost:130,desc:'Stronger spread',poisonMult:2,spreadPoison:true},
      {cost:320,desc:'PANDEMIC',poisonAura:60,poisonMult:2}
    ]},
    B:{name:'Acid',icon:'\u2620',levels:[
      {cost:80,desc:'Breaks shields',armorBreak:true,poisonMult:1.5},
      {cost:130,desc:'Melts everything',armorBreak:true,poisonMult:2},
      {cost:320,desc:'DISSOLVE',poisonMult:3,dmgMult:2}
    ]}
  },
  sniper:{
    A:{name:'Assassin',icon:'\u2694',levels:[
      {cost:100,desc:'Crit x3 DMG',crit:0.3},
      {cost:160,desc:'Always crits',crit:1.0,dmgMult:1.5},
      {cost:380,desc:'DEADEYE',execute:0.3,dmgMult:2}
    ]},
    B:{name:'Spotter',icon:'\u25CE',levels:[
      {cost:100,desc:'Marks +50% DMG',mark:0.5},
      {cost:160,desc:'Marks +100% DMG',mark:1.0},
      {cost:380,desc:'COMMAND',markAll:true,mark:1.5}
    ]}
  },
  splash:{
    A:{name:'Megablast',icon:'\u2738',levels:[
      {cost:130,desc:'Bigger boom +DMG',splashMod:25,dmgMult:1.5},
      {cost:190,desc:'Nuke radius',splashMod:35,dmgMult:1.5},
      {cost:420,desc:'NUCLEAR',splashMod:50,dmgMult:2}
    ]},
    B:{name:'Napalm',icon:'\u2668',levels:[
      {cost:130,desc:'Burns ground 3s',burn:180,burnDmg:0.03},
      {cost:190,desc:'Inferno 5s',burn:300,burnDmg:0.05},
      {cost:420,desc:'HELLFIRE',burn:600,burnDmg:0.1}
    ]}
  },
  chain:{
    A:{name:'Overload',icon:'\u2607',levels:[
      {cost:140,desc:'+Targets +DMG',chainMod:3,dmgMult:1.5},
      {cost:210,desc:'Storm everything',chainMod:99,dmgMult:1.3},
      {cost:480,desc:'THUNDERSTORM',dmgMult:2,rateMult:0.5}
    ]},
    B:{name:'EMP',icon:'\u2300',levels:[
      {cost:140,desc:'Stun 1s',stun:60},
      {cost:210,desc:'Stun 2s + shields',stun:120,armorBreak:true},
      {cost:480,desc:'BLACKOUT',stun:240,armorBreak:true}
    ]}
  }
};

var burnZones=[];

var ENEMY_DEFS={
  basic: {hp:4,speed:0.001,size:10,color:'#ff3355',reward:4,name:'Scout'},
  fast:  {hp:2.5,speed:0.002,size:8,color:'#ff8800',reward:5,name:'Runner'},
  tank:  {hp:18,speed:0.0006,size:14,color:'#cc2200',reward:10,name:'Tank'},
  healer:{hp:6,speed:0.0009,size:11,color:'#00ff66',reward:7,name:'Healer',healRate:0.025},
  dodge: {hp:5,speed:0.0015,size:9,color:'#ff00ff',reward:7,name:'Dodger',dodgeChance:0.35},
  shield:{hp:8,speed:0.0009,size:12,color:'#4488ff',reward:9,name:'Shielder',shield:7},
  swarm: {hp:2,speed:0.0022,size:6,color:'#ff8800',reward:2,name:'Swarm'},
  regen: {hp:9,speed:0.0008,size:12,color:'#22ddaa',reward:8,name:'Regen',regenRate:0.025},
  boss:  {hp:50,speed:0.0005,size:18,color:'#cc00cc',reward:30,name:'Boss'}
};

