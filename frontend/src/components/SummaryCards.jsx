import { useEffect, useState } from "react";
import API from "../api/api";
import {
  FaDatabase,
  FaShieldAlt,
  FaBug,
  FaLayerGroup,
  FaArrowUp,
} from "react-icons/fa";

function SummaryCards({ websiteId }) {
  const [stats, setStats] = useState({
    total_predictions: 0,
    benign_predictions: 0,
    attack_predictions: 0,
    attack_types: 15,
  });

  const fetchStats = async () => {
    try {
      const response = await API.get("/stats", { params: { website_id: websiteId } });

      setStats({
        total_predictions:
          response.data.data?.total_predictions || 0,
        benign_predictions:
          response.data.data?.benign_predictions || 0,
        attack_predictions:
          response.data.data?.attack_predictions || 0,
        attack_types:
          response.data.data?.attack_types || 15,
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

  const cards = [
    {
      title: "Total Predictions",
      value: stats.total_predictions,
      subtitle: "Network traffic analyzed",
      icon: <FaDatabase />,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-700",
      badge: "LIVE",
      badgeColor: "bg-blue-50 text-blue-700",
      footer: "Real-time MySQL Records",
      footerColor: "text-blue-600",
    },
    {
      title: "Benign Traffic",
      value: stats.benign_predictions,
      subtitle: "Safe network packets",
      icon: <FaShieldAlt />,
      iconBg: "bg-green-100",
      iconColor: "text-green-700",
      badge: "SAFE",
      badgeColor: "bg-green-50 text-green-700",
      footer: "Normal traffic detected",
      footerColor: "text-green-600",
    },
    {
      title: "Attack Traffic",
      value: stats.attack_predictions,
      subtitle: "Malicious packets detected",
      icon: <FaBug />,
      iconBg: "bg-red-100",
      iconColor: "text-red-700",
      badge: "THREAT",
      badgeColor: "bg-red-50 text-red-700",
      footer: "Multi-Class Threat Detection",
      footerColor: "text-red-600",
    },
    {
      title: "Attack Types",
      value: stats.attack_types,
      subtitle: "CICIDS2017 attack categories",
      icon: <FaLayerGroup />,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-700",
      badge: "15 CLASSES",
      badgeColor: "bg-purple-50 text-purple-700",
      footer: "Random Forest + XGBoost + Hybrid",
      footerColor: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          {/* Icon + Badge */}
          <div className="flex items-center justify-between">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${card.iconBg} ${card.iconColor}`}
            >
              {card.icon}
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${card.badgeColor}`}
            >
              {card.badge}
            </span>
          </div>

          {/* Title */}
          <h3 className="mt-5 text-gray-500 text-sm font-medium">
            {card.title}
          </h3>

          {/* Value */}
          <h1 className="text-4xl font-bold text-gray-800 mt-2">
            {card.value.toLocaleString()}
          </h1>

          {/* Subtitle */}
          <p className="text-sm text-gray-400 mt-2">{card.subtitle}</p>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-between border-t pt-4 border-gray-100">
            <span className={`text-xs font-semibold ${card.footerColor}`}>
              {card.footer}
            </span>

            <div className={`flex items-center gap-1 ${card.footerColor}`}>
              <FaArrowUp className="text-xs" />
              <span className="text-xs font-bold">LIVE</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SummaryCards;