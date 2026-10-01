'use strict';
const canvas = document.getElementById('chart'); let sample;
function draw() {
  if (!sample) return;
  const width = canvas.clientWidth, height = canvas.clientHeight, scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(width*scale); canvas.height = Math.round(height*scale);
  const ctx = canvas.getContext('2d'); ctx.scale(scale,scale);
  const left=44, right=12, top=14, bottom=24, plotWidth=width-left-right, plotHeight=height-top-bottom;
  const all=[...sample.raw,...sample.filtered], min=Math.min(...all)-0.1, max=Math.max(...all)+0.1;
  const y = v=>top+(max-v)*plotHeight/(max-min), x = i=>left+i*plotWidth/(sample.raw.length-1);
  ctx.strokeStyle='#e2ebe5'; ctx.lineWidth=1; ctx.font='10px Arial'; ctx.fillStyle='#6a8079';
  for(let sec=0;sec<=10;sec++){const px=left+sec/10*plotWidth;ctx.beginPath();ctx.moveTo(px,top);ctx.lineTo(px,height-bottom);ctx.stroke();ctx.fillText(sec.toString(),px-3,height-5);}
  for(let v=Math.ceil(min*2)/2;v<=max;v+=0.5){ctx.beginPath();ctx.moveTo(left,y(v));ctx.lineTo(width-right,y(v));ctx.stroke();ctx.fillText(v.toFixed(1),2,y(v)+3);}
  function line(values,color){ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=1.4;values.forEach((v,i)=>{if(i)ctx.lineTo(x(i),y(v));else ctx.moveTo(x(i),y(v));});ctx.stroke();}
  if(document.getElementById('raw').checked)line(sample.raw,'#adbbb4');
  if(document.getElementById('filtered').checked)line(sample.filtered,'#16866a');
  if(document.getElementById('peaks').checked){ctx.fillStyle='#d57850';sample.peaks.forEach(i=>{ctx.beginPath();ctx.arc(x(i),y(sample.filtered[i]),3,0,Math.PI*2);ctx.fill();});}
}
fetch('sample.json').then(response=>{if(!response.ok)throw new Error('Sample could not be loaded');return response.json();}).then(data=>{
  sample=data;const s=data.summary,m=s.annotation_evaluation;
  document.getElementById('bpm').textContent=s.median_rr_bpm.toFixed(1);
  document.getElementById('beats').textContent=s.detected_beats;
  document.getElementById('fs').textContent=s.sample_rate_hz;
  document.getElementById('matches').textContent=`${m.true_positives}/${m.reference_beats}`;
  document.getElementById('status').textContent='Grey: raw ECG · Green: filtered ECG · Orange: detected R peaks. Matching on this single sample is not a general accuracy claim.';
  draw();
}).catch(error=>{document.getElementById('status').textContent=error.message+'. Start the demo with: python -m http.server 8000 --directory demo';});
for(const input of document.querySelectorAll('input'))input.addEventListener('change',draw);
window.addEventListener('resize',draw);
