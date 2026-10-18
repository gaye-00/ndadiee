package com.hautetech.ndadiee.model.admin;

/** Ce que l'administration a fait, tel que le garde le journal. */
public enum AdminActionType {
    BLOCK_USER,
    UNBLOCK_USER,
    CHANGE_ROLE,
    HIDE_CONTENT,
    UNHIDE_CONTENT,
    DELETE_CONTENT
}
