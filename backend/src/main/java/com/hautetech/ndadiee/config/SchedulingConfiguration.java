package com.hautetech.ndadiee.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Tâches de fond (@Scheduled) : le ménage des images de projet que plus rien ne montre (MediaUploadService). */
@Configuration
@EnableScheduling
public class SchedulingConfiguration {
}
