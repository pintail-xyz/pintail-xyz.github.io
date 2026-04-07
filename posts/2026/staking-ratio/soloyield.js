(function () {
  // ── Load Plotly only if not already present on the page ──────────────────
  function init() {
  // ── Ethereum protocol constants ──────────────────────────────────────────
  var TOTAL_ETH_SUPPLY   = 120500000;
  var BASE_REWARD_FACTOR = 64;
  var EPOCHS_PER_YEAR    = (365.25 * 24 * 3600) / (32 * 12); // ≈ 82,181.25

  var CURRENT_RATIO = 0.32;
  var N_POINTS      = 500;
  var RATIO_MIN     = 0.01;

  // ── CL APR from the Ethereum consensus spec ──────────────────────────────
  // base_reward_per_increment = BASE_REWARD_FACTOR × 10⁹ / √(total_active_balance_gwei)
  // APR = base_reward_per_increment × EPOCHS_PER_YEAR / 10⁹
  //     = BASE_REWARD_FACTOR × EPOCHS_PER_YEAR / √(staked_eth × 10⁹)
  function clApr(r) {
    return BASE_REWARD_FACTOR * EPOCHS_PER_YEAR / Math.sqrt(r * TOTAL_ETH_SUPPLY * 1e9);
  }

  // ── Build series data ────────────────────────────────────────────────────
  function buildData(taxRate, elRate) {
    var xs = [], preTaxY = [], postTaxY = [];
    var step = (1 - RATIO_MIN) / (N_POINTS - 1);

    for (var i = 0; i < N_POINTS; i++) {
      var r   = RATIO_MIN + i * step;
      var cl  = clApr(r);
      var nom = cl + elRate;   // nominal APR = CL + EL
      var dil = cl * r;        // dilution rate = CL issuance / total supply

      xs.push(+(r * 100).toFixed(4));

      // Pre-tax: dilution-adjusted yield before income tax
      preTaxY.push(+((nom - dil) * 100).toFixed(4));
      // Post-tax: dilution-adjusted yield after income tax
      postTaxY.push(+((nom * (1 - taxRate) - dil) * 100).toFixed(4));
    }
    return { xs: xs, preTaxY: preTaxY, postTaxY: postTaxY };
  }

  // ── Find zero-crossing of solo staker yield ──────────────────────────────
  function findBreakEven(xs, soloY) {
    for (var i = 1; i < soloY.length; i++) {
      if (soloY[i - 1] > 0 && soloY[i] <= 0) {
        var t = soloY[i - 1] / (soloY[i - 1] - soloY[i]);
        return xs[i - 1] + t * (xs[i] - xs[i - 1]);
      }
    }
    return null;
  }

  // ── Plotly layout ────────────────────────────────────────────────────────
  function makeLayout(breakEvenX, soloY) {
    var shapes = [
      {
        type: 'line',
        x0: CURRENT_RATIO * 100, x1: CURRENT_RATIO * 100,
        yref: 'paper', y0: 0, y1: 1,
        line: { color: '#bbb', width: 1.5, dash: 'dot' },
      },
    ];

    var annotations = [
      {
        x: CURRENT_RATIO * 100, xanchor: 'left', xshift: 5,
        yref: 'paper', y: 0.97,
        text: 'Today: ~32% staked',
        showarrow: false,
        font: { size: 11, color: '#aaa' },
      },
    ];

    if (breakEvenX !== null) {
      shapes.push({
        type: 'line',
        x0: breakEvenX, x1: breakEvenX,
        yref: 'paper', y0: 0, y1: 1,
        line: { color: '#c62828', width: 1.5, dash: 'dot' },
      });
      annotations.push({
        x: breakEvenX, xanchor: 'left', xshift: 5,
        yref: 'paper', y: 0.88,
        text: 'Break-even: ' + breakEvenX.toFixed(1) + '% staked',
        showarrow: false,
        font: { size: 11, color: '#c62828' },
      });
    }

    return {
      xaxis: {
        title: { text: 'Staking Ratio', font: { size: 12 } },
        range: [0, 100],
        tickvals: [0, 20, 40, 60, 80, 100],
        ticktext: ['0%', '20%', '40%', '60%', '80%', '100%'],
        ticksuffix: '% staked',
        hoverformat: 'd',
        gridcolor: '#eeeeee',
        showgrid: true,
      },
      yaxis: {
        title: { text: 'Dilution-Adjusted Yield', font: { size: 12 } },
        ticksuffix: '%',
        zeroline: true,
        zerolinewidth: 1.5,
        zerolinecolor: '#555',
        gridcolor: '#eeeeee',
        showgrid: true,
        range: [Math.min(0, Math.min.apply(null, soloY)), Math.max.apply(null, soloY) * 1.05],
      },
      shapes: shapes,
      annotations: annotations,
      legend: {
        x: 0.99, xanchor: 'right',
        y: 0.5, yanchor: 'middle',
        bgcolor: 'rgba(255,255,255,0.88)',
        bordercolor: '#ddd', borderwidth: 1,
        font: { size: 12 },
      },
      title: { text: 'Solo staker yield adjusted for dilution and income tax', font: { size: 14 }, x: 0.5, xanchor: 'center' },
      dragmode: false,
      margin: { t: 40, r: 12, b: 56, l: 68 },
      hovermode: 'x unified',
      hoverdistance: -1,
      plot_bgcolor: '#fafafa',
      paper_bgcolor: '#ffffff',
    };
  }

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
  var initialized = false;

  function render() {
    var taxRate = document.getElementById('taxSlider').value / 100;
    var elRate  = document.getElementById('elSlider').value / 100;

    document.getElementById('taxValue').textContent = Math.round(taxRate * 100) + '%';
    document.getElementById('elValue').textContent  = (elRate * 100).toFixed(2) + '%';

    var data = buildData(taxRate, elRate);
    var breakEvenX = findBreakEven(data.xs, data.postTaxY);

    var allY = data.preTaxY.concat(data.postTaxY);

    var traces = [
      {
        x: data.xs, y: data.preTaxY,
        name: 'Pre-tax yield',
        type: 'scatter', mode: 'lines',
        line: { color: '#1565c0', width: 2.5 },
        hovertemplate: 'Pre-tax yield: %{y:.2f}%<extra></extra>',
      },
      {
        x: data.xs, y: data.postTaxY,
        name: 'Post-tax yield<br>(' + Math.round(taxRate * 100) + '% income tax)',
        type: 'scatter', mode: 'lines',
        line: { color: '#c62828', width: 2.5 },
        hovertemplate: 'Post-tax yield: %{y:.2f}%<extra></extra>',
      },
    ];

    if (!initialized) {
      Plotly.newPlot('soloyield-chart', traces, makeLayout(breakEvenX, allY), plotConfig);
      initialized = true;
      attachTouchHover(document.getElementById('soloyield-chart'));
    } else {
      Plotly.react('soloyield-chart', traces, makeLayout(breakEvenX, allY), plotConfig);
    }
  }

    document.getElementById('taxSlider').addEventListener('input', render);
    document.getElementById('elSlider').addEventListener('input', render);
    render();
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
