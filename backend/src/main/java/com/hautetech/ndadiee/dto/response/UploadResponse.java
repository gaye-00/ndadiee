package com.hautetech.ndadiee.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UploadResponse {

    // Adresse publique du fichier, à écrire telle quelle dans le Markdown
    private String url;
    private String contentType;
    // Taille en octets
    private long size;
}
