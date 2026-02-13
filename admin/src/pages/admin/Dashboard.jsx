import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDashboardMetrics } from "../../store/slices/adminSlice";
import AdminLayout from "../../components/layout/AdminLayout";

import {
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

import { motion } from "framer-motion";

// icons
import {
  Users,
  Layers,
  TrendingUp,
  Target,
  Calendar,
  ChevronUp,
  ChevronDown,
  DollarSign,
  PieChart as PieChartIcon,
  Activity,
  Shield,
  Award,
  BarChart3
} from "lucide-react";
import logo from "../../assets/asiyo-nobg.png";
// colors
const colors = {
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },
  purple: "#8B5CF6",
  blue: "#3B82F6",
  green: "#10B981",
  chart: {
    line: "#8B5CF6",
    area: "#3B82F6",
    revenue: "#10B981",
    completed: "#10B981",
  }
};

// trend helper - fixed div by zero
const useTrend = (current, previous) => {
  if (!current || !previous || previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  return {
    value: change.toFixed(1),
    up: change > 0
  };
};

// kpi cards
const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  color = colors.purple,
  delay = 0
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.1 }}
      whileHover={{ y: -6 }}
      className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-semibold text-gray-900">{value}</h3>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>

        <Icon size={22} color={color} strokeWidth={1.5} />
      </div>

      {trend && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
          <span className={`flex items-center gap-0.5 text-xs font-medium ${trend.up ? 'text-emerald-600' : 'text-rose-600'
            }`}>
            {trend.up ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-gray-400">vs last month</span>
        </div>
      )}
    </motion.div>
  );
};

// chart cards
const ChartCard = ({
  title,
  subtitle,
  value,
  icon: Icon,
  children,
  color = colors.purple,
  delay = 0,
  footer
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.1 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow"
    >
      <div className="p-6 pb-0">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Icon size={20} color={color} strokeWidth={1.5} />

            <div>
              <h4 className="font-medium text-gray-900">{title}</h4>
              {subtitle && (
                <p className="text-xs text-gray-400">{subtitle}</p>
              )}
            </div>
          </div>

          {value && (
            <p className="text-xl font-semibold text-gray-900">{value}</p>
          )}
        </div>
      </div>

      <div className="px-2 h-56">
        {children}
      </div>

      {footer && (
        <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-500">
          {footer}
        </div>
      )}
    </motion.div>
  );
};

// simple tooltip
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white shadow-md rounded-lg px-3 py-2 text-xs border">
      <p className="font-medium text-gray-900 mb-1">{label}</p>
      <p className="text-gray-600">{payload[0].value.toLocaleString()}</p>
    </div>
  );
};

// main dashboard
export default function Dashboard() {
  const dispatch = useDispatch();
  const { totals, charts, loading } = useSelector((s) => s.admin.dashboard);

  // FETCH DASHBOARD METRICS ON COMPONENT MOUNT
  useEffect(() => {
    dispatch(fetchDashboardMetrics());
  }, [dispatch]);

  // TRANSFORM CHART DATA FOR REACT COMPONENTS
  const userChartData = useMemo(() => {
    if (!charts) return [];
    return charts.labels.map((label, i) => ({
      name: label,
      value: charts.users?.[i] || 0,
    }));
  }, [charts]);

  const groupChartData = useMemo(() => {
    if (!charts) return [];
    return charts.labels.map((label, i) => ({
      name: label,
      value: charts.groups?.[i] || 0,
    }));
  }, [charts]);

  const revenueChartData = useMemo(() => {
    if (!charts) return [];
    return charts.labels.map((label, i) => ({
      name: label,
      value: charts.revenue?.[i] || 0,
    }));
  }, [charts]);

  // PIE CHART DATA FOR COMPLETION RATE
  const pieData = useMemo(() => {
    if (!totals) return [];
    const completion = Number(totals?.programs?.completionRate) || 0;
    return [
      { name: "Completed", value: completion },
      { name: "Remaining", value: 100 - completion }
    ];
  }, [totals]);

  // CALCULATE PEAK VALUE FOR TREND DISPLAY
  const peakValue = userChartData.length
    ? Math.max(...userChartData.map(d => d.value))
    : 0;

  const userTrend = useTrend(totals?.users, totals?.previousUsers);
  const revenueTrend = useTrend(totals?.revenue?.total, totals?.previousRevenue);

  // SHOW LOADING STATE IF DATA NOT AVAILABLE
  if (loading || !totals || !charts) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const lastUserValue = userChartData[userChartData.length - 1]?.value;

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">

        {/* HEADER SECTION WITH DATE AND PROGRAM COUNT */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="px-8 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">

                {/* LOGO */}
                <img
                  src={logo}
                  alt="Logo"
                  className="h-20 w-auto object-contain"
                />

                {/* TITLE */}
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    Dashboard
                  </h1>

                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <Calendar size={12} />
                    {new Date().toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>

              </div>

            </div>
          </div>
        </div>

        {/* MAIN DASHBOARD CONTENT */}
        <div className="px-8 py-6">

          {/* KPI CARDS ROW - 4 KEY METRICS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              title="Users"
              value={totals?.users?.toLocaleString() || "0"}
              icon={Users}
              trend={userTrend}
              subtitle="active members"
              color={colors.purple}
              delay={1}
            />

            <StatCard
              title="Groups"
              value={totals?.groups?.toLocaleString() || "0"}
              icon={Layers}
              subtitle="study circles"
              color={colors.blue}
              delay={2}
            />

            <StatCard
              title="Contributions"
              value={`KES ${totals?.revenue?.total?.toLocaleString("en-KE") || 0}`}
              icon={DollarSign}
              trend={revenueTrend}
              subtitle="made on platform"
              color={colors.green}
              delay={3}
            />

            <StatCard
              title="Completion"
              value={`${totals?.programs?.completionRate || 0}%`}
              icon={Target}
              subtitle="overall progress"
              color={colors.purple}
              delay={4}
            />
          </div>

          {/* CHARTS SECTION - 2X2 GRID LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* USER ACTIVITY LINE CHART */}
            <ChartCard
              title="User activity"
              subtitle="daily active users"
              value={lastUserValue?.toLocaleString()}
              icon={BarChart3}
              color={colors.chart.line}
              delay={5}
              footer={
                <span>↑ 12.5% vs last week · peak: {peakValue.toLocaleString()}</span>
              }
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.gray[200]} vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: colors.gray[400], fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: colors.gray[400], fontSize: 11 }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={colors.chart.line}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 1 }}
                    isAnimationActive
                    animationDuration={900}
                    animationEasing="ease-out"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* GROUP ACTIVITY AREA CHART */}
            <ChartCard
              title="Group activity"
              subtitle="active groups over time"
              icon={PieChartIcon}
              color={colors.chart.area}
              delay={6}
              footer={
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>active</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-gray-200" />
                    <span>inactive</span>
                  </span>
                </div>
              }
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={groupChartData}>
                  <defs>
                    <linearGradient id="areaBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.chart.area} stopOpacity={0.1} />
                      <stop offset="100%" stopColor={colors.chart.area} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.gray[200]} vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: colors.gray[400], fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: colors.gray[400], fontSize: 11 }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={colors.chart.area}
                    strokeWidth={2}
                    fill="url(#areaBlue)"
                    isAnimationActive
                    animationDuration={900}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* REVENUE CONTRIBUTIONS AREA CHART */}
            <ChartCard
              title="Contributions"
              subtitle="monthly revenue"
              value={`KES ${totals?.revenue?.total?.toLocaleString("en-KE") || 0}`}
              icon={TrendingUp}
              color={colors.chart.revenue}
              delay={7}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="areaGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.chart.revenue} stopOpacity={0.1} />
                      <stop offset="100%" stopColor={colors.chart.revenue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.gray[200]} vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: colors.gray[400], fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: colors.gray[400], fontSize: 11 }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={colors.chart.revenue}
                    strokeWidth={2}
                    fill="url(#areaGreen)"
                    isAnimationActive
                    animationDuration={900}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* PROGRAM COMPLETION PIE CHART */}
            <ChartCard
              title="Program completion"
              subtitle="overall progress"
              value={`${totals?.programs?.completionRate || 0}%`}
              icon={Award}
              color={colors.chart.completed}
              delay={8}
              footer={
                <div className="flex justify-between w-full">
                  <span>{totals?.programs?.completionRate || 0}% completed</span>
                  <span className="text-gray-400">{100 - (totals?.programs?.completionRate || 0)}% remaining</span>
                </div>
              }
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    isAnimationActive
                    animationDuration={900}
                    animationEasing="ease-out"
                  >
                    <Cell fill={colors.chart.completed} stroke="none" />
                    <Cell fill={colors.gray[100]} stroke="none" />
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-lg font-semibold fill-gray-900"
                  >
                    {totals?.programs?.completionRate || 0}%
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}