function bacaTanggal(t,b,y){
  const tahun=bacaAngka(y); if(!tahun) return null;
  const tg=bacaAngka(t), bl=bacaAngka(b);
  const out={tahun};
  if(bl>=1&&bl<=12){ out.bulan=bl; if(tg>=1&&tg<=31) out.tanggal=tg; }
  return out;
}
// Terapkan isi form ke data (dipakai Simpan, dan otomatis sebelum menambah anggota
// supaya ketikan yang belum disimpan tidak hilang).
let samaAwal='';
function isiSama(o){
  const w=$('wrapSama'), sel=$('fSama');
  const lain=store.akar.filter(a=>a.id!==store.aktifId);
  w.style.display=lain.length?'':'none'; sel.innerHTML=''; samaAwal='';
  if(!lain.length) return;
  const k=document.createElement('option'); k.value=''; k.textContent='\u2014 belum ditandai \u2014'; sel.appendChild(k);
  lain.forEach(a=>{
    const g=document.createElement('optgroup'); g.label=a.nama;
    Object.values(a.data.people).sort((x,y)=>String(x.nama||'').localeCompare(String(y.nama||''))).forEach(q=>{
      const op=document.createElement('option'); op.value=a.id+'|'+q.id;
      op.textContent=(q.nama||'Tanpa nama')+((q.lahir&&q.lahir.tahun)?' ('+q.lahir.tahun+')':'');
      g.appendChild(op);
    });
    sel.appendChild(g);
  });
  let nilai='';
  if(o.sama && store.akar.some(a=>a.id===o.sama.a && a.data.people[o.sama.i])) nilai=o.sama.a+'|'+o.sama.i;
  else {
    for(const a of lain){
      const q=Object.values(a.data.people).find(z=>z.sama&&z.sama.a===store.aktifId&&z.sama.i===o.id);
      if(q){ nilai=a.id+'|'+q.id; break; }
    }
  }
  sel.value=nilai; samaAwal=sel.value;
}
function terapkanSama(o){
  if($('wrapSama').style.display==='none') return;
  store.akar.forEach(a=>{
    if(a.id===store.aktifId||a.terkunci) return;
    Object.values(a.data.people).forEach(q=>{ if(q.sama&&q.sama.a===store.aktifId&&q.sama.i===o.id) delete q.sama; });
  });
  const v=$('fSama').value;
  if(v){ const i=v.indexOf('|'); o.sama={a:v.slice(0,i),i:v.slice(i+1)}; } else delete o.sama;
}
function terapkanForm(o){
  o.nama=$('fNama').value.trim();
  o.status=$('fStatus').value;
  const gBaru=$('fGender').value, gLama=genderDari(o);
  o.gender=gBaru;
  if(fotoTemp&&fotoTemp!==o.foto) o.fotoAt=Date.now();
  if(!fotoTemp) delete o.fotoAt;
  o.foto=fotoTemp;
  { const hp=$('fHp').value.trim(), em=$('fEmail').value.trim(); if(hp) o.hp=hp; else delete o.hp; if(em) o.email=em; else delete o.email; }
  simpanAlamat(o);
  terapkanStatusPasangan(o);
  const lh=bacaTanggal($('fLahirTgl'),$('fLahirBln'),$('fLahirThn'));
  if(lh) o.lahir=lh; else delete o.lahir;
  const wf=o.status==='meninggal' ? bacaTanggal($('fWafatTgl'),$('fWafatBln'),$('fWafatThn')) : null;
  if(wf) o.wafat=wf; else delete o.wafat;
  const nomorAnak=bacaAngka($('fAnakKe'));
  if(nomorAnak!==null&&nomorAnak>0) o.anakKe=nomorAnak; else delete o.anakKe;
  const ay=$('fAyah').value||null, ib=$('fIbu').value||null;
  o.idAyah=ay; o.idIbu=(ib&&ib!==ay)?ib:null;
  if(o.idAyah&&o.idIbu) hubungkanPasangan(o.idAyah,o.idIbu);
  terapkanSama(o);
  if(gBaru!==gLama && o.id!==rootAktif()){
    o.jalur=jalurDari(o);
    const dasar=o.jalur+gBaru;
    if(dasar!==o.id) gantiId(o.id,idUnik(dasar));
  }
  idAktif=o.id;
}
$('btnSimpan').addEventListener('click',async()=>{
  const o=data.people[idAktif]; if(!o) return;
  if(!(await terapkanFormLengkap(o))) return;
  simpanData(); tutupModal(); render(false);
});
$('btnHapus').addEventListener('click',()=>{
  const id=idAktif; const o=data.people[id]; if(!o) return;
  if(id===rootAktif()){ alert('Orang utama (titik awal pohon) tidak bisa dihapus.'); return; }
  if(!confirm(`Hapus "${o.nama||'Tanpa nama'}"? Cabang yang hanya tersambung lewat orang ini juga tidak akan tampil lagi.`)) return;
  delete data.people[id];
  Object.values(data.people).forEach(p=>{
    if(p.idAyah===id) p.idAyah=null;
    if(p.idIbu===id) p.idIbu=null;
    p.idPasangan=(p.idPasangan||[]).filter(x=>x!==id);
    if(p.statusPasangan){ delete p.statusPasangan[id]; if(!Object.keys(p.statusPasangan).length) delete p.statusPasangan; }
  });
  simpanData(); tutupModal(); render(false);
});

function orangBaru(id,gender,jalur){
  data.people[id]={id,nama:'',status:'hidup',gender,jalur,foto:'',idAyah:null,idIbu:null,idPasangan:[]};
  return data.people[id];
}
function hubungkanPasangan(a,b){
  const A=data.people[a], B=data.people[b]; if(!A||!B) return;
  A.idPasangan=A.idPasangan||[]; B.idPasangan=B.idPasangan||[];
  if(!A.idPasangan.includes(b)) A.idPasangan.push(b);
  if(!B.idPasangan.includes(a)) B.idPasangan.push(a);
}
function gantiId(lama,baru){
  const o=data.people[lama]; delete data.people[lama]; o.id=baru; data.people[baru]=o;
  store.akar.forEach(ak=>Object.values(ak.data.people).forEach(q=>{ if(q.sama&&q.sama.a===store.aktifId&&q.sama.i===lama) q.sama.i=baru; }));
  Object.values(data.people).forEach(p=>{
    if(p.idAyah===lama) p.idAyah=baru;
    if(p.idIbu===lama) p.idIbu=baru;
    p.idPasangan=(p.idPasangan||[]).map(x=>x===lama?baru:x);
    if(p.statusPasangan&&p.statusPasangan[lama]){ p.statusPasangan[baru]=p.statusPasangan[lama]; delete p.statusPasangan[lama]; }
  });
}
function turunanDari(id){
  const s=new Set();
  (function r(x){ anakDari(x).forEach(a=>{ if(!s.has(a.id)){ s.add(a.id); r(a.id); } }); })(id);
  return s;
}
function isiDaftarPasangan(o){
  const w=$('daftarPasangan'); w.innerHTML='';
  const ps=(o.idPasangan||[]).filter(id=>data.people[id]);
  if(!ps.length){ w.textContent='-'; return; }
  ps.forEach(pid=>{
    const row=document.createElement('div'); row.className='psg-baris';
    const nm=document.createElement('span'); nm.textContent=namaDari(pid)||'Tanpa nama';
    const sel=document.createElement('select'); sel.dataset.id=pid;
    sel.innerHTML='<option value="menikah">Menikah</option><option value="cerai">Cerai</option>';
    sel.value=((o.statusPasangan||{})[pid]==='cerai')?'cerai':'menikah';
    row.appendChild(nm); row.appendChild(sel); w.appendChild(row);
  });
}
function terapkanStatusPasangan(o){
  document.querySelectorAll('#daftarPasangan select').forEach(sel=>{
    const pid=sel.dataset.id, q=data.people[pid]; if(!q) return;
    o.statusPasangan=o.statusPasangan||{}; q.statusPasangan=q.statusPasangan||{};
    if(sel.value==='cerai'){ o.statusPasangan[pid]='cerai'; q.statusPasangan[o.id]='cerai'; }
    else { delete o.statusPasangan[pid]; delete q.statusPasangan[o.id]; }
    if(!Object.keys(o.statusPasangan).length) delete o.statusPasangan;
    if(!Object.keys(q.statusPasangan).length) delete q.statusPasangan;
  });
}
let opsiOrtuAktif=[];
function bangunOpsiOrtu(el,opsi,pilih,idLain){
  el.innerHTML='';
  const kosong=document.createElement('option'); kosong.value=''; kosong.textContent='— belum ada —'; el.appendChild(kosong);
  const buat=p=>{ const op=document.createElement('option'); op.value=p.id; op.textContent=(p.nama||'Tanpa nama')+' ('+p.id+')'; return op; };
  const lain=idLain&&data.people[idLain];
  const psgLain=lain?(lain.idPasangan||[]).filter(id=>opsi.some(p=>p.id===id)):[];
  if(psgLain.length){
    const g1=document.createElement('optgroup'); g1.label='Pasangan '+(lain.nama||'Tanpa nama');
    psgLain.forEach(id=>g1.appendChild(buat(data.people[id])));
    el.appendChild(g1);
    const g2=document.createElement('optgroup'); g2.label='Semua orang';
    opsi.filter(p=>!psgLain.includes(p.id)).forEach(p=>g2.appendChild(buat(p)));
    el.appendChild(g2);
  } else opsi.forEach(p=>el.appendChild(buat(p)));
  el.value=pilih||'';
}
function segarkanOpsiOrtu(){
  const ay=$('fAyah').value, ib=$('fIbu').value;
  bangunOpsiOrtu($('fAyah'),opsiOrtuAktif,ay,ib);
  bangunOpsiOrtu($('fIbu'),opsiOrtuAktif,ib,ay);
}
$('fAyah').addEventListener('change',segarkanOpsiOrtu);
$('fIbu').addEventListener('change',segarkanOpsiOrtu);
function isiPilihanOrtu(o){
  const terlarang=turunanDari(o.id); terlarang.add(o.id);
  opsiOrtuAktif=Object.values(data.people).filter(p=>!terlarang.has(p.id));
  const ay=(o.idAyah&&data.people[o.idAyah])?o.idAyah:'';
  const ib=(o.idIbu&&data.people[o.idIbu])?o.idIbu:'';
  bangunOpsiOrtu($('fAyah'),opsiOrtuAktif,ay,ib);
  bangunOpsiOrtu($('fIbu'),opsiOrtuAktif,ib,ay);
}
function aturTombolOrtu(o){
  const b=document.querySelector('[data-rel="orangtua"]');
  b.textContent=!o.idAyah?'+ ayah':!o.idIbu?'+ ibu':'+ orang tua';
  b.disabled=!!(o.idAyah&&o.idIbu); b.style.opacity=b.disabled?0.4:1;
}

// Tambah anggota tanpa dialog: anggota baru langsung dibuat dengan isian kosong dan
// formnya terbuka (kursor di nama). Jenis kelamin bisa diubah di form (ID ikut menyesuaikan).
document.querySelectorAll('.modal-tambah-tombol button').forEach(btn=>{
  btn.addEventListener('click',async()=>{
    const o=data.people[idAktif]; if(!o) return;
    if(!(await terapkanFormLengkap(o))) return;
    const rel=btn.dataset.rel; let baru=null;

    if(rel==='anak'){
      const ps=(o.idPasangan||[]).filter(id=>data.people[id]);
      const psgId=ps.length?ps[ps.length-1]:null; // pasangan terbaru; bisa diubah lewat pilihan Ayah/Ibu
      const sayaIbu=genderDari(o)==='f';
      const idAyah=sayaIbu ? psgId : o.id;
      const idIbu =sayaIbu ? o.id : psgId;
      const acuan=data.people[idAyah]||data.people[idIbu];
      const jOrtu=jalurDari(acuan);
      const jalur=jOrtu+'.'+nomorAnakBerikutnya(jOrtu);
      baru=orangBaru(idUnik(jalur+'m'),'m',jalur);
      baru.idAyah=idAyah; baru.idIbu=idIbu;
    }
    else if(rel==='pasangan'){
      const g=genderDari(o)==='m'?'f':'m';
      const jalur=jalurDari(o);
      baru=orangBaru(idUnik(jalur+g),g,jalur);
      hubungkanPasangan(o.id,baru.id);
    }
    else if(rel==='orangtua'){
      if(o.idAyah && o.idIbu) return;
      const sebagaiAyah=!o.idAyah;
      const lain=data.people[sebagaiAyah?o.idIbu:o.idAyah]||null;
      const g=sebagaiAyah?'m':'f';
      const jalur=lain ? jalurDari(lain) : hurufKeluargaBerikutnya();
      baru=orangBaru(idUnik(jalur+g),g,jalur);
      if(sebagaiAyah) o.idAyah=baru.id; else o.idIbu=baru.id;
      if(lain) hubungkanPasangan(lain.id,baru.id);
    }

    if(baru){ simpanData(); render(false); bukaModal(baru.id,true); }
  });
});
