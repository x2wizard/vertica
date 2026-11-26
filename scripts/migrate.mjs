#!/usr/bin/env node
// 기존 Jekyll 블로그(x2wizard/x2wizard.github.io)의 글과 이미지를 Starlight 구조로 옮긴다.
//
// 사용법: node scripts/migrate.mjs <기존 저장소 경로>
//   예:   node scripts/migrate.mjs ../x2wizard.github.io
//
// 다시 실행하면 src/content/docs/<카테고리>/ 의 글과 이미지, url-mapping.tsv 를 새로 만든다.
// (카테고리 index.mdx 와 홈 index.mdx 는 건드리지 않는다.)

import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';

const OLD = process.argv[2];
if (!OLD || !fs.existsSync(path.join(OLD, '_config.yml'))) {
	console.error('사용법: node scripts/migrate.mjs <기존 저장소 경로>');
	process.exit(1);
}

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DOCS = path.join(ROOT, 'src/content/docs');
const ASSETS = path.join(ROOT, 'src/assets/posts');
const PUBLIC_IMG = path.join(ROOT, 'public/images');
const SITE = 'https://x2wizard.github.io';
const BASE = '/vertica';
const CATEGORIES = ['vertica_architecture', 'vertica_use', 'vertica_etc'];

// 백업 사본으로 판단해 공개하지 않을 글
const DRAFTS = new Set(['vertica_architecture_1040.20241119']);
// _posts 밖에 놓여 있던 글을 포함하려면 여기에 경로를 넣는다.
// (vertica_etc/img/2026-01-08-Vertica_IDC_MarketScape_2025.md 는 요청에 따라 제외)
const EXTRA_POSTS = [];
// 옮기지 않을 이미지 (제외한 IDC 글에서만 쓰던 것)
const EXCLUDE_IMAGES = new Set(['vertica_etc/Vertica_IDC_MarketScape_2025_00.gif']);
// 모든 글의 작성일 (새 사이트 공개 기준일). 원래 글의 date·last_modified_at 은 쓰지 않는다.
const PUBLISH_DATE = '2026-11-26';
// 글 본문·태그에서 바꿔 쓸 표현
const TEXT_REPLACEMENTS = [['OpenText Analytics Database(Vertica)', 'Vertica Analytics Database(Vertica)']];
const applyReplacements = (text) => TEXT_REPLACEMENTS.reduce((t, [from, to]) => t.split(from).join(to), text);

/** 파일명(날짜 제외) → 새 slug */
const toSlug = (name) => name.toLowerCase();

// ---------------------------------------------------------------- 글 목록 수집
const posts = [];
for (const cat of CATEGORIES) {
	const dir = path.join(OLD, cat, '_posts');
	for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
		posts.push({ cat, src: path.join(dir, file), file });
	}
}
for (const rel of EXTRA_POSTS) {
	posts.push({ cat: rel.split('/')[0], src: path.join(OLD, rel), file: path.basename(rel) });
}

// 기존 이름(대소문자 포함) → 새 경로 대응표 (링크 변환용)
const nameMap = new Map(); // key: `${cat}/${oldName.toLowerCase()}`
for (const p of posts) {
	const m = p.file.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
	p.fileDate = m[1];
	p.oldName = m[2];
	p.slug = toSlug(m[2]);
	p.newPath = `${BASE}/${p.cat}/${p.slug.replace(/\./g, '')}/`;
	nameMap.set(`${p.cat}/${p.oldName.toLowerCase()}`, p);
}

// ---------------------------------------------------------------- 출력 폴더 정리
for (const cat of CATEGORIES) {
	const out = path.join(DOCS, cat);
	fs.mkdirSync(out, { recursive: true });
	for (const f of fs.readdirSync(out)) {
		if (f.endsWith('.md')) fs.rmSync(path.join(out, f));
	}
	fs.rmSync(path.join(ASSETS, cat), { recursive: true, force: true });
	fs.rmSync(path.join(PUBLIC_IMG, cat), { recursive: true, force: true });
}

// ---------------------------------------------------------------- 이미지 복사
// png/jpg 등은 src/assets 로 (Astro가 최적화), 움직이는 gif 는 public 으로 (원본 유지)
const imageIndex = new Map(); // `${cat}/${lowercase file}` → { file, kind }
let imageCount = 0;
for (const cat of CATEGORIES) {
	const dir = path.join(OLD, cat, 'img');
	for (const file of fs.readdirSync(dir)) {
		if (file.endsWith('.md') || EXCLUDE_IMAGES.has(`${cat}/${file}`)) continue;
		const isGif = /\.gif$/i.test(file);
		const destDir = isGif ? path.join(PUBLIC_IMG, cat) : path.join(ASSETS, cat);
		fs.mkdirSync(destDir, { recursive: true });
		fs.copyFileSync(path.join(dir, file), path.join(destDir, file));
		imageIndex.set(`${cat}/${file.toLowerCase()}`, { file, isGif });
		imageCount++;
	}
}

// ---------------------------------------------------------------- 변환 함수
const warnings = [];

function resolveImage(cat, ref, postName) {
	// ref 예: ../img/foo.png
	const m = ref.match(/^(?:\.\.\/|\/(vertica_\w+)\/)img\/(.+)$/);
	if (!m) return null;
	const imgCat = m[1] || cat;
	const hit = imageIndex.get(`${imgCat}/${decodeURIComponent(m[2]).toLowerCase()}`);
	if (!hit) {
		warnings.push(`[${postName}] 이미지 없음: ${ref}`);
		return null;
	}
	if (hit.file !== decodeURIComponent(m[2])) warnings.push(`[${postName}] 이미지 대소문자 보정: ${ref} → ${hit.file}`);
	return hit.isGif
		? { url: `${BASE}/images/${imgCat}/${hit.file}`, isGif: true }
		: { url: `../../../assets/posts/${imgCat}/${hit.file}`, isGif: false };
}

function resolveLink(href, postName) {
	// /vertica_use/Vertica_use_1000/#anchor  또는  /vertica_use/Vertica_use_1000
	const m = href.match(/^\/(vertica_\w+)\/([^/#?]+)\/?(#.*)?$/);
	if (!m) return null;
	const target = nameMap.get(`${m[1]}/${m[2].toLowerCase()}`);
	if (!target) {
		warnings.push(`[${postName}] 대상 글을 찾지 못한 내부 링크: ${href}`);
		return null;
	}
	return target.newPath + (m[3] || '');
}

/** 코드 블록 밖의 줄에만 fn 적용 */
function mapOutsideCode(body, fn) {
	let inFence = false;
	let fence = '';
	return body
		.split('\n')
		.map((line) => {
			const f = line.match(/^\s*(`{3,}|~{3,})/);
			if (f) {
				if (!inFence) {
					inFence = true;
					fence = f[1][0];
				} else if (f[1][0] === fence) {
					inFence = false;
				}
				return line;
			}
			return inFence ? line : fn(line);
		})
		.join('\n');
}

function convertBody(p, body) {
	const name = `${p.cat}/${p.oldName}`;

	// 1) 방문자 IP를 가져오던 외부 스크립트 제거 (사용처 없음)
	body = body.replace(/<script[\s\S]*?<\/script>\s*/gi, '');

	body = mapOutsideCode(body, (line) => {
		// 2) kramdown 속성 {:target="_blank"} 제거 — 외부 링크는 사이트 스크립트가 새 탭으로 연다
		line = line.replace(/\{:\s*target\s*=\s*["']_blank["']\s*\}/g, '');

		// 3) 본문 h1 → h2 (Starlight는 제목을 h1으로 출력)
		if (p.oldName !== 'markdown_template') line = line.replace(/^# (?=\S)/, '## ');

		// 4) HTML <img src="../img/..."> → 경로 변환
		line = line.replace(/<img\s+([^>]*?)src=["']([^"']+)["']([^>]*)>/gi, (all, pre, src, post) => {
			const r = resolveImage(p.cat, src, name);
			if (!r) return all;
			if (r.isGif) return `<img ${pre}src="${r.url}"${post}>`;
			const alt = (all.match(/alt=["']([^"']*)["']/) || [])[1] || '';
			return `![${alt}](${r.url})`;
		});

		// 5) 마크다운 이미지 ![alt](../img/...)
		line = line.replace(/!\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g, (all, alt, src, title = '') => {
			const r = resolveImage(p.cat, src, name);
			if (!r) return all;
			return r.isGif ? `<img src="${r.url}" alt="${alt}" />` : `![${alt}](${r.url}${title})`;
		});

		// 6) 마크다운 링크 [text](/vertica_xxx/Name/)
		line = line.replace(/(?<!!)\[([^\]]*)\]\((\/vertica_\w+\/[^)\s]+)\)/g, (all, text, href) => {
			const r = resolveLink(href, name);
			return r ? `[${text}](${r})` : all;
		});

		// 7) HTML href="/vertica_xxx/Name/"
		line = line.replace(/href=["'](\/vertica_\w+\/[^"']+)["']/g, (all, href) => {
			const r = resolveLink(href, name);
			return r ? `href="${r}"` : all;
		});
		return line;
	});

	return body.replace(/^\s+/, '').replace(/\s+$/, '') + '\n';
}


// ---------------------------------------------------------------- 글 변환
const mapping = [['old_url', 'new_url', 'title', 'status']];
for (const p of posts) {
	const raw = fs.readFileSync(p.src, 'utf8').replace(/\r\n/g, '\n');
	const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!m) throw new Error(`front matter 없음: ${p.src}`);
	const fm = yaml.load(m[1]) || {};
	const draft = DRAFTS.has(p.slug);

	const out = {
		title: String(fm.title).trim(),
		...(fm.excerpt ? { description: String(fm.excerpt).trim() } : {}),
		date: PUBLISH_DATE,
		tags: (fm.tags || []).map((t) => applyReplacements(String(t).trim())).filter(Boolean),
		...(draft ? { draft: true } : {}),
	};
	if (fm.toc === false) out.tableOfContents = false;

	const body = applyReplacements(convertBody(p, m[2]));
	// 날짜는 따옴표 없이 써야 YAML이 Date로 읽는다 (Starlight lastUpdated 는 Date 필요)
	const fmText = yaml
		.dump(out, { lineWidth: -1, quotingType: '"' })
		.replace(/^(date|lastUpdated): ['"](\d{4}-\d{2}-\d{2})['"]$/gm, '$1: $2');
	fs.writeFileSync(path.join(DOCS, p.cat, `${p.slug}.md`), `---\n${fmText}---\n\n${body}`);

	mapping.push([
		`${SITE}/${p.cat}/${p.oldName}/`,
		draft ? '' : `${SITE}${p.newPath}`,
		out.title,
		draft ? 'draft(백업 사본, 비공개)' : EXTRA_POSTS.some((e) => e.endsWith(p.file)) ? 'published(기존 _posts 밖에 있던 글)' : 'published',
	]);
}

// 카테고리 목록 페이지
for (const cat of CATEGORIES) mapping.push([`${SITE}/${cat}/`, `${SITE}${BASE}/${cat}/`, `${cat} 목록`, 'category']);
mapping.push([`${SITE}/category/vertica_use`, `${SITE}${BASE}/vertica_use/`, 'vertica_use 목록(메뉴 링크)', 'category']);
mapping.push([`${SITE}/category/vertica_etc`, `${SITE}${BASE}/vertica_etc/`, 'vertica_etc 목록(메뉴 링크)', 'category']);
mapping.push([`${SITE}/`, `${SITE}${BASE}/`, '홈', 'home']);

fs.writeFileSync(path.join(ROOT, 'url-mapping.tsv'), mapping.map((r) => r.join('\t')).join('\n') + '\n');

console.log(`글 ${posts.length}편 (draft ${posts.filter((p) => DRAFTS.has(p.slug)).length}편), 이미지 ${imageCount}개 변환`);
for (const w of warnings) console.log('  경고:', w);
