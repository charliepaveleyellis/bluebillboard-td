// ─── GAME LOOP ────────────────────────────────────
var loopCount=0;
function gameTick(){
  updateSpawning();updateTowers();updateBullets();updateEnemies();
}

function gameLoop(){
  if(!running) return;
  loopCount++;
  frameCount++;

  X.clearRect(0,0,C.width,C.height);

  // Apply screen shake
  X.save();
  X.translate(shakeX,shakeY);
  // Decay shake
  shakeX*=0.8;shakeY*=0.8;
  if(Math.abs(shakeX)<0.5) shakeX=0;
  if(Math.abs(shakeY)<0.5) shakeY=0;

  // Dark digital background with grid
  drawBackground();

  drawPath();
  // Draw burn zones (napalm)
  for(var bzi=0;bzi<burnZones.length;bzi++){
    var bz=burnZones[bzi];
    var bzAlpha=Math.min(0.35,bz.life/60);
    X.globalAlpha=bzAlpha;
    X.fillStyle='#ff4400';
    X.beginPath();X.arc(bz.x,bz.y,bz.radius||45,0,Math.PI*2);X.fill();
    X.globalAlpha=bzAlpha*0.6;
    X.fillStyle='#ff8800';
    X.beginPath();X.arc(bz.x,bz.y,(bz.radius||45)*0.6,0,Math.PI*2);X.fill();
    X.globalAlpha=1;
  }
  drawDecorations();

  if(!gameOver){
    for(var s=0;s<gameSpeed;s++) gameTick();
  }

  drawTowers();
  drawSynergies();
  // Draw ghost tower preview while dragging or pending confirm
  var ghost=dragging||pendingDrop;
  if(ghost){
    var gd=TOWER_DEFS[ghost.type];
    var isValid=dragging?dragging.valid:true;
    var ghostCol=isValid?gd.color:'#ff3355';
    X.globalAlpha=0.5+Math.sin(frameCount*0.1)*0.1;
    // Ghost range circle
    X.strokeStyle=ghostCol;X.lineWidth=1;X.setLineDash([6,6]);
    if(gd.range<9000){X.beginPath();X.arc(ghost.x,ghost.y,gd.range,0,Math.PI*2);X.stroke();}
    X.setLineDash([]);
    // Ghost hex base
    X.strokeStyle=ghostCol;X.lineWidth=2;
    drawHex(ghost.x,ghost.y,17);X.stroke();
    // Ghost center dot
    X.fillStyle=ghostCol;X.beginPath();X.arc(ghost.x,ghost.y,4,0,Math.PI*2);X.fill();
    // Label
    X.fillStyle=ghostCol;X.font='bold 9px Courier New';X.textAlign='center';
    if(dragging) X.fillText(isValid?gd.name:'INVALID',ghost.x,ghost.y-25);
    else X.fillText('TAP PLACE TO CONFIRM',ghost.x,ghost.y-25);
    X.globalAlpha=1;
  }
  drawEnemies();drawBullets();drawParticles();drawFloatingTexts();

  // Screen flash from explosions
  if(screenFlash>0){
    X.fillStyle='rgba(255,51,85,'+(screenFlash*0.04)+')';
    X.fillRect(0,0,C.width,C.height);
    screenFlash--;
  }

  drawWavePreview();

  X.restore();

  requestAnimationFrame(gameLoop);
}

// ─── START / END ──────────────────────────────────
C.style.pointerEvents='none';

function loadBestWave(){try{return parseInt(localStorage.getItem('bb_td_best_wave'))||0;}catch(e){return 0;}}
function saveBestWave(w){try{var best=loadBestWave();if(w>best)localStorage.setItem('bb_td_best_wave',w);}catch(e){}}
function showBestWave(){
  var best=loadBestWave();
  var el1=document.getElementById('bestWaveStart'),el2=document.getElementById('bestWaveEnd');
  if(best>0){el1.textContent='BEST: Wave '+best;el1.style.display='block';if(el2){el2.textContent='BEST: Wave '+best;el2.style.display='block';}}
  else{el1.style.display='none';if(el2)el2.style.display='none';}
}

function startGame(){
  initAudio();
  if(audioCtx&&audioCtx.state==='suspended') audioCtx.resume();

  coins=150;lives=20;score=0;wave=0;totalKills=0;
  towers=[];enemies=[];bullets=[];particles=[];burnZones=[];floatingTexts=[];
  nextWavePreview=[];synergies=[];coldZones=[];
  spawnQueue=[];waveActive=false;waveCooldown=60;
  gameOver=false;selectedTower='basic';frameCount=0;gameSpeed=1;
  screenFlash=0;shakeX=0;shakeY=0;
  waveLivesStart=0;waveStartFrame=0;
  dragging=null;closeDropConfirm();closeUpgrade();
  resize();
  buildDecorations();

  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('endScreen').classList.add('hidden');
  hud.classList.remove('hidden');towerBar.classList.remove('hidden');
  C.style.pointerEvents='auto';running=true;
  updateHUD();requestAnimationFrame(gameLoop);
}

function endGame(){
  gameOver=true;running=false;
  C.style.pointerEvents='none';
  hud.classList.add('hidden');towerBar.classList.add('hidden');closeUpgrade();

  document.getElementById('finalScore').textContent=wave;
  document.getElementById('endLabel').textContent='Waves Survived';
  document.getElementById('statsDisp').textContent=
    totalKills+' enemies defeated | '+towers.length+' towers built | Score: '+score;
  document.getElementById('continueBtn').style.display='none';
  document.getElementById('restartBtn').textContent='Try Again';

  if(wave>=15) document.getElementById('endTitle').textContent='SO CLOSE!';
  else if(wave>=10) document.getElementById('endTitle').textContent='WELL DEFENDED!';
  else document.getElementById('endTitle').textContent='NETWORK BREACHED!';

  saveBestWave(wave);showBestWave();
  document.getElementById('endScreen').classList.remove('hidden');
}

function winGame(){
  gameOver=true;running=false;
  C.style.pointerEvents='none';
  hud.classList.add('hidden');towerBar.classList.add('hidden');closeUpgrade();

  document.getElementById('endTitle').textContent='NETWORK SECURED!';
  document.getElementById('endLabel').textContent='You Won!';
  document.getElementById('finalScore').textContent='WAVE 30';
  document.getElementById('statsDisp').textContent=
    totalKills+' enemies defeated | '+towers.length+' towers built | Score: '+score;
  document.getElementById('continueBtn').style.display='inline-block';
  document.getElementById('restartBtn').textContent='Quit';

  saveBestWave(wave);showBestWave();
  document.getElementById('endScreen').classList.remove('hidden');
}

function continueGame(){
  document.getElementById('endScreen').classList.add('hidden');
  hud.classList.remove('hidden');towerBar.classList.remove('hidden');
  C.style.pointerEvents='auto';
  gameOver=false;running=true;
  waveCooldown=90;
  requestAnimationFrame(gameLoop);
}

// ─── BUTTON BINDING (after everything is defined) ──
document.getElementById('startBtn').ontouchend=function(){startGame();};
document.getElementById('startBtn').onclick=function(){startGame();};
document.getElementById('restartBtn').ontouchend=function(){startGame();};
document.getElementById('restartBtn').onclick=function(){startGame();};
document.getElementById('continueBtn').ontouchend=function(){continueGame();};
document.getElementById('continueBtn').onclick=function(){continueGame();};

// Fast forward button
var ffBtn=document.getElementById('ffBtn');
var ffDisp=document.getElementById('ffDisp');
function toggleSpeed(e){
  if(e) e.stopPropagation();
  if(gameSpeed===1) gameSpeed=2;
  else if(gameSpeed===2) gameSpeed=3;
  else if(gameSpeed===3) gameSpeed=4;
  else if(gameSpeed===4) gameSpeed=5;
  else gameSpeed=1;
  if(isMobile && gameSpeed>3) gameSpeed=1;
  ffDisp.textContent=gameSpeed+'x';
}
ffBtn.onclick=toggleSpeed;
ffBtn.ontouchend=function(e){e.preventDefault();e.stopPropagation();toggleSpeed();};

showBestWave();

