'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useSessionTimeout() {
  const router = useRouter()

  useEffect(() => {
    const checkSession = () => {
      const sessionExpiry = localStorage.getItem('sessionExpiry')
      const user = localStorage.getItem('user')
      
      if (!user || !sessionExpiry) {
        return
      }

      const expiryTime = parseInt(sessionExpiry, 10)
      
      if (expiryTime && Date.now() >= expiryTime) {
        // Session expired
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        localStorage.removeItem('sessionExpiry')
        localStorage.removeItem('loginTime')
        
        alert('Your session has expired. Please login again.')
        router.push('/')
      }
    }

    // Check immediately
    checkSession()

    // Check every minute
    const interval = setInterval(checkSession, 60 * 1000)

    return () => clearInterval(interval)
  }, [router])
}
