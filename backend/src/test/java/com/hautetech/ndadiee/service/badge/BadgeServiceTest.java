package com.hautetech.ndadiee.service.badge;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import com.hautetech.ndadiee.event.BadgeEarnedEvent;
import com.hautetech.ndadiee.mapper.BadgeMapper;
import com.hautetech.ndadiee.model.badge.Badge;
import com.hautetech.ndadiee.model.badge.BadgeType;
import com.hautetech.ndadiee.model.badge.UserBadge;
import com.hautetech.ndadiee.repository.BadgeRepository;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.repository.UserBadgeRepository;

/** Attribution automatique des badges : une seule fois, et aux bons seuils de réputation. */
@ExtendWith(MockitoExtension.class)
class BadgeServiceTest {

    private static final Long DEVELOPER = 4L;

    @Mock
    private BadgeRepository badgeRepository;

    @Mock
    private UserBadgeRepository userBadgeRepository;

    @Mock
    private DeveloperRepository developerRepository;

    @Mock
    private BadgeMapper badgeMapper;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private BadgeService badgeService;

    // Chaque badge du catalogue existe en base, avec l'ordinal de son type pour identifiant
    private void givenTheCatalogExists() {
        when(badgeRepository.findByName(anyString())).thenAnswer(invocation -> {
            String label = invocation.getArgument(0);
            for (BadgeType type : BadgeType.values()) {
                if (type.getLabel().equals(label)) {
                    return Optional.of(Badge.builder().id((long) type.ordinal()).name(label).build());
                }
            }
            return Optional.empty();
        });
    }

    private static Long idOf(BadgeType type) {
        return (long) type.ordinal();
    }

    @Test
    void awardsTheBadgeAndAnnouncesIt() {
        givenTheCatalogExists();
        when(userBadgeRepository.existsByUserIdAndBadgeId(DEVELOPER, idOf(BadgeType.FIRST_ANSWER))).thenReturn(false);

        badgeService.award(DEVELOPER, BadgeType.FIRST_ANSWER);

        ArgumentCaptor<UserBadge> saved = ArgumentCaptor.forClass(UserBadge.class);
        verify(userBadgeRepository).save(saved.capture());
        assertThat(saved.getValue().getBadge().getName()).isEqualTo(BadgeType.FIRST_ANSWER.getLabel());
        verify(eventPublisher).publishEvent(new BadgeEarnedEvent(DEVELOPER, idOf(BadgeType.FIRST_ANSWER)));
    }

    @Test
    void neverAwardsTheSameBadgeTwice() {
        givenTheCatalogExists();
        when(userBadgeRepository.existsByUserIdAndBadgeId(DEVELOPER, idOf(BadgeType.FIRST_ANSWER))).thenReturn(true);

        badgeService.award(DEVELOPER, BadgeType.FIRST_ANSWER);

        verify(userBadgeRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void createsTheBadgeWhenItIsMissingFromTheDatabase() {
        when(badgeRepository.findByName(BadgeType.FIRST_PROJECT.getLabel())).thenReturn(Optional.empty());
        when(badgeRepository.save(any(Badge.class))).thenAnswer(invocation -> {
            Badge badge = invocation.getArgument(0);
            badge.setId(99L);
            return badge;
        });

        badgeService.award(DEVELOPER, BadgeType.FIRST_PROJECT);

        ArgumentCaptor<Badge> created = ArgumentCaptor.forClass(Badge.class);
        verify(badgeRepository).save(created.capture());
        assertThat(created.getValue().getName()).isEqualTo(BadgeType.FIRST_PROJECT.getLabel());
        assertThat(created.getValue().getCriteria()).isEqualTo(BadgeType.FIRST_PROJECT.getCriteria());
        verify(eventPublisher).publishEvent(new BadgeEarnedEvent(DEVELOPER, 99L));
    }

    @Test
    void noReputationBadgeBelowTheFirstThreshold() {
        when(developerRepository.findReputation(DEVELOPER)).thenReturn(99);

        badgeService.checkReputationBadges(DEVELOPER);

        verify(userBadgeRepository, never()).save(any());
    }

    @Test
    void reachingAThresholdAwardsItsBadgeOnly() {
        givenTheCatalogExists();
        when(developerRepository.findReputation(DEVELOPER)).thenReturn(100);

        badgeService.checkReputationBadges(DEVELOPER);

        verify(eventPublisher).publishEvent(new BadgeEarnedEvent(DEVELOPER, idOf(BadgeType.REPUTATION_100)));
        verify(eventPublisher, never()).publishEvent(new BadgeEarnedEvent(DEVELOPER, idOf(BadgeType.REPUTATION_500)));
        verify(userBadgeRepository, times(1)).save(any());
    }

    @Test
    void aHighReputationAwardsEveryThresholdBelowIt() {
        givenTheCatalogExists();
        when(developerRepository.findReputation(DEVELOPER)).thenReturn(640);

        badgeService.checkReputationBadges(DEVELOPER);

        verify(eventPublisher).publishEvent(new BadgeEarnedEvent(DEVELOPER, idOf(BadgeType.REPUTATION_100)));
        verify(eventPublisher).publishEvent(new BadgeEarnedEvent(DEVELOPER, idOf(BadgeType.REPUTATION_500)));
    }
}
