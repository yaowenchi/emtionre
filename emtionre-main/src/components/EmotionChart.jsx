import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function EmotionChart({ metric = 'happiness' }) {
  const [data, setData] = useState({ labels: [], datasets: [] });
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  useEffect(() => {
    fetch(`${API_URL}/api/emotions?metric=${encodeURIComponent(metric)}`)
      .then(r => r.json())
      .then(payload => {
        const rows = payload?.data || [];
        const labels = rows.map(r => r.date);
        const values = rows.map(r => (r.value === null ? null : Number(r.value)));
        setData({
          labels,
          datasets: [{
            label: `${metric} 平均`,
            data: values,
            borderColor: 'rgb(75,192,192)',
            backgroundColor: 'rgba(75,192,192,0.2)',
            tension: 0.2,
            spanGaps: true
          }]
        });
      })
      .catch(console.error);
  }, [API_URL, metric]);

  return <Line data={data} />;
}
