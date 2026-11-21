window.scene = (() => {
  const name = new URLSearchParams(location.search).get('shot') || '';
  return {name,onlyCover:['cover','export','wide'].includes(name),format:['cover','wide'].includes(name)?'wide':'portrait'};
})();
