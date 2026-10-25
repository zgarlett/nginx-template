import { useCallback, useEffect, useRef, useState } from 'react';

type ApiOptions = Omit<RequestInit, 'body' | 'method'>;

export function useApi<T = unknown>() {
	const [data, setData] = useState<T | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const [loading, setLoading] = useState(false);

	const request = useCallback(async <R = T>(url: string, init: RequestInit = {}): Promise<R> => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetch(url, init);
			const text = await response.text();
			let result: unknown;

			if (text) {
				try {
					result = JSON.parse(text);
				} catch {
					result = text;
				}
			}

			if (!response.ok) {
				const message = typeof result === 'object' && result !== null && 'message' in result
					? String(result.message)
					: `Request failed with status ${response.status}`;
				throw new Error(message);
			}

			setData(result as T);
			return result as R;
		} catch (cause) {
			const requestError = cause instanceof Error ? cause : new Error(String(cause));
			setError(requestError);
			throw requestError;
		} finally {
			setLoading(false);
		}
	}, []);

	const reset = useCallback(() => {
		setData(null);
		setError(null);
		setLoading(false);
	}, []);

	return { data, error, loading, request, reset };
}

export function useDelete<T = unknown>(url: string, options: ApiOptions = {}) {
	const optionsRef = useRef(options);
	optionsRef.current = options;
	const { data, error, loading, request } = useApi<T>();

	const del = useCallback((body: unknown) => {
		const currentOptions = optionsRef.current;
		return request<T>(url, {
			...currentOptions,
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				...currentOptions.headers,
			},
			body: JSON.stringify(body),
		});
	}, [url, request]);

	return { data, error, loading, del };
}

export function useGet<T = unknown>(url: string, options: ApiOptions = {}) {
	const optionsRef = useRef(options);
	optionsRef.current = options;
	const { data, error, loading, request } = useApi<T>();

	useEffect(() => {
		void request<T>(url, { ...optionsRef.current, method: 'GET' }).catch(() => undefined);
	}, [url, request]);

	return { data, error, loading };
}

export function usePost<T = unknown, TBody = unknown>(url: string, options: ApiOptions = {}) {
	const optionsRef = useRef(options);
	optionsRef.current = options;
	const { data, error, loading, request } = useApi<T>();

	const post = useCallback((body: TBody) => {
		const currentOptions = optionsRef.current;
		return request<T>(url, {
			...currentOptions,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...currentOptions.headers,
			},
			body: JSON.stringify(body),
		});
	}, [url, request]);

	return { data, error, loading, post };
}
