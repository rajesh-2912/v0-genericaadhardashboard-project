"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "../contexts/auth-context"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

export default function LoginForm() {
  const { login, verifyOtp, isLoading } = useAuth()
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [showOtpInput, setShowOtpInput] = useState(false)

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (phone.length < 10) return

    const success = await login(phone)
    if (success) {
      setShowOtpInput(true)
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length < 4) return

    await verifyOtp(otp)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Generic Aadhaar ERP</CardTitle>
          <CardDescription className="text-center">
            {showOtpInput ? "Enter the OTP sent to your phone" : "Login with your phone number"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showOtpInput ? (
            <form onSubmit={handlePhoneSubmit}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={isLoading || phone.length < 10}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    "Send OTP"
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="otp">OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter the 4-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={isLoading || otp.length < 4}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify OTP"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowOtpInput(false)} disabled={isLoading}>
                  Back
                </Button>
              </div>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col">
          <p className="text-xs text-center text-gray-500 mt-4">
            For demo purposes: Admin: 9999999999, Pharmacist: 8888888888, Cashier: 7777777777
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
