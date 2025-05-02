"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

// Define the User type
type User = {
  id: string
  name: string
  role: string
  email?: string
}

// Define the AuthContext type
type AuthContextType = {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isAdmin: () => boolean
  switchUser: (role: string) => void
}

// Create the AuthContext
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Create the AuthProvider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user data exists in localStorage
        const userData = localStorage.getItem("ga-user")

        if (userData) {
          setUser(JSON.parse(userData))
        } else {
          // For demo purposes, auto-login with a demo user
          const demoUser = {
            id: "demo-user-1",
            name: "Demo User",
            role: "admin",
            email: "demo@example.com",
          }

          localStorage.setItem("ga-user", JSON.stringify(demoUser))
          setUser(demoUser)
        }
      } catch (error) {
        console.error("Auth check failed:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true)

      // In a real app, you would validate credentials with a backend
      // For demo purposes, we'll accept any credentials
      const user = {
        id: `user-${Math.random().toString(36).substring(2, 9)}`,
        name: email.split("@")[0],
        role: email.includes("admin") ? "admin" : "pharmacist",
        email,
      }

      localStorage.setItem("ga-user", JSON.stringify(user))
      setUser(user)

      return true
    } catch (error) {
      console.error("Login failed:", error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Logout function
  const logout = () => {
    localStorage.removeItem("ga-user")
    setUser(null)
  }

  // Check if user is admin
  const isAdmin = () => {
    return user?.role === "admin"
  }

  // Switch user role (for demo purposes)
  const switchUser = (role: string) => {
    if (!user) return

    const updatedUser = {
      ...user,
      role,
    }

    localStorage.setItem("ga-user", JSON.stringify(updatedUser))
    setUser(updatedUser)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAdmin, switchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// Create a hook to use the AuthContext
export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}
