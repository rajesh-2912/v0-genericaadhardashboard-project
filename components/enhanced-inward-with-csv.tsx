"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UploadIcon, CheckCircleIcon, AlertCircleIcon } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import ImprovedCSVInward from "./improved-csv-inward"
import { useLocalStorage } from "../hooks/use-local-storage"
import type { InwardEntry, InwardItem, InventoryItem } from "../types/erp-types"

export default function EnhancedInwardWithCSV() {
  // Local storage hooks
  const [inventory, setInventory] = useLocalStorage<InventoryItem[]>("inventory", [])
  const [inwardEntries, setInwardEntries] = useLocalStorage<InwardEntry[]>("inwardEntries", [])

  // Form state
  const [supplier, setSupplier] = useState("")
  const [invoiceNo, setInvoiceNo] = useState("")
  const [paymentStatus, setPaymentStatus] = useState("Pending")
  const [inwardItems, setInwardItems] = useState<InwardItem[]>([])
  const [currentItem, setCurrentItem] = useState<InwardItem>({
    name: "",
    batch: "",
    expiry: "",
    quantity: 0,
    purchasePrice: 0,
    price: 0,
    gstRate: 0,
  })

  // Status messages
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  // Reset success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage("")
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Handle adding a single item to the inward list
  const handleAddItem = () => {
    // Validate item
    if (!currentItem.name || !currentItem.batch || !currentItem.expiry) {
      setErrorMessage("Please fill in all required fields")
      return
    }

    if (currentItem.quantity <= 0 || currentItem.purchasePrice <= 0 || currentItem.price <= 0) {
      setErrorMessage("Quantity and prices must be greater than zero")
      return
    }

    // Add item to list
    setInwardItems([...inwardItems, { ...currentItem }])

    // Reset current item
    setCurrentItem({
      name: "",
      batch: "",
      expiry: "",
      quantity: 0,
      purchasePrice: 0,
      price: 0,
      gstRate: 0,
    })

    setErrorMessage("")
  }

  // Handle removing an item from the inward list
  const handleRemoveItem = (index: number) => {
    const updatedItems = [...inwardItems]
    updatedItems.splice(index, 1)
    setInwardItems(updatedItems)
  }

  // Handle saving the inward entry
  const handleSaveInward = () => {
    // Validate form
    if (!supplier || !invoiceNo || inwardItems.length === 0) {
      setErrorMessage("Please fill in all required fields and add at least one item")
      return
    }

    try {
      // Calculate total value
      const totalValue = inwardItems.reduce(
        (sum, item) => sum + item.quantity * item.purchasePrice * (1 + item.gstRate / 100),
        0,
      )

      // Create inward entry
      const newInwardEntry: InwardEntry = {
        id: uuidv4(),
        date: new Date().toISOString().split("T")[0],
        invoiceNo,
        supplier,
        paymentStatus,
        items: inwardItems,
        totalValue,
      }

      // Update inventory
      const updatedInventory = [...inventory]

      inwardItems.forEach((item) => {
        // Check if item already exists in inventory
        const existingItemIndex = updatedInventory.findIndex(
          (invItem) => invItem.name === item.name && invItem.batch === item.batch,
        )

        if (existingItemIndex >= 0) {
          // Update existing item
          updatedInventory[existingItemIndex] = {
            ...updatedInventory[existingItemIndex],
            stock: updatedInventory[existingItemIndex].stock + item.quantity,
            purchasePrice: item.purchasePrice,
            price: item.price,
            gstRate: item.gstRate,
          }
        } else {
          // Add new item
          updatedInventory.push({
            id: uuidv4(),
            name: item.name,
            batch: item.batch,
            expiry: item.expiry,
            stock: item.quantity,
            purchasePrice: item.purchasePrice,
            price: item.price,
            gstRate: item.gstRate,
          })
        }
      })

      // Save to local storage
      setInventory(updatedInventory)
      setInwardEntries([newInwardEntry, ...inwardEntries])

      // Reset form
      setSupplier("")
      setInvoiceNo("")
      setPaymentStatus("Pending")
      setInwardItems([])

      setSuccessMessage("Inward entry saved successfully!")
    } catch (error) {
      console.error("Error saving inward entry:", error)
      setErrorMessage("Failed to save inward entry. Please try again.")
    }
  }

  // Handle adding items to inventory from CSV
  const handleAddToInventory = (newItems: InventoryItem[]) => {
    try {
      // Update inventory
      const updatedInventory = [...inventory]

      newItems.forEach((newItem) => {
        // Check if item already exists in inventory
        const existingItemIndex = updatedInventory.findIndex(
          (invItem) => invItem.name === newItem.name && invItem.batch === newItem.batch,
        )

        if (existingItemIndex >= 0) {
          // Update existing item
          updatedInventory[existingItemIndex] = {
            ...updatedInventory[existingItemIndex],
            stock: newItem.stock,
            purchasePrice: newItem.purchasePrice,
            price: newItem.price,
            gstRate: newItem.gstRate,
          }
        } else {
          // Add new item
          updatedInventory.push(newItem)
        }
      })

      // Save to local storage
      setInventory(updatedInventory)
      setSuccessMessage(`${newItems.length} items added to inventory successfully!`)
    } catch (error) {
      console.error("Error adding items to inventory:", error)
      setErrorMessage("Failed to add items to inventory. Please try again.")
    }
  }

  // Handle saving inward entry from CSV
  const handleSaveInwardEntry = (entry: InwardEntry) => {
    try {
      // Save to local storage
      setInwardEntries([entry, ...inwardEntries])
      setSuccessMessage("Inward entry saved successfully!")
    } catch (error) {
      console.error("Error saving inward entry:", error)
      setErrorMessage("Failed to save inward entry. Please try again.")
    }
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="csv">
        <TabsList className="mb-4">
          <TabsTrigger value="csv">CSV Import</TabsTrigger>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="history">Inward History</TabsTrigger>
        </TabsList>

        <TabsContent value="csv">
          <ImprovedCSVInward
            onAddToInventory={handleAddToInventory}
            onSaveInwardEntry={handleSaveInwardEntry}
            existingInventory={inventory}
          />

          {successMessage && (
            <Alert className="mt-4 bg-green-50 text-green-800 border-green-200">
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-800">Manual Inward Entry</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col space-y-2">
                    <label htmlFor="supplier" className="text-sm font-medium">
                      Supplier Name
                    </label>
                    <Input
                      id="supplier"
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      placeholder="Enter supplier name"
                    />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <label htmlFor="invoice-no" className="text-sm font-medium">
                      Invoice Number
                    </label>
                    <Input
                      id="invoice-no"
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      placeholder="Enter invoice number"
                    />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <label htmlFor="payment-status" className="text-sm font-medium">
                      Payment Status
                    </label>
                    <select
                      id="payment-status"
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="w-full rounded-md border border-gray-300 p-2"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Partial">Partial</option>
                    </select>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-2">Add Items</h3>
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                    <Input
                      placeholder="Product Name"
                      value={currentItem.name}
                      onChange={(e) => setCurrentItem({ ...currentItem, name: e.target.value })}
                    />
                    <Input
                      placeholder="Batch"
                      value={currentItem.batch}
                      onChange={(e) => setCurrentItem({ ...currentItem, batch: e.target.value })}
                    />
                    <Input
                      type="date"
                      placeholder="Expiry"
                      value={currentItem.expiry}
                      onChange={(e) => setCurrentItem({ ...currentItem, expiry: e.target.value })}
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={currentItem.quantity || ""}
                      onChange={(e) =>
                        setCurrentItem({ ...currentItem, quantity: Number.parseInt(e.target.value) || 0 })
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Purchase Price"
                      value={currentItem.purchasePrice || ""}
                      onChange={(e) =>
                        setCurrentItem({ ...currentItem, purchasePrice: Number.parseFloat(e.target.value) || 0 })
                      }
                    />
                    <Input
                      type="number"
                      placeholder="MRP"
                      value={currentItem.price || ""}
                      onChange={(e) =>
                        setCurrentItem({ ...currentItem, price: Number.parseFloat(e.target.value) || 0 })
                      }
                    />
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="GST %"
                        value={currentItem.gstRate || ""}
                        onChange={(e) =>
                          setCurrentItem({ ...currentItem, gstRate: Number.parseFloat(e.target.value) || 0 })
                        }
                      />
                      <Button onClick={handleAddItem} className="bg-emerald-600 hover:bg-emerald-700">
                        +
                      </Button>
                    </div>
                  </div>
                </div>

                {inwardItems.length > 0 && (
                  <div className="border rounded-md overflow-auto max-h-96 mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product Name</TableHead>
                          <TableHead>Batch</TableHead>
                          <TableHead>Expiry</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Purchase Price</TableHead>
                          <TableHead>MRP</TableHead>
                          <TableHead>GST %</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inwardItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.batch}</TableCell>
                            <TableCell>{item.expiry}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>₹{item.purchasePrice.toFixed(2)}</TableCell>
                            <TableCell>₹{item.price.toFixed(2)}</TableCell>
                            <TableCell>{item.gstRate}%</TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRemoveItem(index)}
                                className="h-7 px-2"
                              >
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="pt-4">
                  <Button
                    onClick={handleSaveInward}
                    disabled={!supplier || !invoiceNo || inwardItems.length === 0}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    <UploadIcon className="mr-2 h-4 w-4" />
                    Save Inward Entry
                  </Button>
                </div>

                {errorMessage && (
                  <Alert variant="destructive">
                    <AlertCircleIcon className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}

                {successMessage && (
                  <Alert className="bg-green-50 text-green-800 border-green-200">
                    <CheckCircleIcon className="h-4 w-4 text-green-600" />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>{successMessage}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-800">Inward History</CardTitle>
            </CardHeader>
            <CardContent>
              {inwardEntries.length > 0 ? (
                <div className="border rounded-md overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Invoice No</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total Value</TableHead>
                        <TableHead>Payment Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inwardEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{entry.date}</TableCell>
                          <TableCell>{entry.invoiceNo}</TableCell>
                          <TableCell>{entry.supplier}</TableCell>
                          <TableCell>{entry.items.length} items</TableCell>
                          <TableCell>₹{entry.totalValue.toFixed(2)}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                entry.paymentStatus === "Paid"
                                  ? "bg-green-100 text-green-800"
                                  : entry.paymentStatus === "Partial"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                              }`}
                            >
                              {entry.paymentStatus}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No inward entries found.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
