
global.window=global;
const store={};
global.localStorage={setItem:(k,v)=>store[k]=String(v),getItem:k=>store[k]||null};
global.Blob=function(){};global.document={createElement:()=>({click(){}})};global.URL={createObjectURL:()=>"",revokeObjectURL:()=>{}};
require("../data.js");require("../engine.js");require("../ai.js");
const H=global.Historia;
function run(player,diff,days){
  H.startCampaign(player,"historical",diff);
  H.advanceGame(days);
  return {
    player,diff,date:H.state.date,wars:H.state.wars.filter(w=>w.active).length,
    totalWars:H.state.wars.length,events:H.state.events.length,policies:H.state.policies.length,
    tension:Math.round(H.state.worldTension),serializable:(()=>{try{JSON.stringify(H.state);return true}catch(e){return false}})()
  };
}
console.log(JSON.stringify([
 run("DEU","normal",365),
 run("POL","normal",365),
 run("GBR","hard",365)
],null,2));

H.startCampaign("DEU","historical","normal");
const samples=[
 "Bring every reasonably available man into the army, prioritise younger unmarried men, keep enough skilled workers in weapons factories, and try to complete mobilisation within eighteen months without causing major public unrest.",
 "Tell Britain we will withdraw from the Rhineland if France mobilises.",
 "Create a huge strategic oil reserve.",
 "Build the world's largest submarine fleet.",
 "Secretly fund political organisations in Austria.",
 "Move troops to Poland but do not fire unless fired upon."
];
console.log("PARSER");
for(const x of samples){const p=H.interpret(x,"DEU");console.log(p.type,p.target,p.quantity,p.duration,p.secrecy,p.safeguards.join(","));}
H.queueOrder(samples[0]);H.advanceGame(30);
const after=H.C("DEU").army;
if(after<=550)throw new Error("complex mobilisation failed to change state");
if(!H.rewind())throw new Error("rewind missing");
if(H.C("DEU").army!==550)throw new Error("rewind failed");
H.manualSave();
if(!H.loadSave())throw new Error("save/load failed");
console.log("REWIND_SAVE PASS");
