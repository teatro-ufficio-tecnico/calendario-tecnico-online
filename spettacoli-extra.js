/* TSC - Spettacoli: orari facoltativi, testi delle repliche e luogo in anteprima. */
(() => {
'use strict';
const palette={viola:['Viola','#f0e6ff','#7050b8','#44266f'],blu:['Blu','#e3efff','#2863ad','#153c70'],verde:['Verde','#e0f3e8','#24744c','#174b32'],arancione:['Arancione','#fff0df','#ac590b','#713c0b'],rosso:['Rosso','#ffe5e7','#b13348','#7b2333'],rosa:['Rosa','#fce5f1','#a43472','#72234f']};
const colorKey=c=>Object.hasOwn(palette,c)?c:'viola';
const colorOptions=c=>Object.entries(palette).map(([key,value])=>'<option value="'+key+'" '+(colorKey(c)===key?'selected':'')+'>'+value[0]+'</option>').join('');
const locations=sh=>Array.isArray(sh.spaces)?sh.spaces:(sh.space?[sh.space]:[]);
const noTime=sh=>sh.withoutTime===true||!sh.time;
showForm=function(sid){
 if(!can())return;
 const old=db.shows.find(x=>x.id===sid),group=old?(old.productionId||old.id):uid();
 const family=old?db.shows.filter(x=>old.productionId?x.productionId===group:x.id===old.id):[];
 const sh=old||{},dates=family.map(x=>x.date).sort();
 const start=sh.startDate||dates[0]||fmt(date),end=sh.endDate||dates[dates.length-1]||start;
 const spaces=allSpaces();for(const x of family.flatMap(locations))if(x&&!spaces.includes(x))spaces.push(x);
 modal(old?'Modifica spettacolo e repliche':'Nuovo spettacolo',
 '<form id="showForm"><div class="form">'+
 '<label class="full">Titolo dello spettacolo<input name="title" required value="'+esc(sh.title||'')+'"></label>'+
 '<label>Data inizio<input name="startDate" type="date" required value="'+esc(start)+'"></label>'+
 '<label>Data fine<input name="endDate" type="date" required value="'+esc(end)+'"></label>'+
 '<label>Orario predefinito<input id="sxDefaultTime" type="time" value="'+esc(sh.time||'20:30')+'"></label>'+
 '<label class="sx-check"><input type="checkbox" id="sxNoTime" '+(old&&noTime(sh)?'checked':'')+'>Senza orario per tutte le repliche</label>'+
 '<label>Colore predefinito<select id="sxDefaultColor">'+colorOptions(sh.color)+'</select></label>'+
 '<fieldset class="full"><legend>Luoghi dello spettacolo</legend><div class="checks" id="sxSpaces">'+check('spaces',spaces,locations(sh))+'</div><div class="inline"><input id="sxNewSpace" placeholder="Nuovo luogo"><button type="button" id="sxAddSpace">Aggiungi luogo</button></div></fieldset>'+
 '<div class="full"><button type="button" id="sxGenerate">Genera giorni del periodo</button><p class="note">Seleziona le repliche da salvare. Ogni replica può avere un testo, un colore, un luogo e un orario diversi. Se scegli Senza orario, la card non mostrerà ore.</p><div id="sxRows"></div><button type="button" id="sxAddReplica">Aggiungi replica</button></div>'+
 '<label class="full">Attrezzatura<textarea name="equipment" rows="3">'+esc(sh.equipment||'')+'</textarea></label>'+
 '<label class="full">Note generali<textarea name="notes" rows="3">'+esc(sh.notes||'')+'</textarea></label>'+
 '<label class="full">Link Drive<input name="driveLink" value="'+esc(sh.driveLink||'')+'"></label></div>'+
 '<div class="actions">'+(old?'<button type="button" id="sxDelete" class="danger">Elimina spettacolo e repliche</button>':'')+'<button type="button" class="close">Annulla</button><button class="primary">Salva spettacolo e repliche</button></div></form>');
 const form=document.getElementById('showForm'),rows=document.getElementById('sxRows');
 const globalNoTime=document.getElementById('sxNoTime'),defaultTime=document.getElementById('sxDefaultTime'),defaultColor=document.getElementById('sxDefaultColor');
 const pickedSpaces=()=>[...form.querySelectorAll('[name=spaces]:checked')].map(x=>x.value);
 function read(){return [...rows.children].map(row=>({id:row.dataset.id||'',date:row.querySelector('.sx-date').value,selected:row.querySelector('.sx-selected').checked,time:row.querySelector('.sx-time').value,withoutTime:row.querySelector('.sx-without').checked,replicaTitle:row.querySelector('.sx-text').value,color:row.querySelector('.sx-color').value,replicaSpace:row.querySelector('.sx-space').value}));}
 function add(value={}){
  const row=document.createElement('fieldset');row.className='sx-replica';row.dataset.id=value.id||'';
  const without=value.withoutTime??globalNoTime.checked;
  row.innerHTML='<legend>Replica</legend><label class="sx-check"><input type="checkbox" class="sx-selected" '+(value.selected?'checked':'')+'>Includi questa replica</label>'+
  '<div class="sx-fields"><label>Data<input type="date" class="sx-date" value="'+esc(value.date||form.elements.startDate.value)+'"></label>'+
  '<label>Testo / titolo della replica<input class="sx-text" placeholder="Ad esempio: Prova generale, Recita scuole…" value="'+esc(value.replicaTitle||'')+'"></label>'+
  '<label class="sx-check"><input type="checkbox" class="sx-without" '+(without?'checked':'')+'>Senza orario</label>'+
  '<label class="sx-time-label">Orario<input type="time" class="sx-time" value="'+esc(value.time||defaultTime.value||'20:30')+'"></label>'+
  '<label>Colore<select class="sx-color">'+colorOptions(value.color||defaultColor.value)+'</select></label>'+
  '<label>Luogo della replica<select class="sx-space"><option value="">Usa i luoghi dello spettacolo</option>'+spaces.map(x=>'<option value="'+esc(x)+'" '+(value.replicaSpace===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label></div>'+
  '<button type="button" class="sx-remove">Rimuovi replica</button>';
  const toggle=()=>{const disabled=row.querySelector('.sx-without').checked;row.querySelector('.sx-time').disabled=disabled;row.querySelector('.sx-time-label').hidden=disabled;};
  row.querySelector('.sx-without').onchange=()=>{row.querySelector('.sx-selected').checked=true;toggle();};
  row.querySelector('.sx-remove').onclick=()=>row.remove();
  row.querySelectorAll('.sx-fields input:not(.sx-without),.sx-fields select').forEach(el=>el.addEventListener('change',()=>row.querySelector('.sx-selected').checked=true));
  rows.append(row);toggle();
 }
 function generate(initial=false){
  const a=form.elements.startDate.value,b=form.elements.endDate.value;
  if(!a||!b||b<a){alert('Controlla le date di inizio e fine.');return;}
  const days=[];for(let d=new Date(a+'T12:00:00');fmt(d)<=b;d=plus(d,1)){if(days.length>=730){alert('Scegli al massimo 730 giorni.');return;}days.push(fmt(d));}
  const previous=initial?family.map(x=>({...x,selected:true,withoutTime:noTime(x),replicaSpace:x.replicaSpace||(locations(x).length===1?locations(x)[0]:'')})):read();
  if(!initial&&previous.some(x=>x.selected&&(x.date<a||x.date>b))&&!confirm('Le repliche fuori dal nuovo periodo verranno escluse dal modulo. Continuare?'))return;
  rows.replaceChildren();for(const day of days){const existing=previous.filter(x=>x.date===day);if(existing.length)existing.forEach(add);else add({date:day,selected:false});}
 }
 globalNoTime.onchange=()=>{
  defaultTime.disabled=globalNoTime.checked;
  rows.querySelectorAll('.sx-without').forEach(el=>{el.checked=globalNoTime.checked;const row=el.closest('.sx-replica');row.querySelector('.sx-time').disabled=el.checked;row.querySelector('.sx-time-label').hidden=el.checked;});
 };
 defaultTime.disabled=globalNoTime.checked;
 defaultColor.onchange=()=>rows.querySelectorAll('.sx-color').forEach(el=>el.value=defaultColor.value);
 document.getElementById('sxGenerate').onclick=()=>generate();
 document.getElementById('sxAddReplica').onclick=()=>add({selected:true});
 document.getElementById('sxAddSpace').onclick=()=>{
  const input=document.getElementById('sxNewSpace'),value=input.value.trim();if(!value)return;
  if(!spaces.includes(value)){spaces.push(value);const label=document.createElement('label'),checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.name='spaces';checkbox.value=value;checkbox.checked=true;label.append(checkbox,document.createTextNode(value));document.getElementById('sxSpaces').append(label);
   rows.querySelectorAll('.sx-space').forEach(select=>{const option=document.createElement('option');option.value=value;option.textContent=value;select.append(option);});
  }else form.querySelectorAll('[name=spaces]').forEach(el=>{if(el.value===value)el.checked=true;});input.value='';
 };
 generate(true);
 form.onsubmit=event=>{
  event.preventDefault();if(!unlocked)return;
  const a=form.elements.startDate.value,b=form.elements.endDate.value,title=form.elements.title.value.trim(),selected=read().filter(x=>x.selected);
  if(!title||!a||!b||b<a)return alert('Completa titolo e periodo.');
  if(!selected.length)return alert('Seleziona almeno una replica.');
  if(selected.some(x=>!x.date||x.date<a||x.date>b))return alert('Ogni replica deve avere una data compresa nel periodo.');
  if(selected.some(x=>!x.withoutTime&&!x.time))return alert('Inserisci un orario oppure seleziona Senza orario.');
  const common=pickedSpaces();if(selected.some(x=>!x.replicaSpace&&!common.length))return alert('Seleziona almeno un luogo generale o un luogo per ogni replica.');
  const entries=selected.map(x=>{
   const existing=family.find(y=>y.id===x.id),entry={...sh,...(existing||{}),id:existing?existing.id:uid(),productionId:group,startDate:a,endDate:b,title,date:x.date,time:x.withoutTime?'':x.time,withoutTime:x.withoutTime,replicaTitle:x.replicaTitle.trim(),replicaSpace:x.replicaSpace,spaces:x.replicaSpace?[x.replicaSpace]:[...common],color:colorKey(x.color),equipment:form.elements.equipment.value.trim(),notes:form.elements.notes.value.trim(),driveLink:form.elements.driveLink.value.trim()};return entry;
  });
  const newSpaces=[...new Set(entries.flatMap(locations))];for(const value of newSpaces)if(!db.spaces.some(x=>norm(x)===norm(value)))db.spaces.push(value);
  db.shows=db.shows.filter(x=>old?(old.productionId?x.productionId!==group:x.id!==old.id):true).concat(entries);
  save();close();render();
 };
 const del=document.getElementById('sxDelete');if(del)del.onclick=()=>{if(!confirm('Eliminare lo spettacolo e tutte le repliche?'))return;db.shows=db.shows.filter(x=>old.productionId?x.productionId!==group:x.id!==old.id);save();close();render();};
};
viewShow=function(sid){
 const sh=db.shows.find(x=>x.id===sid);if(!sh)return;
 let html='<div class="note"><p><b>Data:</b> '+esc(sh.date)+'</p>';
 if(sh.replicaTitle)html+='<p><b>Replica:</b> '+esc(sh.replicaTitle)+'</p>';
 if(!noTime(sh))html+='<p><b>Orario:</b> '+esc(sh.time)+'</p>';
 html+='<p><b>Luogo:</b> '+locations(sh).map(esc).join(' · ')+'</p>';
 if(sh.equipment)html+='<p><b>Attrezzatura:</b></p><pre class="eq">'+esc(sh.equipment)+'</pre>';
 if(sh.notes)html+='<p><b>Note:</b></p><pre class="eq">'+esc(sh.notes)+'</pre>';
 try{const link=new URL(sh.driveLink);if(['https:','http:'].includes(link.protocol))html+='<p><a target="_blank" rel="noopener noreferrer" href="'+esc(link.href)+'">Apri Drive</a></p>';}catch{}
 html+='</div><div class="actions"><button type="button" class="close">Chiudi</button>'+(unlocked?'<button type="button" id="sxEdit" class="primary">Modifica</button>':'')+'</div>';
 modal(sh.title||'Spettacolo',html);const edit=document.getElementById('sxEdit');if(edit)edit.onclick=()=>{close();showForm(sid);};
};
function preview(){
 document.querySelectorAll('[data-view-show]').forEach(card=>{
  const sh=db.shows.find(x=>x.id===card.dataset.viewShow);if(!sh)return;
  const html='<b>'+(!noTime(sh)?esc(sh.time)+' · ':'')+esc(sh.title||'Spettacolo')+'</b>'+(sh.replicaTitle?'<span class="sx-preview-text">'+esc(sh.replicaTitle)+'</span>':'')+'<span class="sx-preview-place">'+esc(locations(sh).join(' · ')||'Luogo non indicato')+'</span>';
  if(card.innerHTML!==html)card.innerHTML=html;
  const color=palette[colorKey(sh.color)];card.style.background=color[1];card.style.borderLeftColor=color[2];card.style.color=color[3];
 });
}
const style=document.createElement('style');style.textContent='.sx-replica{margin:12px 0;padding:12px}.sx-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0}.sx-fields label{display:grid;gap:5px;font-size:13px}.sx-check{display:flex!important;flex-direction:row;align-items:center;gap:8px!important}.sx-check input{width:18px;height:18px;flex-shrink:0}.sx-fields [hidden]{display:none!important}.sx-fields input,.sx-fields select{width:100%;min-width:0}.sx-preview-text,.sx-preview-place{display:block;margin-top:4px;white-space:pre-wrap}.sx-preview-place{font-size:.93em;font-weight:normal}#showForm .sx-check input{width:18px}@media(max-width:800px){.sx-fields{grid-template-columns:1fr}.sx-replica{padding:10px}}';document.head.append(style);
const content=document.getElementById('content');if(content)new MutationObserver(preview).observe(content,{childList:true,subtree:true});preview();
})();
