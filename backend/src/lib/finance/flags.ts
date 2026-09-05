import { featureFlags } from "@/config/feature-flags";

export function isFinanceMarketplaceEnabled(): boolean {
  return featureFlags.financeMarketplace;
}

export function isFinanceEligibilityApiEnabled(): boolean {
  return featureFlags.financeMarketplace && featureFlags.financeEligibilityApi;
}

export function isFinanceCompareApiEnabled(): boolean {
  return featureFlags.financeMarketplace && featureFlags.financeCompareApi;
}

export function isFinanceSoftApprovalEnabled(): boolean {
  return featureFlags.financeMarketplace && featureFlags.financeSoftApproval;
}

export function isFinanceDocumentsApiEnabled(): boolean {
  return featureFlags.financeMarketplace && featureFlags.financeDocumentsApi;
}
