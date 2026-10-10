// Geser nama manual (mode Edit): data.geser[id] = selisih x (px) dari posisi otomatis. Hanya untuk orang di akar aktif.
function terapkanGeser(posisi,riilId){
  const gs=data&&data.geser; if(!gs) return;
  Object.keys(posisi).forEach(id=>{
    const q=posisi[id]; if(q.xOto!==undefined) return;
    q.xOto=q.x;
    const d=gs[id]; if(typeof d!=='number'||!riilId(id)) return;
    q.x=Math.max(0,q.x+d);
  });
}
function pasangGeserNama(n,o,pos){
  n.classList.add('geser');
  n.addEventListener('pointerdown',e=>{
    e.preventDefault(); e.stopPropagation();
    const x0=e.clientX, d0=(data.geser&&data.geser[o.id])||0, oto=(pos.xOto!==undefined)?pos.xOto:pos.x;
    let bingkai=0;
    const gerak=ev=>{
      const dn=Math.round(Math.max(-oto,d0+(ev.clientX-x0)/sk));
      data.geser=data.geser||{}; data.geser[o.id]=dn;
      if(!bingkai) bingkai=requestAnimationFrame(()=>{ bingkai=0; render(false); });
    };
    const selesai=()=>{
      window.removeEventListener('pointermove',gerak);
      window.removeEventListener('pointerup',selesai);
      window.removeEventListener('pointercancel',selesai);
      if(bingkai){ cancelAnimationFrame(bingkai); bingkai=0; }
      if(data.geser&&!data.geser[o.id]) delete data.geser[o.id];
      if(data.geser&&!Object.keys(data.geser).length) delete data.geser;
      simpanData(); render(false);
    };
    window.addEventListener('pointermove',gerak);
    window.addEventListener('pointerup',selesai);
    window.addEventListener('pointercancel',selesai);
  });
}
function gambarPohonBlok(target,M,L,g){
  const orang=g.data.people, posisi=L.posisi;
  terapkanGeser(posisi,id=>g.riil.has(id));
  // Sorot jalur: leluhur + keturunan (beserta pasangan keturunan) orang terpilih; yang lain diredupkan
  let S=null;
  if(!M.cetak&&sorotId&&orang[sorotId]){
    S=new Set([sorotId]);
    const naik=id=>{ [orang[id].idAyah,orang[id].idIbu].forEach(x=>{ if(x&&orang[x]&&!S.has(x)){ S.add(x); naik(x); } }); };
    naik(sorotId);
    const D=new Set([sorotId]);
    const turun=id=>{ Object.values(orang).forEach(c=>{ if((c.idAyah===id||c.idIbu===id)&&!D.has(c.id)){ D.add(c.id); turun(c.id); } }); };
    turun(sorotId);
    D.forEach(id=>{ S.add(id); (orang[id].idPasangan||[]).forEach(x=>{ if(orang[x]) S.add(x); }); });
  }
  const rd=(...ids)=>(S&&!ids.every(id=>S.has(id)))?' redup':'';
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
    urutkanLajur(fams,lajur.length,M);
    const gk=fams[0].gen; jumlahLajur[gk]=Math.max(jumlahLajur[gk]||0,lajur.length);
  });
  // Garis antar blok (anak di satu blok, orang tua di blok lain) juga diberi lajur sendiri, di bawah
  // lajur keluarga biasa, supaya tidak menumpuk di jalur yang sama dengan garis keluarga lain.
  const lajurSilang=new Map();
  {
    const perGenS={};
    silang.forEach(sv=>{
      const k=posisi[sv.kid], pp=sv.ortu.map(id=>posisi[id]).filter(Boolean);
      if(!k||!pp.length||!(pp[0].gen<k.gen)) return;
      const rapat=pp.length===2 && pp[0].gen===pp[1].gen && (orang[sv.ortu[0]].idPasangan||[]).includes(sv.ortu[1]);
      const mx=rapat ? (pp[0].x+pp[1].x)/2+M.CX : pp[0].x+M.CX, kx=k.x+M.CX;
      (perGenS[k.gen]=perGenS[k.gen]||[]).push({sv,a:Math.min(kx,mx),b:Math.max(kx,mx)});
    });
    Object.keys(perGenS).forEach(gk=>{
      const dasar=jumlahLajur[gk]||0, lj=[];
      perGenS[gk].sort((u,v)=>u.a-v.a||u.b-v.b).forEach(e=>{
        let i=lj.findIndex(r=>e.a>r+8); if(i<0){ i=lj.length; lj.push(-Infinity); }
        lj[i]=e.b; lajurSilang.set(e.sv,dasar+i);
      });
      jumlahLajur[gk]=dasar+lj.length;
    });
  }
  const daftarGen=[...new Set(Object.values(posisi).map(q=>q.gen))].sort((a,b)=>a-b);
  const yGen={}; let yy=0;
  daftarGen.forEach((gk,i)=>{ if(i>0) yy+=M.NODE_H+GAP_GEN+(jumlahLajur[gk]||0)*LAJUR_H+(L.rak[gk]?Math.round(M.NODE_H*0.35):0); yGen[gk]=yy; });
  Object.values(posisi).forEach(q=>{ q.y=yGen[q.gen]; });
  const kelasDari=(...ids)=>(ids.every(riilId)?'':'pudar')+rd(...ids);
  const siku=(pts,kelas)=>{
    const els=[];
    for(let i=0;i<pts.length-1;i++){
      const [x1,y1]=pts[i], [x2,y2]=pts[i+1];
      els.push(x1===x2 ? garisV(target,x1,y1,y2,M.T,kelas) : garisH(target,x1,y1,x2,M.T,kelas));
    }
    return els;
  };
  const pasKey=(a,b)=>a<b?a+'|'+b:b+'|'+a;
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
  Object.values(orang).forEach(o=>{
    const pos=posisi[o.id]; if(!pos) return;
    (o.idPasangan||[]).forEach(pid=>{
      const pos2=posisi[pid]; if(!pos2||!(pid>o.id)) return;
      const cerai=((o.statusPasangan||{})[pid]==='cerai');
      const kls=kelasDari(o.id,pid);
      if(blokDari(o.id)===blokDari(pid) && pos.gen===pos2.gen && uPas[pasKey(o.id,pid)]===undefined){
        garisH(target,pos.x+M.CX,pos.y+M.CY,pos2.x+M.CX,M.T,['psg',cerai?'cerai':'',kls].filter(Boolean).join(' '));
        if(!cerai){ const tt=document.createElement('div'); tt.className='titik-psg'+(kls?' '+kls:''); tt.style.left=((pos.x+pos2.x)/2+M.CX)+'px'; tt.style.top=(pos.y+M.CY)+'px'; target.appendChild(tt); }
      } else {
        const yb=(uPas[pasKey(o.id,pid)]!==undefined)?uPas[pasKey(o.id,pid)]:Math.max(pos.y,pos2.y)+M.NODE_H+8;
        siku([[pos.x+M.CX,pos.y+M.NODE_H],[pos.x+M.CX,yb],[pos2.x+M.CX,yb],[pos2.x+M.CX,pos2.y+M.NODE_H]],kls||'');
      }
    });
  });
  // 4) garis keluarga di dalam blok
  const tempelSatu=[], tempelSilang=[];
  Object.values(keluarga).forEach(f=>{
    const ortu=f.ids.map(id=>posisi[id]);
    const yU=f.rapat?uPas[pasKey(f.ids[0],f.ids[1])]:undefined;
    const yMulai=(yU!==undefined)?yU:(f.rapat ? ortu[0].y+M.CY : ortu[0].y+M.NODE_H);
    const kunciGaris=f.ids.join('|');
    const dMaks=f.anak[0].y-(Math.max(yMulai,...ortu.map(q=>q.y+M.NODE_H))+6);
    const dOto=22+f.lajur*LAJUR_H, dSimpan=(data&&data.garis)?data.garis[kunciGaris]:undefined;
    let dGaris=(typeof dSimpan==='number')?dSimpan:dOto;
    if(dMaks>=8) dGaris=Math.min(Math.max(dGaris,8),dMaks); else dGaris=dOto;
    const yBus=f.anak[0].y-dGaris;
    const rec={items:[],T:M.T,d:dGaris,yAnak:f.anak[0].y};
    const ortuRiil=f.ids.some(riilId);
    const anakRiil=f.idAnak.map(id=>ortuRiil&&riilId(id));
    const kBus=(S&&!(f.ids.some(id=>S.has(id))&&f.idAnak.some(id=>S.has(id))))?'redup':'';
    const kAnak=ix=>(S&&!S.has(f.idAnak[ix]))?'redup':kBus;
    const gv=(x,y1,y2,k)=>{ const el=garisV(target,x,y1,y2,M.T,k); const it=y1===yBus?{el,role:'k',y2}:{el,role:'p',y1}; rec.items.push(it); if(it.role==='p'&&f.ids.length===1) tempelSatu.push({it,id:f.ids[0],rec}); rekam('v',x,y1,y2,f.blok); };
    const gh=(x1,y,x2,k)=>{ const el=garisH(target,x1,y,x2,M.T,k); rec.items.push({el,role:'b'}); rekam('h',y,x1,x2,f.blok); };
    if(ortuRiil&&anakRiil.every(Boolean)){
      gv(f.midX,yMulai,yBus,kBus);
      if(f.kanan>f.kiri) gh(f.kiri,yBus,f.kanan,kBus);
      f.anak.forEach((q,ix)=>gv(q.x+M.CX,yBus,q.y,kAnak(ix)));
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
    if(modeGaris&&!M.cetak&&ortuRiil&&anakRiil.some(Boolean)&&dMaks>8){
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
  // 5) garis antar blok (boleh bersilang, selalu di bawah garis lain)
  silang.forEach(sv=>{
    const k=posisi[sv.kid], pp=sv.ortu.map(id=>posisi[id]);
    const rapat=pp.length===2 && pp[0].gen===pp[1].gen && (orang[sv.ortu[0]].idPasangan||[]).includes(sv.ortu[1]);
    const mx=rapat ? (pp[0].x+pp[1].x)/2+M.CX : pp[0].x+M.CX;
    const kx=k.x+M.CX, ky=k.y, py=pp[0].y;
    const kls=kelasDari(sv.kid,...sv.ortu);
    if(py+M.NODE_H < ky-4){
      const ym=ky-22-(lajurSilang.get(sv)||0)*LAJUR_H, ya=rapat ? py+M.CY : py+M.NODE_H;
      const els=siku([[kx,ky],[kx,ym],[mx,ym],[mx,ya]],kls);
      if(!rapat&&pp.length===1) tempelSilang.push({el:els[2],id:sv.ortu[0],ym});
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
    n.className='node'+((!M.cetak&&o.id===L.root)?' aktif':'')+(riilId(o.id)?'':' pudar')+(genderDari(o)==='f'?' gf':' gm')+(o.status==='meninggal'?' wafat':'')+rd(o.id);
    n.dataset.id=o.id;
    if(g.dari[o.id] && g.dari[o.id]!==store.aktifId) n.dataset.akar=g.dari[o.id];
    n.style.left=pos.x+'px'; n.style.top=pos.y+'px';
    if(M.kartu) isiNodeKartu(n,o,orang,M); else {
    const wrap=document.createElement('div'); wrap.className='avatar-wrap';
    const av=document.createElement('div'); av.className='avatar';
    if(o.foto) av.style.backgroundImage=`url("${o.foto}")`; else av.textContent=inisial(o.nama);
    const dot=document.createElement('div'); dot.className='status-dot '+(o.status==='meninggal'?'meninggal':'hidup');
    wrap.appendChild(av); wrap.appendChild(dot);
    const nm=document.createElement('div'); nm.className='nama'+(o.nama?'':' kosong'); nm.textContent=o.nama||'Tanpa nama';
    const um=document.createElement('div'); um.className='umur';
    const u=hitungUmur(o);
    um.textContent = u!==null ? (u+' th'+(o.status==='meninggal'?' \u2020':'')) : formatTglSingkat(o.lahir);
    n.appendChild(wrap); n.appendChild(nm); n.appendChild(um); }
    if(modeGaris&&!M.cetak&&riilId(o.id)) pasangGeserNama(n,o,pos);
    target.appendChild(n);
  });
  // anak dengan 1 orang tua: garis menempel tepat di bawah teks nama/umur orang tua
  tempelSilang.forEach(t=>{
    const pos=posisi[t.id], nd=target.querySelector('.node[data-id="'+t.id+'"]'); if(!pos||!nd) return;
    const y1=Math.min(pos.y+(nd.offsetHeight||(M.cetak?112:62)), t.ym-4);
    t.el.style.top=y1+'px'; t.el.style.height=(t.ym-y1)+'px';
  });
  tempelSatu.forEach(t=>{
    const pos=posisi[t.id], nd=target.querySelector('.node[data-id="'+t.id+'"]'); if(!pos||!nd) return;
    const h=nd.offsetHeight||(M.cetak?112:62);
    const y1=Math.min(pos.y+h, t.rec.yAnak-t.rec.d-4);
    t.it.y1=y1; pasangGarisKeluarga(t.rec,t.rec.yAnak-t.rec.d);
  });
  if(!M.cetak) L.label.forEach(lb=>{
    const el=document.createElement('div'); el.className='label-blok';
    const aid=g.dari[lb.id], ak=aid&&store.akar.find(a=>a.id===aid);
    el.textContent=ak?ak.nama:'Keluarga lain';
    el.style.left=lb.x+'px'; el.style.top=(posisi[lb.id].y-22)+'px';
    target.appendChild(el);
  });
  return {w:maksX,h:maksY};
}
function bangunTunggal(akar){
  const ak=akar||akarAktif(), pm=fotoTerbaruPeta(), people={};
  Object.keys(data.people).forEach(id=>{
    const o=data.people[id], ft=pm[ak.id+'|'+id];
    people[id]=(ft&&ft!==o.foto) ? Object.assign({},o,{foto:ft}) : o;
  });
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
}
async function bukaLatar(id,akarId){
  const g=gabunganTampil; const o=g&&g.data.people[id]; const ak=store.akar.find(a=>a.id===akarId);
  if(!o||!ak) return;
  const ya=await konfirmasi(o.nama||'Tanpa nama','Orang ini tercatat di akar "'+ak.nama+'". Buka akar tersebut?','Buka akar');
  if(ya) gantiAkar(akarId);
}

// ===== Render =====
const canvas=$('canvas'), viewport=$('viewport');
function inisial(nama){ return (nama||'?').trim().split(/\s+/).filter(w=>/^[A-Za-z\u00C0-\u024F]/.test(w)).slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?'; }

let contentW=0, contentH=0;

// Metrik gambar: layar memakai ukuran biasa; cetak memakai lingkaran & teks lebih besar.
const M_LAYAR_BULAT={NODE_H:88,CX:44,CY:22,T:4,cetak:false};
const M_CETAK_BULAT={NODE_H:150,CX:50,CY:36,T:5,cetak:true};
const M_LAYAR_KARTU={NODE_H:112,CX:48,CY:30,T:4,cetak:false,kartu:true};
const M_CETAK_KARTU={NODE_H:150,CX:52,CY:41,T:5,cetak:true,kartu:true};
// Bentuk kartu (bulat / kartu ID) dipilih dari drawer, tersimpan di localStorage
const BENTUK_KEY='akarBentuk';
function bentukPilihan(){ try{ return localStorage.getItem(BENTUK_KEY)==='kartu'?'kartu':'bulat'; }catch(e){ return 'bulat'; } }
function mLayar(){ return bentukPilihan()==='kartu'?M_LAYAR_KARTU:M_LAYAR_BULAT; }
function mCetak(tanpaHp){ return bentukPilihan()==='kartu'?Object.assign({},M_CETAK_KARTU,{tanpaHp:!!tanpaHp}):M_CETAK_BULAT; }
// Isi kartu ID: foto kecil, "umur. nama", kecamatan, no. hp
function isiNodeKartu(n,o,P,M){
  n.classList.add('kt');
  const wrap=document.createElement('div'); wrap.className='avatar-wrap';
  const av=document.createElement('div'); av.className='avatar';
  if(o.foto) av.style.backgroundImage=`url("${o.foto}")`; else av.textContent=inisial(o.nama);
  const dot=document.createElement('div'); dot.className='status-dot '+(o.status==='meninggal'?'meninggal':'hidup');
  wrap.appendChild(av); wrap.appendChild(dot); n.appendChild(wrap);
  const wafat=o.status==='meninggal', u=hitungUmur(o);
  const nama=o.nama||'Tanpa nama';
  const nm=document.createElement('div'); nm.className='nama'+(o.nama?'':' kosong');
  nm.textContent = u!==null ? (u+' th'+(wafat?' \u2020 ':'. ')+nama) : nama;
  n.appendChild(nm);
  let kec=''; try{ const r=alamatEfektif(o,P); kec=(r&&r.alamat&&r.alamat.kec)||''; }catch(e){}
  kec=String(kec).replace(/^\s*(kecamatan|kec\.?)\s+/i,'').trim();
  if(kec){ const e=document.createElement('div'); e.className='kt-kec'; e.textContent=kec; n.appendChild(e); }
  if(o.hp && !wafat && !M.tanpaHp){ const e=document.createElement('div'); e.className='kt-hp'; e.textContent=o.hp; n.appendChild(e); }
}
function garisV(tg,x,y1,y2,T,kelas){
  const d=document.createElement('div'); d.className='line line-v'+(kelas?' '+kelas:'');
  d.style.cssText=`left:${x-T/2}px;top:${Math.min(y1,y2)}px;height:${Math.abs(y2-y1)}px;width:${T}px`;
  tg.appendChild(d); return d;
}
function garisH(tg,x1,y,x2,T,kelas){
  const d=document.createElement('div'); d.className='line line-h'+(kelas?' '+kelas:'');
  d.style.cssText=`left:${Math.min(x1,x2)-T/2}px;top:${y-T/2}px;width:${Math.abs(x2-x1)+T}px;height:${T}px`;
  tg.appendChild(d); return d;
}
function pasangGarisKeluarga(rec,yBus){
  rec.items.forEach(it=>{
    if(it.role==='b'){ it.el.style.top=(yBus-rec.T/2)+'px'; }
    else { const a=(it.role==='p')?it.y1:yBus, b=(it.role==='p')?yBus:it.y2; it.el.style.top=Math.min(a,b)+'px'; it.el.style.height=Math.abs(b-a)+'px'; }
  });
}

function gambarPohon(target,M){
  const riilId=id=>!infoLatar||infoLatar.riil.has(id);
  const posisi=hitungLayout();
  terapkanGeser(posisi,riilId);
  target.innerHTML='';

  // 1) kelompokkan anak per keluarga (pasangan orang tua yang sama)
  const keluarga={};
  Object.values(data.people).forEach(o=>{
    const pos=posisi[o.id]; if(!pos) return;
    const ids=[o.idAyah,o.idIbu].filter(id=>id&&posisi[id]);
    if(!ids.length) return;
    const kunci=ids.join('|');
    const fm=(keluarga[kunci]=keluarga[kunci]||{ids,anak:[],idAnak:[]}); fm.anak.push(pos); fm.idAnak.push(o.id);
  });
  const perGenAnak={};
  Object.values(keluarga).forEach(f=>{
    const ortu=f.ids.map(id=>posisi[id]);
    const ayahO=data.people[f.ids[0]];
    f.rapat=ortu.length===2 && ortu[0].gen===ortu[1].gen && (ayahO.idPasangan||[]).includes(f.ids[1]);
    f.midX=f.rapat ? (ortu[0].x+ortu[1].x)/2+M.CX : ortu[0].x+M.CX;
    const xs=f.anak.map(p=>p.x+M.CX).concat(f.midX);
    f.kiri=Math.min(...xs); f.kanan=Math.max(...xs);
    f.gen=f.anak[0].gen;
    (perGenAnak[f.gen]=perGenAnak[f.gen]||[]).push(f);
  });
  // 2) tiap keluarga di satu generasi dapat lajur sendiri bila rentang garisnya beririsan
  const jumlahLajur={};
  Object.keys(perGenAnak).forEach(g=>{
    const fams=perGenAnak[g];
    fams.sort((a,b)=>a.kiri-b.kiri||a.kanan-b.kanan);
    const lajur=[];
    fams.forEach(f=>{
      let k=lajur.findIndex(r=>f.kiri>r+8);
      if(k<0){ k=lajur.length; lajur.push(-Infinity); }
      lajur[k]=f.kanan; f.lajur=k;
    });
    jumlahLajur[g]=lajur.length;
  });
  // 3) tinggi tiap generasi: celah ke bawah melebar sesuai jumlah lajur yang dibutuhkan
  const daftarGen=[...new Set(Object.values(posisi).map(p=>p.gen))].sort((a,b)=>a-b);
  const yGen={}; let yy=0;
  daftarGen.forEach((g,i)=>{ if(i>0) yy+=M.NODE_H+GAP_GEN+(jumlahLajur[g]||0)*LAJUR_H; yGen[g]=yy; });
  Object.values(posisi).forEach(p=>{ p.y=yGen[p.gen]; });

  // 4) gambar garis: pasangan, lalu tiap keluarga (satu garis per keluarga)
  Object.values(data.people).forEach(o=>{
    const pos=posisi[o.id]; if(!pos) return;
    (o.idPasangan||[]).forEach(pid=>{
      const pos2=posisi[pid];
      if(pos2 && pid>o.id){
        const cerai=((o.statusPasangan||{})[pid]==='cerai');
        const lp=!(riilId(o.id)&&riilId(pid));
        garisH(target,pos.x+M.CX,pos.y+M.CY,pos2.x+M.CX,M.T,[cerai?'cerai':'',lp?'pudar':''].filter(Boolean).join(' '));
      }
    });
  });
  Object.values(keluarga).forEach(f=>{
    const ortu=f.ids.map(id=>posisi[id]);
    const yMulai=f.rapat ? ortu[0].y+M.CY : ortu[0].y+M.NODE_H;
    const yBus=f.anak[0].y-22-f.lajur*LAJUR_H;
    const ortuRiil=f.ids.some(riilId);
    const anakRiil=f.idAnak.map(id=>ortuRiil&&riilId(id));
    if(ortuRiil&&anakRiil.every(Boolean)){
      garisV(target,f.midX,yMulai,yBus,M.T);
      if(f.kanan>f.kiri) garisH(target,f.kiri,yBus,f.kanan,M.T);
      f.anak.forEach(p=>garisV(target,p.x+M.CX,yBus,p.y,M.T));
    } else {
      // keluarga campuran: dasar pudar penuh, lalu bagian yang nyata ditimpa garis tegas
      garisV(target,f.midX,yMulai,yBus,M.T,'pudar');
      if(f.kanan>f.kiri) garisH(target,f.kiri,yBus,f.kanan,M.T,'pudar');
      f.anak.forEach(p=>garisV(target,p.x+M.CX,yBus,p.y,M.T,'pudar'));
      if(anakRiil.some(Boolean)){
        const xs=[f.midX]; f.anak.forEach((p,i)=>{ if(anakRiil[i]) xs.push(p.x+M.CX); });
        const ka=Math.min(...xs), kb=Math.max(...xs);
        garisV(target,f.midX,yMulai,yBus,M.T);
        if(kb>ka) garisH(target,ka,yBus,kb,M.T);
        f.anak.forEach((p,i)=>{ if(anakRiil[i]) garisV(target,p.x+M.CX,yBus,p.y,M.T); });
      }
    }
  });

  let maksX=0,maksY=0;
  Object.values(data.people).forEach(o=>{
    const pos=posisi[o.id]; if(!pos) return;
    maksX=Math.max(maksX,pos.x+NODE_W); maksY=Math.max(maksY,pos.y+M.NODE_H);

    const n=document.createElement('div');
    n.className='node'+((!M.cetak&&o.id===rootAktif())?' aktif':'')+(riilId(o.id)?'':' pudar')+(genderDari(o)==='f'?' gf':' gm')+(o.status==='meninggal'?' wafat':'');
    n.dataset.id=o.id;
    if(infoLatar&&infoLatar.dari[o.id]&&infoLatar.dari[o.id]!==store.aktifId) n.dataset.akar=infoLatar.dari[o.id];
    n.style.left=pos.x+'px'; n.style.top=pos.y+'px';

    if(M.kartu) isiNodeKartu(n,o,data.people,M); else {
    const wrap=document.createElement('div'); wrap.className='avatar-wrap';
    const av=document.createElement('div'); av.className='avatar';
    if(o.foto) av.style.backgroundImage=`url("${o.foto}")`; else av.textContent=inisial(o.nama);
    const dot=document.createElement('div'); dot.className='status-dot '+(o.status==='meninggal'?'meninggal':'hidup');
    wrap.appendChild(av); wrap.appendChild(dot);

    const nm=document.createElement('div'); nm.className='nama'+(o.nama?'':' kosong'); nm.textContent=o.nama||'Tanpa nama';
    const um=document.createElement('div'); um.className='umur';
    const u=hitungUmur(o);
    um.textContent = u!==null ? (u+' th'+(o.status==='meninggal'?' †':'')) : formatTglSingkat(o.lahir);

    n.appendChild(wrap); n.appendChild(nm); n.appendChild(um);
    }
    target.appendChild(n);
  });
  return {w:maksX,h:maksY};
}
function render(pasKeLayarJuga){
  const u=gambarDenganLatar(canvas,mLayar());
  contentW=u.w; contentH=u.h;
  canvas.style.width=contentW+'px'; canvas.style.height=contentH+'px';
  if(pasKeLayarJuga) pasKeLayar(); else pasangTransform();
}

