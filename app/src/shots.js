export const formats = {'1:1':[1080,1080], '4:5':[1080,1350], '16:9':[1920,1080]};
export const templates = {classic:'Classic Cover', comic:'Comic Panels', movie:'Movie Poster'};
export const grades = {
  vice: {label:'Vice Sunset', sky:['#54235e','#ef6183','#ffd195'], ink:'#73216e', light:'#ffae68', sun:'#ffdc83', title:['#fff0ac','#ff5f9b']},
  neon: {label:'Neon Night', sky:['#101b46','#5b237f','#fd5799'], ink:'#322084', light:'#1be0ee', sun:'#ff87cf', title:['#b5fff4','#ed7bff']},
  golden: {label:'Golden Hour', sky:['#742a45','#f78553','#ffdd8d'], ink:'#963d2d', light:'#ffc450', sun:'#fff0a1', title:['#fff4bb','#ff845e']},
  mono: {label:'Comic B&W', sky:['#26242e','#777680','#dfdce0'], ink:'#292831', light:'#dddce4', sun:'#eeeeee', title:['#ffffff','#b9b6c4']},
};
export const sliders = {
  zoom:['Zoom',100,300,100,'%'],
  saturation:['Saturation',0,220,140,'%'],
  contrast:['Contrast',50,180,115,'%'],
  brightness:['Brightness',50,150,103,'%'],
  posterize:['Comic paint',0,5,2,''],
  strength:['Sunset grade',0,100,70,'%'],
  titleSize:['Title size',60,150,100,'%'],
};
export const decorations = {palms:'Palm silhouettes',sun:'Striped sun',stars:'Wanted stars',rating:'18+ rating',grain:'Film grain',frame:'White frame'};
export const initial = () => ({
  template:'classic',grade:'vice',size:'4:5',
  top:'GRAND THEFT AUTO',title:'VICE CITY',series:'VI',
  caption:'A trip to Leonida has never been this wild.',
  ...Object.fromEntries(Object.entries(sliders).map(([key, spec])=>[key,spec[3]])),
  ...Object.fromEntries(Object.keys(decorations).map(key=>[key,true])),
  photo:null, panels:[null,null,null], crops:[{x:0,y:0,zoom:100},{x:0,y:0,zoom:100},{x:0,y:0,zoom:100}],
});
