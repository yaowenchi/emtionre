const express = require('express');
const http = require('http');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');

// 載入環境變數
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, 'emtionre-main.env') });

const app = express();
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'U1133029',
  password: process.env.DB_PASS || 'U1133029',
  database: process.env.DB_NAME || 'emotion',
  waitForConnections: true,
  connectionLimit: 10
});

(async () => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('MySQL connected');
  } catch (err) {
    console.error('MySQL connection failed:', err.message);
  }
})();

const POS_WEIGHTS = { happiness: 1.0, surprise: 0.4 };
const NEG_WEIGHTS = { sadness: 0.8, anger: 1.0, disgust: 0.9, fear: 0.9 };

function norm01(v) {
  if (v == null) return 0;
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  const x = n > 1 ? n / 100 : n;
  return Math.max(0, Math.min(1, x));
}

function deriveSatisfaction(row) {
  const p = POS_WEIGHTS.happiness * norm01(row.happiness)
          + POS_WEIGHTS.surprise  * norm01(row.surprise);
  const n = NEG_WEIGHTS.sadness * norm01(row.sadness)
          + NEG_WEIGHTS.anger   * norm01(row.anger)
          + NEG_WEIGHTS.disgust * norm01(row.disgust)
          + NEG_WEIGHTS.fear    * norm01(row.fear);
  const score = 50 + 50 * (p - n);
  return Math.max(0, Math.min(100, score));
}

function formatDateTime(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  const hh = String(dateObj.getHours()).padStart(2, '0');
  const mm = String(dateObj.getMinutes()).padStart(2, '0');
  const ss = String(dateObj.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

/* ==== 每日分段（原邏輯） ==== */
app.get('/api/satisfaction-segments', async (req, res) => {
  try {
    const date = String(req.query.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'invalid date, expected YYYY-MM-DD' });
    }

    const table = process.env.DB_TABLE || 'emotion_detection_customeremotion';
    const dateCol = process.env.DB_DATE_COLUMN || 'created_at';

    const start = `${date} 00:00:00`;
    const next  = `${date} 00:00:00`;

    const [rows] = await pool.query(
      `
      SELECT
        DATE_FORMAT(\`${dateCol}\`, '%Y-%m-%d %H:%i:00') AS minute,
        happiness, sadness, anger, surprise, disgust, fear, neutral
      FROM \`${table}\`
      WHERE \`${dateCol}\` >= ?
        AND \`${dateCol}\` < DATE_ADD(?, INTERVAL 1 DAY)
      ORDER BY \`${dateCol}\` ASC
      `,
      [start, next]
    );

    if (!rows.length) {
      return res.json({ date, first_minute: null, overall_avg: null, segments: [] });
    }

    const perMinute = new Map();
    let totalSum = 0;
    let totalCnt = 0;

    for (const r of rows) {
      const s = deriveSatisfaction(r);
      if (!perMinute.has(r.minute)) perMinute.set(r.minute, { sum: 0, cnt: 0 });
      const cell = perMinute.get(r.minute);
      cell.sum += s;
      cell.cnt += 1;
      totalSum += s;
      totalCnt += 1;
    }

    const minutes = [...perMinute.entries()]
      .map(([minute, { sum, cnt }]) => ({ minute, value: Number((sum / cnt).toFixed(6)) }))
      .sort((a, b) => a.minute.localeCompare(b.minute));

    const parseMinute = (m) => {
      const [d, t] = m.split(' ');
      const [Y, M, D] = d.split('-').map(Number);
      const [h, mi, s] = t.split(':').map(Number);
      return new Date(Y, M - 1, D, h, mi, s || 0, 0);
    };

    const segments = [];
    let current = null;

    minutes.forEach((cur) => {
      const curTs = parseMinute(cur.minute).getTime();
      if (!current) {
        current = { start: cur.minute, end: cur.minute, points: [cur] };
        return;
      }
      const prev = current.points[current.points.length - 1];
      const prevTs = parseMinute(prev.minute).getTime();
      const diffSec = Math.floor((curTs - prevTs) / 1000);

      if (diffSec > 60) {
        current.end = current.points[current.points.length - 1].minute;
        current.count = current.points.length;
        segments.push(current);
        current = { start: cur.minute, end: cur.minute, points: [cur] };
      } else {
        current.points.push(cur);
      }
    });

    if (current) {
      current.end = current.points[current.points.length - 1].minute;
      current.count = current.points.length;
      segments.push(current);
    }

    const first_minute = segments.length ? segments[0].start : null;
    const overall_avg = totalCnt ? Number((totalSum / totalCnt).toFixed(6)) : null;

    res.json({ date, first_minute, overall_avg, segments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

/* ==== 單一分鐘：輸出該分鐘內的每一筆紀錄 ==== */
app.get('/api/minute-satisfaction', async (req, res) => {
  try {
    const date = String(req.query.date || '').trim();
    const time = String(req.query.time || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      return res.status(400).json({ error: 'date=YYYY-MM-DD, time=HH:mm required' });
    }

    const start = `${date} ${time}:00`;
    const table = process.env.DB_TABLE || 'emotion_detection_customeremotion';
    const dateCol = process.env.DB_DATE_COLUMN || 'created_at';

    const [rows] = await pool.query(
      `
      SELECT
        DATE_FORMAT(\`${dateCol}\`, '%Y-%m-%d %H:%i:%s') AS ts_label,
        happiness, sadness, anger, surprise, disgust, fear
      FROM \`${table}\`
      WHERE \`${dateCol}\` >= ?
        AND \`${dateCol}\` < DATE_ADD(?, INTERVAL 1 MINUTE)
      ORDER BY \`${dateCol}\`
      `,
      [start, start]
    );

    if (!rows.length) {
      return res.json({ date, time, start, end: formatDateTime(new Date(new Date(start).getTime() + 60000)), avg: null, points: [] });
    }

    const points = rows.map((row, idx) => {
      const ts = row.ts_label;
      const timePart = ts.split(' ')[1] || '00:00:00';
      const [hour = '00', minute = '00', second = '00'] = timePart.split(':');
      return {
        index: idx,
        timestamp: ts,
        hour,
        minute,
        second,
        minuteKey: `${hour}:${minute}`,
        value: Number(deriveSatisfaction(row).toFixed(4))
      };
    });

    const avg = Number(
      (points.reduce((sum, p) => sum + p.value, 0) / points.length).toFixed(4)
    );

    res.json({
      date,
      time,
      minuteKey: points[0].minuteKey,
      start,
      end: formatDateTime(new Date(new Date(start).getTime() + 60000)),
      avg,
      count: points.length,
      points
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

/* ==== 取得指定日期的所有分鐘（作為時間選單） ==== */
app.get('/api/available-times', async (req, res) => {
  try {
    const date = String(req.query.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'invalid date, expected YYYY-MM-DD' });
    }

    const table = process.env.DB_TABLE || 'emotion_detection_customeremotion';
    const dateCol = process.env.DB_DATE_COLUMN || 'created_at';

    const [rows] = await pool.query(
      `
      SELECT
        DATE_FORMAT(\`${dateCol}\`, '%H:%i') AS hhmm,
        MIN(DATE_FORMAT(\`${dateCol}\`, '%Y-%m-%d %H:%i:%s')) AS first_record,
        MAX(DATE_FORMAT(\`${dateCol}\`, '%Y-%m-%d %H:%i:%s')) AS last_record,
        COUNT(*) AS c
      FROM \`${table}\`
      WHERE DATE(\`${dateCol}\`) = ?
      GROUP BY hhmm
      ORDER BY hhmm ASC
      `,
      [date]
    );

    res.json({
      date,
      times: rows.map((r) => ({
        time: r.hhmm,
        first: r.first_record,
        last: r.last_record,
        count: Number(r.c)
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

/* ==== 近幾日有資料的日期 ==== */
app.get('/api/available-dates', async (req, res) => {
  try {
    const table = process.env.DB_TABLE || 'emotion_detection_customeremotion';
    const dateCol = process.env.DB_DATE_COLUMN || 'created_at';
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit || '30'), 10) || 30, 1),
      365
    );
    const [rows] = await pool.query(
      `
      SELECT DATE(\`${dateCol}\`) AS d, COUNT(*) AS c
      FROM \`${table}\`
      GROUP BY DATE(\`${dateCol}\`)
      ORDER BY DATE(\`${dateCol}\`) DESC
      LIMIT ?
      `,
      [limit]
    );
    res.json({ dates: rows.map((r) => ({ date: r.d, count: Number(r.c) })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/db-ping', async (_req, res) => {
  try {
    const c = await pool.getConnection();
    await c.ping();
    c.release();
    res.json({ db: 'ok' });
  } catch (e) {
    res.status(500).json({ db: 'fail', error: e.message });
  }
});

const server = http.createServer(app);
const PORT = parseInt(process.env.PORT || '4000', 10);
server.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));

async function shutdown() {
  console.log('Shutting down...');
  try { await pool.end(); } catch (e) {}
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
