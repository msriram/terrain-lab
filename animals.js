// Terrain Lab adapter: same wildlife module as the public Field Notes demo.
import { createAnimalLayer, bindAnimalInteraction, randomRoster, SPECIES, LANDSCAPES, WORLD_SIGNATURES, rosterForWorld, FIXTURES, createTerrain } from './assets/wildlife/animal-layer.js?v=density-20260928';

const host=window.TerrainLab,stage=document.querySelector('.stage-card');
const $=id=>document.getElementById(id);
if(host&&stage){
 const canvas=document.createElement('canvas');canvas.className='wildlife-layer';canvas.setAttribute('aria-label','Drag wildlife to safe habitat');stage.append(canvas);
 const projection=host.getState().projection;
 const labels=document.createElement("div");labels.className="behavior-labels";stage.append(labels);
 let roster=randomRoster(),lastTheme="earth",paused=false,layer,raf,last=performance.now(),lastRevision=-1,lastSent=0,gridSent=-1;
 let channel=null;try{channel=new BroadcastChannel('terrain-lab-wildlife');}catch{}
 const announce=text=>{$('rescueHelp').textContent=text;};
 try{
  layer=await createAnimalLayer({canvas,sampleTerrain:host.sampleTerrain,waterLevel:host.getState().waterLevel,roster,assetBase:new URL('./assets/wildlife/assets/animals/',import.meta.url).href});
  function updateDensity(){$('density-value').value=$('landscape-density').value+'%';layer.setOptions({density:Number($('landscape-density').value)/100});}
  $('landscape-density').addEventListener('input',updateDensity);
  function rosterControls(){
   $('animal-count').value=roster.length;labels.replaceChildren();
   $('animalRoster').replaceChildren();
   roster.forEach((id,index)=>{
    const row=document.createElement('label');row.className='animal-row';const number=document.createElement('span');number.textContent=String(index+1).padStart(2,'0');
    const select=document.createElement('select');select.setAttribute('aria-label',`Animal slot ${index+1}`);
    for(const [key,s] of Object.entries(SPECIES)){const option=new Option(`${s.label} · ${s.habitat}`,key);select.add(option);}select.value=id;
    select.addEventListener('change',()=>{roster[index]=select.value;$('animalPreset').value='custom';layer.setRoster(roster);});row.append(number,select);$('animalRoster').append(row);const tag=document.createElement('span');tag.className='behavior-tag';labels.append(tag);
   });
  }
  function updatePopulationChoices(theme){
   const select=$('animalPreset');select.replaceChildren(new Option('Balanced · '+LANDSCAPES[theme].label,'world'));
   for(const id of [...new Set(rosterForWorld(theme,randomRoster()))])select.add(new Option(SPECIES[id].label+' group',id));
   select.add(new Option('Custom roster','custom'));
  }
  function setPopulation(kind){
   const count=Math.max(0,Math.min(64,Math.round(Number($('animal-count').value)||0)));
   const base=SPECIES[kind]?[kind]:kind==='custom'&&roster.length?roster:rosterForWorld(host.getState().theme,randomRoster());
   roster=Array.from({length:count},(_,i)=>base[i%base.length]);layer.setRoster(roster);rosterControls();
  }
  updatePopulationChoices(host.getState().theme);setPopulation('world');
  $('animalPreset').addEventListener('change',event=>setPopulation(event.target.value));
  $('animal-count').addEventListener('change',()=>setPopulation($('animalPreset').value));
  $('shuffleAnimals').addEventListener('click',()=>setPopulation($('animalPreset').value));
  $('pauseAnimals').addEventListener('click',()=>{paused=!paused;$('pauseAnimals').textContent=paused?'Resume motion':'Pause motion';});
  FIXTURES.forEach((name,i)=>$('fixture').add(new Option(name,i)));
  const applyFixture=()=>host.setSample(createTerrain(Number($('fixture').value)));
  $('fixture').addEventListener('change',()=>{if(!host.getState().live)applyFixture();});
  $('resetTerrain').addEventListener('click',applyFixture);
  $('pointer-mode').addEventListener('change',()=>host.setTool($('pointer-mode').value));
  $('randomize-landscape').addEventListener('click',()=>{layer.randomizeLandscape();announce('Fresh landscape elements placed.');});
  stage.addEventListener('contextmenu',event=>event.preventDefault());
  stage.addEventListener('pointerdown',event=>{
   const state=host.getState();
   if(projection||state.calibrating||state.tool!=='elements'||![0,2].includes(event.button))return;
   const {u,v}=host.pointerUV(event);layer.editLandscape(u,v,event.button===2);
   event.preventDefault();event.stopPropagation();
  },{capture:true});
  $('capture').addEventListener('click',()=>{
   layer.update(0);const output=document.createElement('canvas');output.width=1024;output.height=768;
   const context=output.getContext('2d');if($('terrain-visible').checked)context.drawImage($('terrain'),0,0,1024,768);
   context.drawImage(canvas,0,0,1024,768);output.toBlob(blob=>{const link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download='terrain-lab-'+host.getState().theme+'.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  });
  const unbind=bindAnimalInteraction({element:canvas,layer,toUV:host.pointerUV,enabled:()=>!projection&&host.getState().enabled&&!host.getState().calibrating&&host.getState().tool==='rescue',onMessage:announce});
  const observer=new ResizeObserver(()=>{const r=stage.getBoundingClientRect();layer.resize(r.width,r.height);});observer.observe(stage);
  if(channel){
   channel.onmessage=({data})=>{
    if(data.type==='request'&&!projection){gridSent=-1;lastSent=0;}
    if(data.type==='state'&&projection){
     if(data.grid)host.applyGrid(data.grid);
     layer.applySnapshot(data.snapshot);paused=data.paused;if(data.scenery!==undefined)$('scenery').checked=data.scenery;
     if(data.display)for(const id of ['transparent','terrain-visible','labels'])if(typeof data.display[id]==='boolean')$(id).checked=data.display[id];
     if(Number.isFinite(data.density)){$('landscape-density').value=data.density;updateDensity();}
    }
   };
   if(projection)channel.postMessage({type:'request'});
  }
  function frame(now){
   const dt=(now-last)/1000;last=now;const state=host.getState();
   if(state.theme!==lastTheme){
    updatePopulationChoices(state.theme);if(!projection)setPopulation('world');lastTheme=state.theme;
   }
   canvas.style.transform=state.transform;
   labels.style.transform=state.transform;labels.hidden=projection||state.calibrating||!$('labels').checked||!state.enabled;
   $('fixture').disabled=state.live||state.calibrating||projection;
   $('terrain').style.visibility=state.calibrating||$('terrain-visible').checked?'visible':'hidden';
   layer.setOptions({transparent:$('transparent').checked});
   canvas.style.pointerEvents=!projection&&!state.calibrating&&state.tool==='rescue'&&state.enabled?'auto':'none';
   layer.setOptions({enabled:state.enabled&&!state.calibrating,paused,pack:LANDSCAPES[state.theme]?.underwater?'atlantis':'earth',theme:state.theme,scenery:$('scenery').checked&&!state.calibrating,atmosphere:$('scenery').checked});
   if(lastRevision!==state.revision){layer.setTerrain(host.sampleTerrain,state.waterLevel);lastRevision=state.revision;}
   layer.update(dt);
   layer.simulation.creatures.forEach((c,i)=>{const tag=labels.children[i];if(!tag)return;tag.hidden=!c.active;tag.style.left=c.u*100+'%';tag.style.top=c.v*100+'%';tag.textContent=SPECIES[c.species].label+' · '+c.mode;});
   if(now-lastSent>100){
    lastSent=now;const stats=layer.getStats();
    $('wildlife-status').textContent=state.theme==='cyberpunk'?`${stats.active} DRONES · ${stats.captures} ARRESTS · ${stats.waiting} RETURNING`:`${stats.active} WILDLIFE · ${stats.captures} EATEN · ${stats.waiting} REPOPULATING`;
    $('rescue-count').textContent=`${stats.rescues} RESCUED`;$('landscapeNote').textContent=stats.landscape.erupting?'Volcano active — lava and ash rising.':stats.landscape.caption+(WORLD_SIGNATURES[state.theme]?` Meet the ${SPECIES[WORLD_SIGNATURES[state.theme]].label}.`:'');
    if(channel&&!projection){const message={type:'state',snapshot:layer.getSnapshot(),paused,scenery:$('scenery').checked,atmosphere:$('scenery').checked,density:Number($('landscape-density').value),display:Object.fromEntries(['transparent','terrain-visible','labels'].map(id=>[id,$(id).checked]))};if(gridSent!==state.revision&&!state.live){message.grid=host.getGrid();gridSent=state.revision;}channel.postMessage(message);}
   }
   raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
  window.TerrainWildlife={layer,canvas};
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);unbind();observer.disconnect();channel?.close();layer.dispose();},{once:true});
 }catch(error){$('wildlife-status').textContent='Wildlife unavailable — terrain remains ready';announce(error.message);console.error(error);}
}
