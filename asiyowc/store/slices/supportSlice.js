// store/slices/supportSlice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { supportService } from "../../services/support";

/* ============================================================
   INITIAL STATE
============================================================ */

const initialState = {
    submittingSupport: false,
    submittingFeedback: false,

    supportSuccess: false,
    feedbackSuccess: false,

    supportResponse: null,
    feedbackResponse: null,

    error: null,
};



/* ============================================================
   SUBMIT SUPPORT TICKET
============================================================ */

export const submitSupportTicket = createAsyncThunk(
    "support/submitSupportTicket",
    async (payload, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.token;

            const data = await supportService.createSupportTicket(
                payload,
                token
            );

            return data;
        } catch (err) {
            return thunkAPI.rejectWithValue(
                err.response?.data || err.message
            );
        }
    }
);



/* ============================================================
   SUBMIT FEEDBACK
============================================================ */

export const submitFeedback = createAsyncThunk(
    "support/submitFeedback",
    async (payload, thunkAPI) => {
        try {
            const token = thunkAPI.getState().auth.token;

            const data = await supportService.createFeedback(
                payload,
                token
            );

            return data;
        } catch (err) {
            return thunkAPI.rejectWithValue(
                err.response?.data || err.message
            );
        }
    }
);



/* ============================================================
   SLICE
============================================================ */

const supportSlice = createSlice({
    name: "support",
    initialState,

    reducers: {

        /* ============================================================
           RESET SUPPORT STATE
        ============================================================ */
        resetSupportState: (state) => {
            state.supportSuccess = false;
            state.supportResponse = null;
            state.error = null;
        },


        /* ============================================================
           RESET FEEDBACK STATE
        ============================================================ */
        resetFeedbackState: (state) => {
            state.feedbackSuccess = false;
            state.feedbackResponse = null;
            state.error = null;
        },


        /* ============================================================
           RESET ALL
        ============================================================ */
        resetSupportSlice: () => initialState,
    },



    /* ============================================================
       EXTRA REDUCERS
    ============================================================ */

    extraReducers: (builder) => {

        /* ================= SUPPORT TICKET ================= */

        builder
            .addCase(submitSupportTicket.pending, (state) => {
                state.submittingSupport = true;
                state.supportSuccess = false;
                state.error = null;
            })

            .addCase(submitSupportTicket.fulfilled, (state, action) => {
                state.submittingSupport = false;
                state.supportSuccess = true;
                state.supportResponse = action.payload;
            })

            .addCase(submitSupportTicket.rejected, (state, action) => {
                state.submittingSupport = false;
                state.error = action.payload || "Failed to submit support ticket";
            });



        /* ================= FEEDBACK ================= */

        builder
            .addCase(submitFeedback.pending, (state) => {
                state.submittingFeedback = true;
                state.feedbackSuccess = false;
                state.error = null;
            })

            .addCase(submitFeedback.fulfilled, (state, action) => {
                state.submittingFeedback = false;
                state.feedbackSuccess = true;
                state.feedbackResponse = action.payload;
            })

            .addCase(submitFeedback.rejected, (state, action) => {
                state.submittingFeedback = false;
                state.error = action.payload || "Failed to submit feedback";
            });

    },
});



/* ============================================================
   EXPORT ACTIONS
============================================================ */

export const {
    resetSupportState,
    resetFeedbackState,
    resetSupportSlice,
} = supportSlice.actions;



/* ============================================================
   EXPORT REDUCER
============================================================ */

export default supportSlice.reducer;