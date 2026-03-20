// ─── TOWER BAR (drag to place) ───────────────────
var towerBtns=document.querySelectorAll('.tower-btn');

function updateTowerBar(){
  for(var i=0;i<towerBtns.length;i++){
    var btn=towerBtns[i],type=btn.dataset.type,def=TOWER_DEFS[type];
    btn.classList.toggle('selected',false);
    btn.classList.toggle('disabled',coins<def.cost);
  }
}

// ─── UPGRADE SYSTEM ───────────────────────────────
function showUpgrade(tIdx){
  var t=towers[tIdx];
  var def=TOWER_DEFS[t.type];
  var sellPrice=Math.floor(def.cost*0.5 + (t.level>0?def.upgCost*0.3:0) + (t.path?def.upgCost*0.5*t.level:0));
  selectedTowerIdx=tIdx;
  var pathData=PATHS[t.type];

  upTitle.textContent=def.name+(t.path?' ['+pathData[t.path].name+']':'')+' Lv'+(t.level+1);

  var upGeneric=document.getElementById('upGeneric');
  var upPathsDiv=document.getElementById('upPaths');
  var pathABtn=document.getElementById('pathABtn');
  var pathBBtn=document.getElementById('pathBBtn');

  upGeneric.style.display='none';
  upPathsDiv.style.display='none';

  if(t.level===0){
    var cost=def.upgCost;
    upLevel.textContent='Level 1 \u2192 2';
    upBtn.textContent='Upgrade ('+cost+')';
    upBtn.classList.toggle('disabled',coins<cost);
    upGeneric.style.display='block';
  } else if(t.level===1 && !t.path){
    upLevel.textContent='Choose Specialization';
    var pA=pathData.A, pB=pathData.B;
    var costA=pA.levels[0].cost, costB=pB.levels[0].cost;
    pathABtn.textContent=pA.icon+' '+pA.name+' ('+costA+')\n'+pA.levels[0].desc;
    pathBBtn.textContent=pB.icon+' '+pB.name+' ('+costB+')\n'+pB.levels[0].desc;
    pathABtn.classList.toggle('disabled',coins<costA);
    pathBBtn.classList.toggle('disabled',coins<costB);
    pathABtn.style.borderColor=def.color;
    pathBBtn.style.borderColor=def.color;
    upPathsDiv.style.display='block';
  } else if(t.path && t.level<5){
    var pLvl=t.level-1;
    var pDef=pathData[t.path];
    if(pLvl>=0&&pLvl<pDef.levels.length){
      var cost=pDef.levels[pLvl].cost;
      var isUltimate=pLvl===3;
      upLevel.textContent=isUltimate?'ULTIMATE':pDef.name+' '+(pLvl+1)+' \u2192 '+(pLvl+2);
      upBtn.textContent=(isUltimate?'\u2B50 ':'')+'Upgrade ('+cost+')';
      upBtn.classList.remove('disabled');
      upBtn.classList.toggle('disabled',coins<cost);
      upGeneric.style.display='block';
    } else {
      upLevel.textContent='MAX LEVEL';
      upBtn.textContent='MAX';upBtn.classList.add('disabled');
      upGeneric.style.display='block';
    }
  } else {
    upLevel.textContent='MAX LEVEL';
    upBtn.textContent='MAX';upBtn.classList.add('disabled');
    upGeneric.style.display='block';
  }

  document.getElementById('sellBtn').textContent='Sell (+'+sellPrice+')';

  var popLeft=Math.max(10,Math.min(t.x-60,C.width-140));
  var popTop=t.y-140;
  if(popTop<60) popTop=t.y+40;
  upgradePopup.style.left=popLeft+'px';
  upgradePopup.style.top=popTop+'px';
  upgradePopup.style.display='block';
  upgradePopup.style.pointerEvents='none';
  setTimeout(function(){ upgradePopup.style.pointerEvents='auto'; },400);
}

function closeUpgrade(){ if(upgradePopup){ upgradePopup.style.display='none'; upgradePopup.style.pointerEvents='none'; } selectedTowerIdx=-1; }

function applyPathUpgrade(t, pathKey, levelIdx){
  var pDef=PATHS[t.type][pathKey].levels[levelIdx];
  if(pDef.dmgMult) t.dmg*=pDef.dmgMult;
  if(pDef.rateMult) t.rate=Math.max(8,Math.floor(t.rate*pDef.rateMult));
  if(pDef.rateMod) t.rate=Math.max(8,t.rate+pDef.rateMod);
  if(pDef.rangeMod) t.range+=pDef.rangeMod;
  if(pDef.splashMod) t.splash+=pDef.splashMod;
  if(pDef.addSlow) t.slow=(t.slow||0)+pDef.addSlow;
  if(pDef.multishot) t.multishot=pDef.multishot;
  if(pDef.pierce) t.pierce=true;
  if(pDef.armorBreak) t.armorBreak=true;
  if(pDef.stun) t.stun=pDef.stun;
  if(pDef.burn) {t.burn=pDef.burn;t.burnDmg=pDef.burnDmg;}
  if(pDef.crit) t.crit=pDef.crit;
  if(pDef.mark) t.mark=pDef.mark;
  if(pDef.spreadPoison) t.spreadPoison=true;
  if(pDef.bonusDmgMark) t.bonusDmgMark=pDef.bonusDmgMark;
  if(pDef.slowDur) t.slowDur=pDef.slowDur;
  if(pDef.chainMod) t.chain+=pDef.chainMod;
  if(pDef.poisonMult) t.poison=Math.floor(t.poison*(pDef.poisonMult||1));
  if(pDef.splashSlow) t.splashSlow=pDef.splashSlow;
  if(pDef.addSplash) t.splash=(t.splash||0)+pDef.addSplash;
  if(pDef.shatter) t.shatter=pDef.shatter;
  if(pDef.execute) t.execute=pDef.execute;
  if(pDef.markAll) t.markAll=true;
  if(pDef.poisonAura) t.poisonAura=pDef.poisonAura;
  t.level++;
  if(!t.path) t.path=pathKey;
}

function doUpgrade(){
  if(selectedTowerIdx<0||upgradePopup.style.pointerEvents==='none') return;
  var t=towers[selectedTowerIdx];if(!t) return;
  var def=TOWER_DEFS[t.type];

  if(t.level===0){
    // Generic upgrade level 0 -> 1
    var cost=def.upgCost;
    if(coins<cost) return;
    coins-=cost;
    t.level++;
    t.dmg*=1.12;
    t.range+=6;
    t.rate=Math.max(10,t.rate-2);
  } else if(t.path && t.level<5){
    // Continue chosen path
    var pLvl=t.level-1;
    var pDef=PATHS[t.type][t.path];
    if(pLvl>=pDef.levels.length) return;
    var cost=pDef.levels[pLvl].cost;
    if(coins<cost) return;
    coins-=cost;
    applyPathUpgrade(t, t.path, pLvl);
  } else {
    return;
  }

  sfxUpgrade();
  for(var i=0;i<12;i++){
    var a=(i/12)*Math.PI*2;
    particles.push({x:t.x,y:t.y,vx:Math.cos(a)*4,vy:Math.sin(a)*4,life:20,size:3,color:COL.gold});
  }
  updateHUD(); closeUpgrade();
}

function doPathUpgrade(pathKey){
  if(selectedTowerIdx<0||upgradePopup.style.pointerEvents==='none') return;
  var t=towers[selectedTowerIdx];if(!t) return;
  if(t.level!==1||t.path) return;
  var pDef=PATHS[t.type][pathKey];
  var cost=pDef.levels[0].cost;
  if(coins<cost) return;
  coins-=cost;
  applyPathUpgrade(t, pathKey, 0);
  sfxUpgrade();
  for(var i=0;i<12;i++){
    var a=(i/12)*Math.PI*2;
    particles.push({x:t.x,y:t.y,vx:Math.cos(a)*4,vy:Math.sin(a)*4,life:20,size:3,color:COL.gold});
  }
  updateHUD(); closeUpgrade();
}

upBtn.addEventListener('click',function(e){e.stopPropagation();doUpgrade();});
upBtn.addEventListener('touchend',function(e){e.stopPropagation();e.preventDefault();doUpgrade();},{passive:false});
upBtn.addEventListener('touchstart',function(e){e.stopPropagation();e.preventDefault();},{passive:false});

var pathABtn=document.getElementById('pathABtn');
var pathBBtn=document.getElementById('pathBBtn');
pathABtn.addEventListener('click',function(e){e.stopPropagation();doPathUpgrade('A');});
pathABtn.addEventListener('touchend',function(e){e.stopPropagation();e.preventDefault();doPathUpgrade('A');},{passive:false});
pathABtn.addEventListener('touchstart',function(e){e.stopPropagation();e.preventDefault();},{passive:false});
pathBBtn.addEventListener('click',function(e){e.stopPropagation();doPathUpgrade('B');});
pathBBtn.addEventListener('touchend',function(e){e.stopPropagation();e.preventDefault();doPathUpgrade('B');},{passive:false});
pathBBtn.addEventListener('touchstart',function(e){e.stopPropagation();e.preventDefault();},{passive:false});

upClose.addEventListener('click',function(e){e.stopPropagation(); closeUpgrade();});
upClose.addEventListener('touchend',function(e){e.stopPropagation();e.preventDefault(); closeUpgrade();},{passive:false});
upClose.addEventListener('touchstart',function(e){e.stopPropagation();e.preventDefault();},{passive:false});
// Block all touch events on upgrade popup from reaching canvas
upgradePopup.addEventListener('touchstart',function(e){e.stopPropagation();e.preventDefault();},{passive:false});
upgradePopup.addEventListener('touchend',function(e){e.stopPropagation();},{passive:false});
upgradePopup.addEventListener('click',function(e){e.stopPropagation();});

var sellBtn=document.getElementById('sellBtn');
function doSell(){
  if(selectedTowerIdx<0||upgradePopup.style.pointerEvents==='none') return;
  var t=towers[selectedTowerIdx];if(!t) return;
  var def=TOWER_DEFS[t.type];
  var sellPrice=Math.floor(def.cost*0.5 + (t.level>0?def.upgCost*0.3:0) + (t.path?def.upgCost*0.5*t.level:0));
  coins+=sellPrice;
  for(var i=0;i<8;i++){
    var a=(i/8)*Math.PI*2;
    particles.push({x:t.x,y:t.y,vx:Math.cos(a)*3,vy:Math.sin(a)*3,life:15,size:3,color:COL.neonRed});
  }
  towers.splice(selectedTowerIdx,1);
  updateHUD(); closeUpgrade();
}
sellBtn.addEventListener('click',function(e){e.stopPropagation();doSell();});
sellBtn.addEventListener('touchend',function(e){e.stopPropagation();e.preventDefault();doSell();},{passive:false});
sellBtn.addEventListener('touchstart',function(e){e.stopPropagation();e.preventDefault();},{passive:false});

