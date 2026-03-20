// ─── WAVE SYSTEM ──────────────────────────────────
function generateWave(w){
  // Smooth count curve — no big jumps
  var count;
  if(w<=3) count=2+w;                           // 3,4,5
  else if(w<=6) count=3+w;                      // 7,8,9
  else if(w<=10) count=2+w+Math.floor(w/2);     // 11-17
  else count=Math.floor(17+(w-10)*3.5);          // 20,24,27,31,34,38,41,45,48,52...
  // Smooth linear growth ~3.5 per wave from w11 onwards

  var q=[];
  for(var i=0;i<count;i++){
    var r=Math.random(),type='basic';

    if(w<=2){
      if(r<0.15) type='fast';
    } else if(w<=5){
      if(r<0.2) type='fast';
      else if(r<0.3) type='swarm';
      else if(r<0.38) type='healer';
    } else if(w<=8){
      if(r<0.15) type='fast';
      else if(r<0.25) type='swarm';
      else if(r<0.32) type='healer';
      else if(r<0.4) type='regen';
      else if(r<0.5) type='tank';
      else if(r<0.57) type='shield';
    } else if(w<=12){
      if(r<0.1) type='fast';
      else if(r<0.2) type='swarm';
      else if(r<0.27) type='healer';
      else if(r<0.35) type='regen';
      else if(r<0.48) type='tank';
      else if(r<0.58) type='shield';
      else if(r<0.65) type='dodge';
    } else if(w<=18){
      // Gradual ramp — more elites, less basic
      if(r<0.04) type='basic';
      else if(r<0.10) type='fast';
      else if(r<0.18) type='swarm';
      else if(r<0.24) type='healer';
      else if(r<0.34) type='regen';
      else if(r<0.48) type='tank';
      else if(r<0.60) type='shield';
      else type='dodge';
    } else {
      // Post-18: full elites
      if(r<0.06) type='fast';
      else if(r<0.12) type='swarm';
      else if(r<0.18) type='healer';
      else if(r<0.30) type='regen';
      else if(r<0.46) type='tank';
      else if(r<0.62) type='shield';
      else type='dodge';
    }

    q.push(type);
  }

  // Add bosses at the end — number scales gradually with wave
  var numBosses=0;
  if(w>=5) numBosses=1;
  if(w>=8) numBosses=2;
  if(w>=12) numBosses=3;
  if(w>=16) numBosses=4;
  if(w>=20) numBosses=5;
  if(w>=25) numBosses=6+Math.floor((w-25)/3);
  // Only on boss waves (every 3 from w5, every 2 from w11, every wave from w20)
  var bossInterval=w>=20?1:(w>=11?2:3);
  if(w%bossInterval!==0) numBosses=Math.max(0,numBosses-2); // fewer on non-boss waves
  for(var b=0;b<numBosses&&b<q.length;b++){
    q[q.length-1-b]='boss';
  }

  return q;
}

function startWave(){
  wave++;
  waveEl.textContent=wave;
  spawnQueue=generateWave(wave);
  spawnTimer=0;waveActive=true;
  sfxWave();
  waveBanner.textContent='\u26A0 WAVE '+wave+' INCOMING';
  waveBanner.classList.add('show');
  setTimeout(function(){waveBanner.classList.remove('show');},1500);
}

function spawnEnemy(type){
  var def=ENEMY_DEFS[type];
  // HP scales gently to w10, ramps after, exponential late game
  var hpScale;
  if(wave<=10) hpScale=1+(wave-1)*0.1;                // 1.0 – 1.9
  else if(wave<=15) hpScale=1.9+(wave-10)*0.35;       // 2.25 – 3.65
  else if(wave<=20) hpScale=3.65+(wave-15)*0.6;       // 4.25 – 6.65
  else hpScale=6.65*Math.pow(1.15,wave-20);           // exponential: ~7.6, ~8.8, ~10.1...
  // Speed boost: ramps to 50% by w15, 80% by w20, caps at 100%
  var spdBoost=1;
  if(wave>10) spdBoost=1+Math.min((wave-10)*0.06,1.0);
  enemies.push({
    t:0,type:type,hp:def.hp*hpScale,maxHp:def.hp*hpScale,
    speed:def.speed*spdBoost,baseSpeed:def.speed*spdBoost,size:def.size,color:def.color,
    reward:def.reward,slowTimer:0,poisonTimer:0,x:0,y:0,
    healRate:def.healRate||0,dodgeChance:def.dodgeChance||0,
    regenRate:def.regenRate||0,
    shieldHp:def.shield?def.shield*hpScale:0,maxShield:def.shield?def.shield*hpScale:0,
    wobble:Math.random()*Math.PI*2,
    trailTimer:0,
    stunTimer:0,marked:0,spreadPoison:false
  });
}

function updateHUD(){
  coinsEl.textContent=coins;livesEl.textContent=lives;
  scoreEl.textContent=score;waveEl.textContent=wave;
  updateTowerBar();
}

