// One build for the showcase, sandbox, Field Notes demo, and portable wildlife.
import { spawnSync } from 'node:child_process';
import { mkdir,cp,rm,writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const demo=path.join(root,'standalone-animal-demo');
for(const script of ['build','build:layer']){
 const result=spawnSync('npm',['run',script],{cwd:demo,stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
}
const out=path.join(root,'_site');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
// Commit this generated local runtime so Kinect rigs still run without npm.
await mkdir(path.join(root,'assets/wildlife'),{recursive:true});
await cp(path.join(demo,'dist-layer'),path.join(root,'assets/wildlife'),{recursive:true});
for(const name of ['index.html','app.js','animals.js','styles.css','control-icon.css','sandbox','guide','website'])await cp(path.join(root,name),path.join(out,name),{recursive:true});
await mkdir(path.join(out,'assets'),{recursive:true});
await cp(path.join(root,'assets/wildlife'),path.join(out,'assets/wildlife'),{recursive:true});
await cp(path.join(demo,'dist'),path.join(out,'wildlife'),{recursive:true});
await mkdir(path.join(out,'documentation'),{recursive:true});
await cp(path.join(demo,'docs'),path.join(out,'documentation'),{recursive:true});
await writeFile(path.join(out,'.nojekyll'),'');
console.log('Site ready in _site/: showcase / sandbox/ / wildlife/ / guide/');
