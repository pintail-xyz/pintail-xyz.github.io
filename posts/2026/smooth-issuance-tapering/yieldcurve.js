(function () {
  function init() {
  var TOTAL_ETH_SUPPLY   = 120500000;
  var BASE_REWARD_FACTOR = 64;
  var EPOCHS_PER_YEAR    = (365.25 * 24 * 3600) / (32 * 12);
  var F_TODAY = 1 / 3;
  var F_SAT   = 0.5;
  var N_POINTS = 500;

  function clApr(f) {
    return BASE_REWARD_FACTOR * EPOCHS_PER_YEAR / Math.sqrt(f * TOTAL_ETH_SUPPLY * 1e9);
  }

  var aprAtSat  = clApr(F_SAT);
  var u0        = F_TODAY / F_SAT;              // 2/3
  var sqrtRatio = Math.sqrt(F_TODAY / F_SAT);   // √(2/3)

  var K_linear = 1 / (1 - u0                       * sqrtRatio);   // 9 / (9 − 2√6)
  var K_smooth = 1 / (1 - (3*u0*u0 - 2*u0*u0*u0)  * sqrtRatio);   // 81 / (81 − 20√6)
  var K_quad   = 1 / (1 - (2*u0 - u0*u0)           * sqrtRatio);   // 27 / (27 − 8√6)

  function clAprLinear(f) {
    if (f >= F_SAT) return 0;
    var u = f / F_SAT;
    return K_linear * (clApr(f) - u * aprAtSat);
  }

  function clAprSmooth(f) {
    if (f >= F_SAT) return 0;
    var u = f / F_SAT;
    return K_smooth * (clApr(f) - (3*u*u - 2*u*u*u) * aprAtSat);
  }

  function clAprQuad(f) {
    if (f >= F_SAT) return 0;
    var u = f / F_SAT;
    return K_quad * (clApr(f) - (2*u - u*u) * aprAtSat);
  }

  var fs = [], yCurrent = [], yLinear = [], ySmooth = [], yQuad = [];
  var step = 0.995 / (N_POINTS - 1);
  for (var i = 0; i < N_POINTS; i++) {
    var f = 0.005 + i * step;
    fs.push(+(f * 100).toFixed(3));
    yCurrent.push(+(clApr(f) * 100).toFixed(4));
    yLinear.push(+(clAprLinear(f) * 100).toFixed(4));
    ySmooth.push(+(clAprSmooth(f) * 100).toFixed(4));
    yQuad.push(+(clAprQuad(f) * 100).toFixed(4));
  }

  var layout = {
    xaxis: {
      title: { text: 'Staking ratio', font: { size: 12 } },
      range: [0, 100], fixedrange: true,
      tickvals: [0,10,20,30,40,50,60,70,80,90,100],
      ticktext: ['0%','10%','20%','30%','40%','50%','60%','70%','80%','90%','100%'],
      gridcolor: '#eeeeee', showgrid: true,
    },
    yaxis: {
      title: { text: 'CL nominal yield', font: { size: 12 } },
      ticksuffix: '%',
      zeroline: true, zerolinewidth: 1.5, zerolinecolor: '#555',
      gridcolor: '#eeeeee', showgrid: true,
      range: [0, 10], fixedrange: true,
    },
    shapes: [
      { type:'line', x0:F_TODAY*100, x1:F_TODAY*100, yref:'paper', y0:0, y1:1,
        line:{ color:'#bbb', width:1.5, dash:'dot' } },
      { type:'line', x0:F_SAT*100, x1:F_SAT*100, yref:'paper', y0:0, y1:1,
        line:{ color:'#e57373', width:1.5, dash:'dot' } },
    ],
    annotations: [
      { x:F_TODAY*100, xanchor:'left', xshift:5, yref:'paper', y:1, yanchor:'top', textangle:-90,
        text:'Calibration point (~33%)', showarrow:false, font:{ size:11, color:'#aaa' } },
      { x:F_SAT*100, xanchor:'left', xshift:5, yref:'paper', y:1, yanchor:'top', textangle:-90,
        text:'Saturation (50%)', showarrow:false, font:{ size:11, color:'#e57373' } },
    ],
    showlegend: true,
    legend: { x:0.62, y:0.98, bgcolor:'rgba(255,255,255,0.8)' },
    dragmode: false,
    title: { text:'CL yield: all curves calibrated to match current at 33%', font:{ size:14 }, x:0.5, xanchor:'center' },
    margin: { t:40, r:12, b:56, l:68 },
    hovermode: 'x unified', hoverdistance: -1,
    plot_bgcolor: '#fafafa', paper_bgcolor: '#ffffff',
  };

  var traces = [
    { x:fs, y:yCurrent, name:'Current', type:'scatter', mode:'lines',
      line:{ color:'#1565c0', width:2.5 }, hovertemplate:'Current: %{y:.2f}%<extra></extra>' },
    { x:fs, y:yLinear, name:'Linear (B ≈ 140)', type:'scatter', mode:'lines',
      line:{ color:'#2e7d32', width:2, dash:'dash' }, hovertemplate:'Linear: %{y:.2f}%<extra></extra>' },
    { x:fs, y:ySmooth, name:'Smoothstep (B ≈ 162)', type:'scatter', mode:'lines',
      line:{ color:'#00838f', width:2.5 }, hovertemplate:'Smoothstep: %{y:.2f}%<extra></extra>' },
    { x:fs, y:yQuad, name:'Quadratic (B ≈ 233)', type:'scatter', mode:'lines',
      line:{ color:'#b5420f', width:2.5 }, hovertemplate:'Quadratic: %{y:.2f}%<extra></extra>' },
  ];

  function attachTouchHover(el) {
    function hoverAt(touch) {
      var rect = el.getBoundingClientRect();
      Plotly.Fx.hover(el, { xpx: touch.clientX - rect.left, ypx: touch.clientY - rect.top });
    }
    el.addEventListener('touchstart', function(e){ if(e.touches.length===1) hoverAt(e.touches[0]); }, { passive: true });
    el.addEventListener('touchmove',  function(e){ if(e.touches.length===1){ e.preventDefault(); hoverAt(e.touches[0]); } }, { passive: false });
    el.addEventListener('touchend',   function(){ Plotly.Fx.unhover(el); }, { passive: true });
  }

  var el = document.getElementById('poly-yieldcurve-chart');
  Plotly.newPlot(el, traces, layout, { responsive:true, displayModeBar:false, scrollZoom:false });
  attachTouchHover(el);
  }

  if (typeof Plotly !== 'undefined') { init(); }
  else { var s=document.createElement('script'); s.src='https://cdn.plot.ly/plotly-2.27.0.min.js'; s.onload=init; document.head.appendChild(s); }
}());
