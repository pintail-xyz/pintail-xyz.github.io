(function () {
  function init() {
  // ── Ethereum protocol constants ──────────────────────────────────────────
  var TOTAL_ETH_SUPPLY   = 120500000;
  var BASE_REWARD_FACTOR = 64;
  var EPOCHS_PER_YEAR    = (365.25 * 24 * 3600) / (32 * 12); // ≈ 82,181.25

  var F_TODAY = 1 / 3;
  var F_SAT   = 0.5;

  var N_POINTS = 500;
  var F_MIN    = 0.005;
  var F_MAX    = 1.0;

  var N_MONTHS = 12;        // transition length, for the month readout
  var SWEEP_MS = 4500;      // wall-clock duration of a full 0 -> 1 sweep

  // ── Base micro-incentive curve (per-increment reward = penalty) ──────────
  function clApr(f) {
    return BASE_REWARD_FACTOR * EPOCHS_PER_YEAR / Math.sqrt(f * TOTAL_ETH_SUPPLY * 1e9);
  }

  // ── Offset taper fraction: q(f) = (f / f_sat)^(3/2) ──────────────────────
  function q(f) {
    if (f >= F_SAT) return 1;
    return Math.pow(f / F_SAT, 1.5);
  }

  // Net yield during the transition: (1 - c*q) * base, c the transition coeff.
  function clAprTaper(f, c) {
    var net = (1 - c * q(f)) * clApr(f);
    return net > 0 ? net : 0;
  }

  // ── Build the static x-axis and the current-curve series ─────────────────
  var fs = [], yCurrent = [];
  var step = (F_MAX - F_MIN) / (N_POINTS - 1);
  for (var i = 0; i < N_POINTS; i++) {
    var f = F_MIN + i * step;
    fs.push(+(f * 100).toFixed(3));
    yCurrent.push(+(clApr(f) * 100).toFixed(4));
  }

  // Tapered series for a given transition coefficient c.
  function taperSeries(c) {
    var ys = [];
    for (var i = 0; i < N_POINTS; i++) {
      var f = F_MIN + i * step;
      ys.push(+(clAprTaper(f, c) * 100).toFixed(4));
    }
    return ys;
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
    ],
    showlegend: true,
    legend: { x: 0.62, y: 0.95, bgcolor: 'rgba(255,255,255,0.8)' },
    dragmode: false,
    title: { text: 'CL net yield: current vs. linear taper phasing in', font: { size: 14 }, x: 0.5, xanchor: 'center' },
    margin: { t: 40, r: 12, b: 56, l: 68 },
    hovermode: 'x unified',
    hoverdistance: -1,
    plot_bgcolor: '#fafafa',
    paper_bgcolor: '#ffffff',
  };

  // Initial view shows the fully-tapered curve (end of transition, month 12).
  var traces = [
    {
      x: fs, y: yCurrent,
      name: 'Current curve',
      type: 'scatter', mode: 'lines',
      line: { color: '#1565c0', width: 2.5 },
      hovertemplate: 'Current: %{y:.2f}%<extra></extra>',
    },
    {
      x: fs, y: taperSeries(1),
      name: 'Linear taper',
      type: 'scatter', mode: 'lines',
      line: { color: '#6a1b9a', width: 2.5 },
      hovertemplate: 'Taper: %{y:.2f}%<extra></extra>',
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

  // ── Play/scrub controls driven by requestAnimationFrame ──────────────────
  // The transition coefficient c is swept continuously and pushed to the taper
  // trace with Plotly.restyle (one line, cheap) — no frames or in-plot slider,
  // so playback stays smooth and hover/responsiveness are preserved.
  function attachControls(el) {
    var wrap = document.createElement('div');
    wrap.className = 'lintaptrans-controls';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '▶ Play';
    var slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0; slider.max = 1000; slider.step = 1; slider.value = 1000;
    slider.setAttribute('aria-label', 'Transition progress');
    var label = document.createElement('span');
    label.className = 'lintaptrans-label';
    wrap.appendChild(btn);
    wrap.appendChild(slider);
    wrap.appendChild(label);
    el.parentNode.insertBefore(wrap, el.nextSibling);

    var rafId = null, startTs = null, startC = 0, playing = false;

    function render(c) {
      Plotly.restyle(el, { y: [taperSeries(c)] }, [1]);
      slider.value = Math.round(c * 1000);
      var month = c * N_MONTHS;
      label.textContent = 'month ' + (c <= 0 || c >= 1 ? month.toFixed(0) : month.toFixed(1));
    }

    function stop(ended) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null; startTs = null; playing = false;
      btn.textContent = ended ? '↻ Replay' : '▶ Play';
    }

    function tick(ts) {
      if (startTs === null) startTs = ts;
      var c = Math.min(startC + (ts - startTs) / SWEEP_MS, 1);
      render(c);
      if (c < 1) { rafId = requestAnimationFrame(tick); }
      else { stop(true); }
    }

    function play() {
      var curC = slider.value / 1000;
      startC = curC >= 1 ? 0 : curC;
      startTs = null; playing = true;
      btn.textContent = '❚❚ Pause';
      rafId = requestAnimationFrame(tick);
    }

    btn.addEventListener('click', function () { playing ? stop(false) : play(); });
    slider.addEventListener('input', function () {
      stop(false);
      render(slider.value / 1000);
    });

    render(1); // sync the month readout with the initial full-taper view
  }

  // ── Render ───────────────────────────────────────────────────────────────
  var plotConfig = { responsive: true, displayModeBar: false, scrollZoom: false };
  var el = document.getElementById('lintaptrans-yieldcurve-chart');
  Plotly.newPlot(el, traces, layout, plotConfig).then(function () {
    attachControls(el);
  });
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
