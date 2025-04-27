"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertCircle,
  ScanBarcodeIcon as BarcodeScan,
  Camera,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Loader2,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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

// Mock data for suppliers
const SUPPLIERS = [
  { id: 1, name: "MedPlus Distributors", gst: "27AABCM1234A1Z5" },
  { id: 2, name: "Apollo Pharmacy Wholesale", gst: "33ZZXXA9876B1Z8" },
  { id: 3, name: "Zydus Healthcare", gst: "24AADCZ5432C1Z3" },
  { id: 4, name: "Sun Pharma Distributors", gst: "06AADCS2345D1Z1" },
]

// Mock data for products
const SAMPLE_PRODUCTS = [
  { id: "P001", name: "Paracetamol 500mg", batch: "BT2023A", expiry: "2025-06", mrp: 25.5, ptr: 20.4, qty: 100 },
  { id: "P002", name: "Azithromycin 250mg", batch: "AZ1022B", expiry: "2024-12", mrp: 85.75, ptr: 68.6, qty: 50 },
  { id: "P003", name: "Cetirizine 10mg", batch: "CT2023C", expiry: "2025-03", mrp: 35.25, ptr: 28.2, qty: 75 },
]

// Template types
const TEMPLATE_TYPES = [
  { id: "apollo", name: "Apollo Format" },
  { id: "medplus", name: "MedPlus Format" },
  { id: "generic", name: "Generic Format" },
  { id: "custom", name: "Custom Format" },
]

export default function EnhancedInward() {
  const [activeTab, setActiveTab] = useState("manual")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [selectedSupplier, setSelectedSupplier] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [invoiceDate, setInvoiceDate] = useState("")
  const [products, setProducts] = useState<any[]>([])
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [scanResult, setScanResult] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [ocrResult, setOcrResult] = useState("")
  const [isOcrProcessing, setIsOcrProcessing] = useState(false)
  const [csvMappings, setCsvMappings] = useState({
    name: "product_name",
    batch: "batch_no",
    expiry: "expiry_date",
    mrp: "mrp",
    ptr: "ptr",
    qty: "quantity",
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Simulate barcode scanning
  const handleBarcodeScan = () => {
    setIsScanning(true)
    setTimeout(() => {
      setIsScanning(false)
      setScanResult("P001")
      // Add the scanned product to the list
      const scannedProduct = SAMPLE_PRODUCTS.find((p) => p.id === "P001")
      if (scannedProduct) {
        setProducts((prev) => [...prev, { ...scannedProduct, qty: 1 }])
      }
    }, 2000)
  }

  // Simulate OCR processing
  const handleOcrProcess = (file: File) => {
    setIsOcrProcessing(true)
    setOcrResult("")

    // Simulate processing delay
    setTimeout(() => {
      setIsOcrProcessing(false)
      setOcrResult(
        "Invoice detected: INV-2023-456\nSupplier: MedPlus Distributors\nDate: 2023-10-15\n\nItems detected: 3\n1. Paracetamol 500mg x 100\n2. Azithromycin 250mg x 50\n3. Cetirizine 10mg x 75",
      )

      // Auto-fill form with OCR results
      setInvoiceNumber("INV-2023-456")
      setInvoiceDate("2023-10-15")
      setSelectedSupplier("1") // MedPlus Distributors
      setProducts(SAMPLE_PRODUCTS)
    }, 3000)
  }

  // Handle CSV import
  const handleCsvImport = (file: File) => {
    setIsProcessing(true)
    setProcessingProgress(0)

    // Simulate processing with progress
    const interval = setInterval(() => {
      setProcessingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsProcessing(false)
          // Set products after "processing" the CSV
          setProducts(SAMPLE_PRODUCTS)
          return 100
        }
        return prev + 10
      })
    }, 300)
  }

  // Handle camera access for barcode scanning
  useEffect(() => {
    if (isCameraActive && videoRef.current) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" } })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
        })
        .catch((err) => {
          console.error("Error accessing camera:", err)
          setIsCameraActive(false)
        })
    } else if (!isCameraActive && videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
    }

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [isCameraActive])

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (activeTab === "csv") {
      handleCsvImport(file)
    } else if (activeTab === "ocr") {
      handleOcrProcess(file)
    }
  }

  // Add a new empty product row
  const addEmptyProduct = () => {
    setProducts((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        name: "",
        batch: "",
        expiry: "",
        mrp: 0,
        ptr: 0,
        qty: 1,
      },
    ])
  }

  // Remove a product from the list
  const removeProduct = (index: number) => {
    setProducts((prev) => prev.filter((_, i) => i !== index))
  }

  // Update product field
  const updateProduct = (index: number, field: string, value: any) => {
    setProducts((prev) => prev.map((product, i) => (i === index ? { ...product, [field]: value } : product)))
  }

  // Save the inward entry
  const saveInward = () => {
    setIsProcessing(true)

    // Simulate saving process
    setTimeout(() => {
      setIsProcessing(false)
      // Reset form or show success message
      alert("Inward entry saved successfully!")
      setProducts([])
      setInvoiceNumber("")
      setInvoiceDate("")
      setSelectedSupplier("")
    }, 2000)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Enhanced Inward Entry</span>
            <Badge variant="outline" className="ml-2">
              Beta
            </Badge>
          </CardTitle>
          <CardDescription>Multiple ways to add inventory - choose the method that works best for you</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="manual" className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Manual</span>
              </TabsTrigger>
              <TabsTrigger value="barcode" className="flex items-center gap-1">
                <BarcodeScan className="w-4 h-4" />
                <span className="hidden sm:inline">Barcode</span>
              </TabsTrigger>
              <TabsTrigger value="csv" className="flex items-center gap-1">
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">CSV</span>
              </TabsTrigger>
              <TabsTrigger value="ocr" className="flex items-center gap-1">
                <ImageIcon className="w-4 h-4" />
                <span className="hidden sm:inline">OCR</span>
              </TabsTrigger>
            </TabsList>

            {/* Common invoice details section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label htmlFor="supplier">Supplier</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPLIERS.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="invoice-number">Invoice Number</Label>
                <Input
                  id="invoice-number"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Enter invoice number"
                />
              </div>
              <div>
                <Label htmlFor="invoice-date">Invoice Date</Label>
                <Input
                  id="invoice-date"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
            </div>

            {/* Tab content */}
            <TabsContent value="manual" className="mt-0">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Products</h3>
                  <div className="flex gap-2">
                    <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <FileText className="w-4 h-4 mr-2" />
                          Use Template
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Select Template</DialogTitle>
                          <DialogDescription>
                            Choose a template for quick data entry based on supplier format
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select template" />
                            </SelectTrigger>
                            <SelectContent>
                              {TEMPLATE_TYPES.map((template) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={() => {
                              setIsTemplateDialogOpen(false)
                              // In a real app, this would load the template structure
                              if (selectedTemplate) {
                                setProducts(SAMPLE_PRODUCTS)
                              }
                            }}
                          >
                            Apply Template
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button onClick={addEmptyProduct} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Product
                    </Button>
                  </div>
                </div>

                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>MRP</TableHead>
                        <TableHead>PTR</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                            No products added. Click "Add Product" to begin.
                          </TableCell>
                        </TableRow>
                      ) : (
                        products.map((product, index) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <Input
                                value={product.name}
                                onChange={(e) => updateProduct(index, "name", e.target.value)}
                                placeholder="Product name"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={product.batch}
                                onChange={(e) => updateProduct(index, "batch", e.target.value)}
                                placeholder="Batch"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="month"
                                value={product.expiry}
                                onChange={(e) => updateProduct(index, "expiry", e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={product.mrp}
                                onChange={(e) => updateProduct(index, "mrp", Number.parseFloat(e.target.value))}
                                placeholder="0.00"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={product.ptr}
                                onChange={(e) => updateProduct(index, "ptr", Number.parseFloat(e.target.value))}
                                placeholder="0.00"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={product.qty}
                                onChange={(e) => updateProduct(index, "qty", Number.parseInt(e.target.value))}
                                placeholder="0"
                              />
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => removeProduct(index)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="barcode" className="mt-0">
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center border rounded-lg p-4">
                  {isCameraActive ? (
                    <div className="relative w-full max-w-md">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-64 object-cover rounded-md"
                      ></video>
                      <canvas ref={canvasRef} className="hidden"></canvas>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-3/4 h-1/3 border-2 border-red-500 rounded-md"></div>
                      </div>
                      <Button
                        variant="secondary"
                        className="absolute bottom-2 right-2"
                        onClick={() => setIsCameraActive(false)}
                      >
                        Close Camera
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Button onClick={() => setIsCameraActive(true)} className="mb-4">
                        <Camera className="w-4 h-4 mr-2" />
                        Open Camera
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Or use a handheld scanner connected to your device
                      </p>
                    </div>
                  )}

                  <div className="w-full max-w-md">
                    <div className="flex gap-2 mb-4">
                      <Input
                        value={scanResult}
                        onChange={(e) => setScanResult(e.target.value)}
                        placeholder="Scan or enter barcode"
                        disabled={isScanning}
                      />
                      <Button onClick={handleBarcodeScan} disabled={isScanning}>
                        {isScanning ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4 mr-2" />
                        )}
                        Scan
                      </Button>
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Quick Tip</AlertTitle>
                      <AlertDescription>
                        For bulk scanning, scan each product and adjust quantities afterward.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>

                {/* Product table - same as in manual tab */}
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>MRP</TableHead>
                        <TableHead>PTR</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                            No products scanned yet. Use the scanner above to begin.
                          </TableCell>
                        </TableRow>
                      ) : (
                        products.map((product, index) => (
                          <TableRow key={product.id}>
                            <TableCell>{product.name}</TableCell>
                            <TableCell>
                              <Input
                                value={product.batch}
                                onChange={(e) => updateProduct(index, "batch", e.target.value)}
                                placeholder="Batch"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="month"
                                value={product.expiry}
                                onChange={(e) => updateProduct(index, "expiry", e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={product.mrp}
                                onChange={(e) => updateProduct(index, "mrp", Number.parseFloat(e.target.value))}
                                placeholder="0.00"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={product.ptr}
                                onChange={(e) => updateProduct(index, "ptr", Number.parseFloat(e.target.value))}
                                placeholder="0.00"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={product.qty}
                                onChange={(e) => updateProduct(index, "qty", Number.parseInt(e.target.value))}
                                placeholder="0"
                              />
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => removeProduct(index)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="csv" className="mt-0">
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center border rounded-lg p-4">
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".csv" className="hidden" />

                  {isProcessing ? (
                    <div className="w-full max-w-md space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Processing CSV file...</span>
                        <span>{processingProgress}%</span>
                      </div>
                      <Progress value={processingProgress} />
                    </div>
                  ) : (
                    <div className="text-center">
                      <Button onClick={() => fileInputRef.current?.click()} className="mb-4">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload CSV
                      </Button>
                      <p className="text-sm text-muted-foreground mb-4">Upload a CSV file with your inventory data</p>

                      <div className="text-left w-full max-w-md">
                        <h4 className="font-medium mb-2">Column Mappings</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(csvMappings).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2">
                              <span className="text-sm font-medium w-20">{key}:</span>
                              <Input
                                value={value}
                                onChange={(e) => setCsvMappings({ ...csvMappings, [key]: e.target.value })}
                                className="text-sm h-8"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Product table - same as in other tabs */}
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>MRP</TableHead>
                        <TableHead>PTR</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                            No products imported yet. Upload a CSV file to begin.
                          </TableCell>
                        </TableRow>
                      ) : (
                        products.map((product, index) => (
                          <TableRow key={product.id}>
                            <TableCell>{product.name}</TableCell>
                            <TableCell>{product.batch}</TableCell>
                            <TableCell>{product.expiry}</TableCell>
                            <TableCell>{product.mrp}</TableCell>
                            <TableCell>{product.ptr}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={product.qty}
                                onChange={(e) => updateProduct(index, "qty", Number.parseInt(e.target.value))}
                                placeholder="0"
                              />
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => removeProduct(index)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ocr" className="mt-0">
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center border rounded-lg p-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                  />

                  {isOcrProcessing ? (
                    <div className="w-full max-w-md space-y-2 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                      <p>Processing image... This may take a moment.</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Button onClick={() => fileInputRef.current?.click()} className="mb-4">
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Upload Invoice Image
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Upload a clear image of your invoice for automatic data extraction
                      </p>
                    </div>
                  )}

                  {ocrResult && (
                    <div className="w-full max-w-md mt-4">
                      <h4 className="font-medium mb-2">OCR Results</h4>
                      <div className="bg-muted p-3 rounded-md">
                        <pre className="text-xs whitespace-pre-wrap">{ocrResult}</pre>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        The form has been auto-filled based on the OCR results. Please verify the data.
                      </p>
                    </div>
                  )}
                </div>

                {/* Product table - same as in other tabs */}
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>MRP</TableHead>
                        <TableHead>PTR</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                            No products extracted yet. Upload an invoice image to begin.
                          </TableCell>
                        </TableRow>
                      ) : (
                        products.map((product, index) => (
                          <TableRow key={product.id}>
                            <TableCell>{product.name}</TableCell>
                            <TableCell>
                              <Input
                                value={product.batch}
                                onChange={(e) => updateProduct(index, "batch", e.target.value)}
                                placeholder="Batch"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="month"
                                value={product.expiry}
                                onChange={(e) => updateProduct(index, "expiry", e.target.value)}
                              />
                            </TableCell>
                            <TableCell>{product.mrp}</TableCell>
                            <TableCell>{product.ptr}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={product.qty}
                                onChange={(e) => updateProduct(index, "qty", Number.parseInt(e.target.value))}
                                placeholder="0"
                              />
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => removeProduct(index)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {isProcessing && (
        <div className="fixed inset-0 bg-gray-200 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-md shadow-lg">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-center">Saving Inward Entry...</p>
          </div>
        </div>
      )}
    </div>
  )
}
