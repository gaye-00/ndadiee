package com.hautetech.ndadiee.dto.request;

import com.hautetech.ndadiee.model.message.Message;

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
public class MessageUpdateRequest {

    @NotBlank(message = "Le message est vide")
    @Size(max = Message.MAX_LENGTH, message = "Un message ne peut pas dépasser 4000 caractères")
    private String body;
}
