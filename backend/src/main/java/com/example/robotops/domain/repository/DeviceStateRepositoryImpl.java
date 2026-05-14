package com.example.robotops.domain.repository;

import static com.example.robotops.domain.entity.QDeviceState.deviceState;

import com.querydsl.jpa.impl.JPAQueryFactory;
import java.util.List;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class DeviceStateRepositoryImpl implements DeviceStateRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public List<String> findAllDeviceId() {
        return queryFactory.select(deviceState.id.deviceId).from(deviceState).fetch();
    }
}
