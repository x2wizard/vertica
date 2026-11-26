// 본문의 외부 링크(다른 사이트)를 새 탭에서 열도록 target/rel 을 붙인다.
// 기존 블로그의 kramdown {:target="_blank"} 를 대신한다.

/** @param {{ site: string, base: string }} opts */
export default function rehypeExternalLinks({ site, base }) {
	const ownPrefix = site.replace(/\/$/, '') + base;
	const walk = (node) => {
		if (node.type === 'element' && node.tagName === 'a') {
			const href = String(node.properties?.href ?? '');
			if (/^https?:\/\//i.test(href) && !href.startsWith(ownPrefix)) {
				node.properties.target = '_blank';
				node.properties.rel = ['noopener', 'noreferrer'];
			}
		}
		for (const child of node.children ?? []) walk(child);
	};
	return (tree) => walk(tree);
}
