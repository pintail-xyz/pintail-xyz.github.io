(function () {
  function init() {
  var TOTAL_ETH_SUPPLY   = 120500000;
  var BASE_REWARD_FACTOR = 64;
  var EPOCHS_PER_YEAR    = (365.25 * 24 * 3600) / (32 * 12);
  var F_TODAY = 1 / 3;
  var F_SAT   = 0.5;
  var F_PEAK  = F_SAT / 5;
  var N_POINTS = 500;
  var F_MIN    = 0.0;
  var F_MAX    = 0.50;
  var Y_MAX    = 30;   // clip y-axis; curves diverge toward infinity as f -> 0

  function clApr(f) {
    if (f <= 0) return 0;
    return BASE_REWARD_FACTOR * EPOCHS_PER_YEAR / Math.sqrt(f * TOTAL_ETH_SUPPLY * 1e9);
  }

  var SCALE_256 = 256 / BASE_REWARD_FACTOR;   // = 4
  var SCALE_512 = 512 / BASE_REWARD_FACTOR;   // = 8

  var fs = [], yCurrent = [], yNet256 = [], yNet512 = [];
  var step = (F_MAX - F_MIN) / (N_POINTS - 1);
  for (var i = 0; i < N_POINTS; i++) {
    var f = F_MIN + i * step;
    var u = f / F_SAT;
    var w = (f >= F_SAT) ? 0 : (1 - u) * (1 - u);
    var apr = clApr(f);
    fs.push(+(f * 100).toFixed(3));
    yCurrent.push(+(apr * 100).toFixed(4));
    yNet256.push(+(SCALE_256 * w * apr * 100).toFixed(4));
    yNet512.push(+(SCALE_512 * w * apr * 100).toFixed(4));
  }

  var layout = {
    xaxis: {
      title: { text: "Staking ratio", font: { size: 12 } },
      range: [0, 50], fixedrange: true,
      tickvals: [0, 10, 20, 30, 40, 50],
      ticktext: ["0%", "10%", "20%", "30%", "40%", "50%"],
      gridcolor: "#eeeeee", showgrid: true,
    },
    yaxis: {
      title: { text: "Annual yield (APR)", font: { size: 12 } },
      ticksuffix: "%",
      zeroline: true, zerolinewidth: 1.5, zerolinecolor: "#555",
      gridcolor: "#eeeeee", showgrid: true,
      range: [0, Y_MAX], fixedrange: true,
    },
    shapes: [
      { type: "line", x0: F_PEAK * 100, x1: F_PEAK * 100,
        yref: "paper", y0: 0, y1: 1,
        line: { color: "#2e7d32", width: 1.5, dash: "dot" } },
      { type: "line", x0: F_TODAY * 100, x1: F_TODAY * 100,
        yref: "paper", y0: 0, y1: 1,
        line: { color: "#bbb", width: 1.5, dash: "dot" } },
      { type: "line", x0: F_SAT * 100, x1: F_SAT * 100,
        yref: "paper", y0: 0, y1: 1,
        line: { color: "#e57373", width: 1.5, dash: "dot" } },
    ],
    annotations: [
      { x: F_PEAK * 100, xanchor: "left", xshift: 5,
        yref: "paper", y: 1, yanchor: "top", textangle: -90,
        text: "Net peak (10%)", showarrow: false,
        font: { size: 11, color: "#2e7d32" } },
      { x: F_TODAY * 100, xanchor: "left", xshift: 5,
        yref: "paper", y: 1, yanchor: "top", textangle: -90,
        text: "Today (~33%)", showarrow: false,
        font: { size: 11, color: "#aaa" } },
      { x: F_SAT * 100, xanchor: "left", xshift: 5,
        yref: "paper", y: 1, yanchor: "top", textangle: -90,
        text: "Saturation (50%)", showarrow: false,
        font: { size: 11, color: "#e57373" } },
    ],
    showlegend: true,
    legend: { x: 0.55, y: 0.98, bgcolor: "rgba(255,255,255,0.8)" },
    dragmode: false,
    title: { text: "Annual validator yield: BASE_REWARD_FACTOR calibration", font: { size: 14 }, x: 0.5, xanchor: "center" },
    margin: { t: 40, r: 12, b: 56, l: 72 },
    hovermode: "x unified", hoverdistance: -1,
    plot_bgcolor: "#fafafa", paper_bgcolor: "#ffffff",
  };

  var traces = [
    { x: fs, y: yCurrent,
      name: "Current (B = 64, no offset)", type: "scatter", mode: "lines",
      line: { color: "#1565c0", width: 2.5 },
      hovertemplate: "Current: %{y:.2f}%<extra></extra>" },
    { x: fs, y: yNet256,
      name: "B' = 256", type: "scatter", mode: "lines",
      line: { color: "#00838f", width: 2.5 },
      hovertemplate: "B'=256: %{y:.2f}%<extra></extra>" },
    { x: fs, y: yNet512,
      name: "B' = 512", type: "scatter", mode: "lines",
      line: { color: "#e65100", width: 2.5 },
      hovertemplate: "B'=512: %{y:.2f}%<extra></extra>" },
  ];

  function attachTouchHover(el) {
    function hoverAt(touch) {
      var rect = el.getBoundingClientRect();
      Plotly.Fx.hover(el, { xpx: touch.clientX - rect.left, ypx: touch.clientY - rect.top });
    }
    el.addEventListener("touchstart", function(e){ if(e.touches.length===1) hoverAt(e.touches[0]); }, { passive: true });
    el.addEventListener("touchmove",  function(e){ if(e.touches.length===1){ e.preventDefault(); hoverAt(e.touches[0]); } }, { passive: false });
    el.addEventListener("touchend",   function(){ Plotly.Fx.unhover(el); }, { passive: true });
  }

  var el = document.getElementById("quadratic-offset-calibration-yield-chart");
  Plotly.newPlot(el, traces, layout, { responsive: true, displayModeBar: false, scrollZoom: false });
  attachTouchHover(el);
  }

  if (typeof Plotly !== "undefined") { init(); }
  else { var s = document.createElement("script"); s.src = "https://cdn.plot.ly/plotly-2.27.0.min.js"; s.onload = init; document.head.appendChild(s); }
}());
