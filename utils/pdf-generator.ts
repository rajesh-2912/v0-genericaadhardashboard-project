/**
 * PDF generation utilities for invoices
 */
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import type { Transaction } from "../types/erp-types"

/**
 * Generate a PDF for an invoice
 * @param invoice Invoice data
 * @returns PDF as Blob
 */
export const generateInvoicePDF = async (invoice: Transaction): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      // Create new PDF document
      const doc = new jsPDF()

      // Add header
      doc.setFontSize(20)
      doc.text("Generic Aadhaar Pharmacy", 105, 20, { align: "center" })

      doc.setFontSize(12)
      doc.text("Invoice", 105, 30, { align: "center" })

      // Add invoice details
      doc.setFontSize(10)
      doc.text(`Invoice #: ${invoice.id}`, 15, 40)
      doc.text(`Date: ${invoice.date}`, 15, 45)
      doc.text(`Time: ${invoice.time}`, 15, 50)

      // Add customer details
      doc.text(`Customer: ${invoice.customer}`, 15, 60)
      doc.text(`Mobile: ${invoice.mobile}`, 15, 65)
      if (invoice.doctor) {
        doc.text(`Doctor: ${invoice.doctor}`, 15, 70)
      }
      if (invoice.paymentMethod) {
        doc.text(`Payment Method: ${invoice.paymentMethod}`, 15, 75)
      }

      // Add items table
      const tableColumn = ["Item", "Batch", "Qty", "Price", "GST", "Total"]
      const tableRows = invoice.items.map((item) => [
        item.name,
        item.batch,
        item.quantity.toString(),
        `₹${item.price.toFixed(2)}`,
        `${item.gstRate}%`,
        `₹${item.total.toFixed(2)}`,
      ])

      // @ts-ignore - jspdf-autotable types are not included
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 85,
        theme: "grid",
        headStyles: {
          fillColor: [14, 165, 233], // brand-500 color
          textColor: 255,
        },
      })

      // Add summary
      const finalY = (doc as any).lastAutoTable.finalY || 120
      doc.text(`Subtotal: ₹${invoice.subtotal.toFixed(2)}`, 150, finalY + 10, { align: "right" })

      // Add GST breakdown
      let yOffset = finalY + 15
      invoice.taxes.forEach((tax) => {
        doc.text(`GST (${tax.rate}%): ₹${tax.amount.toFixed(2)}`, 150, yOffset, { align: "right" })
        yOffset += 5
      })

      doc.text(`Discount: ₹${invoice.discount.toFixed(2)}`, 150, yOffset, { align: "right" })
      doc.text(`Total: ₹${invoice.total.toFixed(2)}`, 150, yOffset + 5, { align: "right" })

      // Add footer
      doc.setFontSize(8)
      doc.text("Thank you for shopping with Generic Aadhaar Pharmacy!", 105, yOffset + 20, { align: "center" })
      doc.text("For any queries, please contact us at 1800-XXX-XXXX", 105, yOffset + 25, { align: "center" })

      // Get PDF as blob
      const pdfBlob = doc.output("blob")
      resolve(pdfBlob)
    } catch (error) {
      console.error("Error generating PDF:", error)
      reject(error)
    }
  })
}

/**
 * Download a PDF file
 * @param blob PDF blob
 * @param filename Filename
 */
export const downloadPDF = (blob: Blob, filename: string): void => {
  // Create a URL for the blob
  const url = URL.createObjectURL(blob)

  // Create a temporary anchor element
  const a = document.createElement("a")
  a.href = url
  a.download = filename

  // Append to body, click, and remove
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  // Clean up
  URL.revokeObjectURL(url)
}
