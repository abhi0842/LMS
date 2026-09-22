import React from "react";
import styles from "./instruction.module.css";

export const Instruction = () => {
  return (
    <div className={styles.box}>
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>The LMS (Least Mean Squares) Adaptive Filter Algorithm</h1>

          <section style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.1rem", color: "#2c3e50", marginBottom: "0.5rem" }}>
              🎯 What is LMS?
            </h2>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              The <b>Least Mean Squares (LMS)</b> algorithm is a <b>stochastic gradient-descent</b> adaptive
              filter introduced by Widrow &amp; Hoff in 1960. It iteratively adjusts the tap weights
              <b> w[n]</b> of an FIR filter to minimize the <b>Mean Squared Error (MSE)</b> between the
              desired signal <b>d[n]</b> and the filter output <b>y[n]</b>. LMS is the workhorse of
              adaptive signal processing because of its simplicity, computational efficiency (<i>O(M)</i> per sample),
              and robust convergence properties.
            </p>
          </section>

          <section style={{ marginBottom: "1.25rem", background: "#f0f7ff", padding: "1rem", borderRadius: "6px" }}>
            <h2 style={{ fontSize: "1.1rem", color: "#1f4e79", marginBottom: "0.5rem" }}>
              📐 Standard Research-Paper LMS Equations
            </h2>
            <div style={{ fontFamily: '"Cambria Math", "Times New Roman", serif', fontSize: "1rem", lineHeight: 2 }}>
              <p style={{ margin: 0 }}>
                <b>1. Tap-input vector</b> at iteration <i>n</i>:
              </p>
              <div style={{ background: "#fff", padding: "0.5rem 1rem", borderRadius: "4px", margin: "0.25rem 0 0.75rem 0", borderLeft: "4px solid #3498db" }}>
                <b>x</b>[<i>n</i>] = [ x[<i>n</i>], &nbsp;x[<i>n</i>−1], &nbsp;…, &nbsp;x[<i>n</i>−<i>M</i>+1] ]<sup>T</sup>
              </div>
              <p style={{ margin: 0 }}>
                <b>2. Filter output (estimated artifact)</b> — inner product:
              </p>
              <div style={{ background: "#fff", padding: "0.5rem 1rem", borderRadius: "4px", margin: "0.25rem 0 0.75rem 0", borderLeft: "4px solid #2ecc71" }}>
                y[<i>n</i>] = <b>w</b><sup>T</sup>[<i>n</i>] · <b>x</b>[<i>n</i>] = Σ<sub><i>k</i>=0</sub><sup><i>M</i>−1</sup> w<sub><i>k</i></sub>[<i>n</i>] · x[<i>n</i>−<i>k</i>]
              </div>
              <p style={{ margin: 0 }}>
                <b>3. A priori error signal</b> (cleaned ECG = desired − estimated noise):
              </p>
              <div style={{ background: "#fff", padding: "0.5rem 1rem", borderRadius: "4px", margin: "0.25rem 0 0.75rem 0", borderLeft: "4px solid #e74c3c" }}>
                e[<i>n</i>] = d[<i>n</i>] − y[<i>n</i>]
              </div>
              <p style={{ margin: 0 }}>
                <b>4. Weight-update (Widrow-Hoff LMS rule)</b> — the core of the algorithm:
              </p>
              <div style={{ background: "#fff", padding: "0.5rem 1rem", borderRadius: "4px", margin: "0.25rem 0 0.25rem 0", borderLeft: "4px solid #f39c12" }}>
                <b>w</b>[<i>n</i>+1] = <b>w</b>[<i>n</i>] + μ · e[<i>n</i>] · <b>x</b>[<i>n</i>]
              </div>
              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9rem", color: "#555" }}>
                where <b>μ</b> = step size, &nbsp;<b>w</b>[0] = <b>0</b> (zero initialization in this simulation).
              </p>
            </div>
          </section>

          <section style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.1rem", color: "#2c3e50", marginBottom: "0.5rem" }}>
              🔧 Input Parameters — Purpose &amp; Effect
            </h2>

            <div style={{ border: "1px solid #ddd", borderRadius: "6px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.92rem" }}>
                <thead>
                  <tr style={{ background: "#2c3e50", color: "#fff" }}>
                    <th style={{ padding: "0.5rem", textAlign: "left" }}>Parameter</th>
                    <th style={{ padding: "0.5rem", textAlign: "left" }}>Symbol</th>
                    <th style={{ padding: "0.5rem", textAlign: "left" }}>What it does</th>
                    <th style={{ padding: "0.5rem", textAlign: "left" }}>Real-world effect</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: "#fafafa" }}>
                    <td style={{ padding: "0.5rem", fontWeight: "bold" }}>Filter Order (Taps)</td>
                    <td style={{ padding: "0.5rem", fontFamily: "serif", fontSize: "1.05rem" }}><i>M</i></td>
                    <td style={{ padding: "0.5rem" }}>
                      Length of the FIR weight vector <b>w</b>[<i>n</i>].
                      Controls the memory / modeling capacity of the filter.
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      ↑ <i>M</i>: Can model more complex noise (e.g., wider frequency bands),
                      but slower convergence and more computation.
                      ↓ <i>M</i>: Faster, but may under-model the artifact leaving residual noise.
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "0.5rem", fontWeight: "bold" }}>Step Size</td>
                    <td style={{ padding: "0.5rem", fontFamily: "serif", fontSize: "1.1rem", color: "#e67e22", fontWeight: "bold" }}>μ</td>
                    <td style={{ padding: "0.5rem" }}>
                      Learning rate / gradient-gain for the stochastic update.
                      Scales how much weights change each sample.
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      <b>↑ Large μ (e.g., 0.01):</b> Fast learning, tracks changes quickly →
                      but <i>excess mean-square error</i> (EMSE) is high (noisy steady state).
                      May become unstable if μ &gt; μ<sub>max</sub>.<br />
                      <b>↓ Small μ (e.g., 0.0005):</b> Slow convergence, poor tracking →
                      but lower EMSE, very accurate steady state (closer to Wiener optimum).
                    </td>
                  </tr>
                  <tr style={{ background: "#fafafa" }}>
                    <td style={{ padding: "0.5rem", fontWeight: "bold" }}>Stability Bound</td>
                    <td style={{ padding: "0.5rem", fontFamily: "serif", fontSize: "1.05rem" }}>μ<sub>max</sub></td>
                    <td style={{ padding: "0.5rem" }}>
                      Theoretical upper limit: μ &lt; 1 / (λ<sub>max</sub>) ≈ 2 / (M · P<sub>x</sub>),
                      where λ<sub>max</sub> is the largest eigenvalue of <b>R</b><sub>xx</sub> and
                      P<sub>x</sub> = E[x²[<i>n</i>]] is the input power.
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      μ ≥ μ<sub>max</sub> → weights diverge, e[<i>n</i>] explodes (NaN/instability).
                      In this simulation, μ is automatically clamped to 90% of μ<sub>max</sub> for safety.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section style={{ marginBottom: "1.25rem", background: "#fff8e7", padding: "1rem", borderRadius: "6px" }}>
            <h2 style={{ fontSize: "1.1rem", color: "#7f5500", marginBottom: "0.5rem" }}>
              📈 Understanding the Learning Curve (MSE vs n)
            </h2>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              The convergence curve plots |e[<i>n</i>]|² (smoothed) against sample index <i>n</i>.
              It has three canonical phases for a stationary environment:
            </p>
            <ol style={{ margin: "0.5rem 0 0 1.25rem", lineHeight: 1.75 }}>
              <li>
                <b>Transient / Learning Phase (n ≈ 0 → N<sub>conv</sub>):</b> MSE drops rapidly as weights
                move toward the Wiener-Hopf solution <b>w</b><sub>opt</sub> = <b>R</b><sub>xx</sub><sup>−1</sup> <b>r</b><sub>xd</sub>.
                Convergence time ∝ 1/(μ · λ<sub>min</sub>) — smaller eigenvalues = slower modes.
              </li>
              <li>
                <b>Convergence Phase:</b> Exponential envelope decays. MSE approaches the minimum
                <b> J<sub>min</sub></b> (the MMSE achievable by any FIR filter of order M).
              </li>
              <li>
                <b>Steady-State Phase (n &gt; N<sub>conv</sub>):</b> MSE fluctuates around
                J<sub>∞</sub> = J<sub>min</sub> + J<sub>ex</sub>. The <b>excess MSE</b> J<sub>ex</sub> ≈ μ · M · J<sub>min</sub> / 2
                is the price paid for adaptation (larger μ → more excess error).
              </li>
            </ol>
          </section>

          <section style={{ marginBottom: "1.25rem", background: "#eefbf2", padding: "1rem", borderRadius: "6px" }}>
            <h2 style={{ fontSize: "1.1rem", color: "#1e6b32", marginBottom: "0.5rem" }}>
              🫀 ECG Denoising: How this Simulation Uses LMS (Adaptive Noise Canceller)
            </h2>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              We use LMS in the <b>Adaptive Noise Canceller (ANC)</b> configuration:
            </p>
            <ul style={{ margin: "0.5rem 0 0 1.25rem", lineHeight: 1.75 }}>
              <li><b>d[n] = s[n] + n₀[n]</b> — Primary input: Noisy ECG (clean <i>s</i> + artifact <i>n₀</i>).</li>
              <li><b>x[n]</b> — Reference input: A signal <i>correlated</i> with n₀[n] (same BW/PLI sine, delayed EMG).</li>
              <li>LMS forces y[n] = <b>w</b><sup>T</sup>[n]·<b>x</b>[n] ≈ n₀[n] (the artifact).</li>
              <li>Output e[n] = d[n] − y[n] ≈ s[n] — the <b>recovered clean ECG!</b></li>
            </ul>
            <p style={{ margin: "0.75rem 0 0 0", fontSize: "0.92rem", color: "#2c663d" }}>
              <b>Key insight:</b> ANC works because x[n] is correlated with the artifact n₀[n]
              but uncorrelated with the desired ECG s[n]. The LMS filter can only learn to
              predict the artifact component, leaving the clean signal untouched.
              This is exactly how real-world clinical ECG monitors remove power-line hum and baseline drift!
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "1.1rem", color: "#2c3e50", marginBottom: "0.5rem" }}>
              🧪 Try These Experiments!
            </h2>
            <ol style={{ margin: "0.25rem 0 0 1.25rem", lineHeight: 1.75 }}>
              <li><b>μ effect:</b> Fix M=32, BW artifact. Try μ = 0.0001 (very slow), 0.005 (good), 0.05 (near max). Observe convergence speed vs steady-state MSE level.</li>
              <li><b>M effect:</b> Fix μ=0.005. Try M=4, M=32, M=128. Higher M gives more attenuation for BW/PLI (more complex frequency response).</li>
              <li><b>Artifact type:</b> Compare BW, PLI, EMG. Notice PLI (narrowband 50 Hz) converges fastest — it's a simple sinusoid. EMG (broadband) converges slower with higher J<sub>ex</sub>.</li>
              <li><b>Divergence demo:</b> Crank μ way up (the UI clamps it, but the μ<sub>max</sub> indicator shows when you're near the edge).</li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
};
