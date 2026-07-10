'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const restrictedRoles = ['ADMIN', 'COMMITTEE_HEAD', 'TEACHER'] as const
  const [selectedRole, setSelectedRole] = useState<string>('STUDENT')
  const router = useRouter()
  const requiresAccessPass = restrictedRoles.includes(selectedRole as (typeof restrictedRoles)[number])
  const isStudent = selectedRole === 'STUDENT'
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [allowRegistration, setAllowRegistration] = useState(true)
  const [showMaintenancePopup, setShowMaintenancePopup] = useState(false)
  const [showRegistrationDisabledPopup, setShowRegistrationDisabledPopup] = useState(false)
  const [showPolicyDialog, setShowPolicyDialog] = useState(false)
  const [showConditionalDialog, setShowConditionalDialog] = useState(false)
  const [registrationResult, setRegistrationResult] = useState<any>(null)
  const [showForgotPasswordDialog, setShowForgotPasswordDialog] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  const [resetPasswordStep, setResetPasswordStep] = useState<'email' | 'code'>('email')
  const [verificationCode, setVerificationCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showEmailVerificationDialog, setShowEmailVerificationDialog] = useState(false)
  const [emailVerificationCode, setEmailVerificationCode] = useState('')
  const [emailVerificationLoading, setEmailVerificationLoading] = useState(false)
  const [emailVerificationResending, setEmailVerificationResending] = useState(false)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('')
  // UI states
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [activeTab, setActiveTab] = useState('login')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage(text)
    setMessageType(type)
    setTimeout(() => setMessage(''), 3000)
  }

  useEffect(() => {
    // Check system settings on mount
    const checkSystemSettings = async () => {
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const data = await response.json()
          const isMaintenance = data.general?.maintenanceMode || false
          const isRegAllowed = data.general?.allowRegistration !== false
          setMaintenanceMode(isMaintenance)
          setAllowRegistration(isRegAllowed)
          if (isMaintenance) {
            setShowMaintenancePopup(true)
          }
        }
      } catch (error) {
        console.error('Failed to load system settings:', error)
      }
    }
    checkSystemSettings()
  }, [])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    setIsLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        // Check user status
        if (data.user.status === 'PENDING') {
          showMessage('Your registration is pending admin approval. You will be notified once your account is approved.', 'error')
          setIsLoading(false)
          return
        }

        if (data.user.status === 'REJECTED') {
          showMessage('Your registration has been rejected. Please contact the administrator for more information.', 'error')
          setIsLoading(false)
          return
        }

        // Check if maintenance mode and user is not admin
        if (maintenanceMode && data.user.role !== 'ADMIN') {
          showMessage('System is currently under maintenance. Only administrators can login.', 'error')
          setIsLoading(false)
          return
        }
        
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('sessionExpiry', data.sessionExpiry?.toString() || '')
        localStorage.setItem('loginTime', Date.now().toString())
        
        showMessage(`Welcome back, ${data.user.name}!`, 'success')

        // Redirect based on role
        setTimeout(() => {
          switch (data.user.role) {
            case 'ADMIN':
              router.push('/super-admin')
              break
            case 'COMMITTEE_HEAD':
              router.push('/committee-head')
              break
            case 'TEACHER':
              router.push('/teacher')
              break
            case 'STUDENT':
              router.push('/student')
              break
            default:
              router.push('/student')
          }
        }, 1000)
      } else {
        const errorMsg = data.error || "Invalid credentials"
        const attemptsMsg = data.remainingAttempts !== undefined && data.remainingAttempts > 0
          ? ` (${data.remainingAttempts} attempt(s) remaining)`
          : ''
        showMessage(errorMsg + attemptsMsg, 'error')
      }
    } catch (error) {
      showMessage("Something went wrong. Please try again.", 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      showMessage('Please enter your email address', 'error')
      return
    }

    setForgotPasswordLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      })

      const data = await response.json()

      if (response.ok) {
        showMessage(data.message, 'success')
        setResetPasswordStep('code')
      } else {
        showMessage(data.error || 'Failed to send reset email', 'error')
      }
    } catch (error) {
      showMessage('Something went wrong. Please try again.', 'error')
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!verificationCode || !newPassword || !confirmPassword) {
      showMessage('Please fill in all fields', 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      showMessage('Passwords do not match', 'error')
      return
    }

    if (newPassword.length < 8) {
      showMessage('Password must be at least 8 characters', 'error')
      return
    }

    setForgotPasswordLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token: verificationCode,
          password: newPassword 
        }),
      })

      const data = await response.json()

      if (response.ok) {
        showMessage('Password reset successful! You can now login.', 'success')
        setShowForgotPasswordDialog(false)
        setForgotPasswordEmail('')
        setVerificationCode('')
        setNewPassword('')
        setConfirmPassword('')
        setResetPasswordStep('email')
      } else {
        showMessage(data.error || 'Failed to reset password', 'error')
      }
    } catch (error) {
      showMessage('Something went wrong. Please try again.', 'error')
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Check maintenance mode
    if (maintenanceMode) {
      setShowMaintenancePopup(true)
      return
    }
    
    // Check if registration is allowed
    if (!allowRegistration) {
      setShowRegistrationDisabledPopup(true)
      return
    }
    
    setIsLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const role = formData.get('role') as string
    const accessPass = (formData.get('accessPass') as string) || ''
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    
    // Student-specific fields
    const rollNumber = formData.get('rollNumber') as string
    const department = formData.get('department') as string
    const faculty = formData.get('faculty') as string
    const session = formData.get('session') as string
    const contactInfo = formData.get('contactInfo') as string
    const cgpaInput = formData.get('cgpa') as string
    const parsedCgpa = cgpaInput ? parseFloat(cgpaInput) : undefined
    const prerequisitesPassed = formData.get('prerequisitesPassed') === 'true'
    const policyAccepted = formData.get('policyAccepted') === 'on'
    const transcriptFile = formData.get('transcript') as File

    if (!role) {
      showMessage('Please select your role', 'error')
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      showMessage("Passwords do not match", 'error')
      setIsLoading(false)
      return
    }

    try {
      const payload: Record<string, any> = {
        name,
        email,
        role,
        password,
      }

      if (restrictedRoles.includes(role as (typeof restrictedRoles)[number])) {
        payload.accessPass = accessPass
      }

      if (role === 'STUDENT') {
        payload.rollNumber = rollNumber
        payload.department = department
        payload.faculty = faculty
        payload.session = session
        payload.contactInfo = contactInfo
        payload.cgpa = parsedCgpa
        payload.prerequisitesPassed = prerequisitesPassed
        payload.policyAccepted = policyAccepted
        
        // Handle transcript file upload if provided
        if (transcriptFile && transcriptFile.size > 0) {
          // Convert file to base64 for transmission
          const reader = new FileReader()
          const base64Promise = new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(transcriptFile)
          })
          
          try {
            const base64Data = await base64Promise
            payload.transcriptFile = {
              name: transcriptFile.name,
              type: transcriptFile.type,
              data: base64Data
            }
          } catch (err) {
            console.error('Error reading file:', err)
          }
        }
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.requiresEmailVerification) {
          setRegistrationResult(data)
          setPendingVerificationEmail(email)
          setEmailVerificationCode('')
          setShowEmailVerificationDialog(true)
          showMessage('Verification code sent to your email. Please verify to continue.', 'success')
        } else if (data.eligibilityStatus === 'CONDITIONAL') {
          setRegistrationResult(data)
          setShowConditionalDialog(true)
        } else {
          showMessage("Your account has been created successfully", 'success')
          
          // Switch to login tab after 2 seconds
          setTimeout(() => {
            const loginTab = document.querySelector('[value="login"]') as HTMLElement
            loginTab?.click()
          }, 2000)
        }
      } else {
        showMessage(data.error || "Failed to create account", 'error')
      }
    } catch (error) {
      showMessage("Something went wrong. Please try again.", 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyRegistrationEmail = async () => {
    if (!pendingVerificationEmail || emailVerificationCode.trim().length !== 6) {
      showMessage('Please enter the 6-digit verification code', 'error')
      return
    }

    setEmailVerificationLoading(true)
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingVerificationEmail,
          code: emailVerificationCode.trim(),
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        showMessage(data.error || 'Invalid or expired verification code', 'error')
        return
      }

      setShowEmailVerificationDialog(false)
      setEmailVerificationCode('')

      if (data.requiresConditional) {
        setRegistrationResult({
          ...(registrationResult || {}),
          userId: data.userId,
          eligibilityStatus: data.eligibilityStatus,
          cgpa: data.cgpa,
          prerequisitesPassed: data.prerequisitesPassed,
        })
        setShowConditionalDialog(true)
      } else {
        setRegistrationResult(null)
        setPendingVerificationEmail('')
        showMessage(
          'Email verified! Your registration is pending approval. You can log in once approved.',
          'success',
        )
        setTimeout(() => setActiveTab('login'), 2000)
      }
    } catch {
      showMessage('Verification failed. Please try again.', 'error')
    } finally {
      setEmailVerificationLoading(false)
    }
  }

  const handleResendRegistrationCode = async () => {
    if (!pendingVerificationEmail) return
    setEmailVerificationResending(true)
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingVerificationEmail }),
      })
      const data = await response.json()
      if (!response.ok) {
        showMessage(data.error || 'Failed to resend verification code', 'error')
        return
      }
      showMessage('A new verification code has been sent to your email.', 'success')
    } catch {
      showMessage('Failed to resend verification code', 'error')
    } finally {
      setEmailVerificationResending(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 relative overflow-hidden">
      {/* Background Image - Stretched to cover full width, positioned higher */}
      <div 
        className="absolute bg-cover bg-center bg-no-repeat opacity-15 sm:opacity-20 md:opacity-30 w-full left-0 right-0"
        style={{
          backgroundImage: 'url(/building.png)',
          backgroundPosition: 'center top',
          top: '-15%',
          height: '130%',
        }}
      />
      
      {/* Overlay for better readability - Lighter on mobile to show image */}
      <div className="absolute inset-0 bg-white/20 sm:bg-white/30 md:bg-white/40" />
      
      {/* Content - Smaller login card */}
      <div className={`w-full relative z-10 transition-all duration-300 ${activeTab === 'register' ? 'max-w-xl sm:max-w-2xl md:max-w-3xl' : 'max-w-[280px] sm:max-w-xs md:max-w-sm'}`}>
        {/* Logo and Title - Larger logo, uppercase title with different font */}
        <div className="text-center mb-2 sm:mb-2.5 md:mb-3">
          <div className="flex justify-center mb-1 sm:mb-1.5">
            <img 
              src="/hamdard-logo.png" 
              alt="University" 
              className="h-12 sm:h-16 md:h-20 lg:h-24 w-auto"
            />
          </div>
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-0.5 sm:mb-1 tracking-wide uppercase" style={{ fontFamily: 'Arial, sans-serif' }}>
            University
          </h1>
          <h2 className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-gray-700 uppercase tracking-wider" style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '0.05em' }}>
            FYP Automation System
          </h2>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-1.5 sm:mb-2 p-1 sm:p-1.5 rounded-lg text-[9px] sm:text-[10px] md:text-xs lg:text-sm text-center ${
            messageType === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Main Card - Smaller and more compact */}
        <Card className="shadow-lg sm:shadow-xl md:shadow-2xl overflow-hidden bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center bg-white py-1 sm:py-1.5 md:py-2 relative">
            <div className="mx-auto bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-full px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 md:py-1.5 w-fit shadow-md">
              <div className="text-center">
                <CardTitle className="text-white text-[10px] sm:text-xs md:text-sm">Welcome</CardTitle>
                <CardDescription className="text-green-100 text-[8px] sm:text-[9px] md:text-[10px]">Sign in to your account or create a new one</CardDescription>
              </div>
            </div>
          </CardHeader> 
          <CardContent className={`${activeTab === 'register' ? 'p-2 sm:p-2.5 md:p-3' : 'p-1.5 sm:p-2 md:p-2.5'}`}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-2 sm:mb-2.5 md:mb-3 h-6 sm:h-7 md:h-8">
                <TabsTrigger value="login" className="text-[9px] sm:text-[10px] md:text-xs">Login</TabsTrigger>
                <TabsTrigger value="register" className="text-[9px] sm:text-[10px] md:text-xs">Register</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-1.5 sm:space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-[9px] sm:text-[10px] md:text-xs">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@university.edu"
                        required
                        disabled={isLoading}
                        className="pl-7 sm:pl-8 h-6 sm:h-7 md:h-8 text-[10px] sm:text-[11px] md:text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="password" className="text-[9px] sm:text-[10px] md:text-xs">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        required
                        disabled={isLoading}
                        className="pl-7 sm:pl-8 pr-7 sm:pr-8 h-6 sm:h-7 md:h-8 text-[10px] sm:text-[11px] md:text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <Eye className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center gap-1 text-[9px] sm:text-[10px] md:text-xs">
                      <input
                        type="checkbox"
                        className="h-2.5 w-2.5 sm:h-3 sm:w-3"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span>Remember me</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowForgotPasswordDialog(true)}
                      className="text-[9px] sm:text-[10px] md:text-xs text-green-600 hover:underline"
                      disabled={isLoading}
                      suppressHydrationWarning
                    >
                      Forgot?
                    </button>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white h-6 sm:h-7 md:h-8 text-[10px] sm:text-[11px] md:text-xs mt-1.5"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Login"}
                  </Button>


                </form>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Enter your full name"
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={selectedRole}
                      onValueChange={(value) => setSelectedRole(value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STUDENT">Student</SelectItem>
                        <SelectItem value="TEACHER">Teacher</SelectItem>
                        <SelectItem value="COMMITTEE_HEAD">Committee Head</SelectItem>
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="role" value={selectedRole} />
                  </div>
                  {requiresAccessPass && (
                    <div className="space-y-2">
                      <Label htmlFor="accessPass">Access Pass</Label>
                      <Input
                        id="accessPass"
                        name="accessPass"
                        type="text"
                        placeholder="Enter your access pass"
                        disabled={isLoading}
                        required={requiresAccessPass}
                      />
                    </div>
                  )}
                  {isStudent && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="rollNumber">Roll Number *</Label>
                          <Input
                            id="rollNumber"
                            name="rollNumber"
                            type="text"
                            placeholder="Enter your roll number"
                            disabled={isLoading}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="department">Department *</Label>
                          <Input
                            id="department"
                            name="department"
                            type="text"
                            placeholder="e.g., Computer Science"
                            disabled={isLoading}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="faculty">Faculty *</Label>
                          <Input
                            id="faculty"
                            name="faculty"
                            type="text"
                            placeholder="e.g., Engineering & Technology"
                            disabled={isLoading}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="session">Session *</Label>
                          <Input
                            id="session"
                            name="session"
                            type="text"
                            placeholder="e.g., 2020-2024"
                            disabled={isLoading}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contactInfo">Contact Number *</Label>
                          <Input
                            id="contactInfo"
                            name="contactInfo"
                            type="tel"
                            placeholder="e.g., +92-300-1234567"
                            disabled={isLoading}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cgpa">CGPA *</Label>
                          <Input
                            id="cgpa"
                            name="cgpa"
                            type="number"
                            step="0.01"
                            min="0"
                            max="4"
                            placeholder="Enter your CGPA (e.g., 3.50)"
                            disabled={isLoading}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Have you passed all prerequisite courses? *</Label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="prerequisitesPassed"
                              value="true"
                              disabled={isLoading}
                              required
                              className="w-4 h-4"
                            />
                            <span className="text-sm">Yes</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="prerequisitesPassed"
                              value="false"
                              disabled={isLoading}
                              required
                              className="w-4 h-4"
                            />
                            <span className="text-sm">No</span>
                          </label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="transcript">Upload Transcript (Optional)</Label>
                        <Input
                          id="transcript"
                          name="transcript"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          disabled={isLoading}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-gray-500">Accepted formats: PDF, JPG, PNG (Max 5MB)</p>
                      </div>
                    </>
                  )}
                  {(selectedRole === 'TEACHER' || selectedRole === 'COMMITTEE_HEAD') && (
                    <div className="space-y-2">
                      <Label htmlFor="teacher-department">Department *</Label>
                      <Input
                        id="teacher-department"
                        name="department"
                        type="text"
                        placeholder="e.g., Computer Science, Software Engineering"
                        disabled={isLoading}
                        required
                      />
                      <p className="text-xs text-gray-500">Enter your department name</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        name="password"
                        type="password"
                        placeholder="Enter your password"
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  {isStudent && (
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          id="policyAccepted"
                          name="policyAccepted"
                          required
                          disabled={isLoading}
                          className="w-4 h-4 mt-0.5 cursor-pointer"
                        />
                        <label htmlFor="policyAccepted" className="text-xs text-gray-700 cursor-pointer">
                          I have read and accept the{' '}
                          <button
                            type="button"
                            onClick={() => setShowPolicyDialog(true)}
                            className="text-green-600 hover:text-green-700 underline font-medium"
                          >
                            FYP Registration Policy
                          </button>
                          . I understand the eligibility criteria and commit to completing all requirements.
                        </label>
                      </div>
                    </div>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={isLoading || maintenanceMode || !allowRegistration}
                  >
                    {isLoading ? "Creating Account..." : maintenanceMode ? "System Under Maintenance" : !allowRegistration ? "Registration Disabled" : "Register"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>


      </div>

      {/* Maintenance Mode Popup */}
      {showMaintenancePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                System Under Maintenance
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                The portal is currently under maintenance. Please try again later.
              </p>
              <button
                onClick={() => setShowMaintenancePopup(false)}
                className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registration Disabled Popup */}
      {showRegistrationDisabledPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Registration Disabled
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                New user registration is currently disabled. Please contact the administrator.
              </p>
              <button
                onClick={() => setShowRegistrationDisabledPopup(false)}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Policy Dialog */}
      {showPolicyDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                FYP Registration Policy
              </h3>
              <div className="space-y-4 text-sm text-gray-700 max-h-96 overflow-y-auto">
                <div>
                  <h4 className="font-semibold text-green-700 mb-2">Eligibility Criteria:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Minimum CGPA of 2.5 required for automatic approval</li>
                    <li>All prerequisite courses must be completed</li>
                    <li>Students in final year of their program</li>
                    <li>Good academic standing with no pending disciplinary actions</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-green-700 mb-2">Conditional Registration:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Students with CGPA below 2.5 OR incomplete prerequisites may register conditionally</li>
                    <li>Conditional students must complete missing prerequisites in summer semester</li>
                    <li>Must maintain satisfactory progress throughout FYP duration</li>
                    <li>Subject to committee approval and monitoring</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-green-700 mb-2">Student Commitments:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Regular attendance and participation in FYP activities</li>
                    <li>Timely submission of all deliverables and reports</li>
                    <li>Professional conduct with supervisors and team members</li>
                    <li>Adherence to university academic integrity policies</li>
                    <li>Completion of all project milestones within specified timelines</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-green-700 mb-2">Important Notes:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Registration is subject to committee approval</li>
                    <li>False information may lead to registration cancellation</li>
                    <li>All documents must be authentic and verifiable</li>
                    <li>Students are responsible for keeping track of deadlines</li>
                  </ul>
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => setShowPolicyDialog(false)}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  I Understand
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conditional Registration Dialog */}
      {showConditionalDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Conditional Registration
                  </h3>
                  <p className="text-sm text-gray-600">Additional information required</p>
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    Based on your eligibility assessment, your registration is <span className="font-semibold">conditional</span>. 
                    This means you need to complete certain requirements before full approval.
                  </p>
                </div>

                {registrationResult && (
                  <div className="space-y-3">
                    {registrationResult.cgpa < 2.5 && (
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-red-500 mt-0.5">⚠</span>
                        <span>Your CGPA ({registrationResult.cgpa}) is below the minimum requirement of 2.5</span>
                      </div>
                    )}
                    {!registrationResult.prerequisitesPassed && (
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-red-500 mt-0.5">⚠</span>
                        <span>You have not completed all prerequisite courses</span>
                      </div>
                    )}
                  </div>
                )}

                <form id="conditionalForm" className="space-y-4">
                  {registrationResult && !registrationResult.prerequisitesPassed && (
                    <div className="space-y-2">
                      <Label htmlFor="unpassedCourses">List Unpassed Prerequisite Courses *</Label>
                      <textarea
                        id="unpassedCourses"
                        name="unpassedCourses"
                        rows={3}
                        placeholder="e.g., Database Systems, Software Engineering, Data Structures"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="conditionalCommitment">Commitment Statement *</Label>
                    <textarea
                      id="conditionalCommitment"
                      name="conditionalCommitment"
                      rows={4}
                      placeholder="I commit to completing all missing prerequisites in the summer semester and maintaining satisfactory academic progress..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Please write your commitment to complete requirements during the summer semester
                    </p>
                  </div>
                </form>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    const form = document.getElementById('conditionalForm') as HTMLFormElement
                    if (!form.checkValidity()) {
                      form.reportValidity()
                      return
                    }

                    const formData = new FormData(form)
                    const unpassedCourses = formData.get('unpassedCourses') as string
                    const conditionalCommitment = formData.get('conditionalCommitment') as string

                    try {
                      const response = await fetch('/api/auth/complete-conditional', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          userId: registrationResult.userId,
                          unpassedCourses,
                          conditionalCommitment
                        })
                      })

                      if (response.ok) {
                        setShowConditionalDialog(false)
                        showMessage("Registration completed! Your application is under review.", 'success')
                        setTimeout(() => {
                          const loginTab = document.querySelector('[value="login"]') as HTMLElement
                          loginTab?.click()
                        }, 2000)
                      } else {
                        showMessage("Failed to submit conditional information", 'error')
                      }
                    } catch (error) {
                      showMessage("Something went wrong. Please try again.", 'error')
                    }
                  }}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Submit & Complete Registration
                </button>
                <button
                  onClick={() => {
                    setShowConditionalDialog(false)
                    setRegistrationResult(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPasswordDialog} onOpenChange={(open) => {
        setShowForgotPasswordDialog(open)
        if (!open) {
          setForgotPasswordEmail('')
          setVerificationCode('')
          setNewPassword('')
          setConfirmPassword('')
          setResetPasswordStep('email')
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              {resetPasswordStep === 'email' 
                ? "Enter your email address and we'll send you a verification code."
                : "Enter the verification code sent to your email and your new password."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {resetPasswordStep === 'email' ? (
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email Address</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="Enter your email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  disabled={forgotPasswordLoading}
                  required
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="verification-code">Verification Code</Label>
                  <Input
                    id="verification-code"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    disabled={forgotPasswordLoading}
                    maxLength={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password (min 8 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={forgotPasswordLoading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={forgotPasswordLoading}
                    required
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            {resetPasswordStep === 'code' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetPasswordStep('email')}
                disabled={forgotPasswordLoading}
              >
                Back
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForgotPasswordDialog(false)
                setForgotPasswordEmail('')
                setVerificationCode('')
                setNewPassword('')
                setConfirmPassword('')
                setResetPasswordStep('email')
              }}
              disabled={forgotPasswordLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={resetPasswordStep === 'email' ? handleForgotPassword : handleResetPassword}
              disabled={forgotPasswordLoading || (resetPasswordStep === 'email' ? !forgotPasswordEmail : !verificationCode || !newPassword || !confirmPassword)}
              className="bg-green-600 hover:bg-green-700"
            >
              {forgotPasswordLoading ? 'Processing...' : (resetPasswordStep === 'email' ? 'Send Code' : 'Reset Password')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEmailVerificationDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowEmailVerificationDialog(false)
            setEmailVerificationCode('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Your Email</DialogTitle>
            <DialogDescription>
              We sent a 6-digit verification code to {pendingVerificationEmail}. Enter it below to continue registration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email-verification-code">Verification Code</Label>
              <Input
                id="email-verification-code"
                type="text"
                inputMode="numeric"
                placeholder="Enter 6-digit code"
                value={emailVerificationCode}
                onChange={(e) =>
                  setEmailVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                disabled={emailVerificationLoading || emailVerificationResending}
                maxLength={6}
                required
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResendRegistrationCode}
              disabled={emailVerificationLoading || emailVerificationResending}
            >
              {emailVerificationResending ? 'Resending...' : 'Resend code'}
            </Button>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowEmailVerificationDialog(false)
                setEmailVerificationCode('')
              }}
              disabled={emailVerificationLoading || emailVerificationResending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleVerifyRegistrationEmail}
              disabled={
                emailVerificationLoading ||
                emailVerificationResending ||
                emailVerificationCode.length !== 6
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {emailVerificationLoading ? 'Verifying...' : 'Verify & Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
