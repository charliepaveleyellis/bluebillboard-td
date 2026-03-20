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
  drawEnemies();drawBullets();drawParticles();

  // Screen flash from explosions
  if(screenFlash>0){
    X.fillStyle='rgba(255,51,85,'+(screenFlash*0.04)+')';
    X.fillRect(0,0,C.width,C.height);
    screenFlash--;
  }

  X.restore();

  requestAnimationFrame(gameLoop);
}

// ─── START / END ──────────────────────────────────
C.style.pointerEvents='none';

function startGame(){
  initAudio();
  if(audioCtx&&audioCtx.state==='suspended') audioCtx.resume();

  coins=120;lives=15;score=0;wave=0;totalKills=0;
  towers=[];enemies=[];bullets=[];particles=[];burnZones=[];
  spawnQueue=[];waveActive=false;waveCooldown=60;
  gameOver=false;selectedTower='basic';frameCount=0;gameSpeed=1;
  screenFlash=0;shakeX=0;shakeY=0;
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
  document.getElementById('statsDisp').textContent=
    totalKills+' enemies defeated | '+towers.length+' towers built | Score: '+score;

  if(wave>=10) document.getElementById('endTitle').textContent='NETWORK SECURED!';
  else if(wave>=6) document.getElementById('endTitle').textContent='WELL DEFENDED!';
  else document.getElementById('endTitle').textContent='NETWORK BREACHED!';

  document.getElementById('endScreen').classList.remove('hidden');
}

// ─── BUTTON BINDING (after everything is defined) ──
document.getElementById('startBtn').ontouchend=function(){startGame();};
document.getElementById('startBtn').onclick=function(){startGame();};
document.getElementById('restartBtn').ontouchend=function(){startGame();};
document.getElementById('restartBtn').onclick=function(){startGame();};

// Fast forward button
var ffBtn=document.getElementById('ffBtn');
var ffDisp=document.getElementById('ffDisp');
function toggleSpeed(e){
  if(e) e.stopPropagation();
  if(gameSpeed===1) gameSpeed=2;
  else if(gameSpeed===2) gameSpeed=3;
  else gameSpeed=1;
  ffDisp.textContent=gameSpeed+'x';
}
ffBtn.onclick=toggleSpeed;
ffBtn.ontouchend=function(e){e.preventDefault();e.stopPropagation();toggleSpeed();};

