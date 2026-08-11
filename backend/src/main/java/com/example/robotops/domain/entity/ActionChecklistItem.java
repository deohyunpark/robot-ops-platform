package com.example.robotops.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Table(name = "action_checklist_item")
@Entity
public class ActionChecklistItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Setter
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checklist_id", nullable = false)
    private ActionCheckList checklist;

    @Column(name = "content", nullable = false)
    private String content;

    @Column(name = "checked", nullable = false)
    private boolean checked;

    @Column(name = "sequence", nullable = false)
    private int sequence;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    public static ActionChecklistItem of(String content, int sequence) {
        return ActionChecklistItem.builder()
                .content(content)
                .sequence(sequence)
                .build();
    }

    public void updateChecked(boolean checked) {
        this.checked = checked;
    }



}
