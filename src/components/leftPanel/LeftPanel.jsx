import { useContext } from "react";
import { SimulationContext } from "../../context/SimulationContext";
import styles from "./leftPanel.module.css";
import { EcgUnfilter } from "../graph/EcgUnfilter";
import { EcgNoisy } from "../graph/EcgNoisy";
import { EcgFilter } from "../graph/EcgFilter";
import { EcgUnfilteredPSD } from "../graph/EcgUnfilteredPSD";
import { EcgFilteredPSD } from "../graph/EcgFilteredPSD";
import { ConvergenceCurve } from "../educational/ConvergenceCurve";

export const LeftPanel = () => {
  const {
    generateECG, showCleanPlot, setShowCleanPlot,
    applyNoiseTrigger, showNoisyPlots, setShowNoisyPlots,
    filteredECG, applypsdTrigger,
    selectedArtifact,
  } = useContext(SimulationContext);

  return (
    <div className={styles.leftPanelContainer}>
      <div className={styles.left}>
        <div id="signal-plots" style={{ position: "relative" }}>
          {/* 1. Clean ECG s[n] */}
          {generateECG && showCleanPlot && (
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowCleanPlot(false)}
                style={{
                  position: "absolute",
                  top: "6px", right: "6px",
                  zIndex: 10,
                  backgroundColor: "#e74c3c", color: "white",
                  border: "none", borderRadius: "4px",
                  padding: "0.25rem 0.6rem", cursor: "pointer",
                  fontSize: "0.8rem", fontWeight: "bold",
                }}
              >Hide Clean s[n]</button>
              <EcgUnfilter />
            </div>
          )}

          {/* 2. Desired d[n] + reference x[n] plots */}
          {generateECG && applyNoiseTrigger && showNoisyPlots && (
            <div style={{ position: "relative", marginTop: "1rem" }}>
              <button
                type="button"
                onClick={() => setShowNoisyPlots(false)}
                style={{
                  position: "absolute",
                  top: "6px", right: "6px",
                  zIndex: 10,
                  backgroundColor: "#e67e22", color: "white",
                  border: "none", borderRadius: "4px",
                  padding: "0.25rem 0.6rem", cursor: "pointer",
                  fontSize: "0.8rem", fontWeight: "bold",
                }}
              >Hide d[n] / x[n]</button>
              <EcgNoisy />
            </div>
          )}

          <div style={{ display: "flex", gap: "0.5rem", margin: "0.5rem 0 1.5rem 0", flexWrap: "wrap" }}>
            {generateECG && !showCleanPlot && (
              <button
                type="button"
                onClick={() => setShowCleanPlot(true)}
                style={{
                  background: "#3498db", color: "white", border: "none",
                  padding: "0.5rem 1rem", borderRadius: "5px", cursor: "pointer", fontWeight: "bold",
                }}
              >
                ▶ Show Clean s[n]
              </button>
            )}
            {applyNoiseTrigger && !showNoisyPlots && (
              <button
                type="button"
                onClick={() => setShowNoisyPlots(true)}
                style={{
                  background: "#8e44ad", color: "white", border: "none",
                  padding: "0.5rem 1rem", borderRadius: "5px", cursor: "pointer", fontWeight: "bold",
                }}
              >
                ▶ Show d[n] = s + {selectedArtifact} &amp; x[n]
              </button>
            )}
          </div>

          {/* 3. Filtered output (overlay) + residual error */}
          {filteredECG && (
            <EcgFilter />
          )}

          {/* PSD plots — always shown after filter runs, auto */}
          {applypsdTrigger && filteredECG && (
            <div id="psdSection" style={{ position: "relative", marginTop: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <EcgUnfilteredPSD />
                <EcgFilteredPSD />
              </div>
              <hr style={{ margin: "1.25rem 0" }} />
            </div>
          )}
        </div>

        {/* Learning curve */}
        {filteredECG && (
          <div id="convergenceSection">
            <ConvergenceCurve />
          </div>
        )}
      </div>
    </div>
  );
};
