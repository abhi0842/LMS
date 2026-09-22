import React, { useContext, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import zoomPlugin from "chartjs-plugin-zoom";
import { SimulationContext, calculateSNR, calculatePSNR, calculateMMSE, calculateCCF } from "../../context/SimulationContext";
import { filterSignalLMS, filterSignalRLS } from "../../utils/filters";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

const computeMSEHistoryFromAdaptation = (errorArr, windowSize = 256, maxPts = 5000) => {
  if (!errorArr?.length) return [];
  const N = errorArr.length;
  const buf = [];
  const out = [];
  const stride = Math.max(1, Math.floor(N / maxPts));
  let runningSum = 0;
  let runningCount = 0;
  for (let n = 0; n < N; n++) {
    const e = errorArr[n];
    buf.push(e * e);
    runningSum += e * e;
    runningCount++;
    if (buf.length > windowSize) {
      runningSum -= buf.shift();
      runningCount--;
    }
    if (n % stride === 0 || n === N - 1) {
      const mse = runningCount > 0 ? runningSum / runningCount : 0;
      out.push({ x: n, y: mse });
    }
  }
  return out;
};

const findConvergenceIteration = (mseHistory, threshold = 0.05) => {
  if (!mseHistory?.length) return 0;
  const last = mseHistory[mseHistory.length - 1].y;
  if (!isFinite(last) || last <= 0) return mseHistory[mseHistory.length - 1].x;
  for (let i = 0; i < mseHistory.length; i++) {
    if (mseHistory[i].y <= last * (1 + threshold)) return mseHistory[i].x;
  }
  return mseHistory[mseHistory.length - 1].x;
};

export const LMSvsRLSComparison = () => {
  const {
    referenceSignal, desiredSignal, cleanSignal, artifactSignal,
    time, originalFs, setComparisonData, comparisonData,
  } = useContext(SimulationContext);

  const [running, setRunning] = useState(false);

  const result = useMemo(() => {
    if (!comparisonData) return null;
    return comparisonData;
  }, [comparisonData]);

  const runComparison = async () => {
    if (!referenceSignal?.length || !desiredSignal?.length) {
      return;
    }
    setRunning(true);
    try {
      const N = Math.min(referenceSignal.length, desiredSignal.length);
      const xn = referenceSignal.slice(0, N);
      const dn = desiredSignal.slice(0, N);
      const sn = cleanSignal?.length ? cleanSignal.slice(0, N) : null;
      const n0 = artifactSignal?.length ? artifactSignal.slice(0, N) : null;

      // Use default hyperparameters that match common paper defaults
      const order = 32;

      // --- LMS ---
      const tLms0 = performance.now();
      const lms = filterSignalLMS(xn, dn, {
        filterOrder: order,
        stepSize: 0.005,
        returnDiagnostics: true,
      });
      const lmsMs = performance.now() - tLms0;
      // filters.js: Yfiltered = e[n] = cleaned ECG; yNoise = estimated artifact
      const lmsE = lms.Yfiltered;
      const lmsMMSE = sn ? calculateMMSE(sn, lmsE) : NaN;
      const lmsPSNR = sn ? calculatePSNR(sn, lmsE) : NaN;
      const lmsCCF  = sn ? calculateCCF(sn, lmsE) : NaN;
      const n0Lms = sn ? sn.map((v, i) => v - lmsE[i]) : null;
      const lmsSNR = (sn && n0Lms) ? calculateSNR(sn, n0Lms) : NaN;
      const lmsConvMSE = computeMSEHistoryFromAdaptation(lmsE);
      const lmsConvIter = findConvergenceIteration(lmsConvMSE);

      // --- RLS ---
      const tRls0 = performance.now();
      const rls = filterSignalRLS(xn, dn, {
        filterOrder: order,
        forgettingFactor: 0.995,
        regularization: 0.01,
        returnDiagnostics: true,
      });
      const rlsMs = performance.now() - tRls0;
      const rlsE = rls.Yfiltered;
      const rlsMMSE = sn ? calculateMMSE(sn, rlsE) : NaN;
      const rlsPSNR = sn ? calculatePSNR(sn, rlsE) : NaN;
      const rlsCCF  = sn ? calculateCCF(sn, rlsE) : NaN;
      const n0Rls = sn ? sn.map((v, i) => v - rlsE[i]) : null;
      const rlsSNR = (sn && n0Rls) ? calculateSNR(sn, n0Rls) : NaN;
      const rlsConvMSE = computeMSEHistoryFromAdaptation(rlsE);
      const rlsConvIter = findConvergenceIteration(rlsConvMSE);

      // Before (benchmark)
      const mmseBefore = sn ? calculateMMSE(sn, dn) : NaN;
      const psnrBefore = sn ? calculatePSNR(sn, dn) : NaN;
      const ccfBefore  = sn ? calculateCCF(sn, dn) : NaN;
      const snrBefore  = (sn && n0) ? calculateSNR(sn, n0) : NaN;

      const payload = {
        N,
        order,
        before: { mmse: mmseBefore, psnr: psnrBefore, ccf: ccfBefore, snr: snrBefore },
        lms: {
          mmse: lmsMMSE, psnr: lmsPSNR, ccf: lmsCCF, snr: lmsSNR,
          convIter: lmsConvIter, runtimeMs: lmsMs,
          mse: lmsConvMSE,
        },
        rls: {
          mmse: rlsMMSE, psnr: rlsPSNR, ccf: rlsCCF, snr: rlsSNR,
          convIter: rlsConvIter, runtimeMs: rlsMs,
          mse: rlsConvMSE,
        },
      };
      setComparisonData(payload);
    } finally {
      setRunning(false);
    }
  };

  const chartData = useMemo(() => {
    if (!result) return null;
    return {
      datasets: [
        {
          label: `LMS MMSE (μ=0.005, M=${result.order}) · converged @ n=${result.lms.convIter?.toLocaleString()}`,
          data: result.lms.mse,
          borderColor: "#e74c3c",
          backgroundColor: "rgba(231,76,60,0.05)",
          borderWidth: 1.4,
          pointRadius: 0,
          tension: 0.1,
          fill: false,
        },
        {
          label: `RLS MMSE (λ=0.995, M=${result.order}) · converged @ n=${result.rls.convIter?.toLocaleString()}`,
          data: result.rls.mse,
          borderColor: "#2980b9",
          backgroundColor: "rgba(41,128,185,0.05)",
          borderWidth: 1.6,
          pointRadius: 0,
          tension: 0.1,
          fill: false,
        },
      ],
    };
  }, [result]);

  const options = {
    responsive: true,
    animation: false,
    parsing: false,
    interaction: { mode: "nearest", intersect: false, axis: "x" },
    plugins: {
      legend: { display: true, position: "bottom" },
      title: {
        display: true,
        text: `LMS vs RLS — Running MMSE Convergence on first ~${Math.ceil((time||10)*originalFs).toLocaleString()} samples  (Fs=${originalFs} Hz)`,
        font: { size: 14, weight: "bold" },
      },
      tooltip: {
        callbacks: {
          label: (c) => {
            const raw = c.raw ?? c.parsed;
            const x = raw?.x ?? c.parsed?.x ?? c.index;
            const y = raw?.y ?? c.parsed?.y ?? c.formattedValue;
            return `${c.dataset.label} · MMSE(${Number(x).toLocaleString()}) = ${Number(y).toExponential(3)}`;
          },
        },
      },
      zoom: {
        pan: { enabled: true, mode: "x" },
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "xy" },
      },
    },
    scales: {
      x: {
        type: "linear",
        title: { display: true, text: "Sample Index n (Iteration)", font: { weight: "bold" } },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
      y: {
        type: "logarithmic",
        title: { display: true, text: "MMSE (log scale)", font: { weight: "bold" } },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
    },
  };

  const fmt = (v, p = 4) => (Number.isFinite(v) ? Number(v).toFixed(p) : "—");
  const fmtExp = (v) => (Number.isFinite(v) ? Number(v).toExponential(3) : "—");

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <button
        type="button"
        onClick={runComparison}
        disabled={running || !referenceSignal?.length}
        style={{
          background: running ? "#95a5a6" : "linear-gradient(90deg,#2980b9,#8e44ad)",
          color: "white", border: "none",
          padding: "0.6rem 1.1rem", borderRadius: "6px",
          cursor: running ? "progress" : "pointer", fontWeight: "bold",
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
        }}
      >
        {running ? "⏳ Running LMS & RLS comparison…" : "▶ Run LMS vs RLS Comparison (paper benchmark)"}
      </button>

      {!result && (
        <p style={{ fontSize: "0.9rem", color: "#666", marginTop: "0.75rem" }}>
          After running, you'll see a benchmark table (MMSE, PSNR, CCF, SNR, convergence &amp; runtime) +
          an MMSE convergence plot where you can visually compare LMS (stochastic, O(M) per sample, slow) vs RLS
          (deterministic, O(M²) per sample, fast convergence) — per the IJCA 2016 paper by Kamble &amp; Kuntawar.
        </p>
      )}

      {result && (
        <>
          <h4 style={{ marginTop: "1.25rem", marginBottom: "0.5rem" }}>
            Benchmark table — Before vs LMS vs RLS &nbsp;
            <span style={{ fontSize: "0.8rem", fontWeight: "normal", color: "#666" }}>
              (per IJCA 2016 — columns: PSNR, MMSE, CCF, SNR, Conv iter, Runtime)
            </span>
          </h4>
          <div style={{ overflowX: "auto", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderRadius: "6px", background: "white" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem", minWidth: 900 }}>
              <thead>
                <tr style={{ background: "#34495e", color: "white" }}>
                  <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "left" }}>Method</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>Order M</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>MMSE</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>PSNR (dB)</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>CCF (ρ)</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>SNR (dB)</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>Conv. iter.</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>Runtime (ms)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontWeight: "bold", color: "#555" }}>Before (d = s + artifact)</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>—</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>{fmtExp(result.before.mmse)}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>{fmt(result.before.psnr, 2)}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>{fmt(result.before.ccf, 4)}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>{fmt(result.before.snr, 2)}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>—</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>—</td>
                </tr>
                <tr style={{ background: "rgba(231,76,60,0.05)" }}>
                  <td style={{ border: "1px solid #ddd", padding: "8px", fontWeight: "bold", color: "#c0392b" }}>LMS (μ=0.005)</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>{result.order}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>{fmtExp(result.lms.mmse)}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>{fmt(result.lms.psnr, 2)}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>{fmt(result.lms.ccf, 4)}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>{fmt(result.lms.snr, 2)}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>{result.lms.convIter?.toLocaleString()}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>{fmt(result.lms.runtimeMs, 0)}</td>
                </tr>
                <tr style={{ background: "rgba(41,128,185,0.06)", fontWeight: "bold" }}>
                  <td style={{ border: "1px solid #ddd", padding: "8px", color: "#2471a3" }}>✅ RLS (λ=0.995) — paper's recommended method</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>{result.order}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>{fmtExp(result.rls.mmse)}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>{fmt(result.rls.psnr, 2)}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>{fmt(result.rls.ccf, 4)}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>{fmt(result.rls.snr, 2)}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>{result.rls.convIter?.toLocaleString()}</td>
                  <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>{fmt(result.rls.runtimeMs, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: "1.25rem", background: "white", padding: "1rem", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <Line data={chartData} options={options} height={130} />
            <p style={{ fontSize: "0.85rem", color: "#555", marginTop: "0.5rem", lineHeight: "1.5" }}>
              <b>Observation:</b> Per the IJCA 2016 paper, the RLS curve (blue) should converge to a lower MMSE and do so
              in noticeably <em>fewer iterations</em> than LMS (red) because RLS pre-whitens the input via the inverse correlation matrix
              estimate P. Cost is ~O(N·M²) runtime vs LMS's ~O(N·M).
            </p>
          </div>
        </>
      )}
    </div>
  );
};
