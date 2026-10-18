import { getCurrentUser } from "@/lib/session";
import type { GooglePlaceResult } from "@/types/google-place";
import type { PlaceCategory } from "@/types/travel-place";
import { connection } from "next/server";

type AddressComponent = { longText?: string; types?: string[] };
type Money = { currencyCode?: string; units?: string; nanos?: number };
type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
  primaryType?: string;
  priceLevel?: string;
  priceRange?: { startPrice?: Money; endPrice?: Money };
};

const priceEstimates: Record<string, { cost: number; label: string }> = {
  PRICE_LEVEL_FREE: { cost: 0, label: "무료" },
  PRICE_LEVEL_INEXPENSIVE: { cost: 15_000, label: "저렴한 편 · 참고 15,000원" },
  PRICE_LEVEL_MODERATE: { cost: 40_000, label: "보통 · 참고 40,000원" },
  PRICE_LEVEL_EXPENSIVE: { cost: 80_000, label: "비싼 편 · 참고 80,000원" },
  PRICE_LEVEL_VERY_EXPENSIVE: { cost: 150_000, label: "매우 비싼 편 · 참고 150,000원" },
};

function categoryFromType(type = ""): PlaceCategory {
  if (/(restaurant|cafe|bakery|bar|food)/.test(type)) return "맛집";
  if (/(hotel|lodging|hostel|guest_house)/.test(type)) return "숙소";
  if (/(park|beach|natural|mountain|garden)/.test(type)) return "자연";
  if (/(spa|resort|wellness)/.test(type)) return "휴양";
  return "관광지";
}

function component(components: AddressComponent[] = [], types: string[]) {
  for (const type of types) {
    const value = components.find((item) => item.types?.includes(type))?.longText;
    if (value) return value;
  }
  return "";
}

function krwRange(range?: GooglePlace["priceRange"]) {
  const values = [range?.startPrice, range?.endPrice]
    .filter((money): money is Money => Boolean(money?.units) && money?.currencyCode === "KRW")
    .map((money) => Number(money.units) + (money.nanos ?? 0) / 1_000_000_000);
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length / 1_000) * 1_000;
}

function mapPlace(place: GooglePlace): GooglePlaceResult {
  const exactKrw = krwRange(place.priceRange);
  const level = place.priceLevel ? priceEstimates[place.priceLevel] : undefined;
  return {
    id: place.id ?? crypto.randomUUID(),
    name: place.displayName?.text ?? "이름 없는 장소",
    address: place.formattedAddress ?? "주소 정보 없음",
    country: component(place.addressComponents, ["country"]),
    city: component(place.addressComponents, ["locality", "postal_town", "administrative_area_level_2", "administrative_area_level_1"]),
    category: categoryFromType(place.primaryType),
    estimatedCost: exactKrw ?? level?.cost ?? null,
    priceLabel: exactKrw !== null ? `Google 가격 범위 기준 약 ${exactKrw.toLocaleString("ko-KR")}원` : level?.label ?? "가격 정보 없음",
  };
}

export async function GET(request: Request) {
  await connection();
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ message: "로그인이 필요합니다." }, { status: 401 });
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (query.length < 2 || query.length > 200) return Response.json({ message: "두 글자 이상의 장소명을 입력해 주세요." }, { status: 400 });
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
    if (!apiKey) return Response.json({ message: "Google Maps API 키가 설정되지 않았습니다." }, { status: 503 });

    const googleResponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.addressComponents,places.primaryType,places.priceLevel,places.priceRange",
      },
      body: JSON.stringify({ textQuery: query, languageCode: "ko", pageSize: 5 }),
      cache: "no-store",
    });
    if (!googleResponse.ok) {
      const detail = (await googleResponse.json().catch(() => null)) as { error?: { message?: string } } | null;
      console.error("Google Places 검색 실패", googleResponse.status, detail?.error?.message);
      return Response.json({ message: "자동 입력을 사용하려면 Google Cloud에서 Places API (New)를 활성화해 주세요." }, { status: 502 });
    }
    const payload = (await googleResponse.json()) as { places?: GooglePlace[] };
    return Response.json({ places: (payload.places ?? []).map(mapPlace) });
  } catch (error) {
    console.error("장소 자동 검색 실패", error);
    return Response.json({ message: "장소 정보를 검색하지 못했습니다." }, { status: 500 });
  }
}
