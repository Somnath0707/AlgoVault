package com.algovault.model;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
import jakarta.validation.constraints.*;

@Entity
@Table(name = "vault_entries")
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VaultEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id")
    private Problem problem; // Optional
    
    @Size(max = 500)
    private String title;

    @NotBlank
    @Size(max = 65536)
    @Column(columnDefinition = "TEXT")
    private String content;
    
    @NotBlank
    @Size(max = 30)
    @Column(name = "entry_type")
    private String entryType; // EDITORIAL, MISTAKE, PATTERN, TEMPLATE, NOTE
    
    @org.hibernate.annotations.Type(io.hypersistence.utils.hibernate.type.array.ListArrayType.class)
    @Column(columnDefinition = "text[]")
    private List<String> tags;
    
    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
