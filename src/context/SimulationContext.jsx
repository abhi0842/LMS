/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { guideSteps } from "../guideSteps";
import {
  addBaselineWander,
  addPowerlineNoise,
  addMuscleNoise,
} from "../utils/addNoise";

export const SimulationContext = createContext();

export const calculateSNR = (signal, noise) => {
  const count = Math.min(signal?.length ?? 0, noise?.length ?? 0);
  if (!count) return 0;
  let signalPower = 0;
  let noisePower = 0;
  for (let n = 0; n < count; n++) {
    signalPower += signal[n] * signal[n];
    noisePower += noise[n] * noise[n];
  }
  if (noisePower === 0) return 100;
  return 10 * Math.log10(signalPower / noisePower);
};

export const calculatePSNR = (clean, distorted) => {
  const count = Math.min(clean?.length ?? 0, distorted?.length ?? 0);
  if (!count) return 0;
  let maxAmp = -Infinity;
  let minAmp = Infinity;
  for (let i = 0; i < count; i++) {
    if (clean[i] > maxAmp) maxAmp = clean[i];
    if (clean[i] < minAmp) minAmp = clean[i];
  }
  const peak = maxAmp - minAmp;
  if (!Number.isFinite(peak) || peak <= 0) return 0;
  let sumSqErr = 0;
  for (let i = 0; i < count; i++) {
    const err = clean[i] - distorted[i];
    sumSqErr += err * err;
  }
  const mse = sumSqErr / count;
  if (mse <= 0) return 100;
  return 10 * Math.log10((peak * peak) / mse);
};

export const calculateMMSE = (clean, distorted) => {
  const count = Math.min(clean?.length ?? 0, distorted?.length ?? 0);
  if (!count) return 0;
  let sumSq = 0;
  for (let i = 0; i < count; i++) {
    const e = clean[i] - distorted[i];
    sumSq += e * e;
  }
  return sumSq / count;
};

export const calculateCCF = (clean, estimated) => {
  const n = Math.min(clean?.length ?? 0, estimated?.length ?? 0);
  if (n < 2) return 0;
  let mx = 0; let my = 0;
  for (let i = 0; i < n; i++) { mx += clean[i]; my += estimated[i]; }
  mx /= n; my /= n;
  let num = 0; let dx = 0; let dy = 0;
  for (let i = 0; i < n; i++) {
    const xc = clean[i] - mx; const yc = estimated[i] - my;
    num += xc * yc;
    dx += xc * xc; dy += yc * yc;
  }
  const den = Math.sqrt(dx * dy);
  if (den === 0) return 0;
  return num / den;
};

export const DATASETS = [
  { id: "109", file: "109", label: "Dataset 109 ", fs: 360 },
];

export const ARTIFACT_TYPES = [
  { id: "PLI", label: "Power Line Interference (50 Hz)" },
  { id: "BW", label: "Baseline Wander" },
  { id: "EMG", label: "Muscle Noise (EMG)" },
];

const ARTIFACT_SETTINGS = {
  PLI: { amplitude: 0.08, frequency: 50 },
  BW: { amplitude: 0.2, frequency: 0.33 },
  EMG: { amplitude: 0.04 },
};

export const SimulationProvider = ({ children }) => {
  const [time, setTime] = useState(10);
  const [originalFs, setOriginalFs] = useState(360);

  const [windowStart, setWindowStart] = useState(0);
  const [windowLength, setWindowLength] = useState(3600);

  const [selectedDataset, setSelectedDataset] = useState("109");
  const [datasetMeta, setDatasetMeta] = useState({
    leadNameA: "MLII", leadNameB: "V1", N: 0,
  });
  const [cleanSignalA, setCleanSignalA] = useState([]);
  const [cleanSignalB, setCleanSignalB] = useState([]);
  const [selectedLead, setSelectedLead] = useState("A");
  const cleanSignal = selectedLead === "A" ? cleanSignalA : cleanSignalB;

  const cleanSamples = cleanSignal.map((y, i) => ({ x: i / originalFs, y }));

  const [selectedArtifact, setSelectedArtifact] = useState("PLI");
  const [artifactSignal, setArtifactSignal] = useState([]);
  const [artifactSamples, setArtifactSamples] = useState([]);
  const [artifactGenerated, setArtifactGenerated] = useState(false);
  const regenerateOn = { BW: false, PLI: false, EMG: true };

  const [desiredSignal, setDesiredSignal] = useState([]);
  const [desiredSamples, setDesiredSamples] = useState([]);
  const [referenceSignal, setReferenceSignal] = useState([]);

  const [filteredSamples, setFilteredSamples] = useState([]);
  const [filteredECG, setFilteredECG] = useState(false);

  const [config, setConfig] = useState({
    filterType: "LMS",
    filterOrder: 32,
    stepSize: 0.1,
  });

  const [metrics, setMetrics] = useState({
    algorithm: "LMS",
    order: 32,
    mmse: "0.000000",
    psnr_before: "0.00",
    psnr_after: "0.00",
    psnr_improvement: "0.00",
    snr_before: "0.00",
    snr_after: "0.00",
    snr_improvement: "0.00",
    ccf_before: "0.0000",
    ccf_after: "0.0000",
    ccf_improvement: "0.0000",
  });

  const [diagnostics, setDiagnostics] = useState(null);

  const [generateECG, setGenerateECG] = useState(false);
  const [applyNoiseTrigger, setApplyNoiseTrigger] = useState(false);
  const [applypsdTrigger, setApplypsdTrigger] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);

  const [showCleanPlot, setShowCleanPlot] = useState(false);
  const [showNoisyPlots, setShowNoisyPlots] = useState(false);

  const [loadingState, setLoadingState] = useState("idle");

  const [showInstruction, setShowInstruction] = useState(false);
  const buttonRef = useRef(null);
  const instructionPanelRef = useRef(null);
  const [screen] = useState("simulation");

  const [guideActive, setGuideActive] = useState(false);
  const [step, setStep] = useState(0);
  const [actions, setActions] = useState({});
  const markAction = (action) => setActions((prev) => ({ ...prev, [action]: true }));
  const resetGuideActions = () => setActions({});
  const steps = guideSteps;
  const currentStep = steps[step];
  const canProceed = !currentStep?.requiredAction || actions[currentStep.requiredAction];
  useEffect(() => {
    if (currentStep?.requiredAction && actions[currentStep.requiredAction]) {
      setStep((prev) => Math.min(steps.length - 1, prev + 1));
    }
  }, [actions, currentStep, steps.length]);

  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : base + "/";
  const assetPath = (name) => normalizedBase + name;

  const parseMlbihCsv = useCallback((text) => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return null;
    const header = lines[0].split(",").map((h) => h.trim());
    const leadAIdx = header.findIndex((h) => h.toUpperCase() === "MLII");
    const leadBIdx = header.findIndex((h) =>
      h.toUpperCase() === "V1" || h.toUpperCase() === "V2" || h.toUpperCase() === "V5"
    );
    const idxA = leadAIdx >= 0 ? leadAIdx : 0;
    const idxB = leadBIdx >= 0 ? leadBIdx : (header.length > 1 ? 1 : 0);
    const fs = 360;
    const A = []; const B = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      const a = Number.parseFloat(cols[idxA]);
      const b = Number.parseFloat(cols[idxB]);
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      A.push(a); B.push(b);
    }
    if (A.length < 2) return null;
    return {
      fs,
      leadNameA: header[idxA],
      leadNameB: header[idxB],
      A, B,
      N: A.length,
    };
  }, []);

  const loadCleanSignal = useCallback(async (datasetId = selectedDataset) => {
    const ds = DATASETS.find((d) => d.id === datasetId) || DATASETS[0];
    try {
      setLoadingState("primary");
      const res = await fetch(assetPath(ds.file));
      if (!res.ok) throw new Error(`Failed to load dataset ${ds.file}: ${res.status}`);
      const text = await res.text();
      const parsed = parseMlbihCsv(text);
      if (!parsed) throw new Error(`${ds.file} parse failed`);

      const MAX_SAMPLES = 10000;
      const trimmedA = parsed.A.slice(0, MAX_SAMPLES);
      const trimmedB = parsed.B.slice(0, MAX_SAMPLES);
      const trimmedN = trimmedA.length;

      setOriginalFs(parsed.fs);
      setDatasetMeta({
        leadNameA: parsed.leadNameA,
        leadNameB: parsed.leadNameB,
        N: trimmedN,
      });
      setCleanSignalA(trimmedA);
      setCleanSignalB(trimmedB);
      setWindowStart(0);
      setWindowLength(Math.min(trimmedN, 3600));
      setGenerateECG(true);
      setShowCleanPlot(true);

      setArtifactSignal([]); setArtifactSamples([]);
      setArtifactGenerated(false); setApplyNoiseTrigger(false); setShowNoisyPlots(false);
      setDesiredSignal([]); setDesiredSamples([]); setReferenceSignal([]);
      setFilteredECG(false); setApplypsdTrigger(false); setShowMetrics(false); setDiagnostics(null);

      markAction("GENERATE_SIGNAL");
    } catch (e) { console.error(e); }
    finally {
      setLoadingState((s) => s === "primary" ? "idle" : s);
    }
  }, [selectedDataset, parseMlbihCsv, assetPath]);

  const generateArtifactAndDesired = useCallback(() => {
    if (!cleanSignal?.length) {
      setArtifactGenerated(false);
      return;
    }
    const N = cleanSignal.length;
    const fs = originalFs;
    const zeros = new Array(N).fill(0);

    let noise; let ref;
    if (selectedArtifact === "BW") {
      const { amplitude, frequency } = ARTIFACT_SETTINGS.BW;
      noise = addBaselineWander(zeros, fs, amplitude, frequency);
      ref = zeros.map((_, i) =>
        amplitude * 0.85 * Math.sin(2 * Math.PI * frequency * (i / fs) + 0.25)
        + (Math.random() - 0.5) * amplitude * 0.08
      );
    } else if (selectedArtifact === "PLI") {
      const { amplitude, frequency } = ARTIFACT_SETTINGS.PLI;
      noise = addPowerlineNoise(zeros, fs, amplitude, frequency);
      ref = zeros.map((_, i) =>
        amplitude * 0.9 * Math.sin(2 * Math.PI * frequency * (i / fs) + 0.2)
        + (Math.random() - 0.5) * amplitude * 0.08
      );
    } else {
      const { amplitude } = ARTIFACT_SETTINGS.EMG;
      noise = addMuscleNoise(zeros, amplitude);
      const delay = Math.max(1, Math.floor(fs * 0.01));
      ref = noise.map((_, i) =>
        noise[Math.min(N - 1, i + delay)] * 0.8 + (Math.random() - 0.5) * amplitude * 0.16
      );
    }

    const desired = cleanSignal.map((v, i) => v + noise[i]);
    const noiseSamps = noise.map((y, i) => ({ x: i / fs, y }));
    const desiredSamps = desired.map((y, i) => ({ x: i / fs, y }));

    setArtifactSignal(noise);
    setArtifactSamples(noiseSamps);
    setDesiredSignal(desired);
    setDesiredSamples(desiredSamps);
    setReferenceSignal(ref);
    setArtifactGenerated(true);
    setApplyNoiseTrigger(true);
    setShowNoisyPlots(true);
    setFilteredECG(false);
    setApplypsdTrigger(false);
    setShowMetrics(false);
    setDiagnostics(null);
    markAction("ADD_NOISE");
  }, [cleanSignal, originalFs, selectedArtifact]);

  const switchCleanLead = useCallback((which) => {
    if (which !== selectedLead) {
      setSelectedLead(which);
      setArtifactSignal([]); setArtifactGenerated(false); setApplyNoiseTrigger(false);
      setDesiredSignal([]); setReferenceSignal([]);
      setFilteredECG(false); setApplypsdTrigger(false); setShowMetrics(false); setDiagnostics(null);
    }
  }, [selectedLead]);

  const primarySignal = desiredSignal;
  const primarySamples = desiredSamples;
  const noiseSignal = artifactSignal;
  const rawSamples = cleanSamples;
  const noisySamples = desiredSamples;

  const clampWindow = (start, length, total) => {
    const N = Math.max(0, total || 0);
    const L = Math.max(1, Math.min(N || 1, Math.floor(length) || 1));
    const S = Math.max(0, Math.min(N - L, Math.floor(start) || 0));
    return { windowStart: S, windowLength: L };
  };

  const setWindowStartSafe = (s) => {
    const total = datasetMeta?.N || cleanSignal?.length || 0;
    const { windowStart: S, windowLength: L } = clampWindow(s, windowLength, total);
    setWindowStart(S);
    if (L !== windowLength) setWindowLength(L);
  };

  const setWindowLengthSafe = (l) => {
    const total = datasetMeta?.N || cleanSignal?.length || 0;
    const { windowStart: S, windowLength: L } = clampWindow(windowStart, l, total);
    setWindowLength(L);
    if (S !== windowStart) setWindowStart(S);
  };

  return (
    <SimulationContext.Provider
      value={{
        time, setTime, originalFs,
        windowStart, windowLength,
        setWindowStart: setWindowStartSafe,
        setWindowLength: setWindowLengthSafe,

        selectedDataset, setSelectedDataset,
        datasetMeta,
        selectedLead, switchCleanLead,
        loadCleanSignal,

        cleanSignal, cleanSamples,
        cleanSignalA, cleanSignalB,
        setShowCleanPlot, showCleanPlot,
        generateECG, setGenerateECG,

        selectedArtifact, setSelectedArtifact,
        generateArtifactAndDesired,
        artifactSignal, artifactSamples,
        artifactGenerated, applyNoiseTrigger, setApplyNoiseTrigger,
        regenerateOn,

        desiredSignal, desiredSamples,
        referenceSignal,
        setShowNoisyPlots, showNoisyPlots,

        primarySignal, primarySamples,
        noiseSignal,
        rawSamples, noisySamples,

        filteredSamples, setFilteredSamples,
        filteredECG, setFilteredECG,
        applypsdTrigger, setApplypsdTrigger,
        showMetrics, setShowMetrics,

        config, setConfig,

        metrics, setMetrics,
        diagnostics, setDiagnostics,

        loadingState,

        showInstruction, setShowInstruction,
        buttonRef, instructionPanelRef, screen,

        guideActive, setGuideActive, step, setStep, steps,
        actions, markAction, resetGuideActions, canProceed,

        assetPath,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};
