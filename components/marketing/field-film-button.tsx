"use client";

import { useEffect, useRef } from "react";
import { Play, X } from "lucide-react";

export function FieldFilmButton() {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    const stop = () => {
      video.current?.pause();
      if (video.current) video.current.currentTime = 0;
      trigger.current?.focus();
    };
    node.addEventListener("close", stop);
    return () => node.removeEventListener("close", stop);
  }, []);

  const close = () => dialog.current?.close();

  return (
    <>
      <button type="button" ref={trigger} className="ooro-film-trigger" onClick={() => dialog.current?.showModal()}>
        <span className="ooro-film-play"><Play size={17} fill="currentColor" aria-hidden="true" /></span>
        <span><strong>Watch OORO in motion</strong><small>Real field footage · Bengaluru</small></span>
      </button>

      <dialog ref={dialog} className="ooro-film-dialog" aria-label="OORO on-ground film" onClick={(event) => {
        if (event.target === dialog.current) close();
      }}>
        <div className="ooro-film-inner">
          <div className="ooro-film-top"><span>OORO — BEHIND THE JOURNEY</span><button type="button" onClick={close} aria-label="Close video"><X size={22}/></button></div>
          <video ref={video} controls playsInline preload="none" poster="/field/ooro-bengaluru-auto-01.webp" aria-label="OORO original Bengaluru field footage">
            <source src="/field/ooro-installation-01.mp4" type="video/mp4" />
            Your browser does not support this video.
          </video>
          <p>Real people. Real autos. OORO in Bengaluru.</p>
        </div>
      </dialog>
    </>
  );
}
