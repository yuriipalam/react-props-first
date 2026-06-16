import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const width = 1920;
const height = 1080;
const fps = 60;
const duration = 14;
const totalFrames = fps * duration;
const output = path.resolve("images/react-props-first-vscode-demo.mp4");

const tmp = mkdtempSync(path.join(tmpdir(), "react-props-first-vscode-demo-"));
const framesDir = path.join(tmp, "frames");

run("mkdir", ["-p", framesDir]);

for (let frame = 0; frame < totalFrames; frame += 1) {
  const time = frame / fps;
  const svg = renderFrame(time);
  const framePath = path.join(framesDir, `frame-${String(frame).padStart(4, "0")}.png`);
  run("rsvg-convert", ["-w", String(width), "-h", String(height), "-f", "png", "-o", framePath], {
    input: svg
  });

  if (frame % 120 === 0) {
    console.log(`rendered ${frame}/${totalFrames} frames`);
  }
}

run("ffmpeg", [
  "-y",
  "-framerate",
  String(fps),
  "-i",
  path.join(framesDir, "frame-%04d.png"),
  "-vf",
  "tmix=frames=3:weights='1 2 1',format=yuv420p",
  "-r",
  String(fps),
  "-c:v",
  "libx264",
  "-profile:v",
  "high",
  "-crf",
  "17",
  "-movflags",
  "+faststart",
  output
]);

rmSync(tmp, { recursive: true, force: true });
console.log(output);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: path.resolve("."),
    encoding: "utf8",
    stdio: options.input ? ["pipe", "inherit", "inherit"] : "inherit",
    input: options.input
  });

  if (result.status !== 0) {
    throw new Error(`${command} failed with status ${result.status}`);
  }
}

function renderFrame(t) {
  const after = t >= 7;
  const sceneT = after ? t - 7 : t;
  const camera = cameraState(t);
  const transition = fade(t, 6.88, 6.98) * (1 - fade(t, 7.04, 7.16));

  return svg`
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="windowShadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="28" stdDeviation="32" flood-color="#000000" flood-opacity="0.42"/>
    </filter>
    <filter id="popupShadow" x="-15%" y="-15%" width="130%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <linearGradient id="screenGlow" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#111827"/>
      <stop offset="1" stop-color="#070b12"/>
    </linearGradient>
    <linearGradient id="activeGreen" x1="0" x2="1">
      <stop offset="0" stop-color="#44d06a"/>
      <stop offset="1" stop-color="#a3e635"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#screenGlow)"/>
  <circle cx="282" cy="220" r="180" fill="#1f6feb" opacity="0.08"/>
  <circle cx="1650" cy="815" r="260" fill="#22c55e" opacity="0.055"/>
  <g transform="${camera}">
    ${renderVsCode(after, sceneT)}
  </g>
  <rect width="1920" height="1080" fill="#05070d" opacity="${(transition * 0.78).toFixed(3)}"/>
</svg>`;
}

function renderVsCode(after, t) {
  const win = { x: 120, y: 82, w: 1680, h: 916 };
  const titleH = 44;
  const activityW = 58;
  const explorerW = 272;
  const tabH = 48;
  const statusH = 30;
  const editorX = win.x + activityW + explorerW;
  const editorY = win.y + titleH + tabH;
  const editorW = win.w - activityW - explorerW;
  const editorH = win.h - titleH - tabH - statusH;
  const active = after ? fade(t, 0.08, 0.32) : 1;
  const typed = typedJsx(after, t);
  const prefix = "export const Demo = ";
  const lineHeight = 34;
  const codeX = editorX + 78;
  const codeY = editorY + 64;
  const demoY = codeY + lineHeight * 12;
  const charW = 13.9;
  const cursorX = codeX + (prefix.length + typed.length) * charW + 1;
  const popup = {
    x: codeX + prefix.length * charW - 34,
    y: demoY + 23,
    w: 548,
    rowH: 35
  };
  const popupOpacity = after
    ? fade(t, 1.85, 2.22) * (1 - fade(t, 5.18, 5.55))
    : fade(t, 1.66, 2.04) * (1 - fade(t, 6.25, 6.65));
  const typeOpacity = after ? 1 - fade(t, 5.05, 5.42) : 1;
  const insertedOpacity = after ? fade(t, 5.32, 5.72) : 0;
  const click = after ? pulse(t, 4.35, 0.34) : pulse(t, 4.38, 0.42);
  const pointer = pointerPosition(after, t, popup);

  return svg`
  <g opacity="${active.toFixed(3)}">
    <rect x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}" rx="18" fill="#1e1e1e" filter="url(#windowShadow)"/>
    <rect x="${win.x}" y="${win.y}" width="${win.w}" height="${titleH}" rx="18" fill="#323233"/>
    <rect x="${win.x}" y="${win.y + 24}" width="${win.w}" height="${titleH - 24}" fill="#323233"/>
    <circle cx="${win.x + 24}" cy="${win.y + 22}" r="7" fill="#ff5f57"/>
    <circle cx="${win.x + 46}" cy="${win.y + 22}" r="7" fill="#ffbd2e"/>
    <circle cx="${win.x + 68}" cy="${win.y + 22}" r="7" fill="#28c840"/>
    ${text("React Props First - App.tsx", win.x + win.w / 2, win.y + 28, 15, "#d4d4d4", {
      anchor: "middle",
      family: "SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif"
    })}

    <rect x="${win.x}" y="${win.y + titleH}" width="${activityW}" height="${win.h - titleH - statusH}" fill="#333333"/>
    ${activityIcon(win.x + 29, win.y + 82, true, "files")}
    ${activityIcon(win.x + 29, win.y + 136, false, "search")}
    ${activityIcon(win.x + 29, win.y + 190, false, "git")}
    ${activityIcon(win.x + 29, win.y + 244, false, "debug")}
    ${activityIcon(win.x + 29, win.y + 298, false, "extensions")}

    <rect x="${win.x + activityW}" y="${win.y + titleH}" width="${explorerW}" height="${win.h - titleH - statusH}" fill="#252526"/>
    ${text("EXPLORER", win.x + activityW + 20, win.y + titleH + 34, 13, "#bbbbbb", {
      weight: 650,
      family: "SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif"
    })}
    ${text("REACT-PROPS-FIRST", win.x + activityW + 20, win.y + titleH + 76, 14, "#cccccc", {
      weight: 650,
      family: "SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif"
    })}
    ${explorerRow("src", win.x + activityW + 20, win.y + titleH + 116, 0, false, true)}
    ${explorerRow("App.tsx", win.x + activityW + 42, win.y + titleH + 148, 1, true)}
    ${explorerRow("extension.ts", win.x + activityW + 42, win.y + titleH + 180, 1, false)}
    ${explorerRow("packages", win.x + activityW + 20, win.y + titleH + 226, 0, false, true)}
    ${explorerRow("README.md", win.x + activityW + 20, win.y + titleH + 272, 0, false)}
    ${explorerRow("package.json", win.x + activityW + 20, win.y + titleH + 304, 0, false)}

    <rect x="${editorX}" y="${win.y + titleH}" width="${editorW}" height="${tabH}" fill="#252526"/>
    <rect x="${editorX}" y="${win.y + titleH}" width="178" height="${tabH}" fill="#1e1e1e"/>
    <rect x="${editorX}" y="${win.y + titleH}" width="178" height="2" fill="#007acc"/>
    ${text("TSX", editorX + 18, win.y + titleH + 31, 12, "#519aba", {
      family: "SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif",
      weight: 700
    })}
    ${text("App.tsx", editorX + 53, win.y + titleH + 31, 15, "#d4d4d4", {
      family: "SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif"
    })}
    <rect x="${editorX}" y="${editorY}" width="${editorW}" height="${editorH}" fill="#1e1e1e"/>
    ${statusPill(after, editorX + editorW - 318, win.y + titleH + 14)}
    ${text("test-workspace > src > App.tsx", editorX + 28, editorY + 29, 14, "#8d8d8d", {
      family: "SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif"
    })}
    ${codeLines(codeX, codeY, lineHeight)}
    ${lineNumber(13, codeX - 46, demoY)}
    ${text(prefix, codeX, demoY, 22, "#c586c0", { family: "SF Mono, Menlo, Consolas, monospace" })}
    <g opacity="${typeOpacity.toFixed(3)}">
      ${text(typed, codeX + prefix.length * charW, demoY, 22, "#9cdcfe", {
        family: "SF Mono, Menlo, Consolas, monospace"
      })}
      ${cursor(cursorX, demoY - 23, after ? t : t + 0.11)}
    </g>
    <g opacity="${insertedOpacity.toFixed(3)}">
      ${text(
        '<Button variant="primary" loading />;',
        codeX + prefix.length * charW,
        demoY,
        22,
        "#9cdcfe",
        {
          family: "SF Mono, Menlo, Consolas, monospace"
        }
      )}
    </g>
    ${renderPopup(after, popup, popupOpacity, t)}
    ${caption(after, t, popup)}
    ${toast(after, t, editorX + editorW - 470, editorY + 54)}
    ${pointerSvg(pointer.x, pointer.y, pointer.opacity, click)}
    <rect x="${win.x}" y="${win.y + win.h - statusH}" width="${win.w}" height="${statusH}" fill="#007acc"/>
    ${text("main", win.x + 86, win.y + win.h - 10, 14, "#ffffff", {
      family: "SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif"
    })}
    ${text(
      after ? "React Props First: ON" : "React Props First: OFF",
      win.x + win.w - 220,
      win.y + win.h - 10,
      14,
      "#ffffff",
      {
        family: "SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif",
        weight: 650
      }
    )}
  </g>`;
}

function codeLines(x, y, lineHeight) {
  const lines = [
    { n: 1, text: 'import * as React from "react";', color: "#d4d4d4" },
    { n: 2, text: "", color: "#d4d4d4" },
    {
      n: 3,
      parts: [
        ["interface", "#569cd6"],
        [" ButtonProps ", "#4ec9b0"],
        ["extends", "#569cd6"],
        [" React.ButtonHTMLAttributes<HTMLButtonElement> {", "#d4d4d4"]
      ]
    },
    { n: 4, text: '  variant?: "primary" | "secondary";', color: "#9cdcfe" },
    { n: 5, text: "  loading?: boolean;", color: "#9cdcfe" },
    { n: 6, text: '  size?: "sm" | "md" | "lg";', color: "#9cdcfe" },
    { n: 7, text: "}", color: "#d4d4d4" },
    { n: 8, text: "", color: "#d4d4d4" },
    { n: 9, text: "function Button(props: ButtonProps) {", color: "#dcdcaa" },
    { n: 10, text: "  return <button {...props} />;", color: "#d4d4d4" },
    { n: 11, text: "}", color: "#d4d4d4" },
    { n: 12, text: "", color: "#d4d4d4" }
  ];

  return lines
    .map((line, index) => {
      const yy = y + index * lineHeight;
      const lineNo = lineNumber(line.n, x - 46, yy);
      if (line.parts) {
        const spans = line.parts
          .map(([value, color]) => `<tspan fill="${color}">${escapeXml(value)}</tspan>`)
          .join("");
        return `${lineNo}<text x="${x}" y="${yy}" font-size="22" fill="#d4d4d4" font-family="SF Mono, Menlo, Consolas, monospace" xml:space="preserve">${spans}</text>`;
      }
      return `${lineNo}${text(line.text, x, yy, 22, line.color, {
        family: "SF Mono, Menlo, Consolas, monospace"
      })}`;
    })
    .join("");
}

function renderPopup(after, popup, opacity, t) {
  if (opacity <= 0.08) {
    return "";
  }

  const rows = after
    ? [
        ["variant", "custom", "property", true],
        ["loading", "custom", "property", true],
        ["size", "custom", "property", true],
        ["disabled", "DOM", "property", false],
        ["aria-label", "ARIA", "property", false],
        ["onClick", "DOM", "event", false]
      ]
    : [
        ["aria-label", "ARIA", "property", false],
        ["disabled", "DOM", "property", false],
        ["onClick", "DOM", "event", false],
        ["type", "DOM", "property", false],
        ["variant", "custom", "property", true],
        ["loading", "custom", "property", true]
      ];

  const headerH = 50;
  const popupH = 76 + rows.length * popup.rowH;
  const rowStartY = popup.y + 78;
  const slide = after ? 12 * (1 - opacity) : 10 * (1 - opacity);
  const beforeVariantPulse = !after ? pulse(t, 4.38, 0.65) : 0;
  const afterTopGlow = after ? fade(t, 2.28, 2.75) * (1 - fade(t, 5.05, 5.3)) : 0;

  const rowSvg = rows
    .map(([name, source, kind, custom], index) => {
      const y = rowStartY + index * popup.rowH;
      const isSelected = after ? index === 0 : index === 0 && t < 3.35;
      const isBeforeVariant = !after && name === "variant";
      const customTop = after && custom && index < 3;
      const baseFill = isSelected ? "#04395e" : "transparent";
      const customFill = customTop ? `#234f36` : baseFill;
      const alpha = customTop ? 0.96 : isSelected ? 0.92 : 0;
      const outline = isBeforeVariant ? beforeVariantPulse : 0;
      const rowColor = custom ? "#6ee787" : "#d4d4d4";
      const sourceColor = custom ? "#8ee99f" : "#8b9bb3";
      return svg`
        <rect x="${popup.x + 12}" y="${y - 28}" width="${popup.w - 24}" height="${popup.rowH - 5}" rx="6" fill="${customFill}" opacity="${alpha.toFixed(3)}"/>
        ${outline > 0.001 ? `<rect x="${popup.x + 12}" y="${y - 28}" width="${popup.w - 24}" height="${popup.rowH - 5}" rx="6" fill="none" stroke="#7ee787" stroke-width="3" opacity="${outline.toFixed(3)}"/>` : ""}
        ${text(name, popup.x + 34, y - 6, 21, rowColor, {
          family: "SF Mono, Menlo, Consolas, monospace",
          weight: customTop ? 750 : 500
        })}
        ${text(source, popup.x + popup.w - 196, y - 6, 19, sourceColor, {
          family: "SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif",
          weight: custom ? 650 : 500
        })}
        ${text(kind, popup.x + popup.w - 88, y - 6, 16, "#768390", {
          family: "SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif"
        })}`;
    })
    .join("");

  return svg`
  <g transform="translate(0 ${slide.toFixed(2)})" filter="url(#popupShadow)">
    <rect x="${popup.x}" y="${popup.y}" width="${popup.w}" height="${popupH}" rx="11" fill="#252526" stroke="#3d4858" stroke-width="1.2"/>
    <rect x="${popup.x}" y="${popup.y}" width="${popup.w}" height="${headerH}" rx="11" fill="#2d2d30"/>
    <rect x="${popup.x}" y="${popup.y + 36}" width="${popup.w}" height="${headerH - 36}" fill="#2d2d30"/>
    ${text("IntelliSense", popup.x + 18, popup.y + 31, 15, "#c8d3df", {
      family: "SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif",
      weight: 650
    })}
    ${text(
      after ? "React Props First" : "Default TypeScript order",
      popup.x + popup.w - 174,
      popup.y + 31,
      13,
      after ? "#7ee787" : "#8b949e",
      {
        family: "SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif",
        weight: 650
      }
    )}
    ${afterTopGlow > 0.001 ? `<rect x="${popup.x + 9}" y="${rowStartY - 31}" width="${popup.w - 18}" height="${popup.rowH * 3 - 2}" rx="9" fill="none" stroke="#7ee787" stroke-width="3" opacity="${afterTopGlow.toFixed(3)}" filter="url(#glow)"/>` : ""}
    ${rowSvg}
  </g>`;
}

function caption(after, t, popup) {
  const opacity = after
    ? fade(t, 2.2, 2.6) * (1 - fade(t, 6.3, 6.75))
    : fade(t, 2.2, 2.6) * (1 - fade(t, 6.1, 6.55));
  if (opacity <= 0.001) {
    return "";
  }

  const textValue = after
    ? "After: custom props stay at the top."
    : "Before: custom props are buried below DOM attrs.";
  const captionW = Math.ceil(textValue.length * 11.2 + 58);
  const captionX = popup.x + popup.w / 2 - captionW / 2;
  return svg`
  <g opacity="${opacity.toFixed(3)}">
    <rect x="${captionX}" y="${popup.y - 90}" width="${captionW}" height="56" rx="13" fill="#0f172a" stroke="#2f81f7" stroke-width="1"/>
    ${text(textValue, popup.x + popup.w / 2, popup.y - 54, 20, "#e6edf3", {
      anchor: "middle",
      family: "SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif",
      weight: 650
    })}
  </g>`;
}

function toast(after, t, x, y) {
  if (!after) {
    return "";
  }

  const opacity = fade(t, 0.35, 0.75) * (1 - fade(t, 1.65, 2.05));
  if (opacity <= 0.001) {
    return "";
  }

  const dy = 12 * (1 - opacity);
  return svg`
  <g opacity="${opacity.toFixed(3)}" transform="translate(0 ${dy.toFixed(2)})">
    <rect x="${x}" y="${y}" width="420" height="58" rx="10" fill="#1f2937" stroke="#3fb950" stroke-width="1.4" filter="url(#popupShadow)"/>
    <circle cx="${x + 30}" cy="${y + 29}" r="12" fill="#3fb950"/>
    ${text("React Props First enabled", x + 54, y + 27, 18, "#f0f6fc", {
      family: "SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif",
      weight: 700
    })}
    ${text("Project props will rank above DOM attributes.", x + 54, y + 48, 14, "#c9d1d9", {
      family: "SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif"
    })}
  </g>`;
}

function typedJsx(after, t) {
  if (after && t > 5.4) {
    return "";
  }

  const source = "<Button ";
  const start = after ? 0.72 : 0.58;
  const end = after ? 1.75 : 1.52;
  const progress = clamp((t - start) / (end - start), 0, 1);
  const chars = Math.floor(progress * source.length + 0.0001);
  return source.slice(0, chars);
}

function statusPill(after, x, y) {
  return svg`
    <rect x="${x}" y="${y}" width="284" height="24" rx="12" fill="${after ? "#12351f" : "#3a1d1d"}" stroke="${after ? "#3fb950" : "#f85149"}" stroke-width="1"/>
    <circle cx="${x + 17}" cy="${y + 12}" r="5" fill="${after ? "#3fb950" : "#f85149"}"/>
    ${text(
      after ? "React Props First enabled" : "React Props First disabled",
      x + 31,
      y + 17,
      13,
      after ? "#aff5b4" : "#ffdcd7",
      {
        family: "SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif",
        weight: 650
      }
    )}`;
}

function pointerPosition(after, t, popup) {
  if (after) {
    const p = ease(fade(t, 3.0, 4.25));
    return {
      x: mix(1450, popup.x + 126, p),
      y: mix(566, popup.y + 64, p),
      opacity: fade(t, 2.7, 3.0) * (1 - fade(t, 5.05, 5.35))
    };
  }

  const p = ease(fade(t, 3.35, 4.25));
  return {
    x: mix(1420, popup.x + 116, p),
    y: mix(562, popup.y + 206, p),
    opacity: fade(t, 3.05, 3.32) * (1 - fade(t, 5.35, 5.8))
  };
}

function pointerSvg(x, y, opacity, click) {
  if (opacity <= 0.001) {
    return "";
  }

  const ring =
    click > 0
      ? `<circle cx="${x}" cy="${y}" r="${(15 + 24 * click).toFixed(2)}" fill="none" stroke="#58a6ff" stroke-width="4" opacity="${(0.58 * (1 - click)).toFixed(3)}"/>`
      : "";
  return svg`
  <g opacity="${opacity.toFixed(3)}" filter="url(#popupShadow)">
    ${ring}
    <g transform="translate(${x} ${y}) scale(0.72)">
      <path d="M 0 0 L 0 43 L 12 31 L 20 50 L 31 45 L 23 27 L 39 27 Z" fill="#f8fafc" stroke="#0d1117" stroke-width="3" stroke-linejoin="round"/>
    </g>
  </g>`;
}

function cursor(x, y, t) {
  const on = Math.sin(t * Math.PI * 3.2) > -0.15 ? 1 : 0.22;
  return `<rect x="${x.toFixed(2)}" y="${y}" width="2" height="29" fill="#d4d4d4" opacity="${on}"/>`;
}

function lineNumber(n, x, y) {
  return text(String(n), x, y, 18, "#6e7681", {
    anchor: "end",
    family: "SF Mono, Menlo, Consolas, monospace"
  });
}

function explorerRow(label, x, y, depth, active, open = false) {
  const rowX = 178;
  const fill = active
    ? `<rect x="${rowX}" y="${y - 22}" width="268" height="28" fill="#37373d"/>`
    : "";
  const chevron = open ? "▾" : depth === 0 ? "›" : "";
  const color = active ? "#ffffff" : "#cccccc";
  return svg`
    ${fill}
    ${text(chevron, x, y, 14, "#cccccc", {
      family: "SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif"
    })}
    ${text(
      depth === 1 ? "TSX" : "○",
      x + 22,
      y,
      depth === 1 ? 10 : 13,
      depth === 1 ? "#519aba" : "#8b949e",
      {
        family: "SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif",
        weight: 700
      }
    )}
    ${text(label, x + 48, y, 15, color, {
      family: "SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif"
    })}`;
}

function activityIcon(cx, cy, active, kind) {
  const color = active ? "#ffffff" : "#a7a7a7";
  const bar = active ? `<rect x="120" y="${cy - 24}" width="3" height="48" fill="#ffffff"/>` : "";
  const shape =
    kind === "files"
      ? `<path d="M ${cx - 10} ${cy - 15} h 15 l 10 10 v 20 h -25 z M ${cx + 5} ${cy - 15} v 10 h 10" fill="none" stroke="${color}" stroke-width="2.2"/>`
      : kind === "search"
        ? `<circle cx="${cx - 3}" cy="${cy - 4}" r="10" fill="none" stroke="${color}" stroke-width="2.4"/><path d="M ${cx + 5} ${cy + 4} l 12 12" stroke="${color}" stroke-width="2.4"/>`
        : kind === "git"
          ? `<path d="M ${cx} ${cy - 16} v 32 M ${cx - 10} ${cy - 6} l 10 -10 l 10 10 M ${cx - 10} ${cy + 6} l 10 10 l 10 -10" fill="none" stroke="${color}" stroke-width="2.3"/>`
          : kind === "debug"
            ? `<path d="M ${cx - 11} ${cy - 9} h 20 v 18 h -20 z M ${cx + 9} ${cy} h 9 M ${cx - 11} ${cy} h -9" fill="none" stroke="${color}" stroke-width="2.3"/>`
            : `<rect x="${cx - 13}" y="${cy - 13}" width="11" height="11" rx="2" fill="none" stroke="${color}" stroke-width="2"/><rect x="${cx + 3}" y="${cy - 13}" width="11" height="11" rx="2" fill="none" stroke="${color}" stroke-width="2"/><rect x="${cx - 13}" y="${cy + 3}" width="11" height="11" rx="2" fill="none" stroke="${color}" stroke-width="2"/><rect x="${cx + 3}" y="${cy + 3}" width="11" height="11" rx="2" fill="none" stroke="${color}" stroke-width="2"/>`;

  return `${bar}${shape}`;
}

function cameraState(t) {
  let scale = 0.985;
  let targetX = 960;
  let targetY = 540;

  if (t < 6.8) {
    const focus = fade(t, 0.95, 2.25) * (1 - fade(t, 6.1, 6.8));
    const clickZoom = 0.1 * pulse(t, 4.38, 0.65);
    scale = mix(0.985, 1.28, ease(focus)) + clickZoom;
    targetX = mix(960, 1070, focus);
    targetY = mix(540, 732, focus);
  } else if (t >= 7.2) {
    const local = t - 7;
    const focus = fade(local, 0.85, 2.2) * (1 - fade(local, 5.7, 6.85));
    const clickZoom = 0.12 * pulse(local, 4.35, 0.6);
    scale = mix(0.985, 1.31, ease(focus)) + clickZoom;
    targetX = mix(960, 1060, focus);
    targetY = mix(540, 708, focus);
  }

  const tx = width / 2 - targetX * scale;
  const ty = height / 2 - targetY * scale;
  return `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(4)})`;
}

function text(value, x, y, size, color, options = {}) {
  const anchor = options.anchor ? ` text-anchor="${options.anchor}"` : "";
  const weight = options.weight ? ` font-weight="${options.weight}"` : "";
  const family = options.family || "SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif";
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-family="${family}"${anchor}${weight} xml:space="preserve">${escapeXml(value)}</text>`;
}

function svg(strings, ...values) {
  return String.raw({ raw: strings }, ...values);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fade(t, start, end) {
  if (t <= start) {
    return 0;
  }
  if (t >= end) {
    return 1;
  }
  const p = (t - start) / (end - start);
  return p * p * (3 - 2 * p);
}

function pulse(t, center, width) {
  const distance = Math.abs(t - center);
  if (distance >= width) {
    return 0;
  }
  return 1 - ease(distance / width);
}

function ease(p) {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

function mix(a, b, p) {
  return a + (b - a) * clamp(p, 0, 1);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
