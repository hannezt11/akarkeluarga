// ===== Tema: terang / gelap (bawaan: terang) =====
const TEMA_KEY='akarTema';
function temaPilihan(){ try{ return localStorage.getItem(TEMA_KEY)==='gelap'?'gelap':'terang'; }catch(e){ return 'terang'; } }
function terapkanTema(){
  const p=temaPilihan();
  document.documentElement.dataset.tema=p;
  const e=$('temaTeks'); if(e) e.textContent=p==='gelap'?'Gelap':'Terang';
}
$('btnTema').addEventListener('click',()=>{
  try{ localStorage.setItem(TEMA_KEY,temaPilihan()==='gelap'?'terang':'gelap'); }catch(e){}
  terapkanTema();
});
terapkanTema();

// ===== Bentuk kartu: kartu (bawaan) / bulat =====
function terapkanBentuk(){ const e=$('bentukTeks'); if(e) e.textContent=bentukPilihan()==='kartu'?'Kartu (foto, nama, alamat, HP)':'Bulat'; }
$('btnBentuk').addEventListener('click',()=>{
  try{ localStorage.setItem(BENTUK_KEY,bentukPilihan()==='kartu'?'bulat':'kartu'); }catch(e){}
  terapkanBentuk(); render(true);
});
terapkanBentuk();

// ===== Info layar (untuk memeriksa skala di tiap ponsel) =====
(function(){
  const e=$('infoLayar'); if(!e) return;
  const w=Math.round(screen.width), a=window.LEBAR_ACUAN||0;
  e.textContent=w+' dp \u00b7 tata letak '+Math.round(window.innerWidth)+(a>0?' (acuan '+a+')':'');
})();
