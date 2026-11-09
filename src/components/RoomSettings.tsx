import type { RoomData } from '../lib/api';
import CreateRoomForm from './CreateRoomForm';

interface Props {
  data: RoomData;
  onSave: (input: { name: string; dates: string[]; dayStart: number; dayEnd: number }) => Promise<void>;
  onRegenerateInvite: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/** 방장 전용 설정 패널 */
export default function RoomSettings({ data, onSave, onRegenerateInvite, onDelete, onClose }: Props) {
  return (
    <section className="panel">
      <h2>방 설정</h2>
      <CreateRoomForm
        initial={{
          name: data.room.name,
          dates: data.dates,
          dayStart: data.room.dayStart,
          dayEnd: data.room.dayEnd,
        }}
        submitLabel="저장"
        onSubmit={onSave}
        onCancel={onClose}
      />
      <hr className="divider" />
      <div className="danger-zone">
        <div>
          <strong>초대 링크 다시 만들기</strong>
          <p className="muted small">기존 링크는 더 이상 쓸 수 없게 됩니다. 내보낸 멤버의 재참가를 막을 때 사용하세요.</p>
          <button className="btn" onClick={onRegenerateInvite}>
            초대 링크 재발급
          </button>
        </div>
        <div>
          <strong>방 삭제</strong>
          <p className="muted small">모든 멤버의 가능 시간과 곡 정보가 함께 삭제되며 되돌릴 수 없습니다.</p>
          <button className="btn danger" onClick={onDelete}>
            방 삭제
          </button>
        </div>
      </div>
    </section>
  );
}
