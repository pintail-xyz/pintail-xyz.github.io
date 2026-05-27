(function () {
  function init() {
  var F_SAT   = 0.5;
  var N_POINTS = 500;
  var F_MIN    = 0.0;
  var F_MAX    = 0.75;  // show a bit past saturation to illustrate clamped behaviour

  // Clamped at u=1: above f_sat the offset stays at 100% (= full base reward)
  function offsetLinear(f) {
    var u = Math.min(f / F_SAT, 1);
    return u;
  }
  function offsetSine(f) {
    var u = Math.min(f / F_SAT, 1);
    return Math.sin(Math.PI / 2 * u);
  }
  function offsetSCurve(f) {
    var u = Math.min(f / F_SAT, 1);
    var s = Math.sin(Math.PI / 2 * u);
    return s * s;
  }

  var fs = [], yLin = [], ySin = [], ySC = [];
  var step = (F_MAX - F_MIN) / (N_POINTS - 1);
  for (var i = 0; i < N_POINTS; i++) {
    var f = F_MIN + i * step;
    fs.push(+(f * 100).toFixed(3));
    yLin.push(+(offsetLinear(f) * 100).toFixed(4));
    ySin.push(+(offsetSine(f) * 100).toFixed(4));
    ySC.push(+(offsetSCurve(f) * 100).toFixed(4));
  }

  var layout = {
    xaxis: {
      title: { text: 'Staking ratio', font: { size: 12 } },
      range: [0, 75],
      fixedrange: true,
      tickvals: [0, 10, 20, 30, 40, 50, 60, 70],
      ticktext: ['0%', '10%', '20%', '30%', '40%', '50%', '60%', '70%'],
      gridcolor: '#eeeeee', showgrid: true,
    },
    yaxis: {
      title: { text: 'Offset as % of base reward', font: { size: 12 } },
      ticksuffix: '%',
      zeroline: true, zerolinewidth: 1.5, zerolinecolor: '#555',
      gridcolor: '#eeeeee', showgrid: true,
      range: [0, 110], fixedrange: true,
    },
    shapes: [
      {
        type: 'line',
        x0: 33.3, x1: 33.3,
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
        type: 'rect',
        x0: 50, x1: 75,
        yref: 'paper', y0: 0, y1: 1,
        fillcolor: '#f5f5f5', opacity: 0.6,
        line: { width: 0 },
        layer: 'below',
      },
    ],
    annotations: [
      {
        x: 33.3, xanchor: 'left', xshift: 5,
        yref: 'paper', y: 1, yanchor: 'top', textangle: -90,
        text: 'Calibration point (~33%)', showarrow: false,
        font: { size: 11, color: '#aaa' },
      },
      {
        x: 50, xanchor: 'left', xshift: 5,
        yref: 'paper', y: 1, yanchor: 'top', textangle: -90,
        text: 'Saturation (50%)', showarrow: false,
        font: { size: 11, color: '#e57373' },
      },
      {
        x: 62.5, xanchor: 'center',
        yref: 'paper', y: 0.15, yanchor: 'middle',
        text: 'offset = base reward<br>(net yield = 0)',
        showarrow: false,
        font: { size: 11, color: '#999' },
      },
    ],
    showlegend: true,
    legend: { x: 0.05, y: 0.98, bgcolor: 'rgba(255,255,255,0.8)' },
    dragmode: false,
    title: { text: 'Offset shape: fraction of base reward subtracted', font: { size: 14 }, x: 0.5, xanchor: 'center' },
    margin: { t: 40, r: 12, b: 56, l: 72 },
    hovermode: 'x unified',
    hoverdistance: -1,
    plot_bgcolor: '#fafafa',
    paper_bgcolor: '#ffffff',
  };

  var traces = [
    {
      x: fs, y: yLin,
      name: 'Linear',
      type: 'scatter', mode: 'lines',
      line: { color: '#2e7d32', width: 2.5 },
      hovertemplate: 'Linear: %{y:.1f}%<extra></extra>',
    },
    {
      x: fs, y: ySin,
      name: 'Sine',
      type: 'scatter', mode: 'lines',
      line: { color: '#6a1b9a', width: 2.5 },
      hovertemplate: 'Sine: %{y:.1f}%<extra></extra>',
    },
    {
      x: fs, y: ySC,
      name: 'S-curve (sin²)',
      type: 'scatter', mode: 'lines',
      line: { color: '#00838f', width: 2.5 },
      hovertemplate: 'S-curve: %{y:.1f}%<extra></extra>',
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
    el.addEventListener('touchend', function () { Plotly.Fx.unhover(el); }, { passive: true });
  }

  var plotConfig = { responsive: true, displayModeBar: false, scrollZoom: false };
  var el = document.getElementById('sine-offsetcurve-chart');
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
