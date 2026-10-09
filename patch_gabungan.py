import shutil, sys

p = 'www/index.html'
s = open(p, encoding='utf-8').read()
shutil.copyfile(p, p + '.bak')   # cadangan otomatis

def ganti(lama, baru):
    global s
    assert s.count(lama) == 1, 'tidak ditemukan / ganda (%d): %s' % (s.count(lama), lama[:70])
    s = s.replace(lama, baru)

# =====================================================================
# TAHAP 1: urutan lahir ketat + blok pudar di celah/rak
# =====================================================================

# ---------- CSS ----------
ganti(r""".label-cerai.pudar{opacity:.3;}""",
r""".label-cerai.pudar{opacity:.3;}
.label-blok{position:absolute;font-size:12px;color:#7a6e58;opacity:.8;white-space:nowrap;pointer-events:none;}""")

# ---------- mesin lama: mode urutan ketat ----------
ganti(r"""function rootAktif(){ return data.people[ROOT_ID] ? ROOT_ID : Object.keys(data.people)[0]; }""",
r"""let urutKetat=false, rootPaksa=null;
function rootAktif(){ if(rootPaksa&&data.people[rootPaksa]) return rootPaksa; return data.people[ROOT_ID] ? ROOT_ID : Object.keys(data.people)[0]; }""")
ganti(r"""const rank=a=>asalBelum(a,unit) ? (indexAnggota(a,unit)===0 ? 2 : 0) : 1;""",
r"""const rank0=a=>asalBelum(a,unit) ? (indexAnggota(a,unit)===0 ? 2 : 0) : 1;
      const rank=urutKetat ? (a=>1) : rank0;""")
ganti(r"""const libre = !!(masuk && r && idxSisip!=null && indexAnggota(masuk,unit)===0 &&
        masuk.ids.every(id=>{ const q=unitOrtu(id); return !q||q===unit; }));""",
r"""const libre = !!(masuk && r && idxSisip!=null && (urutKetat || (indexAnggota(masuk,unit)===0 &&
        masuk.ids.every(id=>{ const q=unitOrtu(id); return !q||q===unit; }))));""")
ganti(r"""const kidMasuk=data.people[masuk.ids[0]];""",
r"""const kidMasuk=data.people[masuk.ids[indexAnggota(masuk,unit)]];""")

# ---------- mesin baru: blok ----------
ganti(r"""function gambarDenganLatar(target,M){
  const g=bangunGabungan();
  if(!M.cetak) gabunganTampil=g;
  if(!g) return gambarPohon(target,M);
  const asli=data; data=g.data; infoLatar=g;
  try{ return gambarPohon(target,M); }
  finally{ data=asli; infoLatar=null; }
}""",
r"""// ===== Penataan ketat: urutan lahir tidak digeser, garis satu keluarga tidak bersilangan =====
// Orang nyata ditata sendiri (blok utama). Keluarga asal pasangan dan semua orang pudar ditata
// sebagai blok terpisah, ditaruh di celah barisan generasi yang sama; bila tidak muat, ditumpuk
// di rak di bawah pohon supaya kanvas tidak melebar. Hanya garis ANTAR blok yang boleh bersilang.
function tataKetat(people,root){
  const aslinya=data, rp=rootPaksa, uk=urutKetat;
  data={people}; rootPaksa=root; urutKetat=true;
  try{ return hitungLayout(); }
  finally{ data=aslinya; rootPaksa=rp; urutKetat=uk; }
}
function petaAnak(people){
  const m={};
  Object.values(people).forEach(o=>{ [o.idAyah,o.idIbu].forEach(pp=>{ if(pp&&people[pp]&&pp!==o.id) (m[pp]=m[pp]||[]).push(o.id); }); });
  return m;
}
function subsetOrang(semua,set){
  const hasil={};
  set.forEach(id=>{
    const o=semua[id]; if(!o) return;
    const c=Object.assign({},o);
    c.idAyah=(o.idAyah&&set.has(o.idAyah))?o.idAyah:null;
    c.idIbu=(o.idIbu&&set.has(o.idIbu))?o.idIbu:null;
    c.idPasangan=(o.idPasangan||[]).filter(x=>set.has(x));
    hasil[id]=c;
  });
  return hasil;
}
// Garis utama = leluhur p0 + semua keturunan leluhur itu. Keluarga asal orang yang "masuk lewat
// pasangan", dan sisi kedua dari pasangan leluhur, dipotong supaya urutan saudara tidak terganggu.
function potongAsal(sub,p0){
  const naikDari=(mulai)=>{ const st=new Set(); (function naik(id){ if(!id||st.has(id)||!sub[id]) return; st.add(id); naik(sub[id].idAyah); naik(sub[id].idIbu); })(mulai); return st; };
  const punya=o=>!!(o.idAyah||o.idIbu);
  naikDari(p0).forEach(id=>{
    const a=sub[id];
    (a.idPasangan||[]).forEach(pid=>{
      const b=sub[pid]; if(!b||pid===id||!punya(a)||!punya(b)) return;
      const ga=genderDari(a), gb=genderDari(b);
      const kiri=(ga==='m'&&gb!=='m')?a:((gb==='m'&&ga!=='m')?b:(a.id<b.id?a:b));
      const potong=(kiri===a)?b:a;
      potong.idAyah=null; potong.idIbu=null;
    });
  });
  const anc=naikDari(p0), anak=petaAnak(sub), L=new Set(anc), st=[...anc];
  while(st.length){ const x=st.pop(); (anak[x]||[]).forEach(c=>{ if(!L.has(c)){ L.add(c); st.push(c); } }); }
  Object.values(sub).forEach(o=>{ if(!L.has(o.id)){ o.idAyah=null; o.idIbu=null; } });
  return sub;
}
function komponenOrang(semua,set,anakMap){
  const vis=new Set(), hasil=[];
  set.forEach(id=>{
    if(vis.has(id)) return;
    const komp=[], st=[id]; vis.add(id);
    while(st.length){
      const x=st.pop(); komp.push(x); const o=semua[x];
      [o.idAyah,o.idIbu].concat(o.idPasangan||[],anakMap[x]||[]).forEach(y=>{ if(y&&set.has(y)&&!vis.has(y)){ vis.add(y); st.push(y); } });
    }
    hasil.push(komp);
  });
  return hasil;
}
function cariJangkar(semua,C,akhir,anakMap){
  const Cs=new Set(C), k1=[], k2=[], k3=[];
  Object.keys(akhir).forEach(pid=>{
    const o=semua[pid];
    if((o.idAyah&&Cs.has(o.idAyah))||(o.idIbu&&Cs.has(o.idIbu))) k1.push(pid);
    else if((o.idPasangan||[]).some(x=>Cs.has(x))) k2.push(pid);
    else if((anakMap[pid]||[]).some(a=>Cs.has(a))) k3.push(pid);
  });
  return k1[0]||k2[0]||k3[0]||null;
}
function cariDx(nodes,dx0,ocup,batas){
  const MARGIN=12, STEP=12;
  const bebas=dx=>nodes.every(n=>{
    const a=n.x+dx, b=a+NODE_W;
    if(a<batas[0]||b>batas[1]) return false;
    return !(ocup[n.gen]||[]).some(iv=>a<iv[1]+MARGIN && b>iv[0]-MARGIN);
  });
  if(bebas(dx0)) return dx0;
  const maks=batas[1]-batas[0];
  for(let d=STEP; d<=maks; d+=STEP){ if(bebas(dx0+d)) return dx0+d; if(bebas(dx0-d)) return dx0-d; }
  return null;
}
function susunBlok(g){
  const semua=g.data.people, ids=Object.keys(semua);
  if(!ids.length) return null;
  const rootAkar=(g.saya&&semua[g.saya])?g.saya:(semua[ROOT_ID]?ROOT_ID:ids[0]);
  const R=new Set(ids.filter(id=>g.riil.has(id))); R.add(rootAkar);
  const subR=subsetOrang(semua,R);
  const punyaOrtu=id=>!!(subR[id]&&(subR[id].idAyah||subR[id].idIbu));
  let p0=rootAkar;
  if(!punyaOrtu(p0)){ const sp=(subR[p0].idPasangan||[]).find(punyaOrtu); if(sp) p0=sp; }
  const posUtama=tataKetat(potongAsal(subR,p0),p0);
  const anakSemua=petaAnak(semua);
  const akhir={}, ocup={}, blokLabel=[], rak={};
  const tambah=(id,x,gen,b)=>{ akhir[id]={x,gen,blok:b}; (ocup[gen]=ocup[gen]||[]).push([x,x+NODE_W]); };
  Object.keys(posUtama).forEach(id=>tambah(id,posUtama[id].x,posUtama[id].gen,0));
  let lebarUtama=0; Object.values(akhir).forEach(a=>{ lebarUtama=Math.max(lebarUtama,a.x+NODE_W); });
  const batas=[-NODE_W, lebarUtama+NODE_W];
  const lebarRak=Math.max(lebarUtama,4*NODE_W);
  let rakBase=null, rakX=0, rakMaxGen=0, nBlok=1, aman=0;
  while(aman++<600){
    const sisa=new Set(ids.filter(id=>!akhir[id])); if(!sisa.size) break;
    const komps=komponenOrang(semua,sisa,anakSemua);
    const kandidat=komps.map(C=>({C,jang:cariJangkar(semua,C,akhir,anakSemua)})).filter(k=>k.jang);
    let pilih;
    if(kandidat.length){ kandidat.sort((a,b)=>a.C.length-b.C.length); pilih=kandidat[0]; }
    else { komps.sort((a,b)=>b.length-a.length); pilih={C:komps[0],jang:null}; }
    const C=pilih.C; let jang=pilih.jang, pos;
    if(jang){
      const set=new Set(C); set.add(jang);
      pos=tataKetat(potongAsal(subsetOrang(semua,set),jang),jang);
    } else {
      const set=new Set(C), subC=subsetOrang(semua,set);
      const akar0=C.find(id=>!(subC[id].idAyah||subC[id].idIbu))||C[0];
      pos=tataKetat(potongAsal(subC,akar0),akar0);
    }
    let baru=Object.keys(pos).filter(id=>!akhir[id]&&id!==jang);
    if(!baru.length){ pos={}; pos[C[0]]={x:0,gen:0}; baru=[C[0]]; jang=null; }
    const dg=jang?(akhir[jang].gen-pos[jang].gen):0;
    const nodes=baru.map(id=>({id,x:pos[id].x,gen:pos[id].gen+dg}));
    let dx=null;
    if(jang) dx=cariDx(nodes,akhir[jang].x-pos[jang].x,ocup,batas);
    const bi=nBlok++;
    if(dx!==null){
      nodes.forEach(n=>tambah(n.id,n.x+dx,n.gen,bi));
    } else {
      const gmin=Math.min(...nodes.map(n=>n.gen)), gmax=Math.max(...nodes.map(n=>n.gen));
      const xmin=Math.min(...nodes.map(n=>n.x)), xmax=Math.max(...nodes.map(n=>n.x));
      const lebar=xmax-xmin+NODE_W;
      const barisBaru=()=>{
        const mulai=Math.max(rakBase===null?-Infinity:rakMaxGen,...Object.keys(ocup).map(Number))+2;
        rakBase=mulai; rakX=0; rakMaxGen=mulai; rak[mulai]=true;
      };
      if(rakBase===null) barisBaru();
      const bentur=xs=>{
        let maks=null;
        nodes.forEach(n=>{
          const a=n.x-xmin+xs, b=a+NODE_W;
          (ocup[rakBase+(n.gen-gmin)]||[]).forEach(iv=>{ if(a<iv[1]+12&&b>iv[0]-12) maks=Math.max(maks===null?-Infinity:maks,iv[1]+12); });
        });
        return maks;
      };
      for(let t=0;t<200;t++){
        if(rakX>0 && rakX+lebar>lebarRak) barisBaru();
        const m=bentur(rakX); if(m===null) break; rakX=m;
      }
      nodes.forEach(n=>tambah(n.id,n.x-xmin+rakX,rakBase+(n.gen-gmin),bi));
      rakMaxGen=Math.max(rakMaxGen,rakBase+(gmax-gmin));
      blokLabel.push({x:rakX,id:nodes.slice().sort((a,b)=>a.gen-b.gen||a.x-b.x)[0].id});
      rakX+=lebar+GAP_CABANG;
    }
  }
  let minX=Infinity; Object.values(akhir).forEach(a=>{ minX=Math.min(minX,a.x); });
  const posisi={}, blok={};
  Object.keys(akhir).forEach(id=>{ posisi[id]={x:akhir[id].x-minX,y:0,gen:akhir[id].gen}; blok[id]=akhir[id].blok; });
  return {posisi,blok,rak,root:rootAkar,label:blokLabel.map(b=>({x:b.x-minX,id:b.id}))};
}
function gambarPohonBlok(target,M,L,g){
  const orang=g.data.people, posisi=L.posisi;
  const riilId=id=>g.riil.has(id);
  const blokDari=id=>L.blok[id]||0;
  const rekam=(t,a,b,c,bl)=>{ if(L.uji) L.uji.push({t,a,b,c,bl}); };
  target.innerHTML='';
  // 1) keluarga (anak per pasangan orang tua) di dalam satu blok; yang lintas blok jadi "silang"
  const keluarga={}, silang=[];
  Object.values(orang).forEach(o=>{
    if(!posisi[o.id]) return;
    const ortu=[o.idAyah,o.idIbu].filter(id=>id&&posisi[id]);
    if(!ortu.length) return;
    const rumah=blokDari(ortu[0]);
    const ids=ortu.filter(id=>blokDari(id)===rumah), luar=ortu.filter(id=>blokDari(id)!==rumah);
    if(blokDari(o.id)!==rumah){ silang.push({kid:o.id,ortu}); return; }
    const kunci=rumah+'#'+ids.join('|');
    const fm=(keluarga[kunci]=keluarga[kunci]||{ids,anak:[],idAnak:[],blok:rumah});
    fm.anak.push(posisi[o.id]); fm.idAnak.push(o.id);
    if(luar.length) silang.push({kid:o.id,ortu:luar});
  });
  const perKel={};
  Object.values(keluarga).forEach(f=>{
    const ortu=f.ids.map(id=>posisi[id]);
    const ayahO=orang[f.ids[0]];
    f.rapat=ortu.length===2 && ortu[0].gen===ortu[1].gen && (ayahO.idPasangan||[]).includes(f.ids[1]);
    f.midX=f.rapat ? (ortu[0].x+ortu[1].x)/2+M.CX : ortu[0].x+M.CX;
    const xs=f.anak.map(p=>p.x+M.CX).concat(f.midX);
    f.kiri=Math.min(...xs); f.kanan=Math.max(...xs);
    f.gen=f.anak[0].gen;
    const k=f.blok+'|'+f.gen; (perKel[k]=perKel[k]||[]).push(f);
  });
  // 2) lajur garis dihitung per blok (antar blok boleh bersilang)
  const jumlahLajur={};
  Object.keys(perKel).forEach(k=>{
    const fams=perKel[k]; fams.sort((a,b)=>a.kiri-b.kiri||a.kanan-b.kanan);
    const lajur=[];
    fams.forEach(f=>{ let i=lajur.findIndex(r=>f.kiri>r+8); if(i<0){ i=lajur.length; lajur.push(-Infinity); } lajur[i]=f.kanan; f.lajur=i; });
    const gk=fams[0].gen; jumlahLajur[gk]=Math.max(jumlahLajur[gk]||0,lajur.length);
  });
  const daftarGen=[...new Set(Object.values(posisi).map(q=>q.gen))].sort((a,b)=>a-b);
  const yGen={}; let yy=0;
  daftarGen.forEach((gk,i)=>{ if(i>0) yy+=M.NODE_H+GAP_GEN+(jumlahLajur[gk]||0)*LAJUR_H+(L.rak[gk]?Math.round(M.NODE_H*0.35):0); yGen[gk]=yy; });
  Object.values(posisi).forEach(q=>{ q.y=yGen[q.gen]; });
  const kelasDari=(...ids)=>ids.every(riilId)?'':'pudar';
  const siku=(pts,kelas)=>{
    for(let i=0;i<pts.length-1;i++){
      const [x1,y1]=pts[i], [x2,y2]=pts[i+1];
      if(x1===x2) garisV(target,x1,y1,y2,M.T,kelas); else garisH(target,x1,y1,x2,M.T,kelas);
    }
  };
  // 3) garis pasangan
  Object.values(orang).forEach(o=>{
    const pos=posisi[o.id]; if(!pos) return;
    (o.idPasangan||[]).forEach(pid=>{
      const pos2=posisi[pid]; if(!pos2||!(pid>o.id)) return;
      const cerai=((o.statusPasangan||{})[pid]==='cerai');
      const kls=kelasDari(o.id,pid);
      if(blokDari(o.id)===blokDari(pid) && pos.gen===pos2.gen){
        garisH(target,pos.x+M.CX,pos.y+M.CY,pos2.x+M.CX,M.T,[cerai?'cerai':'',kls].filter(Boolean).join(' '));
        if(cerai){
          const lb=document.createElement('div'); lb.className='label-cerai'+(kls?' pudar':''); lb.textContent='cerai';
          lb.style.left=((pos.x+pos2.x)/2+M.CX)+'px'; lb.style.top=(pos.y+M.CY-M.T-(M.cetak?16:11))+'px';
          target.appendChild(lb);
        }
      } else {
        const yb=Math.max(pos.y,pos2.y)+M.NODE_H+8;
        siku([[pos.x+M.CX,pos.y+M.NODE_H],[pos.x+M.CX,yb],[pos2.x+M.CX,yb],[pos2.x+M.CX,pos2.y+M.NODE_H]],kls||'');
      }
    });
  });
  // 4) garis keluarga di dalam blok
  Object.values(keluarga).forEach(f=>{
    const ortu=f.ids.map(id=>posisi[id]);
    const yMulai=f.rapat ? ortu[0].y+M.CY : ortu[0].y+M.NODE_H;
    const yBus=f.anak[0].y-12-f.lajur*LAJUR_H;
    const ortuRiil=f.ids.some(riilId);
    const anakRiil=f.idAnak.map(id=>ortuRiil&&riilId(id));
    const gv=(x,y1,y2,k)=>{ garisV(target,x,y1,y2,M.T,k); rekam('v',x,y1,y2,f.blok); };
    const gh=(x1,y,x2,k)=>{ garisH(target,x1,y,x2,M.T,k); rekam('h',y,x1,x2,f.blok); };
    if(ortuRiil&&anakRiil.every(Boolean)){
      gv(f.midX,yMulai,yBus);
      if(f.kanan>f.kiri) gh(f.kiri,yBus,f.kanan);
      f.anak.forEach(q=>gv(q.x+M.CX,yBus,q.y));
    } else {
      gv(f.midX,yMulai,yBus,'pudar');
      if(f.kanan>f.kiri) gh(f.kiri,yBus,f.kanan,'pudar');
      f.anak.forEach(q=>gv(q.x+M.CX,yBus,q.y,'pudar'));
      if(anakRiil.some(Boolean)){
        const xs=[f.midX]; f.anak.forEach((q,i)=>{ if(anakRiil[i]) xs.push(q.x+M.CX); });
        const ka=Math.min(...xs), kb=Math.max(...xs);
        gv(f.midX,yMulai,yBus);
        if(kb>ka) gh(ka,yBus,kb);
        f.anak.forEach((q,i)=>{ if(anakRiil[i]) gv(q.x+M.CX,yBus,q.y); });
      }
    }
  });
  // 5) garis antar blok (boleh bersilang, selalu di bawah garis lain)
  silang.forEach(sv=>{
    const k=posisi[sv.kid], pp=sv.ortu.map(id=>posisi[id]);
    const rapat=pp.length===2 && pp[0].gen===pp[1].gen && (orang[sv.ortu[0]].idPasangan||[]).includes(sv.ortu[1]);
    const mx=rapat ? (pp[0].x+pp[1].x)/2+M.CX : pp[0].x+M.CX;
    const kx=k.x+M.CX, ky=k.y, py=pp[0].y;
    const kls=kelasDari(sv.kid,...sv.ortu);
    if(py+M.NODE_H < ky-4){
      const ym=ky-12, ya=rapat ? py+M.CY : py+M.NODE_H;
      siku([[kx,ky],[kx,ym],[mx,ym],[mx,ya]],kls);
    } else {
      const yb=ky+M.NODE_H+10;
      siku([[kx,ky+M.NODE_H],[kx,yb],[mx,yb],[mx,py]],kls);
    }
  });
  // 6) kartu
  let maksX=0,maksY=0;
  Object.values(orang).forEach(o=>{
    const pos=posisi[o.id]; if(!pos) return;
    maksX=Math.max(maksX,pos.x+NODE_W); maksY=Math.max(maksY,pos.y+M.NODE_H);
    const n=document.createElement('div');
    n.className='node'+((!M.cetak&&o.id===L.root)?' aktif':'')+(riilId(o.id)?'':' pudar');
    n.dataset.id=o.id;
    if(!riilId(o.id)) n.dataset.akar=g.dari[o.id];
    n.style.left=pos.x+'px'; n.style.top=pos.y+'px';
    const wrap=document.createElement('div'); wrap.className='avatar-wrap';
    const av=document.createElement('div'); av.className='avatar';
    if(o.foto) av.style.backgroundImage=`url("${o.foto}")`; else av.textContent=inisial(o.nama);
    const dot=document.createElement('div'); dot.className='status-dot '+(o.status==='meninggal'?'meninggal':'hidup');
    wrap.appendChild(av); wrap.appendChild(dot);
    const nm=document.createElement('div'); nm.className='nama'+(o.nama?'':' kosong'); nm.textContent=o.nama||'Tanpa nama';
    const um=document.createElement('div'); um.className='umur';
    const u=hitungUmur(o);
    um.textContent = u!==null ? (u+' th'+(o.status==='meninggal'?' \u2020':'')) : formatTglSingkat(o.lahir);
    n.appendChild(wrap); n.appendChild(nm); n.appendChild(um);
    target.appendChild(n);
  });
  L.label.forEach(lb=>{
    const el=document.createElement('div'); el.className='label-blok';
    const aid=g.dari[lb.id], ak=aid&&store.akar.find(a=>a.id===aid);
    el.textContent=ak?ak.nama:'Keluarga lain';
    el.style.left=lb.x+'px'; el.style.top=(posisi[lb.id].y-22)+'px';
    target.appendChild(el);
  });
  return {w:maksX,h:maksY};
}
function bangunTunggal(){
  const people=data.people;
  return {data:{people},riil:new Set(Object.keys(people)),dari:{}};
}
function gambarDenganLatar(target,M){
  const overlay=bangunGabungan();
  if(!M.cetak) gabunganTampil=overlay;
  const g=overlay||bangunTunggal();
  try{
    const L=susunBlok(g);
    if(L) return gambarPohonBlok(target,M,L,g);
  }catch(e){ console.error('penataan blok gagal, memakai tata letak lama',e); }
  if(!overlay) return gambarPohon(target,M);
  const asli=data; data=g.data; infoLatar=g;
  try{ return gambarPohon(target,M); }
  finally{ data=asli; infoLatar=null; }
}""")

# =====================================================================
# TAHAP 2: menu "Peran saya di tiap akar" + penggabungan lewat peran
# =====================================================================

# ---------- CSS ----------
ganti(r""".label-blok{position:absolute;font-size:12px;color:#7a6e58;opacity:.8;white-space:nowrap;pointer-events:none;}""",
r""".label-blok{position:absolute;font-size:12px;color:#7a6e58;opacity:.8;white-space:nowrap;pointer-events:none;}
.peran-sheet{max-height:88%;overflow-y:auto;}
.peran-info{font-size:13px;color:#6b5f49;margin:0 8px 8px;line-height:1.4;}
.peran-akar{margin:8px 4px;padding:10px;border:1px solid var(--card-border);border-radius:12px;background:var(--card);}
.peran-nama{font-family:var(--font-title);font-size:16px;color:var(--root-deep);margin-bottom:6px;}
.peran-baris{display:block;font-size:12px;color:#6b5f49;margin-top:6px;}
.peran-sel{display:block;width:100%;padding:9px;border:1px solid var(--card-border);border-radius:8px;background:#fff;font-size:14px;color:var(--ink);margin-top:3px;}
.sheet button.peran-tutup{text-align:center;background:var(--root);color:#fff;margin-top:8px;}""")

# ---------- HTML ----------
ganti(r"""<button id="btnPengguna">Nama saya<small id="penggunaTeks"></small></button>""",
r"""<button id="btnPengguna">Nama saya<small id="penggunaTeks"></small></button>
        <button id="btnPeran">Peran saya di tiap akar</button>""")
ganti(r"""  <div id="bagikanOverlay" class="dlg-overlay hidden">""",
r"""  <div id="peranOverlay" class="sheet-overlay hidden">
    <div id="peranSheet" class="sheet peran-sheet">
      <div class="sheet-judul">Peran saya di tiap akar</div>
      <p class="peran-info">Pilih siapa Anda di setiap akar. Orang dengan peran yang sama di akar berbeda otomatis dianggap satu orang, jadi akar-akar itu tersambung. Cukup isi yang ada di akar tersebut.</p>
      <div id="peranIsi"></div>
      <button id="peranTutup" class="peran-tutup">Selesai</button>
    </div>
  </div>

  <div id="bagikanOverlay" class="dlg-overlay hidden">""")
ganti(r"""<label id="wrapSama">Sama dengan orang di akar lain <select id="fSama"></select></label>""",
r"""<label id="wrapSama">Sama dengan orang di akar lain (lanjutan, biasanya tidak perlu) <select id="fSama"></select></label>""")

# ---------- penggabungan lewat peran ----------
ganti(r"""  akars.forEach(a=>Object.values(a.data.people).forEach(p=>{
    const sm=p.sama; if(!sm) return;
    const k1=kunci(a.id,p.id), k2=kunci(sm.a,sm.i);
    if(induk[k2]===undefined) return;
    const r1=cari(k1), r2=cari(k2); if(r1===r2) return;
    let bentrok=false; isi[r1].forEach(x=>{ if(isi[r2].has(x)) bentrok=true; });
    if(bentrok) return;
    induk[r2]=r1; isi[r2].forEach(x=>isi[r1].add(x));
  }));""",
r"""  const satukan=(k1,k2)=>{
    if(induk[k1]===undefined||induk[k2]===undefined) return;
    const r1=cari(k1), r2=cari(k2); if(r1===r2) return;
    let bentrok=false; isi[r1].forEach(x=>{ if(isi[r2].has(x)) bentrok=true; });
    if(bentrok) return;
    induk[r2]=r1; isi[r2].forEach(x=>isi[r1].add(x));
  };
  // peran: orang dengan peran sama di akar berbeda dianggap satu orang
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
  }));""")
ganti(r"""  const riil=new Set(); Object.keys(people).forEach(m=>{ if(asal[m].has(store.aktifId)) riil.add(m); });
  return {data:{people},riil,dari};""",
r"""  const riil=new Set(); Object.keys(people).forEach(m=>{ if(asal[m].has(store.aktifId)) riil.add(m); });
  // batang: saya + pasangan + keturunan selalu nyata, di akar mana pun dicatat
  let sayaM=null;
  for(const a of akars){ const pid=a.peran&&a.peran.saya; if(pid&&a.data.people[pid]){ sayaM=idGab(a.id,pid); break; } }
  if(sayaM){
    const turun=new Set([sayaM]), st=[sayaM];
    while(st.length){
      const x=st.pop();
      Object.values(people).forEach(c=>{ if((c.idAyah===x||c.idIbu===x)&&!turun.has(c.id)){ turun.add(c.id); st.push(c.id); } });
    }
    turun.forEach(id=>{ riil.add(id); (people[id].idPasangan||[]).forEach(sp=>riil.add(sp)); });
    // pada cabang kandung: orang tua kandung + saudara kandung (beserta pasangan dan keturunannya) ikut nyata;
    // pada cabang mertua: orang tua mertua + saudara pasangan ikut nyata
    const tambahKerabat=rks=>{
      const ortuM=[];
      rks.forEach(rk=>{
        for(const a of akars){ const pid=a.peran&&a.peran[rk]; if(pid&&a.data.people[pid]){ ortuM.push(idGab(a.id,pid)); break; } }
      });
      ortuM.forEach(id=>riil.add(id));
      const sdr=new Set(), st2=[];
      Object.values(people).forEach(c=>{ if(ortuM.some(o=>c.idAyah===o||c.idIbu===o)){ sdr.add(c.id); st2.push(c.id); } });
      while(st2.length){
        const x=st2.pop();
        Object.values(people).forEach(c=>{ if((c.idAyah===x||c.idIbu===x)&&!sdr.has(c.id)){ sdr.add(c.id); st2.push(c.id); } });
      }
      sdr.forEach(id=>{ riil.add(id); (people[id].idPasangan||[]).forEach(sp=>riil.add(sp)); });
    };
    const pa=akars[0].peran||{};
    if(pa.ayah||pa.ibu) tambahKerabat(['ayah','ibu']);
    if(pa.mertuaAyah||pa.mertuaIbu) tambahKerabat(['mertuaAyah','mertuaIbu']);
  }
  return {data:{people},riil,dari,saya:sayaM};""")
ganti(r"""const g=(store.gabung||[]).filter(id=>store.akar.some(a=>a.id===id)); let n=0;""",
r"""const g=(store.gabung||[]).filter(id=>store.akar.some(a=>a.id===id)); let n=0;
  const adaSaya=g.filter(aid=>{ const a=store.akar.find(x=>x.id===aid); return a.peran&&a.peran.saya&&a.data.people[a.peran.saya]; }).length;
  if(adaSaya>=2) n+=adaSaya-1;""")
ganti(r"""Buka form edit orang, lalu isi kolom "Sama dengan orang di akar lain" supaya pohonnya tersambung.""",
r"""Buka menu "Peran saya di tiap akar" di drawer, lalu pilih siapa Anda di tiap akar supaya pohonnya tersambung.""")

# ---------- ketuk orang dari akar lain ----------
ganti(r"""'Orang ini ada di akar "'+ak.nama+'" dan tampil pudar sebagai latar. Buka akar tersebut?'""",
r"""'Orang ini tercatat di akar "'+ak.nama+'". Buka akar tersebut?'""")
ganti(r"""  if(n){ if(n.classList.contains('pudar')) bukaLatar(n.dataset.id,n.dataset.akar); else bukaKartu(n.dataset.id); }""",
r"""  if(n){ if(n.dataset.akar) bukaLatar(n.dataset.id,n.dataset.akar); else bukaKartu(n.dataset.id); }""")
ganti(r"""    if(!riilId(o.id)) n.dataset.akar=g.dari[o.id];""",
r"""    if(g.dari[o.id] && g.dari[o.id]!==store.aktifId) n.dataset.akar=g.dari[o.id];""")
ganti(r"""    if(!riilId(o.id)) n.dataset.akar=infoLatar.dari[o.id];""",
r"""    if(infoLatar&&infoLatar.dari[o.id]&&infoLatar.dari[o.id]!==store.aktifId) n.dataset.akar=infoLatar.dari[o.id];""")

# ---------- konstanta peran + layar "Peran saya" ----------
ganti(r"""let infoLatar=null, gabunganTampil=null;""",
r"""let infoLatar=null, gabunganTampil=null;
const PERAN=[['saya','Saya'],['pasangan','Pasangan saya'],['ayah','Ayah saya'],['ibu','Ibu saya'],['mertuaAyah','Ayah mertua'],['mertuaIbu','Ibu mertua']];""")
ganti(r"""$('amGabung').addEventListener('click',()=>{""",
r"""function peranTerbuka(){ return !$('peranOverlay').classList.contains('hidden'); }
function tutupPeran(){ $('peranOverlay').classList.add('hidden'); simpanData(); perbaruiJudul(); render(true); }
function saranPeran(a){
  const pr=a.peran=a.peran||{}, o=a.data.people[pr.saya]; if(!o) return;
  const isi=(k,v)=>{ if(v&&a.data.people[v]&&!pr[k]) pr[k]=v; };
  isi('ayah',o.idAyah); isi('ibu',o.idIbu);
  const sp=(o.idPasangan||[]).find(x=>a.data.people[x]);
  isi('pasangan',sp);
  const so=sp&&a.data.people[sp];
  if(so){ isi('mertuaAyah',so.idAyah); isi('mertuaIbu',so.idIbu); }
}
function isiPeran(){
  const wadah=$('peranIsi'), st=$('peranSheet').scrollTop; wadah.innerHTML='';
  store.akar.forEach(a=>{
    a.peran=a.peran||{};
    const kotak=document.createElement('div'); kotak.className='peran-akar';
    const jd=document.createElement('div'); jd.className='peran-nama'; jd.textContent=(a.nama||'Akar')+(a.id===store.aktifId?' (dipilih)':''); kotak.appendChild(jd);
    const daftar=Object.values(a.data.people).sort((x,y)=>String(x.nama||'').localeCompare(String(y.nama||'')));
    PERAN.forEach(([rk,label])=>{
      const lb=document.createElement('label'); lb.className='peran-baris'; lb.textContent=label;
      const sel=document.createElement('select'); sel.className='peran-sel';
      const k0=document.createElement('option'); k0.value=''; k0.textContent='\u2014 tidak ada di akar ini \u2014'; sel.appendChild(k0);
      daftar.forEach(q=>{
        const op=document.createElement('option'); op.value=q.id;
        op.textContent=(q.nama||'Tanpa nama')+((q.lahir&&q.lahir.tahun)?' ('+q.lahir.tahun+')':'')+' \u00b7 '+q.id;
        sel.appendChild(op);
      });
      sel.value=(a.peran[rk]&&a.data.people[a.peran[rk]])?a.peran[rk]:'';
      sel.addEventListener('change',()=>{
        if(sel.value) a.peran[rk]=sel.value; else delete a.peran[rk];
        if(rk==='saya') saranPeran(a);
        simpanData(); isiPeran();
      });
      lb.appendChild(sel); kotak.appendChild(lb);
    });
    wadah.appendChild(kotak);
  });
  $('peranSheet').scrollTop=st;
}
$('btnPeran').addEventListener('click',()=>{ tutupDrawer(); isiPeran(); $('peranOverlay').classList.remove('hidden'); });
$('peranTutup').addEventListener('click',tutupPeran);
$('peranOverlay').addEventListener('click',e=>{ if(e.target===$('peranOverlay')) tutupPeran(); });
$('amGabung').addEventListener('click',()=>{""")
ganti(r"""  if(dlgTerbuka()){ tutupDlg(false); return true; }""",
r"""  if(peranTerbuka()){ tutupPeran(); return true; }
  if(dlgTerbuka()){ tutupDlg(false); return true; }""")

# ---------- restore mempertahankan peran ----------
ganti(r"""terkunci:!!a.terkunci,asalId:a.asalId||'',mode:a.mode||''};""",
r"""terkunci:!!a.terkunci,asalId:a.asalId||'',mode:a.mode||'',peran:(a.peran&&typeof a.peran==='object')?a.peran:{}};""")

# tulis hanya kalau SEMUA penggantian berhasil
open(p, 'w', encoding='utf-8').write(s)
print('OK diubah:', p, '(cadangan: %s.bak)' % p)
