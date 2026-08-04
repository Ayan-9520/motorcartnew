import { createBrowserRouter, Navigate } from "react-router-dom";
import { PublicLayout } from "@/layouts/PublicLayout";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ProtectedRoute } from "@/guards/ProtectedRoute";
import { FinanceDashboardAlias } from "@/components/routing/FinanceDashboardAlias";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { CustomerSignupPage } from "@/pages/auth/CustomerSignupPage";
import { BusinessSignupPage } from "@/pages/auth/BusinessSignupPage";
import { PendingApprovalPage } from "@/pages/PendingApprovalPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { KycPage } from "@/pages/KycPage";
import { AuthCallbackPage } from "@/pages/AuthCallbackPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { AboutPage } from "@/pages/AboutPage";
import { ContactPage } from "@/pages/ContactPage";
import { CareersPage } from "@/pages/CareersPage";
import { PressPage } from "@/pages/PressPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { TermsPage } from "@/pages/TermsPage";
import { FaqsPage } from "@/pages/FaqsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PricingPage } from "@/pages/PricingPage";
import { UnauthorizedPage } from "@/pages/UnauthorizedPage";
import { AccountSuspendedPage } from "@/pages/AccountSuspendedPage";
import { RoleDashboardRedirect } from "@/components/routing/RoleDashboardRedirect";
import { DealerAliasRedirect } from "@/components/routing/DealerAliasRedirect";
import { DealerHomeGate } from "@/components/routing/DealerHomeGate";
import { CustomerDashboardPage } from "@/pages/dashboard/CustomerDashboardPage";
import {
  CustomerGaragePage,
  CustomerAddVehiclePage,
  CustomerDocumentsPage,
  CustomerInsuranceWalletPage,
  CustomerInsightsPage,
  CustomerNotificationsPage,
  CustomerRewardsPage,
  CustomerProfileCenterPage,
  CustomerFastagPage,
  CustomerServiceRecordsPage,
  CustomerVehicleHealthPage,
  CustomerRecentlyViewedPage,
} from "@/features/customer-ecosystem";
import { VehicleListingPage } from "@/features/vehicles/pages/VehicleListingPage";
import { BuyHubPage } from "@/features/marketplace/pages/BuyHubPage";
import { SellHubPage } from "@/features/marketplace/pages/SellHubPage";
import { SellListingPage } from "@/features/marketplace/pages/SellListingPage";
import { BuyCategoryListingPage } from "@/features/marketplace/pages/BuyCategoryListingPage";
import { VehicleDetailPage } from "@/features/vehicles/pages/VehicleDetailPage";
import { VehicleComparePage } from "@/features/vehicles/pages/VehicleComparePage";
import { WishlistPage } from "@/features/vehicles/pages/WishlistPage";
import { SearchResultsPage } from "@/features/search/pages/SearchResultsPage";
import { NewCarsHubPage } from "@/features/new-cars/pages/NewCarsHubPage";
import { NewCarsListingPage } from "@/features/new-cars/pages/NewCarsListingPage";
import { PreownedCarsHubPage } from "@/features/preowned-cars/pages/PreownedCarsHubPage";
import { PreownedCarsListingPage } from "@/features/preowned-cars/pages/PreownedCarsListingPage";
import { DealerDashboardLayout } from "@/layouts/DealerDashboardLayout";
import { NewCarDealerLayout } from "@/layouts/NewCarDealerLayout";
import {
  NewCarOverviewPage,
  NewCarInventoryPage,
  NewCarBulkUploadPage,
  NewCarLeadsPage,
  NewCarLeadDetailPage,
  NewCarBookingsPage,
  NewCarDeliveriesPage,
  NewCarTeamPage,
  NewCarFinancePage,
  NewCarInsurancePage,
  NewCarTestDrivesPage,
  NewCarRtoPage,
  NewCarCustomersPage,
  NewCarWhatsAppPage,
  NewCarAnalyticsPage,
  NewCarMarketingPage,
  NewCarExchangePage,
  NewCarAiPage,
  NewCarStorefrontPage,
  NewCarAccessoriesPage,
} from "@/features/new-car-dealer";
import { NewCarSettingsPage } from "@/features/new-car-dealer/pages/NewCarSettingsPage";
import {
  DealerOverviewPage,
  DealerInventoryCRMPage,
  DealerLeadsPage,
  DealerEnquiriesPage,
  DealerAnalyticsPage,
  DealerWhatsAppPage,
  DealerTeamPage,
  DealerBulkUploadPage,
  DealerVerificationPage,
  DealerSubscriptionPage,
  DealerFinancePage,
  DealerAuctionsPage,
  DealerStorefrontPage,
  DealerSettingsPage,
  DealerCallsPage,
} from "@/router/lazy-pages";
import { AuctionHubPage } from "@/features/auctions/pages/AuctionHubPage";
import { AuctionListingPage } from "@/features/auctions/pages/AuctionListingPage";
import { AuctionRoomPage } from "@/router/lazy-pages";
import { FinanceHubPage } from "@/features/finance/pages/FinanceHubPage";
import { FinanceMarketplacePage } from "@/features/finance/pages/FinanceMarketplacePage";
import { LoanComparePage } from "@/features/finance/pages/LoanComparePage";
import { LoanApplyPage } from "@/features/finance/pages/LoanApplyPage";
import { CustomerLoansPage } from "@/features/finance/pages/CustomerLoansPage";
import { LoanDetailPage } from "@/features/finance/pages/LoanDetailPage";
import { FinanceToolsPage } from "@/features/finance/pages/FinanceToolsPage";
import { FinanceIntegrationsPage } from "@/features/finance/pages/FinanceIntegrationsPage";
import { InsuranceHubPage } from "@/features/insurance/pages/InsuranceHubPage";
import { InsuranceQuotePage } from "@/features/insurance/pages/InsuranceQuotePage";
import { InsuranceComparePage } from "@/features/insurance/pages/InsuranceComparePage";
import { InsuranceApplyPage } from "@/features/insurance/pages/InsuranceApplyPage";
import { InsuranceClaimsPage } from "@/features/insurance/pages/InsuranceClaimsPage";
import { InsuranceRenewPage } from "@/features/insurance/pages/InsuranceRenewPage";
import { CustomerInsurancePage } from "@/features/insurance/pages/CustomerInsurancePage";
import {
  DsaPortalPage,
  DsaApplicationsPage,
  DsaLeadsPage,
  DsaTeamPage,
  DsaIntegrationsPage,
  LenderDashboardPage,
  LenderApplicationsPage,
  FinanceManagerDashboardPage,
  FinanceManagerApplicationsPage,
  FinanceManagerCommissionsPage,
  FinanceLoanCrmPage,
  FinanceManagerIntegrationsPage,
} from "@/router/lazy-pages";
import { FinanceDashboardLayout } from "@/layouts/FinanceDashboardLayout";
import { PartsHubPage } from "@/features/parts/pages/PartsHubPage";
import { PartsListingPage } from "@/features/parts/pages/PartsListingPage";
import { PartDetailPage } from "@/features/parts/pages/PartDetailPage";
import { PartsCartPage } from "@/features/parts/pages/PartsCartPage";
import { PartsCheckoutPage } from "@/features/parts/pages/PartsCheckoutPage";
import { PartsOrdersListPage } from "@/features/parts/pages/PartsOrdersListPage";
import { PartsOrderDetailPage } from "@/features/parts/pages/PartsOrderDetailPage";
import { PartInvoicePage } from "@/features/parts/pages/PartInvoicePage";
import { BrokerDashboardLayout } from "@/features/broker-crm/components/BrokerDashboardLayout";
import { GrowthDashboardLayout } from "@/features/growth-crm/components/GrowthDashboardLayout";
import {
  BrokerOverviewPage,
  GrowthOverviewPage,
  GrowthWorkspacesPage,
  GrowthAssetsPage,
  GrowthDesignsPage,
  GrowthDesignEditorPage,
  GrowthWhatsappPage,
  GrowthWhatsappArchitecturePage,
  GrowthSocialSchedulerPage,
  GrowthLeadsPage,
  GrowthLeadDetailPage,
  GrowthLeadPipelinePage,
  GrowthLeadPipelineDetailPage,
  GrowthLeadAnalyticsPage,
} from "@/router/lazy-pages";
import { PartsSupplierLayout } from "@/layouts/PartsSupplierLayout";
import * as PartsSupplier from "@/features/parts-supplier";
import { ServicesHubPage } from "@/features/service-booking/pages/ServicesHubPage";
import { ServiceMarketplacePage } from "@/features/service-booking/pages/ServiceMarketplacePage";
import { ServiceCenterDetailPage } from "@/features/service-booking/pages/ServiceCenterDetailPage";
import { ServiceBookingFlowPage } from "@/features/service-booking/pages/ServiceBookingFlowPage";
import { ServiceBookRedirectPage } from "@/features/service-booking/pages/ServiceBookRedirectPage";
import { MyServiceBookingsPage } from "@/features/service-booking/pages/MyServiceBookingsPage";
import { ServiceBookingDetailPage } from "@/features/service-booking/pages/ServiceBookingDetailPage";
import { ServiceHubLayout } from "@/layouts/ServiceHubLayout";
import * as ServicePartner from "@/features/service-partner";
import { CustomerServiceHistoryPage } from "@/features/service-booking/pages/CustomerServiceHistoryPage";
import { TechnicianDashboardLayout } from "@/layouts/TechnicianDashboardLayout";
import { TechnicianJobsPage } from "@/features/service-booking/pages/TechnicianJobsPage";
import { TechnicianJobDetailPage } from "@/features/service-booking/pages/TechnicianJobDetailPage";
import { CommunityFeedPage } from "@/features/community/pages/CommunityFeedPage";
import { CommunityPostPage } from "@/features/community/pages/CommunityPostPage";
import { CommunityGroupsPage } from "@/features/community/pages/CommunityGroupsPage";
import { CommunityGroupPage } from "@/features/community/pages/CommunityGroupPage";
import { CommunityDealerPage } from "@/features/community/pages/CommunityDealerPage";
import { CommunityBusinessPage } from "@/features/community/pages/CommunityBusinessPage";
import { CommunityInfluencerPage } from "@/features/community/pages/CommunityInfluencerPage";
import { CommunityMeRedirect } from "@/features/community/pages/CommunityMeRedirect";
import { CommunityLayout } from "@/layouts/CommunityLayout";
import { SuperAdminLayout } from "@/layouts/SuperAdminLayout";
import {
  SuperAdminOverviewPage,
  BusinessApprovalsPage,
  RoleDirectoryPage,
  FinanceApprovalsPage,
  AdminOperationsPage,
  UsersManagementPage,
  DealerApprovalsPage,
  KycVerificationPage,
  PlatformAnalyticsPage,
  SubscriptionsPage,
  ReportsPage,
  CmsPage,
  NotificationsPage,
  BannersPage,
  SuperAdminAIPage,
  FraudDetectionPage,
  SupportTicketsPage,
  VehicleModerationPage,
  FeaturedInventoryPage,
  AuctionApprovalsPage,
  TransactionsPage,
  DirectoryMonetizationPage,
  FounderDashboardPage,
  LeadRouterPage,
  MarketplaceLeadsPage,
  CommunityModerationPage,
  AuctionAdminPage,
  AuctionDeskGate,
} from "@/router/admin-pages";
import { AIControlCenterPage } from "@/router/lazy-pages";
import { DealersHubPage } from "@/features/dealer-network/pages/DealersHubPage";
import { DealersBrowsePage } from "@/features/dealer-network/pages/DealersBrowsePage";
import { DealerProfilePage } from "@/features/dealer-network/pages/DealerProfilePage";
import { VehicleHubPage } from "@/features/ecosystem/pages/VehicleHubPage";
import {
  DirectoryHubPage,
  DirectoryListPage,
  DirectoryBusinessPage,
} from "@/features/business-directory";
import { BusinessHubPage } from "@/features/business-hub";
import { UnifiedNotificationsPage } from "@/features/notifications-center";
import { BillingDashboardPage } from "@/features/billing";

const ph = (title: string, desc?: string) => (
  <PlaceholderPage title={title} description={desc} />
);

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "cars", element: <VehicleHubPage /> },
      { path: "bikes", element: <VehicleHubPage /> },
      { path: "trucks", element: <VehicleHubPage /> },
      { path: "buses", element: <VehicleHubPage /> },
      { path: "ev", element: <VehicleHubPage /> },
      { path: "auto", element: <VehicleHubPage /> },
      { path: "new-cars", element: <NewCarsHubPage /> },
      { path: "new-cars/browse", element: <Navigate to="/buy/cars/new" replace /> },
      { path: "new-cars/:slug", element: <VehicleDetailPage /> },
      { path: "used-cars", element: <PreownedCarsHubPage /> },
      { path: "used-cars/browse", element: <Navigate to="/buy/cars/used" replace /> },
      { path: "used-cars/:slug", element: <VehicleDetailPage /> },
      { path: "buy", element: <BuyHubPage /> },
      { path: "buy/:category/:condition/:slug", element: <VehicleDetailPage /> },
      { path: "buy/:category/:condition", element: <BuyCategoryListingPage /> },
      { path: "vehicles", element: <Navigate to="/buy" replace /> },
      { path: "wishlist", element: <WishlistPage /> },
      { path: "search", element: <SearchResultsPage /> },
      { path: "vehicles/compare", element: <VehicleComparePage /> },
      { path: "vehicles/:category", element: <VehicleListingPage /> },
      { path: "vehicles/:category/:slug", element: <VehicleDetailPage /> },
      { path: "sell", element: <SellHubPage /> },
      { path: "sell/:category", element: <SellListingPage /> },
      { path: "auctions", element: <AuctionHubPage /> },
      { path: "auctions/browse", element: <AuctionListingPage /> },
      { path: "auctions/:status/:slug", element: <AuctionRoomPage /> },
      { path: "finance", element: <FinanceHubPage /> },
      { path: "finance/offers", element: <FinanceMarketplacePage /> },
      { path: "finance/compare", element: <LoanComparePage /> },
      { path: "finance/apply", element: <LoanApplyPage /> },
      { path: "finance/tools", element: <FinanceToolsPage /> },
      { path: "finance/integrations", element: <FinanceIntegrationsPage /> },
      { path: "finance/eligibility", element: <Navigate to="/finance/tools" replace /> },
      { path: "finance/emi", element: <Navigate to="/finance/tools" replace /> },
      { path: "insurance", element: <InsuranceHubPage /> },
      { path: "insurance/quote", element: <InsuranceQuotePage /> },
      { path: "insurance/compare", element: <InsuranceComparePage /> },
      { path: "insurance/apply", element: <InsuranceApplyPage /> },
      { path: "insurance/renew", element: <InsuranceRenewPage /> },
      { path: "insurance/claims", element: <InsuranceClaimsPage /> },
      { path: "parts", element: <PartsHubPage /> },
      { path: "parts/browse", element: <PartsListingPage /> },
      { path: "parts/:category", element: <PartsListingPage /> },
      { path: "parts/:category/:slug", element: <PartDetailPage /> },
      { path: "cart", element: <PartsCartPage /> },
      {
        path: "checkout",
        element: (
          <ProtectedRoute>
            <PartsCheckoutPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "orders",
        element: (
          <ProtectedRoute>
            <PartsOrdersListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "orders/:id",
        element: (
          <ProtectedRoute>
            <PartsOrderDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "orders/:id/invoice",
        element: (
          <ProtectedRoute>
            <PartInvoicePage />
          </ProtectedRoute>
        ),
      },
      { path: "services", element: <ServicesHubPage /> },
      { path: "services/browse", element: <ServiceMarketplacePage /> },
      { path: "services/centers/:slug", element: <ServiceCenterDetailPage /> },
      { path: "services/book", element: <ServiceBookRedirectPage /> },
      {
        path: "services/book/:serviceId",
        element: (
          <ProtectedRoute>
            <ServiceBookingFlowPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "services/my-bookings",
        element: (
          <ProtectedRoute>
            <MyServiceBookingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "services/history",
        element: (
          <ProtectedRoute>
            <CustomerServiceHistoryPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "services/bookings/:id",
        element: (
          <ProtectedRoute>
            <ServiceBookingDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "community",
        element: <CommunityLayout />,
        children: [
          { index: true, element: <CommunityFeedPage /> },
          { path: "me", element: <CommunityMeRedirect /> },
          { path: "post/:id", element: <CommunityPostPage /> },
          { path: "groups", element: <CommunityGroupsPage /> },
          { path: "groups/:slug", element: <CommunityGroupPage /> },
          { path: "business/:slug", element: <CommunityBusinessPage /> },
          { path: "dealers/:slug", element: <CommunityDealerPage /> },
          { path: "u/:userId", element: <CommunityInfluencerPage /> },
        ],
      },
      { path: "directory", element: <DirectoryHubPage /> },
      { path: "directory/:category", element: <DirectoryListPage /> },
      { path: "directory/:category/:slug", element: <DirectoryBusinessPage /> },
      { path: "business/:slug", element: <BusinessHubPage /> },
      { path: "dealers", element: <DealersHubPage /> },
      { path: "dealers/browse", element: <DealersBrowsePage /> },
      { path: "dealers/:slug", element: <DealerProfilePage /> },
      { path: "pricing", element: <PricingPage /> },
      { path: "ai", element: <AIControlCenterPage /> },
      { path: "about", element: <AboutPage /> },
      { path: "contact", element: <ContactPage /> },
      { path: "careers", element: <CareersPage /> },
      { path: "press", element: <PressPage /> },
      { path: "privacy", element: <PrivacyPage /> },
      { path: "terms", element: <TermsPage /> },
      { path: "faqs", element: <FaqsPage /> },
      {
        path: "notifications",
        element: (
          <ProtectedRoute>
            <UnifiedNotificationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile/kyc",
        element: (
          <ProtectedRoute>
            <KycPage />
          </ProtectedRoute>
        ),
      },
      { path: "unauthorized", element: <UnauthorizedPage /> },
      { path: "account-suspended", element: <AccountSuspendedPage /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: "login", element: <LoginPage /> },
      { path: "signup", element: <SignupPage /> },
      { path: "signup/customer", element: <CustomerSignupPage /> },
      { path: "signup/business", element: <BusinessSignupPage /> },
      { path: "forgot-password", element: <ForgotPasswordPage /> },
      { path: "reset-password", element: <ResetPasswordPage /> },
      { path: "auth/callback", element: <AuthCallbackPage /> },
    ],
  },
  {
    element: (
      <ProtectedRoute
        roles={[
          "dealer",
          "used_car_dealer",
          "new_car_dealer",
          "bike_dealer",
          "truck_dealer",
          "admin",
          "super_admin",
        ]}
      >
        <DealerDashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "dashboard/dealer", element: <DealerHomeGate /> },
      { path: "dashboard/dealer/inventory", element: <DealerInventoryCRMPage /> },
      { path: "dashboard/dealer/inventory/excel", element: <DealerBulkUploadPage /> },
      { path: "dashboard/dealer/finance", element: <DealerFinancePage /> },
      { path: "dashboard/dealer/auctions", element: <DealerAuctionsPage /> },
      { path: "dashboard/dealer/verification", element: <DealerVerificationPage /> },
      { path: "dashboard/dealer/subscription", element: <DealerSubscriptionPage /> },
      { path: "dashboard/dealer/storefront", element: <DealerStorefrontPage /> },
      { path: "dashboard/dealer/leads", element: <DealerLeadsPage /> },
      { path: "dashboard/dealer/enquiries", element: <DealerEnquiriesPage /> },
      { path: "dashboard/dealer/whatsapp", element: <DealerWhatsAppPage /> },
      { path: "dashboard/dealer/calls", element: <DealerCallsPage /> },
      { path: "dashboard/dealer/analytics", element: <DealerAnalyticsPage /> },
      { path: "dashboard/dealer/team", element: <DealerTeamPage /> },
      { path: "dashboard/dealer/settings", element: <DealerSettingsPage /> },
    ],
  },
  {
    element: (
      <ProtectedRoute roles={["new_car_dealer", "admin", "super_admin"]}>
        <NewCarDealerLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "dashboard/new-car", element: <NewCarOverviewPage /> },
      { path: "dashboard/new-car/inventory", element: <NewCarInventoryPage /> },
      { path: "dashboard/new-car/inventory/bulk", element: <NewCarBulkUploadPage /> },
      { path: "dashboard/new-car/leads", element: <NewCarLeadsPage /> },
      { path: "dashboard/new-car/leads/:id", element: <NewCarLeadDetailPage /> },
      { path: "dashboard/new-car/test-drives", element: <NewCarTestDrivesPage /> },
      { path: "dashboard/new-car/bookings", element: <NewCarBookingsPage /> },
      { path: "dashboard/new-car/finance", element: <NewCarFinancePage /> },
      { path: "dashboard/new-car/insurance", element: <NewCarInsurancePage /> },
      { path: "dashboard/new-car/deliveries", element: <NewCarDeliveriesPage /> },
      { path: "dashboard/new-car/rto", element: <NewCarRtoPage /> },
      { path: "dashboard/new-car/accessories", element: <NewCarAccessoriesPage /> },
      { path: "dashboard/new-car/customers", element: <NewCarCustomersPage /> },
      { path: "dashboard/new-car/whatsapp", element: <NewCarWhatsAppPage /> },
      { path: "dashboard/new-car/team", element: <NewCarTeamPage /> },
      { path: "dashboard/new-car/analytics", element: <NewCarAnalyticsPage /> },
      { path: "dashboard/new-car/marketing", element: <NewCarMarketingPage /> },
      { path: "dashboard/new-car/exchange", element: <NewCarExchangePage /> },
      { path: "dashboard/new-car/ai", element: <NewCarAiPage /> },
      { path: "dashboard/new-car/storefront", element: <NewCarStorefrontPage /> },
      { path: "dashboard/new-car/settings", element: <NewCarSettingsPage /> },
    ],
  },
  {
    element: (
      <ProtectedRoute roles={["broker", "admin", "super_admin"]}>
        <BrokerDashboardLayout />
      </ProtectedRoute>
    ),
    children: [{ path: "dashboard/broker", element: <BrokerOverviewPage /> }],
  },
  {
    element: (
      <ProtectedRoute>
        <GrowthDashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "dashboard/growth", element: <GrowthOverviewPage /> },
      { path: "dashboard/growth/workspaces", element: <GrowthWorkspacesPage /> },
      { path: "dashboard/growth/assets", element: <GrowthAssetsPage /> },
      { path: "dashboard/growth/designs", element: <GrowthDesignsPage /> },
      { path: "dashboard/growth/designs/new", element: <GrowthDesignEditorPage /> },
      { path: "dashboard/growth/designs/:id", element: <GrowthDesignEditorPage /> },
      { path: "dashboard/growth/whatsapp", element: <GrowthWhatsappPage /> },
      {
        path: "dashboard/growth/whatsapp/architecture",
        element: <GrowthWhatsappArchitecturePage />,
      },
      { path: "dashboard/growth/social", element: <GrowthSocialSchedulerPage /> },
      { path: "dashboard/growth/leads/pipeline", element: <GrowthLeadPipelinePage /> },
      { path: "dashboard/growth/leads/pipeline/:eventId", element: <GrowthLeadPipelineDetailPage /> },
      { path: "dashboard/growth/leads/analytics", element: <GrowthLeadAnalyticsPage /> },
      { path: "dashboard/growth/leads", element: <GrowthLeadsPage /> },
      { path: "dashboard/growth/leads/:formId", element: <GrowthLeadDetailPage /> },
    ],
  },
  {
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [{ path: "dashboard/billing", element: <BillingDashboardPage /> }],
  },
  {
    element: (
      <ProtectedRoute roles={["parts_seller", "admin", "super_admin"]}>
        <PartsSupplierLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "dashboard/parts", element: <PartsSupplier.PartsSupplierOverviewPage /> },
      { path: "dashboard/parts/ai", element: <PartsSupplier.PartsSupplierAiPage /> },
      { path: "dashboard/parts/alerts", element: <PartsSupplier.PartsSupplierAlertsPage /> },
      { path: "dashboard/parts/catalog", element: <PartsSupplier.PartsSupplierCatalogPage /> },
      { path: "dashboard/parts/inventory", element: <PartsSupplier.PartsSupplierInventoryPage /> },
      { path: "dashboard/parts/upload", element: <PartsSupplier.PartsSupplierUploadPage /> },
      { path: "dashboard/parts/bulk-upload", element: <PartsSupplier.PartsSupplierBulkUploadPage /> },
      { path: "dashboard/parts/categories", element: <PartsSupplier.PartsSupplierCategoriesPage /> },
      { path: "dashboard/parts/brands", element: <PartsSupplier.PartsSupplierBrandsPage /> },
      { path: "dashboard/parts/variants", element: <PartsSupplier.PartsSupplierVariantsPage /> },
      { path: "dashboard/parts/oem-mapping", element: <PartsSupplier.PartsSupplierOemMappingPage /> },
      { path: "dashboard/parts/compatibility", element: <PartsSupplier.PartsSupplierCompatibilityPage /> },
      { path: "dashboard/parts/warehouses", element: <PartsSupplier.PartsSupplierWarehousesPage /> },
      { path: "dashboard/parts/racks", element: <PartsSupplier.PartsSupplierRacksPage /> },
      { path: "dashboard/parts/low-stock", element: <PartsSupplier.PartsSupplierLowStockPage /> },
      { path: "dashboard/parts/dead-stock", element: <PartsSupplier.PartsSupplierDeadStockPage /> },
      { path: "dashboard/parts/incoming", element: <PartsSupplier.PartsSupplierIncomingPage /> },
      { path: "dashboard/parts/transfers", element: <PartsSupplier.PartsSupplierTransfersPage /> },
      { path: "dashboard/parts/orders", element: <PartsSupplier.PartsSupplierOrdersPage /> },
      { path: "dashboard/parts/orders/new", element: <PartsSupplier.PartsSupplierOrdersFilteredPage /> },
      { path: "dashboard/parts/orders/processing", element: <PartsSupplier.PartsSupplierOrdersFilteredPage /> },
      { path: "dashboard/parts/orders/packed", element: <PartsSupplier.PartsSupplierOrdersPackedPage /> },
      { path: "dashboard/parts/orders/dispatched", element: <PartsSupplier.PartsSupplierOrdersDispatchedPage /> },
      { path: "dashboard/parts/orders/delivered", element: <PartsSupplier.PartsSupplierOrdersDeliveredPage /> },
      { path: "dashboard/parts/orders/returns", element: <PartsSupplier.PartsSupplierOrdersFilteredPage /> },
      { path: "dashboard/parts/orders/cancelled", element: <PartsSupplier.PartsSupplierOrdersCancelledPage /> },
      { path: "dashboard/parts/orders/:id", element: <PartsSupplier.PartsSupplierOrderDetailPage /> },
      { path: "dashboard/parts/crm/dealers", element: <PartsSupplier.PartsSupplierCrmDealersPage /> },
      { path: "dashboard/parts/crm/garages", element: <PartsSupplier.PartsSupplierCrmGaragesPage /> },
      { path: "dashboard/parts/crm/workshops", element: <PartsSupplier.PartsSupplierCrmWorkshopsPage /> },
      { path: "dashboard/parts/crm/repeat", element: <PartsSupplier.PartsSupplierCrmRepeatPage /> },
      { path: "dashboard/parts/crm/negotiations", element: <PartsSupplier.PartsSupplierCrmNegotiationsPage /> },
      { path: "dashboard/parts/crm/pipeline", element: <PartsSupplier.PartsSupplierCrmPipelinePage /> },
      { path: "dashboard/parts/crm/rfq", element: <PartsSupplier.PartsSupplierRfqPage /> },
      { path: "dashboard/parts/pricing/retail", element: <PartsSupplier.PartsSupplierPricingRetailPage /> },
      { path: "dashboard/parts/pricing/dealer", element: <PartsSupplier.PartsSupplierPricingDealerPage /> },
      { path: "dashboard/parts/pricing/wholesale", element: <PartsSupplier.PartsSupplierPricingWholesalePage /> },
      { path: "dashboard/parts/pricing/bulk", element: <PartsSupplier.PartsSupplierPricingBulkPage /> },
      { path: "dashboard/parts/pricing/dynamic", element: <PartsSupplier.PartsSupplierPricingDynamicPage /> },
      { path: "dashboard/parts/pricing/offers", element: <PartsSupplier.PartsSupplierOffersPage /> },
      { path: "dashboard/parts/logistics/dispatch", element: <PartsSupplier.PartsSupplierDispatchPage /> },
      { path: "dashboard/parts/logistics/couriers", element: <PartsSupplier.PartsSupplierCouriersPage /> },
      { path: "dashboard/parts/logistics/tracking", element: <PartsSupplier.PartsSupplierTrackingPage /> },
      { path: "dashboard/parts/logistics/sla", element: <PartsSupplier.PartsSupplierLogisticsSlaPage /> },
      { path: "dashboard/parts/logistics/labels", element: <PartsSupplier.PartsSupplierLogisticsLabelsPage /> },
      { path: "dashboard/parts/procurement/po", element: <PartsSupplier.PartsSupplierPoPage /> },
      { path: "dashboard/parts/procurement/vendors", element: <PartsSupplier.PartsSupplierVendorsPage /> },
      { path: "dashboard/parts/procurement/bills", element: <PartsSupplier.PartsSupplierProcurementBillsPage /> },
      { path: "dashboard/parts/procurement/incoming", element: <PartsSupplier.PartsSupplierProcurementIncomingPage /> },
      { path: "dashboard/parts/finance/revenue", element: <PartsSupplier.PartsSupplierAnalyticsRevenuePage /> },
      { path: "dashboard/parts/finance/invoices", element: <PartsSupplier.PartsSupplierInvoicesPage /> },
      { path: "dashboard/parts/finance/payouts", element: <PartsSupplier.PartsSupplierFinancePayoutsPage /> },
      { path: "dashboard/parts/finance/settlements", element: <PartsSupplier.PartsSupplierSettlementsPage /> },
      { path: "dashboard/parts/finance/credit-notes", element: <PartsSupplier.PartsSupplierFinanceCreditNotesPage /> },
      { path: "dashboard/parts/finance/profit", element: <PartsSupplier.PartsSupplierFinanceProfitPage /> },
      { path: "dashboard/parts/marketing", element: <PartsSupplier.PartsSupplierMarketingPage /> },
      { path: "dashboard/parts/marketing/whatsapp", element: <PartsSupplier.PartsSupplierMarketingWhatsappPage /> },
      { path: "dashboard/parts/marketing/sms", element: <PartsSupplier.PartsSupplierMarketingSmsPage /> },
      { path: "dashboard/parts/marketing/email", element: <PartsSupplier.PartsSupplierMarketingEmailPage /> },
      { path: "dashboard/parts/marketing/catalogue", element: <PartsSupplier.PartsSupplierMarketingCataloguePage /> },
      { path: "dashboard/parts/whatsapp", element: <PartsSupplier.PartsSupplierWhatsAppPage /> },
      { path: "dashboard/parts/analytics", element: <PartsSupplier.PartsSupplierAnalyticsHubPage /> },
      { path: "dashboard/parts/analytics/revenue", element: <PartsSupplier.PartsSupplierAnalyticsRevenuePage /> },
      { path: "dashboard/parts/analytics/products", element: <PartsSupplier.PartsSupplierAnalyticsProductsPage /> },
      { path: "dashboard/parts/analytics/warehouse", element: <PartsSupplier.PartsSupplierAnalyticsWarehousePage /> },
      { path: "dashboard/parts/analytics/customers", element: <PartsSupplier.PartsSupplierAnalyticsCustomersPage /> },
      { path: "dashboard/parts/analytics/sku", element: <PartsSupplier.PartsSupplierAnalyticsSkuPage /> },
      { path: "dashboard/parts/storefront", element: <PartsSupplier.PartsSupplierStorefrontPage /> },
      { path: "dashboard/parts/profile", element: <PartsSupplier.PartsSupplierProfilePage /> },
      { path: "dashboard/parts/kyc", element: <PartsSupplier.PartsSupplierKycPage /> },
      { path: "dashboard/parts/staff", element: <PartsSupplier.PartsSupplierStaffPage /> },
      { path: "dashboard/parts/notifications", element: <PartsSupplier.PartsSupplierNotificationsPage /> },
      { path: "dashboard/parts/automation", element: <PartsSupplier.PartsSupplierAutomationPage /> },
      { path: "dashboard/parts/barcode", element: <PartsSupplier.PartsSupplierBarcodePage /> },
    ],
  },
  {
    element: (
      <ProtectedRoute roles={["service_center", "admin", "super_admin"]}>
        <ServiceHubLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "dashboard/service", element: <ServicePartner.ShOverviewPage /> },
      { path: "dashboard/service/ai", element: <ServicePartner.ShAiPage /> },
      { path: "dashboard/service/notifications", element: <ServicePartner.ShNotificationsPage /> },
      { path: "dashboard/service/operations/live", element: <ServicePartner.ShLiveOpsPage /> },
      { path: "dashboard/service/bookings", element: <ServicePartner.ShBookingsPage /> },
      { path: "dashboard/service/bookings/new", element: <ServicePartner.ShBookingsPage /> },
      { path: "dashboard/service/bookings/upcoming", element: <ServicePartner.ShBookingsPage /> },
      { path: "dashboard/service/bookings/in-progress", element: <ServicePartner.ShBookingsPage /> },
      { path: "dashboard/service/bookings/pickup", element: <ServicePartner.ShBookingsPage /> },
      { path: "dashboard/service/bookings/emergency", element: <ServicePartner.ShBookingsPage /> },
      { path: "dashboard/service/bookings/completed", element: <ServicePartner.ShBookingsPage /> },
      { path: "dashboard/service/bookings/cancelled", element: <ServicePartner.ShBookingsPage /> },
      { path: "dashboard/service/workshop/job-cards", element: <ServicePartner.ShJobCardsPage /> },
      { path: "dashboard/service/workshop/job-cards/:id", element: <ServicePartner.ShJobCardDetailPage /> },
      { path: "dashboard/service/workshop/inspection", element: <ServicePartner.ShInspectionPage /> },
      { path: "dashboard/service/workshop/bays", element: <ServicePartner.ShBaysPage /> },
      { path: "dashboard/service/workshop/technicians", element: <ServicePartner.ShTechniciansPage /> },
      { path: "dashboard/service/workshop/kanban", element: <ServicePartner.ShKanbanPage /> },
      { path: "dashboard/service/calendar", element: <ServicePartner.ShCalendarPage /> },
      { path: "dashboard/service/customers", element: <ServicePartner.ShCrmPage /> },
      { path: "dashboard/service/customers/vehicles", element: <ServicePartner.ShCrmVehiclesPage /> },
      { path: "dashboard/service/customers/repeat", element: <ServicePartner.ShCrmRepeatPage /> },
      { path: "dashboard/service/customers/loyalty", element: <ServicePartner.ShCrmLoyaltyPage /> },
      { path: "dashboard/service/customers/reviews", element: <ServicePartner.ShCrmReviewsPage /> },
      { path: "dashboard/service/services/periodic", element: <ServicePartner.ShServicesCatalogPage title="Periodic service" slug="periodic" /> },
      { path: "dashboard/service/services/ac", element: <ServicePartner.ShServicesCatalogPage title="AC service" slug="ac" /> },
      { path: "dashboard/service/services/body", element: <ServicePartner.ShServicesCatalogPage title="Denting & painting" slug="denting" /> },
      { path: "dashboard/service/services/detailing", element: <ServicePartner.ShServicesCatalogPage title="Detailing" slug="detailing" /> },
      { path: "dashboard/service/services/ceramic", element: <ServicePartner.ShServicesCatalogPage title="Ceramic coating" slug="ceramic" /> },
      { path: "dashboard/service/services/battery", element: <ServicePartner.ShServicesCatalogPage title="Battery replacement" slug="battery" /> },
      { path: "dashboard/service/services/tyre", element: <ServicePartner.ShServicesCatalogPage title="Tyre service" slug="tyre" /> },
      { path: "dashboard/service/services/ev", element: <ServicePartner.ShServicesCatalogPage title="EV diagnostics" slug="ev" /> },
      { path: "dashboard/service/parts/inventory", element: <ServicePartner.ShPartsInventoryPage /> },
      { path: "dashboard/service/parts/low-stock", element: <ServicePartner.ShPartsLowStockPage /> },
      { path: "dashboard/service/parts/vendors", element: <ServicePartner.ShPartsVendorsPage /> },
      { path: "dashboard/service/parts/po", element: <ServicePartner.ShPartsPoPage /> },
      { path: "dashboard/service/parts/billing", element: <ServicePartner.ShPartsBillingPage /> },
      { path: "dashboard/service/operations/pickup", element: <ServicePartner.ShPickupPage /> },
      { path: "dashboard/service/operations/drivers", element: <ServicePartner.ShDriversPage /> },
      { path: "dashboard/service/operations/routes", element: <ServicePartner.ShRoutesPage /> },
      { path: "dashboard/service/operations/rsa", element: <ServicePartner.ShRsaPage /> },
      { path: "dashboard/service/finance/revenue", element: <ServicePartner.ShFinanceRevenuePage /> },
      { path: "dashboard/service/finance/invoices", element: <ServicePartner.ShFinanceInvoicesPage /> },
      { path: "dashboard/service/finance/claims", element: <ServicePartner.ShInsuranceClaimsPage /> },
      { path: "dashboard/service/finance/payments", element: <ServicePartner.ShFinancePaymentsPage /> },
      { path: "dashboard/service/finance/expenses", element: <ServicePartner.ShFinanceExpensesPage /> },
      { path: "dashboard/service/finance/profit", element: <ServicePartner.ShFinanceProfitPage /> },
      { path: "dashboard/service/marketing/whatsapp", element: <ServicePartner.ShWhatsAppPage /> },
      { path: "dashboard/service/marketing/sms", element: <ServicePartner.ShMarketingSmsPage /> },
      { path: "dashboard/service/marketing/reminders", element: <ServicePartner.ShMarketingRemindersPage /> },
      { path: "dashboard/service/marketing/offers", element: <ServicePartner.ShMarketingOffersPage /> },
      { path: "dashboard/service/analytics", element: <ServicePartner.ShAnalyticsHubPage /> },
      { path: "dashboard/service/analytics/revenue", element: <ServicePartner.ShAnalyticsRevenuePage /> },
      { path: "dashboard/service/analytics/technicians", element: <ServicePartner.ShAnalyticsTechniciansPage /> },
      { path: "dashboard/service/analytics/workshop", element: <ServicePartner.ShAnalyticsWorkshopPage /> },
      { path: "dashboard/service/analytics/retention", element: <ServicePartner.ShAnalyticsRetentionPage /> },
      { path: "dashboard/service/analytics/branches", element: <ServicePartner.ShAnalyticsBranchesPage /> },
      { path: "dashboard/service/profile", element: <ServicePartner.ShProfilePage /> },
      { path: "dashboard/service/kyc", element: <ServicePartner.ShKycPage /> },
      { path: "dashboard/service/settings/gst", element: <ServicePartner.ShGstSettingsPage /> },
      { path: "dashboard/service/settings/team", element: <ServicePartner.ShTeamPage /> },
      { path: "dashboard/service/settings/hours", element: <ServicePartner.ShHoursPage /> },
      { path: "dashboard/service/settings", element: <ServicePartner.ShSettingsPage /> },
    ],
  },
  {
    element: (
      <ProtectedRoute roles={["service_technician", "admin"]}>
        <TechnicianDashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "dashboard/technician", element: <TechnicianJobsPage /> },
      { path: "dashboard/technician/booking/:id", element: <TechnicianJobDetailPage /> },
    ],
  },
  {
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "dashboard", element: <RoleDashboardRedirect /> },
      { path: "pending-approval", element: <PendingApprovalPage /> },
      {
        path: "dashboard/customer",
        element: (
          <ProtectedRoute roles={["customer", "admin", "super_admin"]}>
            <CustomerDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/customer/garage",
        element: (
          <ProtectedRoute roles={["customer", "admin", "super_admin"]}>
            <CustomerGaragePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/customer/garage/add",
        element: (
          <ProtectedRoute roles={["customer", "admin", "super_admin"]}>
            <CustomerAddVehiclePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/customer/documents",
        element: (
          <ProtectedRoute roles={["customer", "admin", "super_admin"]}>
            <CustomerDocumentsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/customer/insurance-wallet",
        element: (
          <ProtectedRoute roles={["customer", "admin", "super_admin"]}>
            <CustomerInsuranceWalletPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/customer/fastag",
        element: (
          <ProtectedRoute roles={["customer", "admin", "super_admin"]}>
            <CustomerFastagPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/customer/service-records",
        element: (
          <ProtectedRoute roles={["customer", "admin", "super_admin"]}>
            <CustomerServiceRecordsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/customer/vehicle-health",
        element: (
          <ProtectedRoute roles={["customer", "admin", "super_admin"]}>
            <CustomerVehicleHealthPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/customer/insights",
        element: (
          <ProtectedRoute roles={["customer", "admin", "super_admin"]}>
            <CustomerInsightsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/customer/notifications",
        element: (
          <ProtectedRoute roles={["customer", "admin", "super_admin"]}>
            <CustomerNotificationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/customer/rewards",
        element: (
          <ProtectedRoute roles={["customer", "admin", "super_admin"]}>
            <CustomerRewardsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/customer/profile",
        element: (
          <ProtectedRoute roles={["customer", "admin", "super_admin"]}>
            <CustomerProfileCenterPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/customer/recently-viewed",
        element: (
          <ProtectedRoute roles={["customer", "admin", "super_admin"]}>
            <CustomerRecentlyViewedPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/customer/loans",
        element: (
          <ProtectedRoute roles={["customer", "admin", "super_admin"]}>
            <CustomerLoansPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/customer/loans/:id",
        element: (
          <ProtectedRoute roles={["customer", "admin", "super_admin"]}>
            <LoanDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/admin",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <Navigate to="/dashboard/super-admin" replace />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/admin/community",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <CommunityModerationPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/admin/ai",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <AIControlCenterPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/admin/users",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <Navigate to="/dashboard/super-admin/users" replace />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/admin/dealers",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <Navigate to="/dashboard/super-admin/dealers" replace />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/admin/finance",
        element: (
          <ProtectedRoute roles={["admin", "finance_manager", "super_admin"]}>
            <FinanceManagerDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/admin/crm",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <Navigate to="/dashboard/super-admin/tickets" replace />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/admin/analytics",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <Navigate to="/dashboard/super-admin/analytics" replace />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/admin/settings",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <Navigate to="/dashboard/super-admin" replace />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/auction",
        element: (
          <ProtectedRoute roles={["admin", "auction_partner", "super_admin"]}>
            <AuctionDeskGate />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    element: (
      <ProtectedRoute roles={["super_admin", "admin"]}>
        <SuperAdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "dashboard/super-admin", element: <SuperAdminOverviewPage /> },
      { path: "dashboard/super-admin/business-approvals", element: <BusinessApprovalsPage /> },
      { path: "dashboard/super-admin/finance-approvals", element: <FinanceApprovalsPage /> },
      { path: "dashboard/super-admin/operations", element: <AdminOperationsPage /> },
      { path: "dashboard/super-admin/roles", element: <RoleDirectoryPage /> },
      { path: "dashboard/super-admin/users", element: <UsersManagementPage /> },
      { path: "dashboard/super-admin/dealers", element: <DealerApprovalsPage /> },
      { path: "dashboard/super-admin/kyc", element: <KycVerificationPage /> },
      { path: "dashboard/super-admin/vehicles", element: <VehicleModerationPage /> },
      { path: "dashboard/super-admin/featured", element: <FeaturedInventoryPage /> },
      { path: "dashboard/super-admin/auctions", element: <AuctionApprovalsPage /> },
      { path: "dashboard/super-admin/auction-desk", element: <AuctionAdminPage /> },
      { path: "dashboard/super-admin/analytics", element: <PlatformAnalyticsPage /> },
      { path: "dashboard/super-admin/transactions", element: <TransactionsPage /> },
      { path: "dashboard/super-admin/subscriptions", element: <SubscriptionsPage /> },
      { path: "dashboard/super-admin/reports", element: <ReportsPage /> },
      { path: "dashboard/super-admin/cms", element: <CmsPage /> },
      { path: "dashboard/super-admin/notifications", element: <NotificationsPage /> },
      { path: "dashboard/super-admin/banners", element: <BannersPage /> },
      { path: "dashboard/super-admin/ai", element: <SuperAdminAIPage /> },
      { path: "dashboard/super-admin/fraud", element: <FraudDetectionPage /> },
      { path: "dashboard/super-admin/tickets", element: <SupportTicketsPage /> },
      {
        path: "dashboard/super-admin/directory-monetization",
        element: <DirectoryMonetizationPage />,
      },
      { path: "dashboard/super-admin/founder", element: <FounderDashboardPage /> },
      { path: "dashboard/super-admin/lead-router", element: <LeadRouterPage /> },
      { path: "dashboard/super-admin/marketplace-leads", element: <MarketplaceLeadsPage /> },
      { path: "dashboard/founder", element: <FounderDashboardPage /> },
    ],
  },
  {
    element: (
      <ProtectedRoute>
        <FinanceDashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "dashboard/customer/insurance", element: <CustomerInsurancePage /> },
      {
        path: "dashboard/dsa",
        element: (
          <ProtectedRoute roles={["dsa_agent", "admin"]}>
            <DsaPortalPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/dsa/applications",
        element: (
          <ProtectedRoute roles={["dsa_agent", "admin"]}>
            <DsaApplicationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/dsa/leads",
        element: (
          <ProtectedRoute roles={["dsa_agent", "admin"]}>
            <DsaLeadsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/dsa/team",
        element: (
          <ProtectedRoute roles={["dsa_agent", "admin"]}>
            <DsaTeamPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/dsa/integrations",
        element: (
          <ProtectedRoute roles={["dsa_agent", "admin"]}>
            <DsaIntegrationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/finance",
        element: (
          <ProtectedRoute roles={["bank_nbfc", "admin"]}>
            <LenderDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/finance/applications",
        element: (
          <ProtectedRoute roles={["bank_nbfc", "admin"]}>
            <LenderApplicationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/finance-manager",
        element: (
          <ProtectedRoute roles={["finance_manager", "admin", "super_admin"]}>
            <FinanceManagerDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/finance-manager/applications",
        element: (
          <ProtectedRoute roles={["finance_manager", "admin", "super_admin"]}>
            <FinanceManagerApplicationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/finance-manager/applications/:id",
        element: (
          <ProtectedRoute roles={["finance_manager", "admin", "super_admin"]}>
            <FinanceManagerApplicationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/finance-manager/commissions",
        element: (
          <ProtectedRoute roles={["finance_manager", "admin", "super_admin"]}>
            <FinanceManagerCommissionsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/finance-manager/crm",
        element: (
          <ProtectedRoute roles={["finance_manager", "admin", "super_admin"]}>
            <FinanceLoanCrmPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/finance-manager/integrations",
        element: (
          <ProtectedRoute roles={["finance_manager", "admin", "super_admin"]}>
            <FinanceManagerIntegrationsPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "admin",
    element: (
      <ProtectedRoute roles={["admin"]}>
        <Navigate to="/dashboard/admin" replace />
      </ProtectedRoute>
    ),
  },
  {
    path: "admin/dashboard",
    element: (
      <ProtectedRoute roles={["admin"]}>
        <Navigate to="/dashboard/admin" replace />
      </ProtectedRoute>
    ),
  },
  {
    path: "super-admin",
    element: (
      <ProtectedRoute roles={["super_admin"]}>
        <Navigate to="/dashboard/super-admin" replace />
      </ProtectedRoute>
    ),
  },
  {
    path: "super-admin/dashboard",
    element: (
      <ProtectedRoute roles={["super_admin"]}>
        <Navigate to="/dashboard/super-admin" replace />
      </ProtectedRoute>
    ),
  },
  {
    path: "dealer",
    element: (
      <ProtectedRoute
        roles={[
          "dealer",
          "used_car_dealer",
          "new_car_dealer",
          "bike_dealer",
          "truck_dealer",
          "admin",
          "super_admin",
        ]}
      >
        <DealerAliasRedirect />
      </ProtectedRoute>
    ),
  },
  {
    path: "dashboard/preowned-dealer",
    element: (
      <ProtectedRoute roles={["used_car_dealer", "admin", "super_admin"]}>
        <Navigate to="/dashboard/dealer" replace />
      </ProtectedRoute>
    ),
  },
  {
    path: "dashboard/newcar-dealer",
    element: (
      <ProtectedRoute roles={["new_car_dealer", "admin", "super_admin"]}>
        <Navigate to="/dashboard/new-car" replace />
      </ProtectedRoute>
    ),
  },
  {
    path: "dealer/dashboard",
    element: (
      <ProtectedRoute
        roles={[
          "dealer",
          "used_car_dealer",
          "new_car_dealer",
          "bike_dealer",
          "truck_dealer",
          "admin",
          "super_admin",
        ]}
      >
        <DealerAliasRedirect />
      </ProtectedRoute>
    ),
  },
  {
    path: "customer",
    element: (
      <ProtectedRoute roles={["customer"]}>
        <Navigate to="/dashboard/customer" replace />
      </ProtectedRoute>
    ),
  },
  {
    path: "customer/dashboard",
    element: (
      <ProtectedRoute roles={["customer"]}>
        <Navigate to="/dashboard/customer" replace />
      </ProtectedRoute>
    ),
  },
  {
    path: "dsa",
    element: (
      <ProtectedRoute roles={["dsa_agent", "admin"]}>
        <Navigate to="/dashboard/dsa" replace />
      </ProtectedRoute>
    ),
  },
  {
    path: "dsa/dashboard",
    element: (
      <ProtectedRoute roles={["dsa_agent", "admin"]}>
        <Navigate to="/dashboard/dsa" replace />
      </ProtectedRoute>
    ),
  },
  {
    path: "finance/dashboard",
    element: (
      <ProtectedRoute>
        <FinanceDashboardAlias />
      </ProtectedRoute>
    ),
  },
  {
    path: "service-partner",
    element: (
      <ProtectedRoute roles={["service_center", "admin"]}>
        <Navigate to="/dashboard/service" replace />
      </ProtectedRoute>
    ),
  },
  {
    path: "service-partner/dashboard",
    element: (
      <ProtectedRoute roles={["service_center", "admin"]}>
        <Navigate to="/dashboard/service" replace />
      </ProtectedRoute>
    ),
  },
  {
    path: "parts-seller",
    element: (
      <ProtectedRoute roles={["parts_seller", "admin"]}>
        <Navigate to="/dashboard/parts" replace />
      </ProtectedRoute>
    ),
  },
  {
    path: "parts-seller/dashboard",
    element: (
      <ProtectedRoute roles={["parts_seller", "admin"]}>
        <Navigate to="/dashboard/parts" replace />
      </ProtectedRoute>
    ),
  },
  { path: "*", element: <NotFoundPage /> },
]);
