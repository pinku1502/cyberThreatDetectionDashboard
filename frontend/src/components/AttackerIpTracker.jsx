import { useEffect, useState } from "react";
import API from "../api/api";
import {
  FaCrosshairs,
  FaShieldAlt,
  FaNetworkWired,
  FaClock,
  FaExclamationCircle,
} from "react-icons/fa";

export default function AttackerIpTracker({ websiteId }) {
  const [attackerIps, setAttackerIps] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAttackerIps = async () => {
    try {
      const response = await API.get("/attacker-ips", {
        params: { website_id: websiteId },
      });
      setAttackerIps(response.data?.data || []);
    } catch (err) {
      console.error("Attacker IPs fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttackerIps();
    const interval = setInterval(fetchAttackerIps, 3000);
    return () => clearInterval(interval);
  }, [websiteId]);

  const getSeverityBadge = (severity) => {
    switch (String(severity).toUpperCase()) {
      case "CRITICAL":
        return "bg-red-600 text-white";
      case "HIGH":
        return "bg-rose-100 text-rose-700 border border-rose-200";
      case "MEDIUM":
        return "bg-amber-100 text-amber-700 border border-amber-200";
      default:
        return "bg-blue-100 text-blue-700 border border-blue-200";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm mt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 text-lg shadow-sm">
            <FaCrosshairs />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
              Attacker IP Threat Tracker
              <span className="bg-rose-50 text-rose-600 border border-rose-100 text-xs px-2 py-0.5 rounded-full font-semibold">
                {attackerIps.length} Detected
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Source IP addresses identified launching cyber threats against this website.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200/80 text-xs font-semibold px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            LIVE IP TRACKING
          </span>
        </div>
      </div>

      {/* Table / Empty State */}
      {loading && attackerIps.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">Loading live threat tracking...</div>
      ) : attackerIps.length === 0 ? (
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-6 text-center">
          <FaShieldAlt className="mx-auto text-3xl text-emerald-600 mb-2" />
          <h3 className="text-sm font-bold text-emerald-800">No Hostile Attackers Detected</h3>
          <p className="text-xs text-slate-500 mt-1">
            All recent connections to this website are verified benign network traffic.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">Attacker Source IP</th>
                <th className="py-3 px-4">Attack Vectors</th>
                <th className="py-3 px-4 text-center">Incidents</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Target Port</th>
                <th className="py-3 px-4">Last Detected</th>
                <th className="py-3 px-4 text-right">Defense Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attackerIps.map((row, idx) => {
                const types = (row.attack_types || "").split(", ");
                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    {/* Attacker Source IP */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100/70 text-rose-600 font-mono text-xs">
                          <FaNetworkWired />
                        </span>
                        <div>
                          <p className="font-mono font-bold text-slate-900 text-xs">
                            {row.client_ip || "Unknown IP"}
                          </p>
                          <p className="text-[10px] text-slate-400">Hostile Origin</p>
                        </div>
                      </div>
                    </td>

                    {/* Attack Vectors */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {types.map((t, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-[11px] text-slate-700"
                          >
                            <FaExclamationCircle className="text-rose-500 text-[10px]" />
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Incidents Count */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block rounded-lg bg-rose-50 border border-rose-100 px-2.5 py-1 font-bold text-rose-700 text-xs">
                        {row.attack_count} attacks
                      </span>
                    </td>

                    {/* Severity */}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getSeverityBadge(row.severity)}`}>
                        {row.severity || "HIGH"}
                      </span>
                    </td>

                    {/* Target Port */}
                    <td className="py-3 px-4 font-mono font-medium text-slate-600">
                      :{row.destination_port || 8000}
                    </td>

                    {/* Last Detected */}
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <FaClock className="text-slate-400" />
                        <span>{new Date(row.last_seen).toLocaleString()}</span>
                      </div>
                    </td>

                    {/* Defense Action */}
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 text-[11px] font-bold">
                        <FaShieldAlt className="text-xs" />
                        TRACKED & FLAGGED
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
