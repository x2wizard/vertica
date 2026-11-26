# GTG Vertica 블로그 (Astro + Starlight)

기존 Jekyll 블로그(x2wizard/x2wizard.github.io)를 Astro Starlight로 옮긴 새 사이트.
배포 주소: https://x2wizard.github.io/vertica/  (astro.config.mjs `base: '/vertica'`)

## 명령
- `npm install` / `npm run dev` → http://localhost:4321/vertica/
- `npm run build` → dist/ (Pagefind 검색 색인 포함)
- `npm run check-links` → 빌드 결과의 내부 링크·이미지·앵커 검사 (빌드 후 실행, 깨진 것이 있으면 exit 1)
- `npm run migrate -- <기존 저장소 경로>` → 기존 글을 다시 변환 (src/content/docs/<카테고리>/*.md 와 이미지를 덮어씀)
- `python3 scripts/make-og-image.py` → public/og-image.png 재생성

## 구조
- 글: `src/content/docs/<카테고리>/<소문자 파일명>.md` → URL `/vertica/<카테고리>/<파일명>/`
  - 카테고리: vertica_architecture, vertica_use, vertica_etc
  - 각 카테고리의 `index.mdx` 는 직접 관리하는 목록 페이지 (migrate 가 건드리지 않음)
- 이미지: `src/assets/posts/<카테고리>/` (Astro 최적화). 움직이는 gif 는 `public/images/<카테고리>/` 에 둔다
- 홈: `src/content/docs/index.mdx`, 스타일: `src/styles/custom.css`
  - 히어로 버튼 옆 안내 상자는 index.mdx front matter `heroNotice` (title, body=HTML) → `src/components/overrides/Hero.astro`
- 블로그 기능은 플러그인 없이 직접 구현 (starlight-blog 를 쓰면 URL이 /blog/ 아래로 바뀜)
  - `src/lib/posts.ts` 글 목록·태그·카테고리 정의
  - `src/components/overrides/MarkdownContent.astro` 글 하단 작성일·태그
  - `src/pages/tags/` 태그 페이지, `src/pages/feed.xml.ts` RSS
  - `src/plugins/rehype-external-links.mjs` 외부 링크 새 탭
- `url-mapping.tsv`: 기존 URL → 새 URL 대응표

## 이전 시 결정 사항
- 모든 글의 작성일은 새 사이트 공개 기준일 2026-11-26 (migrate.mjs `PUBLISH_DATE`). 원래 글의 작성일·수정일은 쓰지 않는다.
- 태그·본문의 "OpenText Analytics Database" 는 모두 "Vertica Analytics Database" 로 바꾼다 (migrate.mjs `TEXT_REPLACEMENTS`).
- 2025 IDC MarketScape 글(기존 vertica_etc/img/ 에 있던 것)은 옮기지 않는다.
- Vertica_architecture_1040.20241119 는 "데이터 적재(Vertica 9.3 이전)" 제목으로 공개 (2026-11-26 draft 해제).

## 글 front matter
```yaml
title: 제목
description: 요약 (목록·검색·미리보기에 표시)
date: 2025-09-20          # 작성일 (따옴표 없이)
lastUpdated: 2025-09-20   # 선택
tags: [태그1, 태그2]
draft: true               # 선택, 빌드에서 제외
```
사이드바는 파일명 순으로 자동 생성되므로 연재 번호를 파일명에 붙인다.

## 규칙
- Astro 7 기본 Markdown 처리기는 Sätteri 이지만 Starlight 때문에 `@astrojs/markdown-remark` 의 `unified()` 를 쓴다.
- 사이트 내부 링크는 `/vertica/...` 새 경로로 쓴다.
- 배포: `.github/workflows/deploy.yml` — main 에 push 하면 자동 배포 (Actions 탭에서 수동 실행도 가능). Settings → Pages → Source 는 GitHub Actions
