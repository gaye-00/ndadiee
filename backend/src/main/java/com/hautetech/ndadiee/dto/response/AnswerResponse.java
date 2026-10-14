package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AnswerResponse {

    private Long id;
    private String body;
    private Long questionId;
    private UserSummaryResponse author;
    private int score;
    private boolean accepted;

    // Vote du membre connecté : +1, -1, ou null s'il n'a pas voté
    private Integer currentUserVote;

    private Instant createdAt;
    private Instant updatedAt;
}
