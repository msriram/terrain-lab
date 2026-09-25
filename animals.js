// Terrain Lab adapter: same wildlife module as the public Field Notes demo.
import { createAnimalLayer, bindAnimalInteraction, randomRoster, SPECIES, PRESETS, LANDSCAPES, WORLD_SIGNATURES, rosterForWorld } from './assets/wildlife/animal-layer.js';

const host=window.TerrainLab,stage=document.querySelector('.stage-card');
const $=id=>document.getElementById(id);
if(host&&stage){
 const canvas=document.createElement('canvas');canvas.className='wildlife-layer';canvas.setAttribute('aria-label','Drag wildlife to safe habitat');stage.append(canvas);
 const projection=host.getState().projection;
 let roster=randomRoster(),lastTheme="earth",paused=false,layer,raf,last=performance.now(),lastRevision=-1,lastSent=0,gridSent=-1;
 let channel=null;try{channel=new BroadcastChannel('terrain-lab-wildlife');}catch{}
 const announce=text=>{$('rescueHelp').textContent=text;};
 try{
  layer=await createAnimalLayer({canvas,sampleTerrain:host.sampleTerrain,waterLevel:host.getState().waterLevel,roster,assetBase:new URL('./assets/wildlife/assets/animals/',import.meta.url).href});
  function rosterControls(){
   $('animalRoster').replaceChildren();
   roster.forEach((id,index)=>{
    const row=document.createElement('label');row.className='animal-row';const number=document.createElement('span');number.textContent=String(index+1).padStart(2,'0');
    const select=document.createElement('select');select.setAttribute('aria-label',`Animal slot ${index+1}`);
    for(const [key,s] of Object.entries(SPECIES)){const option=new Option(`${s.label} · ${s.habitat}`,key);select.add(option);}select.value=id;
    select.addEventListener('change',()=>{roster[index]=select.value;$('animalPreset').value='custom';layer.setRoster(roster);});row.append(number,select);$('animalRoster').append(row);
   });
  }
  rosterControls();
  $('animalPreset').addEventListener('change',event=>{roster=event.target.value==='random'?rosterForWorld(host.getState().theme,randomRoster()):[...PRESETS[event.target.value].roster];layer.setRoster(roster);rosterControls();});
  $('shuffleAnimals').addEventListener('click',()=>{roster=rosterForWorld(host.getState().theme,randomRoster());$('animalPreset').value='random';layer.setRoster(roster);rosterControls();});
  $('pauseAnimals').addEventListener('click',()=>{paused=!paused;$('pauseAnimals').textContent=paused?'Resume wildlife':'Pause wildlife';});
  const unbind=bindAnimalInteraction({element:canvas,layer,toUV:host.pointerUV,enabled:()=>!projection&&host.getState().enabled&&!host.getState().calibrating&&host.getState().tool==='rescue',onMessage:announce});
  const observer=new ResizeObserver(()=>{const r=stage.getBoundingClientRect();layer.resize(r.width,r.height);});observer.observe(stage);
  if(channel){
   channel.onmessage=({data})=>{
    if(data.type==='request'&&!projection){gridSent=-1;lastSent=0;}
    if(data.type==='state'&&projection){
     if(data.grid)host.applyGrid(data.grid);
     layer.applySnapshot(data.snapshot);paused=data.paused;if(data.scenery!==undefined)$('scenery').checked=data.scenery;if(data.atmosphere!==undefined)$('atmosphere').checked=data.atmosphere;
    }
   };
   if(projection)channel.postMessage({type:'request'});
  }
  function frame(now){
   const dt=(now-last)/1000;last=now;const state=host.getState();
   if(state.theme!==lastTheme){
    roster=rosterForWorld(state.theme,randomRoster());layer.setRoster(roster);rosterControls();$('animalPreset').value='random';lastTheme=state.theme;
   }
   canvas.style.transform=state.transform;
   canvas.style.pointerEvents=!projection&&!state.calibrating&&state.tool==='rescue'&&state.enabled?'auto':'none';
   layer.setOptions({enabled:state.enabled&&!state.calibrating,paused,pack:LANDSCAPES[state.theme]?.underwater?'atlantis':'earth',theme:state.theme,scenery:$('scenery').checked&&!state.calibrating,atmosphere:$('atmosphere').checked});
   if(lastRevision!==state.revision){layer.setTerrain(host.sampleTerrain,state.waterLevel);lastRevision=state.revision;}
   layer.update(dt);
   if(now-lastSent>100){
    lastSent=now;const stats=layer.getStats();
    $('wildlife-status').textContent=`${stats.active} WILDLIFE · ${stats.captures} EATEN · ${stats.waiting} REPOPULATING`;
    $('rescue-count').textContent=`${stats.rescues} RESCUED`;$('landscapeNote').textContent=stats.landscape.erupting?'Volcano active — lava and ash rising.':stats.landscape.caption+(WORLD_SIGNATURES[state.theme]?` Meet the ${SPECIES[WORLD_SIGNATURES[state.theme]].label}.`:'');
    if(channel&&!projection){const message={type:'state',snapshot:layer.getSnapshot(),paused,scenery:$('scenery').checked,atmosphere:$('atmosphere').checked};if(gridSent!==state.revision&&!state.live){message.grid=host.getGrid();gridSent=state.revision;}channel.postMessage(message);}
   }
   raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
  window.TerrainWildlife={layer,canvas};
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);unbind();observer.disconnect();channel?.close();layer.dispose();},{once:true});
 }catch(error){$('wildlife-status').textContent='Wildlife unavailable — terrain remains ready';announce(error.message);console.error(error);}
}
