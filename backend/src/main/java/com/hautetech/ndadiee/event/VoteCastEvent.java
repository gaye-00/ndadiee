package com.hautetech.ndadiee.event;

import com.hautetech.ndadiee.model.ContentType;

/** oldValue / newValue valent +1, -1, ou 0 pour « pas de vote ». */
public record VoteCastEvent(ContentType targetType, Long targetId, Long targetOwnerId, Long voterId, int oldValue, int newValue) {
}
