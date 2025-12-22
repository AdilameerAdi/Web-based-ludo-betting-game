import { useState } from 'react'
import Input from './Input'
import { authAPI } from '../../utils/api'

export default function SignUpForm({ onSignUp, onError }) {
  const [formData, setFormData] = useState({
    mobile: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user types
    if (error) setError('')
  }

  const validateForm = () => {
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters!')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match!')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await authAPI.signup(
        formData.mobile, 
        formData.password, 
        formData.confirmPassword
      )

      // Store token and user data
      if (result.data.token) {
        localStorage.setItem('token', result.data.token)
        localStorage.setItem('user', JSON.stringify(result.data.user))
      }

      // Call onSignUp callback with user data
      if (onSignUp) {
        onSignUp(result.data.user, result.data.token)
      }
    } catch (error) {
      setError(error.message || 'Sign up failed. Please try again.')
      if (onError) {
        onError(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-2 sm:space-y-2.5 animate-fadeIn">
      <div className="flex-1 flex flex-col justify-center min-h-0">
        <Input
          label="Mobile Number"
          type="tel"
          name="mobile"
          value={formData.mobile}
          onChange={handleInputChange}
          placeholder="Enter your mobile number"
          required
        />

        <Input
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleInputChange}
          placeholder="Enter your password (min 6 characters)"
          required
        />

        <Input
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          placeholder="Confirm your password"
          required
        />

        {error && (
          <div className="bg-red-500/20 border-2 border-red-500/50 text-red-300 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold animate-shake flex-shrink-0 backdrop-blur-sm">
            {error}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`group relative w-full py-3 sm:py-3.5 md:py-4 rounded-xl font-bold text-white text-sm sm:text-base md:text-lg shadow-2xl hover:shadow-red-500/50 transform hover:scale-105 active:scale-95 transition-all duration-300 overflow-hidden bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-500 hover:via-red-600 hover:to-red-700 shrink-0 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {loading ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>Signing up...</span>
            </>
          ) : (
            <>
              <span>Sign Up</span>
              <span className="transform group-hover:translate-x-1 transition-transform">→</span>
            </>
          )}
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-red-600 to-red-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </button>
    </form>
  )
}

