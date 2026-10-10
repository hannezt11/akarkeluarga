// ===== Cari nama di pohon + sorot jalur =====
function cariTerbuka(){ return !$('cariOverlay').classList.contains('hidden'); }
function bukaCari(){ $('fCari').value=''; isiCari(); $('cariOverlay').classList.remove('hidden'); setTimeout(()=>$('fCari').focus(),80); }
function tutupCari(){ $('cariOverlay').classList.add('hidden'); $('fCari').blur(); }
function isiCari(){
  const q=normCari($('fCari').value), w=$('cariHasil'); w.innerHTML='';
  const daftar=[...canvas.querySelectorAll('.node')].map(n=>({
    id:n.dataset.id, nama:(n.querySelector('.nama.kosong')?'':(n.querySelector('.nama')||{}).textContent)||'', umur:(n.querySelector('.umur')||{}).textContent||'',
    latar:n.classList.contains('pudar'), akar:n.dataset.akar
  })).filter(x=>!q||normCari(x.nama).includes(q)).sort((a,b)=>(a.latar-b.latar)||a.nama.localeCompare(b.nama,'id'));
  if(!daftar.length){ const h=document.createElement('div'); h.className='sama-hint'; h.textContent='Tidak ada nama yang cocok di pohon yang sedang tampil.'; w.appendChild(h); return; }
  daftar.slice(0,60).forEach(x=>{
    const d=document.createElement('div'); d.className='cari-baris'; d.dataset.id=x.id;
    const n=document.createElement('b'); n.textContent=x.nama||'Tanpa nama';
    const ak=x.akar&&akarDari(x.akar);
    const s=document.createElement('small'); s.textContent=[x.umur,ak?('akar '+ak.nama):''].filter(Boolean).join(' · ');
    d.appendChild(n); d.appendChild(s); w.appendChild(d);
  });
}
$('btnCari').addEventListener('click',bukaCari);
$('fCari').addEventListener('input',isiCari);
$('cariOverlay').addEventListener('click',e=>{ if(e.target===$('cariOverlay')) tutupCari(); });
$('cariHasil').addEventListener('click',e=>{ const r=e.target.closest('.cari-baris'); if(!r) return; tutupCari(); pusatkanKe(r.dataset.id); });
function aturChipSorot(){
  const o=sorotId&&data.people[sorotId];
  $('chipSorot').classList.toggle('hidden',!o);
  if(o) $('chipSorotTeks').textContent='Menyorot: '+(o.nama||'Tanpa nama');
}
function hapusSorot(){ sorotId=null; aturChipSorot(); render(false); }
$('chipSorotX').addEventListener('click',hapusSorot);
