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
import zoomPlugin from "chartjs-plugin-zoom";
import { SimulationContext, ARTIFACT_TYPES } from "../../context/SimulationContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin,
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
  BW: "#b08968",
  PLI: "#b08968",
  EMG: "#b08968",
};

const SubPlot = ({ title, dataArr, color, subtitle, xOffset, height = 150, zoomable = false }) => {
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
        borderWidth: 1.7,
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
      ...(zoomable && {
        zoom: {
          pan: { enabled: true, mode: "x" },
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
        },
      }),
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
      <Line data={chartData} options={options} height={height} />
    </div>
  );
};

export const EcgNoisy = () => {
  const {
    desiredSignal, referenceSignal,
    selectedArtifact, originalFs,
    windowStart, windowLength,
  } = useContext(SimulationContext);

  const artifactMeta = ARTIFACT_TYPES.find((a) => a.id === selectedArtifact) || ARTIFACT_TYPES[0];

  const [desiredSlice, referenceSlice, startOffset, referenceSubtitle] = useMemo(() => {
    const N = desiredSignal?.length || 0;
    const start = Math.max(0, Math.min(N - 1, Math.floor(windowStart) || 0));
    const length = Math.max(1, Math.min(N - start, Math.floor(windowLength) || 1));
    const frequency = selectedArtifact === "PLI" ? "50 Hz" : selectedArtifact === "BW" ? "0.33 Hz" : "Broadband";
    return [
      desiredSignal?.slice(start, start + length) || [],
      referenceSignal?.slice(start, start + length) || [],
      start,
      `${frequency} · full selected window (${(length / originalFs).toFixed(2)} s)`,
    ];
  }, [desiredSignal, referenceSignal, selectedArtifact, originalFs, windowStart, windowLength]);

  if (!desiredSignal?.length) {
    return <div className="ecg-placeholder">Select artifact and add it to the clean ECG in Step 2.</div>;
  }

  const color = ARTIFACT_COLORS[selectedArtifact] || "#e67e22";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <SubPlot
        title={`Noisy Desired Signal d[n] = s[n] + ${selectedArtifact} `}
        subtitle={`${artifactMeta.label}`}
        dataArr={desiredSlice}
        color={color}
        xOffset={startOffset}
      />
      <SubPlot
        title={`Filter Reference x[n] — ${ARTIFACT_TITLES[selectedArtifact] || "Reference x[n]"}`}
        subtitle={referenceSubtitle}
        dataArr={referenceSlice}
        color={color}
        xOffset={startOffset}
        height={180}
        zoomable
      />
    </div>
  );
};
