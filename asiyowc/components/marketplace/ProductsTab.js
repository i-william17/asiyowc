import React, { useMemo, useState, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    Dimensions,
    FlatList,
    ScrollView,
    Alert,
    Modal,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
    ShoppingBag,
    Heart,
    Star,
    MapPin,
    Globe,
    Send,
    Sparkles,
    ShoppingCart,
    X,
    Zap,
    Minus,
    Plus,
    ChevronLeft,
    ChevronRight,
} from "lucide-react-native";
import { useDispatch } from "react-redux";
import { addToCart } from "../../store/slices/cartSlice";
import ShimmerLoader from "../../components/ui/ShimmerLoader";

import tw from "../../utils/tw";

const { width } = Dimensions.get("window");

const PRIMARY = "#6A1B9A";
const BG = "#F7F5FB";
const SURFACE = "#FFFFFF";
const BORDER = "#EEEAF6";
const TEXT = "#111827";
const MUTED = "#6B7280";
const SOFT = "#EFE9F7";

function formatKES(n) {
    const num = Number(n || 0);
    if (Number.isNaN(num)) return "0";
    const s = Math.round(num).toString();
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const Divider = React.memo(() => (
    <View style={[tw`my-3`, { height: 1, backgroundColor: BORDER }]} />
));

const PrimaryButton = React.memo(({ label, icon: Icon, onPress, disabled }) => (
    <TouchableOpacity
        onPress={disabled ? undefined : onPress}
        activeOpacity={0.85}
        style={[
            tw`rounded-xl py-3 items-center justify-center flex-row`,
            {
                backgroundColor: disabled ? "#D1D5DB" : PRIMARY,
            },
        ]}
    >
        {!!Icon && <Icon size={16} color="#FFFFFF" style={tw`mr-2`} />}
        <Text style={[tw`text-white`, { fontFamily: "Poppins-SemiBold" }]}>
            {label}
        </Text>
    </TouchableOpacity>
));

const SecondaryButton = React.memo(({ label, icon: Icon, onPress, danger }) => (
    <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[
            tw`rounded-xl py-3 items-center justify-center flex-row`,
            {
                backgroundColor: danger ? "#FEF2F2" : SOFT,
                borderWidth: 1,
                borderColor: danger ? "#FECACA" : BORDER,
            },
        ]}
    >
        {!!Icon && (
            <Icon size={16} color={danger ? "#DC2626" : PRIMARY} style={tw`mr-2`} />
        )}
        <Text
            style={[
                { fontFamily: "Poppins-SemiBold" },
                { color: danger ? "#DC2626" : PRIMARY },
            ]}
        >
            {label}
        </Text>
    </TouchableOpacity>
));

/* =====================================================
   STAR RATER
===================================================== */
const StarRater = React.memo(({ value = 0, onChange }) => (
    <View style={tw`flex-row items-center`}>
        {[1, 2, 3, 4, 5].map((i) => {
            const filled = i <= value;
            return (
                <TouchableOpacity
                    key={i}
                    activeOpacity={0.8}
                    onPress={() => onChange?.(i)}
                    style={tw`mr-2`}
                    hitSlop={10}
                >
                    <Star
                        size={18}
                        color={filled ? "#F59E0B" : "#D1D5DB"}
                        fill={filled ? "#F59E0B" : "transparent"}
                    />
                </TouchableOpacity>
            );
        })}
        <Text style={{ fontFamily: "Poppins-Medium", color: MUTED, marginLeft: 4 }}>
            {value ? `${value}.0` : "Tap to rate"}
        </Text>
    </View>
));

/* =====================================================
   DETAIL ROW
===================================================== */
const DetailRow = React.memo(({ label, value }) => (
    <View style={tw`flex-row items-center justify-between mb-3`}>
        <Text style={{ fontFamily: "Poppins-Regular", color: MUTED }}>
            {label}
        </Text>
        <Text style={{ fontFamily: "Poppins-SemiBold", color: TEXT }}>
            {value}
        </Text>
    </View>
));

/* =====================================================
   PRODUCT DETAILS SHEET
===================================================== */
const ProductDetailsSheet = React.memo(({
    product,
    onClose,
    toggleFav,
    isFav,
    onBuyNow,
    onRate
}) => {
    const dispatch = useDispatch();
    const [qty, setQty] = useState(1);
    const [activeIndex, setActiveIndex] = useState(0);
    const [userRating, setUserRating] = useState(0);
    const listRef = useRef(null);

    const images = (product.images && product.images.length > 0)
        ? product.images
        : [product.image].filter(Boolean);

    const total = useMemo(() => {
        return (product?.price || 0) * qty;
    }, [qty, product?.price]);

    const handleAddToCart = () => {
        dispatch(
            addToCart({
                productId: product._id || product.id,
                title: product.name || product.title,
                price: product.price,
                image: product.image || images[0],
                quantity: qty,
            })
        );
    };

    const handleBuyNow = () => {
        handleAddToCart();
        onBuyNow?.();
        onClose?.();
    };

    const handleRate = (rating) => {
        setUserRating(rating);
        onRate?.({ productId: product._id || product.id, rating });
        Alert.alert("Thanks!", `You rated this product ${rating} star${rating > 1 ? "s" : ""}.`);
    };

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems?.[0]?.index !== undefined && viewableItems?.[0]?.index !== null) {
            setActiveIndex(viewableItems[0].index);
        }
    }).current;

    return (
        <View style={tw`flex-1`}>
            {/* ===================== IMAGE CAROUSEL ===================== */}
            <View style={{ height: 330, backgroundColor: "#0B0B10" }}>
                <FlatList
                    ref={listRef}
                    data={images}
                    keyExtractor={(uri, idx) => `${uri}-${idx}`}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={{ viewAreaCoveragePercentThreshold: 60 }}
                    renderItem={({ item }) => (
                        <Image
                            source={{ uri: item }}
                            style={{
                                width,
                                height: 330,
                            }}
                            resizeMode="cover"
                        />
                    )}
                />

                {/* Top controls (overlay) */}
                <View
                    style={[
                        tw`absolute top-14 left-0 right-0 px-4 flex-row items-center justify-between`,
                    ]}
                >
                    <TouchableOpacity
                        onPress={onClose}
                        activeOpacity={0.85}
                        style={[
                            tw`w-10 h-10 rounded-full items-center justify-center`,
                            { backgroundColor: "rgba(0,0,0,0.35)" },
                        ]}
                        hitSlop={10}
                    >
                        <X size={20} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => toggleFav?.(product._id || product.id)}
                        activeOpacity={0.85}
                        style={[
                            tw`w-10 h-10 rounded-full items-center justify-center`,
                            { backgroundColor: "rgba(0,0,0,0.35)" },
                        ]}
                        hitSlop={10}
                    >
                        <Heart
                            size={20}
                            color={isFav ? "#EF4444" : "#fff"}
                            fill={isFav ? "#EF4444" : "transparent"}
                        />
                    </TouchableOpacity>
                </View>

                {/* Dots indicator */}
                {images.length > 1 && (
                    <View style={tw`absolute bottom-4 left-0 right-0 flex-row justify-center`}>
                        {images.map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    tw`mx-1 rounded-full`,
                                    {
                                        width: i === activeIndex ? 18 : 7,
                                        height: 7,
                                        backgroundColor: i === activeIndex ? "#FFFFFF" : "rgba(255,255,255,0.45)",
                                    },
                                ]}
                            />
                        ))}
                    </View>
                )}
            </View>

            {/* ===================== CARVED WHITE SHEET ===================== */}
            <View
                style={[
                    tw`flex-1 bg-white rounded-t-3xl`,
                    { marginTop: -22 }
                ]}
            >
                {/* grabber */}
                <View style={tw`items-center pt-3 pb-2`}>
                    <View
                        style={{
                            width: 44,
                            height: 5,
                            borderRadius: 999,
                            backgroundColor: "#E5E7EB",
                        }}
                    />
                </View>

                {/* ================= SCROLLABLE CONTENT ================= */}
                <ScrollView
                    style={tw`flex-1`}
                    contentContainerStyle={tw`px-5 pb-6`}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Title + Price */}
                    <View style={tw`flex-row items-start justify-between`}>
                        <View style={tw`flex-1 pr-3`}>
                            <Text style={{ fontFamily: "Poppins-Bold", fontSize: 18, color: TEXT }}>
                                {product.name || product.title}
                            </Text>

                            <Text style={{ fontFamily: "Poppins-Regular", color: MUTED, marginTop: 4 }}>
                                by {product.seller || product.sellerName || "Seller"}
                            </Text>
                        </View>

                        <View style={[tw`px-3 py-2 rounded-2xl`, { backgroundColor: SOFT }]}>
                            <Text style={{ fontFamily: "Poppins-Bold", color: PRIMARY, fontSize: 16 }}>
                                Ksh {formatKES(product.price)}
                            </Text>
                        </View>
                    </View>

                    {/* Rating display + user rating */}
                    <View style={tw`mt-4`}>
                        <Text style={{ fontFamily: "Poppins-SemiBold", color: TEXT, marginBottom: 8 }}>
                            Rating
                        </Text>

                        <View style={tw`flex-row items-center justify-between`}>
                            <View style={tw`flex-row items-center`}>
                                <Star size={16} color="#F59E0B" fill="#F59E0B" />
                                <Text style={{ fontFamily: "Poppins-SemiBold", marginLeft: 6, color: TEXT }}>
                                    {product.rating || 0}
                                </Text>
                                <Text style={{ fontFamily: "Poppins-Regular", marginLeft: 6, color: MUTED }}>
                                    ({product.reviews || 0} reviews)
                                </Text>
                            </View>

                            <StarRater value={userRating} onChange={handleRate} />
                        </View>
                    </View>

                    {/* Description */}
                    <View style={tw`mt-5`}>
                        <Text style={{ fontFamily: "Poppins-SemiBold", color: TEXT, marginBottom: 8 }}>
                            Description
                        </Text>
                        <Text style={{ fontFamily: "Poppins-Regular", color: MUTED, lineHeight: 20 }}>
                            {product.description || "No description provided."}
                        </Text>
                    </View>

                    {/* Details */}
                    <View style={tw`mt-5`}>
                        <Text style={{ fontFamily: "Poppins-SemiBold", color: TEXT, marginBottom: 10 }}>
                            Details
                        </Text>

                        <View style={tw`rounded-2xl p-4`}>
                            <DetailRow label="Category" value={product.category || "—"} />
                            <DetailRow label="Location" value={product.location || "—"} />
                            <DetailRow label="Condition" value={product.condition || "—"} />
                            <DetailRow label="Stock" value={String(product.stock ?? "—")} />
                            <DetailRow label="Delivery" value={product.delivery || "—"} />
                        </View>
                    </View>

                    {/* Quantity */}
                    <View style={tw`mt-6`}>
                        <Text style={{ fontFamily: "Poppins-SemiBold", color: TEXT, marginBottom: 10 }}>
                            Quantity
                        </Text>

                        <View
                            style={[
                                tw`flex-row items-center justify-between rounded-2xl px-4 py-3`,
                                { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB" },
                            ]}
                        >
                            <TouchableOpacity
                                disabled={qty === 1}
                                onPress={() => setQty((q) => Math.max(1, q - 1))}
                                style={[
                                    tw`w-10 h-10 rounded-xl items-center justify-center`,
                                    { backgroundColor: SURFACE },
                                ]}
                            >
                                <Minus size={18} opacity={qty === 1 ? 0.35 : 1} color={TEXT} />
                            </TouchableOpacity>

                            <Text style={{ fontFamily: "Poppins-Bold", fontSize: 18, color: TEXT }}>
                                {qty}
                            </Text>

                            <TouchableOpacity
                                onPress={() => setQty((q) => q + 1)}
                                style={[
                                    tw`w-10 h-10 rounded-xl items-center justify-center`,
                                    { backgroundColor: SURFACE },
                                ]}
                            >
                                <Plus size={18} color={TEXT} />
                            </TouchableOpacity>
                        </View>

                        {/* Total */}
                        <View style={tw`mt-3 flex-row justify-between`}>
                            <Text style={{ fontFamily: "Poppins-Regular", color: MUTED }}>
                                Total
                            </Text>
                            <Text style={{ fontFamily: "Poppins-Bold", color: PRIMARY }}>
                                Ksh {formatKES(total)}
                            </Text>
                        </View>
                    </View>
                </ScrollView>

                {/* ===================== STICKY FOOTER ===================== */}
                <View
                    style={[
                        tw`px-5 pt-3 pb-6`,
                        { backgroundColor: SURFACE, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
                    ]}
                >
                    <View style={tw`flex-row`}>
                        <TouchableOpacity
                            onPress={() => {
                                handleAddToCart();
                                onClose?.();
                            }}
                            activeOpacity={0.9}
                            style={[
                                tw`flex-1 mr-2 py-3 rounded-2xl items-center flex-row justify-center`,
                                { backgroundColor: SOFT },
                            ]}
                        >
                            <ShoppingCart size={18} color={PRIMARY} />
                            <Text style={{ marginLeft: 8, color: PRIMARY, fontFamily: "Poppins-SemiBold" }}>
                                Add to Cart
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
});

/* =====================================================
   PRODUCT CARD
===================================================== */
const ProductCard = React.memo(
    ({ product, isFav, onToggleFav, onOpenDetails }) => {
        const dispatch = useDispatch();

        const handleAddToCart = () => {
            dispatch(
                addToCart({
                    productId: product._id || product.id,
                    title: product.name,
                    price: product.price,
                    image: product.image,
                })
            );
        };

        return (
            <Animated.View entering={FadeInDown}>
                <View
                    style={[
                        tw`rounded-2xl p-4 mb-4`,
                        { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
                    ]}
                >
                    {/* TOP ROW */}
                    <View style={tw`flex-row`}>
                        <Image
                            source={{ uri: product.image }}
                            style={tw`w-24 h-24 rounded-2xl`}
                        />

                        <View style={tw`flex-1 ml-4`}>
                            <View style={tw`flex-row items-start justify-between`}>
                                <View style={tw`flex-1 pr-2`}>
                                    <Text
                                        style={[
                                            tw`mb-1`,
                                            { fontFamily: "Poppins-SemiBold", color: TEXT },
                                        ]}
                                        numberOfLines={2}
                                    >
                                        {product.name}
                                    </Text>

                                    <Text
                                        style={[
                                            tw`text-sm`,
                                            { fontFamily: "Poppins-Regular", color: MUTED },
                                        ]}
                                    >
                                        {product.seller}
                                    </Text>
                                </View>

                                {/* FAVORITE + QUICK CART */}
                                <View style={tw`flex-row`}>
                                    <TouchableOpacity
                                        onPress={() => onToggleFav(product._id || product.id)}
                                        style={[
                                            tw`w-10 h-10 rounded-full items-center justify-center mr-2`,
                                            { backgroundColor: SOFT },
                                        ]}
                                    >
                                        <Heart
                                            size={18}
                                            color={isFav ? "#DC2626" : MUTED}
                                            fill={isFav ? "#DC2626" : "transparent"}
                                        />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={handleAddToCart}
                                        style={[
                                            tw`w-10 h-10 rounded-full items-center justify-center`,
                                            { backgroundColor: SOFT },
                                        ]}
                                    >
                                        <ShoppingCart size={18} color={PRIMARY} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* RATING */}
                            <View style={tw`flex-row items-center mt-3`}>
                                <Star size={14} color="#F59E0B" fill="#F59E0B" />
                                <Text
                                    style={[
                                        tw`ml-1 text-sm`,
                                        { fontFamily: "Poppins-SemiBold", color: TEXT },
                                    ]}
                                >
                                    {product.rating}
                                </Text>
                                <Text
                                    style={[
                                        tw`ml-2 text-xs`,
                                        { fontFamily: "Poppins-Regular", color: MUTED },
                                    ]}
                                >
                                    ({product.reviews} reviews)
                                </Text>
                            </View>

                            {/* PRICE */}
                            <View style={tw`flex-row items-center justify-between mt-3`}>
                                <Text
                                    style={[
                                        tw`text-lg`,
                                        { fontFamily: "Poppins-Bold", color: PRIMARY },
                                    ]}
                                >
                                    Ksh {formatKES(product.price)}
                                </Text>

                                <View
                                    style={[
                                        tw`px-3 py-1 rounded-full`,
                                        { backgroundColor: SOFT, borderWidth: 1, borderColor: BORDER },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            tw`text-xs`,
                                            { fontFamily: "Poppins-SemiBold", color: PRIMARY },
                                        ]}
                                    >
                                        {product.category}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <Divider />

                    {/* ACTION ROW */}
                    <View style={tw`flex-row`}>
                        <View style={tw`flex-1 mr-2`}>
                            <SecondaryButton
                                label="View Details"
                                onPress={() => onOpenDetails(product)}
                            />
                        </View>
                        <View style={tw`flex-1`}>
                            <PrimaryButton
                                label="Add to Cart"
                                icon={ShoppingCart}
                                onPress={handleAddToCart}
                            />
                        </View>
                    </View>
                </View>
            </Animated.View>
        );
    }
);

/* =====================================================
   EMPTY STATE
===================================================== */
const EmptyState = React.memo(({ title, subtitle, actionLabel, onAction }) => (
    <View
        style={[
            tw`rounded-2xl p-4 mb-4 items-center`,
            { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
        ]}
    >
        <View
            style={[
                tw`w-14 h-14 rounded-2xl items-center justify-center mb-3`,
                { backgroundColor: SOFT },
            ]}
        >
            <Sparkles size={22} color={PRIMARY} />
        </View>
        <Text style={[tw`text-base`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
            {title}
        </Text>
        {!!subtitle && (
            <Text
                style={[
                    tw`text-sm mt-1 text-center`,
                    { fontFamily: "Poppins-Regular", color: MUTED },
                ]}
            >
                {subtitle}
            </Text>
        )}
        {!!actionLabel && !!onAction && (
            <View style={tw`w-full mt-4`}>
                <PrimaryButton label={actionLabel} onPress={onAction} />
            </View>
        )}
    </View>
));

/* =====================================================
   SECTION TITLE
===================================================== */
const SectionTitle = React.memo(({ title, subtitle }) => (
    <View style={tw`mb-3`}>
        <Text style={[tw`text-lg`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
            {title}
        </Text>
        {!!subtitle && (
            <Text
                style={[
                    tw`text-sm mt-1`,
                    { fontFamily: "Poppins-Regular", color: MUTED },
                ]}
            >
                {subtitle}
            </Text>
        )}
    </View>
));

/* =====================================================
   MAIN PRODUCTS TAB - FEED-STYLE PAGINATION
   ✅ Clean, deterministic, no momentum hacks
===================================================== */
export default function ProductsTab({
    products,
    filteredProducts,
    favIds,
    toggleFav,
    onOpenProductDetails,
    resetFilters,
    onBuyNow,
    onRate,
    loadMore,      // ✅ PAGINATION TRIGGER
    loading,        // ✅ REDUX LOADING STATE (for first load)
    pagination      // ✅ OPTIONAL: { page, pages, total, etc }
}) {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showDetails, setShowDetails] = useState(false);

    // ✅ FEED-STYLE LOADING MORE STATE - cleaner than momentum ref
    const [loadingMore, setLoadingMore] = useState(false);

    const { height } = Dimensions.get("window");

    const handleOpenDetails = (product) => {
        setSelectedProduct(product);
        setShowDetails(true);
    };

    const handleCloseDetails = () => {
        setShowDetails(false);
        // Delay clearing product to avoid flicker during animation
        setTimeout(() => setSelectedProduct(null), 200);
    };

    // If no items and not loading, show empty state
    if (!filteredProducts?.length && !loading?.products && !loadingMore) {
        return (
            <EmptyState
                title="No products found"
                subtitle="Try clearing filters or searching for a different keyword."
                actionLabel="Reset filters"
                onAction={resetFilters}
            />
        );
    }

    return (
        <View style={tw`flex-1`}>
            {/* ✅ FLATLIST - FEED-STYLE PAGINATION */}
            <FlatList
                data={filteredProducts}
                keyExtractor={(item) => item._id || item.id}

                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}

                renderItem={({ item }) => (
                    <ProductCard
                        product={item}
                        isFav={favIds?.has(item._id)}
                        onToggleFav={toggleFav}
                        onOpenDetails={handleOpenDetails}
                    />
                )}

                ListHeaderComponent={
                    <SectionTitle
                        title="Women-owned products"
                        subtitle="Clean listings, warm design, easy browsing."
                    />
                }

                onEndReached={async () => {
                    if (loadingMore) return;
                    if (pagination && pagination.page >= pagination.pages) return;

                    setLoadingMore(true);
                    try {
                        await loadMore?.();
                    } finally {
                        setLoadingMore(false);
                    }
                }}

                onEndReachedThreshold={0.5}

                ListFooterComponent={
                    loadingMore ? (
                        <View style={{ paddingVertical: 20 }}>
                            <ShimmerLoader />
                        </View>
                    ) : null
                }

                maxToRenderPerBatch={5}
                windowSize={10}
                initialNumToRender={4}
            />


            {/* MODAL - unchanged */}
            <Modal
                visible={showDetails}
                animationType="slide"
                transparent
                statusBarTranslucent
                onRequestClose={handleCloseDetails}
            >
                <View style={tw`flex-1 bg-black/30 justify-end`}>
                    <View
                        style={[
                            tw`bg-white rounded-t-3xl`,
                            { height: height * 0.9 }
                        ]}
                    >
                        {selectedProduct && (
                            <ProductDetailsSheet
                                product={selectedProduct}
                                onClose={handleCloseDetails}
                                toggleFav={toggleFav}
                                // ✅ FIXED: Using _id for favorite check in modal
                                isFav={favIds?.has(selectedProduct._id)}
                                onBuyNow={onBuyNow}
                                onRate={onRate}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}