(function () {
  function init() {
  // ── Ethereum protocol constants ──────────────────────────────────────────
  var TOTAL_ETH_SUPPLY   = 120500000;
  var BASE_REWARD_FACTOR = 64;      // the permanent (post-transition) value
  var EPOCHS_PER_YEAR    = (365.25 * 24 * 3600) / (32 * 12); // ≈ 82,181.25

  var F_TODAY = 1 / 3;
  var FSTAR   = Math.pow(2, -7/3);  // ≈ 19.8% — peak of tapered issuance
  var F_SAT   = 0.5;

  function clApr(f) {
    return BASE_REWARD_FACTOR * EPOCHS_PER_YEAR / Math.sqrt(f * TOTAL_ETH_SUPPLY * 1e9);
  }

  function b(f) {
    if (f >= F_SAT) return 1;
    return Math.pow(f / F_SAT, 1.5);
  }

  // Net consensus issuance as a fraction of supply per year.
  function netIssuance(f) {
    if (f <= 0) return 0;
    if (f >= F_SAT) return 0;
    return (1 - b(f)) * clApr(f) * f;
  }

  // Sign of d(operator income)/d(operator stake), holding other stake fixed.
  // Income = sigma * (N(f) + R); positive means growing still pays.
  function marginalIncome(f, sigma, R) {
    var h = 1e-6;
    var N = netIssuance(f);
    var dN = (netIssuance(f + h) - netIssuance(f - h)) / (2 * h);
    return (1 - sigma) * (N + R) / f + sigma * dN;
  }

  // Staking ratio at which further growth stops increasing the operator's
  // income, for an operator holding `sigma` of the stake. Null if no such
  // point exists below saturation.
  function threshold(sigma, R) {
    if (sigma <= 0) return null;
    var lo = null, hi = null;
    var steps = 2000;
    var prev = marginalIncome(0.005, sigma, R);
    for (var i = 1; i <= steps; i++) {
      var f = 0.005 + (F_SAT - 0.0051 - 0.005) * i / steps;
      var cur = marginalIncome(f, sigma, R);
      if (prev > 0 && cur <= 0) { lo = f - (F_SAT - 0.0101) / steps; hi = f; break; }
      prev = cur;
    }
    if (lo === null) return null;
    for (var j = 0; j < 60; j++) {
      var mid = (lo + hi) / 2;
      if (marginalIncome(mid, sigma, R) > 0) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  var sigmas = [], clOnly = [];
  for (var s = 1; s <= 100; s++) {
    var tCl = threshold(s / 100, 0);
    sigmas.push(s);
    clOnly.push(tCl === null ? null : +(tCl * 100).toFixed(3));
  }

  var layout = {
    xaxis: {
      title: { text: "Operator's share of total stake", font: { size: 12 } },
      range: [0, 100],
      fixedrange: true,
      tickvals: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      ticktext: ['0%', '10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%', '100%'],
      gridcolor: '#eeeeee',
      showgrid: true,
    },
    yaxis: {
      title: { text: 'Staking ratio above which growth reduces income', font: { size: 12 } },
      ticksuffix: '%',
      range: [15, 55],
      fixedrange: true,
      gridcolor: '#eeeeee',
      showgrid: true,
    },
    shapes: [
      {
        type: 'line',
        xref: 'paper', x0: 0, x1: 1,
        y0: F_SAT * 100, y1: F_SAT * 100,
        line: { color: '#e57373', width: 1.5, dash: 'dot' },
      },
      {
        type: 'line',
        xref: 'paper', x0: 0, x1: 1,
        y0: F_TODAY * 100, y1: F_TODAY * 100,
        line: { color: '#bbb', width: 1.5, dash: 'dot' },
      },
      {
        type: 'line',
        xref: 'paper', x0: 0, x1: 1,
        y0: FSTAR * 100, y1: FSTAR * 100,
        line: { color: '#888', width: 1.2, dash: 'dash' },
      },
    ],
    annotations: [
      {
        xref: 'paper', x: 0, xanchor: 'left', xshift: 4,
        y: F_SAT * 100, yanchor: 'bottom',
        text: 'Saturation (50%)',
        showarrow: false,
        font: { size: 11, color: '#e57373' },
      },
      {
        xref: 'paper', x: 0, xanchor: 'left', xshift: 4,
        y: F_TODAY * 100, yanchor: 'bottom',
        text: 'Today (~33%)',
        showarrow: false,
        font: { size: 11, color: '#aaa' },
      },
      {
        xref: 'paper', x: 0, xanchor: 'left', xshift: 4,
        y: FSTAR * 100, yanchor: 'bottom',
        text: 'Issuance peak (f ≈ 19.8%)',
        showarrow: false,
        font: { size: 11, color: '#888' },
      },
    ],
    showlegend: false,
    dragmode: false,
    title: { text: 'Where growth stops paying, by operator size', font: { size: 14 }, x: 0.5, xanchor: 'center' },
    margin: { t: 40, r: 12, b: 56, l: 72 },
    hovermode: 'x unified',
    hoverdistance: -1,
    plot_bgcolor: '#fafafa',
    paper_bgcolor: '#ffffff',
  };

  var traces = [
    {
      x: sigmas, y: clOnly,
      name: 'Consensus issuance only',
      type: 'scatter', mode: 'lines',
      line: { color: '#6a1b9a', width: 2.5 },
      hovertemplate: 'Growth stops paying above: %{y:.1f}% staked<extra></extra>',
    },
  ];

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

  var plotConfig = { responsive: true, displayModeBar: false, scrollZoom: false };
  var el = document.getElementById('eipburn-operatorthreshold-chart');
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
