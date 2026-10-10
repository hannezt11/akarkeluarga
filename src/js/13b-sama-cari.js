// ===== "Sama dengan orang di akar lain": cari nama di semua akar lain, banyak kecocokan (satu per akar) =====
// o.sama = daftar tautan keluar [{a:idAkar,i:idOrang}] (bentuk lama: satu objek, tetap terbaca lewat samaDari).
// Tautan masuk (orang di akar lain yang menunjuk ke orang ini) dan tautan otomatis (Peran saya / tidak langsung)
// ikut ditampilkan, tetapi yang otomatis tidak bisa dilepas dari sini.
let samaAwal='', samaPilih=[];
const kunciSama=x=>x.a+'|'+x.i;
const normCari=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
function akarDari(id){ return store.akar.find(a=>a.id===id); }
function isiSama(o){
  const lain=store.akar.filter(a=>a.id!==store.aktifId);
  $('wrapSama').style.display=lain.length?'':'none';
  samaPilih=[]; samaAwal=''; $('fCariSama').value='';
  if(!lain.length){ renderSama(o); return; }
  const ada=(a,i)=>samaPilih.some(s=>s.a===a&&s.i===i);
  samaDari(o).forEach(x=>{ const ak=akarDari(x.a); if(ak&&ak.id!==store.aktifId&&ak.data.people[x.i]&&!ada(x.a,x.i)) samaPilih.push({a:x.a,i:x.i}); });
  lain.forEach(a=>Object.values(a.data.people).forEach(q=>{
    if(samaDari(q).some(x=>x.a===store.aktifId&&x.i===o.id)&&!ada(a.id,q.id)) samaPilih.push({a:a.id,i:q.id,tetap:!!a.terkunci});
  }));
  kerabatSama(store.aktifId,o.id).forEach(x=>{ if(!ada(x.a.id,x.p.id)) samaPilih.push({a:x.a.id,i:x.p.id,tetap:true,otomatis:true}); });
  samaAwal=samaPilih.map(kunciSama).sort().join(',');
  renderSama(o);
}
function terapkanSama(o){
  if($('wrapSama').style.display==='none') return;
  // lepas tautan balik (dari akar yang tidak bergembok), lalu tulis ulang sebagai tautan keluar dari orang ini
  store.akar.forEach(a=>{
    if(a.id===store.aktifId||a.terkunci) return;
    Object.values(a.data.people).forEach(q=>{
      const l=samaDari(q), sisa=l.filter(x=>!(x.a===store.aktifId&&x.i===o.id));
      if(sisa.length!==l.length) setSama(q,sisa);
    });
  });
  setSama(o,samaPilih.filter(x=>!x.tetap).map(x=>({a:x.a,i:x.i})));
}
function barisSama(a,q,ekstra){
  const d=document.createElement('div'); d.className='sama-baris'+(ekstra&&ekstra.kelas?' '+ekstra.kelas:'');
  const dot=document.createElement('span'); dot.className='akar-titik'; dot.style.background=a.warna;
  const tx=document.createElement('div'); tx.className='sama-teks';
  const n=document.createElement('b'); n.textContent=(q.nama||'Tanpa nama')+((q.lahir&&q.lahir.tahun)?' ('+q.lahir.tahun+')':'');
  const ay=q.idAyah&&a.data.people[q.idAyah], ib=q.idIbu&&a.data.people[q.idIbu];
  const ket=[a.nama||'Akar'];
  if(ay||ib) ket.push('anak dari '+[ay&&(ay.nama||'?'),ib&&(ib.nama||'?')].filter(Boolean).join(' & '));
  if(ekstra&&ekstra.ket) ket.push(ekstra.ket);
  const s=document.createElement('small'); s.textContent=ket.join(' · ');
  tx.appendChild(n); tx.appendChild(s); d.appendChild(dot); d.appendChild(tx);
  return d;
}
function renderSama(o){
  const cocok=$('samaCocok'), hasil=$('samaHasil'); cocok.innerHTML=''; hasil.innerHTML='';
  if($('wrapSama').style.display==='none') return;
  const o0=o||data.people[idAktif];
  const hd=document.createElement('div'); hd.className='sama-judul';
  hd.textContent=samaPilih.length?('Sudah dicocokkan ('+samaPilih.length+')'):'Belum ada yang dicocokkan';
  cocok.appendChild(hd);
  samaPilih.forEach(x=>{
    const a=akarDari(x.a), q=a&&a.data.people[x.i]; if(!q) return;
    const d=barisSama(a,q,{kelas:'cocok',ket:x.otomatis?'otomatis (Peran saya / tersambung)':(x.tetap?'dari akar bergembok':'')});
    if(!x.tetap){
      const b=document.createElement('button'); b.type='button'; b.className='sama-lepas'; b.dataset.lepas=kunciSama(x); b.setAttribute('aria-label','Lepas'); b.textContent='✕'; d.appendChild(b);
    }
    cocok.appendChild(d);
  });
  const q=normCari($('fCariSama').value);
  const sudah=new Set(samaPilih.map(kunciSama));
  const kandidat=[];
  store.akar.forEach(a=>{ if(a.id===store.aktifId) return; Object.values(a.data.people).forEach(p=>{ if(!sudah.has(a.id+'|'+p.id)) kandidat.push({a,p,n:normCari(p.nama)}); }); });
  let daftar, judul='';
  if(q){ daftar=kandidat.filter(k=>k.n.includes(q)||normCari(k.p.id).includes(q)); judul='Hasil pencarian ('+daftar.length+')'; }
  else {
    const nm=normCari(o0&&o0.nama);
    daftar=nm?kandidat.filter(k=>k.n&&k.n===nm):[]; judul=daftar.length?'Saran (nama sama)':'';
    if(!daftar.length){ const h=document.createElement('div'); h.className='sama-hint'; h.textContent='Ketik nama untuk mencari di semua akar lain.'; hasil.appendChild(h); return; }
  }
  daftar.sort((x,y)=>x.n.localeCompare(y.n,'id')); 
  if(!daftar.length){ const h=document.createElement('div'); h.className='sama-hint'; h.textContent='Tidak ada nama yang cocok.'; hasil.appendChild(h); return; }
  const j=document.createElement('div'); j.className='sama-judul'; j.textContent=judul; hasil.appendChild(j);
  const w=document.createElement('div'); w.className='sama-daftar';
  daftar.slice(0,40).forEach(k=>{ const d=barisSama(k.a,k.p); d.dataset.tambah=k.a.id+'|'+k.p.id; d.classList.add('bisa'); w.appendChild(d); });
  hasil.appendChild(w);
  if(daftar.length>40){ const h=document.createElement('div'); h.className='sama-hint'; h.textContent='Menampilkan 40 pertama. Perjelas kata pencarian.'; hasil.appendChild(h); }
}
$('fCariSama').addEventListener('input',()=>renderSama());
$('samaCocok').addEventListener('click',e=>{
  const b=e.target.closest('[data-lepas]'); if(!b) return;
  samaPilih=samaPilih.filter(x=>kunciSama(x)!==b.dataset.lepas); renderSama();
});
$('samaHasil').addEventListener('click',e=>{
  const r=e.target.closest('[data-tambah]'); if(!r) return;
  const v=r.dataset.tambah, i=v.indexOf('|'), aid=v.slice(0,i), pid=v.slice(i+1);
  const tetap=samaPilih.find(x=>x.a===aid&&x.tetap);
  if(tetap){ alert('Akar ini sudah punya kecocokan otomatis untuk orang ini (lewat Peran saya atau akar bergembok). Satu akar hanya boleh satu kecocokan.'); return; }
  samaPilih=samaPilih.filter(x=>x.a!==aid);   // satu kecocokan per akar: yang lama diganti
  samaPilih.push({a:aid,i:pid}); renderSama();
});
