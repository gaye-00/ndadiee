package com.hautetech.ndadiee.dto.request;

import com.hautetech.ndadiee.model.project.TeamRole;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Le rôle qu'un membre tient dans l'équipe (« mobile », « data ») ; absent, il n'en affiche aucun. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MemberSpecialtyRequest {

    private TeamRole specialty;
}
