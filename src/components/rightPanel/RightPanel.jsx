import { useContext, useState, useEffect } from "react";
import {
  SimulationContext,
  DATASETS,
  ARTIFACT_TYPES,
  calculateSNR,
  calculatePSNR,
  calculateCCF,
} from "../../context/SimulationContext";
import styles from "./rightPanel.module.css";

const LMS_PRESETS = {
  PLI: { filterOrder: 32, stepSize: 0.1 },
  BW: { filterOrder: 64, stepSize: 0.0005 },
  EMG: { filterOrder: 8, stepSize: 0.1 },
};

function useReferencePower(arr) {
  if (!arr?.length) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i] * arr[i];
  return sum / arr.length;
}

export const RightPanel = () => {
  const {
    selectedDataset, setSelectedDataset,
    datasetMeta,
    generateECG, loadCleanSignal, loadingState,
    windowStart, windowLength, setWindowStart, setWindowLength,
    selectedArtifact, setSelectedArtifact,
    applyNoiseTrigger, generateArtifactAndDesired, artifactGenerated,

    cleanSignal, desiredSignal, artifactSignal, referenceSignal,

    config, setConfig,

    setMetrics,
    setFilteredECG, setApplypsdTrigger, filteredECG, setShowMetrics,
  } = useContext(SimulationContext);

  const [filterOrder, setFilterOrder] = useState(config.filterOrder ?? 32);
  const [stepSize, setStepSize] = useState(config.stepSize ?? LMS_PRESETS.PLI.stepSize);

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const signalPower = useReferencePower(referenceSignal);

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

  const handleApplyArtifact = () => {
    generateArtifactAndDesired();
  };

  const handleArtifactChange = (artifact) => {
    setSelectedArtifact(artifact);
    const preset = LMS_PRESETS[artifact];
    setFilterOrder(preset.filterOrder);
    setStepSize(preset.stepSize);
    setConfig({ filterType: "LMS", ...preset });
  };

  const handleRunLMS = () => {
    if (!artifactGenerated || !referenceSignal.length || !desiredSignal.length) return;
    setFilteredECG(true);
    setApplypsdTrigger(false);
  };

  const handleShowPSD = () => {
    if (filteredECG) setApplypsdTrigger(true);
  };

  const handleShowMetrics = () => {
    if (filteredECG) setShowMetrics(true);
  };

  return (
    <div className={styles.rightPanelContainer}>
      <div className={styles.right}>
        

        {/* Step 1: Dataset */}
        <div id="datasetSection" className={styles.box}>
          <h3>Step 1: Load Clean ECG Reference s[n]</h3>
          <label>Dataset</label>
          <select
            id="datasetSelector"
            value={selectedDataset}
            onChange={(e) => setSelectedDataset(e.target.value)}
          >
            {DATASETS.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
          <div className={styles.buttonContainer}>
            <button
              type="button"
              id="loadDatasetBtn"
              disabled={loadingState === "primary"}
              onClick={() => loadCleanSignal(selectedDataset)}
            >
              {loadingState === "primary" ? "⏳ Loading dataset..." : "Load Signal"}
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
          <h3>Step 2: Add Artifact → d[n] = s[n] + v[n]</h3>
          
          <select
            id="artifactSelector"
            value={selectedArtifact}
            onChange={(e) => handleArtifactChange(e.target.value)}
            disabled={!generateECG}
          >
            {ARTIFACT_TYPES.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>

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
            <button
              type="button"
              onClick={handleShowPSD}
              disabled={!filteredECG}
            >
              View PSD
            </button>
            <button
              type="button"
              onClick={handleShowMetrics}
              disabled={!filteredECG}
            >
              View Metrics
            </button>
          </div>
        </div>

        {/* Step 4: Metrics */}
      </div>
    </div>
  );
};
