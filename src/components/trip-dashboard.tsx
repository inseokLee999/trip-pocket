"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";

type PlaceStatus = "wishlist" | "visited";
type PlaceCategory = "관광지" | "자연" | "맛집" | "숙소" | "휴양" | "기타";

type TravelPlace = {
  id: string;
  name: string;
  country: string;
  city: string;
  category: PlaceCategory;
  status: PlaceStatus;
  visitDate: string;
  memo: string;
  createdAt: string;
};

type PlaceDraft = Omit<TravelPlace, "id" | "createdAt">;
type StatusFilter = "all" | PlaceStatus;

const STORAGE_KEY = "trip-pocket-places-v1";
const categories: PlaceCategory[] = ["관광지", "자연", "맛집", "숙소", "휴양", "기타"];

const emptyDraft: PlaceDraft = {
  name: "",
  country: "",
  city: "",
  category: "관광지",
  status: "wishlist",
  visitDate: "",
  memo: "",
};

const initialPlaces: TravelPlace[] = [
  {
    id: "jeju-seongsan",
    name: "성산일출봉",
    country: "대한민국",
    city: "제주",
    category: "자연",
    status: "wishlist",
    visitDate: "2026-11-08",
    memo: "해 뜨기 전에 도착해서 일출 보기",
    createdAt: "2026-10-01T09:00:00.000Z",
  },
  {
    id: "kyoto-arashiyama",
    name: "아라시야마",
    country: "일본",
    city: "교토",
    category: "관광지",
    status: "wishlist",
    visitDate: "2027-03-21",
    memo: "아침 일찍 대나무 숲 산책하기",
    createdAt: "2026-10-03T09:00:00.000Z",
  },
  {
    id: "busan-haeundae",
    name: "해운대 해수욕장",
    country: "대한민국",
    city: "부산",
    category: "휴양",
    status: "visited",
    visitDate: "2026-08-16",
    memo: "해변 열차 타고 청사포까지 이동",
    createdAt: "2026-08-01T09:00:00.000Z",
  },
];

const categoryTheme: Record<PlaceCategory, { emoji: string; background: string }> = {
  관광지: { emoji: "🏛️", background: "from-amber-100 via-orange-50 to-rose-100" },
  자연: { emoji: "🌿", background: "from-emerald-100 via-teal-50 to-cyan-100" },
  맛집: { emoji: "🍜", background: "from-orange-100 via-amber-50 to-yellow-100" },
  숙소: { emoji: "🛏️", background: "from-violet-100 via-purple-50 to-indigo-100" },
  휴양: { emoji: "🏖️", background: "from-cyan-100 via-sky-50 to-blue-100" },
  기타: { emoji: "✦", background: "from-slate-100 via-stone-50 to-zinc-100" },
};

function formatDate(date: string) {
  if (!date) return "날짜 미정";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(`${date}T00:00:00`));
}

function daysUntil(date: string, referenceDate: string) {
  const today = new Date(`${referenceDate}T00:00:00`);
  const target = new Date(`${date}T00:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export default function TripDashboard() {
  const [places, setPlaces] = useState<TravelPlace[]>(initialPlaces);
  const [hydrated, setHydrated] = useState(false);
  const [todayDate, setTodayDate] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | PlaceCategory>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PlaceDraft>(emptyDraft);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let savedPlaces: TravelPlace[] | null = null;
    let loadError = false;
    try {
      const storedPlaces = window.localStorage.getItem(STORAGE_KEY);
      if (storedPlaces) {
        const parsed = JSON.parse(storedPlaces) as TravelPlace[];
        if (Array.isArray(parsed)) savedPlaces = parsed;
      }
    } catch {
      loadError = true;
    }

    const timer = window.setTimeout(() => {
      if (savedPlaces) setPlaces(savedPlaces);
      if (loadError) setNotice("저장된 데이터를 불러오지 못해 기본 목록을 보여드려요.");
      setTodayDate(new Date().toISOString().slice(0, 10));
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
  }, [hydrated, places]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isModalOpen]);

  const filteredPlaces = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
    return places.filter((place) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [place.name, place.country, place.city, place.memo]
          .join(" ")
          .toLocaleLowerCase("ko-KR")
          .includes(normalizedQuery);
      const matchesStatus = statusFilter === "all" || place.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || place.category === categoryFilter;
      return matchesQuery && matchesStatus && matchesCategory;
    });
  }, [categoryFilter, places, query, statusFilter]);

  const nextTrip = useMemo(() => {
    return places
      .filter((place) => place.status === "wishlist" && place.visitDate && todayDate && daysUntil(place.visitDate, todayDate) >= 0)
      .sort((a, b) => a.visitDate.localeCompare(b.visitDate))[0];
  }, [places, todayDate]);

  const wishlistCount = places.filter((place) => place.status === "wishlist").length;
  const visitedCount = places.length - wishlistCount;

  function openCreateModal() {
    setEditingId(null);
    setDraft(emptyDraft);
    setFormError("");
    setIsModalOpen(true);
  }

  function openEditModal(place: TravelPlace) {
    const { id, createdAt, ...editableFields } = place;
    void id;
    void createdAt;
    setEditingId(place.id);
    setDraft(editableFields);
    setFormError("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setFormError("");
  }

  function updateDraft<K extends keyof PlaceDraft>(key: K, value: PlaceDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.country.trim() || !draft.city.trim()) {
      setFormError("장소명, 국가, 도시는 꼭 입력해 주세요.");
      return;
    }

    if (editingId) {
      setPlaces((current) =>
        current.map((place) =>
          place.id === editingId
            ? { ...place, ...draft, name: draft.name.trim(), country: draft.country.trim(), city: draft.city.trim(), memo: draft.memo.trim() }
            : place,
        ),
      );
      setNotice("여행지 정보를 수정했어요.");
    } else {
      setPlaces((current) => [
        {
          ...draft,
          id: crypto.randomUUID(),
          name: draft.name.trim(),
          country: draft.country.trim(),
          city: draft.city.trim(),
          memo: draft.memo.trim(),
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
      setNotice("새 여행지를 보관함에 담았어요.");
    }
    closeModal();
  }

  function toggleStatus(place: TravelPlace) {
    const nextStatus: PlaceStatus = place.status === "wishlist" ? "visited" : "wishlist";
    setPlaces((current) => current.map((item) => (item.id === place.id ? { ...item, status: nextStatus } : item)));
    setNotice(nextStatus === "visited" ? "다녀온 여행지로 표시했어요." : "가고 싶은 곳으로 되돌렸어요.");
  }

  function deletePlace(place: TravelPlace) {
    if (!window.confirm(`‘${place.name}’을(를) 여행지 목록에서 삭제할까요?`)) return;
    setPlaces((current) => current.filter((item) => item.id !== place.id));
    setNotice("여행지를 삭제했어요.");
  }

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
    setCategoryFilter("all");
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8">
          <a href="#top" className="flex items-center gap-3" aria-label="Trip Pocket 홈">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--brand)] text-xl text-white shadow-sm">✦</span>
            <div>
              <p className="text-lg font-extrabold tracking-tight">Trip Pocket</p>
              <p className="text-[11px] font-medium text-[var(--muted)]">나만의 여행 보관함</p>
            </div>
          </a>
          <button onClick={openCreateModal} className="rounded-full bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--brand-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] sm:px-5">
            <span className="sm:hidden">+ 추가</span><span className="hidden sm:inline">+ 여행지 추가</span>
          </button>
        </div>
      </header>

      <div id="top" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="grid gap-5 lg:grid-cols-[1fr_330px]">
          <div className="relative overflow-hidden rounded-[2rem] bg-[var(--brand-strong)] p-7 text-white shadow-sm sm:p-10">
            <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border-[44px] border-white/5" aria-hidden="true" />
            <div className="absolute -bottom-16 right-32 h-40 w-40 rounded-full bg-[var(--accent)]/20 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <p className="mb-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wide text-emerald-50">MY TRAVEL BOARD</p>
              <h1 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">마음에 담아둔 여행지를<br className="hidden sm:block" /> 한곳에 모아보세요.</h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-emerald-50/80 sm:text-base">떠나고 싶은 장소부터 다녀온 추억까지, 다음 여행을 위한 작은 계획을 차곡차곡 기록하세요.</p>
              <button onClick={openCreateModal} className="mt-7 rounded-full bg-white px-5 py-3 text-sm font-extrabold text-[var(--brand-strong)] transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">첫 여행지 담기</button>
            </div>
          </div>

          <aside className="grid grid-cols-2 gap-3 lg:grid-cols-1" aria-label="여행 현황">
            <div className="rounded-3xl border border-[var(--line)] bg-white p-5 sm:p-6">
              <p className="text-sm font-medium text-[var(--muted)]">저장한 여행지</p>
              <p className="mt-2 text-3xl font-extrabold">{places.length}<span className="ml-1 text-base font-semibold text-[var(--muted)]">곳</span></p>
              <p className="mt-3 text-xs text-[var(--muted)]">가고 싶은 곳 {wishlistCount} · 다녀온 곳 {visitedCount}</p>
            </div>
            <div className="rounded-3xl border border-[var(--line)] bg-[var(--soft)] p-5 sm:p-6">
              <p className="text-sm font-medium text-[var(--brand)]">다가오는 여행</p>
              <p className="mt-2 text-3xl font-extrabold text-[var(--brand-strong)]">{!todayDate ? "…" : nextTrip ? (daysUntil(nextTrip.visitDate, todayDate) === 0 ? "D-Day" : `D-${daysUntil(nextTrip.visitDate, todayDate)}`) : "미정"}</p>
              <p className="mt-3 truncate text-xs text-[var(--brand)]">{!todayDate ? "일정을 확인하고 있어요" : nextTrip ? `${nextTrip.city} · ${nextTrip.name}` : "날짜를 정한 여행이 없어요"}</p>
            </div>
          </aside>
        </section>

        <section className="mt-10" aria-labelledby="places-title">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--accent)]">MY PLACES</p>
              <h2 id="places-title" className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">내 여행지</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(240px,1fr)_auto] lg:flex">
              <label className="flex min-w-0 items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2.5 focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-emerald-100 sm:w-72">
                <span aria-hidden="true">⌕</span>
                <span className="sr-only">여행지 검색</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="도시나 장소를 검색하세요" />
              </label>
              <select aria-label="카테고리 필터" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as "all" | PlaceCategory)} className="rounded-full border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-bold outline-none focus:border-[var(--brand)]">
                <option value="all">모든 카테고리</option>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="방문 상태 필터">
            {([
              ["all", `전체 ${places.length}`],
              ["wishlist", `가고 싶은 곳 ${wishlistCount}`],
              ["visited", `다녀온 곳 ${visitedCount}`],
            ] as const).map(([value, label]) => (
              <button key={value} onClick={() => setStatusFilter(value)} aria-pressed={statusFilter === value} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${statusFilter === value ? "bg-[var(--foreground)] text-white" : "border border-[var(--line)] bg-white text-[var(--muted)] hover:border-slate-400"}`}>{label}</button>
            ))}
          </div>

          {filteredPlaces.length > 0 ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredPlaces.map((place) => {
                const theme = categoryTheme[place.category];
                return (
                  <article key={place.id} className="group overflow-hidden rounded-[1.75rem] border border-[var(--line)] bg-white shadow-[0_12px_30px_rgba(29,78,66,0.06)] transition hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(29,78,66,0.1)]">
                    <div className={`relative flex h-40 items-center justify-center bg-gradient-to-br ${theme.background}`}>
                      <span className="text-6xl drop-shadow-sm transition duration-300 group-hover:scale-110" role="img" aria-label={`${place.category} 대표 이미지`}>{theme.emoji}</span>
                      <span className="absolute left-4 top-4 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-slate-700 backdrop-blur">{place.category}</span>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[var(--brand)]">{place.country} · {place.city}</p>
                          <h3 className="mt-1 truncate text-xl font-extrabold tracking-tight">{place.name}</h3>
                        </div>
                        <button onClick={() => toggleStatus(place)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition ${place.status === "visited" ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-[var(--soft)] text-[var(--brand)] hover:bg-emerald-100"}`} aria-label={`${place.name} 방문 상태 변경`}>
                          {place.status === "visited" ? "✓ 다녀온 곳" : "가고 싶은 곳"}
                        </button>
                      </div>
                      <p className="mt-4 line-clamp-2 min-h-11 text-sm leading-6 text-[var(--muted)]">{place.memo || "아직 작성한 메모가 없어요."}</p>
                      <div className="mt-5 flex items-center justify-between border-t border-[var(--line)] pt-4">
                        <time className="text-xs font-semibold text-[var(--muted)]">{formatDate(place.visitDate)}</time>
                        <div className="flex gap-1">
                          <button onClick={() => openEditModal(place)} className="rounded-full px-3 py-1.5 text-xs font-bold text-[var(--brand)] hover:bg-[var(--soft)]">수정</button>
                          <button onClick={() => deletePlace(place)} className="rounded-full px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50">삭제</button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <span className="text-5xl" role="img" aria-label="빈 여행 가방">🧳</span>
              <h3 className="mt-5 text-xl font-extrabold">조건에 맞는 여행지가 없어요</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">검색어나 필터를 바꾸거나 새로운 여행지를 추가해 보세요.</p>
              <div className="mt-6 flex justify-center gap-2">
                <button onClick={resetFilters} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-bold">필터 초기화</button>
                <button onClick={openCreateModal} className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white">여행지 추가</button>
              </div>
            </div>
          )}
        </section>

        <figure className="mt-12 overflow-hidden rounded-[2rem] border border-[var(--line)] bg-white shadow-sm">
          <Image
            src="/og.png"
            alt="햇살이 비치는 해안도로와 바다를 담은 Trip Pocket 여행 콜라주"
            width={1730}
            height={909}
            className="h-auto w-full object-cover"
          />
        </figure>
      </div>

      <footer className="border-t border-[var(--line)] bg-white px-5 py-8 text-center text-xs text-[var(--muted)]">Trip Pocket · 여행의 설렘을 차곡차곡 모으는 공간</footer>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="place-form-title" className="max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-6 shadow-2xl sm:max-w-2xl sm:rounded-[2rem] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[var(--accent)]">TRAVEL PLACE</p>
                <h2 id="place-form-title" className="mt-1 text-2xl font-extrabold">{editingId ? "여행지 수정" : "새 여행지 추가"}</h2>
              </div>
              <button onClick={closeModal} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-xl text-slate-600 hover:bg-slate-200" aria-label="창 닫기">×</button>
            </div>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div>
                <label htmlFor="name" className="text-sm font-bold">장소명 <span className="text-rose-500">*</span></label>
                <input id="name" autoFocus value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} placeholder="예: 성산일출봉" className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-emerald-100" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="country" className="text-sm font-bold">국가 <span className="text-rose-500">*</span></label>
                  <input id="country" value={draft.country} onChange={(event) => updateDraft("country", event.target.value)} placeholder="예: 대한민국" className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-emerald-100" />
                </div>
                <div>
                  <label htmlFor="city" className="text-sm font-bold">도시 <span className="text-rose-500">*</span></label>
                  <input id="city" value={draft.city} onChange={(event) => updateDraft("city", event.target.value)} placeholder="예: 제주" className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-emerald-100" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="category" className="text-sm font-bold">카테고리</label>
                  <select id="category" value={draft.category} onChange={(event) => updateDraft("category", event.target.value as PlaceCategory)} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none focus:border-[var(--brand)]">
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="visitDate" className="text-sm font-bold">방문 예정일</label>
                  <input id="visitDate" type="date" value={draft.visitDate} onChange={(event) => updateDraft("visitDate", event.target.value)} className="mt-2 w-full rounded-2xl border border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--brand)]" />
                </div>
              </div>

              <fieldset>
                <legend className="text-sm font-bold">방문 상태</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["wishlist", "visited"] as PlaceStatus[]).map((status) => (
                    <label key={status} className={`cursor-pointer rounded-2xl border px-4 py-3 text-center text-sm font-bold transition ${draft.status === status ? "border-[var(--brand)] bg-[var(--soft)] text-[var(--brand)]" : "border-[var(--line)] text-[var(--muted)]"}`}>
                      <input type="radio" name="status" value={status} checked={draft.status === status} onChange={() => updateDraft("status", status)} className="sr-only" />
                      {status === "wishlist" ? "가고 싶은 곳" : "다녀온 곳"}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="memo" className="text-sm font-bold">여행 메모</label>
                <textarea id="memo" rows={4} value={draft.memo} onChange={(event) => updateDraft("memo", event.target.value)} placeholder="하고 싶은 일이나 기억하고 싶은 정보를 적어보세요." className="mt-2 w-full resize-none rounded-2xl border border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-emerald-100" />
              </div>

              {formError && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{formError}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} className="flex-1 rounded-full border border-[var(--line)] px-5 py-3 font-bold text-[var(--muted)]">취소</button>
                <button type="submit" className="flex-1 rounded-full bg-[var(--brand)] px-5 py-3 font-bold text-white hover:bg-[var(--brand-strong)]">{editingId ? "수정 완료" : "여행지 저장"}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {notice && <div role="status" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-xl">{notice}</div>}
    </main>
  );
}
