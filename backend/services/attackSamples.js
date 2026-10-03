const fs = require("fs");
const path = require("path");

const SAMPLES_PATH = path.resolve(
  __dirname,
  "../data/attack-samples.json"
);

const normalizeLabel = (label) =>
  String(label || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const samples = JSON.parse(fs.readFileSync(SAMPLES_PATH, "utf8"));

const getAttackSample = async (attack) => {
  const requestedKey = Object.keys(samples).find(
    (label) => normalizeLabel(label) === normalizeLabel(attack)
  );

  if (!requestedKey) {
    return null;
  }

  return {
    requested_attack: requestedKey,
    features: samples[requestedKey],
  };
};

module.exports = { getAttackSample };