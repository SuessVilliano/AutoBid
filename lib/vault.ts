"use client";

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
  fileBase64?: string;
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

const KEY = "autobid:vault:v1";

export function loadDocs(): VaultDoc[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as VaultDoc[]) : [];
  } catch {
    return [];
  }
}

export function saveDocs(docs: VaultDoc[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(docs));
}

export function upsertDoc(doc: VaultDoc): VaultDoc[] {
  const docs = loadDocs();
  const i = docs.findIndex((d) => d.id === doc.id);
  const next = i === -1 ? [...docs, doc] : docs.map((d, ix) => (ix === i ? doc : d));
  saveDocs(next);
  return next;
}

export function removeDoc(id: string): VaultDoc[] {
  const next = loadDocs().filter((d) => d.id !== id);
  saveDocs(next);
  return next;
}

export function docsForKind(kind: string): VaultDoc[] {
  return loadDocs().filter((d) => d.kind === kind);
}

export function genId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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
