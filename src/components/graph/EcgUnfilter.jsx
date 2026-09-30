import React, { useContext, useMemo } from "react";
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
import { SimulationContext } from "../../context/SimulationContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const EcgUnfilter = () => {
  const { cleanSignal, originalFs, datasetMeta, selectedLead, selectedDataset, windowStart, windowLength } =
    useContext(SimulationContext);

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

  const leadName = selectedLead === "A" ? datasetMeta.leadNameA : datasetMeta.leadNameB;

  const plotData = useMemo(() => {
    const N = cleanSignal?.length || 0;
    const start = Math.max(0, Math.min(N - 1, Math.floor(windowStart) || 0));
    const length = Math.max(1, Math.min(N - start, Math.floor(windowLength) || 1));
    const slice = cleanSignal.slice(start, start + length);
    return downsampleByIndexOffset(slice, start, 25000);
  }, [cleanSignal, originalFs, windowStart, windowLength]);

  const data = {
    datasets: [
      {
        label: `Clean ECG s[n] )`,
        data: plotData,
        borderColor: "#1f77b4",
        backgroundColor: "rgba(31, 119, 180, 0.05)",
        fill: false,
        tension: 0.05,
        borderWidth: 1.3,
        pointRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    animation: false,
    parsing: false,
    plugins: {
      legend: { display: true, position: "top" },
      title: {
        display: true,
        text: `Clean ECG s[n] `,
        font: { size: 14, weight: "bold" },
        color: "#222",
      },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `Sample n=${ctx.parsed.x?.toLocaleString()} · Amplitude=${Number(ctx.parsed.y).toFixed(4)} mV`,
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        title: { display: true, text: "Sample Index n", font: { weight: "bold" } },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
      y: {
        type: "linear",
        title: { display: true, text: "Amplitude (mV)", font: { weight: "bold" } },
        grid: { color: "rgba(0,0,0,0.05)" },
      },
    },
  };

  if (!cleanSignal?.length) {
    return <div className="ecg-placeholder">Load a clean ECG dataset (MIT-BIH 109) from Step 1.</div>;
  }

  return (
    <div className="ecg-unfilter-container" style={{ background: "white", borderRadius: "8px", padding: "1rem", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
      <Line data={data} options={options} />
    </div>
  );
};
