import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { programService } from "../../services/program";

/* ============================================================
   PROGRAM ENDPOINTS
============================================================ */

/* ---- PUBLIC ---- */
export const fetchPublicPrograms = createAsyncThunk(
  "programs/public",
  async (_, thunkAPI) => {
    try {
      return await programService.getPublicPrograms();
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* ---- ALL PROGRAMS (ADMIN / AUTH) ---- */
export const fetchAllPrograms = createAsyncThunk(
  "programs/all",
  async (_, thunkAPI) => {
    try {
      return await programService.getAllPrograms();
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* ---- GET SINGLE PROGRAM ---- */
export const fetchProgram = createAsyncThunk(
  "programs/getOne",
  async (id, thunkAPI) => {
    try {
      return await programService.getProgram(id);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* ---- MY PROGRAMS ---- */
export const fetchMyPrograms = createAsyncThunk(
  "programs/myPrograms",
  async (_, thunkAPI) => {
    try {
      return await programService.getMyPrograms();
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* ---- CONTINUE & COMPLETED ---- */
export const fetchContinuePrograms = createAsyncThunk(
  "programs/continue",
  async (_, thunkAPI) => {
    try {
      return await programService.getContinuePrograms();
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const fetchCompletedPrograms = createAsyncThunk(
  "programs/completed",
  async (_, thunkAPI) => {
    try {
      return await programService.getCompletedPrograms();
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* ---- SEARCH ---- */
export const searchPrograms = createAsyncThunk(
  "programs/search",
  async (qp, thunkAPI) => {
    try {
      return await programService.searchPrograms(qp);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* ---- RECOMMENDATIONS ---- */
export const getRecommendations = createAsyncThunk(
  "programs/recommendations",
  async (_, thunkAPI) => {
    try {
      return await programService.getRecommendedPrograms();
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* ---- CREATE / UPDATE / DELETE ---- */
export const createProgram = createAsyncThunk(
  "programs/create",
  async (formData, thunkAPI) => {
    try {
      return await programService.createProgram(formData);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const updateProgram = createAsyncThunk(
  "programs/update",
  async ({ id, formData }, thunkAPI) => {
    try {
      return await programService.updateProgram(id, formData);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const deleteProgram = createAsyncThunk(
  "programs/delete",
  async (id, thunkAPI) => {
    try {
      return await programService.deleteProgram(id);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* ============================================================
   ENROLLMENT
============================================================ */

export const enrollProgram = createAsyncThunk(
  "programs/enroll",
  async (id, thunkAPI) => {
    try {
      return await programService.enroll(id);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const buyProgram = createAsyncThunk(
  "programs/buy",
  async (id, thunkAPI) => {
    try {
      return await programService.buyProgram(id);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const leaveProgram = createAsyncThunk(
  "programs/leave",
  async (id, thunkAPI) => {
    try {
      return await programService.leaveProgram(id);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* ============================================================
   MODULE COMPLETION
============================================================ */

export const completeModule = createAsyncThunk(
  "programs/completeModule",
  async ({ programId, moduleOrder }, thunkAPI) => {
    try {
      return await programService.completeModule(programId, moduleOrder);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* ============================================================
   REVIEWS & COMMENTS
============================================================ */

export const addReview = createAsyncThunk(
  "programs/addReview",
  async ({ id, payload }, thunkAPI) => {
    try {
      return await programService.addReview(id, payload);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const addComment = createAsyncThunk(
  "programs/addComment",
  async ({ id, payload }, thunkAPI) => {
    try {
      return await programService.addComment(id, payload);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const deleteProgramReview = createAsyncThunk(
  "programs/deleteReview",
  async ({ programId, reviewId }, thunkAPI) => {
    try {
      return await programService.deleteReview(programId, reviewId);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const deleteProgramComment = createAsyncThunk(
  "programs/deleteComment",
  async ({ programId, commentId }, thunkAPI) => {
    try {
      return await programService.deleteComment(programId, commentId);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);


/* ============================================================
   STATS & CERTIFICATE
============================================================ */

export const getProgramStats = createAsyncThunk(
  "programs/stats",
  async (id, thunkAPI) => {
    try {
      return await programService.getProgramStats(id);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const getParticipants = createAsyncThunk(
  "programs/participants",
  async (id, thunkAPI) => {
    try {
      return await programService.getParticipants(id);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const getCertificate = createAsyncThunk(
  "programs/certificate",
  async (id, thunkAPI) => {
    try {
      return await programService.getCertificate(id);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message);
    }
  }
);

/* ============================================================
   SLICE
============================================================ */

const initialState = {
  programs: [],
  publicPrograms: [],
  myPrograms: [],
  continuePrograms: [],
  completedPrograms: [],
  program: null,
  recommendations: [],
  loading: false,
  error: null,

  // ⭐ Enrollment Tracking
  enrolledPrograms: [], // [programId]
  progress: {},         // { [programId]: number }
};

const programSlice = createSlice({
  name: "programs",
  initialState,
  reducers: {
    clearProgram: (state) => {
      state.program = null;
    },
  },

  extraReducers: (builder) => {
    const autoHandled = [
      fetchPublicPrograms,
      fetchAllPrograms,
      fetchMyPrograms,
      fetchContinuePrograms,
      fetchCompletedPrograms,
      searchPrograms,
      getRecommendations,
      createProgram,
      updateProgram,
      deleteProgram,
      enrollProgram,
      leaveProgram,
      buyProgram,
      completeModule,
      addReview,
      addComment,
      getProgramStats,
      getParticipants,
      getCertificate,
      fetchProgram,
      deleteProgramReview,
      deleteProgramComment
    ];

    autoHandled.forEach((t) => {
      builder.addCase(t.pending, (state) => {
        state.loading = true;
        state.error = null;
      });
      builder.addCase(t.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Something went wrong";
      });
    });

    /* ============================================================
       SPECIFIC FULFILLED HANDLERS
    ============================================================ */

    /* ---- PUBLIC PROGRAMS ---- */
    builder.addCase(fetchPublicPrograms.fulfilled, (state, action) => {
      state.loading = false;
      state.publicPrograms = action.payload.programs || action.payload;
    });

    /* ---- ALL PROGRAMS ---- */
    builder.addCase(fetchAllPrograms.fulfilled, (state, action) => {
      state.loading = false;
      state.programs = action.payload.programs || action.payload;
    });

    /* ==================================================================
       FETCH SINGLE PROGRAM → SYNC ENROLLMENT
    ================================================================== */
    builder.addCase(fetchProgram.fulfilled, (state, action) => {
      state.loading = false;

      const response = action.payload?.data || action.payload;

      const program = response?.program || response;
      const programId = program?._id;

      const isEnrolled = response?.isEnrolled || false;
      const userProgress = response?.userProgress || { progress: 0 };

      state.program = {
        ...program,
        isEnrolled,
        userProgress,
      };

      if (programId) {
        if (isEnrolled) {
          if (!state.enrolledPrograms.includes(programId)) {
            state.enrolledPrograms.push(programId);
          }
          state.progress[programId] = userProgress.progress || 0;
        } else {
          state.enrolledPrograms = state.enrolledPrograms.filter(
            (id) => id !== programId
          );
          delete state.progress[programId];
        }
      }
    });

    /* ---- MY PROGRAMS ---- */
    builder.addCase(fetchMyPrograms.fulfilled, (state, action) => {
      state.loading = false;
      state.myPrograms = action.payload;
    });

    /* ---- CONTINUE ---- */
    builder.addCase(fetchContinuePrograms.fulfilled, (state, action) => {
      state.loading = false;
      state.continuePrograms = action.payload;
    });

    /* ---- COMPLETED ---- */
    builder.addCase(fetchCompletedPrograms.fulfilled, (state, action) => {
      state.loading = false;
      state.completedPrograms = action.payload;
    });

    /* ---- RECOMMENDATIONS ---- */
    builder.addCase(getRecommendations.fulfilled, (state, action) => {
      state.loading = false;
      state.recommendations =
        action.payload?.recommendedPrograms || action.payload;
    });

    /* ============================================================
       ENROLL PROGRAM SUCCESS
    ============================================================ */
    builder.addCase(enrollProgram.fulfilled, (state, action) => {
      state.loading = false;

      const programId = action.meta.arg;
      const payload = action.payload?.data || action.payload;

      const userProgress = payload?.userProgress || { progress: 0 };

      if (!state.enrolledPrograms.includes(programId)) {
        state.enrolledPrograms.push(programId);
      }

      state.progress[programId] = userProgress.progress || 0;

      if (state.program && state.program._id === programId) {
        state.program.isEnrolled = true;
        state.program.userProgress = userProgress;
      }
    });

    // REVIEW DELETE HANDLER
    builder.addCase(deleteProgramReview.fulfilled, (state, action) => {
      state.loading = false;

      const { reviewId, reviews } = action.payload;

      // Prefer backend-updated list
      if (Array.isArray(reviews)) {
        if (state.program) {
          state.program.reviews = reviews;
        }
        return;
      }

      // Local fallback (backend didn't send list)
      if (state.program?.reviews) {
        state.program.reviews = state.program.reviews.filter(
          (rev) => rev._id?.toString() !== reviewId.toString()
        );
      }
    });

    // COMMENT DELETE HANDLER
    builder.addCase(deleteProgramComment.fulfilled, (state, action) => {
      state.loading = false;

      const { commentId, comments } = action.payload;

      // Prefer backend-updated list
      if (Array.isArray(comments)) {
        if (state.program) {
          state.program.comments = comments;
        }
        return;
      }

      // Local fallback (backend didn't send new array)
      if (state.program?.comments) {
        state.program.comments = state.program.comments.filter(
          (c) =>
            c._id?.toString() !== commentId.toString() &&
            c.parent?.toString() !== commentId.toString() // also remove replies
        );
      }
    });


    /* ============================================================
       UNENROLL PROGRAM SUCCESS
    ============================================================ */
    builder.addCase(leaveProgram.fulfilled, (state, action) => {
      state.loading = false;

      const programId = action.meta.arg;

      // Remove from enrolled list
      state.enrolledPrograms = state.enrolledPrograms.filter(
        (id) => id !== programId
      );

      // Remove progress
      delete state.progress[programId];

      // Update current program
      if (state.program && state.program._id === programId) {
        state.program.isEnrolled = false;
        state.program.userProgress = { progress: 0 };
      }
    });

    builder.addCase(addReview.fulfilled, (state, action) => {
      state.loading = false;

      // If current program is opened, push review into it
      if (state.program) {
        const response = action.payload?.data || action.payload;

        state.program.reviews = [
          ...(state.program.reviews || []),
          response.review || response, // backend returns simple "Review submitted"
        ];
      }
    });

  },
});

export const { clearProgram } = programSlice.actions;
export default programSlice.reducer;
