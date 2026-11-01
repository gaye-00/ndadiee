package com.hautetech.ndadiee.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Un commentaire de revue : dans la conversation, ou sur une ligne du diff (le fichier et la ligne ensemble). */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ReviewCommentRequest {

    public static final int MAX_BODY = 10_000;

    @NotBlank(message = "Le commentaire est requis")
    @Size(max = MAX_BODY, message = "Le commentaire ne peut pas dépasser 10 000 caractères")
    private String body;

    // Le fichier, tel que le diff l'écrit
    @Size(max = 300, message = "Chemin de fichier trop long")
    private String path;

    // La ligne, dans la nouvelle version du fichier
    @Positive(message = "Numéro de ligne invalide")
    private Integer line;

    // Le code proposé à la place de la ligne
    @Size(max = MAX_BODY, message = "La suggestion ne peut pas dépasser 10 000 caractères")
    private String suggestion;

    @AssertTrue(message = "Un commentaire de ligne donne le fichier et la ligne")
    public boolean isLocated() {
        return (path == null || path.isBlank()) == (line == null);
    }

    @AssertTrue(message = "Une suggestion se fait sur une ligne du diff")
    public boolean isSuggestionOnLine() {
        return suggestion == null || line != null;
    }
}
