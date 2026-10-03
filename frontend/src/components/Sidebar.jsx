import {
  FaShieldAlt,
  FaChartPie,
  FaHistory,
  FaBell,
  FaSignOutAlt,
  FaWifi,
  FaDatabase,
  FaBrain,
} from "react-icons/fa";

function Sidebar({ currentPage, setCurrentPage, onLogout }) {
  const menuItems = [
    {
      title: "Dashboard",
      icon: <FaChartPie />,
    },
    {
      title: "Prediction History",
      icon: <FaHistory />,
    },
    {
      title: "Alerts",
      icon: <FaBell />,
    },
  ];

  return (
    <div className="w-72 min-h-screen bg-slate-950 text-white flex flex-col justify-between shadow-2xl">

      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-4">

          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
            <FaShieldAlt className="text-3xl text-white" />
          </div>

          <div>
            <h2 className="font-bold text-xl">CyberShield SOC</h2>
            <p className="text-slate-400 text-xs">
              Intrusion Detection System
            </p>
          </div>

        </div>

        {/* Live Status */}
        <div className="mt-6 space-y-3">

          <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl">
            <div className="flex items-center gap-2">
              <FaWifi className="text-green-400" />
              <span className="text-sm">Monitoring</span>
            </div>

            <span className="text-green-400 text-xs font-bold">
              LIVE
            </span>
          </div>

          <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl">
            <div className="flex items-center gap-2">
              <FaBrain className="text-cyan-400" />
              <span className="text-sm">Hybrid Model</span>
            </div>

            <span className="text-cyan-300 text-xs font-bold">
              ACTIVE
            </span>
          </div>

          <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl">
            <div className="flex items-center gap-2">
              <FaDatabase className="text-blue-400" />
              <span className="text-sm">Database</span>
            </div>

            <span className="text-blue-300 text-xs font-bold">
              CONNECTED
            </span>
          </div>

        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-5">
        <p className="text-xs uppercase tracking-widest text-slate-500 mb-4">
          Navigation
        </p>

        <div className="space-y-3">
          {menuItems.map((item) => (
            <button
              key={item.title}
              onClick={() => setCurrentPage(item.title)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 ${
                currentPage === item.title
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg text-white"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <span className="text-xl">{item.icon}</span>

              <span className="font-medium">{item.title}</span>
            </button>
          ))}
        </div>

        {/* Threat Info Card */}
        <div className="mt-10 bg-gradient-to-br from-red-600/20 to-orange-500/20 border border-red-500/30 rounded-2xl p-4">
          <p className="text-xs text-red-300 uppercase tracking-widest">
            Threat Intelligence
          </p>

          <h3 className="text-lg font-bold mt-2 text-white">
            15 Attack Categories
          </h3>

          <p className="text-sm text-slate-300 mt-2">
            DDoS, PortScan, Bot, DoS Hulk, FTP/SSH Patator, Heartbleed,
            Infiltration and more.
          </p>
        </div>
      </div>

      {/* Logout */}
      <div className="p-5 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 py-3 rounded-2xl font-semibold transition"
        >
          <FaSignOutAlt />
          Logout
        </button>

        <p className="text-center text-slate-500 text-xs mt-4">
          SOC Dashboard v2.0
        </p>
      </div>
    </div>
  );
}

export default Sidebar;