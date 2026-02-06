import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { wellnessService } from "../../services/wellness";



/* ============================================================
   THUNKS
============================================================ */

/* ================= JOURNAL ================= */

export const fetchTodayJournal = createAsyncThunk(
    "wellness/fetchTodayJournal",
    async (token, thunkAPI) => {
        try {
            return await wellnessService.getTodayJournal(token);
        } catch (err) {
            return thunkAPI.rejectWithValue(err.message);
        }
    }
);


export const saveJournal = createAsyncThunk(
    "wellness/saveJournal",
    async ({ payload, token }, thunkAPI) => {
        try {
            return await wellnessService.saveJournal(payload, token);
        } catch (err) {
            return thunkAPI.rejectWithValue(err.message);
        }
    }
);


export const fetchJournalHistory = createAsyncThunk(
    "wellness/fetchJournalHistory",
    async (token, thunkAPI) => {
        try {
            return await wellnessService.getJournalHistory(token);
        } catch (err) {
            return thunkAPI.rejectWithValue(err.message);
        }
    }
);



/* ================= RETREATS ================= */

export const fetchRetreats = createAsyncThunk(
    "wellness/fetchRetreats",
    async (token, thunkAPI) => {
        try {
            return await wellnessService.getRetreats(token);
        } catch (err) {
            return thunkAPI.rejectWithValue(err.message);
        }
    }
);


export const fetchRetreatById = createAsyncThunk(
    "wellness/fetchRetreatById",
    async ({ id, token }, thunkAPI) => {
        try {
            return await wellnessService.getRetreatById(id, token);
        } catch (err) {
            return thunkAPI.rejectWithValue(err.message);
        }
    }
);


export const joinRetreat = createAsyncThunk(
    "wellness/joinRetreat",
    async ({ id, token }, thunkAPI) => {
        try {
            await wellnessService.joinRetreat(id, token);
            return id;
        } catch (err) {
            return thunkAPI.rejectWithValue(err.message);
        }
    }
);


export const updateRetreatProgress = createAsyncThunk(
    "wellness/updateRetreatProgress",
    async ({ id, payload, token }, thunkAPI) => {
        try {
            const res = await wellnessService.updateRetreatProgress(id, payload, token);

            return { id, ...res };
        } catch (err) {
            return thunkAPI.rejectWithValue(err.message);
        }
    }
);


export const fetchMyRetreatProgress = createAsyncThunk(
    "wellness/fetchMyRetreatProgress",
    async (token, thunkAPI) => {
        try {
            return await wellnessService.getMyRetreatProgress(token);
        } catch (err) {
            return thunkAPI.rejectWithValue(err.message);
        }
    }
);




/* ============================================================
   INITIAL STATE
============================================================ */

const initialState = {
    /* Journal */
    todayJournal: null,
    journalHistory: [],

    /* Retreats */
    retreats: [],
    selectedRetreat: null,
    myProgress: [],

    /* Global */
    loading: false,
    saving: false,
    error: null,
};




/* ============================================================
   SLICE
============================================================ */

const wellnessSlice = createSlice({
    name: "wellness",
    initialState,

    reducers: {
        clearWellnessError: (state) => {
            state.error = null;
        },

        clearSelectedRetreat: (state) => {
            state.selectedRetreat = null;
        },
    },

    extraReducers: (builder) => {
        builder

            /* =====================================================
               JOURNAL
            ===================================================== */

            .addCase(fetchTodayJournal.fulfilled, (state, action) => {
                state.loading = false;
                state.todayJournal = action.payload;
            })

            .addCase(saveJournal.fulfilled, (state, action) => {
                state.loading = false;
                state.todayJournal = action.payload;
            })

            .addCase(fetchJournalHistory.fulfilled, (state, action) => {
                state.loading = false;
                state.journalHistory = action.payload;
            })


            /* =====================================================
               RETREATS
            ===================================================== */

            .addCase(fetchRetreats.fulfilled, (state, action) => {
                state.loading = false;
                state.retreats = action.payload;
            })

            .addCase(fetchRetreatById.fulfilled, (state, action) => {
                state.loading = false;
                state.selectedRetreat = action.payload;
            })

            .addCase(fetchMyRetreatProgress.fulfilled, (state, action) => {
                state.loading = false;
                state.myProgress = action.payload;
            })


            /* =====================================================
               JOIN (optimistic)
            ===================================================== */

            .addCase(joinRetreat.fulfilled, (state, action) => {
                state.loading = false;

                const retreat = state.retreats.find(r => r._id === action.payload);
                if (retreat) retreat.joined = true;
            })


            /* =====================================================
               PROGRESS UPDATE (optimistic)
            ===================================================== */

            .addCase(updateRetreatProgress.fulfilled, (state, action) => {
                state.loading = false;

                const { id, progress, completed } = action.payload;

                if (state.selectedRetreat?._id === id) {
                    state.selectedRetreat.myProgress = { progress, completed };
                }
            })


            /* =====================================================
               GLOBAL MATCHERS (MUST BE LAST)
            ===================================================== */

            .addMatcher(
                (action) => action.type.endsWith("/pending"),
                (state) => {
                    state.loading = true;
                    state.error = null;
                }
            )

            .addMatcher(
                (action) => action.type.endsWith("/rejected"),
                (state, action) => {
                    state.loading = false;
                    state.error = action.payload;
                }
            );
    }

});



/* ============================================================
   EXPORTS
============================================================ */

export const {
    clearWellnessError,
    clearSelectedRetreat,
} = wellnessSlice.actions;

export default wellnessSlice.reducer;
