import { useRef, useState } from 'react';
import Button from './Button';
import { Icons } from './Icon';

/* ────────────────────────────────────────────────────────────────────────────
   CsvImportModal — generic CSV / XLSX / TSV importer.

   The caller declares a `fields` schema (in order) and a `onSubmitRow` callback;
   the modal handles file picking, parsing, header detection, preview, progress,
   and per-row error capture. Each row is submitted sequentially so partial
   failures don't poison the whole batch — what didn't go through is listed in
   the final summary.

   Both papaparse and xlsx are dynamic-imported so they're code-split out of the
   main JS bundle — the user only pays the download cost when they actually
   open this modal.

   Props:
     · title             — modal heading (e.g. "Import guests")
     · description       — short copy under the heading
     · fields            — [{ key: 'name', label: 'Name', required: true }, ...]
                           Column order matters: column 1 → fields[0], etc.
     · onSubmitRow       — async (row) => void | throws.  Receives a row object
                           keyed by field.key. Throwing surfaces the message in
                           the per-row error list.
     · onClose           — close handler
     · onComplete        — called once after the batch finishes; useful for
                           refetching the list view
     · open              — boolean
   ─────────────────────────────────────────────────────────────────────── */
export default function CsvImportModal({
    title = 'Import',
    description,
    fields,
    onSubmitRow,
    onSubmitBatch,  // async (rows) => { failed: [{rowIndex, message}] } — used instead of onSubmitRow when provided
    onClose,
    onComplete,
    open,
}) {
    const fileRef = useRef(null);
    const [stage, setStage] = useState('idle'); // idle | preview | running | done
    const [rows, setRows] = useState([]);       // parsed objects keyed by field.key
    const [errors, setErrors] = useState([]);   // [{ rowIndex, message }]
    const [parseError, setParseError] = useState('');
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [fileName, setFileName] = useState('');
    // When the first row fails with a server-side "structural" error (feature
    // disabled, unauthorised, event not found etc.), we abort the rest of the
    // batch instead of submitting identical-failing rows one by one. This holds
    // the message so the summary explains why we stopped.
    const [abortMessage, setAbortMessage] = useState('');

    if (!open) return null;

    function reset() {
        setStage('idle');
        setRows([]);
        setErrors([]);
        setParseError('');
        setProgress({ done: 0, total: 0 });
        setFileName('');
        setAbortMessage('');
    }

    /**
     * Errors we treat as "stop the whole batch" rather than per-row failures.
     * These are configuration / auth problems where retrying subsequent rows
     * just yields the same identical error — better to abort and tell the user
     * once. Per-row content errors (invalid email, duplicate) are NOT in here
     * so the rest of the file still gets a chance.
     */
    function isFatalBatchError(message) {
        const m = String(message || '').toLowerCase();
        return (
            m.includes('not enabled')        // "guest list is not enabled for this event"
            || m.includes('not authorized')
            || m.includes('not authorised')
            || m.includes('unauthorized')
            || m.includes('forbidden')
            || m.includes('event not found')
            || m.includes('access denied')
        );
    }

    function handleClose() {
        if (stage === 'running') return; // don't close mid-import
        reset();
        onClose?.();
    }

    async function handleFile(file) {
        if (!file) return;
        setParseError('');
        setFileName(file.name);
        try {
            const parsed = await parseFile(file, fields);
            if (parsed.length === 0) {
                setParseError('No data rows found in the file. Make sure your file has at least one row of data.');
                return;
            }
            setRows(parsed);
            setStage('preview');
        } catch (err) {
            setParseError(err?.message || 'Could not read this file. Please check the format.');
        }
    }

    async function runImport() {
        setStage('running');
        setProgress({ done: 0, total: rows.length });
        setAbortMessage('');

        let errs = [];

        if (onSubmitBatch) {
            // Single round-trip: send all rows, get back per-row failures.
            try {
                const result = await onSubmitBatch(rows);
                errs = (result?.failed ?? []).map((f) => ({
                    rowIndex: f.rowIndex,
                    message: f.reason ?? f.message ?? 'Row failed',
                }));
            } catch (err) {
                const msg = Array.isArray(err?.data?.errors)
                    ? err.data.errors.join('; ')
                    : (err?.data?.message || err?.message || 'Import failed');
                setAbortMessage(msg);
                setErrors([]);
                setStage('done');
                onComplete?.({ added: 0, failed: rows.length, aborted: true });
                return;
            }
            setProgress({ done: rows.length, total: rows.length });
        } else {
            // Row-by-row fallback (used when no bulk endpoint is available).
            let abortedAt = -1;
            let abortMsg = '';
            for (let i = 0; i < rows.length; i++) {
                try {
                    await onSubmitRow(rows[i]);
                } catch (err) {
                    const msg = Array.isArray(err?.data?.errors)
                        ? err.data.errors.join('; ')
                        : (err?.data?.message || err?.message || 'Row failed');
                    errs.push({ rowIndex: i, message: msg });
                    if (isFatalBatchError(msg)) {
                        abortedAt = i;
                        abortMsg = msg;
                        break;
                    }
                }
                setProgress({ done: i + 1, total: rows.length });
            }
            if (abortedAt >= 0) setAbortMessage(abortMsg);
        }

        setErrors(errs);
        setStage('done');
        onComplete?.({ added: rows.length - errs.length, failed: errs.length, aborted: false });
    }

    const orderHint = fields.map((f) => f.key).join(', ');
    const successCount = stage === 'done' ? rows.length - errors.length : 0;

    return (
        <div
            role="dialog"
            aria-label={title}
            onClick={handleClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(2,16,45,0.55)',
                display: 'grid', placeItems: 'center', padding: 20,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 640,
                    background: 'var(--surface-elevated, white)',
                    borderRadius: 16, padding: 28,
                    boxShadow: 'var(--shadow-modal)',
                    maxHeight: '90vh', overflow: 'auto',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                    <h3 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>{title}</h3>
                    <button
                        type="button"
                        onClick={handleClose}
                        aria-label="Close"
                        disabled={stage === 'running'}
                        style={{
                            background: 'var(--surface-subtle)',
                            border: 0, padding: 6, borderRadius: 8,
                            color: 'var(--text-2)',
                            cursor: stage === 'running' ? 'not-allowed' : 'pointer',
                            opacity: stage === 'running' ? 0.5 : 1,
                        }}
                    >
                        <Icons.x size={14} />
                    </button>
                </div>
                {description && (
                    <p style={{ margin: '4px 0 18px', fontSize: 13, color: 'var(--text-2)' }}>
                        {description}
                    </p>
                )}

                {/* Format disclaimer — always visible, even after picking a file */}
                <div style={{
                    background: 'var(--mp-blue-50, #EAF1FE)',
                    border: '1px solid #C2D9F7',
                    borderRadius: 10,
                    padding: '12px 14px',
                    marginBottom: 18,
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                }}>
                    <Icons.alert size={16} style={{ color: 'var(--mp-blue)', flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: 13, color: 'var(--mp-blue)', lineHeight: 1.5 }}>
                        <strong>Column order: {orderHint}.</strong>
                        {' '}If your first row is a header (e.g. column names), it&apos;ll be detected and skipped automatically.
                        {' '}CSV, TSV, XLSX, and XLS files are all supported.
                        {fields.some((f) => !f.required) && (
                            <> Optional columns can be left blank or omitted entirely.</>
                        )}
                    </div>
                </div>

                {/* ── Idle state — pick a file ───────────────────────── */}
                {stage === 'idle' && (
                    <>
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".csv,.tsv,.xlsx,.xls,text/csv,text/tab-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                            style={{ display: 'none' }}
                            onChange={(e) => handleFile(e.target.files?.[0])}
                        />
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            style={{
                                width: '100%', minHeight: 140,
                                background: 'var(--surface-subtle)',
                                border: '2px dashed var(--border)',
                                borderRadius: 12,
                                cursor: 'pointer',
                                color: 'var(--text-2)',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                gap: 8,
                                fontFamily: 'inherit',
                            }}
                        >
                            <Icons.plus size={22} style={{ color: 'var(--text-3)' }} />
                            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-1)' }}>
                                Choose a file
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                                CSV, TSV, XLSX, XLS
                            </span>
                        </button>
                        {parseError && (
                            <p role="alert" style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--error)' }}>
                                {parseError}
                            </p>
                        )}
                    </>
                )}

                {/* ── Preview state — verify parsed rows ─────────────── */}
                {stage === 'preview' && (
                    <PreviewTable rows={rows} fields={fields} fileName={fileName} />
                )}

                {/* ── Running state — progress bar ───────────────────── */}
                {stage === 'running' && (
                    <div style={{ padding: '24px 0' }}>
                        <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 10 }}>
                            Importing… {progress.done} / {progress.total}
                        </div>
                        <div style={{
                            height: 6, background: 'var(--surface-subtle)',
                            borderRadius: 99, overflow: 'hidden',
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                                background: 'var(--mp-blue)',
                                transition: 'width 0.15s',
                            }} />
                        </div>
                    </div>
                )}

                {/* ── Done state — summary ───────────────────────────── */}
                {stage === 'done' && (
                    <DoneSummary
                        successCount={successCount}
                        errors={errors}
                        rows={rows}
                        fields={fields}
                        abortMessage={abortMessage}
                        totalRows={rows.length}
                    />
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                    {stage === 'preview' && (
                        <>
                            <Button variant="ghost" size="md" onClick={reset}>Pick a different file</Button>
                            <Button variant="primary" size="md" onClick={runImport}>
                                Import {rows.length} row{rows.length === 1 ? '' : 's'}
                            </Button>
                        </>
                    )}
                    {stage === 'done' && (
                        <Button variant="primary" size="md" onClick={handleClose}>
                            Done
                        </Button>
                    )}
                    {stage === 'idle' && (
                        <Button variant="ghost" size="md" onClick={handleClose}>Cancel</Button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────── */

function PreviewTable({ rows, fields, fileName }) {
    const previewCount = Math.min(rows.length, 5);
    return (
        <div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>
                <strong>{rows.length}</strong> row{rows.length === 1 ? '' : 's'} ready to import from{' '}
                <span style={{ fontFamily: 'ui-monospace, monospace' }}>{fileName}</span>.
                {rows.length > previewCount && ` Showing first ${previewCount}.`}
            </div>
            <div style={{
                border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto',
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead style={{ background: 'var(--surface-subtle)' }}>
                        <tr>
                            {fields.map((f) => (
                                <th key={f.key} style={{
                                    padding: '8px 12px', textAlign: 'left',
                                    fontWeight: 600, color: 'var(--text-2)',
                                    borderBottom: '1px solid var(--border)',
                                    fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em',
                                }}>
                                    {f.label}{f.required && <span style={{ color: 'var(--error)' }}> *</span>}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.slice(0, previewCount).map((row, i) => (
                            <tr key={i} style={{ borderBottom: i === previewCount - 1 ? 0 : '1px solid var(--border)' }}>
                                {fields.map((f) => (
                                    <td key={f.key} style={{
                                        padding: '8px 12px',
                                        color: 'var(--text-1)',
                                    }}>
                                        {row[f.key] || <span style={{ color: 'var(--text-3)' }}>—</span>}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function DoneSummary({ successCount, errors, rows, fields, abortMessage, totalRows }) {
    // When the batch was aborted, the user just needs to see the root cause
    // once — not the same error repeated for every row. Show a single
    // headline message, hide the per-row list (it's all the same failure).
    if (abortMessage) {
        const notAttempted = totalRows - errors.length;
        return (
            <div style={{
                padding: '14px 16px', borderRadius: 10,
                background: 'var(--error-bg)', color: 'var(--error)',
                fontSize: 13,
            }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <Icons.alert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>
                            Import stopped — nothing was added.
                        </div>
                        <div style={{ marginBottom: 6 }}>
                            {abortMessage}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.85 }}>
                            {notAttempted > 0
                                ? `${notAttempted} of ${totalRows} row${totalRows === 1 ? '' : 's'} weren’t attempted.`
                                : `Failed on row 1 of ${totalRows}.`}
                            {' '}Fix the underlying issue and try again — your file is still selected.
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div>
            {successCount > 0 && (
                <div style={{
                    padding: '12px 14px', marginBottom: 12, borderRadius: 10,
                    background: 'var(--success-bg, #E6F4EA)',
                    color: 'var(--success, #0F7B3E)',
                    display: 'flex', gap: 8, alignItems: 'center',
                }}>
                    <Icons.check size={16} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {successCount} row{successCount === 1 ? '' : 's'} imported successfully.
                    </span>
                </div>
            )}
            {errors.length > 0 && (
                <div style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: 'var(--error-bg)', color: 'var(--error)',
                    fontSize: 13,
                }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>
                        {errors.length} row{errors.length === 1 ? '' : 's'} could not be imported:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, maxHeight: 200, overflow: 'auto' }}>
                        {errors.map((err) => {
                            const row = rows[err.rowIndex];
                            const summary = fields.slice(0, 2)
                                .map((f) => row[f.key])
                                .filter(Boolean)
                                .join(' / ') || `Row ${err.rowIndex + 1}`;
                            return (
                                <li key={err.rowIndex} style={{ marginBottom: 4 }}>
                                    <strong>{summary}</strong> — {err.message}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}

/* ── Parser ───────────────────────────────────────────────────────────────
   Picks the right library at runtime: papaparse for CSV/TSV, xlsx for
   spreadsheets. Both are dynamic imports so the cost is paid only when the
   import modal is actually opened.
   ─────────────────────────────────────────────────────────────────────── */
async function parseFile(file, fields) {
    const name = file.name.toLowerCase();
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls');
    const isTsv   = name.endsWith('.tsv');

    let matrix; // 2D array of strings
    if (isExcel) {
        const XLSX = (await import('xlsx')).default ?? (await import('xlsx'));
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { type: 'array' });
        const firstSheet = wb.Sheets[wb.SheetNames[0]];
        matrix = XLSX.utils.sheet_to_json(firstSheet, { header: 1, blankrows: false, defval: '' });
    } else {
        const Papa = (await import('papaparse')).default ?? (await import('papaparse'));
        const text = await file.text();
        const result = Papa.parse(text, {
            header: false,
            skipEmptyLines: 'greedy',
            delimiter: isTsv ? '\t' : undefined, // auto-detect for csv
        });
        if (result.errors?.length) {
            const fatal = result.errors.find((e) => e.type !== 'FieldMismatch');
            if (fatal) throw new Error(`Parse error: ${fatal.message}`);
        }
        matrix = result.data;
    }

    return normaliseMatrix(matrix, fields);
}

function normaliseMatrix(matrix, fields) {
    if (!Array.isArray(matrix) || matrix.length === 0) return [];

    // Detect a header row by checking whether the first row's first cell looks
    // like a field name or label rather than a value (e.g. "name", "Name",
    // "Email Address"). This is heuristic but matches the common case where
    // people leave the headers in.
    const first = matrix[0].map((c) => String(c ?? '').trim().toLowerCase());
    const fieldKeys = fields.map((f) => f.key.toLowerCase());
    const fieldLabels = fields.map((f) => f.label.toLowerCase());
    const looksLikeHeader = first.some((cell) =>
        fieldKeys.includes(cell) || fieldLabels.includes(cell) ||
        cell === 'first name' || cell === 'last name' || cell === 'phone number',
    );

    const dataRows = looksLikeHeader ? matrix.slice(1) : matrix;

    return dataRows
        .map((row) => {
            const obj = {};
            fields.forEach((f, i) => {
                const raw = row[i];
                obj[f.key] = raw == null ? '' : String(raw).trim();
            });
            return obj;
        })
        // Drop entirely-empty rows (trailing blanks are common in copy-pastes).
        .filter((row) => Object.values(row).some((v) => v));
}
