import { RECORD_LABELS } from '../utils/format.js';

export default function PrBadge({ type, children = 'New PR!' }) {
  return (
    <span className="badge badge-pr" title={type ? RECORD_LABELS[type] : undefined}>
      {children}
    </span>
  );
}
