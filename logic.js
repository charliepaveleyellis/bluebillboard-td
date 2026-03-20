// ─── GAME LOGIC ───────────────────────────────────

function spawnFloatText(x,y,text,color,big){
  for(var i=0;i<floatingTexts.length;i++){
    var ft=floatingTexts[i];
    if(ft.life>20&&Math.abs(ft.x-x)<15&&Math.abs(ft.y-y)<15&&ft.color===color){
      ft.text=''+(Math.floor(parseFloat(ft.text)+parseFloat(text)));
      ft.life=30;return;
    }
  }
  if(floatingTexts.length>15) return;
  floatingTexts.push({x:x+(Math.random()-0.5)*10,y:y,text:''+text,color:color||'#fff',life:30,big:big||false});
}

function isEnemyRevealed(e){
  if(!e.camo) return true;
  if(e._revealFrame===frameCount) return e._revealed;
  e._revealFrame=frameCount;
  for(var i=0;i<towers.length;i++){
    var dx=e.x-towers[i].x,dy=e.y-towers[i].y;
    if(Math.sqrt(dx*dx+dy*dy)<towers[i].range){e._revealed=true;return true;}
  }
  e._revealed=false;return false;
}

var lightningArcs=[];

function findTarget(t){
  var target=null;
  var flyTarget=null;
  var mode=t.targetMode||'first';
  for(var j=0;j<enemies.length;j++){
    var e=enemies[j];
    var dx=e.x-t.x,dy=e.y-t.y;
    var dist=Math.sqrt(dx*dx+dy*dy);
    if(dist>=t.range) continue;
    if(e.flying&&!t.canHitFlying) continue;
    if(!isEnemyRevealed(e)) continue;
    // Flying enemies: track separately, prioritize closest to base
    if(e.flying&&t.canHitFlying){
      if(!flyTarget||dist<Math.sqrt((flyTarget.x-t.x)*(flyTarget.x-t.x)+(flyTarget.y-t.y)*(flyTarget.y-t.y))) flyTarget=e;
      continue;
    }
    if(!target){target=e;continue;}
    if(mode==='first'&&e.t>target.t) target=e;
    else if(mode==='last'&&e.t<target.t) target=e;
    else if(mode==='strong'&&e.hp>target.hp) target=e;
    else if(mode==='weak'&&e.hp<target.hp) target=e;
  }
  // Always prioritize flying enemies if tower can hit them
  return flyTarget||target;
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

function checkSynergies(){
  if(frameCount%10!==0&&synergies.length>0) return; // only recheck every 10 frames
  synergies=[];coldZones=[];
  for(var i=0;i<towers.length;i++){towers[i]._synergyRate=false;towers[i]._synergyMark=0;}
  for(var i=0;i<towers.length;i++){
    for(var j=i+1;j<towers.length;j++){
      var t1=towers[i],t2=towers[j];
      var dx=t1.x-t2.x,dy=t1.y-t2.y;
      var dist=Math.sqrt(dx*dx+dy*dy);
      // Two Freeze towers nearby: cold zone
      if(t1.type==='slow'&&t2.type==='slow'&&dist<80){
        synergies.push({i1:i,i2:j,type:'cold'});
        coldZones.push({x:(t1.x+t2.x)/2,y:(t1.y+t2.y)/2,radius:dist/2+20});
      }
      // Two Blasters nearby: +fire rate
      if(t1.type==='basic'&&t2.type==='basic'&&dist<80){
        synergies.push({i1:i,i2:j,type:'blaster'});
        t1._synergyRate=true;t2._synergyRate=true;
      }
      // Spotter sniper near another sniper: auto-mark
      if(t1.type==='sniper'&&t2.type==='sniper'&&dist<120){
        if(t2.path==='B'){synergies.push({i1:i,i2:j,type:'spotter'});t1._synergyMark=0.15;}
        if(t1.path==='B'){synergies.push({i1:i,i2:j,type:'spotter'});t2._synergyMark=0.15;}
      }
    }
  }
  // Cold zones slow enemies
  for(var ci=0;ci<coldZones.length;ci++){
    var cz=coldZones[ci];
    for(var ei=0;ei<enemies.length;ei++){
      var cdx=enemies[ei].x-cz.x,cdy=enemies[ei].y-cz.y;
      if(Math.sqrt(cdx*cdx+cdy*cdy)<cz.radius) enemies[ei].slowTimer=Math.max(enemies[ei].slowTimer,10);
    }
  }
}

function updateTowers(){
  // Cap bullets for performance
  while(bullets.length>100) bullets.shift();
  checkSynergies();
  lightningArcs=[];
  for(var i=0;i<towers.length;i++){
    var t=towers[i];
    // Poison aura: passively poisons nearby enemies every frame
    if(t.poisonAura&&frameCount%10===0){
      var auraRange=findEnemiesInRange(t.x,t.y,t.poisonAura);
      for(var pa=0;pa<auraRange.length;pa++){
        enemies[auraRange[pa]].poisonTimer=Math.max(enemies[auraRange[pa]].poisonTimer||0,9999);
        if(t.spreadPoison) enemies[auraRange[pa]].spreadPoison=true;
      }
      if(auraRange.length>0&&frameCount%20===0) particles.push({x:t.x,y:t.y,vx:0,vy:0,life:15,size:t.poisonAura/3,color:COL.neonGreen,ring:true,noGravity:true});
    }
    t.cooldown--;
    if(t._synergyRate&&t.cooldown>0) t.cooldown=Math.max(1,t.cooldown-1); // double cooldown tick
    if(t.cooldown>0) continue;

    var target=findTarget(t);
    if(!target) continue;

    t.cooldown=t.rate;
    t.fireAnim=5;

    if(t.type==='chain'){
      var inRange=findEnemiesInRange(t.x,t.y,t.range);
      var hitCount=0;
      for(var j=0;j<inRange.length&&hitCount<(t.chain||3);j++){
        if(enemies[inRange[j]].flying&&!t.canHitFlying) continue;
        var e=enemies[inRange[j]];
        var dmg=t.dmg;
        if(t.armorBreak){/* skip shield */}
        else if(e.shieldHp&&e.shieldHp>0){var ab=Math.min(e.shieldHp,dmg);e.shieldHp-=ab;dmg-=ab;}
        if(e.marked) dmg*=(1+e.marked);
        e.hp-=dmg;
        spawnFloatText(e.x,e.y-e.size,Math.ceil(dmg*10)/10,COL.purple,false);
        if(t.stun&&!(e.stunImmune>0)&&!(e.stunTimer>0)) e.stunTimer=t.stun;
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
      spawnFloatText(target.x,target.y-target.size,Math.ceil(dmg),COL.gold,!!t.crit);
      // Execute: instant kill below HP threshold
      if(t.execute&&target.hp>0&&target.hp/target.maxHp<=t.execute){
        target.hp=0;
        for(var ek=0;ek<12;ek++) particles.push({x:target.x,y:target.y,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:15,size:3,color:COL.gold});
      }
      // Mark target
      if(t.mark) target.marked=Math.max(target.marked||0,t.mark);
      if(t._synergyMark) target.marked=Math.max(target.marked||0,t._synergyMark);
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
      // basic tower — extra bullets do 60% damage
      var shotCount=t.multishot||1;
      for(var ms=0;ms<shotCount;ms++){
        var aim=fireProjectile(t,target);
        var spread=shotCount>1?(Math.random()-0.5)*0.35:0;
        var shotDmg=ms===0?t.dmg:t.dmg*0.6;
        bullets.push({
          x:t.x,y:t.y,vx:(aim.fdx+spread)*aim.spd,vy:(aim.fdy+spread)*aim.spd,
          dmg:shotDmg,splash:t.splash||0,slow:t.slow||0,poison:0,chain:0,
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
        if(e.camo&&!isEnemyRevealed(e)) continue;
        var dmg=b.dmg;
        // Marked bonus damage
        if(e.marked) dmg*=(1+e.marked);
        // Armor break or poison skips shields
        if(b.armorBreak||b.poison){/* skip shield */}
        else if(e.shieldHp&&e.shieldHp>0){
          var ab=Math.min(e.shieldHp,dmg);e.shieldHp-=ab;dmg-=ab;
          // Shield break particles
          for(var sp=0;sp<3;sp++){
            particles.push({x:e.x+(Math.random()-0.5)*10,y:e.y-e.size,
              vx:(Math.random()-0.5)*3,vy:-Math.random()*2,life:10,size:2,color:'#4488ff'});
          }
        }
        e.hp-=dmg;
        spawnFloatText(e.x,e.y-e.size,Math.ceil(dmg*10)/10,b.color,false);
        sfxHit();
        if(b.poison){
          e.poisonTimer=Math.max(e.poisonTimer||0,b.poison*30);
          if(b.spreadPoison) e.spreadPoison=true;
        }
        // Slow on hit (basic overcharge path)
        if(b.slow) e.slowTimer=Math.max(e.slowTimer,60);
        // Stun on hit
        if(b.stun&&!(e.stunImmune>0)&&!(e.stunTimer>0)) e.stunTimer=b.stun;
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
          if(b.burn&&burnZones.length<15) burnZones.push({x:b.x,y:b.y,life:b.burn,dmg:b.burnDmg,radius:b.splash});
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
      // When stun ends, start immunity
      if(e.stunTimer<=0) e.stunImmune=180;
      continue;
    }
    // Stun immunity countdown (only ticks when NOT stunned)
    if(e.stunImmune>0) e.stunImmune--;

    if(e.slowTimer>0){e.speed=e.baseSpeed*0.4;e.slowTimer--;}
    else e.speed=e.baseSpeed;

    if(e.poisonTimer>0){
      e.poisonTimer--;
      e.hp-=0.12;
      if(frameCount%8===0) particles.push({x:e.x+Math.random()*6-3,y:e.y-e.size,vx:0,vy:-1,life:10,size:2,color:COL.neonGreen});
    }

    if(e.regenRate>0&&e.hp<e.maxHp) e.hp=Math.min(e.maxHp,e.hp+e.regenRate);

    if(e.flying){
      var endPt=posOnPath(1);
      var fdx=endPt.x-e.x,fdy=endPt.y-e.y;
      var fdist=Math.sqrt(fdx*fdx+fdy*fdy);
      if(fdist<12){lives--;enemies.splice(i,1);updateHUD();if(lives<=0){endGame();return;}continue;}
      e.x+=(fdx/fdist)*e.speed*600;
      e.y+=(fdy/fdist)*e.speed*600;
    } else {
      e.t+=e.speed;
    }

    if(e.healRate>0 && enemies.length<50){
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

    // Rootkit: spawns minions every 180 frames
    if(e.type==='rootkit'){
      e.spawnTimer=(e.spawnTimer||0)+1;
      if(e.spawnTimer>=180){
        e.spawnTimer=0;
        spawnEnemy('swarm');spawnEnemy('swarm');
        particles.push({x:e.x,y:e.y,vx:0,vy:0,life:15,size:8,color:COL.neonGreen,ring:true,noGravity:true});
      }
    }
    // Ransomware: heals to full if not killed in timer
    if(e.type==='ransomware'){
      if(e.ransomHealTimer>0) e.ransomHealTimer--;
      if(e.ransomHealTimer===0&&e.hp>0){
        e.hp=e.maxHp;e.ransomHealTimer=600;
        spawnFloatText(e.x,e.y-e.size-10,'ENCRYPTED!','#ff2222',true);
        for(var rk=0;rk<12;rk++) particles.push({x:e.x+(Math.random()-0.5)*20,y:e.y+(Math.random()-0.5)*20,vx:0,vy:-1.5,life:15,size:3,color:'#ff2222',noGravity:true});
      }
    }
    // Worm: splits at 50% HP
    if(e.type==='worm'&&!e.hasSplit&&e.hp<=e.maxHp*0.5){
      e.hasSplit=true;
      var spdB=1;if(wave>10)spdB=1+Math.min((wave-10)*0.06,1.0);
      for(var ws=0;ws<3;ws++){
        enemies.push({
          t:Math.max(0,e.t-0.01+ws*0.015),type:'fast',
          hp:e.maxHp*0.2,maxHp:e.maxHp*0.2,
          speed:0.0012*spdB,baseSpeed:0.0012*spdB,size:8,color:'#aaff00',reward:8,
          slowTimer:0,poisonTimer:0,x:e.x+(ws*10-10),y:e.y,
          healRate:0,dodgeChance:0,regenRate:0,shieldHp:0,maxShield:0,
          wobble:Math.random()*Math.PI*2,trailTimer:0,
          stunTimer:0,stunImmune:0,marked:0,spreadPoison:false
        });
      }
      for(var wsp=0;wsp<10;wsp++){var wspa=(wsp/10)*Math.PI*2;
        particles.push({x:e.x,y:e.y,vx:Math.cos(wspa)*4,vy:Math.sin(wspa)*4,life:15,size:2,color:'#aaff00'});}
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
      // Splitter: spawn smaller enemies on death
      if(e.type==='splitter'){
        var splitDef=ENEMY_DEFS.swarm;
        var spdBoost=1;if(wave>10)spdBoost=1+Math.min((wave-10)*0.06,1.0);
        for(var sp2=0;sp2<2;sp2++){
          enemies.push({
            t:Math.max(0,e.t-0.01+sp2*0.02),type:'swarm',
            hp:splitDef.hp*(1+(wave-1)*0.1),maxHp:splitDef.hp*(1+(wave-1)*0.1),
            speed:splitDef.speed*spdBoost*1.2,baseSpeed:splitDef.speed*spdBoost*1.2,
            size:splitDef.size,color:'#ff6600',reward:splitDef.reward,
            slowTimer:0,poisonTimer:0,x:e.x+(sp2*8-4),y:e.y,
            healRate:0,dodgeChance:0,regenRate:0,shieldHp:0,maxShield:0,
            wobble:Math.random()*Math.PI*2,trailTimer:0,
            stunTimer:0,stunImmune:0,marked:0,spreadPoison:false
          });
        }
      }
      // Finalboss: big explosion on death
      if(e.type==='finalboss'){
        for(var fb=0;fb<40;fb++){
          var fba=(fb/40)*Math.PI*2+Math.random()*0.2;
          particles.push({x:e.x,y:e.y,vx:Math.cos(fba)*(3+Math.random()*6),vy:Math.sin(fba)*(3+Math.random()*6),
            life:30+Math.random()*15,size:2+Math.random()*4,color:fb%3===0?'#ff0044':fb%3===1?COL.gold:'#ff8800'});
        }
        particles.push({x:e.x,y:e.y,vx:0,vy:0,life:30,size:8,color:'#ff0044',ring:true,noGravity:true});
        screenFlash=12;shakeX=(Math.random()-0.5)*15;shakeY=(Math.random()-0.5)*15;
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
    var previewQ=generateWave(wave+1);
    var typeCounts={};
    for(var pi=0;pi<previewQ.length;pi++) typeCounts[previewQ[pi]]=(typeCounts[previewQ[pi]]||0)+1;
    nextWavePreview=[];
    for(var pt in typeCounts) nextWavePreview.push({type:pt,count:typeCounts[pt],def:ENEMY_DEFS[pt]});
    // Bonus objectives
    var bonusMult=1.0;
    var bonusParts=[];
    if(lives>=waveLivesStart){bonusMult+=0.5;bonusParts.push('PERFECT +50%');}
    var waveTime=(frameCount-waveStartFrame);
    if(waveTime<200+wave*20){bonusMult+=0.25;bonusParts.push('FAST +25%');}
    var waveBonus=wave<=10?(25+wave*10):(wave<=15?(25+wave*7):(25+wave*4));
    waveBonus=Math.floor(waveBonus*bonusMult);
    coins+=waveBonus;updateHUD();
    if(bonusParts.length>0){
      waveBanner.textContent='WAVE '+wave+' CLEAR! '+bonusParts.join(' | ')+' (+'+waveBonus+')';
      waveBanner.classList.add('show');
      setTimeout(function(){waveBanner.classList.remove('show');},2500);
    }
    // Win at wave 20
    if(wave===30) winGame();
  }
}

