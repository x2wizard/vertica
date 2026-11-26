import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts, postUrl } from '../lib/posts';

export async function GET(context: APIContext) {
	const posts = await getPosts();
	return rss({
		title: 'GTG Vertica 블로그',
		description: '버티카(OpenText Analytics Database)에 대한 다양한 정보 공유',
		site: new URL(import.meta.env.BASE_URL, context.site).href,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.date,
			link: postUrl(post),
			categories: post.data.tags,
		})),
		customData: '<language>ko</language>',
	});
}
