// Menggabungkan src/ menjadi www/index.html.  Pakai:  node build.js
// Jangan edit www/index.html langsung - file itu dibuat ulang oleh skrip ini.
const fs=require('fs'), path=require('path');
const baca=(d,ext)=>fs.readdirSync(path.join(__dirname,'src',d)).filter(f=>f.endsWith(ext)).sort()
  .map(f=>fs.readFileSync(path.join(__dirname,'src',d,f),'utf8')).join('');
const tpl=fs.readFileSync(path.join(__dirname,'src','index.template.html'),'utf8');
const hasil=tpl.replace('@@CSS@@\n',()=>baca('css','.css')).replace('@@JS@@\n',()=>baca('js','.js'));
fs.writeFileSync(path.join(__dirname,'www','index.html'),hasil);
console.log('www/index.html dibuat ('+hasil.length+' karakter)');
