import { useContext, useMemo, useState } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import { computePSD } from "../../utils/psd";
import { Line } from "react-chartjs-2";
import styles from "./ecgFilteredPSD.module.css";

export const EcgFilteredPSD = () => {
  const { filteredSamples, generateECG, originalFs, noisySamples, selectedArtifact, artifactParams, cleanSignal } = useContext(SimulationContext);
  const [useDb, setUseDb] = useState(true);
  const [overlayClean, setOverlayClean] = useState(true);
  const [showBand, setShowBand] = useState(true);

  const { psdFiltered, psdNoisy, psdClean } = useMemo(() => {
    if (!generateECG) return {};
    const fSig = filteredSamples.length > 0 ? filteredSamples.map(p => p.y) : null;
    const nSig = noisySamples && noisySamples.length > 0 ? noisySamples.map(p => p.y) : null;
    const cSig = cleanSignal?.length ? cleanSignal.slice() : null;
    return {
      psdFiltered: fSig ? computePSD(fSig, originalFs) : null,
      psdNoisy: nSig ? computePSD(nSig, originalFs) : null,
      psdClean: cSig ? computePSD(cSig, originalFs) : null,
    };
  }, [filteredSamples, generateECG, originalFs, noisySamples, cleanSignal]);

  if (!psdFiltered) return null;

  const combinedVals = [];
  psdFiltered.psd.forEach(v => { if (v > 0) combinedVals.push(v); });
  psdNoisy?.psd.forEach(v => { if (v > 0) combinedVals.push(v); });
  psdClean?.psd.forEach(v => { if (v > 0) combinedVals.push(v); });
  const refDb = combinedVals.length ? Math.min(...combinedVals) : 1e-20;

  const toDbOrLin = (arr) => useDb
    ? arr.map(p => 10 * Math.log10((p + 1e-20) / refDb))
    : arr.slice();

  const yFilt = toDbOrLin(psdFiltered.psd);
  const yNoisy = psdNoisy ? toDbOrLin(psdNoisy.psd) : null;
  const yClean = psdClean ? toDbOrLin(psdClean.psd) : null;
  const freqs = psdFiltered.freqs;

  const suppression = [];
  if (showBand && psdNoisy) {
    if (selectedArtifact === "PLI") {
      const f = artifactParams.PLI.freq || 50;
      const idx = Math.min(freqs.length - 1, Math.round(f * freqs.length / (originalFs / 2)));
      if (useDb) {
        const before = yNoisy[idx];
        const after = yFilt[idx];
        const att = before - after;
        suppression.push({ label: `@${f.toFixed(0)} Hz: ↓${att.toFixed(1)} dB attenuation`, color: "#dc2626" });
      }
    }
  }
  const annotations = [];
  if (showBand) {
    if (selectedArtifact === "PLI") {
      const f = artifactParams.PLI.freq || 50;
      annotations.push({ bandStart: f - 3, bandEnd: f + 3, label: `PLI notch at ${f.toFixed(0)} Hz`, color: "#dc2626" });
    } else if (selectedArtifact === "BW") {
      annotations.push({ bandStart: 0, bandEnd: 2, label: `BW suppression 0–2 Hz`, color: "#c2410c" });
    } else if (selectedArtifact === "EMG") {
      annotations.push({ bandStart: 20, bandEnd: Math.min(100, originalFs / 2), label: `EMG suppression 20–${Math.min(100, originalFs / 2).toFixed(0)} Hz`, color: "#7c3aed" });
    }
  }

  const datasets = [];
  if (yNoisy && overlayClean !== true) {
    datasets.push({
      label: "Before (noisy d[n]) — faded",
      data: freqs.map((f, i) => ({ x: f, y: yNoisy[i] })),
      borderColor: "#005FA7",
      borderDash: [4, 4],
      borderWidth: 0.9,
      pointRadius: 0,
      tension: 0.15,
      opacity: 0.35,
    });
  }
  if (yClean && overlayClean) {
    datasets.push({
      label: "Clean s[n] reference (ground truth)",
      data: freqs.map((f, i) => ({ x: f, y: yClean[i] })),
      borderColor: "#2563eb",
      borderDash: [7, 5],
      borderWidth: 1.2,
      pointRadius: 0,
      tension: 0.15,
    });
  }
  datasets.push({
    label: "Filtered output",
    data: freqs.map((f, i) => ({ x: f, y: yFilt[i] })),
    borderColor: "#15803d",
    borderWidth: 1.6,
    pointRadius: 0,
    tension: 0.15,
    backgroundColor: "rgba(21, 128, 61, 0.10)",
    fill: true,
  });

  const chartData = { datasets };

  const options = {
    responsive: true,
    animation: false,
    parsing: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: { font: { size: 11 }, boxWidth: 14 },
      },
      title: {
        display: true,
        text: "Filtered output PSD",
        font: { size: 13, weight: "bold" },
        padding: { bottom: 10 },
        color: "#166534",
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const f = Number(ctx.parsed.x);
            const y = Number(ctx.parsed.y);
            const origLabel = ctx.dataset.label;
            if (useDb) return `${origLabel.split("(")[0].trim()} @ ${f.toFixed(1)} Hz:  ${y.toFixed(1)} dB`;
            return `${origLabel.split("(")[0].trim()} @ ${f.toFixed(1)} Hz:  ${Number(ctx.parsed.y).toExponential(2)} V²/Hz`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        min: 0,
        max: originalFs / 2,
        title: {
          display: true,
          text: "Frequency f  (Hz)",
          font: { size: 12, weight: "bold" },
        },
        ticks: { font: { size: 11 } },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
      y: {
        title: {
          display: true,
          text: useDb ? "10·log₁₀(PSD / PSₘᵢₙ)   (dB, relative min)" : "PSD   (V²/Hz)",
          font: { size: 12, weight: "bold" },
        },
        ticks: { font: { size: 11 }, callback: (v) => useDb ? v.toFixed(0) + " dB" : Number(v).toExponential(1) },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
    },
  };

  return (
    <div className={styles.signalContainer} style={{ position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", color: "#166534" }}>After LMS</h3>
        <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.78rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.2rem", cursor: "pointer" }}>
            <input type="checkbox" checked={useDb} onChange={(e) => setUseDb(e.target.checked)} />
            dB scale
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.2rem", cursor: "pointer" }}>
            <input type="checkbox" checked={overlayClean} onChange={(e) => setOverlayClean(e.target.checked)} />
            Overlay s[n]
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.2rem", cursor: "pointer" }}>
            <input type="checkbox" checked={showBand} onChange={(e) => setShowBand(e.target.checked)} />
            Notch
          </label>
        </div>
      </div>
      <Line data={chartData} options={options} />
      {annotations.filter(a => a.label).map((a, i) => (
        <div key={i} style={{
          display: "inline-block",
          marginTop: "0.4rem",
          background: `${a.color}11`,
          border: `1px solid ${a.color}55`,
          color: a.color,
          fontWeight: "bold",
          padding: "0.15rem 0.5rem",
          borderRadius: "3px",
          fontSize: "0.78rem",
          marginRight: "0.35rem",
        }}>
          ✅ {a.label}
        </div>
      ))}
      {suppression.map((s, i) => (
        <div key={"sup" + i} style={{
          display: "inline-block",
          marginTop: "0.4rem",
          background: "#fef3c7",
          border: "1px solid #d97706",
          color: "#92400e",
          fontWeight: "bold",
          padding: "0.15rem 0.5rem",
          borderRadius: "3px",
          fontSize: "0.78rem",
          marginRight: "0.35rem",
        }}>
          📉 {s.label}
        </div>
      ))}
    </div>
  );
};
