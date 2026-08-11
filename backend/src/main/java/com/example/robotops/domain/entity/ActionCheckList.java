package com.example.robotops.domain.entity;

import com.example.robotops.domain.enums.ActionCheckListTemplate;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Table(name = "action_checklist")
@Entity

public class ActionCheckList {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_template")
    private ActionCheckListTemplate template;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "event_action_id",
            nullable = false,
            unique = true
    )
    private EventAction eventAction;

    @Builder.Default
    @OneToMany(
            mappedBy = "checklist",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private List<ActionChecklistItem> items = new ArrayList<>();

    public static ActionCheckList createAndAddItems(ActionCheckListTemplate template, EventAction eventAction) {

        List<ActionChecklistItem> list = template.getItems()
                .stream()
                .map(t -> ActionChecklistItem.of(t.title(), t.sequence())).toList();

        ActionCheckList actionCheckList = ActionCheckList.builder()
                .template(template)
                .eventAction(eventAction)
                .build();

        list.forEach(actionCheckList::addItem);

        return actionCheckList;
    }

    public void addItem(ActionChecklistItem item) {
        item.setChecklist(this);
        items.add(item);
    }
}
