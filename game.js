
(() => {
'use strict';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const clamp = (n,a,b) => Math.max(a, Math.min(b,n));
const rnd = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const choice = a => a[Math.floor(Math.random()*a.length)];
const esc = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

const COUNTRY_DATA = {
  GER:{name:"German Reich",short:"Germany",leader:"Adolf Hitler",ideology:"National Socialist dictatorship",color:"#666f79",pop:67,industry:78,army:82,air:76,navy:42,stability:74,support:70,treasury:63,objectives:"Rearm, revise Versailles, expand German influence, avoid premature encirclement.",relations:{FRA:-55,UK:-30,POL:-42,USSR:-48,ITA:28,AUT:42,CZE:-46}},
  UK:{name:"United Kingdom",short:"Britain",leader:"Stanley Baldwin",ideology:"Parliamentary democracy",color:"#a77a58",pop:47,industry:82,army:54,air:72,navy:96,stability:85,support:42,treasury:78,objectives:"Preserve European balance, protect empire and sea lanes, avoid unnecessary continental war.",relations:{GER:-30,FRA:68,POL:28,USSR:-15,ITA:12,USA:70}},
  FRA:{name:"French Republic",short:"France",leader:"Albert Lebrun",ideology:"Parliamentary republic",color:"#516f9f",pop:41,industry:70,army:74,air:63,navy:67,stability:58,support:48,treasury:69,objectives:"Contain German revisionism, preserve alliances, defend the eastern frontier.",relations:{GER:-55,UK:68,POL:58,USSR:24,ITA:-2,BEL:64}},
  USSR:{name:"Soviet Union",short:"USSR",leader:"Joseph Stalin",ideology:"Communist one-party state",color:"#9b4a49",pop:169,industry:74,army:88,air:70,navy:36,stability:66,support:62,treasury:72,objectives:"Secure borders, expand industrial-military power, avoid capitalist encirclement.",relations:{GER:-48,FRA:24,UK:-15,POL:-62,JAP:-52}},
  ITA:{name:"Kingdom of Italy",short:"Italy",leader:"Benito Mussolini",ideology:"Fascist dictatorship",color:"#638461",pop:43,industry:55,army:65,air:60,navy:70,stability:72,support:66,treasury:51,objectives:"Expand Mediterranean influence, consolidate fascist prestige, avoid strategic isolation.",relations:{GER:28,UK:12,FRA:-2,AUT:10,YUG:-36}},
  POL:{name:"Second Polish Republic",short:"Poland",leader:"Ignacy Mościcki",ideology:"Authoritarian republic",color:"#b88989",pop:35,industry:45,army:64,air:46,navy:18,stability:61,support:64,treasury:48,objectives:"Preserve sovereignty between Germany and USSR, strengthen alliances and defenses.",relations:{GER:-42,USSR:-62,FRA:58,UK:28,CZE:-12}},
  CZE:{name:"Czechoslovak Republic",short:"Czechoslovakia",leader:"Edvard Beneš",ideology:"Parliamentary democracy",color:"#8371a3",pop:15,industry:62,army:58,air:48,navy:0,stability:73,support:59,treasury:61,objectives:"Defend borders, preserve French alliance, manage ethnic tensions.",relations:{GER:-46,FRA:65,POL:-12,AUT:8}},
  AUT:{name:"Federal State of Austria",short:"Austria",leader:"Kurt Schuschnigg",ideology:"Austrofascist authoritarian state",color:"#a89a75",pop:7,industry:39,army:28,air:15,navy:0,stability:49,support:44,treasury:42,objectives:"Preserve independence while balancing German pressure and Italian protection.",relations:{GER:42,ITA:10,CZE:8}},
  BEL:{name:"Kingdom of Belgium",short:"Belgium",leader:"Leopold III",ideology:"Constitutional monarchy",color:"#ae8a55",pop:8,industry:58,army:34,air:28,navy:8,stability:81,support:35,treasury:65,objectives:"Preserve neutrality and prevent great-power conflict from crossing Belgium.",relations:{FRA:64,UK:52,GER:-15}},
  NED:{name:"Kingdom of the Netherlands",short:"Netherlands",leader:"Wilhelmina",ideology:"Constitutional monarchy",color:"#a5684e",pop:9,industry:56,army:30,air:27,navy:37,stability:84,support:30,treasury:68,objectives:"Protect neutrality, trade, and overseas interests.",relations:{UK:48,GER:-5,FRA:32}},
  SPA:{name:"Spanish Republic",short:"Spain",leader:"Manuel Azaña",ideology:"Republic",color:"#a68050",pop:25,industry:38,army:46,air:32,navy:35,stability:31,support:54,treasury:36,objectives:"Avoid state breakdown amid acute political polarization.",relations:{FRA:22,GER:-12,ITA:-8,USSR:5}},
  POR:{name:"Portuguese Republic",short:"Portugal",leader:"Óscar Carmona",ideology:"Estado Novo authoritarian regime",color:"#758d6f",pop:7,industry:26,army:25,air:17,navy:23,stability:70,support:38,treasury:42,objectives:"Preserve regime stability, empire, and British alignment.",relations:{UK:72,SPA:18}},
  HUN:{name:"Kingdom of Hungary",short:"Hungary",leader:"Miklós Horthy",ideology:"Authoritarian regency",color:"#80759a",pop:9,industry:38,army:42,air:26,navy:0,stability:68,support:58,treasury:43,objectives:"Revise Treaty of Trianon and recover lost territories.",relations:{GER:25,ITA:32,CZE:-38,ROM:-45,YUG:-28}},
  ROM:{name:"Kingdom of Romania",short:"Romania",leader:"Carol II",ideology:"Monarchy",color:"#8c7d57",pop:19,industry:37,army:52,air:31,navy:14,stability:55,support:55,treasury:48,objectives:"Protect territorial gains, oil resources, and regional alliances.",relations:{FRA:44,POL:38,USSR:-50,HUN:-45}},
  YUG:{name:"Kingdom of Yugoslavia",short:"Yugoslavia",leader:"Prince Paul",ideology:"Monarchy",color:"#6d7e91",pop:15,industry:30,army:49,air:28,navy:18,stability:47,support:48,treasury:42,objectives:"Preserve internal cohesion and resist revisionist neighbors.",relations:{ITA:-36,HUN:-28,FRA:36}},
  GRE:{name:"Kingdom of Greece",short:"Greece",leader:"George II",ideology:"Monarchy",color:"#607d9d",pop:7,industry:25,army:37,air:20,navy:28,stability:52,support:45,treasury:38,objectives:"Protect sovereignty and manage Balkan rivalries.",relations:{UK:32,ITA:-22,TUR:10}},
  TUR:{name:"Republic of Turkey",short:"Turkey",leader:"Mustafa Kemal Atatürk",ideology:"Secular republic",color:"#9b5b55",pop:16,industry:31,army:49,air:25,navy:27,stability:77,support:46,treasury:46,objectives:"Consolidate modernization, sovereignty, and control of the Straits.",relations:{USSR:18,UK:20,GRE:10}},
  SWE:{name:"Kingdom of Sweden",short:"Sweden",leader:"Gustaf V",ideology:"Constitutional monarchy",color:"#7c91a7",pop:6,industry:47,army:25,air:23,navy:34,stability:91,support:22,treasury:72,objectives:"Maintain neutrality and trade.",relations:{UK:36,GER:14}},
  NOR:{name:"Kingdom of Norway",short:"Norway",leader:"Haakon VII",ideology:"Constitutional monarchy",color:"#6f879a",pop:3,industry:33,army:19,air:15,navy:32,stability:90,support:20,treasury:62,objectives:"Maintain neutrality and protect coastline and shipping.",relations:{UK:42,GER:8}},
  DEN:{name:"Kingdom of Denmark",short:"Denmark",leader:"Christian X",ideology:"Constitutional monarchy",color:"#a26c68",pop:4,industry:36,army:18,air:12,navy:20,stability:91,support:18,treasury:62,objectives:"Maintain neutrality despite exposure to German pressure.",relations:{GER:5,UK:38}},
  FIN:{name:"Republic of Finland",short:"Finland",leader:"P. E. Svinhufvud",ideology:"Republic",color:"#8c9ba7",pop:4,industry:29,army:37,air:19,navy:16,stability:79,support:53,treasury:50,objectives:"Preserve independence and prepare against Soviet pressure.",relations:{USSR:-48,SWE:42}},
  SWI:{name:"Swiss Confederation",short:"Switzerland",leader:"Federal Council",ideology:"Federal republic",color:"#9a5f5f",pop:4,industry:43,army:32,air:16,navy:0,stability:95,support:20,treasury:80,objectives:"Preserve armed neutrality and financial stability.",relations:{FRA:40,GER:16,ITA:24}},
  IRE:{name:"Irish Free State",short:"Ireland",leader:"Éamon de Valera",ideology:"Parliamentary democracy",color:"#64866f",pop:3,industry:24,army:18,air:8,navy:5,stability:75,support:18,treasury:43,objectives:"Preserve sovereignty and avoid entanglement in British wars.",relations:{UK:5}},
  USA:{name:"United States",short:"United States",leader:"Franklin D. Roosevelt",ideology:"Federal republic",color:"#57759d",pop:128,industry:100,army:38,air:55,navy:92,stability:82,support:22,treasury:91,objectives:"Recover from Depression, avoid European war, protect hemispheric interests.",relations:{UK:70,FRA:52,GER:-20,JAP:-28}},
  JAP:{name:"Empire of Japan",short:"Japan",leader:"Hirohito",ideology:"Imperial monarchy",color:"#a06c6c",pop:70,industry:62,army:78,air:72,navy:88,stability:69,support:78,treasury:54,objectives:"Expand influence in East Asia and secure strategic resources.",relations:{USSR:-52,USA:-28,GER:14}}
};

const MAP = {
  POR:["80,535 128,525 135,640 92,645",108,585], SPA:["130,510 280,500 325,565 285,650 135,640",225,570],
  FRA:["295,420 430,390 490,445 470,545 330,565 285,500",387,474], UK:["300,260 340,235 372,270 360,345 320,365 290,320",330,300],
  IRE:["250,285 286,278 288,338 245,342",267,315], BEL:["430,400 465,395 474,425 440,435",452,415],
  NED:["451,365 487,360 488,402 463,401",470,382], GER:["485,350 595,330 630,390 605,475 505,472 475,410",550,405],
  DEN:["515,300 560,295 575,327 535,340",545,315], SWI:["430,545 486,535 505,565 455,585",468,560],
  ITA:["505,535 555,540 575,600 610,640 585,690 555,648 540,590",550,590], AUT:["565,475 632,470 652,505 585,525",610,495],
  CZE:["590,420 685,420 705,452 635,475 575,465",638,447], POL:["680,350 805,340 845,410 780,475 690,440",755,402],
  HUN:["625,495 710,485 750,520 690,548 620,530",680,515], ROM:["735,480 825,470 865,525 795,560 725,535",795,515],
  YUG:["625,540 735,535 765,585 700,625 630,595",690,575], GRE:["715,625 775,620 815,685 775,715 735,680",765,667],
  TUR:["805,625 950,615 1020,660 970,705 830,700 790,665",910,665], USSR:["815,250 1120,230 1165,520 910,545 830,465 850,410",1000,375],
  FIN:["815,175 885,150 930,245 875,300 820,260",870,230], SWE:["690,145 765,120 810,290 750,345 700,285",750,235],
  NOR:["610,160 680,110 715,135 680,300 630,340 600,275",650,235]
};

const CITIES = [
 ["Berlin",550,405,"GER"],["Paris",380,470,"FRA"],["London",330,310,"UK"],["Rome",560,615,"ITA"],
 ["Warsaw",760,405,"POL"],["Prague",640,447,"CZE"],["Vienna",610,495,"AUT"],["Moscow",1010,365,"USSR"],
 ["Madrid",220,570,"SPA"],["Bucharest",800,515,"ROM"],["Budapest",682,517,"HUN"],["Belgrade",692,575,"YUG"]
];

const STATE_TEMPLATE = {
  mode:"historical",difficulty:"standard",player:"GER",day:0,tension:8,selected:"GER",
  wars:[],events:[],turn:0,lastTurn:"Campaign initialized.",mapZoom:1,mapX:0,mapY:0
};

let S = structuredClone(STATE_TEMPLATE);

function initCountries(){
  S.countries={};
  for(const [k,v] of Object.entries(COUNTRY_DATA)){
    S.countries[k]={...v,relations:{...(v.relations||{})},mobilization:20,warSupport:v.support,industry:v.industry,army:v.army,air:v.air,navy:v.navy,stability:v.stability,treasury:v.treasury};
  }
}

function dateFromDay(day){
  const d=new Date(Date.UTC(1936,0,1));
  d.setUTCDate(d.getUTCDate()+day);
  return d;
}
function fmtDate(){
  return dateFromDay(S.day).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).toUpperCase();
}
function rel(a,b){
  const A=S.countries[a]; if(!A) return 0;
  if(A.relations[b]===undefined) A.relations[b]=0;
  return A.relations[b];
}
function changeRel(a,b,n){
  if(!S.countries[a]||!S.countries[b]) return;
  S.countries[a].relations[b]=clamp(rel(a,b)+n,-100,100);
  S.countries[b].relations[a]=clamp(rel(b,a)+n,-100,100);
}
function addEvent(title,text,type="WORLD"){
  S.events.unshift({date:fmtDate(),title,text,type});
  S.events=S.events.slice(0,80);
}
function toast(t){
  const el=$("#toast"); el.textContent=t; el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),1500);
}
function warKey(a,b){return [a,b].sort().join("-")}
function atWar(a,b){return S.wars.includes(warKey(a,b))}
function startWar(a,b,reason){
  const k=warKey(a,b); if(S.wars.includes(k)) return false;
  S.wars.push(k); S.tension=clamp(S.tension+18,0,100); changeRel(a,b,-55);
  S.countries[a].warSupport=clamp(S.countries[a].warSupport+12,0,100);
  S.countries[b].warSupport=clamp(S.countries[b].warSupport+16,0,100);
  addEvent("WAR ERUPTS",`${S.countries[a].short} and ${S.countries[b].short} are now at war. ${reason||""}`,"WAR");
  return true;
}
function difficultyMult(){return S.difficulty==="hard"?1.2:S.difficulty==="relaxed"?.8:1}

function resolveOrder(raw){
  const text=raw.trim();
  if(!text) return {summary:"No order was issued.",effects:[]};
  const l=text.toLowerCase();
  const P=S.player, pc=S.countries[P], effects=[];
  let target=findTarget(l,P);

  if(/invade|attack|declare war|cross the border|offensive/.test(l)){
    if(target){
      const ratio=(pc.army+pc.air*.35)/(S.countries[target].army+S.countries[target].air*.35);
      const prep=(pc.mobilization+pc.warSupport)/200;
      const chance=clamp((.36 + (ratio-1)*.22 + prep*.2)/difficultyMult(),.08,.82);
      startWar(P,target,`${pc.short} launched an offensive.`);
      if(Math.random()<chance){
        pc.army=clamp(pc.army-rnd(2,7),1,100); S.countries[target].army=clamp(S.countries[target].army-rnd(5,13),1,100);
        effects.push(`${pc.short} achieves initial operational gains against ${S.countries[target].short}.`);
        addEvent("Initial breakthrough",`${pc.short} forces advance after hard fighting. The defending government orders emergency mobilization.`,"MILITARY");
      }else{
        pc.army=clamp(pc.army-rnd(5,12),1,100); S.countries[target].army=clamp(S.countries[target].army-rnd(2,8),1,100);
        effects.push(`${pc.short}'s offensive meets stronger resistance than expected.`);
        addEvent("Offensive checked",`${S.countries[target].short} slows the attack. Casualties and logistical strain rise.`,"MILITARY");
      }
    } else effects.push("The military order lacks a clear geographic target, so the general staff begins contingency planning instead.");
  }

  if(/mobil|every man|conscription|draft|call up|army expansion|recruit/.test(l)){
    const amt=/every man|total|maximum|full/.test(l)?rnd(20,32):rnd(8,16);
    pc.mobilization=clamp(pc.mobilization+amt,0,100);
    pc.army=clamp(pc.army+Math.round(amt*.28),0,100);
    pc.industry=clamp(pc.industry-Math.round(amt*.10),0,100);
    pc.stability=clamp(pc.stability-rnd(1,5),0,100);
    S.tension=clamp(S.tension+Math.round(amt*.18),0,100);
    effects.push(`Mobilization rises to ${pc.mobilization}%; military manpower expands, but civilian output tightens.`);
  }

  if(/rearm|tank|aircraft|fighter|bomber|weapon|military production/.test(l)){
    const gain=rnd(3,8);
    pc.army=clamp(pc.army+gain,0,100); pc.air=clamp(pc.air+rnd(1,6),0,100); pc.treasury=clamp(pc.treasury-rnd(3,7),0,100);
    S.tension=clamp(S.tension+rnd(1,4),0,100);
    effects.push("Rearmament accelerates. Military capability improves at a fiscal and diplomatic cost.");
  }

  if(/factory|industry|industrial|civilian economy|infrastructure|rail/.test(l)){
    pc.industry=clamp(pc.industry+rnd(2,7),0,100); pc.treasury=clamp(pc.treasury-rnd(2,5),0,100);
    effects.push("Industrial investment expands productive capacity, though the treasury absorbs near-term costs.");
  }

  if(/tax|austerity|cut spending|balance budget/.test(l)){
    pc.treasury=clamp(pc.treasury+rnd(3,8),0,100); pc.stability=clamp(pc.stability-rnd(1,5),0,100);
    effects.push("The treasury strengthens, but domestic political tolerance declines.");
  }

  if(/propaganda|rally|national unity|speech/.test(l)){
    pc.warSupport=clamp(pc.warSupport+rnd(2,7),0,100); pc.stability=clamp(pc.stability+rnd(1,4),0,100);
    effects.push("The propaganda campaign lifts public resolve, though foreign observers take note.");
  }

  if(/fortif|defensive|bunker|maginot|prepare defense|dig in/.test(l)){
    pc.army=clamp(pc.army+rnd(1,4),0,100); pc.treasury=clamp(pc.treasury-rnd(1,4),0,100);
    effects.push("Defensive works and readiness improve along threatened approaches.");
  }

  if(/offer|treaty|pact|non-aggression|alliance|guarantee|recognise|recognize|diplom/.test(l) && target){
    const base=rel(P,target);
    const accept=clamp(45+base*.35+(S.mode==="sandbox"?8:0)-(S.difficulty==="hard"?8:0),8,88);
    if(Math.random()*100<accept){
      changeRel(P,target,rnd(8,18)); S.tension=clamp(S.tension-rnd(0,2),0,100);
      effects.push(`${S.countries[target].short} responds constructively; relations improve.`);
      addEvent("Diplomatic opening",`${pc.short} and ${S.countries[target].short} announce progress after talks.`,"DIPLOMACY");
    }else{
      changeRel(P,target,-rnd(2,8));
      effects.push(`${S.countries[target].short} rejects or stalls the proposal.`);
    }
  }

  if(/demand|ultimatum|cede|annex|return .*territory|danzig|rhineland|anschluss/.test(l)){
    if(target) changeRel(P,target,-rnd(6,16));
    S.tension=clamp(S.tension+rnd(3,9),0,100);
    pc.warSupport=clamp(pc.warSupport+rnd(1,5),0,100);
    effects.push("The territorial pressure alarms neighboring governments and raises the risk of escalation.");
  }

  if(/secret|spy|espionage|intelligence|finance .*polit|support .*movement|coup/.test(l)){
    const success=Math.random() < (.56/difficultyMult());
    if(success){
      if(target) S.countries[target].stability=clamp(S.countries[target].stability-rnd(2,7),0,100);
      effects.push("The covert operation gains traction without immediate public attribution.");
    }else{
      S.tension=clamp(S.tension+rnd(2,6),0,100);
      if(target) changeRel(P,target,-rnd(8,16));
      effects.push("Parts of the covert operation are exposed, creating diplomatic blowback.");
    }
  }

  if(/trade|tariff|embargo|sanction|oil|resource/.test(l)){
    if(/embargo|sanction/.test(l) && target){changeRel(P,target,-rnd(8,15)); S.countries[target].treasury=clamp(S.countries[target].treasury-rnd(2,5),0,100); effects.push(`Economic pressure is applied against ${S.countries[target].short}.`);}
    else {pc.treasury=clamp(pc.treasury+rnd(1,4),0,100); effects.push("Trade policy modestly improves access to resources and revenue.");}
  }

  if(/retreat|withdraw|stand down|de-escalate/.test(l)){
    pc.warSupport=clamp(pc.warSupport-2,0,100); S.tension=clamp(S.tension-rnd(1,4),0,100);
    effects.push("The order reduces immediate escalation risk, though hardliners question the retreat.");
  }

  if(effects.length===0){
    // Generic consequence engine for vague actions.
    const aggressive=/force|pressure|threat|seize|ban|crush|purge|occupy/.test(l);
    const reform=/reform|improve|invest|education|welfare|modernize|modernise/.test(l);
    if(aggressive){S.tension=clamp(S.tension+rnd(1,5),0,100); pc.stability=clamp(pc.stability+rnd(-2,3),0,100); effects.push("The government begins implementing the directive. Foreign governments interpret it as a harder strategic posture.");}
    else if(reform){pc.stability=clamp(pc.stability+rnd(1,5),0,100); pc.treasury=clamp(pc.treasury-rnd(1,4),0,100); effects.push("The reform begins producing modest domestic gains while consuming administrative and financial capacity.");}
    else {pc.stability=clamp(pc.stability+rnd(-1,2),0,100); effects.push("The bureaucracy begins carrying out the order. Its effects are limited for now, but it enters the simulation as an active policy direction.");}
  }

  addEvent("Government order",`${pc.short}: “${text}” ${effects[0]}`,"PLAYER");
  return {summary:effects.join(" "),effects};
}

function findTarget(l,self){
  const aliases={
    GER:["germany","german","reich"],UK:["britain","british","united kingdom","uk"],FRA:["france","french"],
    USSR:["soviet","ussr","russia","russian"],ITA:["italy","italian"],POL:["poland","polish"],CZE:["czechoslovakia","czech"],
    AUT:["austria","austrian"],BEL:["belgium","belgian"],NED:["netherlands","dutch"],SPA:["spain","spanish"],POR:["portugal","portuguese"],
    HUN:["hungary","hungarian"],ROM:["romania","romanian"],YUG:["yugoslavia","yugoslav"],GRE:["greece","greek"],TUR:["turkey","turkish"],
    SWE:["sweden","swedish"],NOR:["norway","norwegian"],DEN:["denmark","danish"],FIN:["finland","finnish"],SWI:["switzerland","swiss"],
    IRE:["ireland","irish"],USA:["united states","america","american","usa"],JAP:["japan","japanese"]
  };
  for(const [k,arr] of Object.entries(aliases)) if(k!==self && arr.some(x=>l.includes(x))) return k;
  if(l.includes("danzig")) return "POL";
  if(l.includes("anschluss")) return "AUT";
  return null;
}

function aiTurn(days){
  const intensity=Math.max(1,Math.round(days/14));
  const actors=Object.keys(S.countries).filter(k=>k!==S.player);
  for(let i=0;i<intensity;i++){
    const a=choice(actors), A=S.countries[a];
    const roll=Math.random();
    if(roll<.26){
      A.mobilization=clamp(A.mobilization+rnd(1,4),0,100);
      if(A.mobilization>45 && Math.random()<.12) addEvent(`${A.short} expands readiness`,`${A.short} quietly increases military readiness amid growing uncertainty.`,"INTELLIGENCE");
    } else if(roll<.48){
      A.industry=clamp(A.industry+rnd(0,2),0,100);
    } else if(roll<.68){
      const neighbors=Object.keys(A.relations||{}).filter(k=>S.countries[k]);
      if(neighbors.length){const b=choice(neighbors); changeRel(a,b,rnd(-4,4));}
    } else if(roll<.84 && S.tension>25){
      A.warSupport=clamp(A.warSupport+rnd(0,3),0,100);
    }
  }

  historicalPressure();
  warTick(days);
}

function historicalPressure(){
  const d=S.day;
  if(S.mode==="historical"){
    if(d>=68 && !S.flags?.rhineland){
      S.flags=S.flags||{}; S.flags.rhineland=true;
      if(S.player!=="GER"){S.tension=clamp(S.tension+5,0,100); addEvent("Rhineland remilitarized","Germany sends troops into the Rhineland. France protests but does not immediately intervene.","HISTORICAL");}
    }
    if(d>=195 && !S.flags?.spain){
      S.flags=S.flags||{}; S.flags.spain=true; S.countries.SPA.stability=clamp(S.countries.SPA.stability-18,0,100);
      addEvent("Spanish crisis deepens","Political violence and military conspiracy push Spain toward civil conflict.","HISTORICAL");
    }
  }
}

function warTick(days){
  for(const key of S.wars){
    const [a,b]=key.split("-"), A=S.countries[a], B=S.countries[b];
    if(!A||!B) continue;
    const pa=A.army+A.air*.35+A.industry*.18+Math.random()*15;
    const pb=B.army+B.air*.35+B.industry*.18+Math.random()*15;
    const scale=Math.max(1,days/14);
    if(pa>pb){
      B.army=clamp(B.army-rnd(1,Math.ceil(4*scale)),1,100);
      A.army=clamp(A.army-rnd(0,Math.ceil(2*scale)),1,100);
    }else{
      A.army=clamp(A.army-rnd(1,Math.ceil(4*scale)),1,100);
      B.army=clamp(B.army-rnd(0,Math.ceil(2*scale)),1,100);
    }
    A.treasury=clamp(A.treasury-rnd(1,3),0,100); B.treasury=clamp(B.treasury-rnd(1,3),0,100);
  }
}

function advance(days,orderSummary){
  S.day+=days; S.turn++;
  aiTurn(days);
  const pc=S.countries[S.player];
  // passive economics
  pc.treasury=clamp(pc.treasury + (pc.industry>65?1:0) - (S.wars.some(w=>w.includes(S.player))?2:0),0,100);
  S.lastTurn=orderSummary;
  render();
}

function renderMap(){
  const layer=$("#map-layer"); layer.innerHTML="";
  const player=S.player;
  Object.entries(MAP).forEach(([k,v])=>{
    if(!S.countries[k]) return;
    const poly=document.createElementNS("http://www.w3.org/2000/svg","polygon");
    poly.setAttribute("points",v[0]); poly.setAttribute("fill",S.countries[k].color);
    poly.setAttribute("class","country-shape"+(k===S.selected?" selected":"")+(k===player?" player-country":""));
    poly.dataset.country=k;
    poly.addEventListener("click",()=>{S.selected=k; renderSidePanels(); renderMap();});
    layer.appendChild(poly);
    const tx=document.createElementNS("http://www.w3.org/2000/svg","text");
    tx.setAttribute("x",v[1]);tx.setAttribute("y",v[2]);tx.setAttribute("class","country-label");tx.textContent=S.countries[k].short;
    layer.appendChild(tx);
  });
  const city=$("#city-layer"); city.innerHTML="";
  for(const [name,x,y,k] of CITIES){
    const c=document.createElementNS("http://www.w3.org/2000/svg","circle");c.setAttribute("cx",x);c.setAttribute("cy",y);c.setAttribute("r",3.2);c.setAttribute("class","city");city.appendChild(c);
    const t=document.createElementNS("http://www.w3.org/2000/svg","text");t.setAttribute("x",x+6);t.setAttribute("y",y-5);t.setAttribute("class","city-label");t.textContent=name;city.appendChild(t);
  }
  const transform=`translate(${S.mapX} ${S.mapY}) scale(${S.mapZoom})`;
  layer.setAttribute("transform",transform); city.setAttribute("transform",transform); $("#front-layer").setAttribute("transform",transform);
}

function statRow(name,val,suffix=""){
  return `<div class="stat"><span>${esc(name)}</span><span>${Math.round(val)}${suffix}</span></div><div class="meter"><i style="width:${clamp(val,0,100)}%"></i></div>`;
}

function renderSidePanels(){
  const pc=S.countries[S.player], sel=S.countries[S.selected]||pc;
  $("#player-name").textContent=pc.name; $("#player-leader").textContent=pc.leader; $("#player-flag").textContent=S.player;
  $("#stats").innerHTML=statRow("Industry",pc.industry)+statRow("Army",pc.army)+statRow("Air power",pc.air)+statRow("Navy",pc.navy)+statRow("Stability",pc.stability)+statRow("War support",pc.warSupport)+statRow("Mobilization",pc.mobilization)+statRow("Treasury",pc.treasury);
  $("#posture").innerHTML=`<div class="tagline"><b>${esc(pc.ideology)}</b><br>${esc(pc.objectives)}</div>`;
  const relations=Object.entries(pc.relations).filter(([k])=>S.countries[k]).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,7);
  $("#relations").innerHTML=relations.map(([k,v])=>`<div class="relation"><span>${esc(S.countries[k].short)}</span><span class="${v>=0?"relpos":"relneg"}">${v>0?"+":""}${v}</span></div>`).join("");
  $("#selected-country-label").textContent=`${sel.name} • ${sel.leader}`;
  $("#intel-panel").innerHTML=`<div class="intel-card"><h5>${esc(sel.name)}</h5><p>${esc(sel.ideology)}<br><br><b>Objectives:</b> ${esc(sel.objectives)}</p></div>
  <div class="intel-card"><h5>Assessment</h5><p>Army ${Math.round(sel.army)} • Air ${Math.round(sel.air)} • Industry ${Math.round(sel.industry)} • Stability ${Math.round(sel.stability)} • Mobilization ${Math.round(sel.mobilization)}%</p></div>`;
  $("#diplo-panel").innerHTML=Object.keys(pc.relations).filter(k=>S.countries[k]).slice(0,10).map(k=>`<div class="diplo-entry"><button class="ghost diplo-pick" data-k="${k}">${esc(S.countries[k].short)} <span style="float:right">${rel(S.player,k)>0?"+":""}${rel(S.player,k)}</span></button></div>`).join("");
  $$(".diplo-pick").forEach(b=>b.onclick=()=>{$("#command-input").value=`Open negotiations with ${S.countries[b.dataset.k].short} and propose `;$("#command-input").focus();});
}

function renderEvents(){
  const arr=S.events.length?S.events:[{date:"1 JAN 1936",type:"WORLD",title:"A fragile peace",text:"Europe begins 1936 under economic strain, revisionist pressure and unresolved security commitments."}];
  $("#event-feed").innerHTML=arr.map(e=>`<article class="event"><div class="meta">${esc(e.date)} • ${esc(e.type)}</div><b>${esc(e.title)}</b><p>${esc(e.text)}</p></article>`).join("");
}

function render(){
  $("#date-label").textContent=fmtDate();
  $("#tension-label").textContent=`World Tension ${Math.round(S.tension)}%`;
  $("#last-turn").textContent=S.lastTurn;
  renderMap();renderSidePanels();renderEvents();
}

function setupCountries(){
  const select=$("#country-select");
  const preferred=["GER","UK","FRA","USSR","ITA","POL","CZE","AUT","BEL","NED","SPA","POR","HUN","ROM","YUG","GRE","TUR","SWE","NOR","DEN","FIN","SWI","IRE","USA","JAP"];
  select.innerHTML=preferred.map(k=>`<option value="${k}">${COUNTRY_DATA[k].name}</option>`).join("");
  select.value="GER";
  updatePreview();
}
function updatePreview(){
  const k=$("#country-select").value,c=COUNTRY_DATA[k];
  $("#country-preview").innerHTML=`<b>${esc(c.leader)}</b> • ${esc(c.ideology)}<br>${esc(c.objectives)}`;
}
function selectChoice(group,btn){
  group.querySelectorAll(".choice").forEach(x=>x.classList.remove("selected"));btn.classList.add("selected");
}
function begin(){
  const country=$("#country-select").value;
  if(!COUNTRY_DATA[country]){$("#setup-error").textContent="Please choose a country.";return;}
  S=structuredClone(STATE_TEMPLATE);initCountries();
  S.mode=$("#mode-choices .selected")?.dataset.mode||"historical";
  S.difficulty=$("#difficulty-choices .selected")?.dataset.difficulty||"standard";
  S.player=country;S.selected=country;
  addEvent("Campaign begins",`${S.countries[country].name} enters 1936 under ${S.countries[country].leader}. Your decisions can preserve or overturn history.`,"WORLD");
  $("#setup").classList.add("hidden");$("#game").classList.remove("hidden");
  populateExamples();render();
}
function populateExamples(){
  const c=S.countries[S.player].short;
  const examples=["Mobilize reserves","Open secret talks","Expand fighter production"];
  if(S.player==="GER") examples.unshift("Move troops into the Rhineland");
  $("#example-actions").innerHTML=examples.slice(0,3).map(x=>`<button class="example">${esc(x)}</button>`).join("");
  $$(".example").forEach(b=>b.onclick=()=>{$("#command-input").value=b.textContent;$("#command-input").focus();});
}

function save(){
  localStorage.setItem("historia1936-save",JSON.stringify(S));toast("Campaign saved");
}
function load(){
  try{
    const raw=localStorage.getItem("historia1936-save");if(!raw){toast("No saved campaign");return;}
    const obj=JSON.parse(raw);
    if(!obj||!obj.countries||!obj.player) throw new Error("bad save");
    S=obj;$("#boot-screen").classList.add("hidden");$("#setup").classList.add("hidden");$("#game").classList.remove("hidden");populateExamples();render();toast("Campaign loaded");
  }catch(e){toast("Save could not be loaded");}
}

function wire(){
  $("#boot-button").onclick=()=>{$("#boot-screen").classList.add("hidden");$("#setup").classList.remove("hidden");};
  $("#mode-choices").onclick=e=>{const b=e.target.closest(".choice");if(b)selectChoice($("#mode-choices"),b);};
  $("#difficulty-choices").onclick=e=>{const b=e.target.closest(".choice");if(b)selectChoice($("#difficulty-choices"),b);};
  $("#country-select").onchange=updatePreview;
  $("#start-game").onclick=begin;
  $("#submit-order").onclick=()=>{
    const raw=$("#command-input").value;const days=Number($("#advance-select").value)||7;
    const result=resolveOrder(raw);advance(days,result.summary);$("#command-input").value="";
  };
  $("#command-input").addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter")$("#submit-order").click();});
  $("#save-btn").onclick=save;$("#load-btn").onclick=load;$("#new-btn").onclick=()=>{if(confirm("Start a new campaign? Your current state remains only if saved.")){location.reload();}};
  $$(".tab").forEach(t=>t.onclick=()=>{$$(".tab").forEach(x=>x.classList.remove("active"));$$(".tabpane").forEach(x=>x.classList.remove("active"));t.classList.add("active");$("#"+t.dataset.tab+"-tab").classList.add("active");});
  $("#zoom-in").onclick=()=>{S.mapZoom=clamp(S.mapZoom+.12,.7,2);renderMap();};
  $("#zoom-out").onclick=()=>{S.mapZoom=clamp(S.mapZoom-.12,.7,2);renderMap();};
  $("#reset-map").onclick=()=>{S.mapZoom=1;S.mapX=0;S.mapY=0;renderMap();};
}

setupCountries();wire();
window.HISTORIA={getState:()=>structuredClone(S),start:begin,resolveOrder};
})();
