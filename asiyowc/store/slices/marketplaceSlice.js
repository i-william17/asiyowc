// store/slices/marketplaceSlice.js
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { marketplaceService } from "../../services/marketplace";

/**
 * IMPORTANT:
 * - This slice DOES NOT handle cart state (you already have cartSlice).
 * - This slice handles marketplace data: products, favorites, checkout, orders,
 *   jobs, funding, skills, search, stats + pagination and per-action loading/errors.
 *
 * ✅ ARCHITECTURE FIX:
 * - NEVER pass token manually from components
 * - ALWAYS get token inside thunk: const token = getState().auth.token;
 * - All thunks now self-contained and impossible to forget token
 *
 * Backend routes assumed (based on your routes):
 * - GET    /marketplace/products
 * - GET    /marketplace/products/me
 * - GET    /marketplace/products/:productId
 * - POST   /marketplace/products
 * - PUT    /marketplace/products/:productId
 * - DELETE /marketplace/products/:productId
 * - POST   /marketplace/products/:productId/favorite
 * - POST   /marketplace/products/:productId/checkout     (UPDATED: accepts { items: [...] })
 * - POST   /marketplace/products/checkout/complete
 * - GET    /marketplace/orders/me
 * - POST   /marketplace/jobs
 * - GET    /marketplace/jobs
 * - GET    /marketplace/jobs/:jobId
 * - POST   /marketplace/jobs/:jobId/apply
 * - POST   /marketplace/funding
 * - GET    /marketplace/funding
 * - POST   /marketplace/funding/:fundingId/apply
 * - POST   /marketplace/skills
 * - GET    /marketplace/skills
 * - POST   /marketplace/skills/:skillId/request
 * - POST   /marketplace/skills/:skillId/request/:requestId/respond
 * - GET    /marketplace/search
 * - GET    /marketplace/stats
 */

/* =====================================================
   SMALL HELPERS
===================================================== */

const safeArr = (x) => (Array.isArray(x) ? x : []);
const safeObj = (x) => (x && typeof x === "object" ? x : {});
const toStr = (x) => (x == null ? "" : String(x));

const getId = (x) => {
    if (!x) return "";
    if (typeof x === "string") return x;
    if (typeof x === "object") return toStr(x._id || x.id);
    return toStr(x);
};

const normalizeProductFromBackend = (p) => {
    const obj = safeObj(p);
    // Your frontend ProductCard expects:
    // { id, name, image, seller, rating, reviews, price, category }
    // Backend product fields: { _id, title, images[], sellerName, seller, rating, reviews, price, category, ... }
    const images = safeArr(obj.images);
    const sellerName =
        obj.sellerName ||
        obj.seller?.profile?.fullName ||
        obj.seller?.username ||
        "Unknown";

    return {
        ...obj,
        id: obj.id || obj._id || obj.productId || obj.intentProductId,
        name: obj.name || obj.title || "Product",
        image: obj.image || images[0] || null,
        seller: obj.sellerDisplay || sellerName,
        rating: obj.rating?.average ?? obj.rating ?? 0,
        reviews: obj.reviews?.count ?? obj.reviews ?? 0,
        price: Number(obj.price || 0),
        category: obj.category || "General",
    };
};

const normalizeJob = (j) => safeObj(j);
const normalizeFunding = (f) => safeObj(f);
const normalizeSkill = (s) => safeObj(s);
const normalizeOrder = (o) => safeObj(o);

// 🔴 FIX 2: limit changed from 20 to 10
const buildPagination = (payload) => ({
    page: Number(payload?.page || 1),
    limit: Number(payload?.limit || 10),
    totalCount: Number(payload?.total || 0),
    totalPages: Number(payload?.totalPages || 1),
});

/* =====================================================
   STATE SHAPE
===================================================== */

const initialState = {
    // PRODUCTS
    products: [],
    // 🔴 FIX 2: limit changed from 20 to 10
    productsPagination: { page: 1, limit: 10, totalCount: 0, totalPages: 1 },
    productsQuery: {
        category: "",
        minPrice: "",
        maxPrice: "",
        condition: "",
        location: "",
        search: "",
        sortBy: "newest",
        sellerId: "",
    },

    myProducts: [],
    // 🔴 FIX 2: limit changed from 20 to 10
    myProductsPagination: { page: 1, limit: 10, totalCount: 0, totalPages: 1 },

    activeProduct: null,
    activeProductMeta: {
        isSeller: false,
        isFavorite: false,
        formattedPrice: "",
    },

    // FAVORITES (client-side convenience)
    favIds: {}, // { [productId]: true }
    favoritesCountById: {}, // { [productId]: number }

    // CHECKOUT
    checkout: null, // { intentId, redirectUrl, ... }
    checkoutStatus: "idle", // idle | loading | ready | error
    checkoutError: null,

    // ORDERS
    myOrders: [],
    // 🔴 FIX 2: limit changed from 20 to 10
    myOrdersPagination: { page: 1, limit: 10, totalCount: 0, totalPages: 1 },

    // JOBS
    jobs: [],
    // 🔴 FIX 2: limit changed from 20 to 10
    jobsPagination: { page: 1, limit: 10, totalCount: 0, totalPages: 1 },

    activeJob: null,

    // FUNDING
    funding: [],
    // 🔴 FIX 2: limit changed from 20 to 10
    fundingPagination: { page: 1, limit: 10, totalCount: 0, totalPages: 1 },

    // SKILLS
    skills: [],
    // 🔴 FIX 2: limit changed from 20 to 10
    skillsPagination: { page: 1, limit: 10, totalCount: 0, totalPages: 1 },

    // SEARCH
    searchResults: {
        products: [],
        jobs: [],
        funding: [],
        skills: [],
    },
    // 🔴 FIX 2: limit changed from 20 to 10
    searchMeta: { query: "", category: "", pagination: { page: 1, limit: 10 } },

    // STATS
    stats: null,

    // GLOBAL STATUS (kept granular too)
    loading: {
        products: false,
        myProducts: false,
        productById: false,
        createProduct: false,
        updateProduct: false,
        deleteProduct: false,
        toggleFavorite: false,
        checkout: false,
        completeCheckout: false,
        orders: false,

        jobs: false,
        jobById: false,
        jobApply: false,
        jobCreate: false,

        funding: false,
        fundingCreate: false,
        fundingApply: false,

        skills: false,
        skillCreate: false,
        skillRequest: false,
        skillRespond: false,

        search: false,
        stats: false,
    },
    error: {
        products: null,
        myProducts: null,
        productById: null,
        createProduct: null,
        updateProduct: null,
        deleteProduct: null,
        toggleFavorite: null,
        checkout: null,
        completeCheckout: null,
        orders: null,

        jobs: null,
        jobById: null,
        jobApply: null,
        jobCreate: null,

        funding: null,
        fundingCreate: null,
        fundingApply: null,

        skills: null,
        skillCreate: null,
        skillRequest: null,
        skillRespond: null,

        search: null,
        stats: null,
    },
};

/* =====================================================
   THUNKS: PRODUCTS
   ✅ ALL THUNKS NOW SELF-AUTHENTICATE
   ✅ NO TOKEN PARAMETERS PASSED FROM COMPONENTS
   ✅ TOKEN FETCHED VIA getState().auth.token
===================================================== */

export const fetchProducts = createAsyncThunk(
    "marketplace/fetchProducts",
    async ({ params = {} } = {}, { rejectWithValue, getState }) => {
        try {
            const token = getState().auth.token;
            const res = await marketplaceService.getAllProducts(token, params);
            return res;
        } catch (e) {
            return rejectWithValue(e?.response?.data?.message || e.message || "Failed to fetch products");
        }
    }
);

export const fetchMyProducts = createAsyncThunk(
    "marketplace/fetchMyProducts",
    async ({ params = {} } = {}, { rejectWithValue, getState }) => {
        try {
            const token = getState().auth.token;
            const res = await marketplaceService.getMyProducts(token, params);
            return res;
        } catch (e) {
            return rejectWithValue(e?.response?.data?.message || e.message || "Failed to fetch my products");
        }
    }
);

export const fetchProductById = createAsyncThunk(
    "marketplace/fetchProductById",
    async ({ productId }, { rejectWithValue, getState }) => {
        try {
            const token = getState().auth.token;
            const res = await marketplaceService.getProductById(productId, token);
            return res;
        } catch (e) {
            return rejectWithValue(e?.response?.data?.message || e.message || "Failed to fetch product");
        }
    }
);

export const createProduct = createAsyncThunk(
    "marketplace/createProduct",
    async ({ payload }, { rejectWithValue, getState }) => {
        try {
            const token = getState().auth.token;
            const res = await marketplaceService.createProduct(payload, token);
            return res;
        } catch (e) {
            return rejectWithValue(e?.response?.data?.message || e.message || "Failed to create product");
        }
    }
);

export const updateProduct = createAsyncThunk(
    "marketplace/updateProduct",
    async ({ productId, payload }, { rejectWithValue, getState }) => {
        try {
            const token = getState().auth.token;
            const res = await marketplaceService.updateProduct(productId, payload, token);
            return res;
        } catch (e) {
            return rejectWithValue(e?.response?.data?.message || e.message || "Failed to update product");
        }
    }
);

export const deleteProduct = createAsyncThunk(
    "marketplace/deleteProduct",
    async ({ productId }, { rejectWithValue, getState }) => {
        try {
            const token = getState().auth.token;
            const res = await marketplaceService.deleteProduct(productId, token);
            return { ...res, productId };
        } catch (e) {
            return rejectWithValue(e?.response?.data?.message || e.message || "Failed to delete product");
        }
    }
);

export const toggleFavoriteProduct = createAsyncThunk(
    "marketplace/toggleFavoriteProduct",
    async ({ productId }, { rejectWithValue, getState }) => {
        try {
            const token = getState().auth.token;
            const res = await marketplaceService.toggleFavoriteProduct(productId, token);
            return { ...res, productId };
        } catch (e) {
            return rejectWithValue(e?.response?.data?.message || e.message || "Failed to toggle favorite");
        }
    }
);

/* =====================================================
   THUNKS: CHECKOUT (multi-items)
===================================================== */

export const createCartCheckout = createAsyncThunk(
    "marketplace/createCartCheckout",
    async ({ items }, { rejectWithValue, getState }) => {
        try {
            const token = getState().auth.token;
            // items: [{ productId, quantity, ...optional }]
            const res = await marketplaceService.createCartCheckout(items, token);
            return res;
        } catch (e) {
            return rejectWithValue(e?.response?.data?.message || e.message || "Failed to create checkout");
        }
    }
);

export const completeCartCheckout = createAsyncThunk(
    "marketplace/completeCartCheckout",
    async ({ payload }, { rejectWithValue, getState }) => {
        try {
            const token = getState().auth.token;
            // payload: { intentId, transactionId, amount, ... }
            const res = await marketplaceService.completeCheckout(payload, token);
            return res;
        } catch (e) {
            return rejectWithValue(e?.response?.data?.message || e.message || "Failed to complete checkout");
        }
    }
);

/* =====================================================
   THUNKS: ORDERS
===================================================== */

export const fetchMyOrders = createAsyncThunk(
    "marketplace/fetchMyOrders",
    async ({ params = {} } = {}, { rejectWithValue, getState }) => {
        try {
            const token = getState().auth.token;
            const res = await marketplaceService.getMyOrders(token, params);
            return res;
        } catch (e) {
            return rejectWithValue(e?.response?.data?.message || e.message || "Failed to fetch orders");
        }
    }
);

/* =====================================================
   THUNKS: JOBS
===================================================== */

export const createJob = createAsyncThunk(
    "marketplace/createJob",
    async ({ payload }, { rejectWithValue, getState }) => {
        try {
            const token = getState().auth.token;
            const res = await marketplaceService.createJob(payload, token);
            return res;
        } catch (e) {
            return rejectWithValue(e?.response?.data?.message || e.message || "Failed to create job");
        }
    }
);

export const fetchJobs = createAsyncThunk(
    "marketplace/fetchJobs",
    async ({ params = {} } = {}, { rejectWithValue, getState }) => {
        try {
            const token = getState().auth.token;
            const res = await marketplaceService.getAllJobs(token, params);
            return res;
        } catch (e) {
            return rejectWithValue(e?.response?.data?.message || e.message || "Failed to fetch jobs");
        }
    }
);

export const fetchJobById = createAsyncThunk(
    "marketplace/fetchJobById",
    async ({ jobId }, { rejectWithValue, getState }) => {
        try {
            const token = getState().auth.token;
            const res = await marketplaceService.getJobById(jobId, token);
            return res;
        } catch (e) {
            return rejectWithValue(e?.response?.data?.message || e.message || "Failed to fetch job");
        }
    }
);

export const applyForJob = createAsyncThunk(
    "marketplace/applyForJob",
    async ({ jobId, payload }, { rejectWithValue, getState }) => {
        try {
            const token = getState().auth.token;
            const res = await marketplaceService.applyForJob(jobId, payload, token);
            return { ...res, jobId };
        } catch (e) {
            return rejectWithValue(e?.response?.data?.message || e.message || "Failed to apply for job");
        }
    }
);

/* =====================================================
   THUNKS: FUNDING
===================================================== */

export const createFunding = createAsyncThunk(
    "marketplace/createFunding",
    async ({ payload }, { rejectWithValue, getState }) => {
        try {
            const token = getState().auth.token;
            const res = await marketplaceService.createFunding(payload, token);
            return res;
        } catch (e) {
            return rejectWithValue(e?.response?.data?.message || e.message || "Failed to create funding");
        }
    }
);

export const fetchFunding = createAsyncThunk(
    "marketplace/fetchFunding",
    async ({ params = {} } = {}, { rejectWithValue, getState }) => {
        try {
            const token = getState().auth.token;
            const res = await marketplaceService.getAllFunding(token, params);
            return res;
        } catch (e) {
            return rejectWithValue(e?.response?.data?.message || e.message || "Failed to fetch funding");
        }
    }
);

export const applyForFunding = createAsyncThunk(
    "marketplace/applyForFunding",
    async ({ fundingId, payload }, { rejectWithValue, getState }) => {
        try {
            const token = getState().auth.token;
            const res = await marketplaceService.applyForFunding(fundingId, payload, token);
            return { ...res, fundingId };
        } catch (e) {
            return rejectWithValue(e?.response?.data?.message || e.message || "Failed to apply for funding");
        }
    }
);

/* =====================================================
   THUNKS: SKILLS
===================================================== */

export const createSkill = createAsyncThunk(
    "marketplace/createSkill",
    async ({ payload }, { rejectWithValue, getState }) => {
        try {
            const token = getState().auth.token;
            const res = await marketplaceService.createSkill(payload, token);
            return res;
        } catch (e) {
            return rejectWithValue(e?.response?.data?.message || e.message || "Failed to create skill");
        }
    }
);

export const fetchSkills = createAsyncThunk(
    "marketplace/fetchSkills",
    async ({ params = {} } = {}, { rejectWithValue, getState }) => {
        try {
            const token = getState().auth.token;
            const res = await marketplaceService.getAllSkills(token, params);
            return res;
        } catch (e) {
            return rejectWithValue(e?.response?.data?.message || e.message || "Failed to fetch skills");
        }
    }
);

export const requestSkillExchange = createAsyncThunk(
    "marketplace/requestSkillExchange",
    async ({ skillId, payload }, { rejectWithValue, getState }) => {
        try {
            const token = getState().auth.token;
            const res = await marketplaceService.requestSkillExchange(skillId, payload, token);
            return { ...res, skillId };
        } catch (e) {
            return rejectWithValue(e?.response?.data?.message || e.message || "Failed to request exchange");
        }
    }
);

export const respondToSkillRequest = createAsyncThunk(
    "marketplace/respondToSkillRequest",
    async ({ skillId, requestId, payload }, { rejectWithValue, getState }) => {
        try {
            const token = getState().auth.token;
            const res = await marketplaceService.respondToSkillRequest(skillId, requestId, payload, token);
            return { ...res, skillId, requestId };
        } catch (e) {
            return rejectWithValue(e?.response?.data?.message || e.message || "Failed to respond to request");
        }
    }
);

/* =====================================================
   THUNKS: SEARCH + STATS
===================================================== */

export const searchMarketplace = createAsyncThunk(
    "marketplace/searchMarketplace",
    async ({ query, category, page = 1, limit = 10 } = {}, { rejectWithValue, getState }) => {
        try {
            const token = getState().auth.token;
            const res = await marketplaceService.searchMarketplace(token, { query, category, page, limit });
            return res;
        } catch (e) {
            return rejectWithValue(e?.response?.data?.message || e.message || "Search failed");
        }
    }
);

export const fetchMarketplaceStats = createAsyncThunk(
    "marketplace/fetchMarketplaceStats",
    async (_, { rejectWithValue, getState }) => {
        try {
            const token = getState().auth.token;
            const res = await marketplaceService.getMarketplaceStats(token);
            return res;
        } catch (e) {
            return rejectWithValue(e?.response?.data?.message || e.message || "Failed to fetch stats");
        }
    }
);

/* =====================================================
   SLICE
===================================================== */

const marketplaceSlice = createSlice({
    name: "marketplace",
    initialState,
    reducers: {
        clearMarketplaceError: (state) => {
            Object.keys(state.error).forEach((k) => (state.error[k] = null));
            state.checkoutError = null;
        },

        clearCheckout: (state) => {
            state.checkout = null;
            state.checkoutStatus = "idle";
            state.checkoutError = null;
        },

        setProductsQuery: (state, action) => {
            state.productsQuery = { ...state.productsQuery, ...(action.payload || {}) };
        },

        // convenience: allow setting fav state locally (e.g., hydrate from profile later)
        setFavIds: (state, action) => {
            const ids = action.payload;
            if (!ids) return;
            if (ids instanceof Set) {
                const obj = {};
                ids.forEach((id) => (obj[toStr(id)] = true));
                state.favIds = obj;
                return;
            }
            if (Array.isArray(ids)) {
                const obj = {};
                ids.forEach((id) => (obj[toStr(id)] = true));
                state.favIds = obj;
                return;
            }
            if (typeof ids === "object") {
                state.favIds = ids;
            }
        },

        // optional: clear active items
        clearActiveProduct: (state) => {
            state.activeProduct = null;
            state.activeProductMeta = { isSeller: false, isFavorite: false, formattedPrice: "" };
        },

        clearActiveJob: (state) => {
            state.activeJob = null;
        },

        // hard reset marketplace state (useful on logout)
        resetMarketplaceState: () => initialState,
    },
    extraReducers: (builder) => {
        /* ================= PRODUCTS: GET ALL ================= */
        builder
            .addCase(fetchProducts.pending, (state) => {
                state.loading.products = true;
                state.error.products = null;
            })
            .addCase(fetchProducts.fulfilled, (state, action) => {
                state.loading.products = false;

                const { data = [], pagination } = action.payload || {};
                const page = Number(pagination?.page || 1);
                
                // 🔴 FIX 1: Normalize ALL products before using them
                const normalized = data.map(normalizeProductFromBackend);

                if (page > 1) {
                    const existingIds = new Set(state.products.map(p => String(p.id)));
                    const newItems = normalized.filter(p => !existingIds.has(String(p.id)));
                    state.products.push(...newItems);
                } else {
                    state.products = normalized;
                }

                // 🔴 FIX 2: limit changed from 20 to 10
                state.productsPagination = pagination || { page: 1, limit: 10, totalCount: 0, totalPages: 1 };
            })
            .addCase(fetchProducts.rejected, (state, action) => {
                state.loading.products = false;
                state.error.products = action.payload || "Failed to fetch products";
            });

        /* ================= PRODUCTS: GET MY ================= */
        builder
            .addCase(fetchMyProducts.pending, (state) => {
                state.loading.myProducts = true;
                state.error.myProducts = null;
            })
            .addCase(fetchMyProducts.fulfilled, (state, action) => {
                state.loading.myProducts = false;

                const payload = safeObj(action.payload);
                const newItems = safeArr(payload.data).map(normalizeProductFromBackend);

                const page = Number(payload.page || 1);

                if (page === 1) {
                    state.myProducts = newItems;
                } else {
                    const existingIds = new Set(state.myProducts.map(p => String(p.id)));
                    const filteredNewItems = newItems.filter(p => !existingIds.has(String(p.id)));
                    state.myProducts.push(...filteredNewItems);
                }

                state.myProductsPagination = buildPagination(payload);
            })
            .addCase(fetchMyProducts.rejected, (state, action) => {
                state.loading.myProducts = false;
                state.error.myProducts = action.payload || "Failed to fetch my products";
            });

        /* ================= PRODUCTS: BY ID ================= */
        builder
            .addCase(fetchProductById.pending, (state) => {
                state.loading.productById = true;
                state.error.productById = null;
            })
            .addCase(fetchProductById.fulfilled, (state, action) => {
                state.loading.productById = false;

                const payload = safeObj(action.payload);
                const product = normalizeProductFromBackend(payload.product);

                state.activeProduct = product;
                state.activeProductMeta = {
                    isSeller: !!payload.isSeller,
                    isFavorite: !!payload.isFavorite,
                    formattedPrice: toStr(payload.formattedPrice || ""),
                };

                if (payload.isFavorite != null) {
                    const id = toStr(product.id);
                    if (payload.isFavorite) state.favIds[id] = true;
                    else delete state.favIds[id];
                }
            })
            .addCase(fetchProductById.rejected, (state, action) => {
                state.loading.productById = false;
                state.error.productById = action.payload || "Failed to fetch product";
            });

        /* ================= PRODUCTS: CREATE ================= */
        builder
            .addCase(createProduct.pending, (state) => {
                state.loading.createProduct = true;
                state.error.createProduct = null;
            })
            .addCase(createProduct.fulfilled, (state, action) => {
                state.loading.createProduct = false;

                const created = normalizeProductFromBackend(action.payload?.product);
                if (created?.id) {
                    state.myProducts = [created, ...state.myProducts];
                    state.products = [created, ...state.products];
                }
            })
            .addCase(createProduct.rejected, (state, action) => {
                state.loading.createProduct = false;
                state.error.createProduct = action.payload || "Failed to create product";
            });

        /* ================= PRODUCTS: UPDATE ================= */
        builder
            .addCase(updateProduct.pending, (state) => {
                state.loading.updateProduct = true;
                state.error.updateProduct = null;
            })
            .addCase(updateProduct.fulfilled, (state, action) => {
                state.loading.updateProduct = false;

                const updated = normalizeProductFromBackend(action.payload?.product);
                const id = toStr(updated?.id);

                if (!id) return;

                state.products = state.products.map((p) => (toStr(p.id) === id ? { ...p, ...updated } : p));
                state.myProducts = state.myProducts.map((p) => (toStr(p.id) === id ? { ...p, ...updated } : p));

                if (state.activeProduct && toStr(state.activeProduct.id) === id) {
                    state.activeProduct = { ...state.activeProduct, ...updated };
                }
            })
            .addCase(updateProduct.rejected, (state, action) => {
                state.loading.updateProduct = false;
                state.error.updateProduct = action.payload || "Failed to update product";
            });

        /* ================= PRODUCTS: DELETE ================= */
        builder
            .addCase(deleteProduct.pending, (state) => {
                state.loading.deleteProduct = true;
                state.error.deleteProduct = null;
            })
            .addCase(deleteProduct.fulfilled, (state, action) => {
                state.loading.deleteProduct = false;

                const productId = toStr(action.payload?.productId);
                state.products = state.products.filter((p) => toStr(p.id) !== productId);
                state.myProducts = state.myProducts.filter((p) => toStr(p.id) !== productId);

                if (state.activeProduct && toStr(state.activeProduct.id) === productId) {
                    state.activeProduct = null;
                    state.activeProductMeta = { isSeller: false, isFavorite: false, formattedPrice: "" };
                }

                delete state.favIds[productId];
                delete state.favoritesCountById[productId];
            })
            .addCase(deleteProduct.rejected, (state, action) => {
                state.loading.deleteProduct = false;
                state.error.deleteProduct = action.payload || "Failed to delete product";
            });

        /* ================= FAVORITE: TOGGLE ================= */
        builder
            .addCase(toggleFavoriteProduct.pending, (state) => {
                state.loading.toggleFavorite = true;
                state.error.toggleFavorite = null;
            })
            .addCase(toggleFavoriteProduct.fulfilled, (state, action) => {
                state.loading.toggleFavorite = false;

                const productId = toStr(action.payload?.productId);
                const message = toStr(action.payload?.message);
                const favoritesCount = Number(action.payload?.favoritesCount ?? 0);

                if (message.toLowerCase().includes("added")) state.favIds[productId] = true;
                if (message.toLowerCase().includes("removed")) delete state.favIds[productId];

                state.favoritesCountById[productId] = favoritesCount;

                if (state.activeProduct && toStr(state.activeProduct.id) === productId) {
                    state.activeProductMeta.isFavorite = !!state.favIds[productId];
                }

                state.products = state.products.map((p) => {
                    if (toStr(p.id) !== productId) return p;
                    return { ...p, favoritesCount };
                });
                state.myProducts = state.myProducts.map((p) => {
                    if (toStr(p.id) !== productId) return p;
                    return { ...p, favoritesCount };
                });
            })
            .addCase(toggleFavoriteProduct.rejected, (state, action) => {
                state.loading.toggleFavorite = false;
                state.error.toggleFavorite = action.payload || "Failed to toggle favorite";
            });

        /* ================= CHECKOUT: CREATE (CART) ================= */
        builder
            .addCase(createCartCheckout.pending, (state) => {
                state.loading.checkout = true;
                state.error.checkout = null;

                state.checkoutStatus = "loading";
                state.checkoutError = null;
            })
            .addCase(createCartCheckout.fulfilled, (state, action) => {
                state.loading.checkout = false;

                state.checkout = safeObj(action.payload);
                state.checkoutStatus = "ready";
            })
            .addCase(createCartCheckout.rejected, (state, action) => {
                state.loading.checkout = false;

                const msg = action.payload || "Failed to create checkout";
                state.error.checkout = msg;

                state.checkoutStatus = "error";
                state.checkoutError = msg;
            });

        /* ================= CHECKOUT: COMPLETE ================= */
        builder
            .addCase(completeCartCheckout.pending, (state) => {
                state.loading.completeCheckout = true;
                state.error.completeCheckout = null;
            })
            .addCase(completeCartCheckout.fulfilled, (state, action) => {
                state.loading.completeCheckout = false;

                const maybeOrder = action.payload?.order;
                if (maybeOrder) {
                    state.myOrders = [normalizeOrder(maybeOrder), ...state.myOrders];
                }

                state.checkout = null;
                state.checkoutStatus = "idle";
                state.checkoutError = null;
            })
            .addCase(completeCartCheckout.rejected, (state, action) => {
                state.loading.completeCheckout = false;
                state.error.completeCheckout = action.payload || "Failed to complete checkout";
            });

        /* ================= ORDERS: GET MY ================= */
        builder
            .addCase(fetchMyOrders.pending, (state) => {
                state.loading.orders = true;
                state.error.orders = null;
            })
            .addCase(fetchMyOrders.fulfilled, (state, action) => {
                state.loading.orders = false;

                const payload = safeObj(action.payload);
                const newItems = safeArr(payload.orders).map(normalizeOrder);

                const page = Number(payload.page || 1);

                if (page === 1) {
                    state.myOrders = newItems;
                } else {
                    const existingIds = new Set(state.myOrders.map(o => String(o.id || o._id)));
                    const filteredNewItems = newItems.filter(o => !existingIds.has(String(o.id || o._id)));
                    state.myOrders.push(...filteredNewItems);
                }

                state.myOrdersPagination = buildPagination(payload);
            })
            .addCase(fetchMyOrders.rejected, (state, action) => {
                state.loading.orders = false;
                state.error.orders = action.payload || "Failed to fetch orders";
            });

        /* ================= JOBS: CREATE ================= */
        builder
            .addCase(createJob.pending, (state) => {
                state.loading.jobCreate = true;
                state.error.jobCreate = null;
            })
            .addCase(createJob.fulfilled, (state, action) => {
                state.loading.jobCreate = false;

                const job = normalizeJob(action.payload?.job);
                if (job && (job._id || job.id)) {
                    state.jobs = [job, ...state.jobs];
                }
            })
            .addCase(createJob.rejected, (state, action) => {
                state.loading.jobCreate = false;
                state.error.jobCreate = action.payload || "Failed to create job";
            });

        /* ================= JOBS: GET ALL ================= */
        builder
            .addCase(fetchJobs.pending, (state) => {
                state.loading.jobs = true;
                state.error.jobs = null;
            })
            .addCase(fetchJobs.fulfilled, (state, action) => {
                state.loading.jobs = false;

                const { data = [], pagination } = action.payload || {};
                const page = Number(pagination?.page || 1);

                if (page > 1) {
                    const existingIds = new Set(state.jobs.map(j => String(j._id || j.id)));
                    const newItems = data.filter(j => !existingIds.has(String(j._id || j.id)));
                    state.jobs.push(...newItems);
                } else {
                    state.jobs = data;
                }

                // 🔴 FIX 2: limit changed from 20 to 10
                state.jobsPagination = pagination || { page: 1, limit: 10, totalCount: 0, totalPages: 1 };
            })
            .addCase(fetchJobs.rejected, (state, action) => {
                state.loading.jobs = false;
                state.error.jobs = action.payload || "Failed to fetch jobs";
            });

        /* ================= JOB: BY ID ================= */
        builder
            .addCase(fetchJobById.pending, (state) => {
                state.loading.jobById = true;
                state.error.jobById = null;
            })
            .addCase(fetchJobById.fulfilled, (state, action) => {
                state.loading.jobById = false;

                const payload = safeObj(action.payload);
                state.activeJob = normalizeJob(payload.job);
            })
            .addCase(fetchJobById.rejected, (state, action) => {
                state.loading.jobById = false;
                state.error.jobById = action.payload || "Failed to fetch job";
            });

        /* ================= JOB: APPLY ================= */
        builder
            .addCase(applyForJob.pending, (state) => {
                state.loading.jobApply = true;
                state.error.jobApply = null;
            })
            .addCase(applyForJob.fulfilled, (state, action) => {
                state.loading.jobApply = false;

                const jobId = toStr(action.payload?.jobId);
                const applicationCount = Number(action.payload?.applicationCount ?? NaN);

                if (jobId && !Number.isNaN(applicationCount)) {
                    state.jobs = state.jobs.map((j) => {
                        if (toStr(j._id || j.id) !== jobId) return j;
                        return { ...j, applicationCount };
                    });

                    if (state.activeJob && toStr(state.activeJob._id || state.activeJob.id) === jobId) {
                        state.activeJob = { ...state.activeJob, applicationCount };
                    }
                }
            })
            .addCase(applyForJob.rejected, (state, action) => {
                state.loading.jobApply = false;
                state.error.jobApply = action.payload || "Failed to apply for job";
            });

        /* ================= FUNDING: CREATE ================= */
        builder
            .addCase(createFunding.pending, (state) => {
                state.loading.fundingCreate = true;
                state.error.fundingCreate = null;
            })
            .addCase(createFunding.fulfilled, (state, action) => {
                state.loading.fundingCreate = false;

                const fund = normalizeFunding(action.payload?.funding);
                if (fund && (fund._id || fund.id)) {
                    state.funding = [fund, ...state.funding];
                }
            })
            .addCase(createFunding.rejected, (state, action) => {
                state.loading.fundingCreate = false;
                state.error.fundingCreate = action.payload || "Failed to create funding";
            });

        /* ================= FUNDING: GET ALL ================= */
        builder
            .addCase(fetchFunding.pending, (state) => {
                state.loading.funding = true;
                state.error.funding = null;
            })
            .addCase(fetchFunding.fulfilled, (state, action) => {
                state.loading.funding = false;

                const { data = [], pagination } = action.payload || {};
                const page = Number(pagination?.page || 1);

                if (page > 1) {
                    const existingIds = new Set(state.funding.map(f => String(f._id || f.id)));
                    const newItems = data.filter(f => !existingIds.has(String(f._id || f.id)));
                    state.funding.push(...newItems);
                } else {
                    state.funding = data;
                }

                // 🔴 FIX 2: limit changed from 20 to 10
                state.fundingPagination = pagination || { page: 1, limit: 10, totalCount: 0, totalPages: 1 };
            })
            .addCase(fetchFunding.rejected, (state, action) => {
                state.loading.funding = false;
                state.error.funding = action.payload || "Failed to fetch funding";
            });

        /* ================= FUNDING: APPLY ================= */
        builder
            .addCase(applyForFunding.pending, (state) => {
                state.loading.fundingApply = true;
                state.error.fundingApply = null;
            })
            .addCase(applyForFunding.fulfilled, (state, action) => {
                state.loading.fundingApply = false;
                
                const fundingId = toStr(action.payload?.fundingId);
                const applicationCount = Number(action.payload?.applicationCount ?? NaN);

                if (fundingId && !Number.isNaN(applicationCount)) {
                    state.funding = state.funding.map((f) => {
                        if (toStr(f._id || f.id) !== fundingId) return f;
                        return { ...f, applicationCount };
                    });
                }
            })
            .addCase(applyForFunding.rejected, (state, action) => {
                state.loading.fundingApply = false;
                state.error.fundingApply = action.payload || "Failed to apply for funding";
            });

        /* ================= SKILLS: CREATE ================= */
        builder
            .addCase(createSkill.pending, (state) => {
                state.loading.skillCreate = true;
                state.error.skillCreate = null;
            })
            .addCase(createSkill.fulfilled, (state, action) => {
                state.loading.skillCreate = false;

                const skill = normalizeSkill(action.payload?.skill);
                if (skill && (skill._id || skill.id)) {
                    state.skills = [skill, ...state.skills];
                }
            })
            .addCase(createSkill.rejected, (state, action) => {
                state.loading.skillCreate = false;
                state.error.skillCreate = action.payload || "Failed to create skill";
            });

        /* ================= SKILLS: GET ALL ================= */
        builder
            .addCase(fetchSkills.pending, (state) => {
                state.loading.skills = true;
                state.error.skills = null;
            })
            .addCase(fetchSkills.fulfilled, (state, action) => {
                state.loading.skills = false;

                const { data = [], pagination } = action.payload || {};
                const page = Number(pagination?.page || 1);

                if (page > 1) {
                    const existingIds = new Set(state.skills.map(s => String(s._id || s.id)));
                    const newItems = data.filter(s => !existingIds.has(String(s._id || s.id)));
                    state.skills.push(...newItems);
                } else {
                    state.skills = data;
                }

                // 🔴 FIX 2: limit changed from 20 to 10
                state.skillsPagination = pagination || { page: 1, limit: 10, totalCount: 0, totalPages: 1 };
            })
            .addCase(fetchSkills.rejected, (state, action) => {
                state.loading.skills = false;
                state.error.skills = action.payload || "Failed to fetch skills";
            });

        /* ================= SKILLS: REQUEST EXCHANGE ================= */
        builder
            .addCase(requestSkillExchange.pending, (state) => {
                state.loading.skillRequest = true;
                state.error.skillRequest = null;
            })
            .addCase(requestSkillExchange.fulfilled, (state, action) => {
                state.loading.skillRequest = false;

                const skillId = toStr(action.payload?.skillId);
                const activeRequestsCount = Number(action.payload?.activeRequestsCount ?? NaN);

                if (skillId && !Number.isNaN(activeRequestsCount)) {
                    state.skills = state.skills.map((s) => {
                        if (toStr(s._id || s.id) !== skillId) return s;
                        return { ...s, activeRequestsCount };
                    });
                }
            })
            .addCase(requestSkillExchange.rejected, (state, action) => {
                state.loading.skillRequest = false;
                state.error.skillRequest = action.payload || "Failed to request exchange";
            });

        /* ================= SKILLS: RESPOND ================= */
        builder
            .addCase(respondToSkillRequest.pending, (state) => {
                state.loading.skillRespond = true;
                state.error.skillRespond = null;
            })
            .addCase(respondToSkillRequest.fulfilled, (state) => {
                state.loading.skillRespond = false;
            })
            .addCase(respondToSkillRequest.rejected, (state, action) => {
                state.loading.skillRespond = false;
                state.error.skillRespond = action.payload || "Failed to respond to request";
            });

        /* ================= SEARCH ================= */
        builder
            .addCase(searchMarketplace.pending, (state) => {
                state.loading.search = true;
                state.error.search = null;
            })
            .addCase(searchMarketplace.fulfilled, (state, action) => {
                state.loading.search = false;

                const payload = safeObj(action.payload);
                const results = safeObj(payload.results);

                state.searchResults = {
                    products: safeArr(results.products).map((p) => normalizeProductFromBackend(p)),
                    jobs: safeArr(results.jobs).map(normalizeJob),
                    funding: safeArr(results.funding).map(normalizeFunding),
                    skills: safeArr(results.skills).map(normalizeSkill),
                };

                state.searchMeta = {
                    query: toStr(payload.query || ""),
                    category: toStr(payload.category || ""),
                    pagination: safeObj(payload.pagination) || { page: 1, limit: 10 },
                };
            })
            .addCase(searchMarketplace.rejected, (state, action) => {
                state.loading.search = false;
                state.error.search = action.payload || "Search failed";
            });

        /* ================= STATS ================= */
        builder
            .addCase(fetchMarketplaceStats.pending, (state) => {
                state.loading.stats = true;
                state.error.stats = null;
            })
            .addCase(fetchMarketplaceStats.fulfilled, (state, action) => {
                state.loading.stats = false;

                const payload = safeObj(action.payload);
                state.stats = safeObj(payload.stats);
            })
            .addCase(fetchMarketplaceStats.rejected, (state, action) => {
                state.loading.stats = false;
                state.error.stats = action.payload || "Failed to fetch stats";
            });
    },
});

/* =====================================================
   EXPORTS
===================================================== */

export const {
    clearMarketplaceError,
    clearCheckout,
    setProductsQuery,
    setFavIds,
    clearActiveProduct,
    clearActiveJob,
    resetMarketplaceState,
} = marketplaceSlice.actions;

export default marketplaceSlice.reducer;