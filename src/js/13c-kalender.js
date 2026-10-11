// ===== Lahir: saklar Tanggal / Perkiraan umur / Kategori + kalender kustom (tahun > bulan > tanggal) =====
function tglTeks(t){ return formatTglSingkat(t)||''; }
function segarTombolTgl(idBtn,pref){
  const t=bacaTanggal($(pref+'Tgl'),$(pref+'Bln'),$(pref+'Thn'));
  const b=$(idBtn); b.textContent=t?formatTglSingkat(t):'Pilih tanggal'; b.classList.toggle('kosong',!t);
}
function setModeLahir(m){
  $('fLahirMode').value=m;
  document.querySelectorAll('#skLahir button').forEach(b=>b.classList.toggle('on',b.dataset.v===m));
  $('pnlTanggal').style.display=m==='tanggal'?'block':'none';
  $('pnlUmur').style.display=m==='umur'?'block':'none';
  $('pnlKategori').style.display=m==='kategori'?'block':'none';
}
function setKategoriForm(k){
  $('fKategori').value=k||'';
  document.querySelectorAll('#skKategori button').forEach(b=>b.classList.toggle('on',b.dataset.v===k));
}
function isiLahirForm(o){
  const lh=o.lahir;
  const m=(lh&&lh.perkiraan)?'umur':(lh&&lh.tahun)?'tanggal':(o.kategori?'kategori':'tanggal');
  $('fLahirUmur').value=(lh&&lh.perkiraan)?(new Date().getFullYear()-lh.tahun):'';
  setKategoriForm(o.kategori||'');
  segarTombolTgl('fLahirBtn','fLahir'); segarTombolTgl('fWafatBtn','fWafat');
  setModeLahir(m);
}
// Membaca isi form lahir sesuai mode: {lahir, kategori}
function bacaLahirForm(){
  const m=$('fLahirMode').value;
  if(m==='umur'){
    const n=bacaAngka($('fLahirUmur'));
    return {lahir:(n!==null&&n>=0&&n<=130)?{tahun:new Date().getFullYear()-n,perkiraan:true}:null,kategori:null};
  }
  if(m==='kategori') return {lahir:null,kategori:$('fKategori').value||null};
  return {lahir:bacaTanggal($('fLahirTgl'),$('fLahirBln'),$('fLahirThn')),kategori:null};
}
document.querySelectorAll('#skLahir button').forEach(b=>b.addEventListener('click',()=>setModeLahir(b.dataset.v)));
document.querySelectorAll('#skKategori button').forEach(b=>b.addEventListener('click',()=>setKategoriForm($('fKategori').value===b.dataset.v?'':b.dataset.v)));

// --- Kalender ---
let kalHasil=null, kal=null;
function kalTerbuka(){ return !$('kalOverlay').classList.contains('hidden'); }
function tutupKal(hasil){
  $('kalOverlay').classList.add('hidden');
  const r=kalHasil; kalHasil=null; if(r) r(hasil);
}
// Mengembalikan: objek {tahun,bulan?,tanggal?}, {} (hapus), atau undefined (batal)
function bukaKalender(awal,judul){
  return new Promise(res=>{
    kalHasil=res;
    awal=awal||{};
    kal={tahun:awal.tahun||null,bulan:awal.bulan||null,tanggal:awal.tanggal||null,tahap:'tahun'};
    $('kalJudul').textContent=judul||'Pilih tanggal';
    $('kalOverlay').classList.remove('hidden');
    gambarKal();
  });
}
function gambarKal(){
  const k=kal, krum=$('kalKrum'), isi=$('kalIsi'), aksi=$('kalAksi');
  krum.innerHTML=''; isi.innerHTML=''; aksi.innerHTML='';
  const tombolKrum=(teks,tahap,aktif)=>{ const b=document.createElement('button'); b.type='button'; b.textContent=teks; if(aktif) b.className='on'; b.addEventListener('click',()=>{ kal.tahap=tahap; gambarKal(); }); krum.appendChild(b); };
  tombolKrum(k.tahun?String(k.tahun):'Tahun','tahun',k.tahap==='tahun');
  if(k.tahun) tombolKrum(k.bulan?BULAN_SINGKAT[k.bulan-1]:'Bulan','bulan',k.tahap==='bulan');
  if(k.tahun&&k.bulan) tombolKrum(k.tanggal?String(k.tanggal):'Tanggal','hari',k.tahap==='hari');
  const grid=document.createElement('div'); grid.className='kal-grid '+k.tahap; isi.appendChild(grid);
  const sel=(teks,on,fn)=>{ const b=document.createElement('button'); b.type='button'; b.textContent=teks; if(on) b.className='on'; b.addEventListener('click',fn); grid.appendChild(b); return b; };
  if(k.tahap==='tahun'){
    const ini=new Date().getFullYear(); let aktifEl=null;
    for(let y=ini;y>=ini-125;y--){ const b=sel(String(y),y===k.tahun,()=>{ kal.tahun=y; if(kal.tanggal&&kal.bulan&&kal.tanggal>new Date(y,kal.bulan,0).getDate()) kal.tanggal=null; kal.tahap='bulan'; gambarKal(); }); if(y===k.tahun) aktifEl=b; }
    if(aktifEl) setTimeout(()=>{ isi.scrollTop=Math.max(0,aktifEl.offsetTop-isi.clientHeight/2+20); },0);
  } else if(k.tahap==='bulan'){
    BULAN_SINGKAT.forEach((nm,i)=>sel(nm,(i+1)===k.bulan,()=>{ kal.bulan=i+1; kal.tahap='hari'; gambarKal(); }));
  } else {
    const n=new Date(k.tahun,k.bulan,0).getDate();
    for(let d=1;d<=n;d++) sel(String(d),d===k.tanggal,()=>{ tutupKal({tahun:kal.tahun,bulan:kal.bulan,tanggal:d}); });
  }
  const btn=(teks,kls,fn)=>{ const b=document.createElement('button'); b.type='button'; b.textContent=teks; b.className=kls||''; b.addEventListener('click',fn); aksi.appendChild(b); };
  if(k.tahun&&k.tahap!=='tahun'){
    if(k.bulan&&k.tahap==='hari') btn('Simpan bulan & tahun','utama',()=>tutupKal({tahun:kal.tahun,bulan:kal.bulan}));
    btn('Simpan tahun saja','utama',()=>tutupKal({tahun:kal.tahun}));
  }
  btn('Hapus','',()=>tutupKal({}));
  btn('Batal','',()=>tutupKal(undefined));
}
$('kalOverlay').addEventListener('click',e=>{ if(e.target===$('kalOverlay')) tutupKal(undefined); });
async function pilihTanggalForm(pref,idBtn,judul){
  const awal=bacaTanggal($(pref+'Tgl'),$(pref+'Bln'),$(pref+'Thn'));
  const h=await bukaKalender(awal,judul);
  if(h===undefined) return;
  $(pref+'Tgl').value=h.tanggal||''; $(pref+'Bln').value=h.bulan||''; $(pref+'Thn').value=h.tahun||'';
  segarTombolTgl(idBtn,pref);
}
$('fLahirBtn').addEventListener('click',()=>pilihTanggalForm('fLahir','fLahirBtn','Tanggal lahir'));
$('fWafatBtn').addEventListener('click',()=>pilihTanggalForm('fWafat','fWafatBtn','Tanggal wafat'));
