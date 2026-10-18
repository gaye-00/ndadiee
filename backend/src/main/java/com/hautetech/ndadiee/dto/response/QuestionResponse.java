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
    private int readingMinutes;

    // Vote du membre connecté : +1, -1, ou null s'il n'a pas voté
    private Integer currentUserVote;

    // Le membre connecté l'a-t-il enregistré ? null pour un visiteur anonyme
    private Boolean bookmarkedByMe;

    // Masqué par l'administration : seuls son auteur et les admins reçoivent alors ce contenu, avec le motif
    private boolean hidden;
    private String hiddenReason;

    private Instant createdAt;
    private Instant updatedAt;
}
