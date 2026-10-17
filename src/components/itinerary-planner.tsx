"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  itineraryCategories,
  type ItineraryCategory,
  type ItineraryDraft,
  type ItineraryItem,
} from "@/types/itinerary";
import type { TravelPlace } from "@/types/travel-place";

const categoryLabel: Record<ItineraryCategory, string> = {
  transport: "이동",
  sightseeing: "관광",
  food: "식사",
  stay: "숙소",
  shopping: "쇼핑",
  other: "기타",
};

const categoryStyle: Record<ItineraryCategory, string> = {
  transport: "bg-sky-50 text-sky-700",
  sightseeing: "bg-emerald-50 text-emerald-700",
  food: "bg-orange-50 text-orange-700",
  stay: "bg-violet-50 text-violet-700",
  shopping: "bg-pink-50 text-pink-700",
  other: "bg-slate-100 text-slate-600",
};

function today() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function createEmptyDraft(tripName = "내 여행"): ItineraryDraft {
  return {
    tripName,
    title: "",
    location: "",
    category: "sightseeing",
    planDate: today(),
    startTime: "",
    endTime: "",
    estimatedCost: 0,
    memo: "",
  };
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(new Date(`${date}T00:00:00`));
}

function formatCost(cost: number) {
  return new Intl.NumberFormat("ko-KR").format(cost);
}

export default function ItineraryPlanner({ places }: { places: TravelPlace[] }) {
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tripFilter, setTripFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ItineraryDraft>(() => createEmptyDraft());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadItems() {
      try {
        const response = await fetch("/api/itinerary", { cache: "no-store" });
        const payload = (await response.json()) as { items?: ItineraryItem[]; message?: string };
        if (!response.ok) throw new Error(payload.message);
        if (!cancelled) setItems(payload.items ?? []);
      } catch {
        if (!cancelled) setNotice("여행 계획을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadItems();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeModal(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isModalOpen]);

  const tripNames = useMemo(
    () => [...new Set([...places.map((place) => place.tripName), ...items.map((item) => item.tripName)])].sort(),
    [items, places],
  );
  const visibleItems = useMemo(
    () => items.filter((item) => tripFilter === "all" || item.tripName === tripFilter),
    [items, tripFilter],
  );
  const groupedItems = useMemo(() => {
    const groups = new Map<string, ItineraryItem[]>();
    visibleItems.forEach((item) => groups.set(item.planDate, [...(groups.get(item.planDate) ?? []), item]));
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [visibleItems]);
  const totalCost = visibleItems.reduce((total, item) => total + item.estimatedCost, 0);

  function openCreateModal() {
    const initialTrip = tripFilter !== "all" ? tripFilter : tripNames[0] ?? "내 여행";
    setEditingId(null);
    setDraft(createEmptyDraft(initialTrip));
    setError("");
    setIsModalOpen(true);
  }

  function openEditModal(item: ItineraryItem) {
    const { id, createdAt, ...fields } = item;
    void id;
    void createdAt;
    setEditingId(item.id);
    setDraft(fields);
    setError("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setError("");
  }

  function updateDraft<K extends keyof ItineraryDraft>(key: K, value: ItineraryDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.tripName.trim() || !draft.title.trim() || !draft.location.trim() || !draft.planDate) {
      setError("여행 이름, 일정명, 장소, 날짜를 입력해 주세요.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const body = { ...draft, tripName: draft.tripName.trim(), title: draft.title.trim(), location: draft.location.trim(), memo: draft.memo.trim() };
      const response = await fetch(editingId ? `/api/itinerary/${editingId}` : "/api/itinerary", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { item?: ItineraryItem; message?: string };
      if (!response.ok || !payload.item) throw new Error(payload.message ?? "일정을 저장하지 못했습니다.");
      setItems((current) => editingId
        ? current.map((item) => item.id === editingId ? payload.item! : item)
        : [...current, payload.item!].sort((a, b) => `${a.planDate}${a.startTime}`.localeCompare(`${b.planDate}${b.startTime}`)));
      setNotice(editingId ? "일정을 수정했습니다." : "새 일정을 추가했습니다.");
      closeModal();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "일정을 저장하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteItem(item: ItineraryItem) {
    if (!window.confirm(`‘${item.title}’ 일정을 삭제할까요?`)) return;
    try {
      const response = await fetch(`/api/itinerary/${item.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
      setNotice("일정을 삭제했습니다.");
    } catch {
      setNotice("일정을 삭제하지 못했습니다.");
    }
  }

  return (
    <section className="mt-7" aria-labelledby="planner-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 id="planner-title" className="text-3xl font-bold tracking-tight sm:text-4xl">여행 계획</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">날짜와 시간별로 이동, 관광, 식사 일정을 정리하세요.</p>
        </div>
        <button onClick={openCreateModal} className="rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-strong)]">+ 일정 추가</button>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--line)] bg-white px-5 py-4"><p className="text-xs text-[var(--muted)]">전체 일정</p><p className="mt-1 text-2xl font-bold">{visibleItems.length}<span className="ml-1 text-sm font-normal text-[var(--muted)]">개</span></p></div>
        <div className="rounded-xl border border-[var(--line)] bg-white px-5 py-4"><p className="text-xs text-[var(--muted)]">여행 일수</p><p className="mt-1 text-2xl font-bold">{groupedItems.length}<span className="ml-1 text-sm font-normal text-[var(--muted)]">일</span></p></div>
        <div className="rounded-xl border border-[var(--line)] bg-white px-5 py-4"><p className="text-xs text-[var(--muted)]">일정 예상 비용</p><p className="mt-1 text-2xl font-bold">{formatCost(totalCost)}<span className="ml-1 text-sm font-normal text-[var(--muted)]">원</span></p></div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-white p-4">
        <p className="text-sm font-bold">날짜별 일정</p>
        <select aria-label="여행 계획 필터" value={tripFilter} onChange={(event) => setTripFilter(event.target.value)} className="max-w-56 rounded-lg border border-[var(--line)] bg-white px-3.5 py-2 text-sm outline-none focus:border-[var(--brand)]">
          <option value="all">모든 여행</option>
          {tripNames.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="mt-4 rounded-xl border border-[var(--line)] bg-white px-6 py-14 text-center text-sm text-[var(--muted)]">여행 계획을 불러오는 중입니다.</div>
      ) : groupedItems.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <h2 className="text-lg font-bold">아직 작성한 일정이 없습니다</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">첫 번째 여행 일정을 날짜와 시간에 맞춰 추가해 보세요.</p>
          <button onClick={openCreateModal} className="mt-5 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white">일정 추가</button>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {groupedItems.map(([date, dayItems], dayIndex) => (
            <article key={date} className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
              <header className="flex items-center justify-between border-b border-[var(--line)] bg-slate-50 px-5 py-3.5">
                <h2 className="font-bold">{formatDate(date)}</h2>
                <span className="text-xs font-semibold text-[var(--muted)]">DAY {dayIndex + 1}</span>
              </header>
              <div className="divide-y divide-[var(--line)]">
                {dayItems.map((item) => (
                  <div key={item.id} className="grid gap-3 p-5 sm:grid-cols-[90px_minmax(0,1fr)_auto] sm:items-start">
                    <div className="text-sm font-bold text-[var(--brand)]">{item.startTime || "시간 미정"}{item.endTime ? <span className="block text-xs font-normal text-[var(--muted)]">~ {item.endTime}</span> : null}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{item.title}</h3><span className={`rounded px-2 py-1 text-[11px] font-bold ${categoryStyle[item.category]}`}>{categoryLabel[item.category]}</span><span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{item.tripName}</span></div>
                      <p className="mt-2 text-sm text-[var(--muted)]">장소 · {item.location}</p>
                      {item.memo && <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.memo}</p>}
                      <p className="mt-2 text-xs font-semibold text-slate-500">{item.estimatedCost > 0 ? `예상 ${formatCost(item.estimatedCost)}원` : "비용 미정"}</p>
                    </div>
                    <div className="flex gap-1 sm:justify-end"><button onClick={() => openEditModal(item)} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">수정</button><button onClick={() => deleteItem(item)} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">삭제</button></div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="itinerary-form-title" className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:max-w-2xl sm:rounded-xl sm:p-7">
            <div className="flex items-start justify-between gap-4"><div><h2 id="itinerary-form-title" className="text-xl font-bold">{editingId ? "일정 수정" : "새 일정 추가"}</h2><p className="mt-1 text-sm text-[var(--muted)]">하루 동선을 만들 수 있도록 시간과 장소를 입력해 주세요.</p></div><button onClick={closeModal} className="grid h-9 w-9 place-items-center rounded-md text-xl text-slate-500 hover:bg-slate-100" aria-label="창 닫기">×</button></div>
            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label htmlFor="plan-trip" className="text-sm font-bold">여행 이름 *</label><input id="plan-trip" list="plan-trip-options" value={draft.tripName} onChange={(event) => updateDraft("tripName", event.target.value)} className="mt-2 w-full rounded-lg border border-[var(--line)] px-3.5 py-2.5 outline-none focus:border-[var(--brand)]" /><datalist id="plan-trip-options">{tripNames.map((name) => <option key={name} value={name} />)}</datalist></div>
                <div><label htmlFor="plan-title" className="text-sm font-bold">일정명 *</label><input id="plan-title" autoFocus value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} placeholder="예: 아라시야마 산책" className="mt-2 w-full rounded-lg border border-[var(--line)] px-3.5 py-2.5 outline-none focus:border-[var(--brand)]" /></div>
              </div>
              <div><label htmlFor="plan-location" className="text-sm font-bold">장소 *</label><input id="plan-location" list="saved-place-options" value={draft.location} onChange={(event) => updateDraft("location", event.target.value)} placeholder="예: 아라시야마 대나무숲" className="mt-2 w-full rounded-lg border border-[var(--line)] px-3.5 py-2.5 outline-none focus:border-[var(--brand)]" /><datalist id="saved-place-options">{places.map((place) => <option key={place.id} value={`${place.name}, ${place.city}, ${place.country}`} />)}</datalist></div>
              <div className="grid gap-4 sm:grid-cols-3"><div><label htmlFor="plan-date" className="text-sm font-bold">날짜 *</label><input id="plan-date" type="date" value={draft.planDate} onChange={(event) => updateDraft("planDate", event.target.value)} className="mt-2 w-full rounded-lg border border-[var(--line)] px-3.5 py-2.5 outline-none focus:border-[var(--brand)]" /></div><div><label htmlFor="start-time" className="text-sm font-bold">시작 시간</label><input id="start-time" type="time" value={draft.startTime} onChange={(event) => updateDraft("startTime", event.target.value)} className="mt-2 w-full rounded-lg border border-[var(--line)] px-3.5 py-2.5 outline-none focus:border-[var(--brand)]" /></div><div><label htmlFor="end-time" className="text-sm font-bold">종료 시간</label><input id="end-time" type="time" value={draft.endTime} onChange={(event) => updateDraft("endTime", event.target.value)} className="mt-2 w-full rounded-lg border border-[var(--line)] px-3.5 py-2.5 outline-none focus:border-[var(--brand)]" /></div></div>
              <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="plan-category" className="text-sm font-bold">일정 종류</label><select id="plan-category" value={draft.category} onChange={(event) => updateDraft("category", event.target.value as ItineraryCategory)} className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3.5 py-2.5 outline-none focus:border-[var(--brand)]">{itineraryCategories.map((category) => <option key={category} value={category}>{categoryLabel[category]}</option>)}</select></div><div><label htmlFor="plan-cost" className="text-sm font-bold">예상 비용</label><div className="relative mt-2"><input id="plan-cost" type="number" min="0" max="100000000" step="1000" value={draft.estimatedCost || ""} onChange={(event) => updateDraft("estimatedCost", Number(event.target.value))} placeholder="0" className="w-full rounded-lg border border-[var(--line)] px-3.5 py-2.5 pr-10 outline-none focus:border-[var(--brand)]" /><span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)]">원</span></div></div></div>
              <div><label htmlFor="plan-memo" className="text-sm font-bold">메모</label><textarea id="plan-memo" rows={3} value={draft.memo} onChange={(event) => updateDraft("memo", event.target.value)} placeholder="예약 정보, 이동 방법, 준비물 등을 적어두세요." className="mt-2 w-full resize-none rounded-lg border border-[var(--line)] px-3.5 py-2.5 outline-none focus:border-[var(--brand)]" /></div>
              {error && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
              <div className="flex gap-3"><button type="button" onClick={closeModal} className="flex-1 rounded-lg border border-[var(--line)] px-5 py-2.5 font-semibold text-[var(--muted)]">취소</button><button type="submit" disabled={isSaving} className="flex-1 rounded-lg bg-[var(--brand)] px-5 py-2.5 font-semibold text-white disabled:opacity-60">{isSaving ? "저장 중…" : editingId ? "수정 완료" : "일정 저장"}</button></div>
            </form>
          </section>
        </div>
      )}
      {notice && <div role="status" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">{notice}</div>}
    </section>
  );
}
