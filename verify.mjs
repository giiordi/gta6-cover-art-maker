import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile,readdir,rm,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root=fileURLToPath(new URL('.',import.meta.url));
const temp=resolve(root,'.verify');
const chromePath='/home/hatch/workspace/.verify-tmp/chrome-linux64/chrome';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
await mkdir(resolve(temp,'exports'),{recursive:true});
const processes=[];let socket;
const report={status:'running',requests:[],exports:[],checks:[]};
async function poll(fn,label){let last;for(let i=0;i<80;i++){try{const result=await fn();if(result)return result;}catch(e){last=e;}await pause(100);}throw new Error(label+(last?': '+last.message:''));}
function launch(command,args){const p=spawn(command,args,{cwd:root,stdio:['ignore','pipe','pipe']});processes.push(p);let output='';p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>output+=b);p.on('error',e=>output+=e.message);return{process:p,output:()=>output};}
try{
  const server=launch(process.execPath,['serve.ts']);
  try{await poll(async()=>{const r=await fetch('http://127.0.0.1:8080/');return r.ok;},'Local server did not start');}catch(e){throw new Error(e.message+'\n'+server.output());}
  const browser=launch(chromePath,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-crashpad-for-testing','--no-first-run','--disable-background-networking','--remote-debugging-port=9222','--user-data-dir='+resolve(temp,'browser'),'about:blank']);
  let targets;try{targets=await poll(async()=>{const r=await fetch('http://127.0.0.1:9222/json/list');return r.json();},'Chrome CDP did not start');}catch(e){throw new Error(e.message+'\n'+browser.output());}
  const target=targets.find(t=>t.type==='page');assert(target,'Chrome page target exists');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
  let id=0;const pending=new Map();const errors=[];
  socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const job=pending.get(m.id);pending.delete(m.id);if(m.error)job.reject(new Error(JSON.stringify(m.error)));else job.resolve(m.result);}else if(m.method==='Network.requestWillBeSent'){report.requests.push(m.params.request.url);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);};
  function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));});}
  async function evaluate(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
  await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Network.enable');
  await cdp('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:resolve(temp,'exports')});
  async function navigate(query,w=1280,h=1000){await cdp('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:false});await cdp('Page.navigate',{url:'http://127.0.0.1:8080/'+query});await poll(()=>evaluate('window.ready ? window.ready.then(()=>Boolean(window.studio && studio.photos.length===2)) : false'),'Studio ready');}
  await navigate('?shot=editor');
  const header=await evaluate("Array.from(document.querySelectorAll('header button'),b=>b.textContent.trim())");assert.deepEqual(header,['New','Choose your photo','Export PNG']);report.checks.push('Header contains exactly the required three buttons in order');
  const doc=await cdp('DOM.getDocument');const input=await cdp('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#file'});
  await cdp('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[resolve(root,'app/samples/boulevard.jpg')]});await poll(()=>evaluate('studio.photos.length===3'),'Photo input upload');
  assert(await evaluate('studio.state.panels.every(p=>p.photo===2)'));report.checks.push('Real file input upload decodes a local photo and fills panels');
  const base64=(await readFile(resolve(root,'app/samples/pier.jpg'))).toString('base64');
  await evaluate(`(async()=>{const b=Uint8Array.from(atob('${base64}'),c=>c.charCodeAt(0));const f=new File([b],'dropped-pier.jpg',{type:'image/jpeg'});const dt=new DataTransfer();dt.items.add(f);document.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}));})()`);
  await poll(()=>evaluate('studio.photos.length===4'),'Drag-and-drop photo import');report.checks.push('Drag-and-drop imports a second local photo');
  await evaluate("document.querySelector('#caption').value='MIDNIGHT\\nRUN';document.querySelector('#caption').dispatchEvent(new Event('input'));");assert.equal(await evaluate('studio.state.caption'),'MIDNIGHT\nRUN');
  // Exercise genuine pointer gestures on the artboard.
  const coords=await evaluate(`(()=>{const r=document.querySelector('#handles').getBoundingClientRect();const p=studio.state.panels[0];return{x:r.left+(p.x+p.w*.5)*r.width,y:r.top+(p.y+p.h*.5)*r.height};})()`);
  const before=await evaluate('JSON.stringify(studio.state.panels[0])');
  await cdp('Input.dispatchMouseEvent',{type:'mousePressed',x:coords.x,y:coords.y,button:'left',clickCount:1});await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:coords.x+12,y:coords.y+9,button:'left',buttons:1});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:coords.x+12,y:coords.y+9,button:'left',clickCount:1});assert.notEqual(await evaluate('JSON.stringify(studio.state.panels[0])'),before);
  const corner=await evaluate(`(()=>{const r=document.querySelector('#handles').getBoundingClientRect(),p=studio.state.panels[0];return{x:r.left+(p.x+p.w)*r.width,y:r.top+(p.y+p.h)*r.height};})()`);
  const oldWidth=await evaluate('studio.state.panels[0].w');
  await cdp('Input.dispatchMouseEvent',{type:'mousePressed',...corner,button:'left',clickCount:1});await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:corner.x+10,y:corner.y+10,button:'left',buttons:1});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:corner.x+10,y:corner.y+10,button:'left',clickCount:1});assert.notEqual(await evaluate('studio.state.panels[0].w'),oldWidth);report.checks.push('Caption input, panel move, and panel corner resize work');
  for(const [format,w,h] of [['square',1080,1080],['portrait',1080,1350],['wide',1920,1080]]){
    await evaluate(`studio.setFormat('${format}');document.querySelector('#export').click()`);
    const path=resolve(temp,'exports','afterglow-'+format+'.png');
    const png=await poll(async()=>{const bytes=await readFile(path);return bytes.length>32?bytes:null;},'PNG download '+format);
    assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.toString('ascii',12,16),'IHDR');assert.equal(png.readUInt32BE(16),w);assert.equal(png.readUInt32BE(20),h);report.exports.push({format,width:w,height:h,bytes:png.length});
  }
  const scenes=JSON.parse(await readFile(resolve(root,'shots.json'),'utf8'));
  // Remove starter screenshots only once genuine replacements can be produced.
  for(const name of await readdir(resolve(root,'screenshots')))if(/\.(jpg|png)$/i.test(name))await rm(resolve(root,'screenshots',name));
  for(const scene of scenes){
    await navigate(scene.query,scene.w,scene.h);
    let jpeg;
    if(scene.name==='2-editor.jpg'){
      const capture=await cdp('Page.captureScreenshot',{format:'jpeg',quality:82,captureBeyondViewport:false});jpeg=Buffer.from(capture.data,'base64');
    }else{
      // This is the exact PNG returned by the app's export path, resized only.
      const data=await evaluate('studio.exportPNG()');
      jpeg=Buffer.from((await evaluate(`(async()=>{const image=new Image();image.src=${JSON.stringify(data)};await image.decode();const c=document.createElement('canvas');c.width=${scene.w};c.height=${scene.h};c.getContext('2d').drawImage(image,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.82).split(',')[1];})()`)),'base64');
    }
    assert(jpeg.length<=262144,scene.name+' is within 256 KiB');await writeFile(resolve(root,'screenshots',scene.name),jpeg);
  }
  assert.equal(errors.length,0,'No browser JavaScript exceptions');
  const external=report.requests.filter(url=>!url.startsWith('http://127.0.0.1:8080/')&&!url.startsWith('data:'));assert.deepEqual(external,[],'All requests are local or data URIs');report.checks.push('No external network requests; four genuine browser/export screenshots saved');
  // Verify the same classic scripts and local images directly from disk.
  await cdp('Page.navigate',{url:new URL('./app/index.html?shot=editor',import.meta.url).href});await poll(()=>evaluate('window.ready ? window.ready.then(()=>studio.photos.length===2) : false'),'file: offline startup');report.checks.push('Opens directly as file: with both sample photos');
  report.status='passed';console.log(JSON.stringify(report,null,2));
}catch(error){report.status='failed';report.error=error.message;console.error(error.message);process.exitCode=1;}
finally{if(socket)socket.close();for(const p of processes)p.kill();await writeFile(resolve(temp,'verification.json'),JSON.stringify(report,null,2));}
