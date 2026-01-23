// legacy.js
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    Dimensions,
    Modal
} from 'react-native';
import {
    MessageCircle,
    ChevronUp,
    ChevronDown,
    ChevronRight,
    Landmark,
    Scale,
    GraduationCap,
    Sparkles,
} from "lucide-react-native";
import { useRouter } from "expo-router";

import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from "react-redux";
import {
    fetchTributes,
    createTribute,
    deleteTribute,
    toggleLikeTribute,
    updateTribute,
    optimisticLike,
    addTributeComment,
    toggleLikeComment,
    deleteTributeComment
} from "../../store/slices/legacySlice";

import ConfirmModal from "../../components/community/ConfirmModal";
import ShimmerLoader from "../../components/ui/ShimmerLoader";
import tw from "../../utils/tw";

// Import the split modules
import {
    Carousel,
    AchievementCarouselItem,
    TimelineCarouselItem,
    HeaderSection,
    QuoteCard,
    LifeHistoryCard,
    ImpactStats,
    HeroSection,
    JoinMovementCard
} from "./../../components/legacy/LegacyComponents";
import {
    CommentsModal,
    TributeModal,
    TributeItem
} from "./../../components/legacy/LegacyModals";

const { width: screenWidth } = Dimensions.get('window');

// ========== LegacyListHeader Component ==========
const LegacyListHeader = React.memo(({ onSharePress, onBackPress }) => {
    // Achievement data for carousel
    const achievementsData = useMemo(() => [
        {
            id: '1',
            title: "First Woman MP",
            description: "Elected in Karachuonyo Constituency, breaking gender barriers in Kenyan politics",
            icon: Landmark,
            year: "1979",
            image: "https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=800"
        },
        {
            id: '2',
            title: "Women's Rights Champion",
            description: "Led the fight for gender equality and women's land ownership rights",
            icon: Scale,
            year: "1980s",
            image: "https://images.unsplash.com/photo-1551135049-8a33b2fb9af3?w=800"
        },
        {
            id: '3',
            title: "Education Advocate",
            description: "Empowered thousands of girls through education scholarships and programs",
            icon: GraduationCap,
            year: "1990s",
            image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800"
        },
        {
            id: '4',
            title: "Foundation Founder",
            description: "Established Asiyo Foundation to continue empowering women across Africa",
            icon: Sparkles,
            year: "2007",
            image: "https://images.unsplash.com/photo-1551836026-d5c2e0c49b61?w=800"
        },
    ], []);

    // Timeline data for carousel
    const timelineData = useMemo(() => [
        {
            id: '1',
            year: "1936",
            event: "Born in Nyanza, Kenya",
            description: "The beginning of a remarkable journey dedicated to women's empowerment",
            image: "https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=800",
            featured: true
        },
        {
            id: '2',
            year: "1979",
            event: "Elected to Parliament",
            description: "First woman elected in Karachuonyo Constituency, making history",
            image: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800"
        },
        {
            id: '3',
            year: "1980s–1990s",
            event: "Women's Rights Crusade",
            description: "Led national campaigns for gender equality and land rights legislation",
            image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w-800"
        },
        {
            id: '4',
            year: "2007",
            event: "Founded Asiyo Foundation",
            description: "Established a legacy institution for women's empowerment across Africa",
            image: "https://res.cloudinary.com/ducckh8ip/image/upload/v1767077909/asiyo-app/u74vjvhuhs5fcydcivlw.jpg"
        },
        {
            id: '5',
            year: "2020",
            event: "Legacy Continues",
            description: "Her impact inspires new generations of African women leaders",
            image: "https://res.cloudinary.com/ducckh8ip/image/upload/v1765555502/WhatsApp_Image_2025-09-11_at_18.54.09_d2731ab3_tue2xs.jpg"
        },
    ], []);

    return (
        <>
            <HeaderSection onBackPress={onBackPress} />
            <View style={tw`px-5 pb-8`}>
                <HeroSection />

                {/* Key Achievements Carousel */}
                <View style={tw`mt-8`}>
                    <View style={tw`flex-row justify-between items-center mb-6`}>
                        <Text style={[tw`text-2xl`, { fontFamily: "Poppins-Bold" }]}>
                            <Text style={tw`text-purple-900`}>Key </Text>
                            <Text style={{ color: "#D4AF37" }}>Achievements</Text>
                        </Text>

                        <View style={tw`flex-row items-center`}>
                            <Text style={[tw`text-purple-600 text-sm mr-2`, { fontFamily: 'Poppins-Regular' }]}>
                                Swipe to explore
                            </Text>
                            <ChevronRight size={16} color="#7C3AED" />
                        </View>
                    </View>

                    <Carousel
                        data={achievementsData}
                        renderItem={({ item }) => <AchievementCarouselItem item={item} />}
                        itemWidth={screenWidth * 0.85}
                    />
                </View>

                {/* Life Timeline Carousel */}
                <View style={tw`mt-8`}>
                    <View style={tw`flex-row justify-between items-center mb-6`}>
                        <Text style={[tw`text-2xl`, { fontFamily: "Poppins-Bold" }]}>
                            <Text style={tw`text-purple-900`}>Life </Text>
                            <Text style={{ color: "#D4AF37" }}>Timeline</Text>
                        </Text>

                        <View style={tw`flex-row items-center`}>
                            <Text style={[tw`text-purple-600 text-sm mr-2`, { fontFamily: 'Poppins-Regular' }]}>
                                Swipe to explore
                            </Text>
                            <ChevronRight size={16} color="#7C3AED" />
                        </View>
                    </View>

                    <Carousel
                        data={timelineData}
                        renderItem={({ item }) => (
                            <TimelineCarouselItem
                                item={item}
                                isFeatured={item.featured}
                            />
                        )}
                        itemWidth={screenWidth * 0.85}
                    />
                </View>

                {/* Community Tributes Header */}
                <View style={tw`flex-row justify-between items-center mt-8 mb-6`}>
                    <Text style={[tw`text-2xl`, { fontFamily: "Poppins-Bold" }]}>
                        <Text style={tw`text-purple-900`}>Community </Text>
                        <Text style={{ color: "#D4AF37" }}>Tributes</Text>
                    </Text>

                    <TouchableOpacity
                        style={tw`flex-row items-center bg-purple-900 
                                px-5 py-3 rounded-full shadow-lg`}
                        onPress={onSharePress}
                        activeOpacity={0.7}
                    >
                        <MessageCircle size={20} color="#FFFFFF" />
                        <Text style={[tw`text-white ml-2 text-sm`, { fontFamily: 'Poppins-SemiBold' }]}>
                            Share Tribute
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </>
    );
});

export default function LegacyArchiveScreen() {
    const dispatch = useDispatch();

    // State variables
    const [page, setPage] = useState(1);
    const [editingTribute, setEditingTribute] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [newTribute, setNewTribute] = useState({ name: '', message: '' });
    const [deletingTribute, setDeletingTribute] = useState(null);
    const [lastSubmitted, setLastSubmitted] = useState(null);
    const [visibleTributes, setVisibleTributes] = useState(5);
    const router = useRouter();

    const handleBackPress = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/modals/moreMenu");
        }
    }, [router]);

    // Loading ref
    const loadingMoreRef = useRef(false);
    const listRef = useRef(null);

    // Redux state
    const legacyState = useSelector((state) => state.legacy || {});
    const {
        tributes = [],
        loading = false,
        error = null,
        limitReached = false,
    } = legacyState;

    const { token, user } = useSelector((state) => state.auth);

    const handleSharePress = useCallback(() => {
        setModalVisible(true);
    }, []);

    // Fetch tributes on load
    useEffect(() => {
        setPage(1);
        dispatch(fetchTributes({ page: 1, limit: 5 }));
    }, [dispatch]);

    // Load more tributes handler
    const handleLoadMoreTributes = useCallback(() => {
        if (tributes.length > visibleTributes) {
            setVisibleTributes(prev => prev + 5);
        } else if (!loading && !loadingMoreRef.current && !limitReached) {
            loadingMoreRef.current = true;
            const nextPage = page + 1;
            setPage(nextPage);

            dispatch(fetchTributes({ page: nextPage, limit: 5 }))
                .unwrap()
                .finally(() => {
                    loadingMoreRef.current = false;
                });
        }
    }, [tributes.length, visibleTributes, loading, page, dispatch, limitReached]);

    const handleShowLessTributes = useCallback(() => {
        setVisibleTributes(5);

        // Smooth scroll back to top of tributes
        requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({
                offset: 0,
                animated: true,
            });
        });
    }, []);

    // Tribute submission handler
    const handleSubmitTribute = useCallback(async () => {
        if (!newTribute.message.trim()) return;
        if (lastSubmitted && Date.now() - lastSubmitted < 60000) return;

        try {
            if (editingTribute) {
                await dispatch(
                    updateTribute({
                        id: editingTribute._id,
                        payload: { message: newTribute.message },
                        token,
                    })
                ).unwrap();
            } else {
                await dispatch(
                    createTribute({
                        payload: { message: newTribute.message },
                        token,
                    })
                ).unwrap();
            }

            // Reset state
            setPage(1);
            setVisibleTributes(5);
            loadingMoreRef.current = false;
            dispatch(fetchTributes({ page: 1, limit: 5 }));
            setNewTribute({ message: "" });
            setEditingTribute(null);
            setLastSubmitted(Date.now());
            setModalVisible(false);

            if (wordCount > WORD_LIMIT) return;

        } catch (err) {
            console.error("Tribute submit failed", err);
        }
    }, [dispatch, newTribute.message, editingTribute, lastSubmitted, token]);

    // Delete tribute handler
    const handleDeleteTribute = useCallback((id) => {
        dispatch(deleteTribute({ id, token }));
        setDeletingTribute(null);
    }, [dispatch, token]);

    // Edit tribute handler
    const handleEditTribute = useCallback((tribute) => {
        setEditingTribute(tribute);
        setNewTribute({ message: tribute.message });
        setModalVisible(true);
    }, []);

    // Like tribute handler
    const handleToggleLike = useCallback((id) => {
        if (!token || !user) return;

        const currentUserId = user._id;
        dispatch(optimisticLike({ id, userId: currentUserId }));

        dispatch(toggleLikeTribute({ id, token }))
            .unwrap()
            .catch(() => {
                dispatch(optimisticLike({ id, userId: currentUserId }));
                console.error('Like failed');
            });
    }, [dispatch, token, user]);

    // Comment handlers
    const handleAddComment = useCallback((tributeId, message) => {
        if (!message.trim()) return;
        dispatch(
            addTributeComment({
                tributeId,
                payload: { message },
                token,
            })
        );
    }, [dispatch, token]);

    const handleLikeComment = useCallback((tributeId, commentId) => {
        dispatch(
            toggleLikeComment({
                tributeId,
                commentId,
                token,
            })
        );
    }, [dispatch, token]);

    const handleDeleteComment = useCallback((tributeId, commentId) => {
        dispatch(
            deleteTributeComment({
                tributeId,
                commentId,
                token,
            })
        );
    }, [dispatch, token]);

    // Data for other sections
    const quotes = useMemo(() => [
        {
            id: '1',
            text: "Women must be at the forefront of change. We must be fearless in our pursuit of equality and justice.",
            context: "UN Women's Conference, 1995"
        },
        {
            id: '2',
            text: "The strength of a woman lies not in what she has, but in what she gives.",
            context: "Asiyo Foundation Inaugural Speech, 2007"
        },
        {
            id: '3',
            text: "Education is the greatest weapon against poverty and the key to unlocking women's potential.",
            context: "Education Summit, 1998"
        },
        {
            id: '4',
            text: "When women rise, entire communities rise with them.",
            context: "African Women's Leadership Forum, 2010"
        }
    ], []);

    const lifeHistoryVideos = useMemo(() => [
        {
            id: '1',
            title: "Mama Phoebe Asiyo.",
            description: "She has been one of the faces if women in Kenyan politics.She enjoyed a colourful political career and was an outspoken advocate for women's rights in the country for more than two decades... Phoebe Asiyo was elected to parliament in 1992 as one of the six women who made it to Kenyans first multi party parliament after involvement in the  campaign for democracy.",
            date: "Sunday Live, CITIZEN TV, 2010",
            duration: "3:49",
            views: 45000,
            image: "https://res.cloudinary.com/ducckh8ip/image/upload/v1766603798/asiyo-app/a8vl3ff1muzlnnunkjy3.jpg",
            url: "https://youtu.be/NHSSkzDaB6I"
        },
        {
            id: '2',
            title: "Strength Of A Woman: Phoebe Asiyo",
            description: "Phoebe Asiyo believed that a woman’s true strength lies not in power over others, but in her unwavering courage to stand for justice, uplift her community, and transform adversity into leadership that inspires generations.",
            date: "Strength Of A Woman, 2015",
            duration: "4.36",
            views: 7000,
            image: "https://res.cloudinary.com/ducckh8ip/image/upload/v1766603798/asiyo-app/a8vl3ff1muzlnnunkjy3.jpg",
            url: "https://youtu.be/ioLWNL7JX8o"
        },
        {
            id: '3',
            title: "Keynote speech by The Honorable Phoebe Asiyo, CEDPA Alumna 1978",
            description: "On June 18, 2014, Plan International USA celebrated the 60th CEDPA GWIM workshop with a reception at the National Press Club. The program included two speeches from two workshop participants and an inspirational key note speech from the Honorable Phoebe Asiyo, one of the first workshop alumni from 1978.",
            date: "2014 CEDPA GWIM 60 Reception",
            duration: "22:17",
            views: 1000,
            image: "https://res.cloudinary.com/ducckh8ip/image/upload/v1766603798/asiyo-app/a8vl3ff1muzlnnunkjy3.jpg",
            url: "https://youtu.be/s808GHpZXJ0"
        }
    ], []);

    // Render tribute item
    const renderTributeItem = useCallback(
        ({ item, index }) => {
            const isLastVisible = index === visibleTributes - 1;

            const canShowMore =
                tributes.length > visibleTributes || !limitReached;

            const canShowLess = visibleTributes > 5;

            return (
                <>
                    <TributeItem
                        tribute={item}
                        currentUserId={user?._id}
                        onLike={handleToggleLike}
                        onEditSave={(id, message) => {
                            dispatch(updateTribute({ id, payload: { message }, token }));
                        }}
                        onDelete={(id) => setDeletingTribute(id)}
                        onAddComment={handleAddComment}
                        onLikeComment={handleLikeComment}
                        onDeleteComment={handleDeleteComment}
                    />

                    {isLastVisible && (canShowMore || canShowLess) && (
                        <View style={tw`items-center my-5`}>
                            {canShowMore && (
                                <TouchableOpacity
                                    onPress={handleLoadMoreTributes}
                                    style={tw`
                  flex-row items-center px-6 py-3
                  bg-purple-50 border border-purple-200
                  rounded-full mb-3
                `}
                                    activeOpacity={0.85}
                                >
                                    <ChevronDown size={18} color="#7C3AED" />
                                    <Text
                                        style={[
                                            tw`text-purple-700 ml-2`,
                                            { fontFamily: 'Poppins-SemiBold' },
                                        ]}
                                    >
                                        See more tributes
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {canShowLess && (
                                <TouchableOpacity
                                    onPress={handleShowLessTributes}
                                    style={tw`
                  flex-row items-center px-6 py-3
                  bg-gray-100 border border-gray-200
                  rounded-full
                `}
                                    activeOpacity={0.85}
                                >
                                    <ChevronUp size={18} color="#6B7280" />
                                    <Text
                                        style={[
                                            tw`text-gray-700 ml-2`,
                                            { fontFamily: 'Poppins-SemiBold' },
                                        ]}
                                    >
                                        Show less
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </>
            );
        },
        [
            visibleTributes,
            tributes.length,
            limitReached,
            handleLoadMoreTributes,
            handleShowLessTributes,
            handleToggleLike,
            handleAddComment,
            handleLikeComment,
            handleDeleteComment,
            dispatch,
            token,
            user?._id,
        ]
    );

    // List Footer Component
    const ListFooterComponent = useMemo(() => (
        <View style={tw`px-5 pb-8`}>
            {/* Inspiring Words */}
            <Text style={[tw`text-2xl mt-8 mb-6`, { fontFamily: "Poppins-Bold" }]}>
                <Text style={tw`text-purple-900`}>Inspiring </Text>
                <Text style={{ color: "#D4AF37" }}>Words</Text>
            </Text>

            <View>
                {quotes.map((quote, index) => (
                    <View key={`quote-${quote.id}`} style={index > 0 && tw`mt-4`}>
                        <QuoteCard quote={quote} />
                    </View>
                ))}
            </View>

            {/* Life History (was Speeches & Addresses) */}
            <Text style={[tw`text-2xl mt-8 mb-6`, { fontFamily: "Poppins-Bold" }]}>
                <Text style={tw`text-purple-900`}>Life </Text>
                <Text style={{ color: "#D4AF37" }}>History</Text>
            </Text>

            <View>
                {lifeHistoryVideos.map((video, index) => (
                    <View key={`video-${video.id}`} style={index > 0 && tw`mt-4`}>
                        <LifeHistoryCard video={video} />
                    </View>
                ))}
            </View>

            {/* Impact Stats */}
            <ImpactStats />

            {/* Join Movement */}
            <JoinMovementCard />
        </View>
    ), [quotes, lifeHistoryVideos]);

    // Loading state
    if (loading && tributes.length === 0) {
        return (
            <LinearGradient
                colors={['#F5F3FF', '#FFFFFF', '#FFFBEB']}
                style={tw`flex-1`}
            >
                <HeaderSection onBackPress={handleBackPress} />
                <ShimmerLoader count={3} />
            </LinearGradient>
        );
    }

    return (
        <LinearGradient
            colors={['#F5F3FF', '#FFFFFF', '#FFFBEB']}
            style={tw`flex-1`}
        >
            <FlatList
                ref={listRef}
                data={tributes.slice(0, visibleTributes)}
                renderItem={renderTributeItem}
                keyExtractor={(item) => item._id}
                ListHeaderComponent={
                    <LegacyListHeader
                        onSharePress={handleSharePress}
                        onBackPress={handleBackPress}
                    />
                }
                ListFooterComponent={ListFooterComponent}
                ListEmptyComponent={
                    <View style={tw`px-5 py-12 items-center`}>
                        <MessageCircle size={64} color="#A78BFA" />
                        <Text style={[tw`text-purple-600 text-xl mt-6 text-center`, { fontFamily: 'Poppins-SemiBold' }]}>
                            Your voice becomes part of her legacy
                        </Text>
                        <Text style={[tw`text-gray-600 text-center mt-3`, { fontFamily: 'Poppins-Regular' }]}>
                            Be the first to share how Mama Phoebe inspired you
                        </Text>
                        <TouchableOpacity
                            style={tw`mt-5 bg-purple-600 px-4 py-2.5 rounded-full`}
                            onPress={handleSharePress}
                        >
                            <Text
                                style={[
                                    tw`text-white text-sm`,
                                    { fontFamily: "Poppins-SemiBold" },
                                ]}
                            >
                                Share Tribute
                            </Text>
                        </TouchableOpacity>

                    </View>
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={tributes.length === 0 ? { flexGrow: 1 } : null}
            />

            {/* Tribute Modal */}
            <TributeModal
                modalVisible={modalVisible}
                setModalVisible={setModalVisible}
                newTribute={newTribute}
                setNewTribute={setNewTribute}
                handleSubmitTribute={handleSubmitTribute}
                lastSubmitted={lastSubmitted}
                user={user}
                editingTribute={editingTribute}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                visible={!!deletingTribute}
                title="Delete Tribute"
                message="Are you sure you want to delete this tribute? This action cannot be undone."
                onConfirm={() => handleDeleteTribute(deletingTribute)}
                onCancel={() => setDeletingTribute(null)}
            />
        </LinearGradient>
    );
}