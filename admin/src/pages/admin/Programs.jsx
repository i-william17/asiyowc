// src/pages/admin/Programs.jsx

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
    fetchPrograms,
    deleteProgram,
    toggleProgram,
    fetchProgramById,
    fetchProgramParticipants,
    clearSelectedProgram,
    clearParticipants
} from "../../store/slices/adminSlice";

import AdminLayout from "../../components/layout/AdminLayout";

import {
    BookOpen,
    Trash2,
    Power,
    Users,
    X,
    Star,
    BarChart3,
    Clock
} from "lucide-react";

/* ======================================================
   PROGRAMS PAGE
====================================================== */

export default function Programs() {
    const dispatch = useDispatch();

    const {
        programs = [],
        participants = [],
        programsLoading,
        selectedProgram
    } = useSelector((s) => s.admin);

    /* ================= FETCH ================= */
    useEffect(() => {
        dispatch(fetchPrograms({ page: 1, limit: 20 }));
    }, [dispatch]);

    useEffect(() => {
        if (selectedProgram) {
            dispatch(fetchProgramParticipants(selectedProgram._id));
        }
    }, [selectedProgram, dispatch]);

    /* ================= ACTIONS ================= */

    const openDetails = (id) => dispatch(fetchProgramById(id));

    const closeModal = () => {
        dispatch(clearSelectedProgram());
        dispatch(clearParticipants());
    };

    const handleDelete = (id) => {
        if (!window.confirm("Delete this program?")) return;
        dispatch(deleteProgram(id));
    };

    const handleToggle = (id) => dispatch(toggleProgram(id));

    /* ================= UI ================= */

    return (
        <AdminLayout>
            <div className="p-8 text-black">

                {/* HEADER */}
                <h2 className="text-2xl font-semibold flex items-center gap-2 mb-6">
                    <BookOpen size={20} />
                    Programs
                </h2>

                {/* TABLE */}
                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b text-gray-500">
                            <tr>
                                <th className="p-4 text-left">Title</th>
                                <th>Category</th>
                                <th>Participants</th>
                                <th>Status</th>
                                <th className="text-right pr-6">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {programsLoading && (
                                <tr>
                                    <td colSpan="5" className="p-6 text-center text-gray-400">
                                        Loading programs...
                                    </td>
                                </tr>
                            )}

                            {!programsLoading && programs.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="p-6 text-center text-gray-400">
                                        No programs found
                                    </td>
                                </tr>
                            )}

                            {programs.map((p) => (
                                <tr
                                    key={p._id}
                                    onClick={() => openDetails(p._id)}
                                    className="border-b hover:bg-gray-50 cursor-pointer"
                                >
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={p.image || "/program-placeholder.jpg"}
                                                alt={p.title || "Program cover"}
                                                className="w-12 h-12 rounded-lg object-cover border"
                                            />

                                            <div>
                                                <p className="font-medium">{p.title}</p>
                                                <p className="text-xs text-gray-400 line-clamp-1">
                                                    {p.shortDescription || p.description}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    <td>{p.category || "Uncategorized"}</td>
                                    
                                    <td>
                                        <div className="flex items-center">
                                            {/* Avatar stack - fixed to use m directly (already user object) */}
                                            <div className="flex -space-x-2">
                                                {p.participants?.slice(0, 5).map((participant, index) => (
                                                    <img
                                                        key={participant._id || index}
                                                        src={participant.profile?.avatar || "/avatar.png"}
                                                        alt={participant.profile?.fullName || "Participant"}
                                                        className="w-7 h-7 rounded-full border-2 border-white object-cover"
                                                        title={participant.profile?.fullName || participant.email}
                                                    />
                                                ))}
                                            </div>

                                            {/* Count */}
                                            <span className="ml-3 text-xs text-gray-500">
                                                {p.participants?.length || 0}
                                            </span>
                                        </div>
                                    </td>

                                    <td>
                                        <span
                                            className={`px-2 py-1 text-xs rounded-full ${
                                                p.status === "active"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-gray-200 text-gray-600"
                                            }`}
                                        >
                                            {p.status || "inactive"}
                                        </span>
                                    </td>

                                    <td
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex justify-end gap-3 pr-6"
                                    >
                                        <button 
                                            onClick={() => handleToggle(p._id)}
                                            className="p-1 hover:bg-gray-100 rounded"
                                            title={p.status === "active" ? "Deactivate" : "Activate"}
                                        >
                                            <Power size={16} />
                                        </button>

                                        <button 
                                            onClick={() => handleDelete(p._id)}
                                            className="p-1 hover:bg-gray-100 rounded text-red-600"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* MODAL */}
                {selectedProgram && (
                    <ProgramModal
                        program={selectedProgram}
                        participants={participants}
                        onClose={closeModal}
                    />
                )}
            </div>
        </AdminLayout>
    );
}

/* ======================================================
   PROGRAM DETAILS MODAL
====================================================== */

function ProgramModal({ program, participants, onClose }) {
    // Handle click outside to close
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4"
            onClick={handleBackdropClick}
        >
            <div className="bg-white w-[95vw] max-w-[1000px] max-h-[90vh] overflow-y-auto rounded-xl shadow-xl">
                {/* HEADER */}
                <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-semibold">{program.title}</h2>
                        <p className="text-sm text-gray-500">{program.category || "Uncategorized"}</p>
                    </div>

                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* STATS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Stat 
                            label="Participants" 
                            value={participants?.length || 0} 
                            icon={Users} 
                        />

                        <Stat
                            label="Completion"
                            value={`${program.analytics?.completionRate || 0}%`}
                            icon={BarChart3}
                        />

                        <Stat
                            label="Duration"
                            value={program.duration 
                                ? `${program.duration.value || 0} ${program.duration.unit || 'days'}` 
                                : "Not set"}
                            icon={Clock}
                        />

                        <Stat
                            label="Capacity"
                            value={program.capacity || "Unlimited"}
                            icon={Users}
                        />
                    </div>
                    
                    {/* PROGRAM COVER */}
                    {program.image && (
                        <div className="w-full h-52 rounded-lg overflow-hidden border">
                            <img
                                src={program.image}
                                alt={program.title || "Program cover"}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    {/* DESCRIPTION */}
                    <div>
                        <h4 className="font-medium mb-1">Description</h4>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">
                            {program.description || "No description provided."}
                        </p>
                    </div>

                    {/* PARTICIPANTS TABLE */}
                    <div>
                        <h4 className="font-medium mb-3">
                            Participants ({participants?.length || 0})
                        </h4>

                        <div className="border rounded-lg overflow-hidden">
                            {/* Loading state */}
                            {!participants && (
                                <p className="text-gray-400 text-sm p-4">Loading participants...</p>
                            )}

                            {/* Empty state */}
                            {participants?.length === 0 && (
                                <p className="text-gray-500 text-sm p-4">No participants enrolled yet</p>
                            )}

                            {/* Participants table */}
                            {participants?.length > 0 && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="p-3 text-left">User</th>
                                                <th className="p-3 text-left">Email</th>
                                                <th className="p-3 text-left">Progress</th>
                                                <th className="p-3 text-left">Status</th>
                                                <th className="p-3 text-left">Certificate</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {participants.map((participant) => (
                                                <tr key={participant._id} className="border-t hover:bg-gray-50">
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-3">
                                                            <img
                                                                src={participant.profile?.avatar || "/avatar.png"}
                                                                alt={participant.profile?.fullName || "User avatar"}
                                                                className="w-9 h-9 rounded-full border object-cover"
                                                            />
                                                            <span className="font-medium">
                                                                {participant.profile?.fullName || "Anonymous"}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td className="p-3 text-gray-600">
                                                        {participant.email}
                                                    </td>

                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2">
                                                            <span>{participant.progress || 0}%</span>
                                                            <div className="w-16 h-1.5 bg-gray-200 rounded-full">
                                                                <div 
                                                                    className="h-full bg-green-500 rounded-full"
                                                                    style={{ width: `${participant.progress || 0}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="p-3 capitalize">
                                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                                            participant.status === 'completed'
                                                                ? 'bg-green-100 text-green-700'
                                                                : participant.status === 'active'
                                                                ? 'bg-blue-100 text-blue-700'
                                                                : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                            {participant.status || "enrolled"}
                                                        </span>
                                                    </td>

                                                    <td className="p-3">
                                                        {participant.certificateIssued ? (
                                                            <Star className="text-yellow-500" size={16} />
                                                        ) : (
                                                            <span className="text-gray-400">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ======================================================
   STAT CARD
====================================================== */

function Stat({ label, value, icon: Icon }) {
    return (
        <div className="border rounded-lg p-4 flex items-center gap-3 bg-white">
            <div className="p-2 bg-gray-50 rounded-lg">
                <Icon size={18} className="text-gray-600" />
            </div>
            <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="font-semibold text-gray-900">{value}</p>
            </div>
        </div>
    );
}