import {calculateStats, normalize, maxLevel, maxValues, moveAccess} from './pokedex-core.mjs';

const $ = s => document.querySelector(s);
const escape = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const types = {normal:'Normal',fire:'Fuego',water:'Agua',electric:'Eléctrico',grass:'Planta',ice:'Hielo',fighting:'Lucha',poison:'Veneno',ground:'Tierra',flying:'Volador',psychic:'Psíquico',bug:'Bicho',rock:'Roca',ghost:'Fantasma',dragon:'Dragón',dark:'Siniestro',steel:'Acero',fairy:'Hada'};
const colors = {fire:['#f5d8c3','#82411d'],water:['#d4e5f5','#28577e'],grass:['#dcebbf','#426321'],electric:['#f3eab8','#766116'],poison:['#e9d7ee','#784289'],dragon:['#ddd7f4','#58419a'],psychic:['#f3d4e0','#913d62'],ice:['#d6efed','#2c6e70'],dark:['#e0d9d0','#544736'],fighting:['#edd8cf','#8b4933'],ghost:['#dfdeee','#534e7c'],fairy:['#f1dce9','#864f71'],steel:['#dce6e5','#456764'],ground:['#ecdfc5','#7d6231'],flying:['#e2e5f1','#586b96'],bug:['#e3e9c2','#627221'],rock:['#e7e0cd','#756335'],normal:['#e7e5dd','#69665c']};
const maxNames = {fire:'Maxignición',bug:'Maxinsecto',electric:'Maxitormenta',normal:'Maxiataque',fighting:'Maxipuño',ghost:'Maxiespectro',ice:'Maxihelada',poison:'Maxiácido',water:'Maxichorro',flying:'Maxiciclón',fairy:'Maxiestela',dragon:'Maxidraco',psychic:'Maxionda',rock:'Maxilito',ground:'Maxitemblor',dark:'Maxisombra',grass:'Maxiflora',steel:'Maximetal'};
const gigaNames = {3:'Gigalianas',6:'Gigallamarada',9:'Gigacañonazo',12:'Gigaestupor',25:'Gigatronada',52:'Gigamonedas',68:'Gigapuñición',94:'Gigaaparición',99:'Gigaespuma',131:'Gigamelodía',143:'Gigarreciclaje',569:'Gigapestilencia',812:'Gigarredoble',815:'Gigaesfera Ígnea',818:'Gigadisparo',849:'Gigadescarga',861:'Gigasopor',884:'Gigadesgaste'};
const gigaArt = {3:10195,6:10196,9:10197,12:10198,25:10199,52:10200,68:10201,94:10202,99:10203,131:10204,143:10206,569:10207,812:10209,815:10210,818:10211,849:10219,861:10222,884:10225};
const artwork = id => 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/'+id+'.png';
const fmt = (v, digits=0) => Number(v).toLocaleString('es-ES',{maximumFractionDigits:digits});
const date = s => new Date(s+'T12:00:00Z').toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});
const pill = type => '<span class="type-pill" style="--type-bg:'+colors[type][0]+';--type-ink:'+colors[type][1]+'">'+types[type]+'</span>';
const settingsKey = 'pokehub:pokedex:v1';
let data, maxData, selected, computed, browse = false, limit = 12, fastMove, maxKind, mode = 'pve';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(settingsKey) || '{}') || {}; } catch { /* Optional preferences, route storage is separate. */ }
const settings = {level:40, ivs:[15,15,15], buddy:false, maxAttack:1, maxGuard:0, maxSpirit:0, adventure:false};
if (Number.isFinite(saved.level) && saved.level >= 1 && saved.level <= 50 && saved.level * 2 % 1 === 0) settings.level = saved.level;
if (Array.isArray(saved.ivs) && saved.ivs.length===3 && saved.ivs.every(v=>Number.isInteger(v)&&v>=0&&v<=15)) settings.ivs=saved.ivs;
settings.buddy = saved.buddy === true;

function persist() {
  try { localStorage.setItem(settingsKey,JSON.stringify({selected:selected.id,level:settings.level,ivs:settings.ivs,buddy:settings.buddy})); $('#settings-status').textContent='✓ Nivel e IV guardados en este navegador'; }
  catch { $('#settings-status').textContent='Este navegador no permite guardar tus ajustes.'; }
}
function imageErrors(container = document) {
  container.querySelectorAll('img').forEach(img => {
    img.onerror = () => {
      if (!img.dataset.fallback && img.src.includes('/official-artwork/')) { img.dataset.fallback='home'; img.src=img.src.replace('/official-artwork/','/home/'); }
      else { img.hidden=true; if(img.id==='pokemon-art') $('#art-fallback').hidden=false; }
    };
  });
}
function renderSearch() {
  const query = normalize($('#pokemon-search').value).replace(/^#/, '');
  const type = $('#type-filter').value;
  const popular = ['eternatus','charizard','mewtwo','metagross','zacian_crowned_sword','blastoise'];
  let matches = !query && !type && !browse ? popular.map(id=>data.pokemon.find(p=>p.id===id)).filter(Boolean) : data.pokemon.filter(p => (!type || p.types.includes(type)) && (!query || (/^\d+$/.test(query) ? p.dex===Number(query) : normalize(p.name+' '+p.form+' '+p.english).includes(query))));
  $('#clear-search').hidden=!query;
  $('#search-count').textContent=!query&&!type&&!browse?'Para empezar · elige una ficha':fmt(matches.length)+' fichas encontradas';
  $('#browse-all').hidden=browse||!!query||!!type;
  $('#load-more').hidden=matches.length<=limit;
  $('#search-results').innerHTML=matches.length ? matches.slice(0,limit).map(p=>'<button class="pokemon-result" data-pokemon="'+p.id+'" aria-pressed="'+(p.id===selected?.id)+'" aria-label="Ver '+escape(p.name+' '+p.form)+'"><img src="'+artwork(p.image||p.dex)+'" width="68" height="62" alt="" loading="lazy"><strong>'+escape(p.name)+'</strong><small>'+escape(p.form==='Normal'?'#'+String(p.dex).padStart(4,'0'):p.form)+'</small></button>').join(''):'<p class="no-results">No hay coincidencias. Prueba el nombre, el número de Pokédex o cambia el filtro de tipo.</p>';
  imageErrors($('#search-results'));
}
function selectPokemon(id, updateUrl=true) {
  selected=data.pokemon.find(p=>p.id===id)||data.pokemon.find(p=>p.id==='eternatus');
  fastMove=selected.fast[0]; maxKind=null;
  $('#pokemon-detail').hidden=false;
  $('#dex-number').textContent='#'+String(selected.dex).padStart(4,'0');
  $('#art-number').textContent=String(selected.dex).padStart(3,'0');
  $('#pokemon-category').textContent=selected.tags.includes('mega')?'Megaevolución':selected.tags.includes('legendary')?'Legendario':selected.tags.includes('mythical')?'Singular':'Pokémon GO';
  $('#pokemon-name').textContent=selected.name;
  $('#pokemon-types').innerHTML=selected.types.map(pill).join('');
  const forms=data.pokemon.filter(p=>p.dex===selected.dex);
  $('#form-select').innerHTML=forms.map(p=>'<option value="'+p.id+'"'+(p.id===selected.id?' selected':'')+'>'+escape(p.form)+'</option>').join('');
  $('#form-select').disabled=forms.length===1;
  const img=$('#pokemon-art'); img.hidden=false; delete img.dataset.fallback; $('#art-fallback').hidden=true;
  img.alt='Ilustración de '+selected.name+(selected.image&&selected.form!=='Normal'?' · '+selected.form:''); img.src=artwork(selected.image||selected.dex);
  $('#art-credit').textContent=selected.image?'Ilustraciones oficiales · archivo PokéAPI':'Ilustración de la especie base; no representa esta variante · PokéAPI';
  imageErrors();
  document.title=selected.name+' · Pokédex PokeHUB';
  if(updateUrl) window.history.replaceState(null,'','#pokemon='+encodeURIComponent(selected.id));
  renderStats(); renderMoves(); renderSearch(); persist();
}
function renderStats() {
  const level=settings.level+(settings.buddy?1:0);
  computed=calculateStats(selected.stats,level,settings.ivs,data.cpms);
  $('#cp-value').textContent=fmt(computed.cp); $('#iv-percent').textContent=fmt(settings.ivs.reduce((a,b)=>a+b,0)/45*100,1)+'%';
  $('#effective-level').textContent='NIVEL '+fmt(level,1)+(settings.buddy?' · +1 activo':'');
  $('#stat-rows').innerHTML=[['Ataque',computed.attack,400,''],['Defensa',computed.defense,400,''],['PS',computed.hp,450,'hp']].map(([label,value,max,cls])=>'<div class="stat-row '+cls+'"><span>'+label+'</span><div class="stat-bar" aria-hidden="true"><span style="width:'+Math.min(100,value/max*100)+'%"></span></div><strong>'+fmt(value,label==='PS'?0:1)+'</strong></div>').join('');
  $('#iv-preview').textContent=settings.ivs.join(' / ');
  $('[data-level="20"]').parentElement.querySelectorAll('[data-level]').forEach(el=>el.classList.toggle('active',Number(el.dataset.level)===settings.level));
  $('#stat-note').textContent='Base de la especie: '+selected.stats.atk+' ataque / '+selected.stats.def+' defensa / '+selected.stats.hp+' resistencia. Arriba: valores a tu nivel e IV, antes de bonus de combate.';
  renderMax();
}
function buffText(m) {
  if(!m.pvp.buffs) return '';
  const [atk,def]=m.pvp.buffs; const changes=[];
  if(atk) changes.push('Ataque '+(atk>0?'+':'')+atk);
  if(def) changes.push('Defensa '+(def>0?'+':'')+def);
  return '<small class="move-buff">'+changes.join(' · ')+' ('+(m.pvp.target==='opponent'?'rival':'propio')+') · '+fmt(m.pvp.chance*100)+'% de probabilidad</small>';
}
function renderMoves() {
  const pvp=mode==='pvp';
  $('#move-explainer').textContent=pvp?'Un turno equivale a 0,5 s. DPT y EPT comparan potencia y energía por turno de los ataques rápidos.':'Potencia, tiempo de ejecución y energía por uso. Los valores se muestran antes de STAB.';
  $('#move-date').textContent=pvp?'PvP · catálogo de PvPoke del '+date(data.meta.pvpDate):'PvE · copia del Game Master del '+date(data.meta.pveDate)+'. Puede no incluir cambios posteriores. Desliza la tabla para ver todas las columnas.';
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===mode));
  $('#move-tables').innerHTML=[['Rápidos',selected.fast,true],['Cargados',selected.charged,false]].map(([title,ids,isFast])=>{
    const visible=ids.filter(id=>!$('#legacy-only').checked||moveAccess(selected,id)!=='Normal');
    const headings=pvp?(isFast?['Potencia','Turnos','Energía','DPT','EPT']:['Potencia','Energía','Pot./energía']):['Potencia','Duración','Energía','Pot./s'];
    return '<div class="move-group"><h3>'+title+' <span>'+visible.length+' movimientos</span></h3>'+(visible.length?'<div class="table-scroll" tabindex="0" role="region" aria-label="Tabla de ataques '+title.toLowerCase()+'"><table class="moves-table"><thead><tr><th>Movimiento / acceso</th>'+headings.map(t=>'<th scope="col">'+t+'</th>').join('')+'</tr></thead><tbody>'+visible.map(id=>{
      const m=data.moves[id], v=pvp?m.pvp:m.pve, access=moveAccess(selected,id), stab=selected.types.includes(m.type);
      let cells;
      if(!v) cells=headings.map(()=>'<td title="Dato no disponible en esta fuente">—</td>').join('');
      else {
        const energy='<td class="'+(v.energy>0?'energy-positive':'energy-negative')+'">'+(v.energy>0?'+':'')+fmt(v.energy)+'</td>';
        cells='<td>'+fmt(v.power,1)+'</td>'+(pvp?(isFast?'<td>'+fmt(v.turns)+' <small>('+fmt(v.turns*.5,1)+' s)</small></td>'+energy+'<td>'+fmt(v.power/v.turns,2)+'</td><td>'+fmt(v.energy/v.turns,2)+'</td>':energy+'<td>'+(v.energy<0?fmt(v.power/-v.energy,2):'—')+'</td>'):'<td>'+fmt(v.seconds,2)+' s</td>'+energy+'<td>'+(v.seconds?fmt(v.power/v.seconds,1):'—')+'</td>');
      }
      return '<tr><td><strong class="move-name">'+escape(m.name)+'</strong><span class="move-badges">'+pill(m.type)+'<span class="access-badge'+(access==='Normal'?' normal-access':'')+'">'+access+'</span>'+(stab?'<span class="stab-badge">STAB ×1,2</span>':'')+'</span>'+(pvp?buffText(m):'')+'</td>'+cells+'</tr>';
    }).join('')+'</tbody></table></div>':'<p class="empty-moves">No hay movimientos '+title.toLowerCase()+' con este filtro.</p>')+'</div>';
  }).join('');
}
function eligibleForm(p) {
  return !p.tags.includes('mega')&&(p.form==='Normal'||['darmanitan_standard','toxtricity_amped','toxtricity_low_key','toxtricity','urshifu_single_strike','urshifu_rapid_strike','unfezant_male','unfezant_female'].includes(p.id));
}
function maxOptions(p) {
  if(p.id==='eternatus') return ['eternamax']; // Power tier only: Eternatus does NOT visually transform.
  if(p.id==='zacian_crowned_sword'||p.id==='zamazenta_crowned_shield') return ['special'];
  if(!eligibleForm(p)) return [];
  return [...(maxData.dynamax.confirmedDexIds.includes(p.dex)?['dmax']:[]),...(maxData.gigantamax.some(g=>g.dex===p.dex)?['gmax']:[])];
}
function levelSelect(key,title,min) {
  return '<label>Nivel entrenado<select aria-label="Nivel de '+title+'" data-max-level="'+key+'">'+Array.from({length:4-min},(_,i)=>i+min).map(n=>'<option value="'+n+'"'+(settings[key]===n?' selected':'')+'>'+(n?'Nivel '+n:'Bloqueado')+'</option>').join('')+'</select></label>';
}
function renderMax() {
  if(!maxData||!computed) return;
  const options=maxOptions(selected), root=$('#max-content');
  if(!options.length) {
    root.innerHTML='<div class="max-unknown"><span aria-hidden="true">↗</span><div><strong>Dinamax no confirmado para esta forma en este catálogo.</strong><p>La lista recoge compatibilidades documentadas; no incluye automáticamente todas las formas programadas. Puedes consultar otra forma de '+escape(selected.name)+' o revisar los anuncios oficiales.</p></div></div><p class="max-source"><a href="https://pokemongo.com/max-pokemon-battle?hl=es" target="_blank" rel="noopener noreferrer">Consultar Pokémon GO ↗</a> · Revisión '+date(maxData.researchedOn)+'</p>';
    return;
  }
  if(!options.includes(maxKind)) maxKind=options.includes('gmax')?'gmax':options[0];
  const special=maxKind==='special', eternatus=maxKind==='eternamax', giga=maxKind==='gmax';
  const g=maxData.gigantamax.find(g=>g.dex===selected.dex);
  const move=data.moves[fastMove];
  const attackType=eternatus?'dragon':special?'steel':giga?g.type.toLowerCase():move.type;
  const name=eternatus?'Cañón Dinamax · fase Max':special?(selected.dex===888?'Tajo Supremo':'Embate Supremo'):giga?gigaNames[selected.dex]:maxNames[attackType];
  const attackLevel=maxLevel(settings.maxAttack,settings.adventure,special),guardLevel=maxLevel(settings.maxGuard,settings.adventure,special),spiritLevel=maxLevel(settings.maxSpirit,settings.adventure,special);
  const attack=maxValues(maxKind,attackLevel,selected.types,attackType,computed.hp),guard=maxValues(maxKind,guardLevel,selected.types,attackType,computed.hp),spirit=maxValues(maxKind,spiritLevel,selected.types,attackType,computed.hp);
  const labels={dmax:'Dinamax',gmax:'Gigamax',eternamax:'Especial Max · Eternatus',special:'Especial Max'};
  let sourceKey=eternatus?'finale2025':special?'crownedMax':giga?g.source:maxData.dynamax.confirmedGroups.find(group=>group.families.flat().includes(selected.dex))?.source;
  const source=maxData.sources[sourceKey]?.url||maxData.sources.officialMax.url;
  root.innerHTML='<div class="max-controls"><label>Modalidad de tu ejemplar<select id="max-kind">'+options.map(o=>'<option value="'+o+'"'+(maxKind===o?' selected':'')+'>'+labels[o]+'</option>').join('')+'</select></label>'+(!special&&!eternatus?'<label>Ataque rápido<select id="max-fast">'+selected.fast.map(id=>'<option value="'+id+'"'+(id===fastMove?' selected':'')+'>'+escape(data.moves[id].name)+' · '+types[data.moves[id].type]+'</option>').join('')+'</select></label>':'')+'</div><label class="max-effect"><input id="max-adventure" type="checkbox"'+(settings.adventure?' checked':'')+(special?' disabled':'')+'><span>Efecto de aventura: Cañón Dinamax<small>'+(special?'No aumenta los movimientos Max de Zacian ni Zamazenta.':'Simula +1 nivel temporal. Las mejoras de nivel 3 pasan a nivel 4.')+'</small></span></label><div class="max-cards">'+
    '<article class="max-card"><div class="max-card-icon" aria-hidden="true">↗</div><h3>'+name+'</h3><div class="max-card-number">'+attack.power+'<span>potencia</span></div><strong class="max-boost">'+types[attackType]+' · '+(attack.stab>1?fmt(attack.boostedPower)+' con STAB':'sin STAB')+'</strong><p>Nivel efectivo '+attackLevel+'. '+(giga?'Su tipo es fijo, aunque cambies el ataque rápido.':eternatus?'Eternatus conserva su aspecto normal en la fase Max.':special?'Movimiento especial utilizable en Combates Max.':'El tipo lo determina el ataque rápido seleccionado.')+'</p>'+levelSelect('maxAttack','ataque Max',1)+'</article>'+
    '<article class="max-card"><div class="max-card-icon" aria-hidden="true">◇</div><h3>'+(special?'Barrera':'Maxibarrera')+'</h3><div class="max-card-number">'+(guardLevel?guard.guard:'—')+'<span>PS de escudo</span></div><strong class="max-boost">'+(guardLevel?'Por uso · nivel efectivo '+guardLevel:'Movimiento bloqueado')+'</strong><p>'+(selected.id==='zamazenta_crowned_shield'?'Al desbloquear: 1 escudo inicial y hasta 4 acumulados (observación comunitaria).':'Protege al usuario. El escudo se consume al recibir daño.')+'</p>'+levelSelect('maxGuard','Maxibarrera',0)+'</article>'+
    '<article class="max-card"><div class="max-card-icon" aria-hidden="true">✧</div><h3>'+(special?'Vigor':'Maxivigor')+'</h3><div class="max-card-number">'+(spiritLevel?spirit.healingPercent+'%':'—')+'<span>de curación</span></div><strong class="max-boost">'+(spiritLevel?'≈ '+fmt(spirit.healing,1)+' PS por aliado':'Movimiento bloqueado')+'</strong><p>Se basa en los '+computed.hp+' PS máximos del usuario que cura. Recupera PS propios y de sus aliados.</p>'+levelSelect('maxSpirit','Maxivigor',0)+'</article></div>'+
    '<p class="max-summary">'+(special||eternatus?'Participante especial en Combates Max.':'Solo se aplica si tu ejemplar tiene la capacidad '+(giga?'Gigamax':'Dinamax')+'; un ejemplar normal de la misma especie no la adquiere al subir de nivel.')+' El nivel del movimiento Max es independiente del nivel del Pokémon. Potencia y escudo no equivalen a daño real contra un jefe.</p>'+
    (giga?'<div class="max-comparison"><img src="'+artwork(gigaArt[selected.dex])+'" width="86" height="80" alt="'+escape(selected.name)+' Gigamax" loading="lazy"><div><strong>Más potencia en el ataque Gigamax</strong>A nivel '+attackLevel+': '+attack.power+' frente a '+[250,300,350,450][attackLevel-1]+' de un ataque Dinamax del mismo nivel, antes de STAB. No se atribuyen efectos secundarios de otros juegos.</div></div>':'')+
    (eternatus?'<div class="adventure-note"><strong>Cañón Dinamax también funciona fuera de combate.</strong>5.000 Polvos Estelares + 30 Caramelos de Eternatus: +1 nivel a los movimientos Max durante 10 minutos. Los movimientos bloqueados pasan temporalmente a nivel 1. Excluye a Zacian y Zamazenta; no se combina con otro efecto de aventura.</div>':special?'<div class="adventure-note"><strong>Efecto de aventura de '+(selected.dex===888?'Tajo Supremo':'Embate Supremo')+'</strong>5.000 Polvos Estelares + 5 caramelos: 6 minutos de bonus de '+(selected.dex===888?'ataque':'defensa')+'. Según el Game Master: ×1,10 en incursiones y ×1,05 en Combates Max. Estos multiplicadores no se han aplicado a las estadísticas de arriba.</div>':'')+
    '<p class="max-source">Cifras Max: <a href="'+maxData.sources.maxResearch.url+'" target="_blank" rel="noopener noreferrer">investigación comunitaria</a>, no una tabla oficial. <a href="'+source+'" target="_blank" rel="noopener noreferrer">Confirmación oficial de la modalidad ↗</a></p>';
  imageErrors(root);
}

async function init() {
  $('#load-error').hidden=true;
  try {
    const responses=await Promise.all([fetch('pokedex-data.json'),fetch('max-data.json')]);
    if(responses.some(r=>!r.ok)) throw new Error('Catalogue unavailable');
    [data,maxData]=await Promise.all(responses.map(r=>r.json()));
    $('#catalogue-badge').textContent=fmt(new Set(data.pokemon.map(p=>p.dex)).size)+' ESPECIES · '+fmt(data.pokemon.length)+' FORMAS';
    $('#type-filter').innerHTML='<option value="">Todos los tipos</option>'+Object.entries(types).sort((a,b)=>a[1].localeCompare(b[1],'es')).map(([id,label])=>'<option value="'+id+'">'+label+'</option>').join('');
    $('#source-dates').textContent='Estadísticas, repertorios y PvP: '+date(data.meta.pvpDate)+'. Ataques PvE: '+date(data.meta.pveDate)+'. Compatibilidades Max revisadas: '+date(maxData.researchedOn)+'.';
    $('#level-range').value=settings.level;$('#level-number').value=settings.level;$('#best-buddy').checked=settings.buddy;
    ['#iv-atk','#iv-def','#iv-hp'].forEach((s,i)=>$(s).value=settings.ivs[i]);
    const hash=new URLSearchParams(location.hash.slice(1));selectPokemon(hash.get('pokemon')||saved.selected||'eternatus');
  } catch(error) { $('#load-error').hidden=false;$('#catalogue-badge').textContent='Sin conexión al catálogo';$('#search-count').textContent='Datos no disponibles';console.error('Pokedex:',error); }
}
$('#pokemon-search').addEventListener('input',()=>{limit=12;if(data)renderSearch();});
$('#pokemon-search').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();$('#search-results button')?.click();}if(event.key==='Escape')$('#clear-search').click();});
$('#type-filter').addEventListener('change',()=>{limit=12;if(data)renderSearch();});
$('#browse-all').addEventListener('click',()=>{browse=true;limit=24;if(data)renderSearch();});
$('#load-more').addEventListener('click',()=>{limit+=24;renderSearch();});
$('#clear-search').addEventListener('click',()=>{$('#pokemon-search').value='';limit=12;renderSearch();$('#pokemon-search').focus();});
$('#search-results').addEventListener('click',event=>{const b=event.target.closest('[data-pokemon]');if(b){selectPokemon(b.dataset.pokemon);if(window.innerWidth<700)$('#pokemon-detail').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}});
$('#form-select').addEventListener('change',event=>selectPokemon(event.target.value));
function setLevel(value) {if(!Number.isFinite(value)||value<1||value>50||value*2%1)return;settings.level=value;$('#level-range').value=value;$('#level-number').value=value;renderStats();persist();}
$('#level-range').addEventListener('input',event=>{if(selected)setLevel(Number(event.target.value));});
$('#level-number').addEventListener('input',event=>{if(event.target.value!==''&&selected)setLevel(Number(event.target.value));});
$('#level-number').addEventListener('change',()=>{$('#level-number').value=settings.level;});
document.querySelectorAll('[data-level]').forEach(b=>b.addEventListener('click',()=>setLevel(Number(b.dataset.level))));
$('#best-buddy').addEventListener('change',event=>{settings.buddy=event.target.checked;renderStats();persist();});
['#iv-atk','#iv-def','#iv-hp'].forEach((s,i)=>{$(s).addEventListener('input',event=>{const n=Number(event.target.value);if(event.target.value!==''&&Number.isInteger(n)&&n>=0&&n<=15){settings.ivs[i]=n;renderStats();persist();}});$(s).addEventListener('change',()=>$(s).value=settings.ivs[i]);});
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;renderMoves();}));
$('#legacy-only').addEventListener('change',renderMoves);
$('#max-content').addEventListener('change',event=>{const el=event.target;if(el.id==='max-kind')maxKind=el.value;if(el.id==='max-fast')fastMove=el.value;if(el.id==='max-adventure')settings.adventure=el.checked;if(el.dataset.maxLevel)settings[el.dataset.maxLevel]=Number(el.value);renderMax();});
$('#retry-load').addEventListener('click',init);
window.addEventListener('hashchange',()=>{const id=new URLSearchParams(location.hash.slice(1)).get('pokemon');if(data&&id&&id!==selected.id)selectPokemon(id,false);});
init();
