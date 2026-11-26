#!/usr/bin/env node
// 빌드 결과(dist/)의 내부 링크·이미지·앵커가 실제로 존재하는지 검사한다.
// 사용법: npm run build && npm run check-links

import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const BASE = '/vertica';
// 원래부터 예시로 쓰인 경로 (markdown_template 글)
const IGNORE = [/\/경로\/example\.jpg$/, /^주소$/, /^링크$/];

if (!fs.existsSync(DIST)) {
	console.error('dist/ 가 없습니다. 먼저 npm run build 를 실행하세요.');
	process.exit(1);
}

const htmlFiles = [];
(function walk(dir) {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) walk(p);
		else if (e.name.endsWith('.html')) htmlFiles.push(p);
	}
})(DIST);

const idCache = new Map();
function idsOf(file) {
	if (!idCache.has(file)) {
		const html = fs.readFileSync(file, 'utf8');
		idCache.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => decodeEntities(m[1]))));
	}
	return idCache.get(file);
}
const decodeEntities = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

function resolveTarget(urlPath) {
	if (!urlPath.startsWith(BASE + '/') && urlPath !== BASE) return null;
	const rel = decodeURIComponent(urlPath.slice(BASE.length)) || '/';
	const p = path.join(DIST, rel);
	if (rel.endsWith('/')) return fs.existsSync(path.join(p, 'index.html')) ? path.join(p, 'index.html') : null;
	if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
	if (fs.existsSync(path.join(p, 'index.html'))) return path.join(p, 'index.html');
	return null;
}

let checked = 0;
const broken = [];
for (const file of htmlFiles) {
	const html = fs.readFileSync(file, 'utf8');
	const pageUrl = BASE + '/' + path.relative(DIST, file).replace(/index\.html$/, '').replace(/\\/g, '/');
	for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
		const raw = decodeEntities(m[1]);
		if (/^(https?:|mailto:|data:|javascript:|\/\/)/i.test(raw)) continue;
		if (IGNORE.some((re) => re.test(raw))) continue;
		checked++;
		const u = new URL(raw, 'http://x' + pageUrl);
		const target = resolveTarget(u.pathname);
		if (!target) {
			broken.push(`${pageUrl}  →  ${raw}  (대상 없음)`);
			continue;
		}
		if (u.hash && target.endsWith('.html')) {
			const id = decodeURIComponent(u.hash.slice(1));
			if (id && !idsOf(target).has(id)) broken.push(`${pageUrl}  →  ${raw}  (앵커 없음)`);
		}
	}
}

console.log(`HTML ${htmlFiles.length}개, 내부 링크·이미지 ${checked}개 검사, 깨진 것 ${broken.length}개`);
for (const b of broken) console.log('  ' + b);
process.exit(broken.length ? 1 : 0);
