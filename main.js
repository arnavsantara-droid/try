window.Historia = window.Historia || {};
(function(H){
"use strict";
const $=s=>document.querySelector(s);

function setTab(tab){
  H.ui.tab=tab;
  document.querySelectorAll("#leftTabs .tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
  H.renderAll();
}
function setFilter(filter){
  H.ui.timelineFilter=filter;
  document.querySelectorAll(".filter").forEach(b=>b.classList.toggle("active",b.dataset.filter===filter));
  H.renderAll();
}
function setMapMode(mode){
  H.state.mapMode=mode;
  document.querySelectorAll("[data-mapmode]").forEach(b=>b.classList.toggle("active",b.dataset.mapmode===mode));
  H.renderAll();
}
function zoom(delta){
  H.state.mapZoom=Math.max(.75,Math.min(2.35,H.state.mapZoom+delta));
  H.renderAll();
}
function resetMap(){
  H.state.mapZoom=1;H.state.mapX=0;H.state.mapY=0;H.renderAll();
}
function start(){
  const code=H.ui.selectedStart,mode=$("#modeChoice").value,diff=$("#difficultyChoice").value;
  H.startCampaign(code,mode,diff);
  $("#startModal").style.display="none";
  H.renderAll();
  H.toast(`Campaign started as ${H.C(code).name}`);
}
function newGame(){
  if(H.state.player&&!confirm("Start a completely new timeline? Your current autosave will remain until the new campaign begins."))return;
  H.ui.selectedStart="DEU";
  $("#startModal").style.display="flex";
  H.renderStartCountries();
  $("#selectedStartText").textContent="🇩🇪 Germany selected";
  $("#startButton").textContent="START AS GERMANY";
}
function load(){
  if(!H.loadSave())return H.toast("No compatible save found");
  $("#startModal").style.display="none";H.renderAll();H.toast("Campaign loaded");
}
async function importFile(file){
  try{await H.importSave(file);$("#startModal").style.display="none";H.renderAll();H.toast("Campaign imported")}
  catch(e){alert("Unable to import save: "+e.message)}
}
function setupMapGestures(){
  const map=$("#map");let dragging=false,last=null;
  map.addEventListener("wheel",e=>{
    e.preventDefault();H.state.mapZoom=Math.max(.75,Math.min(2.35,H.state.mapZoom+(e.deltaY<0?.12:-.12)));H.renderAll();
  },{passive:false});
  map.addEventListener("mousedown",e=>{if(e.button!==0)return;dragging=true;last=[e.clientX,e.clientY];map.style.cursor="grabbing"});
  window.addEventListener("mousemove",e=>{
    if(!dragging)return;
    const dx=e.clientX-last[0],dy=e.clientY-last[1];last=[e.clientX,e.clientY];
    H.state.mapX+=dx/H.state.mapZoom;H.state.mapY+=dy/H.state.mapZoom;
    const vp=$("#mapViewport");if(vp)vp.setAttribute("transform",`translate(${H.state.mapX} ${H.state.mapY}) scale(${H.state.mapZoom})`);
  });
  window.addEventListener("mouseup",()=>{dragging=false;last=null;map.style.cursor=""});
}

function boot(){
  H.renderStartCountries();

  document.querySelectorAll("#leftTabs .tab").forEach(b=>b.addEventListener("click",()=>setTab(b.dataset.tab)));
  document.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>setFilter(b.dataset.filter)));
  document.querySelectorAll("[data-mapmode]").forEach(b=>b.addEventListener("click",()=>setMapMode(b.dataset.mapmode)));
  document.querySelectorAll(".timeButtons [data-days]").forEach(b=>b.addEventListener("click",()=>H.advanceAndRender(Number(b.dataset.days))));
  $("#advanceDefault").addEventListener("click",()=>H.advanceAndRender(30));
  $("#continueBtn").addEventListener("click",()=>H.advanceAndRender(H.state.pendingJump||30));
  $("#zoomIn").addEventListener("click",()=>zoom(.18));
  $("#zoomOut").addEventListener("click",()=>zoom(-.18));
  $("#resetMap").addEventListener("click",resetMap);
  $("#startButton").addEventListener("click",start);
  $("#continueSaveBtn").addEventListener("click",load);
  $("#importStartBtn").addEventListener("click",()=>$("#importFile").click());
  $("#rewindBtn").addEventListener("click",()=>{if(!H.rewind())return H.toast("No previous checkpoint");H.renderAll();H.toast("Timeline rewound")});
  $("#saveBtn").addEventListener("click",()=>{if(H.manualSave())H.toast("Campaign saved");else H.toast("Save failed")});
  $("#loadBtn").addEventListener("click",load);
  $("#exportBtn").addEventListener("click",()=>{if(!H.state.player)return H.toast("Start or load a campaign first");H.exportSave()});
  $("#importBtn").addEventListener("click",()=>$("#importFile").click());
  $("#importFile").addEventListener("change",e=>{if(e.target.files?.[0])importFile(e.target.files[0]);e.target.value=""});
  $("#newBtn").addEventListener("click",newGame);

  setupMapGestures();

  // Desktop keyboard conveniences.
  window.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&H.state.player&&$("#startModal").style.display!=="none")$("#startModal").style.display="none";
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();if(H.state.player){H.manualSave();H.toast("Campaign saved")}}
  });

  // Ensure a hard failure is visible rather than a blank page.
  window.addEventListener("error",e=>{
    console.error("Historia runtime error:",e.error||e.message);
    const status=$("#mapStatus");if(status)status.textContent="RUNTIME ERROR — OPEN BROWSER CONSOLE FOR DETAILS";
  });
}
document.addEventListener("DOMContentLoaded",boot);
})(window.Historia);
