package com.calendar.web;

import com.calendar.domain.EventType;
import com.calendar.dto.EventTypeCreateRequest;
import com.calendar.dto.EventTypeUpdateRequest;
import com.calendar.service.EventTypeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin/event-types")
public class AdminEventTypeController {

  private final EventTypeService eventTypeService;

  public AdminEventTypeController(EventTypeService eventTypeService) {
    this.eventTypeService = eventTypeService;
  }

  @GetMapping
  public List<EventType> list() {
    return eventTypeService.list();
  }

  @GetMapping("/{id}")
  public EventType get(@PathVariable UUID id) {
    return eventTypeService.getById(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public EventType create(@Valid @RequestBody EventTypeCreateRequest request) {
    return eventTypeService.create(request);
  }

  @PatchMapping("/{id}")
  public EventType update(
      @PathVariable UUID id,
      @Valid @RequestBody EventTypeUpdateRequest request
  ) {
    return eventTypeService.update(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id) {
    eventTypeService.delete(id);
  }
}
