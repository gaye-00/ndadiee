package com.hautetech.ndadiee.dto.response;

import java.time.LocalDate;

/**
 * Les contributions d'un membre un jour donné (carte de ses contributions).
 *
 * @param date  le jour, en UTC (« 2026-10-18 »)
 * @param count ce qu'il a fait de visible ce jour-là
 */
public record ContributionDayResponse(LocalDate date, long count) {
}
