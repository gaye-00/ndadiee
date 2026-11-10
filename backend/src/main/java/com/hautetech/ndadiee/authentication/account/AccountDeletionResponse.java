package com.hautetech.ndadiee.authentication.account;

import java.time.Instant;

/** La suppression est programmée : le compte sera effacé à cette date, sauf reconnexion d'ici là. */
public record AccountDeletionResponse(Instant scheduledAt) {
}
