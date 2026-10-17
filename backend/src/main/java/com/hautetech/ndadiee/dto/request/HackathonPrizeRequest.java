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
public class HackathonPrizeRequest {

    @NotBlank(message = "L'intitulé du prix est requis")
    @Size(max = 80, message = "L'intitulé du prix ne peut pas dépasser 80 caractères")
    private String title;

    @NotBlank(message = "La récompense est requise")
    @Size(max = 150, message = "La récompense ne peut pas dépasser 150 caractères")
    private String reward;
}
