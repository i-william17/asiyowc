const Post = require('../models/Post');
const User = require('../models/User');

exports.getPersonalizedFeed = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { page = 1, limit = 20 } = req.query;

    // Get user interests for personalization
    const userInterests = user.profile.interests || [];
    
    let query = { 
      'moderation.status': 'approved',
      $or: [
        { visibility: 'public' },
        { author: req.user.id }
      ]
    };

    // If user has interests, prioritize posts in those categories
    if (userInterests.length > 0) {
      query = {
        ...query,
        $or: [
          { category: { $in: userInterests } },
          { visibility: 'public' },
          { author: req.user.id }
        ]
      };
    }

    const posts = await Post.find(query)
      .populate('author', 'profile firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get daily Phoebe Asiyo quote
    const quotes = [
      "When women support each other, incredible things happen.",
      "Your voice matters. Use it to create change.",
      "Leadership is about lifting others as you climb.",
      "Together we rise, together we thrive.",
      "The power of a woman is in her resilience and compassion."
    ];
    
    const dailyQuote = quotes[Math.floor(Math.random() * quotes.length)];

    // Get featured programs (simplified)
    const featuredContent = {
      quote: {
        text: dailyQuote,
        author: "Phoebe Asiyo"
      },
      featuredPrograms: [
        {
          title: "Women in Leadership",
          description: "Develop your leadership skills and make an impact",
          image: "https://example.com/leadership.jpg"
        }
      ]
    };

    const total = await Post.countDocuments(query);

    res.json({
      success: true,
      data: {
        posts,
        featuredContent,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getExploreContent = async (req, res) => {
  try {
    const { category } = req.query;

    const categories = ['Leadership', 'Finance', 'Wellness', 'Advocacy', 'Legacy'];
    
    const exploreData = await Promise.all(
      categories.map(async (cat) => {
        const posts = await Post.find({ 
          category: cat,
          'moderation.status': 'approved'
        })
        .populate('author', 'profile firstName lastName avatar')
        .sort({ createdAt: -1 })
        .limit(5);

        return {
          category: cat,
          posts
        };
      })
    );

    res.json({
      success: true,
      data: { exploreData }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};