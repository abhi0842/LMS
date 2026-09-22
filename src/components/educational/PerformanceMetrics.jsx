import { useContext } from "react";
import {
  SimulationContext,
  calculateMMSE,
} from "../../context/SimulationContext";
import styles from "../rightPanel/rightPanel.module.css";

export const PerformanceMetrics = () => {
  const {
    artifactGenerated,
    cleanSignal,
    desiredSignal,
    metrics,
  } = useContext(SimulationContext);

  if (!artifactGenerated) return null;

  const metricDefs = [
    {
      key: "mmse",
      label: "MSE",
      unit: "lower is better",
      fmt: (value) => value.toFixed(6),
      before: calculateMMSE(cleanSignal, desiredSignal),
      after: Number(metrics.mmse),
      better: (before, after) => after < before,
      delta: (before, after) => after < before ? `-${(before - after).toFixed(6)}` : `+${(after - before).toFixed(6)}`,
    },
    {
      key: "psnr",
      label: "PSNR",
      unit: "dB, higher is better",
      fmt: (value) => value.toFixed(2),
      before: Number(metrics.psnr_before),
      after: Number(metrics.psnr_after),
      better: (before, after) => after > before,
      delta: (before, after) => `${after >= before ? "+" : ""}${(after - before).toFixed(2)} dB`,
    },
    {
      key: "snr",
      label: "SNR",
      unit: "dB, higher is better",
      fmt: (value) => value.toFixed(2),
      before: Number(metrics.snr_before),
      after: Number(metrics.snr_after),
      better: (before, after) => after > before,
      delta: (before, after) => `${after >= before ? "+" : ""}${(after - before).toFixed(2)} dB`,
    },
    {
      key: "ccf",
      label: "Correlation",
      unit: "higher is better",
      fmt: (value) => value.toFixed(4),
      before: Number(metrics.ccf_before),
      after: Number(metrics.ccf_after),
      better: (before, after) => after > before,
      delta: (before, after) => `${after >= before ? "+" : ""}${(after - before).toFixed(4)}`,
    },
  ];

  return (
    <section className={styles.box} style={{ backgroundColor: "#f8fafb" }}>
      <h3>Performance Metrics</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.65rem" }}>
        {metricDefs.map((metric) => {
          const improved = metric.better(metric.before, metric.after);
          return (
            <div key={metric.key} style={{ background: "#fff", border: "1px solid #dfe5ea", borderRadius: "8px", padding: "0.7rem", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem" }}>
                <strong style={{ color: "#263746" }}>{metric.label}</strong>
                <span style={{ color: improved ? "#16803c" : "#b42318", fontWeight: "bold", fontSize: "0.85rem" }}>
                  {metric.delta(metric.before, metric.after)}
                </span>
              </div>
              <div style={{ color: "#687684", fontSize: "0.72rem", margin: "0.15rem 0 0.5rem" }}>{metric.unit}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div style={{ background: "#f4f6f8", borderRadius: "5px", padding: "0.4rem 0.5rem" }}>
                  <div style={{ color: "#687684", fontSize: "0.72rem" }}>Before</div>
                  <div style={{ fontWeight: "bold", color: "#344454" }}>{metric.fmt(metric.before)}</div>
                </div>
                <div style={{ background: improved ? "#edf8f0" : "#fff1f0", borderRadius: "5px", padding: "0.4rem 0.5rem" }}>
                  <div style={{ color: "#687684", fontSize: "0.72rem" }}>After LMS</div>
                  <div style={{ fontWeight: "bold", color: improved ? "#16803c" : "#b42318" }}>{metric.fmt(metric.after)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
