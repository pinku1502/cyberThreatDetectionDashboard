import {
  FaTimes,
  FaShieldAlt,
  FaBug,
  FaGlobe,
  FaClock,
  FaChartLine,
  FaDatabase,
} from "react-icons/fa";

function PredictionDetails({ prediction, onClose }) {
  if (!prediction) return null;

  const isAttack = Number(prediction.prediction) === 1;

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex justify-end">
      <div className="w-full max-w-md h-screen bg-white shadow-2xl border-l border-gray-200 p-6 overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Prediction Details
            </h2>
            <p className="text-sm text-gray-500">
              Complete analysis of selected prediction.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 flex items-center justify-center transition"
          >
            <FaTimes />
          </button>
        </div>

        {/* Status Card */}
        <div
          className={`rounded-2xl p-5 mb-6 ${
            isAttack
              ? "bg-red-50 border border-red-200"
              : "bg-green-50 border border-green-200"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${
                isAttack
                  ? "bg-red-100 text-red-600"
                  : "bg-green-100 text-green-600"
              }`}
            >
              {isAttack ? <FaBug /> : <FaShieldAlt />}
            </div>

            <div>
              <p className="text-sm text-gray-500">Prediction Result</p>

              <h3
                className={`text-xl font-bold ${
                  isAttack ? "text-red-600" : "text-green-600"
                }`}
              >
                {prediction.attack_name}
              </h3>

              <span
                className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                  isAttack
                    ? "bg-red-600 text-white"
                    : "bg-green-600 text-white"
                }`}
              >
                {isAttack ? "HIGH RISK" : "SAFE TRAFFIC"}
              </span>
            </div>
          </div>
        </div>

        {/* Information Cards */}
        <div className="space-y-4">

          <DetailCard
            icon={<FaDatabase className="text-blue-600" />}
            title="Prediction ID"
            value={`#${prediction.id}`}
          />

          <DetailCard
            icon={<FaChartLine className="text-purple-600" />}
            title="Confidence Score"
            value={`${(Number(prediction.confidence) * 100).toFixed(2)}%`}
          />

          <DetailCard
            icon={<FaGlobe className="text-indigo-600" />}
            title="Client IP Address"
            value={prediction.client_ip || "Unknown"}
          />

          <DetailCard
            icon={<FaClock className="text-orange-600" />}
            title="Detection Time"
            value={new Date(prediction.created_at).toLocaleString("en-IN")}
          />

        </div>

        {/* Confidence Progress */}
        <div className="mt-8">
          <div className="flex justify-between mb-2">
            <p className="font-medium text-gray-700">
              Model Confidence
            </p>

            <p className="font-semibold text-blue-700">
              {(Number(prediction.confidence) * 100).toFixed(2)}%
            </p>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full"
              style={{
                width: `${Number(prediction.confidence) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase mb-2">
            Detection Source
          </p>

          <p className="font-semibold text-gray-700">
            Hybrid Classifier (Random Forest + XGBoost)
          </p>

          <p className="text-sm text-gray-500 mt-2">
            Prediction fetched from MySQL database through Flask API.
          </p>
        </div>

      </div>
    </div>
  );
}

function DetailCard({ icon, title, value }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="text-xl">{icon}</div>

        <p className="text-sm text-gray-500">{title}</p>
      </div>

      <p className="font-semibold text-gray-800 break-all">
        {value}
      </p>
    </div>
  );
}

export default PredictionDetails;