// Menggabungkan src/ menjadi www/index.html.  Pakai:  node build.js
// Jangan edit www/index.html langsung - file itu dibuat ulang oleh skrip ini.
const fs=require('fs'), path=require('path');
const baca=(d,ext)=>fs.readdirSync(path.join(__dirname,'src',d)).filter(f=>f.endsWith(ext)).sort()
  .map(f=>fs.readFileSync(path.join(__dirname,'src',d,f),'utf8')).join('');
const tpl=fs.readFileSync(path.join(__dirname,'src','index.template.html'),'utf8');
// Nomor versi: di GitHub Actions diisi dari nomor build (env VERSI); build lokal memakai teks "lokal".
// Font Roboto & Lora (paket @fontsource) ditanam ke dalam index.html sebagai data base64 supaya sama di semua ponsel & ikut tertanam di PDF.
function fontFace(){
  const daftar=[['roboto','Roboto',[400,500,700]],['lora','Lora',[400,700]]]; let css='', hilang=0;
  daftar.forEach(([pkg,nama,bobot])=>bobot.forEach(b=>{
    const f=path.join(__dirname,'node_modules','@fontsource',pkg,'files',pkg+'-latin-'+b+'-normal.woff2');
    if(!fs.existsSync(f)){ hilang++; return; }
    css+="@font-face{font-family:'"+nama+"';font-style:normal;font-weight:"+b+";font-display:block;src:url(data:font/woff2;base64,"+fs.readFileSync(f).toString('base64')+") format('woff2');}\n";
  }));
  if(hilang) console.warn('PERINGATAN: '+hilang+' file font tidak ditemukan, app memakai font sistem. Jalankan: npm install');
  return css;
}
const VERSI=String(process.env.VERSI||'lokal').replace(/[^0-9A-Za-z._-]/g,'');
const hasil=tpl.replace('@@CSS@@\n',()=>fontFace()+baca('css','.css')).replace('@@JS@@\n',()=>baca('js','.js')).replace('@@VERSI@@',()=>VERSI);
fs.writeFileSync(path.join(__dirname,'www','index.html'),hasil);
console.log('www/index.html dibuat ('+hasil.length+' karakter)');
