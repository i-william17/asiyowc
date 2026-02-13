import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import {
  Plus,
  Check,
  Tag,
  MapPin,
  Layers,
  Image as ImageIcon,
  Users,
  Calendar,
  Briefcase,
  DollarSign,
  Award,
  ChevronLeft,
  ChevronRight,
  FileText,
  Eye,
  Star,
  Clock,
  Globe,
  Mail,
  Link as LinkIcon,
} from "lucide-react-native";
import tw from "../../utils/tw";
import ModalShell from "./ModalShell";

const { height } = Dimensions.get("window");
const PRIMARY = "#6A1B9A";
const SURFACE = "#FFFFFF";
const BORDER = "#EEEAF6";
const TEXT = "#111827";
const MUTED = "#6B7280";
const SOFT = "#EFE9F7";

/* ============================================================
   BUTTON COMPONENTS
============================================================ */
const PrimaryButton = React.memo(({ label, icon: Icon, onPress, disabled, loading }) => (
  <TouchableOpacity
    onPress={disabled || loading ? undefined : onPress}
    activeOpacity={0.85}
    style={[
      tw`rounded-xl py-3 items-center justify-center flex-row`,
      {
        backgroundColor: disabled || loading ? "#D1D5DB" : PRIMARY,
      },
    ]}
  >
    {loading ? (
      <ActivityIndicator size="small" color="#FFFFFF" style={tw`mr-2`} />
    ) : (
      !!Icon && <Icon size={16} color="#FFFFFF" style={tw`mr-2`} />
    )}
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

const Chip = React.memo(({ label, selected, onPress, required }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      tw`px-3 py-2 rounded-full mr-2 mb-2`,
      { backgroundColor: selected ? PRIMARY : SOFT },
    ]}
  >
    <Text
      style={[
        tw`text-xs`,
        { fontFamily: "Poppins-SemiBold" },
        selected ? tw`text-white` : { color: PRIMARY },
      ]}
    >
      {label}
      {required && <Text style={{ color: selected ? "#FFFFFF" : "#DC2626" }}> *</Text>}
    </Text>
  </TouchableOpacity>
));

const ProgressStep = React.memo(({ step, currentStep, label }) => {
  const isCompleted = step < currentStep;
  const isCurrent = step === currentStep;
  
  return (
    <View style={tw`flex-1 items-center`}>
      <View
        style={[
          tw`w-8 h-8 rounded-full items-center justify-center`,
          {
            backgroundColor: isCompleted ? PRIMARY : isCurrent ? SOFT : "#E5E7EB",
            borderWidth: isCurrent ? 2 : 0,
            borderColor: PRIMARY,
          },
        ]}
      >
        {isCompleted ? (
          <Check size={14} color="#FFFFFF" />
        ) : (
          <Text
            style={[
              tw`text-xs`,
              { fontFamily: "Poppins-Bold" },
              { color: isCurrent ? PRIMARY : "#9CA3AF" },
            ]}
          >
            {step}
          </Text>
        )}
      </View>
      <Text
        style={[
          tw`text-xs mt-1`,
          { fontFamily: "Poppins-Regular" },
          { color: isCompleted || isCurrent ? TEXT : MUTED },
        ]}
      >
        {label}
      </Text>
    </View>
  );
});

/* ============================================================
   LISTING TYPE SELECTOR - STEP 1
============================================================ */
const ListingTypeSelector = ({ listType, setListType, onNext }) => {
  const listingTypes = [
    { 
      key: "product", 
      label: "Product", 
      icon: Tag,
      description: "Sell handmade crafts, beauty products, fashion items"
    },
    { 
      key: "job", 
      label: "Job", 
      icon: Briefcase,
      description: "Post job opportunities and career openings"
    },
    { 
      key: "funding", 
      label: "Funding", 
      icon: DollarSign,
      description: "List grants, scholarships, or investment opportunities"
    },
    { 
      key: "skill", 
      label: "Skill", 
      icon: Award,
      description: "Offer your skills or find skill exchange partners"
    },
  ];

  return (
    <View style={tw`flex-1`}>
      <ScrollView 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-2`}
      >
        <Text style={[tw`text-lg mb-4`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
          What would you like to list?
        </Text>
        
        {listingTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = listType === type.key;
          
          return (
            <TouchableOpacity
              key={type.key}
              onPress={() => setListType(type.key)}
              style={[
                tw`p-4 rounded-xl mb-3 flex-row items-center`,
                {
                  backgroundColor: isSelected ? PRIMARY : SURFACE,
                  borderWidth: 2,
                  borderColor: isSelected ? PRIMARY : BORDER,
                },
              ]}
            >
              <View
                style={[
                  tw`w-12 h-12 rounded-full items-center justify-center`,
                  { backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : SOFT },
                ]}
              >
                <Icon size={24} color={isSelected ? "#FFFFFF" : PRIMARY} />
              </View>
              
              <View style={tw`ml-3 flex-1`}>
                <Text
                  style={[
                    tw`text-base`,
                    { fontFamily: "Poppins-SemiBold" },
                    { color: isSelected ? "#FFFFFF" : TEXT },
                  ]}
                >
                  {type.label}
                </Text>
                <Text
                  style={[
                    tw`text-xs mt-1`,
                    { fontFamily: "Poppins-Regular" },
                    { color: isSelected ? "rgba(255,255,255,0.8)" : MUTED },
                  ]}
                >
                  {type.description}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      
      <View style={[
        tw`mt-4 pt-2 border-t`,
        { borderColor: BORDER }
      ]}>
        <PrimaryButton
          label="Continue"
          icon={ChevronRight}
          onPress={onNext}
          disabled={!listType}
        />
      </View>
    </View>
  );
};

/* ============================================================
   MAIN LISTING FLOW MODAL
============================================================ */
export default function ListModal({
  listOpen,
  closeListModal,
  listType,
  setListType,
  listTitle,
  setListTitle,
  listSubtitle,
  setListSubtitle,
  listPriceOrAmount,
  setListPriceOrAmount,
  listLocationOrDeadline,
  setListLocationOrDeadline,
  listNotes,
  setListNotes,
  
  // Shared fields
  listCategory,
  setListCategory,
  listTags,
  setListTags,
  listImages,
  setListImages,
  
  // Product fields
  listCondition,
  setListCondition,
  listQuantity,
  setListQuantity,
  
  // Job fields
  listTypeValue,
  setListTypeValue,
  listRequirements,
  setListRequirements,
  listSkills,
  setListSkills,
  
  // Funding fields
  listEligibility,
  setListEligibility,
  listFocusAreas,
  setListFocusAreas,
  
  // Skill fields
  listProficiency,
  setListProficiency,
  
  submitList,
  currentUser,
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reset to step 1 when modal opens
  useEffect(() => {
    if (listOpen) {
      setCurrentStep(1);
      setErrors({});
    }
  }, [listOpen]);
  
  // Validate current step based on listing type
  const validateStep = () => {
    const newErrors = {};
    
    if (currentStep === 1) {
      // Step 1: Just need to select listing type
      return true;
    }
    
    if (currentStep === 2) {
      // Step 2: Validate based on listing type
      switch (listType) {
        case "product":
          if (!listTitle?.trim()) newErrors.title = "Product title is required";
          if (!listPriceOrAmount?.trim()) newErrors.price = "Price is required";
          if (!listCategory) newErrors.category = "Category is required";
          if (listImages.length === 0) newErrors.images = "At least one image is required";
          if (!listLocationOrDeadline?.trim()) newErrors.location = "Location is required";
          if (!listCondition) newErrors.condition = "Condition is required";
          if (!listQuantity?.trim()) newErrors.quantity = "Quantity is required";
          if (!listNotes?.trim()) newErrors.description = "Description is required";
          break;
          
        case "job":
          if (!listTitle?.trim()) newErrors.title = "Job title is required";
          if (!listSubtitle?.trim()) newErrors.company = "Company name is required";
          if (!listTypeValue) newErrors.type = "Job type is required";
          if (!listLocationOrDeadline?.trim()) newErrors.location = "Location is required";
          if (!listPriceOrAmount?.trim()) newErrors.salary = "Salary is required";
          if (!listCategory) newErrors.category = "Category is required";
          if (!listNotes?.trim()) newErrors.description = "Job description is required";
          break;
          
        case "funding":
          if (!listTitle?.trim()) newErrors.title = "Funding title is required";
          if (!listSubtitle?.trim()) newErrors.provider = "Provider name is required";
          if (!listPriceOrAmount?.trim()) newErrors.amount = "Funding amount is required";
          if (!listTypeValue) newErrors.type = "Funding type is required";
          if (!listCategory) newErrors.category = "Category is required";
          if (!listLocationOrDeadline?.trim()) newErrors.deadline = "Deadline is required";
          if (!listNotes?.trim()) newErrors.description = "Description is required";
          break;
          
        case "skill":
          if (!listTitle?.trim()) newErrors.skill = "Skill name is required";
          if (!listCategory) newErrors.category = "Category is required";
          if (!listProficiency) newErrors.proficiency = "Proficiency level is required";
          if (!listSubtitle?.trim()) newErrors.offer = "Offer description is required";
          if (!listLocationOrDeadline?.trim()) newErrors.location = "Location is required";
          if (!listNotes?.trim()) newErrors.exchangeFor = "Exchange description is required";
          break;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handleBack = () => {
    setCurrentStep(currentStep - 1);
    setErrors({});
  };
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await submitList();
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get step title
  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Select Listing Type";
      case 2: 
        switch (listType) {
          case "product": return "Product Details";
          case "job": return "Job Details";
          case "funding": return "Funding Details";
          case "skill": return "Skill Details";
          default: return "Enter Details";
        }
      case 3: return "Review & Submit";
      default: return "";
    }
  };
  
  return (
    <ModalShell visible={listOpen} title={getStepTitle()} onClose={closeListModal}>
      <View style={tw`flex-1 flex-col`}>
        {/* Progress Steps - Fixed at top */}
        <View style={tw`flex-row items-center px-2 mb-6`}>
          <ProgressStep step={1} currentStep={currentStep} label="Type" />
          <View style={[tw`flex-1 h-0.5 mx-2`, { backgroundColor: currentStep > 1 ? PRIMARY : BORDER }]} />
          <ProgressStep step={2} currentStep={currentStep} label="Details" />
          <View style={[tw`flex-1 h-0.5 mx-2`, { backgroundColor: currentStep > 2 ? PRIMARY : BORDER }]} />
          <ProgressStep step={3} currentStep={currentStep} label="Review" />
        </View>
        
        {/* Scrollable Content - Now using flex-1 instead of maxHeight */}
        <View style={tw`flex-1`}>
          {currentStep === 1 && (
            <ListingTypeSelector
              listType={listType}
              setListType={setListType}
              onNext={handleNext}
            />
          )}
          
          {currentStep === 2 && listType === "product" && (
            <>
              <ProductForm
                listTitle={listTitle}
                setListTitle={setListTitle}
                listPriceOrAmount={listPriceOrAmount}
                setListPriceOrAmount={setListPriceOrAmount}
                listLocationOrDeadline={listLocationOrDeadline}
                setListLocationOrDeadline={setListLocationOrDeadline}
                listCategory={listCategory}
                setListCategory={setListCategory}
                listCondition={listCondition}
                setListCondition={setListCondition}
                listQuantity={listQuantity}
                setListQuantity={setListQuantity}
                listImages={listImages}
                setListImages={setListImages}
                listTags={listTags}
                setListTags={setListTags}
                listNotes={listNotes}
                setListNotes={setListNotes}
                errors={errors}
                setErrors={setErrors}
              />
              
              <View style={[
                tw`mt-6 flex-row pt-2 border-t`,
                { borderColor: BORDER }
              ]}>
                <View style={tw`flex-1 mr-2`}>
                  <SecondaryButton label="Back" icon={ChevronLeft} onPress={handleBack} />
                </View>
                <View style={tw`flex-1`}>
                  <PrimaryButton label="Next" icon={ChevronRight} onPress={handleNext} />
                </View>
              </View>
            </>
          )}
          
          {currentStep === 2 && listType === "job" && (
            <>
              <JobForm
                listTitle={listTitle}
                setListTitle={setListTitle}
                listSubtitle={listSubtitle}
                setListSubtitle={setListSubtitle}
                listPriceOrAmount={listPriceOrAmount}
                setListPriceOrAmount={setListPriceOrAmount}
                listLocationOrDeadline={listLocationOrDeadline}
                setListLocationOrDeadline={setListLocationOrDeadline}
                listCategory={listCategory}
                setListCategory={setListCategory}
                listTypeValue={listTypeValue}
                setListTypeValue={setListTypeValue}
                listRequirements={listRequirements}
                setListRequirements={setListRequirements}
                listSkills={listSkills}
                setListSkills={setListSkills}
                listNotes={listNotes}
                setListNotes={setListNotes}
                errors={errors}
                setErrors={setErrors}
              />
              
              <View style={[
                tw`mt-6 flex-row pt-2 border-t`,
                { borderColor: BORDER }
              ]}>
                <View style={tw`flex-1 mr-2`}>
                  <SecondaryButton label="Back" icon={ChevronLeft} onPress={handleBack} />
                </View>
                <View style={tw`flex-1`}>
                  <PrimaryButton label="Next" icon={ChevronRight} onPress={handleNext} />
                </View>
              </View>
            </>
          )}
          
          {currentStep === 2 && listType === "funding" && (
            <>
              <FundingForm
                listTitle={listTitle}
                setListTitle={setListTitle}
                listSubtitle={listSubtitle}
                setListSubtitle={setListSubtitle}
                listPriceOrAmount={listPriceOrAmount}
                setListPriceOrAmount={setListPriceOrAmount}
                listLocationOrDeadline={listLocationOrDeadline}
                setListLocationOrDeadline={setListLocationOrDeadline}
                listCategory={listCategory}
                setListCategory={setListCategory}
                listTypeValue={listTypeValue}
                setListTypeValue={setListTypeValue}
                listEligibility={listEligibility}
                setListEligibility={setListEligibility}
                listFocusAreas={listFocusAreas}
                setListFocusAreas={setListFocusAreas}
                listNotes={listNotes}
                setListNotes={setListNotes}
                errors={errors}
                setErrors={setErrors}
              />
              
              <View style={[
                tw`mt-6 flex-row pt-2 border-t`,
                { borderColor: BORDER }
              ]}>
                <View style={tw`flex-1 mr-2`}>
                  <SecondaryButton label="Back" icon={ChevronLeft} onPress={handleBack} />
                </View>
                <View style={tw`flex-1`}>
                  <PrimaryButton label="Next" icon={ChevronRight} onPress={handleNext} />
                </View>
              </View>
            </>
          )}
          
          {currentStep === 2 && listType === "skill" && (
            <>
              <SkillForm
                listTitle={listTitle}
                setListTitle={setListTitle}
                listSubtitle={listSubtitle}
                setListSubtitle={setListSubtitle}
                listLocationOrDeadline={listLocationOrDeadline}
                setListLocationOrDeadline={setListLocationOrDeadline}
                listCategory={listCategory}
                setListCategory={setListCategory}
                listProficiency={listProficiency}
                setListProficiency={setListProficiency}
                listTags={listTags}
                setListTags={setListTags}
                listNotes={listNotes}
                setListNotes={setListNotes}
                errors={errors}
                setErrors={setErrors}
              />
              
              <View style={[
                tw`mt-6 flex-row pt-2 border-t`,
                { borderColor: BORDER }
              ]}>
                <View style={tw`flex-1 mr-2`}>
                  <SecondaryButton label="Back" icon={ChevronLeft} onPress={handleBack} />
                </View>
                <View style={tw`flex-1`}>
                  <PrimaryButton label="Next" icon={ChevronRight} onPress={handleNext} />
                </View>
              </View>
            </>
          )}
          
          {currentStep === 3 && (
            <>
              <ReviewStep
                listType={listType}
                listTitle={listTitle}
                listSubtitle={listSubtitle}
                listPriceOrAmount={listPriceOrAmount}
                listLocationOrDeadline={listLocationOrDeadline}
                listCategory={listCategory}
                listCondition={listCondition}
                listQuantity={listQuantity}
                listImages={listImages}
                listTags={listTags}
                listTypeValue={listTypeValue}
                listRequirements={listRequirements}
                listSkills={listSkills}
                listEligibility={listEligibility}
                listFocusAreas={listFocusAreas}
                listProficiency={listProficiency}
                listNotes={listNotes}
                currentUser={currentUser}
              />
              
              <View style={[
                tw`mt-6 flex-row pt-2 border-t`,
                { borderColor: BORDER }
              ]}>
                <View style={tw`flex-1 mr-2`}>
                  <SecondaryButton label="Back" icon={ChevronLeft} onPress={handleBack} />
                </View>
                <View style={tw`flex-1`}>
                  <PrimaryButton
                    label="Submit Listing"
                    icon={Check}
                    onPress={handleSubmit}
                    loading={isSubmitting}
                  />
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </ModalShell>
  );
}


/* ============================================================
   PRODUCT FORM - STEP 2
============================================================ */
const ProductForm = React.memo(function ProductForm({
  listTitle,
  setListTitle,
  listPriceOrAmount,
  setListPriceOrAmount,
  listLocationOrDeadline,
  setListLocationOrDeadline,
  listCategory,
  setListCategory,
  listCondition,
  setListCondition,
  listQuantity,
  setListQuantity,
  listImages,
  setListImages,
  listTags,
  setListTags,
  listNotes,
  setListNotes,
  errors,
  setErrors,
}) {
  const [tagInput, setTagInput] = useState("");
  
  const categoryOptions = [
    "crafts", "beauty", "fashion", "home", "digital", "other"
  ];
  
  const conditionOptions = ["new", "used", "refurbished"];
  
  const addTag = () => {
    if (tagInput.trim()) {
      setListTags([...listTags, tagInput.trim().toLowerCase()]);
      setTagInput("");
    }
  };
  
  const removeTag = (tag) => {
    setListTags(listTags.filter(t => t !== tag));
  };
  
  const handleAddImage = () => {
    // Placeholder - replace with actual image picker
    Alert.alert(
      "Add Image",
      "Image picker will be implemented here",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add Mock",
          onPress: () => setListImages([
            ...listImages,
            `https://via.placeholder.com/300?text=Product+${listImages.length + 1}`
          ])
        }
      ]
    );
  };
  
  const removeImage = (index) => {
    setListImages(listImages.filter((_, i) => i !== index));
  };
  
  // Update errors with functional update pattern
  const clearError = (field) => {
    setErrors(prev => ({ ...prev, [field]: null }));
  };
  
  return (
    <View style={tw`flex-1`}>
      <ScrollView 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-2`}
      >
        <Text style={[tw`text-lg mb-4`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
          Product Details
        </Text>
        
        {/* Title - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Product Title <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <TextInput
            value={listTitle}
            onChangeText={(text) => {
              setListTitle(text);
              if (errors.title) clearError('title');
            }}
            placeholder="e.g., Handmade Beaded Necklace"
            placeholderTextColor="#9CA3AF"
            style={[
              tw`rounded-xl px-4 py-3`,
              {
                backgroundColor: SOFT,
                borderWidth: 1,
                borderColor: errors.title ? "#DC2626" : BORDER,
                fontFamily: "Poppins-Regular",
                color: TEXT,
              },
            ]}
          />
          {errors.title && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.title}
            </Text>
          )}
        </View>
        
        {/* Price - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Price (KES) <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <TextInput
            value={listPriceOrAmount}
            onChangeText={(text) => {
              setListPriceOrAmount(text);
              if (errors.price) clearError('price');
            }}
            placeholder="e.g., 3500"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            style={[
              tw`rounded-xl px-4 py-3`,
              {
                backgroundColor: SOFT,
                borderWidth: 1,
                borderColor: errors.price ? "#DC2626" : BORDER,
                fontFamily: "Poppins-Regular",
                color: TEXT,
              },
            ]}
          />
          {errors.price && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.price}
            </Text>
          )}
        </View>
        
        {/* Category - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Category <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <ScrollView 
            horizontal 
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            style={tw`flex-row flex-nowrap`}
          >
            <View style={tw`flex-row`}>
              {categoryOptions.map((cat) => (
                <Chip
                  key={cat}
                  label={cat.charAt(0).toUpperCase() + cat.slice(1)}
                  selected={listCategory === cat}
                  onPress={() => {
                    setListCategory(cat);
                    if (errors.category) clearError('category');
                  }}
                />
              ))}
            </View>
          </ScrollView>
          {errors.category && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.category}
            </Text>
          )}
        </View>
        
        {/* Images - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Images <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <ScrollView 
            horizontal 
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
          >
            <TouchableOpacity
              onPress={handleAddImage}
              style={[
                tw`w-20 h-20 rounded-xl mr-2 items-center justify-center`,
                { backgroundColor: SOFT, borderWidth: 1, borderStyle: 'dashed', borderColor: PRIMARY }
              ]}
            >
              <Plus size={24} color={PRIMARY} />
              <Text style={[tw`text-xs mt-1`, { fontFamily: "Poppins-Regular", color: PRIMARY }]}>
                Add
              </Text>
            </TouchableOpacity>
            
            {listImages.map((img, index) => (
              <View key={index} style={tw`relative mr-2`}>
                <View style={[tw`w-20 h-20 rounded-xl`, { backgroundColor: SOFT }]} />
                <TouchableOpacity
                  onPress={() => removeImage(index)}
                  style={[
                    tw`absolute -top-1 -right-1 w-6 h-6 rounded-full items-center justify-center`,
                    { backgroundColor: '#DC2626' }
                  ]}
                >
                  <Text style={[tw`text-white text-xs`, { fontFamily: "Poppins-Bold" }]}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          {errors.images && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.images}
            </Text>
          )}
        </View>
        
        {/* Location - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Location <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <TextInput
            value={listLocationOrDeadline}
            onChangeText={(text) => {
              setListLocationOrDeadline(text);
              if (errors.location) clearError('location');
            }}
            placeholder="e.g., Nairobi, Kenya"
            placeholderTextColor="#9CA3AF"
            style={[
              tw`rounded-xl px-4 py-3`,
              {
                backgroundColor: SOFT,
                borderWidth: 1,
                borderColor: errors.location ? "#DC2626" : BORDER,
                fontFamily: "Poppins-Regular",
                color: TEXT,
              },
            ]}
          />
          {errors.location && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.location}
            </Text>
          )}
        </View>
        
        {/* Condition - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Condition <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <ScrollView 
            horizontal 
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            style={tw`flex-row flex-nowrap`}
          >
            <View style={tw`flex-row`}>
              {conditionOptions.map((cond) => (
                <Chip
                  key={cond}
                  label={cond.charAt(0).toUpperCase() + cond.slice(1)}
                  selected={listCondition === cond}
                  onPress={() => {
                    setListCondition(cond);
                    if (errors.condition) clearError('condition');
                  }}
                />
              ))}
            </View>
          </ScrollView>
          {errors.condition && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.condition}
            </Text>
          )}
        </View>
        
        {/* Quantity - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Quantity <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <TextInput
            value={listQuantity}
            onChangeText={(text) => {
              setListQuantity(text);
              if (errors.quantity) clearError('quantity');
            }}
            placeholder="e.g., 1"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            style={[
              tw`rounded-xl px-4 py-3`,
              {
                backgroundColor: SOFT,
                borderWidth: 1,
                borderColor: errors.quantity ? "#DC2626" : BORDER,
                fontFamily: "Poppins-Regular",
                color: TEXT,
              },
            ]}
          />
          {errors.quantity && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.quantity}
            </Text>
          )}
        </View>
        
        {/* Tags */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Tags
          </Text>
          <View style={tw`flex-row items-center`}>
            <TextInput
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="e.g., handmade, eco-friendly"
              placeholderTextColor="#9CA3AF"
              style={[
                tw`flex-1 rounded-xl px-4 py-3 mr-2`,
                { backgroundColor: SOFT, borderWidth: 1, borderColor: BORDER, fontFamily: "Poppins-Regular", color: TEXT },
              ]}
            />
            <TouchableOpacity
              onPress={addTag}
              style={[
                tw`w-10 h-10 rounded-full items-center justify-center`,
                { backgroundColor: PRIMARY }
              ]}
            >
              <Plus size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={tw`flex-row flex-wrap mt-2`}>
            {listTags.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => removeTag(tag)}
                style={[
                  tw`px-3 py-2 rounded-full mr-2 mb-2 flex-row items-center`,
                  { backgroundColor: SOFT }
                ]}
              >
                <Text style={[tw`text-xs mr-1`, { fontFamily: "Poppins-Regular", color: TEXT }]}>
                  #{tag}
                </Text>
                <Text style={[tw`text-xs`, { color: MUTED }]}>×</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Description - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Description <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <TextInput
            value={listNotes}
            onChangeText={(text) => {
              setListNotes(text);
              if (errors.description) clearError('description');
            }}
            placeholder="Describe your product in detail..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={5}
            style={[
              tw`rounded-xl px-4 py-3`,
              {
                backgroundColor: SOFT,
                borderWidth: 1,
                borderColor: errors.description ? "#DC2626" : BORDER,
                minHeight: 120,
                textAlignVertical: "top",
                fontFamily: "Poppins-Regular",
                color: TEXT,
              },
            ]}
          />
          {errors.description && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.description}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
});

/* ============================================================
   JOB FORM - STEP 2
============================================================ */
const JobForm = React.memo(function JobForm({
  listTitle,
  setListTitle,
  listSubtitle,
  setListSubtitle,
  listPriceOrAmount,
  setListPriceOrAmount,
  listLocationOrDeadline,
  setListLocationOrDeadline,
  listCategory,
  setListCategory,
  listTypeValue,
  setListTypeValue,
  listRequirements,
  setListRequirements,
  listSkills,
  setListSkills,
  listNotes,
  setListNotes,
  errors,
  setErrors,
}) {
  const [reqInput, setReqInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  
  const categoryOptions = [
    "technology", "marketing", "finance", "healthcare", "education", "other"
  ];
  
  const jobTypeOptions = [
    "full-time", "part-time", "contract", "remote", "internship"
  ];
  
  const addRequirement = () => {
    if (reqInput.trim()) {
      setListRequirements([...listRequirements, reqInput.trim()]);
      setReqInput("");
    }
  };
  
  const removeRequirement = (req) => {
    setListRequirements(listRequirements.filter(r => r !== req));
  };
  
  const addSkill = () => {
    if (skillInput.trim()) {
      setListSkills([...listSkills, skillInput.trim()]);
      setSkillInput("");
    }
  };
  
  const removeSkill = (skill) => {
    setListSkills(listSkills.filter(s => s !== skill));
  };
  
  // Update errors with functional update pattern
  const clearError = (field) => {
    setErrors(prev => ({ ...prev, [field]: null }));
  };
  
  return (
    <View style={tw`flex-1`}>
      <ScrollView 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-2`}
      >
        <Text style={[tw`text-lg mb-4`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
          Job Details
        </Text>
        
        {/* Job Title - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Job Title <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <TextInput
            value={listTitle}
            onChangeText={(text) => {
              setListTitle(text);
              if (errors.title) clearError('title');
            }}
            placeholder="e.g., Senior Software Engineer"
            placeholderTextColor="#9CA3AF"
            style={[
              tw`rounded-xl px-4 py-3`,
              {
                backgroundColor: SOFT,
                borderWidth: 1,
                borderColor: errors.title ? "#DC2626" : BORDER,
                fontFamily: "Poppins-Regular",
                color: TEXT,
              },
            ]}
          />
          {errors.title && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.title}
            </Text>
          )}
        </View>
        
        {/* Company Name - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Company Name <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <TextInput
            value={listSubtitle}
            onChangeText={(text) => {
              setListSubtitle(text);
              if (errors.company) clearError('company');
            }}
            placeholder="e.g., Google"
            placeholderTextColor="#9CA3AF"
            style={[
              tw`rounded-xl px-4 py-3`,
              {
                backgroundColor: SOFT,
                borderWidth: 1,
                borderColor: errors.company ? "#DC2626" : BORDER,
                fontFamily: "Poppins-Regular",
                color: TEXT,
              },
            ]}
          />
          {errors.company && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.company}
            </Text>
          )}
        </View>
        
        {/* Job Type - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Job Type <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <ScrollView 
            horizontal 
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            style={tw`flex-row flex-nowrap`}
          >
            <View style={tw`flex-row`}>
              {jobTypeOptions.map((type) => (
                <Chip
                  key={type}
                  label={type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
                  selected={listTypeValue === type}
                  onPress={() => {
                    setListTypeValue(type);
                    if (errors.type) clearError('type');
                  }}
                />
              ))}
            </View>
          </ScrollView>
          {errors.type && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.type}
            </Text>
          )}
        </View>
        
        {/* Location - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Location <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <TextInput
            value={listLocationOrDeadline}
            onChangeText={(text) => {
              setListLocationOrDeadline(text);
              if (errors.location) clearError('location');
            }}
            placeholder="e.g., Nairobi, Kenya / Remote"
            placeholderTextColor="#9CA3AF"
            style={[
              tw`rounded-xl px-4 py-3`,
              {
                backgroundColor: SOFT,
                borderWidth: 1,
                borderColor: errors.location ? "#DC2626" : BORDER,
                fontFamily: "Poppins-Regular",
                color: TEXT,
              },
            ]}
          />
          {errors.location && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.location}
            </Text>
          )}
        </View>
        
        {/* Salary - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Salary Range <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <TextInput
            value={listPriceOrAmount}
            onChangeText={(text) => {
              setListPriceOrAmount(text);
              if (errors.salary) clearError('salary');
            }}
            placeholder="e.g., 150,000 - 250,000 KES/month"
            placeholderTextColor="#9CA3AF"
            style={[
              tw`rounded-xl px-4 py-3`,
              {
                backgroundColor: SOFT,
                borderWidth: 1,
                borderColor: errors.salary ? "#DC2626" : BORDER,
                fontFamily: "Poppins-Regular",
                color: TEXT,
              },
            ]}
          />
          {errors.salary && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.salary}
            </Text>
          )}
        </View>
        
        {/* Category - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Category <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <ScrollView 
            horizontal 
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            style={tw`flex-row flex-nowrap`}
          >
            <View style={tw`flex-row`}>
              {categoryOptions.map((cat) => (
                <Chip
                  key={cat}
                  label={cat.charAt(0).toUpperCase() + cat.slice(1)}
                  selected={listCategory === cat}
                  onPress={() => {
                    setListCategory(cat);
                    if (errors.category) clearError('category');
                  }}
                />
              ))}
            </View>
          </ScrollView>
          {errors.category && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.category}
            </Text>
          )}
        </View>
        
        {/* Requirements */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Requirements
          </Text>
          <View style={tw`flex-row items-center`}>
            <TextInput
              value={reqInput}
              onChangeText={setReqInput}
              placeholder="e.g., 3+ years React Native"
              placeholderTextColor="#9CA3AF"
              style={[
                tw`flex-1 rounded-xl px-4 py-3 mr-2`,
                { backgroundColor: SOFT, borderWidth: 1, borderColor: BORDER, fontFamily: "Poppins-Regular", color: TEXT },
              ]}
            />
            <TouchableOpacity
              onPress={addRequirement}
              style={[
                tw`w-10 h-10 rounded-full items-center justify-center`,
                { backgroundColor: PRIMARY }
              ]}
            >
              <Plus size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={tw`flex-row flex-wrap mt-2`}>
            {listRequirements.map((req) => (
              <TouchableOpacity
                key={req}
                onPress={() => removeRequirement(req)}
                style={[
                  tw`px-3 py-2 rounded-full mr-2 mb-2 flex-row items-center`,
                  { backgroundColor: SOFT }
                ]}
              >
                <Text style={[tw`text-xs mr-1`, { fontFamily: "Poppins-Regular", color: TEXT }]}>
                  {req}
                </Text>
                <Text style={[tw`text-xs`, { color: MUTED }]}>×</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Required Skills */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Required Skills
          </Text>
          <View style={tw`flex-row items-center`}>
            <TextInput
              value={skillInput}
              onChangeText={setSkillInput}
              placeholder="e.g., React, Node.js, TypeScript"
              placeholderTextColor="#9CA3AF"
              style={[
                tw`flex-1 rounded-xl px-4 py-3 mr-2`,
                { backgroundColor: SOFT, borderWidth: 1, borderColor: BORDER, fontFamily: "Poppins-Regular", color: TEXT },
              ]}
            />
            <TouchableOpacity
              onPress={addSkill}
              style={[
                tw`w-10 h-10 rounded-full items-center justify-center`,
                { backgroundColor: PRIMARY }
              ]}
            >
              <Plus size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={tw`flex-row flex-wrap mt-2`}>
            {listSkills.map((skill) => (
              <TouchableOpacity
                key={skill}
                onPress={() => removeSkill(skill)}
                style={[
                  tw`px-3 py-2 rounded-full mr-2 mb-2 flex-row items-center`,
                  { backgroundColor: SOFT }
                ]}
              >
                <Text style={[tw`text-xs mr-1`, { fontFamily: "Poppins-Regular", color: TEXT }]}>
                  {skill}
                </Text>
                <Text style={[tw`text-xs`, { color: MUTED }]}>×</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Description - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Job Description <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <TextInput
            value={listNotes}
            onChangeText={(text) => {
              setListNotes(text);
              if (errors.description) clearError('description');
            }}
            placeholder="Describe the role, responsibilities, and ideal candidate..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={6}
            style={[
              tw`rounded-xl px-4 py-3`,
              {
                backgroundColor: SOFT,
                borderWidth: 1,
                borderColor: errors.description ? "#DC2626" : BORDER,
                minHeight: 150,
                textAlignVertical: "top",
                fontFamily: "Poppins-Regular",
                color: TEXT,
              },
            ]}
          />
          {errors.description && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.description}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
});

/* ============================================================
   FUNDING FORM - STEP 2
============================================================ */
const FundingForm = React.memo(function FundingForm({
  listTitle,
  setListTitle,
  listSubtitle,
  setListSubtitle,
  listPriceOrAmount,
  setListPriceOrAmount,
  listLocationOrDeadline,
  setListLocationOrDeadline,
  listCategory,
  setListCategory,
  listTypeValue,
  setListTypeValue,
  listEligibility,
  setListEligibility,
  listFocusAreas,
  setListFocusAreas,
  listNotes,
  setListNotes,
  errors,
  setErrors,
}) {
  const categoryOptions = [
    "technology", "agriculture", "education", "healthcare", "women", "youth", "other"
  ];
  
  const fundingTypeOptions = [
    "grant", "loan", "scholarship", "fellowship", "prize"
  ];
  
  const focusAreaOptions = [
    "Women Empowerment", "Education", "Healthcare", "Environment",
    "Technology", "Arts", "Community Development", "Agriculture", "Small Business"
  ];
  
  const toggleFocusArea = (area) => {
    if (listFocusAreas.includes(area)) {
      setListFocusAreas(listFocusAreas.filter(a => a !== area));
    } else {
      setListFocusAreas([...listFocusAreas, area]);
    }
  };
  
  const removeFocusArea = (area) => {
    setListFocusAreas(listFocusAreas.filter(a => a !== area));
  };
  
  // Update errors with functional update pattern
  const clearError = (field) => {
    setErrors(prev => ({ ...prev, [field]: null }));
  };
  
  return (
    <View style={tw`flex-1`}>
      <ScrollView 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-2`}
      >
        <Text style={[tw`text-lg mb-4`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
          Funding Details
        </Text>
        
        {/* Title - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Funding Title <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <TextInput
            value={listTitle}
            onChangeText={(text) => {
              setListTitle(text);
              if (errors.title) clearError('title');
            }}
            placeholder="e.g., Women in Tech Grant 2026"
            placeholderTextColor="#9CA3AF"
            style={[
              tw`rounded-xl px-4 py-3`,
              {
                backgroundColor: SOFT,
                borderWidth: 1,
                borderColor: errors.title ? "#DC2626" : BORDER,
                fontFamily: "Poppins-Regular",
                color: TEXT,
              },
            ]}
          />
          {errors.title && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.title}
            </Text>
          )}
        </View>
        
        {/* Provider - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Provider Name <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <TextInput
            value={listSubtitle}
            onChangeText={(text) => {
              setListSubtitle(text);
              if (errors.provider) clearError('provider');
            }}
            placeholder="e.g., Mastercard Foundation"
            placeholderTextColor="#9CA3AF"
            style={[
              tw`rounded-xl px-4 py-3`,
              {
                backgroundColor: SOFT,
                borderWidth: 1,
                borderColor: errors.provider ? "#DC2626" : BORDER,
                fontFamily: "Poppins-Regular",
                color: TEXT,
              },
            ]}
          />
          {errors.provider && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.provider}
            </Text>
          )}
        </View>
        
        {/* Amount - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Funding Amount <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <TextInput
            value={listPriceOrAmount}
            onChangeText={(text) => {
              setListPriceOrAmount(text);
              if (errors.amount) clearError('amount');
            }}
            placeholder="e.g., Up to Ksh 1,000,000"
            placeholderTextColor="#9CA3AF"
            style={[
              tw`rounded-xl px-4 py-3`,
              {
                backgroundColor: SOFT,
                borderWidth: 1,
                borderColor: errors.amount ? "#DC2626" : BORDER,
                fontFamily: "Poppins-Regular",
                color: TEXT,
              },
            ]}
          />
          {errors.amount && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.amount}
            </Text>
          )}
        </View>
        
        {/* Funding Type - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Funding Type <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <ScrollView 
            horizontal 
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            style={tw`flex-row flex-nowrap`}
          >
            <View style={tw`flex-row`}>
              {fundingTypeOptions.map((type) => (
                <Chip
                  key={type}
                  label={type.charAt(0).toUpperCase() + type.slice(1)}
                  selected={listTypeValue === type}
                  onPress={() => {
                    setListTypeValue(type);
                    if (errors.type) clearError('type');
                  }}
                />
              ))}
            </View>
          </ScrollView>
          {errors.type && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.type}
            </Text>
          )}
        </View>
        
        {/* Category - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Category <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <ScrollView 
            horizontal 
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            style={tw`flex-row flex-nowrap`}
          >
            <View style={tw`flex-row`}>
              {categoryOptions.map((cat) => (
                <Chip
                  key={cat}
                  label={cat.charAt(0).toUpperCase() + cat.slice(1)}
                  selected={listCategory === cat}
                  onPress={() => {
                    setListCategory(cat);
                    if (errors.category) clearError('category');
                  }}
                />
              ))}
            </View>
          </ScrollView>
          {errors.category && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.category}
            </Text>
          )}
        </View>
        
        {/* Deadline - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Application Deadline <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <TextInput
            value={listLocationOrDeadline}
            onChangeText={(text) => {
              setListLocationOrDeadline(text);
              if (errors.deadline) clearError('deadline');
            }}
            placeholder="e.g., Feb 15, 2026"
            placeholderTextColor="#9CA3AF"
            style={[
              tw`rounded-xl px-4 py-3`,
              {
                backgroundColor: SOFT,
                borderWidth: 1,
                borderColor: errors.deadline ? "#DC2626" : BORDER,
                fontFamily: "Poppins-Regular",
                color: TEXT,
              },
            ]}
          />
          {errors.deadline && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.deadline}
            </Text>
          )}
        </View>
        
        {/* Eligibility */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Eligibility Criteria
          </Text>
          <TextInput
            value={listEligibility}
            onChangeText={setListEligibility}
            placeholder="e.g., Women-owned businesses, 18-35 years, Kenyan citizens"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            style={[
              tw`rounded-xl px-4 py-3`,
              {
                backgroundColor: SOFT,
                borderWidth: 1,
                borderColor: BORDER,
                minHeight: 100,
                textAlignVertical: "top",
                fontFamily: "Poppins-Regular",
                color: TEXT,
              },
            ]}
          />
        </View>
        
        {/* Focus Areas */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Focus Areas
          </Text>
          <ScrollView 
            horizontal 
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            style={tw`flex-row flex-nowrap`}
          >
            <View style={tw`flex-row`}>
              {focusAreaOptions.map((area) => (
                <Chip
                  key={area}
                  label={area}
                  selected={listFocusAreas.includes(area)}
                  onPress={() => toggleFocusArea(area)}
                />
              ))}
            </View>
          </ScrollView>
          <View style={tw`flex-row flex-wrap mt-2`}>
            {listFocusAreas.map((area) => (
              <TouchableOpacity
                key={area}
                onPress={() => removeFocusArea(area)}
                style={[
                  tw`px-3 py-2 rounded-full mr-2 mb-2 flex-row items-center`,
                  { backgroundColor: SOFT }
                ]}
              >
                <Text style={[tw`text-xs mr-1`, { fontFamily: "Poppins-Regular", color: TEXT }]}>
                  {area}
                </Text>
                <Text style={[tw`text-xs`, { color: MUTED }]}>×</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Description - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Description <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <TextInput
            value={listNotes}
            onChangeText={(text) => {
              setListNotes(text);
              if (errors.description) clearError('description');
            }}
            placeholder="Describe the funding opportunity, objectives, and benefits..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={6}
            style={[
              tw`rounded-xl px-4 py-3`,
              {
                backgroundColor: SOFT,
                borderWidth: 1,
                borderColor: errors.description ? "#DC2626" : BORDER,
                minHeight: 150,
                textAlignVertical: "top",
                fontFamily: "Poppins-Regular",
                color: TEXT,
              },
            ]}
          />
          {errors.description && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.description}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
});

/* ============================================================
   SKILL FORM - STEP 2
============================================================ */
const SkillForm = React.memo(function SkillForm({
  listTitle,
  setListTitle,
  listSubtitle,
  setListSubtitle,
  listLocationOrDeadline,
  setListLocationOrDeadline,
  listCategory,
  setListCategory,
  listProficiency,
  setListProficiency,
  listTags,
  setListTags,
  listNotes,
  setListNotes,
  errors,
  setErrors,
}) {
  const [tagInput, setTagInput] = useState("");
  
  const categoryOptions = [
    "design", "marketing", "development", "finance", "writing", "consulting", "other"
  ];
  
  const proficiencyOptions = ["beginner", "intermediate", "advanced", "expert"];
  
  const addTag = () => {
    if (tagInput.trim()) {
      setListTags([...listTags, tagInput.trim().toLowerCase()]);
      setTagInput("");
    }
  };
  
  const removeTag = (tag) => {
    setListTags(listTags.filter(t => t !== tag));
  };
  
  // Update errors with functional update pattern
  const clearError = (field) => {
    setErrors(prev => ({ ...prev, [field]: null }));
  };
  
  return (
    <View style={tw`flex-1`}>
      <ScrollView 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-2`}
      >
        <Text style={[tw`text-lg mb-4`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
          Skill Details
        </Text>
        
        {/* Skill - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Skill <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <TextInput
            value={listTitle}
            onChangeText={(text) => {
              setListTitle(text);
              if (errors.skill) clearError('skill');
            }}
            placeholder="e.g., React Native Development"
            placeholderTextColor="#9CA3AF"
            style={[
              tw`rounded-xl px-4 py-3`,
              {
                backgroundColor: SOFT,
                borderWidth: 1,
                borderColor: errors.skill ? "#DC2626" : BORDER,
                fontFamily: "Poppins-Regular",
                color: TEXT,
              },
            ]}
          />
          {errors.skill && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.skill}
            </Text>
          )}
        </View>
        
        {/* Category - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Category <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <ScrollView 
            horizontal 
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            style={tw`flex-row flex-nowrap`}
          >
            <View style={tw`flex-row`}>
              {categoryOptions.map((cat) => (
                <Chip
                  key={cat}
                  label={cat.charAt(0).toUpperCase() + cat.slice(1)}
                  selected={listCategory === cat}
                  onPress={() => {
                    setListCategory(cat);
                    if (errors.category) clearError('category');
                  }}
                />
              ))}
            </View>
          </ScrollView>
          {errors.category && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.category}
            </Text>
          )}
        </View>
        
        {/* Proficiency - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Proficiency Level <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <ScrollView 
            horizontal 
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            style={tw`flex-row flex-nowrap`}
          >
            <View style={tw`flex-row`}>
              {proficiencyOptions.map((level) => (
                <Chip
                  key={level}
                  label={level.charAt(0).toUpperCase() + level.slice(1)}
                  selected={listProficiency === level}
                  onPress={() => {
                    setListProficiency(level);
                    if (errors.proficiency) clearError('proficiency');
                  }}
                />
              ))}
            </View>
          </ScrollView>
          {errors.proficiency && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.proficiency}
            </Text>
          )}
        </View>
        
        {/* Offer - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            What You Offer <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <TextInput
            value={listSubtitle}
            onChangeText={(text) => {
              setListSubtitle(text);
              if (errors.offer) clearError('offer');
            }}
            placeholder="e.g., React Native mentoring, code reviews"
            placeholderTextColor="#9CA3AF"
            style={[
              tw`rounded-xl px-4 py-3`,
              {
                backgroundColor: SOFT,
                borderWidth: 1,
                borderColor: errors.offer ? "#DC2626" : BORDER,
                fontFamily: "Poppins-Regular",
                color: TEXT,
              },
            ]}
          />
          {errors.offer && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.offer}
            </Text>
          )}
        </View>
        
        {/* Location - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Location <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <TextInput
            value={listLocationOrDeadline}
            onChangeText={(text) => {
              setListLocationOrDeadline(text);
              if (errors.location) clearError('location');
            }}
            placeholder="e.g., Nairobi, Kenya / Remote"
            placeholderTextColor="#9CA3AF"
            style={[
              tw`rounded-xl px-4 py-3`,
              {
                backgroundColor: SOFT,
                borderWidth: 1,
                borderColor: errors.location ? "#DC2626" : BORDER,
                fontFamily: "Poppins-Regular",
                color: TEXT,
              },
            ]}
          />
          {errors.location && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.location}
            </Text>
          )}
        </View>
        
        {/* Tags */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            Tags
          </Text>
          <View style={tw`flex-row items-center`}>
            <TextInput
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="e.g., mobile, web, frontend"
              placeholderTextColor="#9CA3AF"
              style={[
                tw`flex-1 rounded-xl px-4 py-3 mr-2`,
                { backgroundColor: SOFT, borderWidth: 1, borderColor: BORDER, fontFamily: "Poppins-Regular", color: TEXT },
              ]}
            />
            <TouchableOpacity
              onPress={addTag}
              style={[
                tw`w-10 h-10 rounded-full items-center justify-center`,
                { backgroundColor: PRIMARY }
              ]}
            >
              <Plus size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={tw`flex-row flex-wrap mt-2`}>
            {listTags.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => removeTag(tag)}
                style={[
                  tw`px-3 py-2 rounded-full mr-2 mb-2 flex-row items-center`,
                  { backgroundColor: SOFT }
                ]}
              >
                <Text style={[tw`text-xs mr-1`, { fontFamily: "Poppins-Regular", color: TEXT }]}>
                  #{tag}
                </Text>
                <Text style={[tw`text-xs`, { color: MUTED }]}>×</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Exchange For - Required */}
        <View style={tw`mb-4`}>
          <Text style={[tw`text-xs mb-2`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
            What You Want to Learn / Exchange For <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <TextInput
            value={listNotes}
            onChangeText={(text) => {
              setListNotes(text);
              if (errors.exchangeFor) clearError('exchangeFor');
            }}
            placeholder="e.g., I want to learn UI/UX design in exchange for React Native help"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            style={[
              tw`rounded-xl px-4 py-3`,
              {
                backgroundColor: SOFT,
                borderWidth: 1,
                borderColor: errors.exchangeFor ? "#DC2626" : BORDER,
                minHeight: 100,
                textAlignVertical: "top",
                fontFamily: "Poppins-Regular",
                color: TEXT,
              },
            ]}
          />
          {errors.exchangeFor && (
            <Text style={[tw`text-xs mt-1`, { color: "#DC2626", fontFamily: "Poppins-Regular" }]}>
              {errors.exchangeFor}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
});

/* ============================================================
   REVIEW STEP - STEP 3
============================================================ */
const ReviewStep = React.memo(function ReviewStep({
  listType,
  listTitle,
  listSubtitle,
  listPriceOrAmount,
  listLocationOrDeadline,
  listCategory,
  listCondition,
  listQuantity,
  listImages,
  listTags,
  listTypeValue,
  listRequirements,
  listSkills,
  listEligibility,
  listFocusAreas,
  listProficiency,
  listNotes,
  currentUser,
}) {
  const getTypeLabel = () => {
    switch (listType) {
      case "product": return "Product";
      case "job": return "Job";
      case "funding": return "Funding";
      case "skill": return "Skill";
      default: return "";
    }
  };
  
  const renderProductReview = () => (
    <>
      <ReviewItem label="Title" value={listTitle} />
      <ReviewItem label="Price" value={`KES ${listPriceOrAmount}`} />
      <ReviewItem label="Category" value={listCategory} />
      <ReviewItem label="Location" value={listLocationOrDeadline} />
      <ReviewItem label="Condition" value={listCondition} />
      <ReviewItem label="Quantity" value={listQuantity} />
      <ReviewItem label="Images" value={`${listImages.length} image(s)`} />
      <ReviewItem label="Tags" value={listTags.map(t => `#${t}`).join(", ")} />
      <ReviewItem label="Description" value={listNotes} />
    </>
  );
  
  const renderJobReview = () => (
    <>
      <ReviewItem label="Job Title" value={listTitle} />
      <ReviewItem label="Company" value={listSubtitle} />
      <ReviewItem label="Job Type" value={listTypeValue} />
      <ReviewItem label="Location" value={listLocationOrDeadline} />
      <ReviewItem label="Salary" value={listPriceOrAmount} />
      <ReviewItem label="Category" value={listCategory} />
      <ReviewItem label="Requirements" value={listRequirements.join(" • ")} />
      <ReviewItem label="Skills" value={listSkills.join(" • ")} />
      <ReviewItem label="Description" value={listNotes} />
    </>
  );
  
  const renderFundingReview = () => (
    <>
      <ReviewItem label="Title" value={listTitle} />
      <ReviewItem label="Provider" value={listSubtitle} />
      <ReviewItem label="Amount" value={listPriceOrAmount} />
      <ReviewItem label="Type" value={listTypeValue} />
      <ReviewItem label="Category" value={listCategory} />
      <ReviewItem label="Deadline" value={listLocationOrDeadline} />
      <ReviewItem label="Eligibility" value={listEligibility} />
      <ReviewItem label="Focus Areas" value={listFocusAreas.join(" • ")} />
      <ReviewItem label="Description" value={listNotes} />
    </>
  );
  
  const renderSkillReview = () => (
    <>
      <ReviewItem label="Skill" value={listTitle} />
      <ReviewItem label="Category" value={listCategory} />
      <ReviewItem label="Proficiency" value={listProficiency} />
      <ReviewItem label="Offer" value={listSubtitle} />
      <ReviewItem label="Location" value={listLocationOrDeadline} />
      <ReviewItem label="Tags" value={listTags.map(t => `#${t}`).join(", ")} />
      <ReviewItem label="Exchange For" value={listNotes} />
    </>
  );
  
  const ReviewItem = ({ label, value }) => (
    <View style={tw`mb-3`}>
      <Text style={[tw`text-xs`, { fontFamily: "Poppins-SemiBold", color: MUTED }]}>
        {label}
      </Text>
      <Text style={[tw`text-sm mt-1`, { fontFamily: "Poppins-Regular", color: TEXT }]}>
        {value || "—"}
      </Text>
    </View>
  );
  
  return (
    <View style={tw`flex-1`}>
      <ScrollView 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw`pb-2`}
      >
        <View style={tw`items-center mb-6`}>
          <View
            style={[
              tw`w-16 h-16 rounded-full items-center justify-center mb-3`,
              { backgroundColor: SOFT }
            ]}
          >
            {listType === "product" && <Tag size={32} color={PRIMARY} />}
            {listType === "job" && <Briefcase size={32} color={PRIMARY} />}
            {listType === "funding" && <DollarSign size={32} color={PRIMARY} />}
            {listType === "skill" && <Award size={32} color={PRIMARY} />}
          </View>
          
          <Text style={[tw`text-xl`, { fontFamily: "Poppins-Bold", color: TEXT }]}>
            Review Your {getTypeLabel()} Listing
          </Text>
          <Text style={[tw`text-xs mt-1`, { fontFamily: "Poppins-Regular", color: MUTED }]}>
            Please review all information before submitting
          </Text>
        </View>
        
        <View
          style={[
            tw`p-5 rounded-xl mb-4`,
            { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER }
          ]}
        >
          {listType === "product" && renderProductReview()}
          {listType === "job" && renderJobReview()}
          {listType === "funding" && renderFundingReview()}
          {listType === "skill" && renderSkillReview()}
        </View>
        
        <View
          style={[
            tw`p-4 rounded-xl`,
            { backgroundColor: `${PRIMARY}10`, borderWidth: 1, borderColor: `${PRIMARY}30` }
          ]}
        >
          <Text style={[tw`text-xs`, { fontFamily: "Poppins-SemiBold", color: PRIMARY }]}>
            Listing will be posted as:
          </Text>
          <Text style={[tw`text-sm mt-1`, { fontFamily: "Poppins-Regular", color: TEXT }]}>
            {currentUser?.profile?.fullName || currentUser?.email}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
});