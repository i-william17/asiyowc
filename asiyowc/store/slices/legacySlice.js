import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { legacyService } from "../../services/legacy";

/* =====================================================
   ASYNC THUNKS
===================================================== */

// Fetch paginated tributes
export const fetchTributes = createAsyncThunk(
    "legacy/fetchTributes",
    async (params) => {
        return await legacyService.fetchTributes(params);
    }
);

// Fetch single tribute
export const fetchTributeById = createAsyncThunk(
    "legacy/fetchTributeById",
    async (id) => {
        return await legacyService.fetchTributeById(id);
    }
);

// Create tribute
export const createTribute = createAsyncThunk(
    "legacy/createTribute",
    async ({ payload, token }) => {
        return await legacyService.createTribute(payload, token);
    }
);

// Update tribute
export const updateTribute = createAsyncThunk(
    "legacy/updateTribute",
    async ({ id, payload, token }) => {
        return await legacyService.updateTribute(id, payload, token);
    }
);

// Delete tribute
export const deleteTribute = createAsyncThunk(
    "legacy/deleteTribute",
    async ({ id, token }) => {
        await legacyService.deleteTribute(id, token);
        return id;
    }
);

// Toggle like tribute
export const toggleLikeTribute = createAsyncThunk(
    "legacy/toggleLikeTribute",
    async ({ id, token }) => {
        return await legacyService.toggleLikeTribute(id, token);
    }
);

// Add comment
export const addTributeComment = createAsyncThunk(
    "legacy/addTributeComment",
    async ({ tributeId, payload, token }) => {
        return {
            tributeId,
            comment: await legacyService.addTributeComment(
                tributeId,
                payload,
                token
            ),
        };
    }
);

// Delete comment
export const deleteTributeComment = createAsyncThunk(
    "legacy/deleteTributeComment",
    async ({ tributeId, commentId, token }) => {
        await legacyService.deleteTributeComment(
            tributeId,
            commentId,
            token
        );
        return { tributeId, commentId };
    }
);

// Toggle like comment
export const toggleLikeComment = createAsyncThunk(
    "legacy/toggleLikeComment",
    async ({ tributeId, commentId, token }) => {
        return {
            tributeId,
            commentId,
            ...(await legacyService.toggleLikeComment(
                tributeId,
                commentId,
                token
            )),
        };
    }
);

/* =====================================================
   SLICE
===================================================== */

const legacySlice = createSlice({
    name: "legacy",

    initialState: {
        tributes: [],
        selectedTribute: null,
        pagination: null,
        loading: false,
        error: null,
        limitReached: false,
    },

    reducers: {
        clearSelectedTribute(state) {
            state.selectedTribute = null;
        },
        optimisticLike(state, action) {
            const { id, userId } = action.payload;

            const tribute = state.tributes.find(t => t._id === id);
            if (!tribute) return;

            tribute.likedBy = tribute.likedBy || [];

            const hasLiked = tribute.likedBy.includes(userId);

            if (hasLiked) {
                tribute.likes = Math.max(0, tribute.likes - 1);
                tribute.likedBy = tribute.likedBy.filter(u => u !== userId);
            } else {
                tribute.likes += 1;
                tribute.likedBy.push(userId);
            }
        }
    },

    extraReducers: (builder) => {
        builder

            /* ================= FETCH TRIBUTES ================= */
            .addCase(fetchTributes.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchTributes.fulfilled, (state, action) => {
                state.loading = false;
                state.limitReached =
                    action.payload.pagination.page >=
                    action.payload.pagination.totalPages;

                const incoming = action.payload.data || [];

                if (action.meta.arg?.page > 1) {
                    // pagination → append
                    state.tributes.push(...incoming);
                } else {
                    // first load → replace
                    state.tributes = incoming;
                }

                state.pagination = action.payload.pagination;
            })
            .addCase(fetchTributes.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })

            /* ================= FETCH SINGLE ================= */
            .addCase(fetchTributeById.fulfilled, (state, action) => {
                state.selectedTribute = action.payload;
            })

            /* ================= CREATE ================= */
            .addCase(createTribute.fulfilled, (state, action) => {
                state.tributes.unshift(action.payload);
            })

            /* ================= UPDATE ================= */
            .addCase(updateTribute.fulfilled, (state, action) => {
                const idx = state.tributes.findIndex(
                    (t) => t._id === action.payload._id
                );
                if (idx !== -1) {
                    state.tributes[idx] = action.payload;
                }
            })

            /* ================= DELETE ================= */
            .addCase(deleteTribute.fulfilled, (state, action) => {
                state.tributes = state.tributes.filter(
                    (t) => t._id !== action.payload
                );
            })

            /* ================= LIKE TRIBUTE ================= */
            .addCase(toggleLikeTribute.fulfilled, (state, action) => {
                const updated = action.payload;
                const tribute = state.tributes.find(
                    (t) => t._id === updated._id
                );
                if (!tribute) return;

                tribute.likes = updated.likes;
                tribute.likedBy = updated.likedBy || tribute.likedBy;
            })

            /* ================= ADD COMMENT ================= */
            .addCase(addTributeComment.fulfilled, (state, action) => {
                const tribute = state.tributes.find(
                    (t) => t._id === action.payload.tributeId
                );
                if (tribute) {
                    tribute.comments = tribute.comments || [];
                    tribute.comments.push(action.payload.comment);
                }

            })

            /* ================= DELETE COMMENT ================= */
            .addCase(deleteTributeComment.fulfilled, (state, action) => {
                const tribute = state.tributes.find(
                    (t) => t._id === action.payload.tributeId
                );
                if (tribute && tribute.comments) {
                    tribute.comments = tribute.comments.filter(
                        (c) => c._id !== action.payload.commentId
                    );
                }
            })

            /* ================= LIKE COMMENT ================= */
            .addCase(toggleLikeComment.fulfilled, (state, action) => {
                const tribute = state.tributes.find(
                    (t) => t._id === action.payload.tributeId
                );
                if (!tribute) return;

                const comment = tribute.comments.find(
                    (c) => c._id === action.payload.commentId
                );
                if (comment) {
                    comment.likes = action.payload.likes;
                }
            });
    },
});

export const { clearSelectedTribute, optimisticLike } = legacySlice.actions;

export default legacySlice.reducer;
