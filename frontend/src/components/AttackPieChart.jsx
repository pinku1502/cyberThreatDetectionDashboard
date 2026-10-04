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

  const totalCount = attackData.reduce((acc, curr) => acc + Number(curr.count || 0), 0);

  const attackColors = {
    BENIGN: "#2563EB",
    DDoS: "#EF4444",
    "DoS Hulk": "#F97316",
    "DoS GoldenEye": "#FB923C",
    "DoS Slowloris": "#FBBF24",
    "DoS Slowhttptest": "#F59E0B",
    PortScan: "#3B82F6",
    Bot: "#8B5CF6",
    "FTP-Patator": "#EAB308",
    "SSH-Patator": "#06B6D4",
    Heartbleed: "#DC2626",
    Infiltration: "#EC4899",
    "Web Attack Brute Force": "#14B8A6",
    "Web Attack SQL Injection": "#0D9488",
    "Web Attack XSS": "#6366F1",
  };

  const displayData = attackData.length > 0 ? attackData : [{ attack_name: "BENIGN", count: 1 }];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col justify-between">
      {/* Card Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Attack Distribution
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Live prediction distribution from MySQL database.
          </p>
        </div>

        <span className="bg-blue-50 text-blue-600 text-xs font-semibold px-2.5 py-1 rounded-lg border border-blue-100">
          Total: {totalCount}
        </span>
      </div>

      {/* Donut Chart */}
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={displayData}
              dataKey="count"
              nameKey="attack_name"
              cx="45%"
              cy="50%"
              outerRadius={100}
              innerRadius={65}
              strokeWidth={0}
              paddingAngle={2}
            >
              {displayData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={attackColors[entry.attack_name] || "#2563EB"}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value} logs`, name]}
              contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default AttackPieChart;