"use client";

import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  label: string;
  className?: string;
  imgClassName?: string;
  objectPosition?: string;
};

/**
 * Renders a shooter photo with a graceful fallback:
 *  - If the image at `src` exists, it covers the area
 *  - If it fails to load, the dark placeholder + label remains visible
 */
export function ShooterImage({
  src,
  alt,
  label,
  className = "",
  imgClassName = "h-full w-full object-cover",
  objectPosition,
}: Props) {
  const [error, setError] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {/* Placeholder — always rendered behind the image */}
      <div className="absolute inset-0 flex items-center justify-center bg-[#181818]">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-text-dim">
          {label}
        </span>
      </div>

      {/* Real image — hides itself if it fails to load */}
      {!error && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={`relative ${imgClassName}`}
          style={objectPosition ? { objectPosition } : undefined}
          onError={() => setError(true)}
          loading="lazy"
        />
      )}
    </div>
  );
}
