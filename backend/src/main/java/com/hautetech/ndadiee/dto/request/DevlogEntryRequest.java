package com.hautetech.ndadiee.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DevlogEntryRequest {

    // Version publiée, quand c'en est une : « v0.7 »
    @Size(max = 30, message = "La version ne peut pas dépasser 30 caractères")
    private String version;

    @NotBlank(message = "Le texte est requis")
    @Size(max = 1000, message = "Le texte ne peut pas dépasser 1000 caractères")
    private String body;
}
