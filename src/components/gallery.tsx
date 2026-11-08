"use client";
import { useState, type ReactNode } from "react";

/** House photos: big photo, counter, and tap-to-switch thumbnails. */
export function Gallery({ photos, children }: { photos: { url: string; alt: string }[]; children?: ReactNode }) {
  const [index, setIndex] = useState(0);
  const current = photos[index];
  return (
    <div>
      <div className="gallery">
        {current && <img src={current.url} alt={current.alt} />}
        {children}
        {photos.length > 1 && (
          <span className="counter">
            {index + 1} / {photos.length}
          </span>
        )}
      </div>
      {photos.length > 1 && (
        <div className="thumbs">
          {photos.map((p, i) => (
            <button key={p.url} type="button" aria-pressed={i === index} aria-label={`Photo ${i + 1}: ${p.alt}`} onClick={() => setIndex(i)}>
              <img src={p.url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
