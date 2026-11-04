package com.hautetech.ndadiee.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/** Tâches de fond (@Scheduled) : le ménage des images de projet que plus rien ne montre (MediaUploadService). */
@Configuration
@EnableScheduling
public class SchedulingConfiguration {

    /**
     * Les tâches de fond ont leurs propres fils. Sans ce bean, le WebSocket (messageBrokerTaskScheduler) serait le seul
     * planificateur de l'application : une longue synchronisation GitHub retarderait les battements de cœur des
     * connexions. Son nom, taskScheduler, est celui que @Scheduled choisit parmi plusieurs.
     */
    @Bean(name = "taskScheduler")
    public ThreadPoolTaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(2);
        scheduler.setThreadNamePrefix("scheduling-");
        return scheduler;
    }
}
