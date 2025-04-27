"use client"

import { Suspense, lazy } from "react"
import { Toaster } from "@/components/ui/toaster"

// Use React's lazy loading instead of Next.js dynamic
const GenericAadhaarERP = lazy(() => import("../generic-aadhaar-erp"))

export default function ClientWrapper() {
  return (
    <>
      <Suspense fallback={<div>Loading...</div>}>
        <GenericAadhaarERP />
      </Suspense>
      <Toaster />
    </>
  )
}
