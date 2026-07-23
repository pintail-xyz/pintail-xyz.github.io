(function () {
  function init() {
  // ── Ethereum protocol constants ──────────────────────────────────────────
  var TOTAL_ETH_SUPPLY   = 120500000;
  var BASE_REWARD_FACTOR = 64;      // the permanent (post-transition) value
  var EPOCHS_PER_YEAR    = (365.25 * 24 * 3600) / (32 * 12); // ≈ 82,181.25

  var F_TODAY = 1 / 3;
  var FSTAR   = Math.pow(2, -7/3);  // ≈ 19.8% — peak of tapered issuance
  var F_SAT   = 0.5;

  var N_POINTS = 500;

  var N_MONTHS = 24;        // two-year transition, for the month readout
  var SWEEP_MS = 5000;      // wall-clock duration of a full sweep

  function clApr(f) {
    return BASE_REWARD_FACTOR * EPOCHS_PER_YEAR / Math.sqrt(f * TOTAL_ETH_SUPPLY * 1e9);
  }

  function b(f) {
    if (f >= F_SAT) return 1;
    return Math.pow(f / F_SAT, 1.5);
  }

  // Net yield during the transition. The burn is at full strength throughout;
  // the effective base reward factor decays from 128 (c = 0, activation) to
  // 64 (c = 1, end of transition), so the reward scales by (2 - c).
  function netYield(f, c) {
    var net = (2 - c) * (1 - b(f)) * clApr(f);
    return net > 0 ? net : 0;
  }

  // ── Two x-grids: yield starts at 0.5% (1/sqrt(f) is singular at 0) ────────
  function grid(fMin) {
    var xs = [], step = (1.0 - fMin) / (N_POINTS - 1);
    for (var i = 0; i < N_POINTS; i++) xs.push(fMin + i * step);
    return xs;
  }
  var fYield = grid(0.005);
  var fIss   = grid(0.0);

  var xYield = fYield.map(function (f) { return +(f * 100).toFixed(3); });
  var xIss   = fIss.map(function (f) { return +(f * 100).toFixed(3); });

  var yYieldCurrent = fYield.map(function (f) { return +(clApr(f) * 100).toFixed(4); });
  var yIssCurrent   = fIss.map(function (f) { return f <= 0 ? 0 : +(clApr(f) * f * 100).toFixed(4); });

  function yieldSeries(c) {
    return fYield.map(function (f) { return +(netYield(f, c) * 100).toFixed(4); });
  }
  function issSeries(c) {
    return fIss.map(function (f) { return f <= 0 ? 0 : +(netYield(f, c) * f * 100).toFixed(4); });
  }

  // ── Shared layout pieces ─────────────────────────────────────────────────
  function baseAxes(yTitle, yMax) {
    return {
      xaxis: {
        title: { text: 'Staking ratio', font: { size: 12 } },
        range: [0, 100], fixedrange: true,
        tickvals: [0, 20, 40, 60, 80, 100],
        ticktext: ['0%', '20%', '40%', '60%', '80%', '100%'],
        gridcolor: '#eeeeee', showgrid: true,
      },
      yaxis: {
        title: { text: yTitle, font: { size: 12 } },
        ticksuffix: '%', zeroline: true, zerolinewidth: 1.5, zerolinecolor: '#555',
        gridcolor: '#eeeeee', showgrid: true, range: [0, yMax], fixedrange: true,
      },
    };
  }

  var refShapes = [
    { type: 'line', x0: F_TODAY * 100, x1: F_TODAY * 100, yref: 'paper', y0: 0, y1: 1,
      line: { color: '#bbb', width: 1.5, dash: 'dot' } },
    { type: 'line', x0: F_SAT * 100, x1: F_SAT * 100, yref: 'paper', y0: 0, y1: 1,
      line: { color: '#e57373', width: 1.5, dash: 'dot' } },
  ];

  var yieldLayout = Object.assign(baseAxes('CL nominal return', 10), {
    shapes: refShapes,
    showlegend: true,
    legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: 1.02, yanchor: 'bottom', font: { size: 11 } },
    dragmode: false,
    title: { text: 'CL net yield', font: { size: 13 }, x: 0.5, xanchor: 'center' },
    margin: { t: 54, r: 10, b: 48, l: 60 },
    hovermode: 'x unified', hoverdistance: -1,
    plot_bgcolor: '#fafafa', paper_bgcolor: '#ffffff',
  });

  var issLayout = Object.assign(baseAxes('Annual issuance (% of supply)', 2.0), {
    shapes: refShapes.concat([
      { type: 'line', x0: FSTAR * 100, x1: FSTAR * 100, yref: 'paper', y0: 0, y1: 1,
        line: { color: '#888', width: 1.2, dash: 'dash' } },
    ]),
    showlegend: true,
    legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: 1.02, yanchor: 'bottom', font: { size: 11 } },
    dragmode: false,
    title: { text: 'Annual issuance', font: { size: 13 }, x: 0.5, xanchor: 'center' },
    margin: { t: 54, r: 10, b: 48, l: 64 },
    hovermode: 'x unified', hoverdistance: -1,
    plot_bgcolor: '#fafafa', paper_bgcolor: '#ffffff',
  });

  // Initial view: month 0 (start of the transition, effective B = 128).
  var yieldTraces = [
    { x: xYield, y: yYieldCurrent, name: 'Current (no burn)', type: 'scatter', mode: 'lines',
      line: { color: '#1565c0', width: 2.5 }, hovertemplate: 'Current: %{y:.2f}%<extra></extra>' },
    { x: xYield, y: yieldSeries(0), name: 'Tapered burn', type: 'scatter', mode: 'lines',
      line: { color: '#6a1b9a', width: 2.5 }, hovertemplate: 'Tapered burn: %{y:.2f}%<extra></extra>' },
  ];
  var issTraces = [
    { x: xIss, y: yIssCurrent, name: 'Current (no burn)', type: 'scatter', mode: 'lines',
      line: { color: '#1565c0', width: 2.5 }, hovertemplate: 'Current: %{y:.3f}%<extra></extra>' },
    { x: xIss, y: issSeries(0), name: 'Tapered burn', type: 'scatter', mode: 'lines',
      line: { color: '#6a1b9a', width: 2.5 }, hovertemplate: 'Tapered burn: %{y:.3f}%<extra></extra>' },
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

  // ── One shared play/scrub control driving both charts simultaneously ─────
  function attachControls(container, yEl, iEl) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '▶ Play';
    var slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0; slider.max = 1000; slider.step = 1; slider.value = 0;
    slider.setAttribute('aria-label', 'Transition progress');
    var label = document.createElement('span');
    label.className = 'eipburn-transition-label';
    container.appendChild(btn);
    container.appendChild(slider);
    container.appendChild(label);

    var rafId = null, startTs = null, startC = 0, playing = false;

    function render(c) {
      Plotly.restyle(yEl, { y: [yieldSeries(c)] }, [1]);
      Plotly.restyle(iEl, { y: [issSeries(c)] }, [1]);
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

    render(0); // sync the month readout with the initial start-of-transition view
  }

  // ── Render ───────────────────────────────────────────────────────────────
  var plotConfig = { responsive: true, displayModeBar: false, scrollZoom: false };
  var yEl = document.getElementById('eipburn-transition-yield-chart');
  var iEl = document.getElementById('eipburn-transition-issuance-chart');
  var ctrl = document.getElementById('eipburn-transition-controls');
  Promise.all([
    Plotly.newPlot(yEl, yieldTraces, yieldLayout, plotConfig),
    Plotly.newPlot(iEl, issTraces, issLayout, plotConfig),
  ]).then(function () {
    attachControls(ctrl, yEl, iEl);
  });
  attachTouchHover(yEl);
  attachTouchHover(iEl);
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
