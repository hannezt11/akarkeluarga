import shutil

p = 'www/index.html'
s = open(p, encoding='utf-8').read()
assert 'cetakOverlay' in s, 'Jalankan dulu patch_cetak_anakke.py (dialog cetak belum terpasang).'
shutil.copyfile(p, p + '.bak3')

def ganti(lama, baru):
    global s
    assert s.count(lama) == 1, 'tidak ditemukan / ganda (%d): %s' % (s.count(lama), lama[:70])
    s = s.replace(lama, baru)

# =====================================================================
# 1) FOTO TERBARU DISAMAKAN DI SEMUA AKAR (hanya tampilan; data akar lain tidak diubah)
# =====================================================================
ganti(r"""  o.gender=gBaru; o.foto=fotoTemp;""",
r"""  o.gender=gBaru;
  if(fotoTemp&&fotoTemp!==o.foto) o.fotoAt=Date.now();
  if(!fotoTemp) delete o.fotoAt;
  o.foto=fotoTemp;""")

ganti(r"""function bangunGabungan(){""",
r"""// Orang yang sama di akar berbeda (lewat "Peran saya" atau "Sama dengan") memakai foto TERBARU.
// Dibandingkan waktu foto diganti (fotoAt); foto lama tanpa catatan dianggap paling tua,
// dan bila sama-sama tanpa catatan, foto akar yang sedang dibuka yang dipakai.
function fotoTerbaruPeta(){
  const semua=store.akar; if(semua.length<2) return {};
  const aktif=akarAktif();
  const akars=[aktif].concat(semua.filter(a=>a!==aktif));
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
    akars.forEach(a=>{
      const pid=a.peran&&a.peran[rk]; if(!pid||!a.data.people[pid]) return;
      const k=kunci(a.id,pid); if(pertama===null) pertama=k; else satukan(pertama,k);
    });
  });
  akars.forEach(a=>Object.values(a.data.people).forEach(p=>{
    const sm=p.sama; if(!sm) return;
    satukan(kunci(a.id,p.id),kunci(sm.a,sm.i));
  }));
  const terbaik={};
  akars.forEach(a=>Object.values(a.data.people).forEach(p=>{
    if(!p.foto) return;
    const r=cari(kunci(a.id,p.id)), at=p.fotoAt||0;
    if(!terbaik[r]||at>terbaik[r].at) terbaik[r]={foto:p.foto,at};
  }));
  const peta={};
  akars.forEach(a=>Object.values(a.data.people).forEach(p=>{
    const t=terbaik[cari(kunci(a.id,p.id))]; if(t) peta[kunci(a.id,p.id)]=t.foto;
  }));
  return peta;
}
function fotoTampilOrang(o){ const pm=fotoTerbaruPeta(); return pm[akarAktif().id+'|'+o.id]||o.foto||''; }
function bangunGabungan(){""")

ganti(r"""  const mid={}, asal={}, dari={}, people={};""",
r"""  const mid={}, asal={}, dari={}, people={};
  const petaFoto=fotoTerbaruPeta();""")
ganti(r"""    const m=idGab(a.id,p.id), c=people[m];""",
r"""    const m=idGab(a.id,p.id), c=people[m];
    const ft=petaFoto[a.id+'|'+p.id]; if(ft) c.foto=ft;""")

ganti(r"""function bangunTunggal(){
  const people=data.people;
  return {data:{people},riil:new Set(Object.keys(people)),dari:{}};
}""",
r"""function bangunTunggal(akar){
  const ak=akar||akarAktif(), pm=fotoTerbaruPeta(), people={};
  Object.keys(data.people).forEach(id=>{
    const o=data.people[id], ft=pm[ak.id+'|'+id];
    people[id]=(ft&&ft!==o.foto) ? Object.assign({},o,{foto:ft}) : o;
  });
  return {data:{people},riil:new Set(Object.keys(people)),dari:{}};
}""")
ganti(r"""    const g=bangunTunggal(); let L=null;""",
r"""    const g=bangunTunggal(akar); let L=null;""")

ganti(r"""  const foto=$('kartuFoto');
  if(o.foto){
    foto.className='kartu-foto'; foto.style.backgroundImage=`url("${o.foto}")`; foto.innerHTML='';""",
r"""  const foto=$('kartuFoto'), fotoO=fotoTampilOrang(o);
  if(fotoO){
    foto.className='kartu-foto'; foto.style.backgroundImage=`url("${fotoO}")`; foto.innerHTML='';""")

# =====================================================================
# 2) GARIS TIDAK SALING MENIMPA
# =====================================================================
ganti(r"""function gambarPohonBlok(target,M,L,g){""",
r"""// Garis datar tiap keluarga menempati "lajur" di celah antar generasi. Urutan lajur menentukan garis mana
// memotong atau MENIMPA garis lain. Untuk <=7 lajur semua urutan dicoba; dipakai yang biayanya terkecil
// (menimpa = 10, bersentuhan di ujung = 3, memotong = 1).
function urutkanLajur(fams,n,M){
  if(n<2||n>7) return;
  fams.forEach(f=>{ f.xAnak=f.anak.map(q=>q.x+M.CX); });
  const dekat=(a,b)=>Math.abs(a-b)<1.5, dalam=(x,a,b)=>x>a+1.5&&x<b-1.5;
  const biaya=(A,B)=>{
    let c=0;
    if(A.xAnak.some(x=>dekat(x,B.midX))) c+=10;
    else if(dalam(B.midX,A.kiri,A.kanan)) c+=1;
    else if(dekat(B.midX,A.kiri)||dekat(B.midX,A.kanan)) c+=3;
    A.xAnak.forEach(x=>{ if(dalam(x,B.kiri,B.kanan)) c+=1; else if(dekat(x,B.kiri)||dekat(x,B.kanan)) c+=3; });
    return c;
  };
  const c=[]; for(let i=0;i<n;i++){ c.push(new Array(n).fill(0)); }
  fams.forEach(A=>fams.forEach(B=>{ if(A.lajur!==B.lajur) c[A.lajur][B.lajur]+=biaya(A,B); }));
  const hitung=perm=>{ let t=0; for(let i=0;i<n;i++) for(let j=0;j<n;j++) if(i!==j&&perm[i]>perm[j]) t+=c[i][j]; return t; };
  let terbaik=[...Array(n).keys()], biayaTerbaik=hitung(terbaik);
  if(biayaTerbaik===0) return;
  const perm=new Array(n), dipakai=new Array(n).fill(false);
  (function cobaSemua(i){
    if(i===n){ const b=hitung(perm); if(b<biayaTerbaik){ biayaTerbaik=b; terbaik=perm.slice(); } return; }
    for(let v=0;v<n;v++){ if(dipakai[v]) continue; dipakai[v]=true; perm[i]=v; cobaSemua(i+1); dipakai[v]=false; }
  })(0);
  fams.forEach(f=>{ f.lajur=terbaik[f.lajur]; });
}
function gambarPohonBlok(target,M,L,g){""")
ganti(r"""    fams.forEach(f=>{ let i=lajur.findIndex(r=>f.kiri>r+8); if(i<0){ i=lajur.length; lajur.push(-Infinity); } lajur[i]=f.kanan; f.lajur=i; });""",
r"""    fams.forEach(f=>{ let i=lajur.findIndex(r=>f.kiri>r+8); if(i<0){ i=lajur.length; lajur.push(-Infinity); } lajur[i]=f.kanan; f.lajur=i; });
    urutkanLajur(fams,lajur.length,M);""")

# pasangan yang berjauhan (ada kartu lain di antaranya): garis dibuat di bawah baris, bertingkat
ganti(r"""  // 3) garis pasangan
""",
r"""  const pasKey=(a,b)=>a<b?a+'|'+b:b+'|'+a;
  const uPas={};
  {
    const jauh=[];
    Object.values(orang).forEach(o=>{
      const pos=posisi[o.id]; if(!pos) return;
      (o.idPasangan||[]).forEach(pid=>{
        const pos2=posisi[pid]; if(!pos2||!(pid>o.id)) return;
        if(blokDari(o.id)!==blokDari(pid)||pos.gen!==pos2.gen) return;
        const x1=Math.min(pos.x,pos2.x), x2=Math.max(pos.x,pos2.x);
        const diantara=Object.keys(posisi).some(r=>r!==o.id&&r!==pid&&posisi[r].gen===pos.gen&&blokDari(r)===blokDari(o.id)&&posisi[r].x>x1+1&&posisi[r].x<x2-1);
        if(diantara) jauh.push({k:pasKey(o.id,pid),gen:pos.gen,y:pos.y,x1,x2});
      });
    });
    const tingkat={};
    jauh.sort((a,b)=>(a.x2-a.x1)-(b.x2-b.x1)).forEach(j=>{
      const lain=tingkat[j.gen]=tingkat[j.gen]||[];
      let lv=0; lain.forEach(q=>{ if(j.x1<=q.x2+8&&j.x2>=q.x1-8) lv=Math.max(lv,q.lv+1); });
      lain.push({x1:j.x1,x2:j.x2,lv});
      uPas[j.k]=j.y+M.NODE_H+8+Math.min(lv,4)*7;
    });
  }
  // 3) garis pasangan
""")
ganti(r"""      if(blokDari(o.id)===blokDari(pid) && pos.gen===pos2.gen){""",
r"""      if(blokDari(o.id)===blokDari(pid) && pos.gen===pos2.gen && uPas[pasKey(o.id,pid)]===undefined){""")
ganti(r"""        const yb=Math.max(pos.y,pos2.y)+M.NODE_H+8;
        siku([[pos.x+M.CX,pos.y+M.NODE_H],""",
r"""        const yb=(uPas[pasKey(o.id,pid)]!==undefined)?uPas[pasKey(o.id,pid)]:Math.max(pos.y,pos2.y)+M.NODE_H+8;
        siku([[pos.x+M.CX,pos.y+M.NODE_H],""")

# =====================================================================
# 3) MODE EDIT GARIS
# =====================================================================
ganti(r""".cetak-daftar{max-height:45vh;overflow-y:auto;margin-bottom:12px;}""",
r""".cetak-daftar{max-height:45vh;overflow-y:auto;margin-bottom:12px;}
.handle-garis{position:absolute;width:28px;height:28px;border-radius:50%;background:var(--root);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45);z-index:6;touch-action:none;cursor:ns-resize;color:#fff;font-size:15px;line-height:24px;text-align:center;}
.handle-garis::after{content:"\\21D5";}
.bar-garis{position:absolute;left:12px;right:12px;top:calc(64px + env(safe-area-inset-top,0px));z-index:12;display:flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--card-border);border-radius:12px;padding:8px 10px;font-size:12px;line-height:1.3;color:var(--ink);box-shadow:0 4px 12px rgba(0,0,0,.18);}
.bar-garis.hidden{display:none;}
.bar-garis span{flex:1;}
.bar-garis button{padding:8px 10px;border-radius:8px;border:1px solid var(--card-border);background:var(--bg);font-size:13px;color:var(--root-deep);}
.bar-garis button.utama{background:var(--root);border-color:var(--root);color:#fff;}""")
ganti(r"""        <button id="btnCetak">Cetak PDF</button>""",
r"""        <button id="btnCetak">Cetak PDF</button>
        <button id="btnEditGaris">Edit garis<small>Geser garis penghubung anak</small></button>""")
ganti(r"""  <div id="pinAkar" class="pin-akar"></div>""",
r"""  <div id="pinAkar" class="pin-akar"></div>
  <div id="barGaris" class="bar-garis hidden"><span>Edit garis: seret bulatan naik/turun untuk menggeser garis keluarga.</span><button id="garisReset">Atur ulang</button><button id="garisSelesai" class="utama">Selesai</button></div>""")
ganti(r"""let urutKetat=false, rootPaksa=null;""",
r"""let urutKetat=false, rootPaksa=null, modeGaris=false;""")
ganti(r"""  d.style.cssText=`left:${x-T/2}px;top:${Math.min(y1,y2)}px;height:${Math.abs(y2-y1)}px;width:${T}px`;
  tg.appendChild(d);
}""",
r"""  d.style.cssText=`left:${x-T/2}px;top:${Math.min(y1,y2)}px;height:${Math.abs(y2-y1)}px;width:${T}px`;
  tg.appendChild(d); return d;
}""")
ganti(r"""  d.style.cssText=`left:${Math.min(x1,x2)-T/2}px;top:${y-T/2}px;width:${Math.abs(x2-x1)+T}px;height:${T}px`;
  tg.appendChild(d);
}""",
r"""  d.style.cssText=`left:${Math.min(x1,x2)-T/2}px;top:${y-T/2}px;width:${Math.abs(x2-x1)+T}px;height:${T}px`;
  tg.appendChild(d); return d;
}
function pasangGarisKeluarga(rec,yBus){
  rec.items.forEach(it=>{
    if(it.role==='b'){ it.el.style.top=(yBus-rec.T/2)+'px'; }
    else { const a=(it.role==='p')?it.y1:yBus, b=(it.role==='p')?yBus:it.y2; it.el.style.top=Math.min(a,b)+'px'; it.el.style.height=Math.abs(b-a)+'px'; }
  });
}""")
# hanya mesin blok (anchor diawali komentar 4)
ganti(r"""  // 4) garis keluarga di dalam blok
  Object.values(keluarga).forEach(f=>{
    const ortu=f.ids.map(id=>posisi[id]);
    const yMulai=f.rapat ? ortu[0].y+M.CY : ortu[0].y+M.NODE_H;
    const yBus=f.anak[0].y-12-f.lajur*LAJUR_H;
    const ortuRiil=f.ids.some(riilId);
    const anakRiil=f.idAnak.map(id=>ortuRiil&&riilId(id));
    const gv=(x,y1,y2,k)=>{ garisV(target,x,y1,y2,M.T,k); rekam('v',x,y1,y2,f.blok); };
    const gh=(x1,y,x2,k)=>{ garisH(target,x1,y,x2,M.T,k); rekam('h',y,x1,x2,f.blok); };""",
r"""  // 4) garis keluarga di dalam blok
  Object.values(keluarga).forEach(f=>{
    const ortu=f.ids.map(id=>posisi[id]);
    const yU=f.rapat?uPas[pasKey(f.ids[0],f.ids[1])]:undefined;
    const yMulai=(yU!==undefined)?yU:(f.rapat ? ortu[0].y+M.CY : ortu[0].y+M.NODE_H);
    const kunciGaris=f.ids.join('|');
    const dMaks=f.anak[0].y-(Math.max(yMulai,...ortu.map(q=>q.y+M.NODE_H))+6);
    const dOto=12+f.lajur*LAJUR_H, dSimpan=(data&&data.garis)?data.garis[kunciGaris]:undefined;
    let dGaris=(typeof dSimpan==='number')?dSimpan:dOto;
    if(dMaks>=8) dGaris=Math.min(Math.max(dGaris,8),dMaks); else dGaris=dOto;
    const yBus=f.anak[0].y-dGaris;
    const rec={items:[],T:M.T,d:dGaris,yAnak:f.anak[0].y};
    const ortuRiil=f.ids.some(riilId);
    const anakRiil=f.idAnak.map(id=>ortuRiil&&riilId(id));
    const gv=(x,y1,y2,k)=>{ const el=garisV(target,x,y1,y2,M.T,k); rec.items.push(y1===yBus?{el,role:'k',y2}:{el,role:'p',y1}); rekam('v',x,y1,y2,f.blok); };
    const gh=(x1,y,x2,k)=>{ const el=garisH(target,x1,y,x2,M.T,k); rec.items.push({el,role:'b'}); rekam('h',y,x1,x2,f.blok); };""")
ganti(r"""  });
  // 5) garis antar blok (boleh bersilang, selalu di bawah garis lain)""",
r"""    if(modeGaris&&!M.cetak&&ortuRiil&&anakRiil.some(Boolean)&&dMaks>8){
      const hx=(f.kanan>f.kiri)?(f.kiri+f.kanan)/2:f.midX;
      const h=document.createElement('div'); h.className='handle-garis';
      h.style.left=(hx-14)+'px'; h.style.top=(yBus-14)+'px';
      h.addEventListener('pointerdown',e=>{
        e.preventDefault(); e.stopPropagation();
        const y0=e.clientY, d0=rec.d;
        const gerak=ev=>{
          const dn=Math.round(Math.min(dMaks,Math.max(8,d0-(ev.clientY-y0)/sk)));
          rec.d=dn; const yb=rec.yAnak-dn; pasangGarisKeluarga(rec,yb); h.style.top=(yb-14)+'px';
        };
        const selesai=()=>{
          window.removeEventListener('pointermove',gerak);
          window.removeEventListener('pointerup',selesai);
          window.removeEventListener('pointercancel',selesai);
          data.garis=data.garis||{}; data.garis[kunciGaris]=rec.d; simpanData();
        };
        window.addEventListener('pointermove',gerak);
        window.addEventListener('pointerup',selesai);
        window.addEventListener('pointercancel',selesai);
      });
      target.appendChild(h);
    }
  });
  // 5) garis antar blok (boleh bersilang, selalu di bawah garis lain)""")
ganti(r"""function cetakTerbuka(){""",
r"""function masukModeGaris(){
  if(akarAktif().terkunci){ alert('Akar ini terkunci (hasil impor), garisnya tidak bisa diedit.'); return; }
  tutupFab(); modeGaris=true; $('barGaris').classList.remove('hidden'); render(false);
}
function keluarModeGaris(){ modeGaris=false; $('barGaris').classList.add('hidden'); simpanData(); render(false); }
$('btnEditGaris').addEventListener('click',masukModeGaris);
$('garisSelesai').addEventListener('click',keluarModeGaris);
$('garisReset').addEventListener('click',()=>{ if(data.garis){ delete data.garis; simpanData(); } render(false); });
function cetakTerbuka(){""")
ganti(r"""  if(cetakTerbuka()){ tutupCetakDlg(); return true; }""",
r"""  if(modeGaris){ keluarModeGaris(); return true; }
  if(cetakTerbuka()){ tutupCetakDlg(); return true; }""")

# geseran garis ikut backup / bagikan / impor
ganti(r"""const dataAkar={people:a.data.people}; if(a.data.wilayah&&typeof a.data.wilayah==='object') dataAkar.wilayah=a.data.wilayah;""",
r"""const dataAkar={people:a.data.people}; if(a.data.wilayah&&typeof a.data.wilayah==='object') dataAkar.wilayah=a.data.wilayah; if(a.data.garis&&typeof a.data.garis==='object') dataAkar.garis=a.data.garis;""")
ganti(r"""a.data={people:d.people}; if(d.wilayah&&typeof d.wilayah==='object') a.data.wilayah=d.wilayah;""",
r"""a.data={people:d.people}; if(d.wilayah&&typeof d.wilayah==='object') a.data.wilayah=d.wilayah; if(d.garis&&typeof d.garis==='object') a.data.garis=d.garis;""")
ganti(r"""const d={people}; if(mode==='lengkap'&&akar.data.wilayah) d.wilayah=akar.data.wilayah;""",
r"""const d={people}; if(mode==='lengkap'&&akar.data.wilayah) d.wilayah=akar.data.wilayah; if(akar.data.garis) d.garis=akar.data.garis;""")
ganti(r"""const dataAkar={people:d.akar.data.people}; if(d.akar.data.wilayah&&typeof d.akar.data.wilayah==='object') dataAkar.wilayah=d.akar.data.wilayah;""",
r"""const dataAkar={people:d.akar.data.people}; if(d.akar.data.wilayah&&typeof d.akar.data.wilayah==='object') dataAkar.wilayah=d.akar.data.wilayah; if(d.akar.data.garis&&typeof d.akar.data.garis==='object') dataAkar.garis=d.akar.data.garis;""")

open(p, 'w', encoding='utf-8').write(s)
print('OK diubah:', p, '(cadangan: %s.bak3)' % p)
