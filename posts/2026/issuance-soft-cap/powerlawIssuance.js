(function () {
  function init() {
  // ── Ethereum protocol constants ──────────────────────────────────────────
  var TOTAL_ETH_SUPPLY   = 120500000;
  var BASE_REWARD_FACTOR = 64;
  var EPOCHS_PER_YEAR    = (365.25 * 24 * 3600) / (32 * 12); // ≈ 82,181.25

  var F_TODAY = 1 / 3;
  var F_SAT   = 0.5;

  // f* = 1/(2n+1) for each n
  var FSTAR_N1 = 1 / 3;   // 33.3%
  var FSTAR_N2 = 1 / 5;   // 20%
  var FSTAR_N4 = 1 / 9;   // 11.1%

  var N_POINTS = 500;
  var F_MIN    = 0.0;
  var F_MAX    = 1.0;

  // ── Issuance functions (% of total ETH supply / year) ───────────────────
  function annualIssuancePct(f) {
    if (f <= 0) return 0;
    return BASE_REWARD_FACTOR * EPOCHS_PER_YEAR * Math.sqrt(f / (TOTAL_ETH_SUPPLY * 1e9)) * 100;
  }

  function annualIssuancePctPL(f, n) {
    if (f <= 0 || f >= 1) return 0;
    return annualIssuancePct(f) * Math.pow(1 - f, n);
  }

  // ── Build series ─────────────────────────────────────────────────────────
  var fs = [], yCurrent = [], yN1 = [], yN2 = [], yN4 = [];
  var step = (F_MAX - F_MIN) / (N_POINTS - 1);
  for (var i = 0; i < N_POINTS; i++) {
    var f = F_MIN + i * step;
    fs.push(+(f * 100).toFixed(3));
    yCurrent.push(+annualIssuancePct(f).toFixed(4));
    yN1.push(+annualIssuancePctPL(f, 1).toFixed(4));
    yN2.push(+annualIssuancePctPL(f, 2).toFixed(4));
    yN4.push(+annualIssuancePctPL(f, 4).toFixed(4));
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
      range: [0, 1.5],
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
        line: { color: '#888', width: 1.5, dash: 'dot' },
      },
      {
        type: 'line',
        x0: FSTAR_N2 * 100, x1: FSTAR_N2 * 100,
        yref: 'paper', y0: 0, y1: 1,
        line: { color: '#00897b', width: 1.2, dash: 'dash' },
      },
      {
        type: 'line',
        x0: FSTAR_N4 * 100, x1: FSTAR_N4 * 100,
        yref: 'paper', y0: 0, y1: 1,
        line: { color: '#6a1b9a', width: 1.2, dash: 'dash' },
      },
    ],
    annotations: [
      {
        x: F_TODAY * 100, xanchor: 'left', xshift: 5,
        yref: 'paper', y: 1, yanchor: 'top',
        textangle: -90,
        text: 'Today (~33%) = f* (n=1)',
        showarrow: false,
        font: { size: 11, color: '#aaa' },
      },
      {
        x: F_SAT * 100, xanchor: 'left', xshift: 5,
        yref: 'paper', y: 1, yanchor: 'top',
        textangle: -90,
        text: '50% staking',
        showarrow: false,
        font: { size: 11, color: '#888' },
      },
      {
        x: FSTAR_N2 * 100, xanchor: 'left', xshift: 5,
        yref: 'paper', y: 0.65, yanchor: 'top',
        textangle: -90,
        text: 'f* (n=2, 20%)',
        showarrow: false,
        font: { size: 11, color: '#00897b' },
      },
      {
        x: FSTAR_N4 * 100, xanchor: 'left', xshift: 5,
        yref: 'paper', y: 0.65, yanchor: 'top',
        textangle: -90,
        text: 'f* (n=4, 11%)',
        showarrow: false,
        font: { size: 11, color: '#6a1b9a' },
      },
    ],
    showlegend: true,
    legend: { x: 0.62, y: 0.95, bgcolor: 'rgba(255,255,255,0.8)' },
    dragmode: false,
    title: { text: 'Annual issuance: power-law soft cap (m(f) = (1−f)ⁿ)', font: { size: 14 }, x: 0.5, xanchor: 'center' },
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
      x: fs, y: yN1,
      name: 'n = 1',
      type: 'scatter', mode: 'lines',
      line: { color: '#f57c00', width: 2.5 },
      hovertemplate: 'n=1: %{y:.3f}%<extra></extra>',
    },
    {
      x: fs, y: yN2,
      name: 'n = 2',
      type: 'scatter', mode: 'lines',
      line: { color: '#00897b', width: 2.5 },
      hovertemplate: 'n=2: %{y:.3f}%<extra></extra>',
    },
    {
      x: fs, y: yN4,
      name: 'n = 4',
      type: 'scatter', mode: 'lines',
      line: { color: '#6a1b9a', width: 2.5 },
      hovertemplate: 'n=4: %{y:.3f}%<extra></extra>',
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
  var el = document.getElementById('softcap-pl-issuance-chart');
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
