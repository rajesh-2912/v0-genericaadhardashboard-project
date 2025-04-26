/**
 * Enhanced CSV parser with flexible column mapping
 */
import Papa from "papaparse"

// Define possible column name mappings
const COLUMN_MAPPINGS = {
  name: [
    "name",
    "medicine",
    "medicine name",
    "medicine_name",
    "medicinename",
    "drug",
    "drug name",
    "item",
    "product",
    "description",
  ],
  batch: ["batch", "batch no", "batch number", "batch_no", "batchno", "lot", "lot number"],
  expiry: ["expiry", "expiry date", "expiry_date", "expirydate", "exp", "exp date", "exp_date", "expdate"],
  stock: ["stock", "quantity", "qty", "count", "units", "inventory", "available"],
  purchasePrice: [
    "purchase price",
    "purchase_price",
    "purchaseprice",
    "cost",
    "cost price",
    "buying price",
    "buy price",
  ],
  price: ["price", "selling price", "selling_price", "sellingprice", "mrp", "retail price", "sale price"],
  gstRate: ["gst", "gst rate", "gst_rate", "gstrate", "tax", "tax rate", "vat", "vat rate"],
}

// Type for parsed item
export type ParsedItem = {
  name: string
  batch: string
  expiry: string
  stock: number
  purchasePrice: number
  price: number
  gstRate: number
}

/**
 * Find the best matching column for a given field
 * @param headers CSV headers
 * @param field Field to match
 * @returns Best matching column index or -1 if not found
 */
const findMatchingColumn = (headers: string[], field: string): number => {
  const possibleNames = COLUMN_MAPPINGS[field as keyof typeof COLUMN_MAPPINGS]
  if (!possibleNames) return -1

  // First try exact match (case insensitive)
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase().trim()
    if (possibleNames.includes(header)) {
      return i
    }
  }

  // Then try partial match
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase().trim()
    for (const name of possibleNames) {
      if (header.includes(name) || name.includes(header)) {
        return i
      }
    }
  }

  return -1
}

/**
 * Parse CSV data with flexible column mapping
 * @param csvData CSV data as string
 * @param onProgress Progress callback
 * @returns Parsed items and column mapping
 */
export const parseCSVWithFlexibleMapping = (
  csvData: string,
  onProgress?: (progress: number) => void,
): Promise<{
  items: ParsedItem[]
  columnMapping: Record<string, number>
  rawData: any[]
}> => {
  return new Promise((resolve, reject) => {
    try {
      // Set initial progress
      if (onProgress) onProgress(10)

      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            if (onProgress) onProgress(30)

            // Get headers and convert to lowercase for easier matching
            const rawData = results.data
            if (rawData.length === 0) {
              reject(new Error("No data found in CSV"))
              return
            }

            const firstRow = rawData[0]
            const headers = Object.keys(firstRow).map((h) => h.toLowerCase().trim())

            // Find matching columns
            const columnMapping: Record<string, number> = {
              name: findMatchingColumn(headers, "name"),
              batch: findMatchingColumn(headers, "batch"),
              expiry: findMatchingColumn(headers, "expiry"),
              stock: findMatchingColumn(headers, "stock"),
              purchasePrice: findMatchingColumn(headers, "purchasePrice"),
              price: findMatchingColumn(headers, "price"),
              gstRate: findMatchingColumn(headers, "gstRate"),
            }

            if (onProgress) onProgress(50)

            // Parse data using the column mapping
            const items: ParsedItem[] = []
            const headerKeys = Object.keys(firstRow)

            for (const row of rawData) {
              // Skip empty rows
              if (Object.values(row).every((val) => !val)) continue

              const item: Partial<ParsedItem> = {}

              // Extract values using column mapping
              if (columnMapping.name >= 0) {
                item.name = String(row[headerKeys[columnMapping.name]] || "").trim()
              }

              if (columnMapping.batch >= 0) {
                item.batch = String(row[headerKeys[columnMapping.batch]] || "").trim()
              } else {
                // Generate a batch number if not found
                item.batch = `BATCH-${Date.now().toString().substring(8)}-${Math.floor(Math.random() * 1000)}`
              }

              if (columnMapping.expiry >= 0) {
                const expiryValue = row[headerKeys[columnMapping.expiry]]
                // Try to parse various date formats
                if (expiryValue) {
                  try {
                    const date = new Date(expiryValue)
                    if (!isNaN(date.getTime())) {
                      item.expiry = date.toISOString().split("T")[0]
                    }
                  } catch {
                    // If date parsing fails, use the original value
                    item.expiry = String(expiryValue).trim()
                  }
                }
              }

              // Default expiry to 1 year from now if not found or invalid
              if (!item.expiry) {
                const oneYearFromNow = new Date()
                oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
                item.expiry = oneYearFromNow.toISOString().split("T")[0]
              }

              if (columnMapping.stock >= 0) {
                const stockValue = row[headerKeys[columnMapping.stock]]
                item.stock = Number.parseFloat(String(stockValue).replace(/[^\d.-]/g, "")) || 0
              } else {
                item.stock = 0
              }

              if (columnMapping.purchasePrice >= 0) {
                const purchasePriceValue = row[headerKeys[columnMapping.purchasePrice]]
                item.purchasePrice = Number.parseFloat(String(purchasePriceValue).replace(/[^\d.-]/g, "")) || 0
              } else {
                item.purchasePrice = 0
              }

              if (columnMapping.price >= 0) {
                const priceValue = row[headerKeys[columnMapping.price]]
                item.price = Number.parseFloat(String(priceValue).replace(/[^\d.-]/g, "")) || 0
              } else {
                // Default price to 1.5x purchase price if not found
                item.price = (item.purchasePrice || 0) * 1.5
              }

              if (columnMapping.gstRate >= 0) {
                const gstValue = row[headerKeys[columnMapping.gstRate]]
                item.gstRate = Number.parseFloat(String(gstValue).replace(/[^\d.-]/g, "")) || 5
              } else {
                // Default GST rate to 5% if not found
                item.gstRate = 5
              }

              // Only add items with a name
              if (item.name) {
                items.push(item as ParsedItem)
              }
            }

            if (onProgress) onProgress(100)

            resolve({
              items,
              columnMapping,
              rawData,
            })
          } catch (error) {
            console.error("Error processing CSV data:", error)
            reject(error)
          }
        },
        error: (error) => {
          console.error("CSV parsing error:", error)
          reject(error)
        },
      })
    } catch (error) {
      console.error("Error in CSV parsing:", error)
      reject(error)
    }
  })
}
