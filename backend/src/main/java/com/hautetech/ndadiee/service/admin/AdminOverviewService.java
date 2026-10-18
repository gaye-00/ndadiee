package com.hautetech.ndadiee.service.admin;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.response.AdminOverviewResponse;
import com.hautetech.ndadiee.dto.response.AdminOverviewResponse.DailyCount;
import com.hautetech.ndadiee.model.user.Role;
import com.hautetech.ndadiee.repository.AnswerRepository;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.repository.QuestionRepository;
import com.hautetech.ndadiee.repository.UserRepository;

import lombok.RequiredArgsConstructor;

/** L'accueil du back-office : la plateforme en chiffres, comptés en base à chaque demande. */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class AdminOverviewService {

    // « Récents » : les 7 derniers jours
    private static final int RECENT_DAYS = 7;
    // La courbe des inscriptions couvre les 30 derniers jours, aujourd'hui compris
    private static final int SIGNUP_DAYS = 30;

    private final UserRepository userRepository;
    private final DeveloperRepository developerRepository;
    private final QuestionRepository questionRepository;
    private final AnswerRepository answerRepository;
    private final ProjectRepository projectRepository;
    private final AdminAuditService auditService;

    public AdminOverviewResponse overview() {
        Instant recent = Instant.now().minus(RECENT_DAYS, ChronoUnit.DAYS);
        return AdminOverviewResponse.builder()
                .members(developerRepository.count())
                .moderators(userRepository.countByRole(Role.MODERATOR))
                .blockedMembers(userRepository.countByBlockedAtIsNotNull())
                .newMembers(developerRepository.countByCreatedAtGreaterThanEqual(recent))
                .activeMembers(developerRepository.countByLastLoginAtGreaterThanEqual(recent))
                .topics(questionRepository.count())
                .answers(answerRepository.count())
                .projects(projectRepository.count())
                .newTopics(questionRepository.countByCreatedAtGreaterThanEqual(recent))
                .newAnswers(answerRepository.countByCreatedAtGreaterThanEqual(recent))
                .newProjects(projectRepository.countByCreatedAtGreaterThanEqual(recent))
                .hiddenContent(questionRepository.countByHiddenAtIsNotNull() + answerRepository.countByHiddenAtIsNotNull()
                        + projectRepository.countByHiddenAtIsNotNull())
                .signups(signups())
                .recentActions(auditService.recent())
                .build();
    }

    // Inscriptions par jour (UTC), jours sans inscription compris : la courbe n'a pas de trou
    private List<DailyCount> signups() {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate first = today.minusDays(SIGNUP_DAYS - 1);
        Map<LocalDate, Long> perDay = developerRepository.findCreationDatesSince(first.atStartOfDay(ZoneOffset.UTC).toInstant())
                .stream()
                .collect(Collectors.groupingBy(createdAt -> LocalDate.ofInstant(createdAt, ZoneOffset.UTC), Collectors.counting()));
        return first.datesUntil(today.plusDays(1))
                .map(day -> new DailyCount(day, perDay.getOrDefault(day, 0L)))
                .toList();
    }
}
