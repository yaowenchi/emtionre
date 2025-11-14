import React, { useEffect, useMemo, useState } from 'react';
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const formatHHmmss = (ts) => (ts ? ts.slice(11, 19) : '');

export default function SatisfactionChart() {
  const [availableDates, setAvailableDates] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [points, setPoints] = useState([]);
  const [meta, setMeta] = useState({ start: null, end: null, avg: null, count: 0, minuteKey: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    (async () => {
      const defaultDate = await loadAvailableDates();
      if (defaultDate) {
        await loadTimes(defaultDate, { autoFetch: true });
      }
    })();
  }, []);

  const loadAvailableDates = async () => {
    try {
      const resp = await fetch(`${API_URL}/api/available-dates?limit=60`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const payload = await resp.json();
      const list = payload.dates || [];
      setAvailableDates(list);
      const fallback = list[0]?.date || '';
      setDate(fallback);
      return fallback;
    } catch (err) {
      setErrorMsg(`無法載入日期：${err.message}`);
      return null;
    }
  };

  const loadTimes = async (targetDate, { autoFetch = false } = {}) => {
    if (!targetDate) {
      setAvailableTimes([]);
      setTime('');
      return;
    }
    try {
      const resp = await fetch(`${API_URL}/api/available-times?date=${encodeURIComponent(targetDate)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const payload = await resp.json();
      const list = payload.times || [];
      setAvailableTimes(list);
      if (!list.length) {
        setTime('');
        setPoints([]);
        setMeta({ start: null, end: null, avg: null, count: 0, minuteKey: '' });
        return;
      }
      const nextTime = list.find((item) => item.time === time) ? time : list[0].time;
      setTime(nextTime);
      if (autoFetch) {
        await fetchMinuteSeries(targetDate, nextTime);
      }
    } catch (err) {
      setErrorMsg(`無法載入時間：${err.message}`);
      setAvailableTimes([]);
      setTime('');
    }
  };

  const fetchMinuteSeries = async (targetDate, targetTime) => {
    if (!targetDate || !targetTime) {
      setErrorMsg('請先選擇日期與時間');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const params = new URLSearchParams({ date: targetDate, time: targetTime });
      const resp = await fetch(`${API_URL}/api/minute-satisfaction?${params.toString()}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const payload = await resp.json();
      setPoints(payload.points || []);
      setMeta({
        start: payload.start || null,
        end: payload.end || null,
        avg: payload.avg ?? null,
        count: payload.count ?? (payload.points ? payload.points.length : 0),
        minuteKey: payload.minuteKey || targetTime
      });
    } catch (err) {
      setErrorMsg(`載入失敗：${err.message}`);
      setPoints([]);
      setMeta({ start: null, end: null, avg: null, count: 0, minuteKey: '' });
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = async (event) => {
    const nextDate = event.target.value;
    setDate(nextDate);
    await loadTimes(nextDate, { autoFetch: false });
  };

  const handleTimeChange = (event) => {
    setTime(event.target.value);
  };

  const chartData = useMemo(() => ({
    labels: points.map((p) => formatHHmmss(p.timestamp)),
    datasets: [
      {
        label: meta.minuteKey ? `${meta.minuteKey} 的情緒趨勢` : '情緒趨勢',
        data: points.map((p) => p.value),
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14,165,233,0.2)',
        pointRadius: 3,
        tension: 0.2,
        spanGaps: false
      }
    ]
  }), [points, meta.minuteKey]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = ctx.parsed.y;
            return typeof value === 'number'
              ? `滿意度 ${value.toFixed(2)}`
              : '無資料';
          }
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        title: { display: true, text: '滿意度（50 為基準）' }
      },
      x: {
        title: { display: true, text: '秒 (HH:mm:ss)' },
        ticks: { maxTicksLimit: 12 }
      }
    }
  }), []);

  return (
    <div style={{ padding: 16, width: '100%', maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 12 }}>每分鐘滿意度折線圖</h2>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
        <label>
          <span>日期：</span>
          <select value={date} onChange={handleDateChange}>
            {availableDates.map((d) => (
              <option key={d.date} value={d.date}>
                {d.date}（{d.count} 筆）
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>時間：</span>
          <select value={time} onChange={handleTimeChange} disabled={!availableTimes.length}>
            {availableTimes.map((t) => (
              <option key={t.time} value={t.time}>
                {t.time}（{t.count} 筆）
              </option>
            ))}
          </select>
        </label>

        <button onClick={() => fetchMinuteSeries(date, time)} disabled={loading || !time}>
          {loading ? '載入中…' : '載入時間'}
        </button>
      </div>

      {errorMsg && <div style={{ color: '#b91c1c', marginBottom: 8 }}>{errorMsg}</div>}

      <div style={{ height: '65vh', width: '100%', border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
        {points.length ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <div style={{ textAlign: 'center', marginTop: '20%' }}>
            {loading ? '資料載入中…' : '請選擇有資料的日期與時間後按「載入時間」。'}
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 16 }}>
        <div>分鐘區間：{meta.start ? `${meta.start} ~ ${meta.end}` : '-'}</div>
        <div>資料筆數：{meta.count || 0}</div>
        <div>平均滿意度：{meta.avg == null ? '-' : meta.avg.toFixed(2)}</div>
      </div>
    </div>
  );
}
