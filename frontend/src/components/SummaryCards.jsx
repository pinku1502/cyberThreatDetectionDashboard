import { useEffect, useState } from "react";
import API from "../api/api";
import {
  FaDatabase,
  FaShieldAlt,
  FaBug,
  FaGlobe,
} from "react-icons/fa";

function SummaryCards({ websiteId }) {
  const [stats, setStats] = useState({
    total_predictions: 0,
    benign_predictions: 0,
    attack_predictions: 0,
    unique_ips: 1,
  });

  const fetchStats = async () => {
    try {
      const response = await API.get("/stats", { params: { website_id: websiteId } });
      const data = response.data.data || {};
      setStats({
        total_predictions: data.total_predictions || 0,
        benign_predictions: data.benign_predictions || 0,
        attack_predictions: data.attack_predictions || 0,
        unique_ips: data.unique_ips || (data.total_predictions > 0 ? 1 : 0),
      });
    } catch (error) {
      console.error("Summary Cards Error:", error);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, [websiteId]);

  const benignRate =
    stats.total_predictions > 0
      ? Math.round((stats.benign_predictions / stats.total_predictions) * 100)
      : 100;

  const cards = [
    {
      title: "Total Predictions",
      value: stats.total_predictions,
      icon: <FaDatabase />,
      iconBg: "bg-blue-100/70 text-blue-600",
      badge: "Live",
      badgeStyle: "bg-blue-50 text-blue-600 border border-blue-100/70",
      footerLeft: "Live MySQL Data",
      footerRight: null,
    },
    {
      title: "Benign Traffic",
      value: stats.benign_predictions,
      icon: <FaShieldAlt />,
      iconBg: "bg-emerald-100/70 text-emerald-600",
      badge: "Safe",
      badgeStyle: "bg-emerald-50 text-emerald-600 border border-emerald-100/70",
      footerLeft: "Live MySQL Data",
      footerRight: `↑ ${benignRate}%`,
      footerRightColor: "text-emerald-600 font-bold",
    },
    {
      title: "Detected Attacks",
      value: stats.attack_predictions,
      icon: <FaBug />,
      iconBg: "bg-rose-100/70 text-rose-600",
      badge: "Threats",
      badgeStyle: "bg-rose-50 text-rose-600 border border-rose-100/70",
      footerLeft: "Live MySQL Data",
      footerRight: `↓ ${stats.attack_predictions}`,
      footerRightColor: "text-rose-500 font-bold",
    },
    {
      title: "Unique Client IPs",
      value: stats.unique_ips,
      icon: <FaGlobe />,
      iconBg: "bg-purple-100/70 text-purple-600",
      badge: "IPs",
      badgeStyle: "bg-purple-50 text-purple-600 border border-purple-100/70",
      footerLeft: "Live MySQL Data",
      footerRight: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          {/* Top Row: Icon + Badge */}
          <div className="flex items-center justify-between">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${card.iconBg}`}>
              {card.icon}
            </div>

            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${card.badgeStyle}`}>
              {card.badge}
            </span>
          </div>

          {/* Metric Details */}
          <div className="mt-4">
            <p className="text-xs text-slate-400 font-medium">
              {card.title}
            </p>
            <h2 className="text-3xl font-extrabold text-slate-800 mt-1 tracking-tight">
              {card.value.toLocaleString()}
            </h2>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {card.footerLeft}
            </span>

            {card.footerRight && (
              <span className={card.footerRightColor}>
                {card.footerRight}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default SummaryCards;