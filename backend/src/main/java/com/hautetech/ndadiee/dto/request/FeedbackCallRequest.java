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
public class FeedbackCallRequest {

    @NotBlank(message = "Le titre est requis")
    @Size(max = 140, message = "Le titre ne peut pas dépasser 140 caractères")
    private String title;

    @Size(max = 500, message = "La consigne ne peut pas dépasser 500 caractères")
    private String prompt;
}
