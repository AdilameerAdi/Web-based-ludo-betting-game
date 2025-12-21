import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import UserDashboard from './UserDashboard'

export default function Dashboard() {
  const navigate = useNavigate()
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

  useEffect(() => {
    // Redirect to home if not authenticated
    if (!isAuthenticated || !currentUser) {
      navigate('/')
    }
  }, [isAuthenticated, currentUser, navigate])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setCurrentUser(null)
    setIsAuthenticated(false)
    navigate('/')
  }

  // If user is not authenticated, show nothing (will redirect)
  if (!isAuthenticated || !currentUser) {
    return null
  }

  // If user is authenticated, show dashboard
  return <UserDashboard user={currentUser} onLogout={handleLogout} />
}

