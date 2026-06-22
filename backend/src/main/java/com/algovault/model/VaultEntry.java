package com.algovault.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "vault_entries")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VaultEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id")
    private Problem problem; // Optional
    
    private String title;
    @Column(columnDefinition = "TEXT")
    private String content;
    
    @Column(name = "entry_type")
    private String entryType; // EDITORIAL, MISTAKE, PATTERN, TEMPLATE, NOTE
    
    private String tags; // Comma separated for full text search simplicity
    
    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
