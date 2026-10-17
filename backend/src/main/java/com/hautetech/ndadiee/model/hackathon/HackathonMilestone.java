package com.hautetech.ndadiee.model.hackathon;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Temps fort du programme d'un hackathon : « Coup d'envoi », « Démos devant le jury »… */
@Embeddable
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class HackathonMilestone {

    @Column(nullable = false)
    private Instant scheduledAt;

    @Column(nullable = false, length = 120)
    private String label;
}
