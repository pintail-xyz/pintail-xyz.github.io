(function () {
  function init() {
  // ── Ethereum protocol constants ──────────────────────────────────────────
  var TOTAL_ETH_SUPPLY   = 120500000;
  var BASE_REWARD_FACTOR = 64;
  var EPOCHS_PER_YEAR    = (365.25 * 24 * 3600) / (32 * 12); // ≈ 82,181.25

  var F_TODAY         = 1 / 3;
  var F_SAT           = 0.5;
  var F_CROSSOVER_128 = 0.207;  // B=128 curve crosses current yield here
  var F_CROSSOVER_256 = 0.303;  // B=256 curve crosses current yield here

  var K_2 = 2;  // B=128: 2× BASE_REWARD_FACTOR
  var K_4 = 4;  // B=256: 4× BASE_REWARD_FACTOR

  var N_POINTS = 500;
  var F_MIN    = 0.005;
  var F_MAX    = 1.0;

  // ── Yield functions ──────────────────────────────────────────────────────
  function clApr(f) {
    return BASE_REWARD_FACTOR * EPOCHS_PER_YEAR / Math.sqrt(f * TOTAL_ETH_SUPPLY * 1e9);
  }

  var aprAtSat = clApr(F_SAT);  // r_sat with B=64

  // Subtractive naive: r(f) - r_sat * f * (5 - 6f)
  function clAprSubNaive(f) {
    if (f >= F_SAT) return 0;
    var net = clApr(f) - aprAtSat * f * (5 - 6 * f);
    return net > 0 ? net : 0;
  }

  // Subtractive compensated at multiplier K
  function clAprSubComp(f, K) {
    return K * clAprSubNaive(f);
  }

  // ── Build series ─────────────────────────────────────────────────────────
  var fs = [], yCurrent = [], yNaive = [], yComp128 = [], yComp256 = [];
  var step = (F_MAX - F_MIN) / (N_POINTS - 1);
  for (var i = 0; i < N_POINTS; i++) {
    var f = F_MIN + i * step;
    fs.push(+(f * 100).toFixed(3));
    yCurrent.push(+(clApr(f) * 100).toFixed(4));
    yNaive.push(+(clAprSubNaive(f) * 100).toFixed(4));
    yComp128.push(+(clAprSubComp(f, K_2) * 100).toFixed(4));
    yComp256.push(+(clAprSubComp(f, K_4) * 100).toFixed(4));
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
      title: { text: 'CL nominal return', font: { size: 12 } },
      ticksuffix: '%',
      zeroline: true,
      zerolinewidth: 1.5,
      zerolinecolor: '#555',
      gridcolor: '#eeeeee',
      showgrid: true,
      range: [0, 10],
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
        x0: F_CROSSOVER_128 * 100, x1: F_CROSSOVER_128 * 100,
        yref: 'paper', y0: 0, y1: 1,
        line: { color: '#e65100', width: 1.2, dash: 'dash' },
      },
      {
        type: 'line',
        x0: F_CROSSOVER_256 * 100, x1: F_CROSSOVER_256 * 100,
        yref: 'paper', y0: 0, y1: 1,
        line: { color: '#2e7d32', width: 1.2, dash: 'dash' },
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
        x: F_CROSSOVER_128 * 100, xanchor: 'left', xshift: 5,
        yref: 'paper', y: 1, yanchor: 'top',
        textangle: -90,
        text: 'B=128 crossover (~20.7%)',
        showarrow: false,
        font: { size: 11, color: '#e65100' },
      },
      {
        x: F_CROSSOVER_256 * 100, xanchor: 'left', xshift: 5,
        yref: 'paper', y: 1, yanchor: 'top',
        textangle: -90,
        text: 'B=256 crossover (~30.3%)',
        showarrow: false,
        font: { size: 11, color: '#2e7d32' },
      },
    ],
    showlegend: true,
    legend: { x: 0.55, y: 0.95, bgcolor: 'rgba(255,255,255,0.8)' },
    dragmode: false,
    title: { text: 'CL yield: current vs. quadratic taper (B=128, B=256)', font: { size: 14 }, x: 0.5, xanchor: 'center' },
    margin: { t: 40, r: 12, b: 56, l: 68 },
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
      hovertemplate: 'Current (B=64): %{y:.2f}%<extra></extra>',
    },
    {
      x: fs, y: yNaive,
      name: 'Naive quadratic taper (B=64)',
      type: 'scatter', mode: 'lines',
      line: { color: '#6a1b9a', width: 2.5 },
      hovertemplate: 'Naive quadratic taper (B=64): %{y:.2f}%<extra></extra>',
    },
    {
      x: fs, y: yComp128,
      name: 'Compensated quadratic taper (B=128)',
      type: 'scatter', mode: 'lines',
      line: { color: '#e65100', width: 2.5 },
      hovertemplate: 'Compensated quadratic taper (B=128): %{y:.2f}%<extra></extra>',
    },
    {
      x: fs, y: yComp256,
      name: 'Compensated quadratic taper (B=256)',
      type: 'scatter', mode: 'lines',
      line: { color: '#2e7d32', width: 2.5 },
      hovertemplate: 'Compensated quadratic taper (B=256): %{y:.2f}%<extra></extra>',
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
  var el = document.getElementById('yieldcurve-chart');
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
