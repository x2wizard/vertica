// AI(LLM)용 사이트 안내 (https://llmstxt.org 형식). 글 목록과 각 글 URL, 전체 본문 파일 위치를 알려 준다.
import type { APIContext } from 'astro';
import { CATEGORIES, getPosts, postUrl } from '../lib/posts';
import { SITE_DESCRIPTION, SITE_NAME } from '../lib/seo';

export async function GET(context: APIContext) {
	const site = new URL(import.meta.env.BASE_URL, context.site).href;
	const abs = (path: string) => new URL(path, context.site).href;
	const posts = await getPosts();

	const lines = [
		`# ${SITE_NAME}`,
		'',
		`> ${SITE_DESCRIPTION}. 컬럼 기반 MPP 분석 데이터베이스 Vertica 의 아키텍처, 설치·운영, 데이터 적재, 튜닝, 모니터링을 한국어로 설명하는 기술 블로그입니다.`,
		'',
		`- 사이트: ${site}`,
		`- 모든 글 본문(Markdown): ${site}llms-full.txt`,
		`- RSS: ${site}feed.xml`,
		'',
	];
	for (const c of CATEGORIES) {
		const list = posts.filter((p) => p.id.startsWith(`${c.id}/`)).sort((a, b) => a.id.localeCompare(b.id));
		if (!list.length) continue;
		lines.push(`## ${c.label}`, '', `${c.description}`, '');
		for (const p of list) {
			lines.push(`- [${p.data.title}](${abs(postUrl(p))})${p.data.description ? `: ${p.data.description}` : ''}`);
		}
		lines.push('');
	}
	return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
