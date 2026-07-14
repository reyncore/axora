/**
 * lib/upload/virus-scan.ts — Virus scan interface.
 *
 * Interface ini memungkinkan penambahan virus scanner nyata
 * (ClamAV, VirusTotal, AWS GuardDuty Malware Protection)
 * tanpa mengubah business logic di API routes.
 *
 * Default: NoopScanner (pass all) — untuk production dengan
 * volume kecil ini acceptable. Tambah real scanner saat:
 * - Platform sudah punya users aktif
 * - File dari public (bukan trusted users)
 * - Compliance requirements (GDPR, SOC2)
 */

export interface ScanResult {
  clean:  boolean
  threat: string | null  // nama threat jika ditemukan
}

export interface VirusScanner {
  scan(buffer: Buffer, fileName: string): Promise<ScanResult>
}

/**
 * NoopScanner — selalu return clean.
 * Dipakai sebagai default sampai real scanner dikonfigurasi.
 */
export class NoopScanner implements VirusScanner {
  async scan(_buffer: Buffer, _fileName: string): Promise<ScanResult> {
    return { clean: true, threat: null }
  }
}

/** Get active scanner dari env config */
export function getScanner(): VirusScanner {
  // TODO: check VIRUS_SCANNER_PROVIDER env var
  // "clamav" → ClamAvScanner
  // "virustotal" → VirusTotalScanner
  return new NoopScanner()
}
