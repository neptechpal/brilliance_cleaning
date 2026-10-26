import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Brilliance Cleaning & Property Staging – Newcastle & Hunter";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const mark = await readFile(join(process.cwd(), "public/brand/mark-512.png"));
  const src = `data:image/png;base64,${mark.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(135deg, #eef9f4 0%, #ffffff 55%, #fdeeee 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <img src={src} width={150} height={150} alt="" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 56, fontWeight: 800, color: "#0f2a36" }}>Brilliance Cleaning</div>
            <div style={{ fontSize: 26, color: "#3b5563", letterSpacing: 4 }}>&amp; PROPERTY STAGING</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 62, fontWeight: 800, color: "#0f2a36", lineHeight: 1.1 }}>Cleaning, staging &amp; venue staff</div>
          <div style={{ fontSize: 40, color: "#0b7a5f", fontWeight: 700 }}>Newcastle &amp; the Hunter Region</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 30, color: "#3b5563" }}>brillianceservices.com.au</div>
          <div style={{ fontSize: 34, fontWeight: 800, color: "#fff", background: "#d42f37", padding: "14px 28px", borderRadius: 999 }}>0411 463 552</div>
        </div>
      </div>
    ),
    size,
  );
}
