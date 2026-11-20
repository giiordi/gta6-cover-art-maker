import {grades} from './shots.js';

const canvas = (w,h) => Object.assign(document.createElement('canvas'), {width:w,height:h});
function gradient(c,x,y,x2,y2,colors){
  const g=c.createLinearGradient(x,y,x2,y2);
  colors.forEach((color,i)=>g.addColorStop(i/(colors.length-1),color));
  return g;
}
function shape(c,color,points){
  c.fillStyle=color;
  c.beginPath();
  points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
  c.closePath(); c.fill();
}
function random(seed){
  return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
}
function palm(c,x,y,h,flip,color){
  c.save();c.translate(x,y);c.scale(h*flip,h);
  shape(c,color,[[-.05,0],[.06,0],[.04,-.42],[-.04,-.75],[-.17,-1],[-.21,-.98],[-.10,-.67],[-.05,-.35]]);
  for(let i=0;i<9;i++){
    const a=(i/8)*Math.PI*1.22-.13;
    const dx=Math.cos(a)*(.34+(i%3)*.065),dy=-Math.sin(a)*.28;
    c.beginPath();c.moveTo(-.19,-.98);
    c.quadraticCurveTo(-.19+dx*.66,-1.13+dy,-.19+dx,-.88+dy);
    c.quadraticCurveTo(-.19+dx*.62,-1.02+dy,-.19,-.96);
    c.fillStyle=color;c.fill();
  }
  c.restore();
}
export function sampleScene(){
  const image=canvas(1050,850),c=image.getContext('2d'),r=random(73);
  c.fillStyle=gradient(c,0,0,0,570,['#552657','#d45578','#ffb570','#ffe6aa']);c.fillRect(0,0,1050,850);
  c.fillStyle='#ffe2a2';c.beginPath();c.arc(680,360,130,0,Math.PI*2);c.fill();
  for(let i=0;i<46;i++){
    const x=r()*1050,y=110+r()*340;
    c.globalAlpha=.12+r()*.22;c.fillStyle=i%2?'#ffc38c':'#9c375e';
    c.fillRect(x,y,27+r()*200,1+r()*5);
  }
  c.globalAlpha=1;
  c.fillStyle=gradient(c,0,473,0,710,['#fbb184','#bd5979','#286078']);c.fillRect(0,473,1050,260);
  for(let i=0;i<45;i++){
    const x=i*25,y=480-r()*83,w=11+r()*28;
    c.fillStyle=i%3?'#634157':'#493653';c.fillRect(x,y,w,486-y);
    c.fillStyle='#faad86';
    for(let j=Math.floor(y+6);j<470;j+=7) if(r()>.25)c.fillRect(x+4,j,w*.46,1.5);
  }
  for(let i=0;i<175;i++){
    const y=490+r()*198,x=r()*1050;
    c.globalAlpha=.18+r()*.38;c.fillStyle=Math.abs(x-680)<165?'#ffd3a2':i%2?'#e67a90':'#573e69';
    c.fillRect(x,y,9+r()*85,1+r()*2);
  }
  c.globalAlpha=1;
  shape(c,'#4c3c55',[[0,684],[1050,590],[1050,850],[0,850]]);
  shape(c,'#e69b94',[[0,714],[1050,616],[1050,625],[0,728]]);
  shape(c,'#745068',[[0,743],[1050,640],[1050,651],[0,767]]);
  palm(c,158,724,499,1,'#281a38');palm(c,966,640,439,-1,'#301b3b');palm(c,990,636,284,1,'#482443');
  c.fillStyle='#302338';c.beginPath();c.ellipse(576,773,320,27,0,0,Math.PI*2);c.fill();
  for(const x of [387,758]){
    c.fillStyle='#241e32';c.beginPath();c.ellipse(x,749,48,48,0,0,Math.PI*2);c.fill();
    c.fillStyle='#8a748e';c.beginPath();c.arc(x,749,23,0,Math.PI*2);c.fill();
    c.fillStyle='#3b3047';c.beginPath();c.arc(x,749,12,0,Math.PI*2);c.fill();
  }
  shape(c,'#36213b',[[275,708],[352,676],[448,668],[525,604],[685,598],[765,656],[868,673],[898,718],[882,748],[808,758],[795,717],[765,699],[730,712],[709,760],[435,775],[425,736],[394,716],[360,724],[337,777],[286,770]]);
  shape(c,'#f87c85',[[282,712],[356,684],[456,676],[531,613],[679,606],[764,667],[861,683],[882,710],[769,695],[506,730],[301,750]]);
  shape(c,'#55374f',[[469,675],[537,621],[663,616],[730,662],[654,674]]);
  shape(c,'#bb7b8a',[[479,673],[540,626],[582,623],[568,665]]);
  shape(c,'#ef536d',[[441,737],[709,704],[718,717],[701,746],[444,762]]);
  shape(c,'#ffdfa4',[[290,722],[353,705],[351,719],[291,737]]);
  shape(c,'#ffad9a',[[823,696],[872,702],[879,714],[827,708]]);
  return image;
}

const cache=new WeakMap();
function paintPhoto(image,s){
  const key=[s.saturation,s.contrast,s.brightness,s.posterize,s.grade].join('/');
  const prior=cache.get(image);
  if(prior?.key===key)return prior.image;
  const scale=Math.min(1,1500/Math.max(image.width,image.height));
  const imageOut=canvas(Math.max(1,Math.round(image.width*scale)),Math.max(1,Math.round(image.height*scale)));
  const c=imageOut.getContext('2d',{willReadFrequently:true});
  c.filter='saturate('+s.saturation+'%) contrast('+s.contrast+'%) brightness('+s.brightness+'%)'+(s.grade==='mono'?' grayscale(100%)':'');
  c.drawImage(image,0,0,imageOut.width,imageOut.height);
  if(s.posterize){
    const pixels=c.getImageData(0,0,imageOut.width,imageOut.height),d=pixels.data;
    const step=255/(22-s.posterize*3);
    for(let i=0;i<d.length;i+=4){
      for(let j=0;j<3;j++){
        const n=d[i+j];d[i+j]=n+(Math.round(n/step)*step-n)*s.posterize/5;
      }
    }
    c.putImageData(pixels,0,0);
  }
  cache.set(image,{key,image:imageOut});return imageOut;
}
export function regions(template,w,h){
  if(template==='comic'){
    const cut=h*.59,g=h*.009;
    return [[0,0,w,cut],[0,cut+g,w*.39-g/2,h-cut-g],[w*.39+g/2,cut+g,w*.61-g/2,h-cut-g]];
  }
  return [[0,0,w,template==='movie'?h*.86:h]];
}
function coverPhoto(c,img,rect,crop,boost=1){
  const [x,y,w,h]=rect;
  const scale=Math.max(w/img.width,h/img.height)*crop.zoom/100*boost;
  const dw=img.width*scale,dh=img.height*scale;
  c.drawImage(img,x+(w-dw)*(1-crop.x)/2,y+(h-dh)*(1-crop.y)/2,dw,dh);
}
function display(c,text,x,y,size,max,colors,stroke=0,italic=false){
  if(!text.trim())return;
  c.save();c.textAlign='center';c.textBaseline='middle';
  const font=(n)=> (italic?'italic ':'')+'900 '+n+'px Cover, Studio, Arial, sans-serif';
  c.font=font(size);
  size=Math.min(size,size*max/Math.max(1,c.measureText(text).width));
  c.font=font(size);c.lineJoin='round';
  if(stroke){
    c.strokeStyle='#25152a';c.lineWidth=stroke*1.7;c.strokeText(text,x,y+stroke*.6);
    c.lineWidth=stroke;c.strokeText(text,x,y);
  }
  c.fillStyle=gradient(c,x,y-size*.45,x,y+size*.38,colors);c.fillText(text,x,y);
  c.restore();
}
function captionLines(c,text,width){
  const chars=Array.from(text.trim());const lines=[];
  while(chars.length&&lines.length<2){
    let n=1;
    while(n<chars.length&&c.measureText(chars.slice(0,n+1).join('')).width<=width)n++;
    if(n<chars.length&&lines.length===0){
      const space=chars.slice(0,n).lastIndexOf(' ');if(space>0)n=space;
    }
    const tail=n<chars.length&&lines.length===1;
    if(tail)while(n>1&&c.measureText(chars.slice(0,n).join('')+'…').width>width)n--;
    lines.push(chars.splice(0,n).join('').trim()+(tail?'…':''));
    while(chars[0]===' ')chars.shift();
  }
  return lines;
}
export function drawCover(target,s,sample){
  const c=target.getContext('2d'),w=target.width,h=target.height,u=h/1000,g=grades[s.grade];
  c.fillStyle='#25172b';c.fillRect(0,0,w,h);
  const rects=regions(s.template,w,h);
  rects.forEach((rect,i)=>{
    const [x,y,pw,ph]=rect;
    const photo=s.panels[i]?.image||s.photo?.image||sample;
    const crop=s.crops[i];
    const effective=i&&!s.panels[i]?{...crop,x:Math.max(-1,Math.min(1,crop.x+(i===1?-.39:.42))),y:Math.max(-1,crop.y-.21)}:crop;
    c.save();c.beginPath();c.rect(...rect);c.clip();
    c.fillStyle=gradient(c,x,y,x,y+ph,g.sky);c.fillRect(...rect);
    coverPhoto(c,paintPhoto(photo,s),rect,effective,i&&!s.panels[i]?1.27:1);
    const amount=s.strength/100;
    c.globalAlpha=amount*.43;c.globalCompositeOperation='soft-light';
    c.fillStyle=gradient(c,x,y,x+pw,y+ph,[g.ink,g.light]);c.fillRect(...rect);
    c.globalCompositeOperation='screen';c.globalAlpha=amount*.13;
    c.fillStyle=g.light;c.fillRect(...rect);c.restore();
  });
  if(s.template==='comic'){
    c.fillStyle='#fff3dc';c.fillRect(0,h*.59,w,h*.009);
    c.fillRect(w*.39-h*.002,h*.599,h*.004,h*.401);
  }
  if(s.sun){
    const cx=w*.76,cy=h*.24,r=Math.min(w*.115,h*.12);
    c.save();c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.clip();
    c.globalAlpha=.86;c.fillStyle=gradient(c,cx,cy-r,cx,cy+r,[g.sun,g.title[1]]);
    for(let i=0;i<11;i++)c.fillRect(cx-r,cy-r+i*r*.185,r*2,r*(i<5?.185:.145-i*.006));
    c.restore();
  }
  if(s.palms){
    palm(c,w*.028,h*.935,h*.36,1,'#281729');palm(c,w*.976,h*.94,h*.32,-1,'#281729');
  }
  if(s.grain){
    const rand=random(504);c.save();c.globalAlpha=.075;
    for(let i=0;i<3400;i++){
      c.fillStyle=i%2?'#ffe9cb':'#1d1429';
      c.fillRect(rand()*w,rand()*h,(1+rand()*3)*u,(1+rand()*1.6)*u);
    }
    c.restore();
  }
  c.fillStyle=gradient(c,0,h*.66,0,h*.97,['#21132300','#211323ee']);c.fillRect(0,h*.66,w,h*.34);
  const gutter=26*u,barY=h-83*u;
  c.fillStyle='#2a192a';c.fillRect(gutter,barY,w-2*gutter,55*u);
  c.fillStyle=g.title[1];c.fillRect(gutter,barY,4*u,55*u);
  c.fillStyle='#fff3df';c.font='700 '+21*u+'px Studio,Arial,sans-serif';c.textBaseline='middle';c.textAlign='center';
  const lines=captionLines(c,s.caption,w-2*gutter-25*u);
  lines.forEach((line,i)=>c.fillText(line,w/2,barY+27*u+(i-(lines.length-1)/2)*23*u));
  if(s.rating){
    const bx=gutter+3*u,by=barY-77*u;
    c.fillStyle='#faead7';c.fillRect(bx,by,55*u,62*u);
    c.fillStyle='#271b29';c.fillRect(bx+4*u,by+4*u,47*u,54*u);
    display(c,'18+',bx+27*u,by+25*u,25*u,43*u,['#fff5de','#fff5de']);
    display(c,'RATING',bx+27*u,by+46*u,9*u,42*u,['#fff5de','#fff5de']);
  }
  if(s.series.trim()){
    const bx=w-gutter-58*u,by=barY-64*u;
    c.beginPath();c.arc(bx,by,49*u,0,Math.PI*2);
    c.fillStyle='#2b192c';c.fill();c.strokeStyle=g.title[0];c.lineWidth=3*u;c.stroke();
    display(c,s.series,bx,by,59*u,76*u,g.title,0,true);
  }
  const titleY=h*(s.template==='comic'?.592:s.template==='movie'?.716:.672);
  const textSize=Math.min(154*u,w*.22)*s.titleSize/100;
  if(s.template==='comic'){
    shape(c,'#2b192e',[[0,titleY-44*u],[w,titleY-58*u],[w,titleY+48*u],[0,titleY+61*u]]);
    shape(c,g.title[1],[[0,titleY+60*u],[w,titleY+46*u],[w,titleY+50*u],[0,titleY+64*u]]);
  }
  display(c,s.title.toUpperCase(),w/2,titleY,textSize,w-62*u,g.title,8*u,true);
  const topY=s.title.trim()?titleY-Math.min(textSize*.52,89*u)-14*u:titleY;
  display(c,s.top.toUpperCase(),w/2,topY,39*u,w-95*u,['#fff6e5','#ffddc2'],5*u);
  if(s.stars){
    for(let i=0;i<5;i++){
      const x=w-gutter-(i*26+13)*u,y=gutter+20*u;
      const points=Array.from({length:10},(_,j)=>{
        const a=j*Math.PI/5-Math.PI/2,r=(j%2?5:11)*u;
        return [x+Math.cos(a)*r,y+Math.sin(a)*r];
      });
      shape(c,'#ffedc1',points);c.strokeStyle='#3b2334';c.lineWidth=1.8*u;c.stroke();
    }
  }
  if(s.frame){c.strokeStyle='#fff0dc';c.lineWidth=4*u;c.strokeRect(13*u,13*u,w-26*u,h-26*u);}
}
