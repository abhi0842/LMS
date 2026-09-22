import { useContext, useState } from "react";
import { SimulationContext } from "../../context/SimulationContext";

export const LMSAlgorithmExplanation = () => {
  const { config, referenceSignal, diagnostics } = useContext(SimulationContext);
  const [step, setStep] = useState(0);

  const signalPower = useMemoPower(referenceSignal);
  const M = config.filterOrder;
  const mu = config.stepSize;
  const muMax = signalPower > 0 ? 1 / (M * signalPower + 1e-8) : 0.01;
  const muPct = muMax > 0 ? Math.min(100, (mu / muMax) * 100) : 0;

  const steps = [
    {
      title: "Step 1 — Form Tap-Input Vector x[n]",
      formula: "x[n] = [ x[n], x[n−1], …, x[n−M+1] ]ᵀ",
      description:
        "At each sample n, we collect M consecutive samples from the reference input into a column vector. This creates a sliding window over the reference signal that captures the temporal context needed by the FIR filter. M (filter order) determines how much 'memory' the filter has.",
      color: "#3498db",
      icon: "📥",
    },
    {
      title: "Step 2 — Compute Filter Output y[n] = wᵀ[n]·x[n]",
      formula: "y[n] = Σₖ₌₀ᴹ⁻¹ wₖ[n] · x[n−k]",
      description:
        "Take the inner product (dot product) of the current weight vector w[n] with the tap-input vector x[n]. This gives the filter's current estimate of the artifact component. In ANC mode, y[n] ≈ n₀[n] — the noise we want to remove from d[n].",
      color: "#2ecc71",
      icon: "⚙️",
    },
    {
      title: "Step 3 — Compute A Priori Error e[n]",
      formula: "e[n] = d[n] − y[n]",
      description:
        "Subtract the filter output from the desired signal. In our ECG denoiser, e[n] is the cleaned ECG (≈ s[n]), because y[n] estimates and removes the artifact n₀[n] from d[n] = s[n]+n₀[n]. The magnitude of e[n] tells LMS how wrong its current weights are — the error drives adaptation.",
      color: "#e74c3c",
      icon: "📉",
    },
    {
      title: "Step 4 — Update Weights (Widrow-Hoff LMS Rule)",
      formula: "w[n+1] = w[n] + μ · e[n] · x[n]",
      description:
        "This is the heart of LMS! Move each weight wₖ a small step 'downhill' along the instantaneous squared-error gradient. The step size μ controls the learning rate. Geometrically: if e[n]·xₖ[n] is positive, wₖ is too small (increase it); if negative, wₖ is too large (decrease it). Over many samples, this stochastic approximation converges to the Wiener-Hopf optimum wₒₚₜ = Rₓₓ⁻¹·rₓ𝒹.",
      color: "#f39c12",
      icon: "🔄",
    },
  ];

  const s = steps[step];

  return (
    <div
      style={{
        background: "white",
        borderRadius: "8px",
        padding: "1rem 1.25rem",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        marginTop: "1rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
          🧮 LMS Algorithm Walkthrough — Iteration n → n+1
        </h3>
        <div style={{ display: "flex", gap: "0.35rem" }}>
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              title={`Step ${i + 1}`}
              style={{
                width: "28px", height: "28px",
                borderRadius: "50%",
                border: i === step ? `2px solid ${s.color}` : "2px solid #ccc",
                background: i === step ? s.color : "#fff",
                color: i === step ? "#fff" : "#555",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "0.85rem",
                transition: "all 0.15s",
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          borderLeft: `5px solid ${s.color}`,
          background: `${s.color}0F`,
          padding: "0.75rem 1rem",
          borderRadius: "0 6px 6px 0",
          marginBottom: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <span style={{ fontSize: "1.4rem" }}>{s.icon}</span>
          <h4 style={{ margin: 0, fontSize: "1rem", color: s.color }}>{s.title}</h4>
        </div>
        <div
          style={{
            fontFamily: '"Cambria Math", "Times New Roman", serif',
            fontSize: "1.05rem",
            background: "#fff",
            padding: "0.4rem 0.75rem",
            borderRadius: "4px",
            margin: "0.5rem 0",
            border: `1px dashed ${s.color}66`,
            display: "inline-block",
          }}
        >
          {s.formula}
        </div>
        <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.92rem", lineHeight: 1.55, color: "#333" }}>
          {s.description}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginTop: "0.75rem" }}>
        <div style={{ background: "#f8f9fa", padding: "0.5rem 0.75rem", borderRadius: "6px", fontSize: "0.88rem" }}>
          <div style={{ fontWeight: "bold", color: "#2c3e50", marginBottom: "0.2rem" }}>Filter Order M</div>
          <div style={{ fontSize: "1.15rem", fontFamily: "monospace" }}>{M} taps</div>
          <div style={{ color: "#666", fontSize: "0.78rem", marginTop: "0.15rem" }}>
            Memory length of the FIR filter
          </div>
        </div>
        <div style={{ background: "#fff8e7", padding: "0.5rem 0.75rem", borderRadius: "6px", fontSize: "0.88rem" }}>
          <div style={{ fontWeight: "bold", color: "#b76b00", marginBottom: "0.2rem" }}>Step Size μ</div>
          <div style={{ fontSize: "1.15rem", fontFamily: "monospace" }}>{mu.toExponential(2)}</div>
          <div style={{ height: "6px", background: "#eee", borderRadius: "3px", marginTop: "0.25rem", overflow: "hidden" }}>
            <div
              style={{
                width: `${muPct}%`,
                height: "100%",
                background: muPct > 80 ? "#e74c3c" : muPct > 50 ? "#f39c12" : "#2ecc71",
                transition: "width 0.2s",
              }}
            />
          </div>
          <div style={{ color: "#666", fontSize: "0.78rem", marginTop: "0.15rem" }}>
            {muPct.toFixed(0)}% of μ<sub>max</sub> ≈ {muMax.toExponential(2)}
          </div>
        </div>
        <div style={{ background: "#eefbf2", padding: "0.5rem 0.75rem", borderRadius: "6px", fontSize: "0.88rem" }}>
          <div style={{ fontWeight: "bold", color: "#1e6b32", marginBottom: "0.2rem" }}>Convergence Mode</div>
          <div style={{ fontSize: "1.15rem", fontFamily: "monospace" }}>
            {muPct > 75 ? "Fast / Noisy" : muPct > 25 ? "Balanced" : "Slow / Accurate"}
          </div>
          <div style={{ color: "#666", fontSize: "0.78rem", marginTop: "0.15rem" }}>
            Based on current μ / M ratio
          </div>
        </div>
      </div>

      {diagnostics?.weightHistory?.length > 0 && (
        <div style={{ marginTop: "0.75rem", padding: "0.5rem", background: "#f0f7ff", borderRadius: "6px", fontSize: "0.88rem" }}>
          <div style={{ fontWeight: "bold", color: "#1f4e79", marginBottom: "0.25rem" }}>
            📊 Snapshot: w[0] → w[final] first 5 taps
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {diagnostics.weightHistory[0]?.slice(0, 5).map((w0, i) => {
              const wf = diagnostics.weightHistory[diagnostics.weightHistory.length - 1][i] ?? 0;
              return (
                <div key={i} style={{ background: "#fff", padding: "0.35rem 0.5rem", borderRadius: "4px", border: "1px solid #d5e4f5" }}>
                  <div style={{ fontSize: "0.75rem", color: "#555" }}>w<sub>{i}</sub></div>
                  <div style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                    {w0.toFixed(4)} → {wf.toFixed(4)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "space-between" }}>
        <button
          onClick={() => setStep((p) => Math.max(0, p - 1))}
          disabled={step === 0}
          style={{
            padding: "0.4rem 0.9rem",
            borderRadius: "5px",
            border: "1px solid #ccc",
            background: step === 0 ? "#f0f0f0" : "#fff",
            color: step === 0 ? "#999" : "#333",
            cursor: step === 0 ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
        >
          ← Previous Step
        </button>
        <div style={{ fontSize: "0.85rem", color: "#666", alignSelf: "center" }}>
          Step {step + 1} of {steps.length} · repeats every sample n = 0, 1, 2, …
        </div>
        <button
          onClick={() => setStep((p) => Math.min(steps.length - 1, p + 1))}
          disabled={step === steps.length - 1}
          style={{
            padding: "0.4rem 0.9rem",
            borderRadius: "5px",
            border: "none",
            background: step === steps.length - 1 ? "#ccc" : "#2980b9",
            color: "#fff",
            cursor: step === steps.length - 1 ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
        >
          Next Step →
        </button>
      </div>
    </div>
  );
};

function useMemoPower(arr) {
  if (!arr?.length) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i] * arr[i];
  return sum / arr.length;
}
