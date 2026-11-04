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
public class UploadResponse {

    // Adresse publique du fichier, à écrire telle quelle dans le Markdown
    private String url;
    // Image de projet : sa miniature (640 px) ; absente pour une image du forum
    private String thumbnailUrl;
    private String contentType;
    // Taille en octets
    private long size;
}
