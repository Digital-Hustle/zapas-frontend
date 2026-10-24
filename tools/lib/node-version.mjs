export function satisfiesNode(version, minimum = "24.18.0") {
  const parse = (value) => {
    const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(value ?? ""));
    if (!match) throw new Error(`Unsupported Node version: ${value}`);
    return match.slice(1).map(Number);
  };
  const [major, minor, patch] = parse(version);
  const [minMajor, minMinor, minPatch] = parse(minimum);
  if (major !== minMajor) return major > minMajor;
  if (minor !== minMinor) return minor > minMinor;
  return patch >= minPatch;
}