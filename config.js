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
  basic: {cost:30,range:80,rate:24,dmg:1.0,color:COL.bbBlue,name:'Blaster',splash:0,upgCost:25},
  slow:  {cost:60,range:80,rate:32,dmg:0.5,color:COL.cyan,name:'Freeze',splash:0,slow:0.6,upgCost:45},
  splash:{cost:150,range:90,rate:42,dmg:4.0,color:COL.neonRed,name:'Cannon',splash:55,upgCost:100},
  sniper:{cost:120,range:9999,rate:120,dmg:12,color:COL.gold,name:'Sniper',splash:0,upgCost:85,canHitFlying:true},
  poison:{cost:75,range:85,rate:26,dmg:0.7,color:COL.neonGreen,name:'Poison',splash:0,poison:5,upgCost:55},
  chain: {cost:275,range:95,rate:38,dmg:3.0,color:COL.purple,name:'Tesla',splash:0,chain:4,upgCost:180,canHitFlying:true},
  rapid: {cost:50,range:80,rate:5,dmg:0.55,color:'#4488ff',name:'Minigun',splash:0,upgCost:40}
};

var PATHS={
  basic:{
    A:{name:'Overcharge',icon:'\u26A1',levels:[
      {cost:40,desc:'+DMG',dmgMult:1.1},
      {cost:65,desc:'+Range',rangeMod:10},
      {cost:110,desc:'+DMG',dmgMult:1.1},
      {cost:280,desc:'PLASMA CANNON',dmgMult:1.1,pierce:true,addSplash:15}
    ]},
    B:{name:'Twin Shot',icon:'\u2747',levels:[
      {cost:35,desc:'Double shot',multishot:2},
      {cost:60,desc:'Triple shot',multishot:3,rateMod:-2},
      {cost:100,desc:'Quad shot',multishot:4,rateMod:-2},
      {cost:280,desc:'BULLET STORM',multishot:5,dmgMult:1.1,rateMod:-2}
    ]}
  },
  slow:{
    A:{name:'Permafrost',icon:'\u2744',levels:[
      {cost:70,desc:'Frozen +25% DMG',bonusDmgMark:0.25},
      {cost:100,desc:'Deep freeze 2s',slowDur:120},
      {cost:170,desc:'Freeze 3s +DMG',dmgMult:1.3,slowDur:180},
      {cost:450,desc:'ABSOLUTE ZERO',shatter:0.15,bonusDmgMark:0.4,dmgMult:1.3}
    ]},
    B:{name:'Blizzard',icon:'\u2602',levels:[
      {cost:70,desc:'+Range, AOE slow',rangeMod:20,splashSlow:30},
      {cost:100,desc:'Bigger blizzard',rangeMod:25,splashSlow:40},
      {cost:170,desc:'Wider + DMG',rangeMod:15,splashSlow:15,dmgMult:1.3},
      {cost:450,desc:'ICE AGE',rangeMod:60,splashSlow:60,slowDur:150}
    ]}
  },
  rapid:{
    A:{name:'Overdrive',icon:'\u21BB',levels:[
      {cost:60,desc:'Faster fire',rateMult:0.6},
      {cost:90,desc:'+Speed +DMG',rateMult:0.7,dmgMult:1.3},
      {cost:150,desc:'Even faster',rateMult:0.75,dmgMult:1.2},
      {cost:400,desc:'HYPERDRIVE',rateMult:0.5,dmgMult:1.3}
    ]},
    B:{name:'Heavy Rounds',icon:'\u25C6',levels:[
      {cost:60,desc:'+DMG, Break shields',dmgMult:1.8,armorBreak:true},
      {cost:90,desc:'+DMG',dmgMult:1.5},
      {cost:150,desc:'+DMG +Range',dmgMult:1.3,rangeMod:12},
      {cost:400,desc:'RAILGUN',dmgMult:2,pierce:true}
    ]}
  },
  poison:{
    A:{name:'Plague',icon:'\u2623',levels:[
      {cost:85,desc:'Spreads on kill',spreadPoison:true},
      {cost:120,desc:'Stronger DOT',poisonMult:1.5,spreadPoison:true},
      {cost:200,desc:'+DOT +Range',poisonMult:1.3,rangeMod:12},
      {cost:500,desc:'PANDEMIC',poisonAura:55,poisonMult:1.5}
    ]},
    B:{name:'Acid',icon:'\u2620',levels:[
      {cost:85,desc:'Breaks shields',armorBreak:true,poisonMult:1.3},
      {cost:120,desc:'Stronger acid',armorBreak:true,poisonMult:1.5},
      {cost:200,desc:'+DMG +DOT',dmgMult:1.3,poisonMult:1.3},
      {cost:500,desc:'DISSOLVE',poisonMult:2,dmgMult:1.5}
    ]}
  },
  sniper:{
    A:{name:'Assassin',icon:'\u2694',levels:[
      {cost:130,desc:'20% Crit x3 DMG',crit:0.2},
      {cost:190,desc:'35% Crit +DMG',crit:0.35,dmgMult:1.2},
      {cost:300,desc:'50% Crit +DMG',crit:0.5,dmgMult:1.3},
      {cost:800,desc:'DEADEYE',execute:0.15,crit:0.65,dmgMult:1.3}
    ]},
    B:{name:'Spotter',icon:'\u25CE',levels:[
      {cost:130,desc:'Marks +20% DMG',mark:0.2},
      {cost:190,desc:'Marks +40% DMG',mark:0.4},
      {cost:300,desc:'Marks +60%',mark:0.6,rangeMod:15},
      {cost:800,desc:'COMMAND',markAll:true,mark:0.8}
    ]}
  },
  splash:{
    A:{name:'Megablast',icon:'\u2738',levels:[
      {cost:160,desc:'Bigger boom +DMG',splashMod:15,dmgMult:1.3},
      {cost:240,desc:'Larger radius',splashMod:20,dmgMult:1.2},
      {cost:380,desc:'+Blast +DMG',splashMod:15,dmgMult:1.3},
      {cost:900,desc:'NUCLEAR',splashMod:30,dmgMult:1.5}
    ]},
    B:{name:'Napalm',icon:'\u2668',levels:[
      {cost:160,desc:'Burns ground 2s',burn:120,burnDmg:0.025},
      {cost:240,desc:'Burns 3s',burn:180,burnDmg:0.04},
      {cost:380,desc:'Hotter flames',burn:240,burnDmg:0.06},
      {cost:900,desc:'HELLFIRE',burn:420,burnDmg:0.08}
    ]}
  },
  chain:{
    A:{name:'Overload',icon:'\u2607',levels:[
      {cost:220,desc:'+1 Target +DMG',chainMod:1,dmgMult:1.3},
      {cost:320,desc:'+2 Targets',chainMod:2,dmgMult:1.2},
      {cost:500,desc:'+DMG +Speed',dmgMult:1.3,rateMult:0.85},
      {cost:1200,desc:'THUNDERSTORM',chainMod:999,dmgMult:1.4,rateMult:0.75}
    ]},
    B:{name:'EMP',icon:'\u2300',levels:[
      {cost:220,desc:'Stun 0.5s',stun:30,chainMod:1},
      {cost:320,desc:'Stun 1s + shields',stun:60,armorBreak:true,chainMod:1},
      {cost:500,desc:'Stun 1.5s +DMG',stun:90,dmgMult:1.3,chainMod:1},
      {cost:1200,desc:'BLACKOUT area stun',stun:120,armorBreak:true,chainMod:2}
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
  ghost: {hp:4,speed:0.0018,size:9,color:'#8844dd',reward:6,name:'Ghost',dodgeChance:0.5},
  splitter:{hp:12,speed:0.0008,size:13,color:'#dd4400',reward:8,name:'Splitter',splits:2},
  mega:  {hp:35,speed:0.0005,size:16,color:'#ff2266',reward:15,name:'Mega',shield:10},
  boss:  {hp:50,speed:0.0005,size:18,color:'#cc00cc',reward:30,name:'Boss'},
  finalboss:{hp:200,speed:0.0003,size:24,color:'#ff0044',reward:100,name:'OVERLORD',shield:50,regenRate:0.05,healRate:0.01},
  flying:{hp:5,speed:0.0015,size:9,color:'#88ccff',reward:7,name:'Drone',flying:true},
  camo:{hp:5,speed:0.0013,size:9,color:'#555577',reward:8,name:'Stealth',camo:true},
  firewall:  {hp:60,speed:0.0004,size:18,color:'#ff6600',reward:40,name:'FIREWALL',shield:40},
  rootkit:   {hp:30,speed:0.0006,size:16,color:'#44aa22',reward:35,name:'ROOTKIT'},
  ransomware:{hp:40,speed:0.0007,size:16,color:'#ff2222',reward:45,name:'RANSOMWARE'},
  trojan:    {hp:120,speed:0.0008,size:10,color:'#ff3355',reward:50,name:'TROJAN'},
  worm:      {hp:50,speed:0.0006,size:15,color:'#aaff00',reward:40,name:'WORM'}
};

