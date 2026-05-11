(function () {
  function init() {
  // ── Ethereum protocol constants ──────────────────────────────────────────
  var TOTAL_ETH_SUPPLY   = 120500000;
  var BASE_REWARD_FACTOR = 64;
  var EPOCHS_PER_YEAR    = (365.25 * 24 * 3600) / (32 * 12); // ≈ 82,181.25

  // ── Proposal constants ───────────────────────────────────────────────────
  var F0 = 1 / 3;
  var K  = 1 / (1 - 2 * F0); // = 3
  var FSTAR = 1 / 6;          // peak of proposed issuance

  var N_POINTS = 500;
  var F_MIN    = 0.0;
  var F_MAX    = 1.0;

  // ── Issuance functions (% of total ETH supply / year) ───────────────────
  function annualInflationPct(f) {
    if (f <= 0) return 0;
    return BASE_REWARD_FACTOR * EPOCHS_PER_YEAR * Math.sqrt(f / (TOTAL_ETH_SUPPLY * 1e9)) * 100;
  }

  function annualInflationPctNew(f) {
    if (f >= 0.5) return 0;
    return K * (1 - 2 * f) * annualInflationPct(f);
  }

  // ── Build series ─────────────────────────────────────────────────────────
  var fs = [], yCurrent = [], yProposed = [];
  var step = (F_MAX - F_MIN) / (N_POINTS - 1);
  for (var i = 0; i < N_POINTS; i++) {
    var f = F_MIN + i * step;
    fs.push(+(f * 100).toFixed(3));
    yCurrent.push(+annualInflationPct(f).toFixed(4));
    yProposed.push(+annualInflationPctNew(f).toFixed(4));
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
      title: { text: 'Annual issuance (% of ETH supply)', font: { size: 12 } },
      ticksuffix: '%',
      zeroline: true,
      zerolinewidth: 1.5,
      zerolinecolor: '#555',
      gridcolor: '#eeeeee',
      showgrid: true,
      range: [0, 2.0],
      fixedrange: true,
    },
    shapes: [
      {
        type: 'line',
        x0: F0 * 100, x1: F0 * 100,
        yref: 'paper', y0: 0, y1: 1,
        line: { color: '#bbb', width: 1.5, dash: 'dot' },
      },
      {
        type: 'line',
        x0: 50, x1: 50,
        yref: 'paper', y0: 0, y1: 1,
        line: { color: '#e57373', width: 1.5, dash: 'dot' },
      },
      {
        type: 'line',
        x0: FSTAR * 100, x1: FSTAR * 100,
        yref: 'paper', y0: 0, y1: 1,
        line: { color: '#00897b', width: 1.2, dash: 'dash' },
      },
    ],
    annotations: [
      {
        x: F0 * 100, xanchor: 'left', xshift: 5,
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
      {
        x: FSTAR * 100, xanchor: 'left', xshift: 5,
        yref: 'paper', y: 0.79,
        text: 'Issuance peak (f = 1/6)',
        showarrow: false,
        font: { size: 11, color: '#00897b' },
      },
    ],
    showlegend: true,
    legend: { x: 0.65, y: 0.5, bgcolor: 'rgba(255,255,255,0.8)' },
    dragmode: false,
    title: { text: 'Annual issuance: current vs. proposed', font: { size: 14 }, x: 0.5, xanchor: 'center' },
    margin: { t: 40, r: 12, b: 56, l: 72 },
    hovermode: 'x unified',
    hoverdistance: -1,
    plot_bgcolor: '#fafafa',
    paper_bgcolor: '#ffffff',
  };

  var traces = [
    {
      x: fs, y: yCurrent,
      name: 'Current',
      type: 'scatter', mode: 'lines',
      line: { color: '#1565c0', width: 2.5 },
      hovertemplate: 'Current: %{y:.3f}%<extra></extra>',
    },
    {
      x: fs, y: yProposed,
      name: 'Proposed',
      type: 'scatter', mode: 'lines',
      line: { color: '#00897b', width: 2.5 },
      hovertemplate: 'Proposed: %{y:.3f}%<extra></extra>',
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
  var el = document.getElementById('lin-issuancecurve-chart');
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
