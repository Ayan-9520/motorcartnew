import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UNASSIGNED_DEALER_SLUG, isWithinDuplicateWindow, mapLeadToPipelineStatus, pickEnquiryDealer } from "./enquiry.types";
import { validateEnquiryInput } from "./enquiry.validation";

describe("customer enquiry validation", () => {
  it("rejects missing/invalid phone", () => {
    const result = validateEnquiryInput({ name: "Asha", phone: "123" });
    assert.equal(result.ok, false);
  });

  it("rejects invalid email", () => {
    const result = validateEnquiryInput({
      name: "Asha Kumar",
      phone: "9876543210",
      email: "not-an-email",
    });
    assert.equal(result.ok, false);
  });

  it("rejects explicit consent=false", () => {
    const result = validateEnquiryInput({
      name: "Asha Kumar",
      phone: "9876543210",
      consent: false,
    });
    assert.equal(result.ok, false);
  });

  it("accepts a valid enquiry", () => {
    const result = validateEnquiryInput({
      name: "Asha Kumar",
      phone: "+91 98765 43210",
      email: "asha@example.com",
      vehicle_id: "veh-1",
      message: "Please call me",
      consent: true,
      preferred_contact: "phone",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.phone, "9876543210");
      assert.equal(result.value.preferredContact, "phone");
    }
  });
});

describe("enquiry dealer routing", () => {
  const unassigned = { slug: UNASSIGNED_DEALER_SLUG, id: "u" };
  const dealer = { slug: "city-motors", id: "d1" };

  it("routes to the listing dealer when present", () => {
    const picked = pickEnquiryDealer({
      vehicleDealer: dealer,
      requestDealer: null,
      unassigned,
    });
    assert.equal(picked.assignment, "assigned");
    assert.equal(picked.dealer.id, "d1");
  });

  it("marks unassigned when no dealer exists", () => {
    const picked = pickEnquiryDealer({
      vehicleDealer: null,
      requestDealer: null,
      unassigned,
    });
    assert.equal(picked.assignment, "unassigned");
    assert.equal(picked.dealer.slug, UNASSIGNED_DEALER_SLUG);
  });

  it("does not treat mock slug as a dealer unless it already exists", () => {
    const picked = pickEnquiryDealer({
      vehicleDealer: null,
      requestDealer: null,
      unassigned,
    });
    assert.equal(picked.assignment, "unassigned");
  });
});

describe("duplicate / spam window", () => {
  it("treats the same phone+vehicle within 15 minutes as a duplicate", () => {
    const now = new Date("2026-08-18T10:15:00Z");
    const recent = new Date("2026-08-18T10:05:00Z");
    const old = new Date("2026-08-18T09:00:00Z");
    assert.equal(isWithinDuplicateWindow(recent, now), true);
    assert.equal(isWithinDuplicateWindow(old, now), false);
  });
});

describe("enquiry pipeline status", () => {
  it("maps new+assigned to ASSIGNED without a schema change", () => {
    assert.equal(mapLeadToPipelineStatus("new", { assignment: "assigned" }), "ASSIGNED");
    assert.equal(mapLeadToPipelineStatus("new", { assignment: "unassigned" }), "NEW");
    assert.equal(mapLeadToPipelineStatus("lost", { closed: true }), "CLOSED");
  });
});
