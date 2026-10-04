import { useState } from "react";
import axios from "axios";
import {
  FaShieldAlt,
  FaUser,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaDatabase,
  FaBrain,
  FaWifi,
  FaCheckCircle,
} from "react-icons/fa";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/login",
        { email, password }
      );

      localStorage.setItem("cyberAuthToken", response.data.token);
      onLogin(response.data.user, response.data.token);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to sign in. Please verify your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-6 overflow-hidden relative font-sans">
      {/* Background Glow */}
      <div className="absolute w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full -top-20 -left-20"></div>
      <div className="absolute w-80 h-80 bg-cyan-500/20 blur-[120px] rounded-full bottom-0 right-0"></div>

      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* LEFT PANEL */}
        <div className="hidden lg:flex flex-col justify-center text-white p-6">
          <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center shadow-2xl mb-8 shadow-blue-500/30">
            <FaShieldAlt className="text-4xl text-white" />
          </div>

          <p className="uppercase tracking-[4px] text-cyan-300 text-xs font-bold mb-2">
            CyberShield SOC Portal
          </p>

          <h1 className="text-4xl font-extrabold leading-tight">
            Cyber Threat Detection Dashboard
          </h1>

          <p className="mt-4 text-blue-100 text-base leading-relaxed">
            Website Cyber Threat Monitoring & AI Intrusion Detection.
            Log in to monitor your website's real-time security telemetry.
          </p>

          <div className="mt-8 space-y-3.5 text-sm">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Real-Time Website Intrusion Detection</span>
            </div>

            <div className="flex items-center gap-3">
              <FaBrain className="text-cyan-300" />
              <span>Hybrid Classifier & Attack Analytics</span>
            </div>

            <div className="flex items-center gap-3">
              <FaDatabase className="text-emerald-300" />
              <span>Per-Website Prediction Logs & Telemetry</span>
            </div>

            <div className="flex items-center gap-3">
              <FaWifi className="text-amber-300" />
              <span>Real-time DDoS, SQLi, and Bot Detection</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: LOGIN CARD */}
        <div className="bg-white/95 backdrop-blur-xl rounded-[28px] shadow-2xl border border-white/20 p-8">
          <div className="text-center lg:text-left">
            <span className="text-blue-700 font-bold uppercase text-xs tracking-[3px]">
              Website Owner Login
            </span>

            <h2 className="text-3xl font-extrabold text-slate-800 mt-2">
              Sign In to Monitor
            </h2>

            <p className="text-slate-500 text-xs mt-1.5">
              Enter your website owner credentials to access your dashboard.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700">
                Email address
              </label>

              <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 mt-1.5 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition">
                <FaUser className="text-blue-600 mr-3 text-sm" />
                <input
                  type="email"
                  placeholder="nexaoranotes@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full outline-none bg-transparent text-slate-800 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                Password
              </label>

              <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 mt-1.5 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition">
                <FaLock className="text-blue-600 mr-3 text-sm" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full outline-none bg-transparent text-slate-800 text-sm"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-blue-600 transition"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-3.5 rounded-xl font-bold text-sm shadow-md shadow-blue-500/25 transition disabled:opacity-75"
            >
              {loading ? "Signing in..." : "Access Website Dashboard →"}
            </button>
          </form>

          {error && (
            <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700 font-medium border border-red-200">
              {error}
            </p>
          )}

          {/* Quick Demo Logins for Website Owners */}
          <div className="mt-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
            <h3 className="text-blue-700 font-bold text-xs uppercase tracking-wider mb-2">
              Website Owner Quick Logins
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setEmail("nexaoranotes@gmail.com");
                  setPassword("password123");
                }}
                className="text-left bg-white p-3 rounded-xl border border-blue-200 hover:border-blue-500 hover:shadow-sm transition"
              >
                <p className="font-bold text-xs text-blue-700">NexaoraNotes Owner</p>
                <p className="text-[11px] text-slate-600 mt-0.5 truncate">nexaoranotes@gmail.com</p>
                <p className="text-[10px] text-slate-400">Pass: password123</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail("admin@cybershield.com");
                  setPassword("Admin@123456");
                }}
                className="text-left bg-white p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-sm transition"
              >
                <p className="font-bold text-xs text-slate-800">CyberShield Platform</p>
                <p className="text-[11px] text-slate-600 mt-0.5 truncate">admin@cybershield.com</p>
                <p className="text-[10px] text-slate-400">Pass: Admin@123456</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;