// ===== Sinkronisasi data orang yang sama di beberapa akar =====
// Orang "sama" = ditandai lewat "Sama dengan" atau "Peran saya" (gugus yang sama dengan tampilan gabungan).
// Yang disinkronkan hanya data pribadi; hubungan keluarga (ayah, ibu, pasangan, anak ke-, ID, geseran) tetap per akar.
// Akar bergembok (hasil impor) tidak pernah ditimpa.
const UNIT_SINKRON=[
  ['nama','Nama',['nama']],['status','Status',['status','wafat']],['foto','Foto',['foto','fotoAt']],
  ['lahir','Lahir',['lahir']],['alamat','Alamat',['alamat']],['hp','Ponsel',['hp']],['email','Email',['email']]
];
const klon=v=>(v===undefined)?v:JSON.parse(JSON.stringify(v));
function nilaiUnit(o,k){
  if(k==='status') return o.status==='meninggal' ? JSON.stringify({m:1,w:o.wafat||null}) : '';
  const v=o[k]; return (v===undefined||v===null||v===''||v===0) ? '' : JSON.stringify(v);
}
function setUnit(ke,k,dari){
  const ada=!!dari && nilaiUnit(dari,k)!=='';
  if(k==='nama') ke.nama=ada?dari.nama:'';
  else if(k==='status'){ if(ada){ ke.status='meninggal'; if(dari.wafat) ke.wafat=klon(dari.wafat); else delete ke.wafat; } else { ke.status='hidup'; delete ke.wafat; } }
  else if(k==='foto'){ if(ada){ ke.foto=dari.foto; if(dari.fotoAt) ke.fotoAt=dari.fotoAt; else delete ke.fotoAt; } else { ke.foto=''; delete ke.fotoAt; } }
  else { if(ada) ke[k]=klon(dari[k]); else delete ke[k]; }
}
function teksUnit(o,k){
  if(k==='status') return o.status==='meninggal' ? 'wafat'+(o.wafat&&o.wafat.tahun?' '+formatTglSingkat(o.wafat):'') : 'hidup';
  if(k==='lahir') return formatTglSingkat(o.lahir)||'-';
  if(k==='alamat') return teksAlamat(o.alamat)||'-';
  return String(o[k]||'-');
}
function bangunGugusSama(){
  const aktif=akarAktif(), akars=[aktif].concat(store.akar.filter(a=>a!==aktif));
  const induk={}, isi={}, kunci=(aid,pid)=>aid+'|'+pid;
  const cari=k=>{ while(induk[k]!==k){ induk[k]=induk[induk[k]]; k=induk[k]; } return k; };
  akars.forEach(a=>Object.keys(a.data.people).forEach(pid=>{ const k=kunci(a.id,pid); induk[k]=k; isi[k]=new Set([a.id]); }));
  const satukan=(k1,k2)=>{
    if(induk[k1]===undefined||induk[k2]===undefined) return;
    const r1=cari(k1), r2=cari(k2); if(r1===r2) return;
    let bentrok=false; isi[r1].forEach(x=>{ if(isi[r2].has(x)) bentrok=true; });
    if(bentrok) return;
    induk[r2]=r1; isi[r2].forEach(x=>isi[r1].add(x));
  };
  PERAN.forEach(([rk])=>{
    let pertama=null;
    akars.forEach(a=>{ const pid=a.peran&&a.peran[rk]; if(!pid||!a.data.people[pid]) return; const k=kunci(a.id,pid); if(pertama===null) pertama=k; else satukan(pertama,k); });
  });
  akars.forEach(a=>Object.values(a.data.people).forEach(p=>{ const sm=p.sama; if(sm) satukan(kunci(a.id,p.id),kunci(sm.a,sm.i)); }));
  return {induk,cari,kunci};
}
// Salinan orang yang sama di akar lain: [{a:akar, p:orang}]
function kerabatSama(aid,pid){
  const g=bangunGugusSama(), diri=g.kunci(aid,pid); if(g.induk[diri]===undefined) return [];
  const akar=g.cari(diri), hasil=[];
  Object.keys(g.induk).forEach(k=>{
    if(k===diri||g.cari(k)!==akar) return;
    const i=k.indexOf('|'), a=store.akar.find(x=>x.id===k.slice(0,i)), p=a&&a.data.people[k.slice(i+1)];
    if(a&&p) hasil.push({a,p});
  });
  return hasil;
}
// Selaraskan dua salinan (dipakai saat pertama kali ditandai sama). Kolom kosong diisi dari pasangannya;
// bila berbeda isi: foto dipilih yang terbaru, lainnya mengikuti pilihan ('A' = salinan ini, 'B' = salinan lain).
function selaraskanDua(o,q,boleTulisQ,menang){
  let ubahQ=false;
  UNIT_SINKRON.forEach(([k])=>{
    const a=nilaiUnit(o,k), b=nilaiUnit(q,k); if(a===b) return;
    let kePKe=null; // 'q' = o menimpa q, 'o' = q menimpa o
    if(a&&!b) kePKe='q'; else if(!a&&b) kePKe='o';
    else if(k==='foto') kePKe=((q.fotoAt||0)>(o.fotoAt||0))?'o':'q';
    else kePKe=(menang==='B')?'o':'q';
    if(kePKe==='q'){ if(boleTulisQ){ setUnit(q,k,o); ubahQ=true; } } else setUnit(o,k,q);
  });
  return ubahQ;
}
// Sebarkan perubahan yang baru dibuat di form ke semua salinan (hanya kolom yang BERUBAH, supaya kolom
// yang sekadar kosong di sini tidak menghapus isi di akar lain). Mengembalikan jumlah akar yang diperbarui.
function sebarkanSinkron(o,sebelum,akarUbah){
  const aid=store.aktifId, daftar=kerabatSama(aid,o.id).filter(x=>!x.a.terkunci);
  if(!daftar.length) return;
  const unit=UNIT_SINKRON.map(u=>u[0]).filter(k=>nilaiUnit(sebelum,k)!==nilaiUnit(o,k));
  if(!unit.length) return;
  daftar.forEach(x=>unit.forEach(k=>{ if(nilaiUnit(x.p,k)!==nilaiUnit(o,k)){ setUnit(x.p,k,o); akarUbah.add(x.a.id); } }));
}
function potretForm(o){
  const po={nama:$('fNama').value.trim(),status:$('fStatus').value,foto:fotoTemp||''};
  if(fotoTemp) po.fotoAt=(fotoTemp!==o.foto)?Date.now():o.fotoAt;
  const lh=bacaTanggal($('fLahirTgl'),$('fLahirBln'),$('fLahirThn')); if(lh) po.lahir=lh;
  if(po.status==='meninggal'){ const wf=bacaTanggal($('fWafatTgl'),$('fWafatBln'),$('fWafatThn')); if(wf) po.wafat=wf; }
  const hp=$('fHp').value.trim(), em=$('fEmail').value.trim(); if(hp) po.hp=hp; if(em) po.email=em;
  const al=bacaAlamatForm(); if(al) po.alamat=al;
  return po;
}
// Menerapkan isi form + sinkronisasi. Mengembalikan false bila dibatalkan (form tetap terbuka, tidak ada yang berubah).
async function terapkanFormLengkap(o){
  const sebelum=klon(o), awal=samaAwal, kini=$('fSama').value;
  let tautan=null, menang='A';
  if(kini && kini!==awal && $('wrapSama').style.display!=='none'){
    const i=kini.indexOf('|'), ak=store.akar.find(a=>a.id===kini.slice(0,i)), q=ak&&ak.data.people[kini.slice(i+1)];
    if(q){
      tautan={ak,q};
      const po=potretForm(o);
      const beda=UNIT_SINKRON.map(u=>u[0]).filter(k=>k!=='foto'&&nilaiUnit(po,k)&&nilaiUnit(q,k)&&nilaiUnit(po,k)!==nilaiUnit(q,k));
      if(beda.length){
        const label=Object.fromEntries(UNIT_SINKRON.map(u=>[u[0],u[1]]));
        const baris=beda.map(k=>label[k]+': '+teksUnit(po,k)+'  ↔  '+teksUnit(q,k));
        const nm=ak.nama||'akar lain';
        const pil=await pilihSumber('Data berbeda',
          'Orang ini ditandai sama dengan orang di akar "'+nm+'", tetapi isinya berbeda (kiri: akar ini, kanan: "'+nm+'"). Data mana yang dipakai?',
          baris,
          ak.terkunci ? 'Pakai data akar ini (akar "'+nm+'" tidak diubah)' : 'Pakai data akar ini (akar "'+nm+'" ikut berubah)',
          'Pakai data dari "'+nm+'"');
        if(pil===null) return false;
        menang=pil;
      }
    }
  }
  terapkanForm(o);
  const akarUbah=new Set();
  if(tautan && selaraskanDua(o,tautan.q,!tautan.ak.terkunci,menang)) akarUbah.add(tautan.ak.id);
  sebarkanSinkron(o,sebelum,akarUbah);
  // gugus yang lebih besar (salinan lain dari orang yang sama): data akar ini yang dipakai
  if(tautan) kerabatSama(store.aktifId,o.id).forEach(x=>{ if(x.p!==tautan.q && !x.a.terkunci && selaraskanDua(o,x.p,true,'A')) akarUbah.add(x.a.id); });
  if(akarUbah.size) tampilToast('Data ikut diperbarui di '+akarUbah.size+' akar lain');
  return true;
}

// ===== Dialog pilihan sumber data =====
let pilihResolve=null;
function pilihSumber(judul,teks,baris,labelA,labelB){
  return new Promise(res=>{
    $('pilihJudul').textContent=judul; $('pilihTeks').textContent=teks;
    const w=$('pilihDaftar'); w.innerHTML=''; baris.forEach(t=>{ const d=document.createElement('div'); d.textContent=t; w.appendChild(d); });
    $('pilihA').textContent=labelA; $('pilihB').textContent=labelB;
    pilihResolve=res; $('pilihOverlay').classList.remove('hidden');
  });
}
function tutupPilih(h){ $('pilihOverlay').classList.add('hidden'); const r=pilihResolve; pilihResolve=null; if(r) r(h); }
function pilihTerbuka(){ return !$('pilihOverlay').classList.contains('hidden'); }
$('pilihA').addEventListener('click',()=>tutupPilih('A'));
$('pilihB').addEventListener('click',()=>tutupPilih('B'));
$('pilihBatal').addEventListener('click',()=>tutupPilih(null));
$('pilihOverlay').addEventListener('click',e=>{ if(e.target===$('pilihOverlay')) tutupPilih(null); });

// ===== Pesan singkat =====
let toastT=null;
function tampilToast(teks){ const e=$('toast'); e.textContent=teks; e.classList.remove('hidden'); clearTimeout(toastT); toastT=setTimeout(()=>e.classList.add('hidden'),3800); }
