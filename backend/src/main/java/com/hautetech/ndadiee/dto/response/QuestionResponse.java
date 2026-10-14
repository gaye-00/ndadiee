package com.hautetech.ndadiee.dto.response;

import java.time.Instant;
import java.util.List;

import com.hautetech.ndadiee.model.content.QuestionStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class QuestionResponse {

    private Long id;
    private String title;
    private String slug;
    private String body;
    private UserSummaryResponse author;
    private List<TagResponse> tags;
    private int viewCount;
    private int score;
    private int answerCount;
    private Long acceptedAnswerId;
    private QuestionStatus status;

    // Vote du membre connecté : +1, -1, ou null s'il n'a pas voté
    private Integer currentUserVote;

    private Instant createdAt;
    private Instant updatedAt;
}
