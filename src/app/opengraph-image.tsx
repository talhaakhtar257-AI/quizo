import { ImageResponse } from "next/og";

export const alt = "Quizo — Adaptive Quiz Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Generated at request time, not a static asset — zero design-asset cost,
// matches CLAUDE.md's brand colors (spruce #1B4D3E, gold #F4A300) so the
// link-preview card looks intentional instead of generic.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1B4D3E",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 72,
              height: 72,
              borderRadius: 16,
              backgroundColor: "#F4A300",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 700,
              color: "#0A1F17",
            }}
          >
            Q
          </div>
          <div style={{ display: "flex", fontSize: 80, fontWeight: 700, color: "#FFFFFF" }}>
            Quizo
          </div>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 32,
            color: "#D9F2E8",
          }}
        >
          Adaptive quizzes that learn as students answer
        </div>
      </div>
    ),
    { ...size }
  );
}
