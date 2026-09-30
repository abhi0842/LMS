import { useContext, useMemo } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import { computePSD } from "../../utils/psd";
import { Line } from "react-chartjs-2";
import styles from "./ecgFilteredPSD.module.css";

export const EcgFilteredPSD = () => {
  const { filteredSamples, noisySamples, generateECG, originalFs } = useContext(SimulationContext);

  const { psdFiltered, sharedPeak } = useMemo(() => {
    if (!generateECG) return { psdFiltered: null, sharedPeak: 1 };
    const fSig = filteredSamples.length > 0 ? filteredSamples.map(p => p.y) : null;
    const noisySignal = noisySamples?.map((p) => p.y) || [];
    const psdNoisy = noisySignal.length ? computePSD(noisySignal, originalFs) : null;
    const psdAfter = fSig ? computePSD(fSig, originalFs) : null;
    const peak = Math.max(
      ...(psdNoisy?.psd || []),
      ...(psdAfter?.psd || [])
    );
    return {
      psdFiltered: psdAfter,
      sharedPeak: peak || 1,
    };
  }, [filteredSamples, noisySamples, generateECG, originalFs]);

  if (!psdFiltered) return null;

  const yFilt = psdFiltered.psd.map(p => 10 * Math.log10((p + 1e-20) / sharedPeak));
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
      title: {
        display: true,
        text: "After LMS",
        font: { size: 13, weight: "bold" },
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
        min: -80,
        max: 0,
        title: {
          display: true,
          text: "Relative PSD (dB)",
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
