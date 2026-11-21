"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PriceHistoryEntry } from "@/lib/api/types";
import { formatDate, formatDateTime, formatMoney, formatMoneyTick } from "@/lib/format";

const HEIGHT = 240;
const PAD = { top: 16, right: 88, bottom: 28, left: 64 }; // right: room for the end label

interface Point {
  t: number;
  price: number;
  entry: PriceHistoryEntry;
}

/** 3–5 "nice" ticks (1/2/5 × 10^n steps) covering [min, max]. */
function niceTicks(min: number, max: number): number[] {
  if (min === max) {
    const pad = Math.max(1, Math.abs(min) * 0.1);
    min -= pad;
    max += pad;
  }
  const rough = (max - min) / 4;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= rough) ?? 10 * mag;
  const ticks: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= max + step * 0.001; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

/**
 * Supplier cost over time for one product: a single series, drawn as a step line
 * (a price holds until the next list). Hover or arrow keys move a crosshair that
 * snaps to the nearest list. The history table below is the table view.
 */
export function PriceHistoryChart({ entries }: { entries: PriceHistoryEntry[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();

  const points: Point[] = useMemo(
    () =>
      entries
        .map((entry) => ({ t: new Date(entry.priceList.uploadedAt).getTime(), price: Number(entry.unitCost), entry }))
        .sort((a, b) => a.t - b.t),
    [entries],
  );
  const drawable = points.length >= 2;

  // The container only exists once there is something to draw.
  useEffect(() => {
    const el = containerRef.current;
    if (!drawable || !el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [drawable]);

  if (!drawable) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        {points.length === 0
          ? "Este producto todavía no tiene precios."
          : "La evolución aparece cuando importes una segunda lista de este proveedor."}
      </p>
    );
  }

  const ticks = niceTicks(Math.min(...points.map((p) => p.price)), Math.max(...points.map((p) => p.price)));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const tMin = points[0].t;
  const tMax = points[points.length - 1].t;
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (t: number) => PAD.left + ((t - tMin) / (tMax - tMin || 1)) * innerW;
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  // Step-after path: horizontal to the next list's date, then vertical to its price.
  const line = points
    .map((p, i) => (i === 0 ? `M${x(p.t)},${y(p.price)}` : `H${x(p.t)}V${y(p.price)}`))
    .join("");
  const area = `${line}V${y(yMin)}H${x(tMin)}Z`;

  const last = points[points.length - 1];
  // Lists uploaded the same day are only told apart by the time.
  const sameDay = formatDate(points[0].entry.priceList.uploadedAt) === formatDate(last.entry.priceList.uploadedAt);
  const axisDate = sameDay ? formatDateTime : formatDate;
  const current = active !== null ? points[active] : null;

  function nearest(clientX: number, svg: SVGSVGElement) {
    const px = clientX - svg.getBoundingClientRect().left;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.t) - px) < Math.abs(x(points[best].t) - px)) best = i;
    });
    return best;
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const i = active ?? points.length - 1;
    if (e.key === "ArrowLeft") setActive(Math.max(0, i - 1));
    else if (e.key === "ArrowRight") setActive(Math.min(points.length - 1, i + 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(points.length - 1);
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  }

  const tooltipLeft = current ? Math.min(Math.max(x(current.t) - 80, 0), Math.max(0, width - 160)) : 0;

  return (
    <div ref={containerRef} className="relative">
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="group"
          aria-labelledby={titleId}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onFocus={() => setActive((a) => a ?? points.length - 1)}
          onBlur={() => setActive(null)}
          onPointerMove={(e) => setActive(nearest(e.clientX, e.currentTarget))}
          onPointerLeave={() => setActive(null)}
          className="touch-none rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <title id={titleId}>
            {`Evolución del costo: ${points.length} listas, de ${formatMoney(points[0].price)} a ${formatMoney(last.price)}. Usá las flechas para recorrerla.`}
          </title>

          {/* Recessive hairline grid + y ticks */}
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={PAD.left + innerW} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
                {formatMoneyTick(v)}
              </text>
            </g>
          ))}
          {/* First / last dates on the x axis */}
          <text x={x(tMin)} y={HEIGHT - 8} textAnchor="start" className="fill-muted-foreground text-[11px]">
            {axisDate(points[0].entry.priceList.uploadedAt)}
          </text>
          <text x={x(tMax)} y={HEIGHT - 8} textAnchor="end" className="fill-muted-foreground text-[11px]">
            {axisDate(last.entry.priceList.uploadedAt)}
          </text>

          <path d={area} fill="var(--series-1)" fillOpacity={0.1} />
          <path d={line} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {/* Crosshair */}
          {current && (
            <line
              x1={x(current.t)}
              x2={x(current.t)}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke="var(--muted-foreground)"
              strokeWidth={1}
            />
          )}

          {/* Markers: r=4 + 2px ring in the card surface color */}
          {points.map((p, i) => (
            <circle
              key={p.entry.id}
              cx={x(p.t)}
              cy={y(p.price)}
              r={i === active ? 6 : 4}
              fill="var(--series-1)"
              stroke="var(--card)"
              strokeWidth={2}
            />
          ))}

          {/* Direct label: only the current price, at the end of the line (text in ink, not series color) */}
          <text x={x(last.t) + 10} y={y(last.price)} dy="0.32em" className="fill-foreground text-xs font-medium tabular-nums">
            {formatMoney(last.price)}
          </text>
        </svg>
      )}

      <div
        aria-live="polite"
        className={current ? "pointer-events-none absolute top-0 w-40 rounded-md border bg-popover px-3 py-2 text-xs shadow-md" : "sr-only"}
        style={current ? { left: tooltipLeft } : undefined}
      >
        {current && (
          <>
            <div className="font-medium tabular-nums text-foreground">{formatMoney(current.price)}</div>
            <div className="text-muted-foreground">
              Lista v{current.entry.priceList.versionNumber} · {axisDate(current.entry.priceList.uploadedAt)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
