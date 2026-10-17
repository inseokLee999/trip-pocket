export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-sky-50 px-6">
      <section className="w-full max-w-2xl rounded-3xl bg-white p-10 shadow-sm ring-1 ring-sky-100">
        <p className="mb-3 text-sm font-semibold tracking-widest text-sky-600">
          TRIP POCKET
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          다음 여행을 준비해 볼까요?
        </h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">
          가고 싶은 여행지를 저장하고, 나만의 여행 일정을 만드는 공간입니다.
        </p>
        <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
          개발 환경 준비가 완료되었습니다. 이제 여행지 목록 화면부터 만들어
          보세요.
        </div>
      </section>
    </main>
  );
}
