// src/pages/admin/Groups.jsx

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchGroups,
  fetchGroupById,
  deleteGroup,
  toggleGroup,
  clearSelectedGroup
} from "../../store/slices/adminSlice";

import AdminLayout from "../../components/layout/AdminLayout";

import {
  Search,
  Users,
  Trash2,
  Eye,
  Power,
  X
} from "lucide-react";

/* =========================================================
   COMPONENT
========================================================= */

export default function Groups() {
  const dispatch = useDispatch();

  const {
    groups = [],
    selectedGroup,
    groupsLoading,
    groupsTotal,
    groupsPage
  } = useSelector((s) => s.admin);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  /* =====================================================
     FETCH GROUPS
  ===================================================== */
  useEffect(() => {
    dispatch(fetchGroups({ page }));
  }, [dispatch, page]);

  /* =====================================================
     SEARCH
  ===================================================== */
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);

    dispatch(fetchGroups({ page: 1, search: value }));
  };

  /* =====================================================
     ACTIONS
  ===================================================== */
  const handleDelete = (id) => {
    if (!window.confirm("Delete this group?")) return;
    dispatch(deleteGroup(id));
  };

  const handleToggle = (id) => {
    dispatch(toggleGroup(id));
  };

  const openDetails = (id) => {
    dispatch(fetchGroupById(id));
  };

  /* =====================================================
     RENDER
  ===================================================== */
  return (
    <AdminLayout>
      <div className="p-8 text-black">

        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Groups</h1>

          {/* search */}
          <div className="relative w-72">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={handleSearch}
              placeholder="Search groups..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>


        {/* ================= TABLE ================= */}
        <div className="bg-white shadow rounded-xl overflow-hidden">

          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <th className="p-4">Group</th>
                <th>Members</th>
                <th>Privacy</th>
                <th>Status</th>
                <th className="text-right pr-6">Actions</th>
              </tr>
            </thead>

            <tbody>
              {groupsLoading && (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-gray-400">
                    Loading groups...
                  </td>
                </tr>
              )}

              {!groupsLoading && groups.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-gray-400">
                    No groups found
                  </td>
                </tr>
              )}

              {groups.map((group) => (
                <tr
                  key={group._id}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => openDetails(group._id)}
                >

                  {/* avatar + name */}
                  <td className="p-4 flex items-center gap-3">
                    <img
                      src={group.avatar || "/avatar.png"}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover border"
                    />
                    <div>
                      <p className="font-medium">{group.name}</p>
                      <p className="text-xs text-gray-400">
                        {group.description}
                      </p>
                    </div>
                  </td>

                  <td>{group.members?.length || 0}</td>

                  <td className="capitalize">{group.privacy}</td>

                  <td>
                    <span
                      className={`px-2 py-1 rounded text-xs ${group.isArchived
                        ? "bg-gray-100 text-gray-500"
                        : "bg-green-100 text-green-600"
                        }`}
                    >
                      {group.isArchived ? "Archived" : "Active"}
                    </span>
                  </td>

                  {/* actions */}
                  <td
                    className="text-right pr-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-end gap-3">

                      <button
                        onClick={() => handleToggle(group._id)}
                        className="text-blue-600"
                      >
                        <Power size={16} />
                      </button>

                      <button
                        onClick={() => handleDelete(group._id)}
                        className="text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>

                      <button
                        onClick={() => openDetails(group._id)}
                        className="text-gray-600"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


        {/* ================= PAGINATION ================= */}
        <div className="flex justify-end mt-4 gap-3">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 border rounded"
          >
            Prev
          </button>

          <span className="text-sm text-gray-500">
            Page {page}
          </span>

          <button
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded"
          >
            Next
          </button>
        </div>


        {/* ================= DETAILS MODAL ================= */}
        {selectedGroup && (
          <GroupModal
            group={selectedGroup}
            onClose={() => dispatch(clearSelectedGroup())}

          />
        )}

      </div>
    </AdminLayout>
  );
}


/* =========================================================
   GROUP DETAILS MODAL
========================================================= */

function GroupModal({ group, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">

      <div className="bg-white w-[800px] max-h-[90vh] overflow-y-auto rounded-xl shadow-lg">

        {/* header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-lg">Group Details</h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* info */}
          <div className="flex items-center gap-4">
            <img
              src={group.avatar || "/avatar.png"}
              className="w-20 h-20 rounded-full border"
              alt=""
            />
            <div>
              <h3 className="text-lg font-semibold">{group.name}</h3>
              <p className="text-sm text-gray-500">{group.description}</p>
              <p className="text-xs text-gray-400 capitalize">
                {group.privacy}
              </p>
            </div>
          </div>

          {/* creator */}
          <div>
            <h4 className="font-medium mb-2">Created By</h4>
            <UserRow user={group.createdBy} />
          </div>

          {/* admins */}
          <div>
            <h4 className="font-medium mb-2">Admins</h4>
            {group.admins?.map((u) => (
              <UserRow key={u._id} user={u} />
            ))}
          </div>

          {/* members */}
          <div>
            <h4 className="font-medium mb-2">
              Members ({group.members?.length})
            </h4>

            <div className="grid grid-cols-2 gap-3">
              {group.members?.map((m) => (
                <UserRow key={m.user?._id} user={m.user} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}


/* =========================================================
   USER ROW
========================================================= */

function UserRow({ user }) {
  if (!user) return null;

  return (
    <div className="flex items-center gap-3 p-2 border rounded-lg">
      <img
        src={user.profile?.avatar || "/avatar.png"}
        className="w-8 h-8 rounded-full"
        alt=""
      />
      <span className="text-sm">
        {user.profile?.fullName || "Unknown"}
      </span>
    </div>
  );
}
