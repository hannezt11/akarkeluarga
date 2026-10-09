import re, shutil
p = 'www/index.html'
s = open(p, encoding='utf-8').read()
shutil.copyfile(p, p + '.bak4')

def ganti(lama, baru):
    global s
    assert s.count(lama) == 1, 'tidak ditemukan / ganda (%d): %s' % (s.count(lama), lama[:70])
    s = s.replace(lama, baru)

# ---------- markup: badan form diganti total, id lama dipertahankan ----------
a = s.index('<div class="modal-body">')
b = s.index('<div class="relasi-info">')
assert a < b and s.count('<div class="modal-body">') == 1
baru = '''<div class="modal-body">
        <label>Nama <input type="text" id="fNama" placeholder="Tanpa nama"></label>
        <div class="baris-2 saklar-baris">
          <div class="saklar" id="skStatus"><button type="button" data-v="hidup">Hidup</button><button type="button" data-v="meninggal">Wafat</button></div>
          <div class="saklar" id="skGender"><button type="button" data-v="m">Pria</button><button type="button" data-v="f">Wanita</button></div>
        </div>
        <select id="fStatus" style="display:none"><option value="hidup">Hidup</option><option value="meninggal">Meninggal</option></select>
        <select id="fGender" style="display:none"><option value="m">Laki-laki</option><option value="f">Perempuan</option></select>
        <div class="baris-2">
          <div class="fld">Foto
            <div class="foto-ctl">
              <div id="previewFoto"></div>
              <button type="button" id="btnPilihFoto" class="btn-kecil netral">Pilih foto</button>
            </div>
            <input type="file" id="fFotoFile" accept="image/*" style="display:none">
          </div>
          <label id="wrapAnakKe">Anak ke-
            <input type="number" id="fAnakKe" min="1" max="99" placeholder="boleh kosong">
          </label>
        </div>
        <label>Lahir
          <div class="baris-tgl">
            <input type="number" id="fLahirTgl" placeholder="tgl" min="1" max="31">
            <input type="number" id="fLahirBln" placeholder="bln" min="1" max="12">
            <input type="number" id="fLahirThn" placeholder="tahun" min="1" max="2100">
          </div>
        </label>
        <label id="wrapWafat">Wafat
          <div class="baris-tgl">
            <input type="number" id="fWafatTgl" placeholder="tgl" min="1" max="31">
            <input type="number" id="fWafatBln" placeholder="bln" min="1" max="12">
            <input type="number" id="fWafatThn" placeholder="tahun" min="1" max="2100">
          </div>
        </label>
        <div class="baris-2">
          <label>Ayah <select id="fAyah"></select></label>
          <label>Ibu <select id="fIbu"></select></label>
        </div>
        <div class="blok-alamat">
          <div class="judul-blok">Alamat</div>
          <div id="wilayahInfo" class="wilayah-info hidden"><span id="wilayahTeks"></span><button type="button" id="btnUbahWilayah" class="btn-teks">Ubah</button></div>
          <div id="wilayahPilih" class="hidden">
            <div class="baris-2">
              <label>Provinsi <select id="fProv"></select></label>
              <label>Kab / Kota <select id="fKab"></select></label>
            </div>
            <div class="cek-utama"><input type="checkbox" id="fUtama"><span>Jadikan wilayah utama keluarga</span></div>
          </div>
          <div class="baris-2">
            <label>Kecamatan <select id="fKec"></select></label>
            <label>Desa / Kelurahan <select id="fDesa"></select></label>
          </div>
          <label>Jalan / dusun <input type="text" id="fJalan" placeholder="Contoh: Dusun Krajan"></label>
          <div id="wilStatus" class="wil-status"></div>
        </div>
        <label id="wrapSama">Sama dengan orang di akar lain (jarang perlu) <select id="fSama"></select></label>
        '''
s = s[:a] + baru + s[b:]

# ---------- CSS: rapat + saklar ----------
ganti(r""".baris-2>label,.baris-2>.fld{min-width:0;}""",
r""".baris-2>label,.baris-2>.fld,.baris-2>.saklar{min-width:0;}
.modal-body label{margin-bottom:8px;}
.modal-body .fld{margin-bottom:8px;}
.modal-body input,.modal-body select{margin-top:3px;padding:7px 8px;font-size:13px;}
.modal-body .baris-2{gap:8px;}
.blok-alamat{padding-top:6px;margin:2px 0 8px;}
.judul-blok{margin-bottom:4px;}
.saklar-baris{margin-bottom:8px;}
.saklar{display:flex;border:1px solid var(--card-border);border-radius:999px;overflow:hidden;background:var(--card);}
.saklar button{flex:1;border:0;background:transparent;padding:8px 4px;font-size:13px;color:var(--ink-soft);}
.saklar button.on{background:var(--root);color:#fff;font-weight:600;}
#skStatus button.on[data-v="meninggal"]{background:#9a3b3b;}""")

# ---------- sinkron saklar <-> select tersembunyi ----------
ganti(r"""function aturWafat(){""",
r"""function segarSaklar(){
  [['skStatus','fStatus'],['skGender','fGender']].forEach(([sk,sel])=>{
    document.querySelectorAll('#'+sk+' button').forEach(b=>b.classList.toggle('on',b.dataset.v===$(sel).value));
  });
}
[['skStatus','fStatus'],['skGender','fGender']].forEach(([sk,sel])=>{
  document.querySelectorAll('#'+sk+' button').forEach(b=>b.addEventListener('click',()=>{
    $(sel).value=b.dataset.v; $(sel).dispatchEvent(new Event('change')); segarSaklar();
  }));
});
function aturWafat(){ segarSaklar();""")
ganti(r"""  $('fGender').value=genderDari(o);""",
r"""  $('fGender').value=genderDari(o); segarSaklar();""")

open(p, 'w', encoding='utf-8').write(s)
print('OK diubah:', p, '(cadangan: %s.bak4)' % p)
