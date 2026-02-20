import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { mentorsService } from "../../services/mentors";

/* ============================================================
   INITIAL STATE
============================================================ */
const initialState = {
  /* ================= LIST ================= */
  mentors: [],
  mentorsLoading: false,

  /* ================= SELECTED ================= */
  selectedMentor: null,
  selectedLoading: false,

  /* ================= PAGINATION ================= */
  pagination: {
    page: 1,
    pages: 1,
    total: 0,
    limit: 20,
  },

  /* ================= FILTERS ================= */
  filters: {
    page: 1,
    limit: 20,
    search: "",
    status: "",
    verified: "",
  },

  /* ================= ERROR ================= */
  error: null,
};

/* ============================================================
   ASYNC THUNKS
============================================================ */

/* ================= FETCH MENTORS ================= */
export const fetchAdminMentors = createAsyncThunk(
  "adminMentors/fetchMentors",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { filters } = getState().mentors;
      const token = getState().auth.token;

      const res = await mentorsService.listMentors(filters, token);
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.message || "Failed to fetch mentors"
      );
    }
  }
);

/* ================= FETCH MENTOR BY ID ================= */
export const fetchAdminMentorById = createAsyncThunk(
  "adminMentors/fetchMentorById",
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const res = await mentorsService.getMentorById(id, token);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.message || "Failed to fetch mentor"
      );
    }
  }
);

/* ================= APPROVE ================= */
export const approveMentor = createAsyncThunk(
  "adminMentors/approve",
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const res = await mentorsService.approveMentor(id, token);
      return res.data.data;
    } catch (err) {
      return rejectWithValue("Failed to approve mentor");
    }
  }
);

/* ================= REJECT ================= */
export const rejectMentor = createAsyncThunk(
  "adminMentors/reject",
  async ({ id, reason }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const res = await mentorsService.rejectMentor(id, reason, token);
      return res.data.data;
    } catch (err) {
      return rejectWithValue("Failed to reject mentor");
    }
  }
);

/* ================= RATE ================= */
export const rateMentor = createAsyncThunk(
  "adminMentors/rate",
  async ({ id, rating }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const res = await mentorsService.rateMentor(id, rating, token);
      return res.data.data;
    } catch (err) {
      return rejectWithValue("Failed to rate mentor");
    }
  }
);

/* ================= CREATE ================= */
export const createMentor = createAsyncThunk(
  "adminMentors/create",
  async (data, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const res = await mentorsService.createMentor(data, token);
      return res.data.data;
    } catch (err) {
      return rejectWithValue("Failed to create mentor");
    }
  }
);

/* ================= UPDATE ================= */
export const updateMentor = createAsyncThunk(
  "adminMentors/update",
  async ({ id, data }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const res = await mentorsService.updateMentor(id, data, token);
      return res.data.data;
    } catch (err) {
      return rejectWithValue("Failed to update mentor");
    }
  }
);

/* ================= DELETE ================= */
export const deleteMentor = createAsyncThunk(
  "adminMentors/delete",
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      await mentorsService.deleteMentor(id, token);
      return id;
    } catch (err) {
      return rejectWithValue("Failed to delete mentor");
    }
  }
);

/* ================= TOGGLE ACTIVE ================= */
export const toggleMentorStatus = createAsyncThunk(
  "adminMentors/toggleStatus",
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.token;
      const res = await mentorsService.toggleMentorStatus(id, token);
      return res.data.data;
    } catch (err) {
      return rejectWithValue("Failed to toggle mentor status");
    }
  }
);

/* ============================================================
   SLICE
============================================================ */
const mentorsSlice = createSlice({
  name: "mentors",
  initialState,
  reducers: {
    setMentorFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearSelectedMentor: (state) => {
      state.selectedMentor = null;
    },
    clearMentorError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {

    /* ================= LIST ================= */
    builder
      .addCase(fetchAdminMentors.pending, (state) => {
        state.mentorsLoading = true;
      })
      .addCase(fetchAdminMentors.fulfilled, (state, action) => {
        state.mentorsLoading = false;

        const { data, page, pages, total, limit } = action.payload;

        state.mentors = data || [];
        state.pagination = { page, pages, total, limit };
      })
      .addCase(fetchAdminMentors.rejected, (state, action) => {
        state.mentorsLoading = false;
        state.error = action.payload;
      });

    /* ================= FETCH ONE ================= */
    builder
      .addCase(fetchAdminMentorById.pending, (state) => {
        state.selectedLoading = true;
      })
      .addCase(fetchAdminMentorById.fulfilled, (state, action) => {
        state.selectedLoading = false;
        state.selectedMentor = action.payload;
      })
      .addCase(fetchAdminMentorById.rejected, (state, action) => {
        state.selectedLoading = false;
        state.error = action.payload;
      });

    /* ================= UPDATE LOCAL AFTER ACTIONS ================= */
    builder
      .addCase(approveMentor.fulfilled, (state, action) => {
        state.selectedMentor = action.payload;
      })
      .addCase(rejectMentor.fulfilled, (state, action) => {
        state.selectedMentor = action.payload;
      })
      .addCase(rateMentor.fulfilled, (state, action) => {
        state.selectedMentor = action.payload;
      })
      .addCase(updateMentor.fulfilled, (state, action) => {
        state.selectedMentor = action.payload;
      })
      .addCase(toggleMentorStatus.fulfilled, (state, action) => {
        state.selectedMentor = action.payload;
      });

    /* ================= DELETE ================= */
    builder.addCase(deleteMentor.fulfilled, (state, action) => {
      state.mentors = state.mentors.filter(
        (m) => m._id !== action.payload
      );
    });

    /* ================= CREATE ================= */
    builder.addCase(createMentor.fulfilled, (state, action) => {
      state.mentors.unshift(action.payload);
    });

  },
});

export const {
  setMentorFilters,
  clearSelectedMentor,
  clearMentorError,
} = mentorsSlice.actions;

export default mentorsSlice.reducer;
