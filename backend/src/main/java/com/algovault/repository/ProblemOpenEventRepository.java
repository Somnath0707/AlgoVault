package com.algovault.repository;
import com.algovault.model.ProblemOpenEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
@Repository
public interface ProblemOpenEventRepository extends JpaRepository<ProblemOpenEvent, Long> {}
