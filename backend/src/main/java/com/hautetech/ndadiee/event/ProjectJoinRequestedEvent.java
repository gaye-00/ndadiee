package com.hautetech.ndadiee.event;

public record ProjectJoinRequestedEvent(Long projectId, Long ownerId, Long requesterId) {
}
