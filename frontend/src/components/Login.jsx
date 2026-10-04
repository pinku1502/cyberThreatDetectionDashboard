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
  const [_loading, setLoading] = useState(false);

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
          "Unable to sign in. Contact your administrator."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-6 overflow-hidden relative">

      {/* Background Glow */}
      <div className="absolute w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full -top-20 -left-20"></div>
      <div className="absolute w-80 h-80 bg-cyan-500/20 blur-[120px] rounded-full bottom-0 right-0"></div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="h-full w-full bg-[linear-gradient(to_right,#2563eb22_1px,transparent_1px),linear-gradient(to_bottom,#2563eb22_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">

        {/* LEFT PANEL */}
        <div className="hidden lg:flex flex-col justify-center text-white p-6">

          <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center shadow-2xl mb-8">
            <FaShieldAlt className="text-5xl" />
          </div>

          <p className="uppercase tracking-[5px] text-cyan-300 text-sm font-semibold mb-3">
            Security Operations Center
          </p>

          <h1 className="text-5xl font-extrabold leading-tight">
            Cyber Threat Detection Dashboard
          </h1>

          <p className="mt-5 text-blue-100 text-lg leading-8">
            AI Powered Network Intrusion Detection using
            <br />
            Random Forest, XGBoost & Hybrid Classifier.
          </p>

          <div className="mt-8 space-y-4">

            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></span>
              <span>Real-Time Threat Monitoring</span>
            </div>

            <div className="flex items-center gap-3">
              <FaBrain className="text-cyan-300" />
              <span>15 Multi-Class Attack Detection</span>
            </div>

            <div className="flex items-center gap-3">
              <FaDatabase className="text-green-300" />
              <span>CICIDS2017 Network Dataset</span>
            </div>

            <div className="flex items-center gap-3">
              <FaWifi className="text-orange-300" />
              <span>Hybrid AI Detection Engine Active</span>
            </div>

          </div>

          <div className="mt-10 bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/10">
            <p className="text-cyan-300 text-sm font-semibold mb-3">
              ACTIVE SECURITY MODULES
            </p>

            <div className="space-y-3 text-sm">

              <div className="flex justify-between">
                <span>Random Forest Model</span>
                <span className="text-green-300">ONLINE</span>
              </div>

              <div className="flex justify-between">
                <span>XGBoost Model</span>
                <span className="text-green-300">ONLINE</span>
              </div>

              <div className="flex justify-between">
                <span>Hybrid Classifier</span>
                <span className="text-green-300">READY</span>
              </div>

              <div className="flex justify-between">
                <span>Threat Monitoring</span>
                <span className="text-green-300">LIVE</span>
              </div>

            </div>
          </div>

        </div>

        {/* RIGHT PANEL */}
        <div className="bg-white/95 backdrop-blur-xl rounded-[32px] shadow-2xl border border-white/20 p-8">

          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-6">
            <div className="bg-blue-600 text-white p-5 rounded-full text-4xl shadow-xl">
              <FaShieldAlt />
            </div>
          </div>

          <div className="text-center lg:text-left">

            <span className="text-blue-700 font-bold uppercase text-xs tracking-[3px]">
              Secure Authentication Portal
            </span>

            <h2 className="text-4xl font-bold text-slate-800 mt-2">
              Welcome Back
            </h2>

            <p className="text-gray-500 mt-2">
              Login to access the Cyber Threat Detection Dashboard.
            </p>

          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="mt-8 space-y-6">

            {/* Email */}
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Email address
              </label>

              <div className="flex items-center bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 mt-2 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-200 transition">
                <FaUser className="text-blue-600 mr-3 text-lg" />

                <input
                  type="email"
                  placeholder="admin@cyberthreat.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full outline-none bg-transparent text-slate-800"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Password
              </label>

              <div className="flex items-center bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 mt-2 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-200 transition">
                <FaLock className="text-blue-600 mr-3 text-lg" />

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Admin@123456"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full outline-none bg-transparent text-slate-800"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-500 hover:text-blue-600 transition"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg transition-all duration-300 hover:scale-[1.02]"
            >
              Secure Login →
            </button>

          </form>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
          )}

          {/* Demo Credentials */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <h3 className="text-blue-700 font-bold text-sm mb-2">
              Demo Credentials
            </h3>

            <p className="text-sm text-slate-700">
              Email: <span className="font-semibold">admin@cyberthreat.local</span>
            </p>

            <p className="text-sm text-slate-700">
              Password: <span className="font-semibold">Admin@123456</span>
            </p>
          </div>

          {/* Security Status */}
          <div className="mt-6 bg-slate-50 rounded-2xl border border-slate-200 p-5">

            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FaShieldAlt className="text-green-600" />
              Security System Status
            </h3>

            <div className="space-y-3">

              {[
                "Random Forest Model Loaded",
                "XGBoost Model Loaded",
                "Hybrid Classifier Active",
                "MySQL Database Connected",
                "Real-Time Threat Monitoring Enabled",
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{item}</span>

                  <span className="flex items-center gap-1 text-green-600 font-semibold text-xs">
                    <FaCheckCircle />
                    ACTIVE
                  </span>
                </div>
              ))}

            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-slate-500">
            Cyber Threat Detection Dashboard v2.0
            <br />
            Random Forest • XGBoost • Hybrid Classifier • CICIDS2017
          </div>

        </div>
      </div>
    </div>
  );
}

export default Login;