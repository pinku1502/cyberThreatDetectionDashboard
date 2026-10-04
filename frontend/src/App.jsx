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
import RunPredictionButton from "./components/RunPredictionButton";
import WebsiteSelector from "./components/WebsiteSelector";
import TeamManagement from "./components/TeamManagement";
import { ROOT_API } from "./api/api";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(localStorage.getItem("cyberAuthToken")));
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState("Dashboard");
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [websites, setWebsites] = useState([]);
  const [websiteId, setWebsiteId] = useState(null);

  const loadWebsites = async (preferredId) => {
    const response = await ROOT_API.get("/websites");
    const list = response.data.data || [];
    setWebsites(list);
    const nextId = preferredId || Number(localStorage.getItem("selectedWebsiteId")) || list[0]?.id || null;
    setWebsiteId(nextId);
    if (nextId) localStorage.setItem("selectedWebsiteId", String(nextId));
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    ROOT_API.get("/auth/me").then((response) => {
      setUser(response.data.user);
      return loadWebsites();
    }).catch(() => handleLogout());
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
  const selectedWebsite = websites.find((website) => Number(website.id) === Number(websiteId));

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} onLogout={handleLogout} />
      <div className="flex-1 overflow-y-auto p-6">
        <Navbar currentUser={user.name || user.email} role={user.role} />
        <WebsiteSelector websites={websites} selectedWebsite={selectedWebsite} onSelect={selectWebsite} user={user} onCreated={loadWebsites} />
        {!selectedWebsite ? (
          <div className="rounded-3xl bg-white p-10 text-center text-slate-500">No authorized website is assigned to this account.</div>
        ) : (
          <>
            <div className="mb-8 rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-700 p-8 text-white shadow-xl">
              <p className="text-xs font-bold uppercase tracking-[4px] text-cyan-300">Security Operations Center</p>
              <h1 className="mt-3 text-4xl font-extrabold">Monitoring {selectedWebsite.name}</h1>
              <p className="mt-2 text-blue-100">{selectedWebsite.base_url} · {user.role}</p>
              <div className="mt-6"><RunPredictionButton websiteId={websiteId} /></div>
            </div>
            {currentPage === "Dashboard" && <><SummaryCards websiteId={websiteId} /><div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2"><AttackPieChart websiteId={websiteId} /><AttackBarChart websiteId={websiteId} /></div><div className="mt-8"><AlertsPage websiteId={websiteId} preview /></div></>}
            {currentPage === "Prediction History" && <PredictionTable websiteId={websiteId} setSelectedPrediction={setSelectedPrediction} />}
            {currentPage === "Alerts" && <AlertsPage websiteId={websiteId} />}
            {(user.role === "SUPER_ADMIN" || selectedWebsite.role === "SITE_ADMIN") && <TeamManagement websiteId={websiteId} user={user} />}
          </>
        )}
      </div>
      {selectedPrediction && <PredictionDetails prediction={selectedPrediction} onClose={() => setSelectedPrediction(null)} />}
    </div>
  );
}

export default App;
