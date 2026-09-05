import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Award, Bell, Shield, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/hooks/useUser";
import { CustomerEcosystemPage } from "../components/CustomerEcosystemPage";
import { useCustomerEcosystem } from "../hooks/useCustomerEcosystem";
import { setPageMeta } from "@/utils/seo";

export function CustomerProfileCenterPage() {
  const { user, loading, updateProfile } = useUser();
  const { data, savePreferences, saving } = useCustomerEcosystem();

  useEffect(() => {
    setPageMeta({ title: "Account Center" });
  }, []);

  if (!user) return null;

  const kycVariant = {
    pending: "outline",
    submitted: "secondary",
    verified: "success",
    rejected: "destructive",
  } as const;

  return (
    <CustomerEcosystemPage
      title="Account center"
      description="Profile, KYC, rewards & notification preferences."
      wide
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="cos-profile-card lg:col-span-1">
          <div className="cos-profile-card__avatar">
            <User className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold">{user.fullName}</h2>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <Badge variant={kycVariant[user.kycStatus]} className="mt-2">
            KYC {user.kycStatus}
          </Badge>
          <p className="mt-4 text-2xl font-bold tabular-nums">{data?.preferences.profileCompletion ?? 0}%</p>
          <p className="text-xs text-muted-foreground">Profile completion</p>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <Award className="h-4 w-4 text-primary" />
            {data?.preferences.rewardPointsBalance.toLocaleString("en-IN")} pts · {data?.preferences.loyaltyTier}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <section className="cos-form-card cos-profile-section" id="personal">
            <h3 className="font-semibold">Personal details</h3>
            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                void (async () => {
                  await updateProfile({
                    full_name: fd.get("fullName") as string,
                    phone: fd.get("phone") as string,
                    city: fd.get("city") as string,
                    state: fd.get("state") as string,
                  });
                  await savePreferences({
                    city: String(fd.get("city") ?? ""),
                    state: String(fd.get("state") ?? ""),
                    dob: String(fd.get("dob") ?? "") || undefined,
                    anniversary: String(fd.get("anniversary") ?? "") || undefined,
                  });
                })();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Full name</Label>
                  <Input name="fullName" defaultValue={user.fullName} className="mt-1 rounded-xl" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input name="phone" defaultValue={user.phone ?? ""} className="mt-1 rounded-xl" />
                </div>
                <div>
                  <Label>City</Label>
                  <Input name="city" defaultValue={user.city ?? data?.preferences.city ?? ""} className="mt-1 rounded-xl" />
                </div>
                <div>
                  <Label>State</Label>
                  <Input name="state" defaultValue={user.state ?? data?.preferences.state ?? ""} className="mt-1 rounded-xl" />
                </div>
                <div>
                  <Label>Date of birth</Label>
                  <Input type="date" name="dob" defaultValue={data?.preferences.dob} className="mt-1 rounded-xl" />
                </div>
                <div>
                  <Label>Anniversary</Label>
                  <Input type="date" name="anniversary" defaultValue={data?.preferences.anniversary} className="mt-1 rounded-xl" />
                </div>
              </div>
              <Button type="submit" disabled={loading || saving} className="rounded-xl">
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </section>

          <section className="cos-form-card cos-profile-section" id="security">
            <h3 className="flex items-center gap-2 font-semibold">
              <Shield className="h-4 w-4" /> Security & KYC
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">Verify identity for loans, insurance & auctions.</p>
            <Button className="mt-3 rounded-xl" asChild>
              <Link to="/profile/kyc">Complete KYC</Link>
            </Button>
          </section>

          <section className="cos-form-card cos-profile-section" id="notifications">
            <h3 className="flex items-center gap-2 font-semibold">
              <Bell className="h-4 w-4" /> Notification preferences
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex justify-between rounded-lg border px-3 py-2">
                Insurance reminders <span className="text-muted-foreground">{data?.preferences.notifyInsurance === false ? "Off" : "On"}</span>
              </li>
              <li className="flex justify-between rounded-lg border px-3 py-2">
                Service reminders <span className="text-muted-foreground">{data?.preferences.notifyService === false ? "Off" : "On"}</span>
              </li>
              <li className="flex justify-between rounded-lg border px-3 py-2">
                EMI alerts <span className="text-muted-foreground">From loan applications when present</span>
              </li>
              <li className="flex justify-between rounded-lg border px-3 py-2">
                Marketing <span className="text-muted-foreground">Off</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </CustomerEcosystemPage>
  );
}
