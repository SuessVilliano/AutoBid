"use client";

export type NaicsCode = {
  code: string;
  label: string;
  primary?: boolean;
  on: boolean;
};

export type CompanyProfile = {
  id: string;
  name: string;
  email: string;
  websites: string[];
  naics: NaicsCode[];
  minValue: number;
  maxValue: number;
  serviceStates: string[];
  setAsides: string[];
  description: string;
};

export const LIV8_STARTER: Omit<CompanyProfile, "id"> = {
  name: "LIV8 Digital",
  email: "contracts@liv8.co",
  websites: ["https://liv8.co", "https://liv8ai.com"],
  naics: [
    { code: "541613", label: "Marketing Consulting Services", primary: true, on: true },
    { code: "541810", label: "Advertising Agencies", on: true },
    { code: "541511", label: "Custom Computer Programming Services", on: true },
    { code: "541512", label: "Computer Systems Design Services", on: true },
    { code: "541519", label: "Other Computer Related Services", on: true },
    { code: "518210", label: "Data Processing, Hosting, and Related Services", on: true },
    { code: "541611", label: "Administrative Management and General Management Consulting", on: false },
    { code: "541715", label: "Research and Development in Physical, Engineering, and Life Sciences", on: false },
  ],
  minValue: 25000,
  maxValue: 5000000,
  serviceStates: [],
  setAsides: [],
  description: "Digital marketing and AI services agency.",
};

export function enabledNaics(profile: CompanyProfile | null): string[] {
  if (!profile) return [];
  return profile.naics.filter((n) => n.on).map((n) => n.code);
}
