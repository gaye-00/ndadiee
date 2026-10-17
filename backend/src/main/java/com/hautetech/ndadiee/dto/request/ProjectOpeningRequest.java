package com.hautetech.ndadiee.dto.request;

import com.hautetech.ndadiee.model.project.TeamRole;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProjectOpeningRequest {

    @NotNull(message = "Le rôle est requis")
    private TeamRole role;

    @NotBlank(message = "L'intitulé est requis")
    @Size(max = 120, message = "L'intitulé ne peut pas dépasser 120 caractères")
    private String title;

    @Size(max = 500, message = "La description ne peut pas dépasser 500 caractères")
    private String description;

    // Absent = 1
    @Min(value = 1, message = "Au moins une place")
    @Max(value = 20, message = "20 places au plus")
    private Integer seats;

    @Positive(message = "Le numéro d'issue doit être positif")
    private Integer starterIssueNumber;

    @Size(max = 200, message = "Le titre de l'issue ne peut pas dépasser 200 caractères")
    private String starterIssueTitle;
}
