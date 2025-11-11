import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { useSearchParams } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function hhmm(minStr) {
  return minStr.slice(11, 16); // 'YYYY-MM-DD HH:mm:00' -> 'HH:mm'
}
function colorPrimary() {
  return '#10b981';
}

export default function SatisfactionChart() {
  const [params, setParams] = useSearchParams();
  const dateParam = params.get('date') || today();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const [date, setDate] = useState(dateParam);
  const [segments, setSegments] = useState([]);   // [{start,end,count,points:[{minute,value}]}]
  const [selected, setSelected] = useState([]);   // boolean[] 對應 segments
  const [overallAvg, setOverallAvg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const triedAutoFallbackRef = useRef(false);

  const pushDateToUrl = (d) => {
    params.set('date', d);
    setParams(params, { replace: true });
  };

  const loadSegments = async (d) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const r = await fetch(`${API_URL}/api/satisfaction-segments?date=${encodeURIComponent(d)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const payload = await r.json();
      const segs = payload.segments || [];
      setSegments(segs);
      setSelected(segs.map((_, idx) => idx === 0)); // 預設只勾第一段
      setOverallAvg(payload.overall_avg ?? null);
    } catch (e) {
      setErrorMsg(`載入失敗：${e.message}`);
      setSegments([]);
      setSelected([]);
      setOverallAvg(null);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableDates = async () => {
    try {
      const r = await fetch(`${API_URL}/api/available-dates?limit=60`);
      if (!r.ok) return;
      const payload = await r.json();
      setAvailableDates(payload.dates || []);
      return payload.dates || [];
    } catch {
      return [];
    }
  };

  // 初次載入：先嘗試現在 URL 的日期；若沒有資料，改抓最近有資料的那天
  useEffect(() => {
    (async () => {
      setDate(dateParam);
      await loadSegments(dateParam);
      if (!triedAutoFallbackRef.current) {
        triedAutoFallbackRef.current = true;
        // 若當天沒有任何段落，嘗試自動跳到最近有資料的日期
        if (segments.length === 0) {
          const dates = await loadAvailableDates();
          if (dates.length > 0 && dates[0].date && dates[0].date !== dateParam) {
            setDate(dates[0].date);
            pushDateToUrl(dates[0].date);
            await loadSegments(dates[0].date);
          }
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateParam]); // 只在 URL 日期改變時觸發

  // 由選取段落組合出 labels/data（段落間插入 null 形成缺口）
  const chartData = useMemo(() => {
    const labels = [];
    const data = [];
    let firstAdded = false;

    segments.forEach((seg, i) => {
      if (!selected[i]) return;
      if (firstAdded) {
        labels.push('');  // 段落間插入空點讓線段斷開
        data.push(null);
      }
      for (const p of seg.points) {
        labels.push(hhmm(p.minute));
        data.push(p.value);
      }
      firstAdded = true;
    });

    return {
      labels,
      datasets: [
        {
          label: `${date} satisfaction (per minute, segmented)`,
          data,
          borderColor: colorPrimary(),
          backgroundColor: `${colorPrimary()}33`,
          tension: 0.25,
          spanGaps: false,
          pointRadius: 2
        }
      ]
    };
  }, [segments, selected, date]);

  const toggleSeg = (idx) => setSelected(prev => prev.map((v, i) => (i === idx ? !v : v)));
  const selectAll = () => setSelected(segments.map(() => true));
  const selectNone = () => setSelected(segments.map(() => false));
  const selectFirst = () => setSelected(segments.map((_, i) => i === 0));

  const handleLoadClick = async () => {
    pushDateToUrl(date);
    await loadSegments(date);
  };
  const handleLoadLatestClick = async () => {
    const dates = availableDates.length ? availableDates : await loadAvailableDates();
    if (dates.length > 0 && dates[0].date) {
      setDate(dates[0].date);
      pushDateToUrl(dates[0].date);
      await loadSegments(dates[0].date);
    }
  };

  return (
    <div style={{ padding: 16, width: '100%', maxWidth: '100%' }}>
      <h2 style={{ marginBottom: 12, textAlign: 'center' }}>
        每分鐘滿意度（依段落）— {date}
      </h2>

      {/* 資料選擇 */}
      <div style={{ marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <label>日期：</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <button onClick={handleLoadClick}>載入</button>
        <button onClick={handleLoadLatestClick}>最近有資料</button>
        {availableDates.length > 0 && (
          <span style={{ color: '#666' }}>
            近幾天有資料：{availableDates.slice(0, 5).map(d => d.date).join(', ')}{availableDates.length > 5 ? ' ...' : ''}
          </span>
        )}
      </div>

      {/* 錯誤訊息 */}
      {errorMsg && (
        <div style={{ color: '#b91c1c', marginBottom: 8 }}>
          {errorMsg}
        </div>
      )}

      {/* 段落勾選列：永遠顯示控制與按鈕 */}
      <div style={{ marginBottom: 8 }}>
        <strong>段落：</strong>
        {loading && <span> Loading...</span>}
        {!loading && segments.length === 0 && <span> 無當日資料</span>}
        <div style={{ margin: '6px 0' }}>
          <button onClick={selectFirst} style={{ marginRight: 8 }}>只看第一段</button>
          <button onClick={selectAll} style={{ marginRight: 8 }}>全選</button>
          <button onClick={selectNone}>全不選</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {segments.map((s, idx) => (
            <label key={idx} style={{ border: '1px solid #ddd', borderRadius: 6, padding: '6px 8px' }}>
              <input
                type="checkbox"
                checked={!!selected[idx]}
                onChange={() => toggleSeg(idx)}
                style={{ marginRight: 6 }}
              />
              {hhmm(s.start)} ~ {hhmm(s.end)}（{s.count} 分）
            </label>
          ))}
        </div>
      </div>

      {/* 圖表：撐滿頁面寬、高 70vh */}
      <div style={{ width: '100%', height: '70vh' }}>
        <Line
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: { legend: { display: true, position: 'top' } },
            interaction: { mode: 'nearest', intersect: false },
            scales: {
              y: { min: 0, max: 100, title: { display: true, text: '滿意度' } },
              x: { title: { display: true, text: '時間（HH:mm）' }, ticks: { maxRotation: 0, autoSkip: true } }
            }
          }}
        />
      </div>

      <div style={{ marginTop: 12, fontSize: 16 }}>
        當日平均滿意度：{overallAvg == null ? '-' : overallAvg.toFixed(2)}
      </div>
    </div>
  );
}
