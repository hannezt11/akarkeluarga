// ===== Pan & zoom =====
let tx=0,ty=0,sk=1;
function pasangTransform(){ canvas.style.transform=`translate(${tx}px,${ty}px) scale(${sk})`; }
// Tampilan awal: bila seluruh pohon muat dengan ukuran nyaman (>= 0.9x) pas ke layar; bila tidak,
// perbesar ke 0.9x dan pusatkan pada "saya" supaya nama dan umur terbaca. Tombol kedua = lihat semua.
function pasKeLayar(){
  const vp=viewport.getBoundingClientRect();
  const fit=Math.max(0.15,Math.min(1,(vp.width-24)/Math.max(contentW,1),(vp.height-130)/Math.max(contentH,1)));
  const el=canvas.querySelector('.node.aktif');
  if(fit>=0.9||!el){ pasSemua(); return; }
  sk=0.9;
  const cx=parseFloat(el.style.left)+el.offsetWidth/2, cy=parseFloat(el.style.top)+Math.min(el.offsetHeight/2,44);
  tx=vp.width/2-cx*sk; ty=(vp.height+60)/2-cy*sk;
  pasangTransform();
}
function pusatkanKe(id){
  const el=canvas.querySelector('.node[data-id="'+(window.CSS&&CSS.escape?CSS.escape(id):id)+'"]'); if(!el) return false;
  const vp=viewport.getBoundingClientRect();
  sk=Math.max(sk,0.9);
  const cx=parseFloat(el.style.left)+el.offsetWidth/2, cy=parseFloat(el.style.top)+Math.min(el.offsetHeight/2,44);
  tx=vp.width/2-cx*sk; ty=(vp.height+60)/2-cy*sk;
  pasangTransform();
  el.classList.remove('kilat'); void el.offsetWidth; el.classList.add('kilat');
  return true;
}
function pasSemua(){
  const vp=viewport.getBoundingClientRect();
  sk=Math.min(1,(vp.width-24)/Math.max(contentW,1),(vp.height-130)/Math.max(contentH,1));
  sk=Math.max(sk,0.15);
  tx=(vp.width-contentW*sk)/2;
  ty=70+Math.max(0,(vp.height-130-contentH*sk)/2);
  pasangTransform();
}
// ----- Batas pan & zoom -----
// Zoom keluar paling kecil mengikuti ukuran "lihat semua" (sedikit lebih kecil), zoom masuk maksimum 2x.
function batasZoom(){
  const vp=viewport.getBoundingClientRect();
  const fit=Math.min(1,(vp.width-24)/Math.max(contentW,1),(vp.height-130)/Math.max(contentH,1));
  return {min:Math.max(0.1,Math.min(0.6,fit*0.7)),max:2};
}
// Batas geser: minimal sepertiga lebar/tinggi layar harus tetap menampilkan bagian pohon.
function batasPan(){
  const vp=viewport.getBoundingClientRect();
  const kx=vp.width/3, ky=vp.height/3;
  return {minX:kx-contentW*sk, maxX:vp.width-kx, minY:ky-contentH*sk, maxY:vp.height-ky};
}
const jepit=(v,a,b)=>Math.min(b,Math.max(a,v));
function zoomDi(cx,cy,skBaru){
  const bz=batasZoom();
  skBaru=jepit(skBaru,bz.min,bz.max);
  const r=skBaru/sk;
  tx=cx-(cx-tx)*r; ty=cy-(cy-ty)*r; sk=skBaru;
  pasangTransform();
}
// ----- Gerak lanjut (inersia) dan tarik-balik ke dalam batas -----
let vx=0, vy=0, animPan=0, terakhirWaktu=0, bidikan=null;
function hentikanAnimPan(){ if(animPan){ cancelAnimationFrame(animPan); animPan=0; } vx=vy=0; }
function mulaiAnimPan(){
  if(animPan) return;
  terakhirWaktu=performance.now();
  const langkah=t=>{
    const dt=Math.min(40,t-terakhirWaktu); terakhirWaktu=t;
    const b=batasPan();
    const luar=(tx<b.minX||tx>b.maxX||ty<b.minY||ty>b.maxY);
    if(luar){ vx=vy=0;
      const ax=jepit(tx,b.minX,b.maxX), ay=jepit(ty,b.minY,b.maxY);
      tx+=(ax-tx)*0.22; ty+=(ay-ty)*0.22;
      if(Math.abs(ax-tx)<0.4&&Math.abs(ay-ty)<0.4){ tx=ax; ty=ay; pasangTransform(); animPan=0; return; }
    } else {
      const f=Math.pow(0.94,dt/16);
      tx+=vx*dt; ty+=vy*dt; vx*=f; vy*=f;
      if(Math.hypot(vx,vy)<0.02){ pasangTransform(); animPan=0; return; }
    }
    pasangTransform(); animPan=requestAnimationFrame(langkah);
  };
  animPan=requestAnimationFrame(langkah);
}
// Animasi singkat saat pindah tampilan (ketuk dua kali)
function animasiTampilan(fn){
  hentikanAnimPan();
  canvas.style.transition='transform .28s ease';
  fn();
  setTimeout(()=>{ canvas.style.transition=''; },320);
}

const pointer=new Map();
let tap=null, jarakAwal=0, skAwal=1, geserTerakhir=false, blokirKlikSampai=0;
function titikTengahDua(){
  const [a,b]=[...pointer.values()];
  return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.hypot(a.x-b.x,a.y-b.y)};
}
viewport.addEventListener('pointerdown',e=>{
  hentikanAnimPan(); canvas.style.transition='';
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
    if(tap && tap.gerak){
      let dx=baru.x-lama.x, dy=baru.y-lama.y;
      const b=batasPan();
      // melewati batas: ada tahanan seperti karet
      if((tx<=b.minX&&dx<0)||(tx>=b.maxX&&dx>0)) dx*=0.3;
      if((ty<=b.minY&&dy<0)||(ty>=b.maxY&&dy>0)) dy*=0.3;
      tx+=dx; ty+=dy; pasangTransform();
      const w=performance.now(), dtv=Math.max(1,w-(tap.w||w));
      tap.vx=0.8*(tap.vx||0)+0.2*(dx/dtv); tap.vy=0.8*(tap.vy||0)+0.2*(dy/dtv); tap.w=w;
    }
  } else if(pointer.size===2){
    const t=titikTengahDua();
    zoomDi(t.x,t.y,skAwal*(t.d/jarakAwal));
  }
});
function selesaiPointer(e){
  pointer.delete(e.pointerId);
  if(pointer.size===1 && tap){ tap.gerak=true; geserTerakhir=true; tap.vx=tap.vy=0; } // dari 2 jari ke 1 jari: jangan loncat
  if(pointer.size===0){
    if(tap&&tap.gerak){
      const lama=performance.now()-(tap.w||0);
      vx=(lama<80)?(tap.vx||0):0; vy=(lama<80)?(tap.vy||0):0;   // hanya meluncur bila jari masih bergerak saat dilepas
      mulaiAnimPan();
    }
    tap=null;
  }
}
// Modal dibuka dari event 'click' (SESUDAH jari terangkat) supaya ketukan yang sama tidak
// "tembus" ke isi modal yang baru muncul di bawah jari (mis. membuka pilihan Status/Ayah/Ibu).
let ketukTerakhir=null, besarKe='saya';
viewport.addEventListener('click',e=>{
  if(geserTerakhir || Date.now()<blokirKlikSampai) return;
  const n=e.target.closest ? e.target.closest('.node') : null;
  if(modeGaris) return;
  // ketuk dua kali di ruang kosong: perbesar ke "saya", ketuk dua kali lagi: lihat semua
  if(!n){
    const w=Date.now();
    if(ketukTerakhir&&w-ketukTerakhir.w<320&&Math.hypot(e.clientX-ketukTerakhir.x,e.clientY-ketukTerakhir.y)<40){
      ketukTerakhir=null;
      animasiTampilan(()=>{ if(besarKe==='saya'&&canvas.querySelector('.node.aktif')){ pusatkanKe(rootAktif()); besarKe='semua'; } else { pasSemua(); besarKe='saya'; } });
      return;
    }
    ketukTerakhir={w,x:e.clientX,y:e.clientY};
  } else ketukTerakhir=null;
  if(n){ if(n.dataset.akar) bukaLatar(n.dataset.id,n.dataset.akar); else bukaKartu(n.dataset.id); }
  else if(sorotId) hapusSorot();
});
viewport.addEventListener('pointerup',selesaiPointer);
viewport.addEventListener('pointercancel',selesaiPointer);
viewport.addEventListener('wheel',e=>{
  e.preventDefault();
  const r=viewport.getBoundingClientRect();
  zoomDi(e.clientX-r.left,e.clientY-r.top,sk*(e.deltaY<0?1.1:1/1.1));
  mulaiAnimPan();
},{passive:false});
window.addEventListener('resize',()=>{ if(!$('modalOverlay').classList.contains('hidden')) return; pasKeLayar(); });

