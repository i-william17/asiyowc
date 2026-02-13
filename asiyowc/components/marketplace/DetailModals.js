import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import {
  ShoppingBag,
  Briefcase,
  Heart,
  Star,
  MapPin,
  DollarSign,
  Clock,
  Send,
  Globe,
  Users,
  Calendar,
  TrendingUp,
  BadgeCheck,
  Sparkles,
} from "lucide-react-native";
import tw from "../../utils/tw";
import ModalShell from "./ModalShell";

const PRIMARY = "#6A1B9A";
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

const MetaRow = React.memo(({ icon: Icon, label }) => (
  <View style={tw`flex-row items-center mb-2`}>
    <Icon size={16} color={MUTED} />
    <Text style={[tw`ml-2 text-sm`, { fontFamily: "Poppins-Regular", color: MUTED }]}>
      {label}
    </Text>
  </View>
));

const ProductDetailsModal = ({ product, isFav, toggleFav, onClose }) => {
  if (!product) return null;

  return (
    <ModalShell
      visible={!!product}
      title="Product details"
      onClose={onClose}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={tw`flex-row`}>
          <Image source={{ uri: product.image }} style={tw`w-24 h-24 rounded-2xl`} />
          <View style={tw`flex-1 ml-4`}>
            <Text style={[tw`text-base`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
              {product.name}
            </Text>
            <Text style={[tw`text-sm mt-1`, { fontFamily: "Poppins-Regular", color: MUTED }]}>
              {product.seller}
            </Text>

            <View style={tw`flex-row items-center mt-2`}>
              <Star size={14} color="#F59E0B" fill="#F59E0B" />
              <Text style={[tw`ml-1`, { fontFamily: "Poppins-SemiBold", color: TEXT }]}>
                {product.rating}
              </Text>
              <Text style={[tw`ml-2 text-xs`, { fontFamily: "Poppins-Regular", color: MUTED }]}>
                ({product.reviews} reviews)
              </Text>
            </View>

            <Text style={[tw`text-lg mt-2`, { fontFamily: "Poppins-Bold", color: PRIMARY }]}>
              Ksh {formatKES(product.price)}
            </Text>
          </View>
        </View>

        <Divider />

        <MetaRow icon={MapPin} label={product.location} />
        <MetaRow icon={ShoppingBag} label={`Category: ${product.category}`} />
        <MetaRow icon={Globe} label={`Tags: ${(product.tags || []).join(", ")}`} />

        <Text style={[tw`mt-2 text-sm`, { fontFamily: "Poppins-Regular", color: TEXT }]}>
          {product.description}
        </Text>

        <View style={tw`mt-4`}>
          <PrimaryButton
            label={isFav ? "Remove from favorites" : "Add to favorites"}
            icon={Heart}
            onPress={() => toggleFav(product.id)}
          />
          <View style={tw`h-2`} />
          <SecondaryButton
            label="Message seller"
            icon={Send}
            onPress={() => Alert.alert("Demo", "Hook this to your DM chat creation flow.")}
          />
        </View>

        <View style={tw`h-4`} />
      </ScrollView>
    </ModalShell>
  );
};

const JobDetailsModal = ({ job, onClose }) => {
  if (!job) return null;

  return (
    <ModalShell
      visible={!!job}
      title="Job details"
      onClose={onClose}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[tw`text-lg`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
          {job.title}
        </Text>
        <Text style={[tw`text-sm mt-1`, { fontFamily: "Poppins-Regular", color: MUTED }]}>
          {job.company}
        </Text>

        <Divider />

        <MetaRow icon={MapPin} label={job.location} />
        <MetaRow icon={Briefcase} label={job.type} />
        <MetaRow icon={DollarSign} label={job.salary} />
        <MetaRow icon={Clock} label={`Posted ${job.posted}`} />

        <Text style={[tw`mt-2 text-sm`, { fontFamily: "Poppins-Regular", color: TEXT }]}>
          {job.description}
        </Text>

        <Text style={[tw`mt-4 text-sm`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
          Requirements
        </Text>
        {(job.requirements || []).map((r, idx) => (
          <View key={`${job.id}-req-${idx}`} style={tw`flex-row items-start mt-2`}>
            <View style={[tw`w-2 h-2 rounded-full mt-2`, { backgroundColor: PRIMARY }]} />
            <Text style={[tw`ml-2 flex-1 text-sm`, { fontFamily: "Poppins-Regular", color: MUTED }]}>
              {r}
            </Text>
          </View>
        ))}

        <View style={tw`mt-4`}>
          <PrimaryButton
            label="Apply now"
            icon={Send}
            onPress={() => Alert.alert("Demo", "Hook to your job application form + backend.")}
          />
          <View style={tw`h-2`} />
          <SecondaryButton
            label="Save job"
            icon={Heart}
            onPress={() => Alert.alert("Demo", "Implement saved jobs in Redux + backend.")}
          />
        </View>

        <View style={tw`h-4`} />
      </ScrollView>
    </ModalShell>
  );
};

const FundDetailsModal = ({ fund, onClose }) => {
  if (!fund) return null;

  return (
    <ModalShell
      visible={!!fund}
      title="Funding details"
      onClose={onClose}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[tw`text-lg`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
          {fund.title}
        </Text>
        <Text style={[tw`text-sm mt-1`, { fontFamily: "Poppins-Regular", color: MUTED }]}>
          {fund.provider}
        </Text>

        <Divider />

        <View
          style={[
            tw`rounded-2xl p-3`,
            { backgroundColor: "#F6FDF9", borderWidth: 1, borderColor: "#D1FAE5" },
          ]}
        >
          <Text style={[tw`text-xs`, { fontFamily: "Poppins-Regular", color: MUTED }]}>
            Funding amount
          </Text>
          <Text style={[tw`text-lg mt-1`, { fontFamily: "Poppins-Bold", color: "#047857" }]}>
            {fund.amount}
          </Text>
        </View>

        <View style={tw`mt-3`}>
          <MetaRow icon={Calendar} label={`Deadline: ${fund.deadline}`} />
          <MetaRow icon={Users} label={`${fund.applicants} applicants`} />
          <MetaRow icon={TrendingUp} label={`Focus: ${fund.focus}`} />
        </View>

        <Text style={[tw`mt-2 text-sm`, { fontFamily: "Poppins-Regular", color: TEXT }]}>
          {fund.description}
        </Text>

        <Text style={[tw`mt-4 text-sm`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
          How to apply
        </Text>
        {(fund.howToApply || []).map((step, idx) => (
          <View key={`${fund.id}-step-${idx}`} style={tw`flex-row items-start mt-2`}>
            <View
              style={[
                tw`w-6 h-6 rounded-full items-center justify-center`,
                { backgroundColor: SOFT, borderWidth: 1, borderColor: BORDER },
              ]}
            >
              <Text style={[tw`text-xs`, { fontFamily: "Poppins-Bold", color: PRIMARY }]}>
                {idx + 1}
              </Text>
            </View>
            <Text style={[tw`ml-2 flex-1 text-sm`, { fontFamily: "Poppins-Regular", color: MUTED }]}>
              {step}
            </Text>
          </View>
        ))}

        <View style={tw`mt-4`}>
          <PrimaryButton
            label="Start application"
            icon={Send}
            onPress={() => Alert.alert("Demo", "Hook this to your application flow / webview / form.")}
          />
          <View style={tw`h-2`} />
          <SecondaryButton
            label="Share opportunity"
            icon={Globe}
            onPress={() => Alert.alert("Demo", "Hook to Share API (expo-sharing).")}
          />
        </View>

        <View style={tw`h-4`} />
      </ScrollView>
    </ModalShell>
  );
};

const SkillDetailsModal = ({ person, onClose }) => {
  if (!person) return null;

  return (
    <ModalShell
      visible={!!person}
      title="Skill swap"
      onClose={onClose}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={tw`flex-row items-center`}>
          <Image source={{ uri: person.avatar }} style={tw`w-14 h-14 rounded-full`} />
          <View style={tw`flex-1 ml-3`}>
            <Text style={[tw`text-lg`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
              {person.name}
            </Text>
            <Text style={[tw`text-sm mt-1`, { fontFamily: "Poppins-Regular", color: MUTED }]}>
              {person.skill}
            </Text>
          </View>
        </View>

        <Divider />

        <Text style={[tw`text-sm`, { fontFamily: "Poppins-Regular", color: TEXT }]}>
          {person.about}
        </Text>

        <View style={tw`mt-4`}>
          <Text style={[tw`text-sm`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
            Offering
          </Text>
          <Text style={[tw`text-sm mt-1`, { fontFamily: "Poppins-Regular", color: MUTED }]}>
            {person.offer}
          </Text>

          <Text style={[tw`text-sm mt-4`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
            Looking for
          </Text>
          <Text style={[tw`text-sm mt-1`, { fontFamily: "Poppins-Regular", color: MUTED }]}>
            {person.exchange}
          </Text>
        </View>

        <View style={tw`mt-4`}>
          <PrimaryButton
            label="Start chat"
            icon={Send}
            onPress={() => Alert.alert("Demo", "Hook to createOrGetDMChat + navigate to chat screen.")}
          />
          <View style={tw`h-2`} />
          <SecondaryButton
            label="Suggest swap idea"
            icon={Sparkles}
            onPress={() => Alert.alert("Idea", "Add a small form modal to propose a swap.")}
          />
        </View>

        <View style={tw`h-4`} />
      </ScrollView>
    </ModalShell>
  );
};

export default function DetailModals({
  productDetails,
  setProductDetails,
  jobDetails,
  setJobDetails,
  fundDetails,
  setFundDetails,
  skillDetails,
  setSkillDetails,
  favIds,
  toggleFav,
}) {
  return (
    <>
      <ProductDetailsModal
        product={productDetails}
        isFav={favIds.has(productDetails?.id)}
        toggleFav={toggleFav}
        onClose={() => setProductDetails(null)}
      />
      
      <JobDetailsModal
        job={jobDetails}
        onClose={() => setJobDetails(null)}
      />
      
      <FundDetailsModal
        fund={fundDetails}
        onClose={() => setFundDetails(null)}
      />
      
      <SkillDetailsModal
        person={skillDetails}
        onClose={() => setSkillDetails(null)}
      />
    </>
  );
}