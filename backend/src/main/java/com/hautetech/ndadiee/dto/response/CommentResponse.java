package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import com.hautetech.ndadiee.model.ContentType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CommentResponse {

    private Long id;
    private String body;
    private UserSummaryResponse author;
    private ContentType targetType;
    private Long targetId;
    private Instant createdAt;
    private Instant updatedAt;
}
