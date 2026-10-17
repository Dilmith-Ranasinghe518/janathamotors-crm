/**
 * Text encoded in a part's QR code. It stays on one line because USB scanners "type" the
 * payload, and a line break would act as Enter and split it into several scans.
 */
export function qrPayload(product) {
  return [
    `Item Code: ${product.item_code || product.item_no}`,
    `Item: ${product.name}`,
    product.store && `Store: ${product.store.code}`,
    product.shelf_location && `Location: ${product.shelf_location}`,
  ]
    .filter(Boolean)
    .join(' | ')
}

/** Pulls the Item Code out of scanned QR text; any other text is returned unchanged. */
export function codeFromQr(text) {
  const match = /Item Code:\s*([^|]+)/i.exec(String(text ?? ''))
  return match ? match[1].trim() : text
}
