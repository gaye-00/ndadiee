package com.hautetech.ndadiee.dto.request;

import com.hautetech.ndadiee.model.message.Message;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MessageRequest {

    @NotBlank(message = "Le message est vide")
    @Size(max = Message.MAX_LENGTH, message = "Un message ne peut pas dépasser 4000 caractères")
    private String body;

    /**
     * Identifiant choisi par l'application (UUID) : elle reconnaît son message quand il revient par le WebSocket, et un
     * envoi répété ne crée pas de doublon. Facultatif.
     */
    @Pattern(regexp = "^[A-Za-z0-9-]{8,36}$", message = "Identifiant client invalide")
    private String clientId;
}
