package com.calendar.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class MultipleOfValidator implements ConstraintValidator<MultipleOf, Integer> {

  private int divisor;

  @Override
  public void initialize(MultipleOf annotation) {
    this.divisor = annotation.value();
  }

  @Override
  public boolean isValid(Integer value, ConstraintValidatorContext context) {
    if (value == null) {
      return true;
    }
    return divisor != 0 && value % divisor == 0;
  }
}
