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
} from "recharts";

function AttackBarChart({ websiteId }) {
  const [attackData, setAttackData] = useState([]);

  const fetchAttackData = async () => {
    try {
      const response = await API.get("/chart", { params: { website_id: websiteId } });
      setAttackData(response.data.data || []);
    } catch (error) {
      console.error("Attack Bar Chart Error:", error);
    }
  };

  useEffect(() => {
    fetchAttackData();
    const interval = setInterval(fetchAttackData, 3000);
    return () => clearInterval(interval);
  }, [websiteId]);

  const totalCount = attackData.reduce((acc, curr) => acc + Number(curr.count || 0), 0);

  const displayData =
    attackData.length > 0 ? attackData : [{ attack_name: "BENIGN", count: 0 }];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Attack Count Analysis
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Number of predictions detected for each attack category.
          </p>
        </div>

        <span className="bg-blue-50 text-blue-600 text-xs font-semibold px-2.5 py-1 rounded-lg border border-blue-100">
          Total: {totalCount}
        </span>
      </div>

      {/* Bar Chart */}
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={displayData}
            margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />

            <XAxis
              dataKey="attack_name"
              stroke="#94A3B8"
              tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: "#CBD5E1" }}
            />

            <YAxis
              stroke="#94A3B8"
              tick={{ fontSize: 11, fill: "#64748B" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />

            <Tooltip
              formatter={(value) => [`${value} Logs`, "Predictions"]}
              contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
            />

            <Bar
              dataKey="count"
              fill="#2563EB"
              radius={[6, 6, 0, 0]}
              maxBarSize={60}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="mt-2 text-[11px] text-slate-400 font-medium">
        Source: MySQL Prediction Logs
      </div>
    </div>
  );
}

export default AttackBarChart;