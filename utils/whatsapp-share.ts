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
export const shareInvoiceViaWhatsApp = async (
  invoice: Transaction,
  pdfBlob: Blob,
  phoneNumber: string,
  customMessage?: string,
): Promise<void> => {
  try {
    // Format phone number (remove any non-digit characters)
    const formattedPhone = phoneNumber.replace(/\D/g, "")

    // Create a default message if none provided
    const message =
      customMessage ||
      `*Invoice #${invoice.id.substring(0, 8).toUpperCase()}*\n\n` +
        `Customer: ${invoice.customer}\n` +
        `Date: ${invoice.date}\n` +
        `Amount: ₹${invoice.total.toFixed(2)}\n\n` +
        `Thank you for your purchase!`

    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message)

    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`

    // Open WhatsApp in a new tab
    window.open(whatsappUrl, "_blank")

    return Promise.resolve()
  } catch (error) {
    console.error("Error sharing via WhatsApp:", error)
    return Promise.reject(error)
  }
}
