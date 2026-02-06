import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";

import { useDispatch, useSelector } from "react-redux";
import { applyMentor } from "../../store/slices/mentorshipSlice";

import { LinearGradient } from "expo-linear-gradient";
import {
  X,
  Plus,
  Trash2,
  CheckCircle,
  Award,
  Briefcase,
  FileText,
  User,
  Globe,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Upload,
  Link,
  Lightbulb,
  Shield,
  Clock,
  AlertCircle,
  HelpCircle,
  BookOpen,
  MessageCircle,
  Users,
  Star
} from "lucide-react-native";
import tw from "../../utils/tw";

// 🔝 TOP OF FILE (outside)

/* ============================================================
   REUSABLE COMPONENTS
============================================================ */

const InputField = ({
  icon: Icon,
  placeholder,
  value,
  onChangeText,
  error,
  multiline = false,
  keyboardType = 'default',
  maxLength,
  required = true,
  ...props
}) => (
  <View style={tw`mb-4`}>
    <View style={tw`flex-row items-center mb-2`}>
      <View style={tw`w-6 h-6 bg-purple-50 rounded items-center justify-center mr-2`}>
        <Icon size={14} color="#7C3AED" />
      </View>
      <Text style={[tw`text-gray-800`, { fontFamily: 'Poppins-Medium' }]}>
        {placeholder} {required && <Text style={tw`text-red-500`}>*</Text>}
      </Text>
    </View>
    <TextInput
      style={[
        tw`bg-white rounded-lg border px-4 py-3.5 text-gray-900`,
        multiline ? tw`min-h-[120px] text-left align-top leading-5` : null,
        error ? tw`border-red-300 bg-red-50` : tw`border-gray-300`,
        { fontFamily: 'Poppins-Regular' }
      ]}
      placeholder={`Enter your ${placeholder.toLowerCase()}`}
      placeholderTextColor="#9CA3AF"
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      numberOfLines={multiline ? 5 : 1}
      keyboardType={keyboardType}
      maxLength={maxLength}
      {...props}
    />
    {error && (
      <View style={tw`flex-row items-center mt-1.5`}>
        <AlertCircle size={14} color="#EF4444" />
        <Text style={[tw`text-red-600 text-xs ml-1.5`, { fontFamily: 'Poppins-Regular' }]}>
          {error}
        </Text>
      </View>
    )}
    {maxLength && multiline && (
      <Text style={[tw`text-gray-400 text-xs mt-1 text-right`, { fontFamily: 'Poppins-Regular' }]}>
        {value.length}/{maxLength}
      </Text>
    )}
  </View>
);

const StepHeader = ({ title, description, icon: Icon }) => (
  <View style={tw`mb-6`}>
    <View style={tw`flex-row items-center mb-3`}>
      <View style={tw`w-10 h-10 bg-purple-50 rounded-lg items-center justify-center mr-3`}>
        <Icon size={20} color="#7C3AED" />
      </View>
      <Text style={[tw`text-gray-900 text-2xl`, { fontFamily: 'Poppins-Bold' }]}>
        {title}
      </Text>
    </View>
    <Text style={[tw`text-gray-600`, { fontFamily: 'Poppins-Regular' }]}>
      {description}
    </Text>
  </View>
);

const InfoTip = ({ icon: Icon, title, description }) => (
  <View style={tw`flex-row items-start p-4 bg-blue-50 rounded-lg border border-blue-100 mb-4`}>
    <View style={tw`w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3`}>
      <Icon size={16} color="#2563EB" />
    </View>
    <View style={tw`flex-1`}>
      <Text style={[tw`text-blue-800 mb-1`, { fontFamily: 'Poppins-SemiBold' }]}>
        {title}
      </Text>
      <Text style={[tw`text-blue-600 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
        {description}
      </Text>
    </View>
  </View>
);

const StepIndicator = ({ step }) => {
  const steps = [
    { number: 1, label: "Profile", icon: User },
    { number: 2, label: "Expertise", icon: Briefcase },
    { number: 3, label: "Verification", icon: FileText },
    { number: 4, label: "Review", icon: CheckCircle },
  ];

  return (
    <View style={tw`mb-6`}>
      <View style={tw`flex-row justify-between items-center mb-3`}>
        {steps.map(({ number, label, icon: Icon }) => {
          const isActive = step === number;
          const isCompleted = step > number;

          return (
            <View key={number} style={tw`items-center flex-1`}>
              <View style={[
                tw`w-12 h-12 rounded-full items-center justify-center mb-2 border-2`,
                isActive && tw`bg-purple-100 border-purple-600`,
                isCompleted && tw`bg-green-100 border-green-500`,
                (!isActive && !isCompleted) && tw`bg-gray-100 border-gray-300`
              ]}>
                {isCompleted ? (
                  <CheckCircle size={20} color="#10B981" />
                ) : (
                  <Icon size={20} color={isActive ? "#7C3AED" : "#9CA3AF"} />
                )}
              </View>
              <Text style={[
                tw`text-xs text-center`,
                { fontFamily: 'Poppins-Medium' },
                isActive ? tw`text-purple-700` :
                  isCompleted ? tw`text-green-700` :
                    tw`text-gray-500`
              ]}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Progress Bar */}
      <View style={tw`h-1.5 bg-gray-100 rounded-full overflow-hidden`}>
        <LinearGradient
          colors={['#7C3AED', '#8B5CF6']}
          style={{ width: `${((step - 1) / 3) * 100}%`, height: '100%' }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </View>
    </View>
  );
};

// Helper Component for Review Step
const InfoRow = ({ label, value, multiline = false }) => (
  <View style={tw`py-3 border-b border-gray-100`}>
    <Text style={[tw`text-gray-600 text-sm mb-1`, { fontFamily: 'Poppins-Medium' }]}>
      {label}
    </Text>
    <Text
      numberOfLines={multiline ? 3 : 1}
      style={[tw`text-gray-900 text-sm`, { fontFamily: 'Poppins-SemiBold' }]}
    >
      {value || "Not provided"}
    </Text>
  </View>
);

// 🔽 THEN
export default function BecomeMentorModal({ visible, onClose }) {
  const dispatch = useDispatch();
  const { loading } = useSelector((s) => s.mentorship);
  const { token, user } = useSelector((s) => s.auth);

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    name: user?.profile?.fullName || "",
    title: "",
    specialty: "",
    experience: "",
    bio: "",
    skills: "",
    languages: "",
    pricePerSession: 0,
    verificationDocs: [],
  });

  const [docLabel, setDocLabel] = useState("");
  const [docUrl, setDocUrl] = useState("");

  /* ============================================================
     VALIDATION
  ============================================================ */
  const validateStep = () => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!form.title.trim()) newErrors.title = "Professional title is required";
        if (!form.specialty.trim()) newErrors.specialty = "Specialty is required";
        if (!form.experience.trim()) newErrors.experience = "Experience is required";
        if (!form.bio.trim()) newErrors.bio = "Bio is required";
        if (form.bio.trim().length < 50) newErrors.bio = "Bio should be at least 50 characters";
        break;
      case 2:
        if (!form.skills.trim()) newErrors.skills = "At least one skill is required";
        if (!form.languages.trim()) newErrors.languages = "At least one language is required";
        if (!form.pricePerSession || form.pricePerSession < 0) newErrors.pricePerSession = "Valid price is required";
        break;
      case 3:
        if (form.verificationDocs.length === 0) {
          newErrors.verificationDocs = "At least one verification document is required";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const next = () => {
    Keyboard.dismiss();

    if (!validateStep()) {
      Alert.alert(
        "Please complete this section",
        "Some required fields are missing or incomplete.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    setStep((s) => Math.min(4, s + 1));
    setErrors({});
  };

  const back = () => {
    setStep((s) => Math.max(1, s - 1));
    setErrors({});
  };

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: null }));
    }
  };

  /* ============================================================
     DOCUMENT MANAGEMENT
  ============================================================ */
  const addDoc = () => {
    if (!docUrl.trim()) {
      setErrors(prev => ({ ...prev, docUrl: "Document URL is required" }));
      return;
    }

    if (form.verificationDocs.length >= 5) {
      Alert.alert("Maximum reached", "You can only add up to 5 verification documents.");
      return;
    }

    setForm((f) => ({
      ...f,
      verificationDocs: [
        ...f.verificationDocs,
        {
          label: docLabel.trim() || `Document ${f.verificationDocs.length + 1}`,
          url: docUrl.trim()
        },
      ],
    }));

    setDocLabel("");
    setDocUrl("");
    setErrors(prev => ({ ...prev, docUrl: null }));
  };

  const removeDoc = (index) => {
    Alert.alert(
      "Remove Document",
      "Are you sure you want to remove this verification document?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setForm((f) => ({
              ...f,
              verificationDocs: f.verificationDocs.filter((_, i) => i !== index),
            }));
          }
        }
      ]
    );
  };

  /* ============================================================
     SUBMIT APPLICATION
  ============================================================ */
  const submit = async () => {
    try {
      const applicationData = {
        ...form,
        skills: form.skills.split(",").map((s) => s.trim()).filter(s => s),
        languages: form.languages.split(",").map((l) => l.trim()).filter(l => l),
      };

      await dispatch(
        applyMentor({
          payload: applicationData,
          token,
        })
      ).unwrap();

      Alert.alert(
        "Application Received",
        "Thank you for applying to become a mentor. Our team will review your application and contact you within 3-5 business days.",
        [
          {
            text: "Done",
            onPress: () => {
              onClose();
              setStep(1);
              setForm({
                name: user?.profile?.fullName || "",
                title: "",
                specialty: "",
                experience: "",
                bio: "",
                skills: "",
                languages: "",
                pricePerSession: 0,
                verificationDocs: [],
              });
            }
          }
        ]
      );
    } catch (err) {
      Alert.alert(
        "Submission Error",
        err.message || "Unable to submit application. Please check your connection and try again."
      );
    }
  };

  /* ============================================================
     RENDER STEPS
  ============================================================ */
  const renderStep1 = () => (
    <>
      <StepHeader
        title="Your Professional Profile"
        description="Tell us about your background and experience"
        icon={User}
      />

      <InputField
        icon={Briefcase}
        placeholder="Professional Title"
        value={form.title}
        onChangeText={(v) => update("title", v)}
        error={errors.title}
        maxLength={80}
      />

      <InputField
        icon={Award}
        placeholder="Primary Specialty"
        value={form.specialty}
        onChangeText={(v) => update("specialty", v)}
        error={errors.specialty}
        maxLength={60}
      />

      <InputField
        icon={Clock}
        placeholder="Years of Experience"
        value={form.experience}
        onChangeText={(v) => update("experience", v)}
        error={errors.experience}
        maxLength={30}
      />

      <InputField
        icon={MessageCircle}
        placeholder="Professional Bio"
        value={form.bio}
        onChangeText={(v) => update("bio", v)}
        error={errors.bio}
        multiline={true}
        maxLength={500}
      />

      <InfoTip
        icon={Lightbulb}
        title="Writing your bio"
        description="Share your journey, key achievements, and what drives you to mentor others. Aim for 50-500 characters."
      />
    </>
  );

  const renderStep2 = () => (
    <>
      <StepHeader
        title="Your Expertise"
        description="What skills and knowledge can you share?"
        icon={Briefcase}
      />

      <InputField
        icon={BookOpen}
        placeholder="Skills & Expertise"
        value={form.skills}
        onChangeText={(v) => update("skills", v)}
        error={errors.skills}
        multiline={true}
        maxLength={200}
      />

      <InputField
        icon={Globe}
        placeholder="Languages You Speak"
        value={form.languages}
        onChangeText={(v) => update("languages", v)}
        error={errors.languages}
        multiline={true}
        maxLength={100}
      />

      <InputField
        icon={DollarSign}
        placeholder="Session Price (KES)"
        value={String(form.pricePerSession)}
        onChangeText={(v) => update("pricePerSession", Number(v) || 0)}
        error={errors.pricePerSession}
        keyboardType="numeric"
        maxLength={10}
      />

      <InfoTip
        icon={Users}
        title="Setting your rate"
        description="Consider your experience level and the value you provide. You can adjust this later."
      />
    </>
  );

  const renderStep3 = () => (
    <>
      <StepHeader
        title="Verify Your Experience"
        description="Add documents that support your expertise"
        icon={Shield}
      />

      <InfoTip
        icon={HelpCircle}
        title="Accepted verification"
        description="LinkedIn profile, certifications, portfolio links, case studies, or any professional documentation."
      />

      {/* Document List */}
      {form.verificationDocs.length > 0 && (
        <View style={tw`mb-6`}>
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <Text style={[tw`text-gray-800`, { fontFamily: 'Poppins-SemiBold' }]}>
              Added Documents
            </Text>
            <Text style={[tw`text-gray-500 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
              {form.verificationDocs.length} of 5
            </Text>
          </View>

          {form.verificationDocs.map((doc, index) => (
            <View
              key={index}
              style={tw`flex-row items-center justify-between bg-white p-4 rounded-lg border border-gray-200 mb-3`}
            >
              <View style={tw`flex-row items-center flex-1`}>
                <View style={tw`w-10 h-10 bg-green-50 rounded items-center justify-center mr-3`}>
                  <FileText size={18} color="#10B981" />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={[tw`text-gray-900 text-sm mb-0.5`, { fontFamily: 'Poppins-Medium' }]}>
                    {doc.label}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[tw`text-gray-500 text-xs`, { fontFamily: 'Poppins-Regular' }]}
                  >
                    {doc.url}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => removeDoc(index)}
                style={tw`ml-3 p-1.5`}
                activeOpacity={0.6}
              >
                <Trash2 size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Add Document Form */}
      <View style={tw`bg-white rounded-lg border border-gray-200 p-4`}>
        <View style={tw`flex-row items-center mb-4`}>
          <View style={tw`w-8 h-8 bg-purple-50 rounded items-center justify-center mr-2`}>
            <Plus size={16} color="#7C3AED" />
          </View>
          <Text style={[tw`text-gray-800`, { fontFamily: 'Poppins-SemiBold' }]}>
            Add Verification Document
          </Text>
        </View>

        <InputField
          icon={FileText}
          placeholder="Document Label"
          value={docLabel}
          onChangeText={setDocLabel}
          maxLength={50}
          required={false}
        />

        <InputField
          icon={Link}
          placeholder="Document URL"
          value={docUrl}
          onChangeText={setDocUrl}
          error={errors.docUrl}
          maxLength={500}
        />

        <TouchableOpacity
          onPress={addDoc}
          style={[
            tw`mt-2 rounded-lg py-3.5 items-center flex-row justify-center`,
            docUrl.trim() ? tw`bg-purple-600` : tw`bg-gray-200`
          ]}
          activeOpacity={0.8}
          disabled={!docUrl.trim()}
        >
          <Plus size={18} color={docUrl.trim() ? "#FFFFFF" : "#9CA3AF"} />
          <Text style={[
            tw`ml-2 text-sm`,
            { fontFamily: 'Poppins-SemiBold' },
            docUrl.trim() ? tw`text-white` : tw`text-gray-500`
          ]}>
            Add Document
          </Text>
        </TouchableOpacity>
      </View>

      {errors.verificationDocs && (
        <View style={tw`flex-row items-center mt-4 p-3 bg-red-50 rounded-lg border border-red-200`}>
          <AlertCircle size={16} color="#EF4444" />
          <Text style={[tw`text-red-700 text-sm ml-2`, { fontFamily: 'Poppins-Regular' }]}>
            {errors.verificationDocs}
          </Text>
        </View>
      )}
    </>
  );

  const renderStep4 = () => (
    <>
      <StepHeader
        title="Review Your Application"
        description="Please confirm all details before submitting"
        icon={CheckCircle}
      />

      <View style={tw`bg-white rounded-lg border border-gray-200 p-5 mb-6`}>
        {/* Personal Info Section */}
        <View style={tw`mb-6`}>
          <View style={tw`flex-row items-center mb-4`}>
            <View style={tw`w-8 h-8 bg-blue-50 rounded items-center justify-center mr-2`}>
              <User size={16} color="#3B82F6" />
            </View>
            <Text style={[tw`text-gray-900 text-lg`, { fontFamily: 'Poppins-Bold' }]}>
              Personal Information
            </Text>
          </View>
          <InfoRow label="Full Name" value={form.name} />
          <InfoRow label="Professional Title" value={form.title} />
          <InfoRow label="Specialty" value={form.specialty} />
          <InfoRow label="Experience" value={form.experience} />
        </View>

        {/* Expertise Section */}
        <View style={tw`mb-6`}>
          <View style={tw`flex-row items-center mb-4`}>
            <View style={tw`w-8 h-8 bg-green-50 rounded items-center justify-center mr-2`}>
              <Briefcase size={16} color="#10B981" />
            </View>
            <Text style={[tw`text-gray-900 text-lg`, { fontFamily: 'Poppins-Bold' }]}>
              Expertise Details
            </Text>
          </View>
          <InfoRow label="Skills" value={form.skills} multiline />
          <InfoRow label="Languages" value={form.languages} />
          <InfoRow label="Session Price" value={`KES ${form.pricePerSession.toLocaleString()}`} />
        </View>

        {/* Documents Section */}
        <View>
          <View style={tw`flex-row items-center mb-4`}>
            <View style={tw`w-8 h-8 bg-purple-50 rounded items-center justify-center mr-2`}>
              <FileText size={16} color="#7C3AED" />
            </View>
            <Text style={[tw`text-gray-900 text-lg`, { fontFamily: 'Poppins-Bold' }]}>
              Verification Documents
            </Text>
          </View>
          {form.verificationDocs.length === 0 ? (
            <Text style={[tw`text-gray-500 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
              No documents added
            </Text>
          ) : (
            form.verificationDocs.map((doc, index) => (
              <View key={index} style={tw`mb-2`}>
                <Text style={[tw`text-gray-700 text-sm`, { fontFamily: 'Poppins-Medium' }]}>
                  • {doc.label}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={tw`p-4 bg-gray-50 rounded-lg border border-gray-200`}>
        <View style={tw`flex-row items-start`}>
          <View style={tw`w-8 h-8 bg-gray-200 rounded-full items-center justify-center mr-3`}>
            <Clock size={16} color="#6B7280" />
          </View>
          <View style={tw`flex-1`}>
            <Text style={[tw`text-gray-800 mb-1`, { fontFamily: 'Poppins-SemiBold' }]}>
              What happens next?
            </Text>
            <Text style={[tw`text-gray-600 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
              Our team reviews all applications within 3-5 business days. You'll receive an email notification once your application status is updated. You can track progress in your dashboard.
            </Text>
          </View>
        </View>
      </View>
    </>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={tw`flex-1`}
      >
        <View style={tw`flex-1 bg-gray-50`}>
          {/* Header */}
          <LinearGradient
            colors={["#4C1D95", "#5B21B6"]}
            style={tw`pt-12 pb-6 px-5`}
          >
            <View style={tw`flex-row items-center justify-between mb-4`}>
              <View>
                <Text style={[tw`text-white text-2xl`, { fontFamily: 'Poppins-Bold' }]}>
                  Become a Mentor
                </Text>
                <Text style={[tw`text-white/80 text-sm mt-1`, { fontFamily: 'Poppins-Regular' }]}>
                  Step {step} of 4 • Complete all sections
                </Text>
              </View>

              <TouchableOpacity
                onPress={onClose}
                style={tw`w-10 h-10 rounded-full bg-white/10 items-center justify-center`}
                activeOpacity={0.7}
              >
                <X size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <StepIndicator step={step} />
          </LinearGradient>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tw`pb-28 px-5 pt-6`}
          >
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
          </ScrollView>

          {/* Navigation Footer - Always Visible */}
          <View style={tw`absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-5 py-4`}>
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-1`}>
                {step > 1 && (
                  <TouchableOpacity
                    style={tw`flex-row items-center justify-center py-3.5 px-4 border border-gray-300 rounded-lg`}
                    onPress={back}
                    activeOpacity={0.7}
                  >
                    <ChevronLeft size={18} color="#6B7280" />
                    <Text style={[tw`text-gray-700 ml-2 text-sm`, { fontFamily: 'Poppins-Medium' }]}>
                      Previous
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={tw`flex-1 ml-3`}>
                {step < 4 ? (
                  <TouchableOpacity
                    style={tw`flex-row items-center justify-center py-3.5 px-4 bg-purple-600 rounded-lg`}
                    onPress={next}
                    activeOpacity={0.8}
                  >
                    <Text style={[tw`text-white text-sm`, { fontFamily: 'Poppins-SemiBold' }]}>
                      Continue
                    </Text>
                    <ChevronRight size={18} color="#FFFFFF" style={tw`ml-2`} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={tw`flex-row items-center justify-center py-3.5 px-4 bg-green-600 rounded-lg`}
                    onPress={submit}
                    activeOpacity={0.8}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <CheckCircle size={18} color="#FFFFFF" />
                        <Text style={[tw`text-white ml-2 text-sm`, { fontFamily: 'Poppins-SemiBold' }]}>
                          Submit Application
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <Text style={[tw`text-gray-500 text-xs text-center mt-3`, { fontFamily: 'Poppins-Regular' }]}>
              All fields marked with * are required
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}