import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				/** 작성일 */
				date: z.coerce.date().optional(),
				/** 태그 */
				tags: z.array(z.string()).default([]),
				/** 홈 히어로 버튼 옆 안내 상자 (body 는 HTML) */
				heroNotice: z.object({ title: z.string(), body: z.string() }).optional(),
			}),
		}),
	}),
};
