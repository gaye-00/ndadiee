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
public class StartConversationRequest {

    // Le membre à qui écrire
    @NotBlank(message = "Le destinataire est requis")
    @Size(max = 30, message = "Nom d'utilisateur invalide")
    private String username;
}
