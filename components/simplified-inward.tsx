"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { v4 as uuidv4 } from "uuid"
import { Trash2, Plus, Save } from "lucide-react"
import type { InventoryItem, InwardItem, InwardEntry } from "../types/erp-types"

interface SimplifiedInwardProps {
  onSave: (entry: InwardEntry, newItems: InventoryItem[]) => void
}

export default function SimplifiedInward({ onSave }: SimplifiedInwardProps) {
  const [supplier, setSupplier] = useState("")
  const [invoiceNo, setInvoiceNo] = useState("")
  const [paymentStatus, setPaymentStatus] = useState("Paid")

  const [inwardItems, setInwardItems] = useState<InwardItem[]>([])
  const [itemName, setItemName] = useState("")
  const [batch, setBatch] = useState("")
  const [expiry, setExpiry] = useState("")
  const [quantity, setQuantity] = useState<number>(0)
  const [purchasePrice, setPurchasePrice] = useState<number>(0)
  const [sellingPrice, setSellingPrice] = useState<number>(0)
  const [gstRate, setGstRate] = useState<number>(5)

  // Add item to inward list
  const addItem = () => {
    if (!itemName || !batch || !expiry || quantity <= 0 || purchasePrice <= 0 || sellingPrice <= 0) {
      toast({
        title: "Error",
        description: "Please fill all item details correctly",
        variant: "destructive",
      })
      return
    }

    const newItem: InwardItem = {
      name: itemName,
      batch: batch,
      expiry: expiry,
      quantity: quantity,
      purchasePrice: purchasePrice,
      price: sellingPrice,
      gstRate: gstRate,
    }

    setInwardItems([...inwardItems, newItem])

    // Reset form
    setItemName("")
    setBatch("")
    setExpiry("")
    setQuantity(0)
    setPurchasePrice(0)
    setSellingPrice(0)
    setGstRate(5)
  }

  // Remove item from inward list
  const removeItem = (index: number) => {
    setInwardItems(inwardItems.filter((_, i) => i !== index))
  }

  // Calculate total value
  const calculateTotal = () => {
    return inwardItems.reduce((sum, item) => sum + item.purchasePrice * item.quantity, 0)
  }

  // Save inward entry
  const saveInward = () => {
    if (inwardItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item",
        variant: "destructive",
      })
      return
    }

    if (!supplier || !invoiceNo) {
      toast({
        title: "Error",
        description: "Please enter supplier name and invoice number",
        variant: "destructive",
      })
      return
    }

    // Create inward entry
    const entry: InwardEntry = {
      id: uuidv4(),
      date: new Date().toISOString().split("T")[0],
      invoiceNo,
      supplier,
      paymentStatus,
      items: inwardItems,
      totalValue: calculateTotal(),
    }

    // Convert inward items to inventory items
    const newInventoryItems: InventoryItem[] = inwardItems.map((item) => ({
      id: uuidv4(),
      name: item.name,
      batch: item.batch,
      expiry: item.expiry,
      stock: item.quantity,
      purchasePrice: item.purchasePrice,
      price: item.price,
      gstRate: item.gstRate,
    }))

    // Save entry and update inventory
    onSave(entry, newInventoryItems)

    // Reset form
    setSupplier("")
    setInvoiceNo("")
    setPaymentStatus("Paid")
    setInwardItems([])

    toast({
      title: "Success",
      description: "Inward entry saved successfully",
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Inward Entry Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier Name*</Label>
              <Input
                id="supplier"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Enter supplier name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceNo">Invoice Number*</Label>
              <Input
                id="invoiceNo"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="Enter invoice number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentStatus">Payment Status</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger id="paymentStatus">
                  <SelectValue placeholder="Select payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="itemName">Item Name*</Label>
              <Input
                id="itemName"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Enter item name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch">Batch*</Label>
              <Input
                id="batch"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder="Enter batch number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry">Expiry Date*</Label>
              <Input id="expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity*</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity || ""}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder="Enter quantity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price*</Label>
              <Input
                id="purchasePrice"
                type="number"
                step="0.01"
                min="0.01"
                value={purchasePrice || ""}
                onChange={(e) => setPurchasePrice(Number(e.target.value))}
                placeholder="Enter purchase price"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling Price*</Label>
              <Input
                id="sellingPrice"
                type="number"
                step="0.01"
                min="0.01"
                value={sellingPrice || ""}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                placeholder="Enter selling price"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstRate">GST Rate (%)</Label>
              <Input
                id="gstRate"
                type="number"
                step="0.01"
                min="0"
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                placeholder="Enter GST rate"
              />
            </div>
          </div>
          <Button onClick={addItem} className="mb-4">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>

          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Purchase Price</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead className="text-right">GST</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inwardItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4 text-muted-foreground">
                      No items added yet
                    </TableCell>
                  </TableRow>
                ) : (
                  inwardItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.batch}</TableCell>
                      <TableCell>{item.expiry}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">₹{item.purchasePrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{item.gstRate}%</TableCell>
                      <TableCell className="text-right">₹{(item.purchasePrice * item.quantity).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {inwardItems.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-right font-bold">
                      Total Value:
                    </TableCell>
                    <TableCell className="text-right font-bold">₹{calculateTotal().toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={saveInward} className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-2" />
              Save Inward
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
