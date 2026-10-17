package com.hautetech.ndadiee.dto.response;

import com.hautetech.ndadiee.model.project.MediaKind;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProjectMediaResponse {

    private Long id;
    private MediaKind kind;
    // Adresses complètes (MediaUrls)
    private String url;
    private String thumbnailUrl;
    private String caption;
    private String credit;
    private String sourceUrl;
    private Integer width;
    private Integer height;
}
