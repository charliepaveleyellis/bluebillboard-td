// ─── GAME LOGIC ───────────────────────────────────

var lightningArcs=[];

function findTarget(t){
  var target=null;
  for(var j=0;j<enemies.length;j++){
    var e=enemies[j];
    var dx=e.x-t.x,dy=e.y-t.y;
    if(Math.sqrt(dx*dx+dy*dy)<t.range&&(target===null||e.t>target.t)) target=e;
  }
  return target;
}

function findEnemiesInRange(x,y,range){
  var found=[];
  for(var j=0;j<enemies.length;j++){
    var dx=enemies[j].x-x,dy=enemies[j].y-y;
    if(Math.sqrt(dx*dx+dy*dy)<range) found.push(j);
  }
  return found;
}

function fireProjectile(t,target){
  var spd=10;
  var dx=target.x-t.x,dy=target.y-t.y;
  var dist=Math.sqrt(dx*dx+dy*dy);
  var timeToHit=dist/spd;
  var futurePos=posOnPath(Math.min(1,target.t+target.speed*timeToHit*0.5));
  var fdx=futurePos.x-t.x,fdy=futurePos.y-t.y;
  var fdist=Math.sqrt(fdx*fdx+fdy*fdy);
  t.angle=Math.atan2(fdy,fdx)+Math.PI/2;
  return {fdx:fdx/fdist,fdy:fdy/fdist,spd:spd};
}

function updateTowers(){
  lightningArcs=[];
  for(var i=0;i<towers.length;i++){
    var t=towers[i];
    // Poison aura: passively poisons nearby enemies every frame
    if(t.poisonAura&&frameCount%10===0){
      var auraRange=findEnemiesInRange(t.x,t.y,t.poisonAura);
      for(var pa=0;pa<auraRange.length;pa++){
        enemies[auraRange[pa]].poisonTimer=Math.max(enemies[auraRange[pa]].poisonTimer||0,30);
        if(t.spreadPoison) enemies[auraRange[pa]].spreadPoison=true;
      }
      if(auraRange.length>0&&frameCount%20===0) particles.push({x:t.x,y:t.y,vx:0,vy:0,life:15,size:t.poisonAura/3,color:COL.neonGreen,ring:true,noGravity:true});
    }
    t.cooldown--;
    if(t.cooldown>0) continue;

    var target=findTarget(t);
    if(!target) continue;

    t.cooldown=t.rate;
    t.fireAnim=5;

    if(t.type==='chain'){
      var inRange=findEnemiesInRange(t.x,t.y,t.range);
      var hitCount=0;
      for(var j=0;j<inRange.length&&hitCount<(t.chain||3);j++){
        var e=enemies[inRange[j]];
        var dmg=t.dmg;
        if(t.armorBreak){/* skip shield */}
        else if(e.shieldHp&&e.shieldHp>0){var ab=Math.min(e.shieldHp,dmg);e.shieldHp-=ab;dmg-=ab;}
        if(e.marked) dmg*=(1+e.marked);
        e.hp-=dmg;
        if(t.stun) e.stunTimer=Math.max(e.stunTimer||0,t.stun);
        lightningArcs.push({x1:t.x,y1:t.y,x2:e.x,y2:e.y,life:6});
        particles.push({x:e.x,y:e.y,vx:(Math.random()-0.5)*2,vy:-2,life:8,size:2,color:COL.purple});
        hitCount++;
      }
      if(inRange.length>0){ playSweep(2000,400,'sawtooth',0.08,0.05); playTone(1500,'square',0.03,0.03); }
      t.angle+=0.2;
    }
    else if(t.type==='slow'){
      var inRange=findEnemiesInRange(t.x,t.y,t.range);
      for(var j=0;j<inRange.length;j++){
        var e=enemies[inRange[j]];
        var slowDur=t.slowDur||60;
        e.slowTimer=Math.max(e.slowTimer,slowDur);
        e.hp-=t.dmg;
        if(t.bonusDmgMark) e.marked=Math.max(e.marked||0,t.bonusDmgMark);
        // Shatter: instant kill frozen enemies below HP threshold
        if(t.shatter&&e.slowTimer>0&&e.hp/e.maxHp<=t.shatter){
          e.hp=0;
          for(var sk=0;sk<10;sk++) particles.push({x:e.x,y:e.y,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,life:15,size:2,color:'#aaeeff'});
        }
        particles.push({x:e.x,y:e.y,vx:(Math.random()-0.5)*2,vy:-1,life:10,size:2,color:COL.cyan});
      }
      // splashSlow: apply slow to enemies in wider radius
      if(t.splashSlow){
        var wideRange=findEnemiesInRange(t.x,t.y,t.range+t.splashSlow);
        for(var j=0;j<wideRange.length;j++){
          var e=enemies[wideRange[j]];
          e.slowTimer=Math.max(e.slowTimer,t.slowDur||60);
        }
      }
      if(inRange.length>0) sfxShoot();
      t.angle+=0.1;
    }
    else if(t.type==='sniper'){
      var aim=fireProjectile(t,target);
      var dmg=t.dmg;
      // Crit
      if(t.crit&&Math.random()<t.crit) dmg*=3;
      if(t.armorBreak){/* skip shield */}
      else if(target.shieldHp&&target.shieldHp>0){var ab=Math.min(target.shieldHp,dmg);target.shieldHp-=ab;dmg-=ab;}
      if(target.marked) dmg*=(1+target.marked);
      target.hp-=dmg;
      // Execute: instant kill below HP threshold
      if(t.execute&&target.hp>0&&target.hp/target.maxHp<=t.execute){
        target.hp=0;
        for(var ek=0;ek<12;ek++) particles.push({x:target.x,y:target.y,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:15,size:3,color:COL.gold});
      }
      // Mark target
      if(t.mark) target.marked=Math.max(target.marked||0,t.mark);
      // Mark ALL enemies in range
      if(t.markAll){
        var markRange=findEnemiesInRange(t.x,t.y,t.range);
        for(var mi=0;mi<markRange.length;mi++) enemies[markRange[mi]].marked=Math.max(enemies[markRange[mi]].marked||0,t.mark);
      }
      sfxShoot();
      lightningArcs.push({x1:t.x,y1:t.y,x2:target.x,y2:target.y,life:4,color:COL.gold});
      particles.push({x:target.x,y:target.y,vx:0,vy:-3,life:12,size:3,color:COL.gold});
    }
    else if(t.type==='rapid'){
      var shotCount=t.multishot||1;
      for(var ms=0;ms<shotCount;ms++){
        var aim=fireProjectile(t,target);
        var spread=(Math.random()-0.5)*0.3;
        bullets.push({
          x:t.x,y:t.y,vx:(aim.fdx+spread)*aim.spd*1.2,vy:(aim.fdy+spread)*aim.spd*1.2,
          dmg:t.dmg,splash:0,slow:0,poison:0,chain:0,
          color:t.color,size:2,life:40,
          pierce:t.pierce,armorBreak:t.armorBreak
        });
      }
      sfxShoot();
    }
    else if(t.type==='splash'){
      var aim=fireProjectile(t,target);
      bullets.push({
        x:t.x,y:t.y,vx:aim.fdx*6,vy:aim.fdy*6,
        dmg:t.dmg,splash:t.splash,slow:0,poison:0,chain:0,
        color:t.color,size:6,life:80,
        burn:t.burn,burnDmg:t.burnDmg
      });
      sfxShoot();
    }
    else if(t.type==='poison'){
      var aim=fireProjectile(t,target);
      bullets.push({
        x:t.x,y:t.y,vx:aim.fdx*8,vy:aim.fdy*8,
        dmg:t.dmg,splash:0,slow:0,poison:t.poison,chain:0,
        color:t.color,size:4,life:50,
        armorBreak:t.armorBreak,spreadPoison:t.spreadPoison
      });
      sfxShoot();
    }
    else {
      // basic tower
      var shotCount=t.multishot||1;
      for(var ms=0;ms<shotCount;ms++){
        var aim=fireProjectile(t,target);
        var spread=shotCount>1?(Math.random()-0.5)*0.3:0;
        bullets.push({
          x:t.x,y:t.y,vx:(aim.fdx+spread)*aim.spd,vy:(aim.fdy+spread)*aim.spd,
          dmg:t.dmg,splash:t.splash||0,slow:t.slow||0,poison:0,chain:0,
          color:t.color,size:3,life:60,
          pierce:t.pierce,armorBreak:t.armorBreak
        });
      }
      sfxShoot();
    }
  }
}

function updateBullets(){
  for(var i=lightningArcs.length-1;i>=0;i--){
    lightningArcs[i].life--;
    if(lightningArcs[i].life<=0) lightningArcs.splice(i,1);
  }

  for(var i=bullets.length-1;i>=0;i--){
    var b=bullets[i];
    b.x+=b.vx;b.y+=b.vy;b.life--;
    if(b.life<=0){bullets.splice(i,1);continue;}

    for(var j=0;j<enemies.length;j++){
      var e=enemies[j];
      var dx=b.x-e.x,dy=b.y-e.y;
      if(Math.sqrt(dx*dx+dy*dy)<e.size+10){
        if(e.dodgeChance>0&&Math.random()<e.dodgeChance){
          particles.push({x:e.x,y:e.y,vx:0,vy:-2,life:15,size:2,color:COL.magenta});
          if(!b.pierce){bullets.splice(i,1);break;}
          else continue;
        }
        var dmg=b.dmg;
        // Marked bonus damage
        if(e.marked) dmg*=(1+e.marked);
        // Armor break skips shields
        if(b.armorBreak){/* skip shield */}
        else if(e.shieldHp&&e.shieldHp>0){
          var ab=Math.min(e.shieldHp,dmg);e.shieldHp-=ab;dmg-=ab;
          // Shield break particles
          for(var sp=0;sp<3;sp++){
            particles.push({x:e.x+(Math.random()-0.5)*10,y:e.y-e.size,
              vx:(Math.random()-0.5)*3,vy:-Math.random()*2,life:10,size:2,color:'#4488ff'});
          }
        }
        e.hp-=dmg;
        sfxHit();
        if(b.poison){
          e.poisonTimer=Math.max(e.poisonTimer||0,b.poison*30);
          if(b.spreadPoison) e.spreadPoison=true;
        }
        // Slow on hit (basic overcharge path)
        if(b.slow) e.slowTimer=Math.max(e.slowTimer,60);
        // Stun on hit
        if(b.stun) e.stunTimer=Math.max(e.stunTimer||0,b.stun);
        if(b.splash>0){
          for(var k=0;k<enemies.length;k++){
            if(k===j) continue;
            var sdx=b.x-enemies[k].x,sdy=b.y-enemies[k].y;
            if(Math.sqrt(sdx*sdx+sdy*sdy)<b.splash){
              var sDmg=b.dmg*0.6;
              if(b.armorBreak){/* skip shield for splash too */}
              else if(enemies[k].shieldHp&&enemies[k].shieldHp>0){
                var sab=Math.min(enemies[k].shieldHp,sDmg);enemies[k].shieldHp-=sab;sDmg-=sab;
              }
              enemies[k].hp-=sDmg;
              if(b.poison) enemies[k].poisonTimer=Math.max(enemies[k].poisonTimer||0,b.poison*20);
            }
          }
          // Napalm burn zone
          if(b.burn) burnZones.push({x:b.x,y:b.y,life:b.burn,dmg:b.burnDmg,radius:b.splash});
          sfxExplosion();
          // Neon shockwave ring
          particles.push({x:b.x,y:b.y,vx:0,vy:0,life:20,size:3,color:COL.neonRed,ring:true,noGravity:true});
          // Fast neon spark squares
          for(var k=0;k<8;k++){
            var a=(k/8)*Math.PI*2;
            particles.push({x:b.x,y:b.y,vx:Math.cos(a)*6,vy:Math.sin(a)*6,life:15,size:2,color:COL.neonRed});
          }
          // Brief screen flash
          screenFlash=4;
        }
        // Hit sparks — 5 tiny fast white+colour squares
        for(var k=0;k<5;k++){
          particles.push({x:b.x,y:b.y,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,
            life:10,size:1.5,color:k<2?COL.white:b.color});
        }
        // Pierce: don't remove bullet, but reduce life
        if(b.pierce){
          b.life-=10;
          if(b.life<=0){bullets.splice(i,1);break;}
          // Skip this enemy next time (mark as hit)
        } else {
          bullets.splice(i,1);break;
        }
      }
    }
  }
}

function updateBurnZones(){
  for(var i=burnZones.length-1;i>=0;i--){
    var bz=burnZones[i];
    bz.life--;
    if(bz.life<=0){burnZones.splice(i,1);continue;}
    // Damage enemies in burn zone
    for(var j=0;j<enemies.length;j++){
      var e=enemies[j];
      var dx=e.x-bz.x,dy=e.y-bz.y;
      if(Math.sqrt(dx*dx+dy*dy)<(bz.radius||45)){
        e.hp-=bz.dmg;
      }
    }
    // Visual particles
    if(frameCount%6===0){
      particles.push({x:bz.x+(Math.random()-0.5)*(bz.radius||45),y:bz.y+(Math.random()-0.5)*(bz.radius||45),
        vx:(Math.random()-0.5)*0.5,vy:-1-Math.random(),life:12,size:2,color:'#ff6600',noGravity:true});
    }
  }
}

function updateEnemies(){
  // Update burn zones first
  updateBurnZones();

  for(var i=enemies.length-1;i>=0;i--){
    var e=enemies[i];

    // Stun handling
    if(e.stunTimer&&e.stunTimer>0){
      e.stunTimer--;
      if(frameCount%10===0) particles.push({x:e.x+(Math.random()-0.5)*8,y:e.y-e.size,vx:0,vy:-1,life:8,size:2,color:COL.purple});
      continue;
    }

    if(e.slowTimer>0){e.speed=e.baseSpeed*0.4;e.slowTimer--;}
    else e.speed=e.baseSpeed;

    if(e.poisonTimer>0){
      e.poisonTimer--;
      e.hp-=0.04;
      if(frameCount%8===0) particles.push({x:e.x+Math.random()*6-3,y:e.y-e.size,vx:0,vy:-1,life:10,size:2,color:COL.neonGreen});
    }

    if(e.regenRate>0&&e.hp<e.maxHp) e.hp=Math.min(e.maxHp,e.hp+e.regenRate);

    e.t+=e.speed;

    if(e.healRate>0){
      for(var j=0;j<enemies.length;j++){
        if(j===i) continue;
        var dx=e.x-enemies[j].x,dy=e.y-enemies[j].y;
        if(Math.sqrt(dx*dx+dy*dy)<50&&enemies[j].hp<enemies[j].maxHp){
          enemies[j].hp=Math.min(enemies[j].maxHp,enemies[j].hp+e.healRate);
        }
      }
    }

    if(e.t>=1){
      lives--;enemies.splice(i,1);updateHUD();
      if(navigator.vibrate) navigator.vibrate([60,30,60]);
      if(lives<=0){endGame();return;}
      continue;
    }

    if(e.hp<=0){
      coins+=e.reward;score+=e.reward;totalKills++;
      sfxKill();
      // Spread poison on kill
      if(e.spreadPoison&&e.poisonTimer>0){
        for(var sp=0;sp<enemies.length;sp++){
          if(sp===i) continue;
          var sdx=e.x-enemies[sp].x,sdy=e.y-enemies[sp].y;
          if(Math.sqrt(sdx*sdx+sdy*sdy)<60){
            enemies[sp].poisonTimer=Math.max(enemies[sp].poisonTimer||0,120);
            enemies[sp].spreadPoison=true;
            particles.push({x:enemies[sp].x,y:enemies[sp].y,vx:0,vy:-1,life:10,size:3,color:COL.neonGreen});
          }
        }
      }
      // Digital dissolve — 20 scattered tiny square particles
      for(var k=0;k<20;k++){
        var a=(k/20)*Math.PI*2+Math.random()*0.3;
        particles.push({x:e.x,y:e.y,vx:Math.cos(a)*(2+Math.random()*3),vy:Math.sin(a)*(2+Math.random()*3),
          life:20+Math.random()*10,size:1.5+Math.random()*2,color:e.color});
      }
      // 2 expanding neon ring particles
      particles.push({x:e.x,y:e.y,vx:0,vy:0,life:18,size:2,color:e.color,ring:true,noGravity:true});
      particles.push({x:e.x,y:e.y,vx:0,vy:0,life:12,size:4,color:COL.white,ring:true,noGravity:true});
      // Brief "DELETED" text flash (via extra particle used as marker — handled in draw)
      enemies.splice(i,1);updateHUD();
    }
  }
}

function updateSpawning(){
  if(!waveActive){
    waveCooldown--;
    if(waveCooldown<=0) startWave();
    return;
  }
  spawnTimer--;
  if(spawnTimer<=0&&spawnQueue.length>0){
    spawnEnemy(spawnQueue.shift());
    // Faster spawning: tightens drastically late game
    if(wave<=10) spawnTimer=40-Math.min(wave,15);              // 40 down to 25
    else if(wave<=15) spawnTimer=Math.max(10,25-Math.floor((wave-10)*2)); // 25 down to 15
    else if(wave<=20) spawnTimer=Math.max(6,15-Math.floor((wave-15)*2));  // 15 down to 5
    else spawnTimer=Math.max(4,6-Math.floor((wave-20)*0.5));              // near-instant
  }
  if(spawnQueue.length===0&&enemies.length===0){
    waveActive=false;
    // Barely any build time late game
    if(wave<=10) waveCooldown=120;
    else if(wave<=15) waveCooldown=Math.max(60,120-(wave-10)*10);
    else if(wave<=20) waveCooldown=Math.max(35,60-(wave-15)*5);
    else waveCooldown=30;  // almost no breathing room
    // Wave bonus coins taper off
    var waveBonus=wave<=10?(20+wave*8):(wave<=15?(20+wave*5):(20+wave*3));
    coins+=waveBonus;updateHUD();
  }
}

