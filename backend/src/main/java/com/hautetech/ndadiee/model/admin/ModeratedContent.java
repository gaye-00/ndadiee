package com.hautetech.ndadiee.model.admin;

/** Les contenus que l'administration peut masquer ou supprimer depuis le back-office. */
public enum ModeratedContent {
    QUESTION,
    ANSWER,
    PROJECT;

    /** Sa cible dans le journal des actions. */
    public AdminTargetType target() {
        return AdminTargetType.valueOf(name());
    }
}
