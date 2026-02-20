import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import AdminLayout from "../../components/layout/AdminLayout";

import {
    fetchReports,
    fetchReportById,
    setReportResolved,
    takeModerationAction,
    deleteReport as deleteReportThunk,
    setModerationFilters,
    clearSelectedReport,
    clearModerationError,
} from "../../store/slices/moderationSlice";

import {
    Search,
    Filter,
    RefreshCw,
    FileText,
    CheckCircle2,
    AlertTriangle,
    X,
    Eye,
    ShieldAlert,
    Trash2,
    Ban,
    UserX,
    PauseCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
} from "lucide-react";

/* ============================================================
   Small UI Helpers (tailwind)
============================================================ */

const Badge = ({ children, tone = "gray" }) => {
    const tones = {
        gray: "bg-gray-100 text-gray-700 border-gray-200",
        purple: "bg-purple-50 text-purple-700 border-purple-100",
        green: "bg-emerald-50 text-emerald-700 border-emerald-100",
        red: "bg-rose-50 text-rose-700 border-rose-100",
        yellow: "bg-amber-50 text-amber-700 border-amber-100",
        blue: "bg-blue-50 text-blue-700 border-blue-100",
    };
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 text-xs border rounded-full ${tones[tone]}`}
        >
            {children}
        </span>
    );
};

const IconButton = ({ children, onClick, title, className = "", disabled }) => (
    <button
        onClick={onClick}
        title={title}
        disabled={disabled}
        className={`
      inline-flex items-center justify-center
      w-9 h-9 rounded-lg border
      bg-white hover:bg-gray-50
      transition
      disabled:opacity-50 disabled:cursor-not-allowed
      ${className}
    `}
    >
        {children}
    </button>
);

const PrimaryButton = ({ children, onClick, disabled, className = "" }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`
      inline-flex items-center gap-2
      px-4 py-2 rounded-lg
      bg-purple-700 text-white
      hover:bg-purple-800
      transition
      disabled:opacity-50 disabled:cursor-not-allowed
      ${className}
    `}
    >
        {children}
    </button>
);

const SecondaryButton = ({ children, onClick, disabled, className = "" }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`
      inline-flex items-center gap-2
      px-4 py-2 rounded-lg
      bg-white text-gray-800 border
      hover:bg-gray-50
      transition
      disabled:opacity-50 disabled:cursor-not-allowed
      ${className}
    `}
    >
        {children}
    </button>
);

const DangerButton = ({ children, onClick, disabled, className = "" }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`
      inline-flex items-center gap-2
      px-4 py-2 rounded-lg
      bg-rose-600 text-white
      hover:bg-rose-700
      transition
      disabled:opacity-50 disabled:cursor-not-allowed
      ${className}
    `}
    >
        {children}
    </button>
);

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

function safeName(user) {
    return user?.profile?.fullName || user?.fullName || user?.name || "Unknown";
}

function avatarUrl(user) {
    const name = safeName(user);
    return (
        user?.profile?.avatar?.url ||
        user?.avatar?.url ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
            name
        )}&background=6A1B9A&color=fff`
    );
}

function renderPostMedia(preview) {
    if (!preview?.media) return null;

    const raw = preview.media;

    // Normalize to array
    const mediaArray = Array.isArray(raw) ? raw : [raw];

    if (!mediaArray.length) return null;

    return (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mediaArray.map((item, idx) => {
                const url =
                    item?.url ||
                    item?.secure_url ||
                    item;

                if (!url) return null;

                const isVideo =
                    item?.type === "video" ||
                    item?.resource_type === "video" ||
                    url.match(/\.(mp4|webm|mov)$/i);

                if (isVideo) {
                    return (
                        <div key={idx} className="rounded-xl overflow-hidden border bg-black">
                            <video
                                src={url}
                                controls
                                className="w-full max-h-[400px] object-contain"
                            />
                        </div>
                    );
                }

                return (
                    <div key={idx} className="rounded-xl overflow-hidden border">
                        <img
                            src={url}
                            alt="Post media"
                            className="w-full max-h-[400px] object-contain bg-gray-100"
                        />
                    </div>
                );
            })}
        </div>
    );
}

/* ============================================================
   Main Page
============================================================ */
export default function Moderation() {
    const dispatch = useDispatch();

    const {
        reports,
        reportsLoading,
        page,
        pages,
        total,
        limit,
        filters,
        selectedReport,
        selectedLoading,
        actionLoading,
        error,
    } = useSelector((s) => s.moderation);

    // Tabs: unresolved vs resolved
    const [tab, setTab] = useState("pending"); // "pending" | "resolved"

    // modal open state
    const [open, setOpen] = useState(false);

    // action UI controls
    const [action, setAction] = useState("none");
    const [days, setDays] = useState(7);
    const [note, setNote] = useState("");

    // local inputs
    const [searchInput, setSearchInput] = useState(filters.search || "");
    const [targetTypeInput, setTargetTypeInput] = useState(filters.targetType || "");
    const [sortInput, setSortInput] = useState(filters.sort || "newest");

    // derive resolved flag from tab
    const resolvedFlag = tab === "resolved" ? "true" : "false";

    /* ============================================================
       FETCH LIST (on mount + when tab/filters/page changes)
    ============================================================= */
    useEffect(() => {
        dispatch(
            fetchReports({
                resolved: resolvedFlag,
                targetType: filters.targetType || undefined,
                search: filters.search || undefined,
                page: filters.page || page || 1,
                limit: filters.limit || limit || 20,
                sort: filters.sort || "newest",
            })
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, tab, filters.targetType, filters.search, filters.sort, filters.page, filters.limit]);

    /* ============================================================
       Clear error on unmount / open modal etc.
    ============================================================= */
    useEffect(() => {
        return () => dispatch(clearModerationError());
    }, [dispatch]);

    /* ============================================================
       Derived counts
    ============================================================= */
    const pendingCount = useMemo(() => {
        // If you're currently viewing pending list, total is pending total.
        // When on resolved tab, this won't be accurate (needs separate fetch).
        // So we keep UI simple: show current tab totals.
        return tab === "pending" ? total : null;
    }, [tab, total]);

    const resolvedCount = useMemo(() => {
        return tab === "resolved" ? total : null;
    }, [tab, total]);

    /* ============================================================
       Actions
    ============================================================= */
    const reload = () => {
        dispatch(
            fetchReports({
                resolved: resolvedFlag,
                targetType: filters.targetType || undefined,
                search: filters.search || undefined,
                page: filters.page || 1,
                limit: filters.limit || 20,
                sort: filters.sort || "newest",
            })
        );
    };

    const applyFilters = () => {
        dispatch(
            setModerationFilters({
                targetType: targetTypeInput,
                search: searchInput,
                sort: sortInput,
                page: 1,
            })
        );
    };

    const clearFilters = () => {
        setSearchInput("");
        setTargetTypeInput("");
        setSortInput("newest");
        dispatch(
            setModerationFilters({
                targetType: "",
                search: "",
                sort: "newest",
                page: 1,
            })
        );
    };

    const openReport = async (reportId) => {
        setOpen(true);
        setAction("none");
        setDays(7);
        setNote("");
        await dispatch(fetchReportById(reportId));
    };

    const closeModal = () => {
        setOpen(false);
        dispatch(clearSelectedReport());
    };

    const onResolveToggle = async () => {
        if (!selectedReport?._id) return;
        const next = !selectedReport.resolved;
        await dispatch(setReportResolved({ reportId: selectedReport._id, resolved: next }));
        // refresh list to keep it clean across tabs
        reload();
    };

    const onTakeAction = async () => {
        if (!selectedReport?._id) return;

        await dispatch(
            takeModerationAction({
                reportId: selectedReport._id,
                action,
                days,
                note,
            })
        );

        // After action, report becomes resolved and should move to resolved tab
        // Keep UX: refresh list, and if we were on pending tab, it will disappear
        reload();

        // refresh selected report details (optional)
        dispatch(fetchReportById(selectedReport._id));
    };

    const onDeleteReport = async () => {
        if (!selectedReport?._id) return;
        const yes = window.confirm("Delete this report record? This cannot be undone.");
        if (!yes) return;

        await dispatch(deleteReportThunk(selectedReport._id));
        reload();
        closeModal();
    };

    const goPage = (p) => {
        const next = Math.min(Math.max(1, p), pages || 1);
        dispatch(setModerationFilters({ page: next }));
    };

    /* ============================================================
       Render helpers
    ============================================================= */
    const statusBadge = (r) => {
        if (r.resolved) return <Badge tone="green">Resolved</Badge>;
        return <Badge tone="yellow">Pending</Badge>;
    };

    const typeBadge = (r) => {
        const t = r.targetType || r.target?.type || "unknown";
        const tone =
            t === "post"
                ? "purple"
                : t === "chat"
                    ? "blue"
                    : t === "hub"
                        ? "purple"
                        : t === "group"
                            ? "blue"
                            : t === "user"
                                ? "red"
                                : "gray";
        return <Badge tone={tone}>{t.toUpperCase()}</Badge>;
    };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50">
                {/* ================= HEADER ================= */}
                <div className="bg-white border-b sticky top-0 z-10">
                    <div className="px-8 py-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                                <FileText className="text-purple-700" size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold text-gray-900">Moderation</h1>
                                <p className="text-sm text-gray-600">
                                    Review reports and take actions against content or users.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-black">
                            <IconButton title="Refresh" onClick={reload} disabled={reportsLoading}>
                                <RefreshCw size={16} />
                            </IconButton>
                        </div>
                    </div>
                </div>

                {/* ================= CONTENT ================= */}
                <div className="px-8 py-6">
                    {/* Tabs */}
                    <div className="flex items-center gap-2 mb-5">
                        <button
                            onClick={() => {
                                setTab("pending");
                                dispatch(setModerationFilters({ page: 1 }));
                            }}
                            className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${tab === "pending"
                                    ? "bg-white border-purple-200 text-purple-800"
                                    : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-white"
                                }`}
                        >
                            <span className="inline-flex items-center gap-2">
                                <AlertTriangle size={16} />
                                Pending
                                {pendingCount != null && (
                                    <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                                        {pendingCount}
                                    </span>
                                )}
                            </span>
                        </button>

                        <button
                            onClick={() => {
                                setTab("resolved");
                                dispatch(setModerationFilters({ page: 1 }));
                            }}
                            className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${tab === "resolved"
                                    ? "bg-white border-emerald-200 text-emerald-800"
                                    : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-white"
                                }`}
                        >
                            <span className="inline-flex items-center gap-2">
                                <CheckCircle2 size={16} />
                                Resolved
                                {resolvedCount != null && (
                                    <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                        {resolvedCount}
                                    </span>
                                )}
                            </span>
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-2xl border shadow-sm p-4 mb-6">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                            <div className="flex items-center gap-2 flex-1">
                                <div className="relative w-full">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        placeholder="Search by reason..."
                                        className="w-full pl-9 pr-3 py-2 rounded-xl border bg-gray-50 focus:bg-white outline-none text-gray-900"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-white">
                                    <Filter size={16} className="text-gray-400" />
                                    <select
                                        value={targetTypeInput}
                                        onChange={(e) => setTargetTypeInput(e.target.value)}
                                        className="text-sm outline-none bg-transparent text-gray-900"
                                    >
                                        <option value="">All types</option>
                                        <option value="post">Post</option>
                                        <option value="chat">Chat</option>
                                        <option value="hub">Hub</option>
                                        <option value="group">Group</option>
                                        <option value="voice">Voice</option>
                                        <option value="user">User</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-white">
                                    <Clock size={16} className="text-gray-400" />
                                    <select
                                        value={sortInput}
                                        onChange={(e) => setSortInput(e.target.value)}
                                        className="text-sm outline-none bg-transparent text-gray-900"
                                    >
                                        <option value="newest">Newest</option>
                                        <option value="oldest">Oldest</option>
                                    </select>
                                </div>

                                <PrimaryButton onClick={applyFilters} disabled={reportsLoading}>
                                    Apply
                                </PrimaryButton>

                                <SecondaryButton onClick={clearFilters} disabled={reportsLoading}>
                                    Clear
                                </SecondaryButton>
                            </div>
                        </div>

                        {error && (
                            <div className="mt-3 text-sm text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-xl">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900">
                                {tab === "pending" ? "Unresolved Reports" : "Resolved Reports"}
                            </p>
                            <p className="text-sm text-gray-600">
                                Showing {reports?.length || 0} of {total || 0}
                            </p>
                        </div>

                        {reportsLoading ? (
                            <div className="p-10 text-center">
                                <div className="w-10 h-10 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-gray-700 text-sm">Loading reports...</p>
                            </div>
                        ) : reports?.length ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-700">
                                        <tr>
                                            <th className="text-left font-medium px-5 py-3">Reporter</th>
                                            <th className="text-left font-medium px-5 py-3">Type</th>
                                            <th className="text-left font-medium px-5 py-3">Reason</th>
                                            <th className="text-left font-medium px-5 py-3">Created</th>
                                            <th className="text-left font-medium px-5 py-3">Status</th>
                                            <th className="text-right font-medium px-5 py-3">Action</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y">
                                        {reports.map((r) => (
                                            <tr key={r._id} className="hover:bg-gray-50">
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={avatarUrl(r.reporter)}
                                                            alt="avatar"
                                                            className="w-9 h-9 rounded-full border object-cover"
                                                        />
                                                        <div>
                                                            <p className="font-medium text-gray-900">
                                                                {safeName(r.reporter)}
                                                            </p>
                                                            <p className="text-sm text-gray-600">
                                                                {r.reporter?.email || r.reporter?.phone || ""}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {typeBadge(r)}
                                                        {r.target?.exists === false && (
                                                            <Badge tone="red">Target missing</Badge>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <p className="text-gray-900 line-clamp-2 max-w-[520px]">
                                                        {r.reason}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4 text-gray-700">
                                                    {formatDate(r.createdAt)}
                                                </td>

                                                <td className="px-5 py-4">{statusBadge(r)}</td>

                                                <td className="px-5 py-4 text-black">
                                                    <div className="flex items-center justify-end gap-2 te">
                                                        <IconButton
                                                            title="View"
                                                            onClick={() => openReport(r._id)}
                                                        >
                                                            <Eye size={16} />
                                                        </IconButton>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-10 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                                    <FileText className="text-gray-400" size={22} />
                                </div>
                                <p className="text-gray-900 font-medium">
                                    No {tab === "pending" ? "pending" : "resolved"} reports
                                </p>
                                <p className="text-gray-600 text-sm mt-1">
                                    Reports will appear here once users submit them.
                                </p>
                            </div>
                        )}

                        {/* Pagination */}
                        <div className="px-5 py-4 border-t flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                                Page {page || 1} of {pages || 1}
                            </p>

                            <div className="flex items-center gap-2">
                                <SecondaryButton
                                    onClick={() => goPage((page || 1) - 1)}
                                    disabled={(page || 1) <= 1 || reportsLoading}
                                >
                                    <ChevronLeft size={16} />
                                    Prev
                                </SecondaryButton>

                                <SecondaryButton
                                    onClick={() => goPage((page || 1) + 1)}
                                    disabled={(page || 1) >= (pages || 1) || reportsLoading}
                                >
                                    Next
                                    <ChevronRight size={16} />
                                </SecondaryButton>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ================= DETAILS MODAL ================= */}
                {open && (
                    <div className="fixed inset-0 z-50">
                        <div
                            className="absolute inset-0 bg-black/40"
                            onClick={closeModal}
                        />
                        <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col">
                            {/* Modal header */}
                            <div className="px-6 py-4 border-b flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Report</p>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {selectedReport?._id || "Loading..."}
                                    </h3>
                                </div>

                                <button
                                    onClick={closeModal}
                                    className="w-10 h-10 rounded-xl border bg-white hover:bg-gray-50 flex items-center justify-center text-black"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal body */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {selectedLoading || !selectedReport ? (
                                    <div className="py-16 text-center">
                                        <div className="w-10 h-10 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
                                        <p className="text-gray-700 text-sm">Loading report...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Status */}
                                        <div className="flex items-center gap-2 mb-5">
                                            {selectedReport.resolved ? (
                                                <Badge tone="green">Resolved</Badge>
                                            ) : (
                                                <Badge tone="yellow">Pending</Badge>
                                            )}
                                            <Badge tone="gray">
                                                {(selectedReport.targetType || "").toUpperCase()}
                                            </Badge>
                                            {selectedReport.target?.exists === false && (
                                                <Badge tone="red">Target missing</Badge>
                                            )}
                                        </div>

                                        {/* Reporter */}
                                        <div className="bg-gray-50 border rounded-2xl p-4 mb-4">
                                            <p className="text-sm text-gray-600 mb-2">Reporter</p>
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={avatarUrl(selectedReport.reporter)}
                                                    alt="avatar"
                                                    className="w-10 h-10 rounded-full border object-cover"
                                                />
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {safeName(selectedReport.reporter)}
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        {selectedReport.reporter?.email ||
                                                            selectedReport.reporter?.phone ||
                                                            ""}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Target Preview */}
                                        <div className="bg-white border rounded-2xl p-4 mb-4">
                                            <p className="text-sm text-gray-600 mb-3">
                                                Reported Target
                                            </p>

                                            {selectedReport.target?.exists === false ? (
                                                <div className="text-sm text-rose-600">
                                                    Target content no longer exists.
                                                </div>
                                            ) : (
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-medium text-gray-900">
                                                            {selectedReport.target?.label || "Target"}
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            ID: {selectedReport.target?.id}
                                                        </p>
                                                    </div>

                                                    {/* Render type-specific preview */}
                                                    {selectedReport.targetType === "post" && (
                                                        <div className="text-gray-900">
                                                            {/* TEXT */}
                                                            <p className="text-sm text-gray-600 mb-1">Text</p>
                                                            <p className="bg-gray-50 border rounded-xl p-3 whitespace-pre-wrap text-gray-900">
                                                                {selectedReport.target?.preview?.text || "(no text)"}
                                                            </p>

                                                            {/* MEDIA */}
                                                            {renderPostMedia(selectedReport.target?.preview)}
                                                        </div>
                                                    )}

                                                    {/* Hub/Group/Voice preview - REMOVED "chat" from this condition */}
                                                    {["hub", "group", "voice"].includes(
                                                        selectedReport.targetType
                                                    ) && (
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="bg-gray-50 border rounded-xl p-3">
                                                                    <p className="text-sm text-gray-600">Title / Name</p>
                                                                    <p className="font-medium text-gray-900 mt-1">
                                                                        {selectedReport.target?.preview?.title ||
                                                                            selectedReport.target?.preview?.name ||
                                                                            "(none)"}
                                                                    </p>
                                                                </div>
                                                                <div className="bg-gray-50 border rounded-xl p-3">
                                                                    <p className="text-sm text-gray-600">Created</p>
                                                                    <p className="font-medium text-gray-900 mt-1">
                                                                        {formatDate(selectedReport.target?.preview?.createdAt)}
                                                                    </p>
                                                                </div>
                                                                {selectedReport.target?.preview?.description && (
                                                                    <div className="col-span-2 bg-gray-50 border rounded-xl p-3">
                                                                        <p className="text-sm text-gray-600">Description</p>
                                                                        <p className="text-gray-900 mt-1 whitespace-pre-wrap">
                                                                            {selectedReport.target.preview.description}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                    {/* CHAT PREVIEW - New dedicated section for chat reports */}
                                                    {selectedReport.targetType === "chat" && (
                                                        <div className="bg-gray-50 border rounded-2xl p-4">
                                                            <p className="text-sm text-gray-600 mb-3">
                                                                Reported User
                                                            </p>

                                                            {selectedReport.target?.preview?.reportedUser ? (
                                                                <div className="flex items-center gap-4">
                                                                    <img
                                                                        src={
                                                                            selectedReport.target.preview.reportedUser.avatar ||
                                                                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                                                selectedReport.target.preview.reportedUser.fullName || "User"
                                                                            )}&background=6A1B9A&color=fff`
                                                                        }
                                                                        alt="avatar"
                                                                        className="w-14 h-14 rounded-full border object-cover"
                                                                    />

                                                                    <div>
                                                                        <p className="font-semibold text-gray-900">
                                                                            {selectedReport.target.preview.reportedUser.fullName}
                                                                        </p>

                                                                        <p className="text-sm text-gray-600">
                                                                            {selectedReport.target.preview.reportedUser.email ||
                                                                                selectedReport.target.preview.reportedUser.phone ||
                                                                                ""}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-gray-600">
                                                                    Could not determine reported user.
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* User preview */}
                                                    {selectedReport.targetType === "user" && (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="bg-gray-50 border rounded-xl p-3">
                                                                <p className="text-sm text-gray-600">Name</p>
                                                                <p className="font-medium text-gray-900 mt-1">
                                                                    {selectedReport.target?.preview?.fullName || "(none)"}
                                                                </p>
                                                            </div>
                                                            <div className="bg-gray-50 border rounded-xl p-3">
                                                                <p className="text-sm text-gray-600">Email</p>
                                                                <p className="font-medium text-gray-900 mt-1">
                                                                    {selectedReport.target?.preview?.email || "(none)"}
                                                                </p>
                                                            </div>
                                                            <div className="bg-gray-50 border rounded-xl p-3">
                                                                <p className="text-sm text-gray-600">Phone</p>
                                                                <p className="font-medium text-gray-900 mt-1">
                                                                    {selectedReport.target?.preview?.phone || "(none)"}
                                                                </p>
                                                            </div>
                                                            <div className="bg-gray-50 border rounded-xl p-3">
                                                                <p className="text-sm text-gray-600">Suspended until</p>
                                                                <p className="font-medium text-gray-900 mt-1">
                                                                    {selectedReport.target?.preview?.suspendedUntil
                                                                        ? formatDate(selectedReport.target.preview.suspendedUntil)
                                                                        : "Not suspended"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Reason */}
                                        <div className="bg-white border rounded-2xl p-4 mb-4">
                                            <p className="text-sm text-gray-600 mb-2">Reason</p>
                                            <p className="text-gray-900 whitespace-pre-wrap">
                                                {selectedReport.reason}
                                            </p>

                                            <div className="mt-3 text-sm text-gray-600 flex items-center justify-between">
                                                <span>Created: {formatDate(selectedReport.createdAt)}</span>
                                                {selectedReport.resolvedAt && (
                                                    <span>Resolved: {formatDate(selectedReport.resolvedAt)}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Resolve / Reopen */}
                                        <div className="bg-gray-50 border rounded-2xl p-4 mb-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {selectedReport.resolved ? "Resolved report" : "Pending report"}
                                                    </p>
                                                    <p className="text-sm text-gray-600 mt-0.5">
                                                        {selectedReport.resolved
                                                            ? "You can reopen this report if needed."
                                                            : "Resolve when you have reviewed and taken necessary action."}
                                                    </p>
                                                </div>

                                                <SecondaryButton
                                                    onClick={onResolveToggle}
                                                    disabled={actionLoading}
                                                >
                                                    {selectedReport.resolved ? (
                                                        <>
                                                            <X size={16} />
                                                            Reopen
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle2 size={16} />
                                                            Resolve
                                                        </>
                                                    )}
                                                </SecondaryButton>
                                            </div>
                                        </div>

                                        {/* Enforcement Actions */}
                                        <div className="bg-white border rounded-2xl p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <ShieldAlert size={18} className="text-purple-700" />
                                                <p className="font-semibold text-gray-900">
                                                    Enforcement actions
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="md:col-span-2">
                                                    <label className="text-sm text-gray-600">Action</label>
                                                    <select
                                                        value={action}
                                                        onChange={(e) => setAction(e.target.value)}
                                                        className="mt-1 w-full px-3 py-2 rounded-xl border bg-gray-50 focus:bg-white outline-none text-gray-900"
                                                    >
                                                        <option value="none">No enforcement</option>
                                                        <option value="delete_target">Delete target</option>
                                                        <option value="disable_target">Disable target</option>
                                                        <option value="suspend_user">Suspend user</option>
                                                        <option value="ban_user">Ban user</option>
                                                    </select>
                                                </div>

                                                {action === "suspend_user" && (
                                                    <div>
                                                        <label className="text-sm text-gray-600">Suspend (days)</label>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={365}
                                                            value={days}
                                                            onChange={(e) => setDays(Number(e.target.value))}
                                                            className="mt-1 w-full px-3 py-2 rounded-xl border bg-gray-50 focus:bg-white outline-none text-gray-900"
                                                        />
                                                    </div>
                                                )}

                                                <div className={action === "suspend_user" ? "" : "md:col-span-2"}>
                                                    <label className="text-sm text-gray-600">Admin note (optional)</label>
                                                    <textarea
                                                        rows={3}
                                                        value={note}
                                                        onChange={(e) => setNote(e.target.value)}
                                                        placeholder="Internal note for your team..."
                                                        className="mt-1 w-full px-3 py-2 rounded-xl border bg-gray-50 focus:bg-white outline-none text-gray-900"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-4">
                                                <DangerButton
                                                    onClick={onDeleteReport}
                                                    disabled={actionLoading}
                                                    className="bg-white text-rose-600 border border-rose-200 hover:bg-rose-50"
                                                >
                                                    <Trash2 size={16} />
                                                    Delete report record
                                                </DangerButton>

                                                <PrimaryButton onClick={onTakeAction} disabled={actionLoading}>
                                                    {actionLoading ? (
                                                        <>
                                                            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                            Applying...
                                                        </>
                                                    ) : (
                                                        <>
                                                            {action === "delete_target" ? <Trash2 size={16} /> : null}
                                                            {action === "disable_target" ? <PauseCircle size={16} /> : null}
                                                            {action === "suspend_user" ? <UserX size={16} /> : null}
                                                            {action === "ban_user" ? <Ban size={16} /> : null}
                                                            Apply action
                                                        </>
                                                    )}
                                                </PrimaryButton>
                                            </div>

                                            <p className="text-sm text-gray-600 mt-3">
                                                Applying an action will automatically mark this report as <b>resolved</b>.
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}