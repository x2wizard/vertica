// AI(LLM)용 전체 본문. 모든 공개 글의 Markdown 원문을 카테고리·연재 순서로 이어 붙인다.
import type { APIContext } from 'astro';
import { CATEGORIES, getPosts, postUrl } from '../lib/posts';
import { SITE_DESCRIPTION, SITE_NAME } from '../lib/seo';

/** MDX import·컴포넌트 줄, HTML 주석은 빼고 본문만 남긴다 */
const clean = (body = '') =>
	body
		.replace(/<!--[\s\S]*?-->/g, '')
		// 이미지는 상대 경로라 쓸모가 없으므로 설명(alt)만 남긴다
		.replace(/!\[([^\]]*)\]\([^)]*\)/g, (_, alt) => (alt ? `[이미지: ${alt}]` : ''))
		.split('\n')
		.filter((l) => !/^import\s.+from\s/.test(l))
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();

export async function GET(context: APIContext) {
	const abs = (path: string) => new URL(path, context.site).href;
	const posts = await getPosts();
	const out = [`# ${SITE_NAME}`, '', `> ${SITE_DESCRIPTION}`, ''];
	for (const c of CATEGORIES) {
		const list = posts.filter((p) => p.id.startsWith(`${c.id}/`)).sort((a, b) => a.id.localeCompare(b.id));
		for (const p of list) {
			out.push(
				'---',
				'',
				`# ${p.data.title}`,
				'',
				`- URL: ${abs(postUrl(p))}`,
				`- 카테고리: ${c.label}`,
				...(p.data.tags.length ? [`- 태그: ${p.data.tags.join(', ')}`] : []),
				...(p.data.description ? [`- 요약: ${p.data.description}`] : []),
				'',
				clean(p.body),
				'',
			);
		}
	}
	return new Response(out.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
