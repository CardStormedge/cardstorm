(function(){
  const HERO_FIX_VERSION='2026-08-28a';
  const pokemonCards=[
    'assets/homepage/categories/pokemon-tcg-dashboard-tile.webp',
    'assets/homepage/categories/pokemon-tcg-pikachu-tile.webp',
    'assets/homepage/categories/pokemon-tcg-homepage-panel.webp',
    'assets/pokemontcglogo.webp'
  ];
  function fillTicker(cards){
    const ticker=document.getElementById('cardTickerTrack');
    if(!ticker) return;
    const list=[...cards,...cards,...cards];
    ticker.innerHTML=list.map((src,i)=>'<img src="'+src+'?v='+HERO_FIX_VERSION+'" loading="eager" decoding="async" alt="Collector card '+((i%cards.length)+1)+'">').join('');
  }
  const originalShow=window.show;
  if(typeof originalShow==='function'){
    window.show=function(n){
      originalShow(n);
      const d=window.STARS?window.STARS[((n%window.STARS.length)+window.STARS.length)%window.STARS.length]:null;
      if(d && d.tab==='POKÉMON / TCG') fillTicker(pokemonCards);
      else if(window.CAROUSEL_CARDS) fillTicker(window.CAROUSEL_CARDS);
      requestAnimationFrame(()=>{
        const rail=document.getElementById('starRail');
        if(rail && matchMedia('(max-width:760px)').matches){
          rail.style.visibility='visible';
          rail.style.opacity='1';
        }
      });
    };
  }
  const originalClose=window.closeApp;
  if(typeof originalClose==='function'){
    window.closeApp=function(){
      originalClose();
      requestAnimationFrame(()=>{
        window.scrollTo({top:0,left:0,behavior:'auto'});
        if(typeof window.show==='function' && typeof window.idx==='number') window.show(window.idx);
      });
    };
  }
  window.addEventListener('pageshow',()=>{if(matchMedia('(max-width:760px)').matches) window.scrollTo({top:0,left:0,behavior:'auto'});});
})();