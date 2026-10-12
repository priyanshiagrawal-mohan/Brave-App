// Reads the amount and UTR off a UPI payment screenshot (GPay, PhonePe, Paytm, bank apps).
// OCR runs in the browser with tesseract.js, loaded only when the first receipt is added.

import type { Worker } from 'tesseract.js'

export interface ReceiptRead {
  amount: number | null
  utr: string | null
  /** Other plausible readings of the amount, e.g. when OCR turned "₹8,000" into "38,000". */
  alts: number[]
}

let worker: Promise<Worker> | null = null

function getWorker() {
  if (!worker) {
    // Worker, engine and language data ship with the app (public/ocr), so reading works
    // where CDN fetches are blocked, e.g. the published prototype.
    const base = new URL('ocr/', document.baseURI).href
    worker = import('tesseract.js').then(({ createWorker }) =>
      createWorker('eng', 1, { workerPath: base + 'worker.min.js', corePath: base, langPath: base, workerBlobURL: false }),
    )
    worker.catch(() => {
      worker = null
    })
  }
  return worker
}

export async function readReceipt(file: File): Promise<ReceiptRead> {
  try {
    const w = await getWorker()
    const { data } = await w.recognize(file)
    return parseReceiptText(data.text)
  } catch {
    // Offline or OCR failed: the student fills both fields.
    return { amount: null, utr: null, alts: [] }
  }
}

const UTR_LABEL = /(UTR|UPI\s*(?:Ref(?:erence)?|Transaction|Txn)\.?\s*(?:No|ID|Number)?|Transaction\s*(?:ID|No)|Ref(?:erence)?\s*(?:No|Number))\b\.?\s*[:#-]?\s*([0-9][0-9 ]{10,18}[0-9])/i

/** Pure parser, kept separate so it can be tested without OCR. */
export function parseReceiptText(raw: string): ReceiptRead {
  const text = raw.replace(/[|]/g, ' ')

  // UTR: UPI references are 12 digits. Prefer one next to a label, else any lone 12-digit run.
  let utr: string | null = null
  const labelled = text.match(UTR_LABEL)
  if (labelled) {
    const d = labelled[2].replace(/\s/g, '')
    if (d.length === 12) utr = d
  }
  if (!utr) {
    const lone = text.match(/(?<![\d])(\d{4}\s?\d{4}\s?\d{4})(?![\d])/)
    if (lone) utr = lone[1].replace(/\s/g, '')
  }

  // Amount: numbers after ₹ / Rs / INR. OCR often misreads ₹ as ¥ % = £ € or Z, so accept those too.
  const found: number[] = []
  const re = /(?:₹|Rs\.?|INR|[¥%=£€Z])\s*([0-9]{1,3}(?:,[0-9]{2,3})+|[0-9]+)(?:\.[0-9]{1,2})?/gi
  for (const m of text.matchAll(re)) found.push(Number(m[1].replace(/,/g, '')))

  // A headline line that is just a number, e.g. "38,000". The ₹ may have been read as 2, 3 or 7,
  // so also offer the reading without that first digit when it is still a well-formed amount.
  for (const line of text.split(/\n/)) {
    const m = line.trim().match(/^([0-9]{1,3}(?:,[0-9]{2,3})+)(?:\.[0-9]{1,2})?$/)
    if (!m) continue
    found.push(Number(m[1].replace(/,/g, '')))
    const rest = m[1].slice(1)
    if (/^[237]/.test(m[1]) && /^[0-9]{1,3}(?:,[0-9]{2})*,[0-9]{3}$/.test(rest)) found.push(Number(rest.replace(/,/g, '')))
  }

  const alts = [...new Set(found.filter((n) => n > 0 && n < 10_000_000 && String(n) !== utr))]
  // The paid amount is the headline figure; screenshots rarely show a larger one.
  const amount = alts.length ? Math.max(...alts) : null
  return { amount, utr, alts }
}

/**
 * Choose the amount reading that fits: the one that completes the expected total,
 * else the largest that doesn't overshoot it.
 */
export function pickAmount(r: ReceiptRead, remaining: number): number | null {
  if (!r.alts.length) return null
  if (!remaining) return r.amount
  if (r.alts.includes(remaining)) return remaining
  const fits = r.alts.filter((n) => n <= remaining)
  return fits.length ? Math.max(...fits) : r.amount
}

export const isUtr = (s: string) => /^\d{12}$/.test(s)
