// ===== Penataan ketat: urutan lahir tidak digeser, garis satu keluarga tidak bersilangan =====
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
function cariDx(nodes,dx0,ocup,batas,pref){
  const MARGIN=12, STEP=12;
  const bebas=dx=>nodes.every(n=>{
    const a=n.x+dx, b=a+NODE_W;
    if(a<batas[0]||b>batas[1]) return false;
    return !(ocup[n.gen]||[]).some(iv=>a<iv[1]+MARGIN && b>iv[0]-MARGIN);
  });
  if(bebas(dx0)) return dx0;
  const maks=batas[1]-batas[0];
  if(pref){ // ujung rantai pasangan: cari ruang ke sisi luar dulu, baru ke sisi sebaliknya
    for(let d=STEP; d<=maks; d+=STEP){ if(bebas(dx0+pref*d)) return dx0+pref*d; }
    for(let d=STEP; d<=maks; d+=STEP){ if(bebas(dx0-pref*d)) return dx0-pref*d; }
    return null;
  }
  for(let d=STEP; d<=maks; d+=STEP){ if(bebas(dx0+d)) return dx0+d; if(bebas(dx0-d)) return dx0-d; }
  return null;
}
function susunBlok(g){
  const semua=g.data.people, idsSemua=Object.keys(semua);
  if(!idsSemua.length) return null;
  const rootAkar=(g.saya&&semua[g.saya])?g.saya:(semua[ROOT_ID]?ROOT_ID:idsSemua[0]);
  const sembunyi=orangTersembunyi(semua,rootAkar);
  const ids=idsSemua.filter(id=>!sembunyi.has(id));
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
    if(jang){
      // Ujung rantai pasangan [mantan] - [orang] - [pasangan sekarang]: keluarga asalnya diletakkan di sisi
      // luar (mantan -> kiri, pasangan sekarang -> kanan) dan boleh melebar keluar dari lebar blok utama.
      // Pasangan biasa (tanpa rantai) tidak berubah.
      const spJ=(semua[jang].idPasangan||[]).filter(q=>akhir[q]);
      const pusatRantai=spJ.find(q=>(semua[q].idPasangan||[]).filter(z=>akhir[z]).length>=2);
      let pref=0, batasPakai=batas;
      if(pusatRantai){
        pref=akhir[pusatRantai].x>akhir[jang].x ? -1 : 1;
        const lebarBlok=Math.max(...nodes.map(n=>n.x))-Math.min(...nodes.map(n=>n.x))+NODE_W+12;
        batasPakai=[batas[0]-(pref<0?lebarBlok:0), batas[1]+(pref>0?lebarBlok:0)];
      }
      dx=cariDx(nodes,akhir[jang].x-pos[jang].x,ocup,batasPakai,pref);
    }
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
// Garis datar tiap keluarga menempati "lajur" di celah antar generasi. Urutan lajur menentukan garis mana
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
