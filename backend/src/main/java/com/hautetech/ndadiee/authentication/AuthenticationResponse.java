package com.hautetech.ndadiee.authentication;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AuthenticationResponse {

    private String accessToken;
    private String refreshToken;
    private UserResponse user;
    // Le compte devait être supprimé : cette connexion a annulé la suppression (la page le dit)
    private boolean deletionCancelled;
}
