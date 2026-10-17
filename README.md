# Trip Pocket

사용자가 가고 싶은 여행지를 저장하고, 날짜별 여행 계획을 관리하는 웹앱입니다.

## 주요 기능

- 이메일 회원가입, 로그인, 로그아웃
- HttpOnly 쿠키 기반 로그인 세션
- 계정별 여행지 데이터 분리
- 여행 이름별 장소 그룹과 필터
- 꼭 가기·관심·나중에 우선순위
- 장소별 예상 비용과 전체 예정 비용 합계
- 방문일·우선순위·비용·저장일 정렬
- Google Maps 장소 검색 바로가기
- 여행지 등록, 수정, 삭제
- 장소명, 국가, 도시, 메모 검색
- 방문 상태 및 카테고리 필터
- 다가오는 여행 D-Day 표시
- PostgreSQL 데이터베이스 저장
- 모바일 및 데스크톱 반응형 화면

프로젝트의 사용자 흐름과 데이터 구조는 [`docs/analysis-design.md`](docs/analysis-design.md),
기능 수요 조사와 우선순위는 [`docs/demand-research.md`](docs/demand-research.md)에서 확인할 수 있습니다.

## 기술 구성

- Next.js
- TypeScript
- Tailwind CSS
- PostgreSQL
- ESLint

## 데이터베이스 준비

PostgreSQL에 데이터베이스와 사용자를 만든 뒤 `.env.example`을 참고해
`.env.local`의 `DATABASE_URL`을 설정합니다. 테이블과 초기 데이터는 다음
명령으로 생성할 수 있습니다.

```bash
psql -d trip_pocket -f db/schema.sql
```

기존 데이터베이스에 다시 실행해도 인증 테이블과 사용자 소유권 필드가
추가됩니다. 기존 예시 여행지는 첫 번째로 가입한 계정에 연결됩니다.

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
