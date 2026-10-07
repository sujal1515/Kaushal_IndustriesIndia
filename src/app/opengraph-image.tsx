import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name} — Diesel engines, generating sets and pumps since 1964`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default social share image for pages without their own product image. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f5fafc",
          padding: "72px",
          fontFamily: "sans-serif",
          color: "#072768",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, letterSpacing: 4, textTransform: "uppercase", color: "#575d73" }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: "#996f51" }} />
          Agra, India · Since 1964
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>{site.name}</div>
          <div style={{ fontSize: 40, marginTop: 28, color: "#575d73", lineHeight: 1.3 }}>
            Diesel engines, generating sets, pumps and castings — exported to 60+ countries.
          </div>
        </div>
        <div style={{ display: "flex", height: 8, background: "#996f51", width: 160, borderRadius: 4 }} />
      </div>
    ),
    size,
  );
}
