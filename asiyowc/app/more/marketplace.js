import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
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
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import tw from "../../utils/tw";

// Tab Components
const TabButton = React.memo(({ label, value, activeTab, onPress }) => {
  const isActive = activeTab === value;
  
  return (
    <TouchableOpacity
      style={[
        tw`flex-1 px-3 py-2 rounded-full`,
        isActive && tw`bg-white`,
      ]}
      onPress={() => onPress(value)}
    >
      <Text style={[
        tw`text-center text-xs`, 
        { fontFamily: 'Poppins-Regular' },
        isActive ? tw`text-purple-600` : tw`text-gray-600`
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

// Product Card Component
const ProductCard = React.memo(({ product }) => (
  <Animated.View 
    entering={FadeInDown}
    style={tw`bg-white rounded-xl shadow-sm mb-4`}
  >
    <View style={tw`flex-row p-4`}>
      <View style={[tw`w-24 h-24 rounded-lg overflow-hidden bg-purple-100`, { flexShrink: 0 }]}>
        <Image
          source={{ uri: product.image }}
          style={tw`w-full h-full`}
        />
      </View>
      <View style={[tw`flex-1 ml-3`, { minWidth: 0 }]}>
        <Text style={[tw`text-purple-900 mb-1`, { fontFamily: 'Poppins-SemiBold' }]}>
          {product.name}
        </Text>
        <Text style={[tw`text-gray-600 text-sm mb-2`, { fontFamily: 'Poppins-Regular' }]}>
          {product.seller}
        </Text>
        <View style={tw`flex-row items-center mb-2`}>
          <View style={tw`flex-row items-center mr-2`}>
            <Star size={16} color="#F59E0B" fill="#F59E0B" />
            <Text style={[tw`text-sm ml-1`, { fontFamily: 'Poppins-SemiBold' }]}>
              {product.rating}
            </Text>
          </View>
          <Text style={[tw`text-gray-500 text-xs`, { fontFamily: 'Poppins-Regular' }]}>
            ({product.reviews} reviews)
          </Text>
        </View>
        <View style={tw`flex-row items-center justify-between`}>
          <Text style={[tw`text-purple-600 text-xl`, { fontFamily: 'Poppins-Bold' }]}>
            Ksh {product.price}
          </Text>
          <TouchableOpacity
            style={tw`w-8 h-8 border border-gray-300 rounded-full items-center justify-center`}
            activeOpacity={0.7}
          >
            <Heart size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
    <View style={tw`px-4 pb-4`}>
      <TouchableOpacity
        style={tw`rounded-full overflow-hidden shadow-sm`}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#7C3AED', '#F59E0B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={tw`py-3 items-center`}
        >
          <Text style={[tw`text-white`, { fontFamily: 'Poppins-SemiBold' }]}>
            View Details
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  </Animated.View>
));

// Job Card Component
const JobCard = React.memo(({ job }) => (
  <Animated.View 
    entering={FadeInDown}
    style={tw`bg-white rounded-xl p-4 shadow-sm mb-3`}
  >
    <View style={tw`flex-row items-start justify-between mb-3`}>
      <View>
        <Text style={[tw`text-purple-900 mb-1`, { fontFamily: 'Poppins-SemiBold' }]}>
          {job.title}
        </Text>
        <Text style={[tw`text-gray-600 text-sm mb-2`, { fontFamily: 'Poppins-Regular' }]}>
          {job.company}
        </Text>
      </View>
      <View style={tw`bg-purple-100 px-3 py-1 rounded-full`}>
        <Text style={[tw`text-purple-700 text-xs`, { fontFamily: 'Poppins-SemiBold' }]}>
          {job.type}
        </Text>
      </View>
    </View>
    
    <View style={tw`mb-4`}>
      <View style={tw`flex-row items-center mb-2`}>
        <MapPin size={16} color="#6B7280" />
        <Text style={[tw`text-gray-600 text-sm ml-2`, { fontFamily: 'Poppins-Regular' }]}>
          {job.location}
        </Text>
      </View>
      <View style={tw`flex-row items-center mb-2`}>
        <DollarSign size={16} color="#6B7280" />
        <Text style={[tw`text-gray-600 text-sm ml-2`, { fontFamily: 'Poppins-Regular' }]}>
          {job.salary}
        </Text>
      </View>
      <Text style={[tw`text-gray-500 text-xs`, { fontFamily: 'Poppins-Regular' }]}>
        Posted {job.posted}
      </Text>
    </View>

    <TouchableOpacity
      style={tw`bg-purple-600 rounded-full py-3 items-center`}
      activeOpacity={0.8}
    >
      <Text style={[tw`text-white`, { fontFamily: 'Poppins-SemiBold' }]}>
        Apply Now
      </Text>
    </TouchableOpacity>
  </Animated.View>
));

// Funding Card Component
const FundingCard = React.memo(({ fund }) => (
  <Animated.View 
    entering={FadeInDown}
    style={tw`bg-white rounded-xl p-4 shadow-sm mb-3`}
  >
    <View style={tw`items-start justify-between mb-3`}>
      <View style={tw`flex-row items-start justify-between w-full`}>
        <View style={tw`flex-1`}>
          <Text style={[tw`text-purple-900 mb-1`, { fontFamily: 'Poppins-SemiBold' }]}>
            {fund.title}
          </Text>
          <Text style={[tw`text-gray-600 text-sm mb-2`, { fontFamily: 'Poppins-Regular' }]}>
            {fund.provider}
          </Text>
        </View>
      </View>
    </View>
    
    <LinearGradient
      colors={['#F0FDF4', '#FFFFFF']}
      style={tw`rounded-xl p-3 mb-3`}
    >
      <Text style={[tw`text-gray-600 text-sm mb-1`, { fontFamily: 'Poppins-Regular' }]}>
        Funding Amount
      </Text>
      <Text style={[tw`text-green-700 text-xl`, { fontFamily: 'Poppins-Bold' }]}>
        {fund.amount}
      </Text>
    </LinearGradient>

    <View style={tw`flex-row items-center justify-between mb-3`}>
      <Text style={[tw`text-gray-600 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
        Deadline: {fund.deadline}
      </Text>
      <Text style={[tw`text-gray-600 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
        {fund.applicants} applicants
      </Text>
    </View>

    <TouchableOpacity
      style={tw`rounded-full overflow-hidden shadow-sm`}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#7C3AED', '#F59E0B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={tw`py-3 items-center`}
      >
        <Text style={[tw`text-white`, { fontFamily: 'Poppins-SemiBold' }]}>
          Learn More
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  </Animated.View>
));

// Skill Swap Card Component
const SkillSwapCard = React.memo(({ person }) => (
  <Animated.View 
    entering={FadeInDown}
    style={tw`bg-white rounded-xl p-4 shadow-sm mb-3`}
  >
    <View style={tw`flex-row items-start mb-3`}>
      <View style={[tw`w-12 h-12 rounded-full overflow-hidden bg-purple-100`, { flexShrink: 0 }]}>
        <Image
          source={{ uri: person.avatar }}
          style={tw`w-full h-full`}
        />
      </View>
      <View style={tw`flex-1 ml-3`}>
        <Text style={[tw`text-purple-900 mb-1`, { fontFamily: 'Poppins-SemiBold' }]}>
          {person.name}
        </Text>
        <View style={tw`bg-purple-100 px-3 py-1 rounded-full self-start`}>
          <Text style={[tw`text-purple-700 text-xs`, { fontFamily: 'Poppins-SemiBold' }]}>
            {person.skill}
          </Text>
        </View>
      </View>
    </View>

    <View style={tw`mb-4`}>
      <LinearGradient
        colors={['#F5F3FF', '#FFFFFF']}
        style={tw`rounded-xl p-3 mb-2`}
      >
        <Text style={[tw`text-gray-600 text-xs mb-1`, { fontFamily: 'Poppins-Regular' }]}>
          Offering
        </Text>
        <Text style={[tw`text-sm text-purple-900`, { fontFamily: 'Poppins-Regular' }]}>
          {person.offer}
        </Text>
      </LinearGradient>
      <LinearGradient
        colors={['#FFFBEB', '#FFFFFF']}
        style={tw`rounded-xl p-3`}
      >
        <Text style={[tw`text-gray-600 text-xs mb-1`, { fontFamily: 'Poppins-Regular' }]}>
          Looking for
        </Text>
        <Text style={[tw`text-sm text-amber-900`, { fontFamily: 'Poppins-Regular' }]}>
          {person.exchange}
        </Text>
      </LinearGradient>
    </View>

    <TouchableOpacity
      style={tw`bg-purple-600 rounded-full py-3 items-center`}
      activeOpacity={0.8}
    >
      <Text style={[tw`text-white`, { fontFamily: 'Poppins-SemiBold' }]}>
        Connect & Swap
      </Text>
    </TouchableOpacity>
  </Animated.View>
));

export default function MarketplaceScreen() {
  const [activeTab, setActiveTab] = useState('products');
  const [searchText, setSearchText] = useState('');

  const products = [
    {
      id: 1,
      name: "Handcrafted Jewelry Set",
      seller: "Amina's Crafts",
      price: 45,
      location: "Nairobi, Kenya",
      image: "https://images.unsplash.com/photo-1573496267526-08a69e46a409?w=400",
      rating: 4.8,
      reviews: 124
    },
    {
      id: 2,
      name: "Organic Skincare Bundle",
      seller: "Wellness Sisters Co.",
      price: 35,
      location: "Lagos, Nigeria",
      image: "https://images.unsplash.com/photo-1758274539654-23fa349cc090?w=400",
      rating: 4.9,
      reviews: 89
    }
  ];

  const jobs = [
    {
      id: 1,
      title: "Community Manager",
      company: "Women Tech Hub",
      type: "Full-time",
      location: "Remote",
      salary: "Ksh 4M - Ksh 6M",
      posted: "2 days ago"
    },
    {
      id: 2,
      title: "Financial Advisor",
      company: "Sisterhood Finance",
      type: "Part-time",
      location: "Nairobi, Kenya",
      salary: "Ksh 3M - Ksh 4.5M",
      posted: "1 week ago"
    }
  ];

  const funding = [
    {
      id: 1,
      title: "Women Entrepreneurs Grant 2026",
      provider: "Asiyo Foundation",
      amount: "Up to Ksh 1,000,000",
      deadline: "Jan 31, 2026",
      applicants: 234
    },
    {
      id: 2,
      title: "Tech Innovation Fund",
      provider: "Global Women Network",
      amount: "Up to Ksh 2,500,000",
      deadline: "Feb 15, 2026",
      applicants: 156
    }
  ];

  const skills = [
    {
      id: 1,
      name: "Sarah Johnson",
      skill: "Graphic Design",
      offer: "Logo design & branding",
      exchange: "Business mentorship",
      avatar: "https://images.unsplash.com/flagged/photo-1570562119798-a4b2a542fe3b?w=100"
    },
    {
      id: 2,
      name: "Grace Mutua",
      skill: "Digital Marketing",
      offer: "Social media strategy",
      exchange: "Web development basics",
      avatar: "https://images.unsplash.com/photo-1562071707-7249ab429b2a?w=100"
    }
  ];

  const renderProductsTab = () => (
    <>
      <LinearGradient
        colors={['#7C3AED', '#6D28D9']}
        style={tw`rounded-2xl p-4 mb-4 shadow-lg`}
      >
        <View style={tw`flex-row items-center`}>
          <ShoppingBag size={32} color="#FFFFFF" />
          <View style={tw`ml-3`}>
            <Text style={[tw`text-white mb-1`, { fontFamily: 'Poppins-Bold' }]}>
              Women-Owned Businesses
            </Text>
            <Text style={[tw`text-white/90 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
              Support sisters worldwide
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View>
        {products.map((product, index) => (
          <View key={`product-${product.id}`} style={index > 0 && tw`mt-4`}>
            <ProductCard product={product} />
          </View>
        ))}
      </View>
    </>
  );

  const renderJobsTab = () => (
    <>
      <LinearGradient
        colors={['#F59E0B', '#D97706']}
        style={tw`rounded-2xl p-4 mb-4 shadow-lg`}
      >
        <View style={tw`flex-row items-center`}>
          <Briefcase size={32} color="#FFFFFF" />
          <View style={tw`ml-3`}>
            <Text style={[tw`text-white mb-1`, { fontFamily: 'Poppins-Bold' }]}>
              Job Board
            </Text>
            <Text style={[tw`text-white/90 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
              Opportunities for women
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View>
        {jobs.map((job, index) => (
          <View key={`job-${job.id}`} style={index > 0 && tw`mt-3`}>
            <JobCard job={job} />
          </View>
        ))}
      </View>
    </>
  );

  const renderFundingTab = () => (
    <>
      <LinearGradient
        colors={['#10B981', '#059669']}
        style={tw`rounded-2xl p-4 mb-4 shadow-lg`}
      >
        <View style={tw`flex-row items-center`}>
          <TrendingUp size={32} color="#FFFFFF" />
          <View style={tw`ml-3`}>
            <Text style={[tw`text-white mb-1`, { fontFamily: 'Poppins-Bold' }]}>
              Funding Opportunities
            </Text>
            <Text style={[tw`text-white/90 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
              Grants & investments
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View>
        {funding.map((fund, index) => (
          <View key={`fund-${fund.id}`} style={index > 0 && tw`mt-3`}>
            <FundingCard fund={fund} />
          </View>
        ))}
      </View>
    </>
  );

  const renderSkillsTab = () => (
    <>
      <LinearGradient
        colors={['#3B82F6', '#2563EB']}
        style={tw`rounded-2xl p-4 mb-4 shadow-lg`}
      >
        <View style={tw`flex-row items-center`}>
          <Star size={32} color="#FFFFFF" />
          <View style={tw`ml-3`}>
            <Text style={[tw`text-white mb-1`, { fontFamily: 'Poppins-Bold' }]}>
              Skill Swap
            </Text>
            <Text style={[tw`text-white/90 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
              Exchange skills & knowledge
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View>
        {skills.map((person, index) => (
          <View key={`skill-${person.id}`} style={index > 0 && tw`mt-3`}>
            <SkillSwapCard person={person} />
          </View>
        ))}
      </View>
    </>
  );

  return (
    <LinearGradient
      colors={['#F5F3FF', '#FFFFFF', '#FFFBEB']}
      style={tw`flex-1`}
    >
      {/* Header with curved bottom */}
      <LinearGradient
        colors={['#4C1D95', '#5B21B6']}
        style={tw`pt-12 pb-5 px-4 rounded-b-[40px] shadow-lg`}
      >
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <View>
            <Text style={[tw`text-white text-2xl`, { fontFamily: 'Poppins-Bold' }]}>
              Marketplace
            </Text>
            <Text style={[tw`text-purple-200 text-sm`, { fontFamily: 'Poppins-Regular' }]}>
              Opportunities & Offerings
            </Text>
          </View>
          <TouchableOpacity
            style={tw`rounded-full overflow-hidden shadow-lg`}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#7C3AED', '#F59E0B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={tw`px-4 py-2 flex-row items-center`}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={[tw`text-white ml-1 text-sm`, { fontFamily: 'Poppins-SemiBold' }]}>
                List Item
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={tw`relative`}>
          <Search 
            size={16} 
            color="#9CA3AF" 
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              marginTop: -8,
            }}
          />
          <TextInput
            style={[
              tw`bg-white rounded-full pl-10 pr-4 py-3 text-gray-800`,
              { fontFamily: 'Poppins-Regular' }
            ]}
            placeholder="Search marketplace..."
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <LinearGradient
        colors={['#F5F3FF', '#FFFFFF']}
        style={tw`mx-4 mt-4 rounded-full p-1 shadow-sm`}
      >
        <View style={tw`flex-row`}>
          <TabButton
            label="Products"
            value="products"
            activeTab={activeTab}
            onPress={setActiveTab}
          />
          <TabButton
            label="Jobs"
            value="jobs"
            activeTab={activeTab}
            onPress={setActiveTab}
          />
          <TabButton
            label="Funding"
            value="funding"
            activeTab={activeTab}
            onPress={setActiveTab}
          />
          <TabButton
            label="Skills"
            value="skills"
            activeTab={activeTab}
            onPress={setActiveTab}
          />
        </View>
      </LinearGradient>

      <ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
      >
        <View style={tw`px-4 pb-8 pt-4`}>
          {activeTab === 'products' && renderProductsTab()}
          {activeTab === 'jobs' && renderJobsTab()}
          {activeTab === 'funding' && renderFundingTab()}
          {activeTab === 'skills' && renderSkillsTab()}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}