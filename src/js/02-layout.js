// ===== Pasangan: mantan (cerai) dan pasangan sekarang =====
// Rantai pasangan ditata [mantan] - [orang] - [pasangan sekarang]: mantan di kiri, pasangan
// sekarang di kanan, semuanya berdampingan, jadi garis pernikahan tidak melewati kartu lain.
// Pada pasangan yang bercerai, "pusat" = pihak yang berada di garis keluarga orang utama
// (jalur ID sejalan, lalu punya orang tua tercatat, lalu laki-laki); pihak lainnya = "mantan".
function jalurSegmen(o){ return String(jalurDari(o)).split('.'); }
function sejalurDengan(a,b){
  const A=jalurSegmen(a), B=jalurSegmen(b), n=Math.min(A.length,B.length);
  for(let i=0;i<n;i++) if(A[i]!==B[i]) return false;
  return true;
}
function skorPusat(x,r){ return (r&&sejalurDengan(x,r)?4:0)+((x.idAyah||x.idIbu)?1:0)+(genderDari(x)==='m'?0.5:0); }
function statusCerai(a,b){ return ((a.statusPasangan||{})[b.id]==='cerai')||((b.statusPasangan||{})[a.id]==='cerai'); }
// Mantan yang menikah lagi: pasangan barunya (beserta anak mereka berdua dan keturunannya) tidak
// ditampilkan, karena sudah tidak ada ikatan keluarga.
function orangTersembunyi(people,root){
  const hasil=new Set(), r=people[root]; if(!r) return hasil;
  const anakMap=petaAnak(people);
  Object.values(people).forEach(o=>(o.idPasangan||[]).forEach(pid=>{
    const t=people[pid]; if(!t||pid<=o.id||!statusCerai(o,t)) return;
    const pusat=skorPusat(o,r)>=skorPusat(t,r)?o:t, mantan=(pusat===o)?t:o;
    (mantan.idPasangan||[]).forEach(sid=>{
      const sp=people[sid]; if(!sp||sid===pusat.id||sid===root) return;
      const antri=[sid];
      (anakMap[mantan.id]||[]).forEach(c=>{ const oc=people[c]; if(oc&&(oc.idAyah===sid||oc.idIbu===sid)) antri.push(c); });
      while(antri.length){
        const x=antri.pop(); if(hasil.has(x)||x===root) continue; hasil.add(x);
        (anakMap[x]||[]).forEach(c=>antri.push(c));
        ((people[x]||{}).idPasangan||[]).forEach(q=>{ if(q!==mantan.id&&q!==pusat.id) antri.push(q); });
      }
      let naik=[people[sid].idAyah,people[sid].idIbu];
      while(naik.length){ const x=naik.pop(); if(!x||!people[x]||hasil.has(x)||x===root) continue; hasil.add(x); naik.push(people[x].idAyah,people[x].idIbu); }
    });
  }));
  return hasil;
}
function hitungLayout(){
  // 1) Generasi (G) tiap orang lewat BFS dari orang utama.
  const gen={}; const antrian=[[rootAktif(),0]];
  const sembunyi=orangTersembunyi(data.people,rootAktif());
  while(antrian.length){
    const [id,g]=antrian.shift();
    if(gen[id]!==undefined || sembunyi.has(id)) continue;
    const o=data.people[id]; if(!o) continue;
    gen[id]=g;
    if(o.idAyah) antrian.push([o.idAyah,g-1]);
    if(o.idIbu) antrian.push([o.idIbu,g-1]);
    anakDari(id).forEach(a=>antrian.push([a.id,g+1]));
    (o.idPasangan||[]).forEach(pid=>antrian.push([pid,g]));
  }
  const semuaId=Object.keys(gen);
  const genMin=Math.min(...Object.values(gen));

  // 2) Kelompokkan jadi "unit": sendiri, atau berpasangan.
  const idKeUnit={};
  {
    const sudah=new Set(), rootO=data.people[rootAktif()];
    const pasanganTampil=id=>(data.people[id].idPasangan||[]).filter(pid=>semuaId.includes(pid));
    // yang punya paling banyak pasangan diproses lebih dulu, supaya jadi pusat rantai
    const urut=semuaId.slice().sort((a,b)=>pasanganTampil(b).length-pasanganTampil(a).length);
    urut.forEach(id=>{
      if(sudah.has(id)) return;
      const o=data.people[id];
      const calon=pasanganTampil(id).filter(pid=>!sudah.has(pid));
      const cerai=pid=>statusCerai(o,data.people[pid]);
      let ids, pusat=0;
      if(calon.length>=2){
        const mantan=calon.filter(cerai), kini=calon.filter(pid=>!cerai(pid));
        // semua mantan di kiri (yang terbaru tepat di sebelah orangnya), pasangan sekarang di kanan
        ids=[].concat(mantan,[id],kini);
        pusat=mantan.length;
        if(ids.length===2 && !mantan.length && genderDari(o)==='f' && genderDari(data.people[ids[1]])==='m') ids.reverse();
      } else if(calon.length===1){
        const pid=calon[0], t=data.people[pid];
        if(cerai(pid)){
          ids=(skorPusat(o,rootO)>=skorPusat(t,rootO)) ? [pid,id] : [id,pid]; // mantan di kiri
        } else {
          ids=[id,pid];
          if(genderDari(o)==='f' && genderDari(t)==='m') ids.reverse();
        }
      } else ids=[id];
      const unit={ids,pusat:(ids.length>=3?pusat:0)};
      unit.ids.forEach(uid=>{ idKeUnit[uid]=unit; sudah.add(uid); });
    });
  }

  function anakDariUnit(unit){
    const set=new Set();
    unit.ids.forEach(id=>anakDari(id).forEach(a=>{ if(gen[a.id]!==undefined) set.add(a.id); }));
    return [...set];
  }
  // Anak-anak sebuah unit, terurut dari TERTUA (kiri); umur tak diketahui paling kanan.
  function anakUnitTerurut(unit){
    const rawKids=anakDariUnit(unit);
    rawKids.sort((a,b)=>bandingLahir(data.people[a],data.people[b]));
    const hasil=[]; const sudahUnit=new Set();
    rawKids.forEach(id=>{
      const u=idKeUnit[id];
      if(!u||sudahUnit.has(u)) return;
      sudahUnit.add(u); hasil.push(u);
    });
    return hasil;
  }

  // 3) Urutan kiri-kanan unit "daun" lewat penelusuran dari orang utama.
  //    Aturan agar garis tidak saling menimpa: pada pasangan, keluarga asal anggota KIRI (suami)
  //    diletakkan di sisi kiri dan keluarga asal anggota KANAN (istri) di sisi kanan - jadi
  //    kedua sisi menyebar berlawanan seperti akar, tidak bersilangan. Saudara-saudara tiap
  //    orang ditaruh di sisi luar keluarganya masing-masing.
  const urutanDaun=[];
  function unitOrtu(id){
    const o=data.people[id];
    const pid=(o.idAyah&&gen[o.idAyah]!==undefined)?o.idAyah:((o.idIbu&&gen[o.idIbu]!==undefined)?o.idIbu:null);
    return pid?idKeUnit[pid]:null;
  }
  function daunDari(unit,lihat){
    lihat=lihat||new Set(); if(lihat.has(unit)) return []; lihat.add(unit);
    let hasil=[];
    anakUnitTerurut(unit).forEach(k=>{ if(k._ditempatkan) hasil=hasil.concat(daunDari(k,lihat)); });
    return hasil.length ? hasil : unit.ids.filter(id=>urutanDaun.includes(id));
  }
  function rentangUnit(unit){
    const idx=daunDari(unit).map(id=>urutanDaun.indexOf(id)).filter(i=>i>=0);
    return idx.length ? [Math.min(...idx),Math.max(...idx)] : null;
  }
  function indexAnggota(unit,pu){ // anggota unit yang merupakan anak dari pu (0 = kiri, 1 = kanan)
    const i=unit.ids.findIndex(id=>{ const o=data.people[id]; return pu.ids.includes(o.idAyah)||pu.ids.includes(o.idIbu); });
    return i<0?0:i;
  }
  // Letak anggota lain (pasangan) terhadap anggota yang "masuk" lewat keluarga pu:
  // 'kanan' = semua di kanan, 'kiri' = semua di kiri, 'tengah' = di kedua sisi.
  function sisiPasangan(unit,pu){
    const i=indexAnggota(unit,pu), n=unit.ids.length;
    return i===0 ? 'kanan' : (i===n-1 ? 'kiri' : 'tengah');
  }
  function asalBelum(unit,pu){ // ada anggota lain yang keluarga asalnya belum dipasang?
    return unit.ids.some(id=>{ const q=unitOrtu(id); return q && q!==pu && !q._ditempatkan; });
  }
  // "ujung" tiap blok daun: bila di sisi sebuah daun sudah ditempel keluarga lain, tempelan
  // berikutnya diletakkan di luar tempelan sebelumnya (bukan menyelip di antaranya).
  const ujungKiri={}, ujungKanan={};
  function ikuti(peta,id){ let n=0; while(peta[id]!==undefined && n++<500) id=peta[id]; return id; }

  function tempatkanUnit(unit,idxSisip){
    if(unit._ditempatkan){
      const r=rentangUnit(unit);
      return r ? r[1]+1 : (idxSisip!=null?idxSisip:urutanDaun.length);
    }
    unit._ditempatkan=true;
    const lenAwal=urutanDaun.length;
    const awal=idxSisip!=null?idxSisip:lenAwal;
    const anak=anakUnitTerurut(unit);
    if(!anak.length){
      unit.ids.forEach((id,i)=>urutanDaun.splice(awal+i,0,id));
    } else {
      const masuk=anak.find(a=>a._ditempatkan)||null;
      const rank0=a=>asalBelum(a,unit) ? ({kanan:2,kiri:0,tengah:1})[sisiPasangan(a,unit)] : 1;
      const rank=urutKetat ? (a=>1) : rank0; // tepi kiri / tengah / tepi kanan
      const daftar=anak.filter(a=>a!==masuk).sort((a,b)=>rank(a)-rank(b));
      const r=masuk?rentangUnit(masuk):null;
      // "masuk" = anak yang sudah ditempatkan lewat keluarga pasangannya; saudara-saudaranya
      // ditempel menempel di sisi luar pasangan itu, dan diingat sebagai blok `_blok`.
      const libre = !!(masuk && r && idxSisip!=null && (urutKetat || (sisiPasangan(masuk,unit)==='kanan' &&
        masuk.ids.every(id=>{ const q=unitOrtu(id); return !q||q===unit; }))));
      let pos0;
      if(libre){
        const kidMasuk=data.people[masuk.ids[indexAnggota(masuk,unit)]];
        const tepiKiri=daftar.filter(a=>rank(a)===0), tepiKanan=daftar.filter(a=>rank(a)===2);
        const tengah=daftar.filter(a=>rank(a)===1);
        const tua=tengah.filter(a=>bandingLahir(data.people[a.ids[indexAnggota(a,unit)]],kidMasuk)<0);
        const muda=tengah.filter(a=>tua.indexOf(a)<0);
        let ps=r[0];
        tepiKiri.concat(tua).forEach(a=>{ const nx=tempatkanUnit(a,ps); ps=Math.max(ps,nx); });
        const r2=rentangUnit(masuk); ps=r2?r2[1]+1:ps;
        muda.concat(tepiKanan).forEach(a=>{ const nx=tempatkanUnit(a,ps); ps=Math.max(ps,nx); });
        unit._urutAnak=tepiKiri.concat(tua,[masuk],muda,tepiKanan);
      } else {
      pos0 = (masuk && r && idxSisip==null)
        ? (sisiPasangan(masuk,unit)==='kanan' ? r[0] : r[1]+1)
        : awal;
      let pos=pos0; const lenSebelum=urutanDaun.length;
      daftar.forEach(a=>{ const nx=tempatkanUnit(a,pos); pos=Math.max(pos,nx); });
      const cnt=urutanDaun.length-lenSebelum;
      if(masuk && cnt>0) unit._blok=[urutanDaun[pos0],urutanDaun[pos0+cnt-1]];
      // urutan kiri-kanan anak (dipakai untuk menyusun urutan unit di tiap generasi)
      unit._urutAnak = masuk ? (sisiPasangan(masuk,unit)==='kanan' ? daftar.concat([masuk]) : [masuk].concat(daftar)) : daftar.slice();
      }
    }
    // Pasang keluarga asal tiap anggota. Anggota yang keluarganya sudah terpasang jadi patokan (k):
    // yang di kirinya dipasang di sisi kiri blok, yang di kanannya di sisi kanan. Tanpa patokan:
    // anggota kiri di sisi kiri, kanan di sisi kanan; pada rantai, orang pusat dipasang di sisi
    // kiri paling dalam, lalu para mantan di luarnya.
    const n=unit.ids.length;
    const k=unit.ids.findIndex(id=>{ const q=unitOrtu(id); return q&&q._ditempatkan; });
    const kiriList=[], kananList=[];
    unit.ids.forEach((id,i)=>{
      if(i===k) return;
      const kiri = k>=0 ? i<k : i<=unit.pusat;
      (kiri?kiriList:kananList).push(i);
    });
    kiriList.sort((a,b)=>b-a); // yang paling dekat ke tengah dulu
    const pasangKeluarga=(i,kiri)=>{
      const id=unit.ids[i];
      const q=unitOrtu(id); if(!q||q._ditempatkan) return;
      let blok=unit._blok;
      if(!blok){ const r=rentangUnit(unit); if(!r) return; blok=[urutanDaun[r[0]],urutanDaun[r[1]]]; }
      const sebelum=urutanDaun.length;
      if(kiri){
        const pos=urutanDaun.indexOf(ikuti(ujungKiri,blok[0]));
        tempatkanUnit(q,pos);
        if(urutanDaun.length>sebelum) ujungKiri[blok[0]]=urutanDaun[pos];
      } else {
        const pos=urutanDaun.indexOf(ikuti(ujungKanan,blok[1]))+1;
        tempatkanUnit(q,pos);
        const cnt=urutanDaun.length-sebelum;
        if(cnt>0) ujungKanan[blok[1]]=urutanDaun[pos+cnt-1];
      }
    };
    kiriList.forEach(i=>pasangKeluarga(i,true));
    kananList.forEach(i=>pasangKeluarga(i,false));
    return awal+(urutanDaun.length-lenAwal);
  }

  const unitUnik=[...new Set(Object.values(idKeUnit))];
  // kunci keluarga tiap unit (orang tua dari anggota yang punya orang tua tercatat)
  unitUnik.forEach(u=>{
    const pid=u.ids.find(id=>{ const o=data.people[id]; return o.idAyah||o.idIbu; });
    u._kunci = pid ? (data.people[pid].idAyah||'')+'|'+(data.people[pid].idIbu||'') : 'solo:'+u.ids[0];
  });
  tempatkanUnit(idKeUnit[rootAktif()],null);
  unitUnik.forEach(u=>{ if(!u._ditempatkan) tempatkanUnit(u,null); }); // sisa yang tak terhubung lewat jalur utama
  unitUnik.forEach(u=>{ u._rentang=rentangUnit(u); });

  const idealDaun={}; let kursor=0, kunciSebelum=null;
  urutanDaun.forEach(id=>{
    const k=idKeUnit[id]._kunci;
    if(kunciSebelum!==null && k!==kunciSebelum) kursor+=GAP_CABANG;
    idealDaun[id]=kursor; kursor+=NODE_W; kunciSebelum=k;
  });

  // 4) X akhir per generasi dari bawah ke atas. Unit ber-keturunan di tengah anak kandungnya;
  //    unit daun di posisi ideal. Bertabrakan -> digeser supaya kartu tidak bertumpuk.
  const x={};
  const perGen={};
  unitUnik.forEach(u=>{
    const g=Math.max(...u.ids.map(id=>gen[id]));
    (perGen[g]=perGen[g]||[]).push(u);
  });
  // Urutan unit di tiap generasi diturunkan dari generasi di atasnya (anak-anak tiap keluarga,
  // kiri ke kanan, sesuai penempatan sisi suami/istri), jadi garis ke atas tidak bersilangan.
  const urutGen={};
  {
    const gAsc=Object.keys(perGen).map(Number).sort((a,b)=>a-b);
    const mulaiR=u=>u._rentang?u._rentang[0]:0;
    const akhirR=u=>u._rentang?u._rentang[1]:0;
    gAsc.forEach((g,gi)=>{
      const lihat=new Set(); const hasil=[];
      if(gi>0) (urutGen[gAsc[gi-1]]||[]).forEach(P=>(P._urutAnak||[]).forEach(k=>{
        if(perGen[g].includes(k) && !lihat.has(k)){ lihat.add(k); hasil.push(k); }
      }));
      perGen[g].filter(u=>!lihat.has(u)).sort((a,b)=>mulaiR(a)-mulaiR(b)||akhirR(a)-akhirR(b)).forEach(u=>{
        const i=hasil.findIndex(h=>mulaiR(h)>mulaiR(u));
        if(i<0) hasil.push(u); else hasil.splice(i,0,u);
      });
      urutGen[g]=hasil;
    });
  }
  Object.keys(perGen).map(Number).sort((a,b)=>b-a).forEach(g=>{
    const units=urutGen[g]||perGen[g];
    let prevEnd=-Infinity, prevKunci=null;
    units.forEach(u=>{
      let tengah;
      if(idealDaun[u.ids[0]]!==undefined){
        tengah = idealDaun[u.ids[0]] + (u.ids.length-1)*NODE_W/2;
      } else {
        const rawKids=anakDariUnit(u).filter(id=>x[id]!==undefined);
        tengah = rawKids.length ? rawKids.reduce((s,id)=>s+x[id],0)/rawKids.length : 0;
      }
      const lebar=u.ids.length*NODE_W;
      let startX=tengah-(lebar-NODE_W)/2;
      const minStart=prevEnd+((prevKunci!==null && prevKunci!==u._kunci)?GAP_CABANG:0);
      if(startX<minStart) startX=minStart;
      u.ids.forEach((id,i)=>{ x[id]=startX+i*NODE_W; });
      prevEnd=startX+lebar; prevKunci=u._kunci;
    });
  });

  const minX=Math.min(...Object.values(x));
  Object.keys(x).forEach(id=>{ x[id]-=minX; });

  const posisi={};
  semuaId.forEach(id=>{ posisi[id] = { x:x[id], y:(gen[id]-genMin)*GEN_H, gen:gen[id] }; });
  return posisi;
}

