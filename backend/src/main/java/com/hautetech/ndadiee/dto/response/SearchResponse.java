package com.hautetech.ndadiee.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SearchResponse {

    private String query;

    // Seules les catégories demandées (paramètre type) sont présentes
    private PageResponse<QuestionSummaryResponse> questions;
    private PageResponse<ArticleSummaryResponse> articles;
    private PageResponse<ProjectResponse> projects;
    private PageResponse<UserSummaryResponse> users;
}
