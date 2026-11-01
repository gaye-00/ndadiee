package com.hautetech.ndadiee.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Une tranche d'une conversation, du plus ancien au plus récent ; la suivante s'obtient avec before = le premier. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MessageSliceResponse {

    private List<MessageResponse> messages;

    // Des messages plus anciens restent à lire
    private boolean hasMore;
}
