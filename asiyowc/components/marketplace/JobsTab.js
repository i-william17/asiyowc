import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  Send,
  Heart,
  Sparkles,
} from "lucide-react-native";
import tw from "../../utils/tw";

const PRIMARY = "#6A1B9A";
const SURFACE = "#FFFFFF";
const BORDER = "#EEEAF6";
const TEXT = "#111827";
const MUTED = "#6B7280";
const SOFT = "#EFE9F7";

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

const MetaRow = React.memo(({ icon: Icon, label }) => (
  <View style={tw`flex-row items-center mb-2`}>
    <Icon size={16} color={MUTED} />
    <Text style={[tw`ml-2 text-sm`, { fontFamily: "Poppins-Regular", color: MUTED }]}>
      {label}
    </Text>
  </View>
));

const EmptyState = React.memo(({ title, subtitle, actionLabel, onAction }) => (
  <View
    style={[
      tw`rounded-2xl p-4 mb-4 items-center flex-1 justify-center`,
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

const JobCard = React.memo(({ job, onOpenDetails }) => (
  <Animated.View entering={FadeInDown}>
    <View
      style={[
        tw`rounded-2xl p-4 mb-4 mx-1`,
        { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
      ]}
    >
      <View style={tw`flex-row items-start justify-between`}>
        <View style={tw`flex-1 pr-2`}>
          <Text style={[tw`text-base`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
            {job.title}
          </Text>
          <Text style={[tw`text-sm mt-1`, { fontFamily: "Poppins-Regular", color: MUTED }]}>
            {job.company}
          </Text>
        </View>

        <View
          style={[
            tw`px-3 py-1 rounded-full`,
            { backgroundColor: SOFT, borderWidth: 1, borderColor: BORDER },
          ]}
        >
          <Text style={[tw`text-xs`, { fontFamily: "Poppins-SemiBold", color: PRIMARY }]}>
            {job.type}
          </Text>
        </View>
      </View>

      <Divider />

      <MetaRow icon={MapPin} label={job.location} />
      <MetaRow icon={DollarSign} label={job.salary} />
      <MetaRow icon={Clock} label={`Posted ${job.posted}`} />

      <View style={tw`mt-2`}>
        <PrimaryButton 
          label="View & Apply" 
          icon={Send} 
          onPress={() => onOpenDetails(job)} 
        />
      </View>
    </View>
  </Animated.View>
));

const LoadingFooter = React.memo(() => (
  <View style={tw`py-6 items-center justify-center`}>
    <Text style={{ fontFamily: "Poppins-Regular", color: MUTED }}>
      Loading more jobs...
    </Text>
  </View>
));

export default function JobsTab({
  filteredJobs,
  onOpenJobDetails,
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
      console.error("Error loading more jobs:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const keyExtractor = (item) => item._id || item.id || String(item.jobId);

  const renderItem = ({ item }) => (
    <JobCard job={item} onOpenDetails={onOpenJobDetails} />
  );

  const ListHeader = () => (
    <SectionTitle
      title="Opportunities"
      subtitle="Roles designed for growth and stability."
    />
  );

  const ListFooter = () => (loadingMore ? <LoadingFooter /> : null);

  // Empty state - when no jobs are available
  if (!filteredJobs || filteredJobs.length === 0) {
    return (
      <View style={tw`flex-1 bg-white`}>
        <EmptyState
          title="No jobs match your search"
          subtitle="Try switching the job type or location filters."
          actionLabel="Reset filters"
          onAction={resetFilters}
        />
      </View>
    );
  }

  // Main render with FlatList
  return (
    <View style={tw`flex-1 bg-white`}>
      <FlatList
        data={filteredJobs}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListHeaderComponentStyle={tw`px-4 pt-4`}
        ListFooterComponent={ListFooter}
        ListFooterComponentStyle={tw`px-4 pb-8`}
        contentContainerStyle={tw`px-3 pb-4`}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        
        // Pagination props
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        
        // Refresh props
        refreshing={refreshing}
        onRefresh={onRefresh}
        
        // Performance optimizations
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
      />
    </View>
  );
}