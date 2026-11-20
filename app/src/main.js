import {formats,templates,grades,sliders,decorations,initial} from './shots.js';
import {drawCover,regions,sampleScene} from './cover.js';

const by=id=>document.getElementById(id);
const poster=by('poster'),board=poster.parentElement,file=by('file'),sample=sampleScene();
let s=initial(),active=0,drag=null,pending=false,timer,uploadVersion=0;
let pickerPanel=null;
const inputs=new Map(), groups=[];
const sampleThumb=sample.toDataURL('image/jpeg',.63);

function toast(message){
  by('toast').textContent=message;
  clearTimeout(timer);timer=setTimeout(()=>by('toast').textContent='',2600);
}
function render(){
  pending=false;
  const [w,h]=formats[s.size],b=board.getBoundingClientRect();
  const scale=Math.max(.01,Math.min((b.width-18)/w,(b.height-18)/h));
  poster.style.width=Math.floor(w*scale)+'px';poster.style.height=Math.floor(h*scale)+'px';
  if(poster.width!==w||poster.height!==h){poster.width=w;poster.height=h;}
  drawCover(poster,s,sample);
}
function redraw(){if(!pending){pending=true;requestAnimationFrame(render);}}
function choice(id,values,key,decorate){
  const buttons=Object.entries(values).map(([value,label])=>{
    const b=document.createElement('button');b.type='button';b.textContent=label;
    decorate?.(b,value);
    b.onclick=()=>{s[key]=value;if(key==='template')active=0;sync();};
    by(id).append(b);return [value,b];
  });
  groups.push([key,buttons]);
}
function marker(button,className,color){
  const span=document.createElement('span');span.className=className;
  span.setAttribute('aria-hidden','true');
  if(color)span.style.background=color;
  button.prepend(span);
}
choice('templates',templates,'template',b=>marker(b,'template-icon'));
choice('grades',Object.fromEntries(Object.entries(grades).map(([k,v])=>[k,v.label])),'grade',(b,k)=>marker(b,'swatch',grades[k].sky[1]));
choice('sizes',Object.fromEntries(Object.keys(formats).map(k=>[k,k])),'size',(b,k)=>{b.title=formats[k].join(' × ');});

function control(parent,key,name,input,out){
  const wrap=document.createElement('label');wrap.className='control';
  const row=document.createElement('span');row.textContent=name;if(out)row.append(out);
  input.id=key;wrap.append(row,input);by(parent).append(wrap);return wrap;
}
const panel=document.createElement('select');
for(const [i,name] of ['Hero','Lower left','Lower right'].entries())panel.add(new Option(name,i));
const panelRow=control('crop','panel','Edit panel',panel);
panel.onchange=()=>{active=Number(panel.value);sync();};
const panelActions=document.createElement('div');
const panelPhoto=document.createElement('button'),panelClear=document.createElement('button');
panelPhoto.textContent='Choose panel photo';panelClear.textContent='Use main photo';
for(const button of [panelPhoto,panelClear])button.className='quiet';
panelActions.append(panelPhoto,panelClear);by('crop').append(panelActions);
panelPhoto.onclick=()=>openPicker(active);
panelClear.onclick=()=>{uploadVersion++;s.panels[active]?.image.close();s.panels[active]=null;sync();};

for(const [key,[name,min,max,,unit]] of Object.entries(sliders)){
  const input=document.createElement('input'),out=document.createElement('output');
  input.type='range';input.min=min;input.max=max;out.htmlFor=key;
  control(key==='zoom'?'crop':key==='titleSize'?'type':'fx',key,name,input,out);
  inputs.set(key,[input,out,unit]);
  input.oninput=()=>{if(key==='zoom')s.crops[active].zoom=+input.value;else s[key]=+input.value;sync();};
}
for(const [key,label,max] of [['top','Top text',50],['title','Big title',70],['series','Series badge',8],['caption','Bottom caption',180]]){
  const input=document.createElement(key==='caption'?'textarea':'input');
  if(key!=='caption')input.type='text';
  input.maxLength=max;control('type',key,label,input);
  inputs.set(key,[input]);input.oninput=()=>{s[key]=input.value;redraw();};
}
for(const [key,label] of Object.entries(decorations)){
  const input=document.createElement('input');input.type='checkbox';input.id=key;
  const item=document.createElement('label');item.append(input,label);by('decor').append(item);
  inputs.set(key,[input]);input.onchange=()=>{s[key]=input.checked;redraw();};
}
function sync(){
  for(const [key,buttons] of groups)for(const [value,b] of buttons)b.setAttribute('aria-pressed',s[key]===value);
  for(const [key,[input,out,unit]] of inputs){
    const value=key==='zoom'?s.crops[active].zoom:s[key];
    if(input.type==='checkbox')input.checked=value;
    else if(input.value!==String(value))input.value=value;
    if(out)out.value=value+unit;
  }
  const photo=s.panels[active]||s.photo;
  by('thumb').src=photo?.thumb||sampleThumb;
  by('filename').textContent=photo?.name||'Vice City beach';
  by('source').textContent=photo?'Local photo':'Procedural sample';
  const comic=s.template==='comic';
  panelRow.hidden=panelActions.hidden=!comic;panel.value=active;
  panelClear.disabled=!s.panels[active];
  by('format').textContent=s.size+' / '+formats[s.size].join(' × ');
  redraw();
}
function openPicker(index=null){
  pickerPanel=index;file.value='';file.click();
}
by('choose').onclick=()=>openPicker();
by('change').onclick=()=>openPicker(s.panels[active]?active:null);
by('drop').onclick=e=>{if(!e.target.closest('button'))openPicker();};
async function loadPhoto(photo,index=null){
  if(!photo)return;
  const version=++uploadVersion;
  try{
    const image=await createImageBitmap(photo);
    if(version!==uploadVersion){image.close();return;}
    const preview=document.createElement('canvas');preview.width=120;preview.height=80;
    const scale=Math.max(120/image.width,80/image.height),w=image.width*scale,h=image.height*scale;
    preview.getContext('2d').drawImage(image,(120-w)/2,(80-h)/2,w,h);
    const data={image,name:photo.name,thumb:preview.toDataURL('image/jpeg',.72)};
    if(index===null){
      s.photo?.image.close();s.photo=data;
      s.panels[0]?.image.close();s.panels[0]=null;
      s.crops=s.crops.map((crop,i)=>s.panels[i]?crop:{x:0,y:0,zoom:100});
      active=0;
    }else{
      s.panels[index]?.image.close();s.panels[index]=data;active=s.template==='comic'?index:0;
      s.crops[index]={x:0,y:0,zoom:100};
    }
    sync();toast('Photo loaded');
  }catch{if(version===uploadVersion)toast('Could not open this image');}
}
file.onchange=()=>loadPhoto(file.files[0],pickerPanel);
const dropTargets=[by('drop'),board];
for(const target of dropTargets){
  target.ondragover=e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();target.classList.add('active-drop');}};
  target.ondragleave=()=>target.classList.remove('active-drop');
  target.ondrop=e=>{
    e.preventDefault();target.classList.remove('active-drop');
    const i=target===board?panelAt(e):0;
    loadPhoto(e.dataTransfer.files[0],i>0?i:null);
  };
}
window.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();});
window.addEventListener('drop',e=>e.preventDefault());
function panelAt(e){
  const box=poster.getBoundingClientRect();
  const x=(e.clientX-box.left)/box.width,y=(e.clientY-box.top)/box.height;
  return s.template==='comic'&&y>.595?(x<.39?1:2):0;
}
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
poster.onpointerdown=e=>{
  if(e.button!==0||drag)return;
  active=panelAt(e);sync();
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,index:active};
  poster.setPointerCapture(e.pointerId);
};
poster.onpointermove=e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const crop=s.crops[drag.index],box=poster.getBoundingClientRect();
  const [, ,w,h]=regions(s.template,box.width,box.height)[drag.index]||[0,0,box.width,box.height];
  crop.x=clamp(crop.x+(e.clientX-drag.x)*3/w,-1,1);
  crop.y=clamp(crop.y+(e.clientY-drag.y)*3/h,-1,1);
  drag.x=e.clientX;drag.y=e.clientY;redraw();
};
poster.onlostpointercapture=()=>{drag=null;};
poster.addEventListener('wheel',e=>{
  e.preventDefault();active=panelAt(e);
  const crop=s.crops[active];crop.zoom=clamp(crop.zoom+(e.deltaY<0?6:-6),100,300);sync();
},{passive:false});
by('center').onclick=()=>{Object.assign(s.crops[active],{x:0,y:0});sync();toast('Photo centered');};
by('new').onclick=()=>{
  uploadVersion++;s.photo?.image.close();s.panels.forEach(p=>p?.image.close());
  s=initial();active=0;file.value='';sync();toast('New cover');
};
const pick=items=>items[Math.floor(Math.random()*items.length)];
by('random').onclick=()=>{
  const [title,caption]=pick([['SUNSET HEIST','Last light. First getaway.'],['OCEAN DRIVE','Good nights make bad alibis.'],['AFTER HOURS','Paradise never sleeps.'],['HEAT WAVE','The city keeps its secrets.']].filter(([title])=>title!==s.title));
  Object.assign(s,{title,caption,template:pick(Object.keys(templates)),grade:pick(Object.keys(grades)),
    posterize:pick([1,2,3,4]),saturation:pick([112,134,156,182]),strength:pick([50,65,82,95])});active=0;sync();
};
by('export').onclick=()=>{
  const [w,h]=formats[s.size],title=s.title;
  const output=Object.assign(document.createElement('canvas'),{width:w,height:h});
  drawCover(output,s,sample);
  output.toBlob(blob=>{
    if(!blob){toast('PNG export failed');return;}
    const href=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=href;a.download=(title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'vice-press')+'-'+w+'x'+h+'.png';
    a.click();setTimeout(()=>URL.revokeObjectURL(href),30000);toast('PNG exported · '+w+' × '+h);
  },'image/png');
};
new ResizeObserver(redraw).observe(board);
sync();
Promise.all([document.fonts.load('900 40px Cover'),document.fonts.load('14px Studio')]).then(redraw,redraw);
