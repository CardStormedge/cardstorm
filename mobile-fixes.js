(function(){
  const V='20260828c';
  const pokemonCards=[
    'assets/homepage/categories/pokemon-tcg-pikachu-tile.webp',
    'assets/homepage/categories/pokemon-tcg-dashboard-tile.webp',
    'assets/homepage/categories/pokemon-tcg-homepage-panel.webp',
    'assets/homepage/categories/pokemon-tcg.webp'
  ];
  const normalCards=[
    'assets/homepage/cards/downtown-jayden-daniels.webp','assets/homepage/cards/downtown-caleb-williams.webp','assets/homepage/cards/downtown-bo-nix.webp',
    'assets/homepage/cards/game-optic-rated-rookie.webp','assets/homepage/cards/game-select-rookie.webp','assets/homepage/cards/game-mosaic-red.webp',
    'assets/homepage/carousel/mahomes-downtown.webp','assets/homepage/carousel/josh-allen-downtown.webp','assets/homepage/carousel/caleb-prizm.webp','assets/homepage/carousel/bo-select.webp',
    'assets/homepage/carousel/travis-chrome.webp','assets/homepage/carousel/dart-chrome.webp','assets/homepage/carousel/jeanty-chrome.webp','assets/homepage/carousel/tetairoa-instant.webp'
  ];

  const style=document.createElement('style');
  style.textContent=`
  @media(max-width:760px){
    #starRail{position:absolute!important;z-index:18!important;top:304px!important;left:10px!important;right:10px!important;width:auto!important;margin:0!important;padding:7px 6px!important;display:flex!important;visibility:visible!important;opacity:1!important;flex-wrap:nowrap!important;overflow-x:auto!important;background:rgba(2,9,20,.88)!important;border:1px solid rgba(85,216,255,.2)!important;border-radius:999px!important;backdrop-filter:blur(12px)!important;scrollbar-width:none!important}
    #starRail .starBtn{display:flex!important;flex:0 0 auto!important;opacity:1!important;visibility:visible!important}
    .heroCopy{padding-top:370px!important}
    .hero.hasExtra,.hero.breakMode{min-height:720px!important}
    .hero.hasExtra .heroCopy,.hero.breakMode .heroCopy{min-height:720px!important;padding-top:370px!important;padding-bottom:18px!important;justify-content:flex-start!important}
    .hero.breakMode .heroCopy h1{display:block!important}
    .hero.pokemonMode{min-height:720px!important}
    .hero.pokemonMode .scene.photo .bg{height:210px!important}
    .hero.pokemonMode .scene.photo .bg img{height:210px!important;object-fit:contain!important;object-position:center top!important}
    .hero.pokemonMode .cardTicker{display:block!important;top:210px!important;height:88px!important}
    .hero.pokemonMode .heroCopy{min-height:720px!important;padding-top:370px!important}
    .cardTicker{z-index:12!important}
  }`;
  document.head.appendChild(style);

  function fillTicker(cards){
    const ticker=document.getElementById('cardTickerTrack');
    if(!ticker)return;
    const list=[...cards,...cards,...cards];
    ticker.innerHTML=list.map((src,i)=>'<img src="'+src+'?v='+V+'" loading="eager" decoding="async" alt="Card '+((i%cards.length)+1)+'">').join('');
  }

  function forceGrails(){
    const scenes=[...document.querySelectorAll('#scenes .scene')];
    const grails=scenes[3];
    if(!grails)return;
    const img=grails.querySelector('img');
    if(img){
      img.onerror=function(){ this.src='assets/homepage/categories/holy-grails.webp?v='+V; };
      img.src='assets/homepage/categories/holy-grails-three-sport.webp?v='+V;
    }
  }

  function normalizeMobile(){
    if(!matchMedia('(max-width:760px)').matches)return;
    const rail=document.getElementById('starRail');
    if(rail){ rail.style.visibility='visible'; rail.style.opacity='1'; }
    const active=[...document.querySelectorAll('#starRail .starBtn')].findIndex(b=>b.classList.contains('active'));
    if(active===6)fillTicker(pokemonCards); else fillTicker(normalCards);
  }

  forceGrails();
  const originalShow=window.show;
  if(typeof originalShow==='function'){
    window.show=function(n){
      originalShow(n);
      if(((n%7)+7)%7===6)fillTicker(pokemonCards); else fillTicker(normalCards);
      forceGrails();
      requestAnimationFrame(normalizeMobile);
    };
  }

  const originalClose=window.closeApp;
  if(typeof originalClose==='function'){
    window.closeApp=function(){
      originalClose();
      requestAnimationFrame(()=>{
        const active=[...document.querySelectorAll('#starRail .starBtn')].findIndex(b=>b.classList.contains('active'));
        if(active>=0 && typeof window.show==='function')window.show(active);
        window.scrollTo({top:0,left:0,behavior:'auto'});
        normalizeMobile();
      });
    };
  }

  window.addEventListener('pageshow',()=>requestAnimationFrame(()=>{window.scrollTo({top:0,left:0,behavior:'auto'});normalizeMobile();forceGrails();}));
  window.addEventListener('popstate',()=>requestAnimationFrame(()=>{window.scrollTo({top:0,left:0,behavior:'auto'});normalizeMobile();}));
  window.addEventListener('resize',normalizeMobile);
  normalizeMobile();
})();