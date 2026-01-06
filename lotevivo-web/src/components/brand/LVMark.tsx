import * as React from "react";

type LVMarkProps = {
  className?: string;
  title?: string;
  /** "solid" = gradiente / "outline" = traço único (ótimo watermark) */
  variant?: "solid" | "outline";
};

export default function LVMark({ className, title = "Lote Vivo", variant = "solid" }: LVMarkProps) {
  const isOutline = variant === "outline";

  return (
    <svg
      viewBox="0 0 512 512"
      aria-label={title}
      role="img"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="lv_grad" x1="96" y1="80" x2="420" y2="440" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#22C55E" />
        </linearGradient>

        {/* sombra suave opcional (fica bom em ícone) */}
        <filter id="lv_soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="8" result="blur" />
          <feOffset dy="6" result="off" />
          <feColorMatrix
            in="off"
            type="matrix"
            values="0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 .18 0"
            result="shadow"
          />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Monograma LV integrado (uma peça só) */}
      <g filter={isOutline ? undefined : "url(#lv_soft)"}>
        {/* Traço principal */}
        <path
          d="
            M156 110
            Q156 92 174 92
            H214
            Q232 92 232 110
            V314
            Q232 334 252 334
            H290
            Q306 334 314 318
            L382 168
            Q390 150 410 150
            H436
            Q458 150 448 172
            L354 374
            Q336 414 292 414
            H226
            Q156 414 156 344
            V110
            Z
          "
          stroke={isOutline ? "#10B981" : "url(#lv_grad)"}
          strokeWidth={48}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* corte interno do "V" (dá sensação de interseção, tipo AEGRO) */}
        <path
          d="
            M328 186
            L278 302
            Q272 316 288 316
            H306
            Q320 316 326 302
            L368 206
          "
          stroke={isOutline ? "#10B981" : "#EFFFF7"}
          strokeOpacity={isOutline ? 0.25 : 0.9}
          strokeWidth={20}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* detalhe do “L” (linha interna pra dar profundidade) */}
        <path
          d="
            M196 134
            V334
            Q196 374 236 374
            H276
          "
          stroke={isOutline ? "#10B981" : "#EFFFF7"}
          strokeOpacity={isOutline ? 0.25 : 0.9}
          strokeWidth={18}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
