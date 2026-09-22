import { useContext, useMemo } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import { computePSD } from "../../utils/psd";
import { Line } from "react-chartjs-2";
import styles from "./ecgUnfilteredPSD.module.css";

export const EcgUnfilteredPSD = () => {
  const { rawSamples, generateECG, originalFs, noisySamples } = useContext(SimulationContext);

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

  const yVals = psdData.psd.map(p => 10 * Math.log10((p + 1e-20) / refDb));

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
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const f = Number(ctx.parsed.x);
            const y = Number(ctx.parsed.y);
            return `PSD @ ${f.toFixed(1)} Hz = ${y.toFixed(1)} dB`;
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
