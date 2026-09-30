import React from "react";
import styles from "./instruction.module.css";

export const Instruction = () => {
  return (
    <div className={styles.box}>
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>The LMS (Least Mean Squares) Adaptive Filter Algorithm</h1>

          <section style={{ margin: "1rem 0 1.25rem", padding: "1rem", background: "#eef7f4", borderLeft: "4px solid #16805a", borderRadius: "6px" }}>
            <h2 style={{ fontSize: "1.1rem", color: "#175b45", marginBottom: "0.5rem" }}>
              Simulation: Follow These Steps
            </h2>
            <ol style={{ margin: "0 0 0 1.25rem", lineHeight: 1.65 }}>
              <li><b>Load the clean signal.</b> In Step 1, click <b>Load Clean ECG</b> to load Dataset 109. This is the clean reference signal <i>s[n]</i>.</li>
              <li><b>Select an artifact.</b> In Step 2, choose PLI, baseline wander, or EMG from the dropdown. Noise frequency and amplitude are fixed to the simulation's standard settings.</li>
              <li><b>Create the noisy input and reference.</b> Click <b>Add Artifact → Build d[n] &amp; x[n]</b>. The simulation forms <i>d[n] = s[n] + v[n]</i> and a correlated sensor reference <i>x[n]</i>. Inspect the displayed desired and reference signals.</li>
              <li><b>Choose LMS parameters.</b> Adjust filter order <i>M</i> and step size <i>μ</i> in Step 3 before running. Larger <i>M</i> adds filter memory; larger <i>μ</i> adapts faster but can increase steady-state error. Artifact selection supplies a starting preset, and the fields remain adjustable.</li>
              <li><b>Run the adaptive filter.</b> Click <b>Run LMS</b>. Compare the clean reference with the LMS output in the time-domain graph. The LMS output should approach the clean reference as it estimates and subtracts <i>v[n]</i>.</li>
              <li><b>Inspect the frequency-domain result.</b> Click <b>View PSD</b>. The before/after PSD graphs appear at the top of the left panel for direct comparison.</li>
              <li><b>Check quantitative performance.</b> Click <b>View Metrics</b> to compare before/after MSE, PSNR, SNR, and correlation.</li>
              <li><b>Inspect adaptation.</b> After LMS runs, review the <b>Adaptive Weight Evolution</b> graph below the time-domain comparison to see how the filter coefficients change over sample index <i>n</i>.</li>
            </ol>
          </section>

          
        </div>
      </div>
    </div>
  );
};
