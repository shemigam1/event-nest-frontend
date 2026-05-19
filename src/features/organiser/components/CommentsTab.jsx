import CommentSection from '@/features/comments/components/CommentSection';

export default function CommentsTab({ eventId, isOrganiser = true }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{
        background: 'white', border: '1px solid var(--border)',
        borderRadius: 12, padding: '16px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 15 }}>Event discussion</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            Comments posted by attendees on the public event page. As organiser you can moderate and delete.
          </div>
        </div>
      </div>
      <CommentSection
        eventId={eventId}
        eventStatus="PUBLISHED"
        canModerate={isOrganiser}
      />
    </div>
  );
}
