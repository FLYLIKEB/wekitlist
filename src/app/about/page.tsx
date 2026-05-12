import Link from 'next/link';

export default function AboutPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-6 py-20 pb-32">
      <p className="text-sm text-neutral-500">서비스 소개</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950">문길이를 위한 작은 헌정</h1>
      <div className="mt-8 space-y-4 text-[15px] leading-7 text-neutral-700">
        <p>
          Wekitlist는 사랑하는 남자친구 문길이와 무엇을 하고 싶은지 오래오래 적어두고,
          같이 하나씩 해보려고 만든 서비스예요.
        </p>
        <p>
          바쁜 날에도 문득 떠오른 데이트 아이디어를 빠르게 남기고, 함께 해낸 순간들을 조용히
          쌓아가고 싶어서 최대한 가볍고 다정하게 만들었어요.
        </p>
        <p>
          문길이가 이 페이지를 보게 된다면, 늘 소중한 사람이고 함께할 미래를 이렇게 정성껏
          상상하게 만드는 존재라는 걸 꼭 알아줬으면 좋겠어요.
        </p>
      </div>
      <div className="mt-10 rounded-3xl bg-neutral-50 px-5 py-5 text-sm leading-6 text-neutral-600">
        문길아, 우리 같이 하고 싶은 것들을 차곡차곡 적어두고 하나씩 이루자. 너랑 보내는 시간이
        늘 기대되고, 이 서비스도 그 마음으로 만들었어.
      </div>
      <Link
        href="/"
        className="mt-10 inline-flex w-fit rounded-full bg-neutral-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
      >
        리스트 만들러 가기
      </Link>
    </main>
  );
}
