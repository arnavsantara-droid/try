
global.window=global;
const store={};
global.localStorage={
  setItem:(k,v)=>store[k]=String(v),
  getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null
};
global.Blob=function(){};
global.document={createElement:()=>({click(){}})};
global.URL={createObjectURL:()=>"",revokeObjectURL:()=>{}};
require("../data.js"); require("../engine.js"); require("../ai.js");
const H=global.Historia;
H.startCampaign("DEU","historical","hard");
const before={army:H.C("DEU").army, manpower:H.C("DEU").manpower, industry:H.C("DEU").industry};
const p=H.interpret("Mobilise 500,000 reservists over 12 months, exempt skilled factory workers, and avoid major public unrest.","DEU");
if(p.type!=="mobilize"||p.quantity!==500||p.duration!==360) throw new Error("mobilisation parser failed "+JSON.stringify(p));
H.queueOrder("Mobilise 500,000 reservists over 12 months, exempt skilled factory workers, and avoid major public unrest.");
H.queueOrder("Move troops toward Poland but do not attack; retreat if Poland responds militarily.");
H.advanceGame(30);
if(H.C("DEU").army<=before.army) throw new Error("mobilisation did not progress");
if(!H.state.deployments.length && !H.state.events.some(e=>e.title==="CONDITIONAL WITHDRAWAL")) throw new Error("deployment neither persisted nor executed conditional fallback");
const dip=H.interpret("Offer the Soviet Union a non-aggression pact.","DEU");
H.resolveOrder(dip);
if(!H.state.events.length) throw new Error("diplomacy produced no event");
const spy=H.interpret("Secretly build an intelligence network in Austria.","DEU");
H.resolveOrder(spy);
if(!H.state.operations.some(o=>o.actor==="DEU"&&o.target==="AUT")) throw new Error("covert operation missing");
H.advanceGame(180);
const inv=H.interpret("Invade Poland.","DEU");
H.resolveOrder(inv);
if(!H.findWar("DEU","POL")) throw new Error("war did not start");
H.tick(60,{runAI:false});
const result={
 date:H.state.date,
 events:H.state.events.length,
 policies:H.state.policies.length,
 operations:H.state.operations.length,
 treaties:H.state.treaties.length,
 wars:H.state.wars.length,
 army:Math.round(H.C("DEU").army),
 manpower:Math.round(H.C("DEU").manpower),
 worldTension:Math.round(H.state.worldTension),
 aiMemories:H.state.memories.filter(m=>m.type==="plan").length
};
console.log(JSON.stringify(result,null,2));
