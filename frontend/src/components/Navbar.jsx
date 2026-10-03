import { useEffect, useState } from "react";
import {
  FaUserCircle,
  FaBell,
  FaClock,
  FaShieldAlt,
  FaDatabase,
  FaBrain,
} from "react-icons/fa";

function Navbar({ currentUser }) {
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "medium",
        })
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm px-6 py-4 mb-6">

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-5">

        {/* Left Side */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Security Operations Center
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Real-Time Cyber Threat Monitoring & AI Intrusion Detection
          </p>
        </div>

        {/* Right Side */}
        <div className="flex flex-wrap items-center gap-4">

          {/* Live Clock */}
          <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl">
            <FaClock className="text-blue-600" />
            <span className="text-sm font-medium text-slate-700">
              {currentTime}
            </span>
          </div>

          {/* Monitoring Status */}
          <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-sm font-semibold text-green-700">
              Monitoring Live
            </span>
          </div>

          {/* Notifications */}
          <button className="relative bg-slate-100 hover:bg-slate-200 p-3 rounded-xl transition">
            <FaBell className="text-slate-700 text-lg" />

            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold">
              3
            </span>
          </button>

          {/* User */}
          <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
            <FaUserCircle className="text-blue-600 text-3xl" />

            <div>
              <p className="text-xs text-gray-500">Logged in as</p>

              <p className="font-semibold text-slate-800 capitalize">
                {currentUser}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Status Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">

        <div className="bg-blue-50 rounded-2xl px-4 py-3 border border-blue-100 flex items-center gap-3">
          <FaBrain className="text-blue-600 text-xl" />

          <div>
            <p className="text-xs text-gray-500">Hybrid Classifier</p>
            <p className="font-bold text-blue-700">ACTIVE</p>
          </div>
        </div>

        <div className="bg-green-50 rounded-2xl px-4 py-3 border border-green-100 flex items-center gap-3">
          <FaDatabase className="text-green-600 text-xl" />

          <div>
            <p className="text-xs text-gray-500">MySQL Database</p>
            <p className="font-bold text-green-700">CONNECTED</p>
          </div>
        </div>

        <div className="bg-red-50 rounded-2xl px-4 py-3 border border-red-100 flex items-center gap-3">
          <FaShieldAlt className="text-red-600 text-xl" />

          <div>
            <p className="text-xs text-gray-500">Threat Monitoring</p>
            <p className="font-bold text-red-700">REAL-TIME ENABLED</p>
          </div>
        </div>

      </div>

    </div>
  );
}

export default Navbar;