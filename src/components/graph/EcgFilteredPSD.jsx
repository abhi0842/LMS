import { useContext, useMemo } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import { computePSD } from "../../utils/psd";
import { Line } from "react-chartjs-2";
import styles from "./ecgFilteredPSD.module.css";

export const EcgFilteredPSD = () => {
  const { filteredSamples, generateECG, originalFs } = useContext(SimulationContext);

  const { psdFiltered } = useMemo(() => {
    if (!generateECG) return {};
    const fSig = filteredSamples.length > 0 ? filteredSamples.map(p => p.y) : null;
    return {
      psdFiltered: fSig ? computePSD(fSig, originalFs) : null,
    };
  }, [filteredSamples, generateECG, originalFs]);

  if (!psdFiltered) return null;

  const refDb = Math.min(...psdFiltered.psd.filter(v => v > 0));
  const yFilt = psdFiltered.psd.map(p => 10 * Math.log10((p + 1e-20) / refDb));
  const freqs = psdFiltered.freqs;

  const datasets = [];
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
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const f = Number(ctx.parsed.x);
            const y = Number(ctx.parsed.y);
            const origLabel = ctx.dataset.label;
            return `${origLabel} @ ${f.toFixed(1)} Hz: ${y.toFixed(1)} dB`;
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
          text: "PSD (dB)",
          font: { size: 12, weight: "bold" },
        },
        ticks: { font: { size: 11 }, callback: (v) => v.toFixed(0) + " dB" },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
    },
  };

  return (
    <div className={styles.signalContainer} style={{ position: "relative", width: "100%" }}>
      <Line data={chartData} options={options} />
    </div>
  );
};
