import type { HubCategoryItem } from "../types";

/** Live counts come from API — show zero until inventory is uploaded. */
export const BUY_HUB_CATEGORIES: HubCategoryItem[] = [
  {
    id: "cars",
    label: "Cars",
    description: "Hatchback, sedan, SUV & luxury",
    icon: "Car",
    stats: { new: "0", used: "0" },
  },
  {
    id: "bikes",
    label: "Bikes",
    description: "Motorcycles & scooters",
    icon: "Bike",
    stats: { new: "0", used: "0" },
  },
  {
    id: "trucks",
    label: "Trucks",
    description: "LCV, HCV & pickups",
    icon: "Truck",
    stats: { new: "0", used: "0" },
  },
  {
    id: "buses",
    label: "Buses",
    description: "School, staff & tourist coaches",
    icon: "Bus",
    stats: { new: "0", used: "0" },
  },
  {
    id: "auto",
    label: "Auto",
    description: "Passenger & cargo three-wheelers",
    icon: "CarTaxiFront",
    stats: { new: "0", used: "0" },
  },
  {
    id: "equipment",
    label: "Equipment",
    description: "Tractors, excavators & industrial",
    icon: "Tractor",
    stats: { new: "0", used: "0" },
  },
  {
    id: "ev",
    label: "Electric",
    description: "EV cars, bikes & commercial",
    icon: "Zap",
    stats: { new: "0", used: "0" },
  },
];
