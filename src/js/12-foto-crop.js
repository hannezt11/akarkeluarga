// ===== Crop foto =====
const FOTO_PX=480;
let cropIm=null, cropUrl='', cropS=1, cropMin=1, cropX=0, cropY=0, cropF=300;
const cropPtr=new Map(); let cropJarak=0, cropSAwal=1;
function cropTerbuka(){ return !$('cropOverlay').classList.contains('hidden'); }
function cropTerapkan(){
  const el=$('cropImg');
  el.style.transform=`translate(${cropX}px,${cropY}px) scale(${cropS})`;
  $('cropZoom').value=cropS/cropMin;
}
function cropBatasi(){
  const iw=cropIm.naturalWidth, ih=cropIm.naturalHeight;
  cropS=Math.min(cropMin*5,Math.max(cropMin,cropS));
  cropX=Math.min(0,Math.max(cropF-iw*cropS,cropX));
  cropY=Math.min(0,Math.max(cropF-ih*cropS,cropY));
}
function cropZoomDi(px,py,sBaru){
  const r=Math.min(cropMin*5,Math.max(cropMin,sBaru))/cropS;
  cropX=px-(px-cropX)*r; cropY=py-(py-cropY)*r; cropS*=r;
  cropBatasi(); cropTerapkan();
}
function bukaCrop(file){
  const url=URL.createObjectURL(file);
  const im=new Image();
  im.onload=()=>{
    if(!im.naturalWidth){ URL.revokeObjectURL(url); alert('Foto tidak bisa dibaca.'); return; }
    cropIm=im; cropUrl=url;
    const el=$('cropImg'); el.src=url; el.style.width=im.naturalWidth+'px'; el.style.height=im.naturalHeight+'px';
    $('cropOverlay').classList.remove('hidden');
    cropF=$('cropFrame').clientWidth||300;
    cropMin=cropF/Math.min(im.naturalWidth,im.naturalHeight);
    cropS=cropMin;
    cropX=(cropF-im.naturalWidth*cropS)/2; cropY=(cropF-im.naturalHeight*cropS)/2;
    cropBatasi(); cropTerapkan();
  };
  im.onerror=()=>{ URL.revokeObjectURL(url); alert('Foto tidak bisa dibaca.'); };
  im.src=url;
}
function tutupCrop(){
  $('cropOverlay').classList.add('hidden');
  if(cropUrl){ URL.revokeObjectURL(cropUrl); cropUrl=''; }
  cropIm=null; cropPtr.clear(); $('cropImg').removeAttribute('src');
  $('fFotoFile').value='';
}
$('fFotoFile').addEventListener('change',e=>{ const f=e.target.files[0]; if(f) bukaCrop(f); });
$('btnPilihFoto').addEventListener('click',()=>$('fFotoFile').click());
$('cropBatal').addEventListener('click',tutupCrop);
$('cropPakai').addEventListener('click',()=>{
  if(!cropIm) return;
  const c=document.createElement('canvas'); c.width=FOTO_PX; c.height=FOTO_PX;
  const g=c.getContext('2d'); g.imageSmoothingQuality='high';
  g.drawImage(cropIm,-cropX/cropS,-cropY/cropS,cropF/cropS,cropF/cropS,0,0,FOTO_PX,FOTO_PX);
  fotoTemp=c.toDataURL('image/jpeg',0.8); segarkanFoto(); tutupCrop();
});
$('cropZoom').addEventListener('input',e=>{ if(cropIm) cropZoomDi(cropF/2,cropF/2,cropMin*parseFloat(e.target.value)); });
(function(){
  const fr=$('cropFrame');
  function titik(e){ const r=fr.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; }
  fr.addEventListener('pointerdown',e=>{
    if(!cropIm) return;
    fr.setPointerCapture&&fr.setPointerCapture(e.pointerId);
    cropPtr.set(e.pointerId,titik(e));
    if(cropPtr.size===2){ const [a,b]=[...cropPtr.values()]; cropJarak=Math.hypot(a.x-b.x,a.y-b.y)||1; cropSAwal=cropS; }
  });
  fr.addEventListener('pointermove',e=>{
    if(!cropIm||!cropPtr.has(e.pointerId)) return;
    const lama=cropPtr.get(e.pointerId), baru=titik(e);
    cropPtr.set(e.pointerId,baru);
    if(cropPtr.size===1){ cropX+=baru.x-lama.x; cropY+=baru.y-lama.y; cropBatasi(); cropTerapkan(); }
    else if(cropPtr.size===2){
      const [a,b]=[...cropPtr.values()];
      const d=Math.hypot(a.x-b.x,a.y-b.y)||1;
      cropZoomDi((a.x+b.x)/2,(a.y+b.y)/2,cropSAwal*(d/cropJarak));
    }
  });
  const lepas=e=>{ cropPtr.delete(e.pointerId); };
  fr.addEventListener('pointerup',lepas); fr.addEventListener('pointercancel',lepas);
  fr.addEventListener('wheel',e=>{ if(!cropIm) return; e.preventDefault(); const t=titik(e); cropZoomDi(t.x,t.y,cropS*(e.deltaY<0?1.1:1/1.1)); },{passive:false});
})();

