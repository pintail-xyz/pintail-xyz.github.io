(function () {
  function init() {
  var TOTAL_ETH_SUPPLY   = 120500000;
  var BASE_REWARD_FACTOR = 64;
  var EPOCHS_PER_YEAR    = (365.25 * 24 * 3600) / (32 * 12);
  var F_TODAY = 1 / 3;
  var F_SAT   = 0.5;
  var N_POINTS = 500;
  var F_MIN    = 0.0;
  var F_MAX    = 0.50;

  function clApr(f) {
    if (f <= 0) return 0;
    return BASE_REWARD_FACTOR * EPOCHS_PER_YEAR / Math.sqrt(f * TOTAL_ETH_SUPPLY * 1e9);
  }

  var R_STAR = clApr(F_SAT);  // r_sat: current formula evaluated at saturation

  function blendedApr(f) {
    if (f <= 0) return 0;
    var u = f / F_SAT;
    var w = (1 - u) * (1 - u);
    return w * clApr(f) + (1 - w) * R_STAR;
  }

  var fs = [], yCurrent = [], yBlended = [];
  var step = (F_MAX - F_MIN) / (N_POINTS - 1);
  for (var i = 0; i < N_POINTS; i++) {
    var f = F_MIN + i * step;
    fs.push(+(f * 100).toFixed(3));
    yCurrent.push(+(clApr(f) * f * 100).toFixed(4));
    yBlended.push(+(blendedApr(f) * f * 100).toFixed(4));
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
      title: { text: 'Annual issuance (% of ETH supply)', font: { size: 12 } },
      ticksuffix: '%',
      zeroline: true, zerolinewidth: 1.5, zerolinecolor: '#555',
      gridcolor: '#eeeeee', showgrid: true,
      range: [0, 1.2], fixedrange: true,
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
        text: 'Today (~33%)', showarrow: false,
        font: { size: 11, color: '#aaa' } },
      { x: F_SAT * 100, xanchor: 'left', xshift: 5,
        yref: 'paper', y: 1, yanchor: 'top', textangle: -90,
        text: 'Saturation (50%)', showarrow: false,
        font: { size: 11, color: '#e57373' } },
    ],
    showlegend: true,
    legend: { x: 0.05, y: 0.98, bgcolor: 'rgba(255,255,255,0.8)' },
    dragmode: false,
    title: { text: 'Annual issuance: current vs. quadratic-blended curve', font: { size: 14 }, x: 0.5, xanchor: 'center' },
    margin: { t: 40, r: 12, b: 56, l: 72 },
    hovermode: 'x unified', hoverdistance: -1,
    plot_bgcolor: '#fafafa', paper_bgcolor: '#ffffff',
  };

  var traces = [
    { x: fs, y: yCurrent,
      name: 'Current (∝ 1/√f)', type: 'scatter', mode: 'lines',
      line: { color: '#1565c0', width: 2.5 },
      hovertemplate: 'Current: %{y:.3f}%<extra></extra>' },
    { x: fs, y: yBlended,
      name: 'Blended (quadratic)', type: 'scatter', mode: 'lines',
      line: { color: '#00838f', width: 2.5 },
      hovertemplate: 'Blended: %{y:.3f}%<extra></extra>' },
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

  var el = document.getElementById('blended-issuancecurve-chart');
  Plotly.newPlot(el, traces, layout, { responsive: true, displayModeBar: false, scrollZoom: false });
  attachTouchHover(el);
  }

  if (typeof Plotly !== 'undefined') { init(); }
  else { var s = document.createElement('script'); s.src = 'https://cdn.plot.ly/plotly-2.27.0.min.js'; s.onload = init; document.head.appendChild(s); }
}());
