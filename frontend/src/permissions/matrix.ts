import type { AppRole } from "@/types/database";

/**
 * Coarse capability flags for UI (fine-grained checks still rely on RLS).
 * Extend as modules grow.
 */
export const ROLE_CAPABILITIES: Record<
  AppRole,
  {
    manageUsers: boolean;
    manageMarketplace: boolean;
    financeConsole: boolean;
    dealerConsole: boolean;
    partsConsole: boolean;
    serviceConsole: boolean;
  }
> = {
  customer: {
    manageUsers: false,
    manageMarketplace: false,
    financeConsole: false,
    dealerConsole: false,
    partsConsole: false,
    serviceConsole: false,
  },
  super_admin: {
    manageUsers: true,
    manageMarketplace: true,
    financeConsole: true,
    dealerConsole: true,
    partsConsole: true,
    serviceConsole: true,
  },
  admin: {
    manageUsers: true,
    manageMarketplace: true,
    financeConsole: true,
    dealerConsole: true,
    partsConsole: true,
    serviceConsole: true,
  },
  dealer: {
    manageUsers: false,
    manageMarketplace: true,
    financeConsole: false,
    dealerConsole: true,
    partsConsole: false,
    serviceConsole: false,
  },
  used_car_dealer: {
    manageUsers: false,
    manageMarketplace: true,
    financeConsole: false,
    dealerConsole: true,
    partsConsole: false,
    serviceConsole: false,
  },
  new_car_dealer: {
    manageUsers: false,
    manageMarketplace: true,
    financeConsole: false,
    dealerConsole: true,
    partsConsole: false,
    serviceConsole: false,
  },
  bike_dealer: {
    manageUsers: false,
    manageMarketplace: true,
    financeConsole: false,
    dealerConsole: true,
    partsConsole: false,
    serviceConsole: false,
  },
  truck_dealer: {
    manageUsers: false,
    manageMarketplace: true,
    financeConsole: false,
    dealerConsole: true,
    partsConsole: false,
    serviceConsole: false,
  },
  dsa_agent: {
    manageUsers: false,
    manageMarketplace: false,
    financeConsole: true,
    dealerConsole: false,
    partsConsole: false,
    serviceConsole: false,
  },
  bank_nbfc: {
    manageUsers: false,
    manageMarketplace: false,
    financeConsole: true,
    dealerConsole: false,
    partsConsole: false,
    serviceConsole: false,
  },
  finance_manager: {
    manageUsers: false,
    manageMarketplace: false,
    financeConsole: true,
    dealerConsole: false,
    partsConsole: false,
    serviceConsole: false,
  },
  service_center: {
    manageUsers: false,
    manageMarketplace: false,
    financeConsole: false,
    dealerConsole: false,
    partsConsole: false,
    serviceConsole: true,
  },
  service_technician: {
    manageUsers: false,
    manageMarketplace: false,
    financeConsole: false,
    dealerConsole: false,
    partsConsole: false,
    serviceConsole: true,
  },
  parts_seller: {
    manageUsers: false,
    manageMarketplace: false,
    financeConsole: false,
    dealerConsole: false,
    partsConsole: true,
    serviceConsole: false,
  },
  auction_partner: {
    manageUsers: false,
    manageMarketplace: true,
    financeConsole: false,
    dealerConsole: false,
    partsConsole: false,
    serviceConsole: false,
  },
  service_partner: {
    manageUsers: false,
    manageMarketplace: false,
    financeConsole: false,
    dealerConsole: false,
    partsConsole: false,
    serviceConsole: true,
  },
  preowned_dealer: {
    manageUsers: false,
    manageMarketplace: true,
    financeConsole: false,
    dealerConsole: true,
    partsConsole: false,
    serviceConsole: false,
  },
};
