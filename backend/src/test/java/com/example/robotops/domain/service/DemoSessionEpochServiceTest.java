package com.example.robotops.domain.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

@ExtendWith(MockitoExtension.class)
@DisplayName("DemoSessionEpochService")
class DemoSessionEpochServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private DemoSessionEpochService demoSessionEpochService;

    @Test
    @DisplayName("beginSession 은 Redis INCR 결과를 epoch 문자열로 반환한다")
    void beginSession_returnsIncrementedEpoch() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment(DemoSessionEpochService.CURRENT_EPOCH_KEY)).thenReturn(3L);

        assertThat(demoSessionEpochService.beginSession()).isEqualTo("3");
    }

    @Test
    @DisplayName("isActiveEpoch 는 현재 epoch 와 일치할 때만 true")
    void isActiveEpoch_matchesCurrentEpochOnly() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(DemoSessionEpochService.CURRENT_EPOCH_KEY)).thenReturn("5");

        assertThat(demoSessionEpochService.isActiveEpoch("5")).isTrue();
        assertThat(demoSessionEpochService.isActiveEpoch("4")).isFalse();
        assertThat(demoSessionEpochService.isActiveEpoch(null)).isFalse();
    }

    @Test
    @DisplayName("invalidateSession 은 epoch 를 INCR 한다")
    void invalidateSession_incrementsEpoch() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment(DemoSessionEpochService.CURRENT_EPOCH_KEY)).thenReturn(6L);

        assertThat(demoSessionEpochService.invalidateSession()).isEqualTo("6");

        verify(valueOperations).increment(DemoSessionEpochService.CURRENT_EPOCH_KEY);
    }
}
