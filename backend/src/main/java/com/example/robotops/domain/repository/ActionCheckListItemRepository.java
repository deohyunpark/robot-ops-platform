package com.example.robotops.domain.repository;


import com.example.robotops.domain.entity.ActionChecklistItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActionCheckListItemRepository extends JpaRepository<ActionChecklistItem, Long> {
}
