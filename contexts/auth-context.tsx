"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { toast } from "@/components/ui/use-toast"
import type { User } from "../types/erp-types"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (phone: string) => Promise<boolean>
  verifyOtp: (otp: string) => Promise<boolean>
  logout: () => void
  isAdmin: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock users for demo
const MOCK_USERS: User[] = [
  {
    id: "admin-1",
    name: "Admin User",
    email: "admin@genericaadhaar.com",
    phone: "9999999999",
    role: "admin",
  },
  {
    id: "pharmacist-1",
    name: "Pharmacist User",
    email: "pharmacist@genericaadhaar.com",
    phone: "8888888888",
    role: "pharmacist",
  },
  {
    id: "cashier-1",
    name: "Cashier User",
    email: "cashier@genericaadhaar.com",
    phone: "7777777777",
    role: "cashier",
  },
]

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingUser, setPendingUser] = useState<User | null>(null)

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("ga-user")
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error("Failed to parse stored user:", error)
      }
    }
    setIsLoading(false)
  }, [])

  // Save user to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem("ga-user", JSON.stringify(user))
    } else {
      localStorage.removeItem("ga-user")
    }
  }, [user])

  const login = async (phone: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      // In a real app, this would be an API call
      const foundUser = MOCK_USERS.find((u) => u.phone === phone)

      if (!foundUser) {
        toast({
          title: "User not found",
          description: "No user found with this phone number",
          variant: "destructive",
        })
        setIsLoading(false)
        return false
      }

      // Generate a 4-digit OTP
      const otp = Math.floor(1000 + Math.random() * 9000).toString()

      // Set OTP expiry to 5 minutes from now
      const otpExpiry = new Date(Date.now() + 5 * 60 * 1000)

      // In a real app, you would send the OTP via SMS
      console.log(`OTP for ${phone}: ${otp}`)

      // Store the pending user with OTP
      setPendingUser({
        ...foundUser,
        otp,
        otpExpiry,
      })

      toast({
        title: "OTP Sent",
        description: `An OTP has been sent to ${phone}. For demo, OTP is: ${otp}`,
      })

      setIsLoading(false)
      return true
    } catch (error) {
      console.error("Login error:", error)
      toast({
        title: "Login Failed",
        description: "An error occurred during login",
        variant: "destructive",
      })
      setIsLoading(false)
      return false
    }
  }

  const verifyOtp = async (otp: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      if (!pendingUser || !pendingUser.otp) {
        toast({
          title: "Error",
          description: "No pending verification found",
          variant: "destructive",
        })
        setIsLoading(false)
        return false
      }

      // Check if OTP is expired
      if (pendingUser.otpExpiry && new Date() > new Date(pendingUser.otpExpiry)) {
        toast({
          title: "OTP Expired",
          description: "The OTP has expired. Please request a new one",
          variant: "destructive",
        })
        setPendingUser(null)
        setIsLoading(false)
        return false
      }

      // Verify OTP
      if (pendingUser.otp !== otp) {
        toast({
          title: "Invalid OTP",
          description: "The OTP you entered is incorrect",
          variant: "destructive",
        })
        setIsLoading(false)
        return false
      }

      // OTP is valid, set the user
      const { otp: _, otpExpiry: __, ...userWithoutOtp } = pendingUser
      setUser(userWithoutOtp)
      setPendingUser(null)

      toast({
        title: "Login Successful",
        description: `Welcome, ${userWithoutOtp.name}!`,
      })

      setIsLoading(false)
      return true
    } catch (error) {
      console.error("OTP verification error:", error)
      toast({
        title: "Verification Failed",
        description: "An error occurred during OTP verification",
        variant: "destructive",
      })
      setIsLoading(false)
      return false
    }
  }

  const logout = () => {
    setUser(null)
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    })
  }

  const isAdmin = () => {
    return user?.role === "admin"
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        verifyOtp,
        logout,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
