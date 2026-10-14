package com.hautetech.ndadiee.dto.request;

import java.util.List;

import org.hibernate.validator.constraints.URL;

import com.hautetech.ndadiee.model.Language;

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
public class ArticleRequest {

    @NotBlank(message = "Le titre est requis")
    @Size(min = 5, max = 200, message = "Le titre doit contenir entre 5 et 200 caractères")
    private String title;

    // Markdown
    @NotBlank(message = "Le contenu est requis")
    @Size(min = 50, max = 100000, message = "Le contenu doit contenir entre 50 et 100000 caractères")
    private String content;

    @URL(message = "L'URL de l'image de couverture n'est pas valide")
    @Size(max = 500, message = "L'URL ne peut pas dépasser 500 caractères")
    private String coverImageUrl;

    @Size(max = 5, message = "5 tags maximum")
    private List<@NotBlank(message = "Un tag ne peut pas être vide") @Size(max = 50, message = "Un tag ne peut pas dépasser 50 caractères") String> tags;

    // FR par défaut
    private Language language;

    // true = publié ; false ou absent = brouillon
    private Boolean publish;
}
