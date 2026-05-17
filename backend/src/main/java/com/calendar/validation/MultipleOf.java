package com.calendar.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Validates that an integer is a multiple of {@link #value()}.
 *
 * <p>Used in this project to enforce that {@code durationMinutes} is a
 * positive multiple of 30, since slots are aligned to a 30-minute grid.
 */
@Constraint(validatedBy = MultipleOfValidator.class)
@Target({ ElementType.FIELD, ElementType.METHOD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT })
@Retention(RetentionPolicy.RUNTIME)
public @interface MultipleOf {

  String message() default "must be a multiple of {value}";

  int value();

  Class<?>[] groups() default {};

  Class<? extends Payload>[] payload() default {};
}
