"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { toast } from "@/components/ui/use-toast"
import type { User } from "../types/erp-types"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  switchUser: (role: "admin" | "pharmacist") => void
  logout: () => void
  isAdmin: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Predefined users
const USERS: Record<string, User> = {
  admin: {
    id: "admin-1",
    name: "Admin User",
    email: "admin@genericaadhaar.com",
    phone: "9999999999",
    role: "admin",
  },
  pharmacist: {
    id: "pharmacist-1",
    name: "Pharmacist User",
    email: "pharmacist@genericaadhaar.com",
    phone: "8888888888",
    role: "pharmacist",
  },
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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

  const switchUser = (role: "admin" | "pharmacist") => {
    const selectedUser = USERS[role]
    setUser(selectedUser)

    toast({
      title: "User Switched",
      description: `Now logged in as ${selectedUser.name}`,
    })
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
        switchUser,
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
