"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Edit, FileDown, Plus, Search, Trash2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useInventorySync } from "../hooks/use-supabase-sync"
import { useAuth } from "../contexts/auth-context"
import { toast } from "@/components/ui/use-toast"
import type { InventoryItem } from "../types/erp-types"

export default function InventoryManagement() {
  // Use the Supabase sync hook
  const [inventory, setInventory, syncInfo] = useInventorySync([])
  const { isAdmin } = useAuth()

  const [searchTerm, setSearchTerm] = useState("")
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isManualInwardOpen, setIsManualInwardOpen] = useState(false)
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    name: "",
    batch: "",
    expiry: "",
    stock: 0,
    purchasePrice: 0,
    price: 0,
    gstRate: 5,
  })
  const [manualInwardItem, setManualInwardItem] = useState<Partial<InventoryItem>>({
    name: "",
    batch: "",
    expiry: "",
    stock: 0,
    purchasePrice: 0,
    price: 0,
    gstRate: 5,
  })
  const [activeTab, setActiveTab] = useState("all")
  const [lowStockThreshold, setLowStockThreshold] = useState(10)
  const [expiryThreshold, setExpiryThreshold] = useState(30) // days

  // Filter inventory based on search term and active tab
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.batch.toLowerCase().includes(searchTerm.toLowerCase())

    if (activeTab === "all") return matchesSearch
    if (activeTab === "low-stock") return matchesSearch && item.stock <= lowStockThreshold
    if (activeTab === "expiring-soon") {
      const expiryDate = new Date(item.expiry)
      const today = new Date()
      const diffTime = expiryDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return matchesSearch && diffDays <= expiryThreshold && diffDays > 0
    }
    if (activeTab === "expired") {
      const expiryDate = new Date(item.expiry)
      const today = new Date()
      return matchesSearch && expiryDate < today
    }
    return matchesSearch
  })

  // Add new item
  const handleAddItem = () => {
    const id = `item_${Date.now()}`
    const itemToAdd: InventoryItem = {
      id,
      name: newItem.name || "",
      batch: newItem.batch || "",
      expiry: newItem.expiry || "",
      stock: newItem.stock || 0,
      purchasePrice: newItem.purchasePrice || 0,
      price: newItem.price || 0,
      gstRate: newItem.gstRate || 5,
    }

    setInventory([...inventory, itemToAdd])
    setIsAddDialogOpen(false)
    setNewItem({
      name: "",
      batch: "",
      expiry: "",
      stock: 0,
      purchasePrice: 0,
      price: 0,
      gstRate: 5,
    })

    toast({
      title: "Success",
      description: "Item added successfully",
    })
  }

  // Handle manual inward
  const handleManualInward = () => {
    // Check if item with same name and batch exists
    const existingItemIndex = inventory.findIndex(
      (item) =>
        item.name.toLowerCase() === manualInwardItem.name?.toLowerCase() && item.batch === manualInwardItem.batch,
    )

    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedInventory = [...inventory]
      updatedInventory[existingItemIndex] = {
        ...updatedInventory[existingItemIndex],
        stock: updatedInventory[existingItemIndex].stock + (manualInwardItem.stock || 0),
        // Update other properties if needed
        purchasePrice: manualInwardItem.purchasePrice || updatedInventory[existingItemIndex].purchasePrice,
        price: manualInwardItem.price || updatedInventory[existingItemIndex].price,
        expiry: manualInwardItem.expiry || updatedInventory[existingItemIndex].expiry,
      }

      setInventory(updatedInventory)
    } else {
      // Add as new item
      const id = `item_${Date.now()}`
      const itemToAdd: InventoryItem = {
        id,
        name: manualInwardItem.name || "",
        batch: manualInwardItem.batch || "",
        expiry: manualInwardItem.expiry || "",
        stock: manualInwardItem.stock || 0,
        purchasePrice: manualInwardItem.purchasePrice || 0,
        price: manualInwardItem.price || 0,
        gstRate: manualInwardItem.gstRate || 5,
      }

      setInventory([...inventory, itemToAdd])
    }

    setIsManualInwardOpen(false)
    setManualInwardItem({
      name: "",
      batch: "",
      expiry: "",
      stock: 0,
      purchasePrice: 0,
      price: 0,
      gstRate: 5,
    })

    toast({
      title: "Success",
      description: "Stock updated successfully",
      className: "bg-green-50 border-green-200",
    })
  }

  // Update existing item
  const handleUpdateItem = () => {
    if (!editItem) return

    const updatedInventory = inventory.map((item) => (item.id === editItem.id ? editItem : item))

    setInventory(updatedInventory)
    setIsEditDialogOpen(false)
    setEditItem(null)

    toast({
      title: "Success",
      description: "Item updated successfully",
    })
  }

  // Delete item
  const handleDeleteItem = () => {
    if (!editItem) return

    const updatedInventory = inventory.filter((item) => item.id !== editItem.id)
    setInventory(updatedInventory)
    setIsDeleteDialogOpen(false)
    setEditItem(null)

    toast({
      title: "Success",
      description: "Item deleted successfully",
      variant: "destructive",
    })
  }

  // Export inventory as CSV
  const handleExportCSV = () => {
    const headers = ["Name", "Batch", "Expiry", "Stock", "Purchase Price", "Price", "GST Rate"]
    const csvData = [
      headers.join(","),
      ...filteredInventory.map((item) =>
        [
          `"${item.name}"`,
          `"${item.batch}"`,
          `"${item.expiry}"`,
          item.stock,
          item.purchasePrice,
          item.price,
          item.gstRate,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `inventory_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Export Complete",
      description: "Inventory data exported to CSV",
    })
  }

  // Get status badge for item
  const getItemStatusBadge = (item: InventoryItem) => {
    // Check if expired
    const expiryDate = new Date(item.expiry)
    const today = new Date()

    if (expiryDate < today) {
      return <Badge variant="destructive">Expired</Badge>
    }

    // Check if expiring soon
    const diffTime = expiryDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= expiryThreshold) {
      return (
        <Badge variant="warning" className="bg-amber-500">
          Expiring Soon
        </Badge>
      )
    }

    // Check if low stock
    if (item.stock <= lowStockThreshold) {
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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <FileDown className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Dialog open={isManualInwardOpen} onOpenChange={setIsManualInwardOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary">
                  <Plus className="h-4 w-4 mr-2" />
                  Manual Inward
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manual Stock Inward</DialogTitle>
                  <DialogDescription>Add stock manually if the inward process fails.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="inward-name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="inward-name"
                      value={manualInwardItem.name}
                      onChange={(e) => setManualInwardItem({ ...manualInwardItem, name: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="inward-batch" className="text-right">
                      Batch
                    </Label>
                    <Input
                      id="inward-batch"
                      value={manualInwardItem.batch}
                      onChange={(e) => setManualInwardItem({ ...manualInwardItem, batch: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="inward-expiry" className="text-right">
                      Expiry
                    </Label>
                    <Input
                      id="inward-expiry"
                      type="date"
                      value={manualInwardItem.expiry}
                      onChange={(e) => setManualInwardItem({ ...manualInwardItem, expiry: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="inward-stock" className="text-right">
                      Stock to Add
                    </Label>
                    <Input
                      id="inward-stock"
                      type="number"
                      value={manualInwardItem.stock}
                      onChange={(e) => setManualInwardItem({ ...manualInwardItem, stock: Number(e.target.value) })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="inward-purchasePrice" className="text-right">
                      Purchase Price
                    </Label>
                    <Input
                      id="inward-purchasePrice"
                      type="number"
                      step="0.01"
                      value={manualInwardItem.purchasePrice}
                      onChange={(e) =>
                        setManualInwardItem({ ...manualInwardItem, purchasePrice: Number(e.target.value) })
                      }
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="inward-price" className="text-right">
                      Selling Price
                    </Label>
                    <Input
                      id="inward-price"
                      type="number"
                      step="0.01"
                      value={manualInwardItem.price}
                      onChange={(e) => setManualInwardItem({ ...manualInwardItem, price: Number(e.target.value) })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="inward-gstRate" className="text-right">
                      GST Rate (%)
                    </Label>
                    <Input
                      id="inward-gstRate"
                      type="number"
                      step="0.01"
                      value={manualInwardItem.gstRate}
                      onChange={(e) => setManualInwardItem({ ...manualInwardItem, gstRate: Number(e.target.value) })}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleManualInward} className="bg-green-600 hover:bg-green-700">
                    Add Stock
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Inventory Item</DialogTitle>
                  <DialogDescription>Enter the details of the new inventory item below.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="batch" className="text-right">
                      Batch
                    </Label>
                    <Input
                      id="batch"
                      value={newItem.batch}
                      onChange={(e) => setNewItem({ ...newItem, batch: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="expiry" className="text-right">
                      Expiry
                    </Label>
                    <Input
                      id="expiry"
                      type="date"
                      value={newItem.expiry}
                      onChange={(e) => setNewItem({ ...newItem, expiry: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="stock" className="text-right">
                      Stock
                    </Label>
                    <Input
                      id="stock"
                      type="number"
                      value={newItem.stock}
                      onChange={(e) => setNewItem({ ...newItem, stock: Number(e.target.value) })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="purchasePrice" className="text-right">
                      Purchase Price
                    </Label>
                    <Input
                      id="purchasePrice"
                      type="number"
                      step="0.01"
                      value={newItem.purchasePrice}
                      onChange={(e) => setNewItem({ ...newItem, purchasePrice: Number(e.target.value) })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="price" className="text-right">
                      Selling Price
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={newItem.price}
                      onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="gstRate" className="text-right">
                      GST Rate (%)
                    </Label>
                    <Input
                      id="gstRate"
                      type="number"
                      step="0.01"
                      value={newItem.gstRate}
                      onChange={(e) => setNewItem({ ...newItem, gstRate: Number(e.target.value) })}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleAddItem}>
                    Add Item
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">All Items</TabsTrigger>
              <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
              <TabsTrigger value="expiring-soon">Expiring Soon</TabsTrigger>
              <TabsTrigger value="expired">Expired</TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredInventory.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No items found</AlertTitle>
              <AlertDescription>
                {searchTerm
                  ? "No items match your search criteria."
                  : "No inventory items available. Add some items to get started."}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Purchase Price</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead>
                    <TableHead className="text-right">GST Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((item) => (
                    <TableRow key={item.id} className="transition-colors hover:bg-gray-50">
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.batch}</TableCell>
                      <TableCell>{item.expiry}</TableCell>
                      <TableCell className="text-right">{item.stock}</TableCell>
                      <TableCell className="text-right">₹{item.purchasePrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{item.gstRate}%</TableCell>
                      <TableCell>{getItemStatusBadge(item)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditItem(item)
                              setIsEditDialogOpen(true)
                            }}
                            className="hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4 text-blue-500" />
                          </Button>
                          {isAdmin() && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditItem(item)
                                setIsDeleteDialogOpen(true)
                              }}
                              className="hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogDescription>Update the details of the selected inventory item.</DialogDescription>
          </DialogHeader>
          {editItem && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={editItem.name}
                  onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-batch" className="text-right">
                  Batch
                </Label>
                <Input
                  id="edit-batch"
                  value={editItem.batch}
                  onChange={(e) => setEditItem({ ...editItem, batch: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-expiry" className="text-right">
                  Expiry
                </Label>
                <Input
                  id="edit-expiry"
                  type="date"
                  value={editItem.expiry}
                  onChange={(e) => setEditItem({ ...editItem, expiry: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-stock" className="text-right">
                  Stock
                </Label>
                <Input
                  id="edit-stock"
                  type="number"
                  value={editItem.stock}
                  onChange={(e) => setEditItem({ ...editItem, stock: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-purchasePrice" className="text-right">
                  Purchase Price
                </Label>
                <Input
                  id="edit-purchasePrice"
                  type="number"
                  step="0.01"
                  value={editItem.purchasePrice}
                  onChange={(e) => setEditItem({ ...editItem, purchasePrice: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-price" className="text-right">
                  Selling Price
                </Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={editItem.price}
                  onChange={(e) => setEditItem({ ...editItem, price: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-gstRate" className="text-right">
                  GST Rate (%)
                </Label>
                <Input
                  id="edit-gstRate"
                  type="number"
                  step="0.01"
                  value={editItem.gstRate}
                  onChange={(e) => setEditItem({ ...editItem, gstRate: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" onClick={handleUpdateItem}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this inventory item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {editItem && (
            <div className="py-4">
              <p className="font-medium">{editItem.name}</p>
              <p className="text-sm text-muted-foreground">Batch: {editItem.batch}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
