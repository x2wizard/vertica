// Starlight 경로 미들웨어: 검색엔진용 메타 태그와 구조화 데이터(JSON-LD)를 <head> 에 넣는다.
import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import { CATEGORIES } from './lib/posts';
import { AUTHOR, GOOGLE_SITE_VERIFICATION, NAVER_SITE_VERIFICATION, SITE_DESCRIPTION, SITE_NAME } from './lib/seo';

type HeadEntry = { tag: 'meta' | 'script' | 'link'; attrs?: Record<string, string>; content?: string };

export const onRequest = defineRouteMiddleware((context) => {
	const route = context.locals.starlightRoute;
	const head = route.head as HeadEntry[];
	const { entry } = route;
	const site = new URL(import.meta.env.BASE_URL, context.site).href; // https://x2wizard.github.io/vertica/
	const pageUrl = new URL(context.url.pathname, context.site).href;
	const parts = entry.id.split('/');
	const isHome = entry.id === 'index' || entry.id === '';
	const isPost = parts.length === 2 && CATEGORIES.some((c) => c.id === parts[0]);

	if (GOOGLE_SITE_VERIFICATION) head.push({ tag: 'meta', attrs: { name: 'google-site-verification', content: GOOGLE_SITE_VERIFICATION } });
	if (NAVER_SITE_VERIFICATION) head.push({ tag: 'meta', attrs: { name: 'naver-site-verification', content: NAVER_SITE_VERIFICATION } });

	const json = (data: unknown) => head.push({ tag: 'script', attrs: { type: 'application/ld+json' }, content: JSON.stringify(data) });

	if (isHome) {
		json({
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			name: SITE_NAME,
			description: SITE_DESCRIPTION,
			url: site,
			inLanguage: 'ko',
			publisher: { '@type': 'Organization', name: AUTHOR.name, url: AUTHOR.url },
		});
	}

	if (isPost) {
		const data = entry.data as { title: string; description?: string; date?: Date; lastUpdated?: Date | boolean; tags?: string[] };
		const category = CATEGORIES.find((c) => c.id === parts[0])!;
		const published = data.date?.toISOString();
		const modified = data.lastUpdated instanceof Date ? data.lastUpdated.toISOString() : published;

		// 글 페이지는 og:type 을 article 로
		const ogType = head.find((h) => h.tag === 'meta' && h.attrs?.property === 'og:type');
		if (ogType?.attrs) ogType.attrs.content = 'article';
		if (published) head.push({ tag: 'meta', attrs: { property: 'article:published_time', content: published } });
		for (const tag of data.tags ?? []) head.push({ tag: 'meta', attrs: { property: 'article:tag', content: tag } });
		if (data.tags?.length) head.push({ tag: 'meta', attrs: { name: 'keywords', content: data.tags.join(', ') } });

		json({
			'@context': 'https://schema.org',
			'@graph': [
				{
					'@type': 'BlogPosting',
					headline: data.title,
					...(data.description ? { description: data.description } : {}),
					url: pageUrl,
					mainEntityOfPage: pageUrl,
					inLanguage: 'ko',
					...(published ? { datePublished: published, dateModified: modified } : {}),
					...(data.tags?.length ? { keywords: data.tags.join(', ') } : {}),
					articleSection: category.label,
					image: `${site}og-image.png`,
					author: { '@type': 'Organization', name: AUTHOR.name, url: AUTHOR.url },
					publisher: { '@type': 'Organization', name: AUTHOR.name, url: AUTHOR.url },
					isPartOf: { '@type': 'Blog', name: SITE_NAME, url: site },
				},
				{
					'@type': 'BreadcrumbList',
					itemListElement: [
						{ '@type': 'ListItem', position: 1, name: SITE_NAME, item: site },
						{ '@type': 'ListItem', position: 2, name: category.label, item: `${site}${category.id}/` },
						{ '@type': 'ListItem', position: 3, name: data.title, item: pageUrl },
					],
				},
			],
		});
	}
});
