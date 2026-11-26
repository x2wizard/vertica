// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { unified } from '@astrojs/markdown-remark';
import rehypeExternalLinks from './src/plugins/rehype-external-links.mjs';

const SITE = 'https://x2wizard.github.io';
const BASE = '/vertica';

export default defineConfig({
	site: SITE,
	base: BASE,
	trailingSlash: 'always',
	markdown: {
		// Starlight는 remark/rehype 기반 처리기가 필요하다. smartypants 는 끄고 원문 문장부호를 그대로 둔다.
		processor: unified({
			smartypants: false,
			rehypePlugins: [[rehypeExternalLinks, { site: SITE, base: BASE }]],
		}),
	},
	integrations: [
		starlight({
			title: 'GTG Vertica 블로그',
			description: '버티카(Vertica Analytics Database)에 대한 다양한 정보 공유',
			defaultLocale: 'root',
			locales: { root: { label: '한국어', lang: 'ko' } },
			logo: {
				light: './src/assets/brand/logo-light.png',
				dark: './src/assets/brand/logo-dark.png',
				alt: 'Vertica',
				replacesTitle: false,
			},
			favicon: '/favicon.svg',
			customCss: [
				'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css',
				'./src/styles/custom.css',
			],
			social: [{ icon: 'rss', label: 'RSS', href: `${BASE}/feed.xml` }],
			head: [
				{ tag: 'link', attrs: { rel: 'alternate', type: 'application/rss+xml', title: 'GTG Vertica 블로그', href: `${BASE}/feed.xml` } },
				{ tag: 'meta', attrs: { property: 'og:image', content: `${SITE}${BASE}/og-image.png` } },
				{ tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
				{ tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
				{ tag: 'meta', attrs: { name: 'twitter:image', content: `${SITE}${BASE}/og-image.png` } },
			],
			components: {
				MarkdownContent: './src/components/overrides/MarkdownContent.astro',
				Hero: './src/components/overrides/Hero.astro',
			},
			sidebar: [
				{ label: '홈', link: '/' },
				{ label: 'Vertica Architecture', items: [{ autogenerate: { directory: 'vertica_architecture' } }] },
				{ label: 'Vertica Use', items: [{ autogenerate: { directory: 'vertica_use' } }] },
				{ label: 'Etc', items: [{ autogenerate: { directory: 'vertica_etc' } }] },
				{ label: '태그', link: '/tags/' },
			],
			lastUpdated: false,
			pagination: true,
		}),
	],
});
