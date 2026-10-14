package com.hautetech.ndadiee.dto.request;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class QuestionRequest {

    @NotBlank(message = "Le titre est requis")
    @Size(min = 10, max = 200, message = "Le titre doit contenir entre 10 et 200 caractères")
    private String title;

    // Markdown
    @NotBlank(message = "Le contenu est requis")
    @Size(min = 20, max = 30000, message = "Le contenu doit contenir entre 20 et 30000 caractères")
    private String body;

    @NotEmpty(message = "Au moins un tag est requis")
    @Size(max = 5, message = "5 tags maximum")
    private List<@NotBlank(message = "Un tag ne peut pas être vide") @Size(max = 50, message = "Un tag ne peut pas dépasser 50 caractères") String> tags;
}
