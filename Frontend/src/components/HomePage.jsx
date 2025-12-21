import { useNavigate } from 'react-router-dom';
import logoImage from './img/LUDO BATTLE LOGO.png';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col relative overflow-hidden">
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

      {/* Header with Logo */}
      <header className="relative z-10 w-full py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto relative flex justify-center items-center">
          {/* Logo - Centered */}
          <div className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 via-yellow-500 to-red-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
            <img 
              src={logoImage} 
              alt="Ludo Battle Logo" 
              className="relative h-20 sm:h-24 md:h-28 object-contain drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          
          {/* Login and Register Buttons - Top Right */}
          <div className="absolute right-0 flex gap-2 sm:gap-3 items-center">
            <button
              onClick={() => navigate('/login')}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-black text-white font-bold text-4xl sm:text-sm rounded-lg shadow-lg hover:shadow-yellow-500/50 transform hover:scale-105 active:scale-95 transition-all duration-300"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-black text-white font-bold text-4xl sm:text-sm rounded-lg shadow-lg hover:shadow-red-500/50 transform hover:scale-105 active:scale-95 transition-all duration-300"
            >
              Register
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-7xl w-full">
          {/* Hero Section */}
          <div className="text-center mb-12 sm:mb-16 animate-fadeInDown">
            <div className="inline-block mb-6">
              <span className="text-6xl sm:text-7xl md:text-8xl animate-spin-slow">🎲</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white mb-6 drop-shadow-2xl tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">
                Welcome to
              </span>
              <br />
              <span className="text-white">LUDO BATTLE</span>
            </h1>
            <p className="text-xl sm:text-2xl md:text-3xl text-yellow-400 font-bold drop-shadow-lg mb-4">
              Bet Real Money & Win Big!
            </p>
            <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-3xl mx-auto drop-shadow-md leading-relaxed">
              Place your bets, play strategically, and win real cash prizes! Compete with players worldwide in high-stakes Ludo battles. 
              Every game is a chance to multiply your money!
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
            <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-yellow-500/30 hover:border-yellow-400/50 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/20">
              <div className="text-5xl mb-4 text-center">💰</div>
              <h3 className="text-xl sm:text-2xl font-bold text-yellow-400 mb-3 text-center">Real Money Betting</h3>
              <p className="text-white/80 text-sm sm:text-base text-center">
                Bet real money on every game and win cash prizes instantly. Secure transactions guaranteed.
              </p>
            </div>
            <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-red-500/30 hover:border-red-400/50 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-red-500/20">
              <div className="text-5xl mb-4 text-center">🏆</div>
              <h3 className="text-xl sm:text-2xl font-bold text-red-400 mb-3 text-center">Win Big Prizes</h3>
              <p className="text-white/80 text-sm sm:text-base text-center">
                Compete in high-stakes tournaments and win massive cash prizes. The bigger the bet, the bigger the win!
              </p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-yellow-500/30 hover:border-yellow-400/50 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/20">
              <div className="text-5xl mb-4 text-center">⚡</div>
              <h3 className="text-xl sm:text-2xl font-bold text-yellow-400 mb-3 text-center">Instant Withdrawals</h3>
              <p className="text-white/80 text-sm sm:text-base text-center">
                Withdraw your winnings instantly. Fast, secure, and reliable payment processing.
              </p>
            </div>
          </div>

          {/* Login and Register Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center mb-12 sm:mb-16 animate-fadeIn">
            <button
              onClick={() => navigate('/login')}
              className="group relative w-full sm:w-auto px-10 sm:px-14 py-4 sm:py-5 bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-700 text-black font-bold text-lg sm:text-xl rounded-2xl shadow-2xl hover:shadow-yellow-500/50 transform hover:scale-110 active:scale-95 transition-all duration-300 overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <span>Login</span>
                <span className="transform group-hover:translate-x-1 transition-transform">→</span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
            <button
              onClick={() => navigate('/register')}
              className="group relative w-full sm:w-auto px-10 sm:px-14 py-4 sm:py-5 bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white font-bold text-lg sm:text-xl rounded-2xl shadow-2xl hover:shadow-red-500/50 transform hover:scale-110 active:scale-95 transition-all duration-300 overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <span>Register & Start Betting</span>
                <span className="transform group-hover:translate-x-1 transition-transform">→</span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-red-600 to-red-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>

          {/* Ludo Image and Text Section */}
          <div className="bg-gradient-to-br from-yellow-500/10 to-red-500/5 backdrop-blur-xl rounded-3xl p-8 sm:p-10 md:p-14 shadow-2xl border-2 border-yellow-500/30 animate-fadeIn relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-400/10 rounded-full blur-3xl"></div>
            
            <div className="relative flex flex-col lg:flex-row items-center gap-8 sm:gap-10 md:gap-12">
              {/* Ludo Image */}
              <div className="flex-shrink-0 w-full lg:w-1/2 flex justify-center">
                <div className="relative group">
                  <div className="absolute -inset-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-red-500 rounded-3xl blur-2xl opacity-50 group-hover:opacity-75 transition duration-300"></div>
                  <img 
                    src="/images/homedesign.jpg" 
                    alt="Ludo Game Board" 
                    className="relative w-full max-w-lg rounded-2xl shadow-2xl transform group-hover:scale-105 transition-transform duration-500 border-4 border-white/30"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) {
                        e.target.nextSibling.style.display = 'flex';
                      }
                    }}
                  />
                  <div style={{ display: 'none' }} className="relative w-full max-w-lg h-80 bg-gradient-to-br from-red-500 via-yellow-500 to-green-500 rounded-2xl flex items-center justify-center text-white text-6xl font-bold border-4 border-white/30 shadow-2xl">
                    🎲 LUDO
                  </div>
                </div>
              </div>
              
              {/* Text Content */}
              <div className="flex-1 text-center lg:text-left">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-6 sm:mb-8 drop-shadow-xl bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                  Bet & Win Real Money
                </h2>
                <div className="space-y-4 sm:space-y-5 text-white/90 text-base sm:text-lg md:text-xl leading-relaxed">
                  <p className="flex items-start gap-3">
                    <span className="text-2xl">💰</span>
                    <span>Place your bets and play for real money. Every move counts, every win pays out instantly to your account.</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="text-2xl">🎯</span>
                    <span>Compete in high-stakes matches with real players. Strategy and luck combine for maximum winnings!</span>
                  </p>
                  <p className="flex items-start gap-3">
                    <span className="text-2xl">💸</span>
                    <span>Withdraw your winnings instantly. Secure, fast, and reliable payment processing for all your cashouts.</span>
                  </p>
                </div>
                
                {/* Game Pieces Decoration */}
                <div className="flex justify-center lg:justify-start gap-4 sm:gap-5 mt-8 sm:mt-10">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-red-500 rounded-full shadow-2xl transform hover:scale-125 hover:rotate-12 transition-all duration-300 cursor-pointer border-2 border-white/50"></div>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-blue-500 rounded-full shadow-2xl transform hover:scale-125 hover:rotate-12 transition-all duration-300 cursor-pointer border-2 border-white/50"></div>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-yellow-500 rounded-full shadow-2xl transform hover:scale-125 hover:rotate-12 transition-all duration-300 cursor-pointer border-2 border-white/50"></div>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-green-500 rounded-full shadow-2xl transform hover:scale-125 hover:rotate-12 transition-all duration-300 cursor-pointer border-2 border-white/50"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Enhanced Footer */}
      <footer className="relative z-10 w-full mt-auto bg-gradient-to-b from-black/40 to-black/60 backdrop-blur-xl border-t-2 border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 mb-8">
            {/* About Section */}
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center justify-center md:justify-start gap-2">
                <span className="text-2xl">🎲</span>
                About Us
              </h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Ludo Battle is the premier platform for real money Ludo betting. Join thousands of players betting and winning cash prizes daily. Experience the thrill of high-stakes gaming!
              </p>
            </div>

            {/* Quick Links */}
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold text-white mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => navigate('/login')}
                    className="text-white/70 hover:text-yellow-300 transition-colors duration-200 text-sm"
                  >
                    Login
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('/register')}
                    className="text-white/70 hover:text-yellow-300 transition-colors duration-200 text-sm"
                  >
                    Register
                  </button>
                </li>
                <li>
                  <a href="#" className="text-white/70 hover:text-yellow-300 transition-colors duration-200 text-sm">
                    How to Bet
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white/70 hover:text-yellow-300 transition-colors duration-200 text-sm">
                    Withdraw Funds
                  </a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold text-white mb-4">Support</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-white/70 hover:text-yellow-300 transition-colors duration-200 text-sm">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white/70 hover:text-yellow-300 transition-colors duration-200 text-sm">
                    Contact Support
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white/70 hover:text-yellow-300 transition-colors duration-200 text-sm">
                    Responsible Gaming
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white/70 hover:text-yellow-300 transition-colors duration-200 text-sm">
                    Terms & Conditions
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/20 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-white/60 text-sm text-center md:text-left">
                © 2025 Ludo Battle. All rights reserved.
              </p>
               <div className="flex items-center gap-2 text-black text-sm">
                <span>Made with</span>
                <span className="text-red-500 animate-pulse">❤️</span>
                <span>for Ludo lovers</span>
              </div>
             
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
