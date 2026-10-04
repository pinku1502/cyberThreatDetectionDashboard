import { useState } from "react";
import API from "../api/api";
import { FaBug, FaPlay, FaSpinner } from "react-icons/fa";

const ATTACK_OPTIONS = [
  "DDoS",
  "DoS Hulk",
  "DoS GoldenEye",
  "DoS Slowhttptest",
  "DoS slowloris",
  "PortScan",
  "Bot",
  "FTP-Patator",
  "SSH-Patator",
  "Heartbleed",
  "Infiltration",
  "Web Attack Brute Force",
  "Web Attack SQL Injection",
  "Web Attack XSS",
];

const severityStyles = {
  Critical: "border-red-300 bg-red-50 text-red-800",
  High: "border-orange-300 bg-orange-50 text-orange-800",
  Medium: "border-yellow-300 bg-yellow-50 text-yellow-800",
  Low: "border-green-300 bg-green-50 text-green-800",
};

export default function RunPredictionButton({ websiteId }) {
  const [selectedAttack, setSelectedAttack] = useState("DDoS");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState("");

  const runPrediction = async () => {
    setLoading(true);
    setError("");

    try {
      const sampleResponse = await API.get("/sample", {
        params: { attack: selectedAttack },
      });

      const response = await API.post("/", { ...sampleResponse.data.data.features, website_id: websiteId });
      setPrediction(response.data.data);
    } catch (requestError) {
      console.error("Attack simulation failed:", requestError);
      setPrediction(null);
      setError(
        requestError.response?.data?.message ||
          "Could not run the selected attack simulation."
      );
    } finally {
      setLoading(false);
    }
  };

  const severity = prediction?.severity || "Low";

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-sm">
      <div className="flex items-center gap-2 w-full">
        <select
          value={selectedAttack}
          onChange={(event) => setSelectedAttack(event.target.value)}
          disabled={loading}
          aria-label="Attack simulation type"
          className="flex-1 rounded-xl border border-blue-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800"
        >
          {ATTACK_OPTIONS.map((attack) => (
            <option key={attack} value={attack}>
              Simulate {attack}
            </option>
          ))}
        </select>

        <button
          onClick={runPrediction}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <FaSpinner className="animate-spin" /> : <FaPlay />}
          {loading ? "Detecting" : "Run"}
        </button>
      </div>

      <p className="text-center text-xs text-blue-100">
        Safe simulation using a labeled CICIDS2017 flow. No real attack traffic
        is generated.
      </p>

      {error && (
        <div className="w-full rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {prediction && (
        <div
          className={["w-full rounded-xl border px-4 py-3 text-left", severityStyles[severity] || severityStyles.Low].join(" ")}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-bold">
              <FaBug />
              Detected: {prediction.attack_name}
            </span>
            <span className="rounded-full bg-white/70 px-2 py-1 text-xs font-bold">
              {severity}
            </span>
          </div>
          <p className="mt-1 text-sm">
            Confidence: {(Number(prediction.confidence) * 100).toFixed(2)}%
          </p>
        </div>
      )}
    </div>
  );
}