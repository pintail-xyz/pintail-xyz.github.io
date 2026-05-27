(function () {
  function init() {
  // ── Ethereum protocol constants ──────────────────────────────────────────
  var TOTAL_ETH_SUPPLY   = 120500000;
  var BASE_REWARD_FACTOR = 64;
  var EPOCHS_PER_YEAR    = (365.25 * 24 * 3600) / (32 * 12); // ≈ 82,181.25

  var F_TODAY      = 1 / 3;
  var F_SAT        = 0.5;
  var FSTAR_NAIVE  = Math.pow(2, -7/3);  // peak of compensated (B=128) issuance; dI/df=0 gives f=2^(-7/3) ≈ 19.8%

  var N_POINTS = 500;
  var F_MIN    = 0.0;
  var F_MAX    = 1.0;

  // ── Issuance functions (% of total ETH supply / year) ───────────────────
  function annualInflationPct(f) {
    if (f <= 0) return 0;
    return BASE_REWARD_FACTOR * EPOCHS_PER_YEAR * Math.sqrt(f / (TOTAL_ETH_SUPPLY * 1e9)) * 100;
  }

  var inflAtSat = annualInflationPct(F_SAT);

  function annualInflationPctNaive(f) {
    if (f <= 0) return 0;
    var base = annualInflationPct(f) - Math.pow(f / F_SAT, 2) * inflAtSat;
    return base > 0 ? base : 0;
  }

  function annualInflationPctNaive128(f) {
    if (f <= 0) return 0;
    var net = 2 * (annualInflationPct(f) - Math.pow(f / F_SAT, 2) * inflAtSat);
    return net > 0 ? net : 0;
  }

  // ── Build series ─────────────────────────────────────────────────────────
  var fs = [], yCurrent = [], yNaive = [], yNaive128 = [];
  var step = (F_MAX - F_MIN) / (N_POINTS - 1);
  for (var i = 0; i < N_POINTS; i++) {
    var f = F_MIN + i * step;
    fs.push(+(f * 100).toFixed(3));
    yCurrent.push(+annualInflationPct(f).toFixed(4));
    yNaive.push(+annualInflationPctNaive(f).toFixed(4));
    yNaive128.push(+annualInflationPctNaive128(f).toFixed(4));
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
        x0: F_TODAY * 100, x1: F_TODAY * 100,
        yref: 'paper', y0: 0, y1: 1,
        line: { color: '#bbb', width: 1.5, dash: 'dot' },
      },
      {
        type: 'line',
        x0: F_SAT * 100, x1: F_SAT * 100,
        yref: 'paper', y0: 0, y1: 1,
        line: { color: '#e57373', width: 1.5, dash: 'dot' },
      },
      {
        type: 'line',
        x0: FSTAR_NAIVE * 100, x1: FSTAR_NAIVE * 100,
        yref: 'paper', y0: 0, y1: 1,
        line: { color: '#888', width: 1.2, dash: 'dash' },
      },
    ],
    annotations: [
      {
        x: F_TODAY * 100, xanchor: 'left', xshift: 5,
        yref: 'paper', y: 1, yanchor: 'top',
        textangle: -90,
        text: 'Today (~33%)',
        showarrow: false,
        font: { size: 11, color: '#aaa' },
      },
      {
        x: F_SAT * 100, xanchor: 'left', xshift: 5,
        yref: 'paper', y: 1, yanchor: 'top',
        textangle: -90,
        text: 'Saturation (50%)',
        showarrow: false,
        font: { size: 11, color: '#e57373' },
      },
      {
        x: FSTAR_NAIVE * 100, xanchor: 'left', xshift: 5,
        yref: 'paper', y: 1, yanchor: 'top',
        textangle: -90,
        text: 'Issuance peak (f ≈ 19.8%)',
        showarrow: false,
        font: { size: 11, color: '#888' },
      },
    ],
    showlegend: true,
    legend: { x: 0.62, y: 0.5, bgcolor: 'rgba(255,255,255,0.8)' },
    dragmode: false,
    title: { text: 'Annual issuance: current vs. linear taper', font: { size: 14 }, x: 0.5, xanchor: 'center' },
    margin: { t: 40, r: 12, b: 56, l: 72 },
    hovermode: 'x unified',
    hoverdistance: -1,
    plot_bgcolor: '#fafafa',
    paper_bgcolor: '#ffffff',
  };

  var traces = [
    {
      x: fs, y: yCurrent,
      name: 'Current (B=64)',
      type: 'scatter', mode: 'lines',
      line: { color: '#1565c0', width: 2.5 },
      hovertemplate: 'Current (B=64): %{y:.3f}%<extra></extra>',
    },
    {
      x: fs, y: yNaive,
      name: 'Naive linear taper (B=64)',
      type: 'scatter', mode: 'lines',
      line: { color: '#6a1b9a', width: 2.5 },
      hovertemplate: 'Naive linear taper (B=64): %{y:.3f}%<extra></extra>',
    },
    {
      x: fs, y: yNaive128,
      name: 'Compensated linear taper (B=128)',
      type: 'scatter', mode: 'lines',
      line: { color: '#2e7d32', width: 2.5 },
      hovertemplate: 'Compensated linear taper (B=128): %{y:.3f}%<extra></extra>',
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
  var el = document.getElementById('intuition-issuancecurve-chart');
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
