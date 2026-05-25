"use client";

import { LIV8_STARTER, type CompanyProfile } from "./companyProfile";

export type User = {
  id: string;
  email: string;
  name: string;
  companies: CompanyProfile[];
  activeCompanyId: string;
  createdAt: number;
};

const USERS_KEY = "autobid:users:v1";
const SESSION_KEY = "autobid:session:v1";

export function loadUsers(): User[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as User[]) : [];
  } catch {
    return [];
  }
}

export function saveUsers(users: User[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function currentUser(): User | null {
  if (typeof window === "undefined") return null;
  const id = window.localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  return loadUsers().find((u) => u.id === id) ?? null;
}

export function login(email: string, name?: string): User {
  const users = loadUsers();
  let user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    const cid = `co-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    user = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      email,
      name: name || email.split("@")[0],
      companies: [defaultCompany(cid, name || email.split("@")[0])],
      activeCompanyId: cid,
      createdAt: Date.now(),
    };
    users.push(user);
    saveUsers(users);
  }
  window.localStorage.setItem(SESSION_KEY, user.id);
  return user;
}

export function logout(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

export function updateUser(updated: User): void {
  const users = loadUsers().map((u) => (u.id === updated.id ? updated : u));
  saveUsers(users);
}

export function activeCompany(user: User | null): CompanyProfile | null {
  if (!user) return null;
  return user.companies.find((c) => c.id === user.activeCompanyId) ?? user.companies[0] ?? null;
}

export function setActiveCompany(user: User, companyId: string): User {
  const next = { ...user, activeCompanyId: companyId };
  updateUser(next);
  return next;
}

export function addCompany(user: User, name: string): User {
  const cid = `co-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const next: User = {
    ...user,
    companies: [...user.companies, defaultCompany(cid, name)],
    activeCompanyId: cid,
  };
  updateUser(next);
  return next;
}

export function updateActiveCompany(user: User, patch: Partial<CompanyProfile>): User {
  const companies = user.companies.map((c) =>
    c.id === user.activeCompanyId ? { ...c, ...patch } : c,
  );
  const next = { ...user, companies };
  updateUser(next);
  return next;
}

export function removeCompany(user: User, companyId: string): User {
  if (user.companies.length <= 1) return user;
  const companies = user.companies.filter((c) => c.id !== companyId);
  const next: User = {
    ...user,
    companies,
    activeCompanyId:
      user.activeCompanyId === companyId ? companies[0].id : user.activeCompanyId,
  };
  updateUser(next);
  return next;
}

function defaultCompany(id: string, name: string): CompanyProfile {
  return {
    id,
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

export function loginAsLiv8Demo(): User {
  const users = loadUsers();
  let user = users.find((u) => u.email === "demo@liv8.co");
  if (!user) {
    const cid = `co-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    user = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      email: "demo@liv8.co",
      name: "LIV8 demo",
      companies: [{ ...LIV8_STARTER, id: cid }],
      activeCompanyId: cid,
      createdAt: Date.now(),
    };
    users.push(user);
    saveUsers(users);
  }
  window.localStorage.setItem(SESSION_KEY, user.id);
  return user;
}
