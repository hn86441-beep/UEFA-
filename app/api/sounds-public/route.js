import { getPublicSounds } from "../../../lib/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// تُحمَّل المقاطع مرة واحدة فقط لكل نسخة (v) ثم تُخزَّن في المتصفح، ولا تُعاد مع كل تحديث للبيانات
export async function GET(req) {
  try {
    const { clips, version } = await getPublicSounds();
    const hasV = !!new URL(req.url).searchParams.get("v");
    return Response.json(
      { clips, version },
      { headers: { "Cache-Control": hasV ? "public, max-age=31536000, immutable" : "no-store" } }
    );
  } catch (e) {
    return Response.json({ clips: {}, version: "" }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
