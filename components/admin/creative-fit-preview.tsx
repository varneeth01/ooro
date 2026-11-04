"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { aspectRatioWarning, creativePlacement, type PreviewLayout } from "@/lib/admin/creative-fit";

type Props = { file: File | null; layout: PreviewLayout; onLayoutChange: (layout: PreviewLayout) => void };

export function CreativeFitPreview({ file, layout, onLayoutChange }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const placement = creativePlacement(layout);
  useEffect(() => {
    if (!file) { setUrl(null); setDimensions(null); return; }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl); setDimensions(null);
    if (file.type.startsWith("image/")) {
      const image = new window.Image();
      image.onload = () => setDimensions({ width: image.naturalWidth, height: image.naturalHeight });
      image.src = objectUrl;
      return () => { image.onload = null; URL.revokeObjectURL(objectUrl); };
    }
    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.onloadedmetadata = () => setDimensions({ width: video.videoWidth, height: video.videoHeight });
      video.src = objectUrl;
      return () => { video.onloadedmetadata = null; video.removeAttribute("src"); video.load(); URL.revokeObjectURL(objectUrl); };
    }
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  const warning = dimensions && aspectRatioWarning(dimensions.width, dimensions.height, placement.aspectRatio);
  return <section className="mt-4 rounded border border-neutral-200 p-4" aria-label="Creative fit preview">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium">Screen fit preview</p><p className="text-xs text-neutral-500">Contain preserves the full creative; mismatched ratios show letterboxing.</p></div>
      <label className="text-xs">Preview layout <select aria-label="Preview layout" value={layout} onChange={event => onLayoutChange(event.target.value as PreviewLayout)} className="ml-2 rounded border px-2 py-1"><option value="FOUR_ZONE">Four-zone ad placement</option><option value="SPLIT_50_25_25">Split-screen ad placement</option><option value="FULLSCREEN_AD">Fullscreen ad</option></select></label>
    </div>
    <div className="relative mx-auto mt-3 aspect-video w-full max-w-2xl overflow-hidden border border-neutral-500 bg-[#080b0e]" aria-label={`Screen preview ${layout}`}>
      {layout === "FOUR_ZONE" && <><div className="absolute right-0 top-0 h-[32%] w-[33%] border-b border-l bg-[#20252b]"/><div className="absolute bottom-0 left-0 h-[12%] w-[67%] border-t bg-[#1c232a]"/><div className="absolute bottom-0 right-0 h-[68%] w-[33%] border-l border-t bg-[#121820]"/></>}
      {layout === "SPLIT_50_25_25" && <><div className="absolute right-0 top-0 h-1/2 w-1/4 border-b border-l bg-[#121820]"/><div className="absolute bottom-0 right-0 h-1/2 w-1/4 border-l border-t bg-[#20252b]"/></>}
      <div className="absolute overflow-hidden bg-black" style={{ left: `${placement.x * 100}%`, top: `${placement.y * 100}%`, width: `${placement.width * 100}%`, height: `${placement.height * 100}%` }}>
        {file && url && file.type.startsWith("image/") && <Image src={url} alt="Creative preview with contain fit" fill unoptimized className="object-contain"/>}
        {file && url && file.type.startsWith("video/") && <video src={url} aria-label="Video creative preview with contain fit" controls muted playsInline className="h-full w-full object-contain"/>}
        {!file && <p className="absolute inset-0 grid place-items-center px-2 text-center text-xs text-neutral-500">Choose an image or video to preview</p>}
      </div>
    </div>
    <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-neutral-500"><span>Ad region {Math.round(placement.width * 100)}% × {Math.round(placement.height * 100)}% · {placement.aspectRatio.toFixed(2)}:1</span>{dimensions && <span>Creative {dimensions.width} × {dimensions.height}</span>}</div>
    {warning && <p role="status" className="mt-2 text-sm text-amber-800">{warning}</p>}
  </section>;
}
