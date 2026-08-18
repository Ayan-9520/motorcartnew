import { lazy } from "react";
import { lazyNamedWithRetry } from "@/lib/lazy-retry";

/** Code-split feature areas — keeps initial bundle lean for public/marketing paths. */
function lazyNamed<T extends Record<string, unknown>, K extends keyof T>(
  factory: () => Promise<T>,
  name: K
) {
  return lazyNamedWithRetry(factory, name);
}

// Dealer OS
export const DealerOverviewPage = lazyNamed(() => import("@/features/dealer-crm/pages/DealerOverviewPage"), "DealerOverviewPage");
export const DealerInventoryCRMPage = lazyNamed(() => import("@/features/dealer-crm/pages/DealerInventoryCRMPage"), "DealerInventoryCRMPage");
export const DealerLeadsPage = lazyNamed(() => import("@/features/dealer-crm/pages/DealerLeadsPage"), "DealerLeadsPage");
export const DealerEnquiriesPage = lazyNamed(() => import("@/features/dealer-crm/pages/DealerEnquiriesPage"), "DealerEnquiriesPage");
export const DealerAnalyticsPage = lazyNamed(() => import("@/features/dealer-crm/pages/DealerAnalyticsPage"), "DealerAnalyticsPage");
export const DealerWhatsAppPage = lazyNamed(() => import("@/features/dealer-crm/pages/DealerWhatsAppPage"), "DealerWhatsAppPage");
export const DealerTeamPage = lazyNamed(() => import("@/features/dealer-crm/pages/DealerTeamPage"), "DealerTeamPage");
export const DealerBulkUploadPage = lazyNamed(() => import("@/features/dealer-crm/pages/DealerBulkUploadPage"), "DealerBulkUploadPage");
export const DealerVerificationPage = lazyNamed(() => import("@/features/dealer-crm/pages/DealerVerificationPage"), "DealerVerificationPage");
export const DealerSubscriptionPage = lazyNamed(() => import("@/features/dealer-crm/pages/DealerSubscriptionPage"), "DealerSubscriptionPage");
export const DealerFinancePage = lazyNamed(() => import("@/features/dealer-crm/pages/DealerFinancePage"), "DealerFinancePage");
export const DealerAuctionsPage = lazyNamed(() => import("@/features/dealer-crm/pages/DealerAuctionsPage"), "DealerAuctionsPage");
export const DealerStorefrontPage = lazyNamed(() => import("@/features/dealer-crm/pages/DealerStorefrontPage"), "DealerStorefrontPage");
export const DealerSettingsPage = lazyNamed(() => import("@/features/dealer-crm/pages/DealerSettingsPage"), "DealerSettingsPage");
export const DealerCallsPage = lazyNamed(() => import("@/features/dealer-crm/pages/DealerCallsPage"), "DealerCallsPage");
export const OrganizationFoundationPage = lazyNamed(
  () => import("@/features/organization/pages/OrganizationFoundationPage"),
  "OrganizationFoundationPage",
);

// Finance desks
export const FinanceManagerDashboardPage = lazyNamed(() => import("@/features/finance/pages/FinanceManagerDashboardPage"), "FinanceManagerDashboardPage");
export const FinanceManagerApplicationsPage = lazyNamed(() => import("@/features/finance/pages/FinanceManagerApplicationsPage"), "FinanceManagerApplicationsPage");
export const FinanceManagerCommissionsPage = lazyNamed(() => import("@/features/finance/pages/FinanceManagerCommissionsPage"), "FinanceManagerCommissionsPage");
export const DsaPortalPage = lazyNamed(() => import("@/features/finance/pages/DsaPortalPage"), "DsaPortalPage");
export const DsaApplicationsPage = lazyNamed(() => import("@/features/finance/pages/DsaApplicationsPage"), "DsaApplicationsPage");
export const DsaLeadsPage = lazyNamed(() => import("@/features/finance/pages/DsaLeadsPage"), "DsaLeadsPage");
export const DsaTeamPage = lazyNamed(() => import("@/features/finance/pages/DsaTeamPage"), "DsaTeamPage");
export const DsaIntegrationsPage = lazyNamed(() => import("@/features/finance/pages/DsaIntegrationsPage"), "DsaIntegrationsPage");
export const FinanceLoanCrmPage = lazyNamed(() => import("@/features/finance/pages/FinanceLoanCrmPage"), "FinanceLoanCrmPage");
export const FinanceManagerIntegrationsPage = lazyNamed(
  () => import("@/features/finance/pages/FinanceManagerIntegrationsPage"),
  "FinanceManagerIntegrationsPage"
);
export const LenderDashboardPage = lazyNamed(() => import("@/features/finance/pages/LenderDashboardPage"), "LenderDashboardPage");
export const LenderApplicationsPage = lazyNamed(() => import("@/features/finance/pages/LenderApplicationsPage"), "LenderApplicationsPage");

// Broker CRM (minimal shell E0–E3)
export const BrokerOverviewPage = lazyNamed(
  () => import("@/features/broker-crm/pages/BrokerOverviewPage"),
  "BrokerOverviewPage"
);

// Growth CRM (Phase J2+J3)
export const GrowthOverviewPage = lazyNamed(
  () => import("@/features/growth-crm/pages/GrowthOverviewPage"),
  "GrowthOverviewPage"
);
export const GrowthWorkspacesPage = lazyNamed(
  () => import("@/features/growth-crm/pages/GrowthWorkspacesPage"),
  "GrowthWorkspacesPage"
);
export const GrowthAssetsPage = lazyNamed(
  () => import("@/features/growth-crm/pages/GrowthAssetsPage"),
  "GrowthAssetsPage"
);
export const GrowthDesignsPage = lazyNamed(
  () => import("@/features/growth-crm/pages/GrowthDesignsPage"),
  "GrowthDesignsPage"
);
export const GrowthDesignEditorPage = lazyNamed(
  () => import("@/features/growth-crm/pages/GrowthDesignEditorPage"),
  "GrowthDesignEditorPage"
);
export const GrowthWhatsappPage = lazyNamed(
  () => import("@/features/growth-crm/pages/GrowthWhatsappPage"),
  "GrowthWhatsappPage"
);
export const GrowthWhatsappArchitecturePage = lazyNamed(
  () => import("@/features/growth-crm/pages/GrowthWhatsappArchitecturePage"),
  "GrowthWhatsappArchitecturePage"
);
export const GrowthSocialSchedulerPage = lazyNamed(
  () => import("@/features/growth-crm/pages/GrowthSocialSchedulerPage"),
  "GrowthSocialSchedulerPage"
);
export const GrowthLeadsPage = lazyNamed(
  () => import("@/features/growth-crm/pages/GrowthLeadsPage"),
  "GrowthLeadsPage"
);
export const GrowthLeadDetailPage = lazyNamed(
  () => import("@/features/growth-crm/pages/GrowthLeadDetailPage"),
  "GrowthLeadDetailPage"
);
export const GrowthLeadPipelinePage = lazyNamed(
  () => import("@/features/growth-crm/pages/GrowthLeadPipelinePage"),
  "GrowthLeadPipelinePage"
);
export const GrowthLeadPipelineDetailPage = lazyNamed(
  () => import("@/features/growth-crm/pages/GrowthLeadPipelineDetailPage"),
  "GrowthLeadPipelineDetailPage"
);
export const GrowthLeadAnalyticsPage = lazyNamed(
  () => import("@/features/growth-crm/pages/GrowthLeadAnalyticsPage"),
  "GrowthLeadAnalyticsPage"
);

// Auctions & AI
export const AuctionRoomPage = lazyNamed(() => import("@/features/auctions/pages/AuctionRoomPage"), "AuctionRoomPage");
export const AuctionAdminPage = lazyNamed(() => import("@/features/auctions/pages/AuctionAdminPage"), "AuctionAdminPage");
export const AIControlCenterPage = lazyNamed(() => import("@/ai/pages/AIControlCenterPage"), "AIControlCenterPage");

// Super admin
export const SuperAdminOverviewPage = lazyNamed(() => import("@/features/platform-admin/pages/SuperAdminOverviewPage"), "SuperAdminOverviewPage");
export const UsersManagementPage = lazyNamed(() => import("@/features/platform-admin/pages/UsersManagementPage"), "UsersManagementPage");
export const BusinessApprovalsPage = lazyNamed(
  () => import("@/features/platform-admin/pages/BusinessApprovalsPage"),
  "BusinessApprovalsPage"
);
export const RoleDirectoryPage = lazyNamed(
  () => import("@/features/platform-admin/pages/RoleDirectoryPage"),
  "RoleDirectoryPage"
);
export const FinanceApprovalsPage = lazyNamed(
  () => import("@/features/platform-admin/pages/FinanceApprovalsPage"),
  "FinanceApprovalsPage"
);
export const AdminOperationsPage = lazyNamed(
  () => import("@/features/platform-admin/pages/AdminOperationsPage"),
  "AdminOperationsPage"
);
export const DealerApprovalsPage = lazyNamed(() => import("@/features/platform-admin/pages/DealerApprovalsPage"), "DealerApprovalsPage");
export const KycVerificationPage = lazyNamed(() => import("@/features/platform-admin/pages/KycVerificationPage"), "KycVerificationPage");
export const PlatformAnalyticsPage = lazyNamed(() => import("@/features/platform-admin/pages/PlatformAnalyticsPage"), "PlatformAnalyticsPage");
export const SubscriptionsPage = lazyNamed(() => import("@/features/platform-admin/pages/SubscriptionsPage"), "SubscriptionsPage");
export const ReportsPage = lazyNamed(() => import("@/features/platform-admin/pages/ReportsPage"), "ReportsPage");
export const CmsPage = lazyNamed(() => import("@/features/platform-admin/pages/CmsPage"), "CmsPage");
export const NotificationsPage = lazyNamed(() => import("@/features/platform-admin/pages/NotificationsPage"), "NotificationsPage");
export const BannersPage = lazyNamed(() => import("@/features/platform-admin/pages/BannersPage"), "BannersPage");
export const SuperAdminAIPage = lazyNamed(() => import("@/features/platform-admin/pages/SuperAdminAIPage"), "SuperAdminAIPage");
export const FraudDetectionPage = lazyNamed(() => import("@/features/platform-admin/pages/FraudDetectionPage"), "FraudDetectionPage");
export const SupportTicketsPage = lazyNamed(() => import("@/features/platform-admin/pages/SupportTicketsPage"), "SupportTicketsPage");
export const VehicleModerationPage = lazyNamed(() => import("@/features/platform-admin/pages/VehicleModerationPage"), "VehicleModerationPage");
export const FeaturedInventoryPage = lazyNamed(() => import("@/features/platform-admin/pages/FeaturedInventoryPage"), "FeaturedInventoryPage");
export const AuctionApprovalsPage = lazyNamed(() => import("@/features/platform-admin/pages/AuctionApprovalsPage"), "AuctionApprovalsPage");
export const TransactionsPage = lazyNamed(() => import("@/features/platform-admin/pages/TransactionsPage"), "TransactionsPage");
export const DirectoryMonetizationPage = lazyNamed(
  () => import("@/features/platform-admin/pages/DirectoryMonetizationPage"),
  "DirectoryMonetizationPage"
);
export const FounderDashboardPage = lazyNamed(
  () => import("@/features/founder-dashboard/pages/FounderDashboardPage"),
  "FounderDashboardPage"
);
export const LeadRouterPage = lazyNamed(
  () => import("@/features/platform-admin/pages/LeadRouterPage"),
  "LeadRouterPage"
);

// Heavy marketplace
/** @deprecated Imported eagerly from router/index.tsx to avoid chunk 404 on vehicle detail. */
export const VehicleDetailPage = lazyNamed(() => import("@/features/vehicles/pages/VehicleDetailPage"), "VehicleDetailPage");
export const CommunityModerationPage = lazyNamed(() => import("@/features/community/pages/CommunityModerationPage"), "CommunityModerationPage");
