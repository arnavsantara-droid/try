window.Historia = window.Historia || {};
(function(H){
"use strict";

const D=H.COUNTRIES;
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const rnd=(a,b)=>Math.random()*(b-a)+a;
const pick=a=>a[Math.floor(Math.random()*a.length)];
const deep=o=>JSON.parse(JSON.stringify(o));
const norm=s=>String(s??"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9%.\-\s]/g," ").replace(/\s+/g," ").trim();
const fmt=(v,d=0)=>Number(v||0).toLocaleString("en-US",{maximumFractionDigits:d});
const isoDate=d=>d.toISOString().slice(0,10);
const dateAt=s=>new Date(s+"T12:00:00Z");
const addDays=(s,n)=>isoDate(new Date(dateAt(s).getTime()+n*86400000));
const dateText=s=>dateAt(s).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});
const shortDate=s=>dateAt(s).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});

H.util={clamp,rnd,pick,deep,norm,fmt,addDays,dateText,shortDate};

function runtimeCountry(code,c){
  return {
    code,name:c.name,flag:c.flag,leader:c.leader,ideology:c.ideology,capital:c.capital,
    faction:c.faction,xy:c.xy,aliases:c.aliases,goals:c.goals,color:H.COLORS?.[code]||"#6d737a",personality:deep(c.personality),
    ...deep(c.stats),
    taxRate:0.22,debt:Math.max(5,c.stats.gdp*.28),inflation:2.2,
    readiness:clamp(45+c.stats.quality*.35),intel:35,counterintel:35,
    civilianIndustry:Math.round(c.stats.industry*.58),militaryIndustry:Math.round(c.stats.industry*.42),
    reserveEquipment:Math.round(c.stats.army*.72),politicalCapital:55,militaryBudget:12,
    research:{land:0,air:0,naval:0,industry:0,radar:0},
    alive:true,atWar:false,exhaustion:0
  };
}

function freshState(){
  const countries={};
  Object.entries(D).forEach(([code,c])=>countries[code]=runtimeCountry(code,c));
  const relations={},trust={},threat={},knowledge={};
  for(const a of Object.keys(countries)){
    relations[a]={};trust[a]={};threat[a]={};knowledge[a]={};
    for(const b of Object.keys(countries)){
      if(a===b) continue;
      let r=0,t=50;
      if(countries[a].ideology===countries[b].ideology) r+=8;
      if(countries[a].faction===countries[b].faction && !["Independent","Neutral"].includes(countries[a].faction)){r+=35;t+=18}
      if((countries[a].ideology==="Fascist"&&countries[b].ideology==="Communist")||(countries[a].ideology==="Communist"&&countries[b].ideology==="Fascist")) r-=28;
      relations[a][b]=r; trust[a][b]=t; threat[a][b]=5; knowledge[a][b]=28;
    }
  }
  H.START_RELATIONS.forEach(([a,b,r,t])=>{
    if(relations[a]&&relations[b]){relations[a][b]=relations[b][a]=r;trust[a][b]=trust[b][a]=t}
  });
  const regionControl={},fortifications={};
  H.REGIONS.forEach(r=>{regionControl[r.id]=r.country;fortifications[r.id]=0});
  return {
    version:H.DATA_VERSION,player:null,selectedCountry:"DEU",selectedRegion:null,
    mode:"historical",difficulty:"normal",date:"1936-01-01",turn:0,totalDays:0,worldTension:5,
    countries,relations,trust,threat,knowledge,regionControl,fortifications,
    queue:[],policies:[],operations:[],treaties:[],wars:[],deployments:[],tradeLinks:[],
    memories:[],chats:{},events:[],history:[],flags:{},defeated:{},pendingJump:0,
    interrupt:false,interruptReason:"",simulating:false,ids:{policy:1,operation:1,treaty:1,war:1,event:1,deployment:1},
    mapMode:"political",mapZoom:1,mapX:0,mapY:0,lastAutosave:null
  };
}

H.state=freshState();
H.freshState=freshState;
H.C=code=>H.state.countries[code];
H.alive=code=>!!H.C(code)?.alive;
H.relation=(a,b)=>H.state.relations[a]?.[b]??0;
H.trust=(a,b)=>H.state.trust[a]?.[b]??50;
H.threat=(a,b)=>H.state.threat[a]?.[b]??0;
H.knowledge=(a,b)=>H.state.knowledge[a]?.[b]??20;
H.atWar=code=>H.state.wars.some(w=>w.active&&(w.attackers.includes(code)||w.defenders.includes(code)));
H.neighbors=code=>H.BORDERS[code]||[];
H.regionsOf=code=>H.REGIONS.filter(r=>r.country===code);
H.controlledRegions=code=>H.REGIONS.filter(r=>H.state.regionControl[r.id]===code);
H.findTreaty=(a,b,type)=>H.state.treaties.find(t=>t.active&&t.type===type&&t.members.includes(a)&&t.members.includes(b));
H.findWar=(a,b)=>H.state.wars.find(w=>w.active&&((w.attackers.includes(a)&&w.defenders.includes(b))||(w.attackers.includes(b)&&w.defenders.includes(a))));

H.addRelation=function(a,b,v,symmetric=true){
  if(!H.state.relations[a]?.hasOwnProperty(b))return;
  H.state.relations[a][b]=clamp(H.state.relations[a][b]+v,-100,100);
  if(symmetric)H.state.relations[b][a]=clamp(H.state.relations[b][a]+v,-100,100);
};
H.addTrust=function(a,b,v,symmetric=true){
  if(!H.state.trust[a]?.hasOwnProperty(b))return;
  H.state.trust[a][b]=clamp(H.state.trust[a][b]+v,0,100);
  if(symmetric)H.state.trust[b][a]=clamp(H.state.trust[b][a]+v,0,100);
};
H.addThreat=function(observer,actor,v){
  if(!H.state.threat[observer]?.hasOwnProperty(actor))return;
  H.state.threat[observer][actor]=clamp(H.state.threat[observer][actor]+v,0,100);
};
H.addKnowledge=function(observer,target,v){
  if(!H.state.knowledge[observer]?.hasOwnProperty(target))return;
  H.state.knowledge[observer][target]=clamp(H.state.knowledge[observer][target]+v,5,100);
};

H.remember=function(observer,subject,type,text,weight=1){
  H.state.memories.push({date:H.state.date,observer,subject,type,text,weight});
  if(H.state.memories.length>900)H.state.memories.splice(0,100);
};
H.memoriesAbout=(observer,subject)=>H.state.memories.filter(m=>m.observer===observer&&m.subject===subject).slice(-20);

H.event=function(title,body,type="world",severity=2,actors=[],effects=[]){
  const e={id:H.state.ids.event++,date:H.state.date,title,body,type,severity,actors:[...new Set(actors.filter(Boolean))],effects};
  H.state.events.unshift(e);
  if(H.state.events.length>500)H.state.events.length=500;
  if(H.state.simulating && severity>=5 && H.state.player && e.actors.includes(H.state.player)){
    H.state.interrupt=true;H.state.interruptReason=title;
  }
  return e;
};

function targetFromText(text,actor){
  const t=norm(text),matches=[];
  for(const [code,c] of Object.entries(H.state.countries)){
    if(code===actor)continue;
    for(const name of [c.name,...(c.aliases||[])]){
      const n=norm(name),pos=t.indexOf(n);
      if(n.length>=3&&pos>=0)matches.push({code,pos,len:n.length});
    }
  }
  matches.sort((a,b)=>a.pos-b.pos||b.len-a.len);
  let best=matches[0]?.code||null;
  if(t.includes("danzig")||t.includes("polish corridor"))best="POL";
  if(t.includes("anschluss"))best="AUT";
  return best;
}

function regionFromText(text){
  const t=norm(text);let best=null,bestLen=0;
  for(const r of H.REGIONS){
    for(const n0 of [r.name,...r.aliases]){
      const n=norm(n0);
      if(t.includes(n)&&n.length>bestLen){best=r;bestLen=n.length}
    }
  }
  return best;
}

function quantityFromText(text,actor,type){
  const t=norm(text);
  const matches=[...t.matchAll(/(\d+(?:\.\d+)?)\s*(million|m|thousand|k)?\b/g)];
  for(const m of matches){
    let v=parseFloat(m[1]);const u=m[2]||"";
    if(u==="million"||u==="m")v*=1000;
    if(u==="thousand"||u==="k")v*=1;
    if(v>=10)return v; // military numbers are expressed in thousands internally
  }
  const c=H.C(actor);
  if(type==="deploy"||type==="withdraw"){
    const divWords={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
    const dm=t.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+divisions?/);
    if(dm){const n=/^\d+$/.test(dm[1])?parseInt(dm[1],10):divWords[dm[1]];return n*15}
    if(/almost.*entire.*army|most of.*army|nearly.*entire.*army/.test(t))return c.army*.72;
    if(/entire.*army|whole.*army/.test(t))return c.army*.85;
    if(/half.*army/.test(t))return c.army*.5;
  }
  if(type==="mobilize"){
    if(/every.*man|every.*men|everyone|all available|reasonably available|maximum mobil|into the army/.test(t))return Math.min(c.manpower*.65,Math.max(500,c.population*18));
    if(/mass|massive|total mobil/.test(t))return Math.min(c.manpower*.35,1200);
    if(/limited|partial/.test(t))return Math.min(c.manpower*.08,180);
    return Math.min(c.manpower*.15,300);
  }
  return null;
}

function durationFromText(text){
  const t=norm(text);
  const nums={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,twentyfour:24};
  let m=t.match(/(?:within|over|for|next|during)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s*(day|days|week|weeks|month|months|year|years)/);
  if(!m)return null;
  const n=/^\d+$/.test(m[1])?parseInt(m[1],10):nums[m[1]],u=m[2];
  if(u.startsWith("day"))return n;
  if(u.startsWith("week"))return n*7;
  if(u.startsWith("month"))return n*30;
  return n*365;
}

function detectIntent(text){
  const t=norm(text);
  if(/^(tell|inform|assure|reassure|promise)\b/.test(t))return {type:"assurance",domain:"diplomacy",score:120,baseCost:1};
  if(/\b(insult|denounce|mock|condemn)\b/.test(t))return {type:"insult",domain:"diplomacy",score:119,baseCost:0};
  if(/\b(cut|reduce|slash)\b.*\b(police|internal security|security service)\b/.test(t))return {type:"police_cut",domain:"domestic",score:119,baseCost:0};
  if(/\b(cut|reduce)\b.*\b(military|army|soldier)\b.*\b(pay|salary|salaries|wage|wages)\b/.test(t))return {type:"military_pay_cut",domain:"military",score:119,baseCost:0};
  if(/\b(raise|increase)\b.*\b(military|army|soldier)\b.*\b(pay|salary|salaries|wage|wages)\b/.test(t))return {type:"military_pay_raise",domain:"military",score:119,baseCost:1};
  if(/\b(bring|put|call)\b.*\b(every|all|available)\b.*\b(man|men|personnel|people)\b.*\b(army|military|service)\b/.test(t)||/\bevery\b.*\bavailable\b.*\barmy\b/.test(t))return {type:"mobilize",domain:"military",score:120,baseCost:2};
  if(/\b(move|send|station|redeploy|concentrate)\b.*\b(troops|forces|divisions?|army|units)\b/.test(t))return {type:"deploy",domain:"military",score:119,baseCost:1};
  if(/^(withdraw|pull back|fall back|retreat|redeploy away)\b/.test(t)&&!/^(tell|inform|assure|reassure|promise)\b/.test(t))return {type:"withdraw",domain:"military",score:118,baseCost:0};
  let best={type:"custom",domain:"general",score:0,baseCost:1};
  for(const intent of H.INTENT_LIBRARY){
    let score=0;
    for(const phrase of intent.words){
      const p=norm(phrase);
      if(t.includes(p))score+=p.split(" ").length*2+1;
    }
    if(score>best.score)best={...intent,score};
  }
  // Priority corrections for common compound sentences.
  if(/do not attack|don't attack|without attacking|not attack/.test(t)&&(/move|deploy|troop|division/.test(t))) {
    const deploy=H.INTENT_LIBRARY.find(x=>x.type==="deploy");best={...deploy,score:99};
  }
  if(/non.?aggression/.test(t)){const x=H.INTENT_LIBRARY.find(x=>x.type==="nap");best={...x,score:100}}
  return best;
}

H.interpret=function(text,actor=H.state.player){
  const raw=String(text||"").trim(),t=norm(raw);
  const intent=detectIntent(raw),target=targetFromText(raw,actor),region=regionFromText(raw);
  let intensity=1;
  if(/massive|maximum|every|all available|total|aggressive|heavily|huge|world's largest|worlds largest/.test(t))intensity=1.7;
  if(/limited|small|careful|gradual|modest|partial/.test(t))intensity=.65;
  if(/very limited|minimal/.test(t))intensity=.4;
  const secrecy=/secret|covert|quietly|privately|deniable|clandestine/.test(t);
  const conditional=(raw.match(/\b(if|unless|provided that|as long as)\b(.+)$/i)||[])[2]?.trim()||null;
  const safeguards=[];
  if(/avoid (?:major )?unrest|without causing.*unrest|protect stability/.test(t))safeguards.push("protect_stability");
  if(/skilled workers|protect.*factor|exempt.*worker|keep enough.*worker/.test(t))safeguards.push("protect_industry");
  if(/avoid provoking|do not provoke|without provoking/.test(t))safeguards.push("low_visibility");
  if(/do not attack|don't attack|not attack|without attacking|do not fire/.test(t))safeguards.push("no_attack");
  if(/retreat if|withdraw if|fall back if/.test(t))safeguards.push("conditional_retreat");
  if(/prioriti[sz]e young|younger.*first/.test(t))safeguards.push("young_priority");
  if(/university student|students first|conscript student/.test(t))safeguards.push("student_priority");
  let subject=null;
  if(/fighter|aircraft|air force/.test(t))subject="air";
  else if(/tank|artillery|weapon|army|land/.test(t))subject="land";
  else if(/submarine|naval|ship|navy/.test(t))subject="naval";
  else if(/radar/.test(t))subject="radar";
  else if(/industr|factor/.test(t))subject="industry";
  return {
    id:`q-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,actor,text:raw,
    type:intent.type,domain:intent.domain,target,region:region?.id||null,quantity:quantityFromText(raw,actor,intent.type),
    duration:durationFromText(raw),intensity,secrecy,conditional,safeguards,subject,
    created:H.state.date,status:"queued",baseCost:intent.baseCost??1
  };
};

H.interpretOrders=function(text,actor=H.state.player){
  const raw=String(text||"").trim();
  if(!raw)return [];
  // Split only at strong coordination boundaries when both sides look like independent actions.
  const pieces=raw.split(/\s*(?:;|\bbut\b)\s*/i).filter(Boolean);
  const out=[];
  for(const piece of pieces){
    const base=H.interpret(piece,actor);
    // A clause such as "tell X..." is independently meaningful; safeguards remain within a clause.
    if(base.type!=="custom"||pieces.length===1)out.push(base);
    else out.push(base);
  }
  // Also handle "X and Y" when both halves independently map to strong non-custom intents.
  if(out.length===1){
    const andParts=raw.split(/\s+\band\b\s+/i);
    if(andParts.length===2){
      const a=H.interpret(andParts[0],actor),b=H.interpret(andParts[1],actor);
      const strong=x=>x.type!=="custom"&&!["assurance"].includes(x.type);
      if(strong(a)&&strong(b)&&a.type!==b.type)return [a,b];
    }
  }
  return out;
};

H.queueOrder=function(text,actor=H.state.player){
  if(!actor||!String(text||"").trim())return null;
  const orders=H.interpretOrders(text,actor);
  H.state.queue.push(...orders);
  return orders.length===1?orders[0]:orders;
};
H.removeQueued=function(id){H.state.queue=H.state.queue.filter(o=>o.id!==id)};

function broadcastThreat(actor,amount,reason,visibility=1){
  const observers=new Set([...(H.BORDERS[actor]||[]),"GBR","FRA","RUS","USA","ITA"]);
  observers.delete(actor);
  for(const o of observers){
    if(!H.C(o)?.alive)continue;
    const border=(H.BORDERS[actor]||[]).includes(o)?1.35:1;
    const inc=amount*visibility*border;
    H.addThreat(o,actor,inc);
    if(inc>3)H.remember(o,actor,"threat",reason,inc/5);
  }
}

function spend(c,amount){
  const paid=Math.min(c.treasury,amount);c.treasury-=paid;
  if(paid<amount){const short=amount-paid;c.debt+=short*1.4;c.treasury=0}
}
function policy(actor,type,label,days,intensity=1,data={}){
  const p={id:H.state.ids.policy++,actor,type,label,start:H.state.date,elapsed:0,duration:days||180,intensity,active:true,progress:0,...data};
  H.state.policies.push(p);return p;
}
function operation(actor,target,type,label,days,intensity=1,data={}){
  const o={id:H.state.ids.operation++,actor,target,type,label,start:H.state.date,elapsed:0,duration:days||120,intensity,active:true,progress:0,...data};
  H.state.operations.push(o);return o;
}
function treaty(type,members,label,days=3650,secret=false,data={}){
  const existing=H.state.treaties.find(t=>t.active&&t.type===type&&members.every(m=>t.members.includes(m)));
  if(existing)return existing;
  const t={id:H.state.ids.treaty++,type,members:[...members],label,start:H.state.date,end:addDays(H.state.date,days),active:true,secret,...data};
  H.state.treaties.push(t);return t;
}

H.createTreaty=treaty;

function diplomacyScore(actor,target,p){
  const A=H.C(actor),B=H.C(target);
  if(!A||!B)return -100;
  let s=H.relation(actor,target)*.55+H.trust(actor,target)*.45-H.threat(target,actor)*.45;
  if(A.ideology===B.ideology)s+=10;
  if(p.type==="nap")s+=B.personality.caution*.22;
  if(p.type==="alliance")s-=18;s+=p.type==="alliance"?H.threat(target,mostThreatening(target))*.15:0;
  if(p.type==="trade")s+=B.trade*.12;
  if(p.type==="access")s-=12;
  if(p.type==="ultimatum"){
    const power=(A.army*A.quality*(.5+A.readiness/100))/(Math.max(1,B.army*B.quality*(.5+B.readiness/100)));
    s=(power-1)*38 + H.threat(target,actor)*.25 - B.warSupport*.3 - H.trust(target,actor)*.1;
  }
  if(H.atWar(target)&&["alliance","aid"].includes(p.type))s+=8;
  return s;
}
function mostThreatening(code){
  let b=null,v=-1;
  for(const [other,x] of Object.entries(H.state.threat[code]||{})){if(x>v){v=x;b=other}}
  return b;
}

function createMemoryPair(a,b,type,text,w=1){
  H.remember(a,b,type,text,w);H.remember(b,a,type,text,w);
}

function resolveDiplomacy(o){
  const A=H.C(o.actor),B=H.C(o.target);
  if(!B){H.event("DIPLOMATIC ORDER INCOMPLETE",`${A.name}'s foreign ministry cannot identify a recipient for “${o.text}”.`,"diplomacy",1,[o.actor]);return}
  const score=diplomacyScore(o.actor,o.target,o)+rnd(-8,8);
  const accepted=score>({nap:24,alliance:42,trade:5,access:34,improve_relations:-999}[o.type]??25);
  if(o.type==="insult"){
    H.addRelation(o.actor,o.target,-8*o.intensity);H.addTrust(o.actor,o.target,-5*o.intensity);H.addThreat(o.target,o.actor,2.5*o.intensity);
    H.remember(o.target,o.actor,"public_insult",o.text,1.5);
    H.event("DIPLOMATIC INCIDENT",`${A.name}'s public rhetoric targets ${B.name}, worsening the political climate. The material effect is small, but it changes how future proposals and crises are interpreted.`,"diplomacy",2,[o.actor,o.target],["Relations -","Trust -","Threat perception +"]);
    return;
  }
  if(o.type==="assurance"){
    treaty("assurance",[o.actor,o.target],`${A.name} assurance to ${B.name}`,o.duration||730,o.secrecy,{promiseText:o.text,condition:o.conditional,fulfilled:false});
    H.addRelation(o.actor,o.target,2.5);H.addTrust(o.actor,o.target,2);H.addThreat(o.target,o.actor,-2);
    H.remember(o.target,o.actor,"assurance",o.text,1.5);
    H.event("DIPLOMATIC ASSURANCE",`${A.name} gives ${B.name} a ${o.conditional?"conditional ":""}assurance: “${o.text}” The statement now becomes part of ${B.name}'s memory of ${A.name}'s credibility.`,"diplomacy",2,[o.actor,o.target],["Promise recorded","Threat perception slightly reduced"]);
    return;
  }
  if(o.type==="improve_relations"){
    spend(A,1.2*o.intensity);H.addRelation(o.actor,o.target,5*o.intensity);H.addTrust(o.actor,o.target,2*o.intensity);
    createMemoryPair(o.actor,o.target,"diplomatic_outreach",o.text,1);
    H.event("DIPLOMATIC OUTREACH",`${A.name} opens a sustained diplomatic initiative toward ${B.name}. The gesture improves the climate, but deeper trust will require consistent behaviour.`,"diplomacy",2,[o.actor,o.target],["Relations improve","Trust slightly improves"]);return;
  }
  if(o.type==="sanctions"){
    treaty("sanctions",[o.actor,o.target],`${A.name} sanctions ${B.name}`,730,o.secrecy);
    H.addRelation(o.actor,o.target,-20);H.addTrust(o.actor,o.target,-12);B.gdp=Math.max(5,B.gdp-1.1*o.intensity);A.gdp=Math.max(5,A.gdp-.25*o.intensity);H.state.worldTension+=1.5;
    createMemoryPair(o.actor,o.target,"sanctions",o.text,2);broadcastThreat(o.actor,2,"Economic coercion");
    H.event("ECONOMIC SANCTIONS",`${A.name} imposes sanctions on ${B.name}. Trade friction now imposes costs on both economies, with the heavier pressure falling on ${B.name}.`,"diplomacy",3,[o.actor,o.target],[`${B.name} GDP pressure`,`Relations -20`]);return;
  }
  if(o.type==="aid"){
    const transfer=Math.min(9,Math.max(1,A.treasury*.07)*o.intensity);spend(A,transfer);B.treasury+=transfer;B.reserveEquipment+=o.domain==="military"?25:8;H.addRelation(o.actor,o.target,9);H.addTrust(o.actor,o.target,8);
    createMemoryPair(o.actor,o.target,"aid",o.text,1.5);H.event("FOREIGN AID",`${A.name} sends financial and material assistance to ${B.name}. The recipient gains resources while bilateral dependence and trust increase.`,"diplomacy",2,[o.actor,o.target],[`${A.name} treasury -${fmt(transfer,1)}`,`${B.name} treasury +${fmt(transfer,1)}`]);return;
  }
  if(o.type==="ultimatum"){
    H.addRelation(o.actor,o.target,-18);H.addTrust(o.actor,o.target,-14);H.state.worldTension+=4*o.intensity;broadcastThreat(o.actor,7,"Ultimatum and coercive diplomacy");H.remember(o.target,o.actor,"threat",o.text,3);
    if(score>38){
      B.stability=clamp(B.stability-6);
      const r=o.region?H.REGIONS.find(x=>x.id===o.region):null;
      if(r&&r.country===o.target){H.state.regionControl[r.id]=o.actor;H.event("ULTIMATUM ACCEPTED",`${B.name}, facing severe strategic pressure, accepts ${A.name}'s demand over ${r.name}. Control changes without immediate war, but the concession creates lasting resentment.`,"diplomacy",5,[o.actor,o.target],[`${r.name} transferred`,`${B.name} stability -6`]);}
      else H.event("CONCESSIONS EXTRACTED",`${B.name} accepts significant elements of ${A.name}'s ultimatum rather than risk immediate conflict. The government is weakened domestically.`,"diplomacy",4,[o.actor,o.target],[`${B.name} stability -6`]);
    } else {
      B.warSupport=clamp(B.warSupport+7);B.readiness=clamp(B.readiness+5);H.addThreat(o.target,o.actor,12);
      H.event("ULTIMATUM REJECTED",`${B.name} rejects ${A.name}'s demands and begins preparing for possible war.`,"diplomacy",4,[o.actor,o.target],[`${B.name} war support +7`,`Readiness +5`]);
    }return;
  }
  if(o.type==="peace"){
    const w=H.findWar(o.actor,o.target);if(!w){H.event("PEACE FEELER",`${A.name} proposes negotiations with ${B.name}, but no active bilateral war exists.`,"diplomacy",1,[o.actor,o.target]);return}
    const actorLosses=w.losses[o.actor]||0,targetLosses=w.losses[o.target]||0;
    if(score+actorLosses*.02+targetLosses*.02>10){
      w.active=false;w.end=H.state.date;for(const m of [...w.attackers,...w.defenders])H.C(m).atWar=H.atWar(m);
      H.addRelation(o.actor,o.target,5);H.event("ARMISTICE",`${A.name} and ${B.name} accept an armistice. Front-line fighting stops, though territorial and political disputes remain unresolved.`,"diplomacy",5,[o.actor,o.target],["War ended"]);
    }else H.event("PEACE OFFER REJECTED",`${B.name} rejects ${A.name}'s current terms, judging continued resistance preferable.`,"diplomacy",3,[o.actor,o.target]);return;
  }
  if(!accepted){
    H.addRelation(o.actor,o.target,-1);H.event("PROPOSAL DECLINED",`${B.name} declines ${A.name}'s proposal. Its government judges the terms inconsistent with its current strategic interests.`,"diplomacy",2,[o.actor,o.target],[`Negotiating score ${Math.round(score)}`]);return;
  }
  if(o.type==="nap"){
    treaty("nap",[o.actor,o.target],`${A.name}–${B.name} Non-Aggression Pact`,o.duration||1825,o.secrecy);
    H.addRelation(o.actor,o.target,10);H.addTrust(o.actor,o.target,12);createMemoryPair(o.actor,o.target,"pact",o.text,2);
    H.event("NON-AGGRESSION PACT",`${A.name} and ${B.name} agree to refrain from direct aggression. The agreement lowers immediate military risk but its credibility depends on future conduct.`,"diplomacy",3,[o.actor,o.target],["Relations +10","Trust +12"]);return;
  }
  if(o.type==="alliance"){
    treaty("alliance",[o.actor,o.target],`${A.name}–${B.name} Alliance`,o.duration||3650,o.secrecy);H.addRelation(o.actor,o.target,16);H.addTrust(o.actor,o.target,16);createMemoryPair(o.actor,o.target,"alliance",o.text,3);
    H.event("ALLIANCE CONCLUDED",`${A.name} and ${B.name} sign a defence alliance. Future wars involving either government will now test the other's credibility.`,"diplomacy",4,[o.actor,o.target],["Mutual defence obligation"]);return;
  }
  if(o.type==="guarantee"){
    treaty("guarantee",[o.actor,o.target],`${A.name} guarantees ${B.name}`,o.duration||1825,o.secrecy);H.addRelation(o.actor,o.target,9);H.addTrust(o.actor,o.target,10);H.remember(o.target,o.actor,"guarantee",o.text,2);
    H.event("INDEPENDENCE GUARANTEED",`${A.name} publicly commits itself to ${B.name}'s security. Future aggression against ${B.name} may force ${A.name} to choose between intervention and loss of credibility.`,"diplomacy",4,[o.actor,o.target],["Security obligation created"]);return;
  }
  if(o.type==="access"){
    treaty("access",[o.actor,o.target],`${B.name} grants military access to ${A.name}`,o.duration||1095,o.secrecy);H.addTrust(o.actor,o.target,6);H.event("MILITARY ACCESS AGREEMENT",`${B.name} grants ${A.name} transit and basing privileges. The agreement improves operational reach and signals strategic cooperation.`,"diplomacy",3,[o.actor,o.target]);return;
  }
  if(o.type==="trade"){
    const resource=/oil|fuel/.test(norm(o.text))?"fuel":/food|grain/.test(norm(o.text))?"food":"general";
    const link={a:o.actor,b:o.target,resource,volume:clamp(5+o.intensity*7,3,25),active:true,start:H.state.date};
    H.state.tradeLinks.push(link);H.addRelation(o.actor,o.target,6);H.addTrust(o.actor,o.target,4);
    H.event("TRADE AGREEMENT",`${A.name} and ${B.name} expand ${resource==="general"?"bilateral trade":resource+" trade"}. Both economies benefit, but repeated trade creates strategic dependence.`,"economy",2,[o.actor,o.target],["Trade +","Relations +6"]);return;
  }
}

function breakNapIfNeeded(attacker,defender){
  const nap=H.findTreaty(attacker,defender,"nap");
  if(!nap)return;
  nap.active=false;H.addTrust(attacker,defender,-35);H.addRelation(attacker,defender,-25);
  for(const code of Object.keys(H.state.countries)){if(code!==attacker)H.addTrust(code,attacker,-5,false)}
  H.event("NON-AGGRESSION PACT VIOLATED",`${H.C(attacker).name} breaks its non-aggression commitment to ${H.C(defender).name}. The breach damages ${H.C(attacker).name}'s diplomatic credibility far beyond the immediate conflict.`,"diplomacy",5,[attacker,defender],["Global credibility damaged"]);
}

function startWar(attacker,defender,order){
  if(!defender||attacker===defender||H.findWar(attacker,defender))return null;
  const A=H.C(attacker),B=H.C(defender);
  breakNapIfNeeded(attacker,defender);
  const border=H.neighbors(attacker).includes(defender)||H.neighbors(defender).includes(attacker);
  const seaPossible=A.navy>45||B.navy>45;
  if(!border&&!seaPossible){
    H.event("INVASION PLAN STALLED",`${A.name}'s order against ${B.name} cannot yet be executed: there is no shared frontier and current naval access is inadequate. The planning itself still alarms foreign intelligence services.`,"war",2,[attacker,defender],["Threat perception rises"]);
    broadcastThreat(attacker,4,"Long-range invasion planning");return null;
  }
  const fronts=[];
  const targetRegions=H.regionsOf(defender).filter(r=>H.state.regionControl[r.id]===defender).sort((a,b)=>b.value-a.value);
  fronts.push({id:`${attacker}-${defender}-1`,attacker,defender,targetRegion:targetRegions[0]?.id||null,progress:8,initiative:attacker,supplyA:100,supplyB:100});
  const w={id:H.state.ids.war++,name:`${A.name}–${B.name} War`,start:H.state.date,active:true,attacker,defender,attackers:[attacker],defenders:[defender],fronts,losses:{[attacker]:0,[defender]:0},territoryTaken:0};
  H.state.wars.push(w);A.atWar=B.atWar=true;A.warSupport=clamp(A.warSupport+5);B.warSupport=clamp(B.warSupport+12);B.readiness=clamp(B.readiness+9);
  H.state.worldTension=clamp(H.state.worldTension+10+order.intensity*4);
  H.addRelation(attacker,defender,-70);H.addTrust(attacker,defender,-60);broadcastThreat(attacker,18,"War of aggression");
  H.remember(defender,attacker,"war",order.text,5);
  H.event("WAR ERUPTS",`${A.name} begins military operations against ${B.name}. The conflict will be resolved region by region; manpower, fuel, air power, readiness, terrain and supply will all shape the front.`,"war",6,[attacker,defender],["World tension rises","Regional fronts created"]);
  triggerGuarantees(w,defender,attacker);
  return w;
}
H.startWar=startWar;

function joinWar(w,code,side,reason){
  if(!w.active||w.attackers.includes(code)||w.defenders.includes(code))return;
  w[side].push(code);H.C(code).atWar=true;H.C(code).warSupport=clamp(H.C(code).warSupport+5);
  H.event("WAR WIDENS",`${H.C(code).name} enters ${w.name} ${reason}.`,"war",5,[code,w.attacker,w.defender],[`${H.C(code).name} joins the conflict`]);
}
function triggerGuarantees(w,defender,attacker){
  for(const t of H.state.treaties.filter(x=>x.active&&["guarantee","alliance"].includes(x.type)&&x.members.includes(defender))){
    const guarantor=t.members.find(x=>x!==defender);if(!guarantor||guarantor===attacker)continue;
    const G=H.C(guarantor);
    const will=H.trust(guarantor,defender)+G.warSupport*.45+H.threat(guarantor,attacker)*.5-rnd(0,28)>55;
    if(will)joinWar(w,guarantor,"defenders",`to honour its ${t.type==="alliance"?"alliance":"guarantee"}`);
    else{H.addTrust(defender,guarantor,-28);for(const c of Object.keys(H.state.countries))H.addTrust(c,guarantor,-3,false);H.event("GUARANTEE NOT HONOURED",`${G.name} declines immediate intervention for ${H.C(defender).name}. The decision preserves peace at home but damages diplomatic credibility.`,"diplomacy",4,[guarantor,defender],["Credibility damaged"])}
  }
}

function resolveMilitary(o){
  const c=H.C(o.actor),target=o.target&&H.C(o.target),r=o.region&&H.REGIONS.find(x=>x.id===o.region);
  if(o.type==="military_pay_cut"||o.type==="military_pay_raise"){
    const up=o.type==="military_pay_raise";
    const pct=(norm(o.text).match(/(\d+(?:\.\d+)?)\s*%/)||[])[1];
    const scale=pct?Math.max(.4,parseFloat(pct)/5):o.intensity;
    c.treasury=Math.max(0,c.treasury+(up?-1.0:.8)*scale);
    c.stability=clamp(c.stability+(up?1.0:-1.3)*scale);
    c.warSupport=clamp(c.warSupport+(up?.7:-.9)*scale);
    c.quality=clamp(c.quality+(up?.18:-.20)*scale);
    H.event(up?"MILITARY PAY INCREASED":"MILITARY PAY CUT",
      `${c.name} ${up?"raises":"reduces"} military pay${pct?` by roughly ${pct}%`:""}. The decision affects morale, retention and the treasury rather than magically changing force size.`,
      "domestic",2,[o.actor],[`Treasury ${up?"↓":"↑"}`,`Military morale ${up?"↑":"↓"}`]);
    return;
  }
  if(o.type==="military_budget_cut"||o.type==="military_budget_raise"){
    const up=o.type==="military_budget_raise";
    c.militaryBudget=clamp(c.militaryBudget+(up?2.2:-2.2)*o.intensity,4,30);
    c.readiness=clamp(c.readiness+(up?1.2:-2.2)*o.intensity);
    c.gdp=Math.max(5,c.gdp+(up?-.10:.16)*o.intensity);
    if(up)spend(c,1.2*o.intensity);
    H.event(up?"MILITARY BUDGET INCREASED":"MILITARY BUDGET REDUCED",
      `${c.name} ${up?"raises":"cuts"} military spending. ${up?"Readiness and procurement capacity improve at a fiscal and civilian opportunity cost.":"Fiscal pressure eases, but readiness and future equipment availability begin to weaken."}`,
      "economy",2,[o.actor],[`Military budget ${up?"↑":"↓"}`,`Readiness ${up?"+":"-"}`]);
    return;
  }
  if(o.type==="withdraw"){
    const matching=H.state.deployments.filter(d=>d.active&&d.actor===o.actor&&(!o.target||d.target===o.target)&&(!o.region||d.region===o.region));
    matching.forEach(d=>d.active=false);
    c.readiness=clamp(c.readiness-1.5);
    if(o.target)H.addThreat(o.target,o.actor,-5*o.intensity);
    const where=r?.name||(target?.name?`the ${target.name} frontier`:"forward positions");
    H.event("FORCES WITHDRAWN",`${c.name} pulls forces back from ${where}. The move lowers immediate military pressure while slightly reducing forward readiness.`,"war",3,[o.actor,o.target].filter(Boolean),["Forward threat ↓","Readiness -"]);
    return;
  }
  if(o.type==="invade"){if(!o.target){H.event("WAR ORDER INCOMPLETE",`${c.name}'s high command requires a target before offensive operations can begin.`,"war",1,[o.actor]);return}startWar(o.actor,o.target,o);return}
  if(o.type==="deploy"){
    if(!o.target&&!r){H.event("DEPLOYMENT ORDER INCOMPLETE",`${c.name}'s high command cannot determine where the requested forces should move.`,"war",1,[o.actor]);return}
    const amount=o.quantity||Math.max(25,c.army*.12*o.intensity);const dep={id:H.state.ids.deployment++,actor:o.actor,target:o.target,region:o.region,amount:Math.min(c.army*.65,amount),posture:o.safeguards.includes("no_attack")?"defensive":"forward",conditional:o.conditional,start:H.state.date,active:true};
    H.state.deployments.push(dep);c.readiness=clamp(c.readiness+1.5);if(o.target){H.addThreat(o.target,o.actor,5*o.intensity);broadcastThreat(o.actor,2.5,"Forward troop deployment",o.secrecy?.45:1)}
    H.event("FORCES REDEPLOYED",`${c.name} moves roughly ${fmt(dep.amount)}k troops ${target?`toward ${target.name}`:r?`toward ${r.name}`:"to a new posture"}. ${dep.posture==="defensive"?"Orders explicitly prohibit initiating combat.":"The concentration increases offensive options."}`,"war",2,[o.actor,o.target].filter(Boolean),[`Readiness +`,`Threat perception +`]);return;
  }
  if(o.type==="mobilize"){
    const qty=Math.min(c.manpower,o.quantity||250);const duration=o.duration||Math.max(90,Math.round(qty/(35+c.logistics*.3)*30));
    policy(o.actor,"mobilize",`Mobilise ${fmt(qty)}k personnel`,duration,o.intensity,{target:qty,remaining:qty,recruited:0,safeguards:o.safeguards});
    H.state.worldTension+=.8*o.intensity;broadcastThreat(o.actor,3.5*o.intensity,"National mobilisation",o.safeguards.includes("low_visibility")?.55:1);
    H.event("MOBILISATION ORDERED",`${c.name} begins calling up ${fmt(qty)}k additional personnel. Recruitment will take time and draw workers away from the civilian economy.${o.safeguards.includes("protect_industry")?" Skilled industrial workers receive exemptions, slowing recruitment but protecting output.":""}`,"war",3,[o.actor],[`Target +${fmt(qty)}k troops`,"Industrial labour pressure"]);return;
  }
  if(o.type==="demobilize"){
    const qty=Math.min(c.army*.35,o.quantity||c.army*.12);c.army-=qty;c.manpower+=qty*.88;c.readiness=clamp(c.readiness-4);c.gdp+=Math.min(1.5,qty/300);
    H.event("PARTIAL DEMOBILISATION",`${c.name} releases ${fmt(qty)}k personnel from active service. Labour returns to the economy, but military readiness falls.`,"war",2,[o.actor],[`Army -${fmt(qty)}k`,`Manpower +${fmt(qty*.88)}k`,"Readiness -4"]);return;
  }
  if(o.type==="fortify"){
    const region=r||(o.target?H.regionsOf(o.actor).sort((a,b)=>Math.hypot(a.x-H.C(o.target).xy[0],a.y-H.C(o.target).xy[1])-Math.hypot(b.x-H.C(o.target).xy[0],b.y-H.C(o.target).xy[1]))[0]:H.regionsOf(o.actor)[0]);
    policy(o.actor,"fortify",`Fortify ${region?.name||"strategic frontier"}`,o.duration||180,o.intensity,{region:region?.id,target:o.target});
    H.event("FORTIFICATION PROGRAMME",`${c.name} begins constructing defensive works in ${region?.name||"a strategic frontier zone"}. The programme consumes industry now but can materially slow future offensives.`,"war",2,[o.actor,o.target].filter(Boolean),["Construction started"]);return;
  }
  if(o.type==="train"){policy(o.actor,"train","Army training & doctrine programme",o.duration||180,o.intensity,{subject:o.subject||"land"});H.event("MILITARY TRAINING EXPANDED",`${c.name} launches a sustained training and doctrine programme. Readiness may dip during exercises before quality improves.`,"war",2,[o.actor]);return}
  const map={army_build:["armaments","Expand armaments production"],air_build:["air","Expand aircraft production"],navy_build:["naval","Naval construction programme"]};
  if(map[o.type]){
    const [kind,label]=map[o.type];policy(o.actor,"production",label,o.duration||365,o.intensity,{subject:kind,safeguards:o.safeguards});
    broadcastThreat(o.actor,2.2*o.intensity,"Military production expansion",o.safeguards.includes("low_visibility")?.6:1);
    H.event("REARMAMENT PROGRAMME",`${c.name} begins: ${label.toLowerCase()}. Military output will rise gradually, but the programme competes with civilian investment and government finances.`,"war",2,[o.actor],["Military output ↑","Civilian opportunity cost"]);return;
  }
}

function resolveEconomy(o){
  const c=H.C(o.actor);
  if(o.type==="tax_raise"){c.taxRate=clamp(c.taxRate+.025*o.intensity,.08,.55);c.stability=clamp(c.stability-1.5*o.intensity);H.event("TAXES INCREASED",`${c.name} raises effective taxation. Revenue improves immediately, while household and business activity face additional pressure.`,"economy",2,[o.actor],[`Tax rate ${(c.taxRate*100).toFixed(1)}%`,`Stability -${(1.5*o.intensity).toFixed(1)}`]);return}
  if(o.type==="tax_cut"){c.taxRate=clamp(c.taxRate-.025*o.intensity,.05,.55);c.stability=clamp(c.stability+1*o.intensity);c.gdp+=.35*o.intensity;H.event("TAX RELIEF",`${c.name} cuts taxation to support private activity. Popular sentiment improves, but the treasury will collect less revenue.`,"economy",2,[o.actor],[`Tax rate ${(c.taxRate*100).toFixed(1)}%`,`GDP impulse +`]);return}
  if(o.type==="borrow"){const amount=Math.max(6,c.gdp*.08*o.intensity);c.treasury+=amount;c.debt+=amount;H.event("PUBLIC BORROWING",`${c.name} raises ${fmt(amount,1)} fiscal units through new debt. The treasury gains room to act now at the cost of future servicing pressure.`,"economy",2,[o.actor],[`Treasury +${fmt(amount,1)}`,`Debt +${fmt(amount,1)}`]);return}
  if(o.type==="industry"){policy(o.actor,"industry","Industrial expansion",o.duration||420,o.intensity,{safeguards:o.safeguards});H.event("INDUSTRIAL EXPANSION",`${c.name} launches a long-term industrial investment programme. Construction draws on treasury resources before adding productive capacity.`,"economy",2,[o.actor],["Industry construction started"]);return}
  if(o.type==="infrastructure"){policy(o.actor,"infrastructure",o.region?`Infrastructure: ${H.REGIONS.find(r=>r.id===o.region)?.name}`:"National infrastructure programme",o.duration||300,o.intensity,{region:o.region,target:o.target});H.event("INFRASTRUCTURE PROGRAMME",`${c.name} commits resources to transport and logistics. Benefits will accumulate through improved supply, trade and military mobility.`,"economy",2,[o.actor,o.target].filter(Boolean));return}
  if(o.type==="stockpile"){policy(o.actor,"stockpile","Strategic fuel stockpile",o.duration||240,o.intensity,{subject:"fuel"});H.event("STRATEGIC RESERVE ORDER",`${c.name} begins diverting imports and treasury resources into a strategic fuel reserve. Near-term costs rise, but resilience to blockade and war improves.`,"economy",2,[o.actor]);return}
  if(o.type==="agriculture"){policy(o.actor,"agriculture","Agricultural support programme",o.duration||240,o.intensity);H.event("AGRICULTURAL PROGRAMME",`${c.name} expands farm support and food-security investment. The programme costs money before improving food resilience.`,"economy",2,[o.actor]);return}
  if(o.type==="nationalize"){c.stability=clamp(c.stability+(c.ideology==="Communist"?3:-2));c.industry+=1;c.gdp-=.5;c.politicalCapital-=4;H.event("STRATEGIC INDUSTRY NATIONALISED",`${c.name} expands state control over strategic production. Coordination improves in the short run, while private investment and political reactions become less predictable.`,"economy",3,[o.actor],["State control ↑","Political capital -4"]);return}
  if(o.type==="privatize"){c.gdp+=.8;c.treasury+=4;c.stability=clamp(c.stability+(c.ideology==="Communist"?-5:1));H.event("STATE ASSETS PRIVATISED",`${c.name} transfers selected state assets to private ownership, raising cash and potentially improving efficiency while creating political winners and losers.`,"economy",2,[o.actor],["Treasury +4","GDP +"]);return}
}

function resolveDomestic(o){
  const c=H.C(o.actor);
  if(o.type==="police_cut"){
    c.counterintel=clamp(c.counterintel-5*o.intensity);c.stability=clamp(c.stability-1.2*o.intensity);c.treasury+=1.3*o.intensity;
    H.event("INTERNAL SECURITY BUDGET CUT",`${c.name} reduces police and internal-security spending. The treasury gains breathing room, but counterintelligence capacity and short-term state control weaken.`,"domestic",2,[o.actor],["Treasury +","Counterintelligence -","Stability -"]);
    return;
  }
  if(o.type==="propaganda"){policy(o.actor,"propaganda","National propaganda campaign",o.duration||120,o.intensity);H.event("PROPAGANDA CAMPAIGN",`${c.name} begins a coordinated national messaging campaign. Effects on war support and stability will depend on intensity, credibility and underlying conditions.`,"domestic",2,[o.actor]);return}
  if(o.type==="police"){c.counterintel=clamp(c.counterintel+5*o.intensity);c.stability=clamp(c.stability+1.5*o.intensity);spend(c,1.5*o.intensity);H.event("INTERNAL SECURITY EXPANDED",`${c.name} increases police and security capacity. Counterintelligence improves, while the state accepts higher fiscal and political costs.`,"domestic",2,[o.actor],["Counterintelligence +","Treasury -"]);return}
  if(o.type==="repression"){c.stability=clamp(c.stability+3*o.intensity);c.politicalCapital=clamp(c.politicalCapital+2*o.intensity);H.state.worldTension+=.2;H.event("POLITICAL CRACKDOWN",`${c.name} moves against domestic opposition. Immediate control improves, but repression can create longer-term legitimacy and radicalisation risks.`,"domestic",3,[o.actor],["Short-term stability +"]);policy(o.actor,"repression_aftershock","Repression after-effects",180,o.intensity);return}
  if(o.type==="reform"){c.stability=clamp(c.stability-1*o.intensity);c.politicalCapital=clamp(c.politicalCapital-3*o.intensity);policy(o.actor,"reform","Political reform programme",240,o.intensity);H.event("POLITICAL REFORM",`${c.name} begins institutional reform. Transitional uncertainty rises before any legitimacy gains can become durable.`,"domestic",2,[o.actor]);return}
  if(o.type==="welfare"){policy(o.actor,"welfare","Expanded social spending",240,o.intensity);H.event("SOCIAL SPENDING EXPANDED",`${c.name} increases social expenditure. Household security and stability may improve, but the treasury must fund the programme.`,"domestic",2,[o.actor]);return}
}

function resolveIntel(o){
  const c=H.C(o.actor),target=o.target&&H.C(o.target);
  if(o.type==="counterintel"){c.counterintel=clamp(c.counterintel+6*o.intensity);spend(c,2*o.intensity);H.event("COUNTERINTELLIGENCE EXPANDED",`${c.name} increases domestic counterespionage capacity. Foreign operations become harder to conduct undetected.`,"intelligence",2,[o.actor],["Counterintelligence +"]);return}
  if(!target){H.event("INTELLIGENCE ORDER INCOMPLETE",`${c.name}'s intelligence service cannot identify a foreign target for “${o.text}”.`,"intelligence",1,[o.actor]);return}
  const duration=o.duration||({spy:120,sabotage:90,coup:240,influence:180,steal_tech:150}[o.type]||120);
  operation(o.actor,o.target,o.type,`${o.type.replace("_"," ")} in ${target.name}`,duration,o.intensity,{secrecy:o.secrecy,text:o.text});
  spend(c,(o.baseCost||2)*o.intensity);
  H.event("COVERT OPERATION AUTHORISED",`${c.name} authorises a ${o.secrecy?"deniable ":""}${o.type.replace("_"," ")} operation targeting ${target.name}. Results will emerge over time and exposure could damage relations.`,"intelligence",2,[o.actor],[`Operation duration ~${duration} days`]);
}

function resolveTechnology(o){
  const c=H.C(o.actor),subject=o.subject||"industry";
  policy(o.actor,"research",`Research priority: ${subject}`,o.duration||360,o.intensity,{subject});
  spend(c,2.5*o.intensity);H.event("RESEARCH PRIORITY SET",`${c.name} concentrates scientific and industrial resources on ${subject}. Progress will accumulate gradually rather than producing an immediate technology jump.`,"economy",2,[o.actor],[`${subject} research ↑`]);
}

function resolveCustom(o){
  const c=H.C(o.actor),t=norm(o.text);
  let domain="domestic",desc="bureaucratic and social";
  if(/factory|money|econom|worker|salary|wage|trade/.test(t)){domain="economy";desc="economic"}
  else if(/army|military|soldier|weapon|border/.test(t)){domain="war";desc="military"}
  else if(/foreign|country|government|diplom/.test(t)){domain="diplomacy";desc="diplomatic"}
  policy(o.actor,"custom",`Directive: ${o.text.slice(0,65)}`,o.duration||150,o.intensity,{text:o.text,domain});
  c.politicalCapital=clamp(c.politicalCapital-1*o.intensity);
  H.event("GOVERNMENT DIRECTIVE",`${c.name}'s government begins implementing “${o.text}”. The order does not map to one narrow policy; its ${desc} effects will be estimated from the evolving state over the coming months.`,"domestic",2,[o.actor],["Persistent directive created"]);
}

function checkPromiseViolations(o){
  if(o.type!=="invade"||!o.target)return;
  const target=H.C(o.target);if(!target)return;
  const aliases=[target.name,...(target.aliases||[])].map(norm);
  const promises=H.state.treaties.filter(t=>t.active&&t.type==="assurance"&&t.members[0]===o.actor);
  for(const t of promises){
    const text=norm(t.promiseText);
    const referencesTarget=aliases.some(a=>a.length>2&&text.includes(a));
    const protective=/respect|neutral|not attack|no attack|no territorial|will not invade|peace|withdraw/.test(text);
    if(!referencesTarget||!protective)continue;
    t.active=false;
    const recipient=t.members[1];
    H.addTrust(o.actor,recipient,-35);H.addRelation(o.actor,recipient,-18);
    for(const code of Object.keys(H.state.countries))if(code!==o.actor)H.addTrust(code,o.actor,-4,false);
    H.remember(recipient,o.actor,"promise_broken",t.promiseText,4);
    H.event("ASSURANCE VIOLATED",`${H.C(o.actor).name}'s attack on ${target.name} contradicts an earlier assurance given to ${H.C(recipient).name}. The breach damages credibility across the diplomatic system.`,"diplomacy",6,[o.actor,recipient,o.target],["Trust -35","Global credibility damaged"]);
  }
}
H.resolveOrder=function(o,source="player"){
  if(!o||!H.C(o.actor)?.alive)return;
  checkPromiseViolations(o);
  o.status="resolved";
  if(["nap","alliance","guarantee","access","aid","sanctions","trade","improve_relations","ultimatum","peace","assurance","insult"].includes(o.type))return resolveDiplomacy(o);
  if(["invade","deploy","withdraw","mobilize","demobilize","fortify","train","army_build","air_build","navy_build","military_budget_cut","military_budget_raise","military_pay_cut","military_pay_raise"].includes(o.type))return resolveMilitary(o);
  if(["industry","infrastructure","tax_raise","tax_cut","borrow","stockpile","agriculture","nationalize","privatize"].includes(o.type))return resolveEconomy(o);
  if(["propaganda","police","police_cut","repression","reform","welfare"].includes(o.type))return resolveDomestic(o);
  if(["spy","counterintel","sabotage","coup","influence","steal_tech"].includes(o.type))return resolveIntel(o);
  if(o.type==="research")return resolveTechnology(o);
  return resolveCustom(o);
};

function progressPolicies(days){
  const months=days/30;
  for(const p of H.state.policies){
    if(!p.active)continue;
    const c=H.C(p.actor);if(!c?.alive){p.active=false;continue}
    p.elapsed+=days;p.progress=clamp(p.elapsed/p.duration*100);
    if(p.type==="mobilize"){
      if(p.remaining>0&&c.manpower>2){
        const industryProtection=p.safeguards?.includes("protect_industry")?.70:1;
        const stabilityProtection=p.safeguards?.includes("protect_stability")?.65:1;
        const recruitment=Math.min(p.remaining,c.manpower,(34+c.logistics*.30)*months*p.intensity*industryProtection);
        c.manpower-=recruitment;c.army+=recruitment;p.recruited+=recruitment;p.remaining-=recruitment;
        c.industry=Math.max(5,c.industry-p.intensity*.28*months*industryProtection);
        c.gdp=Math.max(5,c.gdp-p.intensity*.22*months*industryProtection);
        spend(c,recruitment/360);
        if(!H.atWar(p.actor))c.stability=clamp(c.stability-p.intensity*.30*months*stabilityProtection);
        c.reserveEquipment=Math.max(0,c.reserveEquipment-recruitment*.20);
        if(p.safeguards?.includes("student_priority"))c.technology=clamp(c.technology-.018*months);
      }
      if(p.remaining<=1||p.elapsed>=p.duration){p.active=false;H.event("MOBILISATION PHASE COMPLETE",`${c.name}'s mobilisation programme has recruited ${fmt(p.recruited)}k personnel. The larger army now creates permanent equipment, payroll and supply requirements.`,"war",3,[p.actor],[`Army +${fmt(p.recruited)}k`])}
    } else if(p.type==="production"){
      const cost=(1.3+p.intensity*1.5)*months;spend(c,cost);
      c.civilianIndustry=Math.max(5,c.civilianIndustry-.08*p.intensity*months);
      c.militaryIndustry+=.13*p.intensity*months;
      c.gdp=Math.max(5,c.gdp-.04*p.intensity*months);
      if(p.subject==="air")c.air=clamp(c.air+.28*p.intensity*months,0,130);
      else if(p.subject==="naval")c.navy=clamp(c.navy+.23*p.intensity*months,0,130);
      else {c.reserveEquipment+=10*p.intensity*months;c.quality=clamp(c.quality+.08*p.intensity*months)}
    } else if(p.type==="industry"){
      spend(c,2.4*p.intensity*months);c.gdp+=.10*p.intensity*months;
      if(p.progress>65)c.industry+=.10*p.intensity*months;
    } else if(p.type==="infrastructure"){
      spend(c,1.5*p.intensity*months);c.logistics=clamp(c.logistics+.10*p.intensity*months,0,110);
      if(p.target)H.addRelation(p.actor,p.target,.04*p.intensity,false);
    } else if(p.type==="fortify"){
      spend(c,1.2*p.intensity*months);if(p.region)H.state.fortifications[p.region]=clamp((H.state.fortifications[p.region]||0)+.45*p.intensity*months,0,10);
    } else if(p.type==="train"){
      spend(c,.8*p.intensity*months);c.readiness=clamp(c.readiness+.16*p.intensity*months);c.quality=clamp(c.quality+.10*p.intensity*months);
    } else if(p.type==="stockpile"){
      spend(c,1.1*p.intensity*months);c.fuel=clamp(c.fuel+.55*p.intensity*months,0,140);
    } else if(p.type==="agriculture"){
      spend(c,.8*p.intensity*months);c.food=clamp(c.food+.35*p.intensity*months,0,120);c.stability=clamp(c.stability+.04*p.intensity*months);
    } else if(p.type==="propaganda"){
      spend(c,.35*p.intensity*months);const credibility=clamp(c.stability/80,0.35,1.2);c.warSupport=clamp(c.warSupport+.20*p.intensity*months*credibility);c.stability=clamp(c.stability+.07*p.intensity*months*credibility);
    } else if(p.type==="repression_aftershock"){
      if(p.elapsed>60)c.stability=clamp(c.stability-.08*p.intensity*months);
    } else if(p.type==="reform"){
      spend(c,.3*p.intensity*months);if(p.elapsed>90)c.stability=clamp(c.stability+.18*p.intensity*months);
    } else if(p.type==="welfare"){
      spend(c,1.2*p.intensity*months);c.stability=clamp(c.stability+.16*p.intensity*months);c.gdp+=.04*p.intensity*months;
    } else if(p.type==="research"){
      spend(c,.8*p.intensity*months);c.research[p.subject]=(c.research[p.subject]||0)+1.5*p.intensity*months;
      if(c.research[p.subject]>=100){c.research[p.subject]-=100;c.technology=clamp(c.technology+2.2);if(p.subject==="air")c.air=clamp(c.air+2);if(p.subject==="land")c.quality=clamp(c.quality+2);if(p.subject==="industry")c.industry+=1;H.event("RESEARCH BREAKTHROUGH",`${c.name}'s sustained ${p.subject} research programme produces a meaningful technological advance.`,"economy",3,[p.actor],[`Technology +2.2`])}
    } else if(p.type==="custom"){
      // Generic directives use keywords to feed existing state variables rather than only flavor text.
      const t=norm(p.text);spend(c,.35*p.intensity*months);
      if(/salary|wage/.test(t)){c.stability=clamp(c.stability+.06*p.intensity*months);c.treasury=Math.max(0,c.treasury-.15*p.intensity*months)}
      if(/working hour|hours/.test(t)){c.stability=clamp(c.stability+.08*p.intensity*months);c.gdp=Math.max(5,c.gdp-.03*p.intensity*months)}
      if(/education|university|school/.test(t)){c.technology=clamp(c.technology+.03*p.intensity*months);c.treasury=Math.max(0,c.treasury-.06*p.intensity*months)}
      if(/fuel|oil/.test(t))c.fuel=clamp(c.fuel+.10*p.intensity*months,0,140);
      if(/worker|factory/.test(t))c.industry=clamp(c.industry+.03*p.intensity*months,5,130);
    }
    if(p.elapsed>=p.duration&&p.active){
      p.active=false;H.event("PROGRAMME REACHES REVIEW POINT",`${c.name}'s ${p.label.toLowerCase()} reaches its scheduled review point. Its accumulated effects now remain part of the national position.`,"domestic",2,[p.actor]);
    }
  }
}

function resolveCovert(o){
  const A=H.C(o.actor),B=H.C(o.target);if(!A||!B)return;
  const knowledge=H.knowledge(o.actor,o.target),def=B.counterintel;
  const success=clamp(38+A.intel*.35+knowledge*.20-def*.32+(o.intensity-1)*20+rnd(-18,18),5,92);
  const exposed=clamp(25+def*.35-A.intel*.22+(o.intensity-1)*10+(o.secrecy?-12:5)+rnd(-15,15),4,88);
  const ok=Math.random()*100<success,seen=Math.random()*100<exposed;
  if(ok){
    if(o.type==="spy"){H.addKnowledge(o.actor,o.target,18*o.intensity);A.intel=clamp(A.intel+1.5);H.event("INTELLIGENCE NETWORK ESTABLISHED",`${A.name}'s network inside ${B.name} improves estimates of military and economic conditions.`,"intelligence",3,[o.actor],[`Intel on ${B.name} +`])}
    if(o.type==="sabotage"){B.industry=Math.max(5,B.industry-1.5*o.intensity);B.logistics=clamp(B.logistics-1*o.intensity);H.event("INDUSTRIAL SABOTAGE",`Disruption inside ${B.name} damages industrial throughput and transport efficiency. Attribution remains ${seen?"increasingly clear":"uncertain"}.`,"intelligence",4,[o.actor,o.target],[`${B.name} industry -`,`Logistics -`])}
    if(o.type==="influence"){B.stability=clamp(B.stability-2.5*o.intensity);H.addRelation(o.actor,o.target,seen?-4:2);H.event("FOREIGN POLITICAL INFLUENCE",`${A.name}'s political influence effort alters the domestic balance inside ${B.name}, increasing pressure on the government.`,"intelligence",3,[o.actor,o.target],[`${B.name} stability -`])}
    if(o.type==="coup"){const coupPower=(100-B.stability)+A.intel*.25;if(coupPower+rnd(-20,20)>55){B.stability=clamp(B.stability-18);B.leader="Emergency Government";H.addRelation(o.actor,o.target,15);H.event("GOVERNMENT CRISIS",`${B.name}'s political order is shaken by an attempted seizure of power. An emergency government forms amid severe instability.`,"domestic",6,[o.actor,o.target],[`${B.name} stability -18`])}else B.stability=clamp(B.stability-5)}
    if(o.type==="steal_tech"){A.technology=clamp(A.technology+1.8*o.intensity);H.event("TECHNOLOGY ACQUIRED",`${A.name}'s intelligence services obtain useful technical material from ${B.name}.`,"intelligence",3,[o.actor],[`Technology +${(1.8*o.intensity).toFixed(1)}`])}
  }else H.event("COVERT OPERATION FAILS",`${A.name}'s ${o.type.replace("_"," ")} operation inside ${B.name} fails to achieve its intended objective.`,"intelligence",seen?4:2,[o.actor,o.target]);
  if(seen){
    H.addRelation(o.actor,o.target,-20);H.addTrust(o.actor,o.target,-18);H.addThreat(o.target,o.actor,8);H.remember(o.target,o.actor,"covert_interference",o.text||o.label,3);
    H.event("FOREIGN INTERFERENCE EXPOSED",`${B.name} publicly accuses ${A.name} of covert interference. Diplomatic relations deteriorate sharply, and future proposals will be judged against this betrayal.`,"diplomacy",5,[o.actor,o.target],["Relations -20","Trust -18"]);
  }
}

function progressOperations(days){
  for(const o of H.state.operations){
    if(!o.active)continue;o.elapsed+=days;o.progress=clamp(o.elapsed/o.duration*100);
    if(o.elapsed>=o.duration){o.active=false;resolveCovert(o)}
  }
}

function economyTick(days){
  const months=days/30;
  for(const [code,c] of Object.entries(H.state.countries)){
    if(!c.alive)continue;
    const war=H.atWar(code);
    let tradeBonus=0;
    for(const link of H.state.tradeLinks.filter(x=>x.active&&(x.a===code||x.b===code))){
      const partner=link.a===code?link.b:link.a;if(!H.C(partner)?.alive)continue;
      tradeBonus+=link.volume*.006*months;
      if(link.resource==="fuel")c.fuel=clamp(c.fuel+.16*link.volume*months,0,140);
      if(link.resource==="food")c.food=clamp(c.food+.14*link.volume*months,0,120);
    }
    const revenue=c.gdp*c.taxRate*.12*months;
    const debtService=c.debt*.006*months;
    const militaryCost=(c.army/500+c.air/95+c.navy/100)*(war?1.35:.72)*months*(c.militaryBudget/12);
    c.treasury+=revenue+tradeBonus-debtService-militaryCost;
    if(c.treasury<0){c.debt+=Math.abs(c.treasury)*1.2;c.treasury=0;c.inflation+=.12*months}
    if(war){
      c.fuel=clamp(c.fuel-(.45+c.army/2200)*months,0,140);c.food=clamp(c.food-(.22+c.army/3500)*months,0,120);
      c.exhaustion=clamp(c.exhaustion+.5*months);c.gdp=Math.max(5,c.gdp-.08*months);
    }else{
      c.exhaustion=clamp(c.exhaustion-.25*months);c.gdp+=.025*months*(c.stability/70);
    }
    if(c.fuel<20){c.readiness=clamp(c.readiness-.6*months);if(war)c.warSupport=clamp(c.warSupport-.25*months)}
    if(c.food<28){c.stability=clamp(c.stability-.8*months);if(!H.state.flags[`food-${code}`]){H.state.flags[`food-${code}`]=true;H.event(`FOOD SHORTAGES IN ${c.name.toUpperCase()}`,`Shortages and distribution problems begin affecting civilian morale in ${c.name}.`,"domestic",3,[code],["Stability pressure"])}}
  }
}

function combatPower(code,war,side){
  const c=H.C(code);if(!c?.alive)return 0;
  const members=side==="attackers"?war.attackers:war.defenders;
  const share=1/Math.max(1,members.length);
  let p=c.army*share*(.55+c.quality/100)*(.55+c.readiness/100)*(.5+c.logistics/100)*(.55+c.warSupport/100);
  p*=.72+c.air/180;p*=.55+Math.min(100,c.fuel)/150;
  return p;
}

function nextTargetRegion(defender,attacker){
  return H.regionsOf(defender).filter(r=>H.state.regionControl[r.id]===defender)
    .sort((a,b)=>(b.value+(b.terrain==="urban"?7:0))-(a.value+(a.terrain==="urban"?7:0)))[0]||null;
}

function simulateWars(days){
  const weeks=days/7;
  for(const w of H.state.wars){
    if(!w.active)continue;
    for(const front of w.fronts){
      const target=H.REGIONS.find(r=>r.id===front.targetRegion)||nextTargetRegion(w.defender,w.attacker);
      if(!target)continue;
      front.targetRegion=target.id;
      let ap=w.attackers.reduce((s,c)=>s+combatPower(c,w,"attackers"),0);
      let dp=w.defenders.reduce((s,c)=>s+combatPower(c,w,"defenders"),0);
      const fort=H.state.fortifications[target.id]||0;dp*=H.TERRAIN_MOD[target.terrain]||1;dp*=1+fort*.055;
      const ratio=(ap+1)/(dp+1),momentum=Math.log(ratio)*16*weeks+rnd(-3,3)*Math.sqrt(weeks);
      front.progress=clamp(front.progress+momentum,-40,120);
      const intensity=Math.min(ap,dp)/800;
      const lossA=Math.max(.15,(1/Math.max(.55,ratio))*intensity*rnd(2.5,5)*weeks);
      const lossD=Math.max(.15,(Math.max(.55,ratio))*intensity*rnd(2.4,4.8)*weeks);
      const attackers=w.attackers.filter(H.alive),defenders=w.defenders.filter(H.alive);
      for(const a of attackers){const c=H.C(a),loss=Math.min(c.army*.025,lossA/attackers.length);c.army=Math.max(1,c.army-loss);c.manpower=Math.max(0,c.manpower-loss*.32);w.losses[a]=(w.losses[a]||0)+loss}
      for(const d of defenders){const c=H.C(d),loss=Math.min(c.army*.03,lossD/defenders.length);c.army=Math.max(1,c.army-loss);c.manpower=Math.max(0,c.manpower-loss*.34);w.losses[d]=(w.losses[d]||0)+loss}
      if(front.progress>=100){
        H.state.regionControl[target.id]=w.attacker;w.territoryTaken++;front.progress=28;
        H.event("FRONT BREAKTHROUGH",`${H.C(w.attacker).name}-led forces seize ${target.name} from ${H.C(w.defender).name}. The front moves rather than the entire country changing hands at once.`,"war",5,[...w.attackers,...w.defenders],[`${target.name} occupied`]);
        const n=nextTargetRegion(w.defender,w.attacker);front.targetRegion=n?.id||null;
      }else if(front.progress<=-35){
        // Defender counterattack can liberate one occupied core region.
        const occ=H.regionsOf(w.defender).filter(r=>H.state.regionControl[r.id]===w.attacker).sort((a,b)=>b.value-a.value)[0];
        if(occ){H.state.regionControl[occ.id]=w.defender;w.territoryTaken=Math.max(0,w.territoryTaken-1);H.event("COUNTEROFFENSIVE",`${H.C(w.defender).name}-led forces recapture ${occ.name}, reversing part of the enemy advance.`,"war",4,[...w.attackers,...w.defenders],[`${occ.name} liberated`])}
        front.progress=5;
      }
    }
    const remaining=H.regionsOf(w.defender).filter(r=>H.state.regionControl[r.id]===w.defender);
    const def=H.C(w.defender);
    const coreTotal=Math.max(1,H.regionsOf(w.defender).length);
    const controlledRatio=remaining.length/coreTotal;
    if((coreTotal>=2&&controlledRatio<=.25)||(def.army<Math.max(8,D[w.defender].stats.army*.12)&&w.territoryTaken>0)){
      capitulate(w,w.defender,w.attacker);
    }
  }
}

function capitulate(w,loser,winner){
  if(!w.active)return;
  const L=H.C(loser),W=H.C(winner);L.alive=false;L.atWar=false;H.state.defeated[loser]={date:H.state.date,by:winner};
  H.regionsOf(loser).forEach(r=>H.state.regionControl[r.id]=winner);W.treasury+=Math.min(10,L.treasury*.25);L.treasury*=.4;
  w.active=false;w.end=H.state.date;for(const c of [...w.attackers,...w.defenders])if(H.C(c))H.C(c).atWar=H.atWar(c);
  H.state.worldTension=clamp(H.state.worldTension+4);
  H.event(`${L.name.toUpperCase()} CAPITULATES`,`${L.name}'s organised resistance collapses after sustained military and territorial losses. ${W.name} occupies the remaining strategic regions, transforming the balance of power.`,"war",7,[loser,winner],["Government defeated","Remaining regions occupied"]);
}

function treatyTick(){
  for(const t of H.state.treaties)if(t.active&&t.end<=H.state.date)t.active=false;
}

function historicalTick(){
  if(H.state.mode!=="historical")return;
  for(const h of H.HISTORICAL_PRESSURES){
    const key=`hist-${h.key}`;if(H.state.flags[key]||H.state.date<h.date)continue;
    H.state.flags[key]=true;
    // Pressure only fires if its causal context still exists.
    const living=h.countries.filter(H.alive);
    if(living.length<Math.ceil(h.countries.length*.6))continue;
    H.event(h.title.toUpperCase(),h.body,"world",3,living,["Historical pressure — not a scripted outcome"]);
    if(h.key==="spain"&&H.C("ESP")?.stability<50){H.C("ESP").stability=clamp(H.C("ESP").stability-8);H.C("ESP").warSupport=clamp(H.C("ESP").warSupport+6)}
    if(h.key==="rhineland"&&H.alive("DEU")&&H.state.player!=="DEU")H.addThreat("FRA","DEU",3);
  }
}

function strategicReactions(){
  // Canada / Western Hemisphere.
  const canadaWar=H.state.wars.find(w=>w.active&&w.defenders.includes("CAN")&&!w.attackers.includes("USA"));
  if(canadaWar&&H.alive("USA")&&H.C("USA").warSupport>=48&&!canadaWar.defenders.includes("USA"))joinWar(canadaWar,"USA","defenders","after the attack on Canada destroys the remaining basis for neutrality");
  // Continental hegemon balancing.
  for(const actor of Object.keys(H.state.countries)){
    if(!H.alive(actor))continue;
    const foreignControlled=H.REGIONS.filter(r=>r.country!==actor&&H.state.regionControl[r.id]===actor).length;
    if(foreignControlled>=4&&!H.state.flags[`balance-${actor}-${Math.floor(foreignControlled/3)}`]){
      H.state.flags[`balance-${actor}-${Math.floor(foreignControlled/3)}`]=true;
      for(const balancer of ["GBR","FRA","RUS","USA"].filter(x=>H.alive(x)&&x!==actor)){
        H.addThreat(balancer,actor,8);H.addRelation(balancer,actor,-5);
      }
      H.event("BALANCE-OF-POWER ALARM",`${H.C(actor).name}'s territorial expansion is now large enough to alter the strategic calculations of the major powers. Even governments that previously tolerated its actions begin considering containment.`,"diplomacy",4,[actor,"GBR","FRA","RUS"].filter(H.alive),["Great-power threat perception ↑"]);
    }
  }
}

function processConditionalDeployments(){
  for(const d of H.state.deployments.filter(x=>x.active&&x.conditional&&x.target)){
    const t=norm(d.conditional),target=H.C(d.target);if(!target)continue;
    if(/mobil|respond militar|troop|attack/.test(t)&&(target.readiness>68||H.atWar(d.actor))){
      d.active=false;H.addThreat(d.target,d.actor,-3);H.event("CONDITIONAL WITHDRAWAL",`${H.C(d.actor).name} executes a previously issued fallback instruction and reduces its forward deployment facing ${target.name}.`,"war",3,[d.actor,d.target],["Forward threat reduced"]);
    }
  }
}

function processAssurances(){
  for(const t of H.state.treaties.filter(x=>x.active&&x.type==="assurance"&&x.condition&&!x.fulfilled)){
    const actor=t.members[0],recipient=t.members[1],cond=norm(t.condition),promise=norm(t.promiseText);
    let triggered=false;
    for(const [code,c] of Object.entries(H.state.countries)){
      const aliases=[c.name,...(c.aliases||[])].map(norm);
      if(!aliases.some(a=>a.length>2&&cond.includes(a)))continue;
      if(/mobil|troop|military response|respond militar/.test(cond)){
        const mobilising=H.state.policies.some(p=>p.active&&p.actor===code&&p.type==="mobilize");
        triggered=mobilising||c.readiness>68||H.atWar(code);
      }
    }
    if(!triggered)continue;
    t.fulfilled=true;
    if(/withdraw|pull back|retreat|fall back/.test(promise)){
      const order=H.interpret(t.promiseText,actor);order.type="withdraw";order.domain="military";order.target=null;
      const reg=regionFromText(t.promiseText);order.region=reg?.id||null;
      resolveMilitary(order);H.addTrust(actor,recipient,5);H.remember(recipient,actor,"promise_kept",t.promiseText,2);
      H.event("ASSURANCE HONOURED",`${H.C(actor).name} carries out a previously recorded conditional assurance to ${H.C(recipient).name}. Following through improves diplomatic credibility.`,"diplomacy",4,[actor,recipient],["Trust +5"]);
    }
  }
}

H.tick=function(days,{runAI=true}={}){
  H.state.date=addDays(H.state.date,days);H.state.totalDays+=days;H.state.turn++;
  progressPolicies(days);progressOperations(days);economyTick(days);simulateWars(days);treatyTick();historicalTick();strategicReactions();processConditionalDeployments();processAssurances();
  for(const code of Object.keys(H.state.countries)){H.C(code).atWar=H.atWar(code)}
  H.state.worldTension=clamp(H.state.worldTension,0,100);
  if(runAI&&typeof H.aiTick==="function")H.aiTick(days);
};

H.pushHistory=function(){
  const snap=deep(H.state);snap.history=[];
  H.state.history.push(snap);if(H.state.history.length>12)H.state.history.shift();
};
H.rewind=function(){
  if(!H.state.history.length)return false;
  const hist=H.state.history,prev=hist.pop();prev.history=hist;H.state=prev;return true;
};

H.advanceGame=function(days){
  if(!H.state.player)return;
  if(H.state.pendingJump>0)return {ok:false,reason:"pending"};
  H.pushHistory();
  for(const o of [...H.state.queue])H.resolveOrder(o,"player");
  H.state.queue=[];
  H.state.pendingJump=days;
  return H.continueJump();
};
H.continueJump=function(){
  if(H.state.pendingJump<=0)return {ok:false,reason:"none"};
  H.state.simulating=true;H.state.interrupt=false;H.state.interruptReason="";
  while(H.state.pendingJump>0){
    const step=Math.min(H.state.pendingJump,H.state.pendingJump>180?14:7);
    H.tick(step,{runAI:true});H.state.pendingJump-=step;
    if(H.state.interrupt&&H.state.pendingJump>0){
      H.event("TIME ADVANCE INTERRUPTED",`A major development directly affecting ${H.C(H.state.player).name} requires attention. ${H.state.pendingJump} days remain in the original time jump.`,"world",1,[H.state.player],[`${H.state.pendingJump} days remain`]);
      break;
    }
  }
  H.state.simulating=false;if(H.state.pendingJump<1)H.state.pendingJump=0;
  H.autosave();
  return {ok:true,interrupted:H.state.pendingJump>0,reason:H.state.interruptReason};
};

H.autosave=function(){
  try{H.state.lastAutosave=new Date().toISOString();localStorage.setItem("historia-1936-v8-auto",JSON.stringify(H.state));return true}catch(e){return false}
};
H.manualSave=function(){try{localStorage.setItem("historia-1936-v8-manual",JSON.stringify(H.state));return true}catch(e){return false}};
H.loadSave=function(){
  try{
    const raw=localStorage.getItem("historia-1936-v8-manual")||localStorage.getItem("historia-1936-v8-auto");
    if(!raw)return false;const loaded=JSON.parse(raw);if(loaded.version!==H.DATA_VERSION)return false;H.state=loaded;return true
  }catch(e){return false}
};
H.exportSave=function(){
  const blob=new Blob([JSON.stringify(H.state,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`historia-${H.state.player||"campaign"}-${H.state.date}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};
H.importSave=async function(file){
  const text=await file.text(),loaded=JSON.parse(text);if(loaded.version!==H.DATA_VERSION)throw new Error("Incompatible save version");H.state=loaded;H.autosave();return true;
};

H.startCampaign=function(player,mode,difficulty){
  H.state=freshState();H.state.player=player;H.state.selectedCountry=player;H.state.mode=mode;H.state.difficulty=difficulty;
  const c=H.C(player);
  if(difficulty==="forgiving"){c.treasury+=15;c.stability=clamp(c.stability+6);c.reserveEquipment+=30}
  if(mode==="chaos"){for(const [code,x] of Object.entries(H.state.countries)){if(code===player)continue;x.personality.aggression=clamp(x.personality.aggression+rnd(-5,18));x.personality.caution=clamp(x.personality.caution+rnd(-18,8))}}
  H.event("A NEW TIMELINE BEGINS",`You assume leadership of ${c.name} on 1 January 1936. Historical conditions provide the starting situation; future outcomes will be generated by the evolving world state.`,"domestic",2,[player],["History is now conditional"]);
  H.autosave();return H.state;
};

})(window.Historia);
