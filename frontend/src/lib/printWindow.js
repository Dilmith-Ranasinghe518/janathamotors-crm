/**
 * Print a window we just filled with document.write. Printing is triggered from the app's own
 * script, not an inline <script> in the written page, which the Content-Security-Policy blocks.
 */
export function printWritten(win, { closeAfter = false } = {}) {
  win.document.close()
  win.focus()
  if (closeAfter) win.onafterprint = () => win.close()
  // Give the browser a moment to lay out the written page before opening the print dialog.
  setTimeout(() => win.print(), 300)
}
