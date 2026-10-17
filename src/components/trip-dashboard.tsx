"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  placeCategories,
  type PlaceCategory,
  type PlaceDraft,
  type PlaceStatus,
  type TravelPlace,
} from "@/types/travel-place";

type StatusFilter = "all" | PlaceStatus;

const categories = placeCategories;

const emptyDraft: PlaceDraft = {
  name: "",
  country: "",
  city: "",
  category: "관광지",
  status: "wishlist",
  visitDate: "",
  memo: "",
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
  const [places, setPlaces] = useState<TravelPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
    let cancelled = false;

    async function loadPlaces() {
      try {
        const response = await fetch("/api/places", { cache: "no-store" });
        const payload = (await response.json()) as { places?: TravelPlace[]; message?: string };
        if (!response.ok) throw new Error(payload.message);
        if (!cancelled) setPlaces(payload.places ?? []);
      } catch {
        if (!cancelled) setNotice("데이터베이스에서 여행지를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    const timer = window.setTimeout(() => {
      setTodayDate(new Date().toISOString().slice(0, 10));
    }, 0);
    void loadPlaces();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.country.trim() || !draft.city.trim()) {
      setFormError("장소명, 국가, 도시는 꼭 입력해 주세요.");
      return;
    }

    const requestBody: PlaceDraft = {
      ...draft,
      name: draft.name.trim(),
      country: draft.country.trim(),
      city: draft.city.trim(),
      memo: draft.memo.trim(),
    };

    setIsSaving(true);
    setFormError("");
    try {
      const response = await fetch(editingId ? `/api/places/${editingId}` : "/api/places", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const payload = (await response.json()) as { place?: TravelPlace; message?: string };
      if (!response.ok || !payload.place) {
        throw new Error(payload.message ?? "여행지를 저장하지 못했습니다.");
      }

      if (editingId) {
        setPlaces((current) => current.map((place) => (place.id === editingId ? payload.place! : place)));
        setNotice("여행지 정보를 수정했습니다.");
      } else {
        setPlaces((current) => [payload.place!, ...current]);
        setNotice("새 여행지를 저장했습니다.");
      }
      closeModal();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "여행지를 저장하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStatus(place: TravelPlace) {
    const nextStatus: PlaceStatus = place.status === "wishlist" ? "visited" : "wishlist";
    const { id, createdAt, ...editableFields } = place;
    void createdAt;

    try {
      const response = await fetch(`/api/places/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editableFields, status: nextStatus }),
      });
      const payload = (await response.json()) as { place?: TravelPlace; message?: string };
      if (!response.ok || !payload.place) throw new Error(payload.message);
      setPlaces((current) => current.map((item) => (item.id === id ? payload.place! : item)));
      setNotice(nextStatus === "visited" ? "다녀온 여행지로 표시했습니다." : "가고 싶은 곳으로 되돌렸습니다.");
    } catch {
      setNotice("방문 상태를 변경하지 못했습니다.");
    }
  }

  async function deletePlace(place: TravelPlace) {
    if (!window.confirm(`‘${place.name}’을(를) 여행지 목록에서 삭제할까요?`)) return;
    try {
      const response = await fetch(`/api/places/${place.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message);
      }
      setPlaces((current) => current.filter((item) => item.id !== place.id));
      setNotice("여행지를 삭제했습니다.");
    } catch {
      setNotice("여행지를 삭제하지 못했습니다.");
    }
  }

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
    setCategoryFilter("all");
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <a href="#top" className="flex items-center gap-3" aria-label="Trip Pocket 홈">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--brand)] text-sm font-black text-white">TP</span>
            <div>
              <p className="text-base font-bold tracking-tight">Trip Pocket</p>
              <p className="text-[11px] text-[var(--muted)]">개인 여행지 관리</p>
            </div>
          </a>
          <button onClick={openCreateModal} className="rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]">
            <span className="sm:hidden">+ 추가</span><span className="hidden sm:inline">+ 여행지 추가</span>
          </button>
        </div>
      </header>

      <div id="top" className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">여행지</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">가고 싶은 장소와 다녀온 여행을 한곳에서 관리하세요.</p>
          </div>
          <p className="text-sm text-[var(--muted)]">모든 변경사항은 PostgreSQL에 저장됩니다.</p>
        </section>

        <aside className="mt-7 grid gap-3 sm:grid-cols-3" aria-label="여행 현황">
          <div className="rounded-xl border border-[var(--line)] bg-white px-5 py-4">
            <p className="text-xs font-medium text-[var(--muted)]">전체 여행지</p>
            <p className="mt-1 text-2xl font-bold">{places.length}<span className="ml-1 text-sm font-normal text-[var(--muted)]">곳</span></p>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-white px-5 py-4">
            <p className="text-xs font-medium text-[var(--muted)]">가고 싶은 곳</p>
            <p className="mt-1 text-2xl font-bold">{wishlistCount}<span className="ml-1 text-sm font-normal text-[var(--muted)]">곳</span></p>
          </div>
          <div className="rounded-xl border border-[var(--line)] bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-[var(--muted)]">다음 여행</p>
                <p className="mt-1 text-2xl font-bold text-[var(--brand)]">{!todayDate ? "…" : nextTrip ? (daysUntil(nextTrip.visitDate, todayDate) === 0 ? "D-Day" : `D-${daysUntil(nextTrip.visitDate, todayDate)}`) : "미정"}</p>
              </div>
              <p className="max-w-32 truncate pt-1 text-right text-xs text-[var(--muted)]">{!todayDate ? "확인 중" : nextTrip ? `${nextTrip.city} · ${nextTrip.name}` : "예정 없음"}</p>
            </div>
          </div>
        </aside>

        <section className="mt-8" aria-labelledby="places-title">
          <div className="rounded-xl border border-[var(--line)] bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <h2 id="places-title" className="text-lg font-bold">저장한 여행지</h2>
              <div className="grid gap-2 sm:grid-cols-[minmax(240px,1fr)_auto] lg:flex">
              <label className="flex min-w-0 items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3.5 py-2.5 focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-emerald-100 sm:w-72">
                <span className="text-[var(--muted)]" aria-hidden="true">검색</span>
                <span className="sr-only">여행지 검색</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="도시나 장소를 검색하세요" />
              </label>
              <select aria-label="카테고리 필터" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as "all" | PlaceCategory)} className="rounded-lg border border-[var(--line)] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[var(--brand)]">
                <option value="all">모든 카테고리</option>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              </div>
            </div>

            <div className="mt-4 flex gap-5 overflow-x-auto border-t border-[var(--line)] pt-4" aria-label="방문 상태 필터">
            {([
              ["all", `전체 ${places.length}`],
              ["wishlist", `가고 싶은 곳 ${wishlistCount}`],
              ["visited", `다녀온 곳 ${visitedCount}`],
            ] as const).map(([value, label]) => (
              <button key={value} onClick={() => setStatusFilter(value)} aria-pressed={statusFilter === value} className={`shrink-0 border-b-2 pb-2 text-sm font-semibold transition ${statusFilter === value ? "border-[var(--brand)] text-[var(--brand)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"}`}>{label}</button>
            ))}
            </div>
          </div>

          {isLoading ? (
            <div className="mt-4 rounded-xl border border-[var(--line)] bg-white px-6 py-14 text-center">
              <p className="text-sm text-[var(--muted)]">데이터베이스에서 여행지를 불러오는 중입니다.</p>
            </div>
          ) : filteredPlaces.length > 0 ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {filteredPlaces.map((place) => (
                <article key={place.id} className="rounded-xl border border-[var(--line)] bg-white p-5 transition hover:border-slate-300 hover:shadow-[0_6px_20px_rgba(25,40,34,0.05)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                        <span>{place.country} · {place.city}</span>
                        <span aria-hidden="true">·</span>
                        <span>{place.category}</span>
                      </div>
                      <h3 className="mt-1.5 truncate text-lg font-bold tracking-tight">{place.name}</h3>
                    </div>
                    <button onClick={() => toggleStatus(place)} className={`shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition ${place.status === "visited" ? "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100" : "border-emerald-200 bg-[var(--soft)] text-[var(--brand)] hover:bg-emerald-100"}`} aria-label={`${place.name} 방문 상태 변경`}>
                      {place.status === "visited" ? "다녀온 곳" : "가고 싶은 곳"}
                    </button>
                  </div>
                  <p className="mt-4 line-clamp-2 min-h-11 text-sm leading-6 text-[var(--muted)]">{place.memo || "작성한 메모가 없습니다."}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3.5">
                    <time className="text-xs text-[var(--muted)]">방문일 {formatDate(place.visitDate)}</time>
                    <div className="flex gap-1">
                      <button onClick={() => openEditModal(place)} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">수정</button>
                      <button onClick={() => deletePlace(place)} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">삭제</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <h3 className="text-lg font-bold">조건에 맞는 여행지가 없습니다</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">검색어나 필터를 바꾸거나 새로운 여행지를 추가해 보세요.</p>
              <div className="mt-5 flex justify-center gap-2">
                <button onClick={resetFilters} className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold">필터 초기화</button>
                <button onClick={openCreateModal} className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">여행지 추가</button>
              </div>
            </div>
          )}
        </section>
      </div>

      <footer className="border-t border-[var(--line)] bg-white px-5 py-6 text-center text-xs text-[var(--muted)]">Trip Pocket · 개인 여행지 관리</footer>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="place-form-title" className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:max-w-xl sm:rounded-xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="place-form-title" className="text-xl font-bold">{editingId ? "여행지 수정" : "새 여행지 추가"}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">여행지의 기본 정보를 입력해 주세요.</p>
              </div>
              <button onClick={closeModal} className="grid h-9 w-9 place-items-center rounded-md text-xl text-slate-500 hover:bg-slate-100" aria-label="창 닫기">×</button>
            </div>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div>
                <label htmlFor="name" className="text-sm font-bold">장소명 <span className="text-rose-500">*</span></label>
                <input id="name" autoFocus value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} placeholder="예: 성산일출봉" className="mt-2 w-full rounded-lg border border-[var(--line)] px-3.5 py-2.5 outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-emerald-100" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="country" className="text-sm font-bold">국가 <span className="text-rose-500">*</span></label>
                  <input id="country" value={draft.country} onChange={(event) => updateDraft("country", event.target.value)} placeholder="예: 대한민국" className="mt-2 w-full rounded-lg border border-[var(--line)] px-3.5 py-2.5 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-emerald-100" />
                </div>
                <div>
                  <label htmlFor="city" className="text-sm font-bold">도시 <span className="text-rose-500">*</span></label>
                  <input id="city" value={draft.city} onChange={(event) => updateDraft("city", event.target.value)} placeholder="예: 제주" className="mt-2 w-full rounded-lg border border-[var(--line)] px-3.5 py-2.5 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-emerald-100" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="category" className="text-sm font-bold">카테고리</label>
                  <select id="category" value={draft.category} onChange={(event) => updateDraft("category", event.target.value as PlaceCategory)} className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3.5 py-2.5 outline-none focus:border-[var(--brand)]">
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="visitDate" className="text-sm font-bold">방문 예정일</label>
                  <input id="visitDate" type="date" value={draft.visitDate} onChange={(event) => updateDraft("visitDate", event.target.value)} className="mt-2 w-full rounded-lg border border-[var(--line)] px-3.5 py-2.5 outline-none focus:border-[var(--brand)]" />
                </div>
              </div>

              <fieldset>
                <legend className="text-sm font-bold">방문 상태</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["wishlist", "visited"] as PlaceStatus[]).map((status) => (
                    <label key={status} className={`cursor-pointer rounded-lg border px-4 py-2.5 text-center text-sm font-semibold transition ${draft.status === status ? "border-[var(--brand)] bg-[var(--soft)] text-[var(--brand)]" : "border-[var(--line)] text-[var(--muted)]"}`}>
                      <input type="radio" name="status" value={status} checked={draft.status === status} onChange={() => updateDraft("status", status)} className="sr-only" />
                      {status === "wishlist" ? "가고 싶은 곳" : "다녀온 곳"}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="memo" className="text-sm font-bold">여행 메모</label>
                <textarea id="memo" rows={4} value={draft.memo} onChange={(event) => updateDraft("memo", event.target.value)} placeholder="하고 싶은 일이나 기억하고 싶은 정보를 적어보세요." className="mt-2 w-full resize-none rounded-lg border border-[var(--line)] px-3.5 py-2.5 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-emerald-100" />
              </div>

              {formError && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{formError}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} className="flex-1 rounded-lg border border-[var(--line)] px-5 py-2.5 font-semibold text-[var(--muted)]">취소</button>
                <button type="submit" disabled={isSaving} className="flex-1 rounded-lg bg-[var(--brand)] px-5 py-2.5 font-semibold text-white hover:bg-[var(--brand-strong)] disabled:cursor-wait disabled:opacity-60">{isSaving ? "저장 중…" : editingId ? "수정 완료" : "여행지 저장"}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {notice && <div role="status" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">{notice}</div>}
    </main>
  );
}
