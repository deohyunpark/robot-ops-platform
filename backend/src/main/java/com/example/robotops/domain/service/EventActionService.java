package com.example.robotops.domain.service;

import com.example.robotops.application.telemetry.service.TelemetryResolveService;
import com.example.robotops.domain.entity.ActionCheckList;
import com.example.robotops.domain.entity.DeviceEvent;
import com.example.robotops.domain.entity.EventAction;
import com.example.robotops.domain.enums.ActionCheckListTemplate;
import com.example.robotops.domain.enums.EventType;
import com.example.robotops.domain.repository.ActionCheckListRepository;
import com.example.robotops.domain.repository.DeviceEventRepository;
import com.example.robotops.domain.repository.EventActionRepository;
import com.example.robotops.domain.request.AckRequest;
import com.example.robotops.domain.request.CheckListItemSaveRequest;
import com.example.robotops.domain.request.CheckListSaveRequest;
import com.example.robotops.domain.response.AckResponse;
import com.example.robotops.domain.response.ActionChecklistItemResponse;
import com.example.robotops.domain.response.EventActionResponse;
import com.example.robotops.error.ErrorCode;
import com.example.robotops.error.RobotOpsException;
import com.example.robotops.infra.redis.RedisService;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventActionService {

    private final EventActionRepository eventActionRepository;
    private final DeviceEventRepository deviceEventRepository;
    private final ActionCheckListRepository actionCheckListRepository;
    private final RedisService redisService;
    private final TelemetryResolveService telemetryResolveService;

    @Transactional
    public AckResponse acknowledgeEvent(AckRequest ackRequest) {
        DeviceEvent deviceEvent = deviceEventRepository.findById(ackRequest.eventId()).orElseThrow(
                () -> new RobotOpsException(ErrorCode.EVENT_NOT_FOUND)
        );

        deviceEvent.acknowledged();

        EventAction eventAction = eventActionRepository.save(EventAction.from(ackRequest, deviceEvent));

        ActionCheckListTemplate checkListTemplate = ActionCheckListTemplate.from(deviceEvent.getEventType());

        ActionCheckList actionCheckList = ActionCheckList.createAndAddItems(checkListTemplate, eventAction);

        actionCheckListRepository.save(actionCheckList);

        return AckResponse.from(
                EventActionResponse.from(eventAction),
                actionCheckList.getItems().stream().map(ActionChecklistItemResponse::of).toList()
        );

    }

    public AckResponse getEventAction(Long eventId) {
        DeviceEvent deviceEvent = deviceEventRepository.findByIdWithAction(eventId).orElseThrow(
                () -> new RobotOpsException(ErrorCode.EVENT_NOT_FOUND)
        );

        if (deviceEvent.getEventAction() == null) {
            throw new RobotOpsException(ErrorCode.EVENT_ACTION_NOT_FOUND);
        }

        return AckResponse.from(
                EventActionResponse.from(deviceEvent.getEventAction()),
                deviceEvent.getActionChecklistItem().stream().map(ActionChecklistItemResponse::of).toList()
        );

    }

    @Transactional
    public void updateCheckList(Long eventId, CheckListSaveRequest request) {

        EventAction eventAction = eventActionRepository.findByIdWithCheckList(eventId).orElseThrow(
                () -> new RobotOpsException(ErrorCode.EVENT_ACTION_NOT_FOUND));

        if(request.description() != null) {
            eventAction.updateDescription(request.description());
        }

        Map<Long, Boolean> checkedMap =
                request.itemSaveRequests().stream()
                        .collect(Collectors.toMap(
                                CheckListItemSaveRequest::id,
                                CheckListItemSaveRequest::checked
                        ));

        eventAction.getCheckListItems().forEach(item -> {

            Boolean checked =
                    checkedMap.get(item.getId());

            if (checked != null) {
                item.updateChecked(checked);
            }
        });
    }

    @Transactional
    public void resolveEvent(Long eventId) {
        DeviceEvent deviceEvent = deviceEventRepository.findByIdWithAction(eventId).orElseThrow(
                () -> new RobotOpsException(ErrorCode.EVENT_NOT_FOUND)
        );

        EventAction eventAction = deviceEvent.getEventAction();

        if(eventAction.getDescription() != null && eventAction.isAllChecked()) {
            deviceEvent.resolve();
        }


        String deviceId = deviceEvent.getDeviceId();

        // redis remove
        if(deviceEvent.getEventType().equals(EventType.OFFLINE)) {
            redisService.deleteOfflineDevice(deviceId);
        }

        redisService.deleteEvent(deviceEvent);
        redisService.deleteEventInList(deviceEvent);

        telemetryResolveService.resolveTelemetry(deviceEvent);

    }
}
