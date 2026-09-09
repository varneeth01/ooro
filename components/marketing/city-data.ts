export type CityStatus = "active" | "locked" | "coming_soon";
export interface OoroCity { id: string; name: string; state: string; country: string; latitude: number; longitude: number; status: CityStatus; }
export const ooroCities: OoroCity[] = [
  { id: "tirupati", name: "Tirupati", state: "Andhra Pradesh", country: "India", latitude: 13.6288, longitude: 79.4192, status: "active" },
  { id: "hyderabad", name: "Hyderabad", state: "Telangana", country: "India", latitude: 17.385, longitude: 78.4867, status: "locked" },
  { id: "bengaluru", name: "Bengaluru", state: "Karnataka", country: "India", latitude: 12.9716, longitude: 77.5946, status: "locked" },
  { id: "chennai", name: "Chennai", state: "Tamil Nadu", country: "India", latitude: 13.0827, longitude: 80.2707, status: "locked" },
  { id: "vijayawada", name: "Vijayawada", state: "Andhra Pradesh", country: "India", latitude: 16.5062, longitude: 80.648, status: "locked" },
  { id: "visakhapatnam", name: "Visakhapatnam", state: "Andhra Pradesh", country: "India", latitude: 17.6868, longitude: 83.2185, status: "locked" },
  { id: "mumbai", name: "Mumbai", state: "Maharashtra", country: "India", latitude: 19.076, longitude: 72.8777, status: "locked" },
  { id: "kolkata", name: "Kolkata", state: "West Bengal", country: "India", latitude: 22.5726, longitude: 88.3639, status: "locked" },
  { id: "delhi", name: "Delhi", state: "Delhi", country: "India", latitude: 28.6139, longitude: 77.209, status: "locked" },
];
