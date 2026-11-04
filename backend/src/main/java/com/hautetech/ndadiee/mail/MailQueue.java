package com.hautetech.ndadiee.mail;

import org.springframework.beans.factory.DisposableBean;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

/**
 * La file des e-mails à préparer et envoyer, sur ses propres fils : une requête n'attend jamais le serveur SMTP. Deux
 * fils au plus ; au-delà de QUEUE_CAPACITY en attente, les e-mails de trop sont abandonnés (et notés), pas la requête.
 * À l'arrêt de l'application, ceux qui sont en route ont 20 secondes pour partir.
 *
 * Volontairement pas un bean Executor : Spring renoncerait à son exécuteur par défaut (applicationTaskExecutor).
 */
@Slf4j
@Component
public class MailQueue implements DisposableBean {

    static final int QUEUE_CAPACITY = 500;

    private final ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

    public MailQueue(MailProperties properties) {
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(2);
        executor.setQueueCapacity(QUEUE_CAPACITY);
        executor.setThreadNamePrefix("mail-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(20);
        executor.initialize();
        log.info("[Mail] E-mails de notification {}", properties.enabled() ? "envoyés par SMTP" : "coupés (hors production)");
    }

    public void submit(Runnable task) {
        try {
            executor.execute(task);
        } catch (TaskRejectedException e) {
            log.warn("[Mail] File pleine : un e-mail de notification est abandonné");
        }
    }

    @Override
    public void destroy() {
        executor.shutdown();
    }
}
