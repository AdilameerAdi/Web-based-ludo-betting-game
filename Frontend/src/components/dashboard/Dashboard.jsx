import { useState } from 'react'
import LoginForm from '../auth/LoginForm'
import SignUpForm from '../auth/SignUpForm'
import UserDashboard from './UserDashboard'

export default function Dashboard() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    if (token && user) {
      console.log('🔍 User already logged in from localStorage')
      return true
    }
    return false
  })
  const [currentUser, setCurrentUser] = useState(() => {
    const user = localStorage.getItem('user')
    return user ? JSON.parse(user) : null
  })

  const handleLogin = (user, token) => {
    setCurrentUser(user)
    setIsAuthenticated(true)
  }

  const handleSignUp = (user, token) => {
    setCurrentUser(user)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setIsAuthenticated(false)
  }

  const handleError = (error) => {
    // Error handling
  }

  // If user is authenticated, show dashboard
  if (isAuthenticated && currentUser) {
    return <UserDashboard user={currentUser} onLogout={handleLogout} />
  }

  return (
    <div className="h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800 flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Game Pieces */}
        <div className="absolute top-10 left-5 sm:top-20 sm:left-10 w-12 h-12 sm:w-16 sm:h-16 bg-red-500 rounded-full opacity-20 animate-bounce" style={{ animationDuration: '3s' }}></div>
        <div className="absolute top-20 right-10 sm:top-40 sm:right-20 w-8 h-8 sm:w-12 sm:h-12 bg-blue-500 rounded-full opacity-20 animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-20 left-1/4 w-10 h-10 sm:w-14 sm:h-14 bg-yellow-500 rounded-full opacity-20 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1s' }}></div>
        <div className="absolute bottom-10 right-1/3 w-8 h-8 sm:w-10 sm:h-10 bg-green-500 rounded-full opacity-20 animate-bounce" style={{ animationDuration: '4.5s', animationDelay: '1.5s' }}></div>
        
        {/* Ludo Board Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="grid grid-cols-8 h-full w-full">
            {[...Array(64)].map((_, i) => (
              <div 
                key={i} 
                className={`border border-white/30 ${
                  Math.floor(i / 8) % 2 === 0 
                    ? (i % 2 === 0 ? 'bg-yellow-400' : 'bg-red-400')
                    : (i % 2 === 0 ? 'bg-red-400' : 'bg-yellow-400')
                }`}
              ></div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md h-full flex flex-col justify-center py-2">
        {/* Game Title with Animation */}
        <div className="text-center mb-2 animate-fadeInDown flex-shrink-0">
          <div className="inline-block mb-0.5">
            <span className="text-3xl sm:text-4xl md:text-5xl animate-spin-slow">🎲</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-0.5 drop-shadow-2xl tracking-wide">
            LUDO
          </h1>
          <p className="text-yellow-300 text-xs sm:text-sm md:text-base font-bold drop-shadow-lg">
            Classic Board Game
          </p>
          <div className="flex justify-center gap-1.5 sm:gap-2 mt-0.5">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse"></div>
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
          </div>
        </div>

        {/* Dashboard Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-2xl p-3 sm:p-4 md:p-5 border border-white/20 flex-1 flex flex-col min-h-0">
          {/* Toggle Buttons */}
          <div className="flex gap-2 mb-3 bg-gray-100 p-1 rounded-lg flex-shrink-0">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-1.5 sm:py-2 px-3 rounded-md font-bold text-xs sm:text-sm transition-all duration-300 ${
                !isSignUp
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-1.5 sm:py-2 px-3 rounded-md font-bold text-xs sm:text-sm transition-all duration-300 ${
                isSignUp
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg scale-105'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form Container - No scrolling */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {isSignUp ? (
              <SignUpForm onSignUp={handleSignUp} onError={handleError} />
            ) : (
              <LoginForm onLogin={handleLogin} onError={handleError} />
            )}
          </div>

          {/* Game Pieces Decoration */}
          <div className="flex justify-center gap-2 sm:gap-3 pt-4 sm:pt-5 md:pt-6 pb-1 sm:pb-2 flex-shrink-0 border-t border-gray-200 mt-2 sm:mt-3">
            <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 bg-red-500 rounded-full shadow-lg transform hover:scale-110 transition-transform cursor-pointer"></div>
            <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 bg-blue-500 rounded-full shadow-lg transform hover:scale-110 transition-transform cursor-pointer"></div>
            <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 bg-yellow-500 rounded-full shadow-lg transform hover:scale-110 transition-transform cursor-pointer"></div>
            <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 bg-green-500 rounded-full shadow-lg transform hover:scale-110 transition-transform cursor-pointer"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

