const STORAGE_KEY='akarKeluargaData';
const ROOT_ID='diri';
const NODE_W=108, GEN_H=140, NODE_H=88;   // lebar slot kartu (kartu 88px + celah 20px)
const GAP_CABANG=22;  // jarak ekstra antar cabang keluarga (seperti akar yang menyebar)
const GAP_GEN=56;     // celah dasar antar generasi
const LAJUR_H=12;     // tinggi tiap lajur garis; celah generasi melebar sesuai jumlah lajur
const CX=44; // titik tengah horizontal avatar di dalam kartu .node (lebar 88px)
const $=id=>document.getElementById(id);

function dataContoh(){
  const P=(id,nama,status,gender,jalur,ayah,ibu,psg)=>({id,nama,status,gender,jalur,foto:'',idAyah:ayah,idIbu:ibu,idPasangan:psg});
  const d={};
  [
    P('Am','Kakek (Ayah)','meninggal','m','A',null,null,['Af']),
    P('Af','Nenek (Ayah)','meninggal','f','A',null,null,['Am']),
    P('Bm','Kakek (Ibu)','meninggal','m','B',null,null,['Bf']),
    P('Bf','Nenek (Ibu)','meninggal','f','B',null,null,['Bm']),
    P('A.1m','Ayah','hidup','m','A.1','Am','Af',['B.1f']),
    P('B.1f','Ibu','hidup','f','B.1','Bm','Bf',['A.1m']),
    P('diri','Anda','hidup','m','A.1.1','A.1m','B.1f',[]),
  ].forEach(p=>d[p.id]=p);
  return {people:d};
}

// ===== Penyimpanan: IndexedDB (cadangan: localStorage) =====
const IDB_NAMA='akarKeluarga', IDB_STORE='kv', IDB_KUNCI='store', LS_STORE='akarKeluargaStore';
const WARNA_AKAR=['#3c5b45','#2f6f8f','#9a5a3c','#7a4f8f','#a97d34','#b0494f','#4a6f9e','#5f7f3d'];
const MAKS_PIN=5;
function idbBuka(){
  return new Promise((res,rej)=>{
    if(!window.indexedDB){ rej(new Error('IndexedDB tidak tersedia')); return; }
    const rq=indexedDB.open(IDB_NAMA,1);
    rq.onupgradeneeded=()=>rq.result.createObjectStore(IDB_STORE);
    rq.onsuccess=()=>res(rq.result);
    rq.onerror=()=>rej(rq.error);
  });
}
function idbBaca(db){ return new Promise((res,rej)=>{ const t=db.transaction(IDB_STORE,'readonly').objectStore(IDB_STORE).get(IDB_KUNCI); t.onsuccess=()=>res(t.result||null); t.onerror=()=>rej(t.error); }); }
function idbTulis(db,nilai){ return new Promise((res,rej)=>{ const tx=db.transaction(IDB_STORE,'readwrite'); tx.objectStore(IDB_STORE).put(nilai,IDB_KUNCI); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); tx.onabort=()=>rej(tx.error); }); }
function buatAkar(id,nama,warna,dataAkar,pin){ return {id,nama,warna,pin:!!pin,data:dataAkar,dibuat:Date.now()}; }
function idAkarBaru(){ return 'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,5); }
function storeValid(st){ return st&&Array.isArray(st.akar)&&st.akar.length&&st.akar.every(a=>a&&a.data&&a.data.people&&typeof a.data.people==='object'&&Object.keys(a.data.people).length); }

let idb=null, store=null, data=null;
try{ idb=await idbBuka(); store=await idbBaca(idb); }catch(e){ idb=null; store=null; }
if(!storeValid(store)){
  store=null;
  if(!idb){ try{ const t=JSON.parse(localStorage.getItem(LS_STORE)||'null'); if(storeValid(t)) store=t; }catch(e){} }
}
if(!store){
  // migrasi dari penyimpanan lama (satu pohon di localStorage); data lama dibiarkan sebagai cadangan
  let lama=null;
  try{ lama=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'); }catch(e){ lama=null; }
  if(!lama||!lama.people||!Object.keys(lama.people).length) lama=dataContoh();
  const nama=(typeof lama.namaKeluarga==='string'&&lama.namaKeluarga.trim())||'Keluarga Saya';
  const dataAkar={people:lama.people}; if(lama.wilayah&&typeof lama.wilayah==='object') dataAkar.wilayah=lama.wilayah;
  store={versi:2,aktifId:'a1',akar:[buatAkar('a1',nama,WARNA_AKAR[0],dataAkar,true)]};
  if(idb){ try{ await idbTulis(idb,store); }catch(e){} }
}
if(!store.akar.some(a=>a.id===store.aktifId)) store.aktifId=store.akar[0].id;
function akarAktif(){ return store.akar.find(a=>a.id===store.aktifId)||store.akar[0]; }
data=akarAktif().data;

let peringatanSimpan=false, peringatanKapasitas=false, tundaSimpan=null;
async function tulisStore(){
  tundaSimpan=null;
  try{
    if(idb){ await idbTulis(idb,store); }
    else{
      const teks=JSON.stringify(store);
      localStorage.setItem(LS_STORE,teks);
      if(teks.length>3800000 && !peringatanKapasitas){ peringatanKapasitas=true; alert('Penyimpanan app hampir penuh ('+(teks.length/1048576).toFixed(1)+' MB dari sekitar 5 MB). Lakukan Backup data sekarang dan kurangi jumlah foto bila perlu.'); }
    }
  }catch(e){ if(!peringatanSimpan){ peringatanSimpan=true; alert('Data tidak bisa disimpan otomatis di perangkat ini (penyimpanan penuh/diblokir). Gunakan Backup data secara berkala.'); } }
}
function simpanData(){ clearTimeout(tundaSimpan); tundaSimpan=setTimeout(tulisStore,250); }
function bilasSimpan(){ if(tundaSimpan){ clearTimeout(tundaSimpan); tulisStore(); } }
window.addEventListener('pagehide',bilasSimpan);
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') bilasSimpan(); });
function anakDari(id){ return Object.values(data.people).filter(p=>p.idAyah===id||p.idIbu===id); }
let urutKetat=false, rootPaksa=null, modeGaris=false, sorotId=null;
function rootAktif(){ if(rootPaksa&&data.people[rootPaksa]) return rootPaksa; return data.people[ROOT_ID] ? ROOT_ID : Object.keys(data.people)[0]; }
function bacaAngka(el){ const n=parseInt(el.value,10); return isNaN(n)?null:n; }

// ===== Skema ID: <jalur><jenisKelamin>, mis. "Am"/"Af" (suami/istri leluhur "A"),
// "A.3m" (anak ke-3 dari A, laki-laki), "A.3.1f" (anak pertama dari A.3, perempuan).
// Jalur mengikuti ayah; kalau ayah tak tercatat, pakai ibu. Jalur disimpan di field `jalur`
// (data lama tanpa field itu memakai id tanpa huruf terakhir). Nomor anak ditetapkan sekali.
function pathDasar(id){ return id.slice(0,-1); }
function jalurDari(o){ return o.jalur!==undefined ? o.jalur : pathDasar(o.id); }
function genderDari(o){ return o.gender || (/[mf]$/.test(o.id) ? o.id.slice(-1) : 'm'); }
function idUnik(dasar){ let id=dasar,k=2; while(data.people[id]) id=dasar+'~'+(k++); return id; }

function hurufKeluargaBerikutnya(){
  const dipakai=new Set();
  Object.values(data.people).forEach(p=>{ const j=jalurDari(p); if(!j.includes('.')) dipakai.add(j); });
  function keHuruf(n){ let s=''; n++; while(n>0){ n--; s=String.fromCharCode(65+(n%26))+s; n=Math.floor(n/26); } return s; }
  let i=0,h; do{ h=keHuruf(i); i++; } while(dipakai.has(h));
  return h;
}
function nomorAnakBerikutnya(pathOrtu){
  const awalan=pathOrtu+'.'; let maks=0;
  Object.values(data.people).forEach(p=>{
    const j=jalurDari(p);
    if(j.startsWith(awalan)){
      const sisa=j.slice(awalan.length);
      if(/^\d+$/.test(sisa)) maks=Math.max(maks, parseInt(sisa,10));
    }
  });
  return maks+1;
}
// Umur: hidup dihitung sampai hari ini; meninggal "berhenti" di umur saat wafat (butuh minimal
// tahun wafat). Tanggal/bulan kosong dianggap 1, jadi umur bisa berupa perkiraan.
function hitungUmur(o){
  const lh=o&&o.lahir; if(!lh||!lh.tahun) return null;
  const lTahun=lh.tahun, lBulan=lh.bulan||1, lTanggal=lh.tanggal||1;
  let aTahun,aBulan,aTanggal;
  if(o.status==='meninggal'){
    const wf=o.wafat; if(!wf||!wf.tahun) return null;
    aTahun=wf.tahun; aBulan=wf.bulan||1; aTanggal=wf.tanggal||1;
  } else {
    const skrg=new Date();
    aTahun=skrg.getFullYear(); aBulan=skrg.getMonth()+1; aTanggal=skrg.getDate();
  }
  let umur=aTahun-lTahun;
  if(aBulan<lBulan || (aBulan===lBulan && aTanggal<lTanggal)) umur--;
  return umur>=0 ? umur : null;
}
function formatTglSingkat(t){
  if(!t||!t.tahun) return '';
  if(t.tanggal&&t.bulan) return `${t.tanggal}/${t.bulan}/${t.tahun}`;
  if(t.bulan) return `${t.bulan}/${t.tahun}`;
  return `${t.tahun}`;
}

// Urutan saudara memakai TANGGAL LAHIR (bukan umur): umur orang meninggal berhenti di saat wafat,
// jadi tidak bisa dipakai untuk membandingkan. Lahir kosong = paling kanan.
function kunciLahir(o){ const l=o&&o.lahir; if(!l||!l.tahun) return null; return l.tahun*10000+(l.bulan||1)*100+(l.tanggal||1); }
function bandingLahir(a,b){
  // Nomor "Anak ke-" (bila diisi) menang atas tanggal lahir; yang bernomor di kiri, yang tak bernomor sesudahnya.
  const na=(a&&a.anakKe>0)?a.anakKe:null, nb=(b&&b.anakKe>0)?b.anakKe:null;
  if(na!==null&&nb!==null){ if(na!==nb) return na-nb; }
  else if(na!==null) return -1;
  else if(nb!==null) return 1;
  const ka=kunciLahir(a), kb=kunciLahir(b);
  if(ka===null&&kb===null) return 0;
  if(ka===null) return 1;
  if(kb===null) return -1;
  return ka-kb;
}

