import { DailyReportDAO } from "./dailyReport.dao";
import type { V2exHodlRow, V2exerSolanaAddressDetailRow } from "../types";

export interface MarkdownArticle {
  title: string;
  content: string;
}

// 控制 QuickChart 点数上限（所有序列点数之和）。留有余量避免 349/1044 类限制触发。
const CHART_MAX_TOTAL_POINTS = 280;

export async function generateDailyReport(env: Env): Promise<MarkdownArticle> {
  const [addressDetails, hodlData] = await Promise.all([
    DailyReportDAO.getLatestAddressDetails(env),
    DailyReportDAO.getLatestHodl(env),
  ]);

  const report = await displayDailyReport({
    addressDetails,
    hodlData,
  });

  return report;
}

/// 渲染日报内容
async function displayDailyReport(params: {
  addressDetails: V2exerSolanaAddressDetailRow[];
  hodlData: V2exHodlRow[];
}): Promise<MarkdownArticle> {
  const { addressDetails, hodlData } = params;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const title = `$V2EX日报(${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()})`;

  const latestHodl = hodlData[0];

  const summaryLines: string[] = [];
  if (latestHodl) {
    const priceChange = latestHodl.price_change_24h.toFixed(2) + "%";
    summaryLines.push(
      `- 持币人数：${fmtNumber(latestHodl.holders)}`
    );
    summaryLines.push(
      `- 10k+HODL用户数：${fmtNumber(latestHodl.hodl_10k_addresses_count)}`
    );
    summaryLines.push(
      `- Solana创建用户数：${fmtNumber(latestHodl.new_accounts_via_solana)}`
    );
    summaryLines.push(
      `- 绑定SOL地址用户数：${fmtNumber(latestHodl.total_solana_addresses_linked)}`
    );
    summaryLines.push(
      `- $V2EX价格变动(24h)：${priceChange}`
    );
    summaryLines.push(
      `- 当日收盘价格：`,
      `BTC - $${fmtNumber(latestHodl.btc_price, 2)}`,
      `SOL - $${fmtNumber(latestHodl.sol_price, 2)}`,
      `PUMP - $${fmtNumber(latestHodl.pump_price, 4)}`,
      `V2EX - $${fmtNumber(latestHodl.price, 4)}`
    );
  }

  const parts: string[] = [];
  parts.push(`> 早上好！以下为昨日摘要：`);
  parts.push("");
  parts.push(summaryLines.join("\n"));
  parts.push("");

  // 图表 - 如果 hodlData 当天有多条采样，绘制价格走势
  const priceChart = await buildPriceChart(hodlData);
  if (priceChart) {
    parts.push("## 聚合价格走势");
    parts.push("");
    parts.push(`![聚合价格走势](${priceChart})`);
    parts.push("");
  }

  // 新增图表 - 当天在线人数变化（曲线图）
  const onlineChart = await buildOnlineUsersChart(hodlData);
  if (onlineChart) {
    parts.push("## 当天在线人数变化");
    parts.push("");
    parts.push(`![在线人数](${onlineChart})`);
    parts.push("");
  }

  // 新增图表 - 持有1W人数 + 持币人数 + 绑定人数（曲线图）
  const holdersChart = await buildHoldersBundleChart(hodlData);
  if (holdersChart) {
    parts.push("## 社区规模变化");
    parts.push("");
    parts.push(`![规模变化](${holdersChart})`);
    parts.push("");
  }

  // 图表 - 使用最新快照绘制运营数据柱状图
  const metricsChart = latestHodl ? await buildMetricsBarChart(latestHodl) : null;
  if (metricsChart) {
    parts.push("## 运营数据概览");
    parts.push("");
    parts.push(`![运营数据](${metricsChart})`);
    parts.push("");
  }

  // TOP120 变动信息（来自 v2exer_solana_address_detail）
  parts.push("## TOP120 变动信息");
  parts.push("");
  const top120Latest = pickTop120LatestPerOwner(addressDetails);
  // 仅保留排名或数量至少一个有变化的记录
  const changedTop120 = top120Latest.filter((d) => ((d.amount_delta ?? 0) !== 0));
  if (changedTop120.length === 0) {
    parts.push("- 无");
  } else {
    // 表头
    parts.push("| 排名 | 地址 | 持有数量 | 持仓比例 | 排名变化 | 数量变化 |");
    parts.push("| ---: | --- | ---: | ---: | ---: | ---: |");
    for (const d of changedTop120) {
      const rank = d.hold_rank != null ? `#${d.hold_rank}` : "-";
      const addrShort = shorten(d.owner_address, 4, 4);
      const amount = fmtCompactToken(d.hold_amount);
      const pct = fmtPercentage(d.hold_percentage);
      const rankDelta = d.rank_delta != null ? fmtSigned(d.rank_delta) : "";
      const amtDelta = d.amount_delta != null ? fmtSignedCompactToken(d.amount_delta) : "";
      parts.push(`| ${rank} | ${addrShort} | ${amount} | ${pct} | ${rankDelta} | ${amtDelta} |`);
    }
    parts.push("");
  }

  parts.push("----");
  parts.push("此报告由 [V2EX Info](https://v2ex.info) 提供数据, 由 [Newsletter Report Bot](https://v2ex.info/tools/daily-report-bot) 自动生成。");
  parts.push("");
  parts.push("此报告仅供参考，不构成任何投资建议。投资有风险，入市需谨慎。");
  parts.push("");
  return { title, content: parts.join("\n") };
}

// ============ 辅助函数 ============
function displayName(username: string | null, address: string): string {
  return username ?? shorten(address);
}

function shorten(addr: string, head = 6, tail = 4): string {
  if (addr.length <= head + tail + 3) return addr;
  return `${addr.slice(0, head)}...${addr.slice(-tail)}`;
}

function fmtNumber(n: number, fractionDigits = 0): string {
  return n.toLocaleString(undefined, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
}

function fmtSigned(n: number): string {
  if (n === 0) return "-";
  return n > 0 ? `+${n}` : `${n}`;
}

function fmtSignedPercent(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "" : "±";
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

function fmtPercentage(p: number): string {
  // 假定已是 0-100 区间
  return `${p.toFixed(2)}%`;
}

function fmtTokenAmount(rawAmount: number, decimals: number): string {
  const factor = Math.pow(10, decimals || 0);
  const v = factor > 0 ? rawAmount / factor : rawAmount;
  const digits = v >= 100 ? 2 : v >= 1 ? 4 : 6;
  return `${v.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 })}`;
}

// 金额紧凑显示：不超过 1000 原样；>1000 显示 k；>=100k 显示 M（例如 100k -> 0.1M）
function fmtCompactNumber(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 100_000) return (abs / 1_000_000).toFixed(2) + "M";
  if (abs > 1_000) return (abs / 1_000).toFixed(2) + "K";
  const digits = abs >= 100 ? 2 : abs >= 1 ? 4 : 6;
  return abs.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

function fmtCompactToken(rawAmount: number): string {
  return fmtCompactNumber(rawAmount);
}

function fmtSignedCompactToken(rawAmountDelta: number): string {
  if (rawAmountDelta === 0) return "-";
  const sign = rawAmountDelta > 0 ? "+" : "-";
  const absRaw = Math.abs(rawAmountDelta);
  return sign + fmtCompactToken(absRaw);
}

function fmtTime(iso: string, timeZone = "Asia/Shanghai"): string {
  // 情况1：数据库常见无时区时间，如 "YYYY-MM-DD HH:mm:ss" 或 "YYYY-MM-DDTHH:mm:ss"
  // 需要“先按 UTC 解释再转换到目标时区（默认 Asia/Shanghai）”。
  const naiveFull = iso.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (naiveFull) {
    const [_, Y, M, D, h, m, s] = naiveFull;
    // 构造 UTC 时间
    const ms = Date.UTC(
      Number(Y),
      Number(M) - 1,
      Number(D),
      Number(h),
      Number(m),
      s ? Number(s) : 0
    );
    const d = new Date(ms);
    try {
      return d.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone,
      });
    } catch {
      // 兜底：用 UTC 小时+分钟手动拼接（不依赖环境时区）
      const hh = `${d.getUTCHours()}`.padStart(2, "0");
      const mm = `${d.getUTCMinutes()}`.padStart(2, "0");
      return `${hh}:${mm}`;
    }
  }

  // 情况2：其它字符串（可能自带时区/偏移），直接按其语义解析并转为目标时区显示
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    // 无法解析时，直接返回原字符串以避免误导
    return iso;
  }
  try {
    return d.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    });
  } catch {
    const hh = `${d.getHours()}`.padStart(2, "0");
    const mm = `${d.getMinutes()}`.padStart(2, "0");
    return `${hh}:${mm}`;
  }
}

async function buildPriceChart(hodlData: V2exHodlRow[]): Promise<string | null> {
  if (!hodlData || hodlData.length < 2) return null;
  // 逆序，时间从早到晚
  const rows = [...hodlData].sort((a, b) => a.created_at.localeCompare(b.created_at));
  let labels = rows.map((r) => fmtTime(r.created_at));
  let v2ex = rows.map((r) => round(r.price, 6));
  let btc = rows.map((r) => round(r.btc_price, 2));
  let sol = rows.map((r) => round(r.sol_price, 3));
  let pump = rows.map((r) => round(r.pump_price, 6));

  // 降采样，控制总点数（所有序列之和）不超过 1000
  ({ labels, series: [v2ex, btc, sol, pump] } = downsampleMultiSeries(labels, [v2ex, btc, sol, pump], CHART_MAX_TOTAL_POINTS));

  // 统一比例：各序列归一化到 0..100；仅在拐点处显示原始值
  const normalized = normalizeSeriesSet([v2ex, btc, sol, pump]);
  const priceRawStrings = [
    v2ex.map((v) => `$${fmtNumber(v, 6)}`),
    btc.map((v) => `$${fmtNumber(v, 2)}`),
    sol.map((v) => `$${fmtNumber(v, 3)}`),
    pump.map((v) => `$${fmtNumber(v, 6)}`),
  ];
  const turningIdx = normalized.map((s) => findTurningPointsIndices(s, 12));
  const datasets = [
    buildDatasetWithDatalabels("V2EX", normalized[0], priceRawStrings[0], "#2b90d9", turningIdx[0]),
    buildDatasetWithDatalabels("BTC", normalized[1], priceRawStrings[1], "#f7931a", turningIdx[1]),
    buildDatasetWithDatalabels("SOL", normalized[2], priceRawStrings[2], "#14f195", turningIdx[2]),
    buildDatasetWithDatalabels("PUMP", normalized[3], priceRawStrings[3], "#9b59b6", turningIdx[3]),
  ];

  const config = {
    type: "line",
    data: {
      labels,
      datasets,
    },
    options: {
      spanGaps: true,
      plugins: { legend: { display: true, position: "bottom" } },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 100,
          ticks: { display: false },
          grid: { display: false },
        },
      },
    },
  } as const;

  return await quickChartCreateUrl(config, 800, 400);
}

async function buildMetricsBarChart(h: V2exHodlRow): Promise<string> {
  const labels = [
    "$V2EX总持币人数",
    "10K+HODL人数",
    "通过Solana新建账号数",
    "V2EX绑定SOL地址用户数",
    "V2EX成员发出打赏次数",
    "V2EX成员收到打赏次数",
    "V2EX站内通过$V2EX打赏次数",
    "V2EX站内通过SOL打赏次数"
  ];
  const data = [
    h.holders,
    h.hodl_10k_addresses_count,
    h.new_accounts_via_solana,
    h.total_solana_addresses_linked,
    h.member_tips_sent,
    h.member_tips_received,
    h.v2ex_token_tip_count,
    h.sol_tip_operations_count
  ];

  const config = {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "今日概览",
          data,
          backgroundColor: "rgba(43,144,217,0.6)",
          borderColor: "#2b90d9",
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: "end",
          align: "top",
          color: "#34495e",
          backgroundColor: "rgba(255,255,255,0.7)",
          borderRadius: 4,
          padding: 3,
          offset: 2,
          font: { size: 10, weight: "bold" },
          clip: false,
          formatter: "function(value){ try { return (typeof value === 'number') ? value.toLocaleString() : value; } catch(e) { return value; } }",
        },
      },
      scales: { y: { beginAtZero: true } },
    },
    plugins: ["datalabels"],
  } as const;

  return await quickChartCreateUrl(config, 800, 400);
}

function round(n: number, digits: number): number {
  const p = Math.pow(10, digits);
  return Math.round(n * p) / p;
}

async function buildOnlineUsersChart(hodlData: V2exHodlRow[]): Promise<string | null> {
  if (!hodlData || hodlData.length < 2) return null;
  const rows = [...hodlData].sort((a, b) => a.created_at.localeCompare(b.created_at));
  let labels = rows.map((r) => fmtTime(r.created_at));
  let current = rows.map((r) => r.current_online_users);
  let peak = rows.map((r) => r.peak_online_users);

  ({ labels, series: [current, peak] } = downsampleMultiSeries(labels, [current, peak], CHART_MAX_TOTAL_POINTS));

  // 不做归一化处理，直接展示原始值
  const datasets = [
    buildDatasetWithDatalabels("当前在线", current, [], "#2ecc71", []),
    buildDatasetWithDatalabels("峰值在线", peak, [], "#e74c3c", []),
  ];

  const config = {
    type: "line",
    data: {
      labels,
      datasets,
    },
    options: {
      spanGaps: true,
      plugins: { legend: { display: true, position: "bottom" } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { display: true },
          grid: { display: true, color: "rgba(0,0,0,0.08)" },
        },
      },
    },
  } as const;

  return await quickChartCreateUrl(config, 800, 400);
}

async function buildHoldersBundleChart(hodlData: V2exHodlRow[]): Promise<string | null> {
  if (!hodlData || hodlData.length < 2) return null;
  const rows = [...hodlData].sort((a, b) => a.created_at.localeCompare(b.created_at));
  let labels = rows.map((r) => fmtTime(r.created_at));
  let top10k = rows.map((r) => r.hodl_10k_addresses_count);
  let holders = rows.map((r) => r.holders);
  let linked = rows.map((r) => r.total_solana_addresses_linked);

  ({ labels, series: [top10k, holders, linked] } = downsampleMultiSeries(labels, [top10k, holders, linked], CHART_MAX_TOTAL_POINTS));

  const normalized = normalizeSeriesSet([top10k, holders, linked]);
  const rawStrings = [
    top10k.map((v) => `${fmtNumber(v)}`),
    holders.map((v) => `${fmtNumber(v)}`),
    linked.map((v) => `${fmtNumber(v)}`),
  ];
  const turningIdx = normalized.map((s) => findTurningPointsIndices(s, 10));
  const datasets = [
    buildDatasetWithDatalabels("持有≥1万地址数", normalized[0], rawStrings[0], "#9b59b6", turningIdx[0]),
    buildDatasetWithDatalabels("持币人数", normalized[1], rawStrings[1], "#2980b9", turningIdx[1]),
    buildDatasetWithDatalabels("绑定地址总数", normalized[2], rawStrings[2], "#f1c40f", turningIdx[2]),
  ];

  const config = {
    type: "line",
    data: {
      labels,
      datasets,
    },
    options: {
      spanGaps: true,
      plugins: { legend: { display: true, position: "bottom" } },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 100,
          ticks: { display: false },
          grid: { display: false },
        },
      },
    },
  } as const;

  return await quickChartCreateUrl(config, 800, 400);
}

async function quickChartCreateUrl(
  config: unknown,
  width = 800,
  height = 400,
  backgroundColor = "white",
  version = "4"
): Promise<string> {
  try {
    const resp = await fetch("https://quickchart.io/chart/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chart: config, width, height, backgroundColor, version }),
    });
    if (!resp.ok) throw new Error(`quickchart create failed: ${resp.status}`);
    const data = (await resp.json()) as { success?: boolean; url?: string };
    if (data && data.url) return data.url;
    throw new Error("quickchart create missing url");
  } catch (e) {
    // 兜底：退回到 GET 直链（可能过长，但保证可用）
    const c = encodeURIComponent(JSON.stringify(config));
    return `https://quickchart.io/chart?c=${c}&backgroundColor=${encodeURIComponent(
      backgroundColor
    )}&width=${width}&height=${height}&version=${encodeURIComponent(version)}`;
  }
}

// 将多序列数据按最大总点数降采样，尽量均匀采样并保留最后一个点
function downsampleMultiSeries(
  labels: string[],
  series: number[][],
  maxTotalPoints = 1000
): { labels: string[]; series: number[][] } {
  const sCount = series.length;
  if (sCount === 0) return { labels, series };
  const n = labels.length;
  const total = n * sCount;
  if (total <= maxTotalPoints || n <= 2) return { labels, series };

  const targetPerSeries = Math.max(2, Math.floor(maxTotalPoints / sCount));
  const stride = Math.max(1, Math.ceil(n / targetPerSeries));
  const idx: number[] = [];
  for (let i = 0; i < n; i += stride) idx.push(i);
  if (idx[idx.length - 1] !== n - 1) idx.push(n - 1); // 保留最后一个点

  const pick = (arr: number[]) => idx.map((i) => arr[i]);
  return {
    labels: idx.map((i) => labels[i]),
    series: series.map((s) => pick(s)),
  };
}

// 归一化多序列到 0..100 的统一比例（min-max 归一化）；若常量序列则置中 50
function normalizeSeriesSet(seriesSet: number[][]): number[][] {
  return seriesSet.map((arr) => {
    let min = Infinity;
    let max = -Infinity;
    for (const v of arr) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (!isFinite(min) || !isFinite(max) || arr.length === 0) return [];
    if (max === min) return arr.map(() => 50);
    const span = max - min;
    return arr.map((v) => ((v - min) / span) * 100);
  });
}

// 查找拐点索引（包含首尾 + 斜率符号变化点），最多 maxPoints 个
function findTurningPointsIndices(arr: number[], maxPoints = 12): number[] {
  const n = arr.length;
  if (n === 0) return [];
  const idx: number[] = [0];
  for (let i = 1; i < n - 1; i++) {
    const d1 = arr[i] - arr[i - 1];
    const d2 = arr[i + 1] - arr[i];
    if (d1 === 0 && d2 === 0) continue;
    if (d1 === 0 || d2 === 0 || (d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) {
      idx.push(i);
    }
  }
  if (n > 1) idx.push(n - 1);
  // 限制数量：均匀采样选取
  if (idx.length > maxPoints) {
    const res: number[] = [];
    const step = (idx.length - 1) / (maxPoints - 1);
    for (let k = 0; k < maxPoints; k++) {
      res.push(idx[Math.round(k * step)]);
    }
    return Array.from(new Set(res)).sort((a, b) => a - b);
  }
  return Array.from(new Set(idx)).sort((a, b) => a - b);
}

// 构造带拐点数据标签的数据集，标签显示原始值字符串
function buildDatasetWithDatalabels(
  label: string,
  normalizedData: number[],
  rawValueStrings: string[],
  color: string,
  allowedIndices: number[]
) {
  return {
    label,
    data: normalizedData,
    borderColor: color,
    fill: false,
    tension: 0.5,
    cubicInterpolationMode: "monotone",
    pointRadius: 1.5,
    pointHitRadius: 6,
    datalabels: { display: false },
  } as const;
}

// 选取 TOP120（hold_rank<=120），同一用户(owner_address)仅保留最新 changed_at 的一条记录，并按排名升序排列
function pickTop120LatestPerOwner(rows: V2exerSolanaAddressDetailRow[]): V2exerSolanaAddressDetailRow[] {
  if (!rows || rows.length === 0) return [];
  // 先按时间降序，便于“第一次出现”为最新
  const sorted = [...rows].sort((a, b) => b.changed_at.localeCompare(a.changed_at));
  const latestByOwner = new Map<string, V2exerSolanaAddressDetailRow>();
  for (const r of sorted) {
    if (!latestByOwner.has(r.owner_address)) {
      latestByOwner.set(r.owner_address, r);
    }
  }
  const deduped = Array.from(latestByOwner.values());
  const filtered = deduped.filter((r) => r.hold_rank != null && r.hold_rank <= 120);
  filtered.sort((a, b) => {
    const ra = a.hold_rank ?? Number.POSITIVE_INFINITY;
    const rb = b.hold_rank ?? Number.POSITIVE_INFINITY;
    if (ra !== rb) return ra - rb;
    // 次级排序：数量多的靠前（可选）
    return (b.hold_amount ?? 0) - (a.hold_amount ?? 0);
  });
  return filtered.slice(0, 120);
}