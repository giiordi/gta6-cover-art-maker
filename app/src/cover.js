/* One renderer powers the live artboard and every full-resolution export. */
window.CoverArt = (() => {
  const sizes = {square:[1080,1080],portrait:[1080,1350],wide:[1920,1080]};
  const palettes = {sunset:['#ffae83','#f44c9d','#302455','#a5ead9'],neon:['#b5ffe0','#d944cb','#172f57','#f8b6dc'],chrome:['#e2d9be','#9daab6','#283647','#faf2da']};
  function polygon(c, points) { c.beginPath(); points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y)); c.closePath(); }
  function layouts(name, format) {
    const wide=format==='wide';
    let boxes=wide?[[.014,.02,.31,.53],[.33,.02,.656,.96],[.014,.56,.31,.42]]:[[.016,.014,.35,.415],[.378,.014,.606,.785],[.016,.441,.35,.358],[.016,.811,.968,.175]];
    if(name==='grid') boxes=[[.015,.015,.478,.478],[.507,.015,.478,.478],[.015,.507,.478,.478],[.507,.507,.478,.478]];
    if(name==='hero') boxes=wide?[[.014,.02,.71,.96],[.737,.02,.249,.47],[.737,.51,.249,.47]]:[[.015,.015,.97,.65],[.015,.68,.477,.305],[.507,.68,.478,.305]];
    return boxes.map((b,i)=>({x:b[0],y:b[1],w:b[2],h:b[3],photo:i===0?1:0,zoom:i===2?1.7:1,px:i===2?-.6:0,py:i===2?.4:(wide&&i===1?.82:0)}));
  }
  function stylize(image) {
    const out=document.createElement('canvas'); out.width=image.naturalWidth;out.height=image.naturalHeight;
    const c=out.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
    const pixels=c.getImageData(0,0,out.width,out.height),d=pixels.data;
    for(let i=0;i<d.length;i+=4){for(let k=0;k<3;k++){const v=(d[i+k]-128)*1.14+128;d[i+k]=Math.round(Math.max(0,Math.min(255,v))/18)*18;}}
    c.putImageData(pixels,0,0);return out;
  }
  function printText(c,text,x,y,size,maxWidth,fill,align='left') {
    c.save(); c.translate(x,y);c.font=`900 ${size}px Arial, Helvetica, sans-serif`;c.textAlign=align;c.textBaseline='alphabetic';c.lineJoin='round';
    const measure=c.measureText(text).width;c.scale(Math.min(1,maxWidth/Math.max(1,measure)),1);
    c.strokeStyle='#12101c';c.lineWidth=size*.115;c.shadowColor='#100d19';c.shadowOffsetX=size*.035;c.shadowOffsetY=size*.07;c.strokeText(text,0,0);c.shadowColor='transparent';c.fillStyle=fill;c.fillText(text,0,0);c.restore();
  }
  function palm(c,x,y,s,flip=1){c.save();c.translate(x,y);c.scale(s*flip,s);c.fillStyle='#151324';c.beginPath();c.moveTo(-5,180);c.quadraticCurveTo(18,48,0,0);c.quadraticCurveTo(27,65,8,180);c.fill();for(let n=0;n<7;n++){const a=-Math.PI+.4+n*.43;c.save();c.rotate(a);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(42,-38,108,6);c.quadraticCurveTo(52,-6,0,9);c.fill();c.restore();}c.restore();}
  function logo(c,x,y,size,colors) {
    c.save();c.translate(x,y);c.scale(size/240,size/240);c.rotate(-.065);
    const g=c.createLinearGradient(0,0,210,200);g.addColorStop(0,colors[3]);g.addColorStop(.5,'#f6c5b1');g.addColorStop(1,colors[1]);
    c.lineJoin='miter';c.lineWidth=13;c.strokeStyle='#16101f';c.fillStyle=g;
    const shapes=[[[0,0],[43,0],[79,120],[120,0],[164,0],[97,186],[61,186]],[[178,0],[224,0],[224,186],[178,186]]];
    for(const shape of shapes){polygon(c,shape);c.stroke();c.fill();}
    c.strokeStyle='#191220';c.lineWidth=4;for(let n=0;n<4;n++){c.beginPath();c.moveTo(0,138+n*12);c.lineTo(230,111+n*12);c.stroke();}
    c.fillStyle='#ffdfb8';c.fillRect(15,198,204,5);c.font='bold 13px Arial';c.textAlign='center';c.letterSpacing='4px';c.fillText('AFTERGLOW',119,225);c.restore();
  }
  function render(canvas,state,photos) {
    const [W,H]=sizes[state.format];canvas.width=W;canvas.height=H;const c=canvas.getContext('2d');
    const s=W/1080,h=H/s,wide=state.format==='wide',pal=palettes[state.grade];c.scale(s,s);c.fillStyle='#16101f';c.fillRect(0,0,1080,h);
    for(let i=0;i<state.panels.length;i++){
      const p=state.panels[i],photo=photos[p.photo];if(!photo)continue;const x=p.x*1080,y=p.y*h,w=p.w*1080,ph=p.h*h;
      c.save();polygon(c,[[x+3,y],[x+w,y+5],[x+w-3,y+ph],[x,y+ph-5]]);c.clip();
      const image=photo.art;const scale=Math.max(w/image.width,ph/image.height)*p.zoom;
      const dw=image.width*scale,dh=image.height*scale;
      c.filter=state.grade==='chrome'?'saturate(.28) contrast(1.12)':'saturate(1.35) contrast(1.1)';
      c.drawImage(image,x+(w-dw)/2+p.px*(dw-w)/2,y+(ph-dh)/2+p.py*(dh-ph)/2,dw,dh);c.filter='none';
      c.globalCompositeOperation='soft-light';const tint=c.createLinearGradient(x,y,x+w,y+ph);tint.addColorStop(0,pal[0]);tint.addColorStop(.55,pal[1]);tint.addColorStop(1,pal[2]);c.globalAlpha=state.intensity/100*.8;c.fillStyle=tint;c.fillRect(x,y,w,ph);
      c.globalCompositeOperation='multiply';c.globalAlpha=state.intensity/100*.35;c.fillStyle=pal[2];c.fillRect(x,y,w,ph);c.restore();
      c.strokeStyle='#120e1a';c.lineWidth=8;polygon(c,[[x+3,y],[x+w,y+5],[x+w-3,y+ph],[x,y+ph-5]]);c.stroke();
    }
    // A screen-printed nightfall, original palms and a striped setting sun.
    c.save();const sunX=wide?385:190,sunY=wide?102:142,sunR=wide?65:105;
    c.globalAlpha=.88;const sg=c.createLinearGradient(0,sunY-sunR,0,sunY+sunR);sg.addColorStop(0,'#fff3be');sg.addColorStop(1,pal[1]);c.fillStyle=sg;c.beginPath();c.arc(sunX,sunY,sunR,0,Math.PI*2);c.clip();c.fillRect(sunX-sunR,sunY-sunR,sunR*2,sunR*2);c.fillStyle=pal[1];for(let j=0;j<7;j++)c.fillRect(sunX-sunR,sunY+j*13,sunR*2,3+j*.7);c.restore();
    palm(c,wide?303:90,wide?43:55,wide?.53:.8);palm(c,wide?409:274,wide?110:160,wide?.37:.54,-1);
    c.save();const shade=c.createLinearGradient(0,h*.48,0,h);shade.addColorStop(0,'#17102100');shade.addColorStop(.55,'#171021a0');shade.addColorStop(1,'#171021');c.fillStyle=shade;c.fillRect(0,h*.45,1080,h*.55);c.restore();
    // Deterministic aerosol droplets; never alter the portrait unpredictably.
    let seed=61423;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    c.save();for(let i=0;i<2200;i++){const x=random()*1080,y=random()*h;const edge=Math.min(x,1080-x,y,h-y);if(edge>65&&random()>.15)continue;c.globalAlpha=(.05+random()*.35)*state.spray/100;c.fillStyle=i%3?pal[0]:pal[3];c.beginPath();c.arc(x,y,.4+random()*2,0,7);c.fill();}c.restore();
    const titleY=wide?h*.70:h*.756,tx=wide?43:45,titleWidth=wide?770:850;
    c.save();c.translate(tx-12,titleY-43);c.rotate(-.036);c.fillStyle=pal[1];polygon(c,[[0,0],[wide?520:630,-8],[wide?510:608,47],[13,54]]);c.fill();c.fillStyle='#231329';c.font=`900 ${wide?15:21}px Arial`;c.letterSpacing='4px';c.fillText('THE CITY IS YOURS TO TAKE',22,30);c.restore();
    let lines=state.caption.toUpperCase().split(/\n/).filter(Boolean);if(lines.length===1&&lines[0].length>13){const words=lines[0].split(' ');let cut=Math.ceil(words.length/2);lines=[words.slice(0,cut).join(' '),words.slice(cut).join(' ')];}lines=lines.slice(0,3);if(!lines.length)lines=['YOUR STORY'];
    const font=wide?(lines.length>2?78:101):(lines.length>2?105:142);const step=font*.88;
    lines.forEach((line,i)=>{const grad=c.createLinearGradient(0,titleY+i*step-font,0,titleY+i*step);grad.addColorStop(0,'#fff8dc');grad.addColorStop(.6,'#ffe7c8');grad.addColorStop(1,'#ef9f99');printText(c,line,tx,titleY+i*step,font,titleWidth,grad);});
    const baseline=Math.min(h-43,titleY+(lines.length-1)*step+44);c.fillStyle=pal[3];c.font=`bold ${wide?13:18}px Arial`;c.letterSpacing=wide?'3px':'3.4px';c.fillText(state.kicker.toUpperCase(),tx,baseline,wide?720:850);c.letterSpacing='0px';
    logo(c,wide?878:830,wide?h-184:h-230,wide?153:185,pal);
    c.fillStyle='#f9e6d0';c.font=`bold ${wide?10:13}px Arial`;c.letterSpacing='3px';c.fillText('VICE DISTRICT  /  VOL. 06',37,wide?32:41);c.textAlign='right';c.fillText('A SUN-SOAKED ORIGINAL',1042,wide?32:41);c.textAlign='left';c.font=`bold ${wide?8:11}px Arial`;c.letterSpacing='2px';c.fillStyle='#b8a7bc';c.fillText('GOOD PEOPLE. BAD IDEAS. BEAUTIFUL NIGHTS.',tx,h-19);c.letterSpacing='0px';
    c.strokeStyle='#f9c3a8';c.lineWidth=2;c.strokeRect(8,8,1064,h-16);
    return canvas;
  }
  return {sizes,layouts,stylize,render};
})();
