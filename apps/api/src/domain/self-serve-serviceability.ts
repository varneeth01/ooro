export type SelfServeAvailability = "AVAILABLE" | "LIMITED" | "UNSUPPORTED";

export type ServiceabilityResult = {
  availability: SelfServeAvailability;
  plannedAutos: number;
  plannedCommercialSlotsPerAutoDay: number;
  plannedPremiumSlotsPerAutoDay: number;
};

// Tirupati is the currently configured self-serve market. These are planning
// inputs only; they are never exposed as device or vehicle counts to customers.
const TIRUPATI = { latitude: 13.6288, longitude: 79.4192 };

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(bLat - aLat);
  const dLng = radians(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function selfServeServiceability(latitude: number, longitude: number, radiusKm: number): ServiceabilityResult {
  const marketDistance = distanceKm(latitude, longitude, TIRUPATI.latitude, TIRUPATI.longitude);
  if (marketDistance > 50) {
    return { availability: "UNSUPPORTED", plannedAutos: 0, plannedCommercialSlotsPerAutoDay: 0, plannedPremiumSlotsPerAutoDay: 0 };
  }

  // Planned capacity is deliberately independent of the current heartbeat.
  // Live data can improve confidence, but cannot make a supported market
  // impossible to purchase from.
  const availability = marketDistance + radiusKm <= 35 ? "AVAILABLE" : "LIMITED";
  return {
    availability,
    plannedAutos: availability === "AVAILABLE" ? 10 : 5,
    plannedCommercialSlotsPerAutoDay: 28,
    plannedPremiumSlotsPerAutoDay: 4,
  };
}
