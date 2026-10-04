import {
  FaShieldAlt,
  FaThLarge,
  FaHistory,
  FaBell,
  FaSignOutAlt,
} from "react-icons/fa";

function Sidebar({ currentPage, setCurrentPage, onLogout }) {
  const menuItems = [
    {
      title: "Dashboard",
      icon: <FaThLarge />,
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
    <aside className="w-64 min-h-screen bg-white border-r border-slate-200/80 flex flex-col justify-between p-5 select-none shrink-0">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xl shadow-md shadow-blue-500/20">
            <FaShieldAlt />
          </div>
          <div>
            <h1 className="font-extrabold text-xl text-blue-700 tracking-tight leading-tight">
              CyberShield
            </h1>
            <p className="text-slate-400 text-[10px] font-medium leading-tight tracking-tight">
              AI Intrusion Detection System
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="mt-8 space-y-2">
          {menuItems.map((item) => {
            const isActive = currentPage === item.title;
            return (
              <button
                key={item.title}
                onClick={() => setCurrentPage(item.title)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className={`text-base ${isActive ? "text-white" : "text-slate-400"}`}>
                  {item.icon}
                </span>
                <span>{item.title}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logout Action */}
      <div className="pt-4 border-t border-slate-100">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 font-semibold text-sm transition"
        >
          <FaSignOutAlt className="text-base" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;