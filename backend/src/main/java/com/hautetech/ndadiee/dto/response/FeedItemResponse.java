package com.hautetech.ndadiee.dto.response;

import java.time.Instant;
import java.util.List;

import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.model.Language;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class FeedItemResponse {

    // QUESTION, ARTICLE ou PROJECT
    private ContentType type;
    private Long id;
    private String slug;
    private String title;
    private String excerpt;
    private UserSummaryResponse author;
    private List<TagResponse> tags;

    // Score des votes (nombre d'étoiles pour un projet)
    private int score;

    // Selon le type : null quand le champ n'existe pas pour ce contenu
    private String coverImageUrl;
    private Integer viewCount;
    private Integer answerCount;
    private Language language;

    private Instant createdAt;
}
