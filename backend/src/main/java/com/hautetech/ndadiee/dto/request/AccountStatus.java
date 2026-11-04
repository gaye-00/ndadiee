package com.hautetech.ndadiee.dto.request;

/** Filtre des comptes du back-office : actifs, ou suspendus par l'administration. */
/** Cette énumération permet de distinguer les comptes actifs des comptes bloqués par l'administration. */
public enum AccountStatus {
    ACTIVE,
    BLOCKED
}
