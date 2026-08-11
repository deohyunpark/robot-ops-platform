package com.example.robotops.domain.service;


import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.robotops.application.telemetry.service.TelemetryResolveService;
import com.example.robotops.domain.entity.ActionCheckList;
import com.example.robotops.domain.entity.ActionChecklistItem;
import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.entity.EventAction;
import com.example.robotops.domain.enums.EventStatus;
import com.example.robotops.domain.enums.EventType;
import com.example.robotops.domain.enums.Severity;
import com.example.robotops.domain.repository.ActionCheckListRepository;
import com.example.robotops.domain.repository.DeviceEventRepository;
import com.example.robotops.domain.repository.EventActionRepository;
import com.example.robotops.domain.request.AckRequest;
import com.example.robotops.domain.request.CheckListItemSaveRequest;
import com.example.robotops.domain.request.CheckListSaveRequest;
import com.example.robotops.domain.response.AckResponse;
import com.example.robotops.error.ErrorCode;
import com.example.robotops.error.RobotOpsException;
import com.example.robotops.infra.redis.RedisService;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("EventActionService")
class EventActionServiceTest {

    @Mock
    DeviceEventRepository deviceEventRepository;

    @Mock
    EventActionRepository eventActionRepository;

    @Mock
    ActionCheckListRepository actionCheckListRepository;

    @Mock
    RedisService redisService;

    @Mock
    TelemetryResolveService telemetryResolveService;

    @InjectMocks
    private EventActionService eventActionService;

    @Test
    @DisplayName("이벤트를 ACK하면 EventAction과 체크리스트가 생성된다.")
    void acknowledgeEvent_createsActionAndChecklist() {
        // given
        Long eventId = 1L;

        DeviceEvent deviceEvent =
                DeviceEvent.of(
                        "RBT-0001",
                        EventType.COLLISION,
                        Severity.CRITICAL,
                        Map.of()
                );

        AckRequest request =
                new AckRequest(
                        eventId,
                        "홍길동"
                );

        when(deviceEventRepository.findById(eventId))
                .thenReturn(Optional.of(deviceEvent));

        when(eventActionRepository.save(any(EventAction.class)))
                .thenAnswer(invocation ->
                        invocation.getArgument(0)
                );

        when(actionCheckListRepository.save(any(ActionCheckList.class)))
                .thenAnswer(invocation ->
                        invocation.getArgument(0)
                );

        // when
        AckResponse response =
                eventActionService.acknowledgeEvent(request);

        // then
        assertThat(deviceEvent.getEventStatus())
                .isEqualTo(EventStatus.ACKNOWLEDGED);

        verify(deviceEventRepository)
                .findById(eventId);

        verify(eventActionRepository)
                .save(any(EventAction.class));

        verify(actionCheckListRepository)
                .save(any(ActionCheckList.class));

        assertThat(response)
                .isNotNull();

        assertThat(response.actionChecklistItemResponses())
                .isNotEmpty();
    }

    @Test
    @DisplayName("체크리스트와 description 완료 시 이벤트 RESOLVE 상태변경/Redis 이벤트 이력이 삭제된다")
    void resolveEvent_whenAllCheckedAndDescription_resolvesAndClearsRedis() {
        // given
        Long eventId = 1L;

        DeviceEvent deviceEvent = mock(DeviceEvent.class);
        EventAction eventAction = mock(EventAction.class);

        when(deviceEventRepository.findByIdWithAction(eventId))
                .thenReturn(Optional.of(deviceEvent));

        when(deviceEvent.getEventAction())
                .thenReturn(eventAction);

        when(eventAction.getDescription())
                .thenReturn("현장 확인 및 조치 완료");

        when(eventAction.isAllChecked())
                .thenReturn(true);

        when(deviceEvent.getDeviceId())
                .thenReturn("RBT-0001");

        when(deviceEvent.getEventType())
                .thenReturn(EventType.COLLISION);

        // when
        eventActionService.resolveEvent(eventId);

        // then

        verify(eventAction).isAllChecked();
        verify(eventAction).getDescription();

        verify(deviceEvent).resolve();

        verify(redisService).deleteEvent(deviceEvent);

        verify(redisService).deleteEventInList(deviceEvent);

        verify(telemetryResolveService).resolveTelemetry(deviceEvent);
    }

    @Test
    @DisplayName("완료되지 않은 이벤트이면 에러 반환 - 체크리스트 미완료 시")
    void resolveEvent_whenChecklistIncomplete_doesNotResolve() {
        // given
        Long eventId = 1L;

        DeviceEvent deviceEvent = mock(DeviceEvent.class);
        EventAction eventAction = mock(EventAction.class);

        when(deviceEventRepository.findByIdWithAction(eventId))
                .thenReturn(Optional.of(deviceEvent));

        when(deviceEvent.getEventAction())
                .thenReturn(eventAction);

        when(eventAction.getDescription())
                .thenReturn("현장 확인 및 조치 완료");

        when(eventAction.isAllChecked())
                .thenReturn(false);

        // when & then
        assertThatThrownBy(
                () -> eventActionService.resolveEvent(eventId)
        )
                .isInstanceOf(RobotOpsException.class)
                .satisfies(exception -> {

                    RobotOpsException robotOpsException =
                            (RobotOpsException) exception;

                    assertThat(robotOpsException.getErrorCode())
                            .isEqualTo(
                                    ErrorCode.EVENT_ACTION_NOT_COMPLETED
                            );
                });

        verify(deviceEvent, never())
                .resolve();

        verify(redisService, never())
                .deleteEvent(any());

        verify(telemetryResolveService, never())
                .resolveTelemetry(any());
    }

    @Test
    @DisplayName("완료되지 않은 이벤트이면 에러 반환 - Description 공백")
    void resolveEvent_whenDescriptionIncomplete_doesNotResolve() {
        // given
        Long eventId = 1L;

        DeviceEvent deviceEvent = mock(DeviceEvent.class);
        EventAction eventAction = mock(EventAction.class);

        when(deviceEventRepository.findByIdWithAction(eventId))
                .thenReturn(Optional.of(deviceEvent));

        when(deviceEvent.getEventAction())
                .thenReturn(eventAction);

        when(eventAction.getDescription())
                .thenReturn(null);


        // when & then
        assertThatThrownBy(
                () -> eventActionService.resolveEvent(eventId)
        )
                .isInstanceOf(RobotOpsException.class)
                .satisfies(exception -> {

                    RobotOpsException robotOpsException =
                            (RobotOpsException) exception;

                    assertThat(robotOpsException.getErrorCode())
                            .isEqualTo(
                                    ErrorCode.EVENT_ACTION_NOT_COMPLETED
                            );
                });

        verify(deviceEvent, never())
                .resolve();

        verify(redisService, never())
                .deleteEvent(any());

        verify(telemetryResolveService, never())
                .resolveTelemetry(any());
    }


    @Test
    @DisplayName("체크리스트/Description 업데이트")
    void updateCheckList_updatesDescriptionAndCheckedFlags() {
        //given
        Long eventId = 1L;

        DeviceEvent deviceEvent = mock(DeviceEvent.class);
        EventAction eventAction = mock(EventAction.class);

        when(deviceEvent.getId()).thenReturn(eventId);

        when(eventActionRepository.findByIdWithCheckList(eventId))
        .thenReturn(Optional.of(eventAction));

        ActionChecklistItem item1 = mock(ActionChecklistItem.class);
        ActionChecklistItem item2 = mock(ActionChecklistItem.class);

        when(item1.getId()).thenReturn(10L);
        when(item2.getId()).thenReturn(20L);

        List<ActionChecklistItem> actionChecklistItems =
                List.of(item1, item2);

        when(eventAction.getCheckListItems())
                .thenReturn(actionChecklistItems);

        CheckListSaveRequest request =
                CheckListSaveRequest.builder()
                        .description("수정 후")
                        .itemSaveRequests(
                                List.of(
                                        CheckListItemSaveRequest.of(10L, true),
                                        CheckListItemSaveRequest.of(20L, false)
                                )
                        )
                        .build();


        //when
        eventActionService.updateCheckList(deviceEvent.getId(), request);

        verify(eventAction)
                .updateDescription("수정 후");

        verify(item1)
                .updateChecked(true);

        verify(item2)
                .updateChecked(false);

    }
}
