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
public class AnswerRequest {

    // Markdown
    @NotBlank(message = "La réponse est requise")
    @Size(min = 10, max = 30000, message = "La réponse doit contenir entre 10 et 30000 caractères")
    private String body;
}
