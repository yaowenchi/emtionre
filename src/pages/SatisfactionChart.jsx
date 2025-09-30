// src/pages/SatisfactionChart.jsx
import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {
  generateSatisfactionData,
  summarizeSatisfaction,
} from "../data/mockSatisfaction";

// 註冊 Chart.js 元件
ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend
);

export default function SatisfactionChart() {
  const [chartData, setChartData] = useState(null);
  const [summary, setSummary] = useState({});

  useEffect(() => {
    const generated = generateSatisfactionData(); // { customerA: [...], customerB: [...] }
    const summaries = summarizeSatisfaction(generated);

    setChartData({
      labels: generated.customerA.map((d) => d.time), // 橫軸：時間
      datasets: [
        {
          label: "001",
          data: generated.customerA.map((d) => d.score),
          borderColor: "rgb(75,192,192)",
          backgroundColor: "rgba(75,192,192,0.2)",
          tension: 0.3,
          fill: false,
        },
        {
          label: "002",
          data: generated.customerB.map((d) => d.score),
          borderColor: "rgb(255,99,132)",
          backgroundColor: "rgba(255,99,132,0.2)",
          tension: 0.3,
          fill: false,
        },
      ],
    });

    setSummary(summaries);
  }, []);

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: "顧客滿意度折線圖 ",
        font: { size: 20 },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { stepSize: 20 },
      },
    },
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="card w-full max-w-5xl bg-white shadow-xl p-8">
        <h2 className="text-2xl font-bold text-center mb-6">
          顧客滿意度分析
        </h2>

        {chartData && <Line data={chartData} options={options} />}

        {/* 總結區塊 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 001*/}
          <div className="p-6 bg-gray-50 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-teal-700">001</h3>
            <p className="mt-2">
              平均滿意度分數：
              <span className="font-bold text-teal-900">
                {summary.customerA?.average}
              </span>
            </p>
            <p className="mt-1 text-gray-700">
              建議：{summary.customerA?.suggestion}
            </p>
          </div>

          {/* 002 */}
          <div className="p-6 bg-gray-50 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-pink-700">002</h3>
            <p className="mt-2">
              平均滿意度分數：
              <span className="font-bold text-pink-900">
                {summary.customerB?.average}
              </span>
            </p>
            <p className="mt-1 text-gray-700">
              建議：{summary.customerB?.suggestion}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
