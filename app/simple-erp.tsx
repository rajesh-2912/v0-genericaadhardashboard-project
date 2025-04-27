"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export default function SimpleERP() {
  const date = new Date().toLocaleString()

  return (
    <div className="p-4 bg-gradient-to-br from-sky-50 to-blue-100 min-h-screen text-gray-800">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">🧬 Generic Aadhaar - Pharmacy ERP</h1>
        <span className="text-sm text-gray-600">{date}</span>
      </header>

      <Tabs defaultValue="home" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="home">🏠 Home</TabsTrigger>
          <TabsTrigger value="billing">🧾 Billing</TabsTrigger>
          <TabsTrigger value="inventory">📦 Inventory</TabsTrigger>
          <TabsTrigger value="inward">📤 Inward</TabsTrigger>
          <TabsTrigger value="reports">📊 Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="home">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">Today's Sales: ₹12,350</CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">Low Stock Alerts: 8 Items</CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">Invoices Generated: 23</CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
