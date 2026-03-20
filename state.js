// ─── STATE ────────────────────────────────────────
var running=false,gameOver=false;
var coins=100,lives=10,score=0,wave=0;
var towers=[],enemies=[],bullets=[],particles=[],floatingTexts=[];
var nextWavePreview=[];
var selectedTower='basic';
var waveActive=false,spawnQueue=[],spawnTimer=0,waveCooldown=0;
var totalKills=0;
var selectedTowerIdx=-1;
var frameCount=0;
var gameSpeed=1;
var screenFlash=0;
var waveLivesStart=0,waveStartFrame=0;
var synergies=[],coldZones=[];

// ─── ELEMENTS ─────────────────────────────────────
var hud=document.getElementById('hud');
var towerBar=document.getElementById('towerBar');
var waveBanner=document.getElementById('waveBanner');
var coinsEl=document.getElementById('coinsDisp');
var livesEl=document.getElementById('livesDisp');
var scoreEl=document.getElementById('scoreDisp');
var waveEl=document.getElementById('waveDisp');
var upgradePopup=document.getElementById('upgradePopup');
var upTitle=document.getElementById('upTitle');
var upLevel=document.getElementById('upLevel');
var upBtn=document.getElementById('upBtn');
var upClose=document.getElementById('upClose');

