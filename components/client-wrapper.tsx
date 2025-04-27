"use client"

import { useState, useEffect } from "react"
import GenericAadhaarERP from "../generic-aadhaar-erp"

export default function ClientWrapper() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    // Return a simple loading state or placeholder when rendering on the server
    return (
      <div className="p-4 bg-gradient-to-br from-sky-50 to-blue-100 min-h-screen text-gray-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">🧬 Generic Aadhaar - Pharmacy ERP</h1>
          <p className="text-lg">Loading application...</p>
        </div>
      </div>
    )
  }

  // Only render the actual component on the client
  return <GenericAadhaarERP />
}
