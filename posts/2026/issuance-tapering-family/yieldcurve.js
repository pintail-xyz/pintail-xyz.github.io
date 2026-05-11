(function () {
  function init() {
  // ── Ethereum protocol constants ──────────────────────────────────────────
  var TOTAL_ETH_SUPPLY   = 120500000;
  var BASE_REWARD_FACTOR = 64;
  var EPOCHS_PER_YEAR    = (365.25 * 24 * 3600) / (32 * 12);

  var F0      = 1 / 3;
  var N_POINTS = 600;
  var F_MIN   = 0.005;
  var F_MAX   = 0.65;

  function clApr(f) {
    return BASE_REWARD_FACTOR * EPOCHS_PER_YEAR / Math.sqrt(f * TOTAL_ETH_SUPPLY * 1e9);
  }

  function clAprBeta(f, beta) {
    if (f >= 0.5) return 0;
    return Math.pow((0.5 - f) / (0.5 - F0), beta) * clApr(f);
  }

  // ── Build series ─────────────────────────────────────────────────────────
  var fs = [], yCurrent = [], yHalf = [], yOne = [], yTwo = [];
  var step = (F_MAX - F_MIN) / (N_POINTS - 1);
  for (var i = 0; i < N_POINTS; i++) {
    var f = F_MIN + i * step;
    fs.push(+(f * 100).toFixed(3));
    yCurrent.push(+(clApr(f) * 100).toFixed(4));
    yHalf.push(+(clAprBeta(f, 0.5) * 100).toFixed(4));
    yOne.push(+(clAprBeta(f, 1.0) * 100).toFixed(4));
    yTwo.push(+(clAprBeta(f, 2.0) * 100).toFixed(4));
  }

  // ── Reference lines ──────────────────────────────────────────────────────
  var shapes = [
    {
      type: 'line', x0: F0 * 100, x1: F0 * 100,
      yref: 'paper', y0: 0, y1: 1,
      line: { color: '#bbb', width: 1.5, dash: 'dot' },
    },
    {
      type: 'line', x0: 50, x1: 50,
      yref: 'paper', y0: 0, y1: 1,
      line: { color: '#e57373', width: 1.5, dash: 'dot' },
    },
  ];

  var annotations = [
    {
      x: F0 * 100, xanchor: 'left', xshift: 5,
      yref: 'paper', y: 0.97,
      text: 'Today (~33%)',
      showarrow: false, font: { size: 11, color: '#aaa' },
    },
    {
      x: 50, xanchor: 'right', xshift: -5,
      yref: 'paper', y: 0.97,
      text: 'Cap (50%)',
      showarrow: false, font: { size: 11, color: '#e57373' },
    },
  ];

  // ── Layout ───────────────────────────────────────────────────────────────
  var layout = {
    xaxis: {
      title: { text: 'Staking ratio', font: { size: 12 } },
      range: [0, 65],
      fixedrange: true,
      tickvals: [0, 10, 20, 30, 40, 50, 60],
      ticktext: ['0%', '10%', '20%', '30%', '40%', '50%', '60%'],
      gridcolor: '#eeeeee', showgrid: true,
    },
    yaxis: {
      title: { text: 'CL nominal return', font: { size: 12 } },
      ticksuffix: '%',
      zeroline: true, zerolinewidth: 1.5, zerolinecolor: '#555',
      gridcolor: '#eeeeee', showgrid: true,
      range: [0, 12],
      fixedrange: true,
    },
    shapes: shapes,
    annotations: annotations,
    showlegend: true,
    legend: { x: 0.98, xanchor: 'right', y: 0.98, yanchor: 'top', bgcolor: 'rgba(255,255,255,0.88)', bordercolor: '#ddd', borderwidth: 1 },
    dragmode: false,
    title: { text: 'CL yield by issuance curve', font: { size: 14 }, x: 0.5, xanchor: 'center' },
    margin: { t: 40, r: 12, b: 56, l: 68 },
    hovermode: 'x unified',
    hoverdistance: -1,
    plot_bgcolor: '#fafafa',
    paper_bgcolor: '#ffffff',
  };

  // ── Traces ───────────────────────────────────────────────────────────────
  var traces = [
    {
      x: fs, y: yCurrent, name: 'Current (unmodified)',
      type: 'scatter', mode: 'lines',
      line: { color: '#1565c0', width: 2, dash: 'dot' },
      hovertemplate: 'Current: %{y:.2f}%<extra></extra>',
    },
    {
      x: fs, y: yHalf, name: 'β = ½ (square root)',
      type: 'scatter', mode: 'lines',
      line: { color: '#f57c00', width: 2.5 },
      hovertemplate: 'β=½: %{y:.2f}%<extra></extra>',
    },
    {
      x: fs, y: yOne, name: 'β = 1 (linear)',
      type: 'scatter', mode: 'lines',
      line: { color: '#00897b', width: 2.5 },
      hovertemplate: 'β=1: %{y:.2f}%<extra></extra>',
    },
    {
      x: fs, y: yTwo, name: 'β = 2 (quadratic)',
      type: 'scatter', mode: 'lines',
      line: { color: '#6a1b9a', width: 2.5 },
      hovertemplate: 'β=2: %{y:.2f}%<extra></extra>',
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
    el.addEventListener('touchend', function () { Plotly.Fx.unhover(el); }, { passive: true });
  }

  // ── Render ───────────────────────────────────────────────────────────────
  var el = document.getElementById('family-yieldcurve-chart');
  Plotly.newPlot(el, traces, layout, { responsive: true, displayModeBar: false, scrollZoom: false });
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
