import { useContext, useState, useEffect } from "react";
import {
  SimulationContext,
  DATASETS,
  ARTIFACT_TYPES,
  calculateSNR,
  calculatePSNR,
  calculateMMSE,
  calculateCCF,
} from "../../context/SimulationContext";
import styles from "./rightPanel.module.css";

function useReferencePower(arr) {
  if (!arr?.length) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i] * arr[i];
  return sum / arr.length;
}

export const RightPanel = () => {
  const {
    selectedDataset, setSelectedDataset,
    datasetMeta, selectedLead, switchCleanLead,
    generateECG, loadCleanSignal, loadingState,
    windowStart, windowLength, setWindowStart, setWindowLength,
    selectedArtifact, setSelectedArtifact,
    artifactParams, setArtifactParams,
    applyNoiseTrigger, generateArtifactAndDesired, artifactGenerated,

    cleanSignal, desiredSignal, artifactSignal, referenceSignal,

    config, setConfig,

    metrics, setMetrics,
    setFilteredECG, setApplypsdTrigger, filteredECG,
  } = useContext(SimulationContext);

  const [filterOrder, setFilterOrder] = useState(config.filterOrder ?? 32);
  const [stepSize, setStepSize] = useState(config.stepSize ?? 0.005);

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const signalPower = useReferencePower(referenceSignal);
  const M = Math.max(1, Math.min(256, Math.floor(filterOrder) || 1));
  const muMax = signalPower > 0 ? 1 / (M * signalPower + 1e-8) : 0.01;
  const currentMu = clamp(Number(stepSize) || 0.005, 1e-8, muMax * 0.9);
  const muPct = muMax > 0 ? Math.min(100, (currentMu / muMax) * 100) : 0;

  useEffect(() => {
    if (!applyNoiseTrigger || !artifactGenerated) return;
    const sanitizedOrder = clamp(Math.floor(Number(filterOrder) || 1), 1, 512);
    const muLimit = signalPower > 0 ? 1 / (sanitizedOrder * signalPower + 1e-8) : 0.1;
    const sanitizedMu = clamp(Number(stepSize) || 0.005, 1e-8, muLimit * 0.9);
    setConfig({
      filterType: "LMS",
      filterOrder: sanitizedOrder,
      stepSize: sanitizedMu,
    });
  }, [filterOrder, stepSize, applyNoiseTrigger, artifactGenerated, signalPower, setConfig]);

  useEffect(() => {
    if (!cleanSignal?.length || !desiredSignal?.length || !artifactSignal?.length) return;
    const N = Math.min(cleanSignal.length, desiredSignal.length, artifactSignal.length);
    const s = cleanSignal.slice(0, N);
    const d = desiredSignal.slice(0, N);
    const n0 = artifactSignal.slice(0, N);
    const psnr_before = calculatePSNR(s, d);
    const snr_before = calculateSNR(s, n0);
    const ccf_before = calculateCCF(s, d);
    setMetrics((m) => ({
      ...m,
      psnr_before: psnr_before.toFixed(2),
      snr_before: snr_before.toFixed(2),
      ccf_before: ccf_before.toFixed(4),
    }));
  }, [cleanSignal, desiredSignal, artifactSignal, setMetrics]);

  const setArtifactParam = (type, key, value) => {
    setArtifactParams((prev) => {
      const section = prev[type] || {};
      const next = { ...prev, [type]: { ...section, [key]: value } };
      return next;
    });
  };

  const handleApplyArtifact = () => {
    generateArtifactAndDesired();
  };

  const handleRunLMS = () => {
    if (!artifactGenerated || !referenceSignal.length || !desiredSignal.length) return;
    setFilteredECG(true);
    setApplypsdTrigger(true);
  };

  const muStatusColor = muPct > 80 ? "#c0392b" : muPct > 50 ? "#d47700" : "#27ae60";
  const muStatusText = muPct > 80
    ? "⚠️ Near instability — excess MSE will be large; reduce μ for cleaner steady state."
    : muPct > 50
      ? "⚡ Aggressive learning — fast convergence, moderate excess error."
      : muPct > 15
        ? "✓ Balanced — good tradeoff between speed and accuracy."
        : "🐢 Conservative — slow convergence but very accurate steady state (low EMSE).";

  return (
    <div className={styles.rightPanelContainer}>
      <div className={styles.right}>
        <h2>
          LMS Adaptive Filter — ECG Denoising Lab
        </h2>

        {/* Step 1: Dataset */}
        <div id="datasetSection" className={styles.box}>
          <h3>Step 1: Load Clean ECG Reference s[n]</h3>
          <label>Dataset </label>
          <select
            id="datasetSelector"
            value={selectedDataset}
            onChange={(e) => setSelectedDataset(e.target.value)}
          >
            {DATASETS.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>

         
          <div style={{ display: "flex", gap: "0.5rem" }}>
            
            
          </div>

          <div className={styles.buttonContainer}>
            <button
              type="button"
              id="loadDatasetBtn"
              disabled={loadingState === "primary"}
              onClick={() => loadCleanSignal(selectedDataset)}
            >
              {loadingState === "primary" ? "⏳ Loading dataset..." : "Load Clean ECG"}
            </button>
          </div>

          {generateECG && (
            <>
             
               
               
                  <label style={{ fontSize: "0.85rem", color: "#444", minWidth: "80px" }}>Start n₀</label>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, (datasetMeta.N || 0) - windowLength)}
                    step="1"
                    value={windowStart}
                    onChange={(e) => setWindowStart(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
               

                
                  <label style={{ fontSize: "0.85rem", color: "#444", minWidth: "80px" }}>Length N</label>
                  <input
                    type="range"
                    min="1"
                    max={datasetMeta.N || 1}
                    step="1"
                    value={windowLength}
                    onChange={(e) => setWindowLength(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />


             
            </>
          )}
        </div>

        {/* Step 2: Artifact */}
        <div id="artifactSection" className={styles.box}>
          <h3>Step 2: Add Artifact → d[n] = s[n] + n₀[n]</h3>
          
          <select
            id="artifactSelector"
            value={selectedArtifact}
            onChange={(e) => setSelectedArtifact(e.target.value)}
            disabled={!generateECG}
          >
            {ARTIFACT_TYPES.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>

          {selectedArtifact === "BW" && (
            <>
              <label>BW amplitude (mV)</label>
              <input
                type="number" min="0" max="2" step="0.01"
                value={artifactParams.BW.amplitude}
                onChange={(e) => setArtifactParam("BW", "amplitude", Number(e.target.value))}
                onBlur={(e) => setArtifactParam("BW", "amplitude", clamp(Number(e.target.value) || 0, 0, 2))}
              />
              <label>BW frequency (Hz)</label>
              <input
                type="number" min="0.05" max="2" step="0.01"
                value={artifactParams.BW.freq}
                onChange={(e) => setArtifactParam("BW", "freq", Number(e.target.value))}
                onBlur={(e) => setArtifactParam("BW", "freq", clamp(Number(e.target.value) || 0.33, 0.05, 2))}
              />
            </>
          )}
          {selectedArtifact === "PLI" && (
            <>
              <label>PLI amplitude (mV)</label>
              <input
                type="number" min="0" max="2" step="0.01"
                value={artifactParams.PLI.amplitude}
                onChange={(e) => setArtifactParam("PLI", "amplitude", Number(e.target.value))}
                onBlur={(e) => setArtifactParam("PLI", "amplitude", clamp(Number(e.target.value) || 0, 0, 2))}
              />
              <label>PLI frequency (Hz)</label>
              <input
                type="number" min="45" max="70" step="1"
                value={artifactParams.PLI.freq}
                onChange={(e) => setArtifactParam("PLI", "freq", Number(e.target.value))}
                onBlur={(e) => setArtifactParam("PLI", "freq", clamp(Number(e.target.value) || 50, 45, 70))}
              />
            </>
          )}
          {selectedArtifact === "EMG" && (
            <>
              <label>EMG amplitude (mV, σ)</label>
              <input
                type="number" min="0" max="2" step="0.001"
                value={artifactParams.EMG.amplitude}
                onChange={(e) => setArtifactParam("EMG", "amplitude", Number(e.target.value))}
                onBlur={(e) => setArtifactParam("EMG", "amplitude", clamp(Number(e.target.value) || 0, 0, 2))}
              />
            </>
          )}

          <div className={styles.buttonContainer}>
            <button
              type="button"
              id="addArtifactBtn"
              onClick={handleApplyArtifact}
              disabled={!generateECG}
            >
              Add Artifact → Build d[n] &amp; x[n]
            </button>
          </div>
        </div>

        {/* Step 3: LMS parameters */}
        <div id="filterSection" className={styles.box}>
          <h3>Step 3: LMS Filter Parameters</h3>

          <label>Filter Order M (taps, 1–512)</label>
          <input
            type="number" min="1" max="512" step="1"
            value={filterOrder}
            onChange={(e) => setFilterOrder(Number(e.target.value))}
            onBlur={() => setFilterOrder((o) => clamp(Math.floor(Number(o) || 1), 1, 512))}
          />

          <label>Step Size μ (learning rate)</label>
          <input
            type="number" min="1e-8" max="0.1" step="0.0001"
            value={stepSize}
            onChange={(e) => setStepSize(Number(e.target.value))}
            onBlur={() => setStepSize((s) => clamp(Number(s) || 0.005, 1e-8, 0.1))}
          />
          {applyNoiseTrigger && (
            <>
              
                
             
            </>
          )}

          <div className={styles.buttonContainer}>
            <button
              type="button"
              onClick={handleRunLMS}
              disabled={!artifactGenerated}
            >
               Run LMS
            </button>
          </div>
        </div>

        {/* Step 4: Metrics */}
        {applyNoiseTrigger && filteredECG && (
          <div className={styles.box} style={{ backgroundColor: "#f8f9fa" }}>
            <h3>Step 4: Performance Metrics</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.92rem" }}>
              <thead>
                <tr style={{ backgroundColor: "#2c3e50", color: "white" }}>
                  <th style={{ border: "1px solid #ddd", padding: "6px", textAlign: "left" }}>Metric</th>
                  <th style={{ border: "1px solid #ddd", padding: "6px", textAlign: "center" }}>Before (d vs s)</th>
                  <th style={{ border: "1px solid #ddd", padding: "6px", textAlign: "center" }}>After (e vs s)</th>
                  <th style={{ border: "1px solid #ddd", padding: "6px", textAlign: "center" }}>Δ</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const rows = [];
                  const metricDefs = [
                    {
                      key: "mmse",
                      label: "MSE (lower)",
                      fmt: (v) => v.toFixed(6),
                      before: () => artifactGenerated ? calculateMMSE(cleanSignal, desiredSignal) : null,
                      after: () => Number(metrics.mmse),
                      better: (b, a) => a < b,
                      desc: (b, a, ok) => ok
                        ? `↓ ${(b - a).toFixed(6)}`
                        : `↑ ${(a - b).toFixed(6)}`,
                    },
                    {
                      key: "psnr",
                      label: "PSNR (dB, higher)",
                      fmt: (v) => v.toFixed(2),
                      before: () => Number(metrics.psnr_before),
                      after: () => Number(metrics.psnr_after),
                      better: (b, a) => a > b,
                      desc: (b, a, ok) => ok
                        ? `↑ ${(a - b).toFixed(2)} dB`
                        : `↓ ${(b - a).toFixed(2)} dB`,
                    },
                    {
                      key: "snr",
                      label: "SNR (dB, higher)",
                      fmt: (v) => v.toFixed(2),
                      before: () => Number(metrics.snr_before),
                      after: () => Number(metrics.snr_after),
                      better: (b, a) => a > b,
                      desc: (b, a, ok) => ok
                        ? `↑ ${(a - b).toFixed(2)} dB`
                        : `↓ ${(b - a).toFixed(2)} dB`,
                    },
                    {
                      key: "ccf",
                      label: "Correlation (higher)",
                      fmt: (v) => v.toFixed(4),
                      before: () => Number(metrics.ccf_before),
                      after: () => Number(metrics.ccf_after),
                      better: (b, a) => a > b,
                      desc: (b, a, ok) => ok
                        ? `↑ ${(a - b).toFixed(4)}`
                        : `↓ ${(b - a).toFixed(4)}`,
                    },
                  ];
                  const hasAfter = !!Number(metrics.mmse || 0) || metrics.psnr_after !== "0.00";
                  for (const md of metricDefs) {
                    const b = md.before();
                    const a = hasAfter ? md.after() : null;
                    const ok = a != null && md.better(b, a);
                    rows.push(
                      <tr key={md.key}>
                        <td style={{ border: "1px solid #ddd", padding: "6px", fontWeight: "bold" }}>{md.label}</td>
                        <td style={{ border: "1px solid #ddd", padding: "6px", textAlign: "center" }}>{b != null ? md.fmt(b) : "—"}</td>
                        <td style={{ border: "1px solid #ddd", padding: "6px", textAlign: "center" }}>{a != null ? md.fmt(a) : "—"}</td>
                        <td style={{
                          border: "1px solid #ddd",
                          padding: "6px",
                          textAlign: "center",
                          fontWeight: "bold",
                          color: a == null ? "#aaa" : (ok ? "#27ae60" : "#c0392b"),
                        }}>
                          {a != null ? md.desc(b, a, ok) : "—"}
                        </td>
                      </tr>
                    );
                  }
                  return rows;
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
