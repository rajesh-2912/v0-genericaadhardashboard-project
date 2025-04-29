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

    // Add logo and header
    doc.setFontSize(20)
    doc.setTextColor(39, 174, 96) // Green color for header
    doc.text("Generic Aadhaar Pharmacy", pageWidth / 2, 15, { align: "center" })

    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100) // Gray color for address
    doc.text("123 Health Street, Medical District", pageWidth / 2, 22, { align: "center" })
    doc.text("Phone: +91 9876543210 | Email: care@genericaadhaar.com", pageWidth / 2, 27, { align: "center" })

    // Add a line separator
    doc.setDrawColor(39, 174, 96) // Green color for line
    doc.setLineWidth(0.5)
    doc.line(10, 30, pageWidth - 10, 30)

    // Invoice details
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text("INVOICE", 10, 40)

    doc.setFontSize(10)
    doc.text(`Invoice #: ${transaction.id.substring(0, 8)}`, 10, 48)
    doc.text(`Date: ${transaction.date}`, 10, 53)
    doc.text(`Time: ${transaction.time}`, 10, 58)

    // Customer details
    doc.text("Customer Details:", pageWidth - 70, 48)
    doc.text(`Name: ${transaction.customer}`, pageWidth - 70, 53)
    doc.text(`Mobile: ${transaction.mobile}`, pageWidth - 70, 58)
    if (transaction.doctor) {
      doc.text(`Doctor: ${transaction.doctor}`, pageWidth - 70, 63)
    }

    // Payment method
    if (transaction.paymentMethod) {
      doc.text(`Payment Method: ${transaction.paymentMethod}`, 10, 63)
    }

    // Referral bonus
    if (mergedOptions.showReferralBonus && mergedOptions.referralName && mergedOptions.referralAmount) {
      doc.setTextColor(39, 174, 96) // Green color for referral
      doc.text(
        `Referral Bonus: ₹${mergedOptions.referralAmount.toFixed(2)} (${mergedOptions.referralName})`,
        pageWidth - 70,
        68,
      )
      doc.setTextColor(0, 0, 0) // Reset color
    }

    // Items table
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
      startY: 75,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 1 },
      headStyles: { fillColor: [39, 174, 96], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [240, 240, 240] },
    })

    // Calculate the Y position after the table
    const finalY = (doc as any).lastAutoTable.finalY + 10

    // Summary section
    doc.text("Summary:", 10, finalY)
    doc.text(`Subtotal: ₹${transaction.subtotal.toFixed(2)}`, 10, finalY + 7)

    // GST breakdown
    if (transaction.taxes && transaction.taxes.length > 0) {
      let yPos = finalY + 14
      transaction.taxes.forEach((tax, index) => {
        doc.text(`GST ${tax.rate}%: ₹${tax.amount.toFixed(2)}`, 10, yPos)
        yPos += 5
      })
      doc.text(`Total Tax: ₹${transaction.totalTax.toFixed(2)}`, 10, yPos)
      yPos += 5

      if (transaction.discount > 0) {
        doc.text(`Discount: ₹${transaction.discount.toFixed(2)}`, 10, yPos)
        yPos += 5
      }

      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text(`Total Amount: ₹${transaction.total.toFixed(2)}`, 10, yPos)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
    } else {
      // Simple summary without tax breakdown
      if (transaction.discount > 0) {
        doc.text(`Discount: ₹${transaction.discount.toFixed(2)}`, 10, finalY + 14)
      }
      doc.text(`Total Tax: ₹${transaction.totalTax.toFixed(2)}`, 10, finalY + 21)

      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text(`Total Amount: ₹${transaction.total.toFixed(2)}`, 10, finalY + 28)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
    }

    // Add quote
    if (mergedOptions.includeQuote && mergedOptions.quote) {
      const quoteY = doc.internal.pageSize.height - 30
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.setFont("helvetica", "italic")
      doc.text(mergedOptions.quote, pageWidth / 2, quoteY, { align: "center" })
      doc.setFont("helvetica", "normal")
    }

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
