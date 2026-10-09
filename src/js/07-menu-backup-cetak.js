// ===== Menu FAB =====
function tutupFab(){ tutupDrawer(); }

async function kirimBerkas(isi,namaFile,judulBagikan,dialogTitle,mime){
  const cap=window.Capacitor;
  const plg=cap&&cap.Plugins;
  if(cap&&cap.isNativePlatform&&cap.isNativePlatform()&&plg&&plg.Filesystem&&plg.Share){
    try{
      const r=await plg.Filesystem.writeFile({path:namaFile,data:isi,directory:'CACHE',encoding:'utf8'});
      await plg.Share.share({title:judulBagikan,dialogTitle:dialogTitle,files:[r.uri]});
    }catch(err){
      const m=String((err&&err.message)||err||'');
      if(!/cancel|dismiss/i.test(m)) alert('Gagal membagikan: '+m);
    }
    return;
  }
  const blob=new Blob([isi],{type:mime||'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=namaFile;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function stempelTanggal(){ const t=new Date(); const p=n=>String(n).padStart(2,'0'); return `${t.getFullYear()}${p(t.getMonth()+1)}${p(t.getDate())}`; }
$('btnBackup').addEventListener('click',async()=>{
  tutupFab();
  const isi=JSON.stringify({format:'akar-keluarga',versi:2,aktifId:store.aktifId,gabung:store.gabung||[],pengguna:store.pengguna||null,akar:store.akar},null,1);
  await kirimBerkas(isi,`akar-keluarga-${stempelTanggal()}.json`,'Backup Akar Keluarga','Simpan backup ke...','application/json');
});
$('btnRestore').addEventListener('click',()=>{ tutupFab(); $('inputRestore').value=''; $('inputRestore').click(); });
function normalisasiPeople(people){
  Object.keys(people).forEach(k=>{
    const p=people[k]; if(!p||typeof p!=='object') throw new Error('format');
    p.id=p.id||k; p.idPasangan=p.idPasangan||[]; p.idAyah=p.idAyah||null; p.idIbu=p.idIbu||null; p.foto=p.foto||''; p.nama=p.nama||'';
  });
}
$('inputRestore').addEventListener('change',e=>{
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const d=JSON.parse(r.result);
      if(d&&Array.isArray(d.akar)&&d.akar.length){
        const daftar=d.akar.map((a,i)=>{
          if(!a||!a.data||typeof a.data.people!=='object'||!Object.keys(a.data.people).length) throw new Error('format');
          normalisasiPeople(a.data.people);
          const dataAkar={people:a.data.people}; if(a.data.wilayah&&typeof a.data.wilayah==='object') dataAkar.wilayah=a.data.wilayah; if(a.data.garis&&typeof a.data.garis==='object') dataAkar.garis=a.data.garis; if(a.data.geser&&typeof a.data.geser==='object') dataAkar.geser=a.data.geser;
          return {id:String(a.id||idAkarBaru()),nama:String(a.nama||('Akar '+(i+1))),warna:a.warna||WARNA_AKAR[i%WARNA_AKAR.length],pin:!!a.pin,data:dataAkar,dibuat:a.dibuat||Date.now(),pemilikId:a.pemilikId||'',pemilikNama:a.pemilikNama||'',terkunci:!!a.terkunci,asalId:a.asalId||'',mode:a.mode||'',peran:(a.peran&&typeof a.peran==='object')?a.peran:{}};
        });
        if(!confirm('Semua akar saat ini ('+store.akar.length+') akan diganti dengan isi file backup ('+daftar.length+' akar). Lanjutkan?')) return;
        const lamaPengguna=store.pengguna;
        store={versi:2,aktifId:daftar.some(a=>a.id===d.aktifId)?d.aktifId:daftar[0].id,akar:daftar,gabung:(Array.isArray(d.gabung)?d.gabung.filter(x=>daftar.some(a=>a.id===x)):[]),pengguna:(d.pengguna&&d.pengguna.id&&d.pengguna.nama)?{id:String(d.pengguna.id),nama:String(d.pengguna.nama)}:lamaPengguna};
        if(store.pengguna) store.akar.forEach(a=>{ if(!a.pemilikId&&!a.terkunci){ a.pemilikId=store.pengguna.id; a.pemilikNama=store.pengguna.nama; } });
        data=akarAktif().data;
      } else {
        if(!d||typeof d.people!=='object'||!Object.keys(d.people).length) throw new Error('format');
        normalisasiPeople(d.people);
        if(akarAktif().terkunci){ alert('Akar ini terkunci (hasil impor) dan tidak bisa diganti lewat Restore.'); return; }
        if(!confirm('Data akar "'+akarAktif().nama+'" akan diganti dengan isi file backup. Lanjutkan?')) return;
        const a=akarAktif();
        a.data={people:d.people}; if(d.wilayah&&typeof d.wilayah==='object') a.data.wilayah=d.wilayah; if(d.garis&&typeof d.garis==='object') a.data.garis=d.garis; if(d.geser&&typeof d.geser==='object') a.data.geser=d.geser;
        if(typeof d.namaKeluarga==='string'&&d.namaKeluarga.trim()) a.nama=d.namaKeluarga.trim();
        data=a.data;
      }
      simpanData(); tutupKartu(); perbaruiJudul(); segarkanDaftarAkar(); segarkanPin(); render(true);
    }catch(err){ alert('File backup tidak valid.'); }
  };
  r.readAsText(f);
});
$('btnMulaiBaru').addEventListener('click',async()=>{
  tutupFab();
  const a=akarAktif();
  if(a.terkunci){ alert('Akar ini terkunci (hasil impor). Untuk membuangnya, hapus akar lewat menu titik tiga di daftar akar.'); return; }
  const ya=await konfirmasi('Kosongkan akar "'+a.nama+'"?','Semua orang di akar ini akan dihapus dan akar dimulai lagi dari satu orang kosong. Akar lain tidak terpengaruh. Tindakan ini tidak bisa dibatalkan. Sebaiknya Backup dulu.','Ya, kosongkan');
  if(!ya) return;
  const wilLama=a.data.wilayah;
  a.data={people:{diri:{id:'diri',nama:'',status:'hidup',gender:'m',jalur:'A',foto:'',idAyah:null,idIbu:null,idPasangan:[]}}};
  if(wilLama) a.data.wilayah=wilLama;
  data=a.data;
  simpanData(); segarkanDaftarAkar(); render(true); bukaModal('diri',true);
});
const KERTAS=[['A4',210,297],['A3',297,420],['A2',420,594],['A1',594,841],['A0',841,1189]];
function pilihKertas(w,h){
  const mm=96/25.4;
  const land=w>=h;
  let pilih=null;
  for(const [nama,a,b] of KERTAS){
    const pw=(land?b:a)*mm, ph=(land?a:b)*mm;
    const fit=Math.min(pw/w,ph/h);
    pilih={paper:nama,landscape:land,fit};
    if(fit>=1) break;
  }
  pilih.zoom=Math.min(pilih.fit*0.97,1.4);
  return pilih;
}
function masukModeGaris(){
  if(akarAktif().terkunci){ alert('Akar ini terkunci (hasil impor), garisnya tidak bisa diedit.'); return; }
  tutupFab(); modeGaris=true; $('barGaris').classList.remove('hidden'); render(false);
}
function keluarModeGaris(){ modeGaris=false; $('barGaris').classList.add('hidden'); simpanData(); render(false); }
$('btnEditGaris').addEventListener('click',masukModeGaris);
$('garisSelesai').addEventListener('click',keluarModeGaris);
$('garisReset').addEventListener('click',async()=>{
  if(!data.garis&&!data.geser){ return; }
  const ya=await konfirmasi('Atur ulang tampilan?','Posisi nama dan garis yang sudah kamu geser akan kembali ke susunan otomatis.','Atur ulang');
  if(!ya) return;
  delete data.garis; delete data.geser; simpanData(); render(false);
});
function cetakTerbuka(){ return !$('cetakOverlay').classList.contains('hidden'); }
function tutupCetakDlg(){ $('cetakOverlay').classList.add('hidden'); }
$('btnCetak').addEventListener('click',()=>{
  tutupFab();
  const wadah=$('cetakDaftar'); wadah.innerHTML='';
  store.akar.forEach(a=>{
    const lb=document.createElement('label'); lb.className='pilih-cetak';
    const rb=document.createElement('input'); rb.type='radio'; rb.name='akarCetak'; rb.value=a.id; rb.checked=(a.id===store.aktifId);
    const sp=document.createElement('span');
    const b=document.createElement('b'); b.textContent=a.nama||'Akar';
    const sm=document.createElement('small'); sm.textContent=Object.keys(a.data.people).length+' orang';
    sp.appendChild(b); sp.appendChild(sm); lb.appendChild(rb); lb.appendChild(sp); wadah.appendChild(lb);
  });
  $('cetakOverlay').classList.remove('hidden');
});
$('cetakBatal').addEventListener('click',tutupCetakDlg);
$('cetakOverlay').addEventListener('click',e=>{ if(e.target===$('cetakOverlay')) tutupCetakDlg(); });
$('cetakYa').addEventListener('click',()=>{
  const r=document.querySelector('input[name="akarCetak"]:checked');
  const a=r&&store.akar.find(x=>x.id===r.value);
  tutupCetakDlg(); if(a) cetakAkar(a);
});
// Teks "Gen 1 : n" per generasi (semua orang dihitung, termasuk pasangan); memakai data akar yang sedang dicetak
function barisRingkasGen(){
  const ids=Object.keys(data.people); if(!ids.length) return [];
  let posisi={}; try{ posisi=hitungLayout(); }catch(e){}
  const pid=Object.keys(posisi); const baris=[];
  if(pid.length){
    const genMin=Math.min(...pid.map(id=>posisi[id].gen)), per={};
    pid.forEach(id=>{ const g=posisi[id].gen-genMin+1; per[g]=(per[g]||0)+1; });
    Object.keys(per).map(Number).sort((a,b)=>a-b).forEach(g=>baris.push('Gen '+g+' : '+per[g]));
  }
  const lepas=ids.length-pid.length;
  if(lepas>0) baris.push('Lainnya : '+lepas);
  baris.push('Total : '+ids.length);
  return baris;
}
async function cetakAkar(akar){
  // hanya data akar terpilih: tanpa orang/garis pudar dari akar lain
  let u, ringBaris=[]; const dataAsli=data; data=akar.data;
  try{
    const g=bangunTunggal(akar); let L=null;
    try{ L=susunBlok(g); }catch(e){ console.error('penataan blok gagal, memakai tata letak lama',e); }
    u = L ? gambarPohonBlok($('cetakCanvas'),M_CETAK,L,g) : gambarPohon($('cetakCanvas'),M_CETAK);
    ringBaris=barisRingkasGen();
  } finally { data=dataAsli; }
  const cg=$('cetakGen'); cg.textContent=ringBaris.join('\n'); cg.style.display=ringBaris.length?'block':'none';
  const ringH=ringBaris.length?ringBaris.length*20+18:0;
  $('cetakCanvas').style.width=u.w+'px'; $('cetakCanvas').style.height=u.h+'px';
  const PAD=64;
  const judul=(akar.nama||'').trim();
  const W=Math.max(u.w,1)+2*PAD;
  const fs=Math.max(26,Math.min(56,(W-2*PAD)/(Math.max(judul.length,1)*0.62)));
  const jd=$('cetakJudul');
  jd.textContent=judul; jd.style.display=judul?'block':'none';
  jd.style.fontSize=fs+'px'; jd.style.marginBottom='44px';
  const judulH=judul?Math.ceil(fs*1.25)+44:0;
  const H=Math.max(u.h,1)+2*PAD+judulH+ringH;
  const wrap=$('cetakWrap');
  wrap.style.width=W+'px'; wrap.style.padding=PAD+'px';
  const k=pilihKertas(W,H);
  document.documentElement.style.setProperty('--pzc',k.zoom);
  const cap=window.Capacitor;
  const native=!!(cap&&cap.isNativePlatform&&cap.isNativePlatform());
  if(native){
    const jembatan=cap.Plugins&&cap.Plugins.AkarPrint;
    if(!jembatan){ alert('Cetak gagal: jembatan cetak tidak terdaftar di app ini.'); return; }
    try{ await jembatan.print({name:'Akar Keluarga',paper:k.paper,landscape:k.landscape}); }
    catch(err){ alert('Cetak gagal: '+((err&&err.message)||err)); }
    return;
  }
  window.print();
}


