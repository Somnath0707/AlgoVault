package com.algovault.repository;

import com.algovault.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByGithubId(String githubId);
    Optional<User> findByUsername(String username);
    Optional<User> findByLcUsername(String lcUsername);
    Optional<User> findByLcUsernameIgnoreCase(String lcUsername);
}
