package com.hautetech.ndadiee.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Les e-mails que le membre veut recevoir. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class EmailPreferencesRequest {

    // Un commentaire sur sa PR ou dans une discussion où il a écrit, un verdict sur sa PR, sa revue jugée utile
    @NotNull(message = "Le choix des e-mails de revue est requis")
    private Boolean reviewEmails;
}
