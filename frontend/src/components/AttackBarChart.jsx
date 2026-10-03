import { useEffect, useState } from "react";
import API from "../api/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

function AttackBarChart() {
  const [attackData, setAttackData] = useState([]);

  const fetchAttackData = async () => {
    try {
      const response = await API.get("/chart");

      // Highest attack count upar dikhane ke liye sorting
      const sortedData = [...(response.data.data || [])]
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setAttackData(sortedData);
    } catch (error) {
      console.error("Attack Bar Chart Error:", error);
    }
  };

  useEffect(() => {
    fetchAttackData();
    const interval = setInterval(fetchAttackData, 3000);

    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Top Detected Attack Types
          </h2>

          <p className="text-sm text-gray-500">
            Highest detected cyber attacks from live network traffic.
          </p>
        </div>

        <span className="bg-red-100 text-red-700 px-3 py-2 rounded-full text-xs font-bold">
          LIVE THREAT ANALYSIS
        </span>
      </div>

      {/* Chart */}
      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={attackData}
            layout="vertical"
            margin={{ top: 10, right: 25, left: 30, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />

            <XAxis type="number" stroke="#64748B" />

            <YAxis
              type="category"
              dataKey="attack_name"
              width={120}
              stroke="#334155"
              tick={{ fontSize: 12 }}
            />

            <Tooltip
              formatter={(value) => [`${value} Packets`, "Detected"]}
            />

            <Bar dataKey="count" radius={[0, 8, 8, 0]}>
              {attackData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={attackColors[entry.attack_name] || "#64748B"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center border-t pt-4 mt-4 text-sm text-gray-500">
        <span>Top 10 Attack Categories</span>

        <span className="text-red-600 font-semibold">
          ● Updated Every 3 Seconds
        </span>
      </div>
    </div>
  );
}

export default AttackBarChart;