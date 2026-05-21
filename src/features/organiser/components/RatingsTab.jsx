import { useState } from 'react';
import {
    useGetRatingFormQuery,
    useCreateRatingFormMutation,
    useUpdateRatingFormMutation,
    useListRatingResponsesQuery,
} from '../ratingFormsApi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Icons } from '@/components/ui/Icon';
import { formatEventDate } from '@/utils/dateFormat';

/* ────────────────────────────────────────────────────────────────────────────
   RatingsTab — post-event rating form for the organiser.

   Flow:
     1. No form → "Design a rating form" CTA → opens the designer with a list
        of organiser-built questions. Each question is typed (STAR / NPS /
        TEXT / MULTIPLE_CHOICE) with an isRequired flag.
     2. Form exists → aggregate dashboard (avg / counts / option breakdowns
        per question) + isOpen toggle + paginated list of individual
        responses for drilldown.
   ──────────────────────────────────────────────────────────────────────── */

const QUESTION_TYPES = [
    { id: 'STAR',            label: 'Star rating (1–5)' },
    { id: 'NPS',             label: 'NPS (0–10)' },
    { id: 'TEXT',            label: 'Free text' },
    { id: 'MULTIPLE_CHOICE', label: 'Multiple choice' },
];

export default function RatingsTab({ eventId }) {
    const formQ = useGetRatingFormQuery(eventId, { skip: !eventId });

    if (formQ.isLoading) return <Skeleton />;

    const isMissing =
        formQ.isError && (formQ.error?.status === 404 || formQ.error?.originalStatus === 404);

    if (isMissing) return <DesignerEmpty eventId={eventId} />;

    if (formQ.isError) {
        return (
            <ErrorBlock
                message={formQ.error?.data?.message || 'Could not load the rating form.'}
                onRetry={formQ.refetch}
            />
        );
    }

    if (!formQ.data) return <DesignerEmpty eventId={eventId} />;

    return <FormView form={formQ.data} eventId={eventId} />;
}

/* ─── Designer (no form yet) ───────────────────────── */

function DesignerEmpty({ eventId }) {
    const [creating, setCreating] = useState(false);
    if (creating) return <Designer eventId={eventId} onClose={() => setCreating(false)} />;

    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-card)',
            padding: 40,
            textAlign: 'center',
        }}>
            <Icons.spark size={32} style={{ color: 'var(--mp-blue)' }} />
            <h2 className="mp-h3" style={{ marginTop: 12, color: 'var(--text-1)' }}>
                Design a post-event rating form
            </h2>
            <p className="body-sm" style={{
                marginTop: 8, color: 'var(--text-2)',
                maxWidth: 460, marginLeft: 'auto', marginRight: 'auto',
                textWrap: 'pretty',
            }}>
                Build a form with custom questions — star ratings, NPS, free text, multiple choice.
                Attendees respond once after the event ends; you see aggregate results live.
            </p>
            <Button variant="primary" size="md" onClick={() => setCreating(true)} style={{ marginTop: 20 }}>
                Create form
            </Button>
        </div>
    );
}

function Designer({ eventId, onClose }) {
    const [createForm, createState] = useCreateRatingFormMutation();
    const [title, setTitle] = useState('How was the event?');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState([
        { id: nid(), text: 'How would you rate this event?', type: 'STAR', isRequired: true, options: [] },
    ]);
    const [error, setError] = useState('');

    function addQuestion() {
        setQuestions((qs) => [
            ...qs,
            { id: nid(), text: '', type: 'STAR', isRequired: false, options: [] },
        ]);
    }
    function removeQuestion(id) {
        setQuestions((qs) => qs.filter((q) => q.id !== id));
    }
    function updateQuestion(id, patch) {
        setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
    }

    async function submit(e) {
        e.preventDefault();
        setError('');
        const t = title.trim();
        if (!t) { setError('Title is required.'); return; }
        if (questions.length === 0) { setError('Add at least one question.'); return; }
        for (const q of questions) {
            if (!q.text.trim()) { setError('Every question needs text.'); return; }
            if (q.type === 'MULTIPLE_CHOICE' && q.options.filter((o) => o.trim()).length < 2) {
                setError('Multiple-choice questions need at least 2 options.');
                return;
            }
        }
        try {
            await createForm({
                eventId,
                title: t,
                description: description.trim() || null,
                questions: questions.map((q, i) => ({
                    text: q.text.trim(),
                    type: q.type,
                    isRequired: q.isRequired,
                    orderIndex: i,
                    options: q.type === 'MULTIPLE_CHOICE' ? q.options.filter((o) => o.trim()) : [],
                })),
            }).unwrap();
            onClose();
        } catch (err) {
            setError(err?.data?.message || 'Could not create form.');
        }
    }

    return (
        <form onSubmit={submit} style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-card)',
            padding: 24,
            display: 'flex', flexDirection: 'column', gap: 18,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h2 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>New rating form</h2>
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            </div>

            <Input label="Form title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Input label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Questions</div>
                {questions.map((q, i) => (
                    <QuestionEditor
                        key={q.id}
                        index={i}
                        question={q}
                        onChange={(patch) => updateQuestion(q.id, patch)}
                        onRemove={() => removeQuestion(q.id)}
                        canRemove={questions.length > 1}
                    />
                ))}
                <Button type="button" variant="secondary" size="sm" onClick={addQuestion}>
                    + Add question
                </Button>
            </div>

            {error && <Toast kind="error" message={error} />}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={createState.isLoading}>
                    Cancel
                </Button>
                <Button type="submit" variant="primary" size="md" disabled={createState.isLoading}>
                    {createState.isLoading ? 'Creating…' : 'Create form'}
                </Button>
            </div>
        </form>
    );
}

function QuestionEditor({ index, question, onChange, onRemove, canRemove }) {
    const isChoice = question.type === 'MULTIPLE_CHOICE';
    return (
        <div style={{
            background: 'var(--surface-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 14,
            display: 'flex', flexDirection: 'column', gap: 10,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.05em' }}>
                    QUESTION {index + 1}
                </span>
                {canRemove && (
                    <button
                        type="button"
                        onClick={onRemove}
                        style={{
                            background: 'transparent', border: 0, color: 'var(--error)',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 4,
                        }}
                    >
                        Remove
                    </button>
                )}
            </div>

            <Input placeholder="Question text" value={question.text} onChange={(e) => onChange({ text: e.target.value })} />

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-2)' }}>
                    Type
                    <select
                        value={question.type}
                        onChange={(e) => onChange({ type: e.target.value, options: [] })}
                        style={{
                            background: 'white', border: '1px solid var(--border)',
                            borderRadius: 8, padding: '6px 10px', fontSize: 13,
                        }}
                    >
                        {QUESTION_TYPES.map((t) => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                    </select>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)' }}>
                    <input
                        type="checkbox"
                        checked={question.isRequired}
                        onChange={(e) => onChange({ isRequired: e.target.checked })}
                    />
                    Required
                </label>
            </div>

            {isChoice && (
                <ChoiceOptionsEditor
                    options={question.options}
                    onChange={(opts) => onChange({ options: opts })}
                />
            )}
        </div>
    );
}

function ChoiceOptionsEditor({ options, onChange }) {
    function updateAt(i, value) {
        const next = [...options];
        next[i] = value;
        onChange(next);
    }
    const list = options.length === 0 ? ['', ''] : options;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>Options</span>
            {list.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                    <Input placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => updateAt(i, e.target.value)} />
                    {list.length > 2 && (
                        <button
                            type="button"
                            onClick={() => onChange(list.filter((_, j) => j !== i))}
                            style={{
                                background: 'transparent', border: 0, color: 'var(--text-3)',
                                cursor: 'pointer', padding: '0 4px',
                            }}
                            aria-label={`Remove option ${i + 1}`}
                        >
                            <Icons.x size={14} />
                        </button>
                    )}
                </div>
            ))}
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange([...list, ''])}
                style={{ alignSelf: 'flex-start' }}
            >
                + Add option
            </Button>
        </div>
    );
}

/* ─── Form view (exists) ───────────────────────── */

function FormView({ form, eventId }) {
    const [updateForm, updateState] = useUpdateRatingFormMutation();
    const [error, setError] = useState('');

    async function toggleOpen() {
        setError('');
        try {
            await updateForm({ eventId, isOpen: !form.isOpen }).unwrap();
        } catch (err) {
            setError(err?.data?.message || 'Could not toggle the form.');
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 12,
                boxShadow: 'var(--shadow-card)',
                padding: 24,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <h2 className="mp-h3" style={{ margin: 0, color: 'var(--text-1)' }}>{form.title}</h2>
                            <StatusPill kind={form.isOpen ? 'open' : 'closed'} />
                            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                                {form.totalResponses ?? 0} response{form.totalResponses === 1 ? '' : 's'}
                            </span>
                        </div>
                        {form.description && (
                            <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)', textWrap: 'pretty' }}>
                                {form.description}
                            </p>
                        )}
                    </div>
                    <Button
                        size="sm"
                        variant={form.isOpen ? 'ghost' : 'primary'}
                        onClick={toggleOpen}
                        disabled={updateState.isLoading}
                    >
                        {form.isOpen ? 'Close form' : 'Reopen form'}
                    </Button>
                </div>

                {error && <div style={{ marginTop: 12 }}><Toast kind="error" message={error} /></div>}
            </div>

            <QuestionsSummary questions={form.questions ?? []} />
            <ResponsesList eventId={eventId} />
        </div>
    );
}

function QuestionsSummary({ questions }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {questions.map((q, i) => (
                <QuestionAggregate key={q.id} question={q} index={i} />
            ))}
        </div>
    );
}

function QuestionAggregate({ question, index }) {
    const responseCount = question.responseCount ?? 0;
    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-card)',
            padding: 20,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.05em' }}>
                        Q{index + 1} · {question.type}{question.isRequired ? ' · REQUIRED' : ''}
                    </span>
                    <h3 className="mp-h4" style={{ margin: '4px 0 0', color: 'var(--text-1)' }}>
                        {question.text}
                    </h3>
                </div>
                <span className="mp-num" style={{ fontSize: 13, color: 'var(--text-3)' }}>
                    {responseCount} answer{responseCount === 1 ? '' : 's'}
                </span>
            </div>

            {question.type === 'STAR' && <NumericAggregate avg={question.averageScore} count={responseCount} max={5} />}
            {question.type === 'NPS'  && <NumericAggregate avg={question.averageScore} count={responseCount} max={10} />}
            {question.type === 'MULTIPLE_CHOICE' && (
                <ChoiceAggregate
                    options={question.options ?? []}
                    counts={question.optionCounts ?? {}}
                    total={responseCount}
                />
            )}
            {question.type === 'TEXT' && (
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                    Free-text answers — view individual responses below.
                </div>
            )}
        </div>
    );
}

function NumericAggregate({ avg, count, max }) {
    if (count === 0 || avg == null) {
        return <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No answers yet.</div>;
    }
    const pct = (Number(avg) / max) * 100;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span className="mp-num" style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-1)' }}>
                    {Number(avg).toFixed(2)}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>/ {max}</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: 'var(--surface-subtle)', overflow: 'hidden' }}>
                <div style={{
                    height: '100%', width: `${pct}%`,
                    background: 'var(--mp-blue)',
                    transition: 'width var(--motion-default)',
                }} />
            </div>
        </div>
    );
}

function ChoiceAggregate({ options, counts, total }) {
    if (total === 0) return <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No answers yet.</div>;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {options.map((opt) => {
                const n = counts[opt] ?? 0;
                const pct = total > 0 ? (n / total) * 100 : 0;
                return (
                    <div key={opt}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 13, marginBottom: 4 }}>
                            <span style={{ color: 'var(--text-1)' }}>{opt}</span>
                            <span className="mp-num" style={{ color: 'var(--text-3)' }}>
                                {n} · {pct.toFixed(0)}%
                            </span>
                        </div>
                        <div style={{ height: 6, borderRadius: 99, background: 'var(--surface-subtle)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--mp-blue)' }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function StatusPill({ kind }) {
    const map = {
        open:   { bg: 'var(--success-bg)',     fg: 'var(--success)', label: 'Open' },
        closed: { bg: 'var(--surface-subtle)', fg: 'var(--text-3)',  label: 'Closed' },
    };
    const s = map[kind];
    return (
        <span style={{
            padding: '2px 10px', borderRadius: 99,
            background: s.bg, color: s.fg,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
        }}>
            {s.label}
        </span>
    );
}

/* ─── Individual responses (paginated) ───────────────────────── */

function ResponsesList({ eventId }) {
    const [page, setPage] = useState(0);
    const pageSize = 10;
    const listQ = useListRatingResponsesQuery({ eventId, page, size: pageSize });

    const items = listQ.data?.content ?? [];
    const total = listQ.data?.totalElements ?? 0;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    return (
        <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
        }}>
            <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>Individual responses</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {listQ.isLoading ? 'Loading…' : `${total} total`}
                </span>
            </div>

            {listQ.isLoading && <ListSkeleton />}

            {!listQ.isLoading && items.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
                    No responses yet.
                </div>
            )}

            {items.map((r, i) => (
                <ResponseRow key={r.id} response={r} isLast={i === items.length - 1} />
            ))}

            {pageCount > 1 && (
                <div style={{
                    padding: 12, borderTop: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <Button size="sm" variant="ghost" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                        ← Prev
                    </Button>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        Page {page + 1} of {pageCount}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}>
                        Next →
                    </Button>
                </div>
            )}
        </div>
    );
}

function ResponseRow({ response, isLast }) {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ borderBottom: isLast ? 0 : '1px solid var(--border)' }}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                style={{
                    width: '100%', textAlign: 'left',
                    background: 'transparent', border: 0,
                    padding: '14px 20px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                }}
            >
                <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                        {response.respondentName || 'Anonymous'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                        Submitted {formatEventDate(response.submittedAt)}
                    </div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--mp-blue)', fontWeight: 600 }}>
                    {open ? 'Hide answers' : 'Show answers'}
                </span>
            </button>
            {open && (
                <div style={{ padding: '0 20px 16px' }}>
                    {(response.answers ?? []).map((a) => (
                        <AnswerLine key={a.questionId} answer={a} />
                    ))}
                </div>
            )}
        </div>
    );
}

function AnswerLine({ answer }) {
    const value = answer.starValue ?? answer.npsValue ?? answer.choiceValue ?? answer.textValue ?? '—';
    return (
        <div style={{
            display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12,
            padding: '6px 0', borderBottom: '1px dashed var(--border)',
        }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.05em' }}>
                {answer.questionType}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-1)', textWrap: 'pretty' }}>
                {value}
            </span>
        </div>
    );
}

/* ─── Shared bits ───────────────────────── */

function Skeleton() {
    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, padding: 24, minHeight: 200,
            animation: 'mp-flash 1.6s ease-in-out infinite',
        }} />
    );
}

function ListSkeleton() {
    return (
        <>
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{
                    height: 56,
                    borderBottom: '1px solid var(--border)',
                    animation: 'mp-flash 1.6s ease-in-out infinite',
                    background: 'var(--surface-subtle)',
                }} />
            ))}
        </>
    );
}

function ErrorBlock({ message, onRetry }) {
    return (
        <div style={{
            background: 'white', border: '1px solid var(--border)',
            borderRadius: 12, padding: 40, textAlign: 'center',
        }}>
            <Icons.alert size={28} style={{ color: 'var(--error)' }} />
            <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-2)' }}>{message}</p>
            <Button variant="secondary" size="sm" onClick={onRetry} style={{ marginTop: 12 }}>
                Retry
            </Button>
        </div>
    );
}

function Toast({ kind, message }) {
    const colors = {
        error:   { bg: 'var(--error-bg)',   fg: 'var(--error)',   bd: 'var(--error)' },
        success: { bg: 'var(--success-bg)', fg: 'var(--success)', bd: 'var(--success)' },
    };
    const c = colors[kind] ?? colors.error;
    return (
        <div role="alert" style={{
            padding: '10px 14px',
            background: c.bg, color: c.fg,
            border: `1px solid ${c.bd}`,
            borderRadius: 8, fontSize: 13,
        }}>
            {message}
        </div>
    );
}

let _qid = 0;
function nid() { return `q_${++_qid}`; }
