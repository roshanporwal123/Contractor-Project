import StarRating from './StarRating';

const colors = { pending: '#f0ad4e', approved: '#28a745', rejected: '#dc3545' };

export default function ReviewCard({ review, showStatus = false, canModerate = false, onModerate, onDelete }) {
  const target =
    review.reviewType === 'contractor'
      ? `Contractor: ${review.contractor?.name || review.contractor?.fullName || '—'}`
      : `Project: ${review.project?.name || '—'}`;

  return (
    <div style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: 14, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <StarRating value={review.rating} readOnly size={18} />
        {showStatus && (
          <span style={{ background: colors[review.status], color: '#fff', padding: '2px 10px', borderRadius: 12, fontSize: 12 }}>
            {review.status}
          </span>
        )}
      </div>

      {review.title && <h4 style={{ margin: '8px 0 4px' }}>{review.title}</h4>}
      {review.comment && <p style={{ margin: '4px 0' }}>{review.comment}</p>}

      <small style={{ color: '#666' }}>
        {target} • by {review.reviewer?.name || 'You'} • {new Date(review.createdAt).toLocaleDateString()}
      </small>

      {review.moderationNote && (
        <p style={{ color: '#a00', fontSize: 13, margin: '6px 0 0' }}>Note: {review.moderationNote}</p>
      )}

      {(canModerate || onDelete) && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canModerate && review.status !== 'approved' && (
            <button onClick={() => onModerate(review._id, 'approved')}>Approve</button>
          )}
          {canModerate && review.status !== 'rejected' && (
            <button onClick={() => onModerate(review._id, 'rejected')}>Reject</button>
          )}
          {onDelete && <button onClick={() => onDelete(review._id)}>Delete</button>}
        </div>
      )}
    </div>
  );
}