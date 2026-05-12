import { useRef, useState } from 'react';
import { useUploadCoverImageMutation } from '../eventsApi';
import Button from '@/components/ui/Button';
import { Icons } from '@/components/ui/Icon';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png'];

/**
 * Cover image upload control for the event edit form.
 *
 * Doesn't render until the event has been saved (we need an eventId for
 * the upload endpoint). On CreateEventPage, callers can either hide this
 * component until after first save, or show a stub explaining the upload
 * unlocks once the draft is saved.
 *
 * Validates client-side (type + size) so the user gets immediate feedback;
 * the backend re-validates including magic-bytes.
 */
export default function CoverImageField({ eventId, currentUrl, disabled = false }) {
    const fileRef = useRef(null);
    const [uploadCover, uploadState] = useUploadCoverImageMutation();
    const [localError, setLocalError] = useState('');
    const [previewUrl, setPreviewUrl] = useState(currentUrl ?? null);

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

        try {
            const result = await uploadCover({ eventId, file }).unwrap();
            const newUrl = result?.coverImageUrl ?? result?.data?.coverImageUrl;
            if (newUrl) setPreviewUrl(newUrl);
            URL.revokeObjectURL(localUrl);
        } catch (err) {
            setPreviewUrl(currentUrl ?? null);
            URL.revokeObjectURL(localUrl);
            setLocalError(err?.data?.message || 'Upload failed. Please try again.');
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
                disabled={disabled || uploadState.isLoading}
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
                            {uploadState.isLoading ? 'Uploading…' : 'Cover saved'}
                        </span>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={onPick}
                            disabled={disabled || uploadState.isLoading}
                        >
                            Replace
                        </Button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={onPick}
                    disabled={disabled || uploadState.isLoading}
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
                        {uploadState.isLoading ? 'Uploading…' : 'Upload cover image'}
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
