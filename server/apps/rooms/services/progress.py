"""Starea votului: cine a terminat, trecerea camerei în RESULTS."""
from ..models import Room, RoomMember


def refresh_member_finished(member: RoomMember) -> bool:
    """Marchează participantul ca „terminat” dacă a votat tot pachetul."""
    total = member.room.deck.count()
    done = member.votes.count()
    finished = total > 0 and done >= total
    if finished != member.finished_voting:
        member.finished_voting = finished
        member.save(update_fields=["finished_voting"])
    return finished


def maybe_finish_room(room: Room) -> bool:
    """Dacă toți participanții au terminat, camera trece automat în RESULTS."""
    if room.status != Room.Status.VOTING:
        return False
    members = room.members.all()
    if members and all(m.finished_voting for m in members):
        room.status = Room.Status.RESULTS
        room.save(update_fields=["status"])
        return True
    return False
