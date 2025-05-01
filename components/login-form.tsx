"use client"
import { useAuth } from "../contexts/auth-context"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldCheck, User } from "lucide-react"

export default function UserSwitcher() {
  const { switchUser } = useAuth()

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Generic Aadhaar ERP</CardTitle>
          <CardDescription className="text-center">Select a user role to continue</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            className="w-full h-16 text-lg flex items-center justify-center gap-3"
            onClick={() => switchUser("admin")}
          >
            <ShieldCheck className="h-6 w-6" />
            Login as Admin
          </Button>

          <Button
            className="w-full h-16 text-lg flex items-center justify-center gap-3"
            variant="outline"
            onClick={() => switchUser("pharmacist")}
          >
            <User className="h-6 w-6" />
            Login as Pharmacist
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col">
          <p className="text-xs text-center text-gray-500 mt-4">
            This is a simplified login for demonstration purposes
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
