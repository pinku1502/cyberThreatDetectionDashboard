import { useState } from "react";
import API from "../api/api";
import { FaPlay, FaSpinner, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

export default function RunPredictionButton({ websiteId, onPredictionSuccess }) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const runPrediction = async () => {
    if (loading) return;
    setLoading(true);
    setToast(null);

    try {
      // Pick a sample or benign prediction to test
      const sampleResponse = await API.get("/sample", {
        params: { attack: "BENIGN" },
      }).catch(async () => {
        // Fallback to DDoS sample if BENIGN sample route differs
        return await API.get("/sample", { params: { attack: "DDoS" } });
      });

      const features = sampleResponse.data?.data?.features || {};
      const response = await API.post("/", { ...features, website_id: websiteId });
      const pred = response.data?.data;

      setToast({
        type: "success",
        message: `Prediction recorded: ${pred?.attack_name || "BENIGN"} (${((pred?.confidence || 0.99) * 100).toFixed(0)}% confidence)`,
      });

      if (onPredictionSuccess) onPredictionSuccess(pred);

      setTimeout(() => setToast(null), 4000);
    } catch (requestError) {
      console.error("Prediction run error:", requestError);
      setToast({
        type: "error",
        message: requestError.response?.data?.message || "Failed to execute prediction.",
      });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={runPrediction}
        disabled={loading}
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-sm transition disabled:opacity-75 disabled:cursor-not-allowed"
      >
        {loading ? <FaSpinner className="animate-spin text-sm" /> : <FaPlay className="text-xs" />}
        <span>{loading ? "Processing..." : "Run Prediction"}</span>
      </button>

      {/* Floating Status Notification */}
      {toast && (
        <div
          className={`absolute right-0 top-12 z-50 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-semibold shadow-lg border flex items-center gap-2 ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {toast.type === "success" ? (
            <FaCheckCircle className="text-emerald-600" />
          ) : (
            <FaExclamationTriangle className="text-rose-600" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}