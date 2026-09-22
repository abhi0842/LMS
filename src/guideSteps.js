export const guideSteps = [
  {
    title: "Welcome to the LMS Adaptive Filter Lab",
    content:
      "Would you like a guided tour of the LMS (Least Mean Squares) adaptive filter simulation? This lab teaches you how LMS works step-by-step for ECG denoising.",
    type: "choice",
    targetId: "guideButton",
  },
  {
    title: "Open the Instruction Panel",
    content:
      "Click the ℹ️ Instruction button at the top to review the LMS algorithm theory, mathematical equations, and parameter explanations. Understanding the theory first will help you interpret the simulation results.",
    highlight: "instructionPanel",
    preferredPlacement: "right",
  },
  {
    title: "Step 1: Load Clean ECG Signal s[n]",
    content:
      "From Step 1, select the MIT-BIH 109 dataset and click 'Load & Plot Clean ECG (s[n])'. This loads the clean reference ECG signal s[n] — our 'ground truth' that the LMS filter will try to recover.",
    highlight: "datasetSection",
    preferredPlacement: "right",
  },
  {
    title: "Step 2: Generate ECG Signal",
    content:
      "Click 'Load Clean ECG (s[n])'. Observe the clean ECG s[n] in the plot area on the left. You may toggle between MLII / V1 leads to see different ECG views.",
    highlight: "loadDatasetBtn",
    requiredAction: "GENERATE_SIGNAL",
    preferredPlacement: "right",
  },
  {
    title: "Step 3: Add Noise to Create d[n]",
    content:
      "From Step 2, select an artifact type: Baseline Wander (BW), Power Line Interference (PLI), or Muscle Noise (EMG). Adjust its amplitude/frequency, then click 'Add Artifact'. This creates the noisy desired signal d[n] = s[n] + noise[n], and the reference x[n] for the adaptive filter.",
    highlight: "artifactSection",
    requiredAction: "ADD_NOISE",
    preferredPlacement: "right",
  },
  {
    title: "Step 4: Set LMS Filter Parameters",
    content:
      "In Step 3, observe the LMS parameters:\n• Filter Order M (taps): Controls the FIR filter length\n• Step Size μ: Controls learning speed vs stability\n⚠️ Try different μ values and watch how the convergence curve and output change automatically! Larger μ = faster learning but more excess error. Small μ = slower but more accurate steady state.",
    highlight: "filterSection",
    preferredPlacement: "right",
  },
  {
    title: "Step 5: Observe the Convergence Curve",
    content:
      "Below the main plot, find the 'Learning Curve (MSE vs Iteration n)'. This shows how the Mean Squared Error decreases as LMS adapts. Notice three phases: (1) Transient / Learning Phase — rapid error drop, (2) Convergence — error settles, (3) Steady State — small fluctuations around minimum. Change μ to see how it affects these phases!",
    highlight: "convergenceSection",
    preferredPlacement: "right",
  },
  {
    title: "Step 6: Study Filtered Output e[n] vs s[n]",
    content:
      "The overlay plot compares: Clean Reference s[n] (blue dashed) vs Filtered Output e[n] (green solid). The LMS filter estimates y[n] ≈ noise[n], then subtracts it: e[n] = d[n] − y[n] ≈ s[n]. Watch the residual error signal e_r[n] = s[n] − e[n] below to see how much noise remains.",
    highlight: "ecg-filter-container",
    preferredPlacement: "right",
  },
  {
    title: "Step 7: PSD Frequency-Domain Analysis",
    content:
      "The PSD (Power Spectral Density) comparison shows the noisy signal vs filtered signal in the frequency domain. Observe how artifact peaks (e.g., 50 Hz PLI peak, low-frequency BW) are suppressed. Use the dB scale toggle for better visualization of small power differences.",
    highlight: "psdSection",
    preferredPlacement: "right",
  },
  {
    title: "Lab Completed!",
    content:
      "Great job! You now understand:\n• What LMS is — a stochastic gradient adaptive algorithm\n• How μ controls the speed/stability tradeoff\n• How weight vectors w[n] evolve during adaptation\n• How error e[n] converges to the Wiener solution\n\nExperiment with different artifacts, M, and μ values. Try extreme μ values to see divergence or very slow convergence!",
    preferredPlacement: "center",
  },
];
