package com.algovault.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(name = "hide_acceptance_rate")
    private Boolean hideAcceptanceRate;

    @Column(name = "dark_mode")
    private Boolean darkMode;

    @Column(name = "daily_potd_enabled")
    private Boolean dailyPotdEnabled;

    @Column(name = "review_notifications")
    private Boolean reviewNotifications;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (hideAcceptanceRate == null) hideAcceptanceRate = true;
        if (darkMode == null) darkMode = true;
        if (dailyPotdEnabled == null) dailyPotdEnabled = true;
        if (reviewNotifications == null) reviewNotifications = true;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
