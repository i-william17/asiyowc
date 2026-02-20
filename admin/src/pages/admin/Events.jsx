import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    fetchAdminEvents,
    fetchAdminEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    setEventFilters,
    clearSelectedEvent,
} from "../../store/slices/eventsSlice";

import AdminLayout from "../../components/layout/AdminLayout";

import {
    Search,
    Eye,
    Trash2,
    Calendar,
    MapPin,
    Clock,
    Plus,
    ChevronLeft,
    ChevronRight,
    X,
    RefreshCw,
    Loader2,
    AlertCircle,
    Edit,
    Save,
    Image as ImageIcon,
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

function formatDateForInput(dt) {
    if (!dt) return "";
    try {
        const date = new Date(dt);
        return date.toISOString().slice(0, 16);
    } catch {
        return "";
    }
}

function formatLocation(location) {
    if (!location) return "—";
    const parts = [location.address, location.city, location.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "—";
}

function getStatusColor(status) {
    const colors = {
        upcoming: "bg-blue-100 text-blue-800 border-blue-200",
        postponed: "bg-yellow-100 text-yellow-800 border-yellow-200",
        cancelled: "bg-rose-100 text-rose-800 border-rose-200",
        completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
        published: "bg-green-100 text-green-800 border-green-200",
        draft: "bg-gray-100 text-gray-800 border-gray-200",
    };

    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
}

function getEventTypeColor(type) {
    const colors = {
        virtual: "bg-purple-100 text-purple-800",
        "in-person": "bg-orange-100 text-orange-800",
        hybrid: "bg-indigo-100 text-indigo-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function Events() {
    const dispatch = useDispatch();
    const { user } = useSelector((s) => s.auth);

    const {
        events,
        eventsLoading,
        selectedEvent,
        selectedLoading,
        pagination,
        filters,
        error,
    } = useSelector((s) => s.events);

    const [detailOpen, setDetailOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedEvent, setEditedEvent] = useState(null);
    const [createFormData, setCreateFormData] = useState({
        title: "",
        description: "",
        category: "conference",
        type: "virtual",
        location: {
            address: "",
            city: "",
            country: "Kenya",
            onlineLink: "",
            platform: "google-meet",
        },
        dateTime: {
            start: "",
            end: "",
            timezone: "Africa/Nairobi",
        },
        capacity: 0,
        price: {
            amount: 0,
            currency: "KES",
            isFree: true,
        },
        image: {
            url: "",
        },
        status: "draft",
        visibility: "community",
        registration: {
            requiresApproval: false,
            deadline: "",
            maxAttendees: 0,
        },
        tags: [],
        requirements: [],
        agenda: [],
        speakers: [],
    });

    /* ============================================================
       FETCH
    ============================================================ */
    useEffect(() => {
        dispatch(fetchAdminEvents());
    }, [dispatch, filters]);

    /* ============================================================
       HANDLERS
    ============================================================ */

    const handleSearch = (e) => {
        dispatch(setEventFilters({ search: e.target.value, page: 1 }));
    };

    const handleStatusFilter = (status) => {
        dispatch(setEventFilters({ status, page: 1 }));
    };

    const handlePageChange = (page) => {
        dispatch(setEventFilters({ page }));
    };

    const openDetail = async (id) => {
        await dispatch(fetchAdminEventById(id));
        setDetailOpen(true);
        setIsEditing(false);
    };

    const closeDetail = () => {
        dispatch(clearSelectedEvent());
        setDetailOpen(false);
        setIsEditing(false);
        setEditedEvent(null);
    };

    const handleEdit = () => {
        // Deep clone to avoid Redux mutation
        setEditedEvent(JSON.parse(JSON.stringify(selectedEvent)));
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditedEvent(null);
    };

    const handleUpdateField = (field, value, nested) => {
        if (nested) {
            const [parent, child] = field.split(".");
            setEditedEvent((prev) => ({
                ...prev,
                [parent]: {
                    ...(prev[parent] || {}),
                    [child]: value,
                },
            }));
        } else {
            setEditedEvent((prev) => ({
                ...prev,
                [field]: value,
            }));
        }
    };

    const handleUpdateDateTime = (field, value) => {
        setEditedEvent((prev) => ({
            ...prev,
            dateTime: {
                ...(prev.dateTime || {}),
                [field]: value,
            },
        }));
    };

    const handleUpdatePrice = (field, value) => {
        setEditedEvent((prev) => ({
            ...prev,
            price: {
                ...(prev.price || {}),
                [field]: field === "isFree" && value ? 0 : value,
            },
        }));
    };

    const handleUpdateRegistration = (field, value) => {
        setEditedEvent((prev) => ({
            ...prev,
            registration: {
                ...(prev.registration || {}),
                [field]: value,
            },
        }));
    };

    const handleUpdateLocation = (field, value) => {
        setEditedEvent((prev) => ({
            ...prev,
            location: {
                ...(prev.location || {}),
                [field]: value,
            },
        }));
    };

    const handleUpdateImage = (value) => {
        setEditedEvent((prev) => ({
            ...prev,
            image: {
                ...(prev.image || {}),
                url: value,
            },
        }));
    };

    const handleUpdate = async () => {
        try {
            // Validate dates
            if (!editedEvent?.title?.trim()) {
                alert("Title is required");
                return;
            }

            const payload = {
                ...editedEvent,
                capacity: parseInt(editedEvent.capacity) || 0,
                dateTime: {
                    ...editedEvent.dateTime,
                    start: editedEvent.dateTime?.start
                        ? new Date(editedEvent.dateTime.start)
                        : null,
                    end: editedEvent.dateTime?.end
                        ? new Date(editedEvent.dateTime.end)
                        : null,
                },
            };

            await dispatch(updateEvent({
                id: selectedEvent._id,
                data: payload,
            })).unwrap();

            await dispatch(fetchAdminEventById(selectedEvent._id));
            setIsEditing(false);
            setEditedEvent(null);
        } catch (err) {
            console.error("Update failed:", err);
            alert("Update failed: " + (err.message || "Unknown error"));
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this event?")) return;

        try {
            await dispatch(deleteEvent(selectedEvent._id)).unwrap();
            closeDetail();
            dispatch(fetchAdminEvents());
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Delete failed: " + (err.message || "Unknown error"));
        }
    };

    const handleRefresh = () => {
        dispatch(fetchAdminEvents());
    };

    const handleCreateFieldChange = (field, value, parent) => {
        if (parent) {
            setCreateFormData((prev) => ({
                ...prev,
                [parent]: {
                    ...(prev[parent] || {}),
                    [field]: value,
                },
            }));
        } else {
            setCreateFormData((prev) => ({
                ...prev,
                [field]: value,
            }));
        }
    };

    const handleCreateDateTime = (field, value) => {
        setCreateFormData((prev) => ({
            ...prev,
            dateTime: {
                ...(prev.dateTime || {}),
                [field]: value,
            },
        }));
    };

    const handleCreatePrice = (field, value) => {
        setCreateFormData((prev) => ({
            ...prev,
            price: {
                ...(prev.price || {}),
                [field]: field === "isFree" && value ? 0 : value,
            },
        }));
    };

    const handleCreateLocation = (field, value) => {
        setCreateFormData((prev) => ({
            ...prev,
            location: {
                ...(prev.location || {}),
                [field]: value,
            },
        }));
    };

    const handleCreateImage = (value) => {
        setCreateFormData((prev) => ({
            ...prev,
            image: {
                ...(prev.image || {}),
                url: value,
            },
        }));
    };

    const validateCreateForm = () => {
        if (!createFormData.title?.trim()) {
            alert("Title is required");
            return false;
        }
        if (!createFormData.description?.trim()) {
            alert("Description is required");
            return false;
        }
        if (!createFormData.dateTime?.start) {
            alert("Start date is required");
            return false;
        }
        if (!createFormData.dateTime?.end) {
            alert("End date is required");
            return false;
        }
        return true;
    };

    const handleCreate = async () => {
        if (!validateCreateForm()) return;

        try {
            const eventData = {
                ...createFormData,
                organizer: user?._id || "6927452435db90389c7962f1", // Fallback for demo
                capacity: parseInt(createFormData.capacity) || 0,
                dateTime: {
                    ...createFormData.dateTime,
                    start: createFormData.dateTime.start ? new Date(createFormData.dateTime.start) : null,
                    end: createFormData.dateTime.end ? new Date(createFormData.dateTime.end) : null,
                },
            };

            await dispatch(createEvent(eventData)).unwrap();
            setCreateOpen(false);
            setCreateFormData({
                title: "",
                description: "",
                category: "conference",
                type: "virtual",
                location: {
                    address: "",
                    city: "",
                    country: "Kenya",
                    onlineLink: "",
                    platform: "google-meet",
                },
                dateTime: {
                    start: "",
                    end: "",
                    timezone: "Africa/Nairobi",
                },
                capacity: 0,
                price: {
                    amount: 0,
                    currency: "KES",
                    isFree: true,
                },
                image: {
                    url: "",
                },
                status: "draft",
                visibility: "community",
                registration: {
                    requiresApproval: false,
                    deadline: "",
                    maxAttendees: 0,
                },
                tags: [],
                requirements: [],
                agenda: [],
                speakers: [],
            });
            dispatch(fetchAdminEvents());
        } catch (err) {
            console.error("Create failed:", err);
            alert("Create failed: " + (err.message || "Unknown error"));
        }
    };

    /* ============================================================
       RENDER
    ============================================================ */

    return (
        <AdminLayout title="Events Management">
            <div className="p-6 bg-gray-50 min-h-screen">

                {/* ================= HEADER ================= */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 rounded-xl">
                            <Calendar className="w-6 h-6 text-purple-700" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Events Management</h1>
                            <p className="text-sm text-gray-700">
                                Manage all platform events
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                            <input
                                type="text"
                                placeholder="Search events..."
                                value={filters.search || ""}
                                onChange={handleSearch}
                                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 w-64 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-gray-500"
                            />
                        </div>

                        <button
                            onClick={() => setCreateOpen(true)}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
                        >
                            <Plus size={18} />
                            Create Event
                        </button>

                        <button
                            onClick={handleRefresh}
                            className="p-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-gray-700"
                            title="Refresh"
                        >
                            <RefreshCw size={18} className={eventsLoading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-800">
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                )}

                {/* ================= STATUS FILTERS ================= */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {["all", "upcoming", "postponed", "cancelled", "completed", "published", "draft"].map((s) => (
                        <button
                            key={s}
                            onClick={() => handleStatusFilter(s === "all" ? "" : s)}
                            className={`px-4 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${(s === "all" && !filters.status) || filters.status === s
                                    ? "bg-purple-600 text-white border-purple-600"
                                    : "bg-white text-gray-900 border-gray-300 hover:bg-gray-50"
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                {/* ================= TABLE ================= */}
                <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 text-gray-900">
                                <tr>
                                    <th className="p-4 text-left font-semibold">Image</th>
                                    <th className="p-4 text-left font-semibold">Event Title</th>
                                    <th className="p-4 text-left font-semibold">Location</th>
                                    <th className="p-4 text-left font-semibold">Start Date</th>
                                    <th className="p-4 text-left font-semibold">End Date</th>
                                    <th className="p-4 text-left font-semibold">Status</th>
                                    <th className="p-4 text-left font-semibold">Created At</th>
                                    <th className="p-4 text-left font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {eventsLoading ? (
                                    <tr>
                                        <td colSpan="8" className="p-12 text-center">
                                            <div className="flex justify-center items-center gap-2 text-gray-700">
                                                <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                                                <span>Loading events...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : events.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="p-12 text-center text-gray-700">
                                            No events found
                                        </td>
                                    </tr>
                                ) : (
                                    events.map((event) => (
                                        <tr key={event._id} className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                                            <td className="p-4">
                                                {event.image?.url || event.image ? (
                                                    <img
                                                        src={event.image?.url || event.image}
                                                        alt={event.title}
                                                        className="w-14 h-14 object-cover rounded-lg border border-gray-200 hover:scale-105 transition-transform"
                                                    />
                                                ) : (
                                                    <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center text-gray-700 text-xs border border-gray-300">
                                                        No Image
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 font-medium text-gray-900">{event.title}</td>
                                            <td className="p-4 text-gray-700">
                                                {formatLocation(event.location)}
                                            </td>
                                            <td className="p-4 text-gray-700">{formatDate(event.dateTime?.start)}</td>
                                            <td className="p-4 text-gray-700">{formatDate(event.dateTime?.end)}</td>
                                            <td className="p-4">
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}
                                                >
                                                    {event.status}
                                                </span>
                                                {event.type && (
                                                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getEventTypeColor(event.type)}`}>
                                                        {event.type}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-gray-700">{formatDate(event.createdAt)}</td>
                                            <td className="p-4">
                                                <button
                                                    onClick={() => openDetail(event._id)}
                                                    className="text-purple-700 hover:text-purple-900 flex items-center gap-1 transition-colors font-medium"
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
                    </div>

                    {/* ================= PAGINATION ================= */}
                    {pagination?.pages > 1 && (
                        <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50">
                            <span className="text-sm text-gray-700">
                                Page {pagination.page} of {pagination.pages} (Total: {pagination.total} events)
                            </span>
                            <div className="flex gap-2">
                                <button
                                    disabled={pagination.page <= 1}
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    className={`p-2 rounded-lg border ${pagination.page <= 1
                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                                            : "bg-white text-gray-900 hover:bg-gray-50 border-gray-300"
                                        }`}
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    disabled={pagination.page >= pagination.pages}
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    className={`p-2 rounded-lg border ${pagination.page >= pagination.pages
                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                                            : "bg-white text-gray-900 hover:bg-gray-50 border-gray-300"
                                        }`}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ============================================================
           DETAIL MODAL
        ============================================================ */}
                {detailOpen && (
                    <div className="fixed inset-0 bg-black/60 flex justify-center items-start p-6 overflow-y-auto z-50">
                        <div className="bg-white w-full max-w-4xl rounded-xl shadow-lg relative my-8">

                            {/* Modal Header */}
                            <div className="sticky top-0 bg-white border-b border-gray-200 rounded-t-xl p-6 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {selectedLoading ? "Loading..." : "Event Details"}
                                </h2>
                                <button
                                    onClick={closeDetail}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6">
                                {selectedLoading ? (
                                    <div className="flex justify-center items-center py-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                                    </div>
                                ) : !selectedEvent ? (
                                    <div className="text-center py-12 text-gray-700">Event not found</div>
                                ) : (
                                    <>
                                        {/* Event Image */}
                                        {(selectedEvent.image?.url || selectedEvent.image) && (
                                            <div className="mb-6">
                                                <img
                                                    src={selectedEvent.image?.url || selectedEvent.image}
                                                    alt={selectedEvent.title}
                                                    className="w-full h-64 object-cover rounded-xl border border-gray-200"
                                                />
                                            </div>
                                        )}

                                        {isEditing ? (
                                            /* Edit Mode */
                                            <div className="space-y-6">
                                                {/* Image URL Input */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                                                    <input
                                                        type="url"
                                                        value={editedEvent?.image?.url || ""}
                                                        onChange={(e) => handleUpdateImage(e.target.value)}
                                                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                        placeholder="https://..."
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                                        <input
                                                            type="text"
                                                            value={editedEvent?.title || ""}
                                                            onChange={(e) => handleUpdateField("title", e.target.value)}
                                                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                                        <select
                                                            value={editedEvent?.category || ""}
                                                            onChange={(e) => handleUpdateField("category", e.target.value)}
                                                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                        >
                                                            <option value="workshop">Workshop</option>
                                                            <option value="conference">Conference</option>
                                                            <option value="networking">Networking</option>
                                                            <option value="social">Social</option>
                                                            <option value="training">Training</option>
                                                            <option value="webinar">Webinar</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                                                    <textarea
                                                        value={editedEvent?.description || ""}
                                                        onChange={(e) => handleUpdateField("description", e.target.value)}
                                                        rows="4"
                                                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                                                        <select
                                                            value={editedEvent?.type || "virtual"}
                                                            onChange={(e) => handleUpdateField("type", e.target.value)}
                                                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                        >
                                                            <option value="virtual">Virtual</option>
                                                            <option value="in-person">In Person</option>
                                                            <option value="hybrid">Hybrid</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                                                        <input
                                                            type="number"
                                                            value={editedEvent?.capacity || 0}
                                                            onChange={(e) => handleUpdateField("capacity", parseInt(e.target.value) || 0)}
                                                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                            min="0"
                                                        />
                                                        <p className="text-xs text-gray-600 mt-1">0 = Unlimited</p>
                                                    </div>
                                                </div>

                                                <div className="border-t border-gray-200 pt-4">
                                                    <h3 className="font-semibold text-gray-900 mb-3">Location Details</h3>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                                            <input
                                                                type="text"
                                                                value={editedEvent?.location?.address || ""}
                                                                onChange={(e) => handleUpdateLocation("address", e.target.value)}
                                                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                                            <input
                                                                type="text"
                                                                value={editedEvent?.location?.city || ""}
                                                                onChange={(e) => handleUpdateLocation("city", e.target.value)}
                                                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                                            <input
                                                                type="text"
                                                                value={editedEvent?.location?.country || ""}
                                                                onChange={(e) => handleUpdateLocation("country", e.target.value)}
                                                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Online Link</label>
                                                            <input
                                                                type="url"
                                                                value={editedEvent?.location?.onlineLink || ""}
                                                                onChange={(e) => handleUpdateLocation("onlineLink", e.target.value)}
                                                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                                placeholder="https://..."
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="border-t border-gray-200 pt-4">
                                                    <h3 className="font-semibold text-gray-900 mb-3">Date & Time</h3>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                                                            <input
                                                                type="datetime-local"
                                                                value={formatDateForInput(editedEvent?.dateTime?.start)}
                                                                onChange={(e) => handleUpdateDateTime("start", e.target.value)}
                                                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                                                            <input
                                                                type="datetime-local"
                                                                value={formatDateForInput(editedEvent?.dateTime?.end)}
                                                                onChange={(e) => handleUpdateDateTime("end", e.target.value)}
                                                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="border-t border-gray-200 pt-4">
                                                    <h3 className="font-semibold text-gray-900 mb-3">Pricing</h3>
                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                                            <input
                                                                type="number"
                                                                value={editedEvent?.price?.amount || 0}
                                                                onChange={(e) => handleUpdatePrice("amount", parseFloat(e.target.value) || 0)}
                                                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                                min="0"
                                                                step="0.01"
                                                                disabled={editedEvent?.price?.isFree}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                                            <input
                                                                type="text"
                                                                value={editedEvent?.price?.currency || "KES"}
                                                                onChange={(e) => handleUpdatePrice("currency", e.target.value)}
                                                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                                disabled={editedEvent?.price?.isFree}
                                                            />
                                                        </div>
                                                        <div className="flex items-center">
                                                            <label className="flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={editedEvent?.price?.isFree || false}
                                                                    onChange={(e) => handleUpdatePrice("isFree", e.target.checked)}
                                                                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                                />
                                                                <span className="text-sm text-gray-700">Free Event</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="border-t border-gray-200 pt-4">
                                                    <h3 className="font-semibold text-gray-900 mb-3">Status & Visibility</h3>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                                            <select
                                                                value={editedEvent?.status || "draft"}
                                                                onChange={(e) => handleUpdateField("status", e.target.value)}
                                                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                            >
                                                                <option value="draft">Draft</option>
                                                                <option value="published">Published</option>
                                                                <option value="cancelled">Cancelled</option>
                                                                <option value="completed">Completed</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                                                            <select
                                                                value={editedEvent?.visibility || "community"}
                                                                onChange={(e) => handleUpdateField("visibility", e.target.value)}
                                                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                            >
                                                                <option value="public">Public</option>
                                                                <option value="community">Community</option>
                                                                <option value="private">Private</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* View Mode */
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">Title</p>
                                                        <p className="text-gray-900">{selectedEvent.title}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">Category</p>
                                                        <p className="text-gray-900 capitalize">{selectedEvent.category}</p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <p className="text-sm font-medium text-gray-700">Description</p>
                                                    <p className="mt-1 text-gray-900">{selectedEvent.description}</p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">Location</p>
                                                        <p className="text-gray-900">{formatLocation(selectedEvent.location)}</p>
                                                        {selectedEvent.location?.onlineLink && (
                                                            <a
                                                                href={selectedEvent.location.onlineLink}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-purple-700 text-sm hover:underline block mt-1 font-medium"
                                                            >
                                                                Join Online
                                                            </a>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">Type</p>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEventTypeColor(selectedEvent.type)}`}>
                                                            {selectedEvent.type}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">Start Date</p>
                                                        <p className="text-gray-900">{formatDate(selectedEvent.dateTime?.start)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">End Date</p>
                                                        <p className="text-gray-900">{formatDate(selectedEvent.dateTime?.end)}</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-4">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">Capacity</p>
                                                        <p className="text-gray-900">{selectedEvent.capacity || "Unlimited"}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">Price</p>
                                                        <p className="text-gray-900">{selectedEvent.price?.isFree ? "Free" : `${selectedEvent.price?.currency} ${selectedEvent.price?.amount}`}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">Status</p>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedEvent.status)}`}>
                                                            {selectedEvent.status}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">Created At</p>
                                                        <p className="text-gray-900">{formatDate(selectedEvent.createdAt)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">Updated At</p>
                                                        <p className="text-gray-900">{formatDate(selectedEvent.updatedAt)}</p>
                                                    </div>
                                                </div>

                                                {selectedEvent.attendees?.length > 0 && (
                                                    <div className="pt-4 border-t border-gray-200">
                                                        <p className="text-sm font-medium text-gray-700 mb-3">
                                                            Attendees ({selectedEvent.attendees.length})
                                                        </p>

                                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                                            {selectedEvent.attendees.map((attendee, idx) => {
                                                                const user = attendee.user;

                                                                return (
                                                                    <div
                                                                        key={idx}
                                                                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white"
                                                                    >
                                                                        <div className="flex items-center gap-3">

                                                                            {/* Avatar */}
                                                                            {user?.profile?.avatar?.url ? (
                                                                                <img
                                                                                    src={user.profile.avatar.url}
                                                                                    alt={user.profile.fullName}
                                                                                    className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                                                                />
                                                                            ) : (
                                                                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 text-xs font-semibold">
                                                                                    {user?.profile?.fullName?.charAt(0)?.toUpperCase() || "U"}
                                                                                </div>
                                                                            )}

                                                                            {/* Name + Email */}
                                                                            <div>
                                                                                <p className="text-sm font-medium text-gray-900">
                                                                                    {user?.profile?.fullName || "Unknown User"}
                                                                                </p>
                                                                                <p className="text-xs text-gray-600">
                                                                                    {user?.email || ""}
                                                                                </p>
                                                                            </div>
                                                                        </div>

                                                                        {/* Status Badge */}
                                                                        <span
                                                                            className={`px-2 py-1 rounded-full text-xs font-medium border ${attendee.status === "approved"
                                                                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                                                                    : attendee.status === "pending"
                                                                                        ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                                                                        : attendee.status === "rejected"
                                                                                            ? "bg-rose-100 text-rose-800 border-rose-200"
                                                                                            : "bg-gray-100 text-gray-800 border-gray-200"
                                                                                }`}
                                                                        >
                                                                            {attendee.status}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="mt-8 flex gap-3 pt-4 border-t border-gray-200">
                                            {isEditing ? (
                                                <>
                                                    <button
                                                        onClick={handleUpdate}
                                                        className="bg-purple-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
                                                    >
                                                        <Save size={18} />
                                                        Save Changes
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        className="border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50 text-gray-900 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={handleEdit}
                                                        className="bg-purple-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
                                                    >
                                                        <Edit size={18} />
                                                        Edit Event
                                                    </button>
                                                    <button
                                                        onClick={handleDelete}
                                                        className="bg-gray-900 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition-colors"
                                                    >
                                                        <Trash2 size={18} />
                                                        Delete Event
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================================
           CREATE EVENT MODAL
        ============================================================ */}
                {createOpen && (
                    <div className="fixed inset-0 bg-black/60 flex justify-center items-start p-6 overflow-y-auto z-50">
                        <div className="bg-white w-full max-w-4xl rounded-xl shadow-lg relative my-8">

                            {/* Modal Header */}
                            <div className="sticky top-0 bg-white border-b border-gray-200 rounded-t-xl p-6 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-900">Create New Event</h2>
                                <button
                                    onClick={() => setCreateOpen(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6">
                                <div className="space-y-6">
                                    {/* Image URL */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                                        <input
                                            type="url"
                                            value={createFormData.image.url}
                                            onChange={(e) => handleCreateImage(e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                            placeholder="https://..."
                                        />
                                    </div>

                                    {/* Basic Information */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                            <input
                                                type="text"
                                                value={createFormData.title}
                                                onChange={(e) => handleCreateFieldChange("title", e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                                            <select
                                                value={createFormData.category}
                                                onChange={(e) => handleCreateFieldChange("category", e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                            >
                                                <option value="workshop">Workshop</option>
                                                <option value="conference">Conference</option>
                                                <option value="networking">Networking</option>
                                                <option value="social">Social</option>
                                                <option value="training">Training</option>
                                                <option value="webinar">Webinar</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                                        <textarea
                                            value={createFormData.description}
                                            onChange={(e) => handleCreateFieldChange("description", e.target.value)}
                                            rows="4"
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Event Type *</label>
                                            <select
                                                value={createFormData.type}
                                                onChange={(e) => handleCreateFieldChange("type", e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                            >
                                                <option value="virtual">Virtual</option>
                                                <option value="in-person">In Person</option>
                                                <option value="hybrid">Hybrid</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                                            <input
                                                type="number"
                                                value={createFormData.capacity}
                                                onChange={(e) => handleCreateFieldChange("capacity", parseInt(e.target.value) || 0)}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                min="0"
                                            />
                                            <p className="text-xs text-gray-600 mt-1">0 = Unlimited</p>
                                        </div>
                                    </div>

                                    {/* Location Section */}
                                    <div className="border-t border-gray-200 pt-4">
                                        <h3 className="font-semibold text-gray-900 mb-3">Location Details</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                                <input
                                                    type="text"
                                                    value={createFormData.location.address}
                                                    onChange={(e) => handleCreateLocation("address", e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                                <input
                                                    type="text"
                                                    value={createFormData.location.city}
                                                    onChange={(e) => handleCreateLocation("city", e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                                <input
                                                    type="text"
                                                    value={createFormData.location.country}
                                                    onChange={(e) => handleCreateLocation("country", e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Online Link</label>
                                                <input
                                                    type="url"
                                                    value={createFormData.location.onlineLink}
                                                    onChange={(e) => handleCreateLocation("onlineLink", e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                                                <select
                                                    value={createFormData.location.platform}
                                                    onChange={(e) => handleCreateLocation("platform", e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                >
                                                    <option value="google-meet">Google Meet</option>
                                                    <option value="zoom">Zoom</option>
                                                    <option value="teams">Microsoft Teams</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Date & Time Section */}
                                    <div className="border-t border-gray-200 pt-4">
                                        <h3 className="font-semibold text-gray-900 mb-3">Date & Time</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                                                <input
                                                    type="datetime-local"
                                                    value={createFormData.dateTime.start}
                                                    onChange={(e) => handleCreateDateTime("start", e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                                                <input
                                                    type="datetime-local"
                                                    value={createFormData.dateTime.end}
                                                    onChange={(e) => handleCreateDateTime("end", e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                                                <input
                                                    type="text"
                                                    value={createFormData.dateTime.timezone}
                                                    onChange={(e) => handleCreateDateTime("timezone", e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pricing Section */}
                                    <div className="border-t border-gray-200 pt-4">
                                        <h3 className="font-semibold text-gray-900 mb-3">Pricing</h3>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                                <input
                                                    type="number"
                                                    value={createFormData.price.amount}
                                                    onChange={(e) => handleCreatePrice("amount", parseFloat(e.target.value) || 0)}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                    min="0"
                                                    step="0.01"
                                                    disabled={createFormData.price.isFree}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                                <input
                                                    type="text"
                                                    value={createFormData.price.currency}
                                                    onChange={(e) => handleCreatePrice("currency", e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                    disabled={createFormData.price.isFree}
                                                />
                                            </div>
                                            <div className="flex items-center">
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={createFormData.price.isFree}
                                                        onChange={(e) => {
                                                            handleCreatePrice("isFree", e.target.checked);
                                                            if (e.target.checked) handleCreatePrice("amount", 0);
                                                        }}
                                                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                    />
                                                    <span className="text-sm text-gray-700">Free Event</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status & Visibility */}
                                    <div className="border-t border-gray-200 pt-4">
                                        <h3 className="font-semibold text-gray-900 mb-3">Status & Visibility</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                                                <select
                                                    value={createFormData.status}
                                                    onChange={(e) => handleCreateFieldChange("status", e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                >
                                                    <option value="draft">Draft</option>
                                                    <option value="published">Published</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Visibility *</label>
                                                <select
                                                    value={createFormData.visibility}
                                                    onChange={(e) => handleCreateFieldChange("visibility", e.target.value)}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                >
                                                    <option value="public">Public</option>
                                                    <option value="community">Community</option>
                                                    <option value="private">Private</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Registration Settings */}
                                    <div className="border-t border-gray-200 pt-4">
                                        <h3 className="font-semibold text-gray-900 mb-3">Registration Settings</h3>
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={createFormData.registration.requiresApproval}
                                                    onChange={(e) => handleCreateFieldChange("requiresApproval", e.target.checked, "registration")}
                                                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                />
                                                <span className="text-sm text-gray-700">Requires Approval</span>
                                            </label>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Registration Deadline</label>
                                                    <input
                                                        type="datetime-local"
                                                        value={createFormData.registration.deadline}
                                                        onChange={(e) => handleCreateFieldChange("deadline", e.target.value, "registration")}
                                                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Attendees</label>
                                                    <input
                                                        type="number"
                                                        value={createFormData.registration.maxAttendees}
                                                        onChange={(e) => handleCreateFieldChange("maxAttendees", parseInt(e.target.value) || 0, "registration")}
                                                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                                                        min="0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-8 flex gap-3 pt-4 border-t border-gray-200">
                                        <button
                                            onClick={handleCreate}
                                            className="bg-purple-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
                                        >
                                            <Plus size={18} />
                                            Create Event
                                        </button>
                                        <button
                                            onClick={() => setCreateOpen(false)}
                                            className="border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50 text-gray-900 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}