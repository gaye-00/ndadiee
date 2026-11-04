package com.hautetech.ndadiee.dto.request;

import java.time.Instant;

import org.hibernate.validator.constraints.URL;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Un rendez-vous de l'équipe, épinglé dans la discussion : « Pair programming : cache Redis », aujourd'hui à 15 h. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TeamEventRequest {

    @NotBlank(message = "Le titre est requis")
    @Size(max = 120, message = "Le titre ne peut pas dépasser 120 caractères")
    private String title;

    @NotNull(message = "L'heure est requise")
    private Instant startsAt;

    @NotNull(message = "La durée est requise")
    @Min(value = 15, message = "Un rendez-vous dure au moins 15 minutes")
    @Max(value = 480, message = "Un rendez-vous dure 8 heures au plus")
    private Integer durationMinutes;

    // L'appel où se retrouver (Meet, Jitsi…)
    @URL(protocol = "https", message = "Le lien doit être une adresse https")
    @Size(max = 500, message = "Le lien ne peut pas dépasser 500 caractères")
    private String link;
}
