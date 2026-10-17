# Trip Pocket

사용자가 가고 싶은 여행지를 저장하고, 날짜별 여행 계획을 관리하는 웹앱입니다.

## 주요 기능

- 여행지 등록, 수정, 삭제
- 장소명, 국가, 도시, 메모 검색
- 방문 상태 및 카테고리 필터
- 다가오는 여행 D-Day 표시
- 브라우저 기기 내 자동 저장
- 모바일 및 데스크톱 반응형 화면

프로젝트의 사용자 흐름과 데이터 구조는 [`docs/analysis-design.md`](docs/analysis-design.md)에서 확인할 수 있습니다.

## 기술 구성

- Next.js
- TypeScript
- Tailwind CSS
- ESLint

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인할 수 있습니다.

## 검사

```bash
npm run lint
npm run build
```
