package com.hautetech.ndadiee.event;

/** Un membre a quitté l'équipe d'un projet, de lui-même ou retiré par qui la gère. */
public record ProjectMemberLeftEvent(Long projectId, Long userId) {
}
