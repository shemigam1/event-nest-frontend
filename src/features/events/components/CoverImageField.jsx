import { useRef, useState } from 'react';
import { usePresignCoverImageMutation } from '../eventsApi';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png'];

/**
 * Cover image upload control.
 *
 * Two modes:
 *   * Immediate (default): pass {@code eventId}. The picked file uploads
 *     to {@code POST /events/{id}/cover-image} right away. Used on the
 *     Edit screen, where the event already exists.
 *   * Deferred: pass {@code onPickFile} instead of {@code eventId}. The
 *     component validates client-side and hands the File back to the
 *     parent without touching the network. The Create flow uses this —
 *     the parent uploads the file after createEvent returns an id.
 *
 * Validates client-side (type + size) so the user gets immediate feedback;
 * the backend re-validates magic bytes on upload.
 */
export default function CoverImageField({
    eventId,
    currentUrl,
    disabled = false,
    onPickFile,   // deferred mode — called with the validated File
}) {
    const fileRef = useRef(null);
    const [presignCover] = usePresignCoverImageMutation();
    const [uploading, setUploading] = useState(false);
    const [localError, setLocalError] = useState('');
    const [previewUrl, setPreviewUrl] = useState(currentUrl ?? null);
    const isDeferred = typeof onPickFile === 'function';

    async function handleFile(file) {
        setLocalError('');
        if (!file) return;
        if (!ACCEPTED.includes(file.type)) {
            setLocalError('Only JPEG or PNG images are accepted.');
            return;
        }
        if (file.size > MAX_BYTES) {
            setLocalError('Image must be 5MB or smaller.');
            return;
        }

        // Optimistic preview from a local object URL so the user sees the
        // change before the round-trip finishes.
        const localUrl = URL.createObjectURL(file);
        setPreviewUrl(localUrl);

        // Deferred mode — hand the file back; no network call here.
        if (isDeferred) {
            onPickFile(file);
            return;
        }

        setUploading(true);
        try {
            // 1. Get presigned upload URL; backend saves publicUrl on the event immediately.
            const { uploadUrl, publicUrl } = await presignCover({
                eventId,
                contentType: file.type,
            }).unwrap();

            // 2. PUT raw bytes directly to S3 (or local-dev endpoint).
            //    No auth header — the signed URL carries all credentials.
            const res = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file,
            });
            if (!res.ok) throw new Error(`Upload failed: ${res.status}`);

            URL.revokeObjectURL(localUrl);
            setPreviewUrl(publicUrl);
        } catch (err) {
            setPreviewUrl(currentUrl ?? null);
            URL.revokeObjectURL(localUrl);
            setLocalError(err?.data?.message || err?.message || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    }

    const onPick = () => fileRef.current?.click();
    const onChange = (e) => handleFile(e.target.files?.[0]);

    return (
        <div>
            <label style={{
                display: 'block', fontSize: 14, fontWeight: 500,
                color: 'var(--text-1)', marginBottom: 6,
            }}>
                Cover image
                <span style={{
                    marginLeft: 8, fontWeight: 400, fontSize: 12, color: 'var(--text-3)',
                }}>
                    Optional · JPEG or PNG, max 5MB
                </span>
            </label>

            <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={onChange}
                disabled={disabled || uploading}
                style={{ display: 'none' }}
            />

            {previewUrl ? (
                <div style={{
                    border: '1px solid var(--border)', borderRadius: 12, padding: 12,
                    background: 'white',
                }}>
                    <div style={{
                        position: 'relative',
                        aspectRatio: '16 / 9',
                        borderRadius: 8, overflow: 'hidden',
                        background: 'var(--surface-subtle)',
                    }}>
                        <img
                            src={previewUrl}
                            alt="Event cover"
                            style={{
                                width: '100%', height: '100%', objectFit: 'cover',
                                display: 'block',
                            }}
                        />
                    </div>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        marginTop: 10, gap: 12,
                    }}>
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            {uploading
                                ? 'Uploading…'
                                : isDeferred
                                    ? 'Will upload after the event is created'
                                    : 'Cover saved'}
                        </span>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={onPick}
                            disabled={disabled || uploading}
                        >
                            Replace
                        </Button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={onPick}
                    disabled={disabled || uploading}
                    style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        gap: 8,
                        width: '100%', minHeight: 160, padding: 24,
                        background: 'white',
                        border: '2px dashed var(--border)', borderRadius: 12,
                        color: 'var(--text-2)', fontSize: 14,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                    }}
                >
                    <Icons.plus size={20} style={{ color: 'var(--text-3)' }} />
                    <span style={{ fontWeight: 500, color: 'var(--text-1)' }}>
                        {uploading ? 'Uploading…' : 'Upload cover image'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        Click to browse — JPEG or PNG, max 5MB
                    </span>
                </button>
            )}

            {localError && (
                <p role="alert" style={{
                    margin: '8px 0 0', fontSize: 13, color: 'var(--error)',
                }}>
                    {localError}
                </p>
            )}
        </div>
    );
}
