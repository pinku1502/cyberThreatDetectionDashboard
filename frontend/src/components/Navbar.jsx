import {
  FaUserCircle,
  FaBell,
  FaDatabase,
  FaBrain,
  FaChartLine,
} from "react-icons/fa";

function Navbar({ currentUser, onBellClick }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      {/* Left Details */}
      <div>
        <h1 className="text-2xl font-bold text-blue-700 tracking-tight">
          Cyber Threat Detection Dashboard
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-medium">
          Dashboard Overview • Real-time Monitoring System
        </p>

        {/* 3 Status Badges */}
        <div className="flex flex-wrap items-center gap-2.5 mt-3">
          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-lg border border-blue-100">
            <FaDatabase className="text-blue-500 text-xs" />
            MySQL Connected
          </span>

          <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 text-xs font-medium px-3 py-1 rounded-lg border border-purple-100">
            <FaBrain className="text-purple-500 text-xs" />
            Hybrid Model Active
          </span>

          <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 text-xs font-medium px-3 py-1 rounded-lg border border-orange-100">
            <FaChartLine className="text-orange-500 text-xs" />
            Real-time Monitoring
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4 self-start lg:self-center">
        {/* Monitoring Live Pill */}
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Monitoring Live</span>
        </div>

        {/* Notification Bell */}
        <button
          onClick={onBellClick}
          className="relative w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 flex items-center justify-center text-slate-600 transition"
          aria-label="Alerts"
        >
          <FaBell className="text-sm" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Current User */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <FaUserCircle className="text-blue-600 text-3xl shrink-0" />
          <div className="leading-tight">
            <p className="text-[11px] text-slate-400 font-medium">Current User</p>
            <p className="text-sm font-bold text-slate-800 truncate max-w-[150px]">
              {currentUser || "Authorized User"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Navbar;