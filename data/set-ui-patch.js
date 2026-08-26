(function(){
function ready(){return window.CARDSTORM_SET_CATALOG&&typeof shell==='function';}
function esc(s){return String(s==null?'':s).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));}
function slug(s){return String(s).toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'').replace(/^the/,'');}
function imageFor(p){
  if(p.sport==='pokemon')return 'assets/pokemontcglogo.webp';
  const n=p.name.toLowerCase(); let brand='';
  if(n.includes('topps chrome'))brand='toppschrome'; else if(n.includes('bowman chrome'))brand='bowmanchrome'; else if(n.includes('finest'))brand='finest'; else if(n.includes('donruss optic'))brand='donrussoptic'; else if(/\bdonruss\b/.test(n))brand='donruss'; else if(n.includes('mosaic'))brand='mosaic'; else if(n.includes('prizm'))brand='prizm'; else if(n.includes('select'))brand='select';
  const year=p.year;
  if(brand){
    const exact='assets/boxes/box-'+p.sport+'-'+year+'-'+brand+'.webp';
    const supported={
      'baseball|2024|bowmanchrome':1,'baseball|2024|toppschrome':1,'baseball|2025|bowmanchrome':1,'baseball|2025|finest':1,'baseball|2025|toppschrome':1,'baseball|2026|bowmanchrome':1,'baseball|2026|finest':1,'baseball|2026|toppschrome':1,
      'basketball|2024|mosaic':1,'basketball|2024|prizm':1,'basketball|2024|select':1,'basketball|2025|donrussoptic':1,'basketball|2025|prizm':1,'basketball|2025|select':1,'basketball|2026|donrussoptic':1,'basketball|2026|prizm':1,'basketball|2026|select':1,'basketball|2026|toppschrome':1,
      'football|2024|donruss':1,'football|2024|mosaic':1,'football|2024|prizm':1,'football|2024|select':1,'football|2025|donrussoptic':1,'football|2026|donrussoptic':1,'football|2026|prizm':1,'football|2026|select':1,'football|2026|toppschrome':1
    };
    if(supported[p.sport+'|'+year+'|'+brand])return exact;
    const generic={prizm:'assets/prodimgprizm.png',select:'assets/prodimgselect.png',donruss:'assets/prodimgdonruss.png',donrussoptic:'assets/prodimgdonrussoptic.png',mosaic:'assets/prodimgmosaic.png',toppschrome:'assets/prodimgtoppschrome.png',bowmanchrome:'assets/prodimgbowmanchrome.png',finest:'assets/prodimgfinest.png'};
    return generic[brand]||null;
  }
  return null;
}
function visual(p){const img=imageFor(p); if(img)return `<img class="productimg" src="${img}" loading="lazy" decoding="async" alt="${esc(p.year+' '+p.name)}">`;return `<div class="pendingShot"><b>${esc(p.name)}</b><div>${esc(p.maker)} • ${esc(p.year)}</div><span>VERIFIED SET • ARTWORK PENDING</span></div>`;}
function allProducts(){const cat=window.CARDSTORM_SET_CATALOG; return ((cat[sport]||{})[year]||[]).map(x=>Object.assign({},x,{sport:sport,year:year}));}
function tabs(){return `<div class=tabs>${['football','baseball','basketball','pokemon'].map(s=>`<button class="${sport===s?'active':''}" onclick="sport='${s}';show('sets')">${s==='pokemon'?'POKÉMON':s.toUpperCase()}</button>`).join('')}${['2024','2025','2026'].map(y=>`<button class="${year===y?'active':''}" onclick="year='${y}';show('sets')">${y}</button>`).join('')}</div>`;}
function status(p){const d=p.release?` • ${p.release}`:'';return `<span class="pill" style="${p.status==='announced'?'color:#ffd56a;border:1px solid #806820':''}">${p.status==='announced'?'ANNOUNCED':'RELEASED'}${d}</span>`;}
function patch(){if(!ready())return false;
  productSlate=function(){return allProducts();};
  productVisual=function(p){return visual(p);};
  sets=function(){const products=allProducts();const meta=window.CARDSTORM_SET_CATALOG.meta;return shell('SETS & PACKS','Verified Set Library',`Football • Baseball • Basketball • Pokémon • 2024–2026. ${meta.policy}`,`${tabs()}<div class=notice style="margin-bottom:14px"><b>Accuracy rule:</b> released or formally announced sets only. Announced products are labeled separately. No guessed future releases.</div><div class=productgrid>${products.map((p,i)=>`<div class=product onclick="openProduct(${i})">${visual(p)}<div class=productbody><div class=k>${esc(year)} • ${esc(sport==='pokemon'?'POKÉMON':sport.toUpperCase())}</div><div class=teamname style="font-size:20px">${esc(p.name)}</div><div class=target>${esc(p.maker)} • set information • release status • checklist source</div><div style="margin-top:8px">${status(p)}</div><p><button class=cta>OPEN SET DETAILS</button></p></div></div>`).join('')}</div>${products.length?'':`<div class=feature><h2>No verified sets loaded for this view.</h2><p class=sub>CardStorm will not invent products to fill a page.</p></div>`}`);};
  openProduct=function(i){const p=allProducts()[i];if(!p)return;const img=visual(p);C.innerHTML=shell('SET INTELLIGENCE',p.year+' '+p.name,(p.sport==='pokemon'?'POKÉMON':p.sport.toUpperCase())+' • '+p.maker,`<div class=panel><div class=feature>${img}<h2>${esc(p.name)}</h2><p class=sub><b>${p.status==='announced'?'Announced':'Released'}</b>${p.release?' • '+esc(p.release):''}. CardStorm keeps announced products separate from released products so future product is never presented as live inventory.</p>${status(p)}<div style="margin-top:14px"><a class=cta href="${esc(p.source)}" target="_blank" rel="noopener" style="text-decoration:none;display:inline-block">VERIFY / CHECKLIST SOURCE →</a></div><div class=sourceTag style="margin-top:10px">${esc(p.sourceLabel||'Verified release/checklist source')}</div></div><div class=feature><h2>WHAT CARDSTORM TRACKS</h2>${['Base checklist','Rookies / prospects','Inserts','Parallels','Numbered cards','Autos / memorabilia','SSP / case hits','1/1s'].map(x=>`<div style="padding:9px 0;border-bottom:1px solid #173950"><b>${x}</b></div>`).join('')}<p class=sub style="margin-top:12px">Exact card-level data is shown only when sourced; CardStorm does not fabricate a checklist.</p></div></div><p><button class=cta onclick="show('sets')">← ALL SETS</button></p>`);};
  if(typeof pokemon==='function'){pokemon=function(){sport='pokemon';show('sets');};}
  return true;
}
let n=0;const t=setInterval(()=>{if(patch()||++n>40)clearInterval(t)},100);
})();