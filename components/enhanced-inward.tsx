'use client'

import React, { useState, useEffect } from 'react'
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Camera, FileSpreadsheet, FileText, Loader2, PackagePlus, Save, Search, Upload, X, Zap, FileCheck, Truck, Calendar, BarChart4, ListChecks, Tag } from 'lucide-react'
import { CSVImportDialog } from './csv-import-dialog'
import { useToast } from '@/hooks/use-toast'

// Mock inventory item type
interface InventoryItem {
  id: string
  name: string
  batchNumber: string
  expiryDate: string
  mrp: number
  purchasePrice: number
  sellingPrice: number
  quantity: number
  gst: number
  manufacturer: string
  supplier: string
  category: string
}

// Mock supplier type
interface Supplier {
  id: string
  name: string
  contactPerson: string
  phone: string
  email: string
  address: string
}

export function EnhancedInward() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('manual')
  const [isLoading, setIsLoading] = useState(false)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    { id: '1', name: 'ABC Pharma', contactPerson: 'John Doe', phone: '9876543210', email: 'john@abcpharma.com', address: 'Mumbai, India' },
    { id: '2', name: 'XYZ Distributors', contactPerson: 'Jane Smith', phone: '8765432109', email: 'jane@xyzdist.com', address: 'Delhi, India' },
    { id: '3', name: 'MedSupply Co.', contactPerson: 'Raj Kumar', phone: '7654321098', email: 'raj@medsupply.com', address: 'Bangalore, India' },
  ])
  const [selectedSupplier, setSelectedSupplier] = useState<string>('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    name: '',
    batchNumber: '',
    expiryDate: '',
    mrp: 0,
    purchasePrice: 0,
    sellingPrice: 0,
    quantity: 0,
    gst: 18,
    manufacturer: '',
    category: 'Tablet'
  })
  const [showScanner, setShowScanner] = useState(false)
  const [isOcrProcessing, setIsOcrProcessing] = useState(false)
  const [ocrResult, setOcrResult] = useState<string>('')
  const [templates, setTemplates] = useState([
    { id: '1', name: 'Regular Order - ABC Pharma', supplierId: '1', items: [] },
    { id: '2', name: 'Monthly Stock - XYZ Distributors', supplierId: '2', items: [] },
  ])

  // Handle adding a new item
  const handleAddItem = () => {
    if (!newItem.name || !newItem.batchNumber) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    const item: InventoryItem = {
      id: Date.now().toString(),
      name: newItem.name || '',
      batchNumber: newItem.batchNumber || '',
      expiryDate: newItem.expiryDate || '',
      mrp: newItem.mrp || 0,
      purchasePrice: newItem.purchasePrice || 0,
      sellingPrice: newItem.sellingPrice || 0,
      quantity: newItem.quantity || 0,
      gst: newItem.gst || 18,
      manufacturer: newItem.manufacturer || '',
      supplier: selectedSupplier,
      category: newItem.category || 'Tablet'
    }

    setItems([...items, item])
    setNewItem({
      name: '',
      batchNumber: '',
      expiryDate: '',
      mrp: 0,
      purchasePrice: 0,
      sellingPrice: 0,
      quantity: 0,
      gst: 18,
      manufacturer: '',
      category: 'Tablet'
    })

    toast({
      title: "Item Added",
      description: `${item.name} has been added to the inward list`
    })
  }

  // Handle saving the entire inward entry
  const handleSaveInward = () => {
    if (items.length === 0) {
      toast({
        title: "No Items",
        description: "Please add at least one item to save",
        variant: "destructive"
      })
      return
    }

    if (!selectedSupplier || !invoiceNumber) {
      toast({
        title: "Missing Information",
        description: "Please select a supplier and enter an invoice number",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Inward Saved",
        description: `Inward entry with ${items.length} items has been saved successfully`
      })
      setIsLoading(false)
      setItems([])
      setSelectedSupplier('')
      setInvoiceNumber('')
      setInvoiceDate('')
    }, 1500)
  }

  // Handle barcode scanning
  const handleBarcodeScan = (barcode: string) => {
    // In a real app, this would query a database or API
    const mockProduct = {
      name: `Product ${barcode.substring(0, 4)}`,
      batchNumber: `B${barcode.substring(4, 8)}`,
      expiryDate: '2025-12-31',
      mrp: parseFloat(barcode.substring(8, 12)) / 100,
      purchasePrice: parseFloat(barcode.substring(8, 12)) / 120,
      sellingPrice: parseFloat(barcode.substring(8, 12)) / 110,
      quantity: 1,
      gst: 18,
      manufacturer: 'Generic Manufacturer',
      category: 'Tablet'
    }

    setNewItem(mockProduct)
    setShowScanner(false)
    
    toast({
      title: "Product Scanned",
      description: `${mockProduct.name} details loaded from barcode`
    })
  }

  // Handle OCR processing
  const handleOcrProcess = (file: File) => {
    setIsOcrProcessing(true)
    
    // Simulate OCR processing
    setTimeout(() => {
      const mockOcrText = `INVOICE\nSupplier: ABC Pharma\nInvoice #: INV-2023-456\nDate: 2023-10-15\n\nItems:\n1. Paracetamol 500mg - Batch: B2023 - Qty: 100 - Price: 2.50\n2. Amoxicillin 250mg - Batch: A2023 - Qty: 50 - Price: 5.75\n3. Cetirizine 10mg - Batch: C2023 - Qty: 30 - Price: 3.25`
      
      setOcrResult(mockOcrText)
      setIsOcrProcessing(false)
      
      // Auto-extract some information
      setSelectedSupplier('1') // ABC Pharma
      setInvoiceNumber('INV-2023-456')
      setInvoiceDate('2023-10-15')
      
      toast({
        title: "OCR Processing Complete",
        description: "Invoice data extracted. Please verify and edit as needed."
      })
    }, 2000)
  }

  // Handle CSV import completion
  const handleCsvImportComplete = (data: any[]) => {
    const newItems = data.map((row, index) => ({
      id: `csv-${Date.now()}-${index}`,
      name: row.name || row.product_name || row.medicine_name || '',
      batchNumber: row.batch || row.batch_number || row.batchNumber || '',
      expiryDate: row.expiry || row.expiry_date || row.expiryDate || '',
      mrp: parseFloat(row.mrp || row.price || '0'),
      purchasePrice: parseFloat(row.purchase_price || row.cost || row.purchasePrice || '0'),
      sellingPrice: parseFloat(row.selling_price || row.sellingPrice || row.mrp || '0'),
      quantity: parseInt(row.quantity || row.qty || '0', 10),
      gst: parseFloat(row.gst || row.tax || '18'),
      manufacturer: row.manufacturer || row.company || '',
      supplier: selectedSupplier,
      category: row.category || row.type || 'Tablet'
    }))

    setItems([...items, ...newItems])
    
    toast({
      title: "CSV Import Complete",
      description: `${newItems.length} items have been imported`
    })
  }

  // Calculate total value
  const totalValue = items.reduce((sum, item) => sum + (item.purchasePrice * item.quantity), 0)

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Enhanced Inward Stock Entry</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50">
            Items: {items.length}
          </Badge>
          <Badge variant="outline" className="bg-green-50">
            Total Value: ₹{totalValue.toFixed(2)}
          </Badge>
        </div>
      </div>

      {/* Supplier and Invoice Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Invoice Details</CardTitle>
          <CardDescription>Enter supplier and invoice information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-number">Invoice Number</Label>
              <Input 
                id="invoice-number" 
                value={invoiceNumber} 
                onChange={e => setInvoiceNumber(e.target.value)} 
                placeholder="Enter invoice number" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-date">Invoice Date</Label>
              <Input 
                id="invoice-date" 
                type="date" 
                value={invoiceDate} 
                onChange={e => setInvoiceDate(e.target.value)} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entry Methods Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Manual Entry</span>
          </TabsTrigger>
          <TabsTrigger value="barcode" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Barcode Scan</span>
          </TabsTrigger>
          <TabsTrigger value="csv" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">CSV Import</span>
          </TabsTrigger>
          <TabsTrigger value="ocr" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Invoice Scan</span>
          </TabsTrigger>
        </TabsList>

        {/* Manual Entry Tab */}
        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Add New Item</CardTitle>
              <CardDescription>Enter product details manually</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name*</Label>
                  <Input 
                    id="name" 
                    value={newItem.name} 
                    onChange={e => setNewItem({...newItem, name: e.target.value})} 
                    placeholder="Enter product name" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch">Batch Number*</Label>
                  <Input 
                    id="batch" 
                    value={newItem.batchNumber} 
                    onChange={e => setNewItem({...newItem, batchNumber: e.target.value})} 
                    placeholder="Enter batch number" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input 
                    id="expiry" 
                    type="date" 
                    value={newItem.expiryDate} 
                    onChange={e => setNewItem({...newItem, expiryDate: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mrp">MRP (₹)</Label>
                  <Input 
                    id="mrp" 
                    type="number" 
                    value={newItem.mrp || ''} 
                    onChange={e => {
                      const mrp = parseFloat(e.target.value);
                      setNewItem({
                        ...newItem, 
                        mrp,
                        // Auto-calculate selling price as 90% of MRP
                        sellingPrice: mrp * 0.9,
                        // Auto-calculate purchase price as 70% of MRP
                        purchasePrice: mrp * 0.7
                      })
                    }} 
                    placeholder="0.00" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase-price">Purchase Price (₹)</Label>
                  <Input 
                    id="purchase-price" 
                    type="number" 
                    value={newItem.purchasePrice || ''} 
                    onChange={e => setNewItem({...newItem, purchasePrice: parseFloat(e.target.value)})} 
                    placeholder="0.00" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selling-price">Selling Price (₹)</Label>
                  <Input 
                    id="selling-price" 
                    type="number" 
                    value={newItem.sellingPrice || ''} 
                    onChange={e => setNewItem({...newItem, sellingPrice: parseFloat(e.target.value)})} 
                    placeholder="0.00" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input 
                    id="quantity" 
                    type="number" 
                    value={newItem.quantity || ''} 
                    onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value, 10)})} 
                    placeholder="0" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gst">GST %</Label>
                  <Select 
                    value={newItem.gst?.toString()} 
                    onValueChange={value => setNewItem({...newItem, gst: parseFloat(value)})}
                  >
                    <SelectTrigger id="gst">
                      <SelectValue placeholder="Select GST rate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="18">18%</SelectItem>
                      <SelectItem value="28">28%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input 
                    id="manufacturer" 
                    value={newItem.manufacturer} 
                    onChange={e => setNewItem({...newItem, manufacturer: e.target.value})} 
                    placeholder="Enter manufacturer name" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={newItem.category} 
                    onValueChange={value => setNewItem({...newItem, category: value})}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tablet">Tablet</SelectItem>
                      <SelectItem value="Capsule">Capsule</SelectItem>
                      <SelectItem value="Syrup">Syrup</SelectItem>
                      <SelectItem value="Injection">Injection</SelectItem>
                      <SelectItem value="Cream">Cream</SelectItem>
                      <SelectItem value="Drops">Drops</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleAddItem} className="flex items-center gap-2">
                <PackagePlus className="h-4 w-4" />
                Add Item
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Barcode Scan Tab */}
        <TabsContent value="barcode" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Barcode Scanning</CardTitle>
              <CardDescription>Scan product barcodes to quickly add items</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-4">
              {showScanner ? (
                <div className="w-full max-w-md aspect-video bg-gray-100 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500 mb-2">Camera feed would appear here</p>
                  <p className="text-xs text-gray-400">This is a mock interface</p>
                  
                  {/* Mock barcode detection */}
                  <div className="mt-4 space-y-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleBarcodeScan('8901234567890')}
                    >
                      Simulate Scan: 8901234567890
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleBarcodeScan('7654321098765')}
                    >
                      Simulate Scan: 7654321098765
                    </Button>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-4" 
                    onClick={() => setShowScanner(false)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Close Scanner
                  </Button>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <Button onClick={() => setShowScanner(true)}>
                    <Camera className="h-4 w-4 mr-2" />
                    Open Barcode Scanner
                  </Button>
                  <p className="text-sm text-gray-500">
                    You can also enter a barcode manually:
                  </p>
                  <div className="flex gap-2">
                    <Input placeholder="Enter barcode number" />
                    <Button variant="outline">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Show the manual entry form if a product is loaded via barcode */}
          {newItem.name && activeTab === 'barcode' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Scanned Product</CardTitle>
                <CardDescription>Verify and adjust details as needed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name-scan">Product Name*</Label>
                    <Input 
                      id="name-scan" 
                      value={newItem.name} 
                      onChange={e => setNewItem({...newItem, name: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="batch-scan">Batch Number*</Label>
                    <Input 
                      id="batch-scan" 
                      value={newItem.batchNumber} 
                      onChange={e => setNewItem({...newItem, batchNumber: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity-scan">Quantity</Label>
                    <Input 
                      id="quantity-scan" 
                      type="number" 
                      value={newItem.quantity || ''} 
                      onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value, 10)})} 
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleAddItem} className="flex items-center gap-2">
                  <PackagePlus className="h-4 w-4" />
                  Add Scanned Item
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>

        {/* CSV Import Tab */}
        <TabsContent value="csv" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>CSV Import</CardTitle>
              <CardDescription>Bulk import items from a CSV file</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                <FileSpreadsheet className="h-10 w-10 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 mb-4">Upload a CSV file with your inventory data</p>
                
                <CSVImportDialog onImportComplete={handleCsvImportComplete} />
                
                <div className="mt-4 text-xs text-gray-500">
                  <p>Supported columns: name, batch_number, expiry_date, mrp, purchase_price, selling_price, quantity, gst, manufacturer, category</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Templates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {templates.map(template => (
                    <Button 
                      key={template.id} 
                      variant="outline" 
                      className="justify-start"
                      onClick={() => {
                        setSelectedSupplier(template.supplierId)
                        toast({
                          title: "Template Selected",
                          description: `${template.name} template loaded`
                        })
                      }}
                    >
                      <FileCheck className="h-4 w-4 mr-2" />
                      {template.name}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OCR Tab */}
        <TabsContent value="ocr" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Scan (OCR)</CardTitle>
              <CardDescription>Extract data from invoice images</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isOcrProcessing ? (
                <div className="flex flex-col items-center justify-center p-10">
                  <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
                  <p>Processing invoice image...</p>
                </div>
              ) : ocrResult ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium mb-2">Extracted Text</h3>
                    <ScrollArea className="h-40 w-full rounded border p-2">
                      <pre className="text-xs whitespace-pre-wrap">{ocrResult}</pre>
                    </ScrollArea>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Auto-Detected Fields</h3>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <span className="text-xs font-medium w-24">Supplier:</span>
                          <Badge variant="outline">ABC Pharma</Badge>
                        </div>
                        <div className="flex items-center">
                          <span className="text-xs font-medium w-24">Invoice #:</span>
                          <Badge variant="outline">INV-2023-456</Badge>
                        </div>
                        <div className="flex items-center">
                          <span className="text-xs font-medium w-24">Date:</span>
                          <Badge variant="outline">2023-10-15</Badge>
                        </div>
                        <div className="flex items-center">
                          <span className="text-xs font-medium w-24">Items:</span>
                          <Badge variant="outline">3 detected</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Actions</h3>
                      <div className="space-y-2">
                        <Button 
                          variant="outline" 
                          className="w-full justify-start"
                          onClick={() => {
                            // Add mock items from OCR
                            const mockItems = [
                              {
                                id: `ocr-${Date.now()}-1`,
                                name: 'Paracetamol 500mg',
                                batchNumber: 'B2023',
                                expiryDate: '2024-12-31',
                                mrp: 3.00,
                                purchasePrice: 2.50,
                                sellingPrice: 2.80,
                                quantity: 100,
                                gst: 12,
                                manufacturer: 'Generic',
                                supplier: selectedSupplier,
                                category: 'Tablet'
                              },
                              {
                                id: `ocr-${Date.now()}-2`,
                                name: 'Amoxicillin 250mg',
                                batchNumber: 'A2023',
                                expiryDate: '2024-10-31',
                                mrp: 6.50,
                                purchasePrice: 5.75,
                                sellingPrice: 6.20,
                                quantity: 50,
                                gst: 12,
                                manufacturer: 'Generic',
                                supplier: selectedSupplier,
                                category: 'Capsule'
                              },
                              {
                                id: `ocr-${Date.now()}-3`,
                                name: 'Cetirizine 10mg',
                                batchNumber: 'C2023',
                                expiryDate: '2024-11-30',
                                mrp: 3.75,
                                purchasePrice: 3.25,
                                sellingPrice: 3.50,
                                quantity: 30,
                                gst: 12,
                                manufacturer: 'Generic',
                                supplier: selectedSupplier,
                                category: 'Tablet'
                              }
                            ];
                            
                            setItems([...items, ...mockItems]);
                            
                            toast({
                              title: "Items Extracted",
                              description: `${mockItems.length} items have been added from the invoice`
                            });
                          }}
                        >
                          <ListChecks className="h-4 w-4 mr-2" />
                          Add All Detected Items
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start"
                          onClick={() => {
                            setOcrResult('');
                            toast({
                              title: "OCR Result Cleared",
                              description: "You can scan another invoice"
                            });
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Clear OCR Result
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                  <Camera className="h-10 w-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 mb-4">Take a photo or upload an invoice image</p>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        toast({
                          title: "Camera Access",
                          description: "This would open your camera in a real app"
                        });
                      }}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Take Photo
                    </Button>
                    <Button
                      onClick={() => {
                        // Simulate file upload and OCR processing
                        handleOcrProcess(new File([], "invoice.jpg"));
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Invoice
                    </Button>
                  </div>
                  
                  <p className="mt-4 text-xs text-gray-500">
                    Supported formats: JPG, PNG, PDF
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Items Table */}
      {items.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Inward Items ({items.length})</CardTitle>
            <CardDescription>Review items before saving</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right">MRP</TableHead>
                    <TableHead className="text-right">Purchase Price</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.batchNumber}</TableCell>
                      <TableCell>{item.expiryDate}</TableCell>
                      <TableCell className="text-right">₹{item.mrp.toFixed(2)}</TableCell>
                      <TableCell className="text-right">₹{item.purchasePrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">₹{(item.purchasePrice * item.quantity).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setItems(items.filter(i => i.id !== item.id));
                            toast({
                              title: "Item Removed",
                              description: `${item.name} has been removed from the list`
                            });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
          <CardFooter className="flex justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">Clear All</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all items from the current inward entry. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setItems([]);
                      toast({
                        title: "Items Cleared",
                        description: "All items have been removed from the inward entry"
                      });
                    }}
                  >
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Button 
              onClick={handleSaveInward} 
              disabled={items.length === 0 || isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Inward Entry
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-blue-100 p-2 rounded-full">
              <PackagePlus className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Today's Inward</p>
              <p className="text-2xl font-bold">₹24,500</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-green-100 p-2 rounded-full">
              <Truck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Pending Deliveries</p>
              <p className="text-2xl font-bold">3</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-amber-100 p-2 rounded-full">
              <Calendar className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium">This Month</p>
              <p className="text-2xl font-bold">₹1.2L</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-purple-100 p-2 rounded-full">
              <BarChart4 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Avg. Daily</p>
              <p className="text-2xl font-bold">₹8,200</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
