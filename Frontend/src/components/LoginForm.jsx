import { useState } from 'react'
import Input from './Input'
import { authAPI } from '../utils/api'

export default function LoginForm({ onLogin, onError }) {
  const [formData, setFormData] = useState({
    mobile: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await authAPI.login(formData.mobile, formData.password)

      // Store token and user data
      if (result.data.token) {
        localStorage.setItem('token', result.data.token)
        localStorage.setItem('user', JSON.stringify(result.data.user))
      }

      // Call onLogin callback with user data
      if (onLogin) {
        onLogin(result.data.user, result.data.token)
      }
    } catch (error) {
      setError(error.message || 'Login failed. Please check your credentials.')
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
          placeholder="Enter your password"
          required
        />

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold animate-shake flex-shrink-0">
            {error}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full py-2 sm:py-2.5 md:py-3 rounded-lg font-bold text-white text-xs sm:text-sm md:text-base shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 hover:from-blue-600 hover:via-indigo-700 hover:to-purple-700 shrink-0 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  )
}

