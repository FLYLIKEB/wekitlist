import Link from 'next/link';

export default function AboutPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-6 py-20 pb-32">
      <p className="text-sm text-neutral-500">서비스 소개</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950">문길이를 위한 작은 헌정</h1>
      <section className="mt-8">
        <h2 className="text-sm font-medium text-neutral-500">서비스 설명</h2>
        <div className="mt-4 space-y-4 text-[15px] leading-7 text-neutral-700">
          <p>
            Wekitlist는 두 사람이 함께 쓰는 아주 가벼운 공유 리스트 서비스예요. 같이 가고 싶은 곳,
            먹고 싶은 것, 해보고 싶은 데이트, 문득 떠오른 작은 소망까지 빠르게 적어두고 함께
            확인할 수 있어요.
          </p>
          <p>
            핵심은 복잡한 계획 관리가 아니라, 떠오르는 순간 바로 기록하고 같이 보면서 하나씩
            이루어가는 경험이에요. 항목을 빠르게 추가하고, 링크를 붙이고, 태그로 정리하고, 끝난
            일은 완료로 넘기면서 자연스럽게 추억과 계획이 쌓이도록 만들었어요.
          </p>
          <div className="rounded-3xl bg-neutral-50 px-5 py-5 text-sm leading-6 text-neutral-600">
            <p className="font-medium text-neutral-800">이 서비스로 할 수 있는 것</p>
            <ul className="mt-3 space-y-2">
              <li>• 같이 하고 싶은 일을 빠르게 기록하기</li>
              <li>• 링크와 태그를 붙여 아이디어를 정리하기</li>
              <li>• 항목 이름으로 카카오맵에서 바로 검색하기</li>
              <li>• 함께 보면서 완료 여부를 체크하기</li>
              <li>• 작은 계획과 추억을 한곳에 차곡차곡 쌓기</li>
            </ul>
          </div>
        </div>
      </section>
      <section className="mt-10">
        <h2 className="text-sm font-medium text-neutral-500">문길이에게</h2>
        <div className="mt-4 space-y-4 text-[15px] leading-7 text-neutral-700">
          <p>
            이 서비스는 사랑하는 남자친구 문길이와 무엇을 하고 싶은지 오래오래 적어두고, 같이
            하나씩 해보려고 만든 작은 헌정이기도 해요.
          </p>
          <p>
            문길아, 우리 같이 하고 싶은 것들을 차곡차곡 적어두고 진짜로 하나씩 이루자. 이건 단순한
            리스트가 아니라, 너와 보내고 싶은 시간을 아껴 적어두는 마음이야.
          </p>
        </div>
      </section>
      <Link
        href="/"
        className="mt-10 inline-flex w-fit rounded-full bg-neutral-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
      >
        리스트 만들러 가기
      </Link>
    </main>
  );
}
