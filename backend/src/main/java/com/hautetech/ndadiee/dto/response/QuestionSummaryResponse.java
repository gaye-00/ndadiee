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
public class QuestionSummaryResponse {

    private Long id;
    private String title;
    private String slug;
    private String excerpt;
    private UserSummaryResponse author;
    private List<TagResponse> tags;
    private int viewCount;
    private int score;
    private int answerCount;
    private boolean hasAcceptedAnswer;
    private QuestionStatus status;
    private Instant createdAt;
}
