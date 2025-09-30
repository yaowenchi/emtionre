// src/data/mockSatisfaction.js
// 產生模擬的顧客滿意度資料（001 & 002）

function generateSingleCustomerData(label, baseScore = 50) {
  const data = [];
  const now = new Date();

  // 總共 90 秒，每 5 秒取樣一次 → 18 筆
  for (let i = 0; i < 18; i++) {
    const timestamp = new Date(now.getTime() + i * 5000); // 每 5 秒

    // 模擬分數：以基準值為中心，加上波動
    const score =
      baseScore +
      Math.round(
        30 * Math.sin((i / 18) * Math.PI) + // 越後期分數越高
          (Math.random() * 10 - 5) // 加隨機誤差
      );

    data.push({
      customer: label,
      time: timestamp.toLocaleTimeString("zh-TW", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      score: Math.max(0, Math.min(100, score)), // 限制 0 ~ 100
    });
  }

  return data;
}

export function generateSatisfactionData() {
  const customerA = generateSingleCustomerData("001", 45);
  const customerB = generateSingleCustomerData("002", 60);

  return { customerA, customerB };
}

// 總結分析：針對不同平均分數，給詳細建議
function generateAdvice(avg) {
  if (avg >= 85) return "顧客極為滿意，建議蒐集正向回饋並鼓勵推薦。";
  if (avg >= 70) return "顧客滿意度高，可推廣會員活動與優惠方案。";
  if (avg >= 50) return "顧客滿意度普通，建議增加互動或服務細節。";
  if (avg >= 30) return "顧客情緒偏低，需提供補償方案或更主動的關心。";
  return "顧客極度不滿，建議立即介入處理並檢討服務。";
}

export function summarizeSatisfaction(data) {
  const summaries = {};

  for (const [key, records] of Object.entries(data)) {
    const avg =
      records.reduce((sum, d) => sum + d.score, 0) / (records.length || 1);

    summaries[key] = {
      average: avg.toFixed(2),
      suggestion: generateAdvice(avg),
    };
  }

  return summaries;
}
