"use client";

import { useEffect, useState } from "react";
import { animate } from "framer-motion";

export function AnimatedCounter({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (v) => {
        setDisplay(Math.round(v));
      },
    });

    return () => {
      controls.stop();
    };
  }, [value]);

  return <span className={className}>{display}</span>;
}
