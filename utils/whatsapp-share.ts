/**
 * Utility functions for sharing via WhatsApp
 */

import type { Transaction } from "../types/erp-types"

/**
 * Generate a WhatsApp share link for an invoice
 *
 * @param invoice The invoice transaction to share
 * @param pdfUrl Optional URL to the PDF file (if already generated)
 * @returns WhatsApp deep link URL
 */
export function generateWhatsAppShareLink(invoice: Transaction, pdfUrl?: string): string {
  // Format the invoice details for WhatsApp message
  const message = formatInvoiceForWhatsApp(invoice, pdfUrl)

  // Encode the message for URL
  const encodedMessage = encodeURIComponent(message)

  // Create WhatsApp deep link
  return `https://wa.me/?text=${encodedMessage}`
}

/**
 * Format invoice details for WhatsApp message
 *
 * @param invoice The invoice transaction
 * @param pdfUrl Optional URL to the PDF file
 * @returns Formatted message text
 */
function formatInvoiceForWhatsApp(invoice: Transaction, pdfUrl?: string): string {
  // Create a nicely formatted message
  let message = `*Generic Aadhaar Pharmacy*\n\n`
  message += `*Invoice #${invoice.id}*\n`
  message += `Date: ${invoice.date} | Time: ${invoice.time}\n\n`

  message += `*Customer Details:*\n`
  message += `Name: ${invoice.customer}\n`
  message += `Mobile: ${invoice.mobile}\n`
  if (invoice.doctor) {
    message += `Doctor: ${invoice.doctor}\n`
  }
  if (invoice.paymentMethod) {
    message += `Payment Method: ${invoice.paymentMethod}\n`
  }

  message += `\n*Items:*\n`
  invoice.items.forEach((item, index) => {
    message += `${index + 1}. ${item.name} (${item.batch}) - ${item.quantity} x ₹${item.price.toFixed(2)} = ₹${(item.price * item.quantity).toFixed(2)}\n`
  })

  message += `\n*Summary:*\n`
  message += `Subtotal: ₹${invoice.subtotal.toFixed(2)}\n`

  // Handle the new tax structure
  invoice.taxes.forEach((tax) => {
    message += `GST (${tax.rate}%): ₹${tax.amount.toFixed(2)}\n`
  })

  message += `Discount: ₹${invoice.discount.toFixed(2)}\n`
  message += `*Total: ₹${invoice.total.toFixed(2)}*\n\n`

  message += `Thank you for shopping with Generic Aadhaar Pharmacy!\n`

  // Add PDF link if available
  if (pdfUrl) {
    message += `\nView your invoice: ${pdfUrl}`
  }

  return message
}

/**
 * Share invoice via WhatsApp Web Share API if available, otherwise open in new tab
 *
 * @param invoice The invoice transaction to share
 * @param pdfBlob Optional PDF blob to share as file
 * @param customerPhone Customer phone number (optional)
 */
export async function shareInvoiceViaWhatsApp(
  invoice: Transaction,
  pdfBlob?: Blob,
  phoneNumber?: string,
): Promise<boolean> {
  try {
    // Format the invoice details for WhatsApp
    const invoiceDetails = `
*INVOICE #${invoice.id}*
Date: ${invoice.date}
Time: ${invoice.time}

*Customer Details*
Name: ${invoice.customer}
Mobile: ${invoice.mobile}
${invoice.doctor ? `Doctor: ${invoice.doctor}` : ""}
${invoice.paymentMethod ? `Payment Method: ${invoice.paymentMethod}` : ""}

*Items*
${invoice.items.map((item) => `- ${item.name} (${item.batch}) x${item.quantity} = ₹${(item.price * item.quantity).toFixed(2)}`).join("\n")}

*Summary*
Subtotal: ₹${invoice.subtotal.toFixed(2)}
${invoice.taxes.map((tax) => `GST (${tax.rate}%): ₹${tax.amount.toFixed(2)}`).join("\n")}
Discount: ₹${invoice.discount.toFixed(2)}
*Total: ₹${invoice.total.toFixed(2)}*

Thank you for shopping with Generic Aadhaar Pharmacy!
For any queries, please contact us at 1800-XXX-XXXX
`.trim()

    // Try to use the Web Share API if available
    if (navigator.share && pdfBlob) {
      try {
        const file = new File([pdfBlob], `Invoice-${invoice.id}.pdf`, { type: "application/pdf" })

        await navigator.share({
          title: `Invoice #${invoice.id}`,
          text: invoiceDetails,
          files: [file],
        })

        return true
      } catch (error) {
        console.log("Web Share API not fully supported or failed:", error)
        // Fall back to WhatsApp link
      }
    }

    // Create WhatsApp link
    let whatsappUrl = "https://wa.me/"

    // Add phone number if provided
    if (phoneNumber) {
      whatsappUrl += phoneNumber
    }

    // Add message text
    whatsappUrl += `?text=${encodeURIComponent(invoiceDetails)}`

    // Open WhatsApp in a new window
    window.open(whatsappUrl, "_blank")

    return true
  } catch (error) {
    console.error("Error sharing via WhatsApp:", error)
    return false
  }
}
