package com.hautetech.ndadiee.initializer;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.hautetech.ndadiee.dto.request.MessageRequest;
import com.hautetech.ndadiee.dto.response.ConversationResponse;
import com.hautetech.ndadiee.dto.response.MessageResponse;
import com.hautetech.ndadiee.model.message.Conversation;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.ConversationRepository;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.service.message.MessageService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * La messagerie des comptes d'essai : quelques conversations avec leurs équipes, pour que /messages ne soit pas vide à
 * la première connexion.
 *
 * <ul>
 * <li>ada parle de Paperweight avec Tunde (son dernier message l'attend), de lagos-transit avec Chinedu, d'un
 * formulaire hors ligne avec musa (sa réponse l'attend), et d'un ancien hackathon avec Wanjiru.</li>
 * <li>musa répond à Awa, la modératrice, et Thandiwe l'attend pour le portage Kotlin de momo-sdk.</li>
 * </ul>
 *
 * Tout passe par MessageService, une transaction par message, puis les dates sont étalées sur les derniers jours (une
 * transaction englobante réécrirait ces dates à sa validation). Ne s'exécute qu'une fois ; sans les membres de la
 * démonstration, rien n'est créé.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MessageSeeder {

    private final DemoAccounts accounts;
    private final DeveloperRepository developerRepository;
    private final ConversationRepository conversationRepository;
    private final MessageService messageService;
    private final JdbcTemplate jdbcTemplate;

    /** Une ligne de la conversation : son auteur et quand il l'a écrite ; ou bien la lecture de tout ce qui précède. */
    private record Line(String from, String body, Duration ago, String reader) {
    }

    private static Line say(String from, Duration ago, String body) {
        return new Line(from, body, ago, null);
    }

    private static Line read(String reader) {
        return new Line(null, null, null, reader);
    }

    private static Duration days(long days, long hours) {
        return Duration.ofDays(days).plusHours(hours);
    }

    private static Duration minutes(long minutes) {
        return Duration.ofMinutes(minutes);
    }

    public void seed() {
        Optional<Long> ada = idOf("ada");
        Optional<Long> tunde = idOf("tunde_adeyemi");
        if (ada.isEmpty() || tunde.isEmpty()) {
            log.info("[Init] Pas de membres de démonstration : messagerie des comptes d'essai non créée.");
            return;
        }
        if (conversationRepository.findByDirectKey(Conversation.directKey(ada.get(), tunde.get())).isPresent()) {
            log.info("[Init] Messagerie des comptes d'essai déjà initialisée, skip.");
            return;
        }
        log.info("[Init] Messagerie des comptes d'essai...");

        conversation("ada", "wanjiru_kamau", List.of(
                say("wanjiru_kamau", days(12, 3), "Hey Ada! Loved your talk on shipping pages under 100 kB. Do you have the slides somewhere?"),
                say("ada", days(12, 2), "Thank you 🙏 Slides are in the Paperweight repo, under `docs/talks`. Steal anything you like."),
                say("wanjiru_kamau", days(12, 1), "Perfect. We might team up for the next hackathon — Nairobi × Lagos?"),
                say("ada", days(11, 22), "Count me in 🚀"),
                read("wanjiru_kamau")));

        conversation("ada", "chinedu_okafor", List.of(
                say("chinedu_okafor", days(2, 5), "Morning! The bus stop map on lagos-transit freezes on low-end Androids. Any idea?"),
                say("ada", days(2, 4), "I saw it too. We render all 1 400 stops at once — I'll cluster them below zoom 13."),
                say("chinedu_okafor", days(2, 4), "Makes sense. Ping me when the PR is up, I'll review it tonight."),
                say("ada", days(1, 20), "PR is up: clustering + `requestIdleCallback` for the labels. 60 fps on my old Tecno now 🎉"),
                say("chinedu_okafor", days(1, 18), "Reviewed and approved. Beautiful work."),
                read("ada")));

        conversation("ada", "musa", List.of(
                say("ada", days(1, 6), "Hi Musa! Quick question for Paperweight: how would you validate an offline form once it syncs?"),
                say("musa", days(1, 5), "Salut Ada ! Côté API, je garderais une clé d'idempotence par soumission : le formulaire peut arriver deux fois après une reconnexion."),
                say("ada", days(1, 5), "Oh nice, so the client generates the key and the server ignores duplicates?"),
                say("musa", days(1, 4), """
                        Exactement. Une contrainte unique suffit :
                        ```
                        UNIQUE (author_id, client_id)
                        ```
                        Et tu renvoies la soumission déjà enregistrée au lieu d'une erreur."""),
                read("ada"),
                say("musa", minutes(42), "Je t'ai mis un exemple complet dans une gist, dis-moi si c'est clair 👌")));

        conversation("ada", "tunde_adeyemi", List.of(
                say("tunde_adeyemi", days(0, 9), "Morning Ada ☀️ I pushed the new `useOfflineForm` hook to the branch."),
                say("ada", days(0, 8), "Great! I'll test it on the 2G profile after standup."),
                say("tunde_adeyemi", days(0, 8), "Cool. The bundle is down to 87 kB gzipped 😎"),
                say("ada", days(0, 7), "That's under budget 🎉 Let's demo it on Friday."),
                read("tunde_adeyemi"),
                say("tunde_adeyemi", minutes(18), "Two people asked for the demo link already. Can we ship a preview today?"),
                say("tunde_adeyemi", minutes(17), "I can set up the Netlify preview if you're busy.")));

        conversation("musa", "awa_diop", List.of(
                say("awa_diop", days(3, 4), "Bonjour Musa, une question sur Spring Security attend une réponse depuis deux jours sur le forum. Tu pourrais y jeter un œil ?"),
                say("musa", days(3, 2), "Bonjour Awa, c'est fait : le filtre JWT était déclaré deux fois. J'ai mis un exemple."),
                say("awa_diop", days(3, 1), "Merci ! La réponse a été acceptée 🙌"),
                read("musa")));

        conversation("musa", "thandiwe_ndlovu", List.of(
                say("thandiwe_ndlovu", days(0, 5), "Hi Musa! I applied for the Kotlin port of momo-sdk. Happy to share the prototype I started."),
                say("musa", days(0, 4), "Hi Thandiwe, thanks! Coroutines or callbacks for the payment flow?"),
                say("thandiwe_ndlovu", days(0, 4), "Coroutines, with a `Flow` for the payment status. Callbacks for Java users through a thin wrapper."),
                read("musa"),
                say("thandiwe_ndlovu", minutes(65), "Here is the repo: the sandbox flow already works end to end ✅")));

        log.info("[Init] Messagerie des comptes d'essai prête");
    }

    /** Une conversation écrite ligne à ligne, puis replacée dans le temps. */
    private void conversation(String first, String second, List<Line> lines) {
        Optional<Long> firstId = idOf(first);
        if (firstId.isEmpty() || idOf(second).isEmpty()) {
            return;
        }
        ConversationResponse conversation = messageService.start(firstId.get(), second);
        Instant last = null;
        for (Line line : lines) {
            if (line.reader() != null) {
                messageService.markRead(accounts.id(line.reader()), conversation.getId());
                continue;
            }
            MessageResponse message = messageService.send(accounts.id(line.from()), conversation.getId(),
                    MessageRequest.builder().body(line.body()).clientId(UUID.randomUUID().toString()).build());
            Instant at = Instant.now().minus(line.ago());
            jdbcTemplate.update("UPDATE messages SET created_at = ?, updated_at = ? WHERE id = ?",
                    Timestamp.from(at), Timestamp.from(at), message.getId());
            last = at;
        }
        if (last != null) {
            jdbcTemplate.update("UPDATE conversations SET created_at = ?, last_message_at = ? WHERE id = ?",
                    Timestamp.from(last.minus(Duration.ofMinutes(1))), Timestamp.from(last), conversation.getId());
        }
    }

    private Optional<Long> idOf(String username) {
        return developerRepository.findByUsername(username).map(Developer::getId);
    }
}
