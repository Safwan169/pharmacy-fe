"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** One name on its way from the row that was tapped to the bar it lands in. */
export interface Flight {
  id: number;
  name: string;
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Feedback for adding something to a list that is off the screen.
 *
 * On a laptop the basket sits beside the search and a new line simply appears
 * in it. On a phone it is a screen further down, so tapping a medicine looks
 * like nothing happening and the only way to check is to scroll after every
 * tap. Watching the name fly into the bar at the bottom answers that without
 * the scroll.
 */
export function useFlights() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const nextId = useRef(0);

  const fly = useCallback((name: string, from?: HTMLElement | null) => {
    if (!from || typeof window === "undefined") return;
    // Anyone who has asked for less motion never gets one, so there is
    // nothing to sit still on the screen.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const box = from.getBoundingClientRect();
    setFlights((current) => [
      ...current,
      { id: ++nextId.current, name, top: box.top, left: box.left, width: box.width, height: box.height },
    ]);
  }, []);

  const land = useCallback((id: number) => {
    setFlights((current) => current.filter((flight) => flight.id !== id));
  }, []);

  return { flights, fly, land };
}

/** Every bubble currently in the air. */
export function Flights({
  flights,
  target,
  onLand,
}: {
  flights: Flight[];
  /** Where they are headed — the bar that carries the running count. */
  target: React.RefObject<HTMLElement | null>;
  onLand: (id: number) => void;
}) {
  return (
    <>
      {flights.map((flight) => (
        <FlyingBubble key={flight.id} flight={flight} target={target} onLand={onLand} />
      ))}
    </>
  );
}

/**
 * It starts exactly over the row that was tapped, so the first frame is
 * invisible against it, then moves and shrinks into the bar.
 */
function FlyingBubble({
  flight,
  target,
  onLand,
}: {
  flight: Flight;
  target: React.RefObject<HTMLElement | null>;
  onLand: (id: number) => void;
}) {
  const [moved, setMoved] = useState<{ x: number; y: number } | null>(null);
  const { id, top, left, width, height } = flight;

  useEffect(() => {
    // The bar is measured a frame late on purpose: on the first line of a
    // sale it is being added in the same commit as the bubble.
    const frame = requestAnimationFrame(() => {
      const box = target.current?.getBoundingClientRect();
      setMoved({
        x: (box ? box.left + box.width / 2 : window.innerWidth / 2) - (left + width / 2),
        y: (box ? box.top + box.height / 2 : window.innerHeight - 48) - (top + height / 2),
      });
    });
    const timer = setTimeout(() => onLand(id), 600);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [id, top, left, width, height, target, onLand]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-50 truncate rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-lg transition-all duration-500 ease-in-out lg:hidden"
      style={{
        top,
        left,
        width,
        transform: moved ? `translate(${moved.x}px, ${moved.y}px) scale(0.3)` : undefined,
        opacity: moved ? 0 : 1,
      }}
    >
      {flight.name}
    </div>
  );
}
