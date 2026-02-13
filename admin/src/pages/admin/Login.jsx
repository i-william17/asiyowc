import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginAdmin, clearError } from "../../store/slices/authSlice";
import { useNavigate } from "react-router-dom";

// Icons – using heroicons v1 style (via react-icons or direct SVG)
// For this design we import from react-icons for simplicity.
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, FiShield } from "react-icons/fi";

// Lottie – using lottie-react for declarative animation
import Lottie from "lottie-react";
// Import a free, modern Lottie animation JSON (e.g., "login" or "security")
// We'll use a publicly available animation URL or embed a simple one.
// For this demo, we include a minimal, static-like placeholder.
// In production, replace with your own .json file.
import loginAnimationData from "../../assets/login.json"; // <-- you must place a Lottie JSON here

// Import background image
import adminBg from "../../assets/back.jpg"; // Make sure to add your background image here

// Import logo image
import logoImage from "../../assets/asiyo-nobg.png"; // Add your logo file here

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error, token } = useSelector((s) => s.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // redirect if already logged in
  useEffect(() => {
    if (token) navigate("/admin/dashboard");
  }, [token, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginAdmin({ email, password }));
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat p-4"
      style={{ 
        backgroundImage: `url(${adminBg})`,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backgroundBlendMode: 'overlay'
      }}
    >
      {/* Semi-transparent overlay for better readability */}
      <div className="absolute inset-0 bg-black/30"></div>
      
      {/* Main card: left (Lottie) + right (form) */}
      <div className="relative flex flex-col md:flex-row bg-white rounded-3xl shadow-2xl overflow-hidden max-w-5xl w-full">
        
        {/* LEFT SIDE – LOTTIE ILLUSTRATION */}
        <div className="md:w-1/2 bg-[#6A1B9A] flex items-center justify-center p-8">
          <div className="w-full max-w-sm">
            {loginAnimationData ? (
              <Lottie
                animationData={loginAnimationData}
                loop={true}
                className="w-full h-auto"
              />
            ) : (
              // Fallback if animation not available
              <div className="text-white text-center p-12">
                <FiShield className="w-20 h-20 mx-auto text-white/80" />
                <p className="mt-4 text-lg font-light">Secure workspace</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE – LOGIN FORM */}
        <div className="md:w-1/2 p-8 md:p-10 bg-white flex flex-col justify-center">
          
          {/* Logo above form - centered and larger */}
          <div className="mb-8 flex justify-center">
            <img 
              src={logoImage} 
              alt="Company Logo" 
              className="h-16 w-auto object-contain"
            />
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center md:text-left">Welcome back</h2>
          <p className="text-gray-500 mb-8 text-center md:text-left">Sign in to your admin account</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A1B9A] focus:border-transparent outline-none transition text-gray-900 placeholder-gray-400"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    dispatch(clearError());
                  }}
                  required
                />
              </div>
            </div>

            {/* Password field with hide/show */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A1B9A] focus:border-transparent outline-none transition text-gray-900 placeholder-gray-400"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-[#6A1B9A]"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <FiEyeOff className="h-5 w-5" />
                  ) : (
                    <FiEye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot password row */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-[#6A1B9A] border-gray-300 rounded focus:ring-[#6A1B9A]"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <a href="#" className="text-sm font-medium text-[#6A1B9A] hover:underline">
                Forgot password?
              </a>
            </div>

            {/* Error message - with icon, no emoji */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
                <FiAlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit button - solid purple, no gradient */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#6A1B9A] hover:bg-[#4A0E6A] text-white font-semibold py-3 px-4 rounded-lg transition duration-200 ease-in-out transform hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-[#6A1B9A]/50 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>

            {/* Demo credentials hint */}
            <div className="text-center mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500">
                Demo: admin@example.com / admin123
              </p>
            </div>
          </form>

          {/* Footer note - with icon, no emoji */}
          <p className="mt-8 text-xs text-gray-400 text-center flex items-center justify-center">
            <FiShield className="h-3.5 w-3.5 mr-1.5" />
            Protected by enterprise security
          </p>
        </div>
      </div>
    </div>
  );
}