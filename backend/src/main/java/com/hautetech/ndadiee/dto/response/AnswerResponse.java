package com.hautetech.ndadiee.dto.response;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

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

    // Masqué par l'administration : seuls son auteur et les admins reçoivent alors ce contenu, avec le motif
    private boolean hidden;
    private String hiddenReason;

    // Les commentaires de la réponse, du plus ancien au plus récent : son fil de discussion
    @Builder.Default
    private List<CommentResponse> comments = new ArrayList<>();

    private Instant createdAt;
    private Instant updatedAt;
}
