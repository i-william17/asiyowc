import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  BadgeCheck,
  Send,
  Sparkles,
} from "lucide-react-native";
import tw from "../../utils/tw";

const PRIMARY = "#6A1B9A";
const SURFACE = "#FFFFFF";
const BORDER = "#EEEAF6";
const TEXT = "#111827";
const MUTED = "#6B7280";
const SOFT = "#EFE9F7";

/* =====================================================
   REUSABLE COMPONENTS
===================================================== */

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

const EmptyState = React.memo(({ title, subtitle, actionLabel, onAction }) => (
  <View
    style={[
      tw`rounded-2xl p-6 items-center flex-1 justify-center`,
      { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, margin: 16 },
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

const SectionTitle = React.memo(({ title, subtitle }) => (
  <View style={tw`mb-3 px-1`}>
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
   SKILL SWAP CARD
===================================================== */

const SkillSwapCard = React.memo(({ person, onOpenDetails }) => (
  <Animated.View entering={FadeInDown}>
    <View
      style={[
        tw`rounded-2xl p-4 mb-4 mx-1`,
        { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
      ]}
    >
      <View style={tw`flex-row items-center`}>
        <Image 
          source={{ uri: person.avatar || 'https://via.placeholder.com/48' }} 
          style={tw`w-12 h-12 rounded-full`} 
        />
        <View style={tw`flex-1 ml-3`}>
          <Text style={[tw`text-base`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
            {person.name}
          </Text>
          <View
            style={[
              tw`mt-2 px-3 py-1 rounded-full self-start`,
              { backgroundColor: SOFT, borderWidth: 1, borderColor: BORDER },
            ]}
          >
            <Text style={[tw`text-xs`, { fontFamily: "Poppins-SemiBold", color: PRIMARY }]}>
              {person.skill}
            </Text>
          </View>
        </View>
        <BadgeCheck size={20} color={PRIMARY} />
      </View>

      <Divider />

      <View
        style={[
          tw`rounded-2xl p-3 mb-3`,
          { backgroundColor: "#F5F3FF", borderWidth: 1, borderColor: BORDER },
        ]}
      >
        <Text style={[tw`text-xs`, { fontFamily: "Poppins-Regular", color: MUTED }]}>
          Offering
        </Text>
        <Text style={[tw`text-sm mt-1`, { fontFamily: "Poppins-Regular", color: TEXT }]}>
          {person.offer}
        </Text>
      </View>

      <View
        style={[
          tw`rounded-2xl p-3`,
          { backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A" },
        ]}
      >
        <Text style={[tw`text-xs`, { fontFamily: "Poppins-Regular", color: MUTED }]}>
          Looking for
        </Text>
        <Text style={[tw`text-sm mt-1`, { fontFamily: "Poppins-Regular", color: "#92400E" }]}>
          {person.exchange}
        </Text>
      </View>

      <View style={tw`mt-3`}>
        <PrimaryButton
          label="Connect & Swap"
          icon={Send}
          onPress={() => onOpenDetails(person)}
        />
      </View>
    </View>
  </Animated.View>
));

/* =====================================================
   LOADING FOOTER
===================================================== */

const LoadingFooter = React.memo(() => (
  <View style={tw`py-6 items-center justify-center`}>
    <Text style={{ fontFamily: "Poppins-Regular", color: MUTED }}>
      Loading more skill swaps...
    </Text>
  </View>
));

/* =====================================================
   MAIN SKILLS TAB WITH FLATLIST + PAGINATION
===================================================== */

export default function SkillsTab({
  filteredSkills,
  onOpenSkillDetails,
  resetFilters,
  loadMore,
  refreshing = false,
  onRefresh,
}) {
  const [loadingMore, setLoadingMore] = useState(false);

  const handleLoadMore = async () => {
    if (loadingMore || !loadMore) return;
    setLoadingMore(true);
    try {
      await loadMore();
    } catch (error) {
      console.error("Error loading more skills:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const keyExtractor = (item) => item._id || item.id || String(item.skillId);

  const renderItem = ({ item }) => (
    <SkillSwapCard person={item} onOpenDetails={onOpenSkillDetails} />
  );

  const ListHeader = () => (
    <SectionTitle
      title="Skill Swap"
      subtitle="Exchange value, learn together, build trust."
    />
  );

  const ListFooter = () => (loadingMore ? <LoadingFooter /> : null);

  // Empty state - when no skill swaps are available
  if (!filteredSkills || filteredSkills.length === 0) {
    return (
      <View style={tw`flex-1 bg-white`}>
        <EmptyState
          title="No skill matches found"
          subtitle="Try another keyword or switch the tag filter."
          actionLabel="Reset filters"
          onAction={resetFilters}
        />
      </View>
    );
  }

  // Main render with FlatList - ENABLES PAGINATION
  return (
    <View style={tw`flex-1 bg-white`}>
      <FlatList
        data={filteredSkills}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        
        // Header
        ListHeaderComponent={ListHeader}
        ListHeaderComponentStyle={tw`px-4 pt-4`}
        
        // Footer with loading spinner
        ListFooterComponent={ListFooter}
        ListFooterComponentStyle={tw`px-4 pb-8`}
        
        // Container styling
        contentContainerStyle={tw`px-3 pb-4`}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        
        /* 🔥 PAGINATION - This enables infinite scroll */
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        
        /* 🔥 PULL TO REFRESH */
        refreshing={refreshing}
        onRefresh={onRefresh}
        
        /* 🔥 PERFORMANCE OPTIMIZATIONS */
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
      />
    </View>
  );
}