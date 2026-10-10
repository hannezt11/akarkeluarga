// ===== Drawer =====
function bukaDrawer(){ segarkanDaftarAkar(); $('drawer').classList.add('buka'); $('drawerScrim').classList.remove('hidden'); }
function tutupDrawer(){ $('drawer').classList.remove('buka'); $('drawerScrim').classList.add('hidden'); }
function drawerTerbuka(){ return $('drawer').classList.contains('buka'); }
$('btnMenu').addEventListener('click',bukaDrawer);
$('drawerScrim').addEventListener('click',tutupDrawer);
$('btnPusat').addEventListener('click',pasKeLayar);
$('btnLihatSemua').addEventListener('click',pasSemua);

// ===== Dialog konfirmasi =====
let dlgResolve=null;
function konfirmasi(judul,teks,labelYa){
  return new Promise(res=>{
    $('dlgJudul').textContent=judul; $('dlgTeks').textContent=teks; $('dlgYa').textContent=labelYa||'Ya';
    dlgResolve=res; $('dlgOverlay').classList.remove('hidden');
  });
}
function tutupDlg(hasil){
  $('dlgOverlay').classList.add('hidden');
  const r=dlgResolve; dlgResolve=null; if(r) r(hasil);
}
function dlgTerbuka(){ return !$('dlgOverlay').classList.contains('hidden'); }
$('dlgBatal').addEventListener('click',()=>tutupDlg(false));
$('dlgYa').addEventListener('click',()=>tutupDlg(true));
$('dlgOverlay').addEventListener('click',e=>{ if(e.target===$('dlgOverlay')) tutupDlg(false); });

// ===== Dialog nama (ganti nama / akar baru) =====
let namaResolve=null, namaWajib=false;
function mintaNama(judul,teks,awal,placeholder,wajib){
  return new Promise(res=>{
    namaWajib=!!wajib;
    $('namaJudul').textContent=judul; $('namaTeks').textContent=teks;
    $('fNamaKeluarga').value=awal||''; $('fNamaKeluarga').placeholder=placeholder||'';
    $('namaBatal').style.display=namaWajib?'none':'';
    namaResolve=res; $('namaOverlay').classList.remove('hidden');
    setTimeout(()=>$('fNamaKeluarga').focus(),80);
  });
}
function namaTerbuka(){ return !$('namaOverlay').classList.contains('hidden'); }
function tutupNamaDlg(hasil){
  $('namaOverlay').classList.add('hidden');
  const r=namaResolve; namaResolve=null; if(r) r(hasil===undefined?null:hasil);
}
function kirimNama(){ const v=$('fNamaKeluarga').value.trim(); if(namaWajib&&!v){ $('fNamaKeluarga').focus(); return; } tutupNamaDlg(v); }
$('namaSimpan').addEventListener('click',kirimNama);
$('namaBatal').addEventListener('click',()=>tutupNamaDlg(null));
$('fNamaKeluarga').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); kirimNama(); } });
$('namaOverlay').addEventListener('click',e=>{ if(e.target===$('namaOverlay')&&!namaWajib) tutupNamaDlg(null); });

// ===== Daftar akar, pin, dan menu akar =====
function jumlahOrang(a){ return Object.keys(a.data.people||{}).length; }
const IKON_GEMBOK='<svg class="ikon-gembok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>';
function perbaruiJudul(){ const nl=jumlahLatar(); $('judulApp').textContent=(akarAktif().nama||'Akar Keluarga')+(nl?' (+'+nl+' latar)':''); $('gembokJudul').classList.toggle('hidden',!akarAktif().terkunci); }
function segarkanDaftarAkar(){
  const w=$('daftarAkar'); w.innerHTML='';
  store.akar.forEach(a=>{
    const row=document.createElement('div'); row.className='akar-baris'+(a.id===store.aktifId?' aktif':''); row.dataset.id=a.id;
    row.innerHTML=`<span class="akar-titik" style="background:${esc(a.warna)}"></span><div class="akar-teks"><div class="akar-nama">${a.terkunci?IKON_GEMBOK:''}${esc(a.nama)}</div><div class="akar-sub">${jumlahOrang(a)} orang${a.terkunci?' \u00b7 dari '+esc(a.pemilikNama||'pengirim'):''}${a.pin?' \u00b7 di layar':''}</div></div><button class="akar-menu" data-id="${esc(a.id)}" aria-label="Menu akar">\u22ee</button>`;
    w.appendChild(row);
  });
}
function hurufPin(nama){
  const inti=String(nama||'').replace(/^\s*(keluarga|kel\.?|keturunan)\s+/i,'');
  const m=inti.match(/[A-Za-z\u00C0-\u024F]/)||String(nama||'').match(/[A-Za-z\u00C0-\u024F]/);
  return m?m[0].toUpperCase():'?';
}
function segarkanPin(){
  const w=$('pinAkar'); w.innerHTML='';
  const pins=store.akar.filter(a=>a.pin);
  if(store.akar.length<2||!pins.length) return;
  pins.forEach(a=>{
    const b=document.createElement('button'); b.className='pin'+(a.id===store.aktifId?' aktif':''); b.dataset.id=a.id;
    b.style.background=a.warna; b.title=a.nama; b.textContent=hurufPin(a.nama);
    w.appendChild(b);
  });
}
function gantiAkar(id){
  const a=store.akar.find(x=>x.id===id); if(!a) return;
  tutupKartu(); tutupRingkasan(); sorotId=null; aturChipSorot();
  if(!$('modalOverlay').classList.contains('hidden')) tutupModal();
  if(id!==store.aktifId){
    store.aktifId=id; data=a.data; simpanData();
    perbaruiJudul(); render(true);
  }
  segarkanDaftarAkar(); segarkanPin();
}
$('daftarAkar').addEventListener('click',e=>{
  const m=e.target.closest('.akar-menu');
  if(m){ e.stopPropagation(); bukaMenuAkar(m.dataset.id); return; }
  const row=e.target.closest('.akar-baris'); if(row){ gantiAkar(row.dataset.id); tutupDrawer(); }
});
$('pinAkar').addEventListener('click',e=>{ const b=e.target.closest('.pin'); if(b) gantiAkar(b.dataset.id); });
$('btnAkarBaru').addEventListener('click',async()=>{
  tutupDrawer();
  const nama=await mintaNama('Akar baru','Beri nama akar ini, misalnya "Keluarga Istri". Nama ini juga menjadi judul saat dicetak.','','Contoh: Keluarga Istri');
  if(!nama) return;
  const pakai=new Set(store.akar.map(a=>a.warna));
  const warna=WARNA_AKAR.find(w=>!pakai.has(w))||WARNA_AKAR[store.akar.length%WARNA_AKAR.length];
  const baru=buatAkar(idAkarBaru(),nama,warna,{people:{diri:{id:'diri',nama:'',status:'hidup',gender:'m',jalur:'A',foto:'',idAyah:null,idIbu:null,idPasangan:[]}}},store.akar.filter(a=>a.pin).length<MAKS_PIN);
  if(store.pengguna){ baru.pemilikId=store.pengguna.id; baru.pemilikNama=store.pengguna.nama; }
  store.akar.push(baru);
  gantiAkar(baru.id); simpanData();
  bukaModal('diri',true);
});
let akarMenuId=null;
function sheetTerbuka(){ return !$('akarMenuOverlay').classList.contains('hidden'); }
function tutupSheet(){ $('akarMenuOverlay').classList.add('hidden'); akarMenuId=null; }
function isiSheet(){
  const a=store.akar.find(x=>x.id===akarMenuId); if(!a) return;
  $('akarMenuJudul').textContent=a.nama;
  $('amBagikan').style.display=a.terkunci?'none':'';
  $('amPin').textContent=a.pin?'Lepas dari layar (pojok kanan atas)':'Pin ke layar (pojok kanan atas)';
  $('amGabung').textContent='Atur set gabungan\u2026';
  const w=$('amWarna'); w.innerHTML='';
  WARNA_AKAR.forEach(c=>{ const b=document.createElement('button'); b.style.background=c; b.dataset.warna=c; b.setAttribute('aria-label','Warna '+c); if(c===a.warna) b.className='pilih'; w.appendChild(b); });
}
function bukaMenuAkar(id){ akarMenuId=id; isiSheet(); $('akarMenuOverlay').classList.remove('hidden'); }
$('akarMenuOverlay').addEventListener('click',e=>{ if(e.target===$('akarMenuOverlay')) tutupSheet(); });
$('amWarna').addEventListener('click',e=>{
  const b=e.target.closest('button'); const a=store.akar.find(x=>x.id===akarMenuId); if(!b||!a) return;
  a.warna=b.dataset.warna; simpanData(); isiSheet(); segarkanDaftarAkar(); segarkanPin();
});
$('amPin').addEventListener('click',()=>{
  const a=store.akar.find(x=>x.id===akarMenuId); if(!a) return;
  if(!a.pin && store.akar.filter(x=>x.pin).length>=MAKS_PIN){ alert('Maksimal '+MAKS_PIN+' akar di layar. Lepas pin akar lain dulu.'); return; }
  a.pin=!a.pin; simpanData(); isiSheet(); segarkanDaftarAkar(); segarkanPin();
});
function peranTerbuka(){ return !$('peranOverlay').classList.contains('hidden'); }
function tutupPeran(){ $('peranOverlay').classList.add('hidden'); simpanData(); perbaruiJudul(); render(true); }
function saranPeran(a){
  const pr=a.peran=a.peran||{}, o=a.data.people[pr.saya]; if(!o) return;
  const isi=(k,v)=>{ if(v&&a.data.people[v]&&!pr[k]) pr[k]=v; };
  isi('ayah',o.idAyah); isi('ibu',o.idIbu);
  const sp=(o.idPasangan||[]).find(x=>a.data.people[x]);
  isi('pasangan',sp);
  const so=sp&&a.data.people[sp];
  if(so){ isi('mertuaAyah',so.idAyah); isi('mertuaIbu',so.idIbu); }
}
function isiPeran(){
  const wadah=$('peranIsi'), st=$('peranSheet').scrollTop; wadah.innerHTML='';
  store.akar.forEach(a=>{
    a.peran=a.peran||{};
    const kotak=document.createElement('div'); kotak.className='peran-akar';
    const jd=document.createElement('div'); jd.className='peran-nama'; jd.textContent=(a.nama||'Akar')+(a.id===store.aktifId?' (dipilih)':''); kotak.appendChild(jd);
    const daftar=Object.values(a.data.people).sort((x,y)=>String(x.nama||'').localeCompare(String(y.nama||'')));
    PERAN.forEach(([rk,label])=>{
      const lb=document.createElement('label'); lb.className='peran-baris'; lb.textContent=label;
      const sel=document.createElement('select'); sel.className='peran-sel';
      const k0=document.createElement('option'); k0.value=''; k0.textContent='\u2014 tidak ada di akar ini \u2014'; sel.appendChild(k0);
      daftar.forEach(q=>{
        const op=document.createElement('option'); op.value=q.id;
        op.textContent=(q.nama||'Tanpa nama')+((q.lahir&&q.lahir.tahun)?' ('+q.lahir.tahun+')':'')+' \u00b7 '+q.id;
        sel.appendChild(op);
      });
      sel.value=(a.peran[rk]&&a.data.people[a.peran[rk]])?a.peran[rk]:'';
      sel.addEventListener('change',()=>{
        if(sel.value) a.peran[rk]=sel.value; else delete a.peran[rk];
        if(rk==='saya') saranPeran(a);
        simpanData(); isiPeran();
      });
      lb.appendChild(sel); kotak.appendChild(lb);
    });
    wadah.appendChild(kotak);
  });
  $('peranSheet').scrollTop=st;
}
$('btnPeran').addEventListener('click',()=>{ tutupDrawer(); isiPeran(); $('peranOverlay').classList.remove('hidden'); });
$('peranTutup').addEventListener('click',tutupPeran);
$('peranOverlay').addEventListener('click',e=>{ if(e.target===$('peranOverlay')) tutupPeran(); });
$('amGabung').addEventListener('click',()=>{ tutupSheet(); bukaSet(); });
$('amNama').addEventListener('click',async()=>{
  const a=store.akar.find(x=>x.id===akarMenuId); if(!a) return;
  const id=a.id; tutupSheet();
  const nama=await mintaNama('Ganti nama akar','Nama ini juga menjadi judul saat dicetak.',a.nama,'Nama akar');
  if(!nama) return;
  a.nama=nama; simpanData(); perbaruiJudul(); segarkanDaftarAkar(); segarkanPin();
});
$('amHapus').addEventListener('click',async()=>{
  const a=store.akar.find(x=>x.id===akarMenuId); if(!a) return;
  if(store.akar.length<2){ alert('Akar terakhir tidak bisa dihapus.'); return; }
  tutupSheet();
  const ya=await konfirmasi('Hapus akar "'+a.nama+'"?','Semua orang di akar ini ikut terhapus dan tidak bisa dikembalikan. Sebaiknya Backup dulu.','Ya, hapus');
  if(!ya) return;
  const aktifDihapus=a.id===store.aktifId;
  store.akar=store.akar.filter(x=>x.id!==a.id);
  store.setGabung=semuaSet().map(x=>Object.assign({},x,{akar:x.akar.filter(i=>i!==a.id)})).filter(x=>x.akar.length>1);
  if(aktifDihapus){ store.aktifId=store.akar[0].id; data=store.akar[0].data; perbaruiJudul(); render(true); }
  simpanData(); segarkanDaftarAkar(); segarkanPin();
});
perbaruiJudul(); segarkanDaftarAkar(); segarkanPin();

