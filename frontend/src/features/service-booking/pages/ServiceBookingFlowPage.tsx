import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { DEFAULT_SERVICE_BOOK_PATH } from "../lib/service-book-routes";
import { ArrowLeft, CalendarPlus, CheckCircle2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";
import { setPageMeta } from "@/utils/seo";
import { formatSlotLabel } from "../lib/slots";
import { googleCalendarUrl } from "../lib/calendar";
import { serviceSupportWhatsAppUrl } from "../lib/whatsapp";
import { useServiceBookingFlow } from "../hooks/useServiceBookingFlow";

export function ServiceBookingFlowPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const user = useAuthStore((s) => s.user);

  const validServiceId = Boolean(serviceId) && serviceId !== "undefined";
  const flow = useServiceBookingFlow(validServiceId ? serviceId! : "", user?.id);
  const [otpMsg, setOtpMsg] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({ title: "Book service — Motorcart.in", description: "Choose slot, pickup & drop, confirm with OTP." });
  }, []);

  if (!validServiceId) {
    return <Navigate to={DEFAULT_SERVICE_BOOK_PATH} replace />;
  }

  if (!user) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-20">
        <Card className="border-border bg-card">
          <CardContent className="space-y-4 p-8 text-center text-white">
            <p className="text-lg font-medium">Sign in to book</p>
            <p className="text-sm text-muted-foreground">We need your account to send OTP, receipts, and tracking updates.</p>
            <Button className="bg-primary text-primary-foreground" asChild>
              <Link to="/login" state={{ from: { pathname: `/services/book/${serviceId}` } }}>
                Continue to login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const start = flow.created ? new Date(flow.created.scheduledAt) : null;
  const end =
    flow.created && flow.service?.durationMinutes
      ? new Date(new Date(flow.created.scheduledAt).getTime() + flow.service.durationMinutes * 60000)
      : flow.created
        ? new Date(new Date(flow.created.scheduledAt).getTime() + 60 * 60000)
        : null;

  const calHref =
    flow.created && start && end
      ? googleCalendarUrl({
          title: `${flow.service?.name ?? "Service"} @ ${flow.center?.name ?? "Motorcart"}`,
          start,
          end,
          details: `Booking ${flow.created.id}. OTP verified: ${flow.created.otpVerified ? "yes" : "pending"}`,
          location: flow.center?.address ? `${flow.center.address}, ${flow.center.city}` : flow.center?.city,
        })
      : null;

  const waHref =
    flow.center?.phone &&
    flow.created &&
    serviceSupportWhatsAppUrl({
      phoneDigits: flow.center.phone.replace(/\D/g, "") || "919876543210",
      lines: [
        flow.center.name,
        `Booking: ${flow.created.id}`,
        `Service: ${flow.service?.name}`,
        `Slot: ${formatSlotLabel(flow.created.scheduledAt)}`,
      ],
    });

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      <div className="border-b border-border bg-card/60">
        <div className="container mx-auto flex max-w-3xl items-center gap-4 px-4 py-4">
          <Button variant="ghost" size="icon" className="text-muted-foreground" asChild>
            <Link to="/services">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Uber-style flow</p>
            <h1 className="text-xl font-bold text-foreground">Book service</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
        {flow.loading ? (
          <Skeleton className="h-40 rounded-xl bg-muted" />
        ) : !flow.service || !flow.center ? (
          <p className="text-muted-foreground">Service not found.</p>
        ) : !flow.created ? (
          <>
            <Card className="border-border bg-card">
              <CardContent className="space-y-2 p-6">
                <Badge variant="outline" className="border-primary/40 text-primary">
                  {flow.center.name}
                </Badge>
                <h2 className="text-2xl font-semibold text-foreground">{flow.service.name}</h2>
                <p className="text-sm text-muted-foreground">{flow.service.description}</p>
                {flow.center.pickupDropAvailable && (
                  <p className="flex items-center gap-2 text-xs text-primary">
                    <MapPin className="h-3.5 w-3.5" />
                    Pickup & drop available at this center
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="space-y-4 p-6">
                <h3 className="font-medium text-foreground">1. Vehicle & slot</h3>
                <div>
                  <Label className="text-muted-foreground">Registration</Label>
                  <Input
                    value={flow.vehicleReg}
                    onChange={(e) => flow.setVehicleReg(e.target.value.toUpperCase())}
                    placeholder="KA01AB1234"
                    className="mt-1 border-border bg-background"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Available slots</p>
                  <div className="mt-2 flex max-h-52 flex-wrap gap-2 overflow-y-auto">
                    {flow.slots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No open slots in this window.</p>
                    ) : (
                      flow.slots.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => flow.setSelectedSlot(s)}
                          className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                            flow.selectedSlot === s
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-zinc-500"
                          }`}
                        >
                          {formatSlotLabel(s)}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="space-y-4 p-6">
                <h3 className="font-medium text-foreground">2. Pickup & drop (optional)</h3>
                <div>
                  <Label className="text-muted-foreground">Pickup address</Label>
                  <Input
                    value={flow.pickup}
                    onChange={(e) => flow.setPickup(e.target.value)}
                    placeholder="Full address for valet pickup"
                    className="mt-1 border-border bg-background"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">Drop address</Label>
                  <Input
                    value={flow.drop}
                    onChange={(e) => flow.setDrop(e.target.value)}
                    placeholder="Where to return the vehicle"
                    className="mt-1 border-border bg-background"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground">Notes for the workshop</Label>
                  <textarea
                    value={flow.notes}
                    onChange={(e) => flow.setNotes(e.target.value)}
                    className="mt-1 min-h-[72px] w-full rounded-md border border-border bg-background p-2 text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="border-primary/30 bg-card">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-6 w-6" />
                <span className="font-semibold">Booking created</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Slot {formatSlotLabel(flow.created.scheduledAt)} · Handover OTP (show to service advisor):
              </p>
              <p className="text-3xl font-mono font-bold tracking-widest text-foreground">{flow.created.otpCode ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Verify OTP below to confirm in-app tracking.</p>
              <div className="flex flex-wrap gap-2">
                {calHref && (
                  <Button variant="outline" size="sm" className="border-border" asChild>
                    <a href={calHref} target="_blank" rel="noreferrer">
                      <CalendarPlus className="mr-2 h-4 w-4" />
                      Add to Google Calendar
                    </a>
                  </Button>
                )}
                {waHref && (
                  <Button variant="outline" size="sm" className="border-primary/50 text-primary" asChild>
                    <a href={waHref} target="_blank" rel="noreferrer">
                      WhatsApp center
                    </a>
                  </Button>
                )}
                <Button size="sm" variant="secondary" asChild>
                  <Link to={`/services/bookings/${flow.created.id}`}>Open tracking</Link>
                </Button>
              </div>
              <div className="flex gap-2 border-t border-border pt-4">
                <Input
                  placeholder="Enter OTP"
                  value={flow.otp}
                  onChange={(e) => flow.setOtp(e.target.value)}
                  className="border-border bg-background"
                />
                <Button
                  disabled={flow.otpBusy}
                  className="bg-primary text-primary-foreground"
                  onClick={async () => {
                    const r = await flow.confirmOtp();
                    setOtpMsg(r.ok ? "Verified — tracking updated." : r.error ?? "Failed");
                  }}
                >
                  Verify
                </Button>
              </div>
              {otpMsg && <p className="text-sm text-muted-foreground">{otpMsg}</p>}
            </CardContent>
          </Card>
        )}
      </div>

      {!flow.loading && flow.service && flow.center && !flow.created && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 p-4 backdrop-blur">
          <div className="container mx-auto flex max-w-3xl items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {flow.selectedSlot ? formatSlotLabel(flow.selectedSlot) : "Pick a slot to continue"}
            </p>
            <Button
              className="bg-primary text-primary-foreground hover:bg-[#1ebe5d]"
              disabled={flow.submitting || !flow.selectedSlot || !flow.vehicleReg.trim()}
              onClick={async () => {
                await flow.submit();
              }}
            >
              {flow.submitting ? "Booking…" : "Confirm booking"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
