package com.hautetech.ndadiee.service.badge;

import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.response.BadgeResponse;
import com.hautetech.ndadiee.event.BadgeEarnedEvent;
import com.hautetech.ndadiee.mapper.BadgeMapper;
import com.hautetech.ndadiee.model.badge.Badge;
import com.hautetech.ndadiee.model.badge.BadgeType;
import com.hautetech.ndadiee.model.badge.UserBadge;
import com.hautetech.ndadiee.repository.BadgeRepository;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.repository.UserBadgeRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/** Attribue automatiquement les badges du catalogue {@link BadgeType}. */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class BadgeService {

    private final BadgeRepository badgeRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final DeveloperRepository developerRepository;
    private final BadgeMapper badgeMapper;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional(readOnly = true)
    public List<BadgeResponse> getAll() {
        return badgeMapper.toResponses(badgeRepository.findAllByOrderByIdAsc());
    }

    /** Crée en base les badges du catalogue qui n'y sont pas encore. Appelé au démarrage. */
    public void syncCatalog() {
        for (BadgeType type : BadgeType.values()) {
            findOrCreate(type);
        }
    }

    /** Attribue le badge au membre s'il ne l'a pas déjà : peut être appelé sans précaution. */
    public void award(Long developerId, BadgeType type) {
        Badge badge = findOrCreate(type);
        if (userBadgeRepository.existsByUserIdAndBadgeId(developerId, badge.getId())) {
            return;
        }

        userBadgeRepository.save(UserBadge.builder()
                .user(developerRepository.getReferenceById(developerId))
                .badge(badge)
                .build());
        log.info("[Badge] « {} » attribué au membre {}", badge.getName(), developerId);
        eventPublisher.publishEvent(new BadgeEarnedEvent(developerId, badge.getId()));
    }

    /** Attribue les badges dont le seuil de réputation est atteint. */
    public void checkReputationBadges(Long developerId) {
        int reputation = developerRepository.findReputation(developerId);
        for (BadgeType type : BadgeType.values()) {
            if (type.getReputationThreshold() > 0 && reputation >= type.getReputationThreshold()) {
                award(developerId, type);
            }
        }
    }

    // ==================== HELPERS ====================

    private Badge findOrCreate(BadgeType type) {
        return badgeRepository.findByName(type.getLabel())
                .orElseGet(() -> badgeRepository.save(Badge.builder()
                        .name(type.getLabel())
                        .description(type.getDescription())
                        .criteria(type.getCriteria())
                        .build()));
    }
}
