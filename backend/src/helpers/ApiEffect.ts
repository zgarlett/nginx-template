export class OutsideApiEffect {
	public execute(url: string | URL, init?: RequestInit): Promise<Response> {
		return fetch(url, init);
	}
}