import type { HubCategorySlug } from "../types";

export type BuyBrandItem = {
  id: string;
  name: string;
  /** Filter value for `?brand=` */
  brand: string;
  logo?: string;
};

/** Bump when replacing partner SVGs so browsers skip immutable cache. */
const LOGO_V = "v20260825auto";
const carLogo = (file: string) => `/partners/cars/${file}.svg?${LOGO_V}`;

/** Full India OEM set with logos under /partners/cars */
export const BUY_CAR_BRANDS: BuyBrandItem[] = [
  { id: "maruti", name: "Maruti Suzuki", brand: "Maruti", logo: carLogo("maruti") },
  { id: "hyundai", name: "Hyundai", brand: "Hyundai", logo: carLogo("hyundai") },
  { id: "tata", name: "Tata", brand: "Tata", logo: carLogo("tata") },
  { id: "mahindra", name: "Mahindra", brand: "Mahindra", logo: carLogo("mahindra") },
  { id: "toyota", name: "Toyota", brand: "Toyota", logo: carLogo("toyota") },
  { id: "honda", name: "Honda", brand: "Honda", logo: carLogo("honda") },
  { id: "kia", name: "Kia", brand: "Kia", logo: carLogo("kia") },
  { id: "mg", name: "MG", brand: "MG", logo: carLogo("mg") },
  { id: "skoda", name: "Škoda", brand: "Skoda", logo: carLogo("skoda") },
  { id: "volkswagen", name: "Volkswagen", brand: "Volkswagen", logo: carLogo("volkswagen") },
  { id: "nissan", name: "Nissan", brand: "Nissan", logo: carLogo("nissan") },
  { id: "renault", name: "Renault", brand: "Renault", logo: carLogo("renault") },
  { id: "citroen", name: "Citroën", brand: "Citroen", logo: carLogo("citroen") },
  { id: "jeep", name: "Jeep", brand: "Jeep", logo: carLogo("jeep") },
  { id: "ford", name: "Ford", brand: "Ford", logo: carLogo("ford") },
  { id: "isuzu", name: "Isuzu", brand: "Isuzu", logo: carLogo("isuzu") },
  { id: "bmw", name: "BMW", brand: "BMW", logo: carLogo("bmw") },
  { id: "mercedes", name: "Mercedes", brand: "Mercedes-Benz", logo: carLogo("mercedes") },
  { id: "audi", name: "Audi", brand: "Audi", logo: carLogo("audi") },
  { id: "volvo", name: "Volvo", brand: "Volvo", logo: carLogo("volvo") },
  { id: "jaguar", name: "Jaguar", brand: "Jaguar", logo: carLogo("jaguar") },
  { id: "landrover", name: "Land Rover", brand: "Land Rover", logo: carLogo("landrover") },
  { id: "lexus", name: "Lexus", brand: "Lexus", logo: carLogo("lexus") },
  { id: "porsche", name: "Porsche", brand: "Porsche", logo: carLogo("porsche") },
];

export const BUY_BIKE_BRANDS: BuyBrandItem[] = [
  { id: "hero", name: "Hero", brand: "Hero", logo: carLogo("hero") },
  { id: "honda-2w", name: "Honda", brand: "Honda", logo: carLogo("honda") },
  { id: "bajaj", name: "Bajaj", brand: "Bajaj", logo: carLogo("bajaj") },
  { id: "tvs", name: "TVS", brand: "TVS", logo: carLogo("tvs") },
  { id: "yamaha", name: "Yamaha", brand: "Yamaha", logo: carLogo("yamaha") },
  { id: "re", name: "Royal Enfield", brand: "Royal Enfield", logo: carLogo("royal-enfield") },
  { id: "suzuki-2w", name: "Suzuki", brand: "Suzuki", logo: carLogo("suzuki-moto") },
  { id: "ktm", name: "KTM", brand: "KTM", logo: carLogo("ktm") },
  { id: "jawa", name: "Jawa", brand: "Jawa", logo: carLogo("jawa") },
  { id: "triumph", name: "Triumph", brand: "Triumph", logo: carLogo("triumph") },
  { id: "harley", name: "Harley-Davidson", brand: "Harley-Davidson", logo: carLogo("harley") },
  { id: "bmw-moto", name: "BMW", brand: "BMW", logo: carLogo("bmw-moto") },
  { id: "benelli", name: "Benelli", brand: "Benelli", logo: carLogo("benelli") },
  { id: "ola", name: "Ola", brand: "Ola", logo: carLogo("ola") },
  { id: "ather", name: "Ather", brand: "Ather", logo: carLogo("ather") },
  { id: "vida", name: "Vida", brand: "Vida", logo: carLogo("vida") },
  { id: "ultraviolette", name: "Ultraviolette", brand: "Ultraviolette", logo: carLogo("ultraviolette") },
  { id: "ampere", name: "Ampere", brand: "Ampere", logo: carLogo("ampere") },
];

export const BUY_TRUCK_BRANDS: BuyBrandItem[] = [
  { id: "tata-cv", name: "Tata", brand: "Tata", logo: carLogo("tata") },
  { id: "ashok", name: "Ashok Leyland", brand: "Ashok Leyland", logo: carLogo("ashok-leyland") },
  { id: "mahindra-cv", name: "Mahindra", brand: "Mahindra", logo: carLogo("mahindra-mark") },
  { id: "eicher", name: "Eicher", brand: "Eicher", logo: carLogo("eicher") },
  { id: "bharatbenz", name: "BharatBenz", brand: "BharatBenz", logo: carLogo("bharatbenz") },
  { id: "volvo-cv", name: "Volvo", brand: "Volvo", logo: carLogo("volvo") },
  { id: "isuzu-cv", name: "Isuzu", brand: "Isuzu", logo: carLogo("isuzu") },
];

export const BUY_EV_BRANDS: BuyBrandItem[] = [
  { id: "tata-ev", name: "Tata", brand: "Tata", logo: carLogo("tata") },
  { id: "hyundai-ev", name: "Hyundai", brand: "Hyundai", logo: carLogo("hyundai") },
  { id: "mg-ev", name: "MG", brand: "MG", logo: carLogo("mg") },
  { id: "mahindra-ev", name: "Mahindra", brand: "Mahindra", logo: carLogo("mahindra") },
  { id: "kia-ev", name: "Kia", brand: "Kia", logo: carLogo("kia") },
  { id: "bmw-ev", name: "BMW", brand: "BMW", logo: carLogo("bmw") },
  { id: "mercedes-ev", name: "Mercedes", brand: "Mercedes-Benz", logo: carLogo("mercedes") },
  { id: "ola-ev", name: "Ola", brand: "Ola", logo: carLogo("ola") },
  { id: "ather-ev", name: "Ather", brand: "Ather", logo: carLogo("ather") },
];

/** Pan-India 3W / passenger & cargo auto OEMs */
export const BUY_AUTO_BRANDS: BuyBrandItem[] = [
  { id: "bajaj-auto", name: "Bajaj", brand: "Bajaj", logo: carLogo("bajaj") },
  { id: "piaggio", name: "Piaggio", brand: "Piaggio", logo: carLogo("piaggio") },
  { id: "mahindra-auto", name: "Mahindra", brand: "Mahindra", logo: carLogo("mahindra-mark") },
  { id: "tvs-auto", name: "TVS", brand: "TVS", logo: carLogo("tvs") },
  { id: "atul", name: "Atul", brand: "Atul", logo: carLogo("atul") },
  { id: "force", name: "Force", brand: "Force", logo: carLogo("force") },
];

export const BUY_BODY_TYPES: { id: string; label: string }[] = [
  { id: "suv", label: "SUV" },
  { id: "hatchback", label: "Hatchback" },
  { id: "sedan", label: "Sedan" },
  { id: "muv", label: "MUV" },
  { id: "coupe", label: "Coupe" },
  { id: "convertible", label: "Convertible" },
  { id: "pickup", label: "Pickup" },
  { id: "all", label: "All Cars" },
];

export function getBuyBrandsForHub(hub: HubCategorySlug): BuyBrandItem[] {
  switch (hub) {
    case "cars":
      return BUY_CAR_BRANDS;
    case "bikes":
      return BUY_BIKE_BRANDS;
    case "trucks":
    case "buses":
      return BUY_TRUCK_BRANDS;
    case "ev":
      return BUY_EV_BRANDS;
    case "auto":
      return BUY_AUTO_BRANDS;
    default:
      return BUY_CAR_BRANDS.slice(0, 12);
  }
}
