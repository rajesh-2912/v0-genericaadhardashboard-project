import jsPDF from "jspdf"
import "jspdf-autotable"
import type { Transaction } from "../types/erp-types"

// Extend jsPDF with autotable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

// Function to generate a PDF invoice
export const generateInvoicePDF = (transaction: Transaction): jsPDF => {
  // Create a new PDF document
  const doc = new jsPDF()

  // Set document properties
  doc.setProperties({
    title: `Invoice-${transaction.id}`,
    subject: "Pharmacy Invoice",
    author: "Generic Aadhaar ERP",
    keywords: "invoice, pharmacy, generic aadhaar",
    creator: "Generic Aadhaar ERP",
  })

  // Add pharmacy logo and header
  // Logo would be added here if available

  // Add pharmacy information
  doc.setFontSize(20)
  doc.setTextColor(0, 51, 102) // Dark blue color
  doc.setFont("helvetica", "bold")
  doc.text("Generic Aadhaar Pharmacy", 105, 20, { align: "center" })

  doc.setFontSize(10)
  doc.setTextColor(102, 102, 102) // Gray color
  doc.setFont("helvetica", "normal")
  doc.text("Your Health, Our Priority", 105, 26, { align: "center" })
  doc.text("123 Healthcare Street, Medical District", 105, 30, { align: "center" })
  doc.text("Phone: +91 9876543210 | Email: care@genericaadhaar.com", 105, 34, { align: "center" })
  doc.text("GST: 27ABCDE1234F1Z5", 105, 38, { align: "center" })

  // Add a decorative line
  doc.setDrawColor(0, 102, 204) // Blue color
  doc.setLineWidth(0.5)
  doc.line(15, 42, 195, 42)

  // Add invoice details
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0) // Black color
  doc.setFont("helvetica", "bold")
  doc.text("INVOICE", 15, 52)

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Invoice No: ${transaction.id.substring(0, 8).toUpperCase()}`, 15, 58)
  doc.text(`Date: ${transaction.date}`, 15, 63)
  doc.text(`Time: ${transaction.time}`, 15, 68)

  // Add customer details
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("Customer Details", 140, 52)

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Name: ${transaction.customer}`, 140, 58)
  doc.text(`Mobile: ${transaction.mobile}`, 140, 63)
  if (transaction.doctor) {
    doc.text(`Doctor: ${transaction.doctor}`, 140, 68)
  }

  // Add a decorative line
  doc.setDrawColor(220, 220, 220) // Light gray
  doc.setLineWidth(0.2)
  doc.line(15, 72, 195, 72)

  // Add items table
  const tableColumn = ["#", "Item", "Batch", "Qty", "Price", "GST", "Amount"]
  const tableRows: any[] = []

  // Add items to table
  transaction.items.forEach((item, index) => {
    const itemData = [
      index + 1,
      item.name,
      item.batch || "-",
      item.quantity,
      `₹${item.price.toFixed(2)}`,
      `${item.gstRate}%`,
      `₹${item.total.toFixed(2)}`,
    ]
    tableRows.push(itemData)
  })

  // Generate the table
  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 75,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 3,
      lineColor: [220, 220, 220],
    },
    headStyles: {
      fillColor: [0, 102, 204],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240],
    },
    columnStyles: {
      0: { cellWidth: 10 }, // #
      1: { cellWidth: 60 }, // Item
      2: { cellWidth: 25 }, // Batch
      3: { cellWidth: 15 }, // Qty
      4: { cellWidth: 25 }, // Price
      5: { cellWidth: 20 }, // GST
      6: { cellWidth: 25 }, // Amount
    },
  })

  // Get the y position after the table
  const finalY = (doc as any).lastAutoTable.finalY + 10

  // Add summary
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")

  // Left side - GST summary
  doc.text("GST Summary", 15, finalY)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)

  let gstSummaryY = finalY + 5
  transaction.taxes.forEach((tax) => {
    doc.text(`${tax.rate}% GST:`, 15, gstSummaryY)
    doc.text(`Taxable: ₹${tax.taxableAmount.toFixed(2)}`, 40, gstSummaryY)
    doc.text(`CGST: ₹${tax.cgst.toFixed(2)}`, 80, gstSummaryY)
    doc.text(`SGST: ₹${tax.sgst.toFixed(2)}`, 110, gstSummaryY)
    gstSummaryY += 5
  })

  // Right side - Total summary
  doc.setFont("helvetica", "normal")
  doc.text("Subtotal:", 140, finalY)
  doc.text(`₹${transaction.subtotal.toFixed(2)}`, 180, finalY, { align: "right" })

  doc.text("Total Tax:", 140, finalY + 5)
  doc.text(`₹${transaction.totalTax.toFixed(2)}`, 180, finalY + 5, { align: "right" })

  if (transaction.discount > 0) {
    doc.text("Discount:", 140, finalY + 10)
    doc.text(`₹${transaction.discount.toFixed(2)}`, 180, finalY + 10, { align: "right" })

    doc.setFont("helvetica", "bold")
    doc.text("Grand Total:", 140, finalY + 15)
    doc.text(`₹${transaction.total.toFixed(2)}`, 180, finalY + 15, { align: "right" })
  } else {
    doc.setFont("helvetica", "bold")
    doc.text("Grand Total:", 140, finalY + 10)
    doc.text(`₹${transaction.total.toFixed(2)}`, 180, finalY + 10, { align: "right" })
  }

  // Add payment method
  if (transaction.paymentMethod) {
    doc.setFont("helvetica", "normal")
    doc.text(`Payment Method: ${transaction.paymentMethod}`, 140, finalY + 20)
  }

  // Add a decorative line
  doc.setDrawColor(0, 102, 204) // Blue color
  doc.setLineWidth(0.5)
  doc.line(15, finalY + 25, 195, finalY + 25)

  // Add footer
  doc.setFontSize(8)
  doc.setTextColor(102, 102, 102) // Gray color
  doc.text("Thank you for choosing Generic Aadhaar Pharmacy!", 105, finalY + 30, { align: "center" })
  doc.text("This is a computer-generated invoice and does not require a signature.", 105, finalY + 35, {
    align: "center",
  })

  // Add QR code placeholder (in a real app, you would generate an actual QR code)
  doc.rect(15, finalY + 30, 20, 20)
  doc.setFontSize(6)
  doc.text("Scan for", 25, finalY + 35, { align: "center" })
  doc.text("digital copy", 25, finalY + 38, { align: "center" })

  // Add page number
  doc.setFontSize(8)
  doc.text(`Page 1 of 1`, 195, 287, { align: "right" })

  return doc
}

// Function to generate a PDF report
export const generateReportPDF = (title: string, data: any[]): jsPDF => {
  // Create a new PDF document
  const doc = new jsPDF()

  // Set document properties
  doc.setProperties({
    title: title,
    subject: "Pharmacy Report",
    author: "Generic Aadhaar ERP",
    keywords: "report, pharmacy, generic aadhaar",
    creator: "Generic Aadhaar ERP",
  })

  // Add header
  doc.setFontSize(20)
  doc.setTextColor(0, 51, 102) // Dark blue color
  doc.setFont("helvetica", "bold")
  doc.text("Generic Aadhaar Pharmacy", 105, 20, { align: "center" })

  doc.setFontSize(16)
  doc.text(title, 105, 30, { align: "center" })

  doc.setFontSize(10)
  doc.setTextColor(102, 102, 102) // Gray color
  doc.setFont("helvetica", "normal")
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 38, { align: "center" })

  // Add a decorative line
  doc.setDrawColor(0, 102, 204) // Blue color
  doc.setLineWidth(0.5)
  doc.line(15, 42, 195, 42)

  // Generate the table based on data type
  if (data.length > 0) {
    const firstItem = data[0]
    const columns = Object.keys(firstItem)

    // Create table header
    const tableColumn = columns.map((col) => {
      // Convert camelCase to Title Case
      return col.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())
    })

    // Create table rows
    const tableRows = data.map((item) => {
      return columns.map((col) => {
        const value = item[col]

        // Format values based on type
        if (typeof value === "number") {
          return value.toFixed(2)
        } else if (value === null || value === undefined) {
          return "-"
        } else {
          return value.toString()
        }
      })
    })

    // Generate the table
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 3,
        lineColor: [220, 220, 220],
      },
      headStyles: {
        fillColor: [0, 102, 204],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240],
      },
    })
  } else {
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text("No data available for this report", 105, 60, { align: "center" })
  }

  // Add footer
  doc.setFontSize(8)
  doc.setTextColor(102, 102, 102)
  doc.text("Generated by Generic Aadhaar ERP", 105, 280, { align: "center" })
  doc.text(`Page 1 of 1`, 195, 287, { align: "right" })

  return doc
}

// Function to download the PDF
export const downloadPDF = (doc: jsPDF, filename: string): void => {
  doc.save(filename)
}

// Function to open the PDF in a new tab
export const openPDF = (doc: jsPDF): void => {
  const pdfBlob = doc.output("blob")
  const pdfUrl = URL.createObjectURL(pdfBlob)
  window.open(pdfUrl, "_blank")
}
