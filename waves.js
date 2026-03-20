// ─── WAVE SYSTEM ──────────────────────────────────
function generateWave(w){
  // Smooth count curve — no big jumps
  var count;
  if(w<=3) count=2+w;                           // 3,4,5
  else if(w<=6) count=3+w;                      // 7,8,9
  else if(w<=10) count=2+w+Math.floor(w/2);     // 11-17
  else count=Math.floor(17+(w-10)*3.5);          // 20,24,27,31,34,38,41,45,48,52...

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
      if(r<0.12) type='fast';
      else if(r<0.22) type='swarm';
      else if(r<0.29) type='healer';
      else if(r<0.37) type='regen';
      else if(r<0.47) type='tank';
      else if(r<0.54) type='shield';
      else if(r<0.60) type='ghost';
    } else if(w<=12){
      if(r<0.08) type='fast';
      else if(r<0.16) type='swarm';
      else if(r<0.22) type='healer';
      else if(r<0.30) type='regen';
      else if(r<0.42) type='tank';
      else if(r<0.52) type='shield';
      else if(r<0.60) type='dodge';
      else if(r<0.68) type='ghost';
      else if(r<0.74) type='splitter';
    } else if(w<=18){
      if(r<0.04) type='basic';
      else if(r<0.09) type='fast';
      else if(r<0.15) type='swarm';
      else if(r<0.21) type='healer';
      else if(r<0.30) type='regen';
      else if(r<0.42) type='tank';
      else if(r<0.52) type='shield';
      else if(r<0.60) type='dodge';
      else if(r<0.68) type='ghost';
      else if(r<0.76) type='splitter';
      else if(r<0.82) type='mega';
    } else {
      // Post-18: full elites
      if(r<0.05) type='fast';
      else if(r<0.10) type='swarm';
      else if(r<0.16) type='healer';
      else if(r<0.26) type='regen';
      else if(r<0.38) type='tank';
      else if(r<0.48) type='shield';
      else if(r<0.56) type='dodge';
      else if(r<0.64) type='ghost';
      else if(r<0.74) type='splitter';
      else if(r<0.84) type='mega';
    }

    q.push(type);
  }

  // Bosses at the end
  var numBosses=0;
  if(w>=5) numBosses=1;
  if(w>=8) numBosses=2;
  if(w>=12) numBosses=3;
  if(w>=16) numBosses=4;
  if(w>=25) numBosses=5+Math.floor((w-25)/3);
  var bossInterval=w>=20?1:(w>=11?2:3);
  if(w%bossInterval!==0) numBosses=Math.max(0,numBosses-2);
  for(var b=0;b<numBosses&&b<q.length;b++){
    q[q.length-1-b]='boss';
  }

  // WAVE 20 FINAL BOSS — the Overlord
  if(w===20){
    q.push('mega');q.push('mega');q.push('mega');
    q.push('finalboss');
  }

  // Post-20 bonus bosses every 5 waves
  if(w>20&&w%5===0){
    q.push('finalboss');
  }

  return q;
}

function startWave(){
  wave++;
  waveEl.textContent=wave;
  spawnQueue=generateWave(wave);
  spawnTimer=0;waveActive=true;
  sfxWave();
  if(wave===20) waveBanner.textContent='\u2620 FINAL WAVE \u2620 THE OVERLORD APPROACHES';
  else waveBanner.textContent='\u26A0 WAVE '+wave+' INCOMING';
  waveBanner.classList.add('show');
  setTimeout(function(){waveBanner.classList.remove('show');},wave===20?2500:1500);
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
    stunTimer:0,stunImmune:0,marked:0,spreadPoison:false
  });
}

function updateHUD(){
  coinsEl.textContent=coins;livesEl.textContent=lives;
  scoreEl.textContent=score;waveEl.textContent=wave;
  updateTowerBar();
}

