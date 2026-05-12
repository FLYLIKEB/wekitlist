export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-6 py-16">
      <p className="text-sm text-neutral-500">Wekitlist</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950">
        같이 쓰는 버킷리스트
      </h1>
      <p className="mt-4 text-base leading-7 text-neutral-600">
        커플이나 친구가 빠르게 함께 기록하고 완료하는 초경량 공유 리스트.
      </p>
      <button className="mt-10 h-12 rounded-full bg-neutral-950 px-5 text-sm font-medium text-white">
        공유 리스트 만들기
      </button>
    </main>
  );
}
