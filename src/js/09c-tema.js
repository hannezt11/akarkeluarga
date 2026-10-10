// ===== Tema: otomatis (ikut sistem) / terang / gelap =====
const TEMA_KEY='akarTema';
function temaPilihan(){ try{ return localStorage.getItem(TEMA_KEY)||'otomatis'; }catch(e){ return 'otomatis'; } }
function terapkanTema(){
  const p=temaPilihan();
  const gelap=p==='gelap'||(p==='otomatis'&&!!window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.tema=gelap?'gelap':'terang';
  const e=$('temaTeks'); if(e) e.textContent={otomatis:'Otomatis (ikut sistem)',terang:'Terang',gelap:'Gelap'}[p]||'';
}
$('btnTema').addEventListener('click',()=>{
  const urut=['otomatis','terang','gelap'], n=urut[(urut.indexOf(temaPilihan())+1)%urut.length];
  try{ localStorage.setItem(TEMA_KEY,n); }catch(e){}
  terapkanTema();
});
try{ matchMedia('(prefers-color-scheme: dark)').addEventListener('change',terapkanTema); }catch(e){}
terapkanTema();
