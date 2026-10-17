"use client";

import { FormEvent, useState } from "react";

import type { AuthUser } from "@/types/user";

type AuthMode = "login" | "signup";

export default function AuthPanel({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setPassword("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const payload = (await response.json()) as { user?: AuthUser; message?: string };
      if (!response.ok || !payload.user) throw new Error(payload.message ?? "요청을 처리하지 못했습니다.");
      onAuthenticated(payload.user);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "요청을 처리하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-10 sm:grid sm:place-items-center sm:px-8">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_18px_60px_rgba(25,40,34,0.08)] md:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between bg-[var(--brand)] p-8 text-white sm:p-12">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-sm font-black text-[var(--brand)]">TP</span>
              <p className="text-lg font-bold">Trip Pocket</p>
            </div>
            <h1 className="mt-16 max-w-md text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              가고 싶은 곳을 모으고,<br />다녀온 여행을 기록하세요.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-emerald-50/90">
              흩어진 여행 후보지를 한곳에서 정리하고 일정과 메모를 간단하게 관리할 수 있습니다.
            </p>
          </div>
          <p className="mt-14 text-xs text-emerald-100">나만의 여행지 목록은 계정별로 안전하게 분리됩니다.</p>
        </section>

        <section className="p-7 sm:p-12">
          <div className="flex gap-6 border-b border-[var(--line)]" aria-label="인증 방식 선택">
            {(["login", "signup"] as AuthMode[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => changeMode(item)}
                className={`border-b-2 pb-3 text-sm font-bold transition ${mode === item ? "border-[var(--brand)] text-[var(--brand)]" : "border-transparent text-[var(--muted)]"}`}
              >
                {item === "login" ? "로그인" : "회원가입"}
              </button>
            ))}
          </div>

          <div className="mt-9">
            <h2 className="text-2xl font-bold tracking-tight">{mode === "login" ? "다시 만나 반가워요" : "여행 기록을 시작해 볼까요?"}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{mode === "login" ? "가입한 이메일로 로그인해 주세요." : "간단한 정보만 입력하면 바로 시작할 수 있어요."}</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {mode === "signup" && (
              <div>
                <label htmlFor="auth-name" className="text-sm font-bold">이름</label>
                <input id="auth-name" autoComplete="name" required minLength={2} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="홍길동" className="mt-2 w-full rounded-lg border border-[var(--line)] px-3.5 py-3 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-emerald-100" />
              </div>
            )}
            <div>
              <label htmlFor="auth-email" className="text-sm font-bold">이메일</label>
              <input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="travel@example.com" className="mt-2 w-full rounded-lg border border-[var(--line)] px-3.5 py-3 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-emerald-100" />
            </div>
            <div>
              <label htmlFor="auth-password" className="text-sm font-bold">비밀번호</label>
              <input id="auth-password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} maxLength={100} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8자 이상 입력" className="mt-2 w-full rounded-lg border border-[var(--line)] px-3.5 py-3 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-emerald-100" />
            </div>

            {error && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

            <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-[var(--brand)] px-5 py-3 font-bold text-white transition hover:bg-[var(--brand-strong)] disabled:cursor-wait disabled:opacity-60">
              {isSubmitting ? "처리 중…" : mode === "login" ? "로그인" : "회원가입하고 시작하기"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[var(--muted)]">
            {mode === "login" ? "아직 계정이 없나요?" : "이미 계정이 있나요?"}{" "}
            <button type="button" onClick={() => changeMode(mode === "login" ? "signup" : "login")} className="font-bold text-[var(--brand)] hover:underline">
              {mode === "login" ? "회원가입" : "로그인"}
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}
