// ─── DRAW FUNCTIONS ───────────────────────────────

function drawBackground(){
  // AR mode: translucent dark blue overlay — camera visible but tinted
  X.fillStyle='rgba(0,20,60,0.65)';
  X.fillRect(0,0,C.width,C.height);

  // Perspective grid — digital network overlay
  var spacing=40;
  gridOffset=(gridOffset+0.3)%spacing;

  X.lineWidth=1;
  // Vertical lines
  for(var x=0;x<C.width;x+=spacing){
    var isBright=(Math.floor(x/spacing)%4===0);
    X.strokeStyle=isBright?'rgba(0,61,122,0.12)':'rgba(0,61,122,0.04)';
    X.beginPath();X.moveTo(x,0);X.lineTo(x,C.height);X.stroke();
  }
  // Horizontal lines with scroll
  for(var y=-spacing;y<C.height+spacing;y+=spacing){
    var yy=y+gridOffset;
    var isBright=(Math.floor((y+spacing*100)/spacing)%4===0);
    X.strokeStyle=isBright?'rgba(0,61,122,0.12)':'rgba(0,61,122,0.04)';
    X.beginPath();X.moveTo(0,yy);X.lineTo(C.width,yy);X.stroke();
  }

  // Faint BB watermark in center
  X.globalAlpha=0.03;
  X.font='bold 80px Courier New';X.textAlign='center';X.textBaseline='middle';
  X.fillStyle=COL.bbBlue;
  X.fillText('BB',C.width/2,C.height/2);
  X.globalAlpha=1;
}

function offsetPath(path,dist){
  // Compute offset points for each vertex using averaged normals
  var pts=[];
  for(var i=0;i<path.length;i++){
    var nx=0,ny=0,count=0;
    // Normal from previous segment
    if(i>0){
      var dx=path[i].x-path[i-1].x,dy=path[i].y-path[i-1].y;
      var len=Math.sqrt(dx*dx+dy*dy)||1;
      nx+=-dy/len; ny+=dx/len; count++;
    }
    // Normal from next segment
    if(i<path.length-1){
      var dx=path[i+1].x-path[i].x,dy=path[i+1].y-path[i].y;
      var len=Math.sqrt(dx*dx+dy*dy)||1;
      nx+=-dy/len; ny+=dx/len; count++;
    }
    nx/=count; ny/=count;
    // Normalize the averaged normal
    var nlen=Math.sqrt(nx*nx+ny*ny)||1;
    nx/=nlen; ny/=nlen;
    pts.push({x:path[i].x+nx*dist, y:path[i].y+ny*dist});
  }
  return pts;
}

function drawPath(){
  var path=getPath();

  // Compute offset edge paths once
  var leftEdge=offsetPath(path,14);
  var rightEdge=offsetPath(path,-14);

  // Dark road surface — data cable
  X.strokeStyle='rgba(5,5,20,0.9)';
  X.lineWidth=30;X.lineCap='round';X.lineJoin='round';
  X.beginPath();X.moveTo(path[0].x,path[0].y);
  for(var i=1;i<path.length;i++) X.lineTo(path[i].x,path[i].y);
  X.stroke();

  // BB blue left edge — single continuous path
  neonGlow(COL.bbBlue,8,function(){
    X.strokeStyle=COL.bbBlue;X.lineWidth=1.5;X.lineCap='round';X.lineJoin='round';
    X.beginPath();X.moveTo(leftEdge[0].x,leftEdge[0].y);
    for(var i=1;i<leftEdge.length;i++) X.lineTo(leftEdge[i].x,leftEdge[i].y);
    X.stroke();
  });

  // Cyan right edge — single continuous path
  neonGlow(COL.cyan,8,function(){
    X.strokeStyle=COL.cyan;X.lineWidth=1.5;X.lineCap='round';X.lineJoin='round';
    X.beginPath();X.moveTo(rightEdge[0].x,rightEdge[0].y);
    for(var i=1;i<rightEdge.length;i++) X.lineTo(rightEdge[i].x,rightEdge[i].y);
    X.stroke();
  });

  // Animated dashed center line — data flowing
  X.strokeStyle=COL.bbBlue;X.lineWidth=1;X.globalAlpha=0.5;
  X.setLineDash([8,12]);
  X.lineDashOffset=-frameCount*2;
  X.beginPath();X.moveTo(path[0].x,path[0].y);
  for(var i=1;i<path.length;i++) X.lineTo(path[i].x,path[i].y);
  X.stroke();
  X.setLineDash([]);X.globalAlpha=1;

  // Billboard screen at end
  var end=path[path.length-1];
  var bw=80,bh=50;
  var bx=end.x-bw/2,by=end.y-bh/2;

  // Screen body — dark with blue tint
  X.fillStyle='rgba(0,8,24,0.95)';
  X.fillRect(bx,by,bw,bh);

  // Screen content glow
  var sg=X.createLinearGradient(bx,by,bx,by+bh);
  sg.addColorStop(0,'rgba(46,163,242,0.12)');
  sg.addColorStop(0.5,'rgba(46,163,242,0.06)');
  sg.addColorStop(1,'rgba(46,163,242,0.12)');
  X.fillStyle=sg;
  X.fillRect(bx+2,by+2,bw-4,bh-4);

  // White billboard icon on the screen
  if(iconWhite.complete && iconWhite.naturalWidth>0){
    var ih=bh-8,iw=ih*(iconWhite.naturalWidth/iconWhite.naturalHeight);
    X.drawImage(iconWhite,end.x-iw/2+3,by+(bh-ih)/2,iw,ih);
  }

  // Holographic scan line
  var scanY=by+(frameCount%60)/60*bh;
  X.strokeStyle='rgba(46,163,242,0.3)';X.lineWidth=1;
  X.beginPath();X.moveTo(bx,scanY);X.lineTo(bx+bw,scanY);X.stroke();

  // Neon border
  neonGlow(COL.bbBlue,12,function(){
    X.strokeStyle=COL.bbBlue;X.lineWidth=2;
    X.strokeRect(bx,by,bw,bh);
  });

  // Lives bar at bottom of screen
  var lbW=bw-8,lbH=5,lbY=by+bh-8;
  X.fillStyle='rgba(0,0,0,0.6)';
  X.fillRect(end.x-lbW/2,lbY,lbW,lbH);
  var healthPct=lives/15;
  if(healthPct>0.5) X.fillStyle=COL.bbBlue;
  else if(healthPct>0.2) X.fillStyle=COL.gold;
  else X.fillStyle=COL.neonRed;
  neonGlow(X.fillStyle,6,function(){
    X.fillRect(end.x-lbW/2,lbY,lbW*healthPct,lbH);
  });
}

function drawDecorations(){
  for(var i=0;i<decorations.length;i++){
    var d=decorations[i];
    d.sway+=0.02;
    var fc=frameCount;

    if(d.type==='billboard'){
      // Mini Blue Billboard screen
      var bw=18,bh=12;
      // Screen body
      X.fillStyle='rgba(0,10,30,0.9)';
      X.fillRect(d.x-bw/2,d.y-bh/2,bw,bh);
      // BB blue border
      X.strokeStyle=COL.bbBlue;X.lineWidth=1;
      X.strokeRect(d.x-bw/2,d.y-bh/2,bw,bh);
      // Draw mini logo
      if(logoImg.complete && logoImg.naturalWidth>0){
        X.drawImage(logoImg,d.x-7,d.y-5,14,8);
      } else {
        X.fillStyle=COL.bbBlue;X.font='bold 5px Courier New';X.textAlign='center';X.textBaseline='middle';
        X.fillText('BB',d.x,d.y);
      }
      // Scan line
      var sy=d.y-bh/2+((fc+d.phase*100)%30)/30*bh;
      X.strokeStyle='rgba(46,163,242,0.25)';X.lineWidth=0.5;
      X.beginPath();X.moveTo(d.x-bw/2,sy);X.lineTo(d.x+bw/2,sy);X.stroke();
      // Post
      X.fillStyle='rgba(46,163,242,0.3)';
      X.fillRect(d.x-1,d.y+bh/2,2,8);
    }
    else if(d.type==='signal'){
      // Signal tower — broadcasting ads
      var h=d.size*2;
      // Vertical mast
      X.strokeStyle=COL.bbBlue;X.lineWidth=2;
      X.beginPath();X.moveTo(d.x,d.y);X.lineTo(d.x,d.y-h);X.stroke();
      // Antenna tip
      X.fillStyle=COL.cyan;
      X.beginPath();X.arc(d.x,d.y-h,2,0,Math.PI*2);X.fill();
      // Expanding signal rings
      for(var r=0;r<3;r++){
        var ringR=((fc*0.02+d.phase+r*0.33)%1)*20+5;
        var alpha=1-((fc*0.02+d.phase+r*0.33)%1);
        X.strokeStyle='rgba(46,163,242,'+alpha*0.2+')';X.lineWidth=1;
        X.beginPath();X.arc(d.x,d.y-h,ringR,Math.PI*1.2,Math.PI*1.8);X.stroke();
      }
    }
    else if(d.type==='server'){
      // Server rack — stacked neon lines
      var rh=d.size*2.5;
      X.fillStyle='rgba(0,10,30,0.7)';
      X.fillRect(d.x-6,d.y-rh/2,12,rh);
      X.strokeStyle='rgba(46,163,242,0.3)';X.lineWidth=0.5;
      X.strokeRect(d.x-6,d.y-rh/2,12,rh);
      for(var line=0;line<5;line++){
        var ly=d.y-rh/2+3+line*(rh-6)/5;
        var col=line%2===0?COL.cyan:COL.bbBlue;
        X.strokeStyle=col;X.lineWidth=1;X.globalAlpha=0.4+Math.sin(fc*0.05+line)*0.2;
        X.beginPath();X.moveTo(d.x-4,ly);X.lineTo(d.x+4,ly);X.stroke();
      }
      X.globalAlpha=1;
      // Tiny blinking LED
      X.fillStyle=fc%(40+i*7)<20?COL.neonGreen:'transparent';
      X.fillRect(d.x+3,d.y-rh/2+2,2,2);
    }
    else if(d.type==='datanode'){
      // Data node — connected neon segments with pulsing dots
      var ns=d.size;
      X.strokeStyle='rgba(46,163,242,0.15)';X.lineWidth=1;
      var a1=d.sway,a2=d.sway+Math.PI*0.7;
      var x1=d.x+Math.cos(a1)*ns,y1=d.y+Math.sin(a1)*ns;
      var x2=d.x+Math.cos(a2)*ns,y2=d.y+Math.sin(a2)*ns;
      X.beginPath();X.moveTo(x1,y1);X.lineTo(d.x,d.y);X.lineTo(x2,y2);X.stroke();
      // Pulsing center dot
      var dotA=0.3+Math.sin(fc*0.08+d.phase)*0.3;
      X.fillStyle='rgba(0,255,255,'+dotA+')';
      X.beginPath();X.arc(d.x,d.y,2,0,Math.PI*2);X.fill();
      // End dots
      X.fillStyle='rgba(46,163,242,0.3)';
      X.beginPath();X.arc(x1,y1,1.5,0,Math.PI*2);X.fill();
      X.beginPath();X.arc(x2,y2,1.5,0,Math.PI*2);X.fill();
    }
  }
}

function drawTowerBase(t){
  // Range circle — dashed neon ring
  if(t.range<9000){
    X.strokeStyle='rgba(46,163,242,0.06)';X.lineWidth=1;
    X.setLineDash([6,6]);
    X.lineDashOffset=-frameCount*0.5;
    X.beginPath();X.arc(t.x,t.y,t.range,0,Math.PI*2);X.stroke();
    X.setLineDash([]);
  }

  // Shadow
  X.fillStyle='rgba(0,0,0,0.3)';
  X.beginPath();X.ellipse(t.x+2,t.y+3,18,12,0,0,Math.PI*2);X.fill();

  // Hexagonal base
  var hexR=17;
  // Dark fill
  X.fillStyle='rgba(5,5,20,0.9)';
  drawHex(t.x,t.y,hexR);
  X.fill();

  // Pulsing neon border
  var pulseAlpha=0.6+Math.sin(frameCount*0.05)*0.2;
  neonGlow(t.color,6,function(){
    X.strokeStyle=t.color;X.lineWidth=2;X.globalAlpha=pulseAlpha;
    drawHex(t.x,t.y,hexR);
    X.stroke();
    X.globalAlpha=1;
  });

  // Level indicators — neon gold tick marks on hex edge
  for(var lv=0;lv<t.level&&lv<5;lv++){
    var la=(lv/6)*Math.PI*2-Math.PI/6;
    var tx=t.x+Math.cos(la)*(hexR-3),ty=t.y+Math.sin(la)*(hexR-3);
    X.fillStyle=COL.gold;
    X.fillRect(tx-1.5,ty-1.5,3,3);
  }
}

function drawTowers(){
  for(var i=0;i<towers.length;i++){
    var t=towers[i];
    drawTowerBase(t);
    X.save();X.translate(t.x,t.y);X.rotate(t.angle);

    // Fire animation — neon burst
    if(t.fireAnim>0){
      t.fireAnim--;
      var fa=t.fireAnim/5;
      neonGlow(COL.bbBlue,10,function(){
        X.strokeStyle='rgba(46,163,242,'+fa+')';X.lineWidth=1.5;
        for(var fb=0;fb<6;fb++){
          var ba=(fb/6)*Math.PI*2;
          X.beginPath();
          X.moveTo(Math.cos(ba)*4,-20);
          X.lineTo(Math.cos(ba)*(8+t.fireAnim*2),-20-t.fireAnim*2);
          X.stroke();
        }
      });
    }

    if(t.type==='basic'){
      // Blaster — two parallel BB blue barrel lines
      X.strokeStyle=COL.bbBlue;X.lineWidth=2;
      X.beginPath();X.moveTo(-4,-5);X.lineTo(-4,-22);X.stroke();
      X.beginPath();X.moveTo(4,-5);X.lineTo(4,-22);X.stroke();
      // Bright tip dot
      neonGlow(COL.bbBlue,8,function(){
        X.fillStyle=COL.white;
        X.beginPath();X.arc(0,-22,2.5,0,Math.PI*2);X.fill();
      });
    }
    else if(t.type==='slow'){
      // Freeze — cyan wireframe crystal
      X.strokeStyle=COL.cyan;X.lineWidth=1.5;
      neonGlow(COL.cyan,6,function(){
        X.beginPath();X.moveTo(0,-24);X.lineTo(-7,-12);X.lineTo(0,-3);X.lineTo(7,-12);X.closePath();X.stroke();
        // Inner diamond
        X.globalAlpha=0.4;
        X.beginPath();X.moveTo(0,-20);X.lineTo(-4,-12);X.lineTo(0,-6);X.lineTo(4,-12);X.closePath();X.stroke();
        X.globalAlpha=1;
      });
      // Orbiting ice particles
      for(var ic=0;ic<3;ic++){
        var ia=frameCount*0.06+ic*Math.PI*2/3;
        var ix=Math.cos(ia)*10,iy=-13+Math.sin(ia)*6;
        X.fillStyle='rgba(0,255,255,0.5)';
        X.fillRect(ix-1,iy-1,2,2);
      }
    }
    else if(t.type==='rapid'){
      // Minigun — three spinning BB blue barrel lines
      var spin=frameCount*0.15;
      for(var b=0;b<3;b++){
        var ba=spin+b*Math.PI*2/3;
        var bx=Math.cos(ba)*3;
        X.strokeStyle=COL.bbBlue;X.lineWidth=1.5;
        neonGlow(COL.bbBlue,4,function(){
          X.beginPath();X.moveTo(bx,-5);X.lineTo(bx,-20);X.stroke();
        });
      }
      // Heat glow when firing
      var hasTargets=findEnemiesInRange(t.x,t.y,t.range).length>0;
      if(hasTargets){
        X.fillStyle='rgba(46,163,242,0.15)';
        X.beginPath();X.arc(0,-10,8,0,Math.PI*2);X.fill();
      }
    }
    else if(t.type==='poison'){
      // Malware Injector — neon green vial
      X.strokeStyle=COL.neonGreen;X.lineWidth=1.5;
      neonGlow(COL.neonGreen,6,function(){
        // Vial outline
        X.beginPath();X.moveTo(-2,-18);X.lineTo(-2,-10);X.lineTo(-5,-6);X.lineTo(-5,0);
        X.lineTo(5,0);X.lineTo(5,-6);X.lineTo(2,-10);X.lineTo(2,-18);X.closePath();X.stroke();
      });
      // Oscillating liquid inside
      var liqH=Math.sin(frameCount*0.08)*2;
      X.fillStyle='rgba(0,255,102,0.3)';
      X.fillRect(-4,-5+liqH,8,5-liqH);
      // Dripping droplets
      var dripY=(frameCount*2)%20;
      X.fillStyle=COL.neonGreen;X.globalAlpha=1-dripY/20;
      X.fillRect(-1,dripY-1,2,3);
      X.globalAlpha=1;
    }
    else if(t.type==='sniper'){
      // Long Range Antenna — extra-long thin gold barrel
      X.strokeStyle=COL.gold;X.lineWidth=1.5;
      neonGlow(COL.gold,6,function(){
        X.beginPath();X.moveTo(0,-5);X.lineTo(0,-32);X.stroke();
      });
      // Scope — red dot
      neonGlow('#ff0000',8,function(){
        X.fillStyle='#ff0000';
        X.beginPath();X.arc(0,-32,2,0,Math.PI*2);X.fill();
      });
      // Pulsing red laser sight
      var lAlpha=0.15+Math.sin(frameCount*0.1)*0.1;
      X.strokeStyle='rgba(255,0,0,'+lAlpha+')';X.lineWidth=0.5;
      X.beginPath();X.moveTo(0,-32);X.lineTo(0,-80);X.stroke();
    }
    else if(t.type==='splash'){
      // Data Bomb — wide diverging red barrel
      X.strokeStyle=COL.neonRed;X.lineWidth=2;
      neonGlow(COL.neonRed,6,function(){
        X.beginPath();X.moveTo(-3,-8);X.lineTo(-7,-22);X.stroke();
        X.beginPath();X.moveTo(3,-8);X.lineTo(7,-22);X.stroke();
      });
      // Glowing red circle at mouth
      neonGlow(COL.neonRed,10,function(){
        X.fillStyle=COL.neonRed;X.globalAlpha=0.6;
        X.beginPath();X.arc(0,-22,4,0,Math.PI*2);X.fill();
        X.globalAlpha=1;
      });
    }
    else if(t.type==='chain'){
      // EMP Tower — central pillar + two concentric purple coils
      X.strokeStyle=COL.purple;X.lineWidth=2;
      // Central pillar
      neonGlow(COL.purple,4,function(){
        X.beginPath();X.moveTo(0,0);X.lineTo(0,-18);X.stroke();
      });
      // Two concentric coils
      neonGlow(COL.purple,8,function(){
        X.strokeStyle=COL.purple;X.lineWidth=1.5;
        X.beginPath();X.arc(0,-14,8,0,Math.PI*2);X.stroke();
        X.beginPath();X.arc(0,-14,5,0,Math.PI*2);X.stroke();
      });
      // Bright top orb
      neonGlow(COL.white,10,function(){
        X.fillStyle=COL.purple;
        X.beginPath();X.arc(0,-22,3.5,0,Math.PI*2);X.fill();
        X.fillStyle=COL.white;
        X.beginPath();X.arc(0,-22,1.5,0,Math.PI*2);X.fill();
      });
      // Branching lightning
      var lf=Math.sin(frameCount*0.2)*3;
      X.strokeStyle='rgba(170,68,255,0.6)';X.lineWidth=1;
      X.beginPath();X.moveTo(0,-22);X.lineTo(-4+lf,-26);X.lineTo(-1,-24);X.lineTo(-5-lf,-28);X.stroke();
      X.beginPath();X.moveTo(0,-22);X.lineTo(4-lf,-26);X.lineTo(1,-24);X.lineTo(5+lf,-28);X.stroke();
    }

    X.restore();

    // Center orb
    neonGlow(t.color,8,function(){
      X.fillStyle=t.color;X.beginPath();X.arc(t.x,t.y,4,0,Math.PI*2);X.fill();
    });

    // ── ACTIVE AREA EFFECTS ──
    var hasTargets=findEnemiesInRange(t.x,t.y,t.range).length>0;

    if(t.type==='chain'&&hasTargets){
      X.strokeStyle='rgba(170,68,255,0.12)';X.lineWidth=1;
      var fc2=frameCount*0.15;
      for(var z=0;z<6;z++){
        var za=(z/6)*Math.PI*2+fc2;
        var r1=t.range*0.3,r2=t.range*(0.6+Math.sin(fc2+z)*0.3);
        X.beginPath();
        X.moveTo(t.x+Math.cos(za)*r1,t.y+Math.sin(za)*r1);
        X.lineTo(t.x+Math.cos(za+0.3)*(r1+r2)*0.5+Math.random()*8-4,
                 t.y+Math.sin(za+0.3)*(r1+r2)*0.5+Math.random()*8-4);
        X.lineTo(t.x+Math.cos(za+0.1)*r2,t.y+Math.sin(za+0.1)*r2);
        X.stroke();
      }
      var pulse=(frameCount%30)/30;
      X.strokeStyle='rgba(170,68,255,'+(0.15-pulse*0.15)+')';X.lineWidth=2;
      X.beginPath();X.arc(t.x,t.y,t.range*pulse,0,Math.PI*2);X.stroke();
    }

    if(t.type==='slow'){
      var iceAlpha=hasTargets?0.12:0.05;
      var grad=X.createRadialGradient(t.x,t.y,5,t.x,t.y,t.range);
      grad.addColorStop(0,'rgba(0,255,255,'+iceAlpha*2+')');
      grad.addColorStop(0.7,'rgba(0,255,255,'+iceAlpha+')');
      grad.addColorStop(1,'rgba(0,255,255,0)');
      X.fillStyle=grad;X.beginPath();X.arc(t.x,t.y,t.range,0,Math.PI*2);X.fill();
      if(hasTargets){
        for(var ic=0;ic<4;ic++){
          var ia=frameCount*0.02+ic*1.5;
          var ir=t.range*0.5+Math.sin(ia*2)*t.range*0.3;
          var ix=t.x+Math.cos(ia)*ir,iy=t.y+Math.sin(ia)*ir;
          X.fillStyle='rgba(0,255,255,0.4)';
          X.fillRect(ix-2,iy-2,4,4);
        }
      }
    }

    if(t.type==='poison'){
      var toxAlpha=hasTargets?0.08:0.03;
      for(var pc=0;pc<3;pc++){
        var pa=frameCount*0.01+pc*2;
        var pr=t.range*(0.3+pc*0.2)+Math.sin(pa*3)*10;
        var px2=t.x+Math.cos(pa)*pr*0.3,py2=t.y+Math.sin(pa)*pr*0.3;
        var cg=X.createRadialGradient(px2,py2,0,px2,py2,t.range*0.4);
        cg.addColorStop(0,'rgba(0,255,102,'+toxAlpha*2+')');
        cg.addColorStop(1,'rgba(0,255,102,0)');
        X.fillStyle=cg;X.beginPath();X.arc(px2,py2,t.range*0.4,0,Math.PI*2);X.fill();
      }
    }

    if(t.type==='sniper'&&hasTargets){
      var la2=t.angle-Math.PI/2;
      var lx=t.x+Math.cos(la2)*t.range*0.9,ly=t.y+Math.sin(la2)*t.range*0.9;
      X.strokeStyle='rgba(255,0,0,0.1)';X.lineWidth=1;X.setLineDash([4,4]);
      X.beginPath();X.moveTo(t.x,t.y);X.lineTo(lx,ly);X.stroke();X.setLineDash([]);
      var dotPulse=0.3+Math.sin(frameCount*0.15)*0.2;
      neonGlow('#ff0000',6,function(){
        X.fillStyle='rgba(255,50,50,'+dotPulse+')';
        X.beginPath();X.arc(lx,ly,3,0,Math.PI*2);X.fill();
      });
    }

    if(t.type==='rapid'&&hasTargets){
      if(frameCount%3===0){
        particles.push({
          x:t.x+(Math.random()-0.5)*6,y:t.y+(Math.random()-0.5)*6,
          vx:(Math.random()-0.5)*2,vy:Math.random()*1.5+0.5,
          life:8,size:1.5,color:'rgba(46,163,242,0.6)'
        });
      }
      X.fillStyle='rgba(46,163,242,0.08)';
      X.beginPath();X.arc(t.x,t.y,12,0,Math.PI*2);X.fill();
    }

    if(t.type==='splash'&&t.fireAnim>0){
      for(var sm=0;sm<2;sm++){
        particles.push({
          x:t.x+(Math.random()-0.5)*8,y:t.y+(Math.random()-0.5)*8,
          vx:(Math.random()-0.5)*2,vy:-Math.random()*2,
          life:12,size:3+Math.random()*3,color:'rgba(255,51,85,0.3)'
        });
      }
    }
  }
}

function drawEnemyBase(e){
  // Shadow
  X.fillStyle='rgba(0,0,0,0.3)';
  X.beginPath();X.ellipse(e.x+1,e.y+e.size*0.7,e.size*0.8,e.size*0.3,0,0,Math.PI*2);X.fill();
  // Slow glow
  if(e.slowTimer>0){X.fillStyle='rgba(0,255,255,0.15)';X.beginPath();X.arc(e.x,e.y,e.size+6,0,Math.PI*2);X.fill();}
  // Poison glow
  if(e.poisonTimer>0){X.fillStyle='rgba(0,255,102,0.12)';X.beginPath();X.arc(e.x,e.y,e.size+4,0,Math.PI*2);X.fill();}
}

function drawEnemyHP(e){
  if(e.hp<e.maxHp){
    var bw=e.size*2.2,hpPct=e.hp/e.maxHp;
    X.fillStyle='rgba(0,0,0,0.6)';X.fillRect(e.x-bw/2,e.y-e.size-10,bw,5);
    X.fillStyle=hpPct>0.5?COL.neonGreen:(hpPct>0.25?COL.gold:COL.neonRed);
    X.fillRect(e.x-bw/2,e.y-e.size-10,bw*hpPct,5);
  }
  if(e.shieldHp&&e.shieldHp>0){
    var bw=e.size*2.2,sPct=e.shieldHp/e.maxShield;
    X.fillStyle='rgba(68,136,255,0.4)';X.fillRect(e.x-bw/2,e.y-e.size-15,bw*sPct,3);
  }
}

function drawEnemyLegs(ex,ey,s,wobble,col,thick){
  // Two alternating neon legs
  var lw=thick?2:1;
  var legLen=s*0.8;
  var phase1=Math.sin(wobble)*legLen*0.3;
  var phase2=Math.cos(wobble)*legLen*0.3;
  X.strokeStyle=col;X.lineWidth=lw;X.globalAlpha=0.7;
  // Left leg
  X.beginPath();X.moveTo(ex-s*0.3,ey+s*0.3);X.lineTo(ex-s*0.3+phase1,ey+s*0.3+legLen);X.stroke();
  // Right leg
  X.beginPath();X.moveTo(ex+s*0.3,ey+s*0.3);X.lineTo(ex+s*0.3+phase2,ey+s*0.3+legLen);X.stroke();
  X.globalAlpha=1;
}

function drawEnemies(){
  for(var i=0;i<enemies.length;i++){
    var e=enemies[i];
    var pos=posOnPath(e.t);
    e.x=pos.x;e.y=pos.y;
    e.wobble+=0.08;
    var s=e.size,wb=Math.sin(e.wobble);
    var walkBounce=Math.abs(Math.sin(e.wobble));
    var isFloater=(e.type==='healer'||e.type==='regen');

    // Calculate draw position with bounce
    var drawY=e.y;
    if(isFloater){
      drawY=e.y-2+Math.sin(e.wobble*0.5)*3; // gentle float
    } else {
      drawY=e.y-walkBounce*2; // walk bounce
    }
    var ex=e.x, ey=drawY;

    // Trail particles
    e.trailTimer=(e.trailTimer||0)+1;
    var trailFreq=e.type==='fast'?1:(isMobile?6:3);
    if(e.trailTimer%trailFreq===0 && particles.length<MAX_PARTICLES){
      particles.push({x:e.x,y:e.y,vx:0,vy:0,life:10,size:2,color:e.color,noGravity:true});
    }

    drawEnemyBase(e);

    // Draw legs (not for floaters or runner)
    if(!isFloater && e.type!=='fast'){
      drawEnemyLegs(ex,ey,s,e.wobble,e.color,e.type==='tank'||e.type==='boss');
    }

    if(e.type==='basic'){
      // Scout — Probe Virus: circle outline with scanning eye slit
      neonGlow(COL.neonRed,6,function(){
        X.strokeStyle=COL.neonRed;X.lineWidth=2;
        X.beginPath();X.arc(ex,ey,s,0,Math.PI*2);X.stroke();
      });
      // Scanning eye slit
      var eyeW=s*0.6;
      X.strokeStyle=COL.white;X.lineWidth=1.5;
      X.beginPath();X.moveTo(ex-eyeW,ey);X.lineTo(ex+eyeW,ey);X.stroke();
      // Scanning dot on eye
      var scanX=Math.sin(e.wobble*2)*eyeW*0.8;
      X.fillStyle=COL.neonRed;
      X.beginPath();X.arc(ex+scanX,ey,2,0,Math.PI*2);X.fill();
    }
    else if(e.type==='fast'){
      // Runner — Speed Hack: arrow/chevron in neon orange
      neonGlow('#ff8800',6,function(){
        X.strokeStyle='#ff8800';X.lineWidth=2;
        X.beginPath();
        X.moveTo(ex+s,ey);X.lineTo(ex-s*0.5,ey-s*0.7);X.lineTo(ex-s*0.2,ey);
        X.lineTo(ex-s*0.5,ey+s*0.7);X.closePath();X.stroke();
      });
      // Motion blur afterimage
      X.globalAlpha=0.15;
      X.strokeStyle='#ff8800';X.lineWidth=1;
      X.beginPath();
      X.moveTo(ex+s-6,ey);X.lineTo(ex-s*0.5-6,ey-s*0.7);X.lineTo(ex-s*0.2-6,ey);
      X.lineTo(ex-s*0.5-6,ey+s*0.7);X.closePath();X.stroke();
      X.globalAlpha=1;
    }
    else if(e.type==='tank'){
      // Tank — Firewall Breaker: double-outlined square with circuit lines
      neonGlow('#cc2200',6,function(){
        X.strokeStyle='#cc2200';X.lineWidth=2;
        X.strokeRect(ex-s,ey-s,s*2,s*2);
        X.lineWidth=1;
        X.strokeRect(ex-s*0.7,ey-s*0.7,s*1.4,s*1.4);
      });
      // Circuit lines inside
      X.strokeStyle='rgba(255,51,85,0.3)';X.lineWidth=0.5;
      X.beginPath();X.moveTo(ex-s*0.5,ey-s);X.lineTo(ex-s*0.5,ey+s);X.stroke();
      X.beginPath();X.moveTo(ex+s*0.5,ey-s);X.lineTo(ex+s*0.5,ey+s);X.stroke();
      X.beginPath();X.moveTo(ex-s,ey);X.lineTo(ex+s,ey);X.stroke();
      // Ground sparks on stomp
      if(walkBounce<0.1){
        X.fillStyle=COL.neonRed;X.globalAlpha=0.6;
        X.fillRect(ex-s-2,ey+s,2,2);
        X.fillRect(ex+s,ey+s,2,2);
        X.globalAlpha=1;
      }
    }
    else if(e.type==='healer'){
      // Repair Bot — circle with rotating repair icon, pulsing aura
      neonGlow(COL.neonGreen,6,function(){
        X.strokeStyle=COL.neonGreen;X.lineWidth=1.5;
        X.beginPath();X.arc(ex,ey,s,0,Math.PI*2);X.stroke();
      });
      // Pulsing aura
      var ha=0.15+wb*0.1;
      X.strokeStyle='rgba(0,255,102,'+ha+')';X.lineWidth=1;
      X.beginPath();X.arc(ex,ey,s+5+wb*2,0,Math.PI*2);X.stroke();
      // Rotating repair/wrench icon (simplified as rotating cross)
      X.save();X.translate(ex,ey);X.rotate(e.wobble*0.5);
      X.strokeStyle=COL.white;X.lineWidth=2;
      X.beginPath();X.moveTo(0,-s*0.5);X.lineTo(0,s*0.5);X.stroke();
      X.beginPath();X.moveTo(-s*0.5,0);X.lineTo(s*0.5,0);X.stroke();
      X.restore();
    }
    else if(e.type==='dodge'){
      // Glitch — 5-pointed star in magenta with phase flicker
      var flicker=(frameCount%8<2)?0.3:1;
      X.globalAlpha=flicker;
      neonGlow(COL.magenta,6,function(){
        X.strokeStyle=COL.magenta;X.lineWidth=1.5;
        X.beginPath();
        for(var p=0;p<5;p++){
          var a1=(p/5)*Math.PI*2-Math.PI/2;
          var a2=((p+0.5)/5)*Math.PI*2-Math.PI/2;
          X.lineTo(ex+Math.cos(a1)*s,ey+Math.sin(a1)*s);
          X.lineTo(ex+Math.cos(a2)*s*0.5,ey+Math.sin(a2)*s*0.5);
        }
        X.closePath();X.stroke();
      });
      X.globalAlpha=1;
      // Glitch offset duplicate
      if(frameCount%8<2){
        X.strokeStyle='rgba(255,0,255,0.3)';X.lineWidth=1;
        X.beginPath();
        for(var p=0;p<5;p++){
          var a1=(p/5)*Math.PI*2-Math.PI/2;
          var a2=((p+0.5)/5)*Math.PI*2-Math.PI/2;
          X.lineTo(ex+Math.cos(a1)*s+3,ey+Math.sin(a1)*s-2);
          X.lineTo(ex+Math.cos(a2)*s*0.5+3,ey+Math.sin(a2)*s*0.5-2);
        }
        X.closePath();X.stroke();
      }
    }
    else if(e.type==='shield'){
      // Encrypted — hexagon with rotating encryption ring
      neonGlow('#4488ff',6,function(){
        X.strokeStyle='#4488ff';X.lineWidth=2;
        drawHex(ex,ey,s);
        X.stroke();
      });
      // Rotating encryption ring
      if(e.shieldHp>0){
        X.save();X.translate(ex,ey);X.rotate(e.wobble*0.3);
        X.strokeStyle='rgba(100,180,255,0.4)';X.lineWidth=1;
        drawHex(0,0,s+4);
        X.stroke();
        X.restore();
        // Shield break particles when damaged
      }
      // Inner data pattern
      X.fillStyle='rgba(68,136,255,0.2)';
      X.fillRect(ex-2,ey-2,4,4);
    }
    else if(e.type==='swarm'){
      // Spam Bots — tiny diamond in neon orange, jittery
      var jitX=(Math.random()-0.5)*1.5,jitY=(Math.random()-0.5)*1.5;
      neonGlow('#ff8800',4,function(){
        X.strokeStyle='#ff8800';X.lineWidth=1;
        X.beginPath();X.moveTo(ex+jitX,ey-s);X.lineTo(ex+s+jitX,ey+jitY);
        X.lineTo(ex+jitX,ey+s);X.lineTo(ex-s+jitX,ey+jitY);X.closePath();X.stroke();
      });
      // Pixel trail (drawn via regular trail particles)
    }
    else if(e.type==='regen'){
      // Self-Replicating — circle in teal with heartbeat pulse
      neonGlow('#22ddaa',6,function(){
        X.strokeStyle='#22ddaa';X.lineWidth=1.5;
        X.beginPath();X.arc(ex,ey,s,0,Math.PI*2);X.stroke();
      });
      // Heartbeat expanding ring
      var rp=((frameCount%60)/60)*s*2;
      X.strokeStyle='rgba(34,221,170,'+(1-rp/(s*2))*0.4+')';X.lineWidth=1.5;
      X.beginPath();X.arc(ex,ey,s+rp,0,Math.PI*2);X.stroke();
      // Inner pulse
      var beatScale=1+Math.sin(frameCount*0.15)*0.15;
      X.strokeStyle='rgba(34,221,170,0.3)';X.lineWidth=1;
      X.beginPath();X.arc(ex,ey,s*0.5*beatScale,0,Math.PI*2);X.stroke();
    }
    else if(e.type==='boss'){
      // Master Hacker — large 12-pointed star in magenta/purple
      var ghostAlpha=0.15+Math.sin(frameCount*0.05)*0.05;
      // Ghostly fill
      X.fillStyle='rgba(204,0,204,'+ghostAlpha+')';
      X.beginPath();
      for(var p=0;p<12;p++){
        var a=(p/12)*Math.PI*2;
        var r2=p%2===0?s:s*0.7;
        X.lineTo(ex+Math.cos(a)*r2,ey+Math.sin(a)*r2);
      }
      X.closePath();X.fill();
      // Neon outline
      neonGlow(COL.magenta,10,function(){
        X.strokeStyle=COL.magenta;X.lineWidth=2;
        X.beginPath();
        for(var p=0;p<12;p++){
          var a=(p/12)*Math.PI*2;
          var r2=p%2===0?s:s*0.7;
          X.lineTo(ex+Math.cos(a)*r2,ey+Math.sin(a)*r2);
        }
        X.closePath();X.stroke();
      });
      // "HACK" crown
      X.fillStyle=COL.magenta;X.font='bold 7px Courier New';X.textAlign='center';
      X.fillText('HACK',ex,ey-s-6);
      // Rotating dot aura
      for(var d=0;d<8;d++){
        var da=frameCount*0.03+d*Math.PI/4;
        var dr=s+8;
        X.fillStyle='rgba(170,68,255,0.5)';
        X.beginPath();X.arc(ex+Math.cos(da)*dr,ey+Math.sin(da)*dr,2,0,Math.PI*2);X.fill();
      }
      // Screen shake on heavy stomp
      if(walkBounce<0.05){
        shakeX=(Math.random()-0.5)*4;
        shakeY=(Math.random()-0.5)*4;
      }
    }

    drawEnemyHP(e);
  }
}

function drawBullets(){
  for(var i=0;i<bullets.length;i++){
    var b=bullets[i];
    var isShell=(b.splash&&b.splash>0);
    var isPoison=(b.poison&&b.poison>0);

    // 3-segment neon trail
    for(var seg=2;seg>=0;seg--){
      X.globalAlpha=(3-seg)/6;
      var tx=b.x-b.vx*0.4*seg,ty=b.y-b.vy*0.4*seg;
      var sz=(b.size||3)*(1-seg*0.2);
      X.fillStyle=b.color;
      X.fillRect(tx-sz/2,ty-sz/2,sz,sz);
    }
    X.globalAlpha=1;

    // Main bullet with glow
    if(!isMobile){
      neonGlow(b.color,8,function(){
        X.fillStyle=b.color;
        X.fillRect(b.x-(b.size||3)/2,b.y-(b.size||3)/2,b.size||3,b.size||3);
      });
    } else {
      X.fillStyle=b.color;
      X.fillRect(b.x-(b.size||3)/2,b.y-(b.size||3)/2,b.size||3,b.size||3);
    }

    // Cannon shells — bright white core
    if(isShell){
      X.fillStyle=COL.white;
      X.beginPath();X.arc(b.x,b.y,b.size*0.4,0,Math.PI*2);X.fill();
    }

    // Poison bullets — green drip trail
    if(isPoison && frameCount%2===0 && particles.length<MAX_PARTICLES){
      particles.push({x:b.x,y:b.y,vx:(Math.random()-0.5),vy:Math.random(),
        life:8,size:1.5,color:COL.neonGreen});
    }
  }

  // Draw lightning arcs (Tesla + Sniper tracers)
  for(var i=0;i<lightningArcs.length;i++){
    var a=lightningArcs[i];
    var col=a.color||COL.purple;
    var alpha=a.life/6;

    // 8 segments, drawn 3 times (bloom, body, white core)
    var segs=8;
    var pts=[{x:a.x1,y:a.y1}];
    for(var s=1;s<segs;s++){
      var t2=s/segs;
      pts.push({
        x:a.x1+(a.x2-a.x1)*t2+(Math.random()-0.5)*25,
        y:a.y1+(a.y2-a.y1)*t2+(Math.random()-0.5)*25
      });
    }
    pts.push({x:a.x2,y:a.y2});

    // Bloom layer
    X.strokeStyle=col;X.lineWidth=6;X.globalAlpha=alpha*0.15;
    X.beginPath();X.moveTo(pts[0].x,pts[0].y);
    for(var s=1;s<pts.length;s++) X.lineTo(pts[s].x,pts[s].y);
    X.stroke();

    // Body layer
    X.strokeStyle=col;X.lineWidth=2;X.globalAlpha=alpha*0.8;
    X.beginPath();X.moveTo(pts[0].x,pts[0].y);
    for(var s=1;s<pts.length;s++) X.lineTo(pts[s].x,pts[s].y);
    X.stroke();

    // White core
    X.strokeStyle=COL.white;X.lineWidth=0.5;X.globalAlpha=alpha;
    X.beginPath();X.moveTo(pts[0].x,pts[0].y);
    for(var s=1;s<pts.length;s++) X.lineTo(pts[s].x,pts[s].y);
    X.stroke();

    X.globalAlpha=1;
  }
}

function drawParticles(){
  // Enforce particle cap
  while(particles.length>MAX_PARTICLES) particles.shift();

  for(var i=particles.length-1;i>=0;i--){
    var p=particles[i];
    p.x+=p.vx;p.y+=p.vy;
    if(!p.noGravity) p.vy+=0.08;
    p.life--;
    if(p.life<=0){particles.splice(i,1);continue;}
    X.globalAlpha=p.life/30;
    X.fillStyle=p.color;

    if(p.ring){
      // Ring particle — expanding circle outline
      X.strokeStyle=p.color;X.lineWidth=1.5;
      X.beginPath();X.arc(p.x,p.y,p.size+((30-p.life)*2),0,Math.PI*2);X.stroke();
    } else {
      // Square particles — digital pixel scatter
      if(!isMobile){
        X.shadowColor=p.color;X.shadowBlur=4;
      }
      X.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);
      if(!isMobile){
        X.shadowColor='transparent';X.shadowBlur=0;
      }
    }
  }
  X.globalAlpha=1;
}

