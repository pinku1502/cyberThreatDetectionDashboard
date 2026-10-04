import { useEffect, useState } from "react";
import API from "../api/api";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function AttackPieChart({ websiteId }) {
  const [attackData, setAttackData] = useState([]);

  const fetchChartData = async () => {
    try {
      const response = await API.get("/chart", { params: { website_id: websiteId } });
      setAttackData(response.data.data || []);
    } catch (error) {
      console.error("Pie Chart Error:", error);
    }
  };

  useEffect(() => {
    fetchChartData();
    const interval = setInterval(fetchChartData, 3000);
    return () => clearInterval(interval);
  }, [websiteId]);

  // 15-Class Cyber Security Colors
  const attackColors = {
    BENIGN: "#22C55E",
    DDoS: "#DC2626",
    "DoS Hulk": "#EA580C",
    "DoS GoldenEye": "#F97316",
    "DoS Slowloris": "#FB923C",
    "DoS Slowhttptest": "#FDBA74",
    PortScan: "#2563EB",
    Bot: "#7C3AED",
    "FTP-Patator": "#EAB308",
    "SSH-Patator": "#06B6D4",
    Heartbleed: "#991B1B",
    Infiltration: "#EC4899",
    "Web Attack Brute Force": "#14B8A6",
    "Web Attack SQL Injection": "#0D9488",
    "Web Attack XSS": "#6366F1",
  };

  const COLORS = attackData.map(
    (item) => attackColors[item.attack_name] || "#64748B"
  );

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Attack Distribution
          </h2>
          <p className="text-sm text-gray-500">
            Live prediction distribution from CICIDS2017 network traffic.
          </p>
        </div>

        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-2 rounded-full">
          {attackData.length} ATTACK TYPES
        </span>
      </div>

      {/* Pie Chart */}
      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={attackData}
              dataKey="count"
              nameKey="attack_name"
              cx="50%"
              cy="50%"
              outerRadius={120}
              innerRadius={55}
              paddingAngle={2}
              label={({ attack_name, percent }) =>
                percent > 0.04
                  ? `${attack_name} ${(percent * 100).toFixed(0)}%`
                  : ""
              }
            >
              {attackData.map((entry, index) => (
                <Cell key={index} fill={COLORS[index]} />
              ))}
            </Pie>

            <Tooltip
              formatter={(value) => [`${value} Packets`, "Detected"]}
            />

            <Legend
              verticalAlign="bottom"
              height={36}
              wrapperStyle={{ fontSize: "12px" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Status */}
      <div className="mt-4 flex justify-between text-sm text-gray-500 border-t pt-4">
        <span>Live MySQL Prediction Logs</span>
        <span className="text-green-600 font-semibold">
          ● Auto Refresh (3s)
        </span>
      </div>
    </div>
  );
}

export default AttackPieChart;