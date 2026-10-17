package com.hautetech.ndadiee.dto.request;

import java.time.Instant;
import java.util.List;

import com.hautetech.ndadiee.model.opportunity.WorkMode;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Publication ou modification d'un hackathon. L'ordre des dates est vérifié par HackathonService. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class HackathonRequest {

    @NotBlank(message = "Le titre est requis")
    @Size(min = 5, max = 120, message = "Le titre doit contenir entre 5 et 120 caractères")
    private String title;

    @Size(max = 200, message = "L'accroche ne peut pas dépasser 200 caractères")
    private String tagline;

    @NotBlank(message = "La description est requise")
    @Size(max = 20000, message = "La description ne peut pas dépasser 20000 caractères")
    private String description;

    @NotBlank(message = "L'organisateur est requis")
    @Size(max = 150, message = "Le nom de l'organisateur ne peut pas dépasser 150 caractères")
    private String organizerName;

    @NotNull(message = "Le format est requis")
    private WorkMode format;

    @Pattern(regexp = "^[A-Za-z]{2}$", message = "Le pays doit être un code ISO à 2 lettres (SN, CI, NG...)")
    private String country;

    @Size(max = 100, message = "La ville ne peut pas dépasser 100 caractères")
    private String city;

    // Identifiant IANA : « Africa/Abidjan »
    @NotBlank(message = "Le fuseau horaire est requis")
    @Size(max = 40, message = "Le fuseau horaire ne peut pas dépasser 40 caractères")
    private String timezone;

    @NotNull(message = "La date de début est requise")
    private Instant startsAt;

    @NotNull(message = "La date de fin est requise")
    private Instant endsAt;

    @NotNull(message = "La clôture des inscriptions est requise")
    private Instant registrationClosesAt;

    @Size(max = 100, message = "La dotation ne peut pas dépasser 100 caractères")
    private String prizePool;

    @NotNull(message = "La taille minimale des équipes est requise")
    @Min(value = 1, message = "Une équipe compte au moins une personne")
    @Max(value = 20, message = "20 personnes au plus par équipe")
    private Integer minTeamSize;

    @NotNull(message = "La taille maximale des équipes est requise")
    @Min(value = 1, message = "Une équipe compte au moins une personne")
    @Max(value = 20, message = "20 personnes au plus par équipe")
    private Integer maxTeamSize;

    // Absent : pas de limite
    @Min(value = 2, message = "Au moins deux équipes")
    private Integer maxTeams;

    @Size(max = 8, message = "8 tags maximum")
    private List<@NotBlank(message = "Un tag ne peut pas être vide") @Size(max = 50, message = "Un tag ne peut pas dépasser 50 caractères") String> tags;

    @Size(max = 20, message = "20 temps forts au plus")
    private List<@Valid HackathonMilestoneRequest> schedule;

    @Size(max = 10, message = "10 prix au plus")
    private List<@Valid HackathonPrizeRequest> prizes;
}
