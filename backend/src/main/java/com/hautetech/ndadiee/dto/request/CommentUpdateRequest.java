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
public class CommentUpdateRequest {

    @NotBlank(message = "Le commentaire est requis")
    @Size(max = 2000, message = "Le commentaire ne peut pas dépasser 2000 caractères")
    private String body;
}
