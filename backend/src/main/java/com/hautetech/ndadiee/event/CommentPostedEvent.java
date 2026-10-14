package com.hautetech.ndadiee.event;

import com.hautetech.ndadiee.model.ContentType;

public record CommentPostedEvent(Long commentId, ContentType targetType, Long targetId, Long targetOwnerId, Long authorId) {
}
