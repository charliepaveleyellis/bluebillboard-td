// ─── DRAG & DROP TOWER PLACEMENT ─────────────────
var dragging=null; // {type, x, y, valid} — tower being dragged

function distToSegment(px,py,ax,ay,bx,by){
  var dx=bx-ax,dy=by-ay;
  var len2=dx*dx+dy*dy;
  if(len2===0) return Math.sqrt((px-ax)*(px-ax)+(py-ay)*(py-ay));
  var t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/len2));
  var cx=ax+t*dx,cy=ay+t*dy;
  return Math.sqrt((px-cx)*(px-cx)+(py-cy)*(py-cy));
}

function isValidPlacement(px,py){
  if(py<65||py>C.height-90) return false;
  var path=getPath();
  // Check distance to each path segment (not just waypoints)
  for(var i=1;i<path.length;i++){
    if(distToSegment(px,py,path[i-1].x,path[i-1].y,path[i].x,path[i].y)<35) return false;
  }
  for(var i=0;i<towers.length;i++){
    var dx=px-towers[i].x,dy=py-towers[i].y;
    if(Math.sqrt(dx*dx+dy*dy)<35) return false;
  }
  return true;
}

// Pending drop — waiting for confirm
var pendingDrop=null; // {x, y, type}
var dropPopup=document.getElementById('dropPopup');
var dpConfirm=document.getElementById('dpConfirm');
var dpCancel=document.getElementById('dpCancel');

function showDropConfirm(x,y,type){
  var def=TOWER_DEFS[type];
  pendingDrop={x:x,y:y,type:type};
  document.getElementById('dpName').textContent=def.name;
  document.getElementById('dpCost').textContent='Cost: '+def.cost;
  var popLeft=Math.max(10,Math.min(x-55,C.width-130));
  var popTop=y-100;
  if(popTop<60) popTop=y+40;
  dropPopup.style.left=popLeft+'px';
  dropPopup.style.top=popTop+'px';
  dropPopup.style.display='block';
  // Block interactions briefly so the drop touch doesn't hit confirm
  dropPopup.style.pointerEvents='none';
  setTimeout(function(){ dropPopup.style.pointerEvents='auto'; },350);
}

function closeDropConfirm(){ dropPopup.style.display='none'; pendingDrop=null; }

function confirmDrop(){
  if(!pendingDrop) return;
  var px=pendingDrop.x,py=pendingDrop.y,type=pendingDrop.type;
  var def=TOWER_DEFS[type];
  if(coins<def.cost){ closeDropConfirm(); return; }
  coins-=def.cost;
  towers.push({
    x:px,y:py,type:type,level:0,
    range:def.range,rate:def.rate,dmg:def.dmg,
    color:def.color,splash:def.splash||0,slow:def.slow||0,
    poison:def.poison||0,chain:def.chain||0,
    cooldown:0,angle:0,fireAnim:0,
    path:null,multishot:0,pierce:false,armorBreak:false,stun:0,burn:0,burnDmg:0,crit:0,mark:0,spreadPoison:false,splashSlow:0,bonusDmgMark:0,slowDur:0,shatter:0,execute:0,markAll:false,poisonAura:0
  });
  sfxPlace();
  for(var i=0;i<10;i++){
    var a=(i/10)*Math.PI*2;
    particles.push({x:px,y:py,vx:Math.cos(a)*3,vy:Math.sin(a)*3,life:15,size:3,color:def.color});
  }
  closeDropConfirm();
  updateHUD();
}

// Confirm/cancel button events
dpConfirm.addEventListener('touchend',function(e){e.stopPropagation();e.preventDefault();confirmDrop();},{passive:false});
dpConfirm.addEventListener('click',function(e){e.stopPropagation();e.preventDefault();confirmDrop();});
dpCancel.addEventListener('touchend',function(e){e.stopPropagation();e.preventDefault();closeDropConfirm();},{passive:false});
dpCancel.addEventListener('click',function(e){e.stopPropagation();e.preventDefault();closeDropConfirm();});
dropPopup.addEventListener('touchstart',function(e){e.stopPropagation();e.preventDefault();},{passive:false});
dropPopup.addEventListener('click',function(e){e.stopPropagation();});

function dropTower(){
  if(!dragging) return;
  if(dragging.valid && coins>=TOWER_DEFS[dragging.type].cost){
    // Show confirm popup instead of placing immediately
    showDropConfirm(dragging.x,dragging.y,dragging.type);
  }
  dragging=null;
}

// Drag start from tower buttons
var dragTouchId=null; // track which touch finger is dragging

for(var i=0;i<towerBtns.length;i++){
  (function(btn){
    // Touch drag start
    btn.addEventListener('touchstart',function(e){
      e.preventDefault();e.stopPropagation();
      if(!running||gameOver||dragging) return;
      var type=btn.dataset.type;
      var def=TOWER_DEFS[type];
      if(coins<def.cost) return;
      closeUpgrade();
      var t=e.touches[0];
      dragTouchId=t.identifier;
      dragging={type:type,x:t.clientX,y:t.clientY,valid:false};
    },{passive:false});

    // Mouse drag start
    btn.addEventListener('mousedown',function(e){
      e.preventDefault();e.stopPropagation();
      if(!running||gameOver||dragging) return;
      var type=btn.dataset.type;
      var def=TOWER_DEFS[type];
      if(coins<def.cost) return;
      closeUpgrade();
      dragging={type:type,x:e.clientX,y:e.clientY,valid:false};
    });
  })(towerBtns[i]);
}

// Track drag — touch (on window to catch moves everywhere)
window.addEventListener('touchmove',function(e){
  if(!dragging||dragTouchId===null) return;
  e.preventDefault();
  for(var ti=0;ti<e.touches.length;ti++){
    if(e.touches[ti].identifier===dragTouchId){
      dragging.x=e.touches[ti].clientX;
      dragging.y=e.touches[ti].clientY;
      dragging.valid=isValidPlacement(dragging.x,dragging.y);
      break;
    }
  }
},{passive:false});

// Track drag — mouse
window.addEventListener('mousemove',function(e){
  if(!dragging) return;
  dragging.x=e.clientX;
  dragging.y=e.clientY;
  dragging.valid=isValidPlacement(dragging.x,dragging.y);
});

// Drop — touch
window.addEventListener('touchend',function(e){
  if(!dragging||dragTouchId===null) return;
  for(var ti=0;ti<e.changedTouches.length;ti++){
    if(e.changedTouches[ti].identifier===dragTouchId){
      // Update final position from the end touch
      dragging.x=e.changedTouches[ti].clientX;
      dragging.y=e.changedTouches[ti].clientY;
      dragging.valid=isValidPlacement(dragging.x,dragging.y);
      dropTower();
      dragTouchId=null;
      break;
    }
  }
},{passive:false});

// Drop — mouse
window.addEventListener('mouseup',function(e){
  if(!dragging) return;
  dropTower();
});

// Cancel drag if touch is cancelled
window.addEventListener('touchcancel',function(e){
  dragging=null;dragTouchId=null;
});

// Canvas tap — upgrades + cancel pending drop
function handleTap(px,py){
  if(gameOver||dragging) return;
  if(pendingDrop){ closeDropConfirm(); return; }
  closeUpgrade();
  // Find the nearest tower to the tap point
  var bestIdx=-1,bestDist=Infinity;
  for(var i=0;i<towers.length;i++){
    var dx=px-towers[i].x,dy=py-towers[i].y;
    var dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<bestDist){ bestDist=dist; bestIdx=i; }
  }
  // Select it if within 55px of the tap
  if(bestIdx>=0 && bestDist<55){ showUpgrade(bestIdx); return; }
}

C.addEventListener('click',function(e){ if(!running||gameOver)return; handleTap(e.clientX,e.clientY);});
// Use BOTH touchstart and touchend for maximum reliability on mobile
C.addEventListener('touchstart',function(e){
  if(!running||gameOver)return;
  if(dragging) return;
  var t=e.touches[0];
  handleTap(t.clientX,t.clientY);
},{passive:true});
C.addEventListener('touchend',function(e){
  if(!running||gameOver)return;
  if(dragging) return;
  var t=e.changedTouches[0];
  handleTap(t.clientX,t.clientY);
},{passive:true});

