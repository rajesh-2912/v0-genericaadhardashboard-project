import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type { Transaction, TransactionItem } from "../types/erp-types"

interface EnhancedPDFOptions {
  showReferralBonus?: boolean
  referralName?: string
  referralAmount?: number
  includeQuote?: boolean
  quote?: string
}

export const generateEnhancedInvoicePDF = (transaction: Transaction, options: EnhancedPDFOptions = {}): string => {
  try {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width

    // Default options
    const defaultOptions: EnhancedPDFOptions = {
      showReferralBonus: false,
      referralName: "",
      referralAmount: 0,
      includeQuote: true,
      quote: "Thank you for choosing Generic Aadhaar. Your health is our priority!",
    }

    const mergedOptions = { ...defaultOptions, ...options }

    // Store details
    const storeDetails = {
      name: "Generic Aadhaar Pharmacy",
      address: "1-18 near gandhi chowk, jammikunta 505122",
      contact: "+91 8688729596",
      email: "rajeshchandha4@gmail.com",
      grievances: "For grievances: rajeshchandha4@gmail.com",
    }

    // Add logo and header
    doc.setFontSize(22)
    doc.setTextColor(39, 174, 96) // Green color for header
    doc.text(storeDetails.name, pageWidth / 2, 15, { align: "center" })

    // Pharmacy details
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100) // Gray color for address
    doc.text(storeDetails.address, pageWidth / 2, 22, { align: "center" })
    doc.text(`Phone: ${storeDetails.contact} | Email: ${storeDetails.email}`, pageWidth / 2, 27, { align: "center" })

    // Add a line separator
    doc.setDrawColor(39, 174, 96) // Green color for line
    doc.setLineWidth(0.5)
    doc.line(10, 30, pageWidth - 10, 30)

    // Invoice details with attractive styling
    doc.setFillColor(245, 247, 250) // Light blue-gray background
    doc.rect(10, 35, pageWidth - 20, 30, "F")

    doc.setFontSize(14)
    doc.setTextColor(39, 174, 96)
    doc.text("INVOICE", 15, 45)

    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.text(`Invoice #: ${transaction.id.substring(0, 8)}`, 15, 52)
    doc.text(`Date: ${transaction.date}`, 15, 58)
    doc.text(`Time: ${transaction.time}`, 15, 64)

    // Customer details with attractive styling
    doc.setFillColor(235, 250, 242) // Light green background
    doc.rect(pageWidth / 2 + 5, 35, pageWidth / 2 - 15, 30, "F")

    doc.setFontSize(11)
    doc.setTextColor(39, 174, 96)
    doc.text("Customer Details:", pageWidth / 2 + 10, 45)

    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.text(`Name: ${transaction.customer}`, pageWidth / 2 + 10, 52)
    doc.text(`Mobile: ${transaction.mobile}`, pageWidth / 2 + 10, 58)
    if (transaction.doctor) {
      doc.text(`Doctor: ${transaction.doctor}`, pageWidth / 2 + 10, 64)
    }

    // Payment method
    if (transaction.paymentMethod) {
      doc.setTextColor(39, 174, 96)
      doc.text(`Payment Method: ${transaction.paymentMethod}`, 15, 75)
      doc.setTextColor(60, 60, 60)
    }

    // Referral bonus
    if (mergedOptions.showReferralBonus && mergedOptions.referralName && mergedOptions.referralAmount) {
      doc.setTextColor(39, 174, 96) // Green color for referral
      doc.text(
        `Referral Bonus: ₹${mergedOptions.referralAmount.toFixed(2)} (${mergedOptions.referralName})`,
        pageWidth / 2 + 10,
        75,
      )
      doc.setTextColor(60, 60, 60) // Reset color
    }

    // Items table with improved styling
    const tableColumn = ["S.No", "Product", "Batch", "Expiry", "MRP", "Price", "Qty", "GST %", "Amount"]

    const tableRows = transaction.items.map((item: TransactionItem, index: number) => [
      index + 1,
      item.name,
      item.batch,
      item.expiry,
      `₹${item.mrp.toFixed(2)}`,
      `₹${item.price.toFixed(2)}`,
      item.quantity,
      `${item.gstRate}%`,
      `₹${(item.price * item.quantity).toFixed(2)}`,
    ])

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 80,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 1 },
      headStyles: { fillColor: [39, 174, 96], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [240, 250, 245] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 40 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { cellWidth: 15 },
        5: { cellWidth: 15 },
        6: { cellWidth: 10 },
        7: { cellWidth: 15 },
        8: { cellWidth: 20 },
      },
    })

    // Calculate the Y position after the table
    const finalY = (doc as any).lastAutoTable.finalY + 10

    // Summary section with attractive styling
    doc.setFillColor(235, 250, 242) // Light green background
    doc.rect(10, finalY, pageWidth - 20, 50, "F")

    doc.setFontSize(12)
    doc.setTextColor(39, 174, 96)
    doc.text("Summary", 15, finalY + 10)

    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.text(`Subtotal: ₹${transaction.subtotal.toFixed(2)}`, 15, finalY + 20)

    // GST breakdown
    if (transaction.taxes && transaction.taxes.length > 0) {
      let yPos = finalY + 30
      transaction.taxes.forEach((tax, index) => {
        doc.text(`GST ${tax.rate}%: ₹${tax.amount.toFixed(2)}`, 15, yPos)
        yPos += 6
      })
      doc.text(`Total Tax: ₹${transaction.totalTax.toFixed(2)}`, 15, yPos)
      yPos += 6

      if (transaction.discount > 0) {
        doc.text(`Discount: ₹${transaction.discount.toFixed(2)}`, 15, yPos)
        yPos += 6
      }

      // Total amount with highlight box
      doc.setFillColor(39, 174, 96) // Green background
      doc.rect(pageWidth / 2, finalY + 10, pageWidth / 2 - 20, 15, "F")

      doc.setFontSize(12)
      doc.setTextColor(255, 255, 255) // White text
      doc.setFont("helvetica", "bold")
      doc.text(`Total Amount: ₹${transaction.total.toFixed(2)}`, pageWidth / 2 + 5, finalY + 20)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(60, 60, 60)
    } else {
      // Simple summary without tax breakdown
      if (transaction.discount > 0) {
        doc.text(`Discount: ₹${transaction.discount.toFixed(2)}`, 15, finalY + 30)
      }
      doc.text(`Total Tax: ₹${transaction.totalTax.toFixed(2)}`, 15, finalY + 36)

      // Total amount with highlight box
      doc.setFillColor(39, 174, 96) // Green background
      doc.rect(pageWidth / 2, finalY + 10, pageWidth / 2 - 20, 15, "F")

      doc.setFontSize(12)
      doc.setTextColor(255, 255, 255) // White text
      doc.setFont("helvetica", "bold")
      doc.text(`Total Amount: ₹${transaction.total.toFixed(2)}`, pageWidth / 2 + 5, finalY + 20)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(60, 60, 60)
    }

    // Add quote
    if (mergedOptions.includeQuote && mergedOptions.quote) {
      const quoteY = doc.internal.pageSize.height - 30
      doc.setFontSize(9)
      doc.setTextColor(39, 174, 96)
      doc.setFont("helvetica", "italic")
      doc.text(mergedOptions.quote, pageWidth / 2, quoteY, { align: "center" })
      doc.setFont("helvetica", "normal")
    }

    // Grievances contact
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(storeDetails.grievances, pageWidth / 2, doc.internal.pageSize.height - 20, { align: "center" })

    // Footer
    const footerY = doc.internal.pageSize.height - 15
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text("This is a computer-generated invoice and does not require a signature.", pageWidth / 2, footerY, {
      align: "center",
    })

    // Convert to base64
    const pdfBase64 = doc.output("datauristring")
    return pdfBase64
  } catch (error) {
    console.error("Error generating PDF:", error)
    return ""
  }
}

export default generateEnhancedInvoicePDF
