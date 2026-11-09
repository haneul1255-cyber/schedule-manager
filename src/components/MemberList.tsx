import type { RoomMember } from '../lib/api';

interface Props {
  members: RoomMember[];
  meId: number;
  isOwner: boolean;
  onTransfer: (m: RoomMember) => void;
  onKick: (m: RoomMember) => void;
}

export default function MemberList({ members, meId, isOwner, onTransfer, onKick }: Props) {
  return (
    <ul className="member-list">
      {members.map((m) => (
        <li key={m.id} className="member-chip">
          <span>
            {m.displayName}
            {m.id === meId && <span className="muted"> (나)</span>}
          </span>
          {m.role === 'owner' && <span className="badge">방장</span>}
          {isOwner && m.id !== meId && (
            <span className="member-actions">
              <button className="link-btn" onClick={() => onTransfer(m)}>
                방장 넘기기
              </button>
              <button className="link-btn danger" onClick={() => onKick(m)}>
                내보내기
              </button>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
