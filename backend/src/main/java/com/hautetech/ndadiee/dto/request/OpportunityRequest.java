package com.hautetech.ndadiee.dto.request;

import java.time.LocalDate;
import java.util.List;

import org.hibernate.validator.constraints.URL;

import com.hautetech.ndadiee.model.opportunity.OpportunityType;
import com.hautetech.ndadiee.model.opportunity.WorkMode;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class OpportunityRequest {

    @NotBlank(message = "Le titre est requis")
    @Size(min = 5, max = 200, message = "Le titre doit contenir entre 5 et 200 caractères")
    private String title;

    @NotBlank(message = "La description est requise")
    @Size(max = 20000, message = "La description ne peut pas dépasser 20000 caractères")
    private String description;

    @NotBlank(message = "Le nom de l'entreprise est requis")
    @Size(max = 150, message = "Le nom de l'entreprise ne peut pas dépasser 150 caractères")
    private String companyName;

    @URL(message = "L'URL du logo n'est pas valide")
    @Size(max = 500, message = "L'URL ne peut pas dépasser 500 caractères")
    private String companyLogoUrl;

    @NotNull(message = "Le type d'opportunité est requis")
    private OpportunityType type;

    @NotNull(message = "Le mode de travail est requis")
    private WorkMode workMode;

    @Pattern(regexp = "^[A-Za-z]{2}$", message = "Le pays doit être un code ISO à 2 lettres (SN, CI, NG...)")
    private String country;

    @Size(max = 100, message = "La ville ne peut pas dépasser 100 caractères")
    private String city;

    // Texte libre
    @Size(max = 100, message = "La fourchette de salaire ne peut pas dépasser 100 caractères")
    private String salaryRange;

    @URL(message = "L'URL de candidature n'est pas valide")
    @Size(max = 500, message = "L'URL ne peut pas dépasser 500 caractères")
    private String applyUrl;

    private LocalDate deadline;

    @Size(max = 8, message = "8 tags maximum")
    private List<@NotBlank(message = "Un tag ne peut pas être vide") @Size(max = 50, message = "Un tag ne peut pas dépasser 50 caractères") String> tags;
}
