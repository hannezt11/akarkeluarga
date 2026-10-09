// ===== Tampilan gabungan: akar terpilih tampil nyata, akar lain pudar sebagai latar =====
// Data tiap akar TIDAK digabung. Saat menggambar dibuat data sementara: orang di akar aktif
// memakai ID aslinya, orang di akar lain diberi awalan "idAkar~". Orang yang ditandai
// "sama dengan" (p.sama={a:idAkar,i:idOrang}) dilebur jadi satu supaya pohonnya tersambung.
let infoLatar=null, gabunganTampil=null;
const PERAN=[['saya','Saya'],['pasangan','Pasangan saya'],['ayah','Ayah saya'],['ibu','Ibu saya'],['mertuaAyah','Ayah mertua'],['mertuaIbu','Ibu mertua']];
function idGabunganAktif(){
  const g=(store.gabung||[]).filter(id=>store.akar.some(a=>a.id===id));
  return (g.length>1 && g.includes(store.aktifId)) ? g : [];
}
function jumlahLatar(){ const g=idGabunganAktif(); return g.length ? g.length-1 : 0; }
function jumlahTautanGabung(){
  const g=(store.gabung||[]).filter(id=>store.akar.some(a=>a.id===id)); let n=0;
  const adaSaya=g.filter(aid=>{ const a=store.akar.find(x=>x.id===aid); return a.peran&&a.peran.saya&&a.data.people[a.peran.saya]; }).length;
  if(adaSaya>=2) n+=adaSaya-1;
  g.forEach(aid=>{
    const a=store.akar.find(x=>x.id===aid);
    Object.values(a.data.people).forEach(p=>{
      if(p.sama && p.sama.a!==aid && g.includes(p.sama.a)){
        const t=store.akar.find(x=>x.id===p.sama.a);
        if(t && t.data.people[p.sama.i]) n++;
      }
    });
  });
  return n;
}
// Orang yang sama di akar berbeda (lewat "Peran saya" atau "Sama dengan") memakai foto TERBARU.
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
function bangunGabungan(){
  const ids=idGabunganAktif(); if(!ids.length) return null;
  const urut=[store.aktifId].concat(ids.filter(id=>id!==store.aktifId));
  const akars=urut.map(id=>store.akar.find(a=>a.id===id));
  // gugus "orang yang sama" (union-find); satu gugus tidak boleh memuat dua orang dari akar yang sama
  const induk={}, isi={};
  const kunci=(aid,pid)=>aid+'|'+pid;
  const cari=k=>{ while(induk[k]!==k){ induk[k]=induk[induk[k]]; k=induk[k]; } return k; };
  akars.forEach(a=>Object.values(a.data.people).forEach(p=>{ const k=kunci(a.id,p.id); induk[k]=k; isi[k]=new Set([a.id]); }));
  const satukan=(k1,k2)=>{
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
  }));
  const mid={}, asal={}, dari={}, people={};
  const petaFoto=fotoTerbaruPeta();
  const idGab=(aid,pid)=>mid[cari(kunci(aid,pid))];
  akars.forEach(a=>Object.values(a.data.people).forEach(p=>{
    const r=cari(kunci(a.id,p.id));
    if(mid[r]===undefined){
      const m=(a.id===store.aktifId) ? p.id : (a.id+'~'+p.id);
      const c=Object.assign({},p);
      c.gender=genderDari(p); c.id=m; c.idAyah=null; c.idIbu=null; c.idPasangan=[]; c.statusPasangan={}; delete c.sama;
      mid[r]=m; people[m]=c; asal[m]=new Set(); dari[m]=a.id;
    } else {
      const c=people[mid[r]];
      ['nama','foto','lahir','wafat','alamat','anakKe','hp','email'].forEach(f=>{ if(!c[f]&&p[f]) c[f]=p[f]; });
    }
    asal[mid[r]].add(a.id);
  }));
  akars.forEach(a=>Object.values(a.data.people).forEach(p=>{
    const m=idGab(a.id,p.id), c=people[m];
    const ft=petaFoto[a.id+'|'+p.id]; if(ft) c.foto=ft;
    const peta=x=>(x&&a.data.people[x]) ? idGab(a.id,x) : null;
    if(!c.idAyah) c.idAyah=peta(p.idAyah);
    if(!c.idIbu) c.idIbu=peta(p.idIbu);
    (p.idPasangan||[]).forEach(x=>{
      const t=peta(x); if(!t||t===m) return;
      if(!c.idPasangan.includes(t)) c.idPasangan.push(t);
      const st=(p.statusPasangan||{})[x]; if(st&&!c.statusPasangan[t]) c.statusPasangan[t]=st;
    });
  }));
  Object.values(people).forEach(c=>{
    c.idPasangan.slice().forEach(t=>{
      const o=people[t]; if(!o) return;
      if(!o.idPasangan.includes(c.id)) o.idPasangan.push(c.id);
      if(c.statusPasangan[t]&&!o.statusPasangan[c.id]) o.statusPasangan[c.id]=c.statusPasangan[t];
    });
  });
  Object.values(people).forEach(c=>{
    if(c.idAyah===c.id) c.idAyah=null;
    if(c.idIbu===c.id) c.idIbu=null;
    if(c.idAyah && c.idAyah===c.idIbu) c.idIbu=null;
    if(!Object.keys(c.statusPasangan).length) delete c.statusPasangan;
  });
  const riil=new Set(); Object.keys(people).forEach(m=>{ if(asal[m].has(store.aktifId)) riil.add(m); });
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
  return {data:{people},riil,dari,saya:sayaM};
}
