import { useContext, useMemo, useState } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import { computePSD } from "../../utils/psd";
import { Line } from "react-chartjs-2";
import styles from "./ecgUnfilteredPSD.module.css";

export const EcgUnfilteredPSD = () => {
  const { rawSamples, generateECG, originalFs, noisySamples, selectedArtifact, artifactParams } = useContext(SimulationContext);
  const [useDb, setUseDb] = useState(true);
  const [showBand, setShowBand] = useState(true);

  const psdData = useMemo(() => {
    if (!generateECG) return null;
    const source = noisySamples && noisySamples.length > 0 ? noisySamples : rawSamples;
    if (!source || source.length === 0) return null;
    const signal = source.map((p) => p.y);
    return computePSD(signal, originalFs);
  }, [rawSamples, generateECG, originalFs, noisySamples]);

  if (!psdData) return null;

  const minPsd = Math.min(...psdData.psd.filter(v => v > 0));
  const refDb = minPsd;

  const yVals = useDb
    ? psdData.psd.map(p => 10 * Math.log10((p + 1e-20) / refDb))
    : psdData.psd;

  const annotations = [];
  if (showBand) {
    if (selectedArtifact === "PLI") {
      const f = artifactParams.PLI.freq || 50;
      const idx = Math.min(psdData.freqs.length - 1, Math.round(f * psdData.freqs.length / (originalFs / 2)));
      annotations.push({ x: f, y: yVals[idx], label: `PLI peak ${f.toFixed(0)} Hz`, color: "#dc2626" });
    } else if (selectedArtifact === "BW") {
      const endF = 2;
      annotations.push({ bandStart: 0, bandEnd: endF, label: `BW band 0–${endF.toFixed(0)} Hz`, color: "#c2410c" });
    } else if (selectedArtifact === "EMG") {
      annotations.push({ bandStart: 20, bandEnd: Math.min(100, originalFs / 2), label: `EMG band 20–${Math.min(100, originalFs / 2).toFixed(0)} Hz`, color: "#7c3aed" });
    }
  }

  const bgBands = [];
  annotations.forEach(a => {
    if (a.bandStart !== undefined) {
      bgBands.push({
        type: "box",
        xMin: a.bandStart,
        xMax: a.bandEnd,
        backgroundColor: `${a.color}15`,
        borderColor: `${a.color}55`,
        borderWidth: 1,
        drawTime: "beforeDatasetsDraw",
      });
    }
  });

  const chartData = {
    datasets: [
      {
        label: "Noisy input",
        data: psdData.freqs.map((f, i) => ({ x: f, y: yVals[i] })),
        borderColor: "#005FA7",
        borderWidth: 1.2,
        pointRadius: 0,
        tension: 0.15,
        backgroundColor: "rgba(0, 95, 167, 0.08)",
        fill: true,
      },
    ],
  };

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
        text: "Noisy input PSD",
        font: { size: 13, weight: "bold" },
        padding: { bottom: 10 },
        color: "#1e3a8a",
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const f = Number(ctx.parsed.x);
            const y = Number(ctx.parsed.y);
            const p = psdData.psd[ctx.dataIndex];
            if (useDb) return `PSD @ ${f.toFixed(1)} Hz  =  ${y.toFixed(1)} dB re min  (${p.toExponential(2)} V²/Hz)`;
            return `PSD @ ${f.toFixed(1)} Hz  =  ${p.toExponential(2)} V²/Hz`;
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
          text: useDb ? "10·log₁₀(PSD / PSₙₘᵢₙ)   (dB)" : "PSD   (V²/Hz)",
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
        <h3 style={{ margin: 0, fontSize: "1rem", color: "#1e3a8a" }}>Before LMS</h3>
        <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.78rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.2rem", cursor: "pointer" }}>
            <input type="checkbox" checked={useDb} onChange={(e) => setUseDb(e.target.checked)} />
            dB scale
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.2rem", cursor: "pointer" }}>
            <input type="checkbox" checked={showBand} onChange={(e) => setShowBand(e.target.checked)} />
            Highlight band
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
          🔴 {a.label}
        </div>
      ))}
    </div>
  );
};
