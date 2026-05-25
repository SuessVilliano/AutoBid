export type VaultDocSource = "uploaded" | "generated";
export type VaultDocStatus = "draft" | "approved";

export type VaultDoc = {
  id: string;
  kind: string;
  title: string;
  source: VaultDocSource;
  status: VaultDocStatus;
  markdown?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  /** Browser-only demo mode: base64 of the file. */
  fileBase64?: string;
  /** Supabase mode: object key in the `vault` storage bucket. */
  storagePath?: string;
  createdAt: number;
  updatedAt: number;
};

export const DOC_KINDS = [
  "Capability statement",
  "Past performance",
  "Key personnel resumes",
  "Certifications (8(a)/WOSB/SDVOSB)",
  "Financials",
  "SAM / registration",
  "Reusable templates",
] as const;

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result as string;
      const idx = r.indexOf(",");
      resolve(idx >= 0 ? r.slice(idx + 1) : r);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function fmtFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
