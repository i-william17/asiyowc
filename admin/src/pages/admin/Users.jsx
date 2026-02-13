import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchUsers,
  fetchUserById,
  deleteUser,
  suspendUser,
  activateUser,
  clearSelectedUser,
} from "../../store/slices/adminSlice";

import {
  promoteUser,
  demoteUser,
} from "../../store/slices/authSlice";

import AdminLayout from "../../components/layout/AdminLayout";

/* ============================================================
   SIMPLE ADMIN USERS PAGE (LEAN VERSION)
   ✔ avatar + name
   ✔ admin tag
   ✔ search
   ✔ hide current user
   ✔ no self actions
   ✔ slice-only
============================================================ */

export default function User() {
  const dispatch = useDispatch();

  const { users, selectedUser, loading } = useSelector((s) => s.admin);
  const { token } = useSelector((s) => s.auth);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  /* ============================================================
     CURRENT USER ID (decode JWT)
  ============================================================ */
  const currentUserId = useMemo(() => {
    try {
      if (!token) return null;
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.id;
    } catch {
      return null;
    }
  }, [token]);

  /* ============================================================
     LOAD USERS
  ============================================================ */
  useEffect(() => {
    dispatch(fetchUsers({ page }));
  }, [dispatch, page]);

  /* ============================================================
     HELPERS
  ============================================================ */
  const avatar = (u) =>
    u?.profile?.avatar?.url ||
    `https://ui-avatars.com/api/?background=111111&color=ffffff&name=${encodeURIComponent(
      u?.profile?.fullName || "U"
    )}`;

  const name = (u) => u?.profile?.fullName || "Unnamed";

  /* ============================================================
     FILTERED LIST
     - remove myself
     - search
  ============================================================ */
  const filteredUsers = useMemo(() => {
    return (users || [])
      .filter((u) => u._id !== currentUserId)
      .filter((u) =>
        name(u).toLowerCase().includes(search.toLowerCase())
      );
  }, [users, search, currentUserId]);

  /* ============================================================
     ACTIONS
  ============================================================ */
  const openDetails = (id) => dispatch(fetchUserById(id));
  const closeModal = () => dispatch(clearSelectedUser());

  /* ============================================================
     UI
  ============================================================ */
  return (
    <AdminLayout>
      <div className="min-h-screen bg-white p-6 text-black">

        {/* ===================================================== */}
        {/* HEADER + SEARCH */}
        {/* ===================================================== */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Users</h1>

          <input
            placeholder="Search user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded px-3 py-1 text-sm"
          />
        </div>

        {/* ===================================================== */}
        {/* LIST */}
        {/* ===================================================== */}
        <div className="bg-white border rounded-xl divide-y">

          {loading && (
            <p className="p-4 text-sm">Loading users...</p>
          )}

          {!loading &&
            filteredUsers.map((u) => {
              const isMe = u._id === currentUserId;

              return (
                <div
                  key={u._id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  {/* USER INFO */}
                  <div
                    onClick={() => openDetails(u._id)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <img
                      src={avatar(u)}
                      alt="avatar"
                      className="h-10 w-10 rounded-full object-cover"
                    />

                    <div className="flex items-center gap-2">
                      <span className="font-medium">{name(u)}</span>

                      {/* ADMIN TAG */}
                      {u.isAdmin && (
                        <span className="text-xs bg-black text-white px-2 py-0.5 rounded">
                          Admin
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ACTIONS (hidden for self) */}
                  {!isMe && (
                    <div className="flex gap-2">

                      <button
                        onClick={() =>
                          u.isAdmin
                            ? dispatch(demoteUser(u._id))
                            : dispatch(promoteUser(u._id))
                        }
                        className="px-3 py-1 text-xs border rounded"
                      >
                        {u.isAdmin ? "Demote" : "Promote"}
                      </button>

                      <button
                        onClick={() => dispatch(suspendUser(u._id))}
                        className="px-3 py-1 text-xs border rounded"
                      >
                        Suspend
                      </button>

                      <button
                        onClick={() => dispatch(activateUser(u._id))}
                        className="px-3 py-1 text-xs border rounded"
                      >
                        Activate
                      </button>

                      <button
                        onClick={() => dispatch(deleteUser(u._id))}
                        className="px-3 py-1 text-xs border rounded text-red-600"
                      >
                        Delete
                      </button>

                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* ===================================================== */}
        {/* PAGINATION */}
        {/* ===================================================== */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 border rounded"
          >
            Prev
          </button>

          <button
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded"
          >
            Next
          </button>
        </div>

        {/* ===================================================== */}
        {/* DETAILS MODAL */}
        {/* ===================================================== */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center">

            <div className="bg-white rounded-xl w-80 p-6">

              <h2 className="text-lg font-bold mb-4">User Details</h2>

              <img
                src={avatar(selectedUser)}
                alt="avatar"
                className="h-16 w-16 rounded-full mx-auto"
              />

              <p className="text-center mt-3 font-semibold">
                {name(selectedUser)}
              </p>

              <p className="text-center text-sm text-gray-600">
                {selectedUser.email}
              </p>

              <button
                onClick={closeModal}
                className="mt-5 w-full border py-2 rounded"
              >
                Close
              </button>

            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
