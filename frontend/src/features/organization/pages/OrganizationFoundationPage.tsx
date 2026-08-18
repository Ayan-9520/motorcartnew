import { useEffect, useState } from "react";
import { Building2, Lock, MapPin, Users } from "lucide-react";
import { DealerConsoleShell } from "@/features/dealer-crm/components/DealerConsoleShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setPageMeta } from "@/utils/seo";
import toast from "react-hot-toast";
import {
  addOrgMember,
  createOrgBranch,
  fetchMyOrganization,
  fetchOrgBranches,
  fetchOrgEntitlements,
  fetchOrgMembers,
  fetchOrgProfile,
  patchOrganization,
  patchOrgProfile,
  type FeatureView,
  type OrgBranchDto,
  type OrganizationDto,
  type OrgMemberDto,
  type PartnerProfileDto,
} from "../services/organization.service";
import { apiErrorMessage } from "@/lib/api/axios";
import { featureFlags } from "@/config/feature-flags";

const MEMBER_ROLES = ["SALES", "MANAGER", "VIEWER", "FINANCE", "OPERATIONS", "ADMIN"] as const;

export function OrganizationFoundationPage() {
  const [org, setOrg] = useState<OrganizationDto | null>(null);
  const [profile, setProfile] = useState<PartnerProfileDto | null>(null);
  const [members, setMembers] = useState<OrgMemberDto[]>([]);
  const [branches, setBranches] = useState<OrgBranchDto[]>([]);
  const [features, setFeatures] = useState<FeatureView[]>([]);
  const [plan, setPlan] = useState("free");
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchCity, setBranchCity] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<(typeof MEMBER_ROLES)[number]>("SALES");

  const load = async () => {
    if (!featureFlags.organizationLayer) return;
    setLoading(true);
    try {
      const mine = await fetchMyOrganization();
      const current = mine.current ?? mine.data[0] ?? null;
      setOrg(current);
      if (!current) return;
      setName(current.name);
      setDisplayName(current.displayName);
      const [p, m, b, e] = await Promise.all([
        fetchOrgProfile(current.id),
        fetchOrgMembers(current.id),
        fetchOrgBranches(current.id),
        fetchOrgEntitlements(current.id),
      ]);
      setProfile(p);
      setPhone(p.phone ?? "");
      setWebsite(p.website ?? "");
      setMembers(m);
      setBranches(b);
      setFeatures(e.features);
      setPlan(e.plan);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPageMeta({ title: "Organization" });
    void load();
  }, []);

  const saveProfile = async () => {
    if (!org) return;
    try {
      await patchOrganization(org.id, { name, displayName });
      await patchOrgProfile(org.id, { businessName: name, displayName, phone, website });
      toast.success("Organization saved");
      void load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const addBranch = async () => {
    if (!org || !branchName.trim()) return;
    try {
      await createOrgBranch(org.id, { name: branchName, city: branchCity || undefined });
      setBranchName("");
      setBranchCity("");
      toast.success("Branch added");
      void load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const invite = async () => {
    if (!org || !memberEmail.trim()) return;
    try {
      await addOrgMember(org.id, { email: memberEmail, role: memberRole });
      setMemberEmail("");
      toast.success("Member added");
      void load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  if (!featureFlags.organizationLayer) {
    return <p className="text-muted-foreground">Organization layer is disabled.</p>;
  }

  return (
    <DealerConsoleShell
      title="Organization"
      description="Partner foundation: profile, locations, team roles, and plan entitlements. Not a full CRM."
      crumbs={[{ label: "Organization" }]}
    >
      {loading ? (
        <p className="text-muted-foreground">Loading organization…</p>
      ) : !org ? (
        <p className="text-muted-foreground">No organization for this account.</p>
      ) : (
        <div className="space-y-6">
          <section className="dealer-os-card space-y-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <Building2 className="h-5 w-5 text-primary" /> Organization profile
            </h2>
            <p className="text-sm text-muted-foreground">
              Type <strong>{org.type}</strong> · Plan <strong className="uppercase">{plan}</strong> · Role is assigned per member.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Legal / business name</Label>
                <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Display name</Label>
                <Input className="mt-1" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <Label>Website</Label>
                <Input className="mt-1" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
            </div>
            <Button className="rounded-xl" onClick={() => void saveProfile()}>
              Save profile
            </Button>
            {profile && (
              <p className="text-xs text-muted-foreground">Verification: {profile.verificationStatus} (badges are not manually assigned).</p>
            )}
          </section>

          <section className="dealer-os-card space-y-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <MapPin className="h-5 w-5 text-primary" /> Branches / locations
            </h2>
            <ul className="space-y-2 text-sm">
              {branches.map((b) => (
                <li key={b.id} className="rounded-lg border border-border/60 px-3 py-2">
                  <strong>{b.name}</strong>
                  {b.isHeadquarters ? " · HQ" : ""}
                  <span className="text-muted-foreground">
                    {" "}
                    {[b.city, b.state, b.postalCode].filter(Boolean).join(", ") || "No address yet"}
                  </span>
                </li>
              ))}
            </ul>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input placeholder="Branch name" value={branchName} onChange={(e) => setBranchName(e.target.value)} />
              <Input placeholder="City" value={branchCity} onChange={(e) => setBranchCity(e.target.value)} />
              <Button variant="outline" className="rounded-xl" onClick={() => void addBranch()}>
                Add branch
              </Button>
            </div>
          </section>

          <section className="dealer-os-card space-y-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <Users className="h-5 w-5 text-primary" /> Team members
            </h2>
            <ul className="space-y-2 text-sm">
              {members.map((m) => (
                <li key={m.id} className="rounded-lg border border-border/60 px-3 py-2">
                  <strong>{m.fullName || m.email || m.userId}</strong>
                  <span className="text-muted-foreground"> · {m.role}</span>
                </li>
              ))}
            </ul>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input placeholder="Member email" type="email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} />
              <select
                className="dealer-os-select"
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value as (typeof MEMBER_ROLES)[number])}
              >
                {MEMBER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <Button variant="outline" className="rounded-xl" onClick={() => void invite()}>
                Add member
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">The person must already have a MotorCart login. Customers cannot be org members.</p>
          </section>

          <section className="dealer-os-card space-y-3">
            <h2 className="flex items-center gap-2 font-semibold">
              <Lock className="h-5 w-5 text-primary" /> Features
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {features.map((f) => (
                <li key={f.key} className="rounded-lg border border-border/60 px-3 py-2 text-sm">
                  <strong className="block">{f.key.replace(/_/g, " ")}</strong>
                  {f.active ? (
                    <span className="text-emerald-700">Active</span>
                  ) : (
                    <span className="text-muted-foreground">{f.hint}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </DealerConsoleShell>
  );
}
