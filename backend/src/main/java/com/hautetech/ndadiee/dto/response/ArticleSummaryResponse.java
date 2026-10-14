package com.hautetech.ndadiee.dto.response;

import java.time.Instant;
import java.util.List;

import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.content.ArticleStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ArticleSummaryResponse {

    private Long id;
    private String title;
    private String slug;
    private String excerpt;
    private String coverImageUrl;
    private int readingTimeMinutes;
    private UserSummaryResponse author;
    private List<TagResponse> tags;
    private Language language;
    private ArticleStatus status;
    private int score;
    private int viewCount;

    // null tant que l'article est un brouillon
    private Instant publishedAt;
    private Instant createdAt;
}
