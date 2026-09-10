export type AppRole =
  | "customer"
  | "dealer"
  | "used_car_dealer"
  | "new_car_dealer"
  | "bike_dealer"
  | "truck_dealer"
  | "dsa_agent"
  | "bank_nbfc"
  | "finance_manager"
  | "service_center"
  | "service_technician"
  | "parts_seller"
  | "admin"
  | "super_admin"
  | "auction_partner"
  | "broker"
  | "service_partner"
  | "preowned_dealer"
  | string;

export type RoleFamily = "customer" | "dealer" | "finance" | "service" | "parts" | "auction" | "broker" | "admin";

export type RoleModule = {
  id: string;
  title: string;
  body: string;
  tab?: "Home" | "Browse" | "Workspace" | "Profile";
  apiPath?: string;
};

export type RoleTabs = {
  home: string;
  browse: string;
  workspace: string;
  profile: string;
};

export type RoleWorkspace = {
  label: string;
  family: RoleFamily;
  webPath: string;
  headline: string;
  subtitle: string;
  tabs: RoleTabs;
  modules: RoleModule[];
};

const dealerModules: RoleModule[] = [
  { id: "inv", title: "Inventory", body: "Live stock & listings", tab: "Browse", apiPath: "/api/vehicles?limit=20" },
  { id: "leads", title: "Leads CRM", body: "Enquiries from marketplace", tab: "Workspace", apiPath: "/api/leads" },
  { id: "web", title: "Full dealer desk", body: "Open web CRM for deep tools", tab: "Workspace" },
];

const dealerTabs: RoleTabs = {
  home: "Dealer Desk",
  browse: "Stock",
  workspace: "Leads",
  profile: "Account",
};

export const ROLE_WORKSPACES: Record<string, RoleWorkspace> = {
  customer: {
    label: "Customer",
    family: "customer",
    webPath: "/dashboard/customer",
    headline: "Your garage & enquiries",
    subtitle: "Browse live inventory, send dealer leads, track alerts.",
    tabs: { home: "Home", browse: "Vehicles", workspace: "Enquiries", profile: "Account" },
    modules: [
      { id: "browse", title: "Browse vehicles", body: "Cars, bikes, SUVs & more", tab: "Browse", apiPath: "/api/vehicles?limit=24" },
      { id: "wish", title: "Wishlist", body: "Saved vehicles", tab: "Workspace", apiPath: "/api/wishlist" },
      { id: "home", title: "Home feed", body: "Marketplace highlights", tab: "Home", apiPath: "/api/home" },
    ],
  },
  dealer: {
    label: "Dealer",
    family: "dealer",
    webPath: "/dashboard/dealer",
    headline: "Showroom command",
    subtitle: "Pipeline leads, stock pulse, and WhatsApp follow-ups.",
    tabs: dealerTabs,
    modules: dealerModules,
  },
  used_car_dealer: {
    label: "Used car dealer",
    family: "dealer",
    webPath: "/dashboard/dealer",
    headline: "Pre-owned desk",
    subtitle: "Inbound buyer leads + inventory performance.",
    tabs: dealerTabs,
    modules: dealerModules,
  },
  preowned_dealer: {
    label: "Preowned dealer",
    family: "dealer",
    webPath: "/dashboard/dealer",
    headline: "Pre-owned desk",
    subtitle: "Inbound buyer leads + inventory performance.",
    tabs: dealerTabs,
    modules: dealerModules,
  },
  bike_dealer: {
    label: "Bike dealer",
    family: "dealer",
    webPath: "/dashboard/dealer",
    headline: "Two-wheeler desk",
    subtitle: "Leads and marketplace stock for bikes.",
    tabs: dealerTabs,
    modules: dealerModules,
  },
  truck_dealer: {
    label: "Truck dealer",
    family: "dealer",
    webPath: "/dashboard/dealer",
    headline: "CV desk",
    subtitle: "Commercial vehicle leads and stock.",
    tabs: dealerTabs,
    modules: dealerModules,
  },
  new_car_dealer: {
    label: "New car dealer",
    family: "dealer",
    webPath: "/dashboard/new-car",
    headline: "New car OS",
    subtitle: "Showroom enquiries, test-drives, and stock.",
    tabs: { home: "Showroom", browse: "Market", workspace: "Leads", profile: "Account" },
    modules: [
      { id: "stock", title: "Showroom stock", body: "New car inventory API", tab: "Workspace", apiPath: "/api/new-car/inventory" },
      { id: "leads", title: "Leads", body: "Dealer enquiries", tab: "Workspace", apiPath: "/api/leads" },
      { id: "browse", title: "Marketplace", body: "Public listings", tab: "Browse" },
    ],
  },
  dsa_agent: {
    label: "DSA agent",
    family: "finance",
    webPath: "/dashboard/dsa",
    headline: "DSA finance desk",
    subtitle: "Loan applications and finance leads — live underwriting queue.",
    tabs: { home: "Finance", browse: "Market", workspace: "Apps", profile: "Account" },
    modules: [
      { id: "fin", title: "Loan applications", body: "Finance desk applications", tab: "Workspace", apiPath: "/api/admin/finance/applications" },
      { id: "leads", title: "Leads", body: "Finance leads", tab: "Workspace", apiPath: "/api/leads" },
    ],
  },
  bank_nbfc: {
    label: "Bank / NBFC",
    family: "finance",
    webPath: "/dashboard/finance",
    headline: "Lender underwriting",
    subtitle: "Application queue with amounts, KYC, and status.",
    tabs: { home: "Lender", browse: "Market", workspace: "Queue", profile: "Account" },
    modules: [
      { id: "apps", title: "Applications", body: "Underwriting queue", tab: "Workspace", apiPath: "/api/admin/finance/applications" },
    ],
  },
  finance_manager: {
    label: "Finance manager",
    family: "finance",
    webPath: "/dashboard/finance-manager",
    headline: "Finance manager OS",
    subtitle: "Approvals, commissions, and platform finance ops.",
    tabs: { home: "Manager", browse: "Market", workspace: "Queue", profile: "Account" },
    modules: [
      { id: "apps", title: "Applications", body: "Manager queue", tab: "Workspace", apiPath: "/api/admin/finance/applications" },
      { id: "users", title: "Platform users", body: "User directory", tab: "Workspace", apiPath: "/api/admin/users" },
    ],
  },
  service_center: {
    label: "Service center",
    family: "service",
    webPath: "/dashboard/service",
    headline: "Workshop OS",
    subtitle: "Job alerts and partner notifications.",
    tabs: { home: "Workshop", browse: "Market", workspace: "Jobs", profile: "Account" },
    modules: [
      { id: "home", title: "Marketplace", body: "Public inventory", tab: "Browse" },
      { id: "notif", title: "Notifications", body: "Desk alerts", tab: "Workspace", apiPath: "/api/notifications" },
    ],
  },
  service_partner: {
    label: "Service partner",
    family: "service",
    webPath: "/dashboard/service",
    headline: "Service partner desk",
    subtitle: "Workshop ERP alerts and claims.",
    tabs: { home: "Service", browse: "Market", workspace: "Jobs", profile: "Account" },
    modules: [
      { id: "notif", title: "Notifications", body: "Desk alerts", tab: "Workspace", apiPath: "/api/notifications" },
    ],
  },
  service_technician: {
    label: "Technician",
    family: "service",
    webPath: "/dashboard/technician",
    headline: "Technician jobs",
    subtitle: "Assigned work alerts from the service desk.",
    tabs: { home: "Jobs", browse: "Market", workspace: "Alerts", profile: "Account" },
    modules: [
      { id: "notif", title: "Job alerts", body: "Notifications", tab: "Workspace", apiPath: "/api/notifications" },
    ],
  },
  parts_seller: {
    label: "Parts seller",
    family: "parts",
    webPath: "/dashboard/parts",
    headline: "Parts B2B desk",
    subtitle: "Verified directory and related vehicle demand.",
    tabs: { home: "Parts", browse: "Vehicles", workspace: "Directory", profile: "Account" },
    modules: [
      { id: "dir", title: "Business directory", body: "Verified partners", tab: "Workspace", apiPath: "/api/directory/verified" },
      { id: "browse", title: "Vehicles", body: "Related marketplace", tab: "Browse" },
    ],
  },
  auction_partner: {
    label: "Auction partner",
    family: "auction",
    webPath: "/dashboard/auction",
    headline: "Auction floor",
    subtitle: "Lot inventory and bidding pipeline.",
    tabs: { home: "Auction", browse: "Lots", workspace: "Pipeline", profile: "Account" },
    modules: [
      { id: "veh", title: "Lot inventory", body: "Available vehicles", tab: "Browse", apiPath: "/api/vehicles?limit=20" },
    ],
  },
  broker: {
    label: "Broker",
    family: "broker",
    webPath: "/dashboard/broker",
    headline: "Broker bridge",
    subtitle: "Buyer network and bridged leads.",
    tabs: { home: "Broker", browse: "Market", workspace: "Leads", profile: "Account" },
    modules: [
      { id: "leads", title: "Broker leads", body: "Lead bridge", tab: "Workspace", apiPath: "/api/broker/leads" },
      { id: "buyers", title: "Buyers", body: "Buyer network", tab: "Workspace", apiPath: "/api/broker/buyers" },
    ],
  },
  admin: {
    label: "Admin",
    family: "admin",
    webPath: "/dashboard/super-admin",
    headline: "Platform command",
    subtitle: "Users, approvals, finance queues, and live KPIs.",
    tabs: { home: "Command", browse: "Market", workspace: "Ops", profile: "Account" },
    modules: [
      { id: "ov", title: "Command overview", body: "Platform KPIs", tab: "Workspace", apiPath: "/api/admin/overview" },
      { id: "users", title: "Users", body: "User management", tab: "Workspace", apiPath: "/api/admin/users" },
      { id: "dealers", title: "Pending dealers", body: "Approvals", tab: "Workspace", apiPath: "/api/admin/dealers/pending" },
      { id: "biz", title: "Business approvals", body: "Pending accounts", tab: "Workspace", apiPath: "/api/admin/business-accounts/pending" },
    ],
  },
  super_admin: {
    label: "Super Admin",
    family: "admin",
    webPath: "/dashboard/super-admin",
    headline: "Super Admin ERP",
    subtitle: "Full control tower — KYC, dealers, finance, listings.",
    tabs: { home: "Command", browse: "Market", workspace: "Ops", profile: "Account" },
    modules: [
      { id: "ov", title: "Command overview", body: "Platform KPIs", tab: "Workspace", apiPath: "/api/admin/overview" },
      { id: "users", title: "Users", body: "User management", tab: "Workspace", apiPath: "/api/admin/users" },
      { id: "dealers", title: "Pending dealers", body: "Approvals", tab: "Workspace", apiPath: "/api/admin/dealers/pending" },
      { id: "biz", title: "Business approvals", body: "Pending accounts", tab: "Workspace", apiPath: "/api/admin/business-accounts/pending" },
      { id: "fin", title: "Finance apps", body: "Loan applications", tab: "Workspace", apiPath: "/api/admin/finance/applications" },
    ],
  },
};

export function resolveRole(role?: string | null): string {
  if (!role) return "customer";
  if (role === "service_partner") return "service_center";
  if (role === "preowned_dealer") return "used_car_dealer";
  return role;
}

export function getRoleWorkspace(role?: string | null): RoleWorkspace {
  const key = resolveRole(role);
  return (
    ROLE_WORKSPACES[key] ?? {
      label: key.replace(/_/g, " "),
      family: "customer" as RoleFamily,
      webPath: "/dashboard/customer",
      headline: "Motorcart desk",
      subtitle: "Role workspace connected to live APIs.",
      tabs: ROLE_WORKSPACES.customer.tabs,
      modules: ROLE_WORKSPACES.customer.modules,
    }
  );
}

export function getRoleFamily(role?: string | null): RoleFamily {
  return getRoleWorkspace(role).family;
}

export type AppMenuItem = {
  id: string;
  label: string;
  glyph: string;
  kind: "tab" | "web";
  tab?: "Home" | "Browse" | "Workspace" | "Profile";
  webPath?: string;
};

export type AppMenuSection = {
  title: string;
  items: AppMenuItem[];
};

/** Side menu sections — mirrors web role nav + in-app tabs. */
export function getAppMenuSections(role?: string | null): AppMenuSection[] {
  const ws = getRoleWorkspace(role);
  const family = ws.family;

  const appTabs: AppMenuSection = {
    title: "In this app",
    items: [
      { id: "home", label: ws.tabs.home, glyph: "⌂", kind: "tab", tab: "Home" },
      { id: "browse", label: ws.tabs.browse, glyph: "◎", kind: "tab", tab: "Browse" },
      { id: "workspace", label: ws.tabs.workspace, glyph: "◫", kind: "tab", tab: "Workspace" },
      { id: "profile", label: ws.tabs.profile, glyph: "◉", kind: "tab", tab: "Profile" },
    ],
  };

  if (family === "dealer") {
    return [
      appTabs,
      {
        title: "Dealer OS",
        items: [
          { id: "d-dash", label: "Dashboard", glyph: "◫", kind: "web", webPath: "/dashboard/dealer" },
          { id: "d-inv", label: "Inventory", glyph: "▣", kind: "web", webPath: "/dashboard/dealer/inventory" },
          { id: "d-leads", label: "Lead CRM", glyph: "◉", kind: "web", webPath: "/dashboard/dealer/leads" },
          { id: "d-enq", label: "Enquiries", glyph: "?", kind: "web", webPath: "/dashboard/dealer/enquiries" },
          { id: "d-fin", label: "Finance", glyph: "₹", kind: "web", webPath: "/dashboard/dealer/finance" },
          { id: "d-store", label: "Storefront", glyph: "◈", kind: "web", webPath: "/dashboard/dealer/storefront" },
          { id: "d-set", label: "Settings", glyph: "⚙", kind: "web", webPath: "/dashboard/dealer/settings" },
        ],
      },
    ];
  }

  if (family === "admin") {
    return [
      appTabs,
      {
        title: "Admin ERP",
        items: [
          { id: "a-home", label: "Command center", glyph: "◫", kind: "web", webPath: "/dashboard/super-admin" },
          { id: "a-users", label: "Users", glyph: "◉", kind: "web", webPath: "/dashboard/super-admin/users" },
          { id: "a-dealers", label: "Dealers", glyph: "◈", kind: "web", webPath: "/dashboard/super-admin/dealers" },
          {
            id: "a-leads",
            label: "Marketplace leads",
            glyph: "?",
            kind: "web",
            webPath: "/dashboard/super-admin/marketplace-leads",
          },
        ],
      },
    ];
  }

  if (family === "customer") {
    return [
      appTabs,
      {
        title: "Ownership OS",
        items: [
          { id: "c-garage", label: "My garage", glyph: "▣", kind: "web", webPath: "/dashboard/customer/garage" },
          {
            id: "c-notif",
            label: "Notifications",
            glyph: "◌",
            kind: "web",
            webPath: "/dashboard/customer/notifications",
          },
          { id: "c-prof", label: "Account settings", glyph: "⚙", kind: "web", webPath: "/dashboard/customer/profile" },
        ],
      },
    ];
  }

  return [
    appTabs,
    {
      title: "Web workspace",
      items: [{ id: "web-desk", label: "Open full web CRM", glyph: "↗", kind: "web", webPath: ws.webPath }],
    },
  ];
}