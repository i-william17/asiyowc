import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { marketplaceService } from "../../services/marketplace";

/* ============================================================
   INITIAL STATE
============================================================ */
const initialState = {
    /* ================= OVERVIEW ================= */
    overview: null,
    overviewLoading: false,

    /* ================= LIST ================= */
    entities: [],
    entitiesLoading: false,

    /* ================= SELECTED ================= */
    selectedEntity: null,
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
        entity: "products", // products | skills | jobs | funding | orders | intents
        page: 1,
        limit: 20,
        search: "",
        category: "",
        status: "",
        sort: "newest",
    },

    /* ================= ACTION STATE ================= */
    actionLoading: false,
    error: null,
};

/* ============================================================
   ASYNC THUNKS
============================================================ */

/* ================= OVERVIEW ================= */
export const fetchMarketplaceOverview = createAsyncThunk(
    "marketplace/fetchOverview",
    async (_, { getState, rejectWithValue }) => {
        try {
            const token = getState().auth.token;
            const res = await marketplaceService.getOverview(token);
            return res.data;
        } catch (err) {
            return rejectWithValue(
                err?.response?.data?.message || "Failed to fetch marketplace overview"
            );
        }
    }
);

/* ================= LIST ENTITIES ================= */
export const fetchEntities = createAsyncThunk(
    "marketplace/fetchEntities",
    async (_, { getState, rejectWithValue }) => {
        try {
            const { filters } = getState().marketplace;
            const token = getState().auth.token;

            const { entity, ...params } = filters;

            const res = await marketplaceService.listEntity(
                entity,
                params,
                token
            );

            return res.data;
        } catch (err) {
            return rejectWithValue(
                err?.response?.data?.message || "Failed to fetch marketplace data"
            );
        }
    }
);

/* ================= FETCH BY ID ================= */
export const fetchEntityById = createAsyncThunk(
    "marketplace/fetchEntityById",
    async ({ entity, id }, { getState, rejectWithValue }) => {
        try {
            const token = getState().auth.token;

            const res = await marketplaceService.getEntityById(
                entity,
                id,
                token
            );

            return res.data.data; // ✅ FIX HERE
        } catch (err) {
            return rejectWithValue(
                err?.response?.data?.message || "Failed to fetch entity details"
            );
        }
    }
);

/* ================= CREATE ================= */
export const createEntity = createAsyncThunk(
    "marketplace/createEntity",
    async ({ entity, payload }, { getState, rejectWithValue }) => {
        try {
            const token = getState().auth.token;

            const res = await marketplaceService.createEntity(
                entity,
                payload,
                token
            );

            return res.data;
        } catch (err) {
            return rejectWithValue(
                err?.response?.data?.message || "Failed to create entity"
            );
        }
    }
);

/* ================= UPDATE ================= */
export const updateEntity = createAsyncThunk(
    "marketplace/updateEntity",
    async ({ entity, id, payload }, { getState, rejectWithValue }) => {
        try {
            const token = getState().auth.token;

            const res = await marketplaceService.updateEntity(
                entity,
                id,
                payload,
                token
            );

            return res.data;
        } catch (err) {
            return rejectWithValue(
                err?.response?.data?.message || "Failed to update entity"
            );
        }
    }
);

/* ================= DELETE ================= */
export const deleteEntity = createAsyncThunk(
    "marketplace/deleteEntity",
    async ({ entity, id }, { getState, rejectWithValue }) => {
        try {
            const token = getState().auth.token;

            await marketplaceService.deleteEntity(entity, id, token);

            return id;
        } catch (err) {
            return rejectWithValue(
                err?.response?.data?.message || "Failed to delete entity"
            );
        }
    }
);

/* ============================================================
   SLICE
============================================================ */
const marketplaceSlice = createSlice({
    name: "marketplace",
    initialState,
    reducers: {
        setMarketplaceFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
        },

        clearSelectedEntity: (state) => {
            state.selectedEntity = null;
        },

        clearMarketplaceError: (state) => {
            state.error = null;
        },
    },

    extraReducers: (builder) => {
        /* ================= OVERVIEW ================= */
        builder
            .addCase(fetchMarketplaceOverview.pending, (state) => {
                state.overviewLoading = true;
            })
            .addCase(fetchMarketplaceOverview.fulfilled, (state, action) => {
                state.overviewLoading = false;
                state.overview = action.payload;
            })
            .addCase(fetchMarketplaceOverview.rejected, (state, action) => {
                state.overviewLoading = false;
                state.error = action.payload;
            });

        /* ================= LIST ================= */
        builder
            .addCase(fetchEntities.pending, (state) => {
                state.entitiesLoading = true;
            })
            .addCase(fetchEntities.fulfilled, (state, action) => {
                state.entitiesLoading = false;

                const { data, page, pages, total, limit } = action.payload || {};

                state.entities = data || [];

                state.pagination = {
                    page: page || 1,
                    pages: pages || 1,
                    total: total || 0,
                    limit: limit || 20,
                };
            })
            .addCase(fetchEntities.rejected, (state, action) => {
                state.entitiesLoading = false;
                state.error = action.payload;
            });

        /* ================= FETCH DETAIL ================= */
        builder
            .addCase(fetchEntityById.pending, (state) => {
                state.selectedLoading = true;
            })
            .addCase(fetchEntityById.fulfilled, (state, action) => {
                state.selectedLoading = false;
                state.selectedEntity = action.payload;
            })
            .addCase(fetchEntityById.rejected, (state, action) => {
                state.selectedLoading = false;
                state.error = action.payload;
            });

        /* ================= CREATE ================= */
        builder
            .addCase(createEntity.pending, (state) => {
                state.actionLoading = true;
            })
            .addCase(createEntity.fulfilled, (state) => {
                state.actionLoading = false;
            })
            .addCase(createEntity.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload;
            });

        /* ================= UPDATE ================= */
        builder
            .addCase(updateEntity.pending, (state) => {
                state.actionLoading = true;
            })
            .addCase(updateEntity.fulfilled, (state) => {
                state.actionLoading = false;
            })
            .addCase(updateEntity.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload;
            });

        /* ================= DELETE ================= */
        builder
            .addCase(deleteEntity.pending, (state) => {
                state.actionLoading = true;
            })
            .addCase(deleteEntity.fulfilled, (state, action) => {
                state.actionLoading = false;

                state.entities = state.entities.filter(
                    (item) => item._id !== action.payload
                );
            })
            .addCase(deleteEntity.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload;
            });
    },
});

/* ============================================================
   EXPORTS
============================================================ */
export const {
    setMarketplaceFilters,
    clearSelectedEntity,
    clearMarketplaceError,
} = marketplaceSlice.actions;

export default marketplaceSlice.reducer;
