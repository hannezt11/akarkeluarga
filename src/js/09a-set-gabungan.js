// ===== Manajer set gabungan =====
function setTerbuka(){ return !$('setOverlay').classList.contains('hidden'); }
function bukaSet(){ isiSet(); $('setOverlay').classList.remove('hidden'); }
function tutupSet(){ $('setOverlay').classList.add('hidden'); simpanData(); perbaruiJudul(); render(true); }
function idSetBaru(){ return 's'+Date.now().toString(36)+Math.random().toString(36).slice(2,4); }
function isiSet(){
  const w=$('setDaftar'), st=$('setSheet').scrollTop; w.innerHTML='';
  const sets=semuaSet();
  if(!sets.length){ const p=document.createElement('p'); p.className='peran-info'; p.textContent='Belum ada set. Ketuk "+ Set baru", lalu centang akar yang mau digabung.'; w.appendChild(p); }
  sets.forEach(s=>{
    const k=document.createElement('div'); k.className='set-kartu'; k.dataset.id=s.id;
    const aktif=(setGabunganAktif()||{}).id===s.id;
    const kep=document.createElement('div'); kep.className='set-kepala'; kep.textContent=s.nama+(aktif?'  • tampil sekarang':''); k.appendChild(kep);
    const n=akarSetAda(s).length;
    if(n<2){ const c=document.createElement('div'); c.className='set-ket'; c.textContent='Centang minimal 2 akar supaya set ini aktif.'; k.appendChild(c); }
    const ak=document.createElement('div'); ak.className='set-akar';
    store.akar.forEach(a=>{
      const lb=document.createElement('label');
      const cb=document.createElement('input'); cb.type='checkbox'; cb.dataset.akar=a.id; cb.checked=s.akar.includes(a.id);
      const dot=document.createElement('span'); dot.className='akar-titik'; dot.style.background=a.warna;
      const tx=document.createElement('span'); tx.textContent=a.nama||'Akar';
      lb.appendChild(cb); lb.appendChild(dot); lb.appendChild(tx); ak.appendChild(lb);
    });
    k.appendChild(ak);
    const ac=document.createElement('div'); ac.className='set-aksi';
    [['lihat','Lihat'],['nama','Ganti nama'],['hapus','Hapus']].forEach(([a,t])=>{ const b=document.createElement('button'); b.type='button'; b.dataset.aksi=a; b.textContent=t; if(a==='hapus') b.className='bahaya'; ac.appendChild(b); });
    k.appendChild(ac); w.appendChild(k);
  });
  $('setSheet').scrollTop=st;
}
$('setDaftar').addEventListener('change',e=>{
  const cb=e.target.closest('input[type=checkbox]'), k=e.target.closest('.set-kartu'); if(!cb||!k) return;
  const s=semuaSet().find(x=>x.id===k.dataset.id); if(!s) return;
  s.akar=s.akar.filter(x=>x!==cb.dataset.akar); if(cb.checked) s.akar.push(cb.dataset.akar);
  simpanData(); isiSet();
});
$('setDaftar').addEventListener('click',async e=>{
  const b=e.target.closest('button[data-aksi]'), k=e.target.closest('.set-kartu'); if(!b||!k) return;
  const s=semuaSet().find(x=>x.id===k.dataset.id); if(!s) return;
  if(b.dataset.aksi==='lihat'){
    const ada=akarSetAda(s);
    if(ada.length<2){ alert('Centang minimal 2 akar di set ini dulu.'); return; }
    store.setAktifId=s.id; simpanData();
    $('setOverlay').classList.add('hidden');
    if(!ada.includes(store.aktifId)) gantiAkar(ada[0]); else { perbaruiJudul(); render(true); }
    if(!jumlahTautanGabung(ada)) alert('Belum ada orang yang ditandai sama di antara akar-akar ini, jadi pohonnya belum tersambung. Buka "Peran saya di tiap akar" di drawer, lalu pilih siapa Anda di tiap akar.');
  } else if(b.dataset.aksi==='nama'){
    $('setOverlay').classList.add('hidden');
    const nm=await mintaNama('Ganti nama set','Nama ini hanya untuk membedakan set gabungan.',s.nama,'Contoh: Keluarga ayah');
    if(nm){ s.nama=nm; simpanData(); }
    isiSet(); $('setOverlay').classList.remove('hidden');
  } else if(b.dataset.aksi==='hapus'){
    $('setOverlay').classList.add('hidden');
    const ya=await konfirmasi('Hapus set "'+s.nama+'"?','Hanya set gabungannya yang dihapus. Akar dan datanya tidak berubah.','Ya, hapus');
    if(ya){ store.setGabung=semuaSet().filter(x=>x.id!==s.id); if(store.setAktifId===s.id) store.setAktifId=null; simpanData(); }
    isiSet(); $('setOverlay').classList.remove('hidden');
  }
});
$('setBaru').addEventListener('click',async()=>{
  $('setOverlay').classList.add('hidden');
  const nm=await mintaNama('Set gabungan baru','Beri nama set ini, misalnya "Keluarga ayah". Setelah itu centang akar yang mau digabung.','Gabungan '+(semuaSet().length+1),'Contoh: Keluarga ayah');
  if(nm){ semuaSet().push({id:idSetBaru(),nama:nm,akar:[store.aktifId]}); simpanData(); }
  isiSet(); $('setOverlay').classList.remove('hidden');
});
$('setTutup').addEventListener('click',tutupSet);
$('setOverlay').addEventListener('click',e=>{ if(e.target===$('setOverlay')) tutupSet(); });
$('btnSetGabung').addEventListener('click',()=>{ tutupFab(); bukaSet(); });
