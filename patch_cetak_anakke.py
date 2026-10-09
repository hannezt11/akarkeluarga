import shutil

p = 'www/index.html'
s = open(p, encoding='utf-8').read()
shutil.copyfile(p, p + '.bak2')   # cadangan otomatis

def ganti(lama, baru):
    global s
    assert s.count(lama) == 1, 'tidak ditemukan / ganda (%d): %s' % (s.count(lama), lama[:70])
    s = s.replace(lama, baru)

# =====================================================================
# 1) KOLOM "ANAK KE-" (urutan anak dari pasangan ayah-ibu, menang atas tahun lahir)
# =====================================================================

# ---------- HTML form ----------
ganti(r"""<label>Ibu <select id="fIbu"></select></label>""",
r"""<label>Ibu <select id="fIbu"></select></label>
        <label id="wrapAnakKe">Anak ke- (urutan lahir dari ayah &amp; ibu ini, boleh kosong)
          <input type="number" id="fAnakKe" min="1" max="99" placeholder="Contoh: 1">
        </label>""")

# ---------- isi form saat dibuka ----------
ganti(r"""  $('fGender').value=genderDari(o);
  $('fFotoFile').value=''; segarkanFoto();""",
r"""  $('fGender').value=genderDari(o);
  $('fAnakKe').value=(o.anakKe>0)?o.anakKe:'';
  $('fFotoFile').value=''; segarkanFoto();""")

# ---------- simpan dari form ----------
ganti(r"""  if(wf) o.wafat=wf; else delete o.wafat;
  const ay=$('fAyah').value||null, ib=$('fIbu').value||null;""",
r"""  if(wf) o.wafat=wf; else delete o.wafat;
  const nomorAnak=bacaAngka($('fAnakKe'));
  if(nomorAnak!==null&&nomorAnak>0) o.anakKe=nomorAnak; else delete o.anakKe;
  const ay=$('fAyah').value||null, ib=$('fIbu').value||null;""")

# ---------- aturan urutan: nomor anak menang atas tahun lahir ----------
ganti(r"""function bandingLahir(a,b){
  const ka=kunciLahir(a), kb=kunciLahir(b);""",
r"""function bandingLahir(a,b){
  // Nomor "Anak ke-" (bila diisi) menang atas tanggal lahir; yang bernomor di kiri, yang tak bernomor sesudahnya.
  const na=(a&&a.anakKe>0)?a.anakKe:null, nb=(b&&b.anakKe>0)?b.anakKe:null;
  if(na!==null&&nb!==null){ if(na!==nb) return na-nb; }
  else if(na!==null) return -1;
  else if(nb!==null) return 1;
  const ka=kunciLahir(a), kb=kunciLahir(b);""")

# ---------- daftar anak di kartu profil ikut aturan yang sama ----------
ganti(r"""function urutLahir(a,b){
  const ya=""",
r"""function urutLahir(a,b){
  if(a.anakKe>0||b.anakKe>0){ const d=bandingLahir(a,b); if(d) return d; }
  const ya=""")

# ---------- tampilan gabungan: nomor ikut terbawa ----------
ganti(r"""['nama','foto','lahir','wafat','alamat'].forEach(f=>{ if(!c[f]&&p[f]) c[f]=p[f]; });""",
r"""['nama','foto','lahir','wafat','alamat','anakKe'].forEach(f=>{ if(!c[f]&&p[f]) c[f]=p[f]; });""")

# =====================================================================
# 2) DIALOG CETAK PDF: pilih akar, tanpa tampilan pudar/label akar lain
# =====================================================================

# ---------- CSS ----------
ganti(r""".pilih-bagikan small{display:block;font-size:12px;color:var(--ink-soft);margin-top:2px;line-height:1.35;}""",
r""".pilih-bagikan small{display:block;font-size:12px;color:var(--ink-soft);margin-top:2px;line-height:1.35;}
.cetak-daftar{max-height:45vh;overflow-y:auto;margin-bottom:12px;}
.pilih-cetak{display:flex;gap:10px;align-items:center;padding:9px 2px;font-size:14px;color:var(--ink);cursor:pointer;border-bottom:1px solid var(--card-border);}
.pilih-cetak input{width:auto;margin:0;padding:0;flex:none;display:inline-block;}
.pilih-cetak small{display:block;font-size:12px;color:var(--ink-soft);margin-top:1px;}""")

# ---------- HTML dialog ----------
ganti(r"""  <div id="bagikanOverlay" class="dlg-overlay hidden">""",
r"""  <div id="cetakOverlay" class="dlg-overlay hidden">
    <div class="dlg">
      <h3 class="netral">Cetak PDF</h3>
      <p>Pilih akar yang akan dicetak. Hasil cetak hanya berisi akar itu saja, tanpa tampilan pudar dari akar lain.</p>
      <div id="cetakDaftar" class="cetak-daftar"></div>
      <div class="dlg-tombol"><button id="cetakBatal">Batal</button><button id="cetakYa" class="utama">Cetak</button></div>
    </div>
  </div>

  <div id="bagikanOverlay" class="dlg-overlay hidden">""")

# ---------- label "Keluarga lain" tidak ikut dicetak ----------
ganti(r"""  L.label.forEach(lb=>{""",
r"""  if(!M.cetak) L.label.forEach(lb=>{""")

# ---------- alur cetak: dialog dulu, lalu gambar akar terpilih saja ----------
ganti(r"""$('btnCetak').addEventListener('click',async()=>{
  tutupFab();
  const u=gambarDenganLatar($('cetakCanvas'),M_CETAK);""",
r"""function cetakTerbuka(){ return !$('cetakOverlay').classList.contains('hidden'); }
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
async function cetakAkar(akar){
  // hanya data akar terpilih: tanpa orang/garis pudar dari akar lain
  let u; const dataAsli=data; data=akar.data;
  try{
    const g=bangunTunggal(); let L=null;
    try{ L=susunBlok(g); }catch(e){ console.error('penataan blok gagal, memakai tata letak lama',e); }
    u = L ? gambarPohonBlok($('cetakCanvas'),M_CETAK,L,g) : gambarPohon($('cetakCanvas'),M_CETAK);
  } finally { data=dataAsli; }""")
ganti(r"""  const judul=(akarAktif().nama||'').trim();""",
r"""  const judul=(akar.nama||'').trim();""")
ganti(r"""  window.print();
});""",
r"""  window.print();
}""")

# ---------- tombol Back Android menutup dialog cetak ----------
ganti(r"""  if(peranTerbuka()){ tutupPeran(); return true; }""",
r"""  if(cetakTerbuka()){ tutupCetakDlg(); return true; }
  if(peranTerbuka()){ tutupPeran(); return true; }""")

open(p, 'w', encoding='utf-8').write(s)
print('OK diubah:', p, '(cadangan: %s.bak2)' % p)
