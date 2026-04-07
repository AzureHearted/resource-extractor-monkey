type FetchWithProgressOptions = RequestInit & {
	onProgress?: (info: { loaded: number; total: number; percent: number }) => void;
};

/**
 * 可以监听进度的fetch方法
 * @param input
 * @param options
 * @returns
 */
export async function fetchWithProgress(
	input: string | URL | RequestInfo,
	options: FetchWithProgressOptions = {},
): Promise<Response> {
	const { onProgress, ...fetchOptions } = options;

	const res = await fetch(input, fetchOptions);

	// 没有 body（比如 204）
	if (!res.body) return res;

	const contentLength = res.headers.get("Content-Length");
	const total = contentLength ? parseInt(contentLength, 10) : 0;

	// 如果不需要进度，直接返回（避免性能损耗）
	if (!onProgress) return res;

	const reader = res.body.getReader();
	const chunks: Uint8Array[] = [];

	let loaded = 0;

	while (true) {
		const { done, value } = await reader.read();

		if (done) break;

		if (value) {
			chunks.push(value);
			loaded += value.length;

			onProgress({
				loaded,
				total,
				percent: total ? loaded / total : 0,
			});
		}
	}

	// 重建 body（关键点）
	const blob = new Blob(chunks as BlobPart[]);

	// ⚠️ 注意：Response 一旦 body 被读过就不能再用了，所以要 new 一个
	const newResponse = new Response(blob, {
		status: res.status,
		statusText: res.statusText,
		headers: res.headers,
	});

	return newResponse;
}
