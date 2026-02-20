import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAdminPods,
  fetchAdminPodById,
  setAdminSavingsFilters,
  clearSelectedPod,
} from "../../store/slices/savingsSlice";

import AdminLayout from "../../components/layout/AdminLayout";

import {
  Users,
  Eye,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Wallet,
  Clock,
  Calendar,
  Tag,
  Target,
  Settings,
  Shield,
  User,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Image,
  Award,
  Briefcase,
  Home,
  Heart,
  GraduationCap,
  ShoppingBag,
  Truck,
  Gift,
  Star,
  ThumbsUp,
  MessageCircle,
  Share2,
  Bookmark,
  MoreVertical,
  Lock,
  Unlock,
  EyeOff,
  Eye as EyeIcon,
  Edit,
  Trash2,
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Upload,
  Download as DownloadIcon,
  Printer,
  FileText,
  FileSpreadsheet,
  FileJson,
  File,
  Folder,
  FolderOpen,
  Layers,
  Grid,
  List,
  Menu,
  Settings as SettingsIcon,
  HelpCircle,
  Info,
  AlertTriangle,
  Check,
  X as XIcon,
  PlusCircle,
  MinusCircle,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  AlertCircle as AlertCircleIcon,
  Clock as ClockIcon,
  Calendar as CalendarIcon,
  User as UserIcon,
  Mail as MailIcon,
  Phone as PhoneIcon,
  MapPin as MapPinIcon,
  DollarSign as DollarSignIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from "lucide-react";

/* =========================================================
   HELPERS
========================================================= */

function formatDate(dt) {
  try {
    return new Date(dt).toLocaleString("en-KE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatDateShort(dt) {
  try {
    return new Date(dt).toLocaleString("en-KE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function formatKES(n) {
  if (!n && n !== 0) return "KES 0";
  return `KES ${Number(n).toLocaleString()}`;
}

function getStatusColor(status) {
  const colors = {
    active: "bg-emerald-100 text-emerald-800 border-emerald-200",
    paused: "bg-yellow-100 text-yellow-800 border-yellow-200",
    completed: "bg-blue-100 text-blue-800 border-blue-200",
    cancelled: "bg-rose-100 text-rose-800 border-rose-200",
    pending: "bg-purple-100 text-purple-800 border-purple-200",
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    rejected: "bg-rose-100 text-rose-800 border-rose-200",
    paid: "bg-green-100 text-green-800 border-green-200",
    failed: "bg-red-100 text-red-800 border-red-200",
  };
  return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
}

function getCategoryIcon(category) {
  const icons = {
    emergency: AlertCircle,
    investment: TrendingUp,
    education: GraduationCap,
    business: Briefcase,
    personal: Heart,
    group: Users,
  };
  return icons[category] || Wallet;
}

function getPrivacyIcon(privacy) {
  const icons = {
    public: Unlock,
    private: Lock,
    "invite-only": Shield,
  };
  return icons[privacy] || Lock;
}

/* =========================================================
   DETAIL COMPONENTS
========================================================= */

function DetailSection({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-black mb-3 pb-2 border-b">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  if (value === undefined || value === null || value === "") return null;

  return (
    <div className="flex items-start gap-3 py-1">
      {Icon && <Icon size={16} className="text-black mt-0.5 flex-shrink-0" />}
      <div className="flex-1">
        <p className="text-xs text-black/60 mb-1">{label}</p>
        <p className="text-sm text-black break-words">
          {typeof value === "boolean"
            ? value ? "Yes" : "No"
            : React.isValidElement(value)
              ? value
              : String(value)}
        </p>
      </div>
    </div>
  );
}

function DetailBadge({ value, color }) {
  if (!value) return null;
  return (
    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(value)}`}>
      {value}
    </span>
  );
}

function DetailArray({ icon: Icon, label, items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="flex items-start gap-3 py-1">
      {Icon && <Icon size={16} className="text-black mt-0.5 flex-shrink-0" />}
      <div className="flex-1">
        <p className="text-xs text-black/60 mb-2">{label}</p>
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span key={index} className="px-2 py-1 bg-gray-100 rounded-lg text-xs text-black">
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({ icon: Icon, label, value, subvalue, trend }) {
  return (
    <div className="p-4 border rounded-xl bg-white hover:shadow-md transition">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 bg-purple-50 rounded-lg">
          <Icon size={20} className="text-purple-700" />
        </div>
        {trend && (
          <span className={`text-xs flex items-center gap-1 ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trend > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-xl font-bold text-black">{value}</div>
      <div className="text-sm text-black/60">{label}</div>
      {subvalue && <div className="text-xs text-black/40 mt-1">{subvalue}</div>}
    </div>
  );
}

/* =========================================================
   USER AVATAR COMPONENT
========================================================= */

function UserAvatar({ user, size = "sm" }) {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const avatarUrl = user?.profile?.avatar?.url || user?.avatar?.url;
  const name = user?.profile?.fullName || user?.fullName || user?.name || "User";

  return (
    <div className="flex items-center gap-2">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className={`${sizes[size]} rounded-full border object-cover`}
        />
      ) : (
        <div className={`${sizes[size]} rounded-full bg-purple-100 flex items-center justify-center border`}>
          <UserIcon size={size === "sm" ? 16 : size === "md" ? 20 : 24} className="text-purple-700" />
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-black">{name}</p>
        {user?.email && <p className="text-xs text-black/60">{user.email}</p>}
      </div>
    </div>
  );
}

/* =========================================================
   CONTRIBUTION CARD
========================================================= */

function ContributionCard({ contribution }) {
  return (
    <div className="border rounded-lg p-3 hover:bg-gray-50 transition">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <UserAvatar user={contribution.member} size="sm" />
          <div>
            <p className="text-sm font-medium text-black">
              {contribution.member?.profile?.fullName || "Unknown Member"}
            </p>
            <p className="text-xs text-black/60">{formatDate(contribution.date)}</p>
          </div>
        </div>
        <DetailBadge value={contribution.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
        <div>
          <p className="text-xs text-black/60">Amount</p>
          <p className="font-medium text-black">{formatKES(contribution.amount)}</p>
        </div>
        <div>
          <p className="text-xs text-black/60">Method</p>
          <p className="capitalize text-black">{contribution.method}</p>
        </div>
        {contribution.transactionId && (
          <div className="col-span-2">
            <p className="text-xs text-black/60">Transaction ID</p>
            <div className="flex items-center gap-1">
              <p className="text-xs font-mono text-black/80">{contribution.transactionId}</p>
              <button 
                onClick={() => navigator.clipboard.writeText(contribution.transactionId)}
                className="text-purple-600 hover:text-purple-800"
              >
                <Copy size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   WITHDRAWAL CARD
========================================================= */

function WithdrawalCard({ withdrawal }) {
  return (
    <div className="border rounded-lg p-3 hover:bg-gray-50 transition">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <UserAvatar user={withdrawal.member} size="sm" />
          <div>
            <p className="text-sm font-medium text-black">
              {withdrawal.member?.profile?.fullName || "Unknown Member"}
            </p>
            <p className="text-xs text-black/60">{formatDate(withdrawal.date)}</p>
          </div>
        </div>
        <DetailBadge value={withdrawal.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
        <div>
          <p className="text-xs text-black/60">Amount</p>
          <p className="font-medium text-black">{formatKES(withdrawal.amount)}</p>
        </div>
        <div>
          <p className="text-xs text-black/60">Purpose</p>
          <p className="text-black truncate" title={withdrawal.purpose}>
            {withdrawal.purpose || "—"}
          </p>
        </div>
        {withdrawal.approvedBy && (
          <div className="col-span-2">
            <p className="text-xs text-black/60">Approved By</p>
            <p className="text-sm text-black">{withdrawal.approvedBy?.profile?.fullName}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Savings() {
  const dispatch = useDispatch();

  const {
    pods = [],
    podsLoading,
    selectedPod,
    selectedLoading,
    pagination,
    filters,
  } = useSelector((s) => s.savings);

  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("contributions"); // "contributions" | "withdrawals"
  const [sortBy, setSortBy] = useState("date"); // "date" | "amount"
  const [sortOrder, setSortOrder] = useState("desc"); // "asc" | "desc"
  const [showFilters, setShowFilters] = useState(false);

  /* =====================================================
     FETCH PODS
  ===================================================== */
  useEffect(() => {
    dispatch(fetchAdminPods());
  }, [dispatch, filters]);

  /* =====================================================
     HANDLERS
  ===================================================== */
  const openDetail = (id) => {
    dispatch(fetchAdminPodById(id));
    setDetailOpen(true);
    setActiveTab("contributions");
    setSortBy("date");
    setSortOrder("desc");
  };

  const closeDetail = () => {
    dispatch(clearSelectedPod());
    setDetailOpen(false);
  };

  const handleSearch = (e) => {
    dispatch(setAdminSavingsFilters({ search: e.target.value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    dispatch(setAdminSavingsFilters({ page: newPage }));
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const getSortedContributions = () => {
    if (!selectedPod?.contributions) return [];

    const contributions = [...selectedPod.contributions];

    return contributions.sort((a, b) => {
      if (sortBy === "date") {
        return sortOrder === "desc"
          ? new Date(b.date) - new Date(a.date)
          : new Date(a.date) - new Date(b.date);
      } else if (sortBy === "amount") {
        return sortOrder === "desc"
          ? b.amount - a.amount
          : a.amount - b.amount;
      }
      return 0;
    });
  };

  const getSortedWithdrawals = () => {
    if (!selectedPod?.withdrawals) return [];

    const withdrawals = [...selectedPod.withdrawals];

    return withdrawals.sort((a, b) => {
      if (sortBy === "date") {
        return sortOrder === "desc"
          ? new Date(b.date) - new Date(a.date)
          : new Date(a.date) - new Date(b.date);
      } else if (sortBy === "amount") {
        return sortOrder === "desc"
          ? b.amount - a.amount
          : a.amount - b.amount;
      }
      return 0;
    });
  };

  /* =====================================================
     RENDER
  ===================================================== */
  return (
    <AdminLayout title="Savings Pods">
      <div className="p-6 bg-gray-50 min-h-screen">

        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Wallet className="w-6 h-6 text-purple-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-black">Savings Pods</h1>
              <p className="text-sm text-black/60">Manage and monitor community savings groups</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
              <input
                type="text"
                placeholder="Search pods..."
                value={filters.search || ""}
                onChange={handleSearch}
                className="pl-9 pr-4 py-2 border rounded-lg bg-white text-black focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 border rounded-lg bg-white hover:bg-gray-50"
            >
              <Filter size={20} className="text-black" />
            </button>
            <button
              onClick={() => dispatch(fetchAdminPods())}
              className="p-2 border rounded-lg bg-white hover:bg-gray-50"
            >
              <RefreshCw size={20} className="text-black" />
            </button>
          </div>
        </div>

        {/* ================= FILTERS ================= */}
        {showFilters && (
          <div className="mb-6 p-4 bg-white rounded-xl border">
            <div className="flex gap-4 flex-wrap">
              <select
                value={filters.status || ""}
                onChange={(e) => dispatch(setAdminSavingsFilters({ status: e.target.value, page: 1 }))}
                className="px-3 py-2 border rounded-lg bg-white text-black"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={filters.category || ""}
                onChange={(e) => dispatch(setAdminSavingsFilters({ category: e.target.value, page: 1 }))}
                className="px-3 py-2 border rounded-lg bg-white text-black"
              >
                <option value="">All Categories</option>
                <option value="emergency">Emergency</option>
                <option value="investment">Investment</option>
                <option value="education">Education</option>
                <option value="business">Business</option>
                <option value="personal">Personal</option>
                <option value="group">Group</option>
              </select>

              <select
                value={filters.privacy || ""}
                onChange={(e) => dispatch(setAdminSavingsFilters({ privacy: e.target.value, page: 1 }))}
                className="px-3 py-2 border rounded-lg bg-white text-black"
              >
                <option value="">All Privacy</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="invite-only">Invite Only</option>
              </select>
            </div>
          </div>
        )}

        {/* ================= TABLE ================= */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-4 text-black font-semibold">Pod</th>
                <th className="p-4 text-black font-semibold">Creator</th>
                <th className="p-4 text-black font-semibold">Members</th>
                <th className="p-4 text-black font-semibold">Balance</th>
                <th className="p-4 text-black font-semibold">Target</th>
                <th className="p-4 text-black font-semibold">Progress</th>
                <th className="p-4 text-black font-semibold">Status</th>
                <th className="p-4 text-black font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {podsLoading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
                    </div>
                    <p className="text-black mt-2">Loading pods...</p>
                  </td>
                </tr>
              ) : pods.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center">
                    <Wallet size={48} className="mx-auto mb-3 text-gray-400" />
                    <p className="text-black font-medium">No savings pods found</p>
                    <p className="text-sm text-black/60 mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                pods.map((pod) => {
                  const CategoryIcon = getCategoryIcon(pod.category);
                  const PrivacyIcon = getPrivacyIcon(pod.settings?.privacy);
                  const progress = pod.progress || 0;

                  return (
                    <tr key={pod._id} className="border-t hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-purple-50 rounded-lg">
                            <CategoryIcon size={16} className="text-purple-700" />
                          </div>
                          <div>
                            <p className="font-medium text-black">{pod.name}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <PrivacyIcon size={12} className="text-black/40" />
                              <span className="text-xs text-black/40 capitalize">
                                {pod.settings?.privacy}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <UserAvatar user={pod.creator} size="sm" />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Users size={14} className="text-black/40" />
                          <span className="text-black font-medium">
                            {pod.activeMembersCount || pod.statistics?.activeMembers || 0}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-black">
                          {formatKES(pod.currentBalance)}
                        </span>
                      </td>
                      <td className="p-4 text-black/80">
                        {formatKES(pod.goal?.targetAmount)}
                      </td>
                      <td className="p-4">
                        <div className="w-24">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-black">{Math.round(progress)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 h-1.5 rounded-full">
                            <div
                              className="bg-purple-600 h-1.5 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(pod.status)}`}>
                          {pod.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => openDetail(pod._id)}
                          className="flex items-center gap-1 text-purple-600 hover:text-purple-800"
                        >
                          <Eye size={16} />
                          <span className="text-sm">View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* ================= PAGINATION ================= */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <span className="text-sm text-black/60">
                Page {pagination.page} of {pagination.pages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="p-2 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft size={16} className="text-black" />
                </button>
                <button
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="p-2 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRight size={16} className="text-black" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* =====================================================
           DETAIL MODAL
        ===================================================== */}
        {detailOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-start justify-center p-6 overflow-y-auto z-50">
            <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl relative my-8">

              {/* ========== MODAL HEADER ========== */}
              <div className="sticky top-0 bg-white rounded-t-xl border-b px-6 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Wallet className="w-5 h-5 text-purple-700" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-black">
                      {selectedPod?.name}
                    </h2>
                    <p className="text-sm text-black/60">
                      Created by {selectedPod?.creator?.profile?.fullName} • {formatDateShort(selectedPod?.createdAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeDetail}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-black" />
                </button>
              </div>

              {selectedLoading || !selectedPod ? (
                <div className="p-12 text-center">
                  <div className="w-10 h-10 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-black">Loading pod details...</p>
                </div>
              ) : (
                <div className="p-6">
                  
                  {/* ========== POD AVATAR / IMAGE ========== */}
                  <div className="flex items-center gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-black">{selectedPod.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(selectedPod.status)}`}>
                          {selectedPod.status}
                        </span>
                      </div>
                      <p className="text-sm text-black/60 max-w-2xl">
                        {selectedPod.description || "No description provided"}
                      </p>
                    </div>
                  </div>

                  {/* ========== PROGRESS BAR ========== */}
                  <div className="mb-8 p-4 bg-gray-50 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <Target size={18} className="text-purple-700" />
                        <span className="font-medium text-black">Savings Goal Progress</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-black">
                          {formatKES(selectedPod.currentBalance)}
                        </span>
                        <span className="text-sm text-black/60"> / {formatKES(selectedPod.goal?.targetAmount)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-300 h-3 rounded-full">
                      <div
                        className="bg-purple-600 h-3 rounded-full transition-all"
                        style={{ width: `${selectedPod.progress || 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-black/60">
                      <span>{Math.round(selectedPod.progress || 0)}% complete</span>
                      <span>Deadline: {selectedPod.goal?.deadline ? formatDateShort(selectedPod.goal.deadline) : "No deadline"}</span>
                    </div>
                  </div>

                  {/* ========== STATISTICS CARDS ========== */}
                  <div className="grid grid-cols-4 gap-4 mb-8">
                    <StatCard
                      icon={Users}
                      label="Active Members"
                      value={selectedPod.activeMembersCount || selectedPod.statistics?.activeMembers || 0}
                      subvalue={`Total: ${selectedPod.members?.length || 0}`}
                    />
                    <StatCard
                      icon={TrendingUp}
                      label="Total Contributions"
                      value={formatKES(selectedPod.statistics?.totalContributions)}
                      subvalue={`${selectedPod.contributions?.length || 0} transactions`}
                    />
                    <StatCard
                      icon={TrendingDown}
                      label="Total Withdrawals"
                      value={formatKES(selectedPod.statistics?.totalWithdrawals)}
                      subvalue={`${selectedPod.withdrawals?.length || 0} transactions`}
                    />
                    <StatCard
                      icon={Wallet}
                      label="Current Balance"
                      value={formatKES(selectedPod.currentBalance)}
                      trend={selectedPod.progress}
                    />
                  </div>

                  {/* ========== POD DETAILS ========== */}
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <DetailSection title="Pod Information">
                      <DetailRow icon={Tag} label="Category" value={selectedPod.category} />
                      <DetailRow icon={Target} label="Goal Description" value={selectedPod.goal?.description} />
                      <DetailRow icon={Calendar} label="Deadline" value={selectedPod.goal?.deadline ? formatDate(selectedPod.goal.deadline) : null} />
                      <DetailRow icon={DollarSign} label="Contribution Amount" value={formatKES(selectedPod.contributionSettings?.amount)} />
                      <DetailRow icon={Clock} label="Frequency" value={selectedPod.contributionSettings?.frequency} />
                      <DetailRow icon={Settings} label="Auto Deduct" value={selectedPod.contributionSettings?.autoDeduct} />
                    </DetailSection>

                    <DetailSection title="Settings & Privacy">
                      <DetailRow icon={Shield} label="Privacy" value={selectedPod.settings?.privacy} />
                      <DetailRow icon={Users} label="Max Members" value={selectedPod.settings?.maxMembers} />
                      <DetailRow icon={Wallet} label="Allow Withdrawals" value={selectedPod.settings?.allowWithdrawals} />
                      <DetailRow icon={CheckCircle} label="Require Approval" value={selectedPod.settings?.requireApproval} />
                    </DetailSection>
                  </div>

                  {/* ========== MEMBERS SECTION ========== */}
                  <DetailSection title={`Members (${selectedPod.members?.length || 0})`}>
                    <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
                      {selectedPod.members?.map((m) => (
                        <div key={m._id} className="flex items-center justify-between p-3 border rounded-lg">
                          <UserAvatar user={m.user} size="sm" />
                          <div className="flex items-center gap-2">
                            {m.role === "admin" && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                                Admin
                              </span>
                            )}
                            <span className={`text-xs ${m.isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {m.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </DetailSection>

                  {/* ========== TABS ========== */}
                  <div className="border-b mb-4">
                    <div className="flex gap-4">
                      <button
                        onClick={() => setActiveTab("contributions")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                          activeTab === "contributions"
                            ? "border-purple-600 text-purple-700"
                            : "border-transparent text-black/60 hover:text-black"
                        }`}
                      >
                        Contributions ({selectedPod.contributions?.length || 0})
                      </button>
                      <button
                        onClick={() => setActiveTab("withdrawals")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                          activeTab === "withdrawals"
                            ? "border-purple-600 text-purple-700"
                            : "border-transparent text-black/60 hover:text-black"
                        }`}
                      >
                        Withdrawals ({selectedPod.withdrawals?.length || 0})
                      </button>
                    </div>
                  </div>

                  {/* ========== SORT CONTROLS ========== */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-black/60">Sort by:</span>
                      <button
                        onClick={() => handleSort("date")}
                        className={`flex items-center gap-1 px-3 py-1 border rounded-lg text-sm ${
                          sortBy === "date" ? "bg-purple-50 border-purple-200 text-purple-700" : "text-black"
                        }`}
                      >
                        <Calendar size={14} />
                        Date
                        {sortBy === "date" && (
                          sortOrder === "desc" ? <ChevronDown size={14} /> : <ChevronUp size={14} />
                        )}
                      </button>
                      <button
                        onClick={() => handleSort("amount")}
                        className={`flex items-center gap-1 px-3 py-1 border rounded-lg text-sm ${
                          sortBy === "amount" ? "bg-purple-50 border-purple-200 text-purple-700" : "text-black"
                        }`}
                      >
                        <DollarSign size={14} />
                        Amount
                        {sortBy === "amount" && (
                          sortOrder === "desc" ? <ChevronDown size={14} /> : <ChevronUp size={14} />
                        )}
                      </button>
                    </div>
                    <span className="text-xs text-black/40">
                      {activeTab === "contributions" 
                        ? `${getSortedContributions().length} transactions`
                        : `${getSortedWithdrawals().length} transactions`
                      }
                    </span>
                  </div>

                  {/* ========== CONTRIBUTIONS TAB ========== */}
                  {activeTab === "contributions" && (
                    <div className="space-y-3 max-h-96 overflow-y-auto p-1">
                      {getSortedContributions().length === 0 ? (
                        <div className="text-center py-8">
                          <Wallet size={48} className="mx-auto mb-3 text-gray-400" />
                          <p className="text-black font-medium">No contributions yet</p>
                          <p className="text-sm text-black/60">Contributions will appear here</p>
                        </div>
                      ) : (
                        getSortedContributions().map((contribution, index) => (
                          <ContributionCard key={index} contribution={contribution} />
                        ))
                      )}
                    </div>
                  )}

                  {/* ========== WITHDRAWALS TAB ========== */}
                  {activeTab === "withdrawals" && (
                    <div className="space-y-3 max-h-96 overflow-y-auto p-1">
                      {getSortedWithdrawals().length === 0 ? (
                        <div className="text-center py-8">
                          <Wallet size={48} className="mx-auto mb-3 text-gray-400" />
                          <p className="text-black font-medium">No withdrawals yet</p>
                          <p className="text-sm text-black/60">Withdrawals will appear here</p>
                        </div>
                      ) : (
                        getSortedWithdrawals().map((withdrawal, index) => (
                          <WithdrawalCard key={index} withdrawal={withdrawal} />
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}