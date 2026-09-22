import React, { useContext, useEffect, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
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
import { filterSignalLMS, calculateMSE } from "../../utils/filters";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

const downsampleByIndexOffset = (arr, offset, maxPoints = 25000) => {
  if (!arr?.length) return [];
  if (arr.length <= maxPoints) {
    return arr.map((v, i) => ({ x: i + offset, y: v }));
  }
  const step = Math.ceil(arr.length / maxPoints);
  const pts = [];
  for (let i = 0; i < arr.length; i += step) pts.push({ x: i + offset, y: arr[i] });
  if (pts[pts.length - 1]?.x !== arr.length - 1 + offset)
    pts.push({ x: arr.length - 1 + offset, y: arr[arr.length - 1] });
  return pts;
};

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

export const EcgFilter = () => {
  const {
    config,
    referenceSignal, desiredSignal, cleanSignal, artifactSignal,
    setDiagnostics, setMetrics, originalFs, setFilteredSamples,
    datasetMeta, selectedLead,
    windowStart, windowLength,
  } = useContext(SimulationContext);

  const result = useMemo(() => {
    if (!referenceSignal?.length || !desiredSignal?.length) return null;

    const N = Math.min(referenceSignal.length, desiredSignal.length);
    if (N < 1) return null;

    const xn = referenceSignal.slice(0, N);
    const dn = desiredSignal.slice(0, N);

    try {
      const out = filterSignalLMS(xn, dn, {
        filterOrder: config.filterOrder,
        stepSize: config.stepSize,
        returnDiagnostics: true,
      });

      const eClean = out.Yfiltered;
      const yEst = out?.yNoise || new Array(N).fill(0);
      const residual = cleanSignal?.length
        ? cleanSignal.slice(0, N).map((v, i) => v - eClean[i])
        : new Array(N).fill(0);

      const mseHistoryFlat = new Array(N);
      for (let i = 0; i < N; i++) mseHistoryFlat[i] = residual[i] * residual[i];
      const mseHistory = computeMSEHistoryFromAdaptation(residual);

      return {
        Yfiltered: yEst,
        EClean: eClean,
        Residual: residual,
        errorHistory: residual.slice(),
        mseHistoryFlat,
        finalWeights: out?.diagnostics?.weightsHistory
          ? out.diagnostics.weightsHistory[out.diagnostics.weightsHistory.length - 1]
          : [],
        weightHistory: out?.diagnostics?.weightsHistory || [],
        mseHistory,
        runtimeMs: 0,
        muUsed: out?.diagnostics?.muUsed ?? config.stepSize,
        muMax: out?.diagnostics?.muMax ?? 0,
        signalPower: out?.diagnostics?.signalPower ?? 0,
      };
    } catch (err) {
      console.error("LMS filter crashed:", err);
      return null;
    }
  }, [referenceSignal, desiredSignal, config.filterOrder, config.stepSize, cleanSignal]);

  useEffect(() => {
    if (!result || !cleanSignal?.length) return;
    const N = Math.min(cleanSignal.length, result.EClean.length);
    const s = cleanSignal.slice(0, N);
    const eClean = result.EClean.slice(0, N);
    const n0 = artifactSignal?.slice(0, N);

    const residualNoise = s.map((v, i) => v - eClean[i]);
    const mmseAfter = calculateMMSE(s, eClean);
    const psnrAfter = calculatePSNR(s, eClean);
    const snrAfter = calculateSNR(s, residualNoise);
    const ccfAfter = calculateCCF(s, eClean);

    const d = desiredSignal?.slice(0, N) || [];
    const mmseBefore = d.length ? calculateMMSE(s, d) : 0;
    const psnrBefore = d.length ? calculatePSNR(s, d) : 0;
    const snrBefore = n0?.length ? calculateSNR(s, n0) : 0;
    const ccfBefore = d.length ? calculateCCF(s, d) : 0;

    setMetrics({
      algorithm: "LMS",
      order: config.filterOrder,
      mmse: mmseAfter.toFixed(6),
      mmse_before: mmseBefore.toFixed(6),
      psnr_before: psnrBefore.toFixed(2),
      psnr_after: psnrAfter.toFixed(2),
      psnr_improvement: (psnrAfter - psnrBefore).toFixed(2),
      snr_before: snrBefore.toFixed(2),
      snr_after: snrAfter.toFixed(2),
      snr_improvement: (snrAfter - snrBefore).toFixed(2),
      ccf_before: ccfBefore.toFixed(4),
      ccf_after: ccfAfter.toFixed(4),
      ccf_improvement: (ccfAfter - ccfBefore).toFixed(4),
    });

    setDiagnostics({
      algorithm: "LMS",
      filterOrder: config.filterOrder,
      mseHistory: result.mseHistoryFlat,
      mseHistoryChart: result.mseHistory,
      errorHistory: result.errorHistory,
      finalWeights: result.finalWeights,
      weightHistory: result.weightHistory,
      runtimeMs: result.runtimeMs,
      finalMSE: mmseAfter,
      residual: calculateMSE(s, eClean),
      Yfiltered: result.Yfiltered,
      EClean: result.EClean,
      N,
      muUsed: result.muUsed,
      muMax: result.muMax,
      signalPower: result.signalPower,
    });

    setFilteredSamples(result.EClean.map((y, i) => ({ x: i / originalFs, y })));
  }, [result, cleanSignal, artifactSignal, desiredSignal, config.filterOrder, originalFs, setMetrics, setDiagnostics, setFilteredSamples]);

  if (!result) return null;

  const Ntotal = result.EClean.length || 0;
  const startIdx = Math.max(0, Math.min(Ntotal - 1, Math.floor(windowStart) || 0));
  const lengthIdx = Math.max(1, Math.min(Ntotal - startIdx, Math.floor(windowLength) || 1));
  const endIdx = startIdx + lengthIdx;
  const sSlice = cleanSignal?.slice(startIdx, endIdx) || [];
  const eSlice = result.EClean.slice(startIdx, endIdx);
  const dSlice = desiredSignal?.slice(startIdx, endIdx) || [];

  const leadName = selectedLead === "A" ? datasetMeta.leadNameA : datasetMeta.leadNameB;
  const algoLine = `LMS  ·  M=${config.filterOrder}  ·  μ=${config.stepSize.toExponential(2)}`;

  const mainChartData = {
    datasets: [
      {
        label: `Clean Reference s[n] — ${leadName || "MLII"}`,
        data: downsampleByIndexOffset(sSlice, startIdx, 20000),
        borderColor: "#2563eb",
        borderWidth: 1.8,
        borderDash: [6, 4],
        pointRadius: 0,
        tension: 0.05,
      },
      {
        label: `Noisy Desired d[n] = s + artifact`,
        data: downsampleByIndexOffset(dSlice, startIdx, 20000),
        borderColor: "#ff7f0e",
        borderWidth: 1.1,
        pointRadius: 0,
        tension: 0.05,
        opacity: 0.65,
      },
      {
        label: `LMS Output e[n] = d[n] − ŷ[n]`,
        data: downsampleByIndexOffset(eSlice, startIdx, 20000),
        borderColor: "#16a34a",
        borderWidth: 2.2,
        pointRadius: 0,
        tension: 0.05,
      },
    ],
  };

  const mainOptions = {
    responsive: true,
    animation: false,
    parsing: false,
    interaction: { mode: "nearest", intersect: false, axis: "x" },
    plugins: {
      legend: { display: true, position: "bottom", labels: { boxWidth: 16, font: { size: 12 } } },
      title: {
        display: true,
        text: `(a)  Time-Domain Comparison  ·  ${algoLine}`,
        font: { size: 14, weight: "bold" },
        color: "#111",
        padding: { bottom: 14 },
      },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `${ctx.dataset.label}   @ n=${ctx.parsed.x?.toLocaleString()}   :  ${Number(ctx.parsed.y).toFixed(4)} mV`,
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
        title: { display: true, text: "Sample Index n", font: { weight: "bold" } },
        grid: { color: "rgba(0,0,0,0.06)" },
      },
      y: {
        type: "linear",
        title: { display: true, text: "Amplitude (mV)", font: { weight: "bold" } },
        grid: { color: "rgba(0,0,0,0.06)" },
      },
    },
  };

  return (
    <div
      id="ecg-filter-container"
      style={{
        background: "white", borderRadius: "8px",
        padding: "1rem 1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        marginTop: "1rem",
      }}
    >
      <Line data={mainChartData} options={mainOptions} height={190} />
    </div>
  );
};
