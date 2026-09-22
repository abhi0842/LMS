export function addBaselineWander(signal, fs, amplitude = 0.2, freq = 0.33) {
  return signal.map((v, i) =>
    v + amplitude * Math.sin(2 * Math.PI * freq * (i / fs))
  );
}

export function addPowerlineNoise(signal, fs, amplitude = 0.05, freq = 50) {
  return signal.map((v, i) =>
    v + amplitude * Math.sin(2 * Math.PI * freq * (i / fs))
  );
}

function guassionRandom() {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}
export function addMuscleNoise(signal, amplitude = 0.02) {
  return signal.map(v => v + amplitude * guassionRandom());
}
