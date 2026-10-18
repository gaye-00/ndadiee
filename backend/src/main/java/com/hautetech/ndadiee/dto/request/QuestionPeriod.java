package com.hautetech.ndadiee.dto.request;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/** Période du classement « Top » du forum : les sujets publiés depuis une semaine, un mois ou un an. */
public enum QuestionPeriod {
    WEEK(7),
    MONTH(30),
    YEAR(365);

    private final int days;

    QuestionPeriod(int days) {
        this.days = days;
    }

    /** Début de la période, qui se termine maintenant. */
    public Instant since(Instant now) {
        return now.minus(days, ChronoUnit.DAYS);
    }
}
