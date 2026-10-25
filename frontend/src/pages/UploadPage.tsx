import { useRef, useState, type ChangeEvent, type DragEvent, type FC } from 'react';
import './UploadPage.css';
import { backendApiBaseUrl } from '../constants';

type CsvPayload = {
	filename: string;
	headers: string[];
	rows: Record<string, string>[];
};

type ImportReceipt = {
	receivedRows: number;
};

function parseCsv(contents: string): { headers: string[]; rows: Record<string, string>[] } {
	const source = contents.replace(/^\uFEFF/, '');
	const matrix: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let inQuotes = false;

	for (let index = 0; index < source.length; index += 1) {
		const character = source[index];

		if (inQuotes) {
			if (character === '"' && source[index + 1] === '"') {
				cell += '"';
				index += 1;
			} else if (character === '"') {
				inQuotes = false;
			} else {
				cell += character;
			}
			continue;
		}

		if (character === '"' && cell.length === 0) {
			inQuotes = true;
		} else if (character === ',') {
			row.push(cell);
			cell = '';
		} else if (character === '\n' || character === '\r') {
			row.push(cell);
			matrix.push(row);
			row = [];
			cell = '';
			if (character === '\r' && source[index + 1] === '\n') index += 1;
		} else {
			cell += character;
		}
	}

	if (inQuotes) throw new Error('The CSV contains an unclosed quoted field.');
	if (cell.length > 0 || row.length > 0) {
		row.push(cell);
		matrix.push(row);
	}

	const nonemptyRows = matrix.filter((values) => values.some((value) => value.trim() !== ''));
	if (nonemptyRows.length < 2) throw new Error('Add a header row and at least one data row.');

	const headers = nonemptyRows[0].map((header) => header.trim());
	if (headers.some((header) => header.length === 0)) {
		throw new Error('Every column must have a name in the first row.');
	}
	if (new Set(headers.map((header) => header.toLowerCase())).size !== headers.length) {
		throw new Error('Column names must be unique.');
	}

	const rows = nonemptyRows.slice(1).map((values, rowIndex) => {
		if (values.length !== headers.length) {
			throw new Error(`Row ${rowIndex + 2} has ${values.length} columns; expected ${headers.length}.`);
		}
		return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
	});

	return { headers, rows };
}

function isCsvFile(file: File) {
	return file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';
}

const UploadPage: FC = () => {
	const fileInput = useRef<HTMLInputElement>(null);
	const [payload, setPayload] = useState<CsvPayload | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [isSending, setIsSending] = useState(false);
	const [message, setMessage] = useState('');
	const [error, setError] = useState('');

	const readFile = async (file?: File) => {
		setError('');
		setMessage('');
		setPayload(null);
		if (!file) return;
		if (!isCsvFile(file)) {
			setError('Choose a .csv file to continue.');
			return;
		}
		if (file.size > 8 * 1024 * 1024) {
			setError('The file is larger than the 8 MB limit.');
			return;
		}

		try {
			const parsed = parseCsv(await file.text());
			setPayload({ filename: file.name, ...parsed });
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : 'This CSV could not be read.');
		}
	};

	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		void readFile(event.currentTarget.files?.[0]);
		event.currentTarget.value = '';
	};

	const handleDrop = (event: DragEvent<HTMLElement>) => {
		event.preventDefault();
		setIsDragging(false);
		void readFile(event.dataTransfer.files[0]);
	};

	const sendToApi = async () => {
		if (!payload) return;
		setIsSending(true);
		setError('');
		setMessage('');
		try {
			const response = await fetch(`/api/statements/import`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const result = await response.json() as ImportReceipt & { error?: string };
			if (!response.ok) throw new Error(result.error || 'The API could not receive this file.');
			setMessage(`Sent ${result.receivedRows} rows to the API.`);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : 'The API request failed.');
		} finally {
			setIsSending(false);
		}
	};

	return (
		<div className="upload-workspace">
			<main className="upload-main">
				<div className="upload-heading">
					<div>
						<p className="upload-eyebrow">DATA INTAKE <span> / </span> CSV</p>
						<h1>Upload a statement</h1>
						<p className="upload-intro">Bring in a CSV file, check its contents, and send the rows to the API.</p>
					</div>
				</div>

				<div className="upload-content">
					<section className="upload-source" aria-labelledby="source-title">
						<div className="upload-section-heading">
							<div><span className="upload-section-number">01</span><h2 id="source-title">Choose a file</h2></div>
							<span className="upload-format">CSV · UP TO 8 MB</span>
						</div>
						<div
							className={`upload-dropzone${isDragging ? ' is-dragging' : ''}${payload ? ' has-file' : ''}`}
							onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
							onDragLeave={(event) => {
								if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
							}}
							onDrop={handleDrop}
						>
							<input ref={fileInput} className="upload-file-input" type="file" accept=".csv,text/csv" onChange={handleFileChange} aria-label="Choose a CSV file" />
							<div className="upload-file-glyph" aria-hidden="true">{payload ? 'CSV' : '↓'}</div>
							{payload ? (
								<>
									<p className="upload-drop-title">{payload.filename}</p>
									<p className="upload-drop-detail">{payload.rows.length.toLocaleString()} rows · {payload.headers.length} columns</p>
								</>
							) : (
								<>
									<p className="upload-drop-title">Drop your CSV here</p>
									<p className="upload-drop-detail">or <button className="upload-browse" type="button" onClick={() => fileInput.current?.click()}>browse files</button> from your device</p>
								</>
							)}
							{payload && <button className="upload-change" type="button" onClick={() => fileInput.current?.click()}>Choose another</button>}
						</div>
						<p className="upload-file-note">The first row is used as column names. Quoted fields and commas inside values are supported.</p>
					</section>

					<section className="upload-preview" aria-labelledby="preview-title">
						<div className="upload-section-heading">
							<div><span className="upload-section-number">02</span><h2 id="preview-title">Review rows</h2></div>
							<span className="upload-row-count">{payload ? `${payload.rows.length.toLocaleString()} ROWS` : 'AWAITING FILE'}</span>
						</div>
						{payload ? (
							<div className="upload-table-scroll">
								<table className="upload-table">
									<thead><tr>{payload.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
									<tbody>{payload.rows.slice(0, 6).map((row, rowIndex) => (
										<tr key={rowIndex}>{payload.headers.map((header) => <td key={header}>{row[header] || <span className="upload-empty-cell">—</span>}</td>)}</tr>
									))}</tbody>
								</table>
								{payload.rows.length > 6 && <p className="upload-more-rows">+ {(payload.rows.length - 6).toLocaleString()} more rows</p>}
							</div>
						) : (
							<div className="upload-preview-empty"><span aria-hidden="true">↳</span><p>Your file preview will appear here.</p></div>
						)}
					</section>
				</div>

				<section className="upload-json" aria-labelledby="json-title">
					<div className="upload-section-heading">
						<div><span className="upload-section-number">03</span><h2 id="json-title">Request payload</h2></div>
						<span className="upload-row-count">{payload ? 'JSON · POST' : 'AWAITING FILE'}</span>
					</div>
					{payload ? (
						<pre className="upload-json-code"><code>{JSON.stringify(payload, null, 2)}</code></pre>
					) : (
						<div className="upload-json-empty">The JSON request body will appear here when a CSV is selected.</div>
					)}
				</section>

				{error && <p className="upload-feedback is-error" role="alert">{error}</p>}
				{message && <p className="upload-feedback is-success" role="status">{message}</p>}

				<div className="upload-actions">
					<p>Sending transfers parsed rows to <code>/api/statements/import</code>.</p>
					<button className="upload-submit" type="button" onClick={() => void sendToApi()} disabled={!payload || isSending}>
						{isSending ? 'Sending…' : 'Send rows to API'} <span aria-hidden="true">→</span>
					</button>
				</div>
			</main>
			<footer className="upload-footer"><span>ELEDGERLIN · DATA INTAKE</span><span>CSV UPLOAD</span></footer>
		</div>
	);
}

export default UploadPage;