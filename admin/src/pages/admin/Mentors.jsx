import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAdminMentors,
  fetchAdminMentorById,
  approveMentor,
  rejectMentor,
  rateMentor,
  deleteMentor,
  toggleMentorStatus,
  setMentorFilters,
  clearSelectedMentor,
} from "../../store/slices/mentorsSlice";

import AdminLayout from "../../components/layout/AdminLayout";

import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Star,
  Trash2,
  Power,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  User,
  Briefcase,
  Award,
  BookOpen,
  Globe,
  DollarSign,
  Users,
  Calendar,
  Clock,
  FileText,
  Link,
  Image,
  Heart,
  MessageCircle,
  Shield,
  AlertCircle,
  Check,
  X,
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Edit,
  Copy,
  Download,
  Upload,
  Printer,
  Mail,
  Phone,
  MapPin,
  Tag,
  Layers,
  Grid,
  List,
  Settings,
  HelpCircle,
  Info,
  AlertTriangle,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  Star as StarIcon,
  User as UserIcon,
  Briefcase as BriefcaseIcon,
  Award as AwardIcon,
  BookOpen as BookOpenIcon,
  Globe as GlobeIcon,
  DollarSign as DollarSignIcon,
  Users as UsersIcon,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  FileText as FileTextIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  Shield as ShieldIcon,
  AlertCircle as AlertCircleIcon,
} from "lucide-react";

/* ============================================================
   HELPERS
============================================================ */

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

function formatRating(r) {
  if (!r && r !== 0) return "Not Rated";
  return `${r.toFixed(1)} ⭐ (${r} / 5)`;
}

function formatNumber(n) {
  if (!n && n !== 0) return "0";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function getStatusColor(status) {
  const colors = {
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    rejected: "bg-rose-100 text-rose-800 border-rose-200",
  };
  return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
}

function getActiveColor(active) {
  return active 
    ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
    : "bg-gray-100 text-gray-800 border-gray-200";
}

function getVerifiedColor(verified) {
  return verified 
    ? "bg-purple-100 text-purple-800 border-purple-200" 
    : "bg-gray-100 text-gray-800 border-gray-200";
}

/* ============================================================
   COMPONENTS
============================================================ */

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
    <span className={`px-2 py-1 rounded-full text-xs ${color}`}>
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

function Avatar({ src, name, size = "md" }) {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
    "2xl": "w-20 h-20",
  };

  const initials = name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <div className={`${sizes[size]} rounded-full overflow-hidden bg-purple-100 flex items-center justify-center border-2 border-white shadow-sm`}>
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-purple-700 font-semibold text-sm">{initials}</span>
      )}
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function Mentors() {
  const dispatch = useDispatch();

  const {
    mentors,
    mentorsLoading,
    selectedMentor,
    selectedLoading,
    pagination,
    filters,
  } = useSelector((s) => s.mentors);

  const [detailOpen, setDetailOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [newRating, setNewRating] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState("profile"); // profile | stories | availability

  /* ============================================================
     FETCH
  ============================================================ */
  useEffect(() => {
    dispatch(fetchAdminMentors());
  }, [dispatch, filters]);

  /* ============================================================
     HANDLERS
  ============================================================ */

  const openDetail = async (id) => {
    await dispatch(fetchAdminMentorById(id));
    setDetailOpen(true);
    setActiveTab("profile");
    setRejectReason("");
    setNewRating("");
  };

  const closeDetail = () => {
    dispatch(clearSelectedMentor());
    setDetailOpen(false);
    setRejectReason("");
    setNewRating("");
  };

  const handleSearch = (e) => {
    dispatch(setMentorFilters({ search: e.target.value, page: 1 }));
  };

  const handleStatusFilter = (status) => {
    dispatch(setMentorFilters({ verificationStatus: status, page: 1 }));
  };

  const handleVerifiedFilter = (verified) => {
    dispatch(setMentorFilters({ verified: verified === "all" ? undefined : verified === "true", page: 1 }));
  };

  const handlePageChange = (page) => {
    dispatch(setMentorFilters({ page }));
  };

  const handleApprove = async () => {
    try {
      await dispatch(approveMentor(selectedMentor._id)).unwrap();
      dispatch(fetchAdminMentorById(selectedMentor._id));
    } catch (error) {
      console.error("Approve failed:", error);
      alert("Failed to approve mentor: " + error.message);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    try {
      await dispatch(rejectMentor({ id: selectedMentor._id, reason: rejectReason })).unwrap();
      dispatch(fetchAdminMentorById(selectedMentor._id));
      setRejectReason("");
    } catch (error) {
      console.error("Reject failed:", error);
      alert("Failed to reject mentor: " + error.message);
    }
  };

  const handleRate = async () => {
    const rating = parseFloat(newRating);
    if (isNaN(rating) || rating < 0 || rating > 5) {
      alert("Please enter a valid rating between 0 and 5");
      return;
    }

    try {
      await dispatch(rateMentor({ id: selectedMentor._id, rating })).unwrap();
      dispatch(fetchAdminMentorById(selectedMentor._id));
      setNewRating("");
    } catch (error) {
      console.error("Rate failed:", error);
      alert("Failed to rate mentor: " + error.message);
    }
  };

  const handleToggleStatus = async () => {
    try {
      await dispatch(toggleMentorStatus(selectedMentor._id)).unwrap();
      dispatch(fetchAdminMentorById(selectedMentor._id));
    } catch (error) {
      console.error("Toggle failed:", error);
      alert("Failed to toggle mentor status: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this mentor? This action cannot be undone.")) {
      return;
    }

    try {
      await dispatch(deleteMentor(selectedMentor._id)).unwrap();
      closeDetail();
      dispatch(fetchAdminMentors());
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete mentor: " + error.message);
    }
  };

  const handleRefresh = () => {
    dispatch(fetchAdminMentors());
  };

  const clearFilters = () => {
    dispatch(setMentorFilters({ search: "", verificationStatus: "", verified: undefined, page: 1 }));
  };

  /* ============================================================
     Get counts for each status
  ============================================================ */
  const getStatusCount = (status) => {
    if (!mentors) return 0;
    if (status === "all") return mentors.length;
    return mentors.filter(m => m.verificationStatus === status).length;
  };

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <AdminLayout title="Mentorship Management">
      <div className="p-6 bg-gray-50 min-h-screen">

        {/* ================= HEADER ================= */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Award className="w-6 h-6 text-purple-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-black">Mentors</h1>
              <p className="text-sm text-black/60">Manage and verify mentor applications</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
              <input
                type="text"
                placeholder="Search mentors..."
                value={filters.search || ""}
                onChange={handleSearch}
                className="pl-9 pr-4 py-2 border rounded-lg bg-white text-black focus:ring-2 focus:ring-purple-500 focus:border-transparent w-64"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 border rounded-lg bg-white hover:bg-gray-50"
              title="Toggle filters"
            >
              <Filter size={20} className="text-black" />
            </button>
            <button
              onClick={handleRefresh}
              className="p-2 border rounded-lg bg-white hover:bg-gray-50"
              title="Refresh"
            >
              <RefreshCw size={20} className="text-black" />
            </button>
          </div>
        </div>

        {/* ================= STATUS TOGGLE ================= */}
        <div className="flex gap-2 mb-6">
          {[
            { value: "all", label: "All" },
            { value: "approved", label: "Approved" },
            { value: "pending", label: "Pending" },
            { value: "rejected", label: "Rejected" }
          ].map((status) => {
            const count = getStatusCount(status.value);
            const isActive = (filters.verificationStatus || "all") === status.value;
            
            return (
              <button
                key={status.value}
                onClick={() =>
                  dispatch(
                    setMentorFilters({
                      verificationStatus: status.value === "all" ? "" : status.value,
                      page: 1,
                    })
                  )
                }
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition flex items-center gap-2 ${
                  isActive
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white text-black border-gray-200 hover:bg-gray-50"
                }`}
              >
                {status.label}
                {count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    isActive 
                      ? "bg-white/20 text-white" 
                      : "bg-gray-100 text-black/60"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ================= FILTERS ================= */}
        {showFilters && (
          <div className="mb-6 p-4 bg-white rounded-xl border">
            <div className="flex gap-4 flex-wrap items-center">
              <div>
                <label className="block text-xs text-black/60 mb-1">Verified</label>
                <select
                  value={filters.verified === undefined ? "all" : filters.verified ? "true" : "false"}
                  onChange={(e) => handleVerifiedFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg bg-white text-black"
                >
                  <option value="all">All</option>
                  <option value="true">Verified</option>
                  <option value="false">Not Verified</option>
                </select>
              </div>

              <button
                onClick={clearFilters}
                className="px-4 py-2 border rounded-lg bg-gray-50 text-black hover:bg-gray-100 self-end"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* ================= TABLE ================= */}
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-4 text-black font-semibold">Mentor</th>
                <th className="p-4 text-black font-semibold">Specialty</th>
                <th className="p-4 text-black font-semibold">Rating</th>
                <th className="p-4 text-black font-semibold">Sessions</th>
                <th className="p-4 text-black font-semibold">Status</th>
                <th className="p-4 text-black font-semibold">Verified</th>
                <th className="p-4 text-black font-semibold">Active</th>
                <th className="p-4 text-black font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mentorsLoading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
                    </div>
                    <p className="text-black mt-2">Loading mentors...</p>
                  </td>
                </tr>
              ) : mentors.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center">
                    <Award size={48} className="mx-auto mb-3 text-gray-400" />
                    <p className="text-black font-medium">No mentors found</p>
                    <p className="text-sm text-black/60 mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                mentors.map((mentor) => (
                  <tr key={mentor._id} className="border-t hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={mentor.avatar} name={mentor.name} size="sm" />
                        <div>
                          <p className="font-medium text-black">{mentor.name}</p>
                          <p className="text-xs text-black/60">{mentor.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-black">{mentor.specialty}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Star size={14} className="text-yellow-500" />
                        <span className="text-black">{mentor.rating?.toFixed(1) || "0.0"}</span>
                      </div>
                    </td>
                    <td className="p-4 text-black">{formatNumber(mentor.sessions)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(mentor.verificationStatus)}`}>
                        {mentor.verificationStatus}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${getVerifiedColor(mentor.verified)}`}>
                        {mentor.verified ? "Verified" : "Not Verified"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${getActiveColor(mentor.isActive)}`}>
                        {mentor.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => openDetail(mentor._id)}
                        className="text-purple-600 hover:text-purple-800 flex items-center gap-1"
                      >
                        <Eye size={16} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* ================= PAGINATION ================= */}
          {pagination && pagination.pages > 1 && (
            <div className="flex justify-between items-center p-4 border-t">
              <span className="text-sm text-black/60">
                Page {pagination.page} of {pagination.pages} • {pagination.total} total mentors
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

        {/* ============================================================
           DETAIL MODAL
        ============================================================ */}
        {detailOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-start justify-center p-6 overflow-y-auto z-50">
            <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl relative my-8">

              {/* ========== MODAL HEADER ========== */}
              <div className="sticky top-0 bg-white rounded-t-xl border-b px-6 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Award className="w-5 h-5 text-purple-700" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-black">
                      {selectedMentor?.name}
                    </h2>
                    <p className="text-sm text-black/60">
                      {selectedMentor?.title} • Joined {formatDateShort(selectedMentor?.createdAt)}
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

              {selectedLoading || !selectedMentor ? (
                <div className="p-12 text-center">
                  <div className="w-10 h-10 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-black">Loading mentor details...</p>
                </div>
              ) : (
                <div className="p-6">
                  
                  {/* ========== PROFILE HEADER ========== */}
                  <div className="flex gap-6 mb-8">
                    <Avatar src={selectedMentor.avatar} name={selectedMentor.name} size="2xl" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-black">{selectedMentor.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(selectedMentor.verificationStatus)}`}>
                          {selectedMentor.verificationStatus}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getVerifiedColor(selectedMentor.verified)}`}>
                          {selectedMentor.verified ? "Verified" : "Not Verified"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getActiveColor(selectedMentor.isActive)}`}>
                          {selectedMentor.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-black/80 mb-2">{selectedMentor.title}</p>
                      <p className="text-sm text-black/60 max-w-2xl">{selectedMentor.bio}</p>
                    </div>
                  </div>

                  {/* ========== STATS CARDS ========== */}
                  <div className="grid grid-cols-4 gap-4 mb-8">
                    <StatCard
                      icon={Star}
                      label="Rating"
                      value={selectedMentor.rating?.toFixed(1) || "0.0"}
                      subvalue={`${selectedMentor.totalReviews || 0} reviews`}
                    />
                    <StatCard
                      icon={Users}
                      label="Mentees"
                      value={formatNumber(selectedMentor.mentees)}
                      subvalue="Total mentees"
                    />
                    <StatCard
                      icon={Calendar}
                      label="Sessions"
                      value={formatNumber(selectedMentor.sessions)}
                      subvalue="Completed sessions"
                    />
                    <StatCard
                      icon={DollarSign}
                      label="Price"
                      value={selectedMentor.pricePerSession === 0 ? "Free" : `KES ${selectedMentor.pricePerSession}`}
                      subvalue="Per session"
                    />
                  </div>

                  {/* ========== TABS ========== */}
                  <div className="border-b mb-4">
                    <div className="flex gap-4">
                      <button
                        onClick={() => setActiveTab("profile")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                          activeTab === "profile"
                            ? "border-purple-600 text-purple-700"
                            : "border-transparent text-black/60 hover:text-black"
                        }`}
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => setActiveTab("stories")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                          activeTab === "stories"
                            ? "border-purple-600 text-purple-700"
                            : "border-transparent text-black/60 hover:text-black"
                        }`}
                      >
                        Stories ({selectedMentor.stories?.length || 0})
                      </button>
                      <button
                        onClick={() => setActiveTab("availability")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                          activeTab === "availability"
                            ? "border-purple-600 text-purple-700"
                            : "border-transparent text-black/60 hover:text-black"
                        }`}
                      >
                        Availability
                      </button>
                    </div>
                  </div>

                  {/* ========== PROFILE TAB ========== */}
                  {activeTab === "profile" && (
                    <>
                      <div className="grid grid-cols-2 gap-6 mb-8">
                        <DetailSection title="Personal Information">
                          <DetailRow icon={User} label="Name" value={selectedMentor.name} />
                          <DetailRow icon={Briefcase} label="Title" value={selectedMentor.title} />
                          <DetailRow icon={Award} label="Experience" value={selectedMentor.experience} />
                          <DetailRow icon={Tag} label="Specialty" value={selectedMentor.specialty} />
                          <DetailArray icon={Globe} label="Languages" items={selectedMentor.languages} />
                          <DetailArray icon={BookOpen} label="Skills" items={selectedMentor.skills} />
                        </DetailSection>

                        <DetailSection title="Verification Details">
                          <DetailRow icon={Shield} label="Verification Status" value={
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedMentor.verificationStatus)}`}>
                              {selectedMentor.verificationStatus}
                            </span>
                          } />
                          <DetailRow icon={CheckCircle} label="Verified" value={selectedMentor.verified} />
                          <DetailRow icon={Power} label="Active" value={selectedMentor.isActive} />
                          <DetailRow icon={AlertCircle} label="Suspended" value={selectedMentor.isSuspended} />
                          {selectedMentor.rejectionReason && (
                            <DetailRow icon={XCircle} label="Rejection Reason" value={selectedMentor.rejectionReason} />
                          )}
                        </DetailSection>
                      </div>

                      {/* Verification Documents */}
                      {selectedMentor.verificationDocs?.length > 0 && (
                        <DetailSection title="Verification Documents">
                          <div className="grid grid-cols-2 gap-3">
                            {selectedMentor.verificationDocs.map((doc, index) => (
                              <a
                                key={index}
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                              >
                                <div className="p-2 bg-purple-50 rounded-lg">
                                  <FileText size={16} className="text-purple-700" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-black">{doc.label}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-black/40 capitalize">{doc.provider}</span>
                                    <span className="text-xs text-black/40">•</span>
                                    <span className="text-xs text-black/40">{formatDateShort(doc.uploadedAt)}</span>
                                  </div>
                                </div>
                                <Link size={14} className="text-purple-600" />
                              </a>
                            ))}
                          </div>
                        </DetailSection>
                      )}
                    </>
                  )}

                  {/* ========== STORIES TAB ========== */}
                  {activeTab === "stories" && (
                    <div className="space-y-4 max-h-96 overflow-y-auto p-1">
                      {selectedMentor.stories?.length === 0 ? (
                        <div className="text-center py-8">
                          <BookOpen size={48} className="mx-auto mb-3 text-gray-400" />
                          <p className="text-black font-medium">No stories yet</p>
                          <p className="text-sm text-black/60">Mentor hasn't posted any stories</p>
                        </div>
                      ) : (
                        selectedMentor.stories?.map((story) => (
                          <div key={story._id} className="border rounded-lg overflow-hidden hover:shadow-md transition">
                            {story.image && (
                              <img src={story.image} alt={story.title} className="w-full h-48 object-cover" />
                            )}
                            <div className="p-4">
                              <h4 className="font-semibold text-black mb-2">{story.title}</h4>
                              <p className="text-sm text-black/70 mb-3">{story.content}</p>
                              <div className="flex items-center gap-4 text-xs text-black/40">
                                <div className="flex items-center gap-1">
                                  <Eye size={14} />
                                  {formatNumber(story.views)} views
                                </div>
                                <div className="flex items-center gap-1">
                                  <Heart size={14} />
                                  {story.likes?.length || 0} likes
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar size={14} />
                                  {formatDateShort(story.createdAt)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* ========== AVAILABILITY TAB ========== */}
                  {activeTab === "availability" && (
                    <div className="space-y-3 max-h-96 overflow-y-auto p-1">
                      {selectedMentor.availability?.length === 0 ? (
                        <div className="text-center py-8">
                          <Clock size={48} className="mx-auto mb-3 text-gray-400" />
                          <p className="text-black font-medium">No availability set</p>
                          <p className="text-sm text-black/60">Mentor hasn't configured availability</p>
                        </div>
                      ) : (
                        selectedMentor.availability?.map((slot, index) => (
                          <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-purple-50 rounded-lg">
                                <Calendar size={16} className="text-purple-700" />
                              </div>
                              <div>
                                <p className="font-medium text-black">{slot.day}</p>
                                <p className="text-xs text-black/60">{slot.from} - {slot.to}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* ========== ADMIN ACTIONS ========== */}
                  <div className="mt-8 p-4 bg-gray-50 rounded-xl">
                    <h3 className="text-sm font-semibold text-black mb-3">Admin Actions</h3>
                    <div className="grid grid-cols-2 gap-3">

                      {/* Approve Button */}
                      {selectedMentor.verificationStatus === "pending" && (
                        <button
                          onClick={handleApprove}
                          className="bg-emerald-600 text-white p-3 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition"
                        >
                          <CheckCircle size={16} />
                          Approve Mentor
                        </button>
                      )}

                      {/* Reject Section */}
                      {selectedMentor.verificationStatus === "pending" && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Rejection reason"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="flex-1 px-3 py-2 border rounded-lg bg-white text-black"
                          />
                          <button
                            onClick={handleReject}
                            className="bg-rose-600 text-white p-3 rounded-lg hover:bg-rose-700 transition"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      )}

                      {/* Rate Section */}
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="0.1"
                          placeholder="Rating (0-5)"
                          value={newRating}
                          onChange={(e) => setNewRating(e.target.value)}
                          className="flex-1 px-3 py-2 border rounded-lg bg-white text-black"
                        />
                        <button
                          onClick={handleRate}
                          className="bg-yellow-500 text-white p-3 rounded-lg flex items-center gap-1 hover:bg-yellow-600 transition"
                        >
                          <Star size={16} />
                          Rate
                        </button>
                      </div>

                      {/* Toggle Active */}
                      <button
                        onClick={handleToggleStatus}
                        className="bg-gray-700 text-white p-3 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition"
                      >
                        <Power size={16} />
                        {selectedMentor.isActive ? "Deactivate" : "Activate"}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={handleDelete}
                        className="bg-black text-white p-3 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-900 transition"
                      >
                        <Trash2 size={16} />
                        Delete Mentor
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}