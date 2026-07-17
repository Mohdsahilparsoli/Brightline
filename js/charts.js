/* ==========================================================================
   CHARTS.JS — tiny dependency-free canvas chart renderers
   ========================================================================== */

function getCssVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function drawBarChart(canvas, labels, values, color){
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w*dpr; canvas.height = h*dpr;
  ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,w,h);

  const pad = { l:38, r:10, t:14, b:26 };
  const chartW = w - pad.l - pad.r;
  const chartH = h - pad.t - pad.b;
  const max = Math.max(...values) * 1.2 || 1;
  const barColor = color || getCssVar('--primary');
  const gridColor = getCssVar('--border');
  const textColor = getCssVar('--text-faint');

  ctx.strokeStyle = gridColor; ctx.lineWidth = 1; ctx.font = '11px Inter, sans-serif'; ctx.fillStyle = textColor;
  for(let i=0;i<=4;i++){
    const y = pad.t + chartH - (i/4)*chartH;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w-pad.r, y); ctx.stroke();
    ctx.fillText(Math.round((i/4)*max/1000) + 'k', 2, y+3);
  }

  const slot = chartW/values.length;
  const barW = Math.min(28, slot*0.5);
  values.forEach((v,i)=>{
    const x = pad.l + i*slot + slot/2 - barW/2;
    const bh = (v/max)*chartH;
    const y = pad.t + chartH - bh;
    const grad = ctx.createLinearGradient(0,y,0,pad.t+chartH);
    grad.addColorStop(0, barColor);
    grad.addColorStop(1, barColor + '55');
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, barW, bh, 6);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x+barW/2, h-8);
    ctx.textAlign = 'left';
  });
}

function drawLineChart(canvas, labels, values, color){
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w*dpr; canvas.height = h*dpr;
  ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,w,h);

  const pad = { l:34, r:10, t:14, b:26 };
  const chartW = w - pad.l - pad.r;
  const chartH = h - pad.t - pad.b;
  const max = 100, min = 0;
  const lineColor = color || getCssVar('--teacher-accent');
  const gridColor = getCssVar('--border');
  const textColor = getCssVar('--text-faint');

  ctx.strokeStyle = gridColor; ctx.lineWidth = 1; ctx.font = '11px Inter, sans-serif'; ctx.fillStyle = textColor;
  for(let i=0;i<=4;i++){
    const y = pad.t + chartH - (i/4)*chartH;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w-pad.r, y); ctx.stroke();
    ctx.fillText((i/4)*max + '%', 2, y+3);
  }

  const slot = chartW/(values.length-1 || 1);
  const pts = values.map((v,i)=>({ x: pad.l + i*slot, y: pad.t + chartH - ((v-min)/(max-min))*chartH }));

  // Area fill
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pad.t+chartH);
  pts.forEach(p=> ctx.lineTo(p.x,p.y));
  ctx.lineTo(pts[pts.length-1].x, pad.t+chartH);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0,pad.t,0,pad.t+chartH);
  grad.addColorStop(0, lineColor + '33');
  grad.addColorStop(1, lineColor + '02');
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  pts.forEach((p,i)=> i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
  ctx.strokeStyle = lineColor; ctx.lineWidth = 2.4; ctx.lineJoin='round'; ctx.stroke();

  // Points
  pts.forEach((p,i)=>{
    ctx.beginPath(); ctx.arc(p.x,p.y,3.4,0,Math.PI*2);
    ctx.fillStyle = getCssVar('--card'); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = lineColor; ctx.stroke();
    ctx.fillStyle = textColor; ctx.textAlign='center';
    ctx.fillText(labels[i], p.x, h-8);
    ctx.textAlign='left';
  });
}

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}
