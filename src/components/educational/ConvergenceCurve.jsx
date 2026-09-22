import { useContext, useState, useMemo } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

const movingAverage = (data, windowSize) => {
  if (!data || windowSize <= 1) return data;
  const result = [];
  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    count++;
    if (i >= windowSize) {
      sum -= data[i - windowSize];
      count--;
    }
    result.push(sum / Math.max(1, count));
  }
  return result;
};

export const ConvergenceCurve = () => {
  const { diagnostics, config } = useContext(SimulationContext);
  const [showMSE, setShowMSE] = useState(true);
  const [smoothingWindow, setSmoothingWindow] = useState(50);
  const [useSmoothing, setUseSmoothing] = useState(true);
  const [useDb, setUseDb] = useState(true);

  const { chartData, phaseMarkers, finalSummary } = useMemo(() => {
    if (!diagnostics) return { chartData: null, phaseMarkers: null, finalSummary: null };
    const { mseHistory, mseHistoryChart } = diagnostics;
    const iterations = mseHistoryChart?.length || mseHistory?.length || 0;
    if (iterations === 0) return { chartData: null, phaseMarkers: null, finalSummary: null };

    const datasets = [];

    if (showMSE && (mseHistory?.length || mseHistoryChart?.length)) {
      const raw = mseHistoryChart && mseHistoryChart.length > 0
        ? mseHistoryChart.map(p => p.y)
        : mseHistory;
      const xs = mseHistoryChart && mseHistoryChart.length > 0
        ? mseHistoryChart.map(p => p.x)
        : Array.from({ length: raw.length }, (_, i) => i);
      const data = useSmoothing ? movingAverage(raw, Math.max(1, Math.floor(smoothingWindow / 4))) : raw;
      const yData = useDb
        ? data.map(v => 10 * Math.log10(Math.max(v, 1e-20)))
        : data;
      datasets.push({
        label: "E[eᵣ²[n]]   MSE (smoothed)",
        data: xs.map((x, i) => ({ x, y: yData[i] })),
        borderColor: "#2563eb",
        backgroundColor: "#2563eb22",
        borderWidth: 2.1,
        pointRadius: 0,
        tension: 0.15,
        fill: true,
        yAxisID: "y",
      });

      if (yData.length > 200) {
        const peakVal = yData.slice(0, Math.min(200, yData.length)).reduce((m, v) => Math.max(m, v), -Infinity);
        const steadyStart = Math.floor(yData.length * 0.75);
        const steadyVals = yData.slice(steadyStart);
        const steadyMean = steadyVals.reduce((a, b) => a + b, 0) / steadyVals.length;
        let convIdx = yData.length - 1;
        const threshold = steadyMean + 0.5;
        for (let i = 0; i < yData.length; i++) {
          let after = yData.slice(i, Math.min(i + 100, yData.length));
          if (after.every(v => v < threshold)) { convIdx = i; break; }
        }
        const convSample = xs[Math.min(convIdx, xs.length - 1)] ?? iterations;
        const markers = {
          convSample,
          peakVal,
          steadyMean,
          total: iterations,
        };
        const summary = {
          convergenceN: convSample,
          convergencePct: ((convSample / iterations) * 100).toFixed(1),
          peakDb: peakVal,
          steadyDb: steadyMean,
          attDb: peakVal - steadyMean,
          finalMse: raw[raw.length - 1],
          M: diagnostics.filterOrder,
          mu: config.stepSize,
        };
        return {
          chartData: { datasets },
          phaseMarkers: markers,
          finalSummary: summary,
        };
      }
    }
    return {
      chartData: datasets.length ? { datasets } : null,
      phaseMarkers: null,
      finalSummary: null,
    };
  }, [diagnostics, showMSE, smoothingWindow, useSmoothing, useDb, config.stepSize]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: true, position: "top", labels: { font: { size: 11 }, boxWidth: 14 } },
      tooltip: {
        mode: "index",
        intersect: false,
        callbacks: {
          label: (ctx) => {
            const y = Number(ctx.parsed.y);
            if (useDb) return `${ctx.dataset.label}: ${y.toFixed(1)} dB`;
            return `${ctx.dataset.label}: ${Number(y).toExponential(2)}`;
          },
          title: (items) => `Iteration n = ${Number(items[0]?.parsed?.x ?? 0).toLocaleString()}`,
        },
      },
      zoom: {
        pan: { enabled: true, mode: "x" },
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
      },
    },
    scales: {
      x: {
        type: "linear",
        title: { display: true, text: "Iteration (Sample Index n)", font: { weight: "bold", size: 12 } },
        ticks: { maxTicksLimit: 10, font: { size: 11 } },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
      y: {
        type: "linear",
        display: showMSE,
        position: "left",
        title: { display: true, text: useDb ? "MSE   (10·log₁₀(E[eᵣ²]))   dB" : "MSE   (mV²)", font: { weight: "bold", size: 12 } },
        ticks: { font: { size: 11 }, callback: (v) => useDb ? v.toFixed(0) + " dB" : Number(v).toExponential(1) },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
    },
  }), [showMSE, useDb]);

  if (!diagnostics) return null;

  return (
    <div style={{
      padding: "1rem",
      backgroundColor: "#fff",
      borderRadius: "8px",
      marginBottom: "1rem",
      boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
      border: "1px solid #e5e7eb",
    }}>
      <div style={{
        display: "flex",
        gap: "1rem",
        marginBottom: "0.5rem",
        flexWrap: "wrap",
        fontSize: "0.85rem",
        background: "#f8fafc",
        padding: "0.5rem 0.75rem",
        borderRadius: "5px",
        border: "1px solid #e2e8f0",
      }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer" }}>
          <input type="checkbox" checked={showMSE} onChange={(e) => setShowMSE(e.target.checked)} />
          Show MSE (log plot recommended)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer" }}>
          <input type="checkbox" checked={useDb} onChange={(e) => setUseDb(e.target.checked)} />
          Logarithmic (dB)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer" }}>
          <input type="checkbox" checked={useSmoothing} onChange={(e) => setUseSmoothing(e.target.checked)} />
          Smooth curve
        </label>
        {useSmoothing && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span>Window:</span>
            <input
              type="number"
              min="1"
              max="500"
              value={smoothingWindow}
              onChange={(e) => setSmoothingWindow(Number(e.target.value))}
              style={{ width: "62px", padding: "0.2rem 0.3rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
            />
          </div>
        )}
      </div>

      {diagnostics?.showSummary && finalSummary && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.5rem",
          marginBottom: "0.6rem",
        }}>
          <div style={{ background: "#fee2e2", borderLeft: "3px solid #dc2626", padding: "0.35rem 0.6rem", borderRadius: "0 4px 4px 0", fontSize: "0.8rem" }}>
            <div style={{ color: "#991b1b", fontWeight: "bold" }}>(1) Transient peak</div>
            <div style={{ fontSize: "0.95rem", fontFamily: "monospace", fontWeight: "bold" }}>
              {finalSummary.peakDb.toFixed(1)} dB
            </div>
            <div style={{ color: "#666", fontSize: "0.7rem" }}>Initial noise before learning</div>
          </div>
          <div style={{ background: "#fef3c7", borderLeft: "3px solid #d97706", padding: "0.35rem 0.6rem", borderRadius: "0 4px 4px 0", fontSize: "0.8rem" }}>
            <div style={{ color: "#92400e", fontWeight: "bold" }}>Converged @ n</div>
            <div style={{ fontSize: "0.95rem", fontFamily: "monospace", fontWeight: "bold" }}>
              {Number(finalSummary.convergenceN).toLocaleString()}
            </div>
            <div style={{ color: "#666", fontSize: "0.7rem" }}>{finalSummary.convergencePct}% of samples</div>
          </div>
          <div style={{ background: "#dcfce7", borderLeft: "3px solid #16a34a", padding: "0.35rem 0.6rem", borderRadius: "0 4px 4px 0", fontSize: "0.8rem" }}>
            <div style={{ color: "#166534", fontWeight: "bold" }}>(3) Steady-state J<sub>∞</sub></div>
            <div style={{ fontSize: "0.95rem", fontFamily: "monospace", fontWeight: "bold" }}>
              {finalSummary.steadyDb.toFixed(1)} dB
            </div>
            <div style={{ color: "#666", fontSize: "0.7rem" }}>MMSE + J<sub>ex</sub> (excess MSE)</div>
          </div>
          <div style={{ background: "#dbeafe", borderLeft: "3px solid #2563eb", padding: "0.35rem 0.6rem", borderRadius: "0 4px 4px 0", fontSize: "0.8rem" }}>
            <div style={{ color: "#1e40af", fontWeight: "bold" }}>Net attenuation</div>
            <div style={{ fontSize: "0.95rem", fontFamily: "monospace", fontWeight: "bold" }}>
              {finalSummary.attDb.toFixed(1)} dB
            </div>
            <div style={{ color: "#666", fontSize: "0.7rem" }}>Peak → Steady reduction</div>
          </div>
        </div>
      )}

      <div style={{
        height: "310px",
        position: "relative",
      }}>
        {chartData && <Line data={chartData} options={options} />}
        {diagnostics?.showSummary && phaseMarkers && (
          <div style={{
            position: "absolute",
            top: "6px",
            right: "6px",
            fontSize: "0.72rem",
            display: "flex",
            flexDirection: "column",
            gap: "3px",
            pointerEvents: "none",
          }}>
            {finalSummary && (
              <>
                <span style={{
                  color: "#fff",
                  background: "rgba(220, 38, 38, 0.85)",
                  padding: "0.1rem 0.4rem",
                  borderRadius: "3px",
                  alignSelf: "flex-start",
                }}>
                  ◁ n=0 → ~{Number(Math.floor(phaseMarkers.convSample * 0.3)).toLocaleString()} · Phase (1) Transient
                </span>
                <span style={{
                  color: "#fff",
                  background: "rgba(217, 119, 6, 0.85)",
                  padding: "0.1rem 0.4rem",
                  borderRadius: "3px",
                  alignSelf: "center",
                }}>
                  ◁ Phase (2) Converging
                </span>
                <span style={{
                  color: "#fff",
                  background: "rgba(22, 163, 74, 0.85)",
                  padding: "0.1rem 0.4rem",
                  borderRadius: "3px",
                  alignSelf: "flex-end",
                }}>
                  n≈{Number(phaseMarkers.convSample).toLocaleString()} → N · Phase (3) Steady-state ▷
                </span>
              </>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
