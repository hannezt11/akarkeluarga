import shutil
p = 'www/index.html'
s = open(p, encoding='utf-8').read()
shutil.copyfile(p, p + '.bak5')

def ganti(lama, baru):
    global s
    assert s.count(lama) == 1, 'tidak ditemukan / ganda (%d): %s' % (s.count(lama), lama[:70])
    s = s.replace(lama, baru)

# ---------- 1) kotak hitam: jangan paksa satu lapisan GPU raksasa ----------
ganti(r""".canvas{position:absolute;top:0;left:0;transform-origin:0 0;will-change:transform;}""",
r""".canvas{position:absolute;top:0;left:0;transform-origin:0 0;}""")

# ---------- 2) ringkasan generasi di cetak PDF ----------
ganti(r"""#cetakWrap{display:none;}""",
r"""#cetakWrap{display:none;}
.cetak-gen{font-size:16px;line-height:1.25;color:var(--ink);text-align:left;white-space:pre;margin-bottom:18px;}""")
ganti(r"""<div id="cetakJudul" class="cetak-judul"></div><div id="cetakCanvas" class="canvas cetak"></div>""",
r"""<div id="cetakJudul" class="cetak-judul"></div><div id="cetakGen" class="cetak-gen"></div><div id="cetakCanvas" class="canvas cetak"></div>""")
ganti(r"""async function cetakAkar(akar){""",
r"""// Teks "Gen 1 : n" per generasi (semua orang dihitung, termasuk pasangan); memakai data akar yang sedang dicetak
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
async function cetakAkar(akar){""")
ganti(r"""    u = L ? gambarPohonBlok($('cetakCanvas'),M_CETAK,L,g) : gambarPohon($('cetakCanvas'),M_CETAK);
  } finally { data=dataAsli; }""",
r"""    u = L ? gambarPohonBlok($('cetakCanvas'),M_CETAK,L,g) : gambarPohon($('cetakCanvas'),M_CETAK);
    ringBaris=barisRingkasGen();
  } finally { data=dataAsli; }
  const cg=$('cetakGen'); cg.textContent=ringBaris.join('\n'); cg.style.display=ringBaris.length?'block':'none';
  const ringH=ringBaris.length?ringBaris.length*20+18:0;""")
ganti(r"""  let u; const dataAsli=data; data=akar.data;""",
r"""  let u, ringBaris=[]; const dataAsli=data; data=akar.data;""")
ganti(r"""  const H=Math.max(u.h,1)+2*PAD+judulH;""",
r"""  const H=Math.max(u.h,1)+2*PAD+judulH+ringH;""")

# ---------- perbaikan ikon pegangan garis (patch lama menulis \\21D5 dengan dua garis miring) ----------
if '.handle-garis::after{content:"\\\\21D5";}' in s:
    s = s.replace('.handle-garis::after{content:"\\\\21D5";}', '.handle-garis::after{content:"\\21D5";}')
    print('ikon pegangan garis diperbaiki')

open(p, 'w', encoding='utf-8').write(s)
print('OK diubah:', p, '(cadangan: %s.bak5)' % p)
