(function () {
  function init() {
  var TOTAL_ETH_SUPPLY   = 120500000;
  var BASE_REWARD_FACTOR = 64;
  var EPOCHS_PER_YEAR    = (365.25 * 24 * 3600) / (32 * 12);

  var F_TODAY = 1 / 3;
  var F_SAT   = 0.5;

  var N_POINTS = 500;
  var F_MIN    = 0.005;
  var F_MAX    = 0.50;

  function clApr(f) {
    return BASE_REWARD_FACTOR * EPOCHS_PER_YEAR / Math.sqrt(f * TOTAL_ETH_SUPPLY * 1e9);
  }

  var R_SAT = clApr(F_SAT);

  // Calibrate K_A so net yield at F_TODAY equals the current (B=64) yield.
  // r_A(f) = K_A * (r_64(f) - u*r_sat); at f = F_TODAY this must equal r_64(F_TODAY).
  // K_A = r_64(F_TODAY) / (r_64(F_TODAY) - u0*r_sat)  where u0 = F_TODAY/F_SAT
  var U_TODAY = F_TODAY / F_SAT;
  var K_A = clApr(F_TODAY) / (clApr(F_TODAY) - U_TODAY * R_SAT);

  // K_B = 3 (= 192/64): calibrated so that K_B*(1-u0)*r_64(F_TODAY) = r_64(F_TODAY)
  var K_B = 1 / (1 - U_TODAY);  // = 3

  // Approach A: unchanged base reward (B*64 = K_A*64 ≈ 140) + linear offset
  // r_A(f) = K_A * max(0, r_64(f) - u*r_sat)
  // Simplifies to: K_A * r_64(f) * max(0, 1 - u^(3/2))
  function aprA(f) {
    if (f >= F_SAT) return 0;
    return Math.max(0, K_A * (clApr(f) - (f / F_SAT) * R_SAT));
  }

  // Approach B: base reward linearly blended to r_sat at saturation + linear offset
  // Gross: (1-u)*K_B*r_64(f) + u*r_sat; offset: u*r_sat; net: (1-u)*K_B*r_64(f)
  function aprB(f) {
    if (f >= F_SAT) return 0;
    var u = f / F_SAT;
    return K_B * (1 - u) * clApr(f);
  }

  var fs = [], yCurrent = [], yA = [], yB = [];
  var step = (F_MAX - F_MIN) / (N_POINTS - 1);
  for (var i = 0; i < N_POINTS; i++) {
    var f = F_MIN + i * step;
    fs.push(+(f * 100).toFixed(3));
    yCurrent.push(+(clApr(f) * 100).toFixed(4));
    yA.push(+(aprA(f) * 100).toFixed(4));
    yB.push(+(aprB(f) * 100).toFixed(4));
  }

  var layout = {
    xaxis: {
      title: { text: 'Staking ratio', font: { size: 12 } },
      range: [0, 50], fixedrange: true,
      tickvals: [0, 10, 20, 30, 40, 50],
      ticktext: ['0%', '10%', '20%', '30%', '40%', '50%'],
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
      { type: 'line', x0: F_TODAY * 100, x1: F_TODAY * 100,
        yref: 'paper', y0: 0, y1: 1,
        line: { color: '#bbb', width: 1.5, dash: 'dot' } },
      { type: 'line', x0: F_SAT * 100, x1: F_SAT * 100,
        yref: 'paper', y0: 0, y1: 1,
        line: { color: '#e57373', width: 1.5, dash: 'dot' } },
    ],
    annotations: [
      { x: F_TODAY * 100, xanchor: 'left', xshift: 5,
        yref: 'paper', y: 1, yanchor: 'top', textangle: -90,
        text: 'Today (~33%) — calibration point', showarrow: false,
        font: { size: 11, color: '#aaa' } },
      { x: F_SAT * 100, xanchor: 'left', xshift: 5,
        yref: 'paper', y: 1, yanchor: 'top', textangle: -90,
        text: 'Saturation (50%)', showarrow: false,
        font: { size: 11, color: '#e57373' } },
    ],
    showlegend: true,
    legend: { x: 0.55, y: 0.98, bgcolor: 'rgba(255,255,255,0.8)' },
    dragmode: false,
    title: { text: 'CL yield: current vs. two tapering proposals', font: { size: 14 }, x: 0.5, xanchor: 'center' },
    margin: { t: 40, r: 12, b: 56, l: 68 },
    hovermode: 'x unified', hoverdistance: -1,
    plot_bgcolor: '#fafafa', paper_bgcolor: '#ffffff',
  };

  var traces = [
    { x: fs, y: yCurrent,
      name: 'Current (B = 64)', type: 'scatter', mode: 'lines',
      line: { color: '#1565c0', width: 2.5 },
      hovertemplate: 'Current: %{y:.2f}%<extra></extra>' },
    { x: fs, y: yA,
      name: 'A: offset only (B ≈ 140)', type: 'scatter', mode: 'lines',
      line: { color: '#6a1b9a', width: 2.5 },
      hovertemplate: 'Offset only: %{y:.2f}%<extra></extra>' },
    { x: fs, y: yB,
      name: 'B: blend + offset (B = 192)', type: 'scatter', mode: 'lines',
      line: { color: '#00838f', width: 2.5 },
      hovertemplate: 'Blend + offset: %{y:.2f}%<extra></extra>' },
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

  var el = document.getElementById('comparison-yieldcurve-chart');
  Plotly.newPlot(el, traces, layout, { responsive: true, displayModeBar: false, scrollZoom: false });
  attachTouchHover(el);
  }

  if (typeof Plotly !== 'undefined') { init(); }
  else { var s = document.createElement('script'); s.src = 'https://cdn.plot.ly/plotly-2.27.0.min.js'; s.onload = init; document.head.appendChild(s); }
}());
