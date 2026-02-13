import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import {
  Filter,
  ArrowUpDown,
  Check,
  Briefcase,
  MapPin,
  TrendingUp,
  Star,
} from "lucide-react-native";
import tw from "../../utils/tw";
import ModalShell from "./ModalShell";

const PRIMARY = "#6A1B9A";
const SURFACE = "#FFFFFF";
const BORDER = "#EEEAF6";
const TEXT = "#111827";
const MUTED = "#6B7280";
const SOFT = "#EFE9F7";

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

const Card = React.memo(({ children, style }) => (
  <View
    style={[
      tw`rounded-2xl p-4 mb-3`,
      { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
      style,
    ]}
  >
    {children}
  </View>
));

export default function FilterModal({
  visible,
  onClose,
  activeTab,
  sortMode,
  setSortMode,
  productCategory,
  setProductCategory,
  onlyFavorites,
  setOnlyFavorites,
  jobType,
  setJobType,
  jobLocation,
  setJobLocation,
  fundStatus,
  setFundStatus,
  skillTag,
  setSkillTag,
  resetFilters,
}) {
  return (
    <ModalShell
      visible={visible}
      title="Filters & sorting"
      onClose={onClose}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[tw`text-sm mb-3`, { fontFamily: "Poppins-Regular", color: MUTED }]}>
          Filters change depending on the current tab.
        </Text>

        <Card style={tw`mb-3`}>
          <Text style={[tw`text-base`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
            Sorting
          </Text>
          <Text style={[tw`text-xs mt-1`, { fontFamily: "Poppins-Regular", color: MUTED }]}>
            Choose how results should be ordered.
          </Text>

          <View style={tw`mt-3`}>
            {[
              { key: "relevance", label: "Relevance (default)" },
              { key: "price_low", label: "Price: Low to High (products)" },
              { key: "price_high", label: "Price: High to Low (products)" },
              { key: "newest", label: "Newest (basic)" },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setSortMode(opt.key)}
                style={[
                  tw`flex-row items-center justify-between py-3 px-3 rounded-xl mb-2`,
                  { backgroundColor: SOFT, borderWidth: 1, borderColor: BORDER },
                ]}
              >
                <Text style={[tw`text-sm`, { fontFamily: "Poppins-SemiBold", color: TEXT }]}>
                  {opt.label}
                </Text>
                {sortMode === opt.key ? <Check size={18} color={PRIMARY} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {activeTab === "products" && (
          <Card style={tw`mb-3`}>
            <Text style={[tw`text-base`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
              Products
            </Text>

            <View style={tw`mt-3`}>
              <Text style={[tw`text-sm`, { fontFamily: "Poppins-SemiBold", color: TEXT }]}>
                Category
              </Text>

              <View style={tw`flex-row flex-wrap mt-2`}>
                {["all", "crafts", "beauty", "fashion", "home"].map((c) => {
                  const active = productCategory === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setProductCategory(c)}
                      style={[
                        tw`px-3 py-2 rounded-full mr-2 mb-2`,
                        { backgroundColor: active ? PRIMARY : SOFT },
                      ]}
                    >
                      <Text
                        style={[
                          tw`text-xs`,
                          { fontFamily: "Poppins-SemiBold" },
                          active ? tw`text-white` : { color: PRIMARY },
                        ]}
                      >
                        {c}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                onPress={() => setOnlyFavorites((p) => !p)}
                style={[
                  tw`mt-3 flex-row items-center justify-between px-3 py-3 rounded-xl`,
                  { backgroundColor: SOFT, borderWidth: 1, borderColor: BORDER },
                ]}
              >
                <Text style={[tw`text-sm`, { fontFamily: "Poppins-SemiBold", color: TEXT }]}>
                  Only favorites
                </Text>
                <View style={[tw`w-10 h-6 rounded-full justify-center`, { backgroundColor: onlyFavorites ? PRIMARY : "#D1D5DB" }]}>
                  <View
                    style={[
                      tw`w-5 h-5 rounded-full`,
                      {
                        backgroundColor: "#FFFFFF",
                        marginLeft: onlyFavorites ? 18 : 2,
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {activeTab === "jobs" && (
          <Card style={tw`mb-3`}>
            <Text style={[tw`text-base`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
              Jobs
            </Text>

            <View style={tw`mt-3`}>
              <Text style={[tw`text-sm`, { fontFamily: "Poppins-SemiBold", color: TEXT }]}>
                Type
              </Text>

              <View style={tw`flex-row flex-wrap mt-2`}>
                {["all", "full-time", "part-time", "remote"].map((t) => {
                  const active = jobType === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setJobType(t)}
                      style={[
                        tw`px-3 py-2 rounded-full mr-2 mb-2`,
                        { backgroundColor: active ? PRIMARY : SOFT },
                      ]}
                    >
                      <Text
                        style={[
                          tw`text-xs`,
                          { fontFamily: "Poppins-SemiBold" },
                          active ? tw`text-white` : { color: PRIMARY },
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[tw`text-sm mt-3`, { fontFamily: "Poppins-SemiBold", color: TEXT }]}>
                Location
              </Text>

              <View style={tw`flex-row flex-wrap mt-2`}>
                {["all", "nairobi", "remote", "lagos"].map((l) => {
                  const active = jobLocation === l;
                  return (
                    <TouchableOpacity
                      key={l}
                      onPress={() => setJobLocation(l)}
                      style={[
                        tw`px-3 py-2 rounded-full mr-2 mb-2`,
                        { backgroundColor: active ? PRIMARY : SOFT },
                      ]}
                    >
                      <Text
                        style={[
                          tw`text-xs`,
                          { fontFamily: "Poppins-SemiBold" },
                          active ? tw`text-white` : { color: PRIMARY },
                        ]}
                      >
                        {l}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Card>
        )}

        {activeTab === "funding" && (
          <Card style={tw`mb-3`}>
            <Text style={[tw`text-base`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
              Funding
            </Text>

            <View style={tw`mt-3 flex-row`}>
              <TouchableOpacity
                onPress={() => setFundStatus("open")}
                style={[
                  tw`flex-1 py-3 rounded-xl items-center mr-2`,
                  { backgroundColor: fundStatus === "open" ? PRIMARY : SOFT },
                ]}
              >
                <Text style={[
                  { fontFamily: "Poppins-SemiBold" },
                  fundStatus === "open" ? tw`text-white` : { color: PRIMARY }
                ]}>
                  Open only
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setFundStatus("all")}
                style={[
                  tw`flex-1 py-3 rounded-xl items-center`,
                  { backgroundColor: fundStatus === "all" ? PRIMARY : SOFT },
                ]}
              >
                <Text style={[
                  { fontFamily: "Poppins-SemiBold" },
                  fundStatus === "all" ? tw`text-white` : { color: PRIMARY }
                ]}>
                  All
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {activeTab === "skills" && (
          <Card style={tw`mb-3`}>
            <Text style={[tw`text-base`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
              Skills
            </Text>

            <View style={tw`flex-row flex-wrap mt-3`}>
              {["all", "design", "marketing", "dev", "finance"].map((t) => {
                const active = skillTag === t;
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setSkillTag(t)}
                    style={[
                      tw`px-3 py-2 rounded-full mr-2 mb-2`,
                      { backgroundColor: active ? PRIMARY : SOFT },
                    ]}
                  >
                    <Text
                      style={[
                        tw`text-xs`,
                        { fontFamily: "Poppins-SemiBold" },
                        active ? tw`text-white` : { color: PRIMARY },
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        )}

        <View style={tw`flex-row`}>
          <View style={tw`flex-1 mr-2`}>
            <SecondaryButton label="Reset" icon={Filter} onPress={resetFilters} />
          </View>
          <View style={tw`flex-1`}>
            <PrimaryButton label="Done" icon={Check} onPress={onClose} />
          </View>
        </View>

        <View style={tw`h-4`} />
      </ScrollView>
    </ModalShell>
  );
}