"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, FileDown } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import Papa from "papaparse"
import type { InventoryItem } from "../types/erp-types"

interface SimplifiedInventoryProps {
  inventory: InventoryItem[]
}

export default function SimplifiedInventory({ inventory }: SimplifiedInventoryProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "low" | "expiring" | "expired">("all")

  // Filter inventory based on search term and active filter
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.batch.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    const today = new Date()
    const expiryDate = new Date(item.expiry)
    const diffTime = expiryDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    switch (activeFilter) {
      case "low":
        return item.stock <= 10
      case "expiring":
        return diffDays > 0 && diffDays <= 30
      case "expired":
        return diffDays <= 0
      default:
        return true
    }
  })

  // Export inventory as CSV
  const exportInventory = () => {
    try {
      const data = filteredInventory.map((item) => ({
        Name: item.name,
        Batch: item.batch,
        Stock: item.stock,
        Expiry: item.expiry,
        "Purchase Price": item.purchasePrice.toFixed(2),
        "Selling Price": item.price.toFixed(2),
        "GST Rate": `${item.gstRate}%`,
        Value: (item.stock * item.price).toFixed(2),
      }))

      const csv = Papa.unparse(data)
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `inventory-${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Success",
        description: "Inventory exported successfully",
      })
    } catch (error) {
      console.error("Error exporting inventory:", error)
      toast({
        title: "Error",
        description: "Failed to export inventory",
        variant: "destructive",
      })
    }
  }

  // Get status badge for item
  const getStatusBadge = (item: InventoryItem) => {
    const today = new Date()
    const expiryDate = new Date(item.expiry)
    const diffTime = expiryDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
      return <Badge variant="destructive">Expired</Badge>
    }

    if (diffDays <= 30) {
      return <Badge className="bg-amber-500">Expiring Soon</Badge>
    }

    if (item.stock <= 10) {
      return (
        <Badge variant="outline" className="border-red-500 text-red-500">
          Low Stock
        </Badge>
      )
    }

    return null
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-bold">Inventory Management</CardTitle>
          <Button variant="outline" size="sm" onClick={exportInventory}>
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={activeFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter("all")}
              >
                All
              </Button>
              <Button
                variant={activeFilter === "low" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter("low")}
              >
                Low Stock
              </Button>
              <Button
                variant={activeFilter === "expiring" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter("expiring")}
              >
                Expiring Soon
              </Button>
              <Button
                variant={activeFilter === "expired" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter("expired")}
              >
                Expired
              </Button>
            </div>
          </div>

          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                      No items found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.batch}</TableCell>
                      <TableCell>{item.expiry}</TableCell>
                      <TableCell className="text-right">{item.stock}</TableCell>
                      <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">₹{(item.stock * item.price).toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(item)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-md bg-blue-50">
              <div className="text-lg font-semibold">Total Items</div>
              <div className="text-2xl font-bold">{inventory.length}</div>
            </div>
            <div className="p-4 border rounded-md bg-red-50">
              <div className="text-lg font-semibold">Low Stock Items</div>
              <div className="text-2xl font-bold">{inventory.filter((item) => item.stock <= 10).length}</div>
            </div>
            <div className="p-4 border rounded-md bg-amber-50">
              <div className="text-lg font-semibold">Expiring Soon</div>
              <div className="text-2xl font-bold">
                {
                  inventory.filter((item) => {
                    const today = new Date()
                    const expiryDate = new Date(item.expiry)
                    const diffTime = expiryDate.getTime() - today.getTime()
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                    return diffDays > 0 && diffDays <= 30
                  }).length
                }
              </div>
            </div>
            <div className="p-4 border rounded-md bg-green-50">
              <div className="text-lg font-semibold">Total Value</div>
              <div className="text-2xl font-bold">
                ₹{inventory.reduce((sum, item) => sum + item.stock * item.price, 0).toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
