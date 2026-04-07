(function () {
  // ── Load Plotly only if not already present on the page ──────────────────
  function init() {
  // ── Ethereum protocol constants ──────────────────────────────────────────
  var TOTAL_ETH_SUPPLY   = 120500000;
  var BASE_REWARD_FACTOR = 64;
  var EPOCHS_PER_YEAR    = (365.25 * 24 * 3600) / (32 * 12); // ≈ 82,181.25

  var CURRENT_RATIO = 0.32;
  var N_POINTS      = 500;
  var ETH_MIN_M     = 0.5;   // millions of ETH (avoid division by zero)
  var ETH_MAX_M     = 122;   // millions of ETH

  // ── CL APR from the Ethereum consensus spec ──────────────────────────────
  function clApr(stakedEth) {
    return BASE_REWARD_FACTOR * EPOCHS_PER_YEAR / Math.sqrt(stakedEth * 1e9);
  }

  // ── Build series data ────────────────────────────────────────────────────
  var xs = [], ys = [];
  var step = (ETH_MAX_M - ETH_MIN_M) / (N_POINTS - 1);
  for (var i = 0; i < N_POINTS; i++) {
    var stakedM = ETH_MIN_M + i * step;
    xs.push(+stakedM.toFixed(4));
    ys.push(+(clApr(stakedM * 1e6) * 100).toFixed(4));
  }

  // ── Layout ───────────────────────────────────────────────────────────────
  var currentStakedM = +(CURRENT_RATIO * TOTAL_ETH_SUPPLY / 1e6).toFixed(2);

  var layout = {
    xaxis: {
      title: { text: 'ETH Staked', font: { size: 12 } },
      range: [0, ETH_MAX_M],
      fixedrange: true,
      tickvals: [0, 20, 40, 60, 80, 100, 120],
      ticktext: ['0M', '20M', '40M', '60M', '80M', '100M', '120M'],
      ticksuffix: 'M ETH staked',
      hoverformat: 'd',
      gridcolor: '#eeeeee',
      showgrid: true,
    },
    yaxis: {
      title: { text: 'Consensus Layer Nominal Return', font: { size: 12 } },
      ticksuffix: '%',
      zeroline: true,
      zerolinewidth: 1.5,
      zerolinecolor: '#555',
      gridcolor: '#eeeeee',
      showgrid: true,
      range: [0, Math.max.apply(null, ys) * 1.05],
      fixedrange: true,
    },
    shapes: [
      {
        type: 'line',
        x0: currentStakedM, x1: currentStakedM,
        yref: 'paper', y0: 0, y1: 1,
        line: { color: '#bbb', width: 1.5, dash: 'dot' },
      },
    ],
    annotations: [
      {
        x: currentStakedM, xanchor: 'left', xshift: 5,
        yref: 'paper', y: 0.97,
        text: 'Today (~32% staked)',
        showarrow: false,
        font: { size: 11, color: '#aaa' },
      },
    ],
    showlegend: false,
    dragmode: false,
    title: { text: 'Ethereum proof-of-stake issuance curve', font: { size: 14 }, x: 0.5, xanchor: 'center' },
    margin: { t: 40, r: 12, b: 56, l: 68 },
    hovermode: 'x unified',
    hoverdistance: -1,
    plot_bgcolor: '#fafafa',
    paper_bgcolor: '#ffffff',
  };

  var traces = [
    {
      x: xs, y: ys,
      type: 'scatter', mode: 'lines',
      line: { color: '#1565c0', width: 2.5 },
      hovertemplate: 'CL APR: %{y:.2f}%<extra></extra>',
    },
  ];

  // ── Touch hover support for mobile ──────────────────────────────────────
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
  var el = document.getElementById('issuancecurve-chart');
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
