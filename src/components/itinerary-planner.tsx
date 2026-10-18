"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { itineraryCategories, type ItineraryCategory, type ItineraryDraft, type ItineraryItem } from "@/types/itinerary";
import type { TravelPlace } from "@/types/travel-place";
import type { Trip, TripDraft } from "@/types/trip";

const categoryLabel: Record<ItineraryCategory, string> = { transport: "이동", sightseeing: "관광", food: "식사", stay: "숙소", shopping: "쇼핑", other: "기타" };
const categoryStyle: Record<ItineraryCategory, string> = { transport: "bg-sky-50 text-sky-700", sightseeing: "bg-emerald-50 text-emerald-700", food: "bg-orange-50 text-orange-700", stay: "bg-violet-50 text-violet-700", shopping: "bg-pink-50 text-pink-700", other: "bg-slate-100 text-slate-600" };

function today() { const date = new Date(); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10); }
function formatDate(date: string) { return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(new Date(`${date}T00:00:00`)); }
function formatShortDate(date: string) { return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00`)); }
function dayCount(start: string, end: string) { return Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86_400_000) + 1; }
function formatCost(cost: number) { return new Intl.NumberFormat("ko-KR").format(cost); }
function inRange(date: string, trip: Trip) { return date >= trip.startDate && date <= trip.endDate; }
function categoryFromPlace(place: TravelPlace): ItineraryCategory { return place.category === "맛집" ? "food" : place.category === "숙소" ? "stay" : place.category === "기타" ? "other" : "sightseeing"; }
function timeAfter(time: string, minutes: number) {
  if (!time) return "";
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + minutes;
  if (total >= 24 * 60) return "23:59";
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
function durationLabel(start: string, end: string) {
  if (!start || !end || end <= start) return "";
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const minutes = endHour * 60 + endMinute - startHour * 60 - startMinute;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours ? `${hours}시간` : ""}${hours && remainder ? " " : ""}${remainder ? `${remainder}분` : ""}`;
}

function emptyDraft(trip?: Trip): ItineraryDraft {
  return { tripId: trip?.id ?? "", placeId: "", tripName: trip?.name ?? "", title: "", location: "", category: "sightseeing", planDate: trip?.startDate ?? today(), startTime: "", endTime: "", estimatedCost: 0, memo: "" };
}
function placeDraft(place: TravelPlace, trip: Trip): ItineraryDraft {
  return { tripId: trip.id, placeId: place.id, tripName: trip.name, title: place.name, location: `${place.name}, ${place.city}, ${place.country}`, category: categoryFromPlace(place), planDate: place.visitDate && inRange(place.visitDate, trip) ? place.visitDate : trip.startDate, startTime: "", endTime: "", estimatedCost: place.estimatedCost, memo: place.memo };
}

export default function ItineraryPlanner({ places, initialPlace }: { places: TravelPlace[]; initialPlace?: TravelPlace | null }) {
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTripId, setActiveTripId] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [isTripOpen, setIsTripOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [pendingPlace, setPendingPlace] = useState<TravelPlace | null>(null);
  const [draft, setDraft] = useState<ItineraryDraft>(() => emptyDraft());
  const [tripDraft, setTripDraft] = useState<TripDraft>({ name: "", destination: "", startDate: today(), endDate: today() });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [planResponse, tripResponse] = await Promise.all([fetch("/api/itinerary", { cache: "no-store" }), fetch("/api/trips", { cache: "no-store" })]);
        const planPayload = (await planResponse.json()) as { items?: ItineraryItem[]; message?: string };
        const tripPayload = (await tripResponse.json()) as { trips?: Trip[]; message?: string };
        if (!planResponse.ok || !tripResponse.ok) throw new Error(planPayload.message ?? tripPayload.message);
        if (cancelled) return;
        const loadedTrips = tripPayload.trips ?? [];
        setItems(planPayload.items ?? []); setTrips(loadedTrips);
        if (initialPlace) {
          const trip = loadedTrips.find((candidate) => candidate.name === initialPlace.tripName);
          if (trip) { setActiveTripId(trip.id); setDraft(placeDraft(initialPlace, trip)); setIsPlanOpen(true); }
          else { const date = initialPlace.visitDate || today(); setPendingPlace(initialPlace); setTripDraft({ name: initialPlace.tripName, destination: initialPlace.city, startDate: date, endDate: date }); setIsTripOpen(true); setNotice("이 여행의 기간을 먼저 정해 주세요."); }
        }
      } catch { if (!cancelled) setNotice("여행 계획을 불러오지 못했습니다."); }
      finally { if (!cancelled) setIsLoading(false); }
    }
    void load(); return () => { cancelled = true; };
  }, [initialPlace]);

  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 2800); return () => window.clearTimeout(timer); }, [notice]);

  useEffect(() => {
    if (!isPlanOpen && !isTripOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isPlanOpen) closePlan();
      else closeTrip();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isPlanOpen, isTripOpen]);

  const activeTrip = trips.find((trip) => trip.id === activeTripId);
  const selectedTrip = trips.find((trip) => trip.id === draft.tripId);
  const visibleItems = useMemo(() => items.filter((item) => activeTripId === "all" || item.tripId === activeTripId), [activeTripId, items]);
  const groupedItems = useMemo(() => {
    const groups = new Map<string, ItineraryItem[]>();
    visibleItems.forEach((item) => groups.set(item.planDate, [...(groups.get(item.planDate) ?? []), item]));
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [visibleItems]);
  const totalCost = visibleItems.reduce((sum, item) => sum + item.estimatedCost, 0);

  function openTripCreate() { setEditingTripId(null); setTripDraft({ name: "", destination: "", startDate: today(), endDate: today() }); setError(""); setIsTripOpen(true); }
  function openTripEdit(trip: Trip) { setEditingTripId(trip.id); setTripDraft({ name: trip.name, destination: trip.destination, startDate: trip.startDate, endDate: trip.endDate }); setError(""); setIsTripOpen(true); }
  function closeTrip() { setIsTripOpen(false); setEditingTripId(null); setPendingPlace(null); setError(""); }
  function closePlan() { setIsPlanOpen(false); setEditingId(null); setError(""); }
  function openPlanCreate() {
    if (!trips.length) { openTripCreate(); setNotice("먼저 여행 기간을 만들어 주세요."); return; }
    const trip = activeTrip ?? trips[0]; setEditingId(null); setDraft(emptyDraft(trip)); setError(""); setIsPlanOpen(true);
  }
  function openPlanEdit(item: ItineraryItem) { const { id, createdAt, ...fields } = item; void id; void createdAt; setEditingId(item.id); setDraft(fields); setError(""); setIsPlanOpen(true); }
  function updateDraft<K extends keyof ItineraryDraft>(key: K, value: ItineraryDraft[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  function selectTrip(id: string) { const trip = trips.find((candidate) => candidate.id === id); if (trip) setDraft((current) => ({ ...current, tripId: trip.id, tripName: trip.name, planDate: inRange(current.planDate, trip) ? current.planDate : trip.startDate })); }
  function selectPlace(id: string) {
    if (!id) { updateDraft("placeId", ""); return; }
    const place = places.find((candidate) => candidate.id === id);
    const trip = place && (trips.find((candidate) => candidate.name === place.tripName) ?? selectedTrip);
    if (place && trip) setDraft((current) => ({ ...placeDraft(place, trip), startTime: current.startTime, endTime: current.endTime }));
  }

  async function saveTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tripDraft.name.trim() || !tripDraft.startDate || tripDraft.endDate < tripDraft.startDate) { setError("여행 이름과 올바른 시작일·종료일을 입력해 주세요."); return; }
    setIsSaving(true); setError("");
    try {
      const response = await fetch(editingTripId ? `/api/trips/${editingTripId}` : "/api/trips", { method: editingTripId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...tripDraft, name: tripDraft.name.trim(), destination: tripDraft.destination.trim() }) });
      const payload = (await response.json()) as { trip?: Trip; message?: string };
      if (!response.ok || !payload.trip) throw new Error(payload.message ?? "여행을 저장하지 못했습니다.");
      const saved = payload.trip;
      setTrips((current) => editingTripId ? current.map((trip) => trip.id === saved.id ? saved : trip) : [...current, saved].sort((a, b) => a.startDate.localeCompare(b.startDate)));
      if (editingTripId) setItems((current) => current.map((item) => item.tripId === saved.id ? { ...item, tripName: saved.name } : item));
      setActiveTripId(saved.id); setIsTripOpen(false); setEditingTripId(null); setNotice(editingTripId ? "여행 기간을 수정했습니다." : "여행을 만들었습니다.");
      if (pendingPlace) { setDraft(placeDraft(pendingPlace, saved)); setPendingPlace(null); setIsPlanOpen(true); }
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "여행을 저장하지 못했습니다."); }
    finally { setIsSaving(false); }
  }

  async function savePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTrip || !draft.title.trim() || !draft.location.trim() || !draft.planDate) { setError("여행, 일정명, 장소, 날짜를 입력해 주세요."); return; }
    if (!inRange(draft.planDate, selectedTrip)) { setError(`날짜는 ${selectedTrip.startDate}부터 ${selectedTrip.endDate} 사이여야 합니다.`); return; }
    if (draft.startTime && draft.endTime && draft.endTime <= draft.startTime) { setError("종료 시간은 시작 시간보다 늦어야 합니다."); return; }
    setIsSaving(true); setError("");
    try {
      const response = await fetch(editingId ? `/api/itinerary/${editingId}` : "/api/itinerary", { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft, tripName: selectedTrip.name, title: draft.title.trim(), location: draft.location.trim(), memo: draft.memo.trim() }) });
      const payload = (await response.json()) as { item?: ItineraryItem; message?: string };
      if (!response.ok || !payload.item) throw new Error(payload.message ?? "일정을 저장하지 못했습니다.");
      setItems((current) => (editingId ? current.map((item) => item.id === editingId ? payload.item! : item) : [...current, payload.item!]).sort((a, b) => `${a.planDate}${a.startTime}`.localeCompare(`${b.planDate}${b.startTime}`)));
      setActiveTripId(selectedTrip.id); setNotice(editingId ? "일정을 수정했습니다." : "새 일정을 추가했습니다."); closePlan();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "일정을 저장하지 못했습니다."); }
    finally { setIsSaving(false); }
  }

  async function deleteItem(item: ItineraryItem) {
    if (!window.confirm(`‘${item.title}’ 일정을 삭제할까요?`)) return;
    try { const response = await fetch(`/api/itinerary/${item.id}`, { method: "DELETE" }); if (!response.ok) throw new Error(); setItems((current) => current.filter((candidate) => candidate.id !== item.id)); setNotice("일정을 삭제했습니다."); }
    catch { setNotice("일정을 삭제하지 못했습니다."); }
  }

  return <section className="mt-7" aria-labelledby="planner-title">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 id="planner-title" className="text-3xl font-bold tracking-tight sm:text-4xl">여행 계획</h1><p className="mt-2 text-sm leading-6 text-[var(--muted)]">여행 기간을 정하고, 날짜별로 시간 단위 일정을 쌓아보세요.</p></div><div className="flex gap-2"><button onClick={openTripCreate} className="rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-bold hover:bg-slate-50">+ 여행 만들기</button><button onClick={openPlanCreate} className="rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-strong)]">+ 일정 추가</button></div></div>

    {trips.length > 0 && <div className="mt-7 flex gap-2 overflow-x-auto pb-2" aria-label="여행 선택"><button onClick={() => setActiveTripId("all")} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${activeTripId === "all" ? "bg-slate-900 text-white" : "border border-[var(--line)] bg-white text-slate-600"}`}>모든 여행</button>{trips.map((trip) => <button key={trip.id} onClick={() => setActiveTripId(trip.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${activeTripId === trip.id ? "bg-slate-900 text-white" : "border border-[var(--line)] bg-white text-slate-600"}`}>{trip.name}</button>)}</div>}

    {activeTrip && <div className="mt-4 rounded-2xl bg-slate-900 p-5 text-white sm:flex sm:items-center sm:justify-between"><div><p className="text-xs font-semibold text-slate-400">선택한 여행</p><h2 className="mt-1 text-xl font-bold">{activeTrip.name}</h2><p className="mt-2 text-sm text-slate-300">{activeTrip.destination || "목적지 미정"} · {formatShortDate(activeTrip.startDate)} – {formatShortDate(activeTrip.endDate)} · {dayCount(activeTrip.startDate, activeTrip.endDate)}일</p></div><button onClick={() => openTripEdit(activeTrip)} className="mt-4 rounded-lg border border-white/20 px-3.5 py-2 text-sm font-semibold hover:bg-white/10 sm:mt-0">여행 정보 수정</button></div>}

    <div className="mt-4 grid gap-3 sm:grid-cols-3"><Metric label="전체 일정" value={`${visibleItems.length}`} unit="개" /><Metric label="여행 일수" value={`${activeTrip ? dayCount(activeTrip.startDate, activeTrip.endDate) : groupedItems.length}`} unit="일" /><Metric label="일정 예상 비용" value={formatCost(totalCost)} unit="원" /></div>
    <div className="mt-6 rounded-xl border border-[var(--line)] bg-white p-4"><p className="text-sm font-bold">날짜별 타임라인</p><p className="mt-1 text-xs text-[var(--muted)]">시간순으로 정렬되며, 항목을 열어 장소·비용·메모를 수정할 수 있습니다.</p></div>

    {isLoading ? <Empty text="여행 계획을 불러오는 중입니다." /> : groupedItems.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><h2 className="text-lg font-bold">아직 작성한 일정이 없습니다</h2><p className="mt-2 text-sm text-[var(--muted)]">여행 기간을 만든 뒤 첫 시간별 일정을 추가해 보세요.</p><button onClick={openPlanCreate} className="mt-5 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white">일정 추가</button></div> : <div className="mt-4 space-y-4">{groupedItems.map(([date, dayItems], index) => {
      const trip = activeTrip ?? trips.find((candidate) => candidate.id === dayItems[0]?.tripId);
      return <article key={date} className="overflow-hidden rounded-xl border border-[var(--line)] bg-white"><header className="flex items-center justify-between border-b border-[var(--line)] bg-slate-50 px-5 py-3.5"><h2 className="font-bold">{formatDate(date)}</h2><span className="text-xs font-semibold text-[var(--muted)]">DAY {trip ? dayCount(trip.startDate, date) : index + 1}</span></header><div className="divide-y divide-[var(--line)]">{dayItems.map((item) => <div key={item.id} className="grid gap-3 p-5 sm:grid-cols-[90px_minmax(0,1fr)_auto] sm:items-start"><div className="text-sm font-bold text-[var(--brand)]">{item.startTime || "시간 미정"}{item.endTime && <span className="block text-xs font-normal text-[var(--muted)]">~ {item.endTime}</span>}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{item.title}</h3><span className={`rounded px-2 py-1 text-[11px] font-bold ${categoryStyle[item.category]}`}>{categoryLabel[item.category]}</span><span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{item.tripName}</span>{item.placeId && <span className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">보관함 연동</span>}</div><p className="mt-2 text-sm text-[var(--muted)]">장소 · {item.location}</p>{item.memo && <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.memo}</p>}<p className="mt-2 text-xs font-semibold text-slate-500">{item.estimatedCost ? `예상 ${formatCost(item.estimatedCost)}원` : "비용 미정"}</p></div><div className="flex gap-1 sm:justify-end"><button onClick={() => openPlanEdit(item)} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">수정</button><button onClick={() => deleteItem(item)} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">삭제</button></div></div>)}</div></article>;
    })}</div>}

    {isPlanOpen && <Modal title={editingId ? "일정 수정" : "새 일정 추가"} description={editingId ? "필요한 항목만 바꾸고 바로 저장하세요." : "여행 기간 안에서 날짜와 시간을 정해 주세요."} onClose={closePlan} wide>
      <form onSubmit={savePlan} className="mt-6">
        {selectedTrip && <div className="mb-5 flex flex-col gap-3 rounded-xl bg-[var(--soft)] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold text-[var(--brand)]">현재 여행</p><p className="mt-0.5 font-bold text-slate-900">{selectedTrip.name}</p></div><p className="text-sm font-semibold text-slate-600">{formatShortDate(selectedTrip.startDate)} – {formatShortDate(selectedTrip.endDate)} · {dayCount(selectedTrip.startDate, selectedTrip.endDate)}일</p></div>}

        <div className="space-y-5">
          <FormSection number="1" title="기본 정보" description="어디에서 무엇을 할지 적어주세요.">
            <div className="grid gap-4 sm:grid-cols-2"><Field label="여행 *"><select value={draft.tripId} onChange={(event) => selectTrip(event.target.value)} className="input">{trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.name}</option>)}</select></Field><Field label="보관함 여행지"><select value={draft.placeId} onChange={(event) => selectPlace(event.target.value)} className="input"><option value="">연결하지 않고 직접 입력</option>{places.map((place) => <option key={place.id} value={place.id}>{place.tripName} · {place.name}</option>)}</select></Field></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="일정명 *"><input autoFocus value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} placeholder="예: 아라시야마 산책" className="input" /></Field><Field label="장소 *"><input value={draft.location} onChange={(event) => updateDraft("location", event.target.value)} placeholder="예: 아라시야마 대나무숲" className="input" /></Field></div>
          </FormSection>

          <FormSection number="2" title="날짜와 시간" description="하루 동선에 맞춰 시간을 정해주세요.">
            <div className="grid gap-4 sm:grid-cols-3"><Field label="날짜 *"><input type="date" min={selectedTrip?.startDate} max={selectedTrip?.endDate} value={draft.planDate} onChange={(event) => updateDraft("planDate", event.target.value)} className="input" /></Field><Field label="시작 시간"><input type="time" step="900" value={draft.startTime} onChange={(event) => updateDraft("startTime", event.target.value)} className="input" /></Field><Field label="종료 시간"><input type="time" step="900" value={draft.endTime} onChange={(event) => updateDraft("endTime", event.target.value)} className="input" /></Field></div>
            <div className="mt-3 flex flex-wrap items-center gap-2"><span className="mr-1 text-xs font-semibold text-[var(--muted)]">빠른 설정</span>{[60, 120, 180].map((minutes) => <button key={minutes} type="button" disabled={!draft.startTime} onClick={() => updateDraft("endTime", timeAfter(draft.startTime, minutes))} className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40">+{minutes / 60}시간</button>)}<button type="button" onClick={() => setDraft((current) => ({ ...current, startTime: "", endTime: "" }))} className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100">시간 미정</button>{durationLabel(draft.startTime, draft.endTime) && <span className="ml-auto rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">총 {durationLabel(draft.startTime, draft.endTime)}</span>}</div>
          </FormSection>

          <FormSection number="3" title="세부 정보" description="비용과 기억할 내용을 함께 남겨두세요.">
            <div className="grid gap-4 sm:grid-cols-2"><Field label="일정 종류"><select value={draft.category} onChange={(event) => updateDraft("category", event.target.value as ItineraryCategory)} className="input">{itineraryCategories.map((category) => <option key={category} value={category}>{categoryLabel[category]}</option>)}</select></Field><Field label="예상 비용"><div className="relative"><input type="number" min="0" max="100000000" step="1000" value={draft.estimatedCost || ""} onChange={(event) => updateDraft("estimatedCost", Number(event.target.value))} placeholder="0" className="input pr-12" /><span className="pointer-events-none absolute bottom-2.5 right-3.5 font-normal text-[var(--muted)]">원</span></div></Field></div>
            <div className="mt-4"><Field label="메모"><textarea rows={3} value={draft.memo} onChange={(event) => updateDraft("memo", event.target.value)} placeholder="예약 정보, 이동 방법, 준비물 등을 적어두세요." className="input resize-none" /></Field></div>
          </FormSection>
        </div>

        <div className="sticky bottom-0 -mx-6 mt-6 border-t border-[var(--line)] bg-white/95 px-6 pb-1 pt-4 backdrop-blur sm:-mx-7 sm:px-7"><FormActions error={error} saving={isSaving} onCancel={closePlan} submitLabel={editingId ? "변경사항 저장" : "일정 저장"} /></div>
      </form>
    </Modal>}

    {isTripOpen && <Modal title={editingTripId ? "여행 정보 수정" : "새 여행 만들기"} description="먼저 여행의 시작일과 종료일을 정합니다." onClose={closeTrip} narrow><form onSubmit={saveTrip} className="mt-7 space-y-5">
      <Field label="여행 이름 *"><input autoFocus value={tripDraft.name} onChange={(event) => setTripDraft((current) => ({ ...current, name: event.target.value }))} placeholder="예: 교토 봄 여행" className="input" /></Field>
      <Field label="목적지"><input value={tripDraft.destination} onChange={(event) => setTripDraft((current) => ({ ...current, destination: event.target.value }))} placeholder="예: 일본 교토" className="input" /></Field>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="시작일 *"><input type="date" value={tripDraft.startDate} onChange={(event) => setTripDraft((current) => ({ ...current, startDate: event.target.value, endDate: current.endDate < event.target.value ? event.target.value : current.endDate }))} className="input" /></Field><Field label="종료일 *"><input type="date" min={tripDraft.startDate} value={tripDraft.endDate} onChange={(event) => setTripDraft((current) => ({ ...current, endDate: event.target.value }))} className="input" /></Field></div>
      {tripDraft.startDate && tripDraft.endDate >= tripDraft.startDate && <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">{formatShortDate(tripDraft.startDate)}부터 {formatShortDate(tripDraft.endDate)}까지 · {dayCount(tripDraft.startDate, tripDraft.endDate)}일</p>}
      <FormActions error={error} saving={isSaving} onCancel={closeTrip} submitLabel={editingTripId ? "수정 완료" : "여행 만들기"} />
    </form></Modal>}
    {notice && <div role="status" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">{notice}</div>}
  </section>;
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) { return <div className="rounded-xl border border-[var(--line)] bg-white px-5 py-4"><p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-1 text-2xl font-bold">{value}<span className="ml-1 text-sm font-normal text-[var(--muted)]">{unit}</span></p></div>; }
function Empty({ text }: { text: string }) { return <div className="mt-4 rounded-xl border border-[var(--line)] bg-white px-6 py-14 text-center text-sm text-[var(--muted)]">{text}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-bold text-slate-800">{label}{children}</label>; }
function FormSection({ number, title, description, children }: { number: string; title: string; description: string; children: React.ReactNode }) { return <section className="rounded-xl border border-[var(--line)] p-4 sm:p-5"><div className="mb-4 flex items-start gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{number}</span><div><h3 className="font-bold text-slate-900">{title}</h3><p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">{description}</p></div></div>{children}</section>; }
function Modal({ title, description, onClose, narrow, wide, children }: { title: string; description: string; onClose: () => void; narrow?: boolean; wide?: boolean; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-label={title} className={`max-h-[94vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl sm:p-7 ${narrow ? "sm:max-w-lg" : wide ? "sm:max-w-3xl" : "sm:max-w-2xl"}`}><div className="flex items-start justify-between gap-4"><div><p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--brand)]">Trip Pocket</p><h2 className="text-2xl font-bold tracking-tight">{title}</h2><p className="mt-1.5 text-sm text-[var(--muted)]">{description}</p></div><button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-xl text-slate-500 hover:bg-slate-200" aria-label="창 닫기">×</button></div>{children}</section></div>; }
function FormActions({ error, saving, onCancel, submitLabel }: { error: string; saving: boolean; onCancel: () => void; submitLabel: string }) { return <>{error && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}<div className="flex gap-3"><button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-[var(--line)] px-5 py-2.5 font-semibold text-[var(--muted)]">취소</button><button type="submit" disabled={saving} className="flex-1 rounded-lg bg-[var(--brand)] px-5 py-2.5 font-semibold text-white disabled:opacity-60">{saving ? "저장 중…" : submitLabel}</button></div></>; }
