package com.example.robotops.domain.entity;

import com.example.robotops.domain.request.AckRequest;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
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
@Table(name = "event_action")
@Entity
public class EventAction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "device_event_id",
            nullable = false,
            unique = true
    )
    private DeviceEvent deviceEvent;

    @Column(name = "description")
    private String description;

    @Column(name = "operator", nullable = false)
    private String operator;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;


    @OneToOne(
            mappedBy = "eventAction",
            fetch = FetchType.LAZY
    )
    private ActionCheckList actionCheckList;


    public static EventAction from(AckRequest ackRequest, DeviceEvent deviceEvent) {
        return EventAction.builder()
                .deviceEvent(deviceEvent)
                .operator(ackRequest.operator())
                .build();
    }

    public void updateDescription(String description) {
        this.description = description;
    }


    public List<ActionChecklistItem> getCheckListItems() {
        if (this.getActionCheckList() == null) {
            return List.of();
        }

        return this.getActionCheckList().getItems();
    }


    public Boolean isAllChecked() {
        return getCheckListItems().stream()
                .allMatch(ActionChecklistItem::isChecked);
    }
}
