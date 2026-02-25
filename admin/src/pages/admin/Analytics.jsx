// pages/admin/Analytics.jsx
// ============================================================
// ADMIN ANALYTICS (FRONTEND)
// - Dropdown layer switch (8 layers + overview)
// - Uses analyticsSlice + analyticsService flow (GET /admin/analytics/*)
// - Caches per-layer data (enterprise-friendly)
// - Date range + granularity controls
// - Realtime window controls
// - Visualizations: KPIs, time-series charts, breakdown charts, leaderboards
// - Export utilities: CSV + JSON + PDF + XLSX
// - Corporate design with brand purple #6A1B9A
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    Activity,
    BarChart3,
    Calendar,
    ChevronDown,
    Download,
    Filter,
    LineChart as LineIcon,
    Loader2,
    RefreshCw,
    Search,
    Shield,
    Users,
    Wallet,
    ShoppingBag,
    GraduationCap,
    MessageSquare,
    AlertCircle,
    Clock,
    TrendingUp,
    Layers,
    Info,
    X,
    Eye,
    Globe,
    Zap,
    FileJson,
    FileDown,
    ClipboardCopy,
    FileText,
    Table as TableIcon,
    Sparkles,
    Bell,
    CheckCircle,
} from "lucide-react";

// Logo import (adjust path as needed)
import logo from "../../assets/asiyo-nobg.png";

// Charts (Recharts)
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Legend,
} from "recharts";

// Motion
import { motion, AnimatePresence } from "framer-motion";

// Export libraries
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import CountUp from "react-countup";
import html2canvas from "html2canvas";

// Your thunk/actions (rename if needed)
import {
    fetchAnalyticsLayer,
    setCurrentLayerKey,
    setDateRange,
    setGranularity,
    setTimezone,
    setRealtimeMinutes,
    setLimit,
} from "../../store/slices/analyticsSlice";
import AdminLayout from "../../components/layout/AdminLayout";

// ============================================================
// BRAND CONSTANTS
// ============================================================

const BRAND = {
    primary: "#6A1B9A",
    primaryLight: "#F3E5F5",
    primaryBorder: "#E1BEE7",
    textPrimary: "#111827",   // almost black
    textSecondary: "#1F2937", // dark slate
    dark: "#111827",
    muted: "#6B7280",
};

const TEXT = {
    primary: "text-gray-900",
    secondary: "text-gray-900",
    muted: "text-gray-800",
};

// ============================================================
// SMALL UTILS
// ============================================================

const TZ_DEFAULT = "Africa/Nairobi";
const GRANULARITIES = ["day", "week", "month"];

const LAYERS = [
    {
        key: "overview",
        label: "Overview (Snapshot)",
        icon: BarChart3,
        description: "Cross-layer KPIs + high-level trends.",
        accent: "from-purple-600 to-pink-600",
    },
    {
        key: "user-community",
        label: "User & Community Health",
        icon: Users,
        description: "Users, activity, roles, countries, groups/hubs health.",
        accent: "from-indigo-600 to-purple-600",
    },
    {
        key: "social-engagement",
        label: "Social Engagement",
        icon: MessageSquare,
        description: "Posts, comments, shares, creators, chat, hub updates.",
        accent: "from-fuchsia-600 to-purple-600",
    },
    {
        key: "learning-programs",
        label: "Learning & Programs",
        icon: GraduationCap,
        description: "Programs, enrollments, completions, events, retreats, journals.",
        accent: "from-emerald-600 to-teal-600",
    },
    {
        key: "financial-transactions",
        label: "Financial & Transactions",
        icon: Wallet,
        description: "Payment intents, success rate, savings, orders revenue.",
        accent: "from-amber-600 to-orange-600",
    },
    {
        key: "marketplace-economy",
        label: "Marketplace & Economy",
        icon: ShoppingBag,
        description: "Products, orders, revenue, jobs, funding, skills, sellers.",
        accent: "from-cyan-600 to-blue-600",
    },
    {
        key: "realtime",
        label: "Real-time / Live Activity",
        icon: Activity,
        description: "Last X minutes: active users, posts, payments, reports, live voice rooms.",
        accent: "from-rose-600 to-pink-600",
    },
    {
        key: "moderation-safety",
        label: "Moderation & Safety",
        icon: Shield,
        description: "Reports trends, targets, resolution time, alerts, top offenders.",
        accent: "from-red-600 to-orange-600",
    },
    {
        key: "growth-retention",
        label: "Growth & Retention",
        icon: TrendingUp,
        description: "New/active users, cohort retention proxy, funnel proxy.",
        accent: "from-lime-600 to-emerald-600",
    },
];

function clamp(n, min, max) {
    const x = Number(n);
    if (!Number.isFinite(x)) return min;
    return Math.max(min, Math.min(max, x));
}

function toISODateInput(d) {
    try {
        const date = new Date(d);
        if (!Number.isFinite(date.getTime())) return "";
        const yyyy = String(date.getFullYear());
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    } catch {
        return "";
    }
}

function safeNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function fmtInt(n) {
    return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(safeNumber(n, 0));
}

function fmtMoney(n, currency = "KES") {
    const val = safeNumber(n, 0);
    try {
        return new Intl.NumberFormat("en-KE", {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
        }).format(val);
    } catch {
        return `${currency} ${fmtInt(val)}`;
    }
}

function pct(n) {
    const v = safeNumber(n, 0) * 100;
    return `${v.toFixed(1)}%`;
}

function hashParams(params) {
    try {
        return btoa(unescape(encodeURIComponent(JSON.stringify(params))));
    } catch {
        return String(Date.now());
    }
}

function downloadTextFile(filename, text, mime = "text/plain") {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function jsonToCSV(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return "";
    const headers = Array.from(
        rows.reduce((acc, r) => {
            Object.keys(r || {}).forEach((k) => acc.add(k));
            return acc;
        }, new Set())
    );
    const esc = (v) => {
        const s = v === null || v === undefined ? "" : String(v);
        if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
    };
    const lines = [];
    lines.push(headers.map(esc).join(","));
    for (const row of rows) {
        lines.push(headers.map((h) => esc(row?.[h])).join(","));
    }
    return lines.join("\n");
}

function flattenForExport(layerKey, data) {
    const out = [];
    if (!data || typeof data !== "object") return out;

    const pushArray = (prefix, arr) => {
        if (!Array.isArray(arr)) return;
        for (const item of arr) {
            out.push({ layer: layerKey, section: prefix, ...(item || {}) });
        }
    };

    if (data.series && typeof data.series === "object") {
        Object.entries(data.series).forEach(([k, v]) => pushArray(`series.${k}`, v));
    }
    if (data.breakdowns && typeof data.breakdowns === "object") {
        Object.entries(data.breakdowns).forEach(([k, v]) => pushArray(`breakdowns.${k}`, v));
    }
    if (data.leaders && typeof data.leaders === "object") {
        Object.entries(data.leaders).forEach(([k, v]) => pushArray(`leaders.${k}`, v));
    }
    if (data.feed && typeof data.feed === "object") {
        Object.entries(data.feed).forEach(([k, v]) => pushArray(`feed.${k}`, v));
    }
    if (data.live && typeof data.live === "object") {
        Object.entries(data.live).forEach(([k, v]) => pushArray(`live.${k}`, v));
    }

    if (data.kpis && typeof data.kpis === "object") {
        out.unshift({ layer: layerKey, section: "kpis", ...data.kpis });
    }

    if (data.funnelProxy && typeof data.funnelProxy === "object") {
        out.unshift({ layer: layerKey, section: "funnelProxy", ...data.funnelProxy });
    }
    if (data.performance && typeof data.performance === "object") {
        out.unshift({ layer: layerKey, section: "performance", ...data.performance });
    }

    return out;
}

function tooltipValueFormatter(value) {
    if (typeof value === "number") return fmtInt(value);
    return value;
}

// ============================================================
// ANOMALY DETECTION
// ============================================================

function analyzeAnomaly(series = [], key = "count", label = "Metric") {
    if (!Array.isArray(series) || series.length < 5) return null;

    const values = series.map((r) => safeNumber(r[key], 0));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    const variance =
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        values.length;

    const stdDev = Math.sqrt(variance);
    const latest = values[values.length - 1];

    const deviation = (latest - mean) / (stdDev || 1);

    if (deviation > 2) {
        const pctAbove = ((latest - mean) / mean) * 100;

        return {
            type: "spike",
            latest,
            mean,
            stdDev,
            pctAbove,
            summary: `${label} increased ${pctAbove.toFixed(
                1
            )}% above normal trend.`,
        };
    }

    return null;
}

function generateExplanation(anomaly, series = [], label = "Metric") {
    if (!anomaly) return null;

    const trendDirection =
        anomaly.pctAbove > 0 ? "sharp increase" : "significant drop";

    return `
During the most recent reporting bucket, ${label} experienced a ${trendDirection}.
The latest value (${fmtInt(anomaly.latest)}) significantly deviates from
the historical mean (${fmtInt(anomaly.mean)}).
This may indicate abnormal user behavior, campaign impact, or system changes.
Investigation recommended.
    `.trim();
}

// ============================================================
// HEATMAP COMPONENT
// ============================================================

function Heatmap({ data = [], keyName = "count" }) {
    if (!Array.isArray(data) || data.length === 0) return null;

    const values = data.map((r) => safeNumber(r[keyName], 0));
    const max = Math.max(...values);

    return (
        <div className="grid grid-cols-7 gap-2">
            {data.map((r, i) => {
                const intensity = max ? values[i] / max : 0;
                const opacity = Math.min(0.9, 0.2 + intensity);

                return (
                    <div
                        key={i}
                        className="h-12 rounded-lg flex items-center justify-center text-xs font-semibold"
                        style={{
                            backgroundColor: `rgba(106, 27, 154, ${opacity})`,
                            color: intensity > 0.6 ? "white" : "black",
                        }}
                    >
                        {fmtInt(values[i])}
                    </div>
                );
            })}
        </div>
    );
}

// ============================================================
// ANOMALY UI COMPONENTS
// ============================================================

function AnomalyFlag({ anomaly }) {
    if (!anomaly) return null;

    return (
        <Pill tone="danger">
            🚨 Spike Detected
        </Pill>
    );
}

function AlertBanner({ anomaly }) {
    if (!anomaly) return null;

    return (
        <div className="p-4 rounded-xl border border-red-300 bg-red-50 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-700 mt-0.5" />
            <div>
                <div className="text-sm font-semibold text-red-800">
                    Anomaly Detected
                </div>
                <div className="text-sm text-red-700 mt-1">
                    {anomaly.summary}
                </div>
            </div>
        </div>
    );
}

function NotificationBell({ count, onClick }) {
    return (
        <div
            onClick={onClick}
            className="relative cursor-pointer"
        >
            <Bell size={20} className={TEXT.primary} />
            {count > 0 && (
                <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {count}
                </div>
            )}
        </div>
    );
}

function NotificationPanel({ open, log, onClose, onResolve }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex">
            <div className="flex-1 bg-black/40" onClick={onClose} />
            <div className="w-96 bg-white h-full shadow-2xl p-5 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-semibold text-black">
                        Anomaly Notifications
                    </div>
                    <X size={18} className="cursor-pointer" onClick={onClose} />
                </div>

                {log.length === 0 && (
                    <div className="text-sm text-gray-900">
                        No anomalies recorded.
                    </div>
                )}

                <div className="space-y-3">
                    {log.map((entry) => (
                        <div
                            key={entry.id}
                            className={`p-3 rounded-xl border ${
                                entry.resolved
                                    ? "border-green-300 bg-green-50"
                                    : entry.severity === "critical"
                                    ? "border-red-300 bg-red-50"
                                    : "border-yellow-300 bg-yellow-50"
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="text-xs font-semibold text-black">
                                    {entry.label}
                                </div>
                                {!entry.resolved && onResolve && (
                                    <button
                                        onClick={() => onResolve(entry.id)}
                                        className="text-xs text-gray-900 hover:text-gray-900"
                                    >
                                        <CheckCircle size={14} />
                                    </button>
                                )}
                            </div>
                            <div className="text-sm text-black mt-1">
                                {entry.summary}
                            </div>
                            <div className="text-[11px] text-gray-900 mt-2">
                                {new Date(entry.timestamp).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function AnomalyTimeline({ log }) {
    if (!log || log.length === 0) return null;

    return (
        <Card className="p-5">
            <div className="text-sm font-semibold text-black mb-4">
                Historical Anomaly Timeline
            </div>

            <div className="space-y-4">
                {log.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-4">
                        <div className={`w-3 h-3 rounded-full ${entry.resolved ? 'bg-green-600' : 'bg-red-600'} mt-1`} />
                        <div>
                            <div className="text-sm font-semibold text-black">
                                {entry.label}
                            </div>
                            <div className="text-sm text-black">
                                {entry.summary}
                            </div>
                            <div className="text-xs text-gray-900 mt-1">
                                {new Date(entry.timestamp).toLocaleString()}
                                {entry.resolved && " · Resolved"}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

// ============================================================
// KPI UTILITIES
// ============================================================

function calcDeltaPct(current, previous) {
    const c = safeNumber(current, 0);
    const p = safeNumber(previous, 0);
    if (p === 0) return null;
    return (c - p) / p;
}

function DeltaPill({ delta }) {
    if (delta === null || delta === undefined) return <Pill>—</Pill>;

    const isUp = delta >= 0;
    const tone = isUp ? "success" : "danger";
    const arrow = isUp ? "↑" : "↓";
    const val = `${arrow} ${(Math.abs(delta) * 100).toFixed(1)}%`;

    return <Pill tone={tone}>{val}</Pill>;
}

function AnimatedNumber({ value, duration = 0.9 }) {
    const v = safeNumber(value, 0);
    return (
        <CountUp
            end={v}
            duration={duration}
            separator=","
            preserveValue={false}
        />
    );
}

function AnimatedMoney({ value, currency = "KES" }) {
    const v = safeNumber(value, 0);
    return (
        <span>
            {currency} <CountUp end={v} duration={0.9} separator="," decimals={0} />
        </span>
    );
}

// ============================================================
// UI PRIMITIVES
// ============================================================

function Card({ className = "", children, onClick }) {
    return (
        <div
            onClick={onClick}
            className={`bg-white border border-gray-200 rounded-xl shadow-sm ${onClick ? "transition hover:shadow-md cursor-pointer" : ""} ${className}`}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            {children}
        </div>
    );
}

function CardHeader({ title, subtitle, right }) {
    return (
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-4">
            <div>
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                </div>
                {subtitle ? <p className="text-xs text-gray-900 mt-1">{subtitle}</p> : null}
            </div>
            {right ? <div className="shrink-0">{right}</div> : null}
        </div>
    );
}

function Divider() {
    return <div className="h-px bg-gray-100" />;
}

function Pill({ children, tone = "default" }) {
    const cls =
        tone === "danger"
            ? "bg-red-50 text-red-700 border-red-200"
            : tone === "success"
                ? "bg-[#6A1B9A]/10 text-[#6A1B9A] border-[#6A1B9A]/20"
                : tone === "warning"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-gray-50 text-gray-900 border-gray-200";
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border ${cls}`}>
            {children}
        </span>
    );
}

function Button({ children, onClick, variant = "primary", disabled = false, className = "" }) {
    const base =
        "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition border";
    const styles =
        variant === "ghost"
            ? "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
            : variant === "danger"
                ? "bg-red-600 border-red-600 text-white hover:bg-red-700"
                : variant === "secondary"
                    ? "bg-gray-900 border-gray-900 text-white hover:bg-black"
                    : "bg-[#6A1B9A] border-[#6A1B9A] text-white hover:bg-[#58117F]";
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${base} ${styles} ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${className}`}
            type="button"
        >
            {children}
        </button>
    );
}

function IconStat({ icon: Icon, label, value, hint, right }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Icon size={18} className="text-gray-900" />
                </div>
                <div className="min-w-0">
                    <div className="text-xs text-gray-900 font-medium">{label}</div>
                    <div className="text-lg font-semibold text-gray-900 leading-tight">{value}</div>
                    {hint ? <div className="text-xs text-gray-900 mt-1">{hint}</div> : null}
                </div>
            </div>
            {right ? <div className="shrink-0">{right}</div> : null}
        </div>
    );
}

function EmptyState({ title, description, icon: Icon = Info, action }) {
    return (
        <div className="p-10 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <Icon size={20} className="text-gray-900" />
            </div>
            <h4 className="mt-4 text-sm font-semibold text-gray-900">{title}</h4>
            <p className="mt-1 text-sm text-gray-900 max-w-md">{description}</p>
            {action ? <div className="mt-5">{action}</div> : null}
        </div>
    );
}

function LoadingBlock({ label = "Loading..." }) {
    return (
        <div className="p-10 flex items-center justify-center gap-3 text-gray-900">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm">{label}</span>
        </div>
    );
}

function ErrorBlock({ title = "Something went wrong", message, onRetry }) {
    return (
        <div className="p-6">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                    <AlertCircle size={18} className="text-red-600" />
                </div>
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{title}</div>
                    {message ? <div className="text-sm text-gray-900 mt-1">{message}</div> : null}
                    {onRetry ? (
                        <div className="mt-4">
                            <Button variant="secondary" onClick={onRetry}>
                                <RefreshCw size={16} /> Retry
                            </Button>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function Table({ columns = [], rows = [], rowKey = (r, i) => i }) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead>
                    <tr className="text-left text-xs text-gray-900 border-b">
                        {columns.map((c) => (
                            <th key={c.key} className="py-3 px-4 font-medium whitespace-nowrap">
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={rowKey(r, i)} className="border-b last:border-b-0 hover:bg-gray-50">
                            {columns.map((c) => (
                                <td key={c.key} className="py-3 px-4 text-gray-900 whitespace-nowrap">
                                    {typeof c.render === "function" ? c.render(r) : r?.[c.key] ?? "—"}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ============================================================
// CHART WRAPPERS
// ============================================================

function ChartCard({ title, subtitle, right, children, height = 280 }) {
    return (
        <Card>
            <CardHeader title={title} subtitle={subtitle} right={right} />
            <Divider />
            <div style={{ height }} className="px-3 py-3">
                {children}
            </div>
        </Card>
    );
}

function SeriesLine({ data, xKey = "bucket", yKey = "count", yLabel, showGrid = true }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={Array.isArray(data) ? data : []}>
                {showGrid ? <CartesianGrid stroke="#F3F4F6" strokeDasharray="3 3" /> : null}
                <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={tooltipValueFormatter} />
                <Legend />
                <Line type="monotone" dataKey={yKey} name={yLabel || yKey} dot={false} strokeWidth={2} stroke={BRAND.primary} />
            </LineChart>
        </ResponsiveContainer>
    );
}

function SeriesArea({ data, xKey = "bucket", yKey = "count", yLabel, showGrid = true }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={Array.isArray(data) ? data : []}>
                {showGrid ? <CartesianGrid stroke="#F3F4F6" strokeDasharray="3 3" /> : null}
                <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={tooltipValueFormatter} />
                <Legend />
                <Area type="monotone" dataKey={yKey} name={yLabel || yKey} strokeWidth={2} fillOpacity={0.25} stroke={BRAND.primary} fill={BRAND.primary} />
            </AreaChart>
        </ResponsiveContainer>
    );
}

function SeriesBar({ data, xKey = "bucket", yKey = "count", yLabel, showGrid = true }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={Array.isArray(data) ? data : []}>
                {showGrid ? <CartesianGrid stroke="#F3F4F6" strokeDasharray="3 3" /> : null}
                <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={tooltipValueFormatter} />
                <Legend />
                <Bar dataKey={yKey} name={yLabel || yKey} fill={BRAND.primary} />
            </BarChart>
        </ResponsiveContainer>
    );
}

function BreakdownPie({ data, nameKey = "type", valueKey = "count", height = 260 }) {
    const rows = Array.isArray(data) ? data : [];
    return (
        <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Tooltip formatter={tooltipValueFormatter} />
                    <Legend />
                    <Pie data={rows} dataKey={valueKey} nameKey={nameKey} outerRadius={90} label>
                        {rows.map((_, idx) => (
                            <Cell key={idx} fill={BRAND.primary} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

function RadarBreakdown({ data, angleKey = "key", valueKey = "count", label = "Count" }) {
    const rows = Array.isArray(data) ? data : [];
    return (
        <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={rows}>
                <PolarGrid stroke="#F3F4F6" />
                <PolarAngleAxis dataKey={angleKey} tick={{ fontSize: 11 }} />
                <PolarRadiusAxis />
                <Tooltip formatter={tooltipValueFormatter} />
                <Radar dataKey={valueKey} name={label} fillOpacity={0.2} stroke={BRAND.primary} fill={BRAND.primary} />
                <Legend />
            </RadarChart>
        </ResponsiveContainer>
    );
}

// ============================================================
// DRILLDOWN MODAL
// ============================================================

function DrilldownModal({ open, title, payload, onClose }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <div>
                        <div className="text-sm font-semibold text-gray-900">{title}</div>
                        <div className="text-xs text-gray-900">Drill-down analysis</div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
                        <X size={18} className="text-gray-900" />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <ChartCard title="Trend" subtitle="Time series" height={320}>
                        <SeriesLine data={payload?.series || []} yKey="count" yLabel="Count" />
                    </ChartCard>

                    <Card>
                        <CardHeader title="Breakdown" subtitle="Top segments" />
                        <Divider />
                        <div className="p-4">
                            <Table
                                columns={[
                                    { key: "label", label: "Segment" },
                                    { key: "count", label: "Count", render: (r) => fmtInt(r.count) },
                                ]}
                                rows={(payload?.breakdowns || []).map((x) => ({
                                    label: x.country || x.type || x.role || x.key || "—",
                                    count: x.count ?? x.users ?? x.programs ?? 0,
                                }))}
                            />
                        </div>
                    </Card>
                </div>

                <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// TOP NAV / CONTROLS
// ============================================================

function LayerDropdown({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);
    const selected = LAYERS.find((l) => l.key === value) || LAYERS[0];

    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                className="w-full md:w-[360px] flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition"
                onClick={() => setOpen((s) => !s)}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selected.accent} flex items-center justify-center`}>
                        {selected.icon ? <selected.icon size={18} className="text-white" /> : <Layers size={18} className="text-white" />}
                    </div>
                    <div className="min-w-0 text-left">
                        <div className="text-sm font-semibold text-gray-900 truncate">{selected.label}</div>
                        <div className="text-xs text-gray-900 truncate">{selected.description}</div>
                    </div>
                </div>
                <ChevronDown size={18} className="text-gray-900" />
            </button>

            <AnimatePresence>
                {open ? (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute z-[9999] mt-2 w-full md:w-[420px] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
                            <div className="text-xs font-semibold text-gray-900">Analytics Layers</div>
                            <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-white">
                                <X size={16} className="text-gray-900" />
                            </button>
                        </div>

                        <div className="max-h-[420px] overflow-auto">
                            {LAYERS.map((l) => (
                                <button
                                    type="button"
                                    key={l.key}
                                    onClick={() => {
                                        onChange?.(l.key);
                                        setOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-center gap-3 ${value === l.key ? "bg-[#F3E5F5]" : ""
                                        }`}
                                >
                                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${l.accent} flex items-center justify-center`}>
                                        {l.icon ? <l.icon size={16} className="text-white" /> : <Layers size={16} className="text-white" />}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-gray-900 truncate">{l.label}</div>
                                        <div className="text-xs text-gray-900 truncate">{l.description}</div>
                                    </div>
                                    {value === l.key ? (
                                        <div className="ml-auto">
                                            <Pill tone="success">Active</Pill>
                                        </div>
                                    ) : null}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}

function DateControls({
    from,
    to,
    tz,
    granularity,
    onFromChange,
    onToChange,
    onTzChange,
    onGranularityChange,
}) {
    return (
        <Card className="p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Filter size={16} />
                Controls
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
                <label className="block">
                    <div className="text-xs text-gray-900 mb-1">From</div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white">
                        <Calendar size={16} className="text-gray-900" />
                        <input
                            type="date"
                            value={toISODateInput(from)}
                            onChange={(e) => onFromChange?.(e.target.value)}
                            className="w-full outline-none text-sm"
                        />
                    </div>
                </label>

                <label className="block">
                    <div className="text-xs text-gray-900 mb-1">To</div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white">
                        <Calendar size={16} className="text-gray-900" />
                        <input
                            type="date"
                            value={toISODateInput(to)}
                            onChange={(e) => onToChange?.(e.target.value)}
                            className="w-full outline-none text-sm"
                        />
                    </div>
                </label>

                <label className="block">
                    <div className="text-xs text-gray-900 mb-1">Timezone</div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white">
                        <Globe size={16} className="text-gray-900" />
                        <input
                            value={tz || TZ_DEFAULT}
                            onChange={(e) => onTzChange?.(e.target.value)}
                            placeholder="Africa/Nairobi"
                            className="w-full outline-none text-sm"
                        />
                    </div>
                </label>

                <label className="block">
                    <div className="text-xs text-gray-900 mb-1">Granularity</div>
                    <div className="flex items-center gap-2">
                        {GRANULARITIES.map((g) => (
                            <button
                                type="button"
                                key={g}
                                onClick={() => onGranularityChange?.(g)}
                                className={`px-3 py-2 rounded-xl border text-sm transition ${granularity === g ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
                                    }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </label>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                <Pill><Clock size={12} className="mr-1" /> Date range affects all layers except Realtime</Pill>
                <Pill tone="warning"><Info size={12} className="mr-1" /> Weekly = ISO week buckets</Pill>
            </div>
        </Card>
    );
}

function RealtimeControls({ minutes, limit, onMinutes, onLimit }) {
    return (
        <Card className="p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Zap size={16} />
                Realtime Window
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                    <div className="text-xs text-gray-900 mb-1">Minutes</div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white">
                        <Clock size={16} className="text-gray-900" />
                        <input
                            type="number"
                            min={1}
                            max={240}
                            value={minutes}
                            onChange={(e) => onMinutes?.(clamp(e.target.value, 1, 240))}
                            className="w-full outline-none text-sm"
                        />
                    </div>
                </label>

                <label className="block">
                    <div className="text-xs text-gray-900 mb-1">Feed Limit</div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white">
                        <Search size={16} className="text-gray-900" />
                        <input
                            type="number"
                            min={1}
                            max={50}
                            value={limit}
                            onChange={(e) => onLimit?.(clamp(e.target.value, 1, 50))}
                            className="w-full outline-none text-sm"
                        />
                    </div>
                </label>
            </div>

            <div className="mt-3 text-xs text-gray-900">
                Realtime ignores date range and pulls the last window directly from the server.
            </div>
        </Card>
    );
}

// ============================================================
// LAYER RENDERERS (OVERVIEW + 8 LAYERS)
// ============================================================

function OverviewLayer({ data, onKpiClick, anomaly }) {
    const kpis = data?.kpis || {};
    const series = data?.series || {};

    const postsAnomaly = anomaly?.posts || null;

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {postsAnomaly && (
                <div className="xl:col-span-3">
                    <AlertBanner anomaly={postsAnomaly} />
                </div>
            )}

            <Card className="p-5 xl:col-span-1">
                <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">Snapshot KPIs</div>
                    <Pill>Overview</Pill>
                </div>

                <div className="mt-4 space-y-4">
                    <div onClick={() => onKpiClick?.("Total Users", {
                        metricKey: "totalUsers",
                        kpi: kpis.totalUsers,
                        series: series.users || [],
                        breakdowns: data?.breakdowns?.topCountries || [],
                    })}>
                        <IconStat icon={Users} label="Total Users" value={<AnimatedNumber value={kpis.totalUsers} />} />
                        {postsAnomaly && (
                            <div className="mt-3">
                                <Pill tone="danger">
                                    Unusual growth spike
                                </Pill>
                            </div>
                        )}
                    </div>
                    <IconStat icon={MessageSquare} label="Total Posts" value={<AnimatedNumber value={kpis.totalPosts} />} />
                    <IconStat icon={Layers} label="Groups / Hubs" value={`${fmtInt(kpis.totalGroups)} / ${fmtInt(kpis.totalHubs)}`} />
                    <IconStat icon={GraduationCap} label="Programs / Events" value={`${fmtInt(kpis.totalPrograms)} / ${fmtInt(kpis.totalEvents)}`} />
                    <IconStat icon={ShoppingBag} label="Products / Orders" value={`${fmtInt(kpis.totalProducts)} / ${fmtInt(kpis.totalOrders)}`} />
                    <IconStat icon={Wallet} label="Savings Pods" value={<AnimatedNumber value={kpis.totalPods} />} />
                    <IconStat
                        icon={Shield}
                        label="Reports (Pending)"
                        value={`${fmtInt(kpis.totalReports)} (${fmtInt(kpis.pendingReports)})`}
                    />
                    <IconStat
                        icon={Wallet}
                        label="Payments (Completed / Failed)"
                        value={`${fmtInt(kpis?.payments?.completed)} / ${fmtInt(kpis?.payments?.failed)}`}
                    />
                </div>
            </Card>

            <ChartCard
                title="Users Growth"
                subtitle="New users in range"
                height={320}
                right={<Pill><LineIcon size={12} className="mr-1" /> series</Pill>}
            >
                <SeriesArea data={series.users || []} yKey="count" yLabel="New Users" />
            </ChartCard>

            <ChartCard 
                title="Posts, Reports & Payments" 
                subtitle="High-level activity trends" 
                height={320}
                right={<AnomalyFlag anomaly={postsAnomaly} />}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mergeBuckets([series.posts, series.reports, series.payments], ["posts", "reports", "payments"])}>
                        <CartesianGrid stroke="#F3F4F6" strokeDasharray="3 3" />
                        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={tooltipValueFormatter} />
                        <Legend />
                        <Line type="monotone" dataKey="posts" name="Posts" dot={false} strokeWidth={2} stroke={BRAND.primary} />
                        <Line type="monotone" dataKey="reports" name="Reports" dot={false} strokeWidth={2} stroke="#EF4444" />
                        <Line type="monotone" dataKey="payments" name="Payments" dot={false} strokeWidth={2} stroke="#10B981" />
                    </LineChart>
                </ResponsiveContainer>
            </ChartCard>

            {postsAnomaly && (
                <Card className="p-5 xl:col-span-3">
                    <div className="text-sm font-semibold text-gray-900">
                        Executive Insight
                    </div>
                    <div className="text-sm text-gray-900 mt-2">
                        {generateExplanation(postsAnomaly, series.posts, "Posts")}
                    </div>
                </Card>
            )}

            <div className="xl:col-span-3">
                <Card>
                    <CardHeader title="Activity Heatmap" subtitle="Intensity by bucket" />
                    <Divider />
                    <div className="p-4">
                        <Heatmap data={series.posts || []} keyName="count" />
                    </div>
                </Card>
            </div>
        </div>
    );
}

function UserCommunityLayer({ data, onKpiClick }) {
    const kpis = data?.kpis || {};
    const series = data?.series || {};
    const breakdowns = data?.breakdowns || {};
    const leaders = data?.leaders || {};

    const usersAnomaly = analyzeAnomaly(series.newUsers, "count", "New Users");

    return (
        <div className="space-y-4">
            {usersAnomaly && <AlertBanner anomaly={usersAnomaly} />}

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                <Card className="p-5 cursor-pointer hover:border-gray-300" onClick={() => onKpiClick?.("Total Users", {
                    metricKey: "users",
                    kpi: kpis.users,
                    series: series.newUsers || [],
                    breakdowns: breakdowns.topCountries || [],
                })}>
                    <IconStat icon={Users} label="Users" value={<AnimatedNumber value={kpis.users} />} hint="Total registered" />
                    {usersAnomaly && (
                        <div className="mt-3">
                            <Pill tone="danger">
                                Unusual growth spike
                            </Pill>
                        </div>
                    )}
                </Card>
                <Card className="p-5">
                    <IconStat icon={Layers} label="Groups" value={<AnimatedNumber value={kpis.groups} />} hint="Active (not removed)" />
                </Card>
                <Card className="p-5">
                    <IconStat icon={Globe} label="Hubs" value={<AnimatedNumber value={kpis.hubs} />} hint="Active (not removed)" />
                </Card>
                <Card className="p-5">
                    <IconStat icon={TrendingUp} label="Top Countries" value={fmtInt((breakdowns?.topCountries || []).length)} hint="By users count" />
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChartCard title="New Users" subtitle="Signups over time" height={320}>
                    <SeriesArea data={series.newUsers || []} yKey="count" yLabel="New Users" />
                </ChartCard>

                <ChartCard title="Active Users" subtitle="Proxy using lastActive" height={320}>
                    <SeriesLine data={series.activeUsers || []} yKey="count" yLabel="Active Users" />
                </ChartCard>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChartCard title="Groups Created" subtitle="Community formation" height={300}>
                    <SeriesBar data={series.groupsCreated || []} yKey="count" yLabel="Groups" />
                </ChartCard>

                <ChartCard title="Hubs Created" subtitle="Hubs expansion" height={300}>
                    <SeriesBar data={series.hubsCreated || []} yKey="count" yLabel="Hubs" />
                </ChartCard>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Card>
                    <CardHeader title="Roles Breakdown" subtitle="User role distribution" />
                    <Divider />
                    <div className="p-3" style={{ height: 280 }}>
                        <BreakdownPie
                            data={(breakdowns.roles || []).map((r) => ({ type: r.role || "unknown", count: r.count }))}
                            nameKey="type"
                            valueKey="count"
                        />
                    </div>
                </Card>

                <Card>
                    <CardHeader title="Verification Status" subtitle="Email/Phone combos" />
                    <Divider />
                    <div className="p-4">
                        <Table
                            columns={[
                                { key: "email", label: "Email" },
                                { key: "phone", label: "Phone" },
                                { key: "count", label: "Users", render: (r) => fmtInt(r.count) },
                            ]}
                            rows={(breakdowns.verification || []).map((v) => ({
                                email: v.email ? "Yes" : "No",
                                phone: v.phone ? "Yes" : "No",
                                count: v.count,
                            }))}
                            rowKey={(r, i) => `${r.email}-${r.phone}-${i}`}
                        />
                    </div>
                </Card>

                <Card>
                    <CardHeader title="Mentor Verification" subtitle="Pending / Approved / Rejected" />
                    <Divider />
                    <div className="p-3" style={{ height: 280 }}>
                        <SeriesBar
                            data={(breakdowns.mentorsStatus || []).map((m) => ({ bucket: m.status || "unknown", count: m.count }))}
                            xKey="bucket"
                            yKey="count"
                            yLabel="Mentors"
                            showGrid={false}
                        />
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card>
                    <CardHeader title="Top Groups by Members" subtitle="Largest communities" />
                    <Divider />
                    <div className="p-4">
                        <Table
                            columns={[
                                { key: "name", label: "Group" },
                                { key: "membersCount", label: "Members", render: (r) => fmtInt(r.membersCount) },
                                { key: "createdAt", label: "Created", render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-KE") : "—") },
                            ]}
                            rows={leaders.topGroupsByMembers || []}
                            rowKey={(r) => r.groupId || r._id}
                        />
                    </div>
                </Card>

                <Card>
                    <CardHeader title="Top Hubs by Members" subtitle="Largest hubs" />
                    <Divider />
                    <div className="p-4">
                        <Table
                            columns={[
                                { key: "name", label: "Hub" },
                                { key: "type", label: "Type" },
                                { key: "region", label: "Region" },
                                { key: "membersCount", label: "Members", render: (r) => fmtInt(r.membersCount) },
                            ]}
                            rows={leaders.topHubsByMembers || []}
                            rowKey={(r) => r.hubId || r._id}
                        />
                    </div>
                </Card>
            </div>

            {usersAnomaly && (
                <Card className="p-5">
                    <div className="text-sm font-semibold text-gray-900">
                        Executive Insight
                    </div>
                    <div className="text-sm text-gray-900 mt-2">
                        {generateExplanation(usersAnomaly, series.newUsers, "New Users")}
                    </div>
                </Card>
            )}

            <Card>
                <CardHeader title="Activity Heatmap" subtitle="Intensity by bucket" />
                <Divider />
                <div className="p-4">
                    <Heatmap data={series.newUsers || []} keyName="count" />
                </div>
            </Card>
        </div>
    );
}

function SocialEngagementLayer({ data }) {
    const kpis = data?.kpis || {};
    const series = data?.series || {};
    const breakdowns = data?.breakdowns || {};
    const leaders = data?.leaders || {};

    const postsAnomaly = analyzeAnomaly(series.posts, "count", "Posts");

    const merged = useMemo(() => {
        const posts = (series.posts || []).map((r) => ({ bucket: r.bucket, posts: r.count }));
        const comments = (series.comments || []).map((r) => ({ bucket: r.bucket, comments: r.comments }));
        const hubUpdates = (series.hubUpdates || []).map((r) => ({ bucket: r.bucket, hubUpdates: r.updates }));
        return mergeBucketObjects([posts, comments, hubUpdates]);
    }, [series.posts, series.comments, series.hubUpdates]);

    return (
        <div className="space-y-4">
            {postsAnomaly && <AlertBanner anomaly={postsAnomaly} />}

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                <Card className="p-5">
                    <IconStat icon={MessageSquare} label="Posts" value={<AnimatedNumber value={kpis.posts} />} hint="In range" />
                </Card>
                <Card className="p-5">
                    <IconStat icon={TrendingUp} label="Likes" value={<AnimatedNumber value={kpis.totalLikes} />} hint="Total likesCount" />
                </Card>
                <Card className="p-5">
                    <IconStat icon={MessageSquare} label="Comments" value={<AnimatedNumber value={kpis.totalComments} />} hint="Total commentsCount" />
                </Card>
                <Card className="p-5">
                    <IconStat icon={Sparkles} label="Shares" value={<AnimatedNumber value={kpis.totalShares} />} hint="Total sharesCount" />
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChartCard 
                    title="Posts & Conversation Trends" 
                    subtitle="Posts / comments / hub updates" 
                    height={340}
                    right={<AnomalyFlag anomaly={postsAnomaly} />}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={merged}>
                            <CartesianGrid stroke="#F3F4F6" strokeDasharray="3 3" />
                            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={tooltipValueFormatter} />
                            <Legend />
                            <Line type="monotone" dataKey="posts" name="Posts" dot={false} strokeWidth={2} stroke={BRAND.primary} />
                            <Line type="monotone" dataKey="comments" name="Comments" dot={false} strokeWidth={2} stroke="#10B981" />
                            <Line type="monotone" dataKey="hubUpdates" name="Hub Updates" dot={false} strokeWidth={2} stroke="#F59E0B" />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Post Types" subtitle="Content mix" height={340}>
                    <BreakdownPie
                        data={(breakdowns.postTypes || []).map((x) => ({ type: x.type || "unknown", count: x.count }))}
                        nameKey="type"
                        valueKey="count"
                        height={320}
                    />
                </ChartCard>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card>
                    <CardHeader title="Top Posts (Engagement Score)" subtitle="likes + comments + shares" />
                    <Divider />
                    <div className="p-4">
                        <Table
                            columns={[
                                { key: "createdAt", label: "Date", render: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString("en-KE") : "—") },
                                { key: "type", label: "Type" },
                                { key: "engagementScore", label: "Score", render: (r) => fmtInt(r.engagementScore) },
                                { key: "likesCount", label: "Likes", render: (r) => fmtInt(r.likesCount) },
                                { key: "commentsCount", label: "Comments", render: (r) => fmtInt(r.commentsCount) },
                                { key: "sharesCount", label: "Shares", render: (r) => fmtInt(r.sharesCount) },
                            ]}
                            rows={leaders.topPosts || []}
                            rowKey={(r) => r.postId}
                        />
                    </div>
                </Card>

                <Card>
                    <CardHeader title="Top Creators" subtitle="Most posts authored" />
                    <Divider />
                    <div className="p-4">
                        <Table
                            columns={[
                                { key: "fullName", label: "User" },
                                { key: "role", label: "Role" },
                                { key: "posts", label: "Posts", render: (r) => fmtInt(r.posts) },
                            ]}
                            rows={leaders.topCreators || []}
                            rowKey={(r) => r.userId}
                        />
                    </div>
                </Card>
            </div>

            <Card>
                <CardHeader
                    title="Chat Activity (Heavy Aggregation)"
                    subtitle="Total messages count per bucket"
                    right={<Pill tone="warning"><Info size={12} className="mr-1" /> can be heavy</Pill>}
                />
                <Divider />
                <div className="p-3" style={{ height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={series.chat || []}>
                            <CartesianGrid stroke="#F3F4F6" strokeDasharray="3 3" />
                            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={tooltipValueFormatter} />
                            <Legend />
                            <Bar dataKey="totalMessages" name="Total Messages" fill={BRAND.primary} />
                            <Bar dataKey="dmChats" name="DM Chats" fill="#10B981" />
                            <Bar dataKey="groupChats" name="Group Chats" fill="#F59E0B" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            {postsAnomaly && (
                <Card className="p-5">
                    <div className="text-sm font-semibold text-gray-900">
                        Executive Insight
                    </div>
                    <div className="text-sm text-gray-900 mt-2">
                        {generateExplanation(postsAnomaly, series.posts, "Posts")}
                    </div>
                </Card>
            )}

            <Card>
                <CardHeader title="Activity Heatmap" subtitle="Intensity by bucket" />
                <Divider />
                <div className="p-4">
                    <Heatmap data={series.posts || []} keyName="count" />
                </div>
            </Card>
        </div>
    );
}

function LearningProgramsLayer({ data }) {
    const kpis = data?.kpis || {};
    const series = data?.series || {};
    const breakdowns = data?.breakdowns || {};
    const leaders = data?.leaders || {};

    const enrollmentsAnomaly = analyzeAnomaly(series.enrollments, "enrollments", "Enrollments");

    const merged = useMemo(() => {
        const a = (series.enrollments || []).map((r) => ({ bucket: r.bucket, enrollments: r.enrollments }));
        const b = (series.completions || []).map((r) => ({ bucket: r.bucket, completions: r.completions }));
        const c = (series.eventRegistrations || []).map((r) => ({ bucket: r.bucket, eventRegs: r.registrations }));
        const d = (series.eventAttendance || []).map((r) => ({ bucket: r.bucket, attended: r.attended }));
        return mergeBucketObjects([a, b, c, d]);
    }, [series.enrollments, series.completions, series.eventRegistrations, series.eventAttendance]);

    return (
        <div className="space-y-4">
            {enrollmentsAnomaly && <AlertBanner anomaly={enrollmentsAnomaly} />}

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                <Card className="p-5">
                    <IconStat icon={GraduationCap} label="Programs" value={<AnimatedNumber value={kpis.totalPrograms} />} />
                </Card>
                <Card className="p-5">
                    <IconStat icon={Calendar} label="Events" value={<AnimatedNumber value={kpis.totalEvents} />} />
                </Card>
                <Card className="p-5">
                    <IconStat icon={Activity} label="Retreats" value={<AnimatedNumber value={kpis.totalRetreats} />} />
                </Card>
                <Card className="p-5">
                    <IconStat icon={Sparkles} label="Journals" value={<AnimatedNumber value={(series.journals || []).reduce((s, r) => s + safeNumber(r.count, 0), 0)} />} hint="In range" />
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChartCard title="Programs Created" subtitle="Content supply" height={300}>
                    <SeriesBar data={series.programsCreated || []} yKey="count" yLabel="Programs" />
                </ChartCard>

                <ChartCard title="Events Created" subtitle="Events supply" height={300}>
                    <SeriesBar data={series.eventsCreated || []} yKey="count" yLabel="Events" />
                </ChartCard>
            </div>

            <ChartCard 
                title="Learning Activity" 
                subtitle="Enrollments, completions, event registrations & attendance" 
                height={360}
                right={<AnomalyFlag anomaly={enrollmentsAnomaly} />}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={merged}>
                        <CartesianGrid stroke="#F3F4F6" strokeDasharray="3 3" />
                        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={tooltipValueFormatter} />
                        <Legend />
                        <Line type="monotone" dataKey="enrollments" name="Enrollments" dot={false} strokeWidth={2} stroke={BRAND.primary} />
                        <Line type="monotone" dataKey="completions" name="Completions" dot={false} strokeWidth={2} stroke="#10B981" />
                        <Line type="monotone" dataKey="eventRegs" name="Event Registrations" dot={false} strokeWidth={2} stroke="#F59E0B" />
                        <Line type="monotone" dataKey="attended" name="Event Attendance" dot={false} strokeWidth={2} stroke="#EF4444" />
                    </LineChart>
                </ResponsiveContainer>
            </ChartCard>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card>
                    <CardHeader title="Programs by Category" subtitle="What people are building" />
                    <Divider />
                    <div className="p-3" style={{ height: 320 }}>
                        <BreakdownPie
                            data={(breakdowns.programsByCategory || []).map((x) => ({ type: x.category || "unknown", count: x.programs }))}
                            nameKey="type"
                            valueKey="count"
                            height={300}
                        />
                    </div>
                </Card>

                <Card>
                    <CardHeader title="Top Programs (Enrollments in Range)" subtitle="Most enrolled programs" />
                    <Divider />
                    <div className="p-4">
                        <Table
                            columns={[
                                { key: "title", label: "Program" },
                                { key: "category", label: "Category" },
                                { key: "status", label: "Status" },
                                { key: "enrollmentsInRange", label: "Enrollments", render: (r) => fmtInt(r.enrollmentsInRange) },
                                { key: "completedInRange", label: "Completions", render: (r) => fmtInt(r.completedInRange) },
                            ]}
                            rows={leaders.topPrograms || []}
                            rowKey={(r) => r.programId}
                        />
                    </div>
                </Card>
            </div>

            <ChartCard title="Retreat Participation" subtitle="Joins + average progress" height={340}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={series.retreatParticipation || []}>
                        <CartesianGrid stroke="#F3F4F6" strokeDasharray="3 3" />
                        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={tooltipValueFormatter} />
                        <Legend />
                        <Bar dataKey="joins" name="Joins" fill={BRAND.primary} />
                        <Bar dataKey="avgProgress" name="Avg Progress" fill="#10B981" />
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Journal Entries" subtitle="Wellness usage (proxy)" height={280}>
                <SeriesArea data={series.journals || []} yKey="count" yLabel="Journals" />
            </ChartCard>

            {enrollmentsAnomaly && (
                <Card className="p-5">
                    <div className="text-sm font-semibold text-gray-900">
                        Executive Insight
                    </div>
                    <div className="text-sm text-gray-900 mt-2">
                        {generateExplanation(enrollmentsAnomaly, series.enrollments, "Enrollments")}
                    </div>
                </Card>
            )}

            <Card>
                <CardHeader title="Activity Heatmap" subtitle="Intensity by bucket" />
                <Divider />
                <div className="p-4">
                    <Heatmap data={series.enrollments || []} keyName="enrollments" />
                </div>
            </Card>
        </div>
    );
}

function FinancialTransactionsLayer({ data }) {
    const kpis = data?.kpis || {};
    const series = data?.series || {};
    const breakdowns = data?.breakdowns || {};
    const leaders = data?.leaders || {};
    const p = kpis.payments || {};

    const paymentsAnomaly = analyzeAnomaly(series.paymentIntents, "created", "Payments");

    return (
        <div className="space-y-4">
            {paymentsAnomaly && <AlertBanner anomaly={paymentsAnomaly} />}

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                <Card className="p-5">
                    <IconStat icon={Wallet} label="Payment Intents" value={<AnimatedNumber value={p.created} />} hint="Created in range" />
                </Card>
                <Card className="p-5">
                    <IconStat icon={Sparkles} label="Completed" value={<AnimatedNumber value={p.completed} />} hint={`Success rate: ${pct(p.successRate)}`} />
                </Card>
                <Card className="p-5">
                    <IconStat icon={AlertCircle} label="Failed" value={<AnimatedNumber value={p.failed} />} hint="Failures in range" />
                </Card>
                <Card className="p-5">
                    <IconStat icon={TrendingUp} label="Total Amount" value={<AnimatedMoney value={p.totalAmount} />} hint="Sum of amount" />
                </Card>
            </div>

            <ChartCard 
                title="Payments Over Time" 
                subtitle="Created / completed / failed / pending" 
                height={360}
                right={<AnomalyFlag anomaly={paymentsAnomaly} />}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series.paymentIntents || []}>
                        <CartesianGrid stroke="#F3F4F6" strokeDasharray="3 3" />
                        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={tooltipValueFormatter} />
                        <Legend />
                        <Line type="monotone" dataKey="created" name="Created" dot={false} strokeWidth={2} stroke={BRAND.primary} />
                        <Line type="monotone" dataKey="completed" name="Completed" dot={false} strokeWidth={2} stroke="#10B981" />
                        <Line type="monotone" dataKey="failed" name="Failed" dot={false} strokeWidth={2} stroke="#EF4444" />
                        <Line type="monotone" dataKey="pending" name="Pending" dot={false} strokeWidth={2} stroke="#F59E0B" />
                    </LineChart>
                </ResponsiveContainer>
            </ChartCard>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChartCard title="Orders Revenue" subtitle="Orders + revenue over time" height={320}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={series.orders || []}>
                            <CartesianGrid stroke="#F3F4F6" strokeDasharray="3 3" />
                            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={tooltipValueFormatter} />
                            <Legend />
                            <Bar dataKey="orders" name="Orders" fill={BRAND.primary} />
                            <Bar dataKey="revenue" name="Revenue" fill="#10B981" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <Card>
                    <CardHeader title="Payments by Purpose" subtitle="What money is used for" />
                    <Divider />
                    <div className="p-3" style={{ height: 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={breakdowns.paymentByPurpose || []} layout="vertical">
                                <CartesianGrid stroke="#F3F4F6" strokeDasharray="3 3" />
                                <XAxis type="number" tick={{ fontSize: 11 }} />
                                <YAxis type="category" dataKey="purpose" tick={{ fontSize: 11 }} width={140} />
                                <Tooltip formatter={tooltipValueFormatter} />
                                <Legend />
                                <Bar dataKey="count" name="Count" fill={BRAND.primary} />
                                <Bar dataKey="totalAmount" name="Total Amount" fill="#10B981" />
                                <Bar dataKey="completed" name="Completed" fill="#F59E0B" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChartCard title="Savings Contributions" subtitle="Volume + amount" height={320}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={series.savingsContributions || []}>
                            <CartesianGrid stroke="#F3F4F6" strokeDasharray="3 3" />
                            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={tooltipValueFormatter} />
                            <Legend />
                            <Line type="monotone" dataKey="contributions" name="Contributions" dot={false} strokeWidth={2} stroke={BRAND.primary} />
                            <Line type="monotone" dataKey="amount" name="Amount" dot={false} strokeWidth={2} stroke="#10B981" />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Savings Withdrawals" subtitle="Volume + amount" height={320}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={series.savingsWithdrawals || []}>
                            <CartesianGrid stroke="#F3F4F6" strokeDasharray="3 3" />
                            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={tooltipValueFormatter} />
                            <Legend />
                            <Line type="monotone" dataKey="withdrawals" name="Withdrawals" dot={false} strokeWidth={2} stroke={BRAND.primary} />
                            <Line type="monotone" dataKey="amount" name="Amount" dot={false} strokeWidth={2} stroke="#EF4444" />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            <Card>
                <CardHeader title="Top Payers" subtitle="Highest completed amount in range" />
                <Divider />
                <div className="p-4">
                    <Table
                        columns={[
                            { key: "fullName", label: "User" },
                            { key: "count", label: "Payments", render: (r) => fmtInt(r.count) },
                            { key: "total", label: "Total", render: (r) => fmtMoney(r.total, "KES") },
                        ]}
                        rows={leaders.topPayers || []}
                        rowKey={(r) => r.userId}
                    />
                </div>
            </Card>

            {paymentsAnomaly && (
                <Card className="p-5">
                    <div className="text-sm font-semibold text-gray-900">
                        Executive Insight
                    </div>
                    <div className="text-sm text-gray-900 mt-2">
                        {generateExplanation(paymentsAnomaly, series.paymentIntents, "Payments")}
                    </div>
                </Card>
            )}

            <Card>
                <CardHeader title="Activity Heatmap" subtitle="Intensity by bucket" />
                <Divider />
                <div className="p-4">
                    <Heatmap data={series.paymentIntents || []} keyName="created" />
                </div>
            </Card>
        </div>
    );
}

function MarketplaceEconomyLayer({ data }) {
    const kpis = data?.kpis || {};
    const series = data?.series || {};
    const breakdowns = data?.breakdowns || {};
    const leaders = data?.leaders || {};

    const ordersAnomaly = analyzeAnomaly(series.orders, "count", "Orders");

    return (
        <div className="space-y-4">
            {ordersAnomaly && <AlertBanner anomaly={ordersAnomaly} />}

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                <Card className="p-5">
                    <IconStat icon={ShoppingBag} label="Products" value={<AnimatedNumber value={kpis.totalProducts} />} />
                </Card>
                <Card className="p-5">
                    <IconStat icon={Wallet} label="Orders" value={<AnimatedNumber value={kpis.totalOrders} />} />
                </Card>
                <Card className="p-5">
                    <IconStat icon={Users} label="Jobs" value={<AnimatedNumber value={kpis.totalJobs} />} />
                </Card>
                <Card className="p-5">
                    <IconStat icon={TrendingUp} label="Funding" value={<AnimatedNumber value={kpis.totalFunding} />} />
                </Card>
                <Card className="p-5">
                    <IconStat icon={Sparkles} label="Skills" value={<AnimatedNumber value={kpis.totalSkills} />} />
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChartCard title="Products Created" subtitle="Supply trends" height={320}>
                    <SeriesArea data={series.products || []} yKey="count" yLabel="Products" />
                </ChartCard>

                <ChartCard 
                    title="Orders Created" 
                    subtitle="Demand trends" 
                    height={320}
                    right={<AnomalyFlag anomaly={ordersAnomaly} />}
                >
                    <SeriesLine data={series.orders || []} yKey="count" yLabel="Orders" />
                </ChartCard>
            </div>

            <ChartCard title="Revenue" subtitle="Orders revenue over time" height={340}>
                <SeriesBar data={series.revenue || []} yKey="revenue" yLabel="Revenue" />
            </ChartCard>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Card>
                    <CardHeader title="Top Product Categories" subtitle="Counts + avg price" />
                    <Divider />
                    <div className="p-4">
                        <Table
                            columns={[
                                { key: "category", label: "Category" },
                                { key: "count", label: "Products", render: (r) => fmtInt(r.count) },
                                { key: "avgPrice", label: "Avg Price", render: (r) => fmtMoney(r.avgPrice, "KES") },
                            ]}
                            rows={breakdowns.topProductCategories || []}
                            rowKey={(r) => r.category}
                        />
                    </div>
                </Card>

                <Card>
                    <CardHeader title="Jobs by Type" subtitle="Hiring mix" />
                    <Divider />
                    <div className="p-3" style={{ height: 300 }}>
                        <BreakdownPie
                            data={(breakdowns.jobTypes || []).map((x) => ({ type: x.type || "unknown", count: x.count }))}
                            nameKey="type"
                            valueKey="count"
                            height={280}
                        />
                    </div>
                </Card>

                <Card>
                    <CardHeader title="Skills by Category" subtitle="Talent distribution" />
                    <Divider />
                    <div className="p-3" style={{ height: 300 }}>
                        <BreakdownPie
                            data={(breakdowns.skillsByCategory || []).map((x) => ({ type: x.category || "unknown", count: x.count }))}
                            nameKey="type"
                            valueKey="count"
                            height={280}
                        />
                    </div>
                </Card>
            </div>

            <Card>
                <CardHeader title="Top Sellers" subtitle="Revenue via order items" />
                <Divider />
                <div className="p-4">
                    <Table
                        columns={[
                            { key: "fullName", label: "Seller" },
                            { key: "itemsSold", label: "Items Sold", render: (r) => fmtInt(r.itemsSold) },
                            { key: "revenue", label: "Revenue", render: (r) => fmtMoney(r.revenue, "KES") },
                        ]}
                        rows={leaders.topSellers || []}
                        rowKey={(r) => r.sellerId}
                    />
                </div>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <ChartCard title="Jobs Created" subtitle="Supply: jobs postings" height={260}>
                    <SeriesBar data={series.jobs || []} yKey="count" yLabel="Jobs" />
                </ChartCard>
                <ChartCard title="Funding Created" subtitle="Supply: funding offers" height={260}>
                    <SeriesBar data={series.funding || []} yKey="count" yLabel="Funding" />
                </ChartCard>
                <ChartCard title="Skills Created" subtitle="Supply: skills listings" height={260}>
                    <SeriesBar data={series.skills || []} yKey="count" yLabel="Skills" />
                </ChartCard>
            </div>

            {ordersAnomaly && (
                <Card className="p-5">
                    <div className="text-sm font-semibold text-gray-900">
                        Executive Insight
                    </div>
                    <div className="text-sm text-gray-900 mt-2">
                        {generateExplanation(ordersAnomaly, series.orders, "Orders")}
                    </div>
                </Card>
            )}

            <Card>
                <CardHeader title="Activity Heatmap" subtitle="Intensity by bucket" />
                <Divider />
                <div className="p-4">
                    <Heatmap data={series.orders || []} keyName="count" />
                </div>
            </Card>
        </div>
    );
}

function RealtimeLayer({ data }) {
    const kpis = data?.kpis || {};
    const feed = data?.feed || {};
    const live = data?.live || {};

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                <Card className="p-5">
                    <IconStat icon={Users} label="Active Users" value={<AnimatedNumber value={kpis.activeUsers} />} hint="Proxy via lastActive" />
                </Card>
                <Card className="p-5">
                    <IconStat icon={MessageSquare} label="Posts" value={<AnimatedNumber value={kpis.posts} />} hint="Recent" />
                </Card>
                <Card className="p-5">
                    <IconStat icon={Wallet} label="Payments" value={<AnimatedNumber value={kpis.payments} />} hint="Recent intents" />
                </Card>
                <Card className="p-5">
                    <IconStat icon={Shield} label="Reports" value={<AnimatedNumber value={kpis.reports} />} hint="Recent reports" />
                </Card>
                <Card className="p-5">
                    <IconStat icon={Activity} label="Live Voice Rooms" value={<AnimatedNumber value={kpis.liveVoiceRooms} />} hint="instances.status=live" />
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Card className="xl:col-span-2">
                    <CardHeader title="Realtime Feed" subtitle="Latest actions inside the window" />
                    <Divider />
                    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FeedCard title="Recent Posts" icon={MessageSquare} rows={feed.recentPosts || []} type="posts" />
                        <FeedCard title="Recent Payments" icon={Wallet} rows={feed.recentPayments || []} type="payments" />
                        <FeedCard title="Recent Reports" icon={Shield} rows={feed.recentReports || []} type="reports" />
                    </div>
                </Card>

                <Card>
                    <CardHeader title="Live Voice Rooms" subtitle="Currently live rooms" />
                    <Divider />
                    <div className="p-4">
                        {(live.voiceRooms || []).length === 0 ? (
                            <EmptyState
                                title="No live rooms right now"
                                description="When users go live, they'll appear here."
                                icon={Activity}
                            />
                        ) : (
                            <div className="space-y-3">
                                {(live.voiceRooms || []).map((v) => (
                                    <div key={v.voiceId} className="p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-gray-900 truncate">{v.title || "Voice Room"}</div>
                                                <div className="text-xs text-gray-900 mt-1">
                                                    Speakers: <span className="font-medium text-gray-900">{fmtInt(v.speakersCount)}</span> · Listeners:{" "}
                                                    <span className="font-medium text-gray-900">{fmtInt(v.listenersCount)}</span>
                                                </div>
                                            </div>
                                            <Pill tone="success">LIVE</Pill>
                                        </div>
                                        <div className="text-xs text-gray-900 mt-2">
                                            Started: {v.startsAt ? new Date(v.startsAt).toLocaleString("en-KE") : "—"}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}

function ModerationSafetyLayer({ data }) {
    const series = data?.series || {};
    const breakdowns = data?.breakdowns || {};
    const leaders = data?.leaders || {};
    const performance = data?.performance || {};
    const resolution = performance.resolution || {};

    const reportsAnomaly = analyzeAnomaly(series.reports, "count", "Reports");

    return (
        <div className="space-y-4">
            {reportsAnomaly && <AlertBanner anomaly={reportsAnomaly} />}

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                <Card className="p-5">
                    <IconStat icon={Shield} label="Resolved Reports" value={<AnimatedNumber value={resolution.countResolved} />} hint={`Avg: ${safeNumber(resolution.avgResolutionHours, 0).toFixed(1)} hrs`} />
                </Card>
                <Card className="p-5">
                    <IconStat icon={AlertCircle} label="Pending vs Resolved" value={<AnimatedNumber value={(breakdowns.reportStatus || []).reduce((s, r) => s + safeNumber(r.count, 0), 0)} />} hint="In range" />
                </Card>
                <Card className="p-5">
                    <IconStat icon={Users} label="Top Reported Users" value={fmtInt((leaders.topReportedUsers || []).length)} hint="Leaderboard" />
                </Card>
                <Card className="p-5">
                    <IconStat icon={MessageSquare} label="Top Target Types" value={fmtInt((breakdowns.reportTargetTypes || []).length)} hint="What gets reported" />
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChartCard 
                    title="Reports Over Time" 
                    subtitle="Volume trend" 
                    height={320}
                    right={<AnomalyFlag anomaly={reportsAnomaly} />}
                >
                    <SeriesArea data={series.reports || []} yKey="count" yLabel="Reports" />
                </ChartCard>

                <ChartCard title="Report Target Types" subtitle="What content is being reported" height={320}>
                    <BreakdownPie
                        data={(breakdowns.reportTargetTypes || []).map((x) => ({ type: x.targetType || "unknown", count: x.count }))}
                        nameKey="type"
                        valueKey="count"
                        height={300}
                    />
                </ChartCard>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Card>
                    <CardHeader title="Status Breakdown" subtitle="Resolved vs pending" />
                    <Divider />
                    <div className="p-3" style={{ height: 280 }}>
                        <BreakdownPie
                            data={(breakdowns.reportStatus || []).map((x) => ({ type: x.resolved ? "resolved" : "pending", count: x.count }))}
                            nameKey="type"
                            valueKey="count"
                            height={260}
                        />
                    </div>
                </Card>

                <Card className="xl:col-span-2">
                    <CardHeader title="Top Reported Users" subtitle="Most reports in range" />
                    <Divider />
                    <div className="p-4">
                        <Table
                            columns={[
                                { key: "fullName", label: "User" },
                                { key: "role", label: "Role" },
                                { key: "reports", label: "Reports", render: (r) => fmtInt(r.reports) },
                            ]}
                            rows={leaders.topReportedUsers || []}
                            rowKey={(r) => r.userId}
                        />
                    </div>
                </Card>
            </div>

            <Card>
                <CardHeader title="Notification Types" subtitle="System + safety alerts usage" />
                <Divider />
                <div className="p-4">
                    <Table
                        columns={[
                            { key: "type", label: "Type" },
                            { key: "count", label: "Count", render: (r) => fmtInt(r.count) },
                        ]}
                        rows={breakdowns.notificationTypes || []}
                        rowKey={(r) => r.type}
                    />
                </div>
            </Card>

            {reportsAnomaly && (
                <Card className="p-5">
                    <div className="text-sm font-semibold text-gray-900">
                        Executive Insight
                    </div>
                    <div className="text-sm text-gray-900 mt-2">
                        {generateExplanation(reportsAnomaly, series.reports, "Reports")}
                    </div>
                </Card>
            )}

            <Card>
                <CardHeader title="Activity Heatmap" subtitle="Intensity by bucket" />
                <Divider />
                <div className="p-4">
                    <Heatmap data={series.reports || []} keyName="count" />
                </div>
            </Card>
        </div>
    );
}

function GrowthRetentionLayer({ data }) {
    const series = data?.series || {};
    const retention = data?.retention || {};
    const funnel = data?.funnelProxy || {};

    const signupsAnomaly = analyzeAnomaly(series.newUsers, "count", "Signups");

    return (
        <div className="space-y-4">
            {signupsAnomaly && <AlertBanner anomaly={signupsAnomaly} />}

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                <Card className="p-5">
                    <IconStat icon={Users} label="Signups" value={<AnimatedNumber value={funnel.signups} />} hint="In range" />
                </Card>
                <Card className="p-5">
                    <IconStat icon={MessageSquare} label="Users Who Posted" value={<AnimatedNumber value={funnel.usersWhoPosted} />} hint="Funnel proxy" />
                </Card>
                <Card className="p-5">
                    <IconStat icon={GraduationCap} label="Users Who Enrolled" value={<AnimatedNumber value={funnel.usersWhoEnrolled} />} hint="Funnel proxy" />
                </Card>
                <Card className="p-5">
                    <IconStat icon={Wallet} label="Users Who Paid" value={<AnimatedNumber value={funnel.usersWhoPaid} />} hint="Completed payments" />
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ChartCard 
                    title="New Users" 
                    subtitle="Signups over time" 
                    height={320}
                    right={<AnomalyFlag anomaly={signupsAnomaly} />}
                >
                    <SeriesArea data={series.newUsers || []} yKey="count" yLabel="New Users" />
                </ChartCard>
                <ChartCard title="Active Users" subtitle="Proxy using lastActive" height={320}>
                    <SeriesLine data={series.activeUsers || []} yKey="count" yLabel="Active Users" />
                </ChartCard>
            </div>

            <Card>
                <CardHeader
                    title="Cohort Retention (Proxy)"
                    subtitle="Cohorts by signup day; activeInWindow/signups"
                    right={<Pill tone="warning"><Info size={12} className="mr-1" /> proxy</Pill>}
                />
                <Divider />
                <div className="p-3" style={{ height: 360 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={(retention.cohorts || []).map((c) => ({
                            cohortDay: c.cohortDay,
                            signups: c.signups,
                            activeInWindow: c.activeInWindow,
                            retentionProxyPct: Math.round((safeNumber(c.retentionProxy, 0) * 100) * 10) / 10,
                        }))}>
                            <CartesianGrid stroke="#F3F4F6" strokeDasharray="3 3" />
                            <XAxis dataKey="cohortDay" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="signups" name="Signups" fill={BRAND.primary} />
                            <Bar dataKey="activeInWindow" name="Active In Window" fill="#10B981" />
                            <Bar dataKey="retentionProxyPct" name="Retention % (proxy)" fill="#F59E0B" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Card>
                <CardHeader title="Funnel Proxy" subtitle="Conversion at a glance" />
                <Divider />
                <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FunnelStep label="Signups" value={funnel.signups} />
                    <FunnelStep label="Posted" value={funnel.usersWhoPosted} />
                    <FunnelStep label="Enrolled" value={funnel.usersWhoEnrolled} />
                    <FunnelStep label="Paid" value={funnel.usersWhoPaid} />
                </div>
            </Card>

            {signupsAnomaly && (
                <Card className="p-5">
                    <div className="text-sm font-semibold text-gray-900">
                        Executive Insight
                    </div>
                    <div className="text-sm text-gray-900 mt-2">
                        {generateExplanation(signupsAnomaly, series.newUsers, "Signups")}
                    </div>
                </Card>
            )}

            <Card>
                <CardHeader title="Activity Heatmap" subtitle="Intensity by bucket" />
                <Divider />
                <div className="p-4">
                    <Heatmap data={series.newUsers || []} keyName="count" />
                </div>
            </Card>
        </div>
    );
}

// ============================================================
// FEED + FUNNEL COMPONENTS
// ============================================================

function FeedCard({ title, icon: Icon, rows, type }) {
    const items = Array.isArray(rows) ? rows : [];

    return (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Icon size={16} /> {title}
                </div>
                <Pill>{fmtInt(items.length)}</Pill>
            </div>
            <div className="p-3 max-h-[340px] overflow-auto space-y-2">
                {items.length === 0 ? (
                    <div className="text-xs text-gray-900 py-6 text-center">No data in this window.</div>
                ) : (
                    items.map((r, idx) => (
                        <div key={idx} className="p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
                            {type === "posts" ? (
                                <>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="text-xs font-semibold text-gray-900">Post · {r.type || "text"}</div>
                                        <div className="text-[11px] text-gray-900">{r.createdAt ? new Date(r.createdAt).toLocaleTimeString("en-KE") : ""}</div>
                                    </div>
                                    <div className="text-xs text-gray-900 mt-1 line-clamp-3">{r.textPreview || "—"}</div>
                                    <div className="mt-2 flex gap-2">
                                        <Pill>❤ {fmtInt(r.likesCount)}</Pill>
                                        <Pill>💬 {fmtInt(r.commentsCount)}</Pill>
                                    </div>
                                </>
                            ) : type === "payments" ? (
                                <>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="text-xs font-semibold text-gray-900">{r.purpose || "PAYMENT"}</div>
                                        <Pill tone={r.status === "COMPLETED" ? "success" : r.status === "FAILED" ? "danger" : "warning"}>
                                            {r.status}
                                        </Pill>
                                    </div>
                                    <div className="text-xs text-gray-900 mt-1">
                                        Amount: <span className="font-semibold">{fmtMoney(r.amount, r.currency || "KES")}</span>
                                    </div>
                                    <div className="text-[11px] text-gray-900 mt-1">
                                        {r.createdAt ? new Date(r.createdAt).toLocaleString("en-KE") : ""}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="text-xs font-semibold text-gray-900">{r.targetType || "report"}</div>
                                        <Pill tone={r.resolved ? "success" : "warning"}>{r.resolved ? "resolved" : "pending"}</Pill>
                                    </div>
                                    <div className="text-xs text-gray-900 mt-1 line-clamp-3">{r.reason || "—"}</div>
                                    <div className="text-[11px] text-gray-900 mt-1">
                                        {r.createdAt ? new Date(r.createdAt).toLocaleString("en-KE") : ""}
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function FunnelStep({ label, value }) {
    return (
        <div className="p-4 rounded-xl border border-gray-200">
            <div className="text-xs text-gray-900">{label}</div>
            <div className="text-2xl font-semibold text-gray-900 mt-1">{fmtInt(value)}</div>
        </div>
    );
}

// ============================================================
// DATA MERGE HELPERS
// ============================================================

function mergeBuckets(seriesArr, keys) {
    const map = new Map();
    for (let i = 0; i < seriesArr.length; i++) {
        const arr = Array.isArray(seriesArr[i]) ? seriesArr[i] : [];
        const key = keys[i];
        for (const row of arr) {
            const b = row.bucket;
            if (!b) continue;
            if (!map.has(b)) map.set(b, { bucket: b });
            map.get(b)[key] = safeNumber(row.count, 0);
        }
    }
    return Array.from(map.values()).sort((a, b) => String(a.bucket).localeCompare(String(b.bucket)));
}

function mergeBucketObjects(arrs) {
    const map = new Map();
    for (const arr of arrs) {
        const a = Array.isArray(arr) ? arr : [];
        for (const row of a) {
            const b = row.bucket;
            if (!b) continue;
            if (!map.has(b)) map.set(b, { bucket: b });
            Object.entries(row).forEach(([k, v]) => {
                if (k === "bucket") return;
                map.get(b)[k] = safeNumber(v, v);
            });
        }
    }
    return Array.from(map.values()).sort((a, b) => String(a.bucket).localeCompare(String(b.bucket)));
}

// ============================================================
// PRINT STYLES
// ============================================================

const printStyles = `
@media print {
    body { background: #fff !important; }
    .no-print { display: none !important; }
    .print-area { padding: 0 !important; }
    .print-card { break-inside: avoid; page-break-inside: avoid; }
}
`;

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

export default function Analytics() {
    const dispatch = useDispatch();
    const reportRef = useRef(null);

    // ---- Anomaly State
    const [anomalyLog, setAnomalyLog] = useState([]);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // ---- Selectors (adjust to your slice state)
    const {
        currentLayerKey,
        range,
        realtime,
        limit,
        layerDataByKey,
        loadingByKey,
        errorByKey,
        lastParamsByKey,
    } = useSelector((s) => s.analytics);

    // Load anomalies from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem("asiyo-anomaly-log");
        if (saved) setAnomalyLog(JSON.parse(saved));
    }, []);

    // Save anomalies to localStorage when they change
    useEffect(() => {
        localStorage.setItem("asiyo-anomaly-log", JSON.stringify(anomalyLog));
    }, [anomalyLog]);

    // Fallbacks
    const layerKey = currentLayerKey || "overview";
    const from = range?.from ? new Date(range.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = range?.to ? new Date(range.to) : new Date();
    const tz = range?.tz || TZ_DEFAULT;
    const granularity = range?.granularity || "day";
    const rtMinutes = realtime?.minutes ?? 15;
    const rtLimit = realtime?.limit ?? limit ?? 10;

    // Current layer state
    const data = layerDataByKey?.[layerKey] || null;
    const loading = Boolean(loadingByKey?.[layerKey]);
    const error = errorByKey?.[layerKey] || null;

    // Local UI
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [autoRefreshRealtime, setAutoRefreshRealtime] = useState(false);
    const [drill, setDrill] = useState({ open: false, title: "", payload: null });
    const autoRefreshRef = useRef(null);

    // Detect anomalies from current data
    const anomalies = useMemo(() => {
        if (!data?.series) return {};

        const posts = analyzeAnomaly(data.series.posts, "count", "Posts");
        const users = analyzeAnomaly(data.series.newUsers, "count", "New Users");
        const payments = analyzeAnomaly(data.series.paymentIntents, "created", "Payments");
        const orders = analyzeAnomaly(data.series.orders, "count", "Orders");
        const reports = analyzeAnomaly(data.series.reports, "count", "Reports");
        const enrollments = analyzeAnomaly(data.series.enrollments, "enrollments", "Enrollments");

        return {
            posts,
            users,
            payments,
            orders,
            reports,
            enrollments,
        };
    }, [data]);

    // Auto-log anomalies with stable fingerprint
    useEffect(() => {
        Object.entries(anomalies).forEach(([key, anomaly]) => {
            if (!anomaly) return;

            const fingerprint = `${key}-${Math.round(anomaly.latest)}-${Math.round(anomaly.mean)}`;

            const entry = {
                id: fingerprint,
                label:
                    key === "users" ? "New Users" :
                    key === "posts" ? "Posts" :
                    key === "payments" ? "Payments" :
                    key === "orders" ? "Orders" :
                    key === "reports" ? "Reports" :
                    key === "enrollments" ? "Enrollments" :
                    key,
                summary: anomaly.summary,
                severity: anomaly.pctAbove > 150 ? "critical" : "moderate",
                timestamp: new Date().toISOString(),
                fingerprint,
                resolved: false,
            };

            setAnomalyLog((prev) => {
                if (prev.some((e) => e.fingerprint === fingerprint)) return prev;
                return [entry, ...prev].slice(0, 50);
            });

            setUnreadCount((c) => c + 1);
        });
    }, [anomalies]);

    // Resolve anomaly handler
    const resolveAnomaly = (id) => {
        setAnomalyLog(prev =>
            prev.map(e =>
                e.id === id ? { ...e, resolved: true } : e
            )
        );
    };

    // Build params
    const params = useMemo(() => {
        if (layerKey === "realtime") {
            return { minutes: rtMinutes, limit: rtLimit };
        }
        return {
            from: toISODateInput(from),
            to: toISODateInput(to),
            tz,
            granularity,
            limit: rtLimit,
        };
    }, [layerKey, from, to, tz, granularity, rtMinutes, rtLimit]);

    const paramsHash = useMemo(() => hashParams({ key: layerKey, ...params }), [layerKey, params]);

    const fetchNow = useCallback(
        (force = false) => {
            dispatch(fetchAnalyticsLayer({ key: layerKey, params, paramsHash, force }));
        },
        [dispatch, layerKey, params, paramsHash]
    );

    // Initial fetch
    useEffect(() => {
        fetchNow(false);
    }, [layerKey, paramsHash]);

    // Auto-refresh for realtime
    useEffect(() => {
        if (!autoRefreshRealtime || layerKey !== "realtime") {
            if (autoRefreshRef.current) {
                clearInterval(autoRefreshRef.current);
                autoRefreshRef.current = null;
            }
            return;
        }

        autoRefreshRef.current = setInterval(() => {
            fetchNow(true);
        }, 10_000);

        return () => {
            if (autoRefreshRef.current) {
                clearInterval(autoRefreshRef.current);
                autoRefreshRef.current = null;
            }
        };
    }, [autoRefreshRealtime, layerKey, fetchNow]);

    const selectedLayer = useMemo(() => LAYERS.find((l) => l.key === layerKey) || LAYERS[0], [layerKey]);
    const LayerIcon = selectedLayer.icon || Layers;

    // Export handlers
    const onExportJSON = useCallback(() => {
        const payload = {
            exportedAt: new Date().toISOString(),
            layerKey,
            params,
            data,
            anomalies: anomalies,
        };
        downloadTextFile(`analytics-${layerKey}-${Date.now()}.json`, JSON.stringify(payload, null, 2), "application/json");
    }, [layerKey, params, data, anomalies]);

    const onExportCSV = useCallback(() => {
        const rows = flattenForExport(layerKey, data);
        const csv = jsonToCSV(rows);
        downloadTextFile(`analytics-${layerKey}-${Date.now()}.csv`, csv, "text/csv");
    }, [layerKey, data]);

    const onExportPDF = useCallback(async () => {
        if (!data) return;

        const doc = new jsPDF("p", "mm", "a4");
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header
        doc.setFontSize(14);
        doc.text("Asiyo Analytics Report", 14, 16);
        doc.setFontSize(10);
        doc.setTextColor(90);
        doc.text(`Layer: ${selectedLayer.label}`, 14, 22);
        doc.text(`Range: ${layerKey === "realtime" ? `Last ${rtMinutes} minutes` : `${toISODateInput(from)} → ${toISODateInput(to)}`}`, 14, 27);
        doc.text(`Exported: ${new Date().toLocaleString("en-KE")}`, 14, 32);
        doc.setTextColor(0);

        // KPI summary table
        const kpiData = data?.kpis ? [data.kpis] : [];
        if (kpiData.length) {
            const cols = Object.keys(kpiData[0]).slice(0, 10);
            autoTable(doc, {
                startY: 38,
                head: [cols.map((c) => c)],
                body: kpiData.map((r) => cols.map((c) => r?.[c] ?? "")),
                styles: { fontSize: 8 },
                headStyles: { fillColor: [106, 27, 154] },
            });
        }

        // Charts/sections snapshot
        if (reportRef.current) {
            doc.addPage();

            const canvas = await html2canvas(reportRef.current, {
                scale: 2,
                backgroundColor: "#ffffff",
                useCORS: true,
            });

            const imgData = canvas.toDataURL("image/png");
            const imgProps = doc.getImageProperties(imgData);
            const pdfWidth = pageWidth - 28;
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            let y = 14;
            let remainingHeight = pdfHeight;
            let sourceY = 0;

            while (remainingHeight > 0) {
                const pageHeight = doc.internal.pageSize.getHeight() - 28;
                const sliceHeight = Math.min(remainingHeight, pageHeight);

                const sliceCanvas = document.createElement("canvas");
                sliceCanvas.width = canvas.width;
                sliceCanvas.height = (sliceHeight * canvas.width) / pdfWidth;

                const ctx = sliceCanvas.getContext("2d");
                ctx.drawImage(
                    canvas,
                    0,
                    sourceY,
                    canvas.width,
                    sliceCanvas.height,
                    0,
                    0,
                    canvas.width,
                    sliceCanvas.height
                );

                const sliceData = sliceCanvas.toDataURL("image/png");
                doc.addImage(sliceData, "PNG", 14, y, pdfWidth, sliceHeight);

                remainingHeight -= sliceHeight;
                sourceY += sliceCanvas.height;

                if (remainingHeight > 0) doc.addPage();
            }
        }

        doc.save(`asiyo-analytics-${layerKey}-${Date.now()}.pdf`);
    }, [data, layerKey, selectedLayer.label, rtMinutes, from, to]);

    const onExportXLSX = useCallback(() => {
        const rows = flattenForExport(layerKey, data);
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Analytics");

        const excelBuffer = XLSX.write(workbook, {
            bookType: "xlsx",
            type: "array",
        });

        const file = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(file, `analytics-${layerKey}.xlsx`);
    }, [layerKey, data]);

    const onCopyJSON = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify({ layerKey, params, data, anomalies }, null, 2));
        } catch {
            // ignore
        }
    }, [layerKey, params, data, anomalies]);

    const onPrint = useCallback(() => {
        window.print();
    }, []);

    const openDrill = (title, payload) => setDrill({ open: true, title, payload });
    const closeDrill = () => setDrill({ open: false, title: "", payload: null });

    // UI handlers
    const changeLayer = useCallback(
        (key) => {
            dispatch(setCurrentLayerKey(key));
        },
        [dispatch]
    );

    const changeFrom = useCallback(
        (value) => {
            dispatch(setDateRange({ from: value, to: toISODateInput(to) }));
        },
        [dispatch, to]
    );

    const changeTo = useCallback(
        (value) => {
            dispatch(setDateRange({ from: toISODateInput(from), to: value }));
        },
        [dispatch, from]
    );

    const changeTz = useCallback(
        (value) => {
            dispatch(setTimezone(value || TZ_DEFAULT));
        },
        [dispatch]
    );

    const changeGranularity = useCallback(
        (g) => {
            dispatch(setGranularity(g));
        },
        [dispatch]
    );

    const changeRealtimeMinutes = useCallback(
        (m) => {
            dispatch(setRealtimeMinutes(m));
        },
        [dispatch]
    );

    const changeLimit = useCallback(
        (n) => {
            dispatch(setLimit(n));
        },
        [dispatch]
    );

    return (
        <AdminLayout>
            <style>{printStyles}</style>
            <div className="p-4 md:p-6 space-y-4 no-print">
                {/* =====================================================
                    EXECUTIVE SUMMARY CARD
                ====================================================== */}
                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-semibold text-gray-900">
                                Executive Summary
                            </div>
                            <div className="text-sm text-gray-900 mt-2">
                                This dashboard provides operational visibility into user growth,
                                engagement behavior, transaction performance, and platform health.
                                Use it to guide strategic, financial, and moderation decisions.
                            </div>
                        </div>
                        <NotificationBell 
                            count={unreadCount} 
                            onClick={() => {
                                setNotificationsOpen(true);
                                setUnreadCount(0);
                            }} 
                        />
                    </div>
                </Card>

                {/* =====================================================
                    HERO HEADER
                ====================================================== */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm relative">
                    <div className="p-6 bg-white border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <img src={logo} alt="Asiyo" className="h-10 w-auto" />
                                <div>
                                    <div className="text-lg font-semibold text-gray-900">
                                        Asiyo Analytics Suite
                                    </div>
                                    <div className="text-sm text-gray-900">
                                        Executive Intelligence Dashboard
                                    </div>
                                </div>
                            </div>

                            <div className="text-sm text-gray-900">
                                {layerKey === "realtime"
                                    ? `Realtime: Last ${rtMinutes} Minutes`
                                    : `${toISODateInput(from)} — ${toISODateInput(to)} · ${granularity}`}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 md:p-6">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                            <LayerDropdown value={layerKey} onChange={changeLayer} />

                            <div className="flex flex-wrap gap-2">
                                <Button variant="secondary" onClick={() => fetchNow(true)} disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                                    Refresh
                                </Button>

                                <Button variant="ghost" onClick={onExportCSV} disabled={!data}>
                                    <FileDown size={16} /> CSV
                                </Button>

                                <Button variant="ghost" onClick={onExportJSON} disabled={!data}>
                                    <FileJson size={16} /> JSON
                                </Button>

                                <Button variant="ghost" onClick={onExportPDF} disabled={!data}>
                                    <FileText size={16} /> PDF
                                </Button>

                                <Button variant="ghost" onClick={onExportXLSX} disabled={!data}>
                                    <TableIcon size={16} /> XLSX
                                </Button>

                                <Button variant="ghost" onClick={onPrint} disabled={!data}>
                                    <FileDown size={16} /> Print
                                </Button>

                                <Button variant="ghost" onClick={onCopyJSON} disabled={!data}>
                                    <ClipboardCopy size={16} /> Copy
                                </Button>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 items-center">
                            <button
                                type="button"
                                onClick={() => setShowAdvanced((s) => !s)}
                                className="px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-900 text-sm border border-gray-200 transition"
                            >
                                {showAdvanced ? "Hide Controls" : "Show Controls"}
                            </button>

                            {layerKey === "realtime" ? (
                                <button
                                    type="button"
                                    onClick={() => setAutoRefreshRealtime((s) => !s)}
                                    className={`px-3 py-2 rounded-xl text-sm border transition ${autoRefreshRealtime
                                            ? "bg-[#6A1B9A] text-white border-[#6A1B9A]"
                                            : "bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
                                        }`}
                                >
                                    <Zap size={16} className="inline mr-2" />
                                    Auto-refresh
                                </button>
                            ) : null}

                            <Pill tone="default">
                                <Eye size={12} className="mr-1" /> Decision dashboard
                            </Pill>
                        </div>

                        <AnimatePresence initial={false}>
                            {showAdvanced ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 8 }}
                                    className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4"
                                >
                                    <DateControls
                                        from={from}
                                        to={to}
                                        tz={tz}
                                        granularity={granularity}
                                        onFromChange={changeFrom}
                                        onToChange={changeTo}
                                        onTzChange={changeTz}
                                        onGranularityChange={changeGranularity}
                                    />

                                    <RealtimeControls
                                        minutes={rtMinutes}
                                        limit={rtLimit}
                                        onMinutes={changeRealtimeMinutes}
                                        onLimit={changeLimit}
                                    />
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </div>
                </div>

                {/* =====================================================
                    BODY
                ====================================================== */}
                <div className="space-y-4">
                    {/* Error */}
                    {error ? (
                        <Card>
                            <ErrorBlock
                                title="Failed to load analytics"
                                message={error}
                                onRetry={() => fetchNow(true)}
                            />
                        </Card>
                    ) : null}

                    {/* Loading */}
                    {loading && !data ? (
                        <Card>
                            <LoadingBlock label="Loading analytics data..." />
                        </Card>
                    ) : null}

                    {/* No Data */}
                    {!loading && !error && !data ? (
                        <Card>
                            <EmptyState
                                title="No analytics data yet"
                                description="If this is a fresh system, generate activity or confirm models are connected and endpoints return data."
                                icon={BarChart3}
                                action={
                                    <Button onClick={() => fetchNow(true)}>
                                        <RefreshCw size={16} /> Try again
                                    </Button>
                                }
                            />
                        </Card>
                    ) : null}

                    {/* Layer Content */}
                    {data ? (
                        <AnimatePresence mode="wait">
                            <motion.div
                                ref={reportRef}
                                key={`${layerKey}-${paramsHash}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="space-y-4 print-area"
                            >
                                {layerKey === "overview" ? (
                                    <OverviewLayer data={data} onKpiClick={openDrill} anomaly={anomalies} />
                                ) : layerKey === "user-community" ? (
                                    <UserCommunityLayer data={data} onKpiClick={openDrill} />
                                ) : layerKey === "social-engagement" ? (
                                    <SocialEngagementLayer data={data} />
                                ) : layerKey === "learning-programs" ? (
                                    <LearningProgramsLayer data={data} />
                                ) : layerKey === "financial-transactions" ? (
                                    <FinancialTransactionsLayer data={data} />
                                ) : layerKey === "marketplace-economy" ? (
                                    <MarketplaceEconomyLayer data={data} />
                                ) : layerKey === "realtime" ? (
                                    <RealtimeLayer data={data} />
                                ) : layerKey === "moderation-safety" ? (
                                    <ModerationSafetyLayer data={data} />
                                ) : layerKey === "growth-retention" ? (
                                    <GrowthRetentionLayer data={data} />
                                ) : (
                                    <Card>
                                        <EmptyState
                                            title="Unknown Layer"
                                            description="This layer key isn't mapped in the frontend renderer."
                                            icon={AlertCircle}
                                        />
                                    </Card>
                                )}

                                {/* Anomaly Timeline */}
                                {anomalyLog.length > 0 && (
                                    <AnomalyTimeline log={anomalyLog} />
                                )}

                                <div className="border-t border-gray-100 my-6" />

                                {/* =====================================================
                                    PROFESSIONAL FOOTER
                                ====================================================== */}
                                <Card className="p-6 bg-gray-50 print-card">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs text-gray-900">
                                            © {new Date().getFullYear()} Asiyo Intelligence Platform
                                        </div>
                                        <div className="text-xs text-gray-900">
                                            Confidential · Internal Use Only
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        </AnimatePresence>
                    ) : null}
                </div>
            </div>

            <DrilldownModal
                open={drill.open}
                title={drill.title}
                payload={drill.payload}
                onClose={closeDrill}
            />

            <NotificationPanel
                open={notificationsOpen}
                log={anomalyLog}
                onClose={() => setNotificationsOpen(false)}
                onResolve={resolveAnomaly}
            />
        </AdminLayout>
    );
}