import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SignUpForm from './auth/SignUpForm';
import logoImage from './img/LUDO BATTLE LOGO.png';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const user = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (user && token) {
        return JSON.parse(user);
      }
      return null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      // Clear corrupted data
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return null;
    }
  });

  // Redirect if user is already logged in
  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleSignUp = (user, token) => {
    setCurrentUser(user);
    // Redirect to dashboard after successful signup
    navigate('/dashboard', { replace: true });
  };

  const handleError = (error) => {
    // Error handling
    console.error('Sign up error:', error);
  };

  // If user is already logged in, show nothing (will redirect)
  if (currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Game Pieces */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-red-500/20 rounded-full blur-xl animate-bounce" style={{ animationDuration: '6s' }}></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-yellow-500/20 rounded-full blur-xl animate-bounce" style={{ animationDuration: '8s', animationDelay: '1s' }}></div>
        <div className="absolute bottom-40 left-1/4 w-24 h-24 bg-yellow-500/20 rounded-full blur-xl animate-bounce" style={{ animationDuration: '7s', animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 right-1/3 w-18 h-18 bg-red-500/20 rounded-full blur-xl animate-bounce" style={{ animationDuration: '9s', animationDelay: '1.5s' }}></div>
        
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl"></div>
        
        {/* Ludo Board Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="grid grid-cols-12 h-full w-full">
            {[...Array(144)].map((_, i) => (
              <div 
                key={i} 
                className={`border border-white/20 ${
                  Math.floor(i / 12) % 2 === 0 
                    ? (i % 2 === 0 ? 'bg-yellow-400/30' : 'bg-red-400/30')
                    : (i % 2 === 0 ? 'bg-red-400/30' : 'bg-yellow-400/30')
                }`}
              ></div>
            ))}
          </div>
        </div>
      </div>

      {/* Logo - Top Left Corner */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-red-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
          <img 
            src={logoImage} 
            alt="Ludo Battle Logo" 
            className="relative h-12 sm:h-16 md:h-20 object-contain drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md h-full flex flex-col justify-center py-4">
        {/* Welcome Section */}
        <div className="text-center mb-6 animate-fadeInDown flex-shrink-0">
          <div className="inline-block mb-4">
            <span className="text-4xl sm:text-5xl md:text-6xl animate-spin-slow">🎲</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-3 drop-shadow-2xl tracking-tight">
            <span className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">
              Join the Battle!
            </span>
          </h1>
          <p className="text-yellow-400 text-base sm:text-lg md:text-xl font-bold drop-shadow-lg">
            Create your account and start betting
          </p>
        </div>

        {/* Register Card with Enhanced Design */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 border-2 border-yellow-500/30 animate-fadeIn relative overflow-hidden">
          {/* Card Glow Effects */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-400/10 rounded-full blur-3xl"></div>
          
          <div className="relative flex flex-col min-h-0">
            <div className="flex-1 flex flex-col min-h-0">
              <SignUpForm onSignUp={handleSignUp} onError={handleError} />
            </div>

            {/* Login Link */}
            <div className="mt-6 pt-6 border-t border-yellow-500/20 text-center flex-shrink-0">
              <p className="text-sm sm:text-base text-white/70 mb-3">
                Already have an account?
              </p>
              <button
                onClick={() => navigate('/login')}
                className="group relative px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold text-sm sm:text-base rounded-xl shadow-lg hover:shadow-yellow-500/50 transform hover:scale-105 active:scale-95 transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <span>Login Here</span>
                  <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>

            {/* Game Pieces Decoration */}
            <div className="flex justify-center gap-3 sm:gap-4 pt-6 pb-2 flex-shrink-0 border-t border-yellow-500/20 mt-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500 rounded-full shadow-2xl transform hover:scale-125 hover:rotate-12 transition-all duration-300 cursor-pointer border-2 border-white/50"></div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-full shadow-2xl transform hover:scale-125 hover:rotate-12 transition-all duration-300 cursor-pointer border-2 border-white/50"></div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-500 rounded-full shadow-2xl transform hover:scale-125 hover:rotate-12 transition-all duration-300 cursor-pointer border-2 border-white/50"></div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-full shadow-2xl transform hover:scale-125 hover:rotate-12 transition-all duration-300 cursor-pointer border-2 border-white/50"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
