// Explicit allowlist: never serve source catalog, tests, docs, SQL or secrets.
import {mkdir,copyFile,readdir,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist/js',{recursive:true});
for (const path of ['index.html','Apparel.html','apparel-landing.html','login.html','signup.html','scan.html','brand.png']) await copyFile(path,'dist/'+path);
for (const entry of await readdir('js',{withFileTypes:true})) if(entry.isFile() && /\.(?:js|mjs)$/.test(entry.name)) await copyFile('js/'+entry.name,'dist/js/'+entry.name);
console.log('Static assets prepared in dist; api/ still requires a separately configured server runtime.');
