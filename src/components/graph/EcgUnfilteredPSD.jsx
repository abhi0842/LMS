import { useContext, useMemo } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import { computePSD } from "../../utils/psd";
import { Line } from "react-chartjs-2";
import styles from "./ecgUnfilteredPSD.module.css";

export const EcgUnfilteredPSD = () => {
  const { rawSamples, generateECG, originalFs, noisySamples, filteredSamples } = useContext(SimulationContext);

  const { psdData, sharedPeak } = useMemo(() => {
    if (!generateECG) return { psdData: null, sharedPeak: 1 };
    const source = noisySamples && noisySamples.length > 0 ? noisySamples : rawSamples;
    if (!source?.length) return { psdData: null, sharedPeak: 1 };
    const beforePsd = computePSD(source.map((p) => p.y), originalFs);
    const afterSignal = filteredSamples?.map((p) => p.y) || [];
    const afterPsd = afterSignal.length ? computePSD(afterSignal, originalFs) : null;
    const peak = Math.max(
      ...beforePsd.psd,
      ...(afterPsd?.psd || [])
    );
    return { psdData: beforePsd, sharedPeak: peak || 1 };
  }, [rawSamples, generateECG, originalFs, noisySamples, filteredSamples]);

  if (!psdData) return null;

  const yVals = psdData.psd.map(p => 10 * Math.log10((p + 1e-20) / sharedPeak));

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
      title: {
        display: true,
        text: "Before LMS",
        font: { size: 13, weight: "bold" },
      },
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
