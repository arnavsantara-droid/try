window.Historia = window.Historia || {};
(function(H){
"use strict";
const {fmt,dateText,shortDate,clamp,norm,pick}=H.util;
H.ui={tab:"actions",timelineFilter:"all",selectedStart:"DEU"};

const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const badge=(t,c="")=>`<span class="badge ${c}">${esc(t)}</span>`;
const bar=(value,max=100)=>`<div class="progress"><div style="width:${clamp(value/max*100)}%"></div></div>`;
const kv=(k,v,cls="")=>`<div class="kv"><span>${esc(k)}</span><span class="${cls}">${esc(v)}</span></div>`;

H.toast=function(text){
  const el=$("#toast");if(!el)return;el.textContent=text;el.classList.add("show");clearTimeout(H.ui.toastTimer);H.ui.toastTimer=setTimeout(()=>el.classList.remove("show"),1800);
};

function countryHeader(){
  const c=H.C(H.state.player);if(!c)return "";
  return `<div class="countryIdentity"><div class="flag">${c.flag}</div><div><div class="countryName">${esc(c.name)}</div><div class="countrySubtitle">${esc(c.leader)} · ${esc(c.ideology)} · ${esc(c.faction)}</div></div></div>
  <div class="stats">
    <div class="stat"><div class="statLabel">ARMY</div><div class="statValue">${fmt(c.army)}k</div></div>
    <div class="stat"><div class="statLabel">INDUSTRY</div><div class="statValue">${fmt(c.industry,1)}</div></div>
    <div class="stat"><div class="statLabel">TREASURY</div><div class="statValue">${fmt(c.treasury,1)}</div></div>
    <div class="stat"><div class="statLabel">STABILITY</div><div class="statValue">${fmt(c.stability)}%</div></div>
    <div class="stat"><div class="statLabel">WAR SUPPORT</div><div class="statValue">${fmt(c.warSupport)}%</div></div>
    <div class="stat"><div class="statLabel">READINESS</div><div class="statValue">${fmt(c.readiness)}%</div></div>
  </div>`;
}

function actionsPanel(){
  const queue=H.state.queue;
  return `
  <span class="heading">FREE-FORM GOVERNMENT ORDER</span>
  <div class="hint">Type a decision in ordinary language. You can include scale, duration, secrecy, safeguards and conditions in the same sentence.</div>
  <textarea id="orderInput" placeholder="Example: Mobilise 500,000 reservists over 12 months, exempt skilled factory workers, and avoid major public unrest."></textarea>
  <div class="quickActions">${H.QUICK_ORDERS.slice(0,7).map(x=>`<button class="quickChip" data-quick="${esc(x)}">${esc(x)}</button>`).join("")}</div>
  <div class="row">
    <button class="btn primary grow" id="queueOrderBtn">QUEUE ORDER</button>
    <button class="btn" id="clearOrderBtn">CLEAR</button>
  </div>
  <hr class="sep">
  <div class="row space"><span class="heading" style="margin:0">ORDER QUEUE</span>${badge(`${queue.length} pending`,queue.length?"gold":"")}</div>
  ${queue.length?queue.map(o=>`<div class="queueItem">
      <div class="row space"><div class="queueText">${esc(o.text)}</div><button class="removeBtn" data-remove="${o.id}">×</button></div>
      <div class="queueType">${esc(o.domain)} · ${esc(o.type.replaceAll("_"," "))}${o.target?` · ${esc(H.C(o.target)?.name)}`:""}${o.secrecy?" · SECRET":""}</div>
      ${o.conditional?`<div class="small">Condition: ${esc(o.conditional)}</div>`:""}
      ${o.safeguards?.length?`<div class="effects">${o.safeguards.map(s=>`<span class="effect">${esc(s.replaceAll("_"," "))}</span>`).join("")}</div>`:""}
    </div>`).join(""):`<div class="card"><div class="small">Orders can be queued together and begin when time advances.</div></div>`}
  <button class="btn full" id="resolveAndAdvance">${queue.length?"EXECUTE QUEUE & ADVANCE 1 MONTH":"ADVANCE 1 MONTH"}</button>`;
}

function relationshipClass(v){return v>30?"positive":v<-25?"negative":"neutral"}
function diplomacyPanel(){
  const target=H.state.selectedCountry;
  if(!target||target===H.state.player)return `<span class="heading">DIPLOMACY</span><div class="card">Select another country on the map to open a diplomatic channel.</div>`;
  const a=H.state.player,b=target,B=H.C(b),key=`${a}:${b}`,msgs=H.state.chats[key]||[];
  const activeTreaties=H.state.treaties.filter(t=>t.active&&t.members.includes(a)&&t.members.includes(b));
  return `<span class="heading">FOREIGN GOVERNMENT</span>
  <div class="card emphasis">
    <div class="row space"><strong>${B.flag} ${esc(B.name)}</strong>${badge(B.faction,B.faction==="Independent"?"":"blue")}</div>
    <div class="small">${esc(B.leader)} · ${esc(B.ideology)}</div>
    <hr class="sep">
    ${kv("Relations",`${Math.round(H.relation(a,b))}`,relationshipClass(H.relation(a,b)))}
    ${kv("Trust",`${Math.round(H.trust(a,b))}%`,relationshipClass(H.trust(a,b)-50))}
    ${kv("Their threat perception",`${Math.round(H.threat(b,a))}%`,H.threat(b,a)>45?"negative":"neutral")}
    ${activeTreaties.length?`<div class="effects">${activeTreaties.map(t=>`<span class="effect">${esc(t.type.toUpperCase())}</span>`).join("")}</div>`:""}
  </div>
  <span class="heading">DIPLOMATIC CHANNEL</span>
  <div class="chatMessages">${msgs.length?msgs.slice(-20).map(m=>`<div class="message ${m.side}">${esc(m.text)}<div class="small">${esc(m.date)}</div></div>`).join(""):`<div class="small">No messages exchanged yet. Agreements made here alter the simulation.</div>`}</div>
  <div class="chatRow"><input id="dipInput" placeholder="Offer terms, reassure, threaten, negotiate…"><button class="btn primary" id="dipSend">SEND</button></div>
  <div class="quickActions">
    <button class="quickChip dipQuick">Offer a non-aggression pact</button>
    <button class="quickChip dipQuick">Propose a trade agreement</button>
    <button class="quickChip dipQuick">Improve relations</button>
    <button class="quickChip dipQuick">Issue an ultimatum</button>
  </div>`;
}

function warCard(w){
  const side=w.attackers.includes(H.state.player)?"ATTACKING":w.defenders.includes(H.state.player)?"DEFENDING":"OBSERVING";
  return `<div class="card warning">
    <div class="row space"><strong>${esc(w.name)}</strong>${badge(side,"red")}</div>
    <div class="small">Since ${shortDate(w.start)}</div>
    <div class="effects">
      ${w.attackers.map(c=>`<span class="effect">⚔ ${esc(H.C(c)?.name)}</span>`).join("")}
      ${w.defenders.map(c=>`<span class="effect">🛡 ${esc(H.C(c)?.name)}</span>`).join("")}
    </div>
    ${(w.fronts||[]).map(f=>{
      const r=H.REGIONS.find(x=>x.id===f.targetRegion);
      return `<div style="margin-top:7px">${kv(r?`Front: ${r.name}`:"Front","Offensive pressure "+Math.round(f.progress)+"%")}${bar(f.progress,100)}</div>`;
    }).join("")}
    ${kv("Territory seized",String(w.territoryTaken||0))}
  </div>`;
}

function militaryPanel(){
  const c=H.C(H.state.player),wars=H.state.wars.filter(w=>w.active&&(w.attackers.includes(H.state.player)||w.defenders.includes(H.state.player)));
  const deps=H.state.deployments.filter(d=>d.active&&d.actor===H.state.player);
  const regs=H.regionsOf(H.state.player);
  return `<span class="heading">ARMED FORCES</span>
  <div class="metricGrid">
    <div class="metric"><div class="k">Army</div><div class="v">${fmt(c.army)}k</div>${bar(c.army,Math.max(700,c.army))}</div>
    <div class="metric"><div class="k">Equipment reserve</div><div class="v">${fmt(c.reserveEquipment)}</div>${bar(c.reserveEquipment,Math.max(500,c.army))}</div>
    <div class="metric"><div class="k">Quality</div><div class="v">${fmt(c.quality)}%</div>${bar(c.quality)}</div>
    <div class="metric"><div class="k">Readiness</div><div class="v">${fmt(c.readiness)}%</div>${bar(c.readiness)}</div>
    <div class="metric"><div class="k">Air power</div><div class="v">${fmt(c.air)}</div>${bar(c.air,110)}</div>
    <div class="metric"><div class="k">Naval power</div><div class="v">${fmt(c.navy)}</div>${bar(c.navy,110)}</div>
    <div class="metric"><div class="k">Logistics</div><div class="v">${fmt(c.logistics)}%</div>${bar(c.logistics,110)}</div>
    <div class="metric"><div class="k">Fuel</div><div class="v">${fmt(c.fuel)}%</div>${bar(c.fuel,140)}</div>
  </div>
  <span class="heading" style="margin-top:10px">ACTIVE WARS</span>${wars.length?wars.map(warCard).join(""):`<div class="card"><div class="small">Not currently at war.</div></div>`}
  <span class="heading">DEPLOYMENTS</span>${deps.length?deps.map(d=>`<div class="card">${kv("Forces",`${fmt(d.amount)}k`)}${kv("Facing",H.C(d.target)?.name||H.REGIONS.find(r=>r.id===d.region)?.name||"Strategic reserve")}${kv("Posture",d.posture)}${d.conditional?`<div class="small">Fallback: ${esc(d.conditional)}</div>`:""}</div>`).join(""):`<div class="small">No special forward deployments.</div>`}
  <span class="heading" style="margin-top:10px">STRATEGIC REGIONS</span>${regs.map(r=>`<div class="card">${kv(r.name,H.state.regionControl[r.id]===H.state.player?"Controlled":`Occupied by ${H.C(H.state.regionControl[r.id])?.name||"Unknown"}`)}${kv("Fortifications",`${(H.state.fortifications[r.id]||0).toFixed(1)}/10`)}</div>`).join("")}`;
}

function policyCard(p){
  let detail="";
  if(p.type==="mobilize")detail=`${fmt(p.recruited||0)}k recruited · ${fmt(p.remaining||0)}k remaining`;
  if(p.type==="research")detail=`${p.subject} research ${(H.C(p.actor).research[p.subject]||0).toFixed(1)}/100`;
  if(p.type==="fortify"&&p.region)detail=`Fortification ${(H.state.fortifications[p.region]||0).toFixed(1)}/10`;
  return `<div class="card"><div class="row space"><strong>${esc(p.label)}</strong>${badge(`${Math.round(p.progress||0)}%`,"gold")}</div>${bar(p.progress||0)}${detail?`<div class="small">${esc(detail)}</div>`:""}<div class="small">${p.elapsed||0}/${p.duration} days · intensity ${Number(p.intensity||1).toFixed(1)}×</div></div>`;
}

function statePanel(){
  const c=H.C(H.state.player),ps=H.state.policies.filter(p=>p.active&&p.actor===H.state.player);
  const trades=H.state.tradeLinks.filter(t=>t.active&&(t.a===H.state.player||t.b===H.state.player));
  return `<span class="heading">NATIONAL STATE</span>
  <div class="metricGrid">
    <div class="metric"><div class="k">GDP</div><div class="v">${fmt(c.gdp,1)}</div></div>
    <div class="metric"><div class="k">Treasury</div><div class="v">${fmt(c.treasury,1)}</div></div>
    <div class="metric"><div class="k">Debt</div><div class="v">${fmt(c.debt,1)}</div></div>
    <div class="metric"><div class="k">Tax rate</div><div class="v">${(c.taxRate*100).toFixed(1)}%</div></div>
    <div class="metric"><div class="k">Industry</div><div class="v">${fmt(c.industry,1)}</div></div>
    <div class="metric"><div class="k">Technology</div><div class="v">${fmt(c.technology,1)}</div></div>
    <div class="metric"><div class="k">Available manpower</div><div class="v">${fmt(c.manpower)}k</div></div>
    <div class="metric"><div class="k">Food</div><div class="v">${fmt(c.food)}%</div></div>
    <div class="metric"><div class="k">Fuel</div><div class="v">${fmt(c.fuel)}%</div></div>
    <div class="metric"><div class="k">War exhaustion</div><div class="v">${fmt(c.exhaustion)}%</div></div>
  </div>
  <span class="heading" style="margin-top:10px">ACTIVE POLICIES</span>${ps.length?ps.map(policyCard).join(""):`<div class="card"><div class="small">No active long-term programmes.</div></div>`}
  <span class="heading">TRADE DEPENDENCIES</span>${trades.length?trades.map(t=>{const other=t.a===H.state.player?t.b:t.a;return `<div class="card">${kv(H.C(other)?.name||other,`${t.resource} · volume ${t.volume.toFixed(1)}`)}</div>`}).join(""):`<div class="small">No special bilateral trade agreements.</div>`}`;
}

function estimate(value,knowledge,kind="num"){
  const uncertainty=Math.max(.03,(100-knowledge)/100*.32);
  if(kind==="pct"){
    const spread=Math.max(2,value*uncertainty);return `${Math.round(Math.max(0,value-spread))}–${Math.round(Math.min(100,value+spread))}%`;
  }
  const spread=Math.max(1,value*uncertainty);return `${fmt(Math.max(0,value-spread))}–${fmt(value+spread)}`;
}
function intelPanel(){
  const b=H.state.selectedCountry;if(!b||b===H.state.player)return `<span class="heading">INTELLIGENCE</span><div class="card">Select another country on the map. Intelligence is intentionally imperfect.</div>`;
  const a=H.state.player,B=H.C(b),k=H.knowledge(a,b);
  const memories=H.memoriesAbout(a,b).slice(-5).reverse();
  const knownGoals=k>55?B.goals:k>30?B.goals.slice(0,2):B.goals.slice(0,1);
  return `<span class="heading">INTELLIGENCE ESTIMATE</span>
  <div class="card emphasis"><div class="row space"><strong>${B.flag} ${esc(B.name)}</strong>${badge(`confidence ${Math.round(k)}%`,k>65?"green":k<30?"red":"gold")}</div><div class="small">${esc(B.leader)} · ${esc(B.ideology)} · ${esc(B.faction)}</div></div>
  <div class="metricGrid">
    <div class="metric"><div class="k">Army estimate</div><div class="v">${estimate(B.army,k)}k</div></div>
    <div class="metric"><div class="k">Industry</div><div class="v">${estimate(B.industry,k)}</div></div>
    <div class="metric"><div class="k">Readiness</div><div class="v">${estimate(B.readiness,k,"pct")}</div></div>
    <div class="metric"><div class="k">Technology</div><div class="v">${estimate(B.technology,k)}</div></div>
    <div class="metric"><div class="k">Fuel</div><div class="v">${estimate(B.fuel,k,"pct")}</div></div>
    <div class="metric"><div class="k">Stability</div><div class="v">${estimate(B.stability,k,"pct")}</div></div>
  </div>
  <span class="heading" style="margin-top:10px">ASSESSED OBJECTIVES</span><div class="card">${knownGoals.map(g=>`<div>• ${esc(g)}</div>`).join("")}${k<35?`<div class="small" style="margin-top:5px">Low confidence: additional objectives may be unknown.</div>`:""}</div>
  <span class="heading">DIPLOMATIC MEMORY</span>${memories.length?memories.map(m=>`<div class="card"><strong>${esc(m.type.replaceAll("_"," "))}</strong><div class="small">${esc(m.text)} · ${shortDate(m.date)}</div></div>`).join(""):`<div class="small">No important remembered interaction in your current intelligence record.</div>`}
  ${H.state.difficulty!=="forgiving"?`<div class="card"><div class="small">Harder difficulties do not give AI numeric cheats. They reduce planning noise and improve action selection.</div></div>`:""}`;
}

function renderPanel(){
  const el=$("#panel");if(!el||!H.state.player)return;
  const html={actions:actionsPanel,diplomacy:diplomacyPanel,military:militaryPanel,state:statePanel,intel:intelPanel}[H.ui.tab]?.()||actionsPanel();
  el.innerHTML=html;bindPanel();
}

function bindPanel(){
  $("#queueOrderBtn")?.addEventListener("click",()=>{
    const input=$("#orderInput"),text=input.value.trim();if(!text)return H.toast("Type an order first");
    const result=H.queueOrder(text);input.value="";renderPanel();
    const count=Array.isArray(result)?result.length:1;
    H.toast(count>1?`${count} coordinated orders queued`:`${result.type.replaceAll("_"," ")} order queued`);
  });
  $("#clearOrderBtn")?.addEventListener("click",()=>{if($("#orderInput"))$("#orderInput").value=""});
  $("#orderInput")?.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter")$("#queueOrderBtn")?.click()});
  document.querySelectorAll("[data-quick]").forEach(b=>b.addEventListener("click",()=>{const i=$("#orderInput");i.value=b.dataset.quick;i.focus()}));
  document.querySelectorAll("[data-remove]").forEach(b=>b.addEventListener("click",()=>{H.removeQueued(b.dataset.remove);renderPanel()}));
  $("#resolveAndAdvance")?.addEventListener("click",()=>{H.advanceAndRender(30)});
  document.querySelectorAll(".dipQuick").forEach(b=>b.addEventListener("click",()=>{const i=$("#dipInput");i.value=b.textContent;i.focus()}));
  $("#dipSend")?.addEventListener("click",sendDiplomacy);
  $("#dipInput")?.addEventListener("keydown",e=>{if(e.key==="Enter")sendDiplomacy()});
}

function diplomaticReply(actor,target,text,beforeEvents){
  const B=H.C(target),r=H.relation(target,actor),t=H.trust(target,actor),fear=H.threat(target,actor);
  const newEvents=H.state.events.slice(0,Math.max(0,H.state.events.length-beforeEvents)).filter(e=>e.actors.includes(target));
  const outcome=newEvents[0]?.title||"";
  if(/AGREEMENT|PACT|ALLIANCE|GUARANTEED|TRADE/.test(outcome))return pick([
    "Our government accepts. We will judge the agreement by how faithfully both sides uphold it.",
    "These terms are acceptable. We expect your future conduct to match your assurances.",
    "We can proceed on that basis. This creates obligations for both governments."
  ]);
  if(/DECLINED|REJECTED|INCOMPLETE/.test(outcome))return pick([
    "We cannot accept these terms under the present strategic circumstances.",
    "Your proposal does not yet address our security concerns.",
    "Our government declines. A different balance of commitments may reopen the discussion."
  ]);
  if(fear>60&&t<40)return "Your assurances are noted, but our security services and military planners see a significant gap between your words and your recent behaviour.";
  if(r>35&&t>60)return "We regard this as a constructive approach. Continued cooperation could support a broader understanding.";
  if(r<-35)return "Relations between our governments remain poor. We will evaluate any proposal primarily through the lens of national security.";
  return "Your position is understood. We will assess it against our national interests and the wider balance of power.";
}

function sendDiplomacy(){
  const input=$("#dipInput"),text=input?.value.trim(),a=H.state.player,b=H.state.selectedCountry;if(!text||!b||a===b)return;
  const key=`${a}:${b}`;H.state.chats[key]=H.state.chats[key]||[];H.state.chats[key].push({side:"me",text,date:shortDate(H.state.date)});
  const order=H.interpret(text,a);order.target=order.target||b;const before=H.state.events.length;
  const dipTypes=["nap","alliance","guarantee","access","aid","sanctions","trade","improve_relations","ultimatum","peace","assurance","insult"];
  if(dipTypes.includes(order.type))H.resolveOrder(order,"player");
  else{H.addRelation(a,b,.5);H.remember(b,a,"diplomatic_message",text,.5)}
  const reply=diplomaticReply(a,b,text,before);
  H.state.chats[key].push({side:"them",text:reply,date:shortDate(H.state.date)});H.autosave();renderAll();
}

function colorFor(code){
  const c=H.C(code);if(!c)return "#4d535a";
  if(H.state.mapMode==="political"){
    if(!c.alive)return "#3a3f45";
    return c.color||DColor(code);
  }
  if(H.state.mapMode==="relations"){
    if(code===H.state.player)return "#d5b361";
    const r=H.relation(H.state.player,code);
    if(r>=0){const g=Math.round(95+r*.65),rr=Math.round(65-r*.15);return `rgb(${rr},${Math.min(170,g)},105)`}
    return `rgb(${Math.min(185,110+Math.abs(r)*.6)},${Math.max(55,95-Math.abs(r)*.25)},80)`;
  }
  if(H.state.mapMode==="war"){
    if(code===H.state.player)return "#d5b361";
    if(H.findWar(H.state.player,code))return "#a94743";
    const alliance=H.findTreaty(H.state.player,code,"alliance")||H.findTreaty(H.state.player,code,"guarantee");
    return alliance?"#54799b":"#555d65";
  }
  return c.color||DColor(code);
}
function DColor(code){return H.C(code)?.color||H.C(code)?.stats?.color||H.COUNTRIES[code]?.stats?.color||"#6d737a"}

function renderMap(){
  const layer=$("#countryLayer"),regions=$("#regionLayer"),cities=$("#cityLayer"),fronts=$("#frontLayer"),armies=$("#armyLayer");
  if(!layer)return;
  layer.innerHTML=Object.entries(H.MAP_SHAPES).filter(([code])=>H.C(code)).map(([code,points])=>{
    const c=H.C(code),selected=code===H.state.selectedCountry,owner=H.state.defeated[code]?.by||code;
    const fill=H.state.mapMode==="political"?(H.C(owner)?.color||DColor(owner)):colorFor(code);
    const x=c.xy[0],y=c.xy[1],small=["BEL","NLD","CHE","AUT","CZE","DNK","EST","LVA","LTU"].includes(code);
    return `<g data-country="${code}"><polygon class="countryShape ${selected?"selected":""}" data-country="${code}" points="${points}" fill="${fill}" opacity="${c.alive?.84:.48}"></polygon><text class="countryLabel ${small?"small":""}" x="${x}" y="${y-10}">${small?code:esc(c.name.toUpperCase())}</text></g>`;
  }).join("");

  const interesting=new Set([H.state.player,H.state.selectedCountry]);
  H.state.wars.filter(w=>w.active).forEach(w=>[...w.attackers,...w.defenders].forEach(c=>interesting.add(c)));
  regions.innerHTML=H.REGIONS.filter(r=>interesting.has(r.country)||H.state.mapZoom>1.3).map(r=>{
    const owner=H.state.regionControl[r.id],fill=H.C(owner)?.color||"#777";
    return `<g data-region="${r.id}"><circle class="regionDot" data-region="${r.id}" cx="${r.x}" cy="${r.y}" r="${H.state.selectedRegion===r.id?7:5}" fill="${fill}"></circle><text class="regionLabel" x="${r.x+7}" y="${r.y+2}">${esc(r.name)}</text></g>`;
  }).join("");

  cities.innerHTML=H.CITIES.map(c=>`<g><circle class="${c.capital?"capitalDot":"cityDot"}" cx="${c.x}" cy="${c.y}" r="${c.capital?3:2}"></circle><text class="cityLabel" x="${c.x+5}" y="${c.y+2}">${esc(c.name)}</text></g>`).join("");
  fronts.innerHTML=H.state.wars.filter(w=>w.active).flatMap(w=>w.fronts.map(f=>{
    const a=H.C(f.attacker)?.xy||H.C(w.attacker)?.xy,breg=H.REGIONS.find(r=>r.id===f.targetRegion),b=breg?[breg.x,breg.y]:H.C(f.defender)?.xy;
    if(!a||!b)return "";
    const midx=(a[0]+b[0])/2,midy=(a[1]+b[1])/2-25;
    return `<path class="frontHalo" d="M${a[0]},${a[1]} Q${midx},${midy} ${b[0]},${b[1]}"></path><path class="frontLine" d="M${a[0]},${a[1]} Q${midx},${midy} ${b[0]},${b[1]}"></path>`;
  })).join("");
  armies.innerHTML=H.state.deployments.filter(d=>d.active).map(d=>{
    const A=H.C(d.actor),T=d.target&&H.C(d.target),r=d.region&&H.REGIONS.find(x=>x.id===d.region);if(!A)return "";
    const x=T?(A.xy[0]*.62+T.xy[0]*.38):(r?r.x:A.xy[0]),y=T?(A.xy[1]*.62+T.xy[1]*.38):(r?r.y:A.xy[1]);
    return `<g class="armyMarker" transform="translate(${x-15},${y-8})"><rect width="30" height="16" rx="2"></rect><text x="15" y="10.5">${fmt(d.amount)}k</text></g>`;
  }).join("");
  const vp=$("#mapViewport");vp.setAttribute("transform",`translate(${H.state.mapX} ${H.state.mapY}) scale(${H.state.mapZoom})`);
  bindMap();
}

function bindMap(){
  document.querySelectorAll("[data-country]").forEach(el=>el.addEventListener("click",e=>{
    e.stopPropagation();const code=el.dataset.country;H.state.selectedCountry=code;H.state.selectedRegion=null;renderAll();
  }));
  document.querySelectorAll("[data-region]").forEach(el=>el.addEventListener("click",e=>{
    e.stopPropagation();const id=el.dataset.region,r=H.REGIONS.find(x=>x.id===id);if(!r)return;H.state.selectedRegion=id;H.state.selectedCountry=r.country;renderAll();
  }));
}

function selectionBox(){
  const code=H.state.selectedCountry,c=H.C(code);if(!c)return "";
  const player=H.state.player,isMe=code===player,rel=isMe?null:H.relation(player,code),r=H.state.selectedRegion&&H.REGIONS.find(x=>x.id===H.state.selectedRegion);
  return `<h3>${c.flag} ${esc(c.name)}</h3><div class="sub">${esc(c.leader)} · ${esc(c.ideology)}${c.alive?"":" · DEFEATED"}</div>
    ${r?`<div class="card" style="margin:0 0 6px"><strong>${esc(r.name)}</strong>${kv("Terrain",r.terrain)}${kv("Strategic value",r.value)}${kv("Controller",H.C(H.state.regionControl[r.id])?.name||"Unknown")}${kv("Fortifications",(H.state.fortifications[r.id]||0).toFixed(1)+"/10")}</div>`:""}
    ${!isMe?`${kv("Relations",String(Math.round(rel)),relationshipClass(rel))}${kv("Trust",Math.round(H.trust(player,code))+"%")}${kv("Threat toward you",Math.round(H.threat(code,player))+"%")}`:`${kv("Capital",c.capital)}${kv("Faction",c.faction)}`}
    <div class="effects" style="margin-top:7px">${H.state.treaties.filter(t=>t.active&&t.members.includes(code)).slice(0,5).map(t=>`<span class="effect">${esc(t.type)}</span>`).join("")}</div>
    ${!isMe?`<button class="btn full" id="openIntelBtn" style="margin-top:7px">OPEN INTELLIGENCE</button>`:""}`;
}

function renderTimeline(){
  const filter=H.ui.timelineFilter,events=H.state.events.filter(e=>filter==="all"||e.type===filter).slice(0,100);
  $("#timeline").innerHTML=events.length?events.map(e=>`<article class="event ${e.type}">
    <div class="eventDate">${shortDate(e.date)} · PRIORITY ${e.severity}</div>
    <div class="eventTitle">${esc(e.title)}</div>
    <div class="eventBody">${esc(e.body)}</div>
    ${e.effects?.length?`<div class="effects">${e.effects.map(x=>`<span class="effect">${esc(x)}</span>`).join("")}</div>`:""}
  </article>`).join(""):`<div class="small">No events in this filter yet.</div>`;
}

function renderOperations(){
  const activePolicies=H.state.policies.filter(p=>p.active),ops=H.state.operations.filter(o=>o.active),wars=H.state.wars.filter(w=>w.active),treaties=H.state.treaties.filter(t=>t.active&&!t.secret);
  const all=[
    ...wars.map(w=>({title:`WAR · ${w.name}`,meta:`${shortDate(w.start)} · ${w.territoryTaken||0} regions seized`,progress:null})),
    ...activePolicies.slice(-12).map(p=>({title:`${H.C(p.actor)?.name} · ${p.label}`,meta:`${Math.round(p.progress||0)}% · ${p.duration-p.elapsed}d scheduled`,progress:p.progress})),
    ...ops.filter(o=>o.actor===H.state.player).map(o=>({title:`SECRET · ${o.label}`,meta:`${Math.round(o.progress||0)}% · exposure risk`,progress:o.progress})),
    ...treaties.slice(-8).map(t=>({title:`TREATY · ${t.type.toUpperCase()}`,meta:t.members.map(m=>H.C(m)?.name).join(" / "),progress:null}))
  ];
  $("#activeCount").textContent=String(all.length);
  $("#operations").innerHTML=all.length?all.slice(0,28).map(x=>`<div class="operation"><div class="operationTitle">${esc(x.title)}</div><div class="operationMeta">${esc(x.meta)}</div>${x.progress!=null?bar(x.progress):""}</div>`).join(""):`<div class="small">The world is quiet—for now.</div>`;
}

function renderTop(){
  $("#dateDisplay").textContent=dateText(H.state.date);
  $("#tensionDisplay").textContent=`WORLD TENSION ${Math.round(H.state.worldTension)}%`;
  $("#timeHint").textContent=H.state.pendingJump>0?`${H.state.pendingJump} days remain after interruption`:"No pending interruption";
  $("#continueBtn").disabled=H.state.pendingJump<=0;
  $("#alertBadge").classList.toggle("hidden",!(H.state.interrupt&&H.state.pendingJump>0));
  $("#saveState").textContent=H.state.lastAutosave?`AUTOSAVED ${new Date(H.state.lastAutosave).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`:"AUTOSAVE READY";
}

function renderAll(){
  if(!H.state.player)return;
  $("#countryHeader").innerHTML=countryHeader();
  renderTop();renderPanel();renderMap();renderTimeline();renderOperations();
  $("#selectionBox").innerHTML=selectionBox();
  $("#openIntelBtn")?.addEventListener("click",()=>{H.ui.tab="intel";document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab==="intel"));renderPanel()});
}
H.renderAll=renderAll;

H.advanceAndRender=function(days){
  const result=H.state.pendingJump>0?H.continueJump():H.advanceGame(days);
  if(result?.reason==="pending")return H.toast("Finish the interrupted jump first");
  renderAll();
  if(result?.interrupted)H.toast(`Time stopped: ${result.reason||"major event"}`);
  else H.toast(`Advanced to ${dateText(H.state.date)}`);
};

H.renderStartCountries=function(){
  const grid=$("#countryGrid");if(!grid)return;
  grid.innerHTML=H.PLAYABLE.map(code=>{
    const c=H.COUNTRIES[code],selected=code===H.ui.selectedStart;
    return `<div class="countryChoice ${selected?"selected":""}" data-startcountry="${code}">
      <strong>${c.flag} ${esc(c.name)}</strong>
      <small>${esc(c.leader)}<br>${esc(c.ideology)} · Army ${fmt(c.stats.army)}k</small>
    </div>`;
  }).join("");
  document.querySelectorAll("[data-startcountry]").forEach(x=>x.addEventListener("click",()=>{
    H.ui.selectedStart=x.dataset.startcountry;H.renderStartCountries();const c=H.COUNTRIES[H.ui.selectedStart];
    $("#selectedStartText").textContent=`${c.flag} ${c.name} selected`;$("#startButton").textContent=`START AS ${c.name.toUpperCase()}`;
  }));
};

})(window.Historia);
