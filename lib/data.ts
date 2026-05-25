"use client";

import { getBrowserSupabase } from "./supabase/client";
import { supabaseEnabled } from "./supabase/env";
import { LIV8_STARTER, type CompanyProfile, type NaicsCode } from "./companyProfile";
import type { VaultDoc } from "./vault";

export type AppUser = {
  id: string;
  email: string;
  name: string;
};

// ---------------------------------------------------------------------------
// Browser-local storage keys (demo / fallback mode)
// ---------------------------------------------------------------------------
const LS_USERS = "autobid:users:v1";
const LS_SESSION = "autobid:session:v1";
const LS_ACTIVE_COMPANY = "autobid:activeCompany:v2";
const LS_DEMO_COMPANIES = "autobid:demoCompanies:v1";
const LS_DEMO_NAICS = "autobid:demoNaics:v1";
const LS_DEMO_VAULT = "autobid:demoVault:v1";

type DemoUser = AppUser & { createdAt: number };

// =============================================================================
// AUTH
// =============================================================================

export async function getCurrentUser(): Promise<AppUser | null> {
  const sb = getBrowserSupabase();
  if (sb) {
    const { data } = await sb.auth.getUser();
    const u = data.user;
    if (!u) return null;
    return {
      id: u.id,
      email: u.email ?? "",
      name:
        (u.user_metadata?.full_name as string) ||
        (u.user_metadata?.name as string) ||
        (u.email ? u.email.split("@")[0] : "User"),
    };
  }
  // demo fallback
  if (typeof window === "undefined") return null;
  const sessionId = window.localStorage.getItem(LS_SESSION);
  if (!sessionId) return null;
  const users = JSON.parse(window.localStorage.getItem(LS_USERS) ?? "[]") as DemoUser[];
  const u = users.find((x) => x.id === sessionId);
  return u ? { id: u.id, email: u.email, name: u.name } : null;
}

export async function signInWithMagicLink(email: string): Promise<{ ok: boolean; error?: string }> {
  const sb = getBrowserSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };
  const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signInWithGoogle(): Promise<{ ok: boolean; error?: string }> {
  const sb = getBrowserSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };
  const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signInDemo(email: string, name?: string): Promise<AppUser> {
  if (typeof window === "undefined") throw new Error("no window");
  const users = JSON.parse(window.localStorage.getItem(LS_USERS) ?? "[]") as DemoUser[];
  let u = users.find((x) => x.email.toLowerCase() === email.toLowerCase());
  if (!u) {
    u = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      email,
      name: name || email.split("@")[0],
      createdAt: Date.now(),
    };
    users.push(u);
    window.localStorage.setItem(LS_USERS, JSON.stringify(users));
  }
  window.localStorage.setItem(LS_SESSION, u.id);
  // seed a starter company for first-time demo users
  const cos = await getAllCompanies(u.id);
  if (cos.length === 0) {
    await createCompany("LIV8 Digital", u.id, LIV8_STARTER);
  }
  return { id: u.id, email: u.email, name: u.name };
}

export async function signOut(): Promise<void> {
  const sb = getBrowserSupabase();
  if (sb) {
    await sb.auth.signOut();
    return;
  }
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LS_SESSION);
}

// =============================================================================
// COMPANIES
// =============================================================================

function rowToCompany(row: SupaCompany, naics: SupaNaics[]): CompanyProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? "",
    websites: row.websites ?? [],
    description: row.description ?? "",
    minValue: row.min_value,
    maxValue: row.max_value,
    serviceStates: row.service_states ?? [],
    setAsides: row.set_asides ?? [],
    naics: naics
      .filter((n) => n.company_id === row.id)
      .map((n) => ({
        code: n.code,
        label: n.label,
        primary: n.is_primary,
        on: n.enabled,
      })),
  };
}

export async function getAllCompanies(userId?: string): Promise<CompanyProfile[]> {
  const sb = getBrowserSupabase();
  if (sb) {
    const { data: companies, error } = await sb
      .from("companies")
      .select("*")
      .order("created_at", { ascending: true });
    if (error || !companies) return [];
    const ids = companies.map((c) => c.id);
    let naics: SupaNaics[] = [];
    if (ids.length) {
      const { data: n } = await sb.from("naics_codes").select("*").in("company_id", ids);
      naics = (n as SupaNaics[] | null) ?? [];
    }
    return (companies as SupaCompany[]).map((c) => rowToCompany(c, naics));
  }

  if (typeof window === "undefined") return [];
  const uid = userId ?? window.localStorage.getItem(LS_SESSION);
  if (!uid) return [];
  const all = JSON.parse(window.localStorage.getItem(LS_DEMO_COMPANIES) ?? "{}") as Record<string, CompanyProfile[]>;
  return all[uid] ?? [];
}

export async function getActiveCompany(): Promise<CompanyProfile | null> {
  const companies = await getAllCompanies();
  if (companies.length === 0) return null;
  if (typeof window === "undefined") return companies[0];
  const activeId = window.localStorage.getItem(LS_ACTIVE_COMPANY);
  if (activeId) {
    const found = companies.find((c) => c.id === activeId);
    if (found) return found;
  }
  return companies[0];
}

export function setActiveCompanyId(id: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_ACTIVE_COMPANY, id);
}

export async function createCompany(
  name: string,
  userId?: string,
  starter?: Omit<CompanyProfile, "id">,
): Promise<CompanyProfile> {
  const sb = getBrowserSupabase();
  if (sb) {
    const { data: user } = await sb.auth.getUser();
    if (!user.user) throw new Error("not signed in");
    const seed = starter ?? blankStarter(name);
    const { data: row, error } = await sb
      .from("companies")
      .insert({
        owner_id: user.user.id,
        name,
        email: seed.email,
        description: seed.description,
        websites: seed.websites,
        min_value: seed.minValue,
        max_value: seed.maxValue,
        service_states: seed.serviceStates,
        set_asides: seed.setAsides,
      })
      .select()
      .single();
    if (error || !row) throw error ?? new Error("insert failed");
    if (seed.naics.length) {
      await sb.from("naics_codes").insert(
        seed.naics.map((n) => ({
          company_id: row.id,
          code: n.code,
          label: n.label,
          is_primary: !!n.primary,
          enabled: n.on,
        })),
      );
    }
    const created = rowToCompany(row as SupaCompany, []);
    created.naics = seed.naics.map((n) => ({ ...n }));
    setActiveCompanyId(created.id);
    return created;
  }

  if (typeof window === "undefined") throw new Error("no window");
  const uid = userId ?? window.localStorage.getItem(LS_SESSION);
  if (!uid) throw new Error("not signed in");
  const all = JSON.parse(window.localStorage.getItem(LS_DEMO_COMPANIES) ?? "{}") as Record<string, CompanyProfile[]>;
  const seed = starter ?? blankStarter(name);
  const profile: CompanyProfile = {
    ...seed,
    name,
    id: `co-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  all[uid] = [...(all[uid] ?? []), profile];
  window.localStorage.setItem(LS_DEMO_COMPANIES, JSON.stringify(all));
  setActiveCompanyId(profile.id);
  return profile;
}

export async function updateCompany(
  id: string,
  patch: Partial<CompanyProfile>,
): Promise<CompanyProfile> {
  const sb = getBrowserSupabase();
  if (sb) {
    const fields: Record<string, unknown> = {};
    if (patch.name !== undefined) fields.name = patch.name;
    if (patch.email !== undefined) fields.email = patch.email;
    if (patch.description !== undefined) fields.description = patch.description;
    if (patch.websites !== undefined) fields.websites = patch.websites;
    if (patch.minValue !== undefined) fields.min_value = patch.minValue;
    if (patch.maxValue !== undefined) fields.max_value = patch.maxValue;
    if (patch.serviceStates !== undefined) fields.service_states = patch.serviceStates;
    if (patch.setAsides !== undefined) fields.set_asides = patch.setAsides;
    if (Object.keys(fields).length) {
      const { error } = await sb.from("companies").update(fields).eq("id", id);
      if (error) throw error;
    }
    if (patch.naics) {
      await sb.from("naics_codes").delete().eq("company_id", id);
      if (patch.naics.length) {
        await sb.from("naics_codes").insert(
          patch.naics.map((n) => ({
            company_id: id,
            code: n.code,
            label: n.label,
            is_primary: !!n.primary,
            enabled: n.on,
          })),
        );
      }
    }
    return (await getCompanyById(id))!;
  }

  if (typeof window === "undefined") throw new Error("no window");
  const uid = window.localStorage.getItem(LS_SESSION);
  if (!uid) throw new Error("not signed in");
  const all = JSON.parse(window.localStorage.getItem(LS_DEMO_COMPANIES) ?? "{}") as Record<string, CompanyProfile[]>;
  all[uid] = (all[uid] ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c));
  window.localStorage.setItem(LS_DEMO_COMPANIES, JSON.stringify(all));
  return all[uid].find((c) => c.id === id)!;
}

export async function deleteCompany(id: string): Promise<void> {
  const sb = getBrowserSupabase();
  if (sb) {
    await sb.from("companies").delete().eq("id", id);
    return;
  }
  if (typeof window === "undefined") return;
  const uid = window.localStorage.getItem(LS_SESSION);
  if (!uid) return;
  const all = JSON.parse(window.localStorage.getItem(LS_DEMO_COMPANIES) ?? "{}") as Record<string, CompanyProfile[]>;
  all[uid] = (all[uid] ?? []).filter((c) => c.id !== id);
  window.localStorage.setItem(LS_DEMO_COMPANIES, JSON.stringify(all));
}

async function getCompanyById(id: string): Promise<CompanyProfile | null> {
  const all = await getAllCompanies();
  return all.find((c) => c.id === id) ?? null;
}

function blankStarter(name: string): Omit<CompanyProfile, "id"> {
  return {
    name,
    email: "",
    websites: [],
    naics: [],
    minValue: 25000,
    maxValue: 5000000,
    serviceStates: [],
    setAsides: [],
    description: "",
  };
}

// =============================================================================
// VAULT DOCS
// =============================================================================

function rowToDoc(row: SupaVaultDoc): VaultDoc {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    source: row.source,
    status: row.status,
    markdown: row.markdown ?? undefined,
    fileName: row.file_name ?? undefined,
    fileType: row.file_type ?? undefined,
    fileSize: row.file_size ?? undefined,
    storagePath: row.storage_path ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export async function listVaultDocs(companyId: string): Promise<VaultDoc[]> {
  const sb = getBrowserSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("vault_docs")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return (data as SupaVaultDoc[]).map(rowToDoc);
  }
  if (typeof window === "undefined") return [];
  const all = JSON.parse(window.localStorage.getItem(LS_DEMO_VAULT) ?? "{}") as Record<string, VaultDoc[]>;
  return all[companyId] ?? [];
}

export async function createVaultDoc(
  companyId: string,
  doc: Omit<VaultDoc, "id" | "createdAt" | "updatedAt">,
  fileBlob?: Blob,
): Promise<VaultDoc> {
  const sb = getBrowserSupabase();
  if (sb) {
    let storagePath: string | undefined;
    if (fileBlob && doc.fileName) {
      const docId = crypto.randomUUID();
      storagePath = `${companyId}/${docId}/${encodeURIComponent(doc.fileName)}`;
      const { error: upErr } = await sb.storage
        .from("vault")
        .upload(storagePath, fileBlob, { upsert: true, contentType: doc.fileType });
      if (upErr) throw upErr;
    }
    const { data, error } = await sb
      .from("vault_docs")
      .insert({
        company_id: companyId,
        kind: doc.kind,
        title: doc.title,
        source: doc.source,
        status: doc.status,
        markdown: doc.markdown ?? null,
        file_name: doc.fileName ?? null,
        file_type: doc.fileType ?? null,
        file_size: doc.fileSize ?? null,
        storage_path: storagePath ?? null,
      })
      .select()
      .single();
    if (error || !data) throw error ?? new Error("insert failed");
    return rowToDoc(data as SupaVaultDoc);
  }

  if (typeof window === "undefined") throw new Error("no window");
  const all = JSON.parse(window.localStorage.getItem(LS_DEMO_VAULT) ?? "{}") as Record<string, VaultDoc[]>;
  const out: VaultDoc = {
    ...doc,
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  all[companyId] = [out, ...(all[companyId] ?? [])];
  window.localStorage.setItem(LS_DEMO_VAULT, JSON.stringify(all));
  return out;
}

export async function updateVaultDoc(
  companyId: string,
  id: string,
  patch: Partial<VaultDoc>,
): Promise<void> {
  const sb = getBrowserSupabase();
  if (sb) {
    const fields: Record<string, unknown> = {};
    if (patch.title !== undefined) fields.title = patch.title;
    if (patch.markdown !== undefined) fields.markdown = patch.markdown;
    if (patch.status !== undefined) fields.status = patch.status;
    if (Object.keys(fields).length === 0) return;
    const { error } = await sb.from("vault_docs").update(fields).eq("id", id);
    if (error) throw error;
    return;
  }
  if (typeof window === "undefined") return;
  const all = JSON.parse(window.localStorage.getItem(LS_DEMO_VAULT) ?? "{}") as Record<string, VaultDoc[]>;
  all[companyId] = (all[companyId] ?? []).map((d) =>
    d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d,
  );
  window.localStorage.setItem(LS_DEMO_VAULT, JSON.stringify(all));
}

export async function deleteVaultDoc(companyId: string, id: string): Promise<void> {
  const sb = getBrowserSupabase();
  if (sb) {
    const { data } = await sb.from("vault_docs").select("storage_path").eq("id", id).single();
    const path = (data as { storage_path?: string } | null)?.storage_path;
    if (path) await sb.storage.from("vault").remove([path]);
    await sb.from("vault_docs").delete().eq("id", id);
    return;
  }
  if (typeof window === "undefined") return;
  const all = JSON.parse(window.localStorage.getItem(LS_DEMO_VAULT) ?? "{}") as Record<string, VaultDoc[]>;
  all[companyId] = (all[companyId] ?? []).filter((d) => d.id !== id);
  window.localStorage.setItem(LS_DEMO_VAULT, JSON.stringify(all));
}

export async function vaultFileUrl(storagePath: string): Promise<string | null> {
  const sb = getBrowserSupabase();
  if (!sb) return null;
  const { data, error } = await sb.storage.from("vault").createSignedUrl(storagePath, 60 * 10);
  if (error || !data) return null;
  return data.signedUrl;
}

// =============================================================================
// Status helper for UI
// =============================================================================

export const dataMode: "supabase" | "demo" = supabaseEnabled ? "supabase" : "demo";

// =============================================================================
// Internal row types (mirror SQL schema)
// =============================================================================

type SupaCompany = {
  id: string;
  owner_id: string;
  name: string;
  email: string | null;
  description: string | null;
  websites: string[] | null;
  min_value: number;
  max_value: number;
  service_states: string[] | null;
  set_asides: string[] | null;
  created_at: string;
  updated_at: string;
};

type SupaNaics = {
  id: string;
  company_id: string;
  code: string;
  label: string;
  is_primary: boolean;
  enabled: boolean;
};

type SupaVaultDoc = {
  id: string;
  company_id: string;
  kind: string;
  title: string;
  source: "uploaded" | "generated";
  status: "draft" | "approved";
  markdown: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
};

// silence "unused" for the NaicsCode re-export type
export type { NaicsCode };
