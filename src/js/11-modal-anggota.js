// ===== Modal anggota =====
let idAktif=null, fotoTemp='';
function namaDari(id){ const o=data.people[id]; return o ? (o.nama||'Tanpa nama') : null; }
function segarkanFoto(){
  const pv=$('previewFoto'); pv.innerHTML='';
  if(!fotoTemp) return;
  const t=document.createElement('div'); t.className='foto-thumb'; t.style.backgroundImage=`url("${fotoTemp}")`;
  const b=document.createElement('button'); b.type='button'; b.className='btn-kecil'; b.textContent='Hapus foto';
  b.addEventListener('click',e=>{ e.preventDefault(); fotoTemp=''; $('fFotoFile').value=''; segarkanFoto(); });
  pv.appendChild(t); pv.appendChild(b);
}
function bukaModal(id,fokusNama){
  if(akarAktif().terkunci) return;
  const o=data.people[id]; if(!o) return;
  idAktif=id; fotoTemp=o.foto||'';
  $('modalTitle').textContent=o.nama||'Anggota';
  $('fNama').value=o.nama||'';
  $('fStatus').value=o.status==='meninggal'?'meninggal':'hidup';
  $('fGender').value=genderDari(o); segarSaklar();
  $('fAnakKe').value=(o.anakKe>0)?o.anakKe:'';
  $('fFotoFile').value=''; segarkanFoto();
  const lh=o.lahir||{}, wf=o.wafat||{};
  $('fLahirTgl').value=lh.tanggal||''; $('fLahirBln').value=lh.bulan||''; $('fLahirThn').value=lh.tahun||'';
  $('fWafatTgl').value=wf.tanggal||''; $('fWafatBln').value=wf.bulan||''; $('fWafatThn').value=wf.tahun||'';
  aturWafat();
  $('fHp').value=o.hp||''; $('fEmail').value=o.email||'';
  siapkanAlamat(o); aturModeAlamat(o);
  isiPilihanOrtu(o); aturTombolOrtu(o);
  isiDaftarPasangan(o); isiSama(o);
  blokirKlikSampai=Date.now()+600;
  $('modalOverlay').classList.remove('hidden');
  if(fokusNama) setTimeout(()=>$('fNama').focus(),60);
}
function tutupModal(){ $('modalOverlay').classList.add('hidden'); idAktif=null; }
function segarSaklar(){
  [['skStatus','fStatus'],['skGender','fGender']].forEach(([sk,sel])=>{
    document.querySelectorAll('#'+sk+' button').forEach(b=>b.classList.toggle('on',b.dataset.v===$(sel).value));
  });
}
[['skStatus','fStatus'],['skGender','fGender']].forEach(([sk,sel])=>{
  document.querySelectorAll('#'+sk+' button').forEach(b=>b.addEventListener('click',()=>{
    $(sel).value=b.dataset.v; $(sel).dispatchEvent(new Event('change')); segarSaklar();
  }));
});
function aturWafat(){ segarSaklar(); $('wrapWafat').style.display=$('fStatus').value==='meninggal'?'block':'none'; }
$('fStatus').addEventListener('change',aturWafat);
$('btnTutup').addEventListener('click',tutupModal);
$('modalOverlay').addEventListener('click',e=>{ if(e.target===$('modalOverlay')) tutupModal(); });

