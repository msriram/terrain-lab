(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const canvas = $("#terrain");
  const ctx = canvas.getContext("2d", { alpha:false });
  const controls = Object.fromEntries(["water","center","span","gamma","smoothing","contours","liveSensor","theme"].map(id => [id, $(`#${id}`)]));
  const grid = { width:640, height:480, values:new Float32Array(640*480) };
  const buffer = document.createElement("canvas"); buffer.width=640; buffer.height=480;
  const bufferCtx = buffer.getContext("2d");
  const image = bufferCtx.createImageData(640,480);
  let frames=0, fpsStarted=performance.now(), dirty=true, liveConnected=false, polling=false, lastDepth=null, apiBase=null, depthFailures=0;

  const themes = {
    earth:{name:"Earth",accent:"#b9df62",water:"#0b5790",colors:["#071d43","#136f9b","#d7c17b","#3d853c","#8daa50","#74563a","#c8bda7","#ffffff"]},
    mars:{name:"Mars",accent:"#ff865d",water:"#311a29",colors:["#1d0d0b","#512018","#8c3823","#c85c32","#e58b50","#b97b62","#d3b19b","#f0ddd0"]},
    atlantis:{name:"Atlantis",accent:"#62f2dc",water:"#041e49",colors:["#02091f","#063d67","#087f91","#10bcb2","#6ce2bf","#c0d796","#ead9a3","#fff1d2"]},
    alien:{name:"Alien world",accent:"#d5ff58",water:"#231653",colors:["#090514","#271153","#53218b","#9637a3","#d85a91","#dd9853","#b8e65a","#edffb8"]},
    moon:{name:"Moon",accent:"#e1e1dc",water:"#08090b",colors:["#050506","#202226","#3f4248","#64676b","#8c8e8d","#b3b1aa","#d5d1c7","#faf5e9"]},
    ice:{name:"Glacier",accent:"#c6f5ff",water:"#052a62",colors:["#020817","#07356e","#0877a4","#38b6cf","#8bdae6","#c9edf0","#e8f7f4","#ffffff"]},
    volcanic:{name:"Volcanic",accent:"#ffb33d",water:"#090509",colors:["#020202","#181012","#3f1714","#7c2015","#c23a18","#f27322","#ffc04b","#fff4b0"]},
    desert:{name:"Sahara",accent:"#f2c46d",water:"#174f68",colors:["#302011","#684322","#a76c34","#d99b52","#f0c879","#ead89c","#c29c63","#fff1cc"]},
    forest:{name:"Ancient forest",accent:"#8cda70",water:"#083b42",colors:["#061713","#0c3325","#175936","#2e7941","#58964d","#87a95d","#b7b978","#e2d4a2"]},
    coral:{name:"Coral reef",accent:"#ff8ba0",water:"#04347d",colors:["#031340","#075b9b","#09a8ae","#4cd2b0","#f2c75c","#f37d62","#d84d80","#ffd6b3"]},
    tundra:{name:"Tundra",accent:"#bad8cf",water:"#193d59",colors:["#15282d","#29494a","#526b59","#7c896c","#a7a58b","#c7c4ad","#e0ded1","#ffffff"]},
    synthwave:{name:"Synthwave",accent:"#ff4edb",water:"#080b46",colors:["#05021c","#15106b","#2835b8","#7147d6","#c73dbd","#ff4b85","#ff8956","#ffe071"]},
    thermal:{name:"Thermal",accent:"#ffe66b",water:"#020024",colors:["#000004","#160b39","#4b0c6b","#781c6d","#a52c60","#cf4446","#ed6925","#fb9b06","#f7d13d","#fcffa4"]},
    topographic:{name:"Classic topo",accent:"#e7d06b",water:"#245994",colors:["#123663","#287ba1","#cdbb78","#75934b","#436c38","#765d3f","#a98f6c","#eee5d0"]},
    infrared:{name:"Infrared",accent:"#ff4d6d",water:"#06000c",colors:["#000000","#260044","#67005c","#a80055","#e1303e","#ff7122","#ffc13b","#fff6b7"]},
    copper:{name:"Copper",accent:"#e7a46b",water:"#12100f",colors:["#0d0b0a","#2a1a15","#513026","#794731","#a76643","#cc8b60","#e2b38a","#f2dac0"]},
    emerald:{name:"Emerald city",accent:"#4cf59a",water:"#031a17",colors:["#020b0a","#073227","#075c42","#07865b","#19b775","#5bdb93","#adecad","#efffd1"]},
    candy:{name:"Candy land",accent:"#ff9fdd",water:"#4d3d9a",colors:["#453078","#7258b5","#b36bc1","#ed75ad","#ff9293","#ffb76e","#ffe18a","#fff6cf"]},
    deepsea:{name:"Abyss",accent:"#31d8d0",water:"#01030d",colors:["#000107","#020b24","#061d46","#073c62","#076b78","#169b91","#62c5a8","#caf5d7"]},
    monochrome:{name:"Field study",accent:"#ffffff",water:"#0b0b0b",colors:["#050505","#202020","#3e3e3e","#626262","#898989","#b0b0b0","#d6d6d6","#ffffff"]}
  };
  const hex = value => { const n=parseInt(value.slice(1),16); return [(n>>16)&255,(n>>8)&255,n&255]; };
  Object.values(themes).forEach(theme => { theme.rgb=theme.colors.map(hex); theme.waterRgb=hex(theme.water); });
  Object.entries(themes).forEach(([id,theme]) => controls.theme.add(new Option(theme.name,id)));

  function currentTheme(){ return themes[controls.theme.value] || themes.earth; }
  function resetTerrain(){ for(let y=0;y<480;y++)for(let x=0;x<640;x++){const nx=x/640,ny=y/480;const hill=Math.exp(-((nx-.67)**2+(ny-.42)**2)/.035)*.52;const ridge=Math.exp(-((nx-.27)**2/.02+(ny-.62)**2/.11))*.38;grid.values[y*640+x]=Math.max(0,Math.min(1,.28+hill+ridge+(Math.sin(nx*8.1+Math.cos(ny*6.3))*.5+Math.sin(ny*15.6-nx*3)*.25)*.08));}dirty=true;}
  function samplePalette(value){const colors=currentTheme().rgb;const scaled=Math.max(0,Math.min(.9999,value))*(colors.length-1);const index=Math.floor(scaled),t=scaled-index,a=colors[index],b=colors[Math.min(index+1,colors.length-1)];return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
  function renderField(){const water=+controls.water.value/100,showContours=controls.contours.checked,waterColor=currentTheme().waterRgb;for(let i=0;i<grid.values.length;i++){const elevation=grid.values[i];let color=elevation<0?[0,0,0]:samplePalette(elevation);if(elevation>=0&&elevation<water){const d=1-elevation/Math.max(.01,water);color=waterColor.map(v=>v*(.72+d*.28));}if(showContours&&elevation>=water&&Math.abs((elevation*14)%1-.5)>.455)color=color.map(v=>v*.48);const o=i*4;image.data[o]=color[0];image.data[o+1]=color[1];image.data[o+2]=color[2];image.data[o+3]=255;}bufferCtx.putImageData(image,0,0);dirty=false;}
  function resize(){const rect=canvas.getBoundingClientRect(),scale=Math.min(devicePixelRatio||1,2);if(document.body.classList.contains("projector")){canvas.width=1024;canvas.height=768;}else{canvas.width=Math.round(rect.width*scale);canvas.height=Math.round(rect.height*scale);}}
  function draw(time){if(dirty)renderField();ctx.imageSmoothingEnabled=true;ctx.drawImage(buffer,0,0,canvas.width,canvas.height);frames++;if(time-fpsStarted>700){$("#fps").value=`${Math.round(frames*1000/(time-fpsStarted))} fps`;frames=0;fpsStarted=time;}requestAnimationFrame(draw);}
  function depthBounds(){const span=Math.max(150,+controls.span.value),center=+controls.center.value;return {near:Math.max(250,center-span/2),far:Math.min(5000,center+span/2)};}
  function updateReadouts(){const {near,far}=depthBounds();$("#centerValue").value=`${controls.center.value} mm`;$("#spanValue").value=`${controls.span.value} mm`;$("#nearReadout").textContent=`Near ${Math.round(near)} mm`;$("#farReadout").textContent=`Far ${Math.round(far)} mm`;$("#gammaValue").value=`${(+controls.gamma.value/100).toFixed(2)}×`;$("#smoothingValue").value=`${controls.smoothing.value}%`;$("#waterValue").value=`${controls.water.value}%`;}
  function applyTheme(){const theme=currentTheme();document.documentElement.style.setProperty("--accent",theme.accent);$("#themePreview").style.background=`linear-gradient(90deg,${theme.colors.join(",")})`;dirty=true;saveSettings();}
  function saveSettings(){const state={};Object.entries(controls).forEach(([key,input])=>state[key]=input.type==="checkbox"?input.checked:input.value);localStorage.setItem("terrain-lab-settings",JSON.stringify(state));}
  function loadSettings(){try{const state=JSON.parse(localStorage.getItem("terrain-lab-settings"));if(!state)return;Object.entries(state).forEach(([key,value])=>{if(!controls[key])return;if(controls[key].type==="checkbox")controls[key].checked=value;else controls[key].value=value;});}catch(_){}}
  function autoFit(){if(!lastDepth)return;const valid=Array.from(lastDepth).filter(d=>d>250&&d<5000).sort((a,b)=>a-b);if(valid.length<100)return;const low=valid[Math.floor(valid.length*.03)],high=valid[Math.floor(valid.length*.97)];const span=Math.max(150,Math.min(3000,high-low));controls.center.value=Math.round((low+high)/20)*10;controls.span.value=Math.round(span/10)*10;updateReadouts();saveSettings();}
  function setSensorStatus(connected,message){liveConnected=connected;$("#statusText").textContent=message;$("#statusDot").classList.toggle("offline",!connected);$("#projector").disabled=!connected;$("#connectKinect").classList.toggle("connected",connected);$("#connectKinect").textContent=connected?"Disconnect":"Connect Kinect";}
  async function probe(url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),1200);try{const response=await fetch(`${url}/api/status?t=${Date.now()}`,{cache:"no-store",mode:"cors",targetAddressSpace:"loopback",signal:controller.signal});if(!response.ok)return null;return await response.json();}catch(_){return null;}finally{clearTimeout(timer);}}
  async function connectKinect(){if(apiBase){apiBase=null;depthFailures=0;setSensorStatus(false,"Not connected");resetTerrain();return;}const button=$("#connectKinect");button.disabled=true;button.textContent="Searching…";$("#statusText").textContent="Looking for local bridge";const bases=[];if(location.protocol==="http:"&&/^(localhost|127\.0\.0\.1)$/.test(location.hostname))bases.push(location.origin);for(let port=8080;port<=8099;port++)bases.push(`http://127.0.0.1:${port}`);let bridgeSeen=false;for(const base of [...new Set(bases)]){const status=await probe(base);if(!status)continue;bridgeSeen=true;if(status.connected){apiBase=base;depthFailures=0;setSensorStatus(true,"Kinect live");break;}}button.disabled=false;if(!apiBase)setSensorStatus(false,bridgeSeen?"Kinect not detected":"Start the local bridge");}
  async function pollDepth(){if(polling||!apiBase)return;polling=true;try{if(!controls.liveSensor.checked){setSensorStatus(false,"Live depth paused");return;}const response=await fetch(`${apiBase}/api/depth?t=${Date.now()}`,{cache:"no-store",mode:"cors",targetAddressSpace:"loopback"});if(!response.ok)throw new Error("No depth frame");lastDepth=new Uint16Array(await response.arrayBuffer());const {near,far}=depthBounds(),gamma=+controls.gamma.value/100,keep=+controls.smoothing.value/100,mix=1-keep;for(let i=0;i<grid.values.length&&i<lastDepth.length;i++){const depth=lastDepth[i];if(depth>0&&depth<=far+200){let elevation=Math.max(0,Math.min(1,(far-depth)/(far-near)));elevation=Math.pow(elevation,1/gamma);grid.values[i]=liveConnected&&grid.values[i]>=0?grid.values[i]*keep+elevation*mix:elevation;}else grid.values[i]=-1;}depthFailures=0;setSensorStatus(true,"Kinect live");dirty=true;}catch(_){if(++depthFailures>5){apiBase=null;setSensorStatus(false,"Connection lost");}}finally{polling=false;}}
  Object.entries(controls).forEach(([name,input])=>input.addEventListener("input",()=>{updateReadouts();if(name==="theme")applyTheme();else{dirty=true;saveSettings();}}));
  $("#connectKinect").addEventListener("click",connectKinect);$("#autoRange").addEventListener("click",autoFit);$("#collapseControls").addEventListener("click",()=>$("#controlsPanel").classList.add("collapsed"));$("#showControls").addEventListener("click",()=>$("#controlsPanel").classList.remove("collapsed"));
  $("#projector").addEventListener("click",()=>{document.body.classList.toggle("projector");document.documentElement.requestFullscreen?.().catch(()=>{});setTimeout(resize,80);});document.addEventListener("keydown",e=>{if(e.key.toLowerCase()==="f")$("#projector").click();if(e.key==="Escape"&&document.body.classList.contains("projector")){document.body.classList.remove("projector");setTimeout(resize,80);}});window.addEventListener("resize",resize);
  loadSettings();if(!controls.theme.value)controls.theme.value="earth";updateReadouts();applyTheme();resetTerrain();resize();setSensorStatus(false,"Not connected");setInterval(pollDepth,50);requestAnimationFrame(draw);
})();
