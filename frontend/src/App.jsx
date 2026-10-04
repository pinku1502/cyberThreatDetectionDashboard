import { useEffect, useState } from "react";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import SummaryCards from "./components/SummaryCards";
import AttackPieChart from "./components/AttackPieChart";
import AttackBarChart from "./components/AttackBarChart";
import PredictionTable from "./components/PredictionTable";
import PredictionDetails from "./components/PredictionDetails";
import AlertsPage from "./components/AlertsPage";
import WebsiteSelector from "./components/WebsiteSelector";
import AttackerIpTracker from "./components/AttackerIpTracker";
import { ROOT_API } from "./api/api";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(localStorage.getItem("cyberAuthToken")));
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState("Dashboard");
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [websites, setWebsites] = useState([]);
  const [websiteId, setWebsiteId] = useState(null);

  const loadWebsites = async (preferredId) => {
    try {
      const response = await ROOT_API.get("/websites");
      const list = response.data.data || [];
      setWebsites(list);
      const nextId = preferredId || list[0]?.id || null;
      setWebsiteId(nextId);
      if (nextId) localStorage.setItem("selectedWebsiteId", String(nextId));
    } catch (err) {
      console.error("Error loading websites:", err);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    ROOT_API.get("/auth/me")
      .then((response) => {
        setUser(response.data.user);
        return loadWebsites();
      })
      .catch(() => handleLogout());
  }, [isLoggedIn]);

  const handleLogin = (loggedInUser, token) => {
    localStorage.setItem("cyberAuthToken", token);
    setUser(loggedInUser);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("cyberAuthToken");
    localStorage.removeItem("selectedWebsiteId");
    setIsLoggedIn(false);
    setUser(null);
    setWebsites([]);
    setWebsiteId(null);
    setCurrentPage("Dashboard");
  };

  const selectWebsite = (id) => {
    setWebsiteId(id);
    localStorage.setItem("selectedWebsiteId", String(id));
  };

  if (!isLoggedIn || !user) return <Login onLogin={handleLogin} />;

  const selectedWebsite = websites.find((website) => Number(website.id) === Number(websiteId)) || websites[0];

  return (
    <div className="flex min-h-screen bg-[#f4f7fb] text-slate-800 font-sans">
      {/* Left Sidebar */}
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        {/* Top Bar with Badges and User Profile */}
        <Navbar
          currentUser={user.name || user.email}
          onBellClick={() => setCurrentPage("Alerts")}
        />

        {/* Action Row: Title, Website Indicator, Run Prediction Button */}
        <WebsiteSelector
          websites={websites}
          selectedWebsite={selectedWebsite}
          onSelect={selectWebsite}
        />

        {/* No Website Fallback */}
        {!selectedWebsite ? (
          <div className="rounded-2xl bg-white p-12 text-center text-slate-400 border border-slate-200">
            No website is assigned to this account. Contact developer to configure your website.
          </div>
        ) : (
          <>
            {/* Dashboard View */}
            {currentPage === "Dashboard" && (
              <>
                {/* 4 Metrics Summary Cards */}
                <SummaryCards websiteId={selectedWebsite.id} />

                {/* 2 Charts Side-by-Side */}
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AttackPieChart websiteId={selectedWebsite.id} />
                  <AttackBarChart websiteId={selectedWebsite.id} />
                </div>

                {/* Live Attacker IP Tracker Table */}
                <AttackerIpTracker websiteId={selectedWebsite.id} />
              </>
            )}

            {/* Prediction History Page */}
            {currentPage === "Prediction History" && (
              <PredictionTable
                websiteId={selectedWebsite.id}
                setSelectedPrediction={setSelectedPrediction}
              />
            )}

            {/* Alerts Page */}
            {currentPage === "Alerts" && (
              <AlertsPage websiteId={selectedWebsite.id} />
            )}
          </>
        )}
      </main>

      {/* Prediction Details Modal */}
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
