import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import {
  Search,
  ShoppingBag,
  Briefcase,
  DollarSign,
  TrendingUp,
  Heart,
  Star,
  MapPin,
  Plus,
  X,
  Filter,
  ArrowUpDown,
  Check,
  Send,
  Users,
  Calendar,
  Clock,
  Globe,
  BadgeCheck,
  Sparkles,
  ShoppingCart,
  Package,
} from "lucide-react-native";
import tw from "../../utils/tw";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import CartModal from "../../components/marketplace/CartModal";
import CheckoutScreen from "../../components/marketplace/CheckoutScreen";

// Import the tab components
import ProductsTab from "../../components/marketplace/ProductsTab";
import JobsTab from "../../components/marketplace/JobsTab";
import FundingTab from "../../components/marketplace/FundingTab";
import SkillsTab from "../../components/marketplace/SkillsTab";

// Import shared components
import ModalShell from "../../components/marketplace/ModalShell";
import FilterModal from "../../components/marketplace/FilterModal";
import ListModal from "../../components/marketplace/ListModal";
import DetailModals from "../../components/marketplace/DetailModals";
import OrderModal from "../../components/marketplace/OrderModal";

import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../store/slices/cartSlice";
import {
  fetchProducts,
  fetchJobs,
  fetchFunding,
  fetchSkills,
  createProduct,
  createJob,
  createFunding,
  createSkill,
} from "../../store/slices/marketplaceSlice";

import ShimmerLoader from "../../components/ui/ShimmerLoader";

/* ============================================================
   THEME
============================================================ */
const PRIMARY = "#6A1B9A";
const BG = "#F7F5FB";
const SURFACE = "#FFFFFF";
const BORDER = "#EEEAF6";
const TEXT = "#111827";
const MUTED = "#6B7280";
const SOFT = "#EFE9F7";

/* ============================================================
   HELPERS
============================================================ */
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function safeString(v) {
  return (v ?? "").toString();
}

function includesCI(hay, needle) {
  const a = safeString(hay).toLowerCase();
  const b = safeString(needle).toLowerCase();
  return a.includes(b);
}

/* ============================================================
   UI PRIMITIVES
============================================================ */
const Pill = React.memo(({ label, icon: Icon, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={[
      tw`px-3 py-2 rounded-full mr-2 flex-row items-center`,
      {
        backgroundColor: active ? PRIMARY : SOFT,
      },
    ]}
  >
    {!!Icon && (
      <Icon size={14} color={active ? "#FFFFFF" : PRIMARY} style={tw`mr-2`} />
    )}
    <Text
      style={[
        tw`text-xs`,
        { fontFamily: "Poppins-SemiBold" },
        active ? tw`text-white` : { color: PRIMARY },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
));

const TabButton = React.memo(({ label, value, activeTab, onPress, count }) => {
  const active = activeTab === value;

  return (
    <TouchableOpacity
      onPress={() => onPress(value)}
      activeOpacity={0.85}
      style={[
        tw`flex-1 py-3 rounded-full items-center`,
        { backgroundColor: active ? PRIMARY : "transparent" },
      ]}
    >
      <Text
        style={[
          { fontFamily: "Poppins-SemiBold" },
          active ? tw`text-white` : { color: MUTED },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
});

/* ============================================================
   MAIN SCREEN
============================================================ */
export default function MarketplaceScreen() {
  // ============================================================
  // ALL HOOKS MUST BE DECLARED FIRST - BEFORE ANY CONDITIONAL RETURNS
  // ============================================================

  // Router & Redux hooks
  const router = useRouter();
  const dispatch = useDispatch();
  const cartCount = useSelector(s => s.cart?.items?.length || 0);

  // Data from Redux store
  const {
    products = [],
    jobs = [],
    funding = [],
    skills = [],
    loading = { products: false, jobs: false, funding: false, skills: false },
    error = { products: null, jobs: null, funding: null, skills: null },
    productsPagination = { page: 1, totalPages: 1 },
    jobsPagination = { page: 1, totalPages: 1 },
    fundingPagination = { page: 1, totalPages: 1 },
    skillsPagination = { page: 1, totalPages: 1 }
  } = useSelector(s => s.marketplace || {});

  // UI State - ALL useState hooks declared upfront
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState("products");

  // Search + filters
  const [searchText, setSearchText] = useState("");
  const [sortMode, setSortMode] = useState("relevance");
  const [filterOpen, setFilterOpen] = useState(false);

  // Product filters
  const [productCategory, setProductCategory] = useState("all");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Jobs filters
  const [jobType, setJobType] = useState("all");
  const [jobLocation, setJobLocation] = useState("all");

  // Funding filters
  const [fundStatus, setFundStatus] = useState("open");

  // Skills filters
  const [skillTag, setSkillTag] = useState("all");

  // Favorites state
  const [favIds, setFavIds] = useState(() => new Set());

  // Detail modals
  const [productDetails, setProductDetails] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);
  const [fundDetails, setFundDetails] = useState(null);
  const [skillDetails, setSkillDetails] = useState(null);

  // "List Item" flow
  const [listOpen, setListOpen] = useState(false);
  const [listType, setListType] = useState("product");
  const [listTitle, setListTitle] = useState("");
  const [listSubtitle, setListSubtitle] = useState("");
  const [listPriceOrAmount, setListPriceOrAmount] = useState("");
  const [listLocationOrDeadline, setListLocationOrDeadline] = useState("");
  const [listNotes, setListNotes] = useState("");
  
  /* ============================================================
     LISTING FORM STATE (REQUIRED FOR NEW LISTMODAL)
  ============================================================ */
  
  /* shared */
  const [listCategory, setListCategory] = useState("");
  const [listTags, setListTags] = useState([]);
  const [listImages, setListImages] = useState([]);
  
  /* product */
  const [listCondition, setListCondition] = useState("");
  const [listQuantity, setListQuantity] = useState("");
  
  /* job */
  const [listTypeValue, setListTypeValue] = useState("");
  const [listRequirements, setListRequirements] = useState([]);
  const [listSkills, setListSkills] = useState([]);
  
  /* funding */
  const [listEligibility, setListEligibility] = useState("");
  const [listFocusAreas, setListFocusAreas] = useState([]);
  
  /* skill */
  const [listProficiency, setListProficiency] = useState("");

  //orders
  const [ordersOpen, setOrdersOpen] = useState(false);

  // ============================================================
  // useEffect hooks - still hooks, declared after useState
  // ============================================================

  // Initial data fetch with page=1, limit=10
  useEffect(() => {
    dispatch(fetchProducts({ params: { page: 1, limit: 10 } }));
    dispatch(fetchJobs({ params: { page: 1, limit: 10 } }));
    dispatch(fetchFunding({ params: { page: 1, limit: 10 } }));
    dispatch(fetchSkills({ params: { page: 1, limit: 10 } }));
  }, [dispatch]);

  // ============================================================
  // Event Handlers & Callbacks
  // ============================================================

  const handleAddToCart = useCallback((product) => {
    dispatch(
      addToCart({
        productId: product._id,
        title: product.name,
        price: product.price,
        image: product.image,
      })
    );
  }, [dispatch]);

  const toggleFav = useCallback((id) => {
    setFavIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openFilter = useCallback(() => setFilterOpen(true), []);
  const closeFilter = useCallback(() => setFilterOpen(false), []);

  const onTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  // loadMore with proper loading guard to prevent multiple rapid calls
  const loadMore = useCallback(() => {
    // Get current pagination state for active tab
    const pg =
      activeTab === "products" ? productsPagination :
        activeTab === "jobs" ? jobsPagination :
          activeTab === "funding" ? fundingPagination :
            skillsPagination;

    // Get loading state for active tab
    const isLoading =
      activeTab === "products" ? loading.products :
        activeTab === "jobs" ? loading.jobs :
          activeTab === "funding" ? loading.funding :
            loading.skills;

    // STOP if already loading OR no more pages
    if (isLoading || !pg || pg.page >= pg.totalPages) {
      return;
    }

    const next = pg.page + 1;
    const params = { page: next, limit: 10 };

    // Dispatch fetch for next page
    if (activeTab === "products") dispatch(fetchProducts({ params }));
    if (activeTab === "jobs") dispatch(fetchJobs({ params }));
    if (activeTab === "funding") dispatch(fetchFunding({ params }));
    if (activeTab === "skills") dispatch(fetchSkills({ params }));
  }, [activeTab, dispatch, productsPagination, jobsPagination, fundingPagination, skillsPagination, loading]);

  const resetFilters = useCallback(() => {
    setSortMode("relevance");
    setProductCategory("all");
    setOnlyFavorites(false);
    setJobType("all");
    setJobLocation("all");
    setFundStatus("open");
    setSkillTag("all");
  }, []);

  const openListModal = useCallback(() => {
    setListOpen(true);
    setListType(activeTab === "products" ? "product" : activeTab === "jobs" ? "job" : activeTab === "funding" ? "funding" : "skill");
    // Reset form fields when opening
    setListTitle("");
    setListSubtitle("");
    setListPriceOrAmount("");
    setListLocationOrDeadline("");
    setListNotes("");
    setListCategory("");
    setListTags([]);
    setListImages([]);
    setListCondition("");
    setListQuantity("");
    setListTypeValue("");
    setListRequirements([]);
    setListSkills([]);
    setListEligibility("");
    setListFocusAreas([]);
    setListProficiency("");
  }, [activeTab]);

  const closeListModal = useCallback(() => {
    setListOpen(false);
    // Reset all form fields
    setListTitle("");
    setListSubtitle("");
    setListPriceOrAmount("");
    setListLocationOrDeadline("");
    setListNotes("");
    setListCategory("");
    setListTags([]);
    setListImages([]);
    setListCondition("");
    setListQuantity("");
    setListTypeValue("");
    setListRequirements([]);
    setListSkills([]);
    setListEligibility("");
    setListFocusAreas([]);
    setListProficiency("");
  }, []);

  const currentUser = useSelector(s => s.auth.user);

  // FINAL submitList (ALL FIELDS, EXACT MATCH TO MODELS)
  const submitList = useCallback(async () => {
    try {
      if (!currentUser?._id) {
        Alert.alert("Please log in to create a listing");
        return;
      }

      let payload = {};
      let thunk;

      /* =========================================================
         PRODUCT  (matches productSchema 1:1)
      ========================================================= */
      if (listType === "product") {
        // Validate required fields
        if (!listTitle || !listPriceOrAmount || !listCategory || !listCondition || !listQuantity) {
          Alert.alert("Please fill in all required fields");
          return;
        }

        payload = {
          title: listTitle,
          description: listNotes,
          price: Number(listPriceOrAmount),
          category: listCategory,
          images: listImages,
          location: listLocationOrDeadline,
          condition: listCondition,
          quantity: Number(listQuantity),
          tags: listTags,
          seller: currentUser._id,
          sellerName: currentUser.profile?.fullName,
        };

        thunk = createProduct(payload);
      }

      /* =========================================================
         JOB  (matches jobSchema 1:1)
      ========================================================= */
      if (listType === "job") {
        // Validate required fields
        if (!listTitle || !listSubtitle || !listTypeValue || !listCategory) {
          Alert.alert("Please fill in all required fields");
          return;
        }

        payload = {
          title: listTitle,
          company: listSubtitle,
          description: listNotes,
          type: listTypeValue,
          location: listLocationOrDeadline,
          salary: listPriceOrAmount,
          requirements: listRequirements,
          skills: listSkills,
          category: listCategory,
          contactEmail: currentUser.email,
          companyId: currentUser._id,
          postedBy: currentUser._id,
        };

        thunk = createJob(payload);
      }

      /* =========================================================
         FUNDING  (matches fundingSchema 1:1)
      ========================================================= */
      if (listType === "funding") {
        // Validate required fields
        if (!listTitle || !listSubtitle || !listCategory) {
          Alert.alert("Please fill in all required fields");
          return;
        }

        payload = {
          title: listTitle,
          provider: listSubtitle,
          description: listNotes,
          amount: listPriceOrAmount,
          type: listTypeValue,
          category: listCategory,
          eligibility: listEligibility,
          focusAreas: listFocusAreas,
          deadline: listLocationOrDeadline,
          contactEmail: currentUser.email,
          providerId: currentUser._id,
        };

        thunk = createFunding(payload);
      }

      /* =========================================================
         SKILL  (matches skillSchema 1:1)
      ========================================================= */
      if (listType === "skill") {
        // Validate required fields
        if (!listTitle || !listCategory || !listProficiency) {
          Alert.alert("Please fill in all required fields");
          return;
        }

        payload = {
          skill: listTitle,
          category: listCategory,
          proficiency: listProficiency,
          offer: listSubtitle,
          exchangeFor: listNotes,
          location: listLocationOrDeadline,
          tags: listTags,
          user: currentUser._id,
          userName: currentUser.profile?.fullName,
          avatar: currentUser.profile?.avatar?.url,
        };

        thunk = createSkill(payload);
      }

      if (thunk) {
        await dispatch(thunk);
        Alert.alert("Success", "Your listing has been created!");
        closeListModal();
      }

    } catch (err) {
      console.error(err);
      Alert.alert("Failed to create listing", err.message || "Something went wrong");
    }
  }, [
    currentUser,
    listType,
    listTitle,
    listSubtitle,
    listNotes,
    listPriceOrAmount,
    listLocationOrDeadline,
    listCategory,
    listImages,
    listCondition,
    listQuantity,
    listTags,
    listTypeValue,
    listRequirements,
    listSkills,
    listEligibility,
    listFocusAreas,
    listProficiency,
    dispatch,
    closeListModal
  ]);

  // ============================================================
  // Memoized Values
  // ============================================================

  const counts = useMemo(() => {
    return {
      products: products?.length || 0,
      jobs: jobs?.length || 0,
      funding: funding?.length || 0,
      skills: skills?.length || 0,
    };
  }, [products?.length, jobs?.length, funding?.length, skills?.length]);

  const filteredProducts = useMemo(() => {
    let list = products || [];

    if (onlyFavorites) {
      list = list.filter((p) => favIds.has(p._id));
    }

    if (productCategory !== "all") {
      list = list.filter((p) => p.category === productCategory);
    }

    if (searchText.trim()) {
      const q = searchText.trim();
      list = list.filter((p) => {
        return (
          includesCI(p.name, q) ||
          includesCI(p.seller, q) ||
          includesCI(p.location, q) ||
          p.tags?.some((t) => includesCI(t, q))
        );
      });
    }

    if (sortMode === "price_low") {
      list = [...list].sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortMode === "price_high") {
      list = [...list].sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return list;
  }, [products, searchText, sortMode, productCategory, onlyFavorites, favIds]);

  const filteredJobs = useMemo(() => {
    let list = jobs || [];

    if (jobType !== "all") {
      if (jobType === "remote") list = list.filter((j) => includesCI(j.location, "remote"));
      else list = list.filter((j) => includesCI(j.type, jobType.replace("-", " ")));
    }

    if (jobLocation !== "all") {
      if (jobLocation === "remote") list = list.filter((j) => includesCI(j.location, "remote"));
      else list = list.filter((j) => includesCI(j.location, jobLocation));
    }

    if (searchText.trim()) {
      const q = searchText.trim();
      list = list.filter((j) => {
        return (
          includesCI(j.title, q) ||
          includesCI(j.company, q) ||
          includesCI(j.location, q) ||
          includesCI(j.type, q)
        );
      });
    }

    return list;
  }, [jobs, searchText, sortMode, jobType, jobLocation]);

  const filteredFunding = useMemo(() => {
    let list = funding || [];

    if (fundStatus !== "all") {
      list = list.filter((f) => f.status === "open");
    }

    if (searchText.trim()) {
      const q = searchText.trim();
      list = list.filter((f) => {
        return (
          includesCI(f.title, q) ||
          includesCI(f.provider, q) ||
          includesCI(f.amount, q) ||
          includesCI(f.focus, q)
        );
      });
    }

    return list;
  }, [funding, searchText, fundStatus]);

  const filteredSkills = useMemo(() => {
    let list = skills || [];

    if (skillTag !== "all") {
      list = list.filter((s) => s.tags?.includes(skillTag));
    }

    if (searchText.trim()) {
      const q = searchText.trim();
      list = list.filter((s) => {
        return (
          includesCI(s.name, q) ||
          includesCI(s.skill, q) ||
          includesCI(s.offer, q) ||
          includesCI(s.exchange, q)
        );
      });
    }

    return list;
  }, [skills, searchText, skillTag]);

  const headerIcon = useMemo(() => {
    if (activeTab === "products") return ShoppingBag;
    if (activeTab === "jobs") return Briefcase;
    if (activeTab === "funding") return TrendingUp;
    return Star;
  }, [activeTab]);

  const headerTitle = useMemo(() => {
    if (activeTab === "products") return "Marketplace";
    if (activeTab === "jobs") return "Jobs";
    if (activeTab === "funding") return "Funding";
    return "Skill Swap";
  }, [activeTab]);

  const headerSubtitle = useMemo(() => {
    if (activeTab === "products") return "Support women-owned businesses";
    if (activeTab === "jobs") return "Find opportunities built for growth";
    if (activeTab === "funding") return "Grants and investment opportunities";
    return "Exchange skills and learn together";
  }, [activeTab]);

  const ActiveHeaderIcon = headerIcon;

  // Only show shimmer on initial load, not during pagination
  const isInitialLoading =
    products.length === 0 &&
    jobs.length === 0 &&
    funding.length === 0 &&
    skills.length === 0 &&
    (loading.products || loading.jobs || loading.funding || loading.skills);

  if (isInitialLoading) {
    return (
      <View style={tw`flex-1 items-center justify-center`}>
        <ShimmerLoader />
      </View>
    );
  }

  // Check error states - using granular error flags
  if (error?.products || error?.jobs || error?.funding || error?.skills) {
    const errorMessage = error?.products || error?.jobs || error?.funding || error?.skills;
    return (
      <View style={tw`flex-1 items-center justify-center px-6`}>
        <Text style={[tw`text-lg`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
          Failed to load
        </Text>
        <Text style={[tw`text-center mt-2`, { fontFamily: "Poppins-Regular", color: MUTED }]}>
          {errorMessage?.toString() || "Something went wrong"}
        </Text>
        <TouchableOpacity
          onPress={() => {
            dispatch(fetchProducts({ params: { page: 1, limit: 10 } }));
            dispatch(fetchJobs({ params: { page: 1, limit: 10 } }));
            dispatch(fetchFunding({ params: { page: 1, limit: 10 } }));
            dispatch(fetchSkills({ params: { page: 1, limit: 10 } }));
          }}
          style={[tw`mt-6 px-6 py-3 rounded-full`, { backgroundColor: PRIMARY }]}
        >
          <Text style={[tw`text-white`, { fontFamily: "Poppins-SemiBold" }]}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <View style={[tw`flex-1`, { backgroundColor: BG }]}>
      {/* HEADER */}
      <View
        style={[
          tw`pt-14 pb-6 px-4`,
          {
            backgroundColor: PRIMARY,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
          },
        ]}
      >
        {/* Top Row */}
        <View style={tw`flex-row items-center justify-between`}>
          <View style={tw`flex-row items-center flex-1`}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              style={tw`w-10 h-10 rounded-full bg-white/20 items-center justify-center`}
            >
              <ChevronLeft size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={tw`ml-3`}>
              <Text
                style={[
                  tw`text-white text-xl`,
                  { fontFamily: "Poppins-Bold" },
                ]}
              >
                {headerTitle}
              </Text>

              <Text
                style={[
                  tw`text-white/80 text-sm`,
                  { fontFamily: "Poppins-Regular" },
                ]}
              >
                {headerSubtitle}
              </Text>
            </View>
          </View>

          <View style={tw`flex-row items-center mr-4`}>
            {/* Orders */}
            <TouchableOpacity
              onPress={() => setOrdersOpen(true)}
              style={tw`mr-6`}
            >
              <Package size={26} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Cart */}
            <TouchableOpacity onPress={() => setCartOpen(true)}>
              <View>
                <ShoppingCart size={26} color="#FFFFFF" />
                {cartCount > 0 && (
                  <View
                    style={[
                      tw`absolute -top-2 -right-2 w-5 h-5 rounded-full items-center justify-center`,
                      { backgroundColor: "#FF5252" },
                    ]}
                  >
                    <Text style={[tw`text-xs text-white`, { fontFamily: "Poppins-Bold" }]}>
                      {cartCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Row */}
        <View
          style={[
            tw`mt-5 rounded-2xl px-4 py-3 flex-row items-center`,
            { backgroundColor: "rgba(255,255,255,0.15)" },
          ]}
        >
          <Search size={16} color="#FFFFFF" />

          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search products, jobs, funding, skills…"
            placeholderTextColor="rgba(255,255,255,0.7)"
            style={[
              tw`ml-2 flex-1 text-white`,
              { fontFamily: "Poppins-Regular" },
            ]}
          />

          <TouchableOpacity
            onPress={openFilter}
            style={tw`w-9 h-9 rounded-full bg-white/20 items-center justify-center`}
          >
            <Filter size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* TABS */}
      <View style={[tw`mx-4 mt-4 rounded-full p-1`, { backgroundColor: SOFT, borderWidth: 1, borderColor: BORDER }]}>
        <View style={tw`flex-row`}>
          <TabButton label="Products" value="products" activeTab={activeTab} onPress={onTabChange} count={counts.products} />
          <TabButton label="Jobs" value="jobs" activeTab={activeTab} onPress={onTabChange} count={counts.jobs} />
          <TabButton label="Funding" value="funding" activeTab={activeTab} onPress={onTabChange} count={counts.funding} />
          <TabButton label="Skills" value="skills" activeTab={activeTab} onPress={onTabChange} count={counts.skills} />
        </View>
      </View>

      {/* CONTENT - FlatList via tab components */}
      <View style={tw`flex-1 px-4 pt-4`}>
        {activeTab === "products" && (
          <ProductsTab
            filteredProducts={filteredProducts}
            favIds={favIds}
            toggleFav={toggleFav}
            onOpenProductDetails={setProductDetails}
            resetFilters={resetFilters}
            loadMore={loadMore}
            loading={loading}
          />
        )}

        {activeTab === "jobs" && (
          <JobsTab
            filteredJobs={filteredJobs}
            onOpenJobDetails={setJobDetails}
            resetFilters={resetFilters}
            loadMore={loadMore}
            loading={loading}
          />
        )}

        {activeTab === "funding" && (
          <FundingTab
            filteredFunding={filteredFunding}
            onOpenFundingDetails={setFundDetails}
            resetFilters={resetFilters}
            loadMore={loadMore}
            loading={loading}
          />
        )}

        {activeTab === "skills" && (
          <SkillsTab
            filteredSkills={filteredSkills}
            onOpenSkillDetails={setSkillDetails}
            resetFilters={resetFilters}
            loadMore={loadMore}
            loading={loading}
          />
        )}
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={openListModal}
        activeOpacity={0.85}
        style={[
          tw`absolute right-4 bottom-6 w-14 h-14 rounded-full items-center justify-center`,
          { backgroundColor: PRIMARY },
        ]}
      >
        <Plus size={22} color="#FFFFFF" />
      </TouchableOpacity>

      {/* MODALS */}
      <FilterModal
        visible={filterOpen}
        onClose={closeFilter}
        activeTab={activeTab}
        sortMode={sortMode}
        setSortMode={setSortMode}
        productCategory={productCategory}
        setProductCategory={setProductCategory}
        onlyFavorites={onlyFavorites}
        setOnlyFavorites={setOnlyFavorites}
        jobType={jobType}
        setJobType={setJobType}
        jobLocation={jobLocation}
        setJobLocation={setJobLocation}
        fundStatus={fundStatus}
        setFundStatus={setFundStatus}
        skillTag={skillTag}
        setSkillTag={setSkillTag}
        resetFilters={resetFilters}
      />

      <DetailModals
        productDetails={productDetails}
        setProductDetails={setProductDetails}
        jobDetails={jobDetails}
        setJobDetails={setJobDetails}
        fundDetails={fundDetails}
        setFundDetails={setFundDetails}
        skillDetails={skillDetails}
        setSkillDetails={setSkillDetails}
        favIds={favIds}
        toggleFav={toggleFav}
      />

      <ListModal
        listOpen={listOpen}
        closeListModal={closeListModal}
        listType={listType}
        setListType={setListType}
        listTitle={listTitle}
        setListTitle={setListTitle}
        listSubtitle={listSubtitle}
        setListSubtitle={setListSubtitle}
        listPriceOrAmount={listPriceOrAmount}
        setListPriceOrAmount={setListPriceOrAmount}
        listLocationOrDeadline={listLocationOrDeadline}
        setListLocationOrDeadline={setListLocationOrDeadline}
        listNotes={listNotes}
        setListNotes={setListNotes}
        /* shared */
        listCategory={listCategory}
        setListCategory={setListCategory}
        listTags={listTags}
        setListTags={setListTags}
        listImages={listImages}
        setListImages={setListImages}
        /* product */
        listCondition={listCondition}
        setListCondition={setListCondition}
        listQuantity={listQuantity}
        setListQuantity={setListQuantity}
        /* job */
        listTypeValue={listTypeValue}
        setListTypeValue={setListTypeValue}
        listRequirements={listRequirements}
        setListRequirements={setListRequirements}
        listSkills={listSkills}
        setListSkills={setListSkills}
        /* funding */
        listEligibility={listEligibility}
        setListEligibility={setListEligibility}
        listFocusAreas={listFocusAreas}
        setListFocusAreas={setListFocusAreas}
        /* skill */
        listProficiency={listProficiency}
        setListProficiency={setListProficiency}
        currentUser={currentUser}
        submitList={submitList}
      />

      <CartModal
        visible={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      <OrderModal
        visible={ordersOpen}
        onClose={() => setOrdersOpen(false)}
      />

      <Modal visible={checkoutOpen} animationType="slide">
        <CheckoutScreen onClose={() => setCheckoutOpen(false)} />
      </Modal>
    </View>
  );
}