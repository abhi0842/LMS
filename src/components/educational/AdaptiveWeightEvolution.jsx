import { useContext, useState, useMemo } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

export const AdaptiveWeightEvolution = () => {
  const { diagnostics } = useContext(SimulationContext);
  const [visibleCoeffs, setVisibleCoeffs] = useState(5);

  const chartData = useMemo(() => {
    if (!Array.isArray(diagnostics?.weightsHistory) || diagnostics.weightsHistory.length === 0) return null;

    const weightsHistory = diagnostics.weightsHistory.filter((entry) => Array.isArray(entry));
    if (weightsHistory.length === 0) return null;

    const iterations = weightsHistory.length;
    const numCoeffs = Math.min(visibleCoeffs, weightsHistory[0]?.length || 0);

    const datasets = [];
    const colors = [
      "#e74c3c",
      "#3498db",
      "#2ecc71",
      "#f39c12",
      "#9b59b6",
      "#1abc9c",
      "#e67e22",
      "#34495e",
    ];

    for (let i = 0; i < numCoeffs; i++) {
      datasets.push({
        label: `w${i}`,
        data: weightsHistory.map((w) => w[i]),
        borderColor: colors[i % colors.length],
        backgroundColor: colors[i % colors.length] + "20",
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.1,
        fill: false,
      });
    }

    const labels = Array.from({ length: iterations }, (_, i) => i);

    return { labels, datasets };
  }, [diagnostics, visibleCoeffs]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: true, position: "top" },
        tooltip: { mode: "index", intersect: false },
        zoom: {
          pan: { enabled: true, mode: "x" },
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
        },
      },
      scales: {
        x: {
          type: "linear",
          title: { display: true, text: "Iteration" },
          ticks: { maxTicksLimit: 10 },
        },
        y: {
          title: { display: true, text: "Coefficient Value" },
        },
      },
    }),
    []
  );

  if (!Array.isArray(diagnostics?.weightsHistory) || diagnostics.weightsHistory.length === 0) {
    return (
      <div style={{ padding: "1rem", backgroundColor: "#fff", borderRadius: "8px", marginBottom: "1rem", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Adaptive Weight Evolution</h3>
        <p style={{ margin: "0.5rem 0 0", color: "#666", fontSize: "0.95rem" }}>
          Weight history is not available yet. Run the filter to populate this view.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem", backgroundColor: "#fff", borderRadius: "8px", marginBottom: "1rem", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
          Adaptive Weight Evolution ({diagnostics.algorithm})
        </h3>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label style={{ fontSize: "0.9rem" }}>Show Coefficients:</label>
          <input
            type="number"
            min="1"
            max={diagnostics.weightsHistory[0]?.length || 1}
            value={visibleCoeffs}
            onChange={(e) => setVisibleCoeffs(Number(e.target.value))}
            style={{ width: "60px", padding: "0.25rem", borderRadius: "4px", border: "1px solid #ddd" }}
          />
        </div>
      </div>
      <div style={{ height: "300px" }}>
        {chartData && <Line data={chartData} options={options} />}
      </div>
    </div>
  );
};
