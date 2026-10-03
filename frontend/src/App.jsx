import { useState } from "react";

import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import SummaryCards from "./components/SummaryCards";
import AttackPieChart from "./components/AttackPieChart";
import AttackBarChart from "./components/AttackBarChart";
import PredictionTable from "./components/PredictionTable";
import PredictionDetails from "./components/PredictionDetails";
import AlertsPage from "./components/AlertsPage";
import RunPredictionButton from "./components/RunPredictionButton";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState("");
  const [currentPage, setCurrentPage] = useState("Dashboard");
  const [selectedPrediction, setSelectedPrediction] = useState(null);

  const handleLogin = (username) => {
    setCurrentUser(username);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser("");
    setCurrentPage("Dashboard");
    setSelectedPrediction(null);
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onLogout={handleLogout}
      />

      {/* Main Area */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* Navbar */}
        <Navbar currentUser={currentUser} />

        {/* Hero Banner */}
        <div className="mb-8 rounded-3xl overflow-hidden shadow-xl bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-700 text-white">
          <div className="p-8 flex flex-col lg:flex-row justify-between items-center gap-8">

            <div className="flex-1">
              <p className="uppercase tracking-[4px] text-cyan-300 text-xs font-bold mb-3">
                Security Operations Center (SOC)
              </p>

              <h1 className="text-4xl lg:text-5xl font-extrabold leading-tight">
                Cyber Threat Detection Dashboard
              </h1>

              <p className="mt-3 text-blue-100 text-lg">
                Random Forest • XGBoost • Hybrid Classifier
              </p>

              <p className="mt-1 text-cyan-200 text-sm">
                CICIDS2017 Dataset | AI Powered Multi-Class Intrusion Detection
              </p>

              {/* Live Status */}
              <div className="flex flex-wrap gap-3 mt-6">

                <span className="flex items-center gap-2 bg-green-500/20 border border-green-400 px-3 py-2 rounded-full text-green-200 text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                  Monitoring Live
                </span>

                <span className="bg-blue-500/20 border border-blue-300 px-3 py-2 rounded-full text-blue-100 text-sm">
                  Hybrid Model Active
                </span>

                <span className="bg-purple-500/20 border border-purple-300 px-3 py-2 rounded-full text-purple-100 text-sm">
                  Multi-Class Detection
                </span>
              </div>
            </div>

            {/* Prediction Button */}
            <div className="flex flex-col items-center gap-4">
              <RunPredictionButton />

              <div className="bg-white/10 backdrop-blur rounded-2xl px-5 py-3 text-center">
                <p className="text-xs text-cyan-200">Detection Mode</p>
                <h2 className="font-bold text-lg">LIVE ANALYSIS</h2>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard */}
        {currentPage === "Dashboard" && (
          <>
            {/* Summary Cards */}
            <SummaryCards />

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
              <AttackPieChart />
              <AttackBarChart />
            </div>

            {/* Security Alerts */}
            <div className="mt-8">
              <AlertsPage preview={true} />
            </div>
          </>
        )}

        {/* Prediction History */}
        {currentPage === "Prediction History" && (
          <PredictionTable
            setSelectedPrediction={setSelectedPrediction}
          />
        )}

        {/* Alerts Page */}
        {currentPage === "Alerts" && <AlertsPage />}
      </div>

      {/* Prediction Details Drawer */}
      {selectedPrediction && (
        <PredictionDetails
          prediction={selectedPrediction}
          onClose={() => setSelectedPrediction(null)}
        />
      )}
    </div>
  );
}

export default App;