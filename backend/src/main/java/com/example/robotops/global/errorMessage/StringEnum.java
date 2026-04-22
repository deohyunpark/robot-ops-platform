package com.example.robotops.global.errorMessage;

public interface StringEnum {

    static <E extends Enum<E> & StringEnum> E from(
            Class<E> enumClass,
            String value
    ) {
        if (value == null || value.isBlank()) {
            return null;
        }

        String normalized = value.trim().toUpperCase();

        for (E e : enumClass.getEnumConstants()) {
            if (e.name().equals(normalized)) {
                return e;
            }
        }

        return null;
    }

}
