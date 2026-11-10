package com.hautetech.ndadiee.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.response.CommunityStatsResponse;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.repository.ProjectOpeningRepository;
import com.hautetech.ndadiee.repository.ProjectRepository;

import lombok.RequiredArgsConstructor;

/**
 * Chiffres de la communauté, comptés en base à chaque demande (cinq requêtes simples). Ni les comptes suspendus
 * ni les projets masqués par l'administration n'y comptent.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StatsService {

    private final DeveloperRepository developerRepository;
    private final ProjectRepository projectRepository;
    private final ProjectOpeningRepository openingRepository;

    public CommunityStatsResponse community() {
        return CommunityStatsResponse.builder()
                .developers(developerRepository.countByBlockedAtIsNullAndDeletedAtIsNull())
                .countries(developerRepository.countCountries())
                .projects(projectRepository.countByHiddenAtIsNull())
                .openings(openingRepository.countOpen())
                .seats(openingRepository.sumOpenSeats())
                .build();
    }
}
