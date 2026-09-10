window.Historia = window.Historia || {};
(function(H){
"use strict";
const {clamp,rnd,norm}=H.util;

function militaryPower(code){
  const c=H.C(code);if(!c?.alive)return 0;
  return c.army*(.55+c.quality/100)*(.55+c.readiness/100)*(.55+c.logistics/100)*(1+c.air/220+c.navy/420);
}
function strategicValue(code){const c=H.C(code);return c?c.industry*.35+c.gdp*.25+c.fuel*.12+c.population*.08+c.technology*.20:0}
function strongestThreat(code){
  const c=H.C(code);let best=null,bestScore=-Infinity;
  for(const other of Object.keys(H.state.countries)){
    if(other===code||!H.alive(other))continue;
    const border=H.neighbors(code).includes(other)?18:0;
    const hostility=Math.max(0,-H.relation(code,other))*.38;
    const threat=H.threat(code,other)*.75;
    const power=Math.max(0,Math.log((militaryPower(other)+1)/(militaryPower(code)+1))*18);
    const score=border+hostility+threat+power;
    if(score>bestScore){bestScore=score;best=other}
  }
  return {code:best,score:bestScore};
}
function bestFriend(code){
  let best=null,score=-999;
  for(const other of Object.keys(H.state.countries)){
    if(other===code||!H.alive(other)||H.findWar(code,other))continue;
    const s=H.relation(code,other)+H.trust(code,other)*.5-H.threat(code,other)*.25;
    if(s>score){score=s;best=other}
  }
  return {code:best,score};
}
function vulnerableNeighbor(code){
  const A=H.C(code);let best=null,bestScore=-999;
  for(const n of H.neighbors(code)){
    if(!H.alive(n)||H.findWar(code,n)||H.findTreaty(code,n,"nap")||H.findTreaty(code,n,"alliance"))continue;
    const B=H.C(n);
    const ratio=militaryPower(code)/(militaryPower(n)+1);
    const hostility=-H.relation(code,n);
    const value=strategicValue(n);
    const score=Math.log(Math.max(.2,ratio))*35+hostility*.22+value*.08+A.personality.revisionism*.18-H.trust(code,n)*.15-B.warSupport*.12;
    if(score>bestScore){bestScore=score;best=n}
  }
  return {code:best,score:bestScore};
}
function allyAgainst(code,threatCode){
  if(!threatCode)return null;
  let best=null,score=-999;
  for(const other of Object.keys(H.state.countries)){
    if(other===code||other===threatCode||!H.alive(other)||H.findWar(code,other))continue;
    const anti=H.threat(other,threatCode)+Math.max(0,-H.relation(other,threatCode));
    const compat=H.relation(code,other)+H.trust(code,other)*.35;
    const s=anti*.5+compat*.45+militaryPower(other)/(militaryPower(code)+1)*8;
    if(s>score){score=s;best=other}
  }
  return best;
}
function candidate(text,score,reason){return {text,score,reason}}

function planCountry(code){
  const c=H.C(code);if(!c?.alive||code===H.state.player)return [];
  const diff=H.state.difficulty;
  const competence={forgiving:.76,normal:.88,hard:.96,ruthless:1}[diff]||.88;
  const noise={forgiving:16,normal:11,hard:7,ruthless:4}[diff]||11;
  const threat=strongestThreat(code),friend=bestFriend(code),weak=vulnerableNeighbor(code);
  const cs=[];
  const war=H.state.wars.find(w=>w.active&&(w.attackers.includes(code)||w.defenders.includes(code)));
  const monthsAtWar=war?(new Date(H.state.date)-new Date(war.start))/2629800000:0;

  if(c.treasury<10)cs.push(candidate("Raise taxes modestly",44+(10-c.treasury)*1.3,"fiscal emergency"));
  if(c.debt>c.gdp*.9)cs.push(candidate("Reduce non-essential spending and stabilize public finances",35+(c.debt/c.gdp)*12,"debt pressure"));
  if(c.food<40)cs.push(candidate("Expand agricultural support and food production",68-c.food,"food security"));
  if(c.fuel<35)cs.push(candidate("Create a strategic oil reserve",58-c.fuel*.6,"fuel vulnerability"));
  if(c.industry<55&&c.treasury>25&&!war)cs.push(candidate("Expand civilian industry over the next year",32+(55-c.industry)*.42,"industrial development"));
  if(c.technology<65&&c.treasury>15)cs.push(candidate(`Research ${c.air<c.quality?"aircraft":"industrial"} technology`,30+(65-c.technology)*.35,"technology gap"));
  if(c.readiness<58)cs.push(candidate("Expand army exercises and officer training over 6 months",42+(58-c.readiness)*.8,"readiness"));
  if(c.reserveEquipment<c.army*.55)cs.push(candidate("Expand weapons production while protecting civilian output",48+(c.army*.55-c.reserveEquipment)*.025,"equipment shortage"));
  if(c.air<50&&c.industry>35)cs.push(candidate("Expand fighter production over the next year",34+(50-c.air)*.45,"air weakness"));

  if(threat.code){
    const T=H.C(threat.code);
    if(threat.score>36){
      cs.push(candidate(`Mobilise 180,000 reservists over 6 months`,50+(threat.score-36)*.65,"external threat"));
      cs.push(candidate(`Fortify the border with ${T.name}`,47+(threat.score-36)*.55,"external threat"));
      const ally=allyAgainst(code,threat.code);
      if(ally&&H.relation(code,ally)>-15&&!H.findTreaty(code,ally,"alliance"))
        cs.push(candidate(`Seek an alliance with ${H.C(ally).name}`,37+threat.score*.42+H.relation(code,ally)*.18,"balance of power"));
    }else if(threat.score>20&&H.relation(code,threat.code)>-65){
      cs.push(candidate(`Improve relations with ${T.name}`,31+threat.score*.3+c.personality.diplomacy*.12,"reduce strategic risk"));
    }
  }

  if(friend.code&&friend.score>55&&!H.findTreaty(code,friend.code,"trade"))
    cs.push(candidate(`Negotiate a trade deal with ${H.C(friend.code).name}`,31+friend.score*.15,"commercial opportunity"));

  if(war){
    const enemies=war.attackers.includes(code)?war.defenders:war.attackers;
    const enemy=enemies[0],ratio=militaryPower(code)/(enemies.reduce((s,e)=>s+militaryPower(e),0)+1);
    cs.push(candidate("Mobilise 250,000 reservists over 6 months",66+(1-ratio)*30,"wartime manpower"));
    cs.push(candidate("Expand weapons production aggressively",61+(1-ratio)*24,"wartime production"));
    if(c.fuel<50)cs.push(candidate("Create a massive strategic oil reserve",58+(50-c.fuel),"wartime fuel"));
    if((ratio<.52&&monthsAtWar>3)||c.exhaustion>55)cs.push(candidate(`Seek peace with ${H.C(enemy).name}`,55+(1-ratio)*45+c.exhaustion*.3,"unfavourable war"));
  } else if(weak.code){
    const W=H.C(weak.code);
    const permission=c.personality.aggression*.42+c.personality.revisionism*.30+c.warSupport*.28-c.personality.caution*.25;
    const tensionFactor=H.state.worldTension*.10;
    const historicalBrake=(H.state.mode==="historical"&&H.state.date<"1938-01-01")?18:0;
    const invasionCase=weak.score+permission+tensionFactor-historicalBrake;
    if(invasionCase>128 && c.warSupport>52 && c.readiness>52){
      cs.push(candidate(`Invade ${W.name}`,invasionCase-46,"revisionist opportunity"));
    } else if(weak.score+permission-historicalBrake*.45>95&&H.relation(code,weak.code)<-15){
      cs.push(candidate(`Demand concessions from ${W.name}`,42+weak.score*.28+c.personality.revisionism*.13,"coercive opportunity"));
    }
  }

  // National-character nudges are incentives, not scripts.
  if(code==="DEU"&&H.alive("AUT")&&!H.state.defeated["AUT"]&&H.state.date>="1937-06-01"&&!war){
    cs.push(candidate("Demand Austrian political union",48+c.personality.revisionism*.32+H.relation(code,"AUT")*.12,"German revisionism"));
  }
  if(code==="JPN"&&H.alive("CHN")&&H.state.date>="1937-01-01"&&!war){
    cs.push(candidate("Increase military pressure on China",43+c.personality.aggression*.34-H.C("CHN").quality*.08,"East Asian expansion"));
  }
  if(code==="GBR"&&threat.code&&["DEU","RUS","ITA"].includes(threat.code)&&H.state.worldTension>28){
    const target=H.neighbors(threat.code).filter(x=>H.alive(x)&&H.C(x).personality.caution>55).sort((a,b)=>H.threat(b,threat.code)-H.threat(a,threat.code))[0];
    if(target&&!H.findTreaty("GBR",target,"guarantee"))cs.push(candidate(`Guarantee ${H.C(target).name}`,42+H.state.worldTension*.35,"balance of power"));
  }

  return cs.map(x=>({...x,score:x.score*competence+rnd(-noise,noise)})).sort((a,b)=>b.score-a.score);
}

function shouldAct(code,plan){
  if(!plan.length)return false;
  const threshold={forgiving:49,normal:46,hard:43,ruthless:40}[H.state.difficulty]||46;
  return plan[0].score>threshold;
}

H.aiTick=function(days){
  H.state.aiClock=(H.state.aiClock||0)+days;
  if(H.state.aiClock<21)return;
  H.state.aiClock-=21;
  const codes=Object.keys(H.state.countries).filter(c=>c!==H.state.player&&H.alive(c));
  const batch=Math.min(codes.length,{forgiving:4,normal:5,hard:6,ruthless:7}[H.state.difficulty]||5);
  H.state.aiCursor=(H.state.aiCursor||0)%Math.max(1,codes.length);
  for(let i=0;i<batch;i++){
    const code=codes[(H.state.aiCursor+i)%codes.length];
    const plan=planCountry(code);
    if(!shouldAct(code,plan))continue;
    const policyMap={mobilize:"mobilize",fortify:"fortify",train:"train",army_build:"production",air_build:"production",navy_build:"production",industry:"industry",infrastructure:"infrastructure",stockpile:"stockpile",agriculture:"agriculture",propaganda:"propaganda",research:"research"};
    let chosen=null,order=null;
    for(const cand of plan.slice(0,5)){
      const test=H.interpret(cand.text,code);
      const ptype=policyMap[test.type];
      const duplicate=ptype&&H.state.policies.some(p=>p.active&&p.actor===code&&p.type===ptype&&(ptype!=="production"||p.subject===test.subject));
      const duplicateTreaty=test.target&&["nap","alliance","guarantee","access"].includes(test.type)&&H.findTreaty(code,test.target,test.type);
      if(!duplicate&&!duplicateTreaty){chosen=cand;order=test;break}
    }
    if(!chosen||!order)continue;
    order.aiReason=chosen.reason;
    H.resolveOrder(order,"ai");
    H.remember(code,code,"plan",`${chosen.text} — ${chosen.reason}`,1);
  }
  H.state.aiCursor=(H.state.aiCursor+batch)%Math.max(1,codes.length);

  // Governments learn from visible world behaviour.
  for(const observer of codes){
    const c=H.C(observer);if(!c)continue;
    for(const actor of H.neighbors(observer)){
      const visibleDeploy=H.state.deployments.some(d=>d.active&&d.actor===actor&&d.target===observer);
      if(visibleDeploy)H.addKnowledge(observer,actor,.8);
    }
    if(H.atWar(observer))c.warSupport=clamp(c.warSupport+.15*days/7);
  }
};

H.aiPlanPreview=function(code){return planCountry(code).slice(0,5)};

})(window.Historia);
