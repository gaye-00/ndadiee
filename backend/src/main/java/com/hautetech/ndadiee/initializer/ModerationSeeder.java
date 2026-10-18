package com.hautetech.ndadiee.initializer;

import java.util.List;

import org.springframework.stereotype.Component;

import com.hautetech.ndadiee.dto.request.AnswerRequest;
import com.hautetech.ndadiee.dto.request.QuestionRequest;
import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.admin.ModeratedContent;
import com.hautetech.ndadiee.model.user.ExperienceLevel;
import com.hautetech.ndadiee.model.user.Role;
import com.hautetech.ndadiee.repository.QuestionRepository;
import com.hautetech.ndadiee.repository.UserRepository;
import com.hautetech.ndadiee.service.SlugService;
import com.hautetech.ndadiee.service.admin.AdminContentService;
import com.hautetech.ndadiee.service.admin.AdminUserService;
import com.hautetech.ndadiee.service.content.AnswerService;
import com.hautetech.ndadiee.service.content.QuestionService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Le back-office de la démonstration n'est pas vide : un compte de spam a publié une annonce frauduleuse dans le
 * forum et l'a recopiée sous une réponse ; l'équipe a masqué les deux et suspendu le compte. Une membre de longue
 * date est aussi devenue modératrice. Tout passe par les services d'administration : le journal porte ces
 * décisions, comme si un admin les avait prises.
 *
 * Créé une seule fois : si le compte de spam existe déjà, rien n'est refait.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ModerationSeeder {

    private static final String SPAMMER = "cash_rapide";
    // Le sujet sous lequel le spam a été recopié (DemoDataSeeder)
    private static final String TARGET_TOPIC = "Spring Boot : quelle différence entre @Component, @Service et @Repository ?";

    private final DemoAccounts accounts;
    private final UserRepository userRepository;
    private final QuestionRepository questionRepository;
    private final SlugService slugService;
    private final QuestionService questionService;
    private final AnswerService answerService;
    private final AdminContentService adminContentService;
    private final AdminUserService adminUserService;

    public void seed() {
        if (userRepository.existsByUsername(SPAMMER)) {
            log.info("[Init] Modération déjà initialisée, skip.");
            return;
        }
        log.info("[Init] Création des exemples de modération...");

        Long admin = accounts.admin();
        Long spammer = accounts.developer(SPAMMER, "Cash Rapide", Role.USER, "SN", "Dakar", ExperienceLevel.STUDENT,
                Language.FR, false, "Gagnez de l'argent facilement depuis chez vous. Écrivez-moi en privé.", "Carrière");

        Long topic = questionService.create(spammer, QuestionRequest.builder()
                .title("Gagnez 500 000 FCFA par semaine depuis votre téléphone !!!")
                .body("""
                        Plus besoin de chercher un stage ou un emploi : notre programme vous paie chaque semaine, sans
                        expérience. Il suffit de verser 10 000 FCFA d'inscription et d'inviter trois amis.

                        Places limitées, écrivez-moi vite en privé pour recevoir le lien !
                        """)
                .tags(List.of("Carrière"))
                .build()).getId();
        adminContentService.hide(admin, ModeratedContent.QUESTION, topic,
                "Publicité frauduleuse (système pyramidal) : hors de propos sur le forum.");

        questionRepository.findBySlug(slugService.toSlug(TARGET_TOPIC)).ifPresent(question -> {
            Long answer = answerService.create(spammer, question.getId(), AnswerRequest.builder()
                    .body("Bonne question ! Mais pourquoi coder quand on peut gagner 500 000 FCFA par semaine ? Écrivez-moi en privé.")
                    .build()).getId();
            adminContentService.hide(admin, ModeratedContent.ANSWER, answer, "Spam recopié sous une réponse : sans rapport avec la question.");
        });

        adminUserService.block(admin, spammer,
                "Spam répété dans le forum : annonces frauduleuses et sollicitations en privé.");

        userRepository.findByUsername("thandiwe_ndlovu").ifPresent(member ->
                adminUserService.changeRole(admin, member.getId(), Role.MODERATOR));

        log.info("[Init] Exemples de modération prêts : compte « {} » suspendu, son sujet et sa réponse masqués", SPAMMER);
    }
}
