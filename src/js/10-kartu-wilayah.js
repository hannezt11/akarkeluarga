// ===== Kartu profil =====
let kartuId=null;
function esc(t){ return String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function tautanOrang(id){ const o=data.people[id]; return o ? `<a href="#" class="tautan" data-id="${esc(id)}">${esc(o.nama||'Tanpa nama')}</a>` : ''; }
function urutLahir(a,b){
  if(a.anakKe>0||b.anakKe>0){ const d=bandingLahir(a,b); if(d) return d; }
  const ya=(a.lahir&&a.lahir.tahun)||9999, yb=(b.lahir&&b.lahir.tahun)||9999;
  return ya-yb || String(a.nama||'').localeCompare(String(b.nama||''));
}
function barisRelasi(label,ids){
  const t=ids.map(tautanOrang).filter(Boolean);
  return t.length ? `<div class="kartu-baris"><b>${label}:</b> ${t.join(', ')}</div>` : '';
}
function teksAlamat(a){
  if(!a) return '';
  return [a.jalan,a.desa,a.kec?('Kec. '+a.kec):'',a.kab,a.prov].filter(Boolean).join(', ');
}
function barisPasangan(o){
  const t=(o.idPasangan||[]).filter(x=>data.people[x]).map(x=>tautanOrang(x)+(((o.statusPasangan||{})[x]==='cerai')?' <span class="ket-cerai">(cerai)</span>':''));
  return t.length?`<div class="kartu-baris"><b>Pasangan:</b> ${t.join(', ')}</div>`:'';
}
function barisAnak(o){
  const semua=anakDari(o.id).sort(urutLahir);
  if(!semua.length) return '';
  const grup=[];
  (o.idPasangan||[]).filter(x=>data.people[x]).forEach(pid=>{
    const a=semua.filter(c=>(c.idAyah===o.id&&c.idIbu===pid)||(c.idIbu===o.id&&c.idAyah===pid));
    if(a.length) grup.push({pid,anak:a});
  });
  const dipakai=new Set(grup.flatMap(g=>g.anak.map(c=>c.id)));
  const sisa=semua.filter(c=>!dipakai.has(c.id));
  if(grup.length<2&&!(grup.length&&sisa.length)) return barisRelasi('Anak',semua.map(c=>c.id));
  let h='';
  grup.forEach(g=>{ h+=barisRelasi('Anak dengan '+esc(namaDari(g.pid)||'pasangan'),g.anak.map(c=>c.id)); });
  if(sisa.length) h+=barisRelasi('Anak lainnya',sisa.map(c=>c.id));
  return h;
}
function bukaKartu(id){
  const o=data.people[id]; if(!o) return;
  kartuId=id;
  const foto=$('kartuFoto'), fotoO=fotoTampilOrang(o);
  if(fotoO){
    foto.className='kartu-foto'; foto.style.backgroundImage=`url("${fotoO}")`; foto.innerHTML='';
  } else {
    foto.className='kartu-foto kosong '+(genderDari(o)==='f'?'f':'m'); foto.style.backgroundImage='';
    foto.innerHTML=`<span class="inisial">${esc(inisial(o.nama))}</span>`;
  }
  const meninggal=o.status==='meninggal';
  foto.insertAdjacentHTML('beforeend',`<span class="kartu-status ${meninggal?'meninggal':'hidup'}"></span><span class="kartu-kode">${esc(o.id)}</span>`);
  const umur=hitungUmur(o);
  const lahir=formatTglSingkat(o.lahir), wafat=formatTglSingkat(o.wafat);
  const sub=[];
  if(umur!==null) sub.push(meninggal?`${umur} tahun (saat wafat)`:`${umur} tahun`);
  let h=`<div class="kartu-nama">${esc(o.nama||'Tanpa nama')}</div>`;
  h+=`<div class="kartu-sub">${esc(sub.join(' \u00b7 '))}</div>`;
  if(lahir) h+=`<div class="kartu-baris"><b>Lahir:</b> ${esc(lahir)}</div>`;
  if(meninggal&&wafat) h+=`<div class="kartu-baris"><b>Wafat:</b> ${esc(wafat)}</div>`;
  const txtAlamat=teksAlamat(o.alamat);
  if(txtAlamat) h+=`<div class="kartu-baris"><b>Alamat:</b> ${esc(txtAlamat)}</div>`;
  h+=barisRelasi('Ayah',[o.idAyah].filter(x=>x&&data.people[x]));
  h+=barisRelasi('Ibu',[o.idIbu].filter(x=>x&&data.people[x]));
  h+=barisPasangan(o);
  h+=barisAnak(o);
  $('kartuInfo').innerHTML=h; $('kartuInfo').scrollTop=0;
  $('kartuEdit').style.display=akarAktif().terkunci?'none':'flex';
  $('kartuOverlay').classList.remove('hidden');
}
function tutupKartu(){ $('kartuOverlay').classList.add('hidden'); kartuId=null; }
function kartuTerbuka(){ return !$('kartuOverlay').classList.contains('hidden'); }
$('kartuOverlay').addEventListener('click',e=>{ if(e.target===$('kartuOverlay')) tutupKartu(); });
$('kartuInfo').addEventListener('click',e=>{
  const t=e.target.closest&&e.target.closest('.tautan');
  if(t){ e.preventDefault(); bukaKartu(t.dataset.id); }
});
$('kartuEdit').addEventListener('click',()=>{ const id=kartuId; tutupKartu(); if(id) bukaModal(id); });

// ===== Tombol Back Android =====
function tanganiBack(){
  if(modeGaris){ keluarModeGaris(); return true; }
  if(cetakTerbuka()){ tutupCetakDlg(); return true; }
  if(peranTerbuka()){ tutupPeran(); return true; }
  if(dlgTerbuka()){ tutupDlg(false); return true; }
  if(sheetTerbuka()){ tutupSheet(); return true; }
  if(cropTerbuka()){ tutupCrop(); return true; }
  if(bagikanTerbuka()){ tutupBagikan(); return true; }
  if(namaTerbuka()){ if(!namaWajib) tutupNamaDlg(null); return true; }
  if(!$('modalOverlay').classList.contains('hidden')){ tutupModal(); return true; }
  if(ringkasanTerbuka()){ tutupRingkasan(); return true; }
  if(kartuTerbuka()){ tutupKartu(); return true; }
  if(drawerTerbuka()){ tutupDrawer(); return true; }
  return false;
}
(function(){
  const cap=window.Capacitor;
  const AppPlg=cap&&cap.isNativePlatform&&cap.isNativePlatform()&&cap.Plugins&&cap.Plugins.App;
  if(AppPlg&&AppPlg.addListener){
    AppPlg.addListener('backButton',()=>{ if(!tanganiBack()&&AppPlg.exitApp) AppPlg.exitApp(); });
  }
})();

// ===== Wilayah Indonesia (diambil online, disimpan di cache) =====
const WIL_URL='https://www.emsifa.com/api-wilayah-indonesia/v2';
const wilMem={};
async function wilAmbil(path){
  if(wilMem[path]) return wilMem[path];
  const kunci='wil:'+path;
  try{ const c=localStorage.getItem(kunci); if(c){ wilMem[path]=JSON.parse(c); return wilMem[path]; } }catch(e){}
  const r=await fetch(`${WIL_URL}/${path}.json`);
  if(!r.ok) throw new Error('HTTP '+r.status);
  const j=await r.json();
  const arr=(Array.isArray(j.data)?j.data:[]).map(x=>({id:String(x.id),name:String(x.name)}));
  if(!arr.length) throw new Error('kosong');
  wilMem[path]=arr;
  try{ localStorage.setItem(kunci,JSON.stringify(arr)); }catch(e){}
  return arr;
}
let wilF={}, wilToken=0, wilUbah=false;
function wilStatus(t){ $('wilStatus').textContent=t||''; }
function isiSel(sel,arr,pilihId,label){
  sel.innerHTML='';
  const o0=document.createElement('option'); o0.value=''; o0.textContent=label; sel.appendChild(o0);
  arr.forEach(x=>{ const o=document.createElement('option'); o.value=x.id; o.textContent=x.name; sel.appendChild(o); });
  sel.value=pilihId||'';
  if(sel.value!==(pilihId||'')) sel.value='';
}
function isiSelTersimpan(sel,id,nama,label){ isiSel(sel,id?[{id,name:nama}]:[],id,label); }
function teksPilihan(sel){ return sel.selectedIndex>0 ? sel.options[sel.selectedIndex].textContent : ''; }
async function muatDaftar(sel,path,pilihId,label){
  const tok=wilToken;
  wilStatus('Memuat data wilayah...');
  try{
    const arr=(await wilAmbil(path)).slice().sort((a,b)=>a.name.localeCompare(b.name,'id'));
    if(tok!==wilToken) return false;
    isiSel(sel,arr,pilihId,label); wilStatus(''); return true;
  }catch(e){
    if(tok!==wilToken) return false;
    wilStatus('Data wilayah tidak bisa dimuat (periksa internet). Alamat bisa ditulis lengkap di kolom Jalan / dusun.');
    return false;
  }
}
async function muatProv(){
  const ok=await muatDaftar($('fProv'),'provinces',wilF.provId,'- pilih provinsi -');
  if(ok&&wilF.provId) await muatKab();
}
async function muatKab(){ if(!wilF.provId) return; await muatDaftar($('fKab'),'regencies/'+wilF.provId,wilF.kabId,'- pilih kabupaten / kota -'); }
async function muatKec(){
  if(!wilF.kabId) return;
  const ok=await muatDaftar($('fKec'),'districts/'+wilF.kabId,wilF.kecId,'- pilih kecamatan -');
  if(ok&&wilF.kecId) await muatDesa();
}
async function muatDesa(){ if(!wilF.kecId) return; await muatDaftar($('fDesa'),'villages/'+wilF.kecId,wilF.desaId,'- pilih desa / kelurahan -'); }
function aturBlokWilayah(){
  const adaKab=!!wilF.kabId;
  $('wilayahInfo').classList.toggle('hidden',!(adaKab&&!wilUbah));
  $('wilayahPilih').classList.toggle('hidden',adaKab&&!wilUbah);
  $('wilayahTeks').textContent=adaKab?('Wilayah: '+[wilF.kab,wilF.prov].filter(Boolean).join(', ')):'';
}
function siapkanAlamat(o){
  wilToken++; wilUbah=false;
  const a=o.alamat||{}, u=data.wilayah||{};
  const dasar=a.kabId?a:u;
  wilF={provId:dasar.provId||'',prov:dasar.prov||'',kabId:dasar.kabId||'',kab:dasar.kab||'',
        kecId:a.kecId||'',kec:a.kec||'',desaId:a.desaId||'',desa:a.desa||''};
  $('fJalan').value=a.jalan||'';
  isiSelTersimpan($('fProv'),wilF.provId,wilF.prov,'- pilih provinsi -');
  isiSelTersimpan($('fKab'),wilF.kabId,wilF.kab,'- pilih kabupaten / kota -');
  isiSelTersimpan($('fKec'),wilF.kecId,wilF.kec,'- pilih kecamatan -');
  isiSelTersimpan($('fDesa'),wilF.desaId,wilF.desa,'- pilih desa / kelurahan -');
  $('fUtama').checked=!data.wilayah;
  wilStatus('');
  aturBlokWilayah();
  if(wilF.kabId) muatKec(); else muatProv();
}
$('btnUbahWilayah').addEventListener('click',()=>{ wilUbah=true; aturBlokWilayah(); $('fUtama').checked=false; muatProv(); });
$('fProv').addEventListener('change',()=>{
  wilF.provId=$('fProv').value; wilF.prov=teksPilihan($('fProv'));
  wilF.kabId=wilF.kab=wilF.kecId=wilF.kec=wilF.desaId=wilF.desa='';
  isiSel($('fKab'),[],'','- pilih kabupaten / kota -'); isiSel($('fKec'),[],'','- pilih kecamatan -'); isiSel($('fDesa'),[],'','- pilih desa / kelurahan -');
  muatKab();
});
$('fKab').addEventListener('change',()=>{
  wilF.kabId=$('fKab').value; wilF.kab=teksPilihan($('fKab'));
  wilF.kecId=wilF.kec=wilF.desaId=wilF.desa='';
  isiSel($('fKec'),[],'','- pilih kecamatan -'); isiSel($('fDesa'),[],'','- pilih desa / kelurahan -');
  muatKec();
});
$('fKec').addEventListener('change',()=>{
  wilF.kecId=$('fKec').value; wilF.kec=teksPilihan($('fKec'));
  wilF.desaId=wilF.desa='';
  isiSel($('fDesa'),[],'','- pilih desa / kelurahan -');
  muatDesa();
});
$('fDesa').addEventListener('change',()=>{ wilF.desaId=$('fDesa').value; wilF.desa=teksPilihan($('fDesa')); });
function simpanAlamat(o){
  const jalan=$('fJalan').value.trim();
  if(wilF.kecId||wilF.desaId||jalan){
    o.alamat={jalan,desaId:wilF.desaId,desa:wilF.desa,kecId:wilF.kecId,kec:wilF.kec,kabId:wilF.kabId,kab:wilF.kab,provId:wilF.provId,prov:wilF.prov};
  } else delete o.alamat;
  if(wilF.kabId && $('fUtama').checked && !$('wilayahPilih').classList.contains('hidden')){
    data.wilayah={provId:wilF.provId,prov:wilF.prov,kabId:wilF.kabId,kab:wilF.kab};
  }
}

