import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Simple QuoteCard component
const QuoteCard = ({ quote }) => (
  <View style={styles.quoteCard}>
    <Text style={styles.quoteText}>"{quote.text}"</Text>
    <Text style={styles.quoteAuthor}>— {quote.author}</Text>
  </View>
);

// Simple ProgramCard component
const ProgramCard = ({ program, compact }) => (
  <View style={styles.programCard}>
    <Image source={{ uri: program.image }} style={styles.programImage} />
    <View style={styles.programContent}>
      <Text style={styles.programTitle}>{program.title}</Text>
      <Text style={styles.programDescription}>{program.description}</Text>
      <View style={styles.programMeta}>
        <Text style={styles.programMetaText}>{program.participants} participants</Text>
        <Text style={styles.programMetaText}>•</Text>
        <Text style={styles.programMetaText}>{program.duration}</Text>
      </View>
    </View>
  </View>
);

// Simple PostCard component
const PostCard = ({ post, style }) => (
  <Animated.View style={[styles.postCard, style]}>
    <View style={styles.postHeader}>
      <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
      <View style={styles.postUserInfo}>
        <Text style={styles.userName}>{post.user.name}</Text>
        <Text style={styles.userRole}>{post.user.role}</Text>
      </View>
      <Text style={styles.timestamp}>{post.timestamp}</Text>
    </View>
    
    <Text style={styles.postContent}>{post.content}</Text>
    
    {post.image && (
      <Image source={{ uri: post.image }} style={styles.postImage} />
    )}
    
    <View style={styles.postTags}>
      {post.tags.map((tag, index) => (
        <Text key={index} style={styles.tag}>#{tag}</Text>
      ))}
    </View>
    
    <View style={styles.postActions}>
      <TouchableOpacity style={styles.actionButton}>
        <Ionicons name="heart-outline" size={20} color="#666" />
        <Text style={styles.actionText}>{post.likes}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.actionButton}>
        <Ionicons name="chatbubble-outline" size={20} color="#666" />
        <Text style={styles.actionText}>{post.comments}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.actionButton}>
        <Ionicons name="share-social-outline" size={20} color="#666" />
        <Text style={styles.actionText}>{post.shares}</Text>
      </TouchableOpacity>
    </View>
  </Animated.View>
);

// Simple Shimmer component
const FeedShimmer = () => (
  <View>
    {[1, 2, 3].map((item) => (
      <View key={item} style={styles.shimmerCard}>
        <View style={styles.shimmerHeader}>
          <View style={styles.shimmerAvatar} />
          <View style={styles.shimmerText}>
            <View style={styles.shimmerLine} />
            <View style={[styles.shimmerLine, { width: '60%' }]} />
          </View>
        </View>
        <View style={styles.shimmerContent}>
          <View style={styles.shimmerLine} />
          <View style={styles.shimmerLine} />
          <View style={[styles.shimmerLine, { width: '80%' }]} />
        </View>
      </View>
    ))}
  </View>
);

// Simple AnimatedButton component
const AnimatedButton = ({ title, onPress, variant = 'primary', size = 'md', icon, disabled = false }) => {
  const buttonStyles = {
    primary: styles.primaryButton,
    secondary: styles.secondaryButton,
    gold: styles.goldButton,
    premium: styles.premiumButton,
  };
  
  const textStyles = {
    primary: styles.primaryButtonText,
    secondary: styles.secondaryButtonText,
    gold: styles.goldButtonText,
    premium: styles.premiumButtonText,
  };
  
  const sizeStyles = {
    sm: styles.buttonSm,
    md: styles.buttonMd,
    lg: styles.buttonLg,
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        buttonStyles[variant],
        sizeStyles[size],
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {icon && <View style={styles.buttonIcon}>{icon}</View>}
      <Text style={[styles.buttonText, textStyles[variant]]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

// Simple LottieLoader placeholder
const LottieLoader = ({ type, size, loop = true }) => (
  <View style={[styles.lottiePlaceholder, { width: size, height: size }]}>
    <Ionicons name="heart" size={size * 0.6} color="#6A1B9A" />
  </View>
);

// Main HomeScreen Component
const HomeScreen = () => {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;

  // Sample data
  const sampleDailyQuote = {
    id: '1',
    text: "The most common way people give up their power is by thinking they don't have any.",
    author: "Alice Walker",
    category: "empowerment"
  };

  const sampleFeaturedPrograms = [
    {
      id: '1',
      title: 'Women in Leadership',
      description: 'Develop your leadership potential and executive presence',
      category: 'leadership',
      participants: 1247,
      duration: '8 weeks',
      level: 'Intermediate',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=200&fit=crop',
      progress: 0
    },
    {
      id: '2',
      title: 'Financial Freedom',
      description: 'Master personal finance and investment strategies',
      category: 'finance',
      participants: 892,
      duration: '6 weeks',
      level: 'Beginner',
      image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=300&h=200&fit=crop',
      progress: 0
    }
  ];

  const samplePosts = [
    {
      id: '1',
      user: {
        name: 'Maria Rodriguez',
        role: 'Tech Leader',
        avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop&crop=face'
      },
      content: 'Just launched our new mentorship program for women in STEM! So excited to see the impact we can make together.',
      timestamp: '2 hours ago',
      likes: 42,
      comments: 8,
      shares: 3,
      category: 'leadership',
      tags: ['STEM', 'Mentorship', 'WomenInTech']
    },
    {
      id: '2',
      user: {
        name: 'Dr. Amina Jalloh',
        role: 'Healthcare Advocate',
        avatar: 'https://images.unsplash.com/photo-1551836026-d5c88ac5c4e1?w=100&h=100&fit=crop&crop=face'
      },
      content: 'Healthcare access is a fundamental right, not a privilege. Today we reached 10,000 women with our mobile clinic initiative.',
      timestamp: '5 hours ago',
      likes: 156,
      comments: 23,
      shares: 45,
      category: 'advocacy',
      tags: ['Healthcare', 'Advocacy', 'Community']
    }
  ];

  const filtersList = [
    { id: 'all', name: 'All', icon: '🌍' },
    { id: 'leadership', name: 'Leadership', icon: '👑' },
    { id: 'finance', name: 'Finance', icon: '💰' },
    { id: 'wellness', name: 'Wellness', icon: '🌿' },
    { id: 'advocacy', name: 'Advocacy', icon: '📢' },
  ];

  useEffect(() => {
    animateIn();
    // Simulate initial load
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  }, []);

  const animateIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setLoading(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
      setLoading(false);
    }, 1500);
  };

  const filteredPosts = activeFilter === 'all' 
    ? samplePosts 
    : samplePosts.filter(post => post.category === activeFilter);

  const handleQuickAction = (action) => {
    const actions = {
      create: () => router.push('/modals/create-post'),
      connect: () => router.push('/(tabs)/community'),
      learn: () => router.push('/(tabs)/programs'),
      support: () => router.push('/modals/sos-help')
    };
    actions[action]?.();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#6A1B9A']}
            tintColor="#6A1B9A"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Gradient */}
        <LinearGradient
          colors={['#6A1B9A', '#8E24AA']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <Text style={styles.welcomeText}>
                Welcome, Sarah!
              </Text>
              <Text style={styles.subtitle}>
                Together We Rise, Together We Thrive
              </Text>
            </View>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => router.push('/modals/notifications')}
            >
              <Ionicons name="notifications" size={24} color="white" />
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>3</Text>
              </View>
            </TouchableOpacity>
          </View>

          <QuoteCard quote={sampleDailyQuote} />
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <View style={styles.quickActionsCard}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <View style={styles.quickActionsRow}>
              {[
                { key: 'create', icon: 'create', label: 'Create', color: '#6A1B9A' },
                { key: 'connect', icon: 'people', label: 'Connect', color: '#F59E0B' },
                { key: 'learn', icon: 'school', label: 'Learn', color: '#10B981' },
                { key: 'support', icon: 'heart', label: 'Support', color: '#EF4444' }
              ].map((action) => (
                <TouchableOpacity 
                  key={action.key}
                  style={styles.quickAction}
                  onPress={() => handleQuickAction(action.key)}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}20` }]}>
                    <Ionicons name={action.icon} size={28} color={action.color} />
                  </View>
                  <Text style={[styles.quickActionText, { color: action.color }]}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {filtersList.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterTab,
                activeFilter === filter.id && styles.filterTabActive
              ]}
              onPress={() => setActiveFilter(filter.id)}
            >
              <Text style={styles.filterIcon}>{filter.icon}</Text>
              <Text style={[
                styles.filterText,
                activeFilter === filter.id && styles.filterTextActive
              ]}>
                {filter.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Programs */}
        <View style={styles.programsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Programs</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/programs')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {sampleFeaturedPrograms.map((program) => (
              <View key={program.id} style={styles.programWrapper}>
                <ProgramCard program={program} compact />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Feed */}
        <View style={styles.feedSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Global Feed</Text>
            <Text style={styles.postCount}>
              {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
            </Text>
          </View>
          
          {loading ? (
            <FeedShimmer />
          ) : filteredPosts.length === 0 ? (
            <View style={styles.emptyState}>
              <LottieLoader type="connection" size={120} loop={false} />
              <Text style={styles.emptyStateTitle}>
                No posts in {activeFilter === 'all' ? 'this category' : filtersList.find(f => f.id === activeFilter)?.name.toLowerCase()}
              </Text>
              <Text style={styles.emptyStateText}>
                Be the first to share your thoughts and experiences
              </Text>
              <AnimatedButton
                title="Create First Post"
                onPress={() => router.push('/modals/create-post')}
                variant="primary"
                icon={<Ionicons name="add" size={20} color="white" />}
              />
            </View>
          ) : (
            filteredPosts.map((post, index) => (
              <PostCard 
                key={post.id} 
                post={post} 
                style={{
                  opacity: fadeAnim,
                  transform: [{
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50 * (index + 1), 0],
                    }),
                  }],
                }}
              />
            ))
          )}
        </View>
      </Animated.ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/modals/create-post')}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// Styles
const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerText: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    marginTop: 4,
  },
  notificationButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 16,
    marginLeft: 16,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Quote Card
  quoteCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(255, 255, 255, 0.5)',
  },
  quoteText: {
    fontSize: 16,
    color: 'white',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  quoteAuthor: {
    fontSize: 14,
    color: 'white',
    opacity: 0.8,
    marginTop: 8,
    fontWeight: '600',
  },
  // Quick Actions
  quickActionsContainer: {
    paddingHorizontal: 24,
    marginTop: -16,
    marginBottom: 24,
  },
  quickActionsCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  quickActionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Filters
  filterContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  filterTabActive: {
    backgroundColor: '#6A1B9A',
    borderColor: '#6A1B9A',
  },
  filterIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  filterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  filterTextActive: {
    color: 'white',
  },
  // Programs
  programsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  seeAllText: {
    color: '#6A1B9A',
    fontWeight: '600',
  },
  programWrapper: {
    width: 280,
    marginRight: 16,
  },
  programCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  programImage: {
    width: '100%',
    height: 140,
  },
  programContent: {
    padding: 16,
  },
  programTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  programDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  programMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  programMetaText: {
    fontSize: 12,
    color: '#9ca3af',
    marginRight: 8,
  },
  // Feed
  feedSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  postCount: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyStateTitle: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '600',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
  },
  // Post Card
  postCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  postUserInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  userRole: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
  postContent: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 16,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  postTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tag: {
    fontSize: 12,
    color: '#6A1B9A',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  postActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    marginLeft: 6,
    color: '#666',
    fontSize: 14,
  },
  // Shimmer
  shimmerCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  shimmerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  shimmerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f3f4f6',
    marginRight: 12,
  },
  shimmerText: {
    flex: 1,
  },
  shimmerLine: {
    height: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    marginBottom: 8,
  },
  shimmerContent: {
    marginTop: 8,
  },
  // Buttons
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonSm: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  buttonMd: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonLg: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  primaryButton: {
    backgroundColor: '#6A1B9A',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#6A1B9A',
  },
  goldButton: {
    backgroundColor: '#F59E0B',
  },
  premiumButton: {
    backgroundColor: '#8B5CF6',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: 'white',
  },
  secondaryButtonText: {
    color: '#6A1B9A',
  },
  goldButtonText: {
    color: 'white',
  },
  premiumButtonText: {
    color: 'white',
  },
  buttonIcon: {
    marginRight: 8,
  },
  // Lottie Placeholder
  lottiePlaceholder: {
    backgroundColor: '#f3f4f6',
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#6A1B9A',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 4,
    borderColor: 'white',
  },
};

export default HomeScreen;


//The original code for backend integration, state management
// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   SafeAreaView,
//   Animated,
//   Dimensions,
//   TouchableOpacity,
// } from 'react-native';
// import { useRouter } from 'expo-router';
// import { LinearGradient } from 'expo-linear-gradient';
// import { useDispatch } from 'react-redux';
// import { setOnboardingData } from '../../store/slices/authSlice';
// import LottieLoader from '../../components/animations/LottieLoader';
// import AnimatedButton from '../../components/ui/AnimatedButton';
// import AnimatedBackground from '../../components/animations/AnimatedBackground';
// import { MaterialIcons, FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';
// import tw from '../../utils/tw';

// const { width } = Dimensions.get('window');

// const OnboardingScreen = () => {
//   const router = useRouter();
//   const dispatch = useDispatch();
//   const [step, setStep] = useState(1);
//   const [selectedInterests, setSelectedInterests] = useState([]);
//   const [selectedRole, setSelectedRole] = useState('');
  
//   const fadeAnim = useState(new Animated.Value(0))[0];
//   const slideAnim = useState(new Animated.Value(50))[0];
//   const progressAnim = useState(new Animated.Value(0))[0];

//   const quotes = [
//     {
//       text: "When women support each other, incredible things happen.",
//       author: "Phoebe Asiyo"
//     },
//     {
//       text: "Your voice matters. Your story is important.",
//       author: "Phoebe Asiyo"
//     },
//     {
//       text: "Together we rise, together we thrive.",
//       author: "Asiyo Foundation"
//     },
//     {
//       text: "Empowered women empower women.",
//       author: "Global Sisterhood"
//     }
//   ];

//   const interests = [
//     { id: 'leadership', name: 'Leadership', icon: 'crown', library: FontAwesome5, color: '#8B5CF6' },
//     { id: 'finance', name: 'Finance', icon: 'trending-up', library: Feather, color: '#10B981' },
//     { id: 'health', name: 'Health & Wellness', icon: 'favorite', library: MaterialIcons, color: '#EF4444' },
//     { id: 'advocacy', name: 'Advocacy', icon: 'megaphone', library: Ionicons, color: '#F59E0B' },
//     { id: 'entrepreneurship', name: 'Entrepreneurship', icon: 'briefcase', library: Feather, color: '#6366F1' },
//     { id: 'education', name: 'Education', icon: 'graduation-cap', library: FontAwesome5, color: '#EC4899' },
//     { id: 'technology', name: 'Technology', icon: 'laptop', library: Feather, color: '#06B6D4' },
//     { id: 'arts', name: 'Arts & Culture', icon: 'palette', library: MaterialIcons, color: '#8B5CF6' },
//   ];

//   const roles = [
//     {
//       id: 'mentor',
//       name: 'Mentor',
//       description: 'Guide and support other women',
//       gradient: ['#6A1B9A', '#8E24AA'],
//       icon: 'people',
//       library: MaterialIcons
//     },
//     {
//       id: 'entrepreneur',
//       name: 'Entrepreneur',
//       description: 'Building businesses and ventures',
//       gradient: ['#FFD700', '#FBC02D'],
//       icon: 'business',
//       library: MaterialIcons
//     },
//     {
//       id: 'advocate',
//       name: 'Advocate',
//       description: 'Championing causes and rights',
//       gradient: ['#FF6B6B', '#FF8E53'],
//       icon: 'gavel',
//       library: MaterialIcons
//     },
//     {
//       id: 'changemaker',
//       name: 'Changemaker',
//       description: 'Driving social impact',
//       gradient: ['#4ECDC4', '#44A08D'],
//       icon: 'public',
//       library: MaterialIcons
//     },
//   ];

//   useEffect(() => {
//     Animated.parallel([
//       Animated.timing(fadeAnim, {
//         toValue: 1,
//         duration: 600,
//         useNativeDriver: true,
//       }),
//       Animated.timing(slideAnim, {
//         toValue: 0,
//         duration: 600,
//         useNativeDriver: true,
//       }),
//       Animated.spring(progressAnim, {
//         toValue: (step / 4) * 100,
//         friction: 8,
//         tension: 40,
//         useNativeDriver: false,
//       }),
//     ]).start();
//   }, [step]);

//   const handleNext = () => {
//     Animated.parallel([
//       Animated.timing(fadeAnim, {
//         toValue: 0,
//         duration: 300,
//         useNativeDriver: true,
//       }),
//       Animated.timing(slideAnim, {
//         toValue: -50,
//         duration: 300,
//         useNativeDriver: true,
//       }),
//     ]).start(() => {
//       if (step < 4) {
//         setStep(step + 1);
//       } else {
//         completeOnboarding();
//       }
//     });
//   };

//   const handleBack = () => {
//     Animated.parallel([
//       Animated.timing(fadeAnim, {
//         toValue: 0,
//         duration: 300,
//         useNativeDriver: true,
//       }),
//       Animated.timing(slideAnim, {
//         toValue: 50,
//         duration: 300,
//         useNativeDriver: true,
//       }),
//     ]).start(() => {
//       if (step > 1) {
//         setStep(step - 1);
//       }
//     });
//   };

//   const toggleInterest = (interestId) => {
//     setSelectedInterests(prev =>
//       prev.includes(interestId)
//         ? prev.filter(id => id !== interestId)
//         : [...prev, interestId]
//     );
//   };

//   const completeOnboarding = () => {
//     dispatch(setOnboardingData({
//       interests: selectedInterests,
//       role: selectedRole,
//       completed: true
//     }));
//     router.push('/(auth)/register');
//   };

//   const getAnimationType = () => {
//     switch(step) {
//       case 1: return 'welcome';
//       case 2: return 'empowerment';
//       case 3: return 'mentorship';
//       case 4: return 'celebration';
//       default: return 'welcome';
//     }
//   };

//   const renderStep = () => {
//     switch(step) {
//       case 1:
//         return (
//           <View style={tw`flex-1 justify-center items-center`}>
//             <Text style={tw`text-3xl font-bold text-center text-purple-900 mb-4`}>
//               Welcome to Asiyo
//             </Text>
//             <Text style={tw`text-lg text-center text-gray-600 mb-8 leading-7`}>
//               {quotes[0].text}
//             </Text>
//             <Text style={tw`text-sm text-center text-purple-700 font-medium mb-12`}>
//               - {quotes[0].author}
//             </Text>
//             <AnimatedButton
//               title="Begin Journey"
//               onPress={handleNext}
//               variant="gold"
//               size="lg"
//             />
//           </View>
//         );
      
//       case 2:
//         return (
//           <View style={tw`flex-1`}>
//             <Text style={tw`text-2xl font-bold text-center text-purple-900 mb-2`}>
//               Your Passions
//             </Text>
//             <Text style={tw`text-base text-center text-gray-600 mb-8`}>
//               Select what inspires you
//             </Text>
            
//             <ScrollView style={tw`flex-1 mb-6`} showsVerticalScrollIndicator={false}>
//               <View style={tw`flex-row flex-wrap justify-between`}>
//                 {interests.map((interest) => {
//                   const IconComponent = interest.library;
//                   const isSelected = selectedInterests.includes(interest.id);
//                   return (
//                     <TouchableOpacity
//                       key={interest.id}
//                       style={[
//                         tw`w-[48%] mb-4 p-4 rounded-2xl border-2 border-gray-200`,
//                         isSelected && tw`border-purple-500 bg-purple-50`
//                       ]}
//                       onPress={() => toggleInterest(interest.id)}
//                     >
//                       <View style={tw`items-center`}>
//                         <View style={[
//                           tw`w-12 h-12 rounded-full items-center justify-center mb-2`,
//                           { backgroundColor: isSelected ? interest.color : '#F3F4F6' }
//                         ]}>
//                           <IconComponent 
//                             name={interest.icon}
//                             size={24} 
//                             color={isSelected ? '#FFFFFF' : interest.color} 
//                           />
//                         </View>
//                         <Text style={[
//                           tw`text-base font-semibold text-center`,
//                           isSelected ? tw`text-purple-700` : tw`text-gray-700`
//                         ]}>
//                           {interest.name}
//                         </Text>
//                       </View>
//                     </TouchableOpacity>
//                   );
//                 })}
//               </View>
//             </ScrollView>

//             <View style={tw`flex-row justify-between`}>
//               <AnimatedButton
//                 title="Back"
//                 onPress={handleBack}
//                 variant="secondary"
//                 size="md"
//               />
//               <AnimatedButton
//                 title={`Continue (${selectedInterests.length})`}
//                 onPress={handleNext}
//                 variant="primary"
//                 size="md"
//                 disabled={selectedInterests.length === 0}
//               />
//             </View>
//           </View>
//         );
      
//       case 3:
//         return (
//           <View style={tw`flex-1`}>
//             <Text style={tw`text-2xl font-bold text-center text-purple-900 mb-2`}>
//               Your Role
//             </Text>
//             <Text style={tw`text-base text-center text-gray-600 mb-8`}>
//               How do you want to contribute?
//             </Text>
            
//             <ScrollView style={tw`flex-1 mb-6`} showsVerticalScrollIndicator={false}>
//               {roles.map((role) => {
//                 const IconComponent = role.library;
//                 return (
//                   <TouchableOpacity
//                     key={role.id}
//                     onPress={() => setSelectedRole(role.id)}
//                     style={tw`mb-4`}
//                   >
//                     <LinearGradient
//                       colors={role.gradient}
//                       style={[
//                         tw`p-6 rounded-2xl`,
//                         selectedRole === role.id && tw`border-2 border-white`,
//                       ]}
//                       start={{ x: 0, y: 0 }}
//                       end={{ x: 1, y: 1 }}
//                     >
//                       <View style={tw`flex-row items-center`}>
//                         <View style={tw`flex-row items-center flex-1`}>
//                           <View style={tw`w-10 h-10 rounded-full bg-white bg-opacity-20 items-center justify-center mr-3`}>
//                             <IconComponent 
//                               name={role.icon}
//                               size={20} 
//                               color="#FFFFFF" 
//                             />
//                           </View>
//                           <View>
//                             <Text style={tw`text-white text-xl font-bold mb-1`}>
//                               {role.name}
//                             </Text>
//                             <Text style={tw`text-white text-opacity-90`}>
//                               {role.description}
//                             </Text>
//                           </View>
//                         </View>
//                         {selectedRole === role.id && (
//                           <View style={tw`w-6 h-6 rounded-full bg-white items-center justify-center`}>
//                             <MaterialIcons name="check" size={16} color="#6A1B9A" />
//                           </View>
//                         )}
//                       </View>
//                     </LinearGradient>
//                   </TouchableOpacity>
//                 );
//               })}
//             </ScrollView>

//             <View style={tw`flex-row justify-between`}>
//               <AnimatedButton
//                 title="Back"
//                 onPress={handleBack}
//                 variant="secondary"
//                 size="md"
//               />
//               <AnimatedButton
//                 title="Continue"
//                 onPress={handleNext}
//                 variant="gold"
//                 size="md"
//                 disabled={!selectedRole}
//               />
//             </View>
//           </View>
//         );
      
//       case 4:
//         return (
//           <View style={tw`flex-1 justify-center items-center`}>
//             <LottieLoader 
//               type="celebration"
//               size={180}
//               loop={false}
//             />
            
//             <Text style={tw`text-3xl font-bold text-center text-purple-900 mb-4 mt-8`}>
//               You're All Set!
//             </Text>
//             <Text style={tw`text-lg text-center text-gray-600 mb-6 leading-7`}>
//               Get ready to connect, learn, and grow with women worldwide
//             </Text>
//             <Text style={tw`text-base text-center text-purple-700 font-medium mb-2`}>
//               "{quotes[3].text}"
//             </Text>
//             <Text style={tw`text-sm text-center text-purple-600 mb-12`}>
//               - {quotes[3].author}
//             </Text>
            
//             <AnimatedButton
//               title="Join Sisterhood"
//               onPress={handleNext}
//               variant="premium"
//               size="lg"
//             />
//           </View>
//         );
//     }
//   };

//   return (
//     <SafeAreaView style={tw`flex-1 bg-white`}>
//       <AnimatedBackground type="floating" opacity={0.15} speed={0.3} />
      
//       <LinearGradient
//         colors={['#6A1B9A', '#8E24AA']}
//         style={tw`h-48 mt-[-750] rounded-b-3xl`}
//       >
//         <View style={tw`flex-1 justify-center items-center`}>
//           <LottieLoader 
//             type={getAnimationType()}
//             size={120}
//           />
//         </View>
//       </LinearGradient>

//       <View style={tw`px-6 -mt-6 mb-8`}>
//         <View style={tw`bg-gray-200 rounded-full h-2 overflow-hidden`}>
//           <Animated.View 
//             style={[
//               tw`bg-gold-500 rounded-full h-2`,
//               {
//                 width: progressAnim.interpolate({
//                   inputRange: [0, 100],
//                   outputRange: ['0%', '100%'],
//                 }),
//               }
//             ]} 
//           />
//         </View>
//       </View>

//       <View style={tw`flex-1 px-6`}>
//         <Animated.View
//           style={[
//             tw`flex-1`,
//             {
//               opacity: fadeAnim,
//               transform: [{ translateY: slideAnim }],
//             },
//           ]}
//         >
//           {renderStep()}
//         </Animated.View>
//       </View>
//     </SafeAreaView>
//   );
// };