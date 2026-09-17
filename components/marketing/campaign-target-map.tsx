"use client";
import { Circle, CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

export function CampaignTargetMap({ radiusKm, center }: { radiusKm: number; center: [number, number] }) { return <div className="h-[230px] overflow-hidden rounded-[10px] border bg-[#dfe8da]"><MapContainer center={center} zoom={12} scrollWheelZoom={false} dragging={false} doubleClickZoom={false} className="h-full w-full"><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: "#111", fillColor: "#111", fillOpacity: .14, weight: 2 }}/><CircleMarker center={center} radius={8} pathOptions={{ color: "#fff", fillColor: "#111", fillOpacity: 1, weight: 3 }}/><MapView radiusKm={radiusKm} center={center}/></MapContainer><p className="pointer-events-none relative z-[500] -mt-8 ml-3 w-fit rounded-full bg-black px-3 py-2 text-xs font-medium text-white">Campaign area · {radiusKm} km</p></div>; }
function MapView({ radiusKm, center }: { radiusKm: number; center: [number, number] }) { const map = useMap(); useEffect(() => { map.setView(center, radiusKm >= 8 ? 10 : radiusKm >= 5 ? 11 : 12, { animate: false }); }, [map, radiusKm, center]); return null; }
