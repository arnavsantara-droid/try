
global.window=global;
const store={};
global.localStorage={setItem:(k,v)=>store[k]=String(v),getItem:k=>store[k]||null};
global.Blob=function(){};global.document={createElement:()=>({click(){}})};global.URL={createObjectURL:()=>"",revokeObjectURL:()=>{}};
require("../data.js");require("../engine.js");require("../ai.js");
const H=Historia;
function assert(x,m){if(!x)throw new Error(m)}

H.startCampaign("DEU","historical","normal");
let x=H.interpretOrders("Cut army budget but increase air force spending.","DEU");
assert(x.length===2&&x[0].type==="military_budget_cut"&&x[1].type==="air_build","compound budget/air parse");
x=H.interpretOrders("Raise taxes on wealthy citizens and use the money for rearmament.","DEU");
assert(x.length===2&&x[0].type==="tax_raise"&&x[1].type==="army_build","compound tax/rearm parse");
x=H.interpret("Move two divisions into the Rhineland.","DEU");
assert(x.type==="deploy"&&x.quantity===30&&x.region==="DEU_RHINE","division deployment parse");
x=H.interpret("Publicly insult Britain.","DEU");
assert(x.type==="insult"&&x.target==="GBR","insult parse");
x=H.interpret("Reduce police spending.","DEU");
assert(x.type==="police_cut","police cut parse");
x=H.interpret("Cut military salaries by 5%.","DEU");
assert(x.type==="military_pay_cut","military pay parse");
x=H.interpret("Remove tariffs on Romanian oil.","DEU");
assert(x.type==="trade"&&x.target==="ROU","tariff/trade parse");
x=H.interpret("Tell France we will respect Belgium's neutrality.","DEU");
assert(x.type==="assurance"&&x.target==="FRA","assurance recipient parse");
H.resolveOrder(x);
const trustBefore=H.trust("DEU","FRA");
H.resolveOrder(H.interpret("Invade Belgium.","DEU"));
assert(H.state.events.some(e=>e.title==="ASSURANCE VIOLATED"),"promise violation not detected");
assert(H.trust("DEU","FRA")<trustBefore,"promise violation did not damage trust");

H.startCampaign("GBR","historical","hard");
H.queueOrder("Tell Poland we will defend them, but secretly tell Germany we will remain neutral.");
assert(H.state.queue.length===2,"compound contradictory diplomacy not queued");
H.advanceGame(365);
assert(JSON.stringify(H.state).length>1000,"state serialization failed");
assert(H.state.events.length>10,"world did not act");
assert(H.state.memories.filter(m=>m.type==="plan").length>5,"AI planners did not act");

// Long-run stability: five simulated years from a fresh open-sandbox campaign.
H.startCampaign("FRA","open","normal");
for(let i=0;i<20;i++){ if(H.state.pendingJump>0)H.continueJump(); else H.advanceGame(90); }
assert(JSON.stringify(H.state).length>1000,"long-run state serialization failed");
console.log(JSON.stringify({
  semantic:"PASS",
  compoundOrders:"PASS",
  promiseMemory:"PASS",
  aiPlanning:"PASS",
  fiveYearDate:H.state.date,
  fiveYearEvents:H.state.events.length,
  fiveYearWars:H.state.wars.length,
  activeWars:H.state.wars.filter(w=>w.active).length,
  memories:H.state.memories.length
},null,2));
