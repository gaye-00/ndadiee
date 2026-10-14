package com.hautetech.ndadiee.dto.request;

import java.util.List;

import org.hibernate.validator.constraints.URL;

import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.user.ExperienceLevel;

import jakarta.validation.constraints.NotBlank;
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
public class UpdateProfileRequest {

    @NotBlank(message = "Le nom complet est requis")
    @Size(max = 100, message = "Le nom complet ne peut pas dépasser 100 caractères")
    private String fullName;

    @Size(max = 1000, message = "La bio ne peut pas dépasser 1000 caractères")
    private String bio;

    @URL(message = "L'URL de l'avatar n'est pas valide")
    @Size(max = 500, message = "L'URL ne peut pas dépasser 500 caractères")
    private String avatarUrl;

    @Pattern(regexp = "^[A-Za-z]{2}$", message = "Le pays doit être un code ISO à 2 lettres (SN, CI, NG...)")
    private String country;

    @Size(max = 100, message = "La ville ne peut pas dépasser 100 caractères")
    private String city;

    private Language preferredLanguage;

    @URL(message = "L'URL GitHub n'est pas valide")
    @Size(max = 500, message = "L'URL ne peut pas dépasser 500 caractères")
    private String githubUrl;

    @URL(message = "L'URL LinkedIn n'est pas valide")
    @Size(max = 500, message = "L'URL ne peut pas dépasser 500 caractères")
    private String linkedinUrl;

    @URL(message = "L'URL du site n'est pas valide")
    @Size(max = 500, message = "L'URL ne peut pas dépasser 500 caractères")
    private String websiteUrl;

    private ExperienceLevel level;

    // Absent = false
    private Boolean openToWork;

    @Size(max = 15, message = "15 compétences maximum")
    private List<@NotBlank(message = "Une compétence ne peut pas être vide") @Size(max = 50, message = "Une compétence ne peut pas dépasser 50 caractères") String> skills;
}
