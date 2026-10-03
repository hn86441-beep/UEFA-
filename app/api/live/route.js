import { getData, getPublicSounds } from "../../../lib/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// نسخة عامة خفيفة من البيانات للزوار: بدون المقاطع الصوتية (كانت ملايين البايتات تُحمَّل كل 2.5 ثانية)
// + كاش ذاكرة 1.5 ثانية + كاش حافة 2 ثانية، فيتشارك كل الزوار نفس الطلب بدل ضرب قاعدة البيانات.
let cache = { t: 0, body: null };

export async function GET() {
  try {
    if (!cache.body || Date.now() - cache.t > 1500) {
      const data = await getData();
      const { version } = await getPublicSounds();
      const body = { ...data, settings: { ...(data.settings || {}), soundClips: undefined }, soundsVersion: version };
      cache = { t: Date.now(), body: JSON.stringify(body) };
    }
    return new Response(cache.body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, s-maxage=2, stale-while-revalidate=5",
      },
    });
  } catch (e) {
    return Response.json({ error: e.message || "خطأ" }, { status: 500 });
  }
}
