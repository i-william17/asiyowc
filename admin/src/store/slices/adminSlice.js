// store/slices/adminSlice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { adminService } from "../../services/admin";

/* ============================================================
   INITIAL STATE
============================================================ */
const initialState = {
    users: [],
    selectedUser: null,

    /* GROUPS */
    groups: [],
    selectedGroup: null,
    groupsLoading: false,
    groupsPage: 1,
    groupsTotal: 0,
    groupsHasMore: true,

    /* PROGRAMS */
    programs: [],
    programsLoading: false,
    selectedProgram: null,
    participants: [],

    loading: false,
    error: null,

    page: 1,
    total: 0,
    hasMore: true,

    searchQuery: "",

    dashboard: {
        totals: {
            users: 0,
            groups: 0,
            programs: {
                participants: 0,
                completionRate: 0
            },
            revenue: {
                total: 0
            }
        },
        charts: {
            labels: [],
            users: [],
            groups: [],
            revenue: []
        },

        loading: false,
        error: null,
    },
};


/* ============================================================
   THUNKS (ALL TOKENS AUTO-INJECTED FROM AUTH STATE)
============================================================ */

/* ------------------------------------------------------------
   FETCH USERS (PAGINATED)
------------------------------------------------------------ */
export const fetchUsers = createAsyncThunk(
    "admin/fetchUsers",
    async ({ page = 1, limit = 20 }, { getState, rejectWithValue }) => {
        try {
            const { token } = getState().auth;
            const res = await adminService.getUsers({ page, limit, token });
            return { ...res.data.data, page };
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || err.message);
        }
    }
);


/* ------------------------------------------------------------
   FETCH USER BY ID
------------------------------------------------------------ */
export const fetchUserById = createAsyncThunk(
    "admin/fetchUserById",
    async (userId, { getState, rejectWithValue }) => {
        try {
            const { token } = getState().auth;
            const res = await adminService.getUserById(userId, token);
            return res.data.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || err.message);
        }
    }
);


/* ------------------------------------------------------------
   DELETE USER
------------------------------------------------------------ */
export const deleteUser = createAsyncThunk(
    "admin/deleteUser",
    async (userId, { getState, rejectWithValue }) => {
        try {
            const { token } = getState().auth;
            await adminService.deleteUser(userId, token);
            return userId;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || err.message);
        }
    }
);


/* ------------------------------------------------------------
   SEARCH USERS
------------------------------------------------------------ */
export const searchUsers = createAsyncThunk(
    "admin/searchUsers",
    async (query, { getState, rejectWithValue }) => {
        try {
            const { token } = getState().auth;
            const res = await adminService.searchUsers({ query, token });
            return res.data.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || err.message);
        }
    }
);


/* ------------------------------------------------------------
   SUSPEND USER
------------------------------------------------------------ */
export const suspendUser = createAsyncThunk(
    "admin/suspendUser",
    async (userId, { getState, rejectWithValue }) => {
        try {
            const { token } = getState().auth;
            await adminService.suspendUser(userId, token);
            return userId;
        } catch (err) {
            return rejectWithValue("Suspend failed");
        }
    }
);


/* ------------------------------------------------------------
   ACTIVATE USER
------------------------------------------------------------ */
export const activateUser = createAsyncThunk(
    "admin/activateUser",
    async (userId, { getState, rejectWithValue }) => {
        try {
            const { token } = getState().auth;
            await adminService.activateUser(userId, token);
            return userId;
        } catch (err) {
            return rejectWithValue("Activate failed");
        }
    }
);


/* ------------------------------------------------------------
   BULK DELETE
------------------------------------------------------------ */
export const bulkDeleteUsers = createAsyncThunk(
    "admin/bulkDeleteUsers",
    async (ids, { getState, rejectWithValue }) => {
        try {
            const { token } = getState().auth;
            await adminService.bulkDeleteUsers(ids, token);
            return ids;
        } catch (err) {
            return rejectWithValue("Bulk delete failed");
        }
    }
);

/* ============================================================
   GROUPS
============================================================ */

export const fetchGroups = createAsyncThunk(
    "admin/fetchGroups",
    async ({ page = 1, limit = 20 }, { getState, rejectWithValue }) => {
        try {
            const { token } = getState().auth;
            const res = await adminService.getGroups({ page, limit, token });
            return res.data.data;
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const fetchGroupById = createAsyncThunk(
    "admin/fetchGroupById",
    async (id, { getState }) => {
        const { token } = getState().auth;
        const res = await adminService.getGroupById(id, token);
        return res.data.data;
    }
);

export const deleteGroup = createAsyncThunk(
    "admin/deleteGroup",
    async (id, { getState }) => {
        const { token } = getState().auth;
        await adminService.deleteGroup(id, token);
        return id;
    }
);

export const toggleGroup = createAsyncThunk(
    "admin/toggleGroup",
    async (id, { getState }) => {
        const { token } = getState().auth;
        const res = await adminService.toggleGroup(id, token);
        return res.data.data;
    }
);


/* ============================================================
   PROGRAMS
============================================================ */

export const fetchPrograms = createAsyncThunk(
    "admin/fetchPrograms",
    async ({ page = 1, limit = 20 }, { getState }) => {
        const { token } = getState().auth;
        const res = await adminService.getPrograms({ page, limit, token });
        return res.data.data;
    }
);

export const fetchProgramById = createAsyncThunk(
    "admin/fetchProgramById",
    async (id, { getState }) => {
        const { token } = getState().auth;
        const res = await adminService.getProgramById(id, token);
        return res.data.data;
    }
);

export const deleteProgram = createAsyncThunk(
    "admin/deleteProgram",
    async (id, { getState }) => {
        const { token } = getState().auth;
        await adminService.deleteProgram(id, token);
        return id;
    }
);

export const toggleProgram = createAsyncThunk(
    "admin/toggleProgram",
    async (id, { getState }) => {
        const { token } = getState().auth;
        const res = await adminService.toggleProgram(id, token);
        return res.data.data;
    }
);

export const fetchProgramParticipants = createAsyncThunk(
    "admin/fetchProgramParticipants",
    async (id, { getState }) => {
        const { token } = getState().auth;
        const res = await adminService.getProgramParticipants(id, token);
        return res.data.data;
    }
);

/* ------------------------------------------------------------
   DASHBOARD METRICS
------------------------------------------------------------ */
export const fetchDashboardMetrics = createAsyncThunk(
    "admin/fetchDashboardMetrics",
    async (_, { getState, rejectWithValue }) => {
        try {
            const { token } = getState().auth;

            const res = await adminService.getDashboardMetrics(token);

            console.log("📊 Dashboard Metrics:", res.data.data);
            return res.data.data; // { totals, charts }

        } catch (err) {
            return rejectWithValue(
                err.response?.data?.message || "Failed to load metrics"
            );
        }
    }
);


/* ============================================================
   SLICE
============================================================ */
const adminSlice = createSlice({
    name: "admin",
    initialState,

    reducers: {

        /* --------------------------------------------
           CLEAR SELECTED USER (close modal)
        -------------------------------------------- */
        clearSelectedUser: (state) => {
            state.selectedUser = null;
        },

        /* --------------------------------------------
           RESET USERS LIST
           (refresh or logout)
        -------------------------------------------- */
        resetUsers: (state) => {
            state.users = [];
            state.page = 1;
            state.total = 0;
            state.hasMore = true;
        },

        /* --------------------------------------------
           SET SEARCH QUERY
        -------------------------------------------- */
        setSearchQuery: (state, action) => {
            state.searchQuery = action.payload;
        },

        clearSelectedGroup: (state) => {
            state.selectedGroup = null;
        },

clearParticipants: (state) => {
  state.participants = [];
},

clearSelectedProgram: (state) => {
    state.selectedProgram = null;
},

    },

    extraReducers: (builder) => {
        builder
            /* ============================================================
               FETCH USERS
            ============================================================ */
            .addCase(fetchUsers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUsers.fulfilled, (state, action) => {
                state.loading = false;

                const { users, total, hasMore, page } = action.payload;

                if (page === 1) {
                    state.users = users;
                } else {
                    state.users = [...state.users, ...users];
                }

                state.page = page;
                state.total = total;
                state.hasMore = hasMore;
            })
            .addCase(fetchUsers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            /* ============================================================
               FETCH USER BY ID
            ============================================================ */
            .addCase(fetchUserById.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchUserById.fulfilled, (state, action) => {
                state.loading = false;
                state.selectedUser = action.payload;
            })
            .addCase(fetchUserById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            /* ============================================================
               DELETE USER
            ============================================================ */
            .addCase(deleteUser.fulfilled, (state, action) => {
                state.users = state.users.filter(u => u._id !== action.payload);

                if (state.selectedUser?._id === action.payload) {
                    state.selectedUser = null;
                }
            })

            /* ============================================================
               SEARCH USERS
            ============================================================ */
            .addCase(searchUsers.pending, (state) => {
                state.loading = true;
            })
            .addCase(searchUsers.fulfilled, (state, action) => {
                state.loading = false;
                state.users = action.payload.users;
                state.total = action.payload.total;
                state.hasMore = false;
            })
            .addCase(searchUsers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            /* ============================================================
               SUSPEND USER (OPTIMISTIC)
            ============================================================ */
            .addCase(suspendUser.fulfilled, (state, action) => {
                const u = state.users.find(x => x._id === action.payload);
                if (u) u.isActive = false;
            })

            /* ============================================================
               ACTIVATE USER (OPTIMISTIC)
            ============================================================ */
            .addCase(activateUser.fulfilled, (state, action) => {
                const u = state.users.find(x => x._id === action.payload);
                if (u) u.isActive = true;
            })

            /* ============================================================
               BULK DELETE
            ============================================================ */
            .addCase(bulkDeleteUsers.fulfilled, (state, action) => {
                const ids = new Set(action.payload);
                state.users = state.users.filter(u => !ids.has(u._id));
            })

            /* ================= GROUPS ================= */

            /* ================= GROUPS ================= */

            .addCase(fetchGroups.pending, (state) => {
                state.groupsLoading = true;
            })
            .addCase(fetchGroups.fulfilled, (state, action) => {
                state.groupsLoading = false;

                const { data, total, page, hasMore } = action.payload;

                state.groups = data;
                state.groupsTotal = total;
                state.groupsPage = page;
                state.groupsHasMore = hasMore;
            })
            .addCase(fetchGroups.rejected, (state) => {
                state.groupsLoading = false;
            })

            .addCase(fetchGroupById.fulfilled, (state, action) => {
                state.selectedGroup = action.payload;
            })

            .addCase(deleteGroup.fulfilled, (state, action) => {
                state.groups = state.groups.filter(g => g._id !== action.payload);
            })

            .addCase(toggleGroup.fulfilled, (state, action) => {
                const g = state.groups.find(x => x._id === action.payload._id);
                if (g) Object.assign(g, action.payload);
            })

            /* ================= PROGRAMS ================= */

            .addCase(fetchPrograms.pending, (state) => {
                state.programsLoading = true;
            })
            .addCase(fetchPrograms.fulfilled, (state, action) => {
                state.programsLoading = false;
                state.programs = action.payload.data;
            })
            .addCase(fetchProgramById.fulfilled, (state, action) => {
                state.selectedProgram = action.payload;
            })
            .addCase(deleteProgram.fulfilled, (state, action) => {
                state.programs = state.programs.filter(p => p._id !== action.payload);
            })
            .addCase(toggleProgram.fulfilled, (state, action) => {
                const i = state.programs.findIndex(p => p._id === action.payload._id);
                if (i !== -1) state.programs[i] = action.payload;
            })
            .addCase(fetchProgramParticipants.fulfilled, (state, action) => {
                state.participants = action.payload;
            })

            /* ============================================================
               DASHBOARD METRICS
            ============================================================ */
            .addCase(fetchDashboardMetrics.pending, (state) => {
                state.dashboard.loading = true;
                state.dashboard.error = null;
            })
            .addCase(fetchDashboardMetrics.fulfilled, (state, action) => {
                state.dashboard.loading = false;

                state.dashboard.totals = action.payload.totals || state.dashboard.totals;

                state.dashboard.charts =
                    action.payload.charts || state.dashboard.charts;
            })

            .addCase(fetchDashboardMetrics.rejected, (state, action) => {
                state.dashboard.loading = false;
                state.dashboard.error = action.payload;
            });
    }
});


/* ============================================================
   EXPORTS
============================================================ */
export const {
    clearSelectedUser,
    clearSelectedGroup,
    clearParticipants,
    clearSelectedProgram,
    resetUsers,
    setSearchQuery,
} = adminSlice.actions;

export default adminSlice.reducer;