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
import { SimulationContext, ARTIFACT_TYPES } from "../../context/SimulationContext";

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

const ARTIFACT_TITLES = {
 
  PLI: "Power Line Interference (PLI) Reference Noise x[n]",
   BW: "Baseline Wander (BW) Reference Noise x[n]",
  EMG: "Electromyogram / Muscle (EMG) Reference Noise x[n]",
};

const ARTIFACT_COLORS = {
  BW: "#a0522d",
  PLI: "#9400d3",
  EMG: "#708090",
};

const SubPlot = ({ title, dataArr, color, subtitle, xOffset }) => {
  const plot = useMemo(() => downsampleByIndexOffset(dataArr, xOffset || 0, 25000), [dataArr, xOffset]);
  const chartData = {
    datasets: [
      {
        label: title,
        data: plot,
        borderColor: color,
        backgroundColor: `${color}22`,
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
      legend: { display: false },
      title: {
        display: true,
        text: title + (subtitle ? `   (${subtitle})` : ""),
        font: { size: 13, weight: "bold" },
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
  return (
    <div style={{ background: "white", borderRadius: "6px", padding: "0.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", marginBottom: "0.75rem" }}>
      <Line data={chartData} options={options} height={120} />
    </div>
  );
};

export const EcgNoisy = () => {
  const {
    desiredSignal, artifactSignal, referenceSignal,
    selectedArtifact, originalFs,
    datasetMeta, selectedLead, cleanSignal,
    windowStart, windowLength,
  } = useContext(SimulationContext);

  const artifactMeta = ARTIFACT_TYPES.find((a) => a.id === selectedArtifact) || ARTIFACT_TYPES[0];
  const leadName = selectedLead === "A" ? datasetMeta.leadNameA : datasetMeta.leadNameB;

  const [desiredSlice, artifactSlice, referenceSlice, startOffset] = useMemo(() => {
    const N = desiredSignal?.length || 0;
    const start = Math.max(0, Math.min(N - 1, Math.floor(windowStart) || 0));
    const length = Math.max(1, Math.min(N - start, Math.floor(windowLength) || 1));
    return [
      desiredSignal?.slice(start, start + length) || [],
      artifactSignal?.slice(start, start + length) || [],
      referenceSignal?.slice(start, start + length) || [],
      start,
    ];
  }, [desiredSignal, artifactSignal, referenceSignal, windowStart, windowLength]);

  if (!desiredSignal?.length) {
    return <div className="ecg-placeholder">Select artifact and add it to the clean ECG in Step 2.</div>;
  }

  const color = ARTIFACT_COLORS[selectedArtifact] || "#e67e22";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <SubPlot
        title={`Noisy Desired Signal d[n] = s[n] + ${selectedArtifact}  (Lead ${leadName || "MLII"}, Fs=${originalFs} Hz)`}
        subtitle={`${artifactMeta.label}`}
        dataArr={desiredSlice}
        color="#ff7f0e"
        xOffset={startOffset}
      />
      <SubPlot
        title={`Filter Reference x[n] — ${ARTIFACT_TITLES[selectedArtifact] || "Reference x[n]"}`}
      
        dataArr={referenceSlice}
        color={color}
        xOffset={startOffset}
      />
    </div>
  );
};
