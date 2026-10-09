// ===== Ringkasan generasi =====
function ringkasanTerbuka(){ return !$('ringkasanOverlay').classList.contains('hidden'); }
function tutupRingkasan(){ $('ringkasanOverlay').classList.add('hidden'); }
function bukaRingkasan(){
  const a=akarAktif();
  const posisi=hitungLayout();
  const ids=Object.keys(posisi);
  const genMin=Math.min(...ids.map(id=>posisi[id].gen));
  const perGen={};
  ids.forEach(id=>{ const g=posisi[id].gen-genMin+1; (perGen[g]=perGen[g]||[]).push(data.people[id]); });
  const daftarGen=Object.keys(perGen).map(Number).sort((x,y)=>x-y);
  const maks=Math.max(...daftarGen.map(g=>perGen[g].length));
  const semua=ids.map(id=>data.people[id]);
  const hidup=semua.filter(o=>o.status!=='meninggal').length;
  const laki=semua.filter(o=>genderDari(o)!=='f').length;
  const terlepas=Object.keys(data.people).length-ids.length;
  let h='<div class="rk-judul">Per generasi</div>';
  daftarGen.forEach(g=>{
    const n=perGen[g].length;
    h+=`<div class="rk-gen"><div class="rk-gen-atas"><span>Generasi ${g}${g===1?' (leluhur tertua)':''}</span><b>${n} orang</b></div><div class="rk-bar"><i style="width:${Math.round(n/maks*100)}%"></i></div></div>`;
  });
  h+='<div class="rk-pemisah"></div>';
  h+=`<div class="rk-baris"><span>Total</span><span>${semua.length} orang</span></div>`;
  h+=`<div class="rk-baris"><span>Hidup</span><span>${hidup}</span></div>`;
  h+=`<div class="rk-baris"><span>Meninggal</span><span>${semua.length-hidup}</span></div>`;
  h+=`<div class="rk-baris"><span>Laki-laki</span><span>${laki}</span></div>`;
  h+=`<div class="rk-baris"><span>Perempuan</span><span>${semua.length-laki}</span></div>`;
  h+=`<div class="rk-baris"><span>Jumlah generasi</span><span>${daftarGen.length}</span></div>`;
  if(terlepas>0) h+=`<div class="rk-catatan">${terlepas} orang belum tersambung ke pohon ini, jadi tidak ikut dihitung.</div>`;
  $('rkAkar').textContent=a.nama;
  $('rkIsi').innerHTML=h; $('rkIsi').scrollTop=0;
  $('ringkasanOverlay').classList.remove('hidden');
}
$('btnRingkasan').addEventListener('click',()=>{ tutupFab(); bukaRingkasan(); });
$('ringkasanOverlay').addEventListener('click',e=>{ if(e.target===$('ringkasanOverlay')) tutupRingkasan(); });

// ===== Pengguna, bagikan akar, impor akar =====
function idPenggunaBaru(){ return 'u'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function perbaruiPenggunaTeks(){ $('penggunaTeks').textContent=(store.pengguna&&store.pengguna.nama)||'belum diisi'; }
async function pastikanPengguna(){
  if(store.pengguna&&store.pengguna.nama){ perbaruiPenggunaTeks(); return; }
  const nama=await mintaNama('Siapa nama Anda?','Nama ini terlihat oleh keluarga yang menerima akar yang Anda bagikan. Gunakan nama asli.','','Nama lengkap',true);
  store.pengguna={id:(store.pengguna&&store.pengguna.id)||idPenggunaBaru(),nama};
  store.akar.forEach(a=>{ if(!a.pemilikId&&!a.terkunci){ a.pemilikId=store.pengguna.id; a.pemilikNama=nama; } });
  simpanData(); perbaruiPenggunaTeks(); segarkanDaftarAkar();
}
$('btnPengguna').addEventListener('click',async()=>{
  tutupFab();
  const n=await mintaNama('Nama saya','Nama ini terlihat oleh penerima akar yang Anda bagikan.',(store.pengguna&&store.pengguna.nama)||'','Nama lengkap');
  if(!n) return;
  store.pengguna=store.pengguna||{id:idPenggunaBaru(),nama:n};
  store.pengguna.nama=n;
  store.akar.forEach(a=>{ if(a.pemilikId===store.pengguna.id&&!a.terkunci) a.pemilikNama=n; });
  simpanData(); perbaruiPenggunaTeks();
});

let bagikanId=null;
function bagikanTerbuka(){ return !$('bagikanOverlay').classList.contains('hidden'); }
function tutupBagikan(){ $('bagikanOverlay').classList.add('hidden'); bagikanId=null; }
$('amBagikan').addEventListener('click',()=>{
  const a=store.akar.find(x=>x.id===akarMenuId); if(!a) return;
  bagikanId=a.id; tutupSheet();
  $('bagikanNama').textContent='Akar: '+a.nama;
  document.querySelector('input[name="modeBagikan"][value="dasar"]').checked=true;
  $('bagikanOverlay').classList.remove('hidden');
});
$('bagikanBatal').addEventListener('click',tutupBagikan);
$('bagikanOverlay').addEventListener('click',e=>{ if(e.target===$('bagikanOverlay')) tutupBagikan(); });
function bangunBerkasAkar(akar,mode){
  const people={};
  Object.values(akar.data.people).forEach(o=>{
    const c=JSON.parse(JSON.stringify(o)); delete c.sama;
    if(mode==='dasar'&&c.status!=='meninggal'){
      c.foto=''; delete c.alamat;
      if(c.lahir){ if(c.lahir.tahun) c.lahir={tahun:c.lahir.tahun}; else delete c.lahir; }
    }
    people[c.id]=c;
  });
  const d={people}; if(mode==='lengkap'&&akar.data.wilayah) d.wilayah=akar.data.wilayah; if(akar.data.garis) d.garis=akar.data.garis; if(akar.data.geser) d.geser=akar.data.geser;
  return {format:'akar-keluarga-akar',versi:2,pengirim:{id:store.pengguna.id,nama:store.pengguna.nama},akar:{id:akar.id,nama:akar.nama,warna:akar.warna,mode,diubah:Date.now(),data:d}};
}
$('bagikanYa').addEventListener('click',async()=>{
  const a=store.akar.find(x=>x.id===bagikanId); if(!a) return;
  const mode=document.querySelector('input[name="modeBagikan"]:checked').value;
  tutupBagikan();
  const isi=JSON.stringify(bangunBerkasAkar(a,mode));
  const bersih=a.nama.replace(/[^A-Za-z0-9\u00C0-\u024F]+/g,'-').replace(/^-+|-+$/g,'')||'akar';
  await kirimBerkas(isi,`Akar-${bersih}-${stempelTanggal()}.akar`,'Akar Keluarga: '+a.nama,'Bagikan akar ke...','application/octet-stream');
});

$('btnImpor').addEventListener('click',()=>{ tutupFab(); $('inputImpor').value=''; $('inputImpor').click(); });
$('inputImpor').addEventListener('change',e=>{
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader(); r.onload=()=>imporBerkas(String(r.result)); r.readAsText(f);
});
async function imporBerkas(teks){
  let d;
  try{ d=JSON.parse(teks); }catch(e){ alert('File tidak dikenali. Pastikan ini file akar yang dibagikan dari app Akar Keluarga.'); return; }
  if(d&&(Array.isArray(d.akar)||d.people)){ alert('Ini file Backup, bukan file akar yang dibagikan. Gunakan "Restore data" untuk file ini.'); return; }
  try{
    if(!d||d.format!=='akar-keluarga-akar'||!d.pengirim||!d.pengirim.id||!d.akar||!d.akar.data||typeof d.akar.data.people!=='object'||!Object.keys(d.akar.data.people).length) throw new Error('format');
    normalisasiPeople(d.akar.data.people);
    Object.values(d.akar.data.people).forEach(q=>{ if(q&&typeof q==='object') delete q.sama; });
  }catch(e){ alert('File akar tidak valid.'); return; }
  const dataAkar={people:d.akar.data.people}; if(d.akar.data.wilayah&&typeof d.akar.data.wilayah==='object') dataAkar.wilayah=d.akar.data.wilayah; if(d.akar.data.garis&&typeof d.akar.data.garis==='object') dataAkar.garis=d.akar.data.garis; if(d.akar.data.geser&&typeof d.akar.data.geser==='object') dataAkar.geser=d.akar.data.geser;
  const pengirim=String(d.pengirim.nama||'pengirim');
  const milikSendiri=!!(store.pengguna&&d.pengirim.id===store.pengguna.id);
  if(milikSendiri){
    const ya=await konfirmasi('Akar milik Anda sendiri','File ini berasal dari akar yang dibuat di perangkat Anda. Impor sebagai salinan terpisah yang hanya bisa dilihat?','Ya, impor salinan');
    if(!ya) return;
  } else {
    const ada=store.akar.find(a=>a.terkunci&&a.asalId===String(d.akar.id)&&a.pemilikId===String(d.pengirim.id));
    if(ada){
      const ya=await konfirmasi('Perbarui "'+ada.nama+'"?','Versi baru dari '+pengirim+' akan menggantikan salinan ini. Salinan ini hanya bisa dilihat, jadi tidak ada ubahan lokal yang hilang.','Ya, perbarui');
      if(!ya) return;
      ada.data=dataAkar; ada.mode=String(d.akar.mode||''); ada.pemilikNama=pengirim;
      gantiAkar(ada.id); simpanData(); tutupDrawer();
      alert('Akar "'+ada.nama+'" diperbarui.');
      return;
    }
  }
  const pakai=new Set(store.akar.map(a=>a.warna));
  const warna=WARNA_AKAR.find(w=>!pakai.has(w))||WARNA_AKAR[store.akar.length%WARNA_AKAR.length];
  const nama=pengirim+' \u00b7 '+String(d.akar.nama||'Akar');
  const baru=buatAkar(idAkarBaru(),nama,warna,dataAkar,store.akar.filter(a=>a.pin).length<MAKS_PIN);
  baru.terkunci=true; baru.pemilikId=String(d.pengirim.id); baru.pemilikNama=pengirim; baru.asalId=String(d.akar.id); baru.mode=String(d.akar.mode||'');
  store.akar.push(baru);
  gantiAkar(baru.id); simpanData(); tutupDrawer();
  alert('Akar "'+nama+'" ditambahkan. Akar ini hanya bisa dilihat.');
}
perbaruiPenggunaTeks();

