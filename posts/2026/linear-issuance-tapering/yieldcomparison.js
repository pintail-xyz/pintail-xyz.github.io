(function () {
  function init() {
  // ── Ethereum protocol constants ──────────────────────────────────────────
  var TOTAL_ETH_SUPPLY   = 120500000;
  var BASE_REWARD_FACTOR = 64;
  var EPOCHS_PER_YEAR    = (365.25 * 24 * 3600) / (32 * 12); // ≈ 82,181.25

  // ── Proposal constants ───────────────────────────────────────────────────
  var F_TODAY = 1 / 3;
  var K2 = 2;
  var K3 = 3;

  var N_POINTS = 500;
  var F_MIN    = 0.005;
  var F_MAX    = 1.0;

  // ── Yield functions ──────────────────────────────────────────────────────
  function clApr(f) {
    return BASE_REWARD_FACTOR * EPOCHS_PER_YEAR / Math.sqrt(f * TOTAL_ETH_SUPPLY * 1e9);
  }

  function clAprNew(f, k) {
    if (f >= 0.5) return 0;
    return k * (1 - 2 * f) * clApr(f);
  }

  // ── Build series (dilution-adjusted yield only) ──────────────────────────
  var fs = [], yCurDil = [], yK2Dil = [], yK3Dil = [];
  var step = (F_MAX - F_MIN) / (N_POINTS - 1);
  for (var i = 0; i < N_POINTS; i++) {
    var f = F_MIN + i * step;
    fs.push(+(f * 100).toFixed(3));
    yCurDil.push(+(clApr(f) * (1 - f) * 100).toFixed(4));
    yK2Dil.push(+(clAprNew(f, K2) * (1 - f) * 100).toFixed(4));
    yK3Dil.push(+(clAprNew(f, K3) * (1 - f) * 100).toFixed(4));
  }

  // ── Layout ───────────────────────────────────────────────────────────────
  var layout = {
    xaxis: {
      title: { text: 'Staking ratio', font: { size: 12 } },
      range: [0, 100],
      fixedrange: true,
      tickvals: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      ticktext: ['0%', '10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%', '100%'],
      gridcolor: '#eeeeee',
      showgrid: true,
    },
    yaxis: {
      title: { text: 'CL dilution-adjusted yield', font: { size: 12 } },
      ticksuffix: '%',
      zeroline: true,
      zerolinewidth: 1.5,
      zerolinecolor: '#555',
      gridcolor: '#eeeeee',
      showgrid: true,
      range: [0, 10],
      fixedrange: true,
    },
    annotations: [
      {
        x: F_TODAY * 100, xanchor: 'left', xshift: 5,
        yref: 'paper', y: 0.97,
        text: 'Today (~33%)',
        showarrow: false,
        font: { size: 11, color: '#aaa' },
      },
      {
        x: 50, xanchor: 'right', xshift: -5,
        yref: 'paper', y: 0.88,
        text: 'Saturation (50%)',
        showarrow: false,
        font: { size: 11, color: '#e57373' },
      },
    ],
    showlegend: true,
    legend: { x: 0.62, y: 0.95, bgcolor: 'rgba(255,255,255,0.8)' },
    dragmode: false,
    title: { text: 'CL dilution-adjusted yield: current vs. proposed', font: { size: 14 }, x: 0.5, xanchor: 'center' },
    margin: { t: 40, r: 12, b: 56, l: 68 },
    hovermode: 'x unified',
    hoverdistance: -1,
    plot_bgcolor: '#fafafa',
    paper_bgcolor: '#ffffff',
  };

  var refY = [0, 10];
  var traces = [
    {
      x: [F_TODAY * 100, F_TODAY * 100], y: refY,
      type: 'scatter', mode: 'lines',
      line: { color: '#bbb', width: 1.5, dash: 'dot' },
      showlegend: false, hoverinfo: 'skip',
    },
    {
      x: [50, 50], y: refY,
      type: 'scatter', mode: 'lines',
      line: { color: '#e57373', width: 1.5, dash: 'dot' },
      showlegend: false, hoverinfo: 'skip',
    },
    {
      x: fs, y: yCurDil,
      name: 'Current',
      type: 'scatter', mode: 'lines',
      line: { color: '#1565c0', width: 2.5 },
      hovertemplate: 'Current: %{y:.2f}%<extra></extra>',
    },
    {
      x: fs, y: yK2Dil,
      name: 'Proposed (k = 2)',
      type: 'scatter', mode: 'lines',
      line: { color: '#6a1b9a', width: 2.5 },
      hovertemplate: 'Proposed (k=2): %{y:.2f}%<extra></extra>',
    },
    {
      x: fs, y: yK3Dil,
      name: 'Proposed (k = 3)',
      type: 'scatter', mode: 'lines',
      line: { color: '#00897b', width: 2.5 },
      hovertemplate: 'Proposed (k=3): %{y:.2f}%<extra></extra>',
    },
  ];

  // ── Touch hover support ──────────────────────────────────────────────────
  function attachTouchHover(el) {
    function hoverAt(touch) {
      var rect = el.getBoundingClientRect();
      Plotly.Fx.hover(el, { xpx: touch.clientX - rect.left, ypx: touch.clientY - rect.top });
    }
    el.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) hoverAt(e.touches[0]);
    }, { passive: true });
    el.addEventListener('touchmove', function (e) {
      if (e.touches.length === 1) { e.preventDefault(); hoverAt(e.touches[0]); }
    }, { passive: false });
    el.addEventListener('touchend', function () {
      Plotly.Fx.unhover(el);
    }, { passive: true });
  }

  // ── Render ───────────────────────────────────────────────────────────────
  var plotConfig = { responsive: true, displayModeBar: false, scrollZoom: false };
  var el = document.getElementById('yieldcomparison-chart');
  Plotly.newPlot(el, traces, layout, plotConfig);
  attachTouchHover(el);
  }

  if (typeof Plotly !== 'undefined') {
    init();
  } else {
    var s = document.createElement('script');
    s.src = 'https://cdn.plot.ly/plotly-2.27.0.min.js';
    s.onload = init;
    document.head.appendChild(s);
  }
}());
