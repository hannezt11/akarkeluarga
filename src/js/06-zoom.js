// ===== Pan & zoom =====
let tx=0,ty=0,sk=1;
function pasangTransform(){ canvas.style.transform=`translate(${tx}px,${ty}px) scale(${sk})`; }
function pasKeLayar(){
  const vp=viewport.getBoundingClientRect();
  sk=Math.min(1,(vp.width-24)/Math.max(contentW,1),(vp.height-130)/Math.max(contentH,1));
  sk=Math.max(sk,0.15);
  tx=(vp.width-contentW*sk)/2;
  ty=70+Math.max(0,(vp.height-130-contentH*sk)/2);
  pasangTransform();
}
function zoomDi(cx,cy,skBaru){
  skBaru=Math.min(2.5,Math.max(0.15,skBaru));
  const r=skBaru/sk;
  tx=cx-(cx-tx)*r; ty=cy-(cy-ty)*r; sk=skBaru;
  pasangTransform();
}

const pointer=new Map();
let tap=null, jarakAwal=0, skAwal=1, geserTerakhir=false, blokirKlikSampai=0;
function titikTengahDua(){
  const [a,b]=[...pointer.values()];
  return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.hypot(a.x-b.x,a.y-b.y)};
}
viewport.addEventListener('pointerdown',e=>{
  const r=viewport.getBoundingClientRect();
  pointer.set(e.pointerId,{x:e.clientX-r.left,y:e.clientY-r.top});
  if(pointer.size===1){ tap={x:e.clientX,y:e.clientY,gerak:false}; geserTerakhir=false; }
  else { geserTerakhir=true; if(tap) tap.gerak=true; const t=titikTengahDua(); jarakAwal=t.d||1; skAwal=sk; }
  tutupFab();
});
viewport.addEventListener('pointermove',e=>{
  if(!pointer.has(e.pointerId)) return;
  const r=viewport.getBoundingClientRect();
  const lama=pointer.get(e.pointerId);
  const baru={x:e.clientX-r.left,y:e.clientY-r.top};
  pointer.set(e.pointerId,baru);
  if(pointer.size===1){
    if(tap && !tap.gerak && Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>8){ tap.gerak=true; geserTerakhir=true; }
    if(tap && tap.gerak){ tx+=baru.x-lama.x; ty+=baru.y-lama.y; pasangTransform(); }
  } else if(pointer.size===2){
    const t=titikTengahDua();
    zoomDi(t.x,t.y,skAwal*(t.d/jarakAwal));
  }
});
function selesaiPointer(e){
  pointer.delete(e.pointerId);
  if(pointer.size===1 && tap){ tap.gerak=true; geserTerakhir=true; } // dari 2 jari ke 1 jari: jangan loncat
  if(pointer.size===0) tap=null;
}
// Modal dibuka dari event 'click' (SESUDAH jari terangkat) supaya ketukan yang sama tidak
// "tembus" ke isi modal yang baru muncul di bawah jari (mis. membuka pilihan Status/Ayah/Ibu).
viewport.addEventListener('click',e=>{
  if(geserTerakhir || Date.now()<blokirKlikSampai || modeGaris) return;
  const n=e.target.closest ? e.target.closest('.node') : null;
  if(n){ if(n.dataset.akar) bukaLatar(n.dataset.id,n.dataset.akar); else bukaKartu(n.dataset.id); }
});
viewport.addEventListener('pointerup',selesaiPointer);
viewport.addEventListener('pointercancel',selesaiPointer);
viewport.addEventListener('wheel',e=>{
  e.preventDefault();
  const r=viewport.getBoundingClientRect();
  zoomDi(e.clientX-r.left,e.clientY-r.top,sk*(e.deltaY<0?1.1:1/1.1));
},{passive:false});
window.addEventListener('resize',()=>{ if(!$('modalOverlay').classList.contains('hidden')) return; pasKeLayar(); });

