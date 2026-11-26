import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'docs'>;

export const CATEGORIES = [
	{
		id: 'vertica_architecture',
		label: 'Vertica Architecture',
		description: '컬럼 기반 MPP 데이터베이스 Vertica의 구조와 동작 원리',
	},
	{
		id: 'vertica_use',
		label: 'Vertica Use',
		description: '설치, 데이터 적재, 운영과 활용 방법',
	},
	{
		id: 'vertica_etc',
		label: 'Etc',
		description: '모니터링, 정규 표현식, Q&A 등 그 밖의 이야기',
	},
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** 사이트 내부 경로 (base 포함, 끝 슬래시) */
export const href = (path: string) => {
	const p = path.replace(/^\/+|\/+$/g, '');
	return p ? `${base}/${p}/` : `${base}/`;
};

export const postUrl = (post: Post) => href(post.id);
export const tagUrl = (tag: string) => href(`tags/${tagSlug(tag)}`);
export const categoryOf = (post: Post) => post.id.split('/')[0] as CategoryId;

/** 태그 → URL 조각. 한글은 그대로 두고 공백·특수문자만 정리한다. */
export const tagSlug = (tag: string) =>
	tag
		.trim()
		.toLowerCase()
		.replace(/[()[\]{}'"`.,/\\?#%&+:;!@*<>|=]/g, '')
		.replace(/\s+/g, '-');

/** 게시된 글 (카테고리 목록 페이지·draft 제외), 최신순 */
export async function getPosts(category?: CategoryId): Promise<Post[]> {
	const isProd = import.meta.env.PROD;
	const posts = await getCollection('docs', (entry) => {
		const parts = entry.id.split('/');
		if (parts.length !== 2) return false; // index 등
		if (!CATEGORIES.some((c) => c.id === parts[0])) return false;
		if (isProd && entry.data.draft) return false;
		return category ? parts[0] === category : true;
	});
	return posts.sort(comparePosts);
}

export function comparePosts(a: Post, b: Post) {
	const da = (a.data.date ?? new Date(0)).getTime();
	const db = (b.data.date ?? new Date(0)).getTime();
	return db - da || a.id.localeCompare(b.id);
}

/** 태그별 글 목록. 대소문자만 다른 태그는 하나로 묶는다. */
export async function getTags() {
	const map = new Map<string, { label: string; slug: string; posts: Post[] }>();
	for (const post of await getPosts()) {
		for (const tag of post.data.tags) {
			const slug = tagSlug(tag);
			if (!slug) continue;
			if (!map.has(slug)) map.set(slug, { label: tag.trim(), slug, posts: [] });
			map.get(slug)!.posts.push(post);
		}
	}
	return [...map.values()].sort((a, b) => b.posts.length - a.posts.length || a.label.localeCompare(b.label, 'ko'));
}

export const formatDate = (d: Date) =>
	d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
